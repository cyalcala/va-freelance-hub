import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { readFileSync } from "node:fs";
import { getDb, opportunities, type NewOpportunity } from "@va-hub/db";
import { getTableConfig } from "drizzle-orm/sqlite-core";
import { normalizePersistedOpportunityIds, publicationDbFromEnv, publishGroupedInserts } from "../src/lib/publish-opportunities";
import { POST as ingest } from "../src/pages/api/ingest";
import { triageDrain } from "../src/lib/inngest/functions/triage-drain";
import { drainPendingTriageInline, recoverGateEligiblePending, reactivateFeedConfirmedJobs } from "../src/pages/api/cron/scrape";
import { publicationRetryKey, snapshotPublicationUpdate } from "../src/lib/publication-retry-key";
import { FakePublicationDatabase } from "./publication-db-fake";
import { NonRetriableError } from "inngest";

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
  test("unsupported insert material rejects before any persistence callback", async () => {
    for (const invalid of [Number.NaN, () => "value", { nested: undefined }]) {
      const db = new FakePublicationDatabase();
      let calls = 0;
      await expect(publishGroupedInserts(db, async () => { calls++; return [1]; },
        [{ ...row(1, "remotive"), description: invalid } as unknown as NewOpportunity], NOW, "scrape"))
        .rejects.toThrow("publication retry");
      expect(calls).toBe(0);
      expect(db.runs).toHaveLength(0);
    }
  });

  test("unchanged selected canary rows keep identity when only an unused suffix changes", async () => {
    const keys: unknown[] = [];
    for (const candidates of [[row(1), row(2), row(3)], [row(1), row(2), { ...row(4), description: "unused" }]]) {
      const db = new FakePublicationDatabase({ registry: [CANARY_ROW, CANARY_ROW] });
      await publishGroupedInserts(db, async rows => rows.map((_, index) => index + 1), candidates, NOW, "scrape");
      keys.push(db.runs.find(run => run.query.includes("INSERT INTO source_publication_ledger"))?.values[2]);
    }
    expect(keys[0]).toBe(keys[1]);
  });

  test("caller mutation during a policy read cannot change the source or persisted values", async () => {
    const original = row(1, "remotive");
    const db = new FakePublicationDatabase();
    const prepare = db.prepare.bind(db);
    db.prepare = query => {
      const statement = prepare(query);
      if (query.includes("FROM source_opt_outs")) {
        const first = statement.first.bind(statement);
        statement.first = async <T>() => {
          original.sourceId = "uncleared-source";
          original.title = "Mutated during read";
          return first<T>();
        };
      }
      return statement;
    };
    const persisted: NewOpportunity[] = [];
    await publishGroupedInserts(db, async rows => { persisted.push(...rows); return [1]; }, [original], NOW, "scrape");
    expect(persisted[0].sourceId).toBe("remotive");
    expect(persisted[0].title).toBe("Job 1");
    expect(db.runs.find(run => run.query.includes("INSERT INTO source_publication_ledger"))?.values[0]).toBe("remotive");
  });

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
  test("malformed returned IDs reject instead of silently filtering or deduplicating", () => {
    for (const ids of [[1, 1], [0], [-1], [1.5], [Number.NaN], [Infinity], [Number.MAX_SAFE_INTEGER + 1], ["1"], [null]]) {
      expect(() => normalizePersistedOpportunityIds(ids as number[])).toThrow("persisted IDs");
    }
    expect(normalizePersistedOpportunityIds([])).toEqual([]);
    expect(normalizePersistedOpportunityIds([4, 2])).toEqual([4, 2]);
    const sparse = new Array(1);
    const concealed = [1, 1];
    Object.defineProperty(concealed, Symbol.iterator, { value: function* () { yield 1; } });
    const getter = [1];
    let reads = 0;
    Object.defineProperty(getter, "0", { get() { reads++; return 1; } });
    for (const invalid of [sparse, concealed, getter]) expect(() => normalizePersistedOpportunityIds(invalid)).toThrow("persisted IDs");
    expect(reads).toBe(0);
  });

  test("malformed insert acknowledgements preserve UNKNOWN instead of sanitizing IDs", async () => {
    const db = new FakePublicationDatabase();
    const result = await publishGroupedInserts(db, async () => [
      41, 41, 42, 0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY,
      Number.MAX_SAFE_INTEGER + 1, "43", null,
    ] as unknown as number[], Array.from({ length: 11 }, (_, i) => row(i, "remotive")), NOW, "ingest");
    expect(result).toEqual({ published: 0, failed: true, publicationOutcome: "UNKNOWN" });
    const receipt = db.runs.find((run) => run.query.includes("INSERT INTO source_publication_ledger"));
    expect(receipt).toBeUndefined();
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
    expect(await publishGroupedInserts(db, async () => [91, 92], [row(1, "remotive")], NOW, "scrape"))
      .toEqual({ published: 0, failed: true, publicationOutcome: "UNKNOWN" });
    expect(db.runs.filter((run) => run.query.includes("INSERT INTO source_publication_ledger"))).toHaveLength(0);
  });

  test("invalid-only IDs do not become a publication count", async () => {
    const db = new FakePublicationDatabase();
    expect(await publishGroupedInserts(db, async () => [0, -1, Number.NaN], [row(1, "remotive")], NOW, "ingest"))
      .toEqual({ published: 0, failed: true, publicationOutcome: "UNKNOWN" });
    const receipt = db.runs.find((run) => run.query.includes("INSERT INTO source_publication_ledger"));
    expect(receipt).toBeUndefined();
  });

  test("a count-only persistence result cannot fabricate an ID receipt", async () => {
    const db = new FakePublicationDatabase();
    expect(await publishGroupedInserts(db, async () => 1 as unknown as number[], [row(1, "remotive")], NOW, "scrape"))
      .toEqual({ published: 0, failed: true, publicationOutcome: "UNKNOWN" });
    expect(db.runs.filter((run) => run.query.includes("INSERT INTO source_publication_ledger"))).toHaveLength(0);
  });
});

