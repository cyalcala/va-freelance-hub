import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { readFileSync } from "node:fs";
import { getDb, opportunities, type NewOpportunity } from "@va-hub/db";
import { getTableConfig } from "drizzle-orm/sqlite-core";
import { publicationDbFromEnv, publishGroupedInserts } from "../src/lib/publish-opportunities";
import { POST as ingest } from "../src/pages/api/ingest";
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
    sourceUrl: `https://example.test/p/${i}`,
    sourcePlatform: "TestCo",
    contentHash: `hash-${i}`,
    sourceId,
  } satisfies NewOpportunity;
}

describe("publishGroupedInserts canary cap clamp", () => {
  test("clamps a canary batch to canaryMaxNewItemsPerTick so the gateway never rolls back", async () => {
    const db = new FakePublicationDatabase({ registry: [CANARY_ROW, CANARY_ROW] });
    const persistedBatches: number[] = [];
    const persistedUrls: string[][] = [];
    const result = await publishGroupedInserts(
      db,
      async (rows) => {
        persistedBatches.push(rows.length);
        persistedUrls.push(rows.map((row) => row.sourceUrl));
        return rows.map((_, index) => 1001 + index);
      },
      [row(1), row(2), row(3), row(4), row(5)],
      NOW,
      "scrape",
    );
    expect(result).toEqual({ published: 2, failed: false });
    expect(persistedBatches).toEqual([2]);
    expect(persistedUrls).toEqual([[row(1).sourceUrl, row(2).sourceUrl]]);
    const ledgerInsert = db.runs.find((run) => run.query.includes("INSERT INTO source_publication_ledger"));
    expect(ledgerInsert?.values).toContain("capped");
    expect(ledgerInsert?.values[5]).toBe(2);
    expect(ledgerInsert?.values[6]).toBe("[1001,1002]");
  });

  test("unregistered exact-six source publishes the full batch unchanged", async () => {
    const db = new FakePublicationDatabase({ registry: [null, null] });
    const persistedBatches: number[] = [];
    const result = await publishGroupedInserts(
      db,
      async (rows) => {
        persistedBatches.push(rows.length);
        return rows.map((_, index) => 2001 + index);
      },
      [row(1, "we-work-remotely"), row(2, "we-work-remotely"), row(3, "we-work-remotely")],
      NOW,
      "scrape",
    );
    expect(result).toEqual({ published: 3, failed: false });
    expect(persistedBatches).toEqual([3]);
    const ledgerInsert = db.runs.find((run) => run.query.includes("INSERT INTO source_publication_ledger"));
    expect(ledgerInsert?.values).toContain("unlimited");
    expect(ledgerInsert?.values[6]).toBe("[2001,2002,2003]");
  });

  test("invalid canary cap proposes zero so the gateway owns the fail-closed rollback", async () => {
    const invalidCapRow = { ...CANARY_ROW, canaryMaxNewItemsPerTick: null };
    const db = new FakePublicationDatabase({ registry: [invalidCapRow, invalidCapRow] });
    const persistedBatches: number[] = [];
    const result = await publishGroupedInserts(
      db,
      async (rows) => {
        persistedBatches.push(rows.length);
        return rows.map((_, index) => 3001 + index);
      },
      [row(1), row(2), row(3)],
      NOW,
      "scrape",
    );
    expect(result.published).toBe(0);
    expect(persistedBatches).toEqual([]);
  });
});

