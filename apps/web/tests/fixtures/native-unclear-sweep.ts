import { Database } from "bun:sqlite";
import { setSystemTime } from "bun:test";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { getDb, opportunities } from "@va-hub/db";
import { publicOpportunityFilters } from "../../src/lib/public-opportunities";
import { sweepUnclearBacklog } from "../../src/pages/api/cron/scrape";

const REFERENCE = "2026-10-10T12:00:00.000Z";
const FRESH = "2026-10-09T12:00:00.000Z";
const BOUNDARY = "2026-09-10T12:00:00.000Z";
const STALE = "2026-09-09T12:00:00.000Z";
const DRIFT_URL = "https://www.realworkfromanywhere.com/jobs/native-unclear-drift";
const CLOCK_SCOPE = "CLOCK_PROJECTED_NATIVE_TRIGGERS_NOT_BYTE_IDENTICAL_RUNTIME_PROOF";
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

type Seed = {
  label: string;
  sourceId: string;
  sourceUrl: string;
  locationType: "remote" | "hybrid" | "onsite" | null;
  postedAt: string | null;
  applicationUrl?: string | null;
};

const seeds: Seed[] = [
  { label: "valid-fresh", sourceId: "remotive", sourceUrl: "https://remotive.com/remote-jobs/customer-support/native-unclear-valid", locationType: "remote", postedAt: FRESH },
  { label: "valid-boundary", sourceId: "we-work-remotely", sourceUrl: "https://weworkremotely.com/remote-jobs/native-unclear-boundary", locationType: "remote", postedAt: BOUNDARY },
  { label: "onsite", sourceId: "jobicy-admin-support-apac", sourceUrl: "https://jobicy.com/jobs/native-unclear-onsite", locationType: "onsite", postedAt: FRESH },
  { label: "hybrid", sourceId: "remotive", sourceUrl: "https://remotive.com/remote-jobs/customer-support/native-unclear-hybrid", locationType: "hybrid", postedAt: FRESH },
  { label: "null-workplace", sourceId: "remotive", sourceUrl: "https://remotive.com/remote-jobs/customer-support/native-unclear-null-workplace", locationType: null, postedAt: FRESH },
  { label: "missing-date", sourceId: "remotive", sourceUrl: "https://remotive.com/remote-jobs/customer-support/native-unclear-missing-date", locationType: "remote", postedAt: null },
  { label: "impossible-date", sourceId: "remotive", sourceUrl: "https://remotive.com/remote-jobs/customer-support/native-unclear-impossible", locationType: "remote", postedAt: "2026-09-31T12:00:00.000Z" },
  { label: "stale-date", sourceId: "jobicy-supporting-apac", sourceUrl: "https://jobicy.com/jobs/native-unclear-stale", locationType: "remote", postedAt: STALE },
  { label: "future-date", sourceId: "remotive", sourceUrl: "https://remotive.com/remote-jobs/customer-support/native-unclear-future", locationType: "remote", postedAt: "2026-10-10T12:00:00.001Z" },
  { label: "unsafe-url", sourceId: "remotive", sourceUrl: "not-a-url", locationType: "remote", postedAt: FRESH },
  { label: "opted-out", sourceId: "remote-ok", sourceUrl: "https://remoteok.com/remote-jobs/native-unclear-opt-out", locationType: "remote", postedAt: FRESH },
  { label: "unregistered", sourceId: "greenhouse:not-admitted", sourceUrl: "https://boards.greenhouse.io/not-admitted/jobs/native-unclear", locationType: "remote", postedAt: FRESH },
  { label: "date-drift", sourceId: "real-work-from-anywhere", sourceUrl: DRIFT_URL, locationType: "remote", postedAt: FRESH },
];

setSystemTime(new Date(REFERENCE));
globalThis.fetch = (() => {
  throw new Error("unclear sweep fixture rejects every network request");
}) as unknown as typeof fetch;
const sqlite = new Database(":memory:");
try {
  const migrations = join(import.meta.dir, "../../../../packages/db/migrations");
  for (const name of readdirSync(migrations).filter((file) => /^\d{4}_.+\.sql$/.test(file)).sort()) {
    sqlite.exec(readFileSync(join(migrations, name), "utf8"));
  }
  const ledgerTriggers = sqlite.query("SELECT name, sql FROM sqlite_schema WHERE type = 'trigger' AND tbl_name = 'source_publication_ledger' ORDER BY name")
    .all() as Array<{ name: string; sql: string }>;
  const literal = "julianday('now')";
  const fixedLiteral = `julianday('${REFERENCE}')`;
  let replacementCount = 0;
  const clockProjection = ledgerTriggers.map((trigger) => {
    const count = trigger.sql.split(literal).length - 1;
    replacementCount += count;
    const projected = trigger.sql.split(literal).join(fixedLiteral);
    if (projected.split(fixedLiteral).join(literal) !== trigger.sql) throw new Error("clock projection is not exactly reversible");
    if (count) {
      if (!/^source_publication_ledger_[a-z_]+$/.test(trigger.name)) throw new Error("unexpected fixture trigger identity");
      sqlite.exec(`DROP TRIGGER "${trigger.name}"`);
      sqlite.exec(projected);
      const actual = sqlite.query("SELECT sql FROM sqlite_schema WHERE type = 'trigger' AND name = ?").get(trigger.name) as { sql: string };
      if (actual.sql !== projected) throw new Error("native trigger projection changed another expression");
    }
    return { name: trigger.name, replacements: count, originalSha256: sha256(trigger.sql), projectedSha256: sha256(projected) };
  });
  if (replacementCount !== 1) throw new Error("unexpected production ledger clock expression count");
  sqlite.exec("DELETE FROM source_registry; DELETE FROM source_opt_outs; DELETE FROM opportunities;");
  sqlite.query("INSERT INTO source_opt_outs (source_id, reason, created_at) VALUES (?, ?, ?)").run("remote-ok", "native unclear sweep fixture", REFERENCE);
  const insert = sqlite.query(`INSERT INTO opportunities (
    title, company, type, source_url, source_platform, source_id, content_hash, category,
    location_type, description, posted_at, scraped_at, is_active, ph_eligibility, geo_checked_at, updated_at, location_raw
  ) VALUES (?, 'Native Sweep Co', 'freelance', ?, 'Native', ?, ?, 'support', ?, 'Remote role open to applicants in the Philippines.', ?, ?, 1, 'unclear', ?, ?, 'Remote')`);
  seeds.forEach((seed, index) => {
    insert.run(
      seed.label,
      seed.sourceUrl,
      seed.sourceId,
      sha256(seed.sourceUrl),
      seed.locationType,
      seed.postedAt,
      REFERENCE,
      `2026-10-10T00:00:${String(index).padStart(2, "0")}.000Z`,
      REFERENCE,
    );
  });

  const queries: string[] = [];
  let driftMutations = 0;
  const binding = { prepare(query: string) {
    queries.push(query);
    const statement = sqlite.query(query);
    let params: any[] = [];
    const driftBeforeWrite = () => {
      if (/^update\s+"opportunities"/i.test(query) && params.includes(DRIFT_URL)) {
        driftMutations += 1;
        sqlite.query("UPDATE opportunities SET posted_at = ? WHERE source_url = ?").run(STALE, DRIFT_URL);
      }
    };
    return {
      bind(...values: any[]) { params = values; return this; },
      async first() { return statement.get(...params); },
      async all() { driftBeforeWrite(); return { results: statement.all(...params) }; },
      async raw() { driftBeforeWrite(); return statement.values(...params); },
      async run() {
        driftBeforeWrite();
        const result = statement.run(...params);
        return { success: true, meta: { changes: result.changes } };
      },
    };
  } };
  const db = getDb({ DB: binding as any });
  let aiCalls = 0;
  const env = { DB: binding, AI: { run: async () => {
    aiCalls += 1;
    return { response: JSON.stringify({ eligibleForFilipinos: true, eligible: true, reason: "Open to applicants in the Philippines", category: "support" }) };
  } } };
  let thrown: string | null = null;
  let stats: unknown = null;
  try {
    stats = await sweepUnclearBacklog(db, env, REFERENCE, seeds.length);
  } catch (error) {
    thrown = error instanceof Error ? error.name : "unknown";
  }
  const visible = await db.select({ id: opportunities.id }).from(opportunities).where(publicOpportunityFilters());
  const result = {
    scope: { persistence: "ACTUAL_SWEEP_DRIZZLE_NATIVE_SQLITE_FTS_GATEWAY", transport: "DENIED",
      clock: CLOCK_SCOPE, reference: REFERENCE, replacementCount, clockProjection,
      limitation: "Synthetic AI and one fixture-owned date mutation. No live D1, provider, or browser evidence." },
    thrown, stats, aiCalls, driftMutations,
    rows: sqlite.query(`SELECT id, title, is_active AS active, ph_eligibility AS eligibility, location_type AS type,
      source_id AS source, source_url AS sourceUrl, posted_at AS postedAt FROM opportunities ORDER BY id`).all(),
    visible,
    ledger: sqlite.query("SELECT source_id AS source, mode, published_count AS n, published_ids_json AS ids FROM source_publication_ledger ORDER BY id").all(),
    transports: 0,
  };
  console.log(`NATIVE_UNCLEAR_SWEEP_RESULT ${JSON.stringify(result)}`);
} finally { sqlite.close(); setSystemTime(); }
