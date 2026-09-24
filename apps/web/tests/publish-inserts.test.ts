import { describe, expect, test } from "bun:test";
import { publishGroupedInserts } from "../src/lib/publish-opportunities";
import { FakePublicationDatabase } from "./publication-db-fake";

const NOW = "2026-09-24T12:00:00.000Z";

const CANARY_ROW = {
  sourceId: "breezy:test",
  compliance: "allowed",
  operational: "canary",
  optOut: 0,
  policyExpiry: "2026-10-01T00:00:00.000Z",
  canaryMaxNewItemsPerTick: 2,
};

function row(i: number, sourceId = "breezy:test") {
  return {
    title: `Job ${i}`,
    company: "TestCo",
    type: "freelance",
    source_url: `https://example.test/p/${i}`,
    source_platform: "TestCo",
    content_hash: `hash-${i}`,
    sourceId,
  } as any;
}

describe("publishGroupedInserts canary cap clamp", () => {
  test("clamps a canary batch to canaryMaxNewItemsPerTick so the gateway never rolls back", async () => {
    const db = new FakePublicationDatabase({ registry: [CANARY_ROW, CANARY_ROW] });
    const persistedBatches: number[] = [];
    const result = await publishGroupedInserts(
      db,
      async (rows) => {
        persistedBatches.push(rows.length);
        return rows.length;
      },
      [row(1), row(2), row(3), row(4), row(5)],
      NOW,
      "scrape",
    );
    expect(result).toEqual({ published: 2, failed: false });
    expect(persistedBatches).toEqual([2]);
    const ledgerInsert = db.runs.find((run) => run.query.includes("INSERT INTO source_publication_ledger"));
    expect(ledgerInsert?.values).toContain("capped");
  });

  test("unregistered exact-six source publishes the full batch unchanged", async () => {
    const db = new FakePublicationDatabase({ registry: [null, null] });
    const persistedBatches: number[] = [];
    const result = await publishGroupedInserts(
      db,
      async (rows) => {
        persistedBatches.push(rows.length);
        return rows.length;
      },
      [row(1, "we-work-remotely"), row(2, "we-work-remotely"), row(3, "we-work-remotely")],
      NOW,
      "scrape",
    );
    expect(result).toEqual({ published: 3, failed: false });
    expect(persistedBatches).toEqual([3]);
    const ledgerInsert = db.runs.find((run) => run.query.includes("INSERT INTO source_publication_ledger"));
    expect(ledgerInsert?.values).toContain("unlimited");
  });

  test("invalid canary cap proposes zero so the gateway owns the fail-closed rollback", async () => {
    const invalidCapRow = { ...CANARY_ROW, canaryMaxNewItemsPerTick: null };
    const db = new FakePublicationDatabase({ registry: [invalidCapRow, invalidCapRow] });
    const persistedBatches: number[] = [];
    const result = await publishGroupedInserts(
      db,
      async (rows) => {
        persistedBatches.push(rows.length);
        return rows.length;
      },
      [row(1), row(2), row(3)],
      NOW,
      "scrape",
    );
    expect(result.published).toBe(0);
    expect(persistedBatches).toEqual([]);
  });
});