/** Real SQLite + production Drizzle D1 adapter; no network or native-module mocks. */
function sqliteD1(options: { beforeOpportunityUpdate?: (sqlite: Database) => void; rejectLedger?: boolean;
  throwAfterOpportunityUpdate?: boolean } = {}) {
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
  const opportunityMutationChanges: number[] = [];
  const binding = {
    prepare(query: string) {
      queries.push(query);
      if (/^update "opportunities"/i.test(query)) options.beforeOpportunityUpdate?.(sqlite);
      const statement = sqlite.query(query);
      let values: any[] = [];
      return {
        bind(...params: any[]) { values = params; return this; },
        async first() { return statement.get(...values); },
        async all() { return { results: statement.all(...values) }; },
        async raw() {
          const before = (sqlite.query("SELECT total_changes() AS n").get() as { n: number }).n;
          const rows = statement.values(...values);
          if (/^update "opportunities"/i.test(query)) {
            opportunityMutationChanges.push((sqlite.query("SELECT total_changes() AS n").get() as { n: number }).n - before);
            if (options.throwAfterOpportunityUpdate) throw new Error("secret diagnostic after successful update");
          }
          return rows;
        },
        async run() {
          if (options.rejectLedger && query.includes("INSERT INTO source_publication_ledger")) throw new Error("secret ledger diagnostic");
          const before = (sqlite.query("SELECT total_changes() AS n").get() as { n: number }).n;
          statement.run(...values);
          const after = (sqlite.query("SELECT total_changes() AS n").get() as { n: number }).n;
          if (/^update "opportunities"/i.test(query)) {
            opportunityMutationChanges.push(after - before);
            if (options.throwAfterOpportunityUpdate) throw new Error("secret diagnostic after successful update");
          }
          return { success: true, meta: { changes: after - before } };
        },
      };
    },
  };
  return { sqlite, binding, queries, opportunityMutationChanges };
}

