import { Database } from "bun:sqlite";
import { setSystemTime } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { enabledSources } from "@va-hub/scraper";
import { createScrapeHandler } from "../../src/pages/api/cron/scrape";

const REFERENCE = "2026-10-12T05:00:00.000Z";
const EPOCH = "1970-01-01T00:00:00.000Z";
const LOCK_ID = "__scrape_run_lock__";
const NEWER_OWNER = "2026-10-12T05:10:00.000Z";
const scenario = JSON.parse(process.argv[2]!) as {
  missingMetadata?: boolean; repeat?: boolean; initial?: "held" | "boundary" | "older-boundary";
  fault?: "before" | "after"; malformed?: "source" | "timestamp" | "duplicate" | "missing-time";
  concurrent?: boolean; newerOwnerBeforeRelease?: boolean;
};
const sourceByUrl = new Map(enabledSources.map(source => [new URL(source.url).href, source]));
const allowedOrigins = new Set(enabledSources.map(source => new URL(source.url).origin));
const transports: Array<{ source: string | null; url: string; allowed: boolean }> = [];
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const request = input instanceof Request ? input : null;
  const url = new URL(request?.url ?? String(input));
  const method = (init?.method ?? request?.method ?? "GET").toUpperCase();
  const source = sourceByUrl.get(url.href);
  const robots = url.pathname === "/robots.txt" && allowedOrigins.has(url.origin);
  const allowed = method === "GET" && (Boolean(source) || robots);
  transports.push({ source: source?.id ?? null, url: url.href, allowed });
  if (!allowed) throw new Error("native run-lock fixture rejected unexpected synthetic transport");
  if (robots) return new Response("User-agent: *\nAllow: /\n", { headers: { "content-type": "text/plain" } });
  return new Response(source!.type === "json" ? "[]" : "<rss><channel></channel></rss>", {
    headers: { "content-type": source!.type === "json" ? "application/json" : "application/rss+xml" },
  });
}) as typeof fetch;
setSystemTime(new Date(REFERENCE));
const sqlite = new Database(":memory:");
try {
  const migrations = join(import.meta.dir, "../../../../packages/db/migrations");
  for (const name of readdirSync(migrations).filter(name => /^\d{4}_.+\.sql$/.test(name)).sort()) {
    sqlite.exec(readFileSync(join(migrations, name), "utf8"));
  }
  sqlite.exec("DELETE FROM source_registry; DELETE FROM source_opt_outs; DELETE FROM opportunities; DELETE FROM source_fetch_state;");
  const initialAt = scenario.initial === "held" ? new Date(Date.parse(REFERENCE) - 60_000).toISOString()
    : scenario.initial === "boundary" ? new Date(Date.parse(REFERENCE) - 8 * 60_000).toISOString()
    : scenario.initial === "older-boundary" ? new Date(Date.parse(REFERENCE) - 8 * 60_000 - 1).toISOString() : EPOCH;
  sqlite.query(`INSERT INTO source_fetch_state (source_id, source_name, source_type, collection_method,
    compliance_status, last_attempt_at, updated_at) VALUES (?, 'run lock', 'lock', 'lock', 'lock', ?, ?)`)
    .run(LOCK_ID, initialAt, REFERENCE);
  const physicalLock = () => sqlite.query("SELECT source_id AS sourceId, last_attempt_at AS lastAttemptAt FROM source_fetch_state WHERE source_id = ?").get(LOCK_ID);
  const claims: Array<{ method: string; changes: number; sql: string; params: unknown[]; physicalLock: unknown }> = [];
  const releases: Array<{ changes: number; sql: string; params: unknown[]; physicalLock: unknown }> = [];
  let firstClaimEntered!: () => void;
  const firstClaim = new Promise<void>(resolve => { firstClaimEntered = resolve; });
  let resumeFirstClaim!: () => void;
  const firstClaimResume = new Promise<void>(resolve => { resumeFirstClaim = resolve; });
  let pausedFirst = false;
  const binding = { prepare(query: string) {
    const statement = sqlite.query(query);
    let params: any[] = [];
    const isLockUpdate = () => /^update "source_fetch_state"/i.test(query) && params.includes(LOCK_ID);
    const isRelease = () => isLockUpdate() && params[0] === EPOCH;
    const before = () => {
      if (!isLockUpdate()) return;
      if (!isRelease() && scenario.fault === "before") throw new Error("synthetic run-lock failure before commit");
      if (isRelease() && scenario.newerOwnerBeforeRelease) {
        sqlite.query("UPDATE source_fetch_state SET last_attempt_at = ? WHERE source_id = ?").run(NEWER_OWNER, LOCK_ID);
      }
    };
    const after = async (method: string, changes: number) => {
      if (!isLockUpdate()) return;
      const evidence = { method, changes, sql: query, params: [...params], physicalLock: physicalLock() };
      if (isRelease()) { releases.push(evidence); return; }
      claims.push(evidence);
      if (scenario.fault === "after") throw new Error("synthetic run-lock acknowledgement lost after commit");
      if (scenario.concurrent && !pausedFirst && changes === 1) {
        pausedFirst = true;
        firstClaimEntered();
        await firstClaimResume;
      }
    };
    return {
      bind(...values: any[]) { params = values; return this; },
      async first() { return statement.get(...params); },
      async all() { return { results: statement.all(...params) }; },
      async raw() {
        before();
        const rows = statement.values(...params);
        const changes = (sqlite.query("SELECT changes() AS n").get() as { n: number }).n;
        await after("raw", changes);
        if (isLockUpdate() && !isRelease() && rows.length > 0 && scenario.malformed) {
          if (scenario.malformed === "source") return [["wrong-owner", params[0]]];
          if (scenario.malformed === "timestamp") return [[LOCK_ID, EPOCH]];
          if (scenario.malformed === "duplicate") return [rows[0], rows[0]];
          return [[LOCK_ID]];
        }
        return rows;
      },
      async run() {
        before();
        const result = statement.run(...params);
        await after("run", result.changes);
        return { success: true, meta: scenario.missingMetadata && isLockUpdate()
          ? { rows_written: result.changes } : { changes: result.changes } };
      },
    };
  } };
  const handler = createScrapeHandler();
  async function invoke(now: string) {
    setSystemTime(new Date(now));
    const transportStart = transports.length;
    const response = await handler({ request: new Request("https://example.test/api/cron/scrape", {
      method: "POST", headers: { authorization: "Bearer synthetic-lock-secret" },
    }), locals: { runtime: { env: { DB: binding, CRON_SECRET: "synthetic-lock-secret" } } } } as any);
    return { now, status: response.status, body: await response.json(), physicalLock: physicalLock(),
      transports: transports.slice(transportStart) };
  }
  const replies = [];
  let transportsBeforeResume: number | null = null;
  if (scenario.concurrent) {
    const first = invoke(REFERENCE);
    await firstClaim;
    const second = await invoke(REFERENCE);
    transportsBeforeResume = transports.length;
    resumeFirstClaim();
    replies.push(await first, second);
  } else {
    for (const now of scenario.repeat ? [REFERENCE, "2026-10-12T05:10:00.000Z", "2026-10-12T05:20:00.000Z"] : [REFERENCE]) {
      replies.push(await invoke(now));
    }
  }
  console.log(`NATIVE_RUN_LOCK_ACK_RESULT ${JSON.stringify({
    scope: "REAL_HANDLER_DRIZZLE_NATIVE_SQLITE_ALL_UNCHANGED_MIGRATIONS_SYNTHETIC_ALLOWLISTED_TRANSPORT_NOT_LIVE_D1_CAUSE_PROOF",
    reference: REFERENCE, scenario, initialAt, replies, claims, releases, transports, transportsBeforeResume,
    finalLock: physicalLock(), sourceFetchStateTriggers: sqlite.query("SELECT name FROM sqlite_schema WHERE type = 'trigger' AND tbl_name = 'source_fetch_state'").all(),
    opportunities: (sqlite.query("SELECT COUNT(*) AS n FROM opportunities").get() as { n: number }).n,
    ledger: (sqlite.query("SELECT COUNT(*) AS n FROM source_publication_ledger").get() as { n: number }).n,
  })}`);
} finally { sqlite.close(); setSystemTime(); }
