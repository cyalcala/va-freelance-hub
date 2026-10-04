import { describe, expect, it } from "bun:test";
import { Database } from "bun:sqlite";

import {
  MAX_DAYS_SINCE_POST,
  buildCandidateSelectSql,
  classifyCandidateFreshness,
} from "./sync-to-d1";

/**
 * INCIDENT-0410(y) — the candidate query ordered by insertion, so a tenant's stale rows
 * consumed its whole publish budget and then kept their place at the head of the queue.
 *
 * Measured 2026-10-04 (read-only, Turso lake): the 60 `QUALIFIED_READY` rows split 50 older
 * than the accepted 30-day window / 10 inside it, oldest 2022-02-16. `CANDIDATE_SELECT` ended
 * `ORDER BY id ASC LIMIT ?` and the publisher then withholds out-of-window rows in TypeScript.
 * A withheld row keeps its status, so the next tick re-selects the same head of the queue and
 * the in-window rows behind it are never reached — permanent head-of-line blocking.
 *
 * These tests drive the REAL statement builder against a REAL `bun:sqlite` database holding
 * real rows, and the REAL freshness gate. Nothing is compared against a constant copy of
 * itself, and no threshold is lowered.
 */

function openLake(): Database {
  const db = new Database(":memory:");
  db.run(`
    CREATE TABLE lake_candidate_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_id TEXT NOT NULL,
      source_platform TEXT,
      source_url TEXT NOT NULL,
      title TEXT,
      company TEXT,
      category TEXT,
      location_raw TEXT,
      description TEXT,
      application_url TEXT,
      posted_at TEXT,
      geo_scope TEXT,
      ph_eligibility TEXT,
      fingerprint_hash TEXT,
      status TEXT NOT NULL DEFAULT 'QUALIFIED_READY'
    );
  `.trim());
  return db;
}

/**
 * `now` is fixed so the age buckets are stable. 2026-10-04T12:00:00Z.
 * Fresh = 5 days old, stale = 400 days old.
 */
const NOW = new Date("2026-10-04T12:00:00.000Z");
const IN_WINDOW = "2026-09-29T12:00:00.000Z";
const STALE = "2025-08-30T12:00:00.000Z";

function insert(
  db: Database,
  row: {
    sourceId: string;
    postedAt: string | null;
    eligibility?: string;
    status?: string;
  },
): number {
  db.query(
    `INSERT INTO lake_candidate_jobs
       (source_id, source_platform, source_url, title, company, category, location_raw,
        description, application_url, posted_at, geo_scope, ph_eligibility, fingerprint_hash, status)
     VALUES (?, 'lever', ?, 'Title', 'Company', 'other', 'Philippines', 'Body', ?,
             ?, 'ph', ?, 'hash', ?);`,
  ).run(
    row.sourceId,
    `https://jobs.lever.co/x/${Math.random().toString(36).slice(2, 8)}`,
    `https://jobs.lever.co/x/${Math.random().toString(36).slice(2, 8)}`,
    row.postedAt,
    row.eligibility ?? "eligible_verified",
    row.status ?? "QUALIFIED_READY",
  );
  return Number(db.query("SELECT last_insert_rowid() AS id").get()?.id ?? 0);
}

function selectIds(db: Database, sourceIds: string[], limit: number): Array<{ id: number }> {
  const args = [...sourceIds, limit];
  return db.query(buildCandidateSelectSql(sourceIds)).all(...args) as Array<{ id: number }>;
}