describe("web insert receipts with SQLite RETURNING and FTS triggers", () => {
  test("a malformed insert acknowledgement stops later groups and leaves actual written rows explicitly UNKNOWN", async () => {
    const { sqlite, binding } = sqliteD1();
    try {
      const db = getDb({ DB: binding as any });
      let calls = 0;
      const result = await publishGroupedInserts(publicationDbFromEnv({ DB: binding })!, async rows => {
        calls++;
        const returned = await db.insert(opportunities).values(rows).returning({ id: opportunities.id });
        return [returned[0].id, returned[0].id];
      }, [row(1, "remotive"), row(2, "remote-ok")], new Date().toISOString(), "scrape");
      expect(result).toEqual({ published: 0, failed: true, publicationOutcome: "UNKNOWN" });
      expect(calls).toBe(1);
      expect(sqlite.query("SELECT source_id AS source FROM opportunities").all()).toEqual([{ source: "remotive" }]);
      expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_ledger").get()).toEqual({ n: 0 });
    } finally { sqlite.close(); }
  });

  test("direct ingest returns fixed UNKNOWN and stops hidden writes after its public ledger fails", async () => {
    const { sqlite, binding } = sqliteD1({ rejectLedger: true });
    try {
      const request = new Request("https://example.test/api/ingest", { method: "POST",
        headers: { authorization: "Bearer test-secret", "content-type": "application/json" },
        body: JSON.stringify({ items: [
          { ...row(1, "remotive"), locationRaw: "Philippines", description: "Remote role open to applicants in the Philippines" },
          { ...row(2, "remotive"), locationRaw: "United States only", description: "Candidates must be based in the United States only" },
        ] }) });
      const response = await ingest({ request, locals: { runtime: { env: { DB: binding, PROXY_SECRET: "test-secret" } } } } as any);
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toMatchObject({ success: false, code: "POST_PERSISTENCE_FAILURE", publicationOutcome: "UNKNOWN",
        inserted: null, reconciliationRequired: true, confirmedPublishedLowerBound: 0 });
      expect(JSON.stringify(body)).not.toContain("secret ledger diagnostic");
      expect(sqlite.query("SELECT COUNT(*) AS n FROM opportunities WHERE is_active = 1").get()).toEqual({ n: 1 });
      expect(sqlite.query("SELECT COUNT(*) AS n FROM opportunities WHERE is_active = 0").get()).toEqual({ n: 0 });
      expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_ledger").get()).toEqual({ n: 0 });
    } finally { sqlite.close(); }
  });

  test("native Inngest uncertain updates halt with the actual NonRetriableError and retain written rows", async () => {
    for (const options of [{ rejectLedger: true }, { throwAfterOpportunityUpdate: true }]) {
      const { sqlite, binding } = sqliteD1(options);
      try {
        const db = getDb({ DB: binding as any });
        await db.insert(opportunities).values({ ...row(1, "remotive"), description: "Remote role open worldwide.", locationRaw: "Remote",
          isActive: false, inactiveReason: "pending-triage", scrapedAt: new Date().toISOString() });
        const responses = [JSON.stringify({ eligibleForFilipinos: true, reason: "Open worldwide", category: "tech" }),
          JSON.stringify({ eligible: true, reason: "no disqualifier" })];
        let triageSteps = 0;
        const run = (triageDrain as unknown as { fn: (ctx: unknown) => Promise<unknown> }).fn;
        let error: unknown;
        try {
          await run({ env: { DB: binding, AI: { run: async () => ({ response: responses.shift() }) } },
            step: { run: async (name: string, callback: () => Promise<unknown>) => {
              if (name.startsWith("triage-")) triageSteps++;
              return callback();
            } } });
        } catch (caught) { error = caught; }
        expect(error).toBeInstanceOf(NonRetriableError);
        expect(error).toMatchObject({ message: "Publication persistence outcome is UNKNOWN; reconciliation is required",
          cause: { publicationOutcome: "UNKNOWN" } });
        expect(String(error)).not.toContain("secret diagnostic");
        expect(triageSteps).toBe(1); // local callback executed once, no synchronous retry
        expect(sqlite.query("SELECT is_active AS active FROM opportunities").get()).toEqual({ active: 1 });
        expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_ledger").get()).toEqual({ n: 0 });
      } finally { sqlite.close(); }
    }
  });

  test("native inline uncertain updates halt before the next row and retain the first written row", async () => {
    for (const options of [{ rejectLedger: true }, { throwAfterOpportunityUpdate: true }]) {
      const { sqlite, binding } = sqliteD1(options);
      try {
        const db = getDb({ DB: binding as any });
        const now = new Date().toISOString();
        await db.insert(opportunities).values([1, 2].map(i => ({ ...row(i, "remotive"), description: "Remote role open worldwide.",
          locationRaw: "Remote", isActive: false, inactiveReason: "pending-triage", scrapedAt: now })));
        const responses = [JSON.stringify({ eligibleForFilipinos: true, reason: "Open worldwide", category: "tech" }),
          JSON.stringify({ eligible: true, reason: "no disqualifier" })];
        const env = { DB: binding, AI: { run: async () => ({ response: responses.shift() }) } };
        await expect(drainPendingTriageInline(db, env, { exhausted: () => false }, now, 4, publicationDbFromEnv(env)))
          .rejects.toMatchObject({ publicationOutcome: "UNKNOWN", confirmedPublishedLowerBound: 0 });
        expect(sqlite.query("SELECT is_active AS active FROM opportunities ORDER BY id").all()).toEqual([{ active: 1 }, { active: 0 }]);
        expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_ledger").get()).toEqual({ n: 0 });
      } finally { sqlite.close(); }
    }
  });

  test("gate recovery rechecks current eligibility and records only IDs actually updated", async () => {
    let changedId = 0;
    const { sqlite, binding } = sqliteD1({ beforeOpportunityUpdate: sqlite => {
      sqlite.query("UPDATE opportunities SET geo_scope = 'country_locked' WHERE id = ?").run(changedId);
    } });
    try {
      const db = getDb({ DB: binding as any });
      const now = new Date().toISOString();
      const targets = await db.insert(opportunities).values([1, 2].map(i => ({ ...row(i, "remotive"),
        isActive: false, inactiveReason: "pending-triage", geoScope: "ph_only" as const, scrapedAt: now }))).returning({ id: opportunities.id });
      changedId = targets[1].id;
      expect(await recoverGateEligiblePending(db, now, publicationDbFromEnv({ DB: binding }))).toBe(1);
      expect(sqlite.query("SELECT published_count AS n, published_ids_json AS ids FROM source_publication_ledger").get())
        .toEqual({ n: 1, ids: JSON.stringify([targets[0].id]) });
      expect(sqlite.query("SELECT is_active AS active FROM opportunities WHERE id = ?").get(changedId)).toEqual({ active: 0 });
    } finally { sqlite.close(); }
  });

  test("grouped activation with no remaining matches records exact zero and empty actual IDs", async () => {
    for (const mode of ["gate", "feed"] as const) {
      const { sqlite, binding } = sqliteD1({ beforeOpportunityUpdate: sqlite => sqlite.exec("DELETE FROM opportunities") });
      try {
        const db = getDb({ DB: binding as any });
        const now = new Date().toISOString();
        const candidate = { ...row(1, "remotive"), isActive: false,
          inactiveReason: mode === "gate" ? "pending-triage" : "stale-feed", geoScope: "ph_only" as const,
          phEligibility: "eligible_verified" as const, scrapedAt: now };
        await db.insert(opportunities).values(candidate);
        const publicationDb = publicationDbFromEnv({ DB: binding });
        const result = mode === "gate" ? await recoverGateEligiblePending(db, now, publicationDb)
          : await reactivateFeedConfirmedJobs(db, [candidate.sourceUrl], now, publicationDb);
        expect(result).toBe(0);
        expect(sqlite.query("SELECT published_count AS n, published_ids_json AS ids FROM source_publication_ledger").get())
          .toEqual({ n: 0, ids: "[]" });
      } finally { sqlite.close(); }
    }
  });

  test("registered Inngest drain with a vanished target produces a valid zero acknowledgement", async () => {
    const { sqlite, binding } = sqliteD1({ beforeOpportunityUpdate: sqlite => sqlite.exec("DELETE FROM opportunities") });
    try {
      const db = getDb({ DB: binding as any });
      await db.insert(opportunities).values({ ...row(1, "remotive"), description: "Remote role open worldwide.", locationRaw: "Remote",
        isActive: false, inactiveReason: "pending-triage", scrapedAt: new Date().toISOString() });
      const responses = [JSON.stringify({ eligibleForFilipinos: true, reason: "Open worldwide", category: "tech" }),
        JSON.stringify({ eligible: true, reason: "no disqualifier" })];
      const run = (triageDrain as unknown as { fn: (ctx: unknown) => Promise<unknown> }).fn;
      expect(await run({ env: { DB: binding, AI: { run: async () => ({ response: responses.shift() }) } },
        step: { run: async (_: string, callback: () => Promise<unknown>) => callback() } }))
        .toEqual({ claimed: 1, published: 0, rejected: 0, quarantined: 0, deferred: 1 });
      expect(sqlite.query("SELECT published_count AS n, published_ids_json AS ids FROM source_publication_ledger").get())
        .toEqual({ n: 0, ids: "[]" });
    } finally { sqlite.close(); }
  });

  test("feed reactivation rechecks current eligibility and records only its actual RETURNING subset", async () => {
    let changedId = 0;
    const { sqlite, binding } = sqliteD1({ beforeOpportunityUpdate: sqlite => {
      sqlite.query("UPDATE opportunities SET ph_eligibility = 'ineligible' WHERE id = ?").run(changedId);
    } });
    try {
      const db = getDb({ DB: binding as any });
      const now = new Date().toISOString();
      const candidates = [1, 2].map(i => ({ ...row(i, "remotive"), isActive: false, inactiveReason: "stale-feed",
        phEligibility: "eligible_likely" as const, scrapedAt: now }));
      const targets = await db.insert(opportunities).values(candidates).returning({ id: opportunities.id });
      changedId = targets[1].id;
      expect(await reactivateFeedConfirmedJobs(db, candidates.map(row => row.sourceUrl), now, publicationDbFromEnv({ DB: binding }))).toBe(1);
      expect(sqlite.query("SELECT published_count AS n, published_ids_json AS ids FROM source_publication_ledger").get())
        .toEqual({ n: 1, ids: JSON.stringify([targets[0].id]) });
      expect(sqlite.query("SELECT is_active AS active FROM opportunities WHERE id = ?").get(changedId)).toEqual({ active: 0 });
    } finally { sqlite.close(); }
  });

  test("inline drain with no remaining target records a valid empty acknowledgement", async () => {
    const { sqlite, binding } = sqliteD1({ beforeOpportunityUpdate: sqlite => sqlite.exec("DELETE FROM opportunities") });
    try {
      const db = getDb({ DB: binding as any });
      const now = new Date().toISOString();
      await db.insert(opportunities).values({ ...row(1, "remotive"), description: "Remote role open worldwide.",
        locationRaw: "Remote", isActive: false, inactiveReason: "pending-triage", scrapedAt: now });
      const responses = [JSON.stringify({ eligibleForFilipinos: true, reason: "Open worldwide", category: "tech" }),
        JSON.stringify({ eligible: true, reason: "no disqualifier" })];
      const env = { DB: binding, AI: { run: async () => ({ response: responses.shift() }) } };
      expect(await drainPendingTriageInline(db, env, { exhausted: () => false }, now, 4, publicationDbFromEnv(env)))
        .toEqual({ claimed: 1, published: 0, rejected: 0, quarantined: 0, deferred: 1 });
      expect(sqlite.query("SELECT published_count AS n, published_ids_json AS ids FROM source_publication_ledger").get())
        .toEqual({ n: 0, ids: "[]" });
    } finally { sqlite.close(); }
  });

  test("the inline drain binds the target and complete patch actually written in SQLite", async () => {
    const { sqlite, binding, opportunityMutationChanges } = sqliteD1();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => { throw new Error("outbound requests forbidden"); }) as unknown as typeof fetch;
    try {
      const db = getDb({ DB: binding as any });
      const now = new Date().toISOString();
      const inserted = await db.insert(opportunities).values({ ...row(5, "remotive"), description: "Remote role open worldwide.",
        locationRaw: "Remote", tags: ["va"], isActive: false, inactiveReason: "pending-triage", scrapedAt: now }).returning({ id: opportunities.id });
      const responses = [JSON.stringify({ eligibleForFilipinos: true, reason: "Open worldwide", category: "tech",
        tags: ["remote"], payRange: "$11/hour", experienceLevel: "mid", employmentType: "full-time",
        applicationUrl: "https://example.test/apply/5" }), JSON.stringify({ eligible: true, reason: "no disqualifier" })];
      const env = { DB: binding, AI: { run: async () => ({ response: responses.shift() }) } };
      const result = await drainPendingTriageInline(db, env, { exhausted: () => false }, now, 12, publicationDbFromEnv(env));
      expect(result).toEqual({ claimed: 1, published: 1, rejected: 0, quarantined: 0, deferred: 0 });
      const actual = sqlite.query(`SELECT is_active AS isActive, inactive_reason AS inactiveReason, geo_scope AS geoScope,
        ph_eligibility AS phEligibility, geo_evidence AS geoEvidence, geo_checked_at AS geoCheckedAt,
        application_url AS applicationUrl, tags, pay_range AS payRange, category, experience_level AS experienceLevel,
        type, updated_at AS updatedAt FROM opportunities WHERE id = ?`).get(inserted[0].id) as Record<string, any>;
      actual.isActive = Boolean(actual.isActive);
      actual.tags = JSON.parse(actual.tags);
      expect(actual).toMatchObject({ isActive: true, inactiveReason: null, payRange: "$11/hour", experienceLevel: "mid", type: "full-time" });
      const receipt = sqlite.query(`SELECT source_id AS sourceId, tick_key AS tickKey, retry_key AS retryKey,
        proposed_count AS proposedCount, published_count AS publishedCount, published_ids_json AS ids
        FROM source_publication_ledger`).get() as { sourceId: string; tickKey: string; retryKey: string; proposedCount: number; publishedCount: number; ids: string };
      expect(receipt.proposedCount).toBe(1);
      expect(receipt.publishedCount).toBe(1);
      expect(opportunityMutationChanges[0]).toBeGreaterThan(1); // real tag update + FTS writes do not inflate the receipt
      expect(receipt.ids).toBe(JSON.stringify([inserted[0].id]));
      expect(receipt.retryKey).toBe(await publicationRetryKey({ sourceId: receipt.sourceId, tickKey: receipt.tickKey,
        action: "scrape-drain", proposedCount: 1, material: { id: inserted[0].id, patch: snapshotPublicationUpdate(actual).material } }));
    } finally { globalThis.fetch = originalFetch; sqlite.close(); }
  });

  test("the real Inngest drain binds the target and entire patch actually written in SQLite", async () => {
    const { sqlite, binding, opportunityMutationChanges } = sqliteD1();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => { throw new Error("outbound requests forbidden"); }) as unknown as typeof fetch;
    try {
      const db = getDb({ DB: binding as any });
      const inserted = await db.insert(opportunities).values({ ...row(4, "remotive"),
        description: "Remote role open worldwide.", locationRaw: "Remote", tags: ["va"],
        isActive: false, inactiveReason: "pending-triage", scrapedAt: new Date().toISOString() }).returning({ id: opportunities.id });
      const responses = [JSON.stringify({ eligibleForFilipinos: true, reason: "Open worldwide", category: "tech",
        tags: ["remote"], payRange: "$10/hour", experienceLevel: "entry", employmentType: "part-time",
        applicationUrl: "https://example.test/apply/4" }), JSON.stringify({ eligible: true, reason: "no disqualifier" })];
      const steps: string[] = [];
      // Execute the actual registered handler with local step callbacks; this
      // does not simulate Inngest transport, scheduling, middleware or caching.
      const run = (triageDrain as unknown as { fn: (ctx: unknown) => Promise<unknown> }).fn;
      const result = await run({ env: { DB: binding, AI: { run: async () => ({ response: responses.shift() }) } },
        step: { run: async (name: string, callback: () => Promise<unknown>) => { steps.push(name); return callback(); } } });
      expect(result).toEqual({ claimed: 1, published: 1, rejected: 0, quarantined: 0, deferred: 0 });
      expect(steps).toEqual(["load-pending", `triage-${inserted[0].id}`]);
      const actual = sqlite.query(`SELECT is_active AS isActive, inactive_reason AS inactiveReason, geo_scope AS geoScope,
        ph_eligibility AS phEligibility, geo_evidence AS geoEvidence, geo_checked_at AS geoCheckedAt,
        application_url AS applicationUrl, tags, pay_range AS payRange, category, experience_level AS experienceLevel,
        type, updated_at AS updatedAt FROM opportunities WHERE id = ?`).get(inserted[0].id) as Record<string, any>;
      actual.isActive = Boolean(actual.isActive);
      actual.tags = JSON.parse(actual.tags);
      expect(actual).toMatchObject({ isActive: true, inactiveReason: null, payRange: "$10/hour", experienceLevel: "entry", type: "part-time" });
      const receipt = sqlite.query(`SELECT source_id AS sourceId, tick_key AS tickKey, retry_key AS retryKey,
        proposed_count AS proposedCount, published_count AS publishedCount, published_ids_json AS ids
        FROM source_publication_ledger`).get() as { sourceId: string; tickKey: string; retryKey: string; proposedCount: number; publishedCount: number; ids: string };
      expect(receipt.proposedCount).toBe(1);
      expect(receipt.publishedCount).toBe(1);
      expect(opportunityMutationChanges[0]).toBeGreaterThan(1);
      expect(receipt.ids).toBe(JSON.stringify([inserted[0].id]));
      const expected = await publicationRetryKey({ sourceId: receipt.sourceId, tickKey: receipt.tickKey,
        action: "triage-drain", proposedCount: 1, material: { id: inserted[0].id, patch: snapshotPublicationUpdate(actual).material } });
      expect(receipt.retryKey).toBe(expected);
    } finally { globalThis.fetch = originalFetch; sqlite.close(); }
  });

  test("same URLs with changed persisted material do not replay a different insert", async () => {
    const { sqlite, binding } = sqliteD1();
    try {
      const db = getDb({ DB: binding as any });
      const publicationDb = publicationDbFromEnv({ DB: binding })!;
      let calls = 0;
      const insert = async (rows: NewOpportunity[]) => {
        calls++;
        return (await db.insert(opportunities).values(rows).onConflictDoNothing().returning({ id: opportunities.id })).map(row => row.id);
      };
      const first = { ...row(1, "remotive"), description: "Original", tags: ["va"], phEligibility: "eligible_likely" as const };
      const now = new Date().toISOString();
      expect(await publishGroupedInserts(publicationDb, insert, [first], now, "scrape")).toEqual({ published: 1, failed: false });
      expect(await publishGroupedInserts(publicationDb, insert, [{ ...first, description: "Changed" }], now, "scrape"))
        .toEqual({ published: 0, failed: false }); // the actual UNIQUE conflict, not the old receipt
      expect(calls).toBe(2);
      expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_ledger").get()).toEqual({ n: 2 });
      expect(sqlite.query("SELECT description FROM opportunities").get()).toEqual({ description: "Original" });
    } finally { sqlite.close(); }
  });

  test("complete URLs beyond the old 200-character prefix distinguish native inserts", async () => {
    const { sqlite, binding } = sqliteD1();
    try {
      const db = getDb({ DB: binding as any });
      const publicationDb = publicationDbFromEnv({ DB: binding })!;
      let calls = 0;
      const insert = async (rows: NewOpportunity[]) => {
        calls++;
        return (await db.insert(opportunities).values(rows).onConflictDoNothing().returning({ id: opportunities.id })).map(row => row.id);
      };
      const prefix = `https://example.test/${"a".repeat(240)}/`;
      const now = new Date().toISOString();
      await publishGroupedInserts(publicationDb, insert, [{ ...row(1, "remotive"), sourceUrl: `${prefix}one` }], now, "scrape");
      await publishGroupedInserts(publicationDb, insert, [{ ...row(2, "remotive"), sourceUrl: `${prefix}two` }], now, "scrape");
      expect(calls).toBe(2);
      expect(sqlite.query("SELECT COUNT(*) AS n FROM opportunities").get()).toEqual({ n: 2 });
      expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_ledger").get()).toEqual({ n: 2 });
    } finally { sqlite.close(); }
  });

  test("a changed canary-selected prefix binds the rows actually passed to persistence", async () => {
    const retryKeys: unknown[] = [];
    const selected: string[][] = [];
    for (const candidates of [[row(1), row(2), row(3)], [row(3), row(2), row(1)]]) {
      const db = new FakePublicationDatabase({ registry: [CANARY_ROW, CANARY_ROW] });
      await publishGroupedInserts(db, async (rows) => {
        selected.push(rows.map(row => row.sourceUrl));
        return rows.map((_, index) => index + 1);
      }, candidates, NOW, "scrape");
      retryKeys.push(db.runs.find(run => run.query.includes("INSERT INTO source_publication_ledger"))?.values[2]);
    }
    expect(selected).toEqual([[row(1).sourceUrl, row(2).sourceUrl], [row(3).sourceUrl, row(2).sourceUrl]]);
    expect(retryKeys[0]).not.toBe(retryKeys[1]);
  });

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
      const reorderedProperties = candidates.map(row => Object.fromEntries(Object.entries(row).reverse()) as unknown as NewOpportunity);
      expect(await publishGroupedInserts(publicationDb, insert, reorderedProperties, now, "scrape")).toEqual({ published: 2, failed: false });
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
