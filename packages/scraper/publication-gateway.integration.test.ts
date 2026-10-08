import { expect, test } from "bun:test";
import { Database, type SQLQueryBindings } from "bun:sqlite";
import { readFileSync } from "fs";
import { join } from "path";
import { publishPublicExposure, publicationTickKey, type PublicationDatabase, type PublicationStatement } from "./publication-gateway";

const NOW = new Date().toISOString();
const TICK = publicationTickKey("scrape", NOW);

class BunStatement implements PublicationStatement {
  private values: SQLQueryBindings[] = [];
  constructor(private readonly db: Database, private readonly query: string, private readonly runs: string[]) {}
  bind(...values: unknown[]) { this.values = values as SQLQueryBindings[]; return this; }
  async first<T>() { return (this.db.query(this.query).get(...this.values) as T | null) ?? null; }
  async run() {
    this.runs.push(this.query);
    this.db.query(this.query).run(...this.values);
    return { success: true };
  }
}
class BunDb implements PublicationDatabase {
  readonly runs: string[] = [];
  readonly queries: string[] = [];
  constructor(private readonly db: Database) {}
  prepare(query: string): PublicationStatement {
    this.queries.push(query); return new BunStatement(this.db, query, this.runs);
  }
}

function freshDb(): Database {
  const db = new Database(":memory:");
  db.exec("PRAGMA foreign_keys = ON;");
  for (const migration of [
    "0000_workable_sandman.sql", "0026_fts5_search.sql", "0027_fts5_trigger_scope.sql",
    "0036_registry_foundation.sql", "0037_source_lifecycle_opt_out.sql",
    "0038_shadow_observations.sql", "0039_canary_transition_plane.sql",
    "0040_current_evidence_admission.sql", "0041_publication_ledger.sql",
    "0042_d1_like_glob_limit.sql",
  ]) {
    db.exec(readFileSync(join(import.meta.dir, "../db/migrations", migration), "utf-8"));
  }
  return db;
}

test("SP-23C ledger persists unlimited exact-six writes, empty ticks, and retry identity", async () => {
  const sqlite = freshDb();
  const db = new BunDb(sqlite);
  const unlimited = await publishPublicExposure(db, {
    sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "u1", proposedCount: 5,
    persist: async (allowed) => ({ publishedCount: allowed, ids: [1, 2, 3, 4, 5] }),
  });
  expect(unlimited).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 5 });

  const empty = await publishPublicExposure(db, {
    sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "empty", proposedCount: 0,
    persist: async () => ({ publishedCount: 9, ids: [9] }),
  });
  expect(empty).toMatchObject({ ok: true, publishedCount: 0 });

  const replay = await publishPublicExposure(db, {
    sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "u1", proposedCount: 5,
    persist: async () => ({ publishedCount: 99, ids: [99] }),
  });
  expect(replay).toMatchObject({ ok: true, publishedCount: 5, ids: [1, 2, 3, 4, 5], replayed: true });
  expect(() => sqlite.exec("DELETE FROM source_publication_ledger")).toThrow(/append-only/i);
  sqlite.close();
});

interface StoredRetry {
  sourceId: string; tickKey: string; mode: string; proposedCount: number; publishedCount: number; idsJson: string;
}
function seedRetry(sqlite: Database, change: Partial<StoredRetry> = {}) {
  const row = { sourceId: "we-work-remotely", tickKey: TICK, mode: "unlimited", proposedCount: 2,
    publishedCount: 2, idsJson: "[10,11]", ...change };
  sqlite.query(`INSERT INTO source_publication_ledger(source_id,tick_key,retry_key,mode,proposed_count,published_count,published_ids_json,decided_at)
    VALUES(?,?,'saved-retry',?,?,?,?,?)`).run(row.sourceId, row.tickKey, row.mode, row.proposedCount, row.publishedCount, row.idsJson, NOW);
}
async function inspectRetry(sqlite: Database, change: Partial<{ sourceId: string; tickKey: string; proposedCount: number }> = {}) {
  const db = new BunDb(sqlite), before = sqlite.serialize(); let persisted = 0;
  const result = await publishPublicExposure(db, { sourceId: "we-work-remotely", now: NOW, tickKey: TICK,
    retryKey: "saved-retry", proposedCount: 2, ...change,
    persist: async () => { persisted++; return { publishedCount: 2, ids: [99, 100] }; } });
  expect(persisted).toBe(0); expect(db.runs).toEqual([]);
  expect(db.queries).toHaveLength(1);
  expect(db.queries[0]).toContain("FROM source_publication_ledger WHERE retry_key");
  expect(sqlite.serialize()).toEqual(before);
  expect(() => sqlite.exec("UPDATE source_publication_ledger SET mode='blocked'")).toThrow(/append-only/i);
  expect(() => sqlite.exec("DELETE FROM source_publication_ledger")).toThrow(/append-only/i);
  return result;
}

for (const [name, change] of [
  ["different source", { sourceId: "remotive" }], ["different tick", { tickKey: publicationTickKey("activation", NOW) }],
  ["different proposed count", { proposedCount: 3 }],
] as const) test(`native replay rejects the globally unique retry key for ${name}`, async () => {
  const sqlite = freshDb();
  try { seedRetry(sqlite); expect((await inspectRetry(sqlite, change)).ok).toBe(false); }
  finally { sqlite.close(); }
});

for (const [name, idsJson] of [
  ["duplicate IDs", "[10,10]"], ["missing ID", "[10]"], ["extra ID", "[10,11,12]"], ["empty IDs", "[]"],
  ["zero ID", "[0,11]"], ["negative ID", "[-1,11]"], ["fractional ID", "[1.5,11]"],
  ["unsafe integer ID", "[9007199254740992,11]"], ["string ID", '["10",11]'], ["null ID", "[null,11]"],
  ["object ID", "[{},11]"], ["array ID", "[[],11]"],
] as const) test(`native schema-permitted receipt with ${name} fails closed`, async () => {
  const sqlite = freshDb();
  try { seedRetry(sqlite, { idsJson }); expect((await inspectRetry(sqlite)).ok).toBe(false); }
  finally { sqlite.close(); }
});

for (const mode of ["blocked", "rolled_back"] as const) {
  test(`native ${mode} historical receipt replays only exact zero exposure`, async () => {
    const sqlite = freshDb();
    try {
      seedRetry(sqlite, { mode, publishedCount: 0, idsJson: "[]" });
      expect(await inspectRetry(sqlite)).toMatchObject({ ok: true, mode, publishedCount: 0, ids: [], replayed: true });
    } finally { sqlite.close(); }
  });
  test(`native schema-permitted ${mode} receipt cannot conceal nonempty IDs`, async () => {
    const sqlite = freshDb();
    try { seedRetry(sqlite, { mode, publishedCount: 0, idsJson: "[10]" }); expect((await inspectRetry(sqlite)).ok).toBe(false); }
    finally { sqlite.close(); }
  });
}

test("native valid empty unlimited receipt replays unchanged", async () => {
  const sqlite = freshDb();
  try {
    seedRetry(sqlite, { proposedCount: 0, publishedCount: 0, idsJson: "[]" });
    expect(await inspectRetry(sqlite, { proposedCount: 0 })).toEqual({ ok: true, mode: "unlimited", publishedCount: 0, ids: [], replayed: true });
  } finally { sqlite.close(); }
});

