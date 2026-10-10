import { expect, test } from "bun:test";
import { Database, type SQLQueryBindings } from "bun:sqlite";
import { readFileSync } from "fs";
import { join } from "path";
import { concentrationReport, familyShares, TOP_PROVIDER_FAMILY_SHARE_MAX, TOP_SOURCE_SHARE_MAX } from "../../scripts/ci/constitution-metrics";
import { latestManilaOpenSnapshot } from "./manila-day";
import { publishPublicExposure, publicationTickKey, type PublicationDatabase, type PublicationStatement, type PublishPublicExposureRequest } from "./publication-gateway";
import { withdrawUnreceiptedAcknowledgements } from "./publication-uncertainty";
import { isPublicPhEligibility, PUBLIC_PH_ELIGIBILITIES } from "./publication-eligibility";
import { assessPostingFreshness } from "./publication-freshness";
import { resolvePublicationOutboundUrl } from "./publication-outbound";
import { canonicalizeSourceUrl } from "./contentHash";

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
    "0028_opportunity_inactive_reason.sql",
    "0034_opportunity_source_id.sql", "0036_registry_foundation.sql", "0037_source_lifecycle_opt_out.sql",
    "0038_shadow_observations.sql", "0039_canary_transition_plane.sql",
    "0040_current_evidence_admission.sql", "0041_publication_ledger.sql",
    "0042_d1_like_glob_limit.sql", "0056_publication_outcome_uncertainty.sql",
    "0057_publication_reservation.sql",
    "0058_publication_portfolio_measurement.sql",
    "0059_publication_serving_measurement.sql",
    "0060_publication_portfolio_divergence.sql",
    "0061_publication_manila_day.sql",
    "0062_publication_manila_still_public.sql",
    "0063_publication_manila_open_snapshot.sql",
    "0064_publication_portfolio_book_total.sql",
    "0065_publication_portfolio_book_membership.sql",
    "0066_publication_portfolio_source_counts.sql",
    "0067_publication_portfolio_job_identity.sql",
    "0068_publication_manila_snapshot_ids.sql",
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

test("native lost ledger acknowledgement names only the written id and a later pass leaves ledger-less history public", async () => {
  const sqlite = freshDb();
  try {
    sqlite.exec(`CREATE TRIGGER fixture_reject_ledger BEFORE INSERT ON source_publication_ledger
      BEGIN SELECT RAISE(ABORT, 'fixture ledger rejection'); END;`);
    const neighbor = writeOpportunity(sqlite, "historical-neighbor");
    const db = new BunDb(sqlite);
    const lost = await publishPublicExposure(db, {
      sourceId: "remotive", now: NOW, tickKey: TICK, retryKey: "ledger-rejected-marked", proposedCount: 1,
      persist: async () => ({ publishedCount: 1, ids: writeOpportunity(sqlite, "lost-ack") }),
    });
    expect(lost).toMatchObject(postPersistenceUnknown);
    expect(JSON.stringify(lost)).not.toContain("fixture ledger rejection");
    const lostId = (sqlite.query("SELECT id FROM opportunities WHERE source_url = ?").get("https://example.invalid/lost-ack") as { id: number }).id;
    expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_ledger").get()).toEqual({ n: 0 });
    expect(sqlite.query(`SELECT source_id AS sourceId, retry_key AS retryKey, opportunity_ids_json AS ids, reason
      FROM publication_outcome_uncertainty`).all()).toEqual([{
      sourceId: "remotive", retryKey: "ledger-rejected-marked", ids: `[${lostId}]`, reason: "ledger-acknowledgement-unconfirmed",
    }]);
    expect(currentPublicIds(sqlite)).toEqual([neighbor[0], lostId].sort((a, b) => a! - b!));

    const again = await publishPublicExposure(db, {
      sourceId: "remotive", now: NOW, tickKey: TICK, retryKey: "ledger-rejected-marked", proposedCount: 1,
      persist: async () => ({ publishedCount: 1, ids: [lostId] }),
    });
    expect(again).toMatchObject(postPersistenceUnknown);
    expect(sqlite.query("SELECT COUNT(*) AS n FROM publication_outcome_uncertainty").get()).toEqual({ n: 1 });

    sqlite.exec("DROP TRIGGER fixture_reject_ledger;");
    const receiptedId = writeOpportunity(sqlite, "receipted-neighbor");
    sqlite.query(`INSERT INTO source_publication_ledger(
      source_id, tick_key, retry_key, mode, proposed_count, published_count, published_ids_json, decided_at
    ) VALUES ('remotive', ?, 'receipted-neighbor', 'unlimited', 1, 1, ?, ?)`).run(TICK, `[${receiptedId}]`, NOW);
    sqlite.query(`INSERT INTO publication_outcome_uncertainty(
      source_id, tick_key, retry_key, opportunity_ids_json, reason, recorded_at
    ) VALUES ('remotive', ?, 'receipted-neighbor-uncertain', ?, 'ledger-acknowledgement-unconfirmed', ?)`).run(
      TICK, `[${receiptedId}]`, NOW,
    );

    const first = await withdrawUnreceiptedAcknowledgements(db, NOW);
    const second = await withdrawUnreceiptedAcknowledgements(db, NOW);
    expect(first.withdrawnIds).toEqual([lostId]);
    expect(second.withdrawnIds).toEqual([]);
    expect(currentPublicIds(sqlite)).toEqual([neighbor[0]!, receiptedId[0]!].sort((a, b) => a - b));
    expect(sqlite.query("SELECT is_active AS active, inactive_reason AS reason FROM opportunities WHERE id = ?").get(lostId))
      .toEqual({ active: 0, reason: "publication-unreceipted" });
    expect(sqlite.query("SELECT is_active AS active, inactive_reason AS reason FROM opportunities WHERE id = ?").get(neighbor[0]!))
      .toEqual({ active: 1, reason: null });
    expect(sqlite.query("SELECT is_active AS active FROM opportunities WHERE id = ?").get(receiptedId[0]!)).toEqual({ active: 1 });
  } finally { sqlite.close(); }
});

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

test("overlapping capped writers cannot both publish the same remaining cap", async () => {
  const sqlite = freshDb();
  try {
    sqlite.exec("DROP TRIGGER IF EXISTS source_registry_initial_state_is_dormant;");
    sqlite.query(`INSERT INTO provider_profiles (
      id, display_name, provider_family, mechanism, auth_class, evidence_lease_days,
      default_compliance_state, default_operational_state
    ) VALUES ('fixture-provider', 'Fixture', 'fixture', 'public_api', 'none', 180, 'allowed', 'candidate')`).run();
    sqlite.query(`INSERT INTO source_registry (
      source_id, provider_id, display_name, endpoint_url, compliance_state, operational_state,
      policy_expiry, canary_max_new_items_per_tick
    ) VALUES ('greenhouse:test', 'fixture-provider', 'Fixture', 'https://example.invalid/jobs',
      'allowed', 'canary', '2027-01-01T00:00:00.000Z', 2)`).run();
    let releaseSecond: () => void = () => {};
    const secondDone = new Promise<void>((resolve) => { releaseSecond = resolve; });
    let releaseEntered: () => void = () => {};
    const firstEntered = new Promise<void>((resolve) => { releaseEntered = resolve; });
    let firstPersisted = 0;
    let secondPersisted = 0;
    const first = publishPublicExposure(new BunDb(sqlite), {
      sourceId: "greenhouse:test", now: NOW, tickKey: TICK, retryKey: "reserve-first", proposedCount: 2,
      persist: async () => {
        firstPersisted += 1;
        releaseEntered();
        await secondDone;
        const ids = [1, 2].map((n) => writeOpportunity(sqlite, `reserve-first-${n}`, "greenhouse:test")[0]!);
        return { publishedCount: ids.length, ids };
      },
    });
    await firstEntered;
    const second = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "greenhouse:test", now: NOW, tickKey: TICK, retryKey: "reserve-second", proposedCount: 2,
      persist: async () => {
        secondPersisted += 1;
        const ids = writeOpportunity(sqlite, "reserve-second", "greenhouse:test");
        return { publishedCount: ids.length, ids };
      },
    });
    releaseSecond();
    const firstResult = await first;
    expect(secondPersisted).toBe(0);
    expect(second).toMatchObject({ ok: true, mode: "blocked", publishedCount: 0, ids: [] });
    expect(firstPersisted).toBe(1);
    expect(firstResult).toMatchObject({ ok: true, mode: "capped", publishedCount: 2 });
    expect(sqlite.query("SELECT COUNT(*) AS n FROM opportunities").get()).toEqual({ n: 2 });
  } finally { sqlite.close(); }
});

test("a capped persist failure holds the tick for a different retry", async () => {
  const sqlite = freshDb();
  try {
    sqlite.exec("DROP TRIGGER IF EXISTS source_registry_initial_state_is_dormant;");
    sqlite.query(`INSERT INTO provider_profiles (
      id, display_name, provider_family, mechanism, auth_class, evidence_lease_days,
      default_compliance_state, default_operational_state
    ) VALUES ('fixture-provider', 'Fixture', 'fixture', 'public_api', 'none', 180, 'allowed', 'candidate')`).run();
    sqlite.query(`INSERT INTO source_registry (
      source_id, provider_id, display_name, endpoint_url, compliance_state, operational_state,
      policy_expiry, canary_max_new_items_per_tick
    ) VALUES ('greenhouse:test', 'fixture-provider', 'Fixture', 'https://example.invalid/jobs',
      'allowed', 'canary', '2027-01-01T00:00:00.000Z', 2)`).run();
    const failed = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "greenhouse:test", now: NOW, tickKey: TICK, retryKey: "reserve-failed", proposedCount: 2,
      persist: async () => { throw new Error("persist failed after the hold"); },
    });
    let persisted = 0;
    const second = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "greenhouse:test", now: NOW, tickKey: TICK, retryKey: "reserve-after-failure", proposedCount: 1,
      persist: async () => { persisted += 1; return { publishedCount: 1, ids: [1] }; },
    });
    expect(failed).toMatchObject({ ok: false, code: "POST_PERSISTENCE_FAILURE", exposure: "UNKNOWN" });
    expect(persisted).toBe(0);
    expect(second).toMatchObject({ ok: true, mode: "blocked", publishedCount: 0, ids: [] });
    expect(sqlite.query("SELECT COUNT(*) AS n FROM opportunities").get()).toEqual({ n: 0 });
    expect(sqlite.query("SELECT reserved_count AS n FROM source_publication_reservation").get()).toEqual({ n: 2 });
  } finally { sqlite.close(); }
});

test("native opt-out inserted after the first authority read does not publish", async () => {
  const sqlite = freshDb();
  try {
    const inner = new BunDb(sqlite);
    let optOutReads = 0;
    const db: PublicationDatabase = {
      prepare(query: string): PublicationStatement {
        const statement = inner.prepare(query);
        if (!query.includes("FROM source_opt_outs")) return statement;
        return {
          bind(...values: unknown[]) {
            const bound = statement.bind(...values);
            return {
              bind() { return this; },
              async first<T>() {
                optOutReads += 1;
                const row = await bound.first<T>();
                if (optOutReads === 1) {
                  sqlite.query("INSERT INTO source_opt_outs(source_id, reason) VALUES(?, ?)").run("we-work-remotely", "owner opt-out after the authority snapshot");
                }
                return row;
              },
              run: () => bound.run(),
            };
          },
        };
      },
    };
    let persisted = 0;
    const result = await publishPublicExposure(db, {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "native-epoch-opt-out", proposedCount: 1,
      persist: async () => {
        persisted += 1;
        const ids = writeOpportunity(sqlite, "native-epoch-opt-out", "we-work-remotely");
        return { publishedCount: ids.length, ids };
      },
    });
    expect(persisted).toBe(0);
    expect(result).toMatchObject({ ok: true, mode: "blocked", publishedCount: 0, ids: [] });
    expect(sqlite.query("SELECT COUNT(*) AS n FROM opportunities").get()).toEqual({ n: 0 });
    expect(sqlite.query("SELECT mode FROM source_publication_ledger").all()).toEqual([{ mode: "blocked" }]);
  } finally { sqlite.close(); }
});

interface PortfolioMeasurementRow {
  source_share_status: string;
  family_share_status: string;
  book_total: number;
  published_count: number;
  top_source_id: string | null;
  top_family_id: string | null;
  top_source_share: number | null;
  top_family_share: number | null;
}

function seedPublishedBook(sqlite: Database, sourceId: string, count: number, retryKey: string) {
  sqlite.query(`INSERT INTO source_publication_ledger(
    source_id, tick_key, retry_key, mode, proposed_count, published_count, published_ids_json, decided_at
  ) VALUES (?, ?, ?, 'unlimited', ?, ?, '[]', ?)`).run(sourceId, TICK, retryKey, count, count, NOW);
}

function ledgerExposureBook(sqlite: Database): Array<{ sourceId: string; count: number }> {
  return sqlite.query(`SELECT source_id AS sourceId, SUM(published_count) AS count
    FROM source_publication_ledger
    WHERE mode IN ('unlimited', 'capped') AND published_count > 0
    GROUP BY source_id`).all() as Array<{ sourceId: string; count: number }>;
}

function readPortfolioMeasurement(sqlite: Database, retryKey: string): PortfolioMeasurementRow | null {
  try {
    return sqlite.query(`SELECT source_share_status, family_share_status, book_total, published_count,
      top_source_id, top_family_id, top_source_share, top_family_share
      FROM source_publication_portfolio_measurement WHERE retry_key = ?`).get(retryKey) as PortfolioMeasurementRow | null;
  } catch (error) {
    if (error instanceof Error && /no such table/i.test(error.message)) return null;
    throw error;
  }
}

function expectPortfolioMatchesLedger(sqlite: Database, retryKey: string, publishedCount: number) {
  const book = ledgerExposureBook(sqlite);
  const source = concentrationReport(book.map((row) => ({ id: row.sourceId, count: row.count })), TOP_SOURCE_SHARE_MAX);
  const family = concentrationReport(familyShares(book), TOP_PROVIDER_FAMILY_SHARE_MAX);
  const measured = readPortfolioMeasurement(sqlite, retryKey);
  expect(measured).not.toBeNull();
  expect(measured!.published_count).toBe(publishedCount);
  expect(measured!.book_total).toBe(source.total);
  expect(measured!.source_share_status).toBe(source.status);
  expect(measured!.family_share_status).toBe(family.status);
  expect(measured!.top_source_id).toBe(source.topId);
  expect(measured!.top_family_id).toBe(family.topId);
  expect(measured!.top_source_share).toBeCloseTo(source.topShare ?? Number.NaN, 10);
  expect(measured!.top_family_share).toBeCloseTo(family.topShare ?? Number.NaN, 10);
  return { source, family };
}

test("a concentrated exact-six publish stays unlimited and records a portfolio breach", async () => {
  const sqlite = freshDb();
  try {
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "portfolio-breach", proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite, "portfolio-breach", "we-work-remotely");
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    const { source, family } = expectPortfolioMatchesLedger(sqlite, "portfolio-breach", 1);
    expect(source.status).toBe("BREACH");
    expect(family.status).toBe("BREACH");
    expect(source.topShare).toBe(1);
    const replay = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "portfolio-breach", proposedCount: 1,
      persist: async () => ({ publishedCount: 1, ids: [99] }),
    });
    expect(replay).toMatchObject({ ok: true, publishedCount: 1, replayed: true });
    expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_portfolio_measurement").get()).toEqual({ n: 1 });
  } finally { sqlite.close(); }
});

test("a portfolio family above 40% is recorded while the top source stays inside 25%", async () => {
  const sqlite = freshDb();
  try {
    seedPublishedBook(sqlite, "greenhouse:a", 15, "portfolio-family-a");
    seedPublishedBook(sqlite, "greenhouse:b", 15, "portfolio-family-b");
    seedPublishedBook(sqlite, "greenhouse:c", 15, "portfolio-family-c");
    seedPublishedBook(sqlite, "remotive", 14, "portfolio-family-remotive");
    seedPublishedBook(sqlite, "real-work-from-anywhere", 14, "portfolio-family-rwfa");
    seedPublishedBook(sqlite, "remote-ok", 14, "portfolio-family-remote-ok");
    seedPublishedBook(sqlite, "jobicy-admin-support-apac", 13, "portfolio-family-jobicy");
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "portfolio-family", proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite, "portfolio-family", "we-work-remotely");
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    const { source, family } = expectPortfolioMatchesLedger(sqlite, "portfolio-family", 1);
    expect(source.status).toBe("OK");
    expect(family.status).toBe("BREACH");
    expect(family.topId).toBe("greenhouse");
  } finally { sqlite.close(); }
});

test("a diversified exact-six publish records an in-ceiling portfolio measurement", async () => {
  const sqlite = freshDb();
  try {
    for (const sourceId of ["remotive", "real-work-from-anywhere", "remote-ok", "jobicy-admin-support-apac"]) {
      seedPublishedBook(sqlite, sourceId, 24, `portfolio-ok-${sourceId}`);
    }
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "portfolio-ok", proposedCount: 4,
      persist: async (allowed) => {
        const ids = Array.from({ length: allowed }, (_, index) => writeOpportunity(sqlite, `portfolio-ok-${index}`, "we-work-remotely")[0]!);
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 4, replayed: false });
    const { source, family } = expectPortfolioMatchesLedger(sqlite, "portfolio-ok", 4);
    expect(source.status).toBe("OK");
    expect(family.status).toBe("OK");
    expect(source.topShare).toBeLessThanOrEqual(TOP_SOURCE_SHARE_MAX);
    expect(family.topShare).toBeLessThanOrEqual(TOP_PROVIDER_FAMILY_SHARE_MAX);
  } finally { sqlite.close(); }
});

test("a concentrated canary publish stays capped and records a portfolio breach", async () => {
  const sqlite = freshDb();
  try {
    sqlite.exec("DROP TRIGGER IF EXISTS source_registry_initial_state_is_dormant;");
    sqlite.query(`INSERT INTO provider_profiles (
      id, display_name, provider_family, mechanism, auth_class, evidence_lease_days,
      default_compliance_state, default_operational_state
    ) VALUES ('fixture-provider', 'Fixture', 'fixture', 'public_api', 'none', 180, 'allowed', 'candidate')`).run();
    sqlite.query(`INSERT INTO source_registry (
      source_id, provider_id, display_name, endpoint_url, compliance_state, operational_state,
      policy_expiry, canary_max_new_items_per_tick
    ) VALUES ('greenhouse:test', 'fixture-provider', 'Fixture', 'https://example.invalid/jobs',
      'allowed', 'canary', '2027-01-01T00:00:00.000Z', 2)`).run();
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "greenhouse:test", now: NOW, tickKey: TICK, retryKey: "portfolio-canary", proposedCount: 2,
      persist: async () => {
        const ids = [1, 2].map((n) => writeOpportunity(sqlite, `portfolio-canary-${n}`, "greenhouse:test")[0]!);
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "capped", publishedCount: 2, replayed: false });
    const { source, family } = expectPortfolioMatchesLedger(sqlite, "portfolio-canary", 2);
    expect(source.status).toBe("BREACH");
    expect(family.status).toBe("BREACH");
    expect(sqlite.query("SELECT mode FROM source_publication_ledger").all()).toEqual([{ mode: "capped" }]);
  } finally { sqlite.close(); }
});

test("a missing portfolio measurement table does not block exact-six publication", async () => {
  const sqlite = freshDb();
  try {
    sqlite.exec("DROP TABLE source_publication_portfolio_measurement;");
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "portfolio-missing-table", proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite, "portfolio-missing-table", "we-work-remotely");
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    expect(sqlite.query("SELECT mode, published_count AS count FROM source_publication_ledger").all())
      .toEqual([{ mode: "unlimited", count: 1 }]);
  } finally { sqlite.close(); }
});

function readServingMeasurement(sqlite: Database, retryKey: string): PortfolioMeasurementRow | null {
  try {
    return sqlite.query(`SELECT source_share_status, family_share_status, book_total, published_count,
      top_source_id, top_family_id, top_source_share, top_family_share
      FROM source_publication_serving_measurement WHERE retry_key = ?`).get(retryKey) as PortfolioMeasurementRow | null;
  } catch (error) {
    if (error instanceof Error && /no such table/i.test(error.message)) return null;
    throw error;
  }
}

test("a withdrawn job stays in the ledger book and leaves the live serving book", async () => {
  const sqlite = freshDb();
  try {
    seedPublishedBook(sqlite, "we-work-remotely", 96, "serving-history");
    writeOpportunity(sqlite, "serving-inactive", "we-work-remotely", 0);
    writeOpportunity(sqlite, "serving-public-greenhouse-a", "greenhouse:a");
    writeOpportunity(sqlite, "serving-public-greenhouse-b", "greenhouse:b");
    for (const sourceId of ["remotive", "real-work-from-anywhere", "remote-ok", "jobicy-admin-support-apac"]) {
      const ids = writeOpportunity(sqlite, `serving-public-${sourceId}`, sourceId);
      expect(ids).toHaveLength(1);
    }
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "serving-book", proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite, "serving-new", "we-work-remotely");
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    const ledger = expectPortfolioMatchesLedger(sqlite, "serving-book", 1);
    expect(ledger.source.status).toBe("BREACH");
    const serving = readServingMeasurement(sqlite, "serving-book");
    expect(serving).not.toBeNull();
    const publicRows = sqlite.query(`SELECT source_id AS sourceId, COUNT(*) AS count
      FROM opportunities
      WHERE is_active = 1 AND ph_eligibility IN (?, ?)
      GROUP BY source_id`).all(...PUBLIC_PH_ELIGIBILITIES) as Array<{ sourceId: string; count: number }>;
    const source = concentrationReport(publicRows.map((row) => ({ id: row.sourceId, count: row.count })), TOP_SOURCE_SHARE_MAX);
    const family = concentrationReport(familyShares(publicRows), TOP_PROVIDER_FAMILY_SHARE_MAX);
    expect(source.status).toBe("OK");
    expect(family.status).toBe("OK");
    expect(serving!.book_total).toBe(source.total);
    expect(serving!.source_share_status).toBe(source.status);
    expect(serving!.family_share_status).toBe(family.status);
    expect(serving!.top_source_id).toBe(source.topId);
    expect(serving!.top_family_id).toBe(family.topId);
    expect(serving!.top_source_share).toBeCloseTo(source.topShare ?? Number.NaN, 10);
    expect(serving!.top_family_share).toBeCloseTo(family.topShare ?? Number.NaN, 10);
    expect(sqlite.query("SELECT COUNT(*) AS n FROM opportunities WHERE is_active = 0 AND source_id = 'we-work-remotely'").get())
      .toEqual({ n: 1 });
  } finally { sqlite.close(); }
});

test("a missing serving measurement table keeps the unlimited receipt and the ledger measurement", async () => {
  const sqlite = freshDb();
  try {
    sqlite.exec("DROP TABLE source_publication_serving_measurement;");
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "serving-missing-table", proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite, "serving-missing-table", "we-work-remotely");
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    expect(readPortfolioMeasurement(sqlite, "serving-missing-table")).not.toBeNull();
    expect(sqlite.query("SELECT mode, published_count AS count FROM source_publication_ledger").all())
      .toEqual([{ mode: "unlimited", count: 1 }]);
  } finally { sqlite.close(); }
});

type BookDivergenceRow = {
  ledger_source_status: string;
  serving_source_status: string;
  ledger_family_status: string;
  serving_family_status: string;
  source_status_agrees: number;
  family_status_agrees: number;
};

function readBookDivergence(sqlite: Database, retryKey: string): BookDivergenceRow | null {
  try {
    return sqlite.query(`SELECT ledger_source_status, serving_source_status,
      ledger_family_status, serving_family_status, source_status_agrees, family_status_agrees
      FROM source_publication_portfolio_divergence WHERE retry_key = ?`).get(retryKey) as BookDivergenceRow | null;
  } catch (error) {
    if (error instanceof Error && /no such table/i.test(error.message)) return null;
    throw error;
  }
}

test("a ledger breach beside a serving ok is persisted as disagreement", async () => {
  const sqlite = freshDb();
  try {
    seedPublishedBook(sqlite, "we-work-remotely", 96, "divergence-history");
    writeOpportunity(sqlite, "divergence-inactive", "we-work-remotely", 0);
    writeOpportunity(sqlite, "divergence-public-greenhouse-a", "greenhouse:a");
    writeOpportunity(sqlite, "divergence-public-greenhouse-b", "greenhouse:b");
    for (const sourceId of ["remotive", "real-work-from-anywhere", "remote-ok", "jobicy-admin-support-apac"]) {
      writeOpportunity(sqlite, `divergence-public-${sourceId}`, sourceId);
    }
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "divergence-books", proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite, "divergence-new", "we-work-remotely");
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    const ledger = expectPortfolioMatchesLedger(sqlite, "divergence-books", 1);
    const serving = readServingMeasurement(sqlite, "divergence-books");
    expect(ledger.source.status).toBe("BREACH");
    expect(serving).not.toBeNull();
    expect(serving!.source_share_status).toBe("OK");
    const divergence = readBookDivergence(sqlite, "divergence-books");
    expect(divergence).not.toBeNull();
    expect(divergence!.ledger_source_status).toBe(ledger.source.status);
    expect(divergence!.serving_source_status).toBe(serving!.source_share_status);
    expect(divergence!.ledger_family_status).toBe(ledger.family.status);
    expect(divergence!.serving_family_status).toBe(serving!.family_share_status);
    expect(divergence!.source_status_agrees).toBe(0);
    expect(divergence!.family_status_agrees).toBe(0);
    expect(result.mode).toBe("unlimited");
  } finally { sqlite.close(); }
});

test("matching ledger and serving breaches are persisted as agreement", async () => {
  const sqlite = freshDb();
  try {
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "divergence-agree", proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite, "divergence-agree", "we-work-remotely");
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    const ledger = expectPortfolioMatchesLedger(sqlite, "divergence-agree", 1);
    const serving = readServingMeasurement(sqlite, "divergence-agree");
    expect(ledger.source.status).toBe("BREACH");
    expect(serving!.source_share_status).toBe("BREACH");
    const divergence = readBookDivergence(sqlite, "divergence-agree");
    expect(divergence).not.toBeNull();
    expect(divergence!.source_status_agrees).toBe(1);
    expect(divergence!.family_status_agrees).toBe(1);
    const replay = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "divergence-agree", proposedCount: 1,
      persist: async () => ({ publishedCount: 1, ids: [1] }),
    });
    expect(replay).toMatchObject({ ok: true, publishedCount: 1, replayed: true });
    expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_portfolio_divergence").get()).toEqual({ n: 1 });
  } finally { sqlite.close(); }
});

function readBookTotals(sqlite: Database, retryKey: string): { ledger_book_total: number; serving_book_total: number; totals_differ: number } | null {
  try {
    return sqlite.query(`SELECT ledger_book_total, serving_book_total, totals_differ
      FROM source_publication_portfolio_book_total WHERE retry_key = ?`).get(retryKey) as { ledger_book_total: number; serving_book_total: number; totals_differ: number } | null;
  } catch (error) {
    if (error instanceof Error && /no such table/i.test(error.message)) return null;
    throw error;
  }
}

test("status agreement does not make unequal book totals the same", async () => {
  const sqlite = freshDb();
  try {
    const first = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "totals-first", proposedCount: 2,
      persist: async () => {
        const ids = [
          ...writeOpportunity(sqlite, "totals-a", "we-work-remotely"),
          ...writeOpportunity(sqlite, "totals-b", "we-work-remotely"),
        ];
        return { publishedCount: ids.length, ids };
      },
    });
    expect(first).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 2, replayed: false });
    const withdrawnId = first.ok ? first.ids[0] : 0;
    sqlite.query("UPDATE opportunities SET is_active = 0 WHERE id = ?").run(withdrawnId);
    const second = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "totals-differ", proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite, "totals-c", "we-work-remotely");
        return { publishedCount: ids.length, ids };
      },
    });
    expect(second).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    const ledgerTotal = sqlite.query(`SELECT CAST(TOTAL(published_count) AS INTEGER) AS n
      FROM source_publication_ledger
      WHERE mode IN ('unlimited', 'capped') AND published_count > 0`).get() as { n: number };
    const servingTotal = sqlite.query(`SELECT COUNT(*) AS n FROM "opportunities"
      WHERE is_active = 1 AND ph_eligibility IN (?, ?)
        AND typeof(source_id) = 'text' AND length(source_id) > 0`).get(...PUBLIC_PH_ELIGIBILITIES) as { n: number };
    expect(ledgerTotal.n).toBe(3);
    expect(servingTotal.n).toBe(2);
    const ledger = readPortfolioMeasurement(sqlite, "totals-differ");
    const serving = readServingMeasurement(sqlite, "totals-differ");
    expect(ledger).not.toBeNull();
    expect(serving).not.toBeNull();
    expect(ledger!.book_total).toBe(ledgerTotal.n);
    expect(serving!.book_total).toBe(servingTotal.n);
    const divergence = readBookDivergence(sqlite, "totals-differ");
    expect(divergence).not.toBeNull();
    expect(divergence!.source_status_agrees).toBe(1);
    expect(divergence!.family_status_agrees).toBe(1);
    const compared = readBookTotals(sqlite, "totals-differ");
    expect(compared).not.toBeNull();
    expect(compared!.ledger_book_total).toBe(ledger!.book_total);
    expect(compared!.serving_book_total).toBe(serving!.book_total);
    expect(compared!.totals_differ).toBe(1);
  } finally { sqlite.close(); }
});

