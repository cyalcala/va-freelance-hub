import { Database } from "bun:sqlite";
import { setSystemTime } from "bun:test";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { getDb, opportunities } from "@va-hub/db";
import { D1_MAX_BOUND_PARAMETERS } from "@va-hub/scraper";
import { publicOpportunityFilters } from "../../src/lib/public-opportunities";
import { POST } from "../../src/pages/api/ingest";

const REFERENCE = "2026-10-10T12:00:00.000Z";
const FRESH = "2026-10-09T12:00:00.000Z";
type Group = { source: "remotive" | "remote-ok" | "jobicy-admin-support-apac"; dates: Array<string | null> };
const scenario = JSON.parse(process.argv[2]!) as {
  groups: Group[]; retryAndDedup?: boolean; duplicateAcrossChunks?: boolean; canaryCap?: number; canaryDifferentRetry?: boolean;
  failBeforeInsert?: number; failAfterInsert?: number;
};
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
let transportAttempts = 0;
globalThis.fetch = (async (_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> => {
  transportAttempts++;
  throw new Error("native direct ingest fixture rejects every network request");
}) as typeof fetch;
setSystemTime(new Date(REFERENCE));
const sqlite = new Database(":memory:");
try {
  const migrations = join(import.meta.dir, "../../../../packages/db/migrations");
  for (const name of readdirSync(migrations).filter(name => /^\d{4}_.+\.sql$/.test(name)).sort()) {
    const migration = readFileSync(join(migrations, name), "utf8");
    if (scenario.canaryCap && name === "0039_canary_transition_plane.sql") {
      const start = migration.indexOf("CREATE TRIGGER IF NOT EXISTS source_registry_initial_state_is_dormant");
      if (start < 0) throw new Error("canary fixture setup boundary no longer exists");
      const prefix = migration.slice(0, start);
      const suffix = migration.slice(start);
      if (prefix + suffix !== migration) throw new Error("fixture split changed migration bytes");
      // Complete the synthetic initial row after the cap column exists and
      // before admission/immutability guards are installed. Every statement is
      // executed unchanged; all guards are present before the actual handler.
      sqlite.exec(prefix);
      sqlite.query("UPDATE source_registry SET canary_max_new_items_per_tick = ? WHERE source_id = 'remotive'").run(scenario.canaryCap);
      sqlite.exec(suffix);
    } else sqlite.exec(migration);
    if (scenario.canaryCap && name === "0036_registry_foundation.sql") {
      // Synthetic initial state is seeded before lifecycle triggers exist.
      // This is a cap-consumer test, never source-admission evidence. All
      // migration bytes and final lifecycle/reservation triggers stay intact.
      sqlite.query(`INSERT INTO provider_profiles (id, display_name, provider_family, mechanism, auth_class,
        default_compliance_state, default_operational_state)
        VALUES ('native-ingest-fixture', 'Fixture', 'fixture', 'rss_feed', 'none', 'allowed', 'candidate')`).run();
      sqlite.query(`INSERT INTO source_registry (source_id, provider_id, display_name, endpoint_url,
        compliance_state, operational_state, policy_expiry)
        VALUES ('remotive', 'native-ingest-fixture', 'Fixture', 'https://remotive.com/remote-jobs/feed',
        'allowed', 'canary', '2027-01-01T00:00:00.000Z')`).run();
    }
  }
  const literal = "julianday('now')";
  const fixedLiteral = `julianday('${REFERENCE}')`;
  let replacementCount = 0;
  const triggers = sqlite.query("SELECT name, sql FROM sqlite_schema WHERE type = 'trigger' AND tbl_name = 'source_publication_ledger' ORDER BY name")
    .all() as Array<{ name: string; sql: string }>;
  const clockProjection = triggers.map(trigger => {
    const count = trigger.sql.split(literal).length - 1;
    replacementCount += count;
    const projected = trigger.sql.split(literal).join(fixedLiteral);
    if (projected.split(fixedLiteral).join(literal) !== trigger.sql) throw new Error("clock projection is not exactly reversible");
    if (count) {
      if (!/^source_publication_ledger_[a-z_]+$/.test(trigger.name)) throw new Error("unexpected projected trigger identity");
      sqlite.exec(`DROP TRIGGER "${trigger.name}"`);
      sqlite.exec(projected);
      const actual = sqlite.query("SELECT sql FROM sqlite_schema WHERE type = 'trigger' AND name = ?").get(trigger.name) as { sql: string };
      if (actual.sql !== projected) throw new Error("clock projection changed another expression");
    }
    return { name: trigger.name, replacements: count, originalSha256: sha256(trigger.sql), projectedSha256: sha256(projected) };
  });
  if (replacementCount !== 1) throw new Error("unexpected production ledger clock expression count");
  if (!scenario.canaryCap) sqlite.exec("DELETE FROM source_registry;");
  sqlite.exec("DELETE FROM source_opt_outs; DELETE FROM opportunities;");

  const bindingAttempts: Array<{ opportunityInsert: boolean; parameters: number; rejected: boolean }> = [];
  const returnedInsertIds: number[][] = [];
  const executedInsertIds: number[][] = [];
  const insertFailures: Array<{ ordinal: number; phase: "before-write" | "after-write" }> = [];
  let insertOrdinal = 0;
  const binding = { prepare(query: string) {
    const statement = sqlite.query(query);
    const opportunityInsert = /^insert into "opportunities"/i.test(query);
    let params: any[] = [];
    return {
      bind(...values: any[]) {
        const rejected = values.length > D1_MAX_BOUND_PARAMETERS;
        bindingAttempts.push({ opportunityInsert, parameters: values.length, rejected });
        if (rejected) throw new Error(`D1_BINDING_BUDGET_EXCEEDED:${values.length}>${D1_MAX_BOUND_PARAMETERS}`);
        params = values;
        return this;
      },
      async first() { return statement.get(...params); },
      async all() { return { results: statement.all(...params) }; },
      async raw() {
        if (opportunityInsert) {
          insertOrdinal++;
          if (insertOrdinal === scenario.failBeforeInsert) {
            insertFailures.push({ ordinal: insertOrdinal, phase: "before-write" });
            throw new Error("synthetic later opportunity INSERT failure before write");
          }
        }
        const rows = statement.values(...params);
        if (opportunityInsert) {
          const ids = rows.map(row => Number(row[0]));
          executedInsertIds.push(ids);
          if (insertOrdinal === scenario.failAfterInsert) {
            insertFailures.push({ ordinal: insertOrdinal, phase: "after-write" });
            throw new Error("synthetic later opportunity INSERT lost acknowledgement");
          }
          returnedInsertIds.push(ids);
        }
        return rows;
      },
      async run() {
        const result = statement.run(...params);
        return { success: true, meta: { changes: result.changes } };
      },
    };
  } };
  const db = getDb({ DB: binding as any });
  const items = scenario.groups.flatMap(group => {
    if (!["remotive", "remote-ok", "jobicy-admin-support-apac"].includes(group.source)) throw new Error("unsupported fixture source");
    return group.dates.map((postedAt, index) => {
      const sourceUrl = group.source === "remote-ok" ? `https://remoteok.com/remote-jobs/native-ingest-${index}`
        : group.source === "jobicy-admin-support-apac" ? `https://jobicy.com/jobs/native-ingest-${index}`
        : `https://remotive.com/remote-jobs/customer-support/native-ingest-${index}`;
      return { title: `Customer Support ${group.source} ${index}`, company: "Native Ingest Fixture Co", type: "freelance",
        sourceId: group.source, sourcePlatform: group.source, sourceUrl, applicationUrl: sourceUrl,
        description: "Remote role open to applicants in the Philippines.", locationRaw: "Philippines", locationType: "remote",
        postedAt, scrapedAt: REFERENCE, lastSeenInFeedAt: REFERENCE, tags: ["remote"], category: "support" };
    });
  });
  if (scenario.duplicateAcrossChunks) items[items.length - 1] = { ...items[0]! };
  const replies: unknown[] = [];
  async function send(now: string, input = items) {
    setSystemTime(new Date(now));
    const boundStart = bindingAttempts.length;
    const returnedStart = returnedInsertIds.length;
    const executedStart = executedInsertIds.length;
    const response = await POST({ request: new Request("https://example.test/api/ingest", { method: "POST",
      headers: { authorization: "Bearer synthetic-ingest-secret", "content-type": "application/json" }, body: JSON.stringify({ items: input }) }),
      locals: { runtime: { env: { DB: binding, PROXY_SECRET: "synthetic-ingest-secret" } } } } as any);
    const visible = await db.select({ id: opportunities.id }).from(opportunities).where(publicOpportunityFilters());
    replies.push({ now, status: response.status, body: await response.json(),
      rows: sqlite.query(`SELECT id, title, source_id AS source, is_active AS active, inactive_reason AS reason,
        posted_at AS postedAt FROM opportunities ORDER BY id`).all(), visible,
      ledger: sqlite.query(`SELECT source_id AS source, mode, proposed_count AS proposed, published_count AS n,
        published_ids_json AS ids, tick_key AS tickKey, retry_key AS retryKey FROM source_publication_ledger ORDER BY id`).all(),
      ftsCount: (sqlite.query("SELECT COUNT(*) AS n FROM opportunities_fts").get() as { n: number }).n,
      bindingAttempts: bindingAttempts.slice(boundStart), returnedInsertIds: returnedInsertIds.slice(returnedStart),
      executedInsertIds: executedInsertIds.slice(executedStart), insertFailures: [...insertFailures] });
  }
  await send(REFERENCE);
  if (scenario.retryAndDedup) {
    await send(REFERENCE);
    await send("2026-10-10T12:00:01.000Z");
  }
  if (scenario.canaryDifferentRetry) await send(REFERENCE, items.map(item => ({ ...item,
    title: `${item.title} additional`, sourceUrl: `${item.sourceUrl}-additional`, applicationUrl: `${item.applicationUrl}-additional` })));
  console.log(`NATIVE_DIRECT_INGEST_BUDGET_RESULT ${JSON.stringify({
    scope: { reference: REFERENCE, clock: "CLOCK_PROJECTED_NATIVE_TRIGGERS_NOT_BYTE_IDENTICAL_RUNTIME_PROOF",
      replacementCount, clockProjection, bindingBudget: "D1_PARAMETER_CAP_ONLY_NOT_FULL_D1_RUNTIME",
      maxBoundParameters: D1_MAX_BOUND_PARAMETERS, canarySetup: scenario.canaryCap
        ? "SYNTHETIC_INITIAL_REGISTRY_STATE_SEEDED_BEFORE_LIFECYCLE_TRIGGERS_NOT_ADMISSION_EVIDENCE" : "EXACT_SIX_FALLBACK",
      persistence: "ACTUAL_AUTHENTICATED_HANDLER_DRIZZLE_NATIVE_SQLITE_FTS_GATEWAY",
      limitation: "Synthetic payload and credentials; exactly one ledger clock literal projected; no live D1/provider/production/browser evidence." },
    scenario, replies, canary: sqlite.query("SELECT operational_state AS state, canary_max_new_items_per_tick AS cap FROM source_registry WHERE source_id = 'remotive'").get(),
    transports: transportAttempts, freshOriginal: FRESH,
  })}`);
} finally { sqlite.close(); setSystemTime(); }
