import { expect, test } from "bun:test";
import { Database, type SQLQueryBindings } from "bun:sqlite";
import { readFileSync } from "fs";
import { join } from "path";
import { publishPublicExposure, publicationTickKey, type PublicationDatabase, type PublicationStatement, type PublishPublicExposureRequest } from "./publication-gateway";
import { PUBLIC_PH_ELIGIBILITIES } from "./publication-eligibility";

const NOW = new Date().toISOString();
const TICK = publicationTickKey("scrape", NOW);
const DAY_MS = 86_400_000;
const FRESH_POSTED_AT = new Date(Date.parse(NOW) - DAY_MS).toISOString();
const STALE_POSTED_AT = new Date(Date.parse(NOW) - 31 * DAY_MS).toISOString();
// Read transport only: bounded URL JSON must also fit D1's 2 MB row limit.
// This is independent of source/publication caps and preserves <=100 binds.
const CURRENT_READ_STRIDE = 80;

class BunStatement implements PublicationStatement {
  private values: SQLQueryBindings[] = [];
  constructor(private readonly db: Database, private readonly query: string, private readonly runs: string[],
    private readonly reads: Array<{ query: string; values: unknown[] }>) {}
  bind(...values: unknown[]) { this.values = values as SQLQueryBindings[]; return this; }
  async first<T>() {
    this.reads.push({ query: this.query, values: [...this.values] });
    return (this.db.query(this.query).get(...this.values) as T | null) ?? null;
  }
  async run() {
    this.runs.push(this.query);
    this.db.query(this.query).run(...this.values);
    return { success: true };
  }
}
class BunDb implements PublicationDatabase {
  readonly runs: string[] = [];
  readonly queries: string[] = [];
  readonly reads: Array<{ query: string; values: unknown[] }> = [];
  constructor(private readonly db: Database) {}
  prepare(query: string): PublicationStatement {
    this.queries.push(query); return new BunStatement(this.db, query, this.runs, this.reads);
  }
}

function freshDb(): Database {
  const db = new Database(":memory:");
  db.exec("PRAGMA foreign_keys = ON;");
  for (const migration of [
    "0000_workable_sandman.sql", "0003_yielding_maelstrom.sql", "0005_harsh_punisher.sql", "0021_geo_eligibility.sql", "0026_fts5_search.sql", "0027_fts5_trigger_scope.sql",
    "0034_opportunity_source_id.sql", "0036_registry_foundation.sql", "0037_source_lifecycle_opt_out.sql",
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
    persist: async (allowed) => {
      const ids = Array.from({ length: allowed }, (_, index) => writeOpportunity(sqlite, `unlimited-${index}`, "we-work-remotely")[0]!);
      return { publishedCount: ids.length, ids };
    },
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

function writeOpportunity(sqlite: Database, key = "fresh-native", sourceId: string | null = "remotive", isActive = 1,
  phEligibility: string | null = "eligible_verified", postedAt: string | null = FRESH_POSTED_AT,
  locationType: string | null = "remote"): number[] {
  const rows = sqlite.query(`INSERT INTO opportunities(title, company, source_url, source_platform, content_hash, source_id, is_active, ph_eligibility, posted_at, location_type)
    VALUES('Native acknowledgement fixture', 'Fixture company', ?, 'remotive', ?, ?, ?, ?, ?, ?)
    ON CONFLICT(source_url) DO NOTHING RETURNING id`).all(`https://example.invalid/${key}`, key, sourceId, isActive, phEligibility, postedAt, locationType) as Array<{ id: number }>;
  return rows.map(row => row.id);
}
function currentPublicIds(sqlite: Database): number[] {
  // Equivalent to the existing publicOpportunityFilters: active plus the accepted PH pair.
  const rows = sqlite.query("SELECT id FROM opportunities WHERE is_active=1 AND ph_eligibility IN (?, ?) ORDER BY id")
    .all(...PUBLIC_PH_ELIGIBILITIES) as Array<{ id: number }>;
  return rows.map(row => row.id);
}
function assertWrittenRowWithoutReceipt(sqlite: Database) {
  expect(sqlite.query("SELECT COUNT(*) AS n FROM opportunities WHERE is_active=1").get()).toEqual({ n: 1 });
  expect(sqlite.query("SELECT rowid FROM opportunities_fts WHERE opportunities_fts MATCH 'acknowledgement'").all()).toHaveLength(1);
  expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_ledger").get()).toEqual({ n: 0 });
}
const postPersistenceUnknown = { ok: false, code: "POST_PERSISTENCE_FAILURE", persistenceAttempted: true, exposure: "UNKNOWN" };

function aggregatePostingRow(change: Record<string, unknown> = {}) {
  return { id: 1, postedAt: FRESH_POSTED_AT, sourceUrl: "https://example.invalid/fresh-native", applicationUrl: null, locationType: "remote", ...change };
}

for (const locationType of ["onsite", "hybrid"] as const) {
  test(`native current explicit ${locationType} metadata rejects fresh publication after actual persistence`, async () => {
    const sqlite = freshDb();
    try {
      const db = new BunDb(sqlite);
      const result = await publishPublicExposure(db, {
        sourceId: "remotive", now: NOW, tickKey: TICK, retryKey: "explicit-nonremote", proposedCount: 1,
        persist: async () => ({ publishedCount: 1, ids: writeOpportunity(sqlite, "explicit-nonremote", "remotive", 1,
          "eligible_verified", FRESH_POSTED_AT, locationType) }),
      });
      expect(result).toMatchObject(postPersistenceUnknown);
      expect(sqlite.query("SELECT location_type FROM opportunities").get()).toEqual({ location_type: locationType });
      assertWrittenRowWithoutReceipt(sqlite);
      expect(db.runs).toEqual([]);
    } finally { sqlite.close(); }
  });

  test(`native post-persistence remote-to-${locationType} metadata drift preserves UNKNOWN and physical rows`, async () => {
    const sqlite = freshDb();
    try {
      const db = new BunDb(sqlite);
      const result = await publishPublicExposure(db, {
        sourceId: "remotive", now: NOW, tickKey: TICK, retryKey: "nonremote-drift", proposedCount: 1,
        persist: async () => {
          const ids = writeOpportunity(sqlite, "nonremote-drift");
          expect(sqlite.query("SELECT location_type FROM opportunities").get()).toEqual({ location_type: "remote" });
          sqlite.query("UPDATE opportunities SET location_type=? WHERE id=?").run(locationType, ids[0]!);
          return { publishedCount: ids.length, ids };
        },
      });
      expect(result).toMatchObject(postPersistenceUnknown);
      expect(sqlite.query("SELECT location_type FROM opportunities").get()).toEqual({ location_type: locationType });
      assertWrittenRowWithoutReceipt(sqlite);
      expect(db.runs).toEqual([]);
    } finally { sqlite.close(); }
  });

  for (const invalidIndex of [48, 145, 195]) {
    test(`native explicit ${locationType} metadata at index ${invalidIndex} stops later current-row chunks`, async () => {
      const sqlite = freshDb();
      try {
        const db = new BunDb(sqlite);
        const result = await publishPublicExposure(db, {
          sourceId: "remotive", now: NOW, tickKey: TICK, retryKey: "nonremote-chunk", proposedCount: 201,
          persist: async () => {
            const ids = Array.from({ length: 201 }, (_, index) => writeOpportunity(sqlite, `nonremote-chunk-${index}`)[0]!);
            sqlite.query("UPDATE opportunities SET location_type=? WHERE id=?").run(locationType, ids[invalidIndex]!);
            return { publishedCount: ids.length, ids };
          },
        });
        expect(result).toMatchObject(postPersistenceUnknown);
        const reads = db.reads.filter(read => read.query.includes("FROM opportunities"));
        expect(reads).toHaveLength(Math.floor(invalidIndex / CURRENT_READ_STRIDE) + 1);
        expect(reads.every(read => read.values.length <= 100)).toBe(true);
        expect(sqlite.query("SELECT COUNT(*) AS n FROM opportunities").get()).toEqual({ n: 201 });
        expect(sqlite.query("SELECT rowid FROM opportunities_fts WHERE opportunities_fts MATCH 'acknowledgement'").all()).toHaveLength(201);
        expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_ledger").get()).toEqual({ n: 0 });
        expect(db.runs).toEqual([]);
      } finally { sqlite.close(); }
    });
  }
}

for (const locationType of ["onsite", "hybrid", null, "private-unsupported-location-type", "x".repeat(4096)] as const) {
  test(`native immutable replay ignores current remote metadata ${locationType === null ? "NULL" : locationType.length > 100 ? "oversize" : locationType}`, async () => {
    const sqlite = freshDb();
    try {
      const first = await publishPublicExposure(new BunDb(sqlite), {
        sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "saved-retry", proposedCount: 1,
        persist: async () => ({ publishedCount: 1, ids: writeOpportunity(sqlite, "historical-remote", "we-work-remotely") }),
      });
      expect(first).toMatchObject({ ok: true, publishedCount: 1, ids: [1], replayed: false });
      sqlite.query("UPDATE opportunities SET location_type=? WHERE id=1").run(locationType);
      expect(await inspectRetry(sqlite, { proposedCount: 1 }))
        .toEqual({ ok: true, mode: "unlimited", publishedCount: 1, ids: [1], replayed: true });
      expect(sqlite.query("SELECT location_type FROM opportunities").get()).toEqual({ location_type: locationType });
    } finally { sqlite.close(); }
  });
}

for (const locationType of ["remote", null, "unsupported-stored-metadata", "x".repeat(4096)] as const) {
  test(`native stored ${locationType === null ? "NULL" : locationType.length > 100 ? "oversize" : locationType} metadata passes only the explicit-contradiction boundary`, async () => {
    const sqlite = freshDb();
    try {
      const result = await publishPublicExposure(new BunDb(sqlite), {
        sourceId: "remotive", now: NOW, tickKey: TICK, retryKey: "noncontradiction-control", proposedCount: 1,
        persist: async () => ({ publishedCount: 1, ids: writeOpportunity(sqlite, "noncontradiction-control", "remotive", 1,
          "eligible_verified", FRESH_POSTED_AT, locationType) }),
      });
      // The production TEXT column is nullable without an enum CHECK. Neither
      // NULL nor unsupported stored text independently establishes remote work.
      expect(result).toMatchObject({ ok: true, publishedCount: 1, ids: [1], replayed: false });
      expect(sqlite.query("SELECT location_type FROM opportunities").get()).toEqual({ location_type: locationType });
      expect(sqlite.query("SELECT published_count AS n, published_ids_json AS ids FROM source_publication_ledger").get())
        .toEqual({ n: 1, ids: "[1]" });
    } finally { sqlite.close(); }
  });
}

const invalidCurrentSourceCases = [
  ["empty source", ""], ["blank source", "   "],
  ["javascript source", "javascript:private-source-url"],
  ["credential source", "https://private-user:private-token@example.invalid/job"],
  ["local source", "http://localhost/private-source-url"],
  ["IPv4 source", "http://127.0.0.1/private-source-url"],
  ["IPv6 source", "http://[::1]/private-source-url"],
  ["relative source", "/private-source-url"],
  ["oversize source", `https://example.invalid/${"a".repeat(2048)}`],
] as const;

for (const [name, sourceUrl] of invalidCurrentSourceCases) {
  test(`native current outbound ${name} drift after a valid write retains UNKNOWN and physical rows`, async () => {
    const sqlite = freshDb();
    try {
      const db = new BunDb(sqlite);
      const result = await publishPublicExposure(db, {
        sourceId: "remotive", now: NOW, tickKey: TICK, retryKey: "current-outbound-drift", proposedCount: 1,
        persist: async () => {
          const ids = writeOpportunity(sqlite, "current-outbound-drift");
          expect(ids).toEqual([1]);
          expect(sqlite.query("SELECT source_url FROM opportunities").get()).toEqual({ source_url: "https://example.invalid/current-outbound-drift" });
          sqlite.query("UPDATE opportunities SET source_url=? WHERE id=?").run(sourceUrl, ids[0]!);
          return { publishedCount: ids.length, ids };
        },
      });
      expect(result).toMatchObject(postPersistenceUnknown);
      expect(JSON.stringify(result)).not.toContain("private");
      expect(sqlite.query("SELECT source_url FROM opportunities").get()).toEqual({ source_url: sourceUrl });
      assertWrittenRowWithoutReceipt(sqlite);
      expect(db.runs).toEqual([]);
    } finally { sqlite.close(); }
  });

  test(`native immutable historical receipt ignores current outbound ${name}`, async () => {
    const sqlite = freshDb();
    try {
      const first = await publishPublicExposure(new BunDb(sqlite), {
        sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "saved-retry", proposedCount: 1,
        persist: async () => ({ publishedCount: 1, ids: writeOpportunity(sqlite, "historical-outbound", "we-work-remotely") }),
      });
      expect(first).toMatchObject({ ok: true, publishedCount: 1, ids: [1], replayed: false });
      sqlite.query("UPDATE opportunities SET source_url=?, application_url=? WHERE id=1").run(sourceUrl, "javascript:private-apply-url");
      expect(await inspectRetry(sqlite, { proposedCount: 1 }))
        .toEqual({ ok: true, mode: "unlimited", publishedCount: 1, ids: [1], replayed: true });
      expect(sqlite.query("SELECT source_url, application_url FROM opportunities").get())
        .toEqual({ source_url: sourceUrl, application_url: "javascript:private-apply-url" });
    } finally { sqlite.close(); }
  });
}

test("native existing source URL NOT NULL constraint rejects NULL corruption before gateway observation", () => {
  const sqlite = freshDb();
  try {
    expect(writeOpportunity(sqlite)).toEqual([1]);
    expect(() => sqlite.query("UPDATE opportunities SET source_url=NULL WHERE id=1").run()).toThrow(/NOT NULL/i);
    expect(sqlite.query("SELECT source_url FROM opportunities").get()).toEqual({ source_url: "https://example.invalid/fresh-native" });
    assertWrittenRowWithoutReceipt(sqlite);
  } finally { sqlite.close(); }
});

for (const invalidIndex of [48, 145, 195]) {
  test(`native current outbound mismatch at index ${invalidIndex} stops later bounded chunk observations`, async () => {
    const sqlite = freshDb();
    try {
      const db = new BunDb(sqlite);
      const result = await publishPublicExposure(db, {
        sourceId: "remotive", now: NOW, tickKey: TICK, retryKey: "chunk-outbound-drift", proposedCount: 201,
        persist: async () => {
          const ids = Array.from({ length: 201 }, (_, index) => writeOpportunity(sqlite, `chunk-outbound-${index}`)[0]!);
          sqlite.query("UPDATE opportunities SET source_url=? WHERE id=?").run("javascript:private-chunk-source", ids[invalidIndex]!);
          return { publishedCount: ids.length, ids };
        },
      });
      expect(result).toMatchObject(postPersistenceUnknown);
      expect(JSON.stringify(result)).not.toContain("private");
      const reads = db.reads.filter(read => read.query.includes("FROM opportunities"));
      expect(reads).toHaveLength(Math.floor(invalidIndex / CURRENT_READ_STRIDE) + 1);
      expect(reads.every(read => read.values.length <= 100)).toBe(true);
      expect(sqlite.query("SELECT COUNT(*) AS n FROM opportunities").get()).toEqual({ n: 201 });
      expect(sqlite.query("SELECT rowid FROM opportunities_fts WHERE opportunities_fts MATCH 'acknowledgement'").all()).toHaveLength(201);
      expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_ledger").get()).toEqual({ n: 0 });
      expect(db.runs).toEqual([]);
    } finally { sqlite.close(); }
  });
}

const longestSource = `https://example.invalid/${"s".repeat(2048 - "https://example.invalid/".length)}`;
const longestApply = `https://example.invalid/${"a".repeat(2048 - "https://example.invalid/".length)}`;
for (const [name, sourceUrl, applicationUrl] of [
  ["normalized source and NULL apply fallback", "  HTTPS://Example.Invalid/job  ", null],
  ["invalid apply safe-source fallback", "https://example.invalid/job", "javascript:private-apply-url"],
  ["unrelated apply safe-source fallback", "https://example.invalid/job", "https://unrelated.invalid/private-apply-url"],
  ["oversize apply safe-source fallback", "https://example.invalid/job", `https://example.invalid/${"a".repeat(2048)}`],
  ["same-host attributable apply", "https://example.invalid/job", "https://example.invalid/apply"],
  ["Greenhouse same-tenant alias", "https://boards-api.greenhouse.io/v1/boards/example/jobs/1", "https://boards.greenhouse.io/example/jobs/1"],
  ["Lever same-tenant alias", "https://api.lever.co/v0/postings/example/job-1", "https://jobs.lever.co/example/job-1"],
  ["Ashby same-tenant alias", "https://api.ashbyhq.com/posting-api/job-board/example/job-1", "https://jobs.ashbyhq.com/example/job-1"],
  ["different ATS tenant safe-source fallback", "https://boards-api.greenhouse.io/v1/boards/example/jobs/1", "https://boards.greenhouse.io/other/jobs/1"],
  ["both raw URLs at the existing 2048-character limit", longestSource, longestApply],
  ["JSON-escaped raw source and apply strings at the existing limit",
    `https://example.invalid/${'"'.repeat(2048 - "https://example.invalid/".length)}`,
    `https://example.invalid/${'"'.repeat(2048 - "https://example.invalid/".length)}`],
] as const) {
  test(`native current outbound receipt accepts existing ${name}`, async () => {
    const sqlite = freshDb();
    try {
      const db = new BunDb(sqlite);
      const result = await publishPublicExposure(db, {
        sourceId: "remotive", now: NOW, tickKey: TICK, retryKey: "valid-current-outbound", proposedCount: 1,
        persist: async () => {
          const ids = writeOpportunity(sqlite, "valid-current-outbound");
          sqlite.query("UPDATE opportunities SET source_url=?, application_url=? WHERE id=?").run(sourceUrl, applicationUrl, ids[0]!);
          return { publishedCount: ids.length, ids };
        },
      });
      expect(result).toMatchObject({ ok: true, publishedCount: 1, ids: [1], replayed: false });
      expect(sqlite.query("SELECT source_url, application_url FROM opportunities").get()).toEqual({ source_url: sourceUrl, application_url: applicationUrl });
      expect(sqlite.query("SELECT published_count AS n, published_ids_json AS ids FROM source_publication_ledger").get()).toEqual({ n: 1, ids: "[1]" });
      expect(db.reads.filter(read => read.query.includes("FROM opportunities"))).toHaveLength(1);
    } finally { sqlite.close(); }
  });
}

test("native full 80-ID URL observation bounds worst-case JSON escaping below D1's row limit", async () => {
  const sqlite = freshDb();
  try {
    const db = new BunDb(sqlite);
    const result = await publishPublicExposure(db, {
      sourceId: "remotive", now: NOW, tickKey: TICK, retryKey: "escaped-outbound-bounds", proposedCount: 81,
      persist: async () => {
        const ids = Array.from({ length: 81 }, (_, index) => {
          const id = writeOpportunity(sqlite, `escaped-outbound-${index}`)[0]!;
          const prefix = `https://example.invalid/${index}/`;
          // These existing-sanitizer-compatible controls require six JSON bytes
          // apiece. Distinct prefixes preserve the actual unique source URL.
          const rawUrl = prefix + "\u0001".repeat(2048 - prefix.length);
          sqlite.query("UPDATE opportunities SET source_url=?, application_url=? WHERE id=?").run(rawUrl, rawUrl, id);
          return id;
        });
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, publishedCount: 81, ids: Array.from({ length: 81 }, (_, index) => index + 1) });
    const reads = db.reads.filter(read => read.query.includes("FROM opportunities"));
    expect(reads.map(read => read.values.length)).toEqual([83, 4]);
    const byteLengths = reads.map(read => {
      const observed = sqlite.query(read.query).get(...read.values as SQLQueryBindings[]) as { postingRows: string };
      return Buffer.byteLength(observed.postingRows, "utf8");
    });
    expect(byteLengths[0]).toBeGreaterThan(1_900_000);
    expect(byteLengths.every(length => length <= 2_000_000)).toBe(true);
    expect(sqlite.query("SELECT published_count AS n FROM source_publication_ledger").get()).toEqual({ n: 81 });
  } finally { sqlite.close(); }
});

const invalidPostingCases = [
  { name: "NULL original date", postedAt: null, now: NOW },
  { name: "invalid original date", postedAt: "private-provider-time", now: NOW },
  // The impossible date rolls into March and would look fresh to permissive Date.parse.
  { name: "calendar rollover within the age window", postedAt: "2026-02-30T12:00:00.000Z", now: "2026-03-02T12:00:00.000Z" },
  { name: "date-only original date", postedAt: NOW.slice(0, 10), now: NOW },
  { name: "ambiguous timezone original date", postedAt: NOW.slice(0, 19), now: NOW },
  { name: "future by one millisecond", postedAt: new Date(Date.parse(NOW) + 1).toISOString(), now: NOW },
  { name: "future by one nanosecond", postedAt: `${NOW.slice(0, 23)}000001Z`, now: NOW },
  { name: "stale original date", postedAt: STALE_POSTED_AT, now: NOW },
  { name: "30-day boundary plus one millisecond", postedAt: new Date(Date.parse(NOW) - 30 * DAY_MS - 1).toISOString(), now: NOW },
  { name: "blank original date", postedAt: "", now: NOW },
  { name: "oversize original date", postedAt: "x".repeat(4096), now: NOW },
] as const;

for (const { name, postedAt, now } of invalidPostingCases) {
  test(`native fresh receipt rejects ${name} despite accepted PH and fresh secondary clocks`, async () => {
    const sqlite = freshDb();
    try {
      const db = new BunDb(sqlite);
      const result = await publishPublicExposure(db, {
        sourceId: "remotive", now, tickKey: publicationTickKey("scrape", now), retryKey: "invalid-original-date", proposedCount: 1,
        persist: async () => {
          const ids = writeOpportunity(sqlite, "invalid-original-date", "remotive", 1, "eligible_verified", postedAt);
          sqlite.query("UPDATE opportunities SET scraped_at=?, updated_at=? WHERE id=?").run(now, now, ids[0]!);
          expect(ids).toEqual([1]);
          return { publishedCount: ids.length, ids };
        },
      });
      expect(result).toMatchObject(postPersistenceUnknown);
      expect(JSON.stringify(result)).not.toContain("private-provider-time");
      expect(sqlite.query("SELECT posted_at, scraped_at, updated_at FROM opportunities").get())
        .toEqual({ posted_at: postedAt, scraped_at: now, updated_at: now });
      assertWrittenRowWithoutReceipt(sqlite);
      expect(db.runs).toEqual([]);
    } finally { sqlite.close(); }
  });

  test(`native immutable historical receipt ignores current ${name}`, async () => {
    const sqlite = freshDb();
    try {
      const first = await publishPublicExposure(new BunDb(sqlite), {
        sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "saved-retry", proposedCount: 1,
        persist: async () => ({ publishedCount: 1, ids: writeOpportunity(sqlite, "historical-date", "we-work-remotely") }),
      });
      expect(first).toMatchObject({ ok: true, publishedCount: 1, ids: [1], replayed: false });
      sqlite.query("UPDATE opportunities SET posted_at=? WHERE id=1").run(postedAt);
      expect(await inspectRetry(sqlite, { proposedCount: 1 }))
        .toEqual({ ok: true, mode: "unlimited", publishedCount: 1, ids: [1], replayed: true });
      expect(sqlite.query("SELECT posted_at FROM opportunities").get()).toEqual({ posted_at: postedAt });
    } finally { sqlite.close(); }
  });
}

for (const phEligibility of ["eligible_verified", "eligible_likely"] as const) {
  for (const [name, postedAt] of [
    ["zero posting age", NOW],
    ["inclusive exact 30-day boundary", new Date(Date.parse(NOW) - 30 * DAY_MS).toISOString()],
    ["one nanosecond inside the inclusive 30-day boundary", `${new Date(Date.parse(NOW) - 30 * DAY_MS).toISOString().slice(0, 23)}000001Z`],
  ] as const) {
    test(`native fresh receipt accepts ${phEligibility} at ${name}`, async () => {
      const sqlite = freshDb();
      try {
        const result = await publishPublicExposure(new BunDb(sqlite), {
          sourceId: "remotive", now: NOW, tickKey: TICK, retryKey: "valid-original-date", proposedCount: 1,
          persist: async () => ({ publishedCount: 1, ids: writeOpportunity(sqlite, "valid-original-date", "remotive", 1, phEligibility, postedAt) }),
        });
        expect(result).toMatchObject({ ok: true, publishedCount: 1, ids: [1], replayed: false });
        expect(sqlite.query("SELECT published_count AS n, published_ids_json AS ids FROM source_publication_ledger").get())
          .toEqual({ n: 1, ids: "[1]" });
      } finally { sqlite.close(); }
    });
  }
}

for (const postedAt of [null, STALE_POSTED_AT, new Date(Date.parse(NOW) + 1).toISOString()] as const) {
  test(`native current original date drift to ${postedAt === null ? "NULL" : postedAt === STALE_POSTED_AT ? "stale" : "future"} retains UNKNOWN after persistence`, async () => {
    const sqlite = freshDb();
    try {
      const db = new BunDb(sqlite);
      const result = await publishPublicExposure(db, {
        sourceId: "remotive", now: NOW, tickKey: TICK, retryKey: "original-date-drift", proposedCount: 1,
        persist: async () => {
          const ids = writeOpportunity(sqlite, "original-date-drift");
          expect(sqlite.query("SELECT posted_at FROM opportunities").get()).toEqual({ posted_at: FRESH_POSTED_AT });
          sqlite.query("UPDATE opportunities SET posted_at=? WHERE id=?").run(postedAt, ids[0]!);
          return { publishedCount: ids.length, ids };
        },
      });
      expect(result).toMatchObject(postPersistenceUnknown);
      expect(sqlite.query("SELECT posted_at FROM opportunities").get()).toEqual({ posted_at: postedAt });
      assertWrittenRowWithoutReceipt(sqlite);
      expect(db.runs).toEqual([]);
    } finally { sqlite.close(); }
  });
}

for (const invalidIndex of [48, 145, 195]) {
  test(`native current original date mismatch at index ${invalidIndex} halts bounded chunk reads without undoing rows`, async () => {
    const sqlite = freshDb();
    try {
      const db = new BunDb(sqlite);
      const result = await publishPublicExposure(db, {
        sourceId: "remotive", now: NOW, tickKey: TICK, retryKey: "chunk-original-date", proposedCount: 201,
        persist: async () => {
          const ids = Array.from({ length: 201 }, (_, index) => writeOpportunity(sqlite, `chunk-original-${index}`, "remotive", 1,
            index % 2 ? "eligible_likely" : "eligible_verified", index === invalidIndex ? null : FRESH_POSTED_AT)[0]!);
          return { publishedCount: ids.length, ids };
        },
      });
      expect(result).toMatchObject(postPersistenceUnknown);
      const reads = db.reads.filter(read => read.query.includes("FROM opportunities"));
      expect(reads).toHaveLength(Math.floor(invalidIndex / CURRENT_READ_STRIDE) + 1);
      expect(reads.every(read => read.values.length <= 100)).toBe(true);
      expect(sqlite.query("SELECT COUNT(*) AS n FROM opportunities").get()).toEqual({ n: 201 });
      expect(sqlite.query("SELECT rowid FROM opportunities_fts WHERE opportunities_fts MATCH 'acknowledgement'").all()).toHaveLength(201);
      expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_ledger").get()).toEqual({ n: 0 });
      expect(db.runs).toEqual([]);
    } finally { sqlite.close(); }
  });
}

for (const [name, postingRows] of [
  ["missing aggregate", undefined], ["NULL aggregate", null], ["non-text aggregate", []],
  ["malformed JSON aggregate", "private-incomplete-json["], ["JSON null aggregate", "null"],
  ["JSON object aggregate", "{}"], ["missing aggregate row", "[]"],
  ["primitive aggregate row", '["unexpected"]'],
  ["missing aggregate ID", JSON.stringify([{ postedAt: FRESH_POSTED_AT, sourceUrl: "https://example.invalid/fresh-native", applicationUrl: null, locationType: "remote" }])],
  ["string aggregate ID", JSON.stringify([aggregatePostingRow({ id: "1" })])],
  ["fractional aggregate ID", JSON.stringify([aggregatePostingRow({ id: 1.5 })])],
  ["foreign aggregate ID", JSON.stringify([aggregatePostingRow({ id: 404 })])],
  ["missing aggregate date", JSON.stringify([{ id: 1, sourceUrl: "https://example.invalid/fresh-native", applicationUrl: null, locationType: "remote" }])],
  ["invalid aggregate date", JSON.stringify([aggregatePostingRow({ postedAt: "private-provider-time" })])],
  ["extra aggregate row", JSON.stringify([aggregatePostingRow(), aggregatePostingRow({ id: 404 })])],
  ["missing both aggregate URL fields", JSON.stringify([{ id: 1, postedAt: FRESH_POSTED_AT, locationType: "remote" }])],
  ["missing aggregate source URL", JSON.stringify([{ id: 1, postedAt: FRESH_POSTED_AT, applicationUrl: null, locationType: "remote" }])],
  ["missing aggregate application URL", JSON.stringify([{ id: 1, postedAt: FRESH_POSTED_AT, sourceUrl: "https://example.invalid/fresh-native", locationType: "remote" }])],
  ["NULL aggregate source URL", JSON.stringify([aggregatePostingRow({ sourceUrl: null })])],
  ["numeric aggregate source URL", JSON.stringify([aggregatePostingRow({ sourceUrl: 1 })])],
  ["array aggregate source URL", JSON.stringify([aggregatePostingRow({ sourceUrl: [] })])],
  ["object aggregate source URL", JSON.stringify([aggregatePostingRow({ sourceUrl: { private: "source" } })])],
  ["numeric aggregate application URL", JSON.stringify([aggregatePostingRow({ applicationUrl: 1 })])],
  ["array aggregate application URL", JSON.stringify([aggregatePostingRow({ applicationUrl: [] })])],
  ["object aggregate application URL", JSON.stringify([aggregatePostingRow({ applicationUrl: { private: "apply" } })])],
  ["extra aggregate field", JSON.stringify([aggregatePostingRow({ private: "provider-metadata" })])],
  ["oversize URL aggregate reply", JSON.stringify([aggregatePostingRow({ sourceUrl: "s".repeat(30_000) })])],
  ["missing aggregate location metadata", JSON.stringify([{ id: 1, postedAt: FRESH_POSTED_AT, sourceUrl: "https://example.invalid/fresh-native", applicationUrl: null }])],
  ["numeric aggregate location metadata", JSON.stringify([aggregatePostingRow({ locationType: 1 })])],
  ["boolean aggregate location metadata", JSON.stringify([aggregatePostingRow({ locationType: false })])],
  ["array aggregate location metadata", JSON.stringify([aggregatePostingRow({ locationType: [] })])],
  ["object aggregate location metadata", JSON.stringify([aggregatePostingRow({ locationType: { private: "provider-location" } })])],
  ["oversize aggregate location metadata", JSON.stringify([aggregatePostingRow({ locationType: "private-provider-location".repeat(256) })])],
  ["unsupported aggregate location metadata", JSON.stringify([aggregatePostingRow({ locationType: "unsupported-provider-location" })])],
] as const) {
  test(`native physical persistence plus ${name} cannot certify original posting freshness`, async () => {
    const sqlite = freshDb();
    try {
      const db = new BunDb(sqlite), prepare = db.prepare.bind(db);
      db.prepare = query => {
        const statement = prepare(query), first = statement.first.bind(statement);
        if (query.includes("FROM opportunities")) {
          statement.first = async <T>() => {
            const actual = await first<{ ownedCount: number }>();
            expect(actual?.ownedCount).toBe(1);
            return { ...actual, postingRows } as T;
          };
        }
        return statement;
      };
      const result = await publishPublicExposure(db, {
        sourceId: "remotive", now: NOW, tickKey: TICK, retryKey: "malformed-posting-aggregate", proposedCount: 1,
        persist: async () => ({ publishedCount: 1, ids: writeOpportunity(sqlite) }),
      });
      expect(result).toMatchObject(postPersistenceUnknown);
      expect(JSON.stringify(result)).not.toContain("private");
      assertWrittenRowWithoutReceipt(sqlite);
      expect(db.runs).toEqual([]);
    } finally { sqlite.close(); }
  });
}

test("native duplicate original-date aggregate IDs cannot replace the second persisted ID", async () => {
  const sqlite = freshDb();
  try {
    const db = new BunDb(sqlite), prepare = db.prepare.bind(db);
    db.prepare = query => {
      const statement = prepare(query), first = statement.first.bind(statement);
      if (query.includes("FROM opportunities")) statement.first = async <T>() => {
        const actual = await first<{ ownedCount: number }>();
        expect(actual?.ownedCount).toBe(2);
        return { ...actual, postingRows: JSON.stringify([aggregatePostingRow({ sourceUrl: "https://example.invalid/aggregate-one" }),
          aggregatePostingRow({ sourceUrl: "https://example.invalid/aggregate-one" })]) } as T;
      };
      return statement;
    };
    const result = await publishPublicExposure(db, {
      sourceId: "remotive", now: NOW, tickKey: TICK, retryKey: "duplicate-posting-aggregate", proposedCount: 2,
      persist: async () => ({ publishedCount: 2, ids: [...writeOpportunity(sqlite, "aggregate-one"), ...writeOpportunity(sqlite, "aggregate-two")] }),
    });
    expect(result).toMatchObject(postPersistenceUnknown);
    expect(sqlite.query("SELECT COUNT(*) AS n FROM opportunities").get()).toEqual({ n: 2 });
    expect(sqlite.query("SELECT rowid FROM opportunities_fts WHERE opportunities_fts MATCH 'acknowledgement'").all()).toHaveLength(2);
    expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_ledger").get()).toEqual({ n: 0 });
    expect(db.runs).toEqual([]);
  } finally { sqlite.close(); }
});

test("native aggregate date membership accepts exact returned IDs regardless of acknowledgement order", async () => {
  const sqlite = freshDb();
  try {
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "remotive", now: NOW, tickKey: TICK, retryKey: "reverse-original-ids", proposedCount: 2,
      persist: async () => ({ publishedCount: 2, ids: [...writeOpportunity(sqlite, "reverse-one"), ...writeOpportunity(sqlite, "reverse-two")].reverse() }),
    });
    expect(result).toMatchObject({ ok: true, publishedCount: 2, ids: [2, 1], replayed: false });
    expect(sqlite.query("SELECT published_count AS n, published_ids_json AS ids FROM source_publication_ledger").get()).toEqual({ n: 2, ids: "[2,1]" });
  } finally { sqlite.close(); }
});

for (const phEligibility of [null, "unclear", "ineligible"] as const) {
  test(`native fresh publication rejects ${String(phEligibility)} PH eligibility excluded by public serving`, async () => {
    const sqlite = freshDb();
    try {
      const db = new BunDb(sqlite);
      const result = await publishPublicExposure(db, {
        sourceId: "remotive", now: NOW, tickKey: TICK, retryKey: "nonpublic-ph", proposedCount: 1,
        persist: async () => {
          const ids = writeOpportunity(sqlite, "nonpublic-ph", "remotive", 1, phEligibility);
          expect(ids).toEqual([1]);
          expect(currentPublicIds(sqlite)).toEqual([]);
          return { publishedCount: ids.length, ids };
        },
      });
      expect(result).toMatchObject(postPersistenceUnknown);
      expect(sqlite.query("SELECT source_id, is_active, ph_eligibility FROM opportunities").get())
        .toEqual({ source_id: "remotive", is_active: 1, ph_eligibility: phEligibility });
      assertWrittenRowWithoutReceipt(sqlite);
      expect(db.runs).toEqual([]);
    } finally { sqlite.close(); }
  });

  test(`native historical replay remains ledger-only when current PH eligibility becomes ${String(phEligibility)}`, async () => {
    const sqlite = freshDb();
    try {
      const ids = writeOpportunity(sqlite, "historical-ph", "we-work-remotely");
      seedRetry(sqlite, { proposedCount: 1, publishedCount: 1, idsJson: JSON.stringify(ids) });
      sqlite.query("UPDATE opportunities SET ph_eligibility=? WHERE id=?").run(phEligibility, ids[0]!);
      expect(currentPublicIds(sqlite)).toEqual([]);
      expect(await inspectRetry(sqlite, { proposedCount: 1 }))
        .toEqual({ ok: true, mode: "unlimited", publishedCount: 1, ids, replayed: true });
      expect(sqlite.query("SELECT ph_eligibility FROM opportunities").get()).toEqual({ ph_eligibility: phEligibility });
    } finally { sqlite.close(); }
  });
}

for (const phEligibility of ["eligible_verified", "eligible_likely"] as const) {
  test(`native fresh publication accepts ${phEligibility} with actual public visibility and a ledger`, async () => {
    const sqlite = freshDb();
    try {
      expect(PUBLIC_PH_ELIGIBILITIES).toEqual(["eligible_verified", "eligible_likely"]);
      const result = await publishPublicExposure(new BunDb(sqlite), {
        sourceId: "remotive", now: NOW, tickKey: TICK, retryKey: "public-ph", proposedCount: 1,
        persist: async () => {
          const ids = writeOpportunity(sqlite, "public-ph", "remotive", 1, phEligibility);
          expect(currentPublicIds(sqlite)).toEqual(ids);
          return { publishedCount: ids.length, ids };
        },
      });
      expect(result).toMatchObject({ ok: true, publishedCount: 1, ids: [1], replayed: false });
      expect(sqlite.query("SELECT published_count AS count, published_ids_json AS ids FROM source_publication_ledger").get())
        .toEqual({ count: 1, ids: "[1]" });
      expect(sqlite.query("SELECT rowid FROM opportunities_fts WHERE opportunities_fts MATCH 'acknowledgement'").all()).toHaveLength(1);
    } finally { sqlite.close(); }
  });
}

test("native fresh publication rejects PH eligibility drift after physical persistence", async () => {
  const sqlite = freshDb();
  try {
    const db = new BunDb(sqlite);
    const result = await publishPublicExposure(db, {
      sourceId: "remotive", now: NOW, tickKey: TICK, retryKey: "ph-drift", proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite, "ph-drift");
        expect(currentPublicIds(sqlite)).toEqual(ids);
        sqlite.query("UPDATE opportunities SET ph_eligibility='unclear' WHERE id=?").run(ids[0]!);
        expect(currentPublicIds(sqlite)).toEqual([]);
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject(postPersistenceUnknown);
    assertWrittenRowWithoutReceipt(sqlite);
    expect(db.runs).toEqual([]);
  } finally { sqlite.close(); }
});

test("native fresh publication rejects a mixed public and unclear PH acknowledgement", async () => {
  const sqlite = freshDb();
  try {
    const db = new BunDb(sqlite);
    const result = await publishPublicExposure(db, {
      sourceId: "remotive", now: NOW, tickKey: TICK, retryKey: "mixed-ph", proposedCount: 2,
      persist: async () => {
        const ids = [...writeOpportunity(sqlite, "public-part"), ...writeOpportunity(sqlite, "unclear-part", "remotive", 1, "unclear")];
        expect(currentPublicIds(sqlite)).toEqual([ids[0]!]);
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject(postPersistenceUnknown);
    expect(sqlite.query("SELECT COUNT(*) AS n FROM opportunities").get()).toEqual({ n: 2 });
    expect(sqlite.query("SELECT rowid FROM opportunities_fts WHERE opportunities_fts MATCH 'acknowledgement'").all()).toHaveLength(2);
    expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_ledger").get()).toEqual({ n: 0 });
    expect(db.runs).toEqual([]);
  } finally { sqlite.close(); }
});

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

for (const [name, sourceId, isActive, reportedId] of [
  ["nonexistent ID", "remotive", 1, 404],
  ["foreign source", "remote-ok", 1, 1],
  ["NULL source", null, 1, 1],
  ["inactive row", "remotive", 0, 1],
] as const) test(`native fresh ownership rejects ${name} after physical persistence without compensation`, async () => {
  const sqlite = freshDb();
  try {
    const db = new BunDb(sqlite);
    const result = await publishPublicExposure(db, {
      sourceId: "remotive", now: NOW, tickKey: TICK, retryKey: "ownership-invalid", proposedCount: 1,
      persist: async () => {
        expect(writeOpportunity(sqlite, "ownership-invalid", sourceId, isActive)).toEqual([1]);
        return { publishedCount: 1, ids: [reportedId] };
      },
    });
    expect(result).toMatchObject(postPersistenceUnknown);
    expect(sqlite.query("SELECT source_id, is_active FROM opportunities").get()).toEqual({ source_id: sourceId, is_active: isActive });
    expect(sqlite.query("SELECT rowid FROM opportunities_fts WHERE opportunities_fts MATCH 'acknowledgement'").all()).toHaveLength(1);
    expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_ledger").get()).toEqual({ n: 0 });
    expect(db.runs).toEqual([]);
  } finally { sqlite.close(); }
});

test("native fresh ownership rejects a mixed-source subset rather than counting only existing IDs", async () => {
  const sqlite = freshDb();
  try {
    const db = new BunDb(sqlite);
    const result = await publishPublicExposure(db, {
      sourceId: "remotive", now: NOW, tickKey: TICK, retryKey: "mixed-ownership", proposedCount: 2,
      persist: async () => ({ publishedCount: 2, ids: [...writeOpportunity(sqlite, "owned"), ...writeOpportunity(sqlite, "foreign", "remote-ok")] }),
    });
    expect(result).toMatchObject(postPersistenceUnknown);
    expect(sqlite.query("SELECT COUNT(*) AS n FROM opportunities").get()).toEqual({ n: 2 });
    expect(sqlite.query("SELECT rowid FROM opportunities_fts WHERE opportunities_fts MATCH 'acknowledgement'").all()).toHaveLength(2);
    expect(db.runs).toEqual([]);
  } finally { sqlite.close(); }
});

for (const [name, response] of [
  ["null", null], ["missing count", {}], ["string count", { ownedCount: "1" }],
  ["fractional count", { ownedCount: 1.5 }], ["negative count", { ownedCount: -1 }],
  ["oversized count", { ownedCount: 2 }], ["boolean count", { ownedCount: true }],
  ["NaN count", { ownedCount: NaN }], ["infinite count", { ownedCount: Infinity }],
] as const) test(`native physical persistence plus ${name} ownership response stays UNKNOWN`, async () => {
  const sqlite = freshDb();
  try {
    const db = new BunDb(sqlite), prepare = db.prepare.bind(db);
    db.prepare = query => {
      const statement = prepare(query);
      if (query.includes("FROM opportunities")) statement.first = async <T>() => response as T | null;
      return statement;
    };
    const result = await publishPublicExposure(db, {
      sourceId: "remotive", now: NOW, tickKey: TICK, retryKey: "malformed-ownership", proposedCount: 1,
      persist: async () => ({ publishedCount: 1, ids: writeOpportunity(sqlite) }),
    });
    expect(result).toMatchObject(postPersistenceUnknown);
    assertWrittenRowWithoutReceipt(sqlite);
    expect(db.runs).toEqual([]);
  } finally { sqlite.close(); }
});

for (const stage of ["prepare", "first"] as const) test(`native ${stage} ownership read failure after commit stays UNKNOWN and sanitized`, async () => {
  const sqlite = freshDb();
  try {
    const db = new BunDb(sqlite), prepare = db.prepare.bind(db);
    db.prepare = query => {
      if (stage === "prepare" && query.includes("FROM opportunities")) throw new Error("private ownership query failure");
      const statement = prepare(query);
      if (stage === "first" && query.includes("FROM opportunities")) {
        statement.first = async () => { throw new Error("private ownership read failure"); };
      }
      return statement;
    };
    const result = await publishPublicExposure(db, {
      sourceId: "remotive", now: NOW, tickKey: TICK, retryKey: "failed-ownership", proposedCount: 1,
      persist: async () => ({ publishedCount: 1, ids: writeOpportunity(sqlite) }),
    });
    expect(result).toMatchObject(postPersistenceUnknown);
    expect(JSON.stringify(result)).not.toContain("private");
    assertWrittenRowWithoutReceipt(sqlite);
    expect(db.runs).toEqual([]);
  } finally { sqlite.close(); }
});

test("native ownership and eligibility verify every distinct ID with bounded 80-ID transport chunks", async () => {
  const sqlite = freshDb();
  try {
    const db = new BunDb(sqlite);
    const result = await publishPublicExposure(db, {
      sourceId: "remotive", now: NOW, tickKey: TICK, retryKey: "bounded-ownership", proposedCount: 201,
      persist: async () => {
        const ids = Array.from({ length: 201 }, (_, index) => writeOpportunity(sqlite, `bounded-${index}`)[0]!);
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, publishedCount: 201 });
    const reads = db.reads.filter(read => read.query.includes("FROM opportunities"));
    expect(reads.map(read => read.values.length)).toEqual([83, 83, 44]);
    const seen: unknown[] = [];
    for (const read of reads) {
      expect(read.values.length).toBeLessThanOrEqual(100);
      expect(read.values.slice(0, 3)).toEqual(["remotive", "eligible_verified", "eligible_likely"]);
      expect(read.query).not.toContain("remotive");
      expect(read.query).not.toContain("eligible_verified");
      expect(read.query).not.toContain("eligible_likely");
      expect(read.query).toContain("json_group_array");
      expect(read.query).toContain("posted_at");
      expect(read.query).toContain("source_url");
      expect(read.query).toContain("application_url");
      expect(read.query).toContain("location_type");
      seen.push(...read.values.slice(3));
    }
    expect(seen).toEqual(Array.from({ length: 201 }, (_, index) => index + 1));
  } finally { sqlite.close(); }
});

test("native later PH eligibility chunk mismatch keeps all rows without a success ledger", async () => {
  const sqlite = freshDb();
  try {
    const db = new BunDb(sqlite);
    const result = await publishPublicExposure(db, {
      sourceId: "remotive", now: NOW, tickKey: TICK, retryKey: "later-ph-mismatch", proposedCount: 201,
      persist: async () => {
        const ids = Array.from({ length: 201 }, (_, index) => writeOpportunity(sqlite, `later-ph-${index}`, "remotive", 1,
          index === 99 ? "unclear" : "eligible_verified")[0]!);
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject(postPersistenceUnknown);
    expect(db.reads.filter(read => read.query.includes("FROM opportunities"))).toHaveLength(2);
    expect(db.runs).toEqual([]);
    expect(sqlite.query("SELECT COUNT(*) AS n FROM opportunities").get()).toEqual({ n: 201 });
    expect(currentPublicIds(sqlite)).toHaveLength(200);
    expect(sqlite.query("SELECT rowid FROM opportunities_fts WHERE opportunities_fts MATCH 'acknowledgement'").all()).toHaveLength(201);
    expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_ledger").get()).toEqual({ n: 0 });
  } finally { sqlite.close(); }
});

test("native later ownership chunk mismatch stops reads and keeps all physical rows without a ledger", async () => {
  const sqlite = freshDb();
  try {
    const db = new BunDb(sqlite);
    const result = await publishPublicExposure(db, {
      sourceId: "remotive", now: NOW, tickKey: TICK, retryKey: "later-ownership-mismatch", proposedCount: 201,
      persist: async () => {
        const ids = Array.from({ length: 201 }, (_, index) => writeOpportunity(sqlite, `later-${index}`, index === 99 ? "remote-ok" : "remotive")[0]!);
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject(postPersistenceUnknown);
    expect(db.reads.filter(read => read.query.includes("FROM opportunities"))).toHaveLength(2);
    expect(db.runs).toEqual([]);
    expect(sqlite.query("SELECT COUNT(*) AS n FROM opportunities").get()).toEqual({ n: 201 });
    expect(sqlite.query("SELECT rowid FROM opportunities_fts WHERE opportunities_fts MATCH 'acknowledgement'").all()).toHaveLength(201);
  } finally { sqlite.close(); }
});

for (const stage of ["policy-await", "persist-await"] as const) test(`native request identity remains snapshotted across ${stage}`, async () => {
  const sqlite = freshDb();
  try {
    const db = new BunDb(sqlite);
    const changeRequest = () => {
      request.sourceId = "remote-ok"; request.tickKey = "different-tick";
      request.retryKey = "different-retry"; request.now = "2026-10-01T00:00:00.000Z";
      request.proposedCount = 0; request.persist = async () => { throw new Error("replacement callback"); };
    };
    const request: PublishPublicExposureRequest = {
      sourceId: "remotive", now: NOW, tickKey: TICK, retryKey: "original-request", proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite);
        if (stage === "persist-await") changeRequest();
        await Promise.resolve();
        return { publishedCount: ids.length, ids };
      },
    };
    if (stage === "policy-await") {
      const prepare = db.prepare.bind(db);
      db.prepare = query => {
        const statement = prepare(query), first = statement.first.bind(statement);
        if (query.includes("FROM source_publication_ledger WHERE retry_key")) {
          statement.first = async <T>() => { changeRequest(); await Promise.resolve(); return first<T>(); };
        }
        return statement;
      };
    }
    const result = await publishPublicExposure(db, request);
    expect(result).toMatchObject({ ok: true, publishedCount: 1, ids: [1], replayed: false });
    expect(sqlite.query("SELECT source_id, tick_key, retry_key, proposed_count, decided_at FROM source_publication_ledger").get())
      .toEqual({ source_id: "remotive", tick_key: TICK, retry_key: "original-request", proposed_count: 1, decided_at: NOW });
    expect(db.reads.find(read => read.query.includes("FROM opportunities"))?.values)
      .toEqual(["remotive", "eligible_verified", "eligible_likely", 1]);
  } finally { sqlite.close(); }
});

test("native empty and blocked decisions avoid current ownership reads", async () => {
  const sqlite = freshDb();
  try {
    const db = new BunDb(sqlite);
    for (const sourceId of ["remotive", "unregistered:fixture"]) {
      const result = await publishPublicExposure(db, {
        sourceId, now: NOW, tickKey: TICK, retryKey: sourceId, proposedCount: 0,
        persist: async () => { throw new Error("empty decision must not write"); },
      });
      expect(result).toMatchObject({ ok: true, publishedCount: 0 });
    }
    expect(db.reads.filter(read => read.query.includes("FROM opportunities"))).toEqual([]);
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
    const conflictDb = new BunDb(sqlite);
    const conflict = await publishPublicExposure(conflictDb, {
      sourceId: "remotive", now: NOW, tickKey: TICK, retryKey: "returned-conflict", proposedCount: 1,
      persist: async () => { const ids = writeOpportunity(sqlite); return { publishedCount: ids.length, ids }; },
    });
    expect(conflict).toMatchObject({ ok: true, publishedCount: 0, ids: [], replayed: false });
    expect(conflictDb.reads.filter(read => read.query.includes("FROM opportunities"))).toEqual([]);
    expect(sqlite.query("SELECT published_count AS count, published_ids_json AS ids FROM source_publication_ledger ORDER BY id").all())
      .toEqual([{ count: 1, ids: "[1]" }, { count: 0, ids: "[]" }]);
    expect(sqlite.query("SELECT COUNT(*) AS n FROM opportunities").get()).toEqual({ n: 1 });
  } finally { sqlite.close(); }
});