test("equal book totals are recorded as not different", async () => {
  const sqlite = freshDb();
  try {
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "totals-equal", proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite, "totals-equal", "we-work-remotely");
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    const ledger = readPortfolioMeasurement(sqlite, "totals-equal");
    const serving = readServingMeasurement(sqlite, "totals-equal");
    expect(ledger!.book_total).toBe(serving!.book_total);
    const compared = readBookTotals(sqlite, "totals-equal");
    expect(compared).not.toBeNull();
    expect(compared!.ledger_book_total).toBe(ledger!.book_total);
    expect(compared!.serving_book_total).toBe(serving!.book_total);
    expect(compared!.totals_differ).toBe(0);
  } finally { sqlite.close(); }
});

test("a missing book-total table keeps publication and the status comparison", async () => {
  const sqlite = freshDb();
  try {
    sqlite.exec("DROP TABLE source_publication_portfolio_book_total;");
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "totals-missing", proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite, "totals-missing", "we-work-remotely");
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    expect(readPortfolioMeasurement(sqlite, "totals-missing")).not.toBeNull();
    expect(readServingMeasurement(sqlite, "totals-missing")).not.toBeNull();
    expect(readBookDivergence(sqlite, "totals-missing")).not.toBeNull();
    expect(readBookTotals(sqlite, "totals-missing")).toBeNull();
  } finally { sqlite.close(); }
});

function readBookMembership(sqlite: Database, retryKey: string): { ledger_sources_json: string; serving_sources_json: string; sets_differ: number } | null {
  try {
    return sqlite.query(`SELECT ledger_sources_json, serving_sources_json, sets_differ
      FROM source_publication_portfolio_book_membership WHERE retry_key = ?`).get(retryKey) as { ledger_sources_json: string; serving_sources_json: string; sets_differ: number } | null;
  } catch (error) {
    if (error instanceof Error && /no such table/i.test(error.message)) return null;
    throw error;
  }
}

function sourceSet(sqlite: Database, sql: string, params: unknown[] = []): string[] {
  const rows = sqlite.query(sql).all(...params) as Array<{ source_id: string }>;
  return rows.map((row) => row.source_id).sort();
}

test("equal totals and agreeing status do not prove the same source set", async () => {
  const sqlite = freshDb();
  try {
    seedPublishedBook(sqlite, "we-work-remotely", 2, "membership-history");
    writeOpportunity(sqlite, "membership-serving-a", "remotive");
    writeOpportunity(sqlite, "membership-serving-b", "remotive");
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "remotive", now: NOW, tickKey: TICK, retryKey: "membership-differ", proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite, "membership-serving-c", "remotive");
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    const ledgerSources = sourceSet(sqlite, `SELECT source_id FROM source_publication_ledger
      WHERE mode IN ('unlimited', 'capped') AND published_count > 0 GROUP BY source_id`);
    const servingSources = sourceSet(sqlite, `SELECT source_id FROM "opportunities"
      WHERE is_active = 1 AND ph_eligibility IN (?, ?)
        AND typeof(source_id) = 'text' AND length(source_id) > 0
      GROUP BY source_id`, [...PUBLIC_PH_ELIGIBILITIES]);
    expect(ledgerSources).toEqual(["remotive", "we-work-remotely"]);
    expect(servingSources).toEqual(["remotive"]);
    const totals = readBookTotals(sqlite, "membership-differ");
    expect(totals).not.toBeNull();
    expect(totals!.ledger_book_total).toBe(totals!.serving_book_total);
    expect(totals!.totals_differ).toBe(0);
    const divergence = readBookDivergence(sqlite, "membership-differ");
    expect(divergence!.source_status_agrees).toBe(1);
    expect(divergence!.family_status_agrees).toBe(1);
    const membership = readBookMembership(sqlite, "membership-differ");
    expect(membership).not.toBeNull();
    expect(JSON.parse(membership!.ledger_sources_json)).toEqual(ledgerSources);
    expect(JSON.parse(membership!.serving_sources_json)).toEqual(servingSources);
    expect(membership!.sets_differ).toBe(1);
  } finally { sqlite.close(); }
});

test("the same source set is recorded as not different", async () => {
  const sqlite = freshDb();
  try {
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "membership-same", proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite, "membership-same", "we-work-remotely");
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    const membership = readBookMembership(sqlite, "membership-same");
    expect(membership).not.toBeNull();
    expect(JSON.parse(membership!.ledger_sources_json)).toEqual(["we-work-remotely"]);
    expect(JSON.parse(membership!.serving_sources_json)).toEqual(["we-work-remotely"]);
    expect(membership!.sets_differ).toBe(0);
  } finally { sqlite.close(); }
});

test("a missing membership table keeps publication and the book totals", async () => {
  const sqlite = freshDb();
  try {
    sqlite.exec("DROP TABLE source_publication_portfolio_book_membership;");
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "membership-missing", proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite, "membership-missing", "we-work-remotely");
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    expect(readBookTotals(sqlite, "membership-missing")).not.toBeNull();
    expect(readBookDivergence(sqlite, "membership-missing")).not.toBeNull();
    expect(readBookMembership(sqlite, "membership-missing")).toBeNull();
  } finally { sqlite.close(); }
});

function readSourceCounts(sqlite: Database, retryKey: string): { ledger_counts_json: string; serving_counts_json: string; counts_differ: number } | null {
  try {
    return sqlite.query(`SELECT ledger_counts_json, serving_counts_json, counts_differ
      FROM source_publication_portfolio_source_counts WHERE retry_key = ?`).get(retryKey) as { ledger_counts_json: string; serving_counts_json: string; counts_differ: number } | null;
  } catch (error) {
    if (error instanceof Error && /no such table/i.test(error.message)) return null;
    throw error;
  }
}

function sourceCounts(sqlite: Database, sql: string, params: unknown[] = []): Array<{ sourceId: string; count: number }> {
  const rows = sqlite.query(sql).all(...params) as Array<{ source_id: string; count: number }>;
  return rows.map((row) => ({ sourceId: row.source_id, count: Number(row.count) })).sort((left, right) => left.sourceId.localeCompare(right.sourceId));
}

test("an equal source set and equal totals do not prove the same source counts", async () => {
  const sqlite = freshDb();
  try {
    seedPublishedBook(sqlite, "we-work-remotely", 2, "count-vector-wwr");
    seedPublishedBook(sqlite, "remotive", 1, "count-vector-remotive");
    writeOpportunity(sqlite, "count-vector-wwr-public", "we-work-remotely");
    writeOpportunity(sqlite, "count-vector-remotive-a", "remotive");
    writeOpportunity(sqlite, "count-vector-remotive-b", "remotive");
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "remote-ok", now: NOW, tickKey: TICK, retryKey: "count-vector-differ", proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite, "count-vector-remote-ok", "remote-ok");
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    const ledgerCounts = sourceCounts(sqlite, `SELECT source_id, CAST(TOTAL(published_count) AS INTEGER) AS count
      FROM source_publication_ledger
      WHERE mode IN ('unlimited', 'capped') AND published_count > 0
      GROUP BY source_id`);
    const servingCounts = sourceCounts(sqlite, `SELECT source_id, CAST(COUNT(*) AS INTEGER) AS count
      FROM "opportunities"
      WHERE is_active = 1 AND ph_eligibility IN (?, ?)
        AND typeof(source_id) = 'text' AND length(source_id) > 0
      GROUP BY source_id`, [...PUBLIC_PH_ELIGIBILITIES]);
    expect(ledgerCounts.map((row) => row.sourceId)).toEqual(servingCounts.map((row) => row.sourceId));
    expect(ledgerCounts).not.toEqual(servingCounts);
    const totals = readBookTotals(sqlite, "count-vector-differ");
    expect(totals!.ledger_book_total).toBe(totals!.serving_book_total);
    expect(totals!.totals_differ).toBe(0);
    const membership = readBookMembership(sqlite, "count-vector-differ");
    expect(membership!.sets_differ).toBe(0);
    const counted = readSourceCounts(sqlite, "count-vector-differ");
    expect(counted).not.toBeNull();
    expect(JSON.parse(counted!.ledger_counts_json)).toEqual(ledgerCounts);
    expect(JSON.parse(counted!.serving_counts_json)).toEqual(servingCounts);
    expect(counted!.counts_differ).toBe(1);
  } finally { sqlite.close(); }
});

test("the same source counts are recorded as not different", async () => {
  const sqlite = freshDb();
  try {
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "count-vector-same", proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite, "count-vector-same", "we-work-remotely");
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    const counted = readSourceCounts(sqlite, "count-vector-same");
    expect(counted).not.toBeNull();
    expect(JSON.parse(counted!.ledger_counts_json)).toEqual([{ sourceId: "we-work-remotely", count: 1 }]);
    expect(JSON.parse(counted!.serving_counts_json)).toEqual([{ sourceId: "we-work-remotely", count: 1 }]);
    expect(counted!.counts_differ).toBe(0);
  } finally { sqlite.close(); }
});

test("a missing source-count table keeps publication and the source sets", async () => {
  const sqlite = freshDb();
  try {
    sqlite.exec("DROP TABLE source_publication_portfolio_source_counts;");
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "count-vector-missing", proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite, "count-vector-missing", "we-work-remotely");
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    expect(readBookMembership(sqlite, "count-vector-missing")).not.toBeNull();
    expect(readSourceCounts(sqlite, "count-vector-missing")).toBeNull();
  } finally { sqlite.close(); }
});

function readJobIdentity(sqlite: Database, retryKey: string): { ledger_ids_json: string; serving_ids_json: string; ids_differ: number; ids_known: number } | null {
  try {
    return sqlite.query(`SELECT ledger_ids_json, serving_ids_json, ids_differ, ids_known
      FROM source_publication_portfolio_job_identity WHERE retry_key = ?`).get(retryKey) as { ledger_ids_json: string; serving_ids_json: string; ids_differ: number; ids_known: number } | null;
  } catch (error) {
    if (error instanceof Error && /no such table/i.test(error.message)) return null;
    throw error;
  }
}

function namedLedgerIds(sqlite: Database): number[] {
  const rows = sqlite.query(`SELECT published_ids_json AS ids FROM source_publication_ledger
    WHERE mode IN ('unlimited', 'capped') AND published_count > 0`).all() as Array<{ ids: string }>;
  const found = new Set<number>();
  for (const row of rows) {
    const parsed = JSON.parse(row.ids) as unknown;
    if (!Array.isArray(parsed)) continue;
    for (const id of parsed) {
      if (typeof id === "number" && Number.isSafeInteger(id) && id > 0) found.add(id);
    }
  }
  return [...found].sort((left, right) => left - right);
}

test("equal per-source counts do not prove the same opportunity ids", async () => {
  const sqlite = freshDb();
  try {
    const first = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "job-identity-first", proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite, "job-identity-a", "we-work-remotely");
        return { publishedCount: ids.length, ids };
      },
    });
    expect(first).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    const withdrawnId = first.ok ? first.ids[0] : 0;
    sqlite.query("UPDATE opportunities SET is_active = 0 WHERE id = ?").run(withdrawnId);
    writeOpportunity(sqlite, "job-identity-b", "we-work-remotely");
    const second = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "remote-ok", now: NOW, tickKey: TICK, retryKey: "job-identity-differ", proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite, "job-identity-c", "remote-ok");
        return { publishedCount: ids.length, ids };
      },
    });
    expect(second).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    const ledgerIds = namedLedgerIds(sqlite);
    const servingIds = (sqlite.query(`SELECT id FROM "opportunities"
      WHERE is_active = 1 AND ph_eligibility IN (?, ?)
        AND typeof(source_id) = 'text' AND length(source_id) > 0
      ORDER BY id`).all(...PUBLIC_PH_ELIGIBILITIES) as Array<{ id: number }>).map((row) => row.id);
    expect(ledgerIds).not.toEqual(servingIds);
    const counted = readSourceCounts(sqlite, "job-identity-differ");
    expect(counted).not.toBeNull();
    expect(counted!.counts_differ).toBe(0);
    const identity = readJobIdentity(sqlite, "job-identity-differ");
    expect(identity).not.toBeNull();
    expect(identity!.ids_known).toBe(1);
    expect(JSON.parse(identity!.ledger_ids_json)).toEqual(ledgerIds);
    expect(JSON.parse(identity!.serving_ids_json)).toEqual(servingIds);
    expect(identity!.ids_differ).toBe(1);
  } finally { sqlite.close(); }
});

test("an empty receipt id list stays unknown", async () => {
  const sqlite = freshDb();
  try {
    seedPublishedBook(sqlite, "we-work-remotely", 1, "job-identity-blank");
    writeOpportunity(sqlite, "job-identity-blank-public", "we-work-remotely");
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "remote-ok", now: NOW, tickKey: TICK, retryKey: "job-identity-unknown", proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite, "job-identity-unknown", "remote-ok");
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    const identity = readJobIdentity(sqlite, "job-identity-unknown");
    expect(identity).not.toBeNull();
    expect(identity!.ids_known).toBe(0);
    expect(identity!.ids_differ).toBe(0);
  } finally { sqlite.close(); }
});

test("the same opportunity ids are recorded as not different", async () => {
  const sqlite = freshDb();
  try {
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "job-identity-same", proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite, "job-identity-same", "we-work-remotely");
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    const ledgerIds = namedLedgerIds(sqlite);
    const identity = readJobIdentity(sqlite, "job-identity-same");
    expect(identity).not.toBeNull();
    expect(identity!.ids_known).toBe(1);
    expect(identity!.ids_differ).toBe(0);
    expect(JSON.parse(identity!.ledger_ids_json)).toEqual(ledgerIds);
    expect(JSON.parse(identity!.serving_ids_json)).toEqual(ledgerIds);
  } finally { sqlite.close(); }
});

test("a missing job-identity table keeps publication and the source counts", async () => {
  const sqlite = freshDb();
  try {
    sqlite.exec("DROP TABLE source_publication_portfolio_job_identity;");
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "job-identity-missing", proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite, "job-identity-missing", "we-work-remotely");
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    expect(readSourceCounts(sqlite, "job-identity-missing")).not.toBeNull();
    expect(readJobIdentity(sqlite, "job-identity-missing")).toBeNull();
  } finally { sqlite.close(); }
});

test("a missing divergence table keeps both exposure measurements", async () => {
  const sqlite = freshDb();
  try {
    sqlite.exec("DROP TABLE source_publication_portfolio_divergence;");
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "divergence-missing-table", proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite, "divergence-missing-table", "we-work-remotely");
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    expect(readPortfolioMeasurement(sqlite, "divergence-missing-table")).not.toBeNull();
    expect(readServingMeasurement(sqlite, "divergence-missing-table")).not.toBeNull();
    expect(sqlite.query("SELECT mode, published_count AS count FROM source_publication_ledger").all())
      .toEqual([{ mode: "unlimited", count: 1 }]);
  } finally { sqlite.close(); }
});

function manilaDateOf(instant: string): string {
  return new Date(Date.parse(instant) + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function distinctFirstPublishIds(sqlite: Database, manilaDate: string): number[] {
  const rows = sqlite.query(`SELECT published_ids_json AS ids, decided_at AS decidedAt
    FROM source_publication_ledger
    WHERE mode IN ('unlimited', 'capped') AND published_count > 0
    ORDER BY decided_at, id`).all() as Array<{ ids: string; decidedAt: string }>;
  const firstAt = new Map<number, string>();
  for (const row of rows) {
    const parsed = JSON.parse(row.ids) as unknown;
    if (!Array.isArray(parsed)) continue;
    for (const id of parsed) {
      if (typeof id !== "number" || !Number.isSafeInteger(id) || id <= 0) continue;
      const prior = firstAt.get(id);
      if (prior === undefined || row.decidedAt < prior) firstAt.set(id, row.decidedAt);
    }
  }
  return [...firstAt.entries()]
    .filter(([, decidedAt]) => manilaDateOf(decidedAt) === manilaDate)
    .map(([id]) => id)
    .sort((left, right) => left - right);
}

function readManilaFirstPublish(sqlite: Database, retryKey: string): { manila_date: string; first_publish_count: number } | null {
  try {
    return sqlite.query(`SELECT manila_date, first_publish_count
      FROM source_publication_manila_day WHERE retry_key = ?`).get(retryKey) as { manila_date: string; first_publish_count: number } | null;
  } catch (error) {
    if (error instanceof Error && /no such table/i.test(error.message)) return null;
    throw error;
  }
}

test("empty ledger counts do not inflate the Manila-day first-publish count", async () => {
  const sqlite = freshDb();
  try {
    seedPublishedBook(sqlite, "we-work-remotely", 96, "manila-empty-history");
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "manila-first", proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite, "manila-first", "we-work-remotely");
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    const ids = distinctFirstPublishIds(sqlite, manilaDateOf(NOW));
    expect(ids).toHaveLength(1);
    const measured = readManilaFirstPublish(sqlite, "manila-first");
    expect(measured).not.toBeNull();
    expect(measured!.manila_date).toBe(manilaDateOf(NOW));
    expect(measured!.first_publish_count).toBe(ids.length);
    const replay = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "manila-first", proposedCount: 1,
      persist: async () => ({ publishedCount: 1, ids: [1] }),
    });
    expect(replay).toMatchObject({ ok: true, publishedCount: 1, replayed: true });
    expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_manila_day").get()).toEqual({ n: 1 });
  } finally { sqlite.close(); }
});

test("a later receipt of the same id does not increment the Manila-day count", async () => {
  const sqlite = freshDb();
  try {
    const first = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "manila-same-a", proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite, "manila-same", "we-work-remotely");
        return { publishedCount: ids.length, ids };
      },
    });
    expect(first).toMatchObject({ ok: true, publishedCount: 1, replayed: false });
    const heldId = first.ok ? first.ids[0] : 0;
    const second = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "manila-same-b", proposedCount: 1,
      persist: async () => ({ publishedCount: 1, ids: [heldId!] }),
    });
    expect(second).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    const measured = readManilaFirstPublish(sqlite, "manila-same-b");
    expect(measured).not.toBeNull();
    expect(measured!.first_publish_count).toBe(distinctFirstPublishIds(sqlite, manilaDateOf(NOW)).length);
    expect(measured!.first_publish_count).toBe(1);
  } finally { sqlite.close(); }
});

test("a previous Manila day stays out of today's first-publish count", async () => {
  const sqlite = freshDb();
  try {
    sqlite.exec("DROP TRIGGER source_publication_ledger_validate_insert;");
    const yesterday = new Date(Date.parse(NOW) - 24 * 60 * 60 * 1000).toISOString();
    expect(manilaDateOf(yesterday)).not.toBe(manilaDateOf(NOW));
    sqlite.query(`INSERT INTO source_publication_ledger(
      source_id, tick_key, retry_key, mode, proposed_count, published_count, published_ids_json, decided_at
    ) VALUES ('we-work-remotely', ?, 'manila-yesterday', 'unlimited', 1, 1, '[9001]', ?)`).run(TICK, yesterday);
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "manila-today", proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite, "manila-today", "we-work-remotely");
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    const ids = distinctFirstPublishIds(sqlite, manilaDateOf(NOW));
    expect(ids).toHaveLength(1);
    expect(ids).not.toContain(9001);
    const measured = readManilaFirstPublish(sqlite, "manila-today");
    expect(measured!.first_publish_count).toBe(ids.length);
  } finally { sqlite.close(); }
});

test("another source's first publish counts in the same Manila day", async () => {
  const sqlite = freshDb();
  try {
    const other = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "remotive", now: NOW, tickKey: TICK, retryKey: "manila-other-source", proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite, "manila-other-source", "remotive");
        return { publishedCount: ids.length, ids };
      },
    });
    expect(other).toMatchObject({ ok: true, publishedCount: 1, replayed: false });
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "manila-with-other", proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite, "manila-with-other", "we-work-remotely");
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    const ids = distinctFirstPublishIds(sqlite, manilaDateOf(NOW));
    expect(ids).toHaveLength(2);
    const measured = readManilaFirstPublish(sqlite, "manila-with-other");
    expect(measured!.first_publish_count).toBe(2);
    expect(measured!.first_publish_count).toBe(ids.length);
    const still = readManilaStillPublic(sqlite, "manila-with-other");
    expect(still).not.toBeNull();
    expect(still!.still_public_count).toBe(ids.length);
  } finally { sqlite.close(); }
});

test("a missing Manila-day table keeps the unlimited receipt and the exposure rows", async () => {
  const sqlite = freshDb();
  try {
    sqlite.exec("DROP TABLE source_publication_manila_day;");
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "manila-missing-table", proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite, "manila-missing-table", "we-work-remotely");
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    expect(readPortfolioMeasurement(sqlite, "manila-missing-table")).not.toBeNull();
    expect(readServingMeasurement(sqlite, "manila-missing-table")).not.toBeNull();
    expect(readBookDivergence(sqlite, "manila-missing-table")).not.toBeNull();
  } finally { sqlite.close(); }
});

function readManilaStillPublic(sqlite: Database, retryKey: string): { first_publish_count: number; still_public_count: number } | null {
  try {
    return sqlite.query(`SELECT first_publish_count, still_public_count
      FROM source_publication_manila_still_public WHERE retry_key = ?`).get(retryKey) as { first_publish_count: number; still_public_count: number } | null;
  } catch (error) {
    if (error instanceof Error && /no such table/i.test(error.message)) return null;
    throw error;
  }
}

test("a withdrawn first publish stays in the Manila-day count and leaves the still-public count", async () => {
  const sqlite = freshDb();
  try {
    const first = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "still-public-a", proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite, "still-public-a", "we-work-remotely");
        return { publishedCount: ids.length, ids };
      },
    });
    expect(first).toMatchObject({ ok: true, publishedCount: 1, replayed: false });
    const withdrawnId = first.ok ? first.ids[0] : 0;
    sqlite.query("UPDATE opportunities SET is_active = 0 WHERE id = ?").run(withdrawnId);
    const second = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "remotive", now: NOW, tickKey: TICK, retryKey: "still-public-b", proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite, "still-public-b", "remotive");
        return { publishedCount: ids.length, ids };
      },
    });
    expect(second).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    const day = readManilaFirstPublish(sqlite, "still-public-b");
    expect(day).not.toBeNull();
    expect(day!.first_publish_count).toBe(2);
    const still = readManilaStillPublic(sqlite, "still-public-b");
    expect(still).not.toBeNull();
    expect(still!.first_publish_count).toBe(day!.first_publish_count);
    expect(still!.still_public_count).toBe(1);
    expect(sqlite.query("SELECT COUNT(*) AS n FROM opportunities WHERE is_active = 0").get()).toEqual({ n: 1 });
  } finally { sqlite.close(); }
});

test("a missing still-public table keeps the Manila-day receipt count", async () => {
  const sqlite = freshDb();
  try {
    sqlite.exec("DROP TABLE source_publication_manila_still_public;");
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "still-public-missing", proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite, "still-public-missing", "we-work-remotely");
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    const day = readManilaFirstPublish(sqlite, "still-public-missing");
    expect(day).not.toBeNull();
    expect(day!.first_publish_count).toBe(1);
    expect(readManilaStillPublic(sqlite, "still-public-missing")).toBeNull();
  } finally { sqlite.close(); }
});

function readManilaOpenSnapshot(sqlite: Database, retryKey: string): { day_state: string; first_publish_count: number; still_public_count: number } | null {
  try {
    return sqlite.query(`SELECT day_state, first_publish_count, still_public_count
      FROM source_publication_manila_open_snapshot WHERE retry_key = ?`).get(retryKey) as { day_state: string; first_publish_count: number; still_public_count: number } | null;
  } catch (error) {
    if (error instanceof Error && /no such table/i.test(error.message)) return null;
    throw error;
  }
}

test("a Manila-day count is stored as an open snapshot", async () => {
  const sqlite = freshDb();
  try {
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "open-snapshot", proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite, "open-snapshot", "we-work-remotely");
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    const day = readManilaFirstPublish(sqlite, "open-snapshot");
    const still = readManilaStillPublic(sqlite, "open-snapshot");
    expect(day).not.toBeNull();
    expect(still).not.toBeNull();
    const open = readManilaOpenSnapshot(sqlite, "open-snapshot");
    expect(open).not.toBeNull();
    expect(open!.day_state).toBe("OPEN");
    expect(open!.first_publish_count).toBe(day!.first_publish_count);
    expect(open!.still_public_count).toBe(still!.still_public_count);
    expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_manila_open_snapshot WHERE day_state = 'CLOSED'").get()).toEqual({ n: 0 });
  } finally { sqlite.close(); }
});

test("a missing open-snapshot table keeps the receipt and still-public counts", async () => {
  const sqlite = freshDb();
  try {
    sqlite.exec("DROP TABLE source_publication_manila_open_snapshot;");
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "open-snapshot-missing", proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite, "open-snapshot-missing", "we-work-remotely");
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    expect(readManilaFirstPublish(sqlite, "open-snapshot-missing")!.first_publish_count).toBe(1);
    expect(readManilaStillPublic(sqlite, "open-snapshot-missing")!.still_public_count).toBe(1);
    expect(readManilaOpenSnapshot(sqlite, "open-snapshot-missing")).toBeNull();
  } finally { sqlite.close(); }
});

test("the day's open count is the latest snapshot, not the sum of snapshot rows", async () => {
  const sqlite = freshDb();
  try {
    const publishOne = async (sourceId: string, retryKey: string) => publishPublicExposure(new BunDb(sqlite), {
      sourceId, now: NOW, tickKey: TICK, retryKey, proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite, retryKey, sourceId);
        return { publishedCount: ids.length, ids };
      },
    });
    const first = await publishOne("we-work-remotely", "snapshot-latest-a");
    expect(first).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    const second = await publishOne("remotive", "snapshot-latest-b");
    expect(second).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    sqlite.query("UPDATE opportunities SET is_active = 0 WHERE source_id IN ('we-work-remotely', 'remotive')").run();
    const third = await publishOne("real-work-from-anywhere", "snapshot-latest-c");
    expect(third).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    const today = manilaDateOf(NOW);
    const otherDate = manilaDateOf(new Date(Date.parse(NOW) - DAY_MS).toISOString());
    expect(otherDate).not.toBe(today);
    const later = new Date(Date.parse(NOW) + 60_000).toISOString();
    sqlite.query(`INSERT INTO source_publication_manila_open_snapshot (
      source_id, tick_key, retry_key, manila_date, day_state, first_publish_count, still_public_count, recorded_at
    ) VALUES ('remotive', ?, 'snapshot-latest-other-day', ?, 'OPEN', 9, 9, ?)`).run(TICK, otherDate, later);
    const rows = sqlite.query(`SELECT id, manila_date, recorded_at, day_state, first_publish_count, still_public_count
      FROM source_publication_manila_open_snapshot`).all() as Array<{
      id: number; manila_date: string; recorded_at: string; day_state: string;
      first_publish_count: number; still_public_count: number;
    }>;
    const todayRows = rows.filter((row) => row.manila_date === today);
    const summedFirst = todayRows.reduce((total, row) => total + row.first_publish_count, 0);
    const summedStill = todayRows.reduce((total, row) => total + row.still_public_count, 0);
    const maxStill = todayRows.reduce((max, row) => Math.max(max, row.still_public_count), 0);
    expect(todayRows).toHaveLength(3);
    expect(summedFirst).toBe(6);
    expect(summedStill).toBe(4);
    expect(maxStill).toBe(2);
    const independent = todayRows
      .filter((row) => row.day_state === "OPEN")
      .sort((left, right) => left.recorded_at < right.recorded_at ? -1 : left.recorded_at > right.recorded_at ? 1 : left.id - right.id)
      .at(-1);
    const ids = distinctFirstPublishIds(sqlite, today);
    expect(ids).toHaveLength(3);
    const latest = latestManilaOpenSnapshot(rows.map((row) => ({
      id: row.id,
      manilaDate: row.manila_date,
      recordedAt: row.recorded_at,
      dayState: row.day_state,
      firstPublishCount: row.first_publish_count,
      stillPublicCount: row.still_public_count,
    })), today);
    expect(latest).not.toBeNull();
    expect(latest!.firstPublishCount).toBe(ids.length);
    expect(latest!.firstPublishCount).toBe(independent!.first_publish_count);
    expect(latest!.firstPublishCount).not.toBe(summedFirst);
    expect(latest!.stillPublicCount).toBe(independent!.still_public_count);
    expect(latest!.stillPublicCount).toBe(1);
    expect(latest!.stillPublicCount).not.toBe(summedStill);
    expect(latest!.stillPublicCount).not.toBe(maxStill);
    expect(latest!.id).toBe(independent!.id);
    expect(latest!.manilaDate).toBe(today);
    expect(latest!.dayState).toBe("OPEN");
  } finally { sqlite.close(); }
});

function readManilaSnapshotIds(sqlite: Database, retryKey: string): { first_publish_ids_json: string; still_public_ids_json: string } | null {
  try {
    return sqlite.query(`SELECT first_publish_ids_json, still_public_ids_json
      FROM source_publication_manila_snapshot_ids WHERE retry_key = ?`).get(retryKey) as { first_publish_ids_json: string; still_public_ids_json: string } | null;
  } catch (error) {
    if (error instanceof Error && /no such table/i.test(error.message)) return null;
    throw error;
  }
}

function stillPublicFirstPublishIds(sqlite: Database, ids: readonly number[]): number[] {
  if (ids.length === 0) return [];
  const marks = ids.map(() => "?").join(", ");
  return (sqlite.query(`SELECT id FROM opportunities
    WHERE is_active = 1 AND ph_eligibility IN (?, ?) AND id IN (${marks})
    ORDER BY id`).all(...PUBLIC_PH_ELIGIBILITIES, ...ids) as Array<{ id: number }>).map((row) => row.id);
}