describe("buildCandidateSelectSql over a real lake table", () => {
  it("puts the in-window row ahead of an older-id stale row, instead of insertion order", () => {
    const db = openLake();
    // Insertion order deliberately puts the 400-day-old row first.
    const staleId = insert(db, { sourceId: "lever:deliverect", postedAt: STALE });
    const freshId = insert(db, { sourceId: "lever:deliverect", postedAt: IN_WINDOW });
    expect(staleId).toBeLessThan(freshId);

    const rows = selectIds(db, ["lever:deliverect"], 5);
    expect(rows.map((r) => r.id)).toEqual([freshId, staleId]);

    db.close();
  });

  it("keeps an undated row behind every dated row without dropping it", () => {
    const db = openLake();
    const undatedId = insert(db, { sourceId: "lever:deliverect", postedAt: null });
    const staleId = insert(db, { sourceId: "lever:deliverect", postedAt: STALE });
    const freshId = insert(db, { sourceId: "lever:deliverect", postedAt: IN_WINDOW });

    const rows = selectIds(db, ["lever:deliverect"], 10);
    expect(rows.map((r) => r.id)).toEqual([freshId, staleId, undatedId]);

    db.close();
  });

  it("treats an unparseable date as undated, so it cannot outrank a real date", () => {
    const db = openLake();
    const garbageId = insert(db, { sourceId: "lever:deliverect", postedAt: "not-a-date" });
    const freshId = insert(db, { sourceId: "lever:deliverect", postedAt: IN_WINDOW });

    const rows = selectIds(db, ["lever:deliverect"], 10);
    expect(rows.map((r) => r.id)).toEqual([freshId, garbageId]);

    db.close();
  });

  it("breaks an identical date with id ASC, so the order is reproducible across ticks", () => {
    const db = openLake();
    const firstId = insert(db, { sourceId: "lever:deliverect", postedAt: IN_WINDOW });
    const secondId = insert(db, { sourceId: "lever:deliverect", postedAt: IN_WINDOW });
    const thirdId = insert(db, { sourceId: "lever:deliverect", postedAt: IN_WINDOW });

    const rows = selectIds(db, ["lever:deliverect"], 10);
    expect(rows.map((r) => r.id)).toEqual([firstId, secondId, thirdId]);

    db.close();
  });

  it("still refuses an unauthorized source_id, a non-qualified status and an ineligible row", () => {
    const db = openLake();
    const authorizedFresh = insert(db, { sourceId: "lever:deliverect", postedAt: IN_WINDOW });
    const unauthorizedFresh = insert(db, { sourceId: "lever:not-authorized", postedAt: IN_WINDOW });
    insert(db, { sourceId: "lever:deliverect", postedAt: IN_WINDOW, status: "EXCLUDED" });
    insert(db, {
      sourceId: "lever:deliverect",
      postedAt: IN_WINDOW,
      eligibility: "ineligible",
    });

    const rows = selectIds(db, ["lever:deliverect"], 10);
    expect(rows.map((r) => r.id)).toEqual([authorizedFresh]);
    expect(rows.map((r) => r.id)).not.toContain(unauthorizedFresh);

    db.close();
  });

  it("orders across several authorized sources without interleaving breakage", () => {
    const db = openLake();
    const aOld = insert(db, { sourceId: "lever:deliverect", postedAt: STALE });
    const bFresh = insert(db, { sourceId: "ashby:supabase", postedAt: IN_WINDOW });
    const aFresh = insert(db, { sourceId: "lever:deliverect", postedAt: IN_WINDOW });

    const rows = selectIds(db, ["lever:deliverect", "ashby:supabase"], 10);
    expect(rows.map((r) => r.id)).toEqual([bFresh, aFresh, aOld]);

    db.close();
  });

  it("reaches the fresh row the freshness gate would publish even when the budget is one", () => {
    const db = openLake();
    const staleId = insert(db, { sourceId: "lever:deliverect", postedAt: STALE });
    const freshId = insert(db, { sourceId: "lever:deliverect", postedAt: IN_WINDOW });

    const [first] = selectIds(db, ["lever:deliverect"], 1);
    expect(first.id).toBe(freshId);

    // The ordering is not a substitute for the gate: only the in-window row may be published.
    expect(classifyCandidateFreshness(STALE, NOW).kind).toBe("stale");
    expect(classifyCandidateFreshness(IN_WINDOW, NOW).kind).toBe("within_window");
    expect(classifyCandidateFreshness(STALE, NOW).kind).not.toBe(
      classifyCandidateFreshness(IN_WINDOW, NOW).kind,
    );
    expect(staleId).not.toBe(freshId);

    db.close();
  });

  it("does not move the accepted freshness window", () => {
    expect(MAX_DAYS_SINCE_POST).toBe(30);
    expect(classifyCandidateFreshness(STALE, NOW).kind).toBe("stale");
    // A row exactly at the boundary is still inside the window; the gate is unchanged.
    expect(
      classifyCandidateFreshness(new Date(NOW.getTime() - 30 * 86_400_000).toISOString(), NOW).kind,
    ).toBe("within_window");
  });
});