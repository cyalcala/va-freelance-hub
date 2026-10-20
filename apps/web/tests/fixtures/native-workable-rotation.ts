import { Database } from "bun:sqlite";
import { setSystemTime } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { enabledSources } from "@va-hub/scraper";
import { createScrapeHandler } from "../../src/pages/api/cron/scrape";
import capturedAuthority from "./workable-authority-identities-2026-10-13.json";
import { seedNativeWorkableAdmissions } from "./native-workable-admission";

const REFERENCE = "2026-10-12T05:00:00.000Z";
const scenario = JSON.parse(process.argv[2]!) as { invalidAttemptAt?: string | null; stateReadFailure?: boolean;
  admittedTokens?: boolean; focusPineapple?: boolean; workableRobots?: "disallowed" | "http503" | "throw" };
const tokens = scenario.admittedTokens
  ? capturedAuthority.sourceIds.map(id => id.slice("workable:".length))
  : "abcdefg".split("").map(letter => `zz-native-${letter}`);
const denied = ["myoutdesk", "pineapple", "virtualstaff365"];
const sourceByUrl = new Map(enabledSources.map(source => [new URL(source.url).href, source]));
const workableByUrl = new Map([...tokens, ...denied].map(token =>
  [`https://apply.workable.com/api/v1/widget/accounts/${token}`, `workable:${token}`]));