test("open snapshot counts do not name the day's latest ids", async () => {
  const sqlite = freshDb();
  try {
    const publishOne = async (sourceId: string, retryKey: string) => publishPublicExposure(new BunDb(sqlite), {
      sourceId, now: NOW, tickKey: TICK, retryKey, proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite, retryKey, sourceId);
        return { publishedCount: ids.length, ids };
      },
    });
    const first = await publishOne("we-work-remotely", "snapshot-ids-a");
    expect(first).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    const withdrawnId = first.ok ? first.ids[0] : 0;
    sqlite.query("UPDATE opportunities SET is_active = 0 WHERE id = ?").run(withdrawnId);
    const second = await publishOne("remotive", "snapshot-ids-b");
    expect(second).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    const today = manilaDateOf(NOW);
    const firstIds = distinctFirstPublishIds(sqlite, today);
    const stillIds = stillPublicFirstPublishIds(sqlite, firstIds);
    const earlier = readManilaOpenSnapshot(sqlite, "snapshot-ids-a");
    const latest = readManilaOpenSnapshot(sqlite, "snapshot-ids-b");
    expect(earlier).not.toBeNull();
    expect(latest).not.toBeNull();
    expect(earlier!.still_public_count).toBe(1);
    expect(latest!.still_public_count).toBe(1);
    expect(latest!.first_publish_count).toBe(2);
    expect(firstIds).toEqual([withdrawnId, second.ok ? second.ids[0] : 0].sort((left, right) => left - right));
    expect(stillIds).toEqual(second.ok ? second.ids : []);
    expect(stillIds).not.toContain(withdrawnId);
    const stored = readManilaSnapshotIds(sqlite, "snapshot-ids-b");
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored!.first_publish_ids_json)).toEqual(firstIds);
    expect(JSON.parse(stored!.still_public_ids_json)).toEqual(stillIds);
    const earlierIds = readManilaSnapshotIds(sqlite, "snapshot-ids-a");
    expect(earlierIds).not.toBeNull();
    const unionStill = [...new Set([
      ...(JSON.parse(earlierIds!.still_public_ids_json) as number[]),
      ...(JSON.parse(stored!.still_public_ids_json) as number[]),
    ])].sort((left, right) => left - right);
    expect(unionStill).toEqual(firstIds);
    expect(JSON.parse(stored!.still_public_ids_json)).not.toEqual(unionStill);
    const rows = sqlite.query(`SELECT id, manila_date, recorded_at, day_state, first_publish_count, still_public_count
      FROM source_publication_manila_open_snapshot`).all() as Array<{
      id: number; manila_date: string; recorded_at: string; day_state: string;
      first_publish_count: number; still_public_count: number;
    }>;
    const selected = latestManilaOpenSnapshot(rows.map((row) => ({
      id: row.id,
      manilaDate: row.manila_date,
      recordedAt: row.recorded_at,
      dayState: row.day_state,
      firstPublishCount: row.first_publish_count,
      stillPublicCount: row.still_public_count,
    })), today);
    expect(selected).not.toBeNull();
    expect(selected!.stillPublicCount).toBe(1);
    expect(selected!.firstPublishCount).toBe(firstIds.length);
    const selectedIds = readManilaSnapshotIds(sqlite, "snapshot-ids-b");
    expect(JSON.parse(selectedIds!.still_public_ids_json)).toEqual(stillIds);
    expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_manila_open_snapshot WHERE day_state = 'CLOSED'").get()).toEqual({ n: 0 });
    const otherDate = manilaDateOf(new Date(Date.parse(NOW) - DAY_MS).toISOString());
    expect(otherDate).not.toBe(today);
    const later = new Date(Date.parse(NOW) + 60_000).toISOString();
    sqlite.query(`INSERT INTO source_publication_manila_open_snapshot (
      source_id, tick_key, retry_key, manila_date, day_state, first_publish_count, still_public_count, recorded_at
    ) VALUES ('remotive', ?, 'snapshot-ids-other-day', ?, 'OPEN', 9, 9, ?)`).run(TICK, otherDate, later);
    const afterRows = sqlite.query(`SELECT id, manila_date, recorded_at, day_state, first_publish_count, still_public_count
      FROM source_publication_manila_open_snapshot`).all() as Array<{
      id: number; manila_date: string; recorded_at: string; day_state: string;
      first_publish_count: number; still_public_count: number;
    }>;
    const stillToday = latestManilaOpenSnapshot(afterRows.map((row) => ({
      id: row.id,
      manilaDate: row.manila_date,
      recordedAt: row.recorded_at,
      dayState: row.day_state,
      firstPublishCount: row.first_publish_count,
      stillPublicCount: row.still_public_count,
    })), today);
    expect(stillToday).not.toBeNull();
    expect(stillToday!.manilaDate).toBe(today);
    expect(stillToday!.firstPublishCount).toBe(firstIds.length);
    expect(stillToday!.stillPublicCount).toBe(stillIds.length);
    expect(JSON.parse(readManilaSnapshotIds(sqlite, "snapshot-ids-b")!.still_public_ids_json)).toEqual(stillIds);
  } finally { sqlite.close(); }
});

test("one open snapshot records the same first-publish and still-public ids", async () => {
  const sqlite = freshDb();
  try {
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "snapshot-ids-same", proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite, "snapshot-ids-same", "we-work-remotely");
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    const firstIds = distinctFirstPublishIds(sqlite, manilaDateOf(NOW));
    const stored = readManilaSnapshotIds(sqlite, "snapshot-ids-same");
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored!.first_publish_ids_json)).toEqual(firstIds);
    expect(JSON.parse(stored!.still_public_ids_json)).toEqual(firstIds);
    expect(readManilaOpenSnapshot(sqlite, "snapshot-ids-same")!.still_public_count).toBe(firstIds.length);
  } finally { sqlite.close(); }
});

test("a missing snapshot-id table keeps publication and the open snapshot", async () => {
  const sqlite = freshDb();
  try {
    sqlite.exec("DROP TABLE source_publication_manila_snapshot_ids;");
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "snapshot-ids-missing", proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite, "snapshot-ids-missing", "we-work-remotely");
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    expect(readManilaOpenSnapshot(sqlite, "snapshot-ids-missing")).not.toBeNull();
    expect(readManilaOpenSnapshot(sqlite, "snapshot-ids-missing")!.first_publish_count).toBe(1);
    expect(readManilaSnapshotIds(sqlite, "snapshot-ids-missing")).toBeNull();
  } finally { sqlite.close(); }
});

test("the day's ids are the latest id row, not the union of snapshot rows", async () => {
  const sqlite = freshDb();
  try {
    const publishOne = async (sourceId: string, retryKey: string) => publishPublicExposure(new BunDb(sqlite), {
      sourceId, now: NOW, tickKey: TICK, retryKey, proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite, retryKey, sourceId);
        return { publishedCount: ids.length, ids };
      },
    });
    const first = await publishOne("we-work-remotely", "snapshot-id-latest-a");
    expect(first).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    const withdrawnId = first.ok ? first.ids[0] : 0;
    sqlite.query("UPDATE opportunities SET is_active = 0 WHERE id = ?").run(withdrawnId);
    const second = await publishOne("remotive", "snapshot-id-latest-b");
    expect(second).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    const today = manilaDateOf(NOW);
    const firstIds = distinctFirstPublishIds(sqlite, today);
    const stillIds = stillPublicFirstPublishIds(sqlite, firstIds);
    expect(firstIds).toHaveLength(2);
    expect(stillIds).toEqual(second.ok ? second.ids : []);
    expect(stillIds).not.toContain(withdrawnId);
    const loaded = sqlite.query(`SELECT id, manila_date, recorded_at, first_publish_ids_json, still_public_ids_json
      FROM source_publication_manila_snapshot_ids`).all() as Array<{
      id: number; manila_date: string; recorded_at: string;
      first_publish_ids_json: string; still_public_ids_json: string;
    }>;
    expect(loaded).toHaveLength(2);
    expect(new Set(loaded.map((row) => row.recorded_at)).size).toBe(1);
    const unionStill = [...new Set(loaded.flatMap((row) => JSON.parse(row.still_public_ids_json) as number[]))]
      .sort((left, right) => left - right);
    expect(unionStill).toEqual(firstIds);
    expect(unionStill).not.toEqual(stillIds);
    const otherDate = manilaDateOf(new Date(Date.parse(NOW) - DAY_MS).toISOString());
    expect(otherDate).not.toBe(today);
    const later = new Date(Date.parse(NOW) + 60_000).toISOString();
    sqlite.query(`INSERT INTO source_publication_manila_snapshot_ids (
      source_id, tick_key, retry_key, manila_date, first_publish_ids_json, still_public_ids_json, recorded_at
    ) VALUES ('remotive', ?, 'snapshot-id-latest-other', ?, '[9001]', '[9001]', ?)`).run(TICK, otherDate, later);
    const rows = sqlite.query(`SELECT id, manila_date, recorded_at, first_publish_ids_json, still_public_ids_json
      FROM source_publication_manila_snapshot_ids`).all() as Array<{
      id: number; manila_date: string; recorded_at: string;
      first_publish_ids_json: string; still_public_ids_json: string;
    }>;
    const mapped = rows.map((row) => ({
      id: row.id,
      manilaDate: row.manila_date,
      recordedAt: row.recorded_at,
      firstPublishIds: JSON.parse(row.first_publish_ids_json) as number[],
      stillPublicIds: JSON.parse(row.still_public_ids_json) as number[],
    }));
    const { latestManilaSnapshotIds } = await import("./manila-day");
    expect(typeof latestManilaSnapshotIds).toBe("function");
    const selected = latestManilaSnapshotIds(mapped, today);
    expect(selected).not.toBeNull();
    expect(selected!.stillPublicIds).toEqual(stillIds);
    expect(selected!.firstPublishIds).toEqual(firstIds);
    expect(selected!.stillPublicIds).not.toEqual(unionStill);
    expect(selected!.stillPublicIds).not.toContain(9001);
    expect(selected!.manilaDate).toBe(today);
    const newestToday = mapped
      .filter((row) => row.manilaDate === today)
      .sort((left, right) => left.recordedAt < right.recordedAt ? -1 : left.recordedAt > right.recordedAt ? 1 : left.id - right.id)
      .at(-1);
    expect(selected!.id).toBe(newestToday!.id);
    const invalidNewer = {
      id: selected!.id + 1,
      manilaDate: today,
      recordedAt: later,
      firstPublishIds: firstIds,
      stillPublicIds: [9001],
    };
    const withInvalid = latestManilaSnapshotIds([...mapped, invalidNewer], today);
    expect(withInvalid).not.toBeNull();
    expect(withInvalid!.id).toBe(selected!.id);
    expect(withInvalid!.stillPublicIds).toEqual(stillIds);
  } finally { sqlite.close(); }
});

function loadSnapshotPair(sqlite: Database): {
  counts: Array<{ id: number; manilaDate: string; recordedAt: string; dayState: string; firstPublishCount: number; stillPublicCount: number; retryKey: string }>;
  ids: Array<{ id: number; manilaDate: string; recordedAt: string; firstPublishIds: number[]; stillPublicIds: number[]; retryKey: string }>;
} {
  const counts = (sqlite.query(`SELECT id, retry_key, manila_date, recorded_at, day_state, first_publish_count, still_public_count
    FROM source_publication_manila_open_snapshot`).all() as Array<{
    id: number; retry_key: string; manila_date: string; recorded_at: string; day_state: string;
    first_publish_count: number; still_public_count: number;
  }>).map((row) => ({
    id: row.id,
    retryKey: row.retry_key,
    manilaDate: row.manila_date,
    recordedAt: row.recorded_at,
    dayState: row.day_state,
    firstPublishCount: row.first_publish_count,
    stillPublicCount: row.still_public_count,
  }));
  const ids = (sqlite.query(`SELECT id, retry_key, manila_date, recorded_at, first_publish_ids_json, still_public_ids_json
    FROM source_publication_manila_snapshot_ids`).all() as Array<{
    id: number; retry_key: string; manila_date: string; recorded_at: string;
    first_publish_ids_json: string; still_public_ids_json: string;
  }>).map((row) => ({
    id: row.id,
    retryKey: row.retry_key,
    manilaDate: row.manila_date,
    recordedAt: row.recorded_at,
    firstPublishIds: JSON.parse(row.first_publish_ids_json) as number[],
    stillPublicIds: JSON.parse(row.still_public_ids_json) as number[],
  }));
  return { counts, ids };
}

test("a newer count snapshot without ids does not keep an older id row", async () => {
  const sqlite = freshDb();
  try {
    const publishOne = async (sourceId: string, retryKey: string) => publishPublicExposure(new BunDb(sqlite), {
      sourceId, now: NOW, tickKey: TICK, retryKey, proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite, retryKey, sourceId);
        return { publishedCount: ids.length, ids };
      },
    });
    const first = await publishOne("we-work-remotely", "snapshot-pair-a");
    expect(first).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    const withdrawnId = first.ok ? first.ids[0] : 0;
    sqlite.query("UPDATE opportunities SET is_active = 0 WHERE id = ?").run(withdrawnId);
    const second = await publishOne("remotive", "snapshot-pair-b");
    expect(second).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    const today = manilaDateOf(NOW);
    const olderIds = readManilaSnapshotIds(sqlite, "snapshot-pair-b");
    expect(olderIds).not.toBeNull();
    const later = new Date(Date.parse(NOW) + 60_000).toISOString();
    sqlite.query(`INSERT INTO source_publication_manila_open_snapshot (
      source_id, tick_key, retry_key, manila_date, day_state, first_publish_count, still_public_count, recorded_at
    ) VALUES ('remotive', ?, 'snapshot-pair-newer', ?, 'OPEN', 4, 3, ?)`).run(TICK, today, later);
    expect(readManilaSnapshotIds(sqlite, "snapshot-pair-newer")).toBeNull();
    const loaded = loadSnapshotPair(sqlite);
    const latestCount = latestManilaOpenSnapshot(loaded.counts, today);
    expect(latestCount).not.toBeNull();
    expect(latestCount!.firstPublishCount).toBe(4);
    expect(latestCount!.stillPublicCount).toBe(3);
    const olderStill = JSON.parse(olderIds!.still_public_ids_json) as number[];
    expect(olderStill).not.toContain(withdrawnId);
    expect(olderStill.length).toBeGreaterThan(0);
    const { latestManilaSnapshotPair } = await import("./manila-day");
    expect(typeof latestManilaSnapshotPair).toBe("function");
    const paired = latestManilaSnapshotPair(loaded.counts, loaded.ids, today);
    expect(paired).not.toBeNull();
    expect(paired!.retryKey).toBe("snapshot-pair-newer");
    expect(paired!.idsKnown).toBe(false);
    expect(paired!.stillPublicIds).toEqual([]);
    expect(paired!.firstPublishIds).toEqual([]);
    expect(paired!.stillPublicIds).not.toEqual(olderStill);
  } finally { sqlite.close(); }
});

test("the latest count snapshot keeps its own ids", async () => {
  const sqlite = freshDb();
  try {
    const publishOne = async (sourceId: string, retryKey: string) => publishPublicExposure(new BunDb(sqlite), {
      sourceId, now: NOW, tickKey: TICK, retryKey, proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite, retryKey, sourceId);
        return { publishedCount: ids.length, ids };
      },
    });
    const first = await publishOne("we-work-remotely", "snapshot-pair-own-a");
    expect(first).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    sqlite.query("UPDATE opportunities SET is_active = 0 WHERE id = ?").run(first.ok ? first.ids[0] : 0);
    const second = await publishOne("remotive", "snapshot-pair-own-b");
    expect(second).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    const today = manilaDateOf(NOW);
    const firstIds = distinctFirstPublishIds(sqlite, today);
    const stillIds = stillPublicFirstPublishIds(sqlite, firstIds);
    const loaded = loadSnapshotPair(sqlite);
    const unionStill = [...new Set(loaded.ids.flatMap((row) => row.stillPublicIds))].sort((left, right) => left - right);
    expect(unionStill).toEqual(firstIds);
    expect(unionStill).not.toEqual(stillIds);
    const { latestManilaSnapshotPair } = await import("./manila-day");
    const paired = latestManilaSnapshotPair(loaded.counts, loaded.ids, today);
    expect(paired).not.toBeNull();
    expect(paired!.retryKey).toBe("snapshot-pair-own-b");
    expect(paired!.idsKnown).toBe(true);
    expect(paired!.firstPublishIds).toEqual(firstIds);
    expect(paired!.stillPublicIds).toEqual(stillIds);
    expect(paired!.stillPublicIds).not.toEqual(unionStill);
  } finally { sqlite.close(); }
});

test("an unknown snapshot id pair is not a measured zero", async () => {
  const sqlite = freshDb();
  try {
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "snapshot-unknown-zero", proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite, "snapshot-unknown-zero", "we-work-remotely");
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    const today = manilaDateOf(NOW);
    const knownIds = distinctFirstPublishIds(sqlite, today);
    expect(knownIds).toHaveLength(1);
    const later = new Date(Date.parse(NOW) + 60_000).toISOString();
    sqlite.query(`INSERT INTO source_publication_manila_open_snapshot (
      source_id, tick_key, retry_key, manila_date, day_state, first_publish_count, still_public_count, recorded_at
    ) VALUES ('we-work-remotely', ?, 'snapshot-unknown-zero-newer', ?, 'OPEN', 0, 0, ?)`).run(TICK, today, later);
    expect(readManilaSnapshotIds(sqlite, "snapshot-unknown-zero-newer")).toBeNull();
    const loaded = loadSnapshotPair(sqlite);
    const { latestManilaSnapshotPair, reportableManilaSnapshotIdCount } = await import("./manila-day");
    const paired = latestManilaSnapshotPair(loaded.counts, loaded.ids, today);
    expect(paired).not.toBeNull();
    expect(paired!.idsKnown).toBe(false);
    expect(paired!.firstPublishIds).toEqual([]);
    expect(paired!.retryKey).toBe("snapshot-unknown-zero-newer");
    expect(typeof reportableManilaSnapshotIdCount).toBe("function");
    const reported = reportableManilaSnapshotIdCount(paired);
    expect(reported).toBeNull();
    expect(reported).not.toBe(0);
    expect(reported).not.toBe(paired!.firstPublishIds.length);
    const knownLoaded = loadSnapshotPair(sqlite);
    knownLoaded.counts = knownLoaded.counts.filter((row) => row.retryKey !== "snapshot-unknown-zero-newer");
    const known = latestManilaSnapshotPair(knownLoaded.counts, knownLoaded.ids, today);
    expect(reportableManilaSnapshotIdCount(known)).toBe(knownIds.length);
  } finally { sqlite.close(); }
});

test("an open snapshot count is not a completed Manila-day flow", async () => {
  const sqlite = freshDb();
  try {
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "open-not-flow", proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite, "open-not-flow", "we-work-remotely");
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    const today = manilaDateOf(NOW);
    const loaded = loadSnapshotPair(sqlite);
    const { latestManilaSnapshotPair, reportableManilaSnapshotIdCount, completedManilaDayFlowCount } = await import("./manila-day");
    const reported = reportableManilaSnapshotIdCount(latestManilaSnapshotPair(loaded.counts, loaded.ids, today));
    expect(reported).toBe(1);
    const open = readManilaOpenSnapshot(sqlite, "open-not-flow");
    expect(open).not.toBeNull();
    expect(open!.day_state).toBe("OPEN");
    expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_manila_open_snapshot WHERE day_state = 'CLOSED'").get()).toEqual({ n: 0 });
    expect(typeof completedManilaDayFlowCount).toBe("function");
    const completed = completedManilaDayFlowCount(open!.day_state, reported);
    expect(completed).toBeNull();
    expect(completed).not.toBe(reported);
    expect(completed).not.toBe(0);
    expect(completedManilaDayFlowCount("CLOSED", reported)).toBeNull();
  } finally { sqlite.close(); }
});

test("a snapshot count that disagrees with its known ids stays absent", async () => {
  const sqlite = freshDb();
  try {
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "count-id-agree", proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite, "count-id-agree", "we-work-remotely");
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    const today = manilaDateOf(NOW);
    const agreedLoaded = loadSnapshotPair(sqlite);
    const { latestManilaSnapshotPair, reportableManilaSnapshotIdCount, agreedManilaSnapshotIdCount } = await import("./manila-day");
    const agreedPair = latestManilaSnapshotPair(agreedLoaded.counts, agreedLoaded.ids, today);
    expect(agreedPair).not.toBeNull();
    expect(agreedPair!.idsKnown).toBe(true);
    expect(agreedPair!.retryKey).toBe("count-id-agree");
    const agreedCount = agreedLoaded.counts.find((row) => row.retryKey === agreedPair!.retryKey);
    expect(agreedCount).toBeDefined();
    expect(agreedCount!.firstPublishCount).toBe(agreedPair!.firstPublishIds.length);
    expect(reportableManilaSnapshotIdCount(agreedPair)).toBe(agreedCount!.firstPublishCount);
    const later = new Date(Date.parse(NOW) + 60_000).toISOString();
    sqlite.query(`INSERT INTO source_publication_manila_open_snapshot (
      source_id, tick_key, retry_key, manila_date, day_state, first_publish_count, still_public_count, recorded_at
    ) VALUES ('we-work-remotely', ?, 'count-id-disagree', ?, 'OPEN', 4, 1, ?)`).run(TICK, today, later);
    sqlite.query(`INSERT INTO source_publication_manila_snapshot_ids (
      source_id, tick_key, retry_key, manila_date, first_publish_ids_json, still_public_ids_json, recorded_at
    ) VALUES ('we-work-remotely', ?, 'count-id-disagree', ?, '[9001]', '[9001]', ?)`).run(TICK, today, later);
    const loaded = loadSnapshotPair(sqlite);
    const latestCount = latestManilaOpenSnapshot(loaded.counts, today);
    expect(latestCount).not.toBeNull();
    expect(latestCount!.firstPublishCount).toBe(4);
    const paired = latestManilaSnapshotPair(loaded.counts, loaded.ids, today);
    expect(paired).not.toBeNull();
    expect(paired!.retryKey).toBe("count-id-disagree");
    expect(paired!.idsKnown).toBe(true);
    expect(paired!.firstPublishIds).toEqual([9001]);
    expect(paired!.firstPublishIds).not.toEqual(agreedPair!.firstPublishIds);
    const reported = reportableManilaSnapshotIdCount(paired);
    expect(reported).toBe(paired!.firstPublishIds.length);
    expect(reported).toBe(1);
    expect(reported).not.toBe(latestCount!.firstPublishCount);
    expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_manila_open_snapshot WHERE day_state = 'CLOSED'").get()).toEqual({ n: 0 });
    expect(typeof agreedManilaSnapshotIdCount).toBe("function");
    const disagreed = agreedManilaSnapshotIdCount(latestCount!.firstPublishCount, paired);
    expect(disagreed).toBeNull();
    expect(disagreed).not.toBe(reported);
    expect(disagreed).not.toBe(latestCount!.firstPublishCount);
    expect(disagreed).not.toBe(agreedCount!.firstPublishCount);
    expect(agreedManilaSnapshotIdCount(agreedCount!.firstPublishCount, agreedPair)).toBe(agreedCount!.firstPublishCount);
    const unknownAt = new Date(Date.parse(NOW) + 120_000).toISOString();
    sqlite.query(`INSERT INTO source_publication_manila_open_snapshot (
      source_id, tick_key, retry_key, manila_date, day_state, first_publish_count, still_public_count, recorded_at
    ) VALUES ('we-work-remotely', ?, 'count-id-unknown', ?, 'OPEN', 0, 0, ?)`).run(TICK, today, unknownAt);
    expect(readManilaSnapshotIds(sqlite, "count-id-unknown")).toBeNull();
    const unknownLoaded = loadSnapshotPair(sqlite);
    const unknownPair = latestManilaSnapshotPair(unknownLoaded.counts, unknownLoaded.ids, today);
    expect(unknownPair).not.toBeNull();
    expect(unknownPair!.idsKnown).toBe(false);
    expect(unknownPair!.firstPublishIds).toEqual([]);
    const unknownCount = unknownLoaded.counts.find((row) => row.retryKey === unknownPair!.retryKey);
    expect(unknownCount).toBeDefined();
    expect(unknownCount!.firstPublishCount).toBe(0);
    const unknownAgreed = agreedManilaSnapshotIdCount(unknownCount!.firstPublishCount, unknownPair);
    expect(unknownAgreed).toBeNull();
    expect(unknownAgreed).not.toBe(0);
    expect(unknownAgreed).not.toBe(unknownPair!.firstPublishIds.length);
  } finally { sqlite.close(); }
});

test("a repeated snapshot id does not agree with its raw length", async () => {
  const sqlite = freshDb();
  try {
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "duplicate-ids-agree", proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite, "duplicate-ids-agree", "we-work-remotely");
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    const today = manilaDateOf(NOW);
    const distinctLoaded = loadSnapshotPair(sqlite);
    const { latestManilaSnapshotPair, agreedManilaSnapshotIdCount, distinctAgreedManilaSnapshotIdCount } = await import("./manila-day");
    const distinctPair = latestManilaSnapshotPair(distinctLoaded.counts, distinctLoaded.ids, today);
    expect(distinctPair).not.toBeNull();
    expect(distinctPair!.idsKnown).toBe(true);
    expect(new Set(distinctPair!.firstPublishIds).size).toBe(distinctPair!.firstPublishIds.length);
    const distinctCount = distinctLoaded.counts.find((row) => row.retryKey === distinctPair!.retryKey);
    expect(distinctCount).toBeDefined();
    expect(agreedManilaSnapshotIdCount(distinctCount!.firstPublishCount, distinctPair)).toBe(distinctCount!.firstPublishCount);
    const later = new Date(Date.parse(NOW) + 60_000).toISOString();
    sqlite.query(`INSERT INTO source_publication_manila_open_snapshot (
      source_id, tick_key, retry_key, manila_date, day_state, first_publish_count, still_public_count, recorded_at
    ) VALUES ('we-work-remotely', ?, 'duplicate-ids-repeat', ?, 'OPEN', 2, 1, ?)`).run(TICK, today, later);
    sqlite.query(`INSERT INTO source_publication_manila_snapshot_ids (
      source_id, tick_key, retry_key, manila_date, first_publish_ids_json, still_public_ids_json, recorded_at
    ) VALUES ('we-work-remotely', ?, 'duplicate-ids-repeat', ?, '[9001,9001]', '[9001]', ?)`).run(TICK, today, later);
    const loaded = loadSnapshotPair(sqlite);
    const latestCount = latestManilaOpenSnapshot(loaded.counts, today);
    expect(latestCount).not.toBeNull();
    expect(latestCount!.firstPublishCount).toBe(2);
    const paired = latestManilaSnapshotPair(loaded.counts, loaded.ids, today);
    expect(paired).not.toBeNull();
    expect(paired!.retryKey).toBe("duplicate-ids-repeat");
    expect(paired!.idsKnown).toBe(true);
    expect(paired!.firstPublishIds).toEqual([9001, 9001]);
    expect(new Set(paired!.firstPublishIds).size).toBe(1);
    expect(new Set(paired!.firstPublishIds).size).not.toBe(paired!.firstPublishIds.length);
    const rawAgreed = agreedManilaSnapshotIdCount(latestCount!.firstPublishCount, paired);
    expect(rawAgreed).toBe(paired!.firstPublishIds.length);
    expect(rawAgreed).toBe(2);
    expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_manila_open_snapshot WHERE day_state = 'CLOSED'").get()).toEqual({ n: 0 });
    expect(typeof distinctAgreedManilaSnapshotIdCount).toBe("function");
    const distinctAgreed = distinctAgreedManilaSnapshotIdCount(latestCount!.firstPublishCount, paired);
    expect(distinctAgreed).toBeNull();
    expect(distinctAgreed).not.toBe(rawAgreed);
    expect(distinctAgreed).not.toBe(new Set(paired!.firstPublishIds).size);
    expect(distinctAgreed).not.toBe(distinctCount!.firstPublishCount);
    expect(distinctAgreedManilaSnapshotIdCount(distinctCount!.firstPublishCount, distinctPair)).toBe(distinctCount!.firstPublishCount);
  } finally { sqlite.close(); }
});

test("agreed snapshot ids that are not the ledger ids stay absent", async () => {
  const sqlite = freshDb();
  try {
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "ledger-id-match", proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite, "ledger-id-match", "we-work-remotely");
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    const today = manilaDateOf(NOW);
    const ledgerIds = distinctFirstPublishIds(sqlite, today);
    expect(ledgerIds).toHaveLength(1);
    const matchedLoaded = loadSnapshotPair(sqlite);
    const { latestManilaSnapshotPair, distinctAgreedManilaSnapshotIdCount, ledgerMatchedManilaSnapshotIdCount } = await import("./manila-day");
    const matchedPair = latestManilaSnapshotPair(matchedLoaded.counts, matchedLoaded.ids, today);
    expect(matchedPair).not.toBeNull();
    expect(matchedPair!.idsKnown).toBe(true);
    expect(matchedPair!.firstPublishIds).toEqual(ledgerIds);
    const matchedCount = matchedLoaded.counts.find((row) => row.retryKey === matchedPair!.retryKey);
    expect(matchedCount).toBeDefined();
    expect(distinctAgreedManilaSnapshotIdCount(matchedCount!.firstPublishCount, matchedPair)).toBe(ledgerIds.length);
    const later = new Date(Date.parse(NOW) + 60_000).toISOString();
    sqlite.query(`INSERT INTO source_publication_manila_open_snapshot (
      source_id, tick_key, retry_key, manila_date, day_state, first_publish_count, still_public_count, recorded_at
    ) VALUES ('we-work-remotely', ?, 'ledger-id-foreign', ?, 'OPEN', 1, 1, ?)`).run(TICK, today, later);
    sqlite.query(`INSERT INTO source_publication_manila_snapshot_ids (
      source_id, tick_key, retry_key, manila_date, first_publish_ids_json, still_public_ids_json, recorded_at
    ) VALUES ('we-work-remotely', ?, 'ledger-id-foreign', ?, '[9001]', '[9001]', ?)`).run(TICK, today, later);
    const loaded = loadSnapshotPair(sqlite);
    const latestCount = latestManilaOpenSnapshot(loaded.counts, today);
    expect(latestCount).not.toBeNull();
    expect(latestCount!.firstPublishCount).toBe(1);
    const paired = latestManilaSnapshotPair(loaded.counts, loaded.ids, today);
    expect(paired).not.toBeNull();
    expect(paired!.retryKey).toBe("ledger-id-foreign");
    expect(paired!.idsKnown).toBe(true);
    expect(paired!.firstPublishIds).toEqual([9001]);
    expect(paired!.firstPublishIds).not.toEqual(ledgerIds);
    const foreignAgreed = distinctAgreedManilaSnapshotIdCount(latestCount!.firstPublishCount, paired);
    expect(foreignAgreed).toBe(1);
    expect(foreignAgreed).toBe(ledgerIds.length);
    expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_manila_open_snapshot WHERE day_state = 'CLOSED'").get()).toEqual({ n: 0 });
    expect(typeof ledgerMatchedManilaSnapshotIdCount).toBe("function");
    const matched = ledgerMatchedManilaSnapshotIdCount(latestCount!.firstPublishCount, paired, ledgerIds);
    expect(matched).toBeNull();
    expect(matched).not.toBe(foreignAgreed);
    expect(matched).not.toBe(ledgerIds.length);
    expect(ledgerMatchedManilaSnapshotIdCount(matchedCount!.firstPublishCount, matchedPair, ledgerIds)).toBe(ledgerIds.length);
  } finally { sqlite.close(); }
});

test("a still-public count that disagrees with its known ids stays absent", async () => {
  const sqlite = freshDb();
  try {
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "still-public-agree", proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite, "still-public-agree", "we-work-remotely");
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    const realId = result.ok ? result.ids[0] : 0;
    expect(realId).toBeGreaterThan(0);
    const today = manilaDateOf(NOW);
    const agreedLoaded = loadSnapshotPair(sqlite);
    const { latestManilaSnapshotPair, agreedManilaStillPublicCount } = await import("./manila-day");
    const agreedPair = latestManilaSnapshotPair(agreedLoaded.counts, agreedLoaded.ids, today);
    expect(agreedPair).not.toBeNull();
    expect(agreedPair!.idsKnown).toBe(true);
    const agreedCount = agreedLoaded.counts.find((row) => row.retryKey === agreedPair!.retryKey);
    expect(agreedCount).toBeDefined();
    expect(agreedCount!.stillPublicCount).toBe(agreedPair!.stillPublicIds.length);
    expect(agreedPair!.stillPublicIds).toEqual([realId]);
    const later = new Date(Date.parse(NOW) + 60_000).toISOString();
    sqlite.query(`INSERT INTO source_publication_manila_open_snapshot (
      source_id, tick_key, retry_key, manila_date, day_state, first_publish_count, still_public_count, recorded_at
    ) VALUES ('we-work-remotely', ?, 'still-public-disagree', ?, 'OPEN', 1, 0, ?)`).run(TICK, today, later);
    sqlite.query(`INSERT INTO source_publication_manila_snapshot_ids (
      source_id, tick_key, retry_key, manila_date, first_publish_ids_json, still_public_ids_json, recorded_at
    ) VALUES ('we-work-remotely', ?, 'still-public-disagree', ?, ?, ?, ?)`).run(TICK, today, JSON.stringify([realId]), JSON.stringify([realId]), later);
    const loaded = loadSnapshotPair(sqlite);
    const latestCount = latestManilaOpenSnapshot(loaded.counts, today);
    expect(latestCount).not.toBeNull();
    expect(latestCount!.stillPublicCount).toBe(0);
    expect(latestCount!.firstPublishCount).toBe(1);
    const paired = latestManilaSnapshotPair(loaded.counts, loaded.ids, today);
    expect(paired).not.toBeNull();
    expect(paired!.retryKey).toBe("still-public-disagree");
    expect(paired!.idsKnown).toBe(true);
    expect(paired!.stillPublicIds).toEqual([realId]);
    expect(paired!.stillPublicIds.length).not.toBe(latestCount!.stillPublicCount);
    expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_manila_open_snapshot WHERE day_state = 'CLOSED'").get()).toEqual({ n: 0 });
    expect(typeof agreedManilaStillPublicCount).toBe("function");
    const disagreed = agreedManilaStillPublicCount(latestCount!.stillPublicCount, paired);
    expect(disagreed).toBeNull();
    expect(disagreed).not.toBe(latestCount!.stillPublicCount);
    expect(disagreed).not.toBe(paired!.stillPublicIds.length);
    expect(agreedManilaStillPublicCount(agreedCount!.stillPublicCount, agreedPair)).toBe(agreedCount!.stillPublicCount);
  } finally { sqlite.close(); }
});

test("a ledger-matched count is not a completed Manila-day flow", async () => {
  const sqlite = freshDb();
  try {
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "ledger-match-not-flow", proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite, "ledger-match-not-flow", "we-work-remotely");
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    const today = manilaDateOf(NOW);
    const ledgerIds = distinctFirstPublishIds(sqlite, today);
    const loaded = loadSnapshotPair(sqlite);
    const { latestManilaSnapshotPair, ledgerMatchedManilaSnapshotIdCount, ledgerMatchedManilaDayFlowCount } = await import("./manila-day");
    const paired = latestManilaSnapshotPair(loaded.counts, loaded.ids, today);
    expect(paired).not.toBeNull();
    expect(paired!.firstPublishIds).toEqual(ledgerIds);
    const snapshot = loaded.counts.find((row) => row.retryKey === paired!.retryKey);
    expect(snapshot).toBeDefined();
    const matched = ledgerMatchedManilaSnapshotIdCount(snapshot!.firstPublishCount, paired, ledgerIds);
    expect(matched).toBe(ledgerIds.length);
    expect(matched).toBe(1);
    const open = readManilaOpenSnapshot(sqlite, "ledger-match-not-flow");
    expect(open).not.toBeNull();
    expect(open!.day_state).toBe("OPEN");
    expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_manila_open_snapshot WHERE day_state = 'CLOSED'").get()).toEqual({ n: 0 });
    expect(typeof ledgerMatchedManilaDayFlowCount).toBe("function");
    const completed = ledgerMatchedManilaDayFlowCount(open!.day_state, matched);
    expect(completed).toBeNull();
    expect(completed).not.toBe(matched);
    expect(completed).not.toBe(0);
    expect(ledgerMatchedManilaDayFlowCount("CLOSED", matched)).toBeNull();
    expect(ledgerMatchedManilaDayFlowCount("OPEN", 100)).toBeNull();
    expect(ledgerMatchedManilaDayFlowCount("OPEN", 150)).toBeNull();
  } finally { sqlite.close(); }
});

test("still-public ids that are not the serving rows stay absent", async () => {
  const sqlite = freshDb();
  try {
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "still-public-serving", proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite, "still-public-serving", "we-work-remotely");
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    const realId = result.ok ? result.ids[0] : 0;
    expect(realId).toBeGreaterThan(0);
    const today = manilaDateOf(NOW);
    const servingIds = stillPublicFirstPublishIds(sqlite, [realId]);
    expect(servingIds).toEqual([realId]);
    const agreedLoaded = loadSnapshotPair(sqlite);
    const { latestManilaSnapshotPair, agreedManilaStillPublicCount, servingMatchedManilaStillPublicCount } = await import("./manila-day");
    const agreedPair = latestManilaSnapshotPair(agreedLoaded.counts, agreedLoaded.ids, today);
    expect(agreedPair).not.toBeNull();
    expect(agreedPair!.stillPublicIds).toEqual(servingIds);
    const agreedCount = agreedLoaded.counts.find((row) => row.retryKey === agreedPair!.retryKey);
    expect(agreedCount).toBeDefined();
    expect(agreedManilaStillPublicCount(agreedCount!.stillPublicCount, agreedPair)).toBe(servingIds.length);
    const later = new Date(Date.parse(NOW) + 60_000).toISOString();
    sqlite.query(`INSERT INTO source_publication_manila_open_snapshot (
      source_id, tick_key, retry_key, manila_date, day_state, first_publish_count, still_public_count, recorded_at
    ) VALUES ('we-work-remotely', ?, 'still-public-not-serving', ?, 'OPEN', 1, 0, ?)`).run(TICK, today, later);
    sqlite.query(`INSERT INTO source_publication_manila_snapshot_ids (
      source_id, tick_key, retry_key, manila_date, first_publish_ids_json, still_public_ids_json, recorded_at
    ) VALUES ('we-work-remotely', ?, 'still-public-not-serving', ?, ?, '[]', ?)`).run(TICK, today, JSON.stringify([realId]), later);
    const loaded = loadSnapshotPair(sqlite);
    const latestCount = latestManilaOpenSnapshot(loaded.counts, today);
    expect(latestCount).not.toBeNull();
    expect(latestCount!.stillPublicCount).toBe(0);
    const paired = latestManilaSnapshotPair(loaded.counts, loaded.ids, today);
    expect(paired).not.toBeNull();
    expect(paired!.retryKey).toBe("still-public-not-serving");
    expect(paired!.idsKnown).toBe(true);
    expect(paired!.stillPublicIds).toEqual([]);
    expect(paired!.stillPublicIds).not.toEqual(servingIds);
    const agreed = agreedManilaStillPublicCount(latestCount!.stillPublicCount, paired);
    expect(agreed).toBe(0);
    expect(agreed).toBe(paired!.stillPublicIds.length);
    expect(agreed).not.toBe(servingIds.length);
    expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_manila_open_snapshot WHERE day_state = 'CLOSED'").get()).toEqual({ n: 0 });
    expect(typeof servingMatchedManilaStillPublicCount).toBe("function");
    const matched = servingMatchedManilaStillPublicCount(latestCount!.stillPublicCount, paired, servingIds);
    expect(matched).toBeNull();
    expect(matched).not.toBe(agreed);
    expect(matched).not.toBe(servingIds.length);
    expect(servingMatchedManilaStillPublicCount(agreedCount!.stillPublicCount, agreedPair, servingIds)).toBe(servingIds.length);
  } finally { sqlite.close(); }
});

test("a serving-matched count is not a completed Manila-day flow", async () => {
  const sqlite = freshDb();
  try {
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "serving-match-not-flow", proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite, "serving-match-not-flow", "we-work-remotely");
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    const realId = result.ok ? result.ids[0] : 0;
    expect(realId).toBeGreaterThan(0);
    const today = manilaDateOf(NOW);
    const servingIds = stillPublicFirstPublishIds(sqlite, [realId]);
    expect(servingIds).toEqual([realId]);
    const loaded = loadSnapshotPair(sqlite);
    const { latestManilaSnapshotPair, servingMatchedManilaStillPublicCount, servingMatchedManilaDayFlowCount } = await import("./manila-day");
    const paired = latestManilaSnapshotPair(loaded.counts, loaded.ids, today);
    expect(paired).not.toBeNull();
    expect(paired!.stillPublicIds).toEqual(servingIds);
    const snapshot = loaded.counts.find((row) => row.retryKey === paired!.retryKey);
    expect(snapshot).toBeDefined();
    const matched = servingMatchedManilaStillPublicCount(snapshot!.stillPublicCount, paired, servingIds);
    expect(matched).toBe(servingIds.length);
    expect(matched).toBe(1);
    const open = readManilaOpenSnapshot(sqlite, "serving-match-not-flow");
    expect(open).not.toBeNull();
    expect(open!.day_state).toBe("OPEN");
    expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_manila_open_snapshot WHERE day_state = 'CLOSED'").get()).toEqual({ n: 0 });
    expect(typeof servingMatchedManilaDayFlowCount).toBe("function");
    const completed = servingMatchedManilaDayFlowCount(open!.day_state, matched);
    expect(completed).toBeNull();
    expect(completed).not.toBe(matched);
    expect(completed).not.toBe(0);
    expect(servingMatchedManilaDayFlowCount("CLOSED", matched)).toBeNull();
    expect(servingMatchedManilaDayFlowCount("OPEN", 100)).toBeNull();
    expect(servingMatchedManilaDayFlowCount("OPEN", 150)).toBeNull();
  } finally { sqlite.close(); }
});

test("a serving-matched id that is no longer remote stays absent", async () => {
  const sqlite = freshDb();
  try {
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "still-public-remote", proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite, "still-public-remote", "we-work-remotely");
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    const realId = result.ok ? result.ids[0] : 0;
    expect(realId).toBeGreaterThan(0);
    expect(sqlite.query("SELECT location_type FROM opportunities WHERE id = ?").get(realId)).toEqual({ location_type: "remote" });
    const today = manilaDateOf(NOW);
    const servingIds = stillPublicFirstPublishIds(sqlite, [realId]);
    expect(servingIds).toEqual([realId]);
    const loaded = loadSnapshotPair(sqlite);
    const { latestManilaSnapshotPair, servingMatchedManilaStillPublicCount, remoteMatchedManilaStillPublicCount } = await import("./manila-day");
    const paired = latestManilaSnapshotPair(loaded.counts, loaded.ids, today);
    expect(paired).not.toBeNull();
    expect(paired!.stillPublicIds).toEqual(servingIds);
    const snapshot = loaded.counts.find((row) => row.retryKey === paired!.retryKey);
    expect(snapshot).toBeDefined();
    const matched = servingMatchedManilaStillPublicCount(snapshot!.stillPublicCount, paired, servingIds);
    expect(matched).toBe(1);
    sqlite.query("UPDATE opportunities SET location_type = 'onsite' WHERE id = ?").run(realId);
    expect(sqlite.query("SELECT location_type FROM opportunities WHERE id = ?").get(realId)).toEqual({ location_type: "onsite" });
    const looseIds = stillPublicFirstPublishIds(sqlite, [realId]);
    expect(looseIds).toEqual([realId]);
    const remoteIds = (sqlite.query("SELECT id FROM opportunities WHERE id = ? AND location_type = 'remote'").all(realId) as Array<{ id: number }>).map((row) => row.id);
    expect(remoteIds).toEqual([]);
    const stillMatched = servingMatchedManilaStillPublicCount(snapshot!.stillPublicCount, paired, looseIds);
    expect(stillMatched).toBe(1);
    expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_manila_open_snapshot WHERE day_state = 'CLOSED'").get()).toEqual({ n: 0 });
    expect(typeof remoteMatchedManilaStillPublicCount).toBe("function");
    const remoteMatched = remoteMatchedManilaStillPublicCount(snapshot!.stillPublicCount, paired, looseIds, remoteIds);
    expect(remoteMatched).toBeNull();
    expect(remoteMatched).not.toBe(stillMatched);
    expect(remoteMatched).not.toBe(0);
    expect(remoteMatchedManilaStillPublicCount(snapshot!.stillPublicCount, paired, servingIds, servingIds)).toBe(servingIds.length);
  } finally { sqlite.close(); }
});

test("a remote still-public id outside the posting window stays absent", async () => {
  const sqlite = freshDb();
  try {
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "still-public-fresh", proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite, "still-public-fresh", "we-work-remotely");
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    const realId = result.ok ? result.ids[0] : 0;
    expect(realId).toBeGreaterThan(0);
    const posted = () => (sqlite.query("SELECT posted_at AS postedAt FROM opportunities WHERE id = ?").get(realId) as { postedAt: string | null }).postedAt;
    expect(assessPostingFreshness(posted(), NOW).state).toBe("WITHIN_WINDOW");
    const today = manilaDateOf(NOW);
    const remoteIds = () => (sqlite.query("SELECT id FROM opportunities WHERE id = ? AND location_type = 'remote' AND is_active = 1").all(realId) as Array<{ id: number }>).map((row) => row.id);
    expect(remoteIds()).toEqual([realId]);
    const loaded = loadSnapshotPair(sqlite);
    const { latestManilaSnapshotPair, remoteMatchedManilaStillPublicCount, freshMatchedManilaStillPublicCount } = await import("./manila-day");
    const paired = latestManilaSnapshotPair(loaded.counts, loaded.ids, today);
    expect(paired).not.toBeNull();
    expect(paired!.stillPublicIds).toEqual([realId]);
    const snapshot = loaded.counts.find((row) => row.retryKey === paired!.retryKey);
    expect(snapshot).toBeDefined();
    expect(remoteMatchedManilaStillPublicCount(snapshot!.stillPublicCount, paired, remoteIds(), remoteIds())).toBe(1);
    sqlite.query("UPDATE opportunities SET posted_at = ? WHERE id = ?").run(STALE_POSTED_AT, realId);
    expect(assessPostingFreshness(posted(), NOW).state).toBe("STALE");
    expect(remoteIds()).toEqual([realId]);
    expect(remoteMatchedManilaStillPublicCount(snapshot!.stillPublicCount, paired, remoteIds(), remoteIds())).toBe(1);
    const staleFreshIds = assessPostingFreshness(posted(), NOW).state === "WITHIN_WINDOW" ? [realId] : [];
    expect(staleFreshIds).toEqual([]);
    sqlite.query("UPDATE opportunities SET posted_at = NULL WHERE id = ?").run(realId);
    expect(assessPostingFreshness(posted(), NOW).state).toBe("UNKNOWN");
    expect(remoteIds()).toEqual([realId]);
    expect(remoteMatchedManilaStillPublicCount(snapshot!.stillPublicCount, paired, remoteIds(), remoteIds())).toBe(1);
    const unknownFreshIds = assessPostingFreshness(posted(), NOW).state === "WITHIN_WINDOW" ? [realId] : [];
    expect(unknownFreshIds).toEqual([]);
    expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_manila_open_snapshot WHERE day_state = 'CLOSED'").get()).toEqual({ n: 0 });
    expect(typeof freshMatchedManilaStillPublicCount).toBe("function");
    const staleMatched = freshMatchedManilaStillPublicCount(snapshot!.stillPublicCount, paired, remoteIds(), staleFreshIds);
    expect(staleMatched).toBeNull();
    expect(staleMatched).not.toBe(1);
    expect(staleMatched).not.toBe(0);
    const unknownMatched = freshMatchedManilaStillPublicCount(snapshot!.stillPublicCount, paired, remoteIds(), unknownFreshIds);
    expect(unknownMatched).toBeNull();
    expect(unknownMatched).not.toBe(1);
    expect(freshMatchedManilaStillPublicCount(snapshot!.stillPublicCount, paired, [realId], [realId])).toBe(1);
  } finally { sqlite.close(); }
});

test("a fresh remote id with no resolvable apply URL stays absent", async () => {
  const sqlite = freshDb();
  try {
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "still-public-apply", proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite, "still-public-apply", "we-work-remotely");
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    const realId = result.ok ? result.ids[0] : 0;
    expect(realId).toBeGreaterThan(0);
    const urls = () => sqlite.query("SELECT source_url AS sourceUrl, application_url AS applicationUrl FROM opportunities WHERE id = ?").get(realId) as { sourceUrl: string | null; applicationUrl: string | null };
    expect(resolvePublicationOutboundUrl(urls().sourceUrl, urls().applicationUrl)).not.toBeNull();
    const today = manilaDateOf(NOW);
    const loaded = loadSnapshotPair(sqlite);
    const { latestManilaSnapshotPair, freshMatchedManilaStillPublicCount, applyMatchedManilaStillPublicCount } = await import("./manila-day");
    const paired = latestManilaSnapshotPair(loaded.counts, loaded.ids, today);
    expect(paired).not.toBeNull();
    expect(paired!.stillPublicIds).toEqual([realId]);
    const snapshot = loaded.counts.find((row) => row.retryKey === paired!.retryKey);
    expect(snapshot).toBeDefined();
    const postedAt = (sqlite.query("SELECT posted_at AS postedAt FROM opportunities WHERE id = ?").get(realId) as { postedAt: string | null }).postedAt;
    expect(assessPostingFreshness(postedAt, NOW).state).toBe("WITHIN_WINDOW");
    expect(freshMatchedManilaStillPublicCount(snapshot!.stillPublicCount, paired, [realId], [realId])).toBe(1);
    sqlite.query("UPDATE opportunities SET source_url = ?, application_url = ? WHERE id = ?").run("http://127.0.0.1/job", "http://127.0.0.1/job", realId);
    const broken = urls();
    expect(resolvePublicationOutboundUrl(broken.sourceUrl, broken.applicationUrl)).toBeNull();
    expect(assessPostingFreshness(postedAt, NOW).state).toBe("WITHIN_WINDOW");
    expect(freshMatchedManilaStillPublicCount(snapshot!.stillPublicCount, paired, [realId], [realId])).toBe(1);
    const applyIds = resolvePublicationOutboundUrl(broken.sourceUrl, broken.applicationUrl) ? [realId] : [];
    expect(applyIds).toEqual([]);
    expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_manila_open_snapshot WHERE day_state = 'CLOSED'").get()).toEqual({ n: 0 });
    expect(typeof applyMatchedManilaStillPublicCount).toBe("function");
    const matched = applyMatchedManilaStillPublicCount(snapshot!.stillPublicCount, paired, [realId], applyIds);
    expect(matched).toBeNull();
    expect(matched).not.toBe(1);
    expect(matched).not.toBe(0);
    expect(applyMatchedManilaStillPublicCount(snapshot!.stillPublicCount, paired, [realId], [realId])).toBe(1);
  } finally { sqlite.close(); }
});

test("a fresh remote id that leaves the PH pair stays absent", async () => {
  const sqlite = freshDb();
  try {
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "still-public-ph", proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite, "still-public-ph", "we-work-remotely");
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    const realId = result.ok ? result.ids[0] : 0;
    expect(realId).toBeGreaterThan(0);
    const eligibility = () => (sqlite.query("SELECT ph_eligibility AS ph FROM opportunities WHERE id = ?").get(realId) as { ph: string | null }).ph;
    expect(isPublicPhEligibility(eligibility())).toBe(true);
    expect(stillPublicFirstPublishIds(sqlite, [realId])).toEqual([realId]);
    const today = manilaDateOf(NOW);
    const loaded = loadSnapshotPair(sqlite);
    const { latestManilaSnapshotPair, applyMatchedManilaStillPublicCount, phMatchedManilaStillPublicCount } = await import("./manila-day");
    const paired = latestManilaSnapshotPair(loaded.counts, loaded.ids, today);
    expect(paired).not.toBeNull();
    expect(paired!.stillPublicIds).toEqual([realId]);
    const snapshot = loaded.counts.find((row) => row.retryKey === paired!.retryKey);
    expect(snapshot).toBeDefined();
    expect(applyMatchedManilaStillPublicCount(snapshot!.stillPublicCount, paired, [realId], [realId])).toBe(1);
    sqlite.query("UPDATE opportunities SET ph_eligibility = 'ineligible' WHERE id = ?").run(realId);
    expect(isPublicPhEligibility(eligibility())).toBe(false);
    expect(stillPublicFirstPublishIds(sqlite, [realId])).toEqual([]);
    expect(applyMatchedManilaStillPublicCount(snapshot!.stillPublicCount, paired, [realId], [realId])).toBe(1);
    const phIds = stillPublicFirstPublishIds(sqlite, [realId]);
    expect(phIds).toEqual([]);
    expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_manila_open_snapshot WHERE day_state = 'CLOSED'").get()).toEqual({ n: 0 });
    expect(typeof phMatchedManilaStillPublicCount).toBe("function");
    const matched = phMatchedManilaStillPublicCount(snapshot!.stillPublicCount, paired, [realId], phIds);
    expect(matched).toBeNull();
    expect(matched).not.toBe(1);
    expect(matched).not.toBe(0);
    expect(phMatchedManilaStillPublicCount(snapshot!.stillPublicCount, paired, [realId], [realId])).toBe(1);
  } finally { sqlite.close(); }
});

test("a PH-matched count is not a completed Manila-day flow", async () => {
  const sqlite = freshDb();
  try {
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "ph-match-not-flow", proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite, "ph-match-not-flow", "we-work-remotely");
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    const realId = result.ok ? result.ids[0] : 0;
    expect(realId).toBeGreaterThan(0);
    const today = manilaDateOf(NOW);
    const phIds = stillPublicFirstPublishIds(sqlite, [realId]);
    expect(phIds).toEqual([realId]);
    expect(isPublicPhEligibility((sqlite.query("SELECT ph_eligibility AS ph FROM opportunities WHERE id = ?").get(realId) as { ph: string | null }).ph)).toBe(true);
    const loaded = loadSnapshotPair(sqlite);
    const { latestManilaSnapshotPair, phMatchedManilaStillPublicCount, phMatchedManilaDayFlowCount } = await import("./manila-day");
    const paired = latestManilaSnapshotPair(loaded.counts, loaded.ids, today);
    expect(paired).not.toBeNull();
    expect(paired!.stillPublicIds).toEqual(phIds);
    const snapshot = loaded.counts.find((row) => row.retryKey === paired!.retryKey);
    expect(snapshot).toBeDefined();
    const matched = phMatchedManilaStillPublicCount(snapshot!.stillPublicCount, paired, phIds, phIds);
    expect(matched).toBe(phIds.length);
    expect(matched).toBe(1);
    const open = readManilaOpenSnapshot(sqlite, "ph-match-not-flow");
    expect(open).not.toBeNull();
    expect(open!.day_state).toBe("OPEN");
    expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_manila_open_snapshot WHERE day_state = 'CLOSED'").get()).toEqual({ n: 0 });
    expect(typeof phMatchedManilaDayFlowCount).toBe("function");
    const completed = phMatchedManilaDayFlowCount(open!.day_state, matched);
    expect(completed).toBeNull();
    expect(completed).not.toBe(matched);
    expect(completed).not.toBe(0);
    expect(phMatchedManilaDayFlowCount("CLOSED", matched)).toBeNull();
    expect(phMatchedManilaDayFlowCount("OPEN", 100)).toBeNull();
    expect(phMatchedManilaDayFlowCount("OPEN", 150)).toBeNull();
  } finally { sqlite.close(); }
});

test("two still-public ids that share a canonical source URL stay absent", async () => {
  const sqlite = freshDb();
  try {
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "canonical-url", proposedCount: 2,
      persist: async () => {
        const ids = [
          ...writeOpportunity(sqlite, "canonical-url-a", "we-work-remotely"),
          ...writeOpportunity(sqlite, "canonical-url-b", "we-work-remotely"),
        ];
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 2, replayed: false });
    const ids = result.ok ? [...result.ids].sort((left, right) => left - right) : [];
    expect(ids).toHaveLength(2);
    const today = manilaDateOf(NOW);
    const phIds = stillPublicFirstPublishIds(sqlite, ids);
    expect(phIds).toEqual(ids);
    const loaded = loadSnapshotPair(sqlite);
    const { latestManilaSnapshotPair, phMatchedManilaStillPublicCount, canonicalUrlMatchedManilaStillPublicCount } = await import("./manila-day");
    const paired = latestManilaSnapshotPair(loaded.counts, loaded.ids, today);
    expect(paired).not.toBeNull();
    expect([...paired!.stillPublicIds].sort((left, right) => left - right)).toEqual(ids);
    const snapshot = loaded.counts.find((row) => row.retryKey === paired!.retryKey);
    expect(snapshot).toBeDefined();
    expect(phMatchedManilaStillPublicCount(snapshot!.stillPublicCount, paired, phIds, phIds)).toBe(2);
    const secondId = ids[1]!;
    sqlite.query("UPDATE opportunities SET source_url = ? WHERE id = ?").run("https://Example.invalid/canonical-url-a", secondId);
    const rows = sqlite.query("SELECT id, source_url AS sourceUrl FROM opportunities WHERE id IN (?, ?) ORDER BY id")
      .all(ids[0], secondId) as Array<{ id: number; sourceUrl: string }>;
    expect(rows).toHaveLength(2);
    const canonical = rows.map((row) => canonicalizeSourceUrl(row.sourceUrl));
    expect(new Set(canonical).size).toBe(1);
    expect(canonical[0]).toBe("https://example.invalid/canonical-url-a");
    expect(phMatchedManilaStillPublicCount(snapshot!.stillPublicCount, paired, phIds, phIds)).toBe(2);
    expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_manila_open_snapshot WHERE day_state = 'CLOSED'").get()).toEqual({ n: 0 });
    expect(typeof canonicalUrlMatchedManilaStillPublicCount).toBe("function");
    const matched = canonicalUrlMatchedManilaStillPublicCount(snapshot!.stillPublicCount, paired, phIds, rows);
    expect(matched).toBeNull();
    expect(matched).not.toBe(2);
    expect(matched).not.toBe(1);
    expect(matched).not.toBe(0);
    expect(canonicalUrlMatchedManilaStillPublicCount(snapshot!.stillPublicCount, paired, phIds, rows.slice(0, 1))).toBeNull();
    sqlite.query("UPDATE opportunities SET source_url = ? WHERE id = ?").run("https://example.invalid/canonical-url-b", secondId);
    const distinct = sqlite.query("SELECT id, source_url AS sourceUrl FROM opportunities WHERE id IN (?, ?) ORDER BY id")
      .all(ids[0], secondId) as Array<{ id: number; sourceUrl: string }>;
    expect(new Set(distinct.map((row) => canonicalizeSourceUrl(row.sourceUrl))).size).toBe(2);
    expect(canonicalUrlMatchedManilaStillPublicCount(snapshot!.stillPublicCount, paired, phIds, distinct)).toBe(2);
  } finally { sqlite.close(); }
});

test("a canonical-URL match is not a completed Manila-day flow", async () => {
  const sqlite = freshDb();
  try {
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "canonical-url-not-flow", proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite, "canonical-url-not-flow", "we-work-remotely");
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    const realId = result.ok ? result.ids[0] : 0;
    expect(realId).toBeGreaterThan(0);
    const today = manilaDateOf(NOW);
    const phIds = stillPublicFirstPublishIds(sqlite, [realId]);
    expect(phIds).toEqual([realId]);
    const loaded = loadSnapshotPair(sqlite);
    const { latestManilaSnapshotPair, canonicalUrlMatchedManilaStillPublicCount, canonicalUrlMatchedManilaDayFlowCount } = await import("./manila-day");
    const paired = latestManilaSnapshotPair(loaded.counts, loaded.ids, today);
    expect(paired).not.toBeNull();
    expect(paired!.stillPublicIds).toEqual(phIds);
    const snapshot = loaded.counts.find((row) => row.retryKey === paired!.retryKey);
    expect(snapshot).toBeDefined();
    const rows = sqlite.query("SELECT id, source_url AS sourceUrl FROM opportunities WHERE id = ?")
      .all(realId) as Array<{ id: number; sourceUrl: string }>;
    expect(rows).toEqual([{ id: realId, sourceUrl: "https://example.invalid/canonical-url-not-flow" }]);
    expect(canonicalizeSourceUrl(rows[0]!.sourceUrl)).toBe(rows[0]!.sourceUrl);
    const matched = canonicalUrlMatchedManilaStillPublicCount(snapshot!.stillPublicCount, paired, phIds, rows);
    expect(matched).toBe(1);
    const open = readManilaOpenSnapshot(sqlite, "canonical-url-not-flow");
    expect(open).not.toBeNull();
    expect(open!.day_state).toBe("OPEN");
    expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_manila_open_snapshot WHERE day_state = 'CLOSED'").get()).toEqual({ n: 0 });
    expect(typeof canonicalUrlMatchedManilaDayFlowCount).toBe("function");
    const completed = canonicalUrlMatchedManilaDayFlowCount(open!.day_state, matched);
    expect(completed).toBeNull();
    expect(completed).not.toBe(matched);
    expect(completed).not.toBe(0);
    expect(canonicalUrlMatchedManilaDayFlowCount("CLOSED", matched)).toBeNull();
    expect(canonicalUrlMatchedManilaDayFlowCount("OPEN", 100)).toBeNull();
    expect(canonicalUrlMatchedManilaDayFlowCount("OPEN", 150)).toBeNull();
  } finally { sqlite.close(); }
});

test("a canonical-URL id that leaves the publishing source stays absent", async () => {
  const sqlite = freshDb();
  try {
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "publishing-source", proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite, "publishing-source", "we-work-remotely");
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    const realId = result.ok ? result.ids[0] : 0;
    expect(realId).toBeGreaterThan(0);
    const today = manilaDateOf(NOW);
    const phIds = stillPublicFirstPublishIds(sqlite, [realId]);
    expect(phIds).toEqual([realId]);
    const loaded = loadSnapshotPair(sqlite);
    const { latestManilaSnapshotPair, canonicalUrlMatchedManilaStillPublicCount, sourceMatchedManilaStillPublicCount } = await import("./manila-day");
    const paired = latestManilaSnapshotPair(loaded.counts, loaded.ids, today);
    expect(paired).not.toBeNull();
    expect(paired!.stillPublicIds).toEqual(phIds);
    const snapshot = loaded.counts.find((row) => row.retryKey === paired!.retryKey);
    expect(snapshot).toBeDefined();
    const urlRows = () => sqlite.query("SELECT id, source_url AS sourceUrl FROM opportunities WHERE id = ?")
      .all(realId) as Array<{ id: number; sourceUrl: string }>;
    const ownedRows = () => sqlite.query("SELECT id, source_id AS sourceId FROM opportunities WHERE id = ?")
      .all(realId) as Array<{ id: number; sourceId: string }>;
    expect(canonicalUrlMatchedManilaStillPublicCount(snapshot!.stillPublicCount, paired, phIds, urlRows())).toBe(1);
    expect(ownedRows()).toEqual([{ id: realId, sourceId: "we-work-remotely" }]);
    sqlite.query("UPDATE opportunities SET source_id = 'remotive' WHERE id = ?").run(realId);
    expect(ownedRows()).toEqual([{ id: realId, sourceId: "remotive" }]);
    expect(canonicalUrlMatchedManilaStillPublicCount(snapshot!.stillPublicCount, paired, phIds, urlRows())).toBe(1);
    expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_manila_open_snapshot WHERE day_state = 'CLOSED'").get()).toEqual({ n: 0 });
    expect(typeof sourceMatchedManilaStillPublicCount).toBe("function");
    const matched = sourceMatchedManilaStillPublicCount(snapshot!.stillPublicCount, paired, urlRows(), ownedRows(), "we-work-remotely");
    expect(matched).toBeNull();
    expect(matched).not.toBe(1);
    expect(matched).not.toBe(0);
    expect(sourceMatchedManilaStillPublicCount(snapshot!.stillPublicCount, paired, urlRows(), [], "we-work-remotely")).toBeNull();
    sqlite.query("UPDATE opportunities SET source_id = 'we-work-remotely' WHERE id = ?").run(realId);
    expect(sourceMatchedManilaStillPublicCount(snapshot!.stillPublicCount, paired, urlRows(), ownedRows(), "we-work-remotely")).toBe(1);
    expect(sourceMatchedManilaStillPublicCount(snapshot!.stillPublicCount, paired, urlRows(), ownedRows(), "")).toBeNull();
  } finally { sqlite.close(); }
});

test("a source-matched count is not a completed Manila-day flow", async () => {
  const sqlite = freshDb();
  try {
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "source-match-not-flow", proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite, "source-match-not-flow", "we-work-remotely");
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    const realId = result.ok ? result.ids[0] : 0;
    expect(realId).toBeGreaterThan(0);
    const today = manilaDateOf(NOW);
    const loaded = loadSnapshotPair(sqlite);
    const { latestManilaSnapshotPair, sourceMatchedManilaStillPublicCount, sourceMatchedManilaDayFlowCount } = await import("./manila-day");
    const paired = latestManilaSnapshotPair(loaded.counts, loaded.ids, today);
    expect(paired).not.toBeNull();
    expect(paired!.stillPublicIds).toEqual([realId]);
    const snapshot = loaded.counts.find((row) => row.retryKey === paired!.retryKey);
    expect(snapshot).toBeDefined();
    const urlRows = sqlite.query("SELECT id, source_url AS sourceUrl FROM opportunities WHERE id = ?")
      .all(realId) as Array<{ id: number; sourceUrl: string }>;
    const ownedRows = sqlite.query("SELECT id, source_id AS sourceId FROM opportunities WHERE id = ?")
      .all(realId) as Array<{ id: number; sourceId: string }>;
    expect(ownedRows).toEqual([{ id: realId, sourceId: "we-work-remotely" }]);
    const matched = sourceMatchedManilaStillPublicCount(snapshot!.stillPublicCount, paired, urlRows, ownedRows, "we-work-remotely");
    expect(matched).toBe(1);
    const open = readManilaOpenSnapshot(sqlite, "source-match-not-flow");
    expect(open).not.toBeNull();
    expect(open!.day_state).toBe("OPEN");
    expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_manila_open_snapshot WHERE day_state = 'CLOSED'").get()).toEqual({ n: 0 });
    expect(typeof sourceMatchedManilaDayFlowCount).toBe("function");
    const completed = sourceMatchedManilaDayFlowCount(open!.day_state, matched);
    expect(completed).toBeNull();
    expect(completed).not.toBe(matched);
    expect(completed).not.toBe(0);
    expect(sourceMatchedManilaDayFlowCount("CLOSED", matched)).toBeNull();
    expect(sourceMatchedManilaDayFlowCount("OPEN", 100)).toBeNull();
    expect(sourceMatchedManilaDayFlowCount("OPEN", 150)).toBeNull();
  } finally { sqlite.close(); }
});

test("a source-matched id that leaves the active set stays absent", async () => {
  const sqlite = freshDb();
  try {
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "still-public-active", proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite, "still-public-active", "we-work-remotely");
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    const realId = result.ok ? result.ids[0] : 0;
    expect(realId).toBeGreaterThan(0);
    const today = manilaDateOf(NOW);
    const loaded = loadSnapshotPair(sqlite);
    const { latestManilaSnapshotPair, sourceMatchedManilaStillPublicCount, activeMatchedManilaStillPublicCount } = await import("./manila-day");
    const paired = latestManilaSnapshotPair(loaded.counts, loaded.ids, today);
    expect(paired).not.toBeNull();
    expect(paired!.stillPublicIds).toEqual([realId]);
    const snapshot = loaded.counts.find((row) => row.retryKey === paired!.retryKey);
    expect(snapshot).toBeDefined();
    const urlRows = sqlite.query("SELECT id, source_url AS sourceUrl FROM opportunities WHERE id = ?")
      .all(realId) as Array<{ id: number; sourceUrl: string }>;
    const ownedRows = sqlite.query("SELECT id, source_id AS sourceId FROM opportunities WHERE id = ?")
      .all(realId) as Array<{ id: number; sourceId: string }>;
    expect(sourceMatchedManilaStillPublicCount(snapshot!.stillPublicCount, paired, urlRows, ownedRows, "we-work-remotely")).toBe(1);
    expect(stillPublicFirstPublishIds(sqlite, [realId])).toEqual([realId]);
    sqlite.query("UPDATE opportunities SET is_active = 0 WHERE id = ?").run(realId);
    expect(stillPublicFirstPublishIds(sqlite, [realId])).toEqual([]);
    expect(sourceMatchedManilaStillPublicCount(snapshot!.stillPublicCount, paired, urlRows, ownedRows, "we-work-remotely")).toBe(1);
    expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_manila_open_snapshot WHERE day_state = 'CLOSED'").get()).toEqual({ n: 0 });
    expect(typeof activeMatchedManilaStillPublicCount).toBe("function");
    const activeIds = stillPublicFirstPublishIds(sqlite, [realId]);
    const matched = activeMatchedManilaStillPublicCount(snapshot!.stillPublicCount, paired, urlRows, ownedRows, "we-work-remotely", activeIds);
    expect(matched).toBeNull();
    expect(matched).not.toBe(1);
    expect(matched).not.toBe(0);
    sqlite.query("UPDATE opportunities SET is_active = 1 WHERE id = ?").run(realId);
    expect(activeMatchedManilaStillPublicCount(snapshot!.stillPublicCount, paired, urlRows, ownedRows, "we-work-remotely", stillPublicFirstPublishIds(sqlite, [realId]))).toBe(1);
  } finally { sqlite.close(); }
});

test("an active-matched count is not a completed Manila-day flow", async () => {
  const sqlite = freshDb();
  try {
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "active-match-not-flow", proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite, "active-match-not-flow", "we-work-remotely");
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    const realId = result.ok ? result.ids[0] : 0;
    expect(realId).toBeGreaterThan(0);
    const today = manilaDateOf(NOW);
    const loaded = loadSnapshotPair(sqlite);
    const { latestManilaSnapshotPair, activeMatchedManilaStillPublicCount, activeMatchedManilaDayFlowCount } = await import("./manila-day");
    const paired = latestManilaSnapshotPair(loaded.counts, loaded.ids, today);
    expect(paired).not.toBeNull();
    expect(paired!.stillPublicIds).toEqual([realId]);
    const snapshot = loaded.counts.find((row) => row.retryKey === paired!.retryKey);
    expect(snapshot).toBeDefined();
    const urlRows = sqlite.query("SELECT id, source_url AS sourceUrl FROM opportunities WHERE id = ?")
      .all(realId) as Array<{ id: number; sourceUrl: string }>;
    const ownedRows = sqlite.query("SELECT id, source_id AS sourceId FROM opportunities WHERE id = ?")
      .all(realId) as Array<{ id: number; sourceId: string }>;
    const activeIds = stillPublicFirstPublishIds(sqlite, [realId]);
    expect(activeIds).toEqual([realId]);
    const matched = activeMatchedManilaStillPublicCount(snapshot!.stillPublicCount, paired, urlRows, ownedRows, "we-work-remotely", activeIds);
    expect(matched).toBe(1);
    const open = readManilaOpenSnapshot(sqlite, "active-match-not-flow");
    expect(open).not.toBeNull();
    expect(open!.day_state).toBe("OPEN");
    expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_manila_open_snapshot WHERE day_state = 'CLOSED'").get()).toEqual({ n: 0 });
    expect(typeof activeMatchedManilaDayFlowCount).toBe("function");
    const completed = activeMatchedManilaDayFlowCount(open!.day_state, matched);
    expect(completed).toBeNull();
    expect(completed).not.toBe(matched);
    expect(completed).not.toBe(0);
    expect(activeMatchedManilaDayFlowCount("CLOSED", matched)).toBeNull();
    expect(activeMatchedManilaDayFlowCount("OPEN", 100)).toBeNull();
    expect(activeMatchedManilaDayFlowCount("OPEN", 150)).toBeNull();
  } finally { sqlite.close(); }
});

test("an apply-matched count is not a completed Manila-day flow", async () => {
  const sqlite = freshDb();
  try {
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "apply-match-not-flow", proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite, "apply-match-not-flow", "we-work-remotely");
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    const realId = result.ok ? result.ids[0] : 0;
    expect(realId).toBeGreaterThan(0);
    const urls = sqlite.query("SELECT source_url AS sourceUrl, application_url AS applicationUrl FROM opportunities WHERE id = ?")
      .get(realId) as { sourceUrl: string | null; applicationUrl: string | null };
    expect(resolvePublicationOutboundUrl(urls.sourceUrl, urls.applicationUrl)).not.toBeNull();
    const postedAt = (sqlite.query("SELECT posted_at AS postedAt FROM opportunities WHERE id = ?").get(realId) as { postedAt: string | null }).postedAt;
    expect(assessPostingFreshness(postedAt, NOW).state).toBe("WITHIN_WINDOW");
    const today = manilaDateOf(NOW);
    const loaded = loadSnapshotPair(sqlite);
    const { latestManilaSnapshotPair, applyMatchedManilaStillPublicCount, applyMatchedManilaDayFlowCount } = await import("./manila-day");
    const paired = latestManilaSnapshotPair(loaded.counts, loaded.ids, today);
    expect(paired).not.toBeNull();
    expect(paired!.stillPublicIds).toEqual([realId]);
    const snapshot = loaded.counts.find((row) => row.retryKey === paired!.retryKey);
    expect(snapshot).toBeDefined();
    const applyIds = resolvePublicationOutboundUrl(urls.sourceUrl, urls.applicationUrl) ? [realId] : [];
    expect(applyIds).toEqual([realId]);
    const matched = applyMatchedManilaStillPublicCount(snapshot!.stillPublicCount, paired, applyIds, applyIds);
    expect(matched).toBe(1);
    const open = readManilaOpenSnapshot(sqlite, "apply-match-not-flow");
    expect(open).not.toBeNull();
    expect(open!.day_state).toBe("OPEN");
    expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_manila_open_snapshot WHERE day_state = 'CLOSED'").get()).toEqual({ n: 0 });
    expect(typeof applyMatchedManilaDayFlowCount).toBe("function");
    const completed = applyMatchedManilaDayFlowCount(open!.day_state, matched);
    expect(completed).toBeNull();
    expect(completed).not.toBe(matched);
    expect(completed).not.toBe(0);
    expect(applyMatchedManilaDayFlowCount("CLOSED", matched)).toBeNull();
    expect(applyMatchedManilaDayFlowCount("OPEN", 100)).toBeNull();
    expect(applyMatchedManilaDayFlowCount("OPEN", 150)).toBeNull();
  } finally { sqlite.close(); }
});

test("a fresh-matched count is not a completed Manila-day flow", async () => {
  const sqlite = freshDb();
  try {
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "fresh-match-not-flow", proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite, "fresh-match-not-flow", "we-work-remotely");
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    const realId = result.ok ? result.ids[0] : 0;
    expect(realId).toBeGreaterThan(0);
    const row = sqlite.query("SELECT posted_at AS postedAt, location_type AS locationType FROM opportunities WHERE id = ?")
      .get(realId) as { postedAt: string | null; locationType: string | null };
    expect(assessPostingFreshness(row.postedAt, NOW).state).toBe("WITHIN_WINDOW");
    expect(row.locationType).toBe("remote");
    const today = manilaDateOf(NOW);
    const loaded = loadSnapshotPair(sqlite);
    const { latestManilaSnapshotPair, freshMatchedManilaStillPublicCount, freshMatchedManilaDayFlowCount } = await import("./manila-day");
    const paired = latestManilaSnapshotPair(loaded.counts, loaded.ids, today);
    expect(paired).not.toBeNull();
    expect(paired!.stillPublicIds).toEqual([realId]);
    const snapshot = loaded.counts.find((row) => row.retryKey === paired!.retryKey);
    expect(snapshot).toBeDefined();
    const freshIds = assessPostingFreshness(row.postedAt, NOW).state === "WITHIN_WINDOW" ? [realId] : [];
    expect(freshIds).toEqual([realId]);
    const matched = freshMatchedManilaStillPublicCount(snapshot!.stillPublicCount, paired, freshIds, freshIds);
    expect(matched).toBe(1);
    const open = readManilaOpenSnapshot(sqlite, "fresh-match-not-flow");
    expect(open).not.toBeNull();
    expect(open!.day_state).toBe("OPEN");
    expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_manila_open_snapshot WHERE day_state = 'CLOSED'").get()).toEqual({ n: 0 });
    expect(typeof freshMatchedManilaDayFlowCount).toBe("function");
    const completed = freshMatchedManilaDayFlowCount(open!.day_state, matched);
    expect(completed).toBeNull();
    expect(completed).not.toBe(matched);
    expect(completed).not.toBe(0);
    expect(freshMatchedManilaDayFlowCount("CLOSED", matched)).toBeNull();
    expect(freshMatchedManilaDayFlowCount("OPEN", 100)).toBeNull();
    expect(freshMatchedManilaDayFlowCount("OPEN", 150)).toBeNull();
  } finally { sqlite.close(); }
});

test("a remote-matched count is not a completed Manila-day flow", async () => {
  const sqlite = freshDb();
  try {
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "remote-match-not-flow", proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite, "remote-match-not-flow", "we-work-remotely");
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    const realId = result.ok ? result.ids[0] : 0;
    expect(realId).toBeGreaterThan(0);
    const locationType = (sqlite.query("SELECT location_type AS locationType FROM opportunities WHERE id = ?").get(realId) as { locationType: string | null }).locationType;
    expect(locationType).toBe("remote");
    const today = manilaDateOf(NOW);
    const loaded = loadSnapshotPair(sqlite);
    const { latestManilaSnapshotPair, remoteMatchedManilaStillPublicCount, remoteMatchedManilaDayFlowCount } = await import("./manila-day");
    const paired = latestManilaSnapshotPair(loaded.counts, loaded.ids, today);
    expect(paired).not.toBeNull();
    expect(paired!.stillPublicIds).toEqual([realId]);
    const snapshot = loaded.counts.find((row) => row.retryKey === paired!.retryKey);
    expect(snapshot).toBeDefined();
    const remoteIds = locationType === "remote" ? [realId] : [];
    expect(remoteIds).toEqual([realId]);
    const matched = remoteMatchedManilaStillPublicCount(snapshot!.stillPublicCount, paired, remoteIds, remoteIds);
    expect(matched).toBe(1);
    const open = readManilaOpenSnapshot(sqlite, "remote-match-not-flow");
    expect(open).not.toBeNull();
    expect(open!.day_state).toBe("OPEN");
    expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_manila_open_snapshot WHERE day_state = 'CLOSED'").get()).toEqual({ n: 0 });
    expect(typeof remoteMatchedManilaDayFlowCount).toBe("function");
    const completed = remoteMatchedManilaDayFlowCount(open!.day_state, matched);
    expect(completed).toBeNull();
    expect(completed).not.toBe(matched);
    expect(completed).not.toBe(0);
    expect(remoteMatchedManilaDayFlowCount("CLOSED", matched)).toBeNull();
    expect(remoteMatchedManilaDayFlowCount("OPEN", 100)).toBeNull();
    expect(remoteMatchedManilaDayFlowCount("OPEN", 150)).toBeNull();
  } finally { sqlite.close(); }
});

test("a one-source remote match is not a portfolio pass", async () => {
  const sqlite = freshDb();
  try {
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "remote-match-not-portfolio", proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite, "remote-match-not-portfolio", "we-work-remotely");
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    const realId = result.ok ? result.ids[0] : 0;
    expect(realId).toBeGreaterThan(0);
    const locationType = (sqlite.query("SELECT location_type AS locationType FROM opportunities WHERE id = ?").get(realId) as { locationType: string | null }).locationType;
    expect(locationType).toBe("remote");
    const today = manilaDateOf(NOW);
    const loaded = loadSnapshotPair(sqlite);
    const { latestManilaSnapshotPair, remoteMatchedManilaStillPublicCount, remoteMatchedManilaPortfolioStatus } = await import("./manila-day");
    const paired = latestManilaSnapshotPair(loaded.counts, loaded.ids, today);
    expect(paired).not.toBeNull();
    expect(paired!.stillPublicIds).toEqual([realId]);
    const snapshot = loaded.counts.find((row) => row.retryKey === paired!.retryKey);
    expect(snapshot).toBeDefined();
    const remoteIds = locationType === "remote" ? [realId] : [];
    const matched = remoteMatchedManilaStillPublicCount(snapshot!.stillPublicCount, paired, remoteIds, remoteIds);
    expect(matched).toBe(1);
    const oneSource = concentrationReport([{ id: "we-work-remotely", count: matched! }], TOP_SOURCE_SHARE_MAX);
    expect(oneSource.status).toBe("BREACH");
    expect(oneSource.status).not.toBe("OK");
    expect(oneSource.topShare).toBe(1);
    const empty = concentrationReport([], TOP_SOURCE_SHARE_MAX);
    expect(empty.status).toBe("UNKNOWN");
    expect(empty.status).not.toBe("OK");
    expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_manila_open_snapshot WHERE day_state = 'CLOSED'").get()).toEqual({ n: 0 });
    expect(typeof remoteMatchedManilaPortfolioStatus).toBe("function");
    const status = remoteMatchedManilaPortfolioStatus(matched, [{ sourceId: "we-work-remotely", count: matched! }]);
    expect(status).toBe("BREACH");
    expect(status).not.toBe("OK");
    expect(remoteMatchedManilaPortfolioStatus(matched, [])).toBeNull();
    expect(remoteMatchedManilaPortfolioStatus(null, [])).toBe("UNKNOWN");
    const balanced = [
      { sourceId: "we-work-remotely", count: 1 },
      { sourceId: "remotive", count: 1 },
      { sourceId: "real-work-from-anywhere", count: 1 },
      { sourceId: "remote-ok", count: 1 },
    ];
    expect(remoteMatchedManilaPortfolioStatus(4, balanced)).toBe("OK");
  } finally { sqlite.close(); }
});

test("a source-share OK book is not a provider-family pass", async () => {
  const sqlite = freshDb();
  try {
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "source-ok-not-family", proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite, "source-ok-not-family", "we-work-remotely");
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    const folded = [
      { sourceId: "jobicy:admin", count: 1 },
      { sourceId: "jobicy:support", count: 1 },
      { sourceId: "we-work-remotely", count: 1 },
      { sourceId: "remotive", count: 1 },
    ];
    const source = concentrationReport(folded.map((row) => ({ id: row.sourceId, count: row.count })), TOP_SOURCE_SHARE_MAX);
    expect(source.status).toBe("OK");
    expect(source.topShare).toBe(0.25);
    const family = concentrationReport(familyShares(folded), TOP_PROVIDER_FAMILY_SHARE_MAX);
    expect(family.status).toBe("BREACH");
    expect(family.status).not.toBe("OK");
    expect(family.topId).toBe("jobicy");
    expect(family.topShare).toBe(0.5);
    const unprefixed = [
      { sourceId: "jobicy-admin-support-apac", count: 1 },
      { sourceId: "jobicy-supporting-apac", count: 1 },
      { sourceId: "we-work-remotely", count: 1 },
      { sourceId: "remotive", count: 1 },
    ];
    const unprefixedFamily = concentrationReport(familyShares(unprefixed), TOP_PROVIDER_FAMILY_SHARE_MAX);
    expect(unprefixedFamily.status).toBe("OK");
    expect(unprefixedFamily.topId).not.toBe("jobicy");
    expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_manila_open_snapshot WHERE day_state = 'CLOSED'").get()).toEqual({ n: 0 });
    const { remoteMatchedManilaFamilyStatus } = await import("./manila-day");
    expect(typeof remoteMatchedManilaFamilyStatus).toBe("function");
    const status = remoteMatchedManilaFamilyStatus(4, folded);
    expect(status).toBe("BREACH");
    expect(status).not.toBe("OK");
    expect(remoteMatchedManilaFamilyStatus(4, unprefixed)).toBe("OK");
    expect(remoteMatchedManilaFamilyStatus(null, [])).toBe("UNKNOWN");
  } finally { sqlite.close(); }
});

test("a family breach is not a completed Manila-day flow", async () => {
  const sqlite = freshDb();
  try {
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "family-breach-not-flow", proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite, "family-breach-not-flow", "we-work-remotely");
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    const folded = [
      { sourceId: "jobicy:admin", count: 1 },
      { sourceId: "jobicy:support", count: 1 },
      { sourceId: "we-work-remotely", count: 1 },
      { sourceId: "remotive", count: 1 },
    ];
    const source = concentrationReport(folded.map((row) => ({ id: row.sourceId, count: row.count })), TOP_SOURCE_SHARE_MAX);
    expect(source.status).toBe("OK");
    expect(source.topShare).toBe(0.25);
    const { remoteMatchedManilaFamilyStatus, remoteMatchedManilaFamilyDayFlowCount } = await import("./manila-day");
    const status = remoteMatchedManilaFamilyStatus(4, folded);
    expect(status).toBe("BREACH");
    expect(status).not.toBe("OK");
    const open = readManilaOpenSnapshot(sqlite, "family-breach-not-flow");
    expect(open).not.toBeNull();
    expect(open!.day_state).toBe("OPEN");
    expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_manila_open_snapshot WHERE day_state = 'CLOSED'").get()).toEqual({ n: 0 });
    expect(typeof remoteMatchedManilaFamilyDayFlowCount).toBe("function");
    const completed = remoteMatchedManilaFamilyDayFlowCount(open!.day_state, status, 4);
    expect(completed).toBeNull();
    expect(completed).not.toBe(4);
    expect(completed).not.toBe(0);
    expect(remoteMatchedManilaFamilyDayFlowCount("CLOSED", status, 4)).toBeNull();
    expect(remoteMatchedManilaFamilyDayFlowCount("OPEN", status, 100)).toBeNull();
    expect(remoteMatchedManilaFamilyDayFlowCount("OPEN", status, 150)).toBeNull();
  } finally { sqlite.close(); }
});

test("a foreign source book is not the published family status", async () => {
  const sqlite = freshDb();
  try {
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "foreign-book-not-family", proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite, "foreign-book-not-family", "we-work-remotely");
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    const realId = result.ok ? result.ids[0] : 0;
    expect(realId).toBeGreaterThan(0);
    const sourceId = (sqlite.query("SELECT source_id AS sourceId FROM opportunities WHERE id = ?").get(realId) as { sourceId: string }).sourceId;
    expect(sourceId).toBe("we-work-remotely");
    const open = readManilaOpenSnapshot(sqlite, "foreign-book-not-family");
    expect(open).not.toBeNull();
    expect(open!.day_state).toBe("OPEN");
    expect(open!.still_public_count).toBe(1);
    expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_manila_open_snapshot WHERE day_state = 'CLOSED'").get()).toEqual({ n: 0 });
    const published = [{ sourceId, count: open!.still_public_count }];
    const folded = [
      { sourceId: "jobicy:admin", count: 1 },
      { sourceId: "jobicy:support", count: 1 },
      { sourceId: "we-work-remotely", count: 1 },
      { sourceId: "remotive", count: 1 },
    ];
    const { remoteMatchedManilaFamilyStatus, publishedManilaFamilyStatus } = await import("./manila-day");
    const foreignStatus = remoteMatchedManilaFamilyStatus(4, folded);
    expect(foreignStatus).toBe("BREACH");
    expect(foreignStatus).not.toBe("OK");
    const ownStatus = remoteMatchedManilaFamilyStatus(open!.still_public_count, published);
    expect(ownStatus).toBe("BREACH");
    expect(typeof publishedManilaFamilyStatus).toBe("function");
    const foreign = publishedManilaFamilyStatus(4, published, folded);
    expect(foreign).toBeNull();
    expect(foreign).not.toBe("BREACH");
    expect(foreign).not.toBe("OK");
    expect(publishedManilaFamilyStatus(open!.still_public_count, published, published)).toBe("BREACH");
    expect(publishedManilaFamilyStatus(4, published, published)).toBeNull();
    expect(publishedManilaFamilyStatus(null, [], [])).toBe("UNKNOWN");
  } finally { sqlite.close(); }
});

test("a self-matching book is not the snapshot family status", async () => {
  const sqlite = freshDb();
  try {
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "snapshot-id-family", proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite, "snapshot-id-family", "we-work-remotely");
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    const realId = result.ok ? result.ids[0] : 0;
    expect(realId).toBeGreaterThan(0);
    const sourceId = (sqlite.query("SELECT source_id AS sourceId FROM opportunities WHERE id = ?").get(realId) as { sourceId: string }).sourceId;
    expect(sourceId).toBe("we-work-remotely");
    const open = readManilaOpenSnapshot(sqlite, "snapshot-id-family");
    expect(open).not.toBeNull();
    expect(open!.day_state).toBe("OPEN");
    expect(open!.still_public_count).toBe(1);
    expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_manila_open_snapshot WHERE day_state = 'CLOSED'").get()).toEqual({ n: 0 });
    const today = manilaDateOf(NOW);
    const loaded = loadSnapshotPair(sqlite);
    const { latestManilaSnapshotPair, publishedManilaFamilyStatus, snapshotSourcedManilaFamilyStatus } = await import("./manila-day");
    const paired = latestManilaSnapshotPair(loaded.counts, loaded.ids, today);
    expect(paired).not.toBeNull();
    expect(paired!.stillPublicIds).toEqual([realId]);
    const remotiveBook = [{ sourceId: "remotive", count: 1 }];
    const selfMatched = publishedManilaFamilyStatus(1, remotiveBook, remotiveBook);
    expect(selfMatched).toBe("BREACH");
    expect(selfMatched).not.toBe("OK");
    expect(typeof snapshotSourcedManilaFamilyStatus).toBe("function");
    const idSources = [{ id: realId, sourceId }];
    const absent = snapshotSourcedManilaFamilyStatus(1, paired!.stillPublicIds, idSources, remotiveBook);
    expect(absent).toBeNull();
    expect(absent).not.toBe("BREACH");
    expect(absent).not.toBe("OK");
    expect(snapshotSourcedManilaFamilyStatus(1, paired!.stillPublicIds, idSources, [{ sourceId, count: 1 }])).toBe("BREACH");
    expect(snapshotSourcedManilaFamilyStatus(1, paired!.stillPublicIds, [{ id: realId + 1, sourceId }], [{ sourceId, count: 1 }])).toBeNull();
    expect(snapshotSourcedManilaFamilyStatus(null, [], [], [])).toBe("UNKNOWN");
  } finally { sqlite.close(); }
});

test("a changed opportunity source is not the published family status", async () => {
  const sqlite = freshDb();
  try {
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "changed-source-not-family", proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite, "changed-source-not-family", "we-work-remotely");
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    const realId = result.ok ? result.ids[0] : 0;
    expect(realId).toBeGreaterThan(0);
    const publishing = (sqlite.query("SELECT source_id AS sourceId FROM source_publication_manila_open_snapshot WHERE retry_key = ?").get("changed-source-not-family") as { sourceId: string }).sourceId;
    expect(publishing).toBe("we-work-remotely");
    sqlite.query("UPDATE opportunities SET source_id = ? WHERE id = ?").run("remotive", realId);
    const changedSource = (sqlite.query("SELECT source_id AS sourceId FROM opportunities WHERE id = ?").get(realId) as { sourceId: string }).sourceId;
    expect(changedSource).toBe("remotive");
    expect(changedSource).not.toBe(publishing);
    const open = readManilaOpenSnapshot(sqlite, "changed-source-not-family");
    expect(open).not.toBeNull();
    expect(open!.day_state).toBe("OPEN");
    expect(open!.still_public_count).toBe(1);
    expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_manila_open_snapshot WHERE day_state = 'CLOSED'").get()).toEqual({ n: 0 });
    const today = manilaDateOf(NOW);
    const loaded = loadSnapshotPair(sqlite);
    const { latestManilaSnapshotPair, snapshotSourcedManilaFamilyStatus, publishingSourceManilaFamilyStatus } = await import("./manila-day");
    const paired = latestManilaSnapshotPair(loaded.counts, loaded.ids, today);
    expect(paired).not.toBeNull();
    expect(paired!.stillPublicIds).toEqual([realId]);
    const changedBook = [{ sourceId: changedSource, count: 1 }];
    const changedIds = [{ id: realId, sourceId: changedSource }];
    const accepted = snapshotSourcedManilaFamilyStatus(1, paired!.stillPublicIds, changedIds, changedBook);
    expect(accepted).toBe("BREACH");
    expect(accepted).not.toBe("OK");
    expect(typeof publishingSourceManilaFamilyStatus).toBe("function");
    const absent = publishingSourceManilaFamilyStatus(1, publishing, paired!.stillPublicIds, changedIds, changedBook);
    expect(absent).toBeNull();
    expect(absent).not.toBe("BREACH");
    expect(absent).not.toBe("OK");
    const originalIds = [{ id: realId, sourceId: publishing }];
    expect(publishingSourceManilaFamilyStatus(1, publishing, paired!.stillPublicIds, originalIds, [{ sourceId: publishing, count: 1 }])).toBe("BREACH");
    expect(publishingSourceManilaFamilyStatus(1, "", paired!.stillPublicIds, originalIds, [{ sourceId: publishing, count: 1 }])).toBeNull();
    expect(publishingSourceManilaFamilyStatus(null, publishing, [], [], [])).toBe("UNKNOWN");
  } finally { sqlite.close(); }
});

test("a claimed publishing source is not the snapshot source", async () => {
  const sqlite = freshDb();
  try {
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "claimed-source-not-snapshot", proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite, "claimed-source-not-snapshot", "we-work-remotely");
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    const realId = result.ok ? result.ids[0] : 0;
    expect(realId).toBeGreaterThan(0);
    const stored = (sqlite.query("SELECT source_id AS sourceId FROM source_publication_manila_open_snapshot WHERE retry_key = ?").get("claimed-source-not-snapshot") as { sourceId: string }).sourceId;
    expect(stored).toBe("we-work-remotely");
    sqlite.query("UPDATE opportunities SET source_id = ? WHERE id = ?").run("remotive", realId);
    const changedSource = (sqlite.query("SELECT source_id AS sourceId FROM opportunities WHERE id = ?").get(realId) as { sourceId: string }).sourceId;
    expect(changedSource).toBe("remotive");
    expect(changedSource).not.toBe(stored);
    const open = readManilaOpenSnapshot(sqlite, "claimed-source-not-snapshot");
    expect(open).not.toBeNull();
    expect(open!.day_state).toBe("OPEN");
    expect(open!.still_public_count).toBe(1);
    expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_manila_open_snapshot WHERE day_state = 'CLOSED'").get()).toEqual({ n: 0 });
    const today = manilaDateOf(NOW);
    const loaded = loadSnapshotPair(sqlite);
    const { latestManilaSnapshotPair, publishingSourceManilaFamilyStatus, storedPublishingSourceManilaFamilyStatus } = await import("./manila-day");
    const paired = latestManilaSnapshotPair(loaded.counts, loaded.ids, today);
    expect(paired).not.toBeNull();
    expect(paired!.stillPublicIds).toEqual([realId]);
    const claimedBook = [{ sourceId: changedSource, count: 1 }];
    const claimedIds = [{ id: realId, sourceId: changedSource }];
    const claimed = publishingSourceManilaFamilyStatus(1, changedSource, paired!.stillPublicIds, claimedIds, claimedBook);
    expect(claimed).toBe("BREACH");
    expect(claimed).not.toBe("OK");
    expect(typeof storedPublishingSourceManilaFamilyStatus).toBe("function");
    const absent = storedPublishingSourceManilaFamilyStatus(1, stored, changedSource, paired!.stillPublicIds, claimedIds, claimedBook);
    expect(absent).toBeNull();
    expect(absent).not.toBe("BREACH");
    expect(absent).not.toBe("OK");
    const originalIds = [{ id: realId, sourceId: stored }];
    expect(storedPublishingSourceManilaFamilyStatus(1, stored, stored, paired!.stillPublicIds, originalIds, [{ sourceId: stored, count: 1 }])).toBe("BREACH");
    expect(storedPublishingSourceManilaFamilyStatus(1, "", stored, paired!.stillPublicIds, originalIds, [{ sourceId: stored, count: 1 }])).toBeNull();
    expect(storedPublishingSourceManilaFamilyStatus(null, stored, stored, [], [], [])).toBe("UNKNOWN");
  } finally { sqlite.close(); }
});

test("a stored-source family breach is not a completed Manila-day flow", async () => {
  const sqlite = freshDb();
  try {
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "stored-family-not-flow", proposedCount: 1,
      persist: async () => {
        const ids = writeOpportunity(sqlite, "stored-family-not-flow", "we-work-remotely");
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 1, replayed: false });
    const realId = result.ok ? result.ids[0] : 0;
    expect(realId).toBeGreaterThan(0);
    const stored = (sqlite.query("SELECT source_id AS sourceId FROM source_publication_manila_open_snapshot WHERE retry_key = ?").get("stored-family-not-flow") as { sourceId: string }).sourceId;
    expect(stored).toBe("we-work-remotely");
    const open = readManilaOpenSnapshot(sqlite, "stored-family-not-flow");
    expect(open).not.toBeNull();
    expect(open!.day_state).toBe("OPEN");
    expect(open!.still_public_count).toBe(1);
    expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_manila_open_snapshot WHERE day_state = 'CLOSED'").get()).toEqual({ n: 0 });
    const today = manilaDateOf(NOW);
    const loaded = loadSnapshotPair(sqlite);
    const { latestManilaSnapshotPair, storedPublishingSourceManilaFamilyStatus, storedPublishingSourceManilaDayFlowCount } = await import("./manila-day");
    const paired = latestManilaSnapshotPair(loaded.counts, loaded.ids, today);
    expect(paired).not.toBeNull();
    expect(paired!.stillPublicIds).toEqual([realId]);
    const idSources = [{ id: realId, sourceId: stored }];
    const status = storedPublishingSourceManilaFamilyStatus(1, stored, stored, paired!.stillPublicIds, idSources, [{ sourceId: stored, count: 1 }]);
    expect(status).toBe("BREACH");
    expect(status).not.toBe("OK");
    expect(typeof storedPublishingSourceManilaDayFlowCount).toBe("function");
    const completed = storedPublishingSourceManilaDayFlowCount(open!.day_state, status, 1);
    expect(completed).toBeNull();
    expect(completed).not.toBe(1);
    expect(completed).not.toBe(0);
    expect(storedPublishingSourceManilaDayFlowCount("CLOSED", status, 1)).toBeNull();
    expect(storedPublishingSourceManilaDayFlowCount("OPEN", status, 100)).toBeNull();
    expect(storedPublishingSourceManilaDayFlowCount("OPEN", status, 150)).toBeNull();
  } finally { sqlite.close(); }
});

test("an exact family ceiling stays OK on the recorded opportunity sources", async () => {
  const sqlite = freshDb();
  try {
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "exact-family-ceiling", proposedCount: 5,
      persist: async () => {
        const ids = Array.from({ length: 5 }, (_, index) => writeOpportunity(sqlite, `exact-family-ceiling-${index}`, "we-work-remotely")[0]!);
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 5, replayed: false });
    const publishedIds = result.ok ? [...result.ids].sort((left, right) => left - right) : [];
    expect(publishedIds).toHaveLength(5);
    const stored = (sqlite.query("SELECT source_id AS sourceId FROM source_publication_manila_open_snapshot WHERE retry_key = ?").get("exact-family-ceiling") as { sourceId: string }).sourceId;
    expect(stored).toBe("we-work-remotely");
    const open = readManilaOpenSnapshot(sqlite, "exact-family-ceiling");
    expect(open).not.toBeNull();
    expect(open!.day_state).toBe("OPEN");
    expect(open!.still_public_count).toBe(5);
    expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_manila_open_snapshot WHERE day_state = 'CLOSED'").get()).toEqual({ n: 0 });
    const today = manilaDateOf(NOW);
    const loaded = loadSnapshotPair(sqlite);
    const { latestManilaSnapshotPair, snapshotSourcedManilaFamilyStatus, recordedOpportunityManilaFamilyStatus } = await import("./manila-day");
    const paired = latestManilaSnapshotPair(loaded.counts, loaded.ids, today);
    expect(paired).not.toBeNull();
    expect([...paired!.stillPublicIds].sort((left, right) => left - right)).toEqual(publishedIds);
    const recorded = publishedIds.map((id) => {
      const row = sqlite.query("SELECT source_id AS sourceId FROM opportunities WHERE id = ?").get(id) as { sourceId: string };
      return { id, sourceId: row.sourceId };
    });
    expect(recorded.every((row) => row.sourceId === stored)).toBe(true);
    const recordedStatus = snapshotSourcedManilaFamilyStatus(5, paired!.stillPublicIds, recorded, [{ sourceId: stored, count: 5 }]);
    expect(recordedStatus).toBe("BREACH");
    expect(recordedStatus).not.toBe("OK");
    const ceilingSources = ["jobicy:admin", "jobicy:support", "remotive", "remote-ok", "real-work-from-anywhere"];
    const claimed = publishedIds.map((id, index) => ({ id, sourceId: ceilingSources[index]! }));
    const claimedBook = ceilingSources.map((sourceId) => ({ sourceId, count: 1 }));
    const ceiling = concentrationReport(familyShares(claimedBook), TOP_PROVIDER_FAMILY_SHARE_MAX);
    expect(ceiling.topId).toBe("jobicy");
    expect(ceiling.topShare).toBe(0.4);
    expect(ceiling.status).toBe("OK");
    expect(ceiling.topShare).not.toBeGreaterThan(TOP_PROVIDER_FAMILY_SHARE_MAX);
    const claimedStatus = snapshotSourcedManilaFamilyStatus(5, paired!.stillPublicIds, claimed, claimedBook);
    expect(claimedStatus).toBe("OK");
    expect(claimedStatus).not.toBe("BREACH");
    expect(typeof recordedOpportunityManilaFamilyStatus).toBe("function");
    const absent = recordedOpportunityManilaFamilyStatus(5, paired!.stillPublicIds, recorded, claimed, claimedBook);
    expect(absent).toBeNull();
    expect(absent).not.toBe("OK");
    expect(absent).not.toBe("BREACH");
    for (const row of claimed) sqlite.query("UPDATE opportunities SET source_id = ? WHERE id = ?").run(row.sourceId, row.id);
    const exactRecorded = publishedIds.map((id) => {
      const row = sqlite.query("SELECT source_id AS sourceId FROM opportunities WHERE id = ?").get(id) as { sourceId: string };
      return { id, sourceId: row.sourceId };
    });
    expect(exactRecorded).toEqual(claimed);
    const exactStatus = recordedOpportunityManilaFamilyStatus(5, paired!.stillPublicIds, exactRecorded, claimed, claimedBook);
    expect(exactStatus).toBe("OK");
    expect(exactStatus).not.toBe("BREACH");
    const third = publishedIds[2]!;
    sqlite.query("UPDATE opportunities SET source_id = ? WHERE id = ?").run("jobicy:design", third);
    const breachRecorded = publishedIds.map((id) => {
      const row = sqlite.query("SELECT source_id AS sourceId FROM opportunities WHERE id = ?").get(id) as { sourceId: string };
      return { id, sourceId: row.sourceId };
    });
    const breachBook = [
      { sourceId: "jobicy:admin", count: 1 },
      { sourceId: "jobicy:support", count: 1 },
      { sourceId: "jobicy:design", count: 1 },
      { sourceId: "remote-ok", count: 1 },
      { sourceId: "real-work-from-anywhere", count: 1 },
    ];
    const breachMath = concentrationReport(familyShares(breachBook), TOP_PROVIDER_FAMILY_SHARE_MAX);
    expect(breachMath.topId).toBe("jobicy");
    expect(breachMath.topShare).toBe(0.6);
    expect(breachMath.status).toBe("BREACH");
    const breachStatus = recordedOpportunityManilaFamilyStatus(5, paired!.stillPublicIds, breachRecorded, breachRecorded, breachBook);
    expect(breachStatus).toBe("BREACH");
    expect(breachStatus).not.toBe("OK");
    const swapped = claimed.map((row, index) => index === 0 ? { id: row.id, sourceId: "jobicy:support" } : index === 1 ? { id: row.id, sourceId: "jobicy:admin" } : row);
    expect(recordedOpportunityManilaFamilyStatus(5, paired!.stillPublicIds, exactRecorded, swapped, claimedBook)).toBeNull();
    expect(recordedOpportunityManilaFamilyStatus(null, [], [], [], [])).toBe("UNKNOWN");
  } finally { sqlite.close(); }
});

test("an exact family ceiling is not a completed Manila-day flow", async () => {
  const sqlite = freshDb();
  try {
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "exact-ceiling-not-flow", proposedCount: 5,
      persist: async () => {
        const ids = Array.from({ length: 5 }, (_, index) => writeOpportunity(sqlite, `exact-ceiling-not-flow-${index}`, "we-work-remotely")[0]!);
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 5, replayed: false });
    const publishedIds = result.ok ? [...result.ids].sort((left, right) => left - right) : [];
    expect(publishedIds).toHaveLength(5);
    const open = readManilaOpenSnapshot(sqlite, "exact-ceiling-not-flow");
    expect(open).not.toBeNull();
    expect(open!.day_state).toBe("OPEN");
    expect(open!.still_public_count).toBe(5);
    expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_manila_open_snapshot WHERE day_state = 'CLOSED'").get()).toEqual({ n: 0 });
    const today = manilaDateOf(NOW);
    const loaded = loadSnapshotPair(sqlite);
    const { latestManilaSnapshotPair, recordedOpportunityManilaFamilyStatus, recordedOpportunityManilaDayFlowCount } = await import("./manila-day");
    const paired = latestManilaSnapshotPair(loaded.counts, loaded.ids, today);
    expect(paired).not.toBeNull();
    expect([...paired!.stillPublicIds].sort((left, right) => left - right)).toEqual(publishedIds);
    const ceilingSources = ["jobicy:admin", "jobicy:support", "remotive", "remote-ok", "real-work-from-anywhere"];
    for (const [index, id] of publishedIds.entries()) {
      sqlite.query("UPDATE opportunities SET source_id = ? WHERE id = ?").run(ceilingSources[index], id);
    }
    const recorded = publishedIds.map((id) => {
      const row = sqlite.query("SELECT source_id AS sourceId FROM opportunities WHERE id = ?").get(id) as { sourceId: string };
      return { id, sourceId: row.sourceId };
    });
    const recordedBook = ceilingSources.map((sourceId) => ({ sourceId, count: 1 }));
    const status = recordedOpportunityManilaFamilyStatus(5, paired!.stillPublicIds, recorded, recorded, recordedBook);
    expect(status).toBe("OK");
    expect(status).not.toBe("BREACH");
    expect(typeof recordedOpportunityManilaDayFlowCount).toBe("function");
    const completed = recordedOpportunityManilaDayFlowCount(open!.day_state, status, 5);
    expect(completed).toBeNull();
    expect(completed).not.toBe(5);
    expect(completed).not.toBe(0);
    expect(recordedOpportunityManilaDayFlowCount("CLOSED", status, 5)).toBeNull();
    expect(recordedOpportunityManilaDayFlowCount("OPEN", status, 100)).toBeNull();
    expect(recordedOpportunityManilaDayFlowCount("OPEN", status, 150)).toBeNull();
    const third = publishedIds[2]!;
    sqlite.query("UPDATE opportunities SET source_id = ? WHERE id = ?").run("jobicy:design", third);
    const breachRecorded = publishedIds.map((id) => {
      const row = sqlite.query("SELECT source_id AS sourceId FROM opportunities WHERE id = ?").get(id) as { sourceId: string };
      return { id, sourceId: row.sourceId };
    });
    const breachBook = [
      { sourceId: "jobicy:admin", count: 1 },
      { sourceId: "jobicy:support", count: 1 },
      { sourceId: "jobicy:design", count: 1 },
      { sourceId: "remote-ok", count: 1 },
      { sourceId: "real-work-from-anywhere", count: 1 },
    ];
    const breachStatus = recordedOpportunityManilaFamilyStatus(5, paired!.stillPublicIds, breachRecorded, breachRecorded, breachBook);
    expect(breachStatus).toBe("BREACH");
    expect(recordedOpportunityManilaDayFlowCount(open!.day_state, breachStatus, 5)).toBeNull();
  } finally { sqlite.close(); }
});

test("a same-source pair is not a family breach", async () => {
  const sqlite = freshDb();
  try {
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "same-source-pair", proposedCount: 5,
      persist: async () => {
        const ids = Array.from({ length: 5 }, (_, index) => writeOpportunity(sqlite, `same-source-pair-${index}`, "we-work-remotely")[0]!);
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 5, replayed: false });
    const publishedIds = result.ok ? [...result.ids].sort((left, right) => left - right) : [];
    expect(publishedIds).toHaveLength(5);
    const open = readManilaOpenSnapshot(sqlite, "same-source-pair");
    expect(open).not.toBeNull();
    expect(open!.day_state).toBe("OPEN");
    expect(open!.still_public_count).toBe(5);
    expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_manila_open_snapshot WHERE day_state = 'CLOSED'").get()).toEqual({ n: 0 });
    const today = manilaDateOf(NOW);
    const loaded = loadSnapshotPair(sqlite);
    const {
      latestManilaSnapshotPair,
      remoteMatchedManilaPortfolioStatus,
      recordedOpportunityManilaFamilyStatus,
      sameSourcePairManilaFamilyStatus,
    } = await import("./manila-day");
    const paired = latestManilaSnapshotPair(loaded.counts, loaded.ids, today);
    expect(paired).not.toBeNull();
    expect([...paired!.stillPublicIds].sort((left, right) => left - right)).toEqual(publishedIds);
    const pairSources = ["jobicy:admin", "jobicy:admin", "remotive", "remote-ok", "real-work-from-anywhere"];
    for (const [index, id] of publishedIds.entries()) {
      sqlite.query("UPDATE opportunities SET source_id = ? WHERE id = ?").run(pairSources[index], id);
    }
    const recorded = publishedIds.map((id) => {
      const row = sqlite.query("SELECT source_id AS sourceId FROM opportunities WHERE id = ?").get(id) as { sourceId: string };
      return { id, sourceId: row.sourceId };
    });
    const pairBook = [
      { sourceId: "jobicy:admin", count: 2 },
      { sourceId: "remotive", count: 1 },
      { sourceId: "remote-ok", count: 1 },
      { sourceId: "real-work-from-anywhere", count: 1 },
    ];
    const sourceMath = concentrationReport(pairBook.map((row) => ({ id: row.sourceId, count: row.count })), TOP_SOURCE_SHARE_MAX);
    expect(sourceMath.topId).toBe("jobicy:admin");
    expect(sourceMath.topShare).toBe(0.4);
    expect(sourceMath.status).toBe("BREACH");
    const familyMath = concentrationReport(familyShares(pairBook), TOP_PROVIDER_FAMILY_SHARE_MAX);
    expect(familyMath.topId).toBe("jobicy");
    expect(familyMath.topShare).toBe(0.4);
    expect(familyMath.status).toBe("OK");
    const sourceStatus = remoteMatchedManilaPortfolioStatus(5, pairBook);
    expect(sourceStatus).toBe("BREACH");
    expect(sourceStatus).not.toBe("OK");
    const familyStatus = recordedOpportunityManilaFamilyStatus(5, paired!.stillPublicIds, recorded, recorded, pairBook);
    expect(familyStatus).toBe("OK");
    expect(familyStatus).not.toBe("BREACH");
    expect(typeof sameSourcePairManilaFamilyStatus).toBe("function");
    const separated = sameSourcePairManilaFamilyStatus(5, paired!.stillPublicIds, recorded, pairBook);
    expect(separated).toBe("OK");
    expect(separated).not.toBe("BREACH");
    expect(separated).not.toBe(sourceStatus);
    const foldedSources = ["jobicy:admin", "jobicy:support", "jobicy:design", "remotive", "remote-ok"];
    for (const [index, id] of publishedIds.entries()) {
      sqlite.query("UPDATE opportunities SET source_id = ? WHERE id = ?").run(foldedSources[index], id);
    }
    const foldedRecorded = publishedIds.map((id) => {
      const row = sqlite.query("SELECT source_id AS sourceId FROM opportunities WHERE id = ?").get(id) as { sourceId: string };
      return { id, sourceId: row.sourceId };
    });
    const foldedBook = foldedSources.map((sourceId) => ({ sourceId, count: 1 }));
    const foldedSource = remoteMatchedManilaPortfolioStatus(5, foldedBook);
    expect(foldedSource).toBe("OK");
    const foldedFamily = sameSourcePairManilaFamilyStatus(5, paired!.stillPublicIds, foldedRecorded, foldedBook);
    expect(foldedFamily).toBe("BREACH");
    expect(foldedFamily).not.toBe("OK");
    expect(sameSourcePairManilaFamilyStatus(5, paired!.stillPublicIds, recorded, foldedBook)).toBeNull();
  } finally { sqlite.close(); }
});

test("a same-source pair is not a completed Manila-day flow", async () => {
  const sqlite = freshDb();
  try {
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "same-source-not-flow", proposedCount: 5,
      persist: async () => {
        const ids = Array.from({ length: 5 }, (_, index) => writeOpportunity(sqlite, `same-source-not-flow-${index}`, "we-work-remotely")[0]!);
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 5, replayed: false });
    const publishedIds = result.ok ? [...result.ids].sort((left, right) => left - right) : [];
    expect(publishedIds).toHaveLength(5);
    const open = readManilaOpenSnapshot(sqlite, "same-source-not-flow");
    expect(open).not.toBeNull();
    expect(open!.day_state).toBe("OPEN");
    expect(open!.still_public_count).toBe(5);
    expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_manila_open_snapshot WHERE day_state = 'CLOSED'").get()).toEqual({ n: 0 });
    const today = manilaDateOf(NOW);
    const loaded = loadSnapshotPair(sqlite);
    const { latestManilaSnapshotPair, sameSourcePairManilaFamilyStatus, sameSourcePairManilaDayFlowCount } = await import("./manila-day");
    const paired = latestManilaSnapshotPair(loaded.counts, loaded.ids, today);
    expect(paired).not.toBeNull();
    expect([...paired!.stillPublicIds].sort((left, right) => left - right)).toEqual(publishedIds);
    const pairSources = ["jobicy:admin", "jobicy:admin", "remotive", "remote-ok", "real-work-from-anywhere"];
    for (const [index, id] of publishedIds.entries()) {
      sqlite.query("UPDATE opportunities SET source_id = ? WHERE id = ?").run(pairSources[index], id);
    }
    const recorded = publishedIds.map((id) => {
      const row = sqlite.query("SELECT source_id AS sourceId FROM opportunities WHERE id = ?").get(id) as { sourceId: string };
      return { id, sourceId: row.sourceId };
    });
    const pairBook = [
      { sourceId: "jobicy:admin", count: 2 },
      { sourceId: "remotive", count: 1 },
      { sourceId: "remote-ok", count: 1 },
      { sourceId: "real-work-from-anywhere", count: 1 },
    ];
    const status = sameSourcePairManilaFamilyStatus(5, paired!.stillPublicIds, recorded, pairBook);
    expect(status).toBe("OK");
    expect(status).not.toBe("BREACH");
    expect(typeof sameSourcePairManilaDayFlowCount).toBe("function");
    const completed = sameSourcePairManilaDayFlowCount(open!.day_state, status, 5);
    expect(completed).toBeNull();
    expect(completed).not.toBe(5);
    expect(completed).not.toBe(0);
    expect(sameSourcePairManilaDayFlowCount("CLOSED", status, 5)).toBeNull();
    expect(sameSourcePairManilaDayFlowCount("OPEN", status, 100)).toBeNull();
    expect(sameSourcePairManilaDayFlowCount("OPEN", status, 150)).toBeNull();
    const fiveSources = ["jobicy:admin", "jobicy:support", "jobicy:design", "remotive", "remote-ok"];
    for (const [index, id] of publishedIds.entries()) {
      sqlite.query("UPDATE opportunities SET source_id = ? WHERE id = ?").run(fiveSources[index], id);
    }
    const fiveRecorded = publishedIds.map((id) => {
      const row = sqlite.query("SELECT source_id AS sourceId FROM opportunities WHERE id = ?").get(id) as { sourceId: string };
      return { id, sourceId: row.sourceId };
    });
    const foldedBook = fiveSources.map((sourceId) => ({ sourceId, count: 1 }));
    const breachStatus = sameSourcePairManilaFamilyStatus(5, paired!.stillPublicIds, fiveRecorded, foldedBook);
    expect(breachStatus).toBe("BREACH");
    expect(sameSourcePairManilaDayFlowCount(open!.day_state, breachStatus, 5)).toBeNull();
  } finally { sqlite.close(); }
});

test("a same-source breach is a family breach", async () => {
  const sqlite = freshDb();
  try {
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "same-source-breach", proposedCount: 5,
      persist: async () => {
        const ids = Array.from({ length: 5 }, (_, index) => writeOpportunity(sqlite, `same-source-breach-${index}`, "we-work-remotely")[0]!);
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 5, replayed: false });
    const publishedIds = result.ok ? [...result.ids].sort((left, right) => left - right) : [];
    expect(publishedIds).toHaveLength(5);
    const open = readManilaOpenSnapshot(sqlite, "same-source-breach");
    expect(open).not.toBeNull();
    expect(open!.day_state).toBe("OPEN");
    expect(open!.still_public_count).toBe(5);
    expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_manila_open_snapshot WHERE day_state = 'CLOSED'").get()).toEqual({ n: 0 });
    const today = manilaDateOf(NOW);
    const loaded = loadSnapshotPair(sqlite);
    const {
      latestManilaSnapshotPair,
      remoteMatchedManilaPortfolioStatus,
      sameSourcePairManilaFamilyStatus,
    } = await import("./manila-day");
    const paired = latestManilaSnapshotPair(loaded.counts, loaded.ids, today);
    expect(paired).not.toBeNull();
    expect([...paired!.stillPublicIds].sort((left, right) => left - right)).toEqual(publishedIds);
    const breachSources = ["jobicy:admin", "jobicy:admin", "jobicy:admin", "remotive", "remote-ok"];
    for (const [index, id] of publishedIds.entries()) {
      sqlite.query("UPDATE opportunities SET source_id = ? WHERE id = ?").run(breachSources[index], id);
    }
    const recorded = publishedIds.map((id) => {
      const row = sqlite.query("SELECT source_id AS sourceId FROM opportunities WHERE id = ?").get(id) as { sourceId: string };
      return { id, sourceId: row.sourceId };
    });
    const breachBook = [
      { sourceId: "jobicy:admin", count: 3 },
      { sourceId: "remotive", count: 1 },
      { sourceId: "remote-ok", count: 1 },
    ];
    const sourceMath = concentrationReport(breachBook.map((row) => ({ id: row.sourceId, count: row.count })), TOP_SOURCE_SHARE_MAX);
    expect(sourceMath.topId).toBe("jobicy:admin");
    expect(sourceMath.topShare).toBe(0.6);
    expect(sourceMath.status).toBe("BREACH");
    const familyMath = concentrationReport(familyShares(breachBook), TOP_PROVIDER_FAMILY_SHARE_MAX);
    expect(familyMath.topId).toBe("jobicy");
    expect(familyMath.topShare).toBe(0.6);
    expect(familyMath.status).toBe("BREACH");
    const sourceStatus = remoteMatchedManilaPortfolioStatus(5, breachBook);
    expect(sourceStatus).toBe("BREACH");
    const status = sameSourcePairManilaFamilyStatus(5, paired!.stillPublicIds, recorded, breachBook);
    expect(status).toBe("BREACH");
    expect(status).not.toBe("OK");
    expect(status).toBe(sourceStatus);
    expect(sameSourcePairManilaFamilyStatus(5, paired!.stillPublicIds, recorded, [{ sourceId: "jobicy:admin", count: 2 }, { sourceId: "remotive", count: 1 }, { sourceId: "remote-ok", count: 1 }])).toBeNull();
  } finally { sqlite.close(); }
});

test("a same-source breach is not a completed Manila-day flow", async () => {
  const sqlite = freshDb();
  try {
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "same-source-breach-not-flow", proposedCount: 5,
      persist: async () => {
        const ids = Array.from({ length: 5 }, (_, index) => writeOpportunity(sqlite, `same-source-breach-not-flow-${index}`, "we-work-remotely")[0]!);
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 5, replayed: false });
    const publishedIds = result.ok ? [...result.ids].sort((left, right) => left - right) : [];
    expect(publishedIds).toHaveLength(5);
    const open = readManilaOpenSnapshot(sqlite, "same-source-breach-not-flow");
    expect(open).not.toBeNull();
    expect(open!.day_state).toBe("OPEN");
    expect(open!.still_public_count).toBe(5);
    expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_manila_open_snapshot WHERE day_state = 'CLOSED'").get()).toEqual({ n: 0 });
    const today = manilaDateOf(NOW);
    const loaded = loadSnapshotPair(sqlite);
    const { latestManilaSnapshotPair, sameSourcePairManilaFamilyStatus, sameSourcePairManilaDayFlowCount } = await import("./manila-day");
    const paired = latestManilaSnapshotPair(loaded.counts, loaded.ids, today);
    expect(paired).not.toBeNull();
    expect([...paired!.stillPublicIds].sort((left, right) => left - right)).toEqual(publishedIds);
    const breachSources = ["jobicy:admin", "jobicy:admin", "jobicy:admin", "remotive", "remote-ok"];
    for (const [index, id] of publishedIds.entries()) {
      sqlite.query("UPDATE opportunities SET source_id = ? WHERE id = ?").run(breachSources[index], id);
    }
    const recorded = publishedIds.map((id) => {
      const row = sqlite.query("SELECT source_id AS sourceId FROM opportunities WHERE id = ?").get(id) as { sourceId: string };
      return { id, sourceId: row.sourceId };
    });
    const breachBook = [
      { sourceId: "jobicy:admin", count: 3 },
      { sourceId: "remotive", count: 1 },
      { sourceId: "remote-ok", count: 1 },
    ];
    const status = sameSourcePairManilaFamilyStatus(5, paired!.stillPublicIds, recorded, breachBook);
    expect(status).toBe("BREACH");
    expect(status).not.toBe("OK");
    const completed = sameSourcePairManilaDayFlowCount(open!.day_state, status, 5);
    expect(completed).toBeNull();
    expect(completed).not.toBe(5);
    expect(completed).not.toBe(0);
    expect(sameSourcePairManilaDayFlowCount("CLOSED", status, 5)).toBeNull();
    expect(sameSourcePairManilaDayFlowCount("OPEN", status, 100)).toBeNull();
    expect(sameSourcePairManilaDayFlowCount("OPEN", status, 150)).toBeNull();
  } finally { sqlite.close(); }
});

test("a same-source pair whose recorded id leaves active stays absent", async () => {
  const sqlite = freshDb();
  try {
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "same-source-active-fence", proposedCount: 5,
      persist: async () => {
        const ids = Array.from({ length: 5 }, (_, index) => writeOpportunity(sqlite, `same-source-active-fence-${index}`, "we-work-remotely")[0]!);
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 5, replayed: false });
    const publishedIds = result.ok ? [...result.ids].sort((left, right) => left - right) : [];
    expect(publishedIds).toHaveLength(5);
    const open = readManilaOpenSnapshot(sqlite, "same-source-active-fence");
    expect(open).not.toBeNull();
    expect(open!.day_state).toBe("OPEN");
    expect(open!.still_public_count).toBe(5);
    expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_manila_open_snapshot WHERE day_state = 'CLOSED'").get()).toEqual({ n: 0 });
    const today = manilaDateOf(NOW);
    const loaded = loadSnapshotPair(sqlite);
    const { latestManilaSnapshotPair, sameSourcePairManilaFamilyStatus } = await import("./manila-day");
    const paired = latestManilaSnapshotPair(loaded.counts, loaded.ids, today);
    expect(paired).not.toBeNull();
    expect([...paired!.stillPublicIds].sort((left, right) => left - right)).toEqual(publishedIds);
    const pairSources = ["jobicy:admin", "jobicy:admin", "remotive", "remote-ok", "real-work-from-anywhere"];
    for (const [index, id] of publishedIds.entries()) {
      sqlite.query("UPDATE opportunities SET source_id = ? WHERE id = ?").run(pairSources[index], id);
    }
    const recorded = publishedIds.map((id) => {
      const row = sqlite.query("SELECT source_id AS sourceId FROM opportunities WHERE id = ?").get(id) as { sourceId: string };
      return { id, sourceId: row.sourceId };
    });
    const pairBook = [
      { sourceId: "jobicy:admin", count: 2 },
      { sourceId: "remotive", count: 1 },
      { sourceId: "remote-ok", count: 1 },
      { sourceId: "real-work-from-anywhere", count: 1 },
    ];
    const initialStatus = sameSourcePairManilaFamilyStatus(5, paired!.stillPublicIds, recorded, pairBook);
    expect(initialStatus).toBe("OK");
    expect(initialStatus).not.toBe("BREACH");
    expect(stillPublicFirstPublishIds(sqlite, publishedIds)).toEqual(publishedIds);

    const withdrawnId = publishedIds[0]!;
    sqlite.query("UPDATE opportunities SET is_active = 0 WHERE id = ?").run(withdrawnId);
    const liveIds = stillPublicFirstPublishIds(sqlite, publishedIds);
    expect(liveIds).toHaveLength(4);
    expect(liveIds).not.toContain(withdrawnId);

    const activeRecorded = liveIds.map((id) => {
      const row = sqlite.query("SELECT source_id AS sourceId FROM opportunities WHERE id = ?").get(id) as { sourceId: string };
      return { id, sourceId: row.sourceId };
    });
    expect(sameSourcePairManilaFamilyStatus(5, liveIds, recorded, pairBook)).toBeNull();
    expect(sameSourcePairManilaFamilyStatus(5, paired!.stillPublicIds, activeRecorded, pairBook)).toBeNull();
    expect(sameSourcePairManilaFamilyStatus(5, liveIds, activeRecorded, pairBook)).toBeNull();

    sqlite.query("UPDATE opportunities SET is_active = 1 WHERE id = ?").run(withdrawnId);
    expect(stillPublicFirstPublishIds(sqlite, publishedIds)).toEqual(publishedIds);
    const restoredStatus = sameSourcePairManilaFamilyStatus(5, paired!.stillPublicIds, recorded, pairBook);
    expect(restoredStatus).toBe("OK");
    expect(restoredStatus).not.toBe("BREACH");
    expect(restoredStatus).not.toBeNull();
  } finally { sqlite.close(); }
});

test("a same-source breach whose recorded id leaves active stays absent", async () => {
  const sqlite = freshDb();
  try {
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "same-source-breach-active-fence", proposedCount: 5,
      persist: async () => {
        const ids = Array.from({ length: 5 }, (_, index) => writeOpportunity(sqlite, `same-source-breach-active-fence-${index}`, "we-work-remotely")[0]!);
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 5, replayed: false });
    const publishedIds = result.ok ? [...result.ids].sort((left, right) => left - right) : [];
    expect(publishedIds).toHaveLength(5);
    const open = readManilaOpenSnapshot(sqlite, "same-source-breach-active-fence");
    expect(open).not.toBeNull();
    expect(open!.day_state).toBe("OPEN");
    expect(open!.still_public_count).toBe(5);
    expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_manila_open_snapshot WHERE day_state = 'CLOSED'").get()).toEqual({ n: 0 });
    const today = manilaDateOf(NOW);
    const loaded = loadSnapshotPair(sqlite);
    const { latestManilaSnapshotPair, sameSourcePairManilaFamilyStatus } = await import("./manila-day");
    const paired = latestManilaSnapshotPair(loaded.counts, loaded.ids, today);
    expect(paired).not.toBeNull();
    expect([...paired!.stillPublicIds].sort((left, right) => left - right)).toEqual(publishedIds);
    const breachSources = ["jobicy:admin", "jobicy:admin", "jobicy:admin", "remotive", "remote-ok"];
    for (const [index, id] of publishedIds.entries()) {
      sqlite.query("UPDATE opportunities SET source_id = ? WHERE id = ?").run(breachSources[index], id);
    }
    const recorded = publishedIds.map((id) => {
      const row = sqlite.query("SELECT source_id AS sourceId FROM opportunities WHERE id = ?").get(id) as { sourceId: string };
      return { id, sourceId: row.sourceId };
    });
    const breachBook = [
      { sourceId: "jobicy:admin", count: 3 },
      { sourceId: "remotive", count: 1 },
      { sourceId: "remote-ok", count: 1 },
    ];
    const initialStatus = sameSourcePairManilaFamilyStatus(5, paired!.stillPublicIds, recorded, breachBook);
    expect(initialStatus).toBe("BREACH");
    expect(initialStatus).not.toBe("OK");
    expect(stillPublicFirstPublishIds(sqlite, publishedIds)).toEqual(publishedIds);

    const withdrawnId = publishedIds[0]!;
    sqlite.query("UPDATE opportunities SET is_active = 0 WHERE id = ?").run(withdrawnId);
    const liveIds = stillPublicFirstPublishIds(sqlite, publishedIds);
    expect(liveIds).toHaveLength(4);
    expect(liveIds).not.toContain(withdrawnId);

    const activeRecorded = liveIds.map((id) => {
      const row = sqlite.query("SELECT source_id AS sourceId FROM opportunities WHERE id = ?").get(id) as { sourceId: string };
      return { id, sourceId: row.sourceId };
    });
    expect(sameSourcePairManilaFamilyStatus(5, liveIds, recorded, breachBook)).toBeNull();
    expect(sameSourcePairManilaFamilyStatus(5, paired!.stillPublicIds, activeRecorded, breachBook)).toBeNull();
    expect(sameSourcePairManilaFamilyStatus(5, liveIds, activeRecorded, breachBook)).toBeNull();

    sqlite.query("UPDATE opportunities SET is_active = 1 WHERE id = ?").run(withdrawnId);
    expect(stillPublicFirstPublishIds(sqlite, publishedIds)).toEqual(publishedIds);
    const restoredStatus = sameSourcePairManilaFamilyStatus(5, paired!.stillPublicIds, recorded, breachBook);
    expect(restoredStatus).toBe("BREACH");
    expect(restoredStatus).not.toBe("OK");
    expect(restoredStatus).not.toBeNull();
  } finally { sqlite.close(); }
});

test("an inactive same-source opportunity is not a completed Manila-day flow", async () => {
  const sqlite = freshDb();
  try {
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "same-source-inactive-not-flow", proposedCount: 5,
      persist: async () => {
        const ids = Array.from({ length: 5 }, (_, index) => writeOpportunity(sqlite, `same-source-inactive-not-flow-${index}`, "we-work-remotely")[0]!);
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 5, replayed: false });
    const publishedIds = result.ok ? [...result.ids].sort((left, right) => left - right) : [];
    expect(publishedIds).toHaveLength(5);
    const open = readManilaOpenSnapshot(sqlite, "same-source-inactive-not-flow");
    expect(open).not.toBeNull();
    expect(open!.day_state).toBe("OPEN");
    expect(open!.still_public_count).toBe(5);
    expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_manila_open_snapshot WHERE day_state = 'CLOSED'").get()).toEqual({ n: 0 });
    const today = manilaDateOf(NOW);
    const loaded = loadSnapshotPair(sqlite);
    const { latestManilaSnapshotPair, sameSourcePairManilaFamilyStatus, sameSourcePairManilaDayFlowCount } = await import("./manila-day");
    const paired = latestManilaSnapshotPair(loaded.counts, loaded.ids, today);
    expect(paired).not.toBeNull();
    expect([...paired!.stillPublicIds].sort((left, right) => left - right)).toEqual(publishedIds);
    const pairSources = ["jobicy:admin", "jobicy:admin", "remotive", "remote-ok", "real-work-from-anywhere"];
    for (const [index, id] of publishedIds.entries()) {
      sqlite.query("UPDATE opportunities SET source_id = ? WHERE id = ?").run(pairSources[index], id);
    }
    const recorded = publishedIds.map((id) => {
      const row = sqlite.query("SELECT source_id AS sourceId FROM opportunities WHERE id = ?").get(id) as { sourceId: string };
      return { id, sourceId: row.sourceId };
    });
    const pairBook = [
      { sourceId: "jobicy:admin", count: 2 },
      { sourceId: "remotive", count: 1 },
      { sourceId: "remote-ok", count: 1 },
      { sourceId: "real-work-from-anywhere", count: 1 },
    ];
    const withdrawnId = publishedIds[0]!;
    sqlite.query("UPDATE opportunities SET is_active = 0 WHERE id = ?").run(withdrawnId);
    const liveIds = stillPublicFirstPublishIds(sqlite, publishedIds);
    expect(liveIds).toHaveLength(4);
    const nullStatus = sameSourcePairManilaFamilyStatus(5, liveIds, recorded, pairBook);
    expect(nullStatus).toBeNull();
    const completed = sameSourcePairManilaDayFlowCount(open!.day_state, nullStatus, 5);
    expect(completed).toBeNull();
    expect(completed).not.toBe(5);
    expect(completed).not.toBe(0);
    expect(sameSourcePairManilaDayFlowCount("CLOSED", nullStatus, 5)).toBeNull();
    expect(sameSourcePairManilaDayFlowCount("OPEN", nullStatus, 100)).toBeNull();
    expect(sameSourcePairManilaDayFlowCount("OPEN", nullStatus, 150)).toBeNull();
    expect(sameSourcePairManilaDayFlowCount("OPEN", nullStatus, null)).toBeNull();
  } finally { sqlite.close(); }
});

test("a same-source pair whose still-public id list contains a duplicate id stays absent", async () => {
  const sqlite = freshDb();
  try {
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "same-source-repeated-id", proposedCount: 5,
      persist: async () => {
        const ids = Array.from({ length: 5 }, (_, index) => writeOpportunity(sqlite, `same-source-repeated-id-${index}`, "we-work-remotely")[0]!);
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 5, replayed: false });
    const publishedIds = result.ok ? [...result.ids].sort((left, right) => left - right) : [];
    expect(publishedIds).toHaveLength(5);
    const open = readManilaOpenSnapshot(sqlite, "same-source-repeated-id");
    expect(open).not.toBeNull();
    expect(open!.day_state).toBe("OPEN");
    expect(open!.still_public_count).toBe(5);
    expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_manila_open_snapshot WHERE day_state = 'CLOSED'").get()).toEqual({ n: 0 });
    const today = manilaDateOf(NOW);
    const loaded = loadSnapshotPair(sqlite);
    const { latestManilaSnapshotPair, sameSourcePairManilaFamilyStatus } = await import("./manila-day");
    const paired = latestManilaSnapshotPair(loaded.counts, loaded.ids, today);
    expect(paired).not.toBeNull();
    expect([...paired!.stillPublicIds].sort((left, right) => left - right)).toEqual(publishedIds);
    const pairSources = ["jobicy:admin", "jobicy:admin", "remotive", "remote-ok", "real-work-from-anywhere"];
    for (const [index, id] of publishedIds.entries()) {
      sqlite.query("UPDATE opportunities SET source_id = ? WHERE id = ?").run(pairSources[index], id);
    }
    const recorded = publishedIds.map((id) => {
      const row = sqlite.query("SELECT source_id AS sourceId FROM opportunities WHERE id = ?").get(id) as { sourceId: string };
      return { id, sourceId: row.sourceId };
    });
    const pairBook = [
      { sourceId: "jobicy:admin", count: 2 },
      { sourceId: "remotive", count: 1 },
      { sourceId: "remote-ok", count: 1 },
      { sourceId: "real-work-from-anywhere", count: 1 },
    ];
    const initialStatus = sameSourcePairManilaFamilyStatus(5, paired!.stillPublicIds, recorded, pairBook);
    expect(initialStatus).toBe("OK");
    expect(initialStatus).not.toBe("BREACH");

    const repeatedIds = [publishedIds[0]!, publishedIds[0]!, publishedIds[1]!, publishedIds[2]!, publishedIds[3]!];
    expect(repeatedIds).toHaveLength(5);
    expect(new Set(repeatedIds).size).toBe(4);
    const repeatedStatus = sameSourcePairManilaFamilyStatus(5, repeatedIds, recorded, pairBook);
    expect(repeatedStatus).toBeNull();
    expect(repeatedStatus).not.toBe("OK");
    expect(repeatedStatus).not.toBe("BREACH");

    const nonPositiveIds = [0, publishedIds[1]!, publishedIds[2]!, publishedIds[3]!, publishedIds[4]!];
    expect(sameSourcePairManilaFamilyStatus(5, nonPositiveIds, recorded, pairBook)).toBeNull();

    const restoredStatus = sameSourcePairManilaFamilyStatus(5, paired!.stillPublicIds, recorded, pairBook);
    expect(restoredStatus).toBe("OK");
    expect(restoredStatus).not.toBe("BREACH");
    expect(restoredStatus).not.toBeNull();
  } finally { sqlite.close(); }
});

test("a same-source breach whose still-public id list contains a duplicate id stays absent", async () => {
  const sqlite = freshDb();
  try {
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "same-source-breach-repeated-id", proposedCount: 5,
      persist: async () => {
        const ids = Array.from({ length: 5 }, (_, index) => writeOpportunity(sqlite, `same-source-breach-repeated-id-${index}`, "we-work-remotely")[0]!);
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 5, replayed: false });
    const publishedIds = result.ok ? [...result.ids].sort((left, right) => left - right) : [];
    expect(publishedIds).toHaveLength(5);
    const open = readManilaOpenSnapshot(sqlite, "same-source-breach-repeated-id");
    expect(open).not.toBeNull();
    expect(open!.day_state).toBe("OPEN");
    expect(open!.still_public_count).toBe(5);
    expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_manila_open_snapshot WHERE day_state = 'CLOSED'").get()).toEqual({ n: 0 });
    const today = manilaDateOf(NOW);
    const loaded = loadSnapshotPair(sqlite);
    const { latestManilaSnapshotPair, sameSourcePairManilaFamilyStatus } = await import("./manila-day");
    const paired = latestManilaSnapshotPair(loaded.counts, loaded.ids, today);
    expect(paired).not.toBeNull();
    expect([...paired!.stillPublicIds].sort((left, right) => left - right)).toEqual(publishedIds);
    const breachSources = ["jobicy:admin", "jobicy:admin", "jobicy:admin", "remotive", "remote-ok"];
    for (const [index, id] of publishedIds.entries()) {
      sqlite.query("UPDATE opportunities SET source_id = ? WHERE id = ?").run(breachSources[index], id);
    }
    const recorded = publishedIds.map((id) => {
      const row = sqlite.query("SELECT source_id AS sourceId FROM opportunities WHERE id = ?").get(id) as { sourceId: string };
      return { id, sourceId: row.sourceId };
    });
    const breachBook = [
      { sourceId: "jobicy:admin", count: 3 },
      { sourceId: "remotive", count: 1 },
      { sourceId: "remote-ok", count: 1 },
    ];
    const initialStatus = sameSourcePairManilaFamilyStatus(5, paired!.stillPublicIds, recorded, breachBook);
    expect(initialStatus).toBe("BREACH");
    expect(initialStatus).not.toBe("OK");

    const repeatedIds = [publishedIds[0]!, publishedIds[0]!, publishedIds[1]!, publishedIds[2]!, publishedIds[3]!];
    expect(repeatedIds).toHaveLength(5);
    expect(new Set(repeatedIds).size).toBe(4);
    const repeatedStatus = sameSourcePairManilaFamilyStatus(5, repeatedIds, recorded, breachBook);
    expect(repeatedStatus).toBeNull();
    expect(repeatedStatus).not.toBe("OK");
    expect(repeatedStatus).not.toBe("BREACH");

    const nonPositiveIds = [0, publishedIds[1]!, publishedIds[2]!, publishedIds[3]!, publishedIds[4]!];
    expect(sameSourcePairManilaFamilyStatus(5, nonPositiveIds, recorded, breachBook)).toBeNull();

    const restoredStatus = sameSourcePairManilaFamilyStatus(5, paired!.stillPublicIds, recorded, breachBook);
    expect(restoredStatus).toBe("BREACH");
    expect(restoredStatus).not.toBe("OK");
    expect(restoredStatus).not.toBeNull();
  } finally { sqlite.close(); }
});

test("a repeated still-public id in a same-source pair is not a completed Manila-day flow", async () => {
  const sqlite = freshDb();
  try {
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "same-source-repeated-not-flow", proposedCount: 5,
      persist: async () => {
        const ids = Array.from({ length: 5 }, (_, index) => writeOpportunity(sqlite, `same-source-repeated-not-flow-${index}`, "we-work-remotely")[0]!);
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 5, replayed: false });
    const publishedIds = result.ok ? [...result.ids].sort((left, right) => left - right) : [];
    expect(publishedIds).toHaveLength(5);
    const open = readManilaOpenSnapshot(sqlite, "same-source-repeated-not-flow");
    expect(open).not.toBeNull();
    expect(open!.day_state).toBe("OPEN");
    expect(open!.still_public_count).toBe(5);
    expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_manila_open_snapshot WHERE day_state = 'CLOSED'").get()).toEqual({ n: 0 });
    const today = manilaDateOf(NOW);
    const loaded = loadSnapshotPair(sqlite);
    const { latestManilaSnapshotPair, sameSourcePairManilaFamilyStatus, sameSourcePairManilaDayFlowCount } = await import("./manila-day");
    const paired = latestManilaSnapshotPair(loaded.counts, loaded.ids, today);
    expect(paired).not.toBeNull();
    expect([...paired!.stillPublicIds].sort((left, right) => left - right)).toEqual(publishedIds);
    const pairSources = ["jobicy:admin", "jobicy:admin", "remotive", "remote-ok", "real-work-from-anywhere"];
    for (const [index, id] of publishedIds.entries()) {
      sqlite.query("UPDATE opportunities SET source_id = ? WHERE id = ?").run(pairSources[index], id);
    }
    const recorded = publishedIds.map((id) => {
      const row = sqlite.query("SELECT source_id AS sourceId FROM opportunities WHERE id = ?").get(id) as { sourceId: string };
      return { id, sourceId: row.sourceId };
    });
    const pairBook = [
      { sourceId: "jobicy:admin", count: 2 },
      { sourceId: "remotive", count: 1 },
      { sourceId: "remote-ok", count: 1 },
      { sourceId: "real-work-from-anywhere", count: 1 },
    ];
    const repeatedIds = [publishedIds[0]!, publishedIds[0]!, publishedIds[1]!, publishedIds[2]!, publishedIds[3]!];
    const nullStatus = sameSourcePairManilaFamilyStatus(5, repeatedIds, recorded, pairBook);
    expect(nullStatus).toBeNull();
    const completed = sameSourcePairManilaDayFlowCount(open!.day_state, nullStatus, 5);
    expect(completed).toBeNull();
    expect(completed).not.toBe(5);
    expect(completed).not.toBe(0);
    expect(sameSourcePairManilaDayFlowCount("CLOSED", nullStatus, 5)).toBeNull();
    expect(sameSourcePairManilaDayFlowCount("OPEN", nullStatus, 100)).toBeNull();
    expect(sameSourcePairManilaDayFlowCount("OPEN", nullStatus, 150)).toBeNull();
    expect(sameSourcePairManilaDayFlowCount("OPEN", nullStatus, null)).toBeNull();
  } finally { sqlite.close(); }
});

test("a repeated still-public id in a same-source breach is not a completed Manila-day flow", async () => {
  const sqlite = freshDb();
  try {
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "same-source-breach-repeated-not-flow", proposedCount: 5,
      persist: async () => {
        const ids = Array.from({ length: 5 }, (_, index) => writeOpportunity(sqlite, `same-source-breach-repeated-not-flow-${index}`, "we-work-remotely")[0]!);
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 5, replayed: false });
    const publishedIds = result.ok ? [...result.ids].sort((left, right) => left - right) : [];
    expect(publishedIds).toHaveLength(5);
    const open = readManilaOpenSnapshot(sqlite, "same-source-breach-repeated-not-flow");
    expect(open).not.toBeNull();
    expect(open!.day_state).toBe("OPEN");
    expect(open!.still_public_count).toBe(5);
    expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_manila_open_snapshot WHERE day_state = 'CLOSED'").get()).toEqual({ n: 0 });
    const today = manilaDateOf(NOW);
    const loaded = loadSnapshotPair(sqlite);
    const { latestManilaSnapshotPair, sameSourcePairManilaFamilyStatus, sameSourcePairManilaDayFlowCount } = await import("./manila-day");
    const paired = latestManilaSnapshotPair(loaded.counts, loaded.ids, today);
    expect(paired).not.toBeNull();
    expect([...paired!.stillPublicIds].sort((left, right) => left - right)).toEqual(publishedIds);
    const breachSources = ["jobicy:admin", "jobicy:admin", "jobicy:admin", "remotive", "remote-ok"];
    for (const [index, id] of publishedIds.entries()) {
      sqlite.query("UPDATE opportunities SET source_id = ? WHERE id = ?").run(breachSources[index], id);
    }
    const recorded = publishedIds.map((id) => {
      const row = sqlite.query("SELECT source_id AS sourceId FROM opportunities WHERE id = ?").get(id) as { sourceId: string };
      return { id, sourceId: row.sourceId };
    });
    const breachBook = [
      { sourceId: "jobicy:admin", count: 3 },
      { sourceId: "remotive", count: 1 },
      { sourceId: "remote-ok", count: 1 },
    ];
    const repeatedIds = [publishedIds[0]!, publishedIds[0]!, publishedIds[1]!, publishedIds[2]!, publishedIds[3]!];
    const nullStatus = sameSourcePairManilaFamilyStatus(5, repeatedIds, recorded, breachBook);
    expect(nullStatus).toBeNull();
    const completed = sameSourcePairManilaDayFlowCount(open!.day_state, nullStatus, 5);
    expect(completed).toBeNull();
    expect(completed).not.toBe(5);
    expect(completed).not.toBe(0);
    expect(sameSourcePairManilaDayFlowCount("CLOSED", nullStatus, 5)).toBeNull();
    expect(sameSourcePairManilaDayFlowCount("OPEN", nullStatus, 100)).toBeNull();
    expect(sameSourcePairManilaDayFlowCount("OPEN", nullStatus, 150)).toBeNull();
    expect(sameSourcePairManilaDayFlowCount("OPEN", nullStatus, null)).toBeNull();
  } finally { sqlite.close(); }
});

test("a same-source pair whose still-public id list contains a foreign id stays absent", async () => {
  const sqlite = freshDb();
  try {
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "same-source-foreign-id", proposedCount: 5,
      persist: async () => {
        const ids = Array.from({ length: 5 }, (_, index) => writeOpportunity(sqlite, `same-source-foreign-id-${index}`, "we-work-remotely")[0]!);
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 5, replayed: false });
    const publishedIds = result.ok ? [...result.ids].sort((left, right) => left - right) : [];
    expect(publishedIds).toHaveLength(5);
    const open = readManilaOpenSnapshot(sqlite, "same-source-foreign-id");
    expect(open).not.toBeNull();
    expect(open!.day_state).toBe("OPEN");
    expect(open!.still_public_count).toBe(5);
    expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_manila_open_snapshot WHERE day_state = 'CLOSED'").get()).toEqual({ n: 0 });
    const today = manilaDateOf(NOW);
    const loaded = loadSnapshotPair(sqlite);
    const { latestManilaSnapshotPair, sameSourcePairManilaFamilyStatus } = await import("./manila-day");
    const paired = latestManilaSnapshotPair(loaded.counts, loaded.ids, today);
    expect(paired).not.toBeNull();
    expect([...paired!.stillPublicIds].sort((left, right) => left - right)).toEqual(publishedIds);
    const pairSources = ["jobicy:admin", "jobicy:admin", "remotive", "remote-ok", "real-work-from-anywhere"];
    for (const [index, id] of publishedIds.entries()) {
      sqlite.query("UPDATE opportunities SET source_id = ? WHERE id = ?").run(pairSources[index], id);
    }
    const recorded = publishedIds.map((id) => {
      const row = sqlite.query("SELECT source_id AS sourceId FROM opportunities WHERE id = ?").get(id) as { sourceId: string };
      return { id, sourceId: row.sourceId };
    });
    const pairBook = [
      { sourceId: "jobicy:admin", count: 2 },
      { sourceId: "remotive", count: 1 },
      { sourceId: "remote-ok", count: 1 },
      { sourceId: "real-work-from-anywhere", count: 1 },
    ];
    const initialStatus = sameSourcePairManilaFamilyStatus(5, paired!.stillPublicIds, recorded, pairBook);
    expect(initialStatus).toBe("OK");
    expect(initialStatus).not.toBe("BREACH");

    const foreignId = Math.max(...publishedIds) + 999;
    const foreignIds = [publishedIds[0]!, publishedIds[1]!, publishedIds[2]!, publishedIds[3]!, foreignId];
    const foreignStatus = sameSourcePairManilaFamilyStatus(5, foreignIds, recorded, pairBook);
    expect(foreignStatus).toBeNull();
    expect(foreignStatus).not.toBe("OK");
    expect(foreignStatus).not.toBe("BREACH");

    const foreignRecorded = [...recorded.slice(0, 4), { id: foreignId, sourceId: "real-work-from-anywhere" }];
    expect(sameSourcePairManilaFamilyStatus(5, paired!.stillPublicIds, foreignRecorded, pairBook)).toBeNull();

    const restoredStatus = sameSourcePairManilaFamilyStatus(5, paired!.stillPublicIds, recorded, pairBook);
    expect(restoredStatus).toBe("OK");
    expect(restoredStatus).not.toBe("BREACH");
    expect(restoredStatus).not.toBeNull();
  } finally { sqlite.close(); }
});