describe("publishGroupedInserts persisted ID accounting", () => {
  test("counts only distinct valid persisted IDs and never coerces invalid IDs", async () => {
    const db = new FakePublicationDatabase();
    const result = await publishGroupedInserts(db, async () => [
      41, 41, 42, 0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY,
      Number.MAX_SAFE_INTEGER + 1, "43", null,
    ] as unknown as number[], Array.from({ length: 11 }, (_, i) => row(i, "remotive")), NOW, "ingest");
    expect(result).toEqual({ published: 2, failed: false });
    const receipt = db.runs.find((run) => run.query.includes("INSERT INTO source_publication_ledger"));
    expect(receipt?.values[5]).toBe(2);
    expect(receipt?.values[6]).toBe("[41,42]");
  });

  test("a conflict-only insert writes a zero receipt with no invented IDs", async () => {
    const db = new FakePublicationDatabase();
    const result = await publishGroupedInserts(db, async () => [], [row(1, "remotive")], NOW, "ingest");
    expect(result).toEqual({ published: 0, failed: false });
    const receipt = db.runs.find((run) => run.query.includes("INSERT INTO source_publication_ledger"));
    expect(receipt?.values[5]).toBe(0);
    expect(receipt?.values[6]).toBe("[]");
  });

  test("partial insertion retains only actual inserted IDs", async () => {
    const db = new FakePublicationDatabase();
    const result = await publishGroupedInserts(db, async () => [91], [row(1, "remotive"), row(2, "remotive")], NOW, "scrape");
    expect(result).toEqual({ published: 1, failed: false });
    expect(db.runs.find((run) => run.query.includes("INSERT INTO source_publication_ledger"))?.values[6]).toBe("[91]");
  });

  test("an adapter cannot return more distinct IDs than the allowed batch", async () => {
    const db = new FakePublicationDatabase();
    await expect(publishGroupedInserts(db, async () => [91, 92], [row(1, "remotive")], NOW, "scrape"))
      .rejects.toThrow("insert returned more persisted IDs than allowed");
    expect(db.runs.filter((run) => run.query.includes("INSERT INTO source_publication_ledger"))).toHaveLength(0);
  });

  test("invalid-only IDs do not become a publication count", async () => {
    const db = new FakePublicationDatabase();
    expect(await publishGroupedInserts(db, async () => [0, -1, Number.NaN], [row(1, "remotive")], NOW, "ingest"))
      .toEqual({ published: 0, failed: false });
    const receipt = db.runs.find((run) => run.query.includes("INSERT INTO source_publication_ledger"));
    expect(receipt?.values[5]).toBe(0);
    expect(receipt?.values[6]).toBe("[]");
  });

  test("a count-only persistence result cannot fabricate an ID receipt", async () => {
    const db = new FakePublicationDatabase();
    await expect(publishGroupedInserts(db, async () => 1 as unknown as number[], [row(1, "remotive")], NOW, "scrape"))
      .rejects.toThrow("opportunity insert must return persisted IDs");
    expect(db.runs.filter((run) => run.query.includes("INSERT INTO source_publication_ledger"))).toHaveLength(0);
  });
});

/** Real SQLite + production Drizzle D1 adapter; no network or native-module mocks. */
function sqliteD1() {
  const sqlite = new Database(":memory:");
  const columns = getTableConfig(opportunities).columns.map((column) =>
    `"${column.name}" ${column.getSQLType()}${column.name === "id" ? " PRIMARY KEY AUTOINCREMENT" : ""}`,
  );
  sqlite.exec(`CREATE TABLE opportunities (${columns.join(",")});
    CREATE UNIQUE INDEX opportunities_source_url_unique ON opportunities(source_url);
    CREATE UNIQUE INDEX content_hash_idx ON opportunities(content_hash);`);
  for (const filename of [
    "0026_fts5_search.sql", "0027_fts5_trigger_scope.sql",
    "0036_registry_foundation.sql", "0037_source_lifecycle_opt_out.sql",
    "0038_shadow_observations.sql", "0039_canary_transition_plane.sql",
    "0040_current_evidence_admission.sql", "0041_publication_ledger.sql", "0042_d1_like_glob_limit.sql",
  ]) sqlite.exec(readFileSync(new URL(`../../../packages/db/migrations/${filename}`, import.meta.url), "utf8"));
  const queries: string[] = [];
  const binding = {
    prepare(query: string) {
      queries.push(query);
      const statement = sqlite.query(query);
      let values: any[] = [];
      return {
        bind(...params: any[]) { values = params; return this; },
        async first() { return statement.get(...values); },
        async all() { return { results: statement.all(...values) }; },
        async raw() { return statement.values(...values); },
        async run() {
          const before = (sqlite.query("SELECT total_changes() AS n").get() as { n: number }).n;
          statement.run(...values);
          const after = (sqlite.query("SELECT total_changes() AS n").get() as { n: number }).n;
          return { success: true, meta: { changes: after - before } };
        },
      };
    },
  };
  return { sqlite, binding, queries };
}