const origins = new Set([...sourceByUrl.keys(), ...workableByUrl.keys()].map(url => new URL(url).origin));
const transports: Array<{ sourceId: string | null; kind: "static" | "workable" | "robots" | "unexpected"; allowed: boolean }> = [];
let aiCalls = 0;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const request = input instanceof Request ? input : null;
  const url = new URL(request?.url ?? String(input));
  const method = (init?.method ?? request?.method ?? "GET").toUpperCase();
  const source = sourceByUrl.get(url.href);
  const workable = workableByUrl.get(url.href);
  const robots = url.pathname === "/robots.txt" && origins.has(url.origin);
  const allowed = method === "GET" && Boolean(source || workable || robots);
  transports.push({ sourceId: source?.id ?? workable ?? null,
    kind: source ? "static" : workable ? "workable" : robots ? "robots" : "unexpected", allowed });
  if (!allowed) throw new Error("native Workable fixture rejected unexpected synthetic transport");
  if (robots && url.origin === "https://apply.workable.com") {
    if (scenario.workableRobots === "throw") throw new Error("synthetic Workable robots transport unavailable");
    if (scenario.workableRobots === "http503") return new Response("Unavailable", { status: 503 });
    if (scenario.workableRobots === "disallowed") return new Response("User-agent: *\nDisallow: /\n", { headers: { "content-type": "text/plain" } });
  }
  if (robots) return new Response("User-agent: *\nAllow: /\n", { headers: { "content-type": "text/plain" } });
  return new Response(workable ? '{"jobs":[]}' : source!.type === "json" ? "[]" : "<rss><channel></channel></rss>",
    { headers: { "content-type": workable || source?.type === "json" ? "application/json" : "application/rss+xml" } });
}) as typeof fetch;
setSystemTime(new Date(REFERENCE));
const sqlite = new Database(":memory:");
try {
  const migrations = join(import.meta.dir, "../../../../packages/db/migrations");
  const appliedMigrations = readdirSync(migrations)
    .filter(name => /^\d{4}_.+\.sql$/.test(name) && Number(name.slice(0, 4)) <= 54).sort();
  for (const name of appliedMigrations) {
    const migration = readFileSync(join(migrations, name), "utf8");
    if (name === "0039_canary_transition_plane.sql") {
      const boundary = migration.indexOf("CREATE TRIGGER IF NOT EXISTS source_registry_initial_state_is_dormant");
      if (boundary < 0) throw new Error("synthetic registry setup boundary unavailable");
      sqlite.exec(migration.slice(0, boundary));
      sqlite.query("UPDATE source_registry SET canary_max_new_items_per_tick = 2 WHERE provider_id = 'native-workable' AND operational_state = 'canary'").run();
      sqlite.exec(migration.slice(boundary));
    } else if (name === "0040_current_evidence_admission.sql") {
      const boundary = migration.indexOf("CREATE TRIGGER source_registry_governance_revision_monotonic");
      if (boundary < 0) throw new Error("synthetic admission setup boundary unavailable");
      sqlite.exec(migration.slice(0, boundary));
      await seedNativeWorkableAdmissions(sqlite, REFERENCE);
      sqlite.exec(migration.slice(boundary));
    } else sqlite.exec(migration);
    if (name === "0036_registry_foundation.sql") {
      // Synthetic initial conditions before lifecycle guards; every migration
      // statement remains unchanged and every guard exists during the handler.
      sqlite.query(`INSERT INTO provider_profiles (id, display_name, provider_family, mechanism, auth_class,
        default_compliance_state, default_operational_state)
        VALUES ('native-workable', 'Native Workable fixture', 'workable', 'public_api', 'none', 'allowed', 'candidate')`).run();
      for (const token of [...denied, ...tokens]) sqlite.query(`INSERT INTO source_registry
        (source_id, provider_id, display_name, endpoint_url, company_token, compliance_state, operational_state, policy_expiry)
        VALUES (?, 'native-workable', ?, ?, ?, ?, ?, '2027-01-01T00:00:00.000Z')`).run(
        `workable:${token}`, token, `https://apply.workable.com/api/v1/widget/accounts/${token}`, token,
        denied.includes(token) ? "needs_review" : "allowed", denied.includes(token) ? "candidate" : "canary");
    }
  }
  sqlite.exec("DELETE FROM source_opt_outs; DELETE FROM opportunities; DELETE FROM source_fetch_state; DELETE FROM va_directory;");
  for (const token of denied) sqlite.query("INSERT INTO va_directory (company_name, ats_platform, ats_token, verified_at) VALUES (?, 'workable', ?, NULL)").run(token, token);
  if (scenario.invalidAttemptAt !== undefined) sqlite.query(`INSERT INTO source_fetch_state
    (source_id, source_name, source_type, collection_method, compliance_status, last_attempt_at, updated_at)
    VALUES (?, ?, 'ATS', 'public_ats_json', 'allowed', ?, ?)`).run(`workable:${tokens[0]}`, tokens[0]!, scenario.invalidAttemptAt, REFERENCE);
  if (scenario.focusPineapple) {
    // Make the captured Pineapple identity the only due admitted source. The
    // remaining identities retain policy but are fenced by the normal cadence.
    for (const token of tokens.filter(token => token !== "pineapple-staffing")) {
      sqlite.query(`INSERT INTO source_fetch_state
        (source_id, source_name, source_type, collection_method, compliance_status, last_attempt_at, updated_at)
        VALUES (?, ?, 'ATS', 'public_ats_json', 'allowed', ?, ?)`).run(`workable:${token}`, token, REFERENCE, REFERENCE);
    }
  }
  const registry = () => sqlite.query(`SELECT source_id AS sourceId, compliance_state AS compliance,
    operational_state AS operational, canary_max_new_items_per_tick AS cap, opt_out AS optOut
    FROM source_registry ORDER BY source_id`).all();
  const initialRegistry = registry();
  const attempts = () => sqlite.query(`SELECT source_id AS sourceId, last_attempt_at AS lastAttemptAt, last_count AS lastCount
    FROM source_fetch_state WHERE source_id LIKE 'workable:%' ORDER BY source_id`).all();
  const binding = { prepare(query: string) {
    const statement = sqlite.query(query);
    let params: unknown[] = [];
    return {
      bind(...values: unknown[]) { params = values; return this; },
      async first() { return statement.get(...params as any[]); },
      async all() { return { results: statement.all(...params as any[]) }; },
      async raw() {
        if (scenario.stateReadFailure && query.includes('from "source_fetch_state"') && !query.includes(" where ")) {
          throw new Error("synthetic source fetch state snapshot unavailable");
        }
        return statement.values(...params as any[]);
      },
      async run() { const result = statement.run(...params as any[]); return { success: true, meta: { changes: result.changes } }; },
    };
  } };
  const handler = createScrapeHandler();
  const replies = [];
  const ticks = scenario.invalidAttemptAt !== undefined || scenario.stateReadFailure || scenario.workableRobots ? [REFERENCE]
    : [REFERENCE, "2026-10-12T05:10:00.000Z", "2026-10-12T05:20:00.000Z",
      "2026-10-12T05:30:00.000Z", "2026-10-12T05:40:00.000Z", "2026-10-12T06:00:00.000Z"];
  for (const now of ticks) {
    setSystemTime(new Date(now));
    const start = transports.length;
    const response = await handler({ request: new Request("https://example.test/api/cron/scrape", {
      method: "POST", headers: { authorization: "Bearer native-workable-secret" },
    }), locals: { runtime: { env: { DB: binding, CRON_SECRET: "native-workable-secret",
      AI: { run: async () => { aiCalls++; throw new Error("native Workable fixture prohibits AI calls"); } } } } } } as any);
    const body = await response.json() as { sourceResults?: Array<{ sourceId?: string; ok: boolean; count: number; skipped?: boolean; robotsVerdict?: string; robotsMode?: string; skipReason?: string }>;
      cadenceGuards?: { stateAvailable: boolean } };
    replies.push({ now, status: response.status, transports: transports.slice(start), attempts: attempts(),
      stateAvailable: body.cadenceGuards?.stateAvailable,
      workableResults: body.sourceResults?.filter(row => row.sourceId?.startsWith("workable:")).map(row =>
        ({ sourceId: row.sourceId, ok: row.ok, count: row.count, skipped: Boolean(row.skipped),
          robotsVerdict: row.robotsVerdict, robotsMode: row.robotsMode, skipReason: row.skipReason })) });
  }
  console.log(`NATIVE_WORKABLE_ROTATION_RESULT ${JSON.stringify({
    scope: "ACTUAL_HANDLER_DRIZZLE_NATIVE_SQLITE_UNCHANGED_MIGRATIONS_THROUGH_0054_SYNTHETIC_INITIAL_REGISTRY_AND_VALIDATED_PACKETS_NOT_LIVE_FLOW_PROOF",
    scenario, tokens, denied, replies, transports, aiCalls, initialRegistry, finalRegistry: registry(), appliedMigrations,
    registryTriggers: sqlite.query("SELECT name FROM sqlite_schema WHERE type = 'trigger' AND tbl_name = 'source_registry' ORDER BY name").all(),
    directory: sqlite.query("SELECT ats_token AS token, verified_at AS verifiedAt FROM va_directory ORDER BY ats_token").all(),
    sourceFetchStateTriggers: sqlite.query("SELECT name FROM sqlite_schema WHERE type = 'trigger' AND tbl_name = 'source_fetch_state'").all(),
    opportunities: (sqlite.query("SELECT COUNT(*) AS n FROM opportunities").get() as { n: number }).n,
    ledger: (sqlite.query("SELECT COUNT(*) AS n FROM source_publication_ledger").get() as { n: number }).n,
    transitionEvents: (sqlite.query("SELECT COUNT(*) AS n FROM source_transition_events").get() as { n: number }).n,
  })}`);
} finally { sqlite.close(); setSystemTime(); }