test("a same-source breach whose still-public id list contains a foreign id stays absent", async () => {
  const sqlite = freshDb();
  try {
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "same-source-breach-foreign-id", proposedCount: 5,
      persist: async () => {
        const ids = Array.from({ length: 5 }, (_, index) => writeOpportunity(sqlite, `same-source-breach-foreign-id-${index}`, "we-work-remotely")[0]!);
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 5, replayed: false });
    const publishedIds = result.ok ? [...result.ids].sort((left, right) => left - right) : [];
    expect(publishedIds).toHaveLength(5);
    const open = readManilaOpenSnapshot(sqlite, "same-source-breach-foreign-id");
    expect(open).not.toBeNull();
    expect(open!.day_state).toBe("OPEN");
    expect(open!.still_public_count).toBe(5);
    expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_manila_open_snapshot WHERE day_state = 'CLOSED'").get()).toEqual({ n: 0 });
    const today = manilaDateOf(NOW);
    const loaded = loadSnapshotPair(sqlite);
    const { latestManilaSnapshotPair, sameSourcePairManilaFamilyStatus } = await import("./manila-day");
    const paired = latestManilaSnapshotPair(loaded.counts, loaded.ids, today);
    expect(paired).not.toBeNull();
    expect([...paired!.stillPublicIds].sort((left, right) => left - right)).toEqual(publishedIds);
    const breachSources = ["jobicy:admin", "jobicy:admin", "jobicy:admin", "remotive", "remote-ok"];
    for (const [index, id] of publishedIds.entries()) {
      sqlite.query("UPDATE opportunities SET source_id = ? WHERE id = ?").run(breachSources[index], id);
    }
    const recorded = publishedIds.map((id) => {
      const row = sqlite.query("SELECT source_id AS sourceId FROM opportunities WHERE id = ?").get(id) as { sourceId: string };
      return { id, sourceId: row.sourceId };
    });
    const breachBook = [
      { sourceId: "jobicy:admin", count: 3 },
      { sourceId: "remotive", count: 1 },
      { sourceId: "remote-ok", count: 1 },
    ];
    const initialStatus = sameSourcePairManilaFamilyStatus(5, paired!.stillPublicIds, recorded, breachBook);
    expect(initialStatus).toBe("BREACH");
    expect(initialStatus).not.toBe("OK");

    const foreignId = Math.max(...publishedIds) + 999;
    const foreignIds = [publishedIds[0]!, publishedIds[1]!, publishedIds[2]!, publishedIds[3]!, foreignId];
    const foreignStatus = sameSourcePairManilaFamilyStatus(5, foreignIds, recorded, breachBook);
    expect(foreignStatus).toBeNull();
    expect(foreignStatus).not.toBe("OK");
    expect(foreignStatus).not.toBe("BREACH");

    const foreignRecorded = [...recorded.slice(0, 4), { id: foreignId, sourceId: "remote-ok" }];
    expect(sameSourcePairManilaFamilyStatus(5, paired!.stillPublicIds, foreignRecorded, breachBook)).toBeNull();

    const restoredStatus = sameSourcePairManilaFamilyStatus(5, paired!.stillPublicIds, recorded, breachBook);
    expect(restoredStatus).toBe("BREACH");
    expect(restoredStatus).not.toBe("OK");
    expect(restoredStatus).not.toBeNull();
  } finally { sqlite.close(); }
});

test("a foreign still-public id in a same-source pair is not a completed Manila-day flow", async () => {
  const sqlite = freshDb();
  try {
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "same-source-foreign-not-flow", proposedCount: 5,
      persist: async () => {
        const ids = Array.from({ length: 5 }, (_, index) => writeOpportunity(sqlite, `same-source-foreign-not-flow-${index}`, "we-work-remotely")[0]!);
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 5, replayed: false });
    const publishedIds = result.ok ? [...result.ids].sort((left, right) => left - right) : [];
    expect(publishedIds).toHaveLength(5);
    const open = readManilaOpenSnapshot(sqlite, "same-source-foreign-not-flow");
    expect(open).not.toBeNull();
    expect(open!.day_state).toBe("OPEN");
    expect(open!.still_public_count).toBe(5);
    expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_manila_open_snapshot WHERE day_state = 'CLOSED'").get()).toEqual({ n: 0 });
    const today = manilaDateOf(NOW);
    const loaded = loadSnapshotPair(sqlite);
    const { latestManilaSnapshotPair, sameSourcePairManilaFamilyStatus, sameSourcePairManilaDayFlowCount } = await import("./manila-day");
    const paired = latestManilaSnapshotPair(loaded.counts, loaded.ids, today);
    expect(paired).not.toBeNull();
    expect([...paired!.stillPublicIds].sort((left, right) => left - right)).toEqual(publishedIds);
    const pairSources = ["jobicy:admin", "jobicy:admin", "remotive", "remote-ok", "real-work-from-anywhere"];
    for (const [index, id] of publishedIds.entries()) {
      sqlite.query("UPDATE opportunities SET source_id = ? WHERE id = ?").run(pairSources[index], id);
    }
    const recorded = publishedIds.map((id) => {
      const row = sqlite.query("SELECT source_id AS sourceId FROM opportunities WHERE id = ?").get(id) as { sourceId: string };
      return { id, sourceId: row.sourceId };
    });
    const pairBook = [
      { sourceId: "jobicy:admin", count: 2 },
      { sourceId: "remotive", count: 1 },
      { sourceId: "remote-ok", count: 1 },
      { sourceId: "real-work-from-anywhere", count: 1 },
    ];
    const foreignId = Math.max(...publishedIds) + 999;
    const foreignIds = [publishedIds[0]!, publishedIds[1]!, publishedIds[2]!, publishedIds[3]!, foreignId];
    const nullStatus = sameSourcePairManilaFamilyStatus(5, foreignIds, recorded, pairBook);
    expect(nullStatus).toBeNull();
    const completed = sameSourcePairManilaDayFlowCount(open!.day_state, nullStatus, 5);
    expect(completed).toBeNull();
    expect(completed).not.toBe(5);
    expect(completed).not.toBe(0);
    expect(sameSourcePairManilaDayFlowCount("CLOSED", nullStatus, 5)).toBeNull();
    expect(sameSourcePairManilaDayFlowCount("OPEN", nullStatus, 100)).toBeNull();
    expect(sameSourcePairManilaDayFlowCount("OPEN", nullStatus, 150)).toBeNull();
    expect(sameSourcePairManilaDayFlowCount("OPEN", nullStatus, null)).toBeNull();
  } finally { sqlite.close(); }
});

test("a foreign still-public id in a same-source breach is not a completed Manila-day flow", async () => {
  const sqlite = freshDb();
  try {
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "same-source-breach-foreign-not-flow", proposedCount: 5,
      persist: async () => {
        const ids = Array.from({ length: 5 }, (_, index) => writeOpportunity(sqlite, `same-source-breach-foreign-not-flow-${index}`, "we-work-remotely")[0]!);
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 5, replayed: false });
    const publishedIds = result.ok ? [...result.ids].sort((left, right) => left - right) : [];
    expect(publishedIds).toHaveLength(5);
    const open = readManilaOpenSnapshot(sqlite, "same-source-breach-foreign-not-flow");
    expect(open).not.toBeNull();
    expect(open!.day_state).toBe("OPEN");
    expect(open!.still_public_count).toBe(5);
    expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_manila_open_snapshot WHERE day_state = 'CLOSED'").get()).toEqual({ n: 0 });
    const today = manilaDateOf(NOW);
    const loaded = loadSnapshotPair(sqlite);
    const { latestManilaSnapshotPair, sameSourcePairManilaFamilyStatus, sameSourcePairManilaDayFlowCount } = await import("./manila-day");
    const paired = latestManilaSnapshotPair(loaded.counts, loaded.ids, today);
    expect(paired).not.toBeNull();
    expect([...paired!.stillPublicIds].sort((left, right) => left - right)).toEqual(publishedIds);
    const breachSources = ["jobicy:admin", "jobicy:admin", "jobicy:admin", "remotive", "remote-ok"];
    for (const [index, id] of publishedIds.entries()) {
      sqlite.query("UPDATE opportunities SET source_id = ? WHERE id = ?").run(breachSources[index], id);
    }
    const recorded = publishedIds.map((id) => {
      const row = sqlite.query("SELECT source_id AS sourceId FROM opportunities WHERE id = ?").get(id) as { sourceId: string };
      return { id, sourceId: row.sourceId };
    });
    const breachBook = [
      { sourceId: "jobicy:admin", count: 3 },
      { sourceId: "remotive", count: 1 },
      { sourceId: "remote-ok", count: 1 },
    ];
    const foreignId = Math.max(...publishedIds) + 999;
    const foreignIds = [publishedIds[0]!, publishedIds[1]!, publishedIds[2]!, publishedIds[3]!, foreignId];
    const nullStatus = sameSourcePairManilaFamilyStatus(5, foreignIds, recorded, breachBook);
    expect(nullStatus).toBeNull();
    const completed = sameSourcePairManilaDayFlowCount(open!.day_state, nullStatus, 5);
    expect(completed).toBeNull();
    expect(completed).not.toBe(5);
    expect(completed).not.toBe(0);
    expect(sameSourcePairManilaDayFlowCount("CLOSED", nullStatus, 5)).toBeNull();
    expect(sameSourcePairManilaDayFlowCount("OPEN", nullStatus, 100)).toBeNull();
    expect(sameSourcePairManilaDayFlowCount("OPEN", nullStatus, 150)).toBeNull();
    expect(sameSourcePairManilaDayFlowCount("OPEN", nullStatus, null)).toBeNull();
  } finally { sqlite.close(); }
});

test("a rejected snapshot id row is not an empty same-source book", async () => {
  const sqlite = freshDb();
  try {
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "rejected-snapshot-ids-not-empty", proposedCount: 5,
      persist: async () => {
        const ids = Array.from({ length: 5 }, (_, index) => writeOpportunity(sqlite, `rejected-snapshot-ids-not-empty-${index}`, "we-work-remotely")[0]!);
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 5, replayed: false });
    const publishedIds = result.ok ? [...result.ids].sort((left, right) => left - right) : [];
    expect(publishedIds).toHaveLength(5);
    const open = readManilaOpenSnapshot(sqlite, "rejected-snapshot-ids-not-empty");
    expect(open).not.toBeNull();
    expect(open!.day_state).toBe("OPEN");
    expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_manila_open_snapshot WHERE day_state = 'CLOSED'").get()).toEqual({ n: 0 });
    const today = manilaDateOf(NOW);
    const breachSources = ["jobicy:admin", "jobicy:admin", "jobicy:admin", "remotive", "remote-ok"];
    for (const [index, id] of publishedIds.entries()) {
      sqlite.query("UPDATE opportunities SET source_id = ? WHERE id = ?").run(breachSources[index], id);
    }
    const recorded = publishedIds.map((id) => {
      const row = sqlite.query("SELECT source_id AS sourceId FROM opportunities WHERE id = ?").get(id) as { sourceId: string };
      return { id, sourceId: row.sourceId };
    });
    const breachBook = [
      { sourceId: "jobicy:admin", count: 3 },
      { sourceId: "remotive", count: 1 },
      { sourceId: "remote-ok", count: 1 },
    ];
    const readers = await import("./manila-day");
    const intact = readers.latestManilaSnapshotPair(loadSnapshotPair(sqlite).counts, loadSnapshotPair(sqlite).ids, today);
    expect(intact).not.toBeNull();
    expect(intact!.idsKnown).toBe(true);
    expect(readers.sameSourcePairManilaFamilyStatus(5, intact!.stillPublicIds, recorded, breachBook)).toBe("BREACH");

    const foreignId = Math.max(...publishedIds) + 999;
    const rejectedStill = [publishedIds[0]!, publishedIds[1]!, publishedIds[2]!, publishedIds[3]!, foreignId];
    sqlite.exec("DROP TRIGGER IF EXISTS source_publication_manila_snapshot_ids_append_only_update;");
    sqlite.query("UPDATE source_publication_manila_snapshot_ids SET still_public_ids_json = ? WHERE retry_key = ?").run(
      JSON.stringify(rejectedStill),
      "rejected-snapshot-ids-not-empty",
    );
    const rejected = readers.latestManilaSnapshotPair(loadSnapshotPair(sqlite).counts, loadSnapshotPair(sqlite).ids, today);
    expect(rejected).not.toBeNull();
    expect(rejected!.idsKnown).toBe(false);
    expect(rejected!.stillPublicIds).toEqual([]);
    expect(rejected!.firstPublishIds).toEqual([]);
    expect(readers.sameSourcePairManilaFamilyStatus(null, [], [], [])).toBe("UNKNOWN");
    expect(readers.sameSourcePairManilaFamilyStatus(null, rejected!.stillPublicIds, [], [])).toBe("UNKNOWN");

    const loadedStatus = readers.loadedSameSourcePairManilaFamilyStatus;
    expect(typeof loadedStatus).toBe("function");
    const absent = loadedStatus(rejected, 5, recorded, breachBook);
    expect(absent).toBeNull();
    expect(absent).not.toBe("UNKNOWN");
    expect(absent).not.toBe("BREACH");
    expect(loadedStatus(intact, 5, recorded, breachBook)).toBe("BREACH");
    expect(readers.sameSourcePairManilaDayFlowCount(open!.day_state, absent, 5)).toBeNull();
    expect(readers.sameSourcePairManilaDayFlowCount("CLOSED", absent, 5)).toBeNull();
  } finally { sqlite.close(); }
});

test("a rejected snapshot id row is not a reportable count", async () => {
  const sqlite = freshDb();
  try {
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "rejected-snapshot-ids-not-count", proposedCount: 5,
      persist: async () => {
        const ids = Array.from({ length: 5 }, (_, index) => writeOpportunity(sqlite, `rejected-snapshot-ids-not-count-${index}`, "we-work-remotely")[0]!);
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 5, replayed: false });
    const publishedIds = result.ok ? [...result.ids].sort((left, right) => left - right) : [];
    expect(publishedIds).toHaveLength(5);
    const open = readManilaOpenSnapshot(sqlite, "rejected-snapshot-ids-not-count");
    expect(open).not.toBeNull();
    expect(open!.day_state).toBe("OPEN");
    expect(open!.first_publish_count).toBe(5);
    expect(open!.still_public_count).toBe(5);
    expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_manila_open_snapshot WHERE day_state = 'CLOSED'").get()).toEqual({ n: 0 });
    const today = manilaDateOf(NOW);
    const readers = await import("./manila-day");
    const intact = readers.latestManilaSnapshotPair(loadSnapshotPair(sqlite).counts, loadSnapshotPair(sqlite).ids, today);
    expect(intact).not.toBeNull();
    expect(intact!.idsKnown).toBe(true);
    expect(readers.reportableManilaSnapshotIdCount(intact)).toBe(5);
    expect(readers.agreedManilaSnapshotIdCount(open!.first_publish_count, intact)).toBe(5);
    expect(readers.agreedManilaStillPublicCount(open!.still_public_count, intact)).toBe(5);

    const foreignId = Math.max(...publishedIds) + 999;
    const rejectedStill = [publishedIds[0]!, publishedIds[1]!, publishedIds[2]!, publishedIds[3]!, foreignId];
    sqlite.exec("DROP TRIGGER IF EXISTS source_publication_manila_snapshot_ids_append_only_update;");
    sqlite.query("UPDATE source_publication_manila_snapshot_ids SET still_public_ids_json = ? WHERE retry_key = ?").run(
      JSON.stringify(rejectedStill),
      "rejected-snapshot-ids-not-count",
    );
    const rejected = readers.latestManilaSnapshotPair(loadSnapshotPair(sqlite).counts, loadSnapshotPair(sqlite).ids, today);
    expect(rejected).not.toBeNull();
    expect(rejected!.idsKnown).toBe(false);
    expect(rejected!.stillPublicIds).toEqual([]);
    expect(rejected!.firstPublishIds).toEqual([]);
    const counted = readManilaOpenSnapshot(sqlite, "rejected-snapshot-ids-not-count");
    expect(counted).not.toBeNull();
    expect(counted!.first_publish_count).toBe(5);
    expect(counted!.still_public_count).toBe(5);
    const reported = readers.reportableManilaSnapshotIdCount(rejected);
    expect(reported).toBeNull();
    expect(reported).not.toBe(5);
    expect(reported).not.toBe(0);
    expect(reported).not.toBe(rejected!.firstPublishIds.length);
    expect(readers.agreedManilaSnapshotIdCount(counted!.first_publish_count, rejected)).toBeNull();
    expect(readers.agreedManilaStillPublicCount(counted!.still_public_count, rejected)).toBeNull();
    expect(readers.reportableManilaSnapshotIdCount(intact)).toBe(5);
    const flow = readers.completedManilaDayFlowCount(counted!.day_state, counted!.first_publish_count);
    expect(flow).toBeNull();
    expect(flow).not.toBe(5);
    expect(flow).not.toBe(0);
    expect(readers.completedManilaDayFlowCount("CLOSED", counted!.first_publish_count)).toBeNull();
    expect(readers.completedManilaDayFlowCount(counted!.day_state, 100)).toBeNull();
    expect(readers.completedManilaDayFlowCount(counted!.day_state, 150)).toBeNull();
  } finally { sqlite.close(); }
});

test("a rejected snapshot id row is not a measured zero", async () => {
  const sqlite = freshDb();
  try {
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "rejected-snapshot-ids-not-zero", proposedCount: 5,
      persist: async () => {
        const ids = Array.from({ length: 5 }, (_, index) => writeOpportunity(sqlite, `rejected-snapshot-ids-not-zero-${index}`, "we-work-remotely")[0]!);
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 5, replayed: false });
    const publishedIds = result.ok ? [...result.ids].sort((left, right) => left - right) : [];
    expect(publishedIds).toHaveLength(5);
    const today = manilaDateOf(NOW);
    const readers = await import("./manila-day");
    const foreignId = Math.max(...publishedIds) + 999;
    const rejectedStill = [publishedIds[0]!, publishedIds[1]!, publishedIds[2]!, publishedIds[3]!, foreignId];
    sqlite.exec("DROP TRIGGER IF EXISTS source_publication_manila_snapshot_ids_append_only_update;");
    sqlite.query("UPDATE source_publication_manila_snapshot_ids SET still_public_ids_json = ? WHERE retry_key = ?").run(
      JSON.stringify(rejectedStill),
      "rejected-snapshot-ids-not-zero",
    );
    const rejected = readers.latestManilaSnapshotPair(loadSnapshotPair(sqlite).counts, loadSnapshotPair(sqlite).ids, today);
    expect(rejected).not.toBeNull();
    expect(rejected!.idsKnown).toBe(false);
    expect(readers.reportableManilaSnapshotIdCount(rejected)).toBeNull();
    const stillZero = readers.agreedManilaStillPublicCount(0, rejected);
    expect(stillZero).toBeNull();
    expect(stillZero).not.toBe(0);
    const firstZero = readers.agreedManilaSnapshotIdCount(0, rejected);
    expect(firstZero).toBeNull();
    expect(firstZero).not.toBe(0);
    expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_manila_open_snapshot WHERE day_state = 'CLOSED'").get()).toEqual({ n: 0 });

    const later = new Date(Date.parse(NOW) + 60_000).toISOString();
    sqlite.query(`INSERT INTO source_publication_manila_open_snapshot (
      source_id, tick_key, retry_key, manila_date, day_state, first_publish_count, still_public_count, recorded_at
    ) VALUES ('we-work-remotely', ?, 'rejected-snapshot-ids-known-empty', ?, 'OPEN', 0, 0, ?)`).run(TICK, today, later);
    sqlite.query(`INSERT INTO source_publication_manila_snapshot_ids (
      source_id, tick_key, retry_key, manila_date, first_publish_ids_json, still_public_ids_json, recorded_at
    ) VALUES ('we-work-remotely', ?, 'rejected-snapshot-ids-known-empty', ?, '[]', '[]', ?)`).run(TICK, today, later);
    const knownEmpty = readers.latestManilaSnapshotPair(loadSnapshotPair(sqlite).counts, loadSnapshotPair(sqlite).ids, today);
    expect(knownEmpty).not.toBeNull();
    expect(knownEmpty!.idsKnown).toBe(true);
    expect(knownEmpty!.retryKey).toBe("rejected-snapshot-ids-known-empty");
    expect(knownEmpty!.firstPublishIds).toEqual([]);
    expect(knownEmpty!.stillPublicIds).toEqual([]);
    expect(readers.reportableManilaSnapshotIdCount(knownEmpty)).toBe(0);
    expect(readers.agreedManilaSnapshotIdCount(0, knownEmpty)).toBe(0);
    expect(readers.agreedManilaStillPublicCount(0, knownEmpty)).toBe(0);
    expect(readers.agreedManilaStillPublicCount(0, rejected)).toBeNull();
    expect(readers.completedManilaDayFlowCount("OPEN", 0)).toBeNull();
    expect(readers.completedManilaDayFlowCount("CLOSED", 0)).toBeNull();
  } finally { sqlite.close(); }
});

test("a rejected snapshot zero is not an empty same-source book", async () => {
  const sqlite = freshDb();
  try {
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "rejected-snapshot-zero-not-empty", proposedCount: 5,
      persist: async () => {
        const ids = Array.from({ length: 5 }, (_, index) => writeOpportunity(sqlite, `rejected-snapshot-zero-not-empty-${index}`, "we-work-remotely")[0]!);
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 5, replayed: false });
    const publishedIds = result.ok ? [...result.ids].sort((left, right) => left - right) : [];
    expect(publishedIds).toHaveLength(5);
    const today = manilaDateOf(NOW);
    const readers = await import("./manila-day");
    const foreignId = Math.max(...publishedIds) + 999;
    sqlite.exec("DROP TRIGGER IF EXISTS source_publication_manila_snapshot_ids_append_only_update;");
    sqlite.query("UPDATE source_publication_manila_snapshot_ids SET still_public_ids_json = ? WHERE retry_key = ?").run(
      JSON.stringify([publishedIds[0]!, publishedIds[1]!, publishedIds[2]!, publishedIds[3]!, foreignId]),
      "rejected-snapshot-zero-not-empty",
    );
    const rejected = readers.latestManilaSnapshotPair(loadSnapshotPair(sqlite).counts, loadSnapshotPair(sqlite).ids, today);
    expect(rejected).not.toBeNull();
    expect(rejected!.idsKnown).toBe(false);
    const absent = readers.loadedSameSourcePairManilaFamilyStatus(rejected, 0, [], []);
    expect(absent).toBeNull();
    expect(absent).not.toBe("UNKNOWN");
    expect(readers.sameSourcePairManilaFamilyStatus(0, [], [], [])).toBe("UNKNOWN");
    expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_manila_open_snapshot WHERE day_state = 'CLOSED'").get()).toEqual({ n: 0 });

    const later = new Date(Date.parse(NOW) + 60_000).toISOString();
    sqlite.query(`INSERT INTO source_publication_manila_open_snapshot (
      source_id, tick_key, retry_key, manila_date, day_state, first_publish_count, still_public_count, recorded_at
    ) VALUES ('we-work-remotely', ?, 'rejected-snapshot-zero-known-empty', ?, 'OPEN', 0, 0, ?)`).run(TICK, today, later);
    sqlite.query(`INSERT INTO source_publication_manila_snapshot_ids (
      source_id, tick_key, retry_key, manila_date, first_publish_ids_json, still_public_ids_json, recorded_at
    ) VALUES ('we-work-remotely', ?, 'rejected-snapshot-zero-known-empty', ?, '[]', '[]', ?)`).run(TICK, today, later);
    const knownEmpty = readers.latestManilaSnapshotPair(loadSnapshotPair(sqlite).counts, loadSnapshotPair(sqlite).ids, today);
    expect(knownEmpty).not.toBeNull();
    expect(knownEmpty!.idsKnown).toBe(true);
    expect(readers.loadedSameSourcePairManilaFamilyStatus(knownEmpty, 0, [], [])).toBe("UNKNOWN");
    expect(readers.loadedSameSourcePairManilaFamilyStatus(rejected, 0, [], [])).toBeNull();
    expect(readers.sameSourcePairManilaDayFlowCount("OPEN", absent, 0)).toBeNull();
    expect(readers.sameSourcePairManilaDayFlowCount("CLOSED", absent, 0)).toBeNull();
  } finally { sqlite.close(); }
});

test("a rejected snapshot null count is not an empty same-source book", async () => {
  const sqlite = freshDb();
  try {
    const result = await publishPublicExposure(new BunDb(sqlite), {
      sourceId: "we-work-remotely", now: NOW, tickKey: TICK, retryKey: "rejected-snapshot-null-not-empty", proposedCount: 5,
      persist: async () => {
        const ids = Array.from({ length: 5 }, (_, index) => writeOpportunity(sqlite, `rejected-snapshot-null-not-empty-${index}`, "we-work-remotely")[0]!);
        return { publishedCount: ids.length, ids };
      },
    });
    expect(result).toMatchObject({ ok: true, mode: "unlimited", publishedCount: 5, replayed: false });
    const publishedIds = result.ok ? [...result.ids].sort((left, right) => left - right) : [];
    expect(publishedIds).toHaveLength(5);
    const today = manilaDateOf(NOW);
    const readers = await import("./manila-day");
    const foreignId = Math.max(...publishedIds) + 999;
    sqlite.exec("DROP TRIGGER IF EXISTS source_publication_manila_snapshot_ids_append_only_update;");
    sqlite.query("UPDATE source_publication_manila_snapshot_ids SET still_public_ids_json = ? WHERE retry_key = ?").run(
      JSON.stringify([publishedIds[0]!, publishedIds[1]!, publishedIds[2]!, publishedIds[3]!, foreignId]),
      "rejected-snapshot-null-not-empty",
    );
    const rejected = readers.latestManilaSnapshotPair(loadSnapshotPair(sqlite).counts, loadSnapshotPair(sqlite).ids, today);
    expect(rejected).not.toBeNull();
    expect(rejected!.idsKnown).toBe(false);
    const absent = readers.loadedSameSourcePairManilaFamilyStatus(rejected, null, [], []);
    expect(absent).toBeNull();
    expect(absent).not.toBe("UNKNOWN");
    expect(readers.sameSourcePairManilaFamilyStatus(null, [], [], [])).toBe("UNKNOWN");
    expect(readers.loadedSameSourcePairManilaFamilyStatus(rejected, 0, [], [])).toBeNull();
    expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_manila_open_snapshot WHERE day_state = 'CLOSED'").get()).toEqual({ n: 0 });

    const later = new Date(Date.parse(NOW) + 60_000).toISOString();
    sqlite.query(`INSERT INTO source_publication_manila_open_snapshot (
      source_id, tick_key, retry_key, manila_date, day_state, first_publish_count, still_public_count, recorded_at
    ) VALUES ('we-work-remotely', ?, 'rejected-snapshot-null-known-empty', ?, 'OPEN', 0, 0, ?)`).run(TICK, today, later);
    sqlite.query(`INSERT INTO source_publication_manila_snapshot_ids (
      source_id, tick_key, retry_key, manila_date, first_publish_ids_json, still_public_ids_json, recorded_at
    ) VALUES ('we-work-remotely', ?, 'rejected-snapshot-null-known-empty', ?, '[]', '[]', ?)`).run(TICK, today, later);
    const knownEmpty = readers.latestManilaSnapshotPair(loadSnapshotPair(sqlite).counts, loadSnapshotPair(sqlite).ids, today);
    expect(knownEmpty).not.toBeNull();
    expect(knownEmpty!.idsKnown).toBe(true);
    expect(readers.loadedSameSourcePairManilaFamilyStatus(knownEmpty, null, [], [])).toBe("UNKNOWN");
    expect(readers.loadedSameSourcePairManilaFamilyStatus(rejected, null, [], [])).toBeNull();
    expect(readers.sameSourcePairManilaDayFlowCount("OPEN", absent, null)).toBeNull();
    expect(readers.sameSourcePairManilaDayFlowCount("CLOSED", absent, null)).toBeNull();
    expect(readers.sameSourcePairManilaDayFlowCount("OPEN", absent, 100)).toBeNull();
    expect(readers.sameSourcePairManilaDayFlowCount("OPEN", absent, 150)).toBeNull();
  } finally { sqlite.close(); }
});