for (const [name, change] of [
  ["malformed JSON", { idsJson: "[10," }], ["JSON object", { idsJson: "{}" }], ["JSON null", { idsJson: "null" }],
  ["unknown mode", { mode: "unexpected" }], ["negative count", { publishedCount: -1 }],
  ["fractional count", { publishedCount: 1.5 }], ["excess published count", { publishedCount: 3 }],
  ["unsafe proposed count", { proposedCount: Number.MAX_SAFE_INTEGER + 1 }],
] as const) test(`fixture-only CHECK bypass: native corrupted ${name} returns failure without effects`, async () => {
  const sqlite = freshDb();
  try {
    // Corruption fixture only: these states are forbidden by the actual production migration CHECKs.
    sqlite.exec("PRAGMA ignore_check_constraints=ON"); seedRetry(sqlite, change);
    sqlite.exec("PRAGMA ignore_check_constraints=OFF");
    expect((await inspectRetry(sqlite)).ok).toBe(false);
  } finally { sqlite.close(); }
});

test("native production constraints independently reject malformed JSON, illegal mode and over-published receipts", () => {
  const sqlite = freshDb();
  try {
    expect(() => seedRetry(sqlite, { idsJson: "broken" })).toThrow(/CHECK/i);
    expect(() => seedRetry(sqlite, { mode: "unexpected" })).toThrow(/CHECK/i);
    expect(() => seedRetry(sqlite, { publishedCount: 3 })).toThrow(/CHECK/i);
    expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_ledger").get()).toEqual({ n: 0 });
  } finally { sqlite.close(); }
});

function writeOpportunity(sqlite: Database, key = "fresh-native"): number[] {
  const rows = sqlite.query(`INSERT INTO opportunities(title, company, source_url, source_platform, content_hash)
    VALUES('Native acknowledgement fixture', 'Fixture company', ?, 'remotive', ?)
    ON CONFLICT(source_url) DO NOTHING RETURNING id`).all(`https://example.invalid/${key}`, key) as Array<{ id: number }>;
  return rows.map(row => row.id);
}
function assertWrittenRowWithoutReceipt(sqlite: Database) {
  expect(sqlite.query("SELECT COUNT(*) AS n FROM opportunities WHERE is_active=1").get()).toEqual({ n: 1 });
  expect(sqlite.query("SELECT rowid FROM opportunities_fts WHERE opportunities_fts MATCH 'acknowledgement'").all()).toHaveLength(1);
  expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_ledger").get()).toEqual({ n: 0 });
}
const postPersistenceUnknown = { ok: false, code: "POST_PERSISTENCE_FAILURE", persistenceAttempted: true, exposure: "UNKNOWN" };

for (const [name, acknowledgement] of [
  ["inflated count", { publishedCount: 2, ids: [1, 2] }],
  ["count without IDs", { publishedCount: 1, ids: [] }],
  ["duplicate IDs", { publishedCount: 2, ids: [1, 1] }],
  ["unsafe ID", { publishedCount: 1, ids: [Number.MAX_SAFE_INTEGER + 1] }],
  ["zero count with ID", { publishedCount: 0, ids: [1] }],
] as const) test(`native physical publication plus ${name} leaves effects unresolved and no invented ledger`, async () => {
  const sqlite = freshDb();
  try {
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "remotive", now: NOW, tickKey: TICK, retryKey: "bad-native-ack", proposedCount: 1,
      persist: async () => {
        expect(writeOpportunity(sqlite)).toEqual([1]);
        return acknowledgement as unknown as { publishedCount: number; ids: number[] };
      },
    });
    expect(result).toMatchObject(postPersistenceUnknown); assertWrittenRowWithoutReceipt(sqlite);
  } finally { sqlite.close(); }
});

test("native physical publication followed by a thrown callback is unresolved rather than rolled back", async () => {
  const sqlite = freshDb();
  try {
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "remotive", now: NOW, tickKey: TICK, retryKey: "throw-after-write", proposedCount: 1,
      persist: async () => { writeOpportunity(sqlite); throw new Error("secret after actual write"); },
    });
    expect(result).toMatchObject(postPersistenceUnknown);
    expect(JSON.stringify(result)).not.toContain("secret"); assertWrittenRowWithoutReceipt(sqlite);
  } finally { sqlite.close(); }
});

