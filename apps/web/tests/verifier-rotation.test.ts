import { Database } from "bun:sqlite";
import { expect, test } from "bun:test";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";
import {
  buildVerifierFailureUpdate,
  buildVerifierSelectionQuery,
  summarizeVerifierAttempts,
} from "../src/lib/verifier-attempt";

test("20 network failures rotate out so the next run selects a different cohort", () => {
  const database = new Database(":memory:");
  try {
    database.exec(`
      CREATE TABLE opportunities (
        id INTEGER PRIMARY KEY,
        source_url TEXT NOT NULL,
        failed_verification_count INTEGER NOT NULL,
        last_verified_at TEXT,
        is_active INTEGER NOT NULL
      );
    `);
    const insert = database.prepare(
      "INSERT INTO opportunities VALUES (?, ?, ?, NULL, 1)",
    );
    for (let id = 1; id <= 40; id += 1) {
      insert.run(id, `https://example.com/${id}`, id % 3);
    }

    const dialect = new SQLiteSyncDialect();
    const select = (limit: number) => {
      const query = dialect.sqlToQuery(buildVerifierSelectionQuery(limit));
      return database.query(query.sql).all(...query.params as any[]) as Array<{
        id: number;
        sourceUrl: string;
        failedCount: number;
      }>;
    };

    const first = select(20);
    const attemptedAt = "2026-08-13T01:00:00.000Z";
    const stamp = database.prepare("UPDATE opportunities SET last_verified_at = ? WHERE id = ?");
    for (const row of first) {
      const update = buildVerifierFailureUpdate(attemptedAt);
      stamp.run(update.lastVerifiedAt, row.id);
      expect("failedVerificationCount" in update).toBe(false);
      expect("isActive" in update).toBe(false);
    }

    const second = select(20);
    expect(first.map((row) => row.id)).toEqual(Array.from({ length: 20 }, (_, index) => index + 1));
    expect(second.map((row) => row.id)).toEqual(Array.from({ length: 20 }, (_, index) => index + 21));
  } finally {
    database.close();
  }
});

test("attempt counters distinguish success, network failure, and rejected work", () => {
  expect(summarizeVerifierAttempts([
    { status: "fulfilled", value: { deactivated: 0, succeeded: true } },
    { status: "fulfilled", value: { deactivated: 0, succeeded: false } },
    { status: "fulfilled", value: { deactivated: 1, succeeded: true } },
    { status: "rejected", reason: new Error("D1 write failed") },
  ])).toEqual({ attempted: 4, succeeded: 2, failedChecks: 2, deactivated: 1, platformBudgetFailures: 0 });
});