describe("web insert receipts with SQLite RETURNING and FTS triggers", () => {
  test("grouped inserts record returned IDs through conflicts, FTS writes and idempotent retries", async () => {
    const { sqlite, binding } = sqliteD1();
    try {
      const db = getDb({ DB: binding as any });
      const publicationDb = publicationDbFromEnv({ DB: binding })!;
      const existing = row(1, "remotive");
      await db.insert(opportunities).values(existing).onConflictDoNothing().returning({ id: opportunities.id });
      let persistCalls = 0;
      const insert = async (rows: NewOpportunity[]) => {
        persistCalls++;
        const returned = await db.insert(opportunities).values(rows).onConflictDoNothing().returning({ id: opportunities.id });
        return returned.map((row) => row.id);
      };
      const candidates = [existing, row(2, "remotive"), row(3, "remotive")];
      const now = new Date().toISOString();
      const before = (sqlite.query("SELECT total_changes() AS n").get() as { n: number }).n;
      expect(await publishGroupedInserts(publicationDb, insert, candidates, now, "scrape")).toEqual({ published: 2, failed: false });
      const actualIds = (sqlite.query("SELECT id FROM opportunities WHERE source_url <> ? ORDER BY id").all(existing.sourceUrl) as { id: number }[]).map((row) => row.id);
      const receipt = sqlite.query("SELECT published_count AS n, published_ids_json AS ids FROM source_publication_ledger").get() as { n: number; ids: string };
      expect(receipt).toEqual({ n: 2, ids: JSON.stringify(actualIds) });
      const after = (sqlite.query("SELECT total_changes() AS n").get() as { n: number }).n;
      expect(after - before).toBeGreaterThan(3); // two opportunities + ledger + FTS changes
      expect(await publishGroupedInserts(publicationDb, insert, candidates, now, "scrape")).toEqual({ published: 2, failed: false });
      expect(persistCalls).toBe(1);
      expect(sqlite.query("SELECT COUNT(*) AS n FROM opportunities").get()).toEqual({ n: 3 });
      expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_ledger").get()).toEqual({ n: 1 });
    } finally { sqlite.close(); }
  });

  test("direct ingest keeps public IDs in receipts and counts hidden inserts separately", async () => {
    const { sqlite, binding, queries } = sqliteD1();
    const previousFetch = globalThis.fetch;
    globalThis.fetch = (async () => { throw new Error("outbound requests forbidden"); }) as unknown as typeof fetch;
    try {
      const request = new Request("https://example.test/api/ingest", {
        method: "POST", headers: { authorization: "Bearer test-secret", "content-type": "application/json" },
        body: JSON.stringify({ items: [
          { ...row(1, "remotive"), locationRaw: "Philippines", description: "Remote role open to applicants in the Philippines" },
          { ...row(2, "remotive"), locationRaw: "United States only", description: "Candidates must be based in the United States only" },
        ] }),
      });
      const response = await ingest({ request, locals: { runtime: { env: { DB: binding, PROXY_SECRET: "test-secret" } } } } as any);
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ success: true, inserted: 2, totalReceived: 2 });
      const publicRow = sqlite.query("SELECT id FROM opportunities WHERE is_active = 1").get() as { id: number };
      expect(publicRow).not.toBeNull();
      expect(sqlite.query("SELECT COUNT(*) AS n FROM opportunities WHERE is_active = 0").get()).toEqual({ n: 1 });
      expect(sqlite.query("SELECT published_count AS n, published_ids_json AS ids FROM source_publication_ledger").get()).toEqual({ n: 1, ids: JSON.stringify([publicRow.id]) });
      expect(queries.filter((query) => query.startsWith("insert into \"opportunities\""))).toHaveLength(2);
      expect(queries.filter((query) => query.startsWith("insert into \"opportunities\""))).toSatisfy((inserts: string[]) => inserts.every((query) => /returning "id"$/.test(query)));
    } finally {
      globalThis.fetch = previousFetch;
      sqlite.close();
    }
  });
});