test("native ledger constraint rejection after a valid publication keeps the actual row and reports unknown", async () => {
  const sqlite = freshDb();
  try {
    sqlite.exec(`CREATE TRIGGER fixture_reject_ledger BEFORE INSERT ON source_publication_ledger
      BEGIN SELECT RAISE(ABORT, 'secret fixture ledger constraint'); END;`);
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "remotive", now: NOW, tickKey: TICK, retryKey: "ledger-rejected", proposedCount: 1,
      persist: async () => { const ids = writeOpportunity(sqlite); return { publishedCount: ids.length, ids }; },
    });
    expect(result).toMatchObject(postPersistenceUnknown);
    expect(JSON.stringify(result)).not.toContain("secret"); assertWrittenRowWithoutReceipt(sqlite);
  } finally { sqlite.close(); }
});

for (const delivery of ["throws", "unsuccessful"] as const) {
  test(`native ledger commit followed by ${delivery} delivery does not claim no ledger or no exposure`, async () => {
    const sqlite = freshDb();
    try {
      const db = new BunDb(sqlite), prepare = db.prepare.bind(db);
      db.prepare = query => {
        const statement = prepare(query);
        if (query.includes("INSERT INTO source_publication_ledger")) {
          const run = statement.run.bind(statement);
          statement.run = async () => {
            await run();
            if (delivery === "throws") throw new Error("secret delivery failed after commit");
            return { success: false };
          };
        }
        return statement;
      };
      const result = await publishPublicExposure(db, {
        sourceId: "remotive", now: NOW, tickKey: TICK, retryKey: "committed-ledger", proposedCount: 1,
        persist: async () => { const ids = writeOpportunity(sqlite); return { publishedCount: ids.length, ids }; },
      });
      expect(result).toMatchObject(postPersistenceUnknown); expect(JSON.stringify(result)).not.toContain("secret");
      expect(sqlite.query("SELECT COUNT(*) AS n FROM opportunities WHERE is_active=1").get()).toEqual({ n: 1 });
      expect(sqlite.query("SELECT published_count AS count, published_ids_json AS ids FROM source_publication_ledger").get())
        .toEqual({ count: 1, ids: "[1]" });
    } finally { sqlite.close(); }
  });
}

test("native actual RETURNING IDs record one row despite FTS effects and zero for a later conflict", async () => {
  const sqlite = freshDb();
  try {
    const before = sqlite.query("SELECT total_changes() AS n").get() as { n: number };
    const first = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "remotive", now: NOW, tickKey: TICK, retryKey: "returned-first", proposedCount: 1,
      persist: async () => { const ids = writeOpportunity(sqlite); return { publishedCount: ids.length, ids }; },
    });
    const after = sqlite.query("SELECT total_changes() AS n").get() as { n: number };
    expect(after.n - before.n).toBeGreaterThan(2); // opportunity, ledger and the real FTS index writes.
    expect(first).toMatchObject({ ok: true, publishedCount: 1, ids: [1], replayed: false });
    const conflict = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "remotive", now: NOW, tickKey: TICK, retryKey: "returned-conflict", proposedCount: 1,
      persist: async () => { const ids = writeOpportunity(sqlite); return { publishedCount: ids.length, ids }; },
    });
    expect(conflict).toMatchObject({ ok: true, publishedCount: 0, ids: [], replayed: false });
    expect(sqlite.query("SELECT published_count AS count, published_ids_json AS ids FROM source_publication_ledger ORDER BY id").all())
      .toEqual([{ count: 1, ids: "[1]" }, { count: 0, ids: "[]" }]);
    expect(sqlite.query("SELECT COUNT(*) AS n FROM opportunities").get()).toEqual({ n: 1 });
  } finally { sqlite.close(); }
});
