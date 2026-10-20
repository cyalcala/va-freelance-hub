import { Database } from "bun:sqlite";
import { setSystemTime } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { getDb, opportunities } from "@va-hub/db";
import { enabledSources } from "@va-hub/scraper";
import { publicOpportunityFilters } from "../../src/lib/public-opportunities";
import { createScrapeHandler } from "../../src/pages/api/cron/scrape";
import { seedNativeWorkableAdmissions } from "./native-workable-admission";
import { loadWorkableAdmission, insertAdmittedWorkableRow } from "../../src/lib/workable-admission";
import { triageDrain } from "../../src/lib/inngest/functions/triage-drain";

// Native SQLite and Date use separate clocks. The sole ledger 'now' literal
// is projected explicitly below; no eligibility or authority trigger is removed.
// Bun clock API: https://bun.sh/docs/test/dates-times
// SQLite API: https://bun.sh/docs/runtime/sqlite
const REFERENCE = "2026-10-18T08:00:00.000Z";
const scenario = JSON.parse(process.argv[2]!) as {
  kind?: "fresh" | "stale" | "future" | "impossible" | "created-only" | "us" | "onsite" | "mixed";
  starvation?: boolean; rssHead?: boolean; repeat?: boolean;
  robots?: "disallowed" | "http503"; invalidAttempt?: boolean;
  admission?: "missing" | "stale-revision" | "expired" | "publish-race" | "reactivate-race";
  nonWorkable?: boolean;
  codec?: boolean;
  pending?: "fresh" | "stale" | "onsite" | "mixed" | "facts-race" | "drain-fresh" | "drain-stale" | "drain-onsite" | "drain-race" | "drain-company-race" | "drain-application-race" | "durable";
  unclearPending?: boolean;
  currentPendingUnclear?: boolean;
  currentPublishedOn?: string;
  storedPostedAt?: string;
  pendingCurrent?: "missing" | "stale-original" | "onsite" | "us";
  reactivation?: "fresh" | "onsite" | "us" | "stored-stale" | "stored-missing" | "stored-onsite" | "stored-restricted" | "current-restricted" | "identity" | "source-race" | "facts-race" | "date-race" | "eligibility-race";
};
const admitted = ["coconutva", "crewbloom", "hello-rache", "hunt-st", "pearltalent", "pineapple-staffing", "rocketams"];
const denied = ["myoutdesk", "pineapple", "virtualstaff365"];
const selected = admitted.slice(0, 2);
const sourceByUrl = new Map(enabledSources.map(source => [new URL(source.url).href, source]));
const workableByUrl = new Map([...admitted, ...denied].map(token =>
  [`https://apply.workable.com/api/v1/widget/accounts/${token}`, token]));
const nonWorkableUrl = "https://api.lever.co/v0/postings/native-control?mode=json";
const origins = new Set([...sourceByUrl.keys(), ...workableByUrl.keys(), ...(scenario.nonWorkable ? [nonWorkableUrl] : [])].map(url => new URL(url).origin));
const transports: Array<{ token: string | null; kind: string; allowed: boolean }> = [];
let aiCalls = 0;
function job(token: string, label: string, overrides: Record<string, unknown> = {}) {
  return { title: `Virtual Assistant ${label}`, shortcode: `${token}-${label}`,
    url: `https://apply.workable.com/j/${token}-${label}/`, city: "", state: "", country: "Philippines",
    telecommuting: true, published_on: scenario.currentPublishedOn ?? "2026-10-17", created_at: "2026-10-17T06:00:00Z", ...overrides };
}
function jobs(token: string) {
  if (!selected.includes(token)) return [];
  if (scenario.pending) {
    if (scenario.pendingCurrent === "missing") return [];
    const current = job(token, "pending", scenario.pendingCurrent === "stale-original" ? { published_on: "2020-01-14" }
      : scenario.pendingCurrent === "onsite" ? { telecommuting: false }
        : scenario.pendingCurrent === "us" ? { country: "United States" } : scenario.currentPendingUnclear ? { country: "" } : {});
    if (scenario.pending !== "mixed") return [current];
    return [current, job(token, "fresh-a"), job(token, "fresh-b"), job(token, "fresh-c")];
  }
  if (scenario.reactivation === "onsite") return [job(token, "fresh", { telecommuting: false })];
  if (scenario.reactivation === "us") return [job(token, "fresh", { country: "United States" })];
  if (scenario.reactivation === "current-restricted") return [job(token, "fresh", { title: "Virtual Assistant fresh US citizens only" })];
  switch (scenario.kind ?? "fresh") {
    case "stale": return [job(token, "stale", { published_on: "2020-01-14" })];
    case "future": return [job(token, "future", { published_on: "2026-10-19" })];
    case "impossible": return [job(token, "impossible", { published_on: "2026-09-31" })];
    case "created-only": return [job(token, "created", { published_on: null })];
    case "us": return [job(token, "us", { country: "United States" })];
    case "onsite": return [job(token, "onsite", { telecommuting: false })];
    case "mixed": return [...(scenario.reactivation === "fresh" ? [job(token, "fresh")] : []), job(token, "fresh-a"), job(token, "fresh-b"), job(token, "fresh-c"),
      job(token, "stale", { published_on: "2020-01-14" }),
      job(token, "us", { country: "United States" }), job(token, "onsite", { telecommuting: false })];
    default: return [job(token, "fresh")];
  }
}
const rssHead = `<rss><channel>${Array.from({ length: 50 }, (_, i) =>
  `<item><title>US support ${i}</title><link>https://weworkremotely.com/jobs/native-${i}</link>`
    + `<region>United States</region><description>US residents only.</description>`
    + `<pubDate>Sat, 17 Oct 2026 06:00:00 GMT</pubDate><author>Native RSS</author></item>`).join("")}</channel></rss>`;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const request = input instanceof Request ? input : null;
  const url = new URL(request?.url ?? String(input));
  const method = (init?.method ?? request?.method ?? "GET").toUpperCase();
  const source = sourceByUrl.get(url.href), token = workableByUrl.get(url.href);
  const robots = url.pathname === "/robots.txt" && origins.has(url.origin);
  const nonWorkable = scenario.nonWorkable && url.href === nonWorkableUrl;
  const allowed = method === "GET" && Boolean(source || token || robots || nonWorkable);
  transports.push({ token: token ?? null, kind: robots ? "robots" : token ? "workable" : source ? "static" : nonWorkable ? "non-workable" : "unexpected", allowed });
  if (!allowed) throw new Error("Fixture blocks every unallowlisted synthetic transport");
  if (robots) {
    if (url.origin === "https://apply.workable.com" && scenario.robots === "http503") return new Response("Unavailable", { status: 503 });
    return new Response(url.origin === "https://apply.workable.com" && scenario.robots === "disallowed"
      ? "User-agent: *\nDisallow: /\n" : "User-agent: *\nAllow: /\n");
  }
  return new Response(nonWorkable ? "[]" : token ? JSON.stringify({ jobs: jobs(token) })
    : source!.id === "we-work-remotely" && scenario.rssHead ? rssHead
    : source!.type === "json" ? "[]" : "<rss><channel></channel></rss>", {
    headers: { "content-type": token || source?.type === "json" ? "application/json" : "application/rss+xml" },
  });
}) as typeof fetch;
setSystemTime(new Date(REFERENCE));
const sqlite = new Database(":memory:");
try {
  const directory = join(import.meta.dir, "../../../../packages/db/migrations");
  const appliedMigrations = readdirSync(directory).filter(name => /^\d{4}_.+\.sql$/.test(name)).sort();
  if (appliedMigrations.some(name => Number(name.slice(0, 4)) > 54)) throw new Error("Fixture requires the actual 0054 release tree");
  for (const name of appliedMigrations) {
    const migration = readFileSync(join(directory, name), "utf8");
    if (name === "0039_canary_transition_plane.sql") {
      const boundary = migration.indexOf("CREATE TRIGGER IF NOT EXISTS source_registry_initial_state_is_dormant");
      if (boundary < 0) throw new Error("Synthetic initial registry boundary missing");
      sqlite.exec(migration.slice(0, boundary));
      sqlite.query("UPDATE source_registry SET canary_max_new_items_per_tick=2 WHERE provider_id='native-workable' AND operational_state='canary'").run();
      sqlite.exec(migration.slice(boundary));
    } else if (name === "0040_current_evidence_admission.sql") {
      const boundary = migration.indexOf("CREATE TRIGGER source_registry_governance_revision_monotonic");
      if (boundary < 0) throw new Error("Synthetic admission setup boundary missing");
      sqlite.exec(migration.slice(0, boundary));
      if (scenario.admission !== "missing") await seedNativeWorkableAdmissions(sqlite,
        scenario.admission === "expired" ? "2026-04-01T00:00:00.000Z" : REFERENCE,
        scenario.admission === "expired" ? "2026-04-30T00:00:00.000Z" : undefined);
      sqlite.exec(migration.slice(boundary));
    } else sqlite.exec(migration);
    if (name === "0036_registry_foundation.sql") {
      sqlite.query(`INSERT INTO provider_profiles (id,display_name,provider_family,mechanism,auth_class,
        default_compliance_state,default_operational_state)
        VALUES ('native-workable','Native Workable','workable','public_api','none','allowed','candidate')`).run();
      for (const token of [...admitted, ...denied]) sqlite.query(`INSERT INTO source_registry
        (source_id,provider_id,display_name,endpoint_url,company_token,compliance_state,operational_state,policy_expiry)
        VALUES (?,'native-workable',?,?,?,?,?,'2027-01-01T00:00:00.000Z')`).run(
        `workable:${token}`, token, `https://apply.workable.com/api/v1/widget/accounts/${token}`, token,
        denied.includes(token) ? "needs_review" : "allowed", denied.includes(token) ? "candidate" : "canary");
      if (scenario.nonWorkable) {
        sqlite.exec("INSERT INTO provider_profiles(id,display_name,provider_family,mechanism,auth_class,default_compliance_state,default_operational_state) VALUES ('native-lever','Native Lever','lever','public_api','none','allowed','candidate')");
        sqlite.query("INSERT INTO source_registry(source_id,provider_id,display_name,endpoint_url,company_token,compliance_state,operational_state,policy_expiry) VALUES ('lever:native-control','native-lever','Native Lever',?,'native-control','allowed','active','2027-01-01T00:00:00.000Z')").run(nonWorkableUrl);
      }
    }
  }
  const clockProjection = [];
  for (const trigger of sqlite.query("SELECT name,sql FROM sqlite_schema WHERE type='trigger' AND tbl_name='source_publication_ledger'").all() as Array<{name:string;sql:string}>) {
    const projected = trigger.sql.replaceAll("julianday('now')", `julianday('${REFERENCE}')`);
    if (projected !== trigger.sql) {
      if (projected.replaceAll(`julianday('${REFERENCE}')`, "julianday('now')") !== trigger.sql) throw new Error("Nonreversible clock projection");
      sqlite.exec(`DROP TRIGGER "${trigger.name}"`); sqlite.exec(projected);
      clockProjection.push({ name: trigger.name, originalSha256: createHash("sha256").update(trigger.sql).digest("hex"),
        projectedSha256: createHash("sha256").update(projected).digest("hex") });
    }
  }
  if (clockProjection.length !== 1) throw new Error("Unexpected ledger clock seam count");
  sqlite.exec("DELETE FROM source_opt_outs; DELETE FROM opportunities; DELETE FROM source_fetch_state; DELETE FROM va_directory;");
  const directoryTokens = scenario.starvation ? denied : selected;
  for (const token of directoryTokens) sqlite.query("INSERT INTO va_directory(company_name,ats_platform,ats_token,verified_at) VALUES (?,'workable',?,NULL)").run(token,token);
  if (scenario.nonWorkable) sqlite.exec("INSERT INTO va_directory(company_name,ats_platform,ats_token,verified_at) VALUES ('Native Lever','lever','native-control',NULL)");
  if (scenario.invalidAttempt) sqlite.query(`INSERT INTO source_fetch_state
    (source_id,source_name,source_type,collection_method,compliance_status,last_attempt_at,updated_at)
    VALUES ('workable:coconutva','coconutva','ATS','public_ats_json','allowed','invalid',?)`).run(REFERENCE);
  if (scenario.repeat) for (const token of admitted.slice(2)) sqlite.query(`INSERT INTO source_fetch_state
    (source_id,source_name,source_type,collection_method,compliance_status,last_attempt_at,updated_at)
    VALUES (?,?,'ATS','public_ats_json','allowed',?,?)`).run(`workable:${token}`,token,REFERENCE,REFERENCE);
  if (scenario.admission === "stale-revision") sqlite.exec("UPDATE source_registry SET governance_revision=governance_revision+1 WHERE source_id LIKE 'workable:%'");
  const registry = () => sqlite.query("SELECT source_id,compliance_state,operational_state,canary_max_new_items_per_tick,opt_out FROM source_registry ORDER BY source_id").all();
  const initialRegistry = registry();
  if (scenario.reactivation) for (const token of selected) sqlite.query(`INSERT INTO opportunities
    (title,company,type,source_url,source_platform,source_id,tags,category,location_type,location_raw,
     description,posted_at,scraped_at,is_active,inactive_reason,content_hash,ph_eligibility)
    VALUES (?,?,'full-time',?,?,?,'[]','admin',?,?,'Location: Philippines.',?,?,0,'stale-feed',?,'eligible_verified')`).run(
    `Virtual Assistant fresh`, token, `https://apply.workable.com/j/${token}-fresh/`, token,
    scenario.reactivation === "identity" ? `workable:other-${token}` : `workable:${token}`,
    scenario.reactivation === "stored-onsite" ? "onsite" : "remote", "Philippines",
    scenario.reactivation === "stored-stale" ? "2020-01-14T00:00:00.000Z" : scenario.reactivation === "stored-missing" ? null : scenario.storedPostedAt ?? "2026-10-17T00:00:00.000Z",
    REFERENCE, `seed-${token}`);
  if (scenario.reactivation === "stored-restricted") sqlite.exec("UPDATE opportunities SET description='US citizens only' WHERE content_hash LIKE 'seed-%'");
  if (scenario.pending) for (const token of selected) sqlite.query(`INSERT INTO opportunities
    (title,company,type,source_url,source_platform,source_id,tags,category,location_type,location_raw,description,
      posted_at,scraped_at,is_active,inactive_reason,content_hash,ph_eligibility,geo_scope)
    VALUES (?,?,'full-time',?,?,?,'[]','admin',?,'Philippines','Location: Philippines.',?,?,0,'pending-triage',?,'unclear',?)`).run(
      `Virtual Assistant pending ${token}`, token, `https://apply.workable.com/j/${token}-pending/`, token, `workable:${token}`,
      scenario.pending.includes("onsite") ? "onsite" : "remote",
      scenario.pending.includes("stale") ? "2020-01-14T00:00:00.000Z" : scenario.storedPostedAt ?? "2026-10-17T00:00:00.000Z",
      REFERENCE, `pending-${token}`, scenario.pending.startsWith("drain-") ? "unknown" : "ph_only");
  if (scenario.unclearPending) sqlite.exec("UPDATE opportunities SET location_raw=NULL,description=NULL WHERE content_hash LIKE 'pending-%'");
  const bindingParameters: number[] = [];
  let raceInjected = false;
  const binding = { prepare(query: string) {
    const statement = sqlite.query(query); let params: any[] = [];
    return { bind(...values: any[]) {
      bindingParameters.push(values.length);
      if (values.length > 100) throw new Error(`D1_BINDING_BUDGET_EXCEEDED:${values.length}`);
      params=values; return this;
    }, async first(){return statement.get(...params);},async all(){return {results:statement.all(...params)};},
    async raw(){return statement.values(...params);},async run(){
      const activationMutation = /^update "opportunities" set ([\s\S]*?) where /i.exec(query)?.[1]?.includes('"is_active" = ?') === true;
      if (!raceInjected && ((scenario.admission === "publish-race" && /^INSERT INTO "opportunities"/i.test(query))
        || (scenario.admission === "reactivate-race" && activationMutation))) {
        raceInjected = true;
        sqlite.exec("UPDATE source_registry SET governance_revision=governance_revision+1 WHERE source_id LIKE 'workable:%'");
      }
      if (!raceInjected && scenario.reactivation?.endsWith("-race") && activationMutation) {
        raceInjected = true;
        const change = scenario.reactivation === "source-race" ? "source_id='workable:other'"
          : scenario.reactivation === "facts-race" ? "location_raw='United States (onsite)'"
          : scenario.reactivation === "date-race" ? "posted_at='2020-01-14T00:00:00.000Z'"
          : "ph_eligibility='ineligible'";
        sqlite.exec(`UPDATE opportunities SET ${change} WHERE content_hash LIKE 'seed-%'`);
      }
      if (!raceInjected && scenario.pending?.endsWith("-race") && activationMutation) {
        raceInjected = true;
        const change = scenario.pending === "drain-company-race" ? "company='Changed Company'"
          : scenario.pending === "drain-application-race" ? "application_url='https://apply.workable.com/j/changed/'"
            : "location_raw='United States (onsite)'";
        sqlite.exec(`UPDATE opportunities SET ${change} WHERE content_hash LIKE 'pending-%'`);
      }
      const result=statement.run(...params);return {success:true,meta:{changes:result.changes}};
    } };
  }};
  const handler = createScrapeHandler();
  const env = { DB: binding, CRON_SECRET: "synthetic-secret", DRAIN_PENDING_TRIAGE: scenario.pending?.startsWith("drain-") ? "1" : undefined, AI: { run: async () => {
    aiCalls++; return {response:JSON.stringify({eligibleForFilipinos:true,eligible:true,reason:"PH fixture",category:"admin",tags:["remote"]})};
  }}};
  const replies = [];
  for (let tick=0; tick<(scenario.repeat ? 2 : 1);tick++) {
    const now = tick ? "2026-10-18T09:00:00.000Z" : REFERENCE;
    // Keep the sole native ledger clock aligned with the explicit Date seam.
    // Only its literal changes; authority/cap/body predicates remain unchanged.
    if (tick) for (const trigger of sqlite.query("SELECT name,sql FROM sqlite_schema WHERE type='trigger' AND tbl_name='source_publication_ledger'").all() as Array<{name:string;sql:string}>) {
      if (trigger.sql.includes(`julianday('${REFERENCE}')`)) {
        sqlite.exec(`DROP TRIGGER "${trigger.name}"`);
        sqlite.exec(trigger.sql.replaceAll(`julianday('${REFERENCE}')`, `julianday('${now}')`));
      }
    }
    setSystemTime(new Date(now));
    if (scenario.pending === "durable") {
      // Execute the installed Inngest function body; transport/scheduler are
      // deliberately replaced with synchronous deterministic step calls.
      const body = await (triageDrain as any).fn({ env, step: { run: async (_id:string, fn:()=>unknown) => fn() } });
      replies.push({status:200,body});
    } else {
      const response = await handler({ request:new Request("https://example.test/api/cron/scrape",{method:"POST",headers:{authorization:"Bearer synthetic-secret"}}),locals:{runtime:{env}} } as any);
      replies.push({status:response.status,body:await response.json()});
    }
  }
  const db = getDb({DB:binding as any});
  const codecComparison = [];
  if (scenario.codec) {
    const current = await loadWorkableAdmission(binding as any, "workable:coconutva", REFERENCE);
    if (!current.ok) throw new Error(current.reason);
    for (const [index, tags] of [undefined, null, ["remote"]].entries()) {
      const base = { title: "Codec parity", sourcePlatform: "Native", sourceId: "workable:coconutva", tags,
        isActive: false, contentHash: `codec-${index}` };
      const normal = { ...base, contentHash: `${base.contentHash}-normal`, sourceUrl: `https://example.test/codec/${index}/normal` };
      const guarded = { ...base, contentHash: `${base.contentHash}-guarded`, sourceUrl: `https://example.test/codec/${index}/guarded` };
      await db.insert(opportunities).values(normal);
      await insertAdmittedWorkableRow(db, guarded, current);
      const read = (url:string) => sqlite.query("SELECT tags,typeof(tags) AS tagsType,type,location_type,is_active,category FROM opportunities WHERE source_url=?").get(url);
      codecComparison.push({ normal: read(normal.sourceUrl), guarded: read(guarded.sourceUrl) });
    }
  }
  const publicRows = await db.select({id:opportunities.id,title:opportunities.title,sourceId:opportunities.sourceId,sourceUrl:opportunities.sourceUrl,postedAt:opportunities.postedAt}).from(opportunities).where(publicOpportunityFilters());
  console.log(`NATIVE_WORKABLE_PUBLICATION_RESULT ${JSON.stringify({scope:"ACTUAL_0054_ROUTE_PARSER_GEOGATE_AI_ADAPTER_SQLITE_FTS_GATEWAY_SYNTHETIC_TRANSPORT_INITIAL_AUTHORITY_AND_VALIDATED_PACKETS",scenario,clockProjection,appliedMigrations,
    replies,publicRows,rows:sqlite.query("SELECT id,title,source_id,is_active,inactive_reason,ph_eligibility,posted_at,scraped_at,location_type,location_raw FROM opportunities ORDER BY id").all(),raceInjected,codecComparison,
    ledger:sqlite.query("SELECT source_id,tick_key,mode,published_count,published_ids_json FROM source_publication_ledger ORDER BY id").all(),
    ftsCount:(sqlite.query("SELECT count(*) AS n FROM opportunities_fts").get() as any).n,
    initialRegistry,finalRegistry:registry(),transports,aiCalls,maxBoundParameters:Math.max(0,...bindingParameters),
    attempts:sqlite.query("SELECT source_id,last_attempt_at FROM source_fetch_state WHERE source_id LIKE 'workable:%'").all()})}`);
} finally {sqlite.close();setSystemTime();}
