import { Database } from "bun:sqlite";
import { setSystemTime } from "bun:test";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { getDb, opportunities } from "@va-hub/db";
import { D1_MAX_BOUND_PARAMETERS, enabledSources, fetchJSONSource, fetchRSSFeed, sources, type Source } from "@va-hub/scraper";
import { publicOpportunityFilters } from "../../src/lib/public-opportunities";
import { createScrapeHandler } from "../../src/pages/api/cron/scrape";

const REFERENCE = "2026-10-10T12:00:00.000Z";
const STALE = "2026-09-09T12:00:00.000Z";
const CLOCK_SCOPE = "CLOCK_PROJECTED_NATIVE_TRIGGERS_NOT_BYTE_IDENTICAL_RUNTIME_PROOF";
const scenario = JSON.parse(process.argv[2]!) as {
  source: "remotive" | "remote-ok";
  dates: Array<string | null>;
  dedup?: boolean;
  postWriteDrift?: boolean;
  prefixDrift?: boolean;
  sourceDates?: Record<string, Array<string | null>>;
  enforceD1BindingBudget?: boolean;
  failOpportunityInsertAttempt?: number;
  duplicateSourceUrlIndex?: number;
};
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
const xmlText = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const selected = sources.find(source => source.id === scenario.source);
if (!selected || (selected.type !== "rss" && selected.type !== "json")) throw new Error("unsupported native fixture source");
const sourceDates = new Map<string, Array<string | null>>(scenario.sourceDates ? Object.entries(scenario.sourceDates) : scenario.prefixDrift
  ? [["remotive", scenario.dates.slice(0, 1)], ["real-work-from-anywhere", scenario.dates.slice(1, 2)], ["remote-ok", scenario.dates.slice(2, 3)]]
  : [[selected.id, scenario.dates]]);
for (const [id] of sourceDates) {
  const source = sources.find(candidate => candidate.id === id);
  if (!["remotive", "remote-ok", "real-work-from-anywhere"].includes(id)
    || !source || (source.type !== "rss" && source.type !== "json")) throw new Error("unsupported grouped native fixture source");
}
function rawBody(source: Source, dates: Array<string | null>): string {
  const rows = dates.map((date, index) => ({
    title: `Customer Support ${source.id} ${index}`,
    url: source.id === "remote-ok" ? `https://remoteok.com/remote-jobs/native-posting-${scenario.duplicateSourceUrlIndex === index ? 0 : index}`
      : source.id === "real-work-from-anywhere" ? `https://www.realworkfromanywhere.com/jobs/native-posting-${scenario.duplicateSourceUrlIndex === index ? 0 : index}`
      : `https://remotive.com/remote-jobs/customer-support/native-posting-${scenario.duplicateSourceUrlIndex === index ? 0 : index}`,
    date,
  }));
  if (source.type === "json") return JSON.stringify(rows.map(row => ({
    position: row.title, company: "Native Posting Fixture Co", url: row.url,
    description: "Remote role open to applicants in the Philippines.", location: "Philippines",
    ...(row.date === null ? {} : { date: row.date }),
  })));
  return `<rss><channel>${rows.map(row => `<item><title>${xmlText(row.title)}</title><link>${xmlText(row.url)}</link>`
    + "<description>Remote role open to applicants in the Philippines.</description><region>Philippines</region>"
    + (row.date === null ? "" : `<pubDate>${xmlText(row.date)}</pubDate>`)
    + "<author>Native Posting Fixture Co</author></item>").join("")}</channel></rss>`;
}
const rawInputs = [...sourceDates].map(([id, dates]) => {
  const source = sources.find(candidate => candidate.id === id)!;
  return { source: id, dates, body: rawBody(source, dates) };
});
const rawBySource = new Map(rawInputs.map(input => [input.source, input.body]));
const enabledByUrl = new Map(enabledSources.map(source => [new URL(source.url).href, source]));
const allowedOrigins = new Set(enabledSources.map(source => new URL(source.url).origin));
const transports: Array<{ phase: string; source: string | null; url: string }> = [];
let phase = "parser-preview";
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const request = input instanceof Request ? input : null;
  const url = new URL(request?.url ?? String(input));
  const method = (init?.method ?? request?.method ?? "GET").toUpperCase();
  if (method !== "GET") throw new Error("unexpected non-GET synthetic transport");
  if (url.pathname === "/robots.txt" && allowedOrigins.has(url.origin)) {
    transports.push({ phase, source: null, url: url.href });
    return new Response("User-agent: *\nAllow: /\n", { status: 200, headers: { "content-type": "text/plain" } });
  }
  const source = enabledByUrl.get(url.href);
  if (!source) throw new Error("unexpected transport in raw posting fixture");
  transports.push({ phase, source: source.id, url: url.href });
  return new Response(rawBySource.get(source.id) ?? (source.type === "json" ? "[]" : "<rss><channel></channel></rss>"), {
    status: 200, headers: { "content-type": source.type === "json" ? "application/json" : "application/rss+xml" },
  });
}) as typeof fetch;

setSystemTime(new Date(REFERENCE));
const sqlite = new Database(":memory:");
try {
  const migrations = join(import.meta.dir, "../../../../packages/db/migrations");
  for (const name of readdirSync(migrations).filter(name => /^\d{4}_.+\.sql$/.test(name)).sort()) {
    // Every migration is executed byte-unchanged before the explicit clock seam.
    sqlite.exec(readFileSync(join(migrations, name), "utf8"));
  }
  const ledgerTriggers = sqlite.query("SELECT name, sql FROM sqlite_schema WHERE type = 'trigger' AND tbl_name = 'source_publication_ledger' ORDER BY name")
    .all() as Array<{ name: string; sql: string }>;
  const literal = "julianday('now')";
  const fixedLiteral = `julianday('${REFERENCE}')`;
  let replacementCount = 0;
  const clockProjection = ledgerTriggers.map(trigger => {
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
  // Only these fresh in-memory fixture tables are cleared. The real registry
  // reader and exact-six fallback remain responsible for source authority.
  sqlite.exec("DELETE FROM source_registry; DELETE FROM source_opt_outs; DELETE FROM va_directory; DELETE FROM opportunities;");

  const queries: string[] = [];
  const bindingAttempts: Array<{ opportunityInsert: boolean; parameters: number; rejected: boolean }> = [];
  const actualReturnedIds: number[][] = [];
  let opportunityInsertAttempts = 0;
  let insertFaultInjected = false;
  let ownershipReads = 0;
  const binding = { prepare(query: string) {
    queries.push(query);
    const statement = sqlite.query(query);
    let params: any[] = [];
    return {
      bind(...values: any[]) {
        // Reproduce only D1's parameter cap. SQLite still executes the real
        // statement, migrations, FTS and receipt triggers; this is not D1 parity.
        const rejected = scenario.enforceD1BindingBudget === true && values.length > D1_MAX_BOUND_PARAMETERS;
        bindingAttempts.push({ opportunityInsert: /^insert into "opportunities"/i.test(query), parameters: values.length, rejected });
        if (rejected) throw new Error(`D1_BINDING_BUDGET_EXCEEDED:${values.length}>${D1_MAX_BOUND_PARAMETERS}`);
        params = values;
        return this;
      },
      async first() {
        if (query.includes("SELECT COUNT(*) AS ownedCount") && query.includes("FROM opportunities")) {
          ownershipReads++;
          if (scenario.postWriteDrift || (scenario.prefixDrift && ownershipReads === 2)) {
            sqlite.query("UPDATE opportunities SET posted_at = ? WHERE id = (SELECT MAX(id) FROM opportunities)").run(STALE);
          }
        }
        return statement.get(...params);
      },
      async all() { return { results: statement.all(...params) }; },
      async raw() {
        if (/^insert into "opportunities"/i.test(query) && /returning/i.test(query)) {
          opportunityInsertAttempts++;
          // Fail before this statement executes; earlier SQLite chunks remain.
          if (opportunityInsertAttempts === scenario.failOpportunityInsertAttempt) {
            insertFaultInjected = true;
            throw new Error("SYNTHETIC_LATER_OPPORTUNITY_CHUNK_FAILURE");
          }
        }
        const rows = statement.values(...params);
        if (/^insert into "opportunities"/i.test(query) && /returning/i.test(query)) actualReturnedIds.push(rows.map(row => Number(row[0])));
        return rows;
      },
      async run() {
        const result = statement.run(...params);
        // Native metadata remains untouched, including the existing FTS-related
        // changes proxy. Physical opportunity rows are counted independently.
        return { success: true, meta: { changes: result.changes } };
      },
    };
  } };
  const db = getDb({ DB: binding as any });
  const parsed = [];
  const parsedItems = [];
  for (const [id] of sourceDates) {
    const source = sources.find(candidate => candidate.id === id)!;
    const output = source.type === "json" ? await fetchJSONSource(source) : await fetchRSSFeed(source);
    parsed.push({ source: id, items: output.items.map(item => ({ title: item.title, postedAt: item.postedAt ?? null,
      sourceUrl: item.sourceUrl, locationType: item.locationType, locationRaw: item.locationRaw })) });
    parsedItems.push(...output.items.map(item => ({ ...item, sourceId: id })));
  }
  if (scenario.dedup) {
    // Seed through real bounded statements before observing the route.
    for (let offset = 0; offset < parsedItems.length; offset += 3) {
      await db.insert(opportunities).values(parsedItems.slice(offset, offset + 3).map(item => ({
        ...item, phEligibility: "eligible_verified" as const, isActive: true,
      })));
    }
  }
  queries.length = 0;
  actualReturnedIds.length = 0;
  bindingAttempts.length = 0;
  opportunityInsertAttempts = 0;
  let aiCalls = 0;
  const env = { DB: binding, CRON_SECRET: "synthetic-cron-secret", AI: { run: async () => {
    aiCalls++;
    return { response: JSON.stringify({ eligibleForFilipinos: true, eligible: true,
      reason: "Open to applicants in the Philippines", category: "support" }) };
  } } };
  phase = "route";
  const response = await createScrapeHandler()({
    request: new Request("https://example.test/api/cron/scrape?limit=100", { method: "POST",
      headers: { authorization: "Bearer synthetic-cron-secret" } }),
    locals: { runtime: { env } },
  } as any);
  const visible = await db.select({ id: opportunities.id }).from(opportunities).where(publicOpportunityFilters());
  const result = {
    scope: { transport: "SYNTHETIC_ALLOWLISTED_RAW_PROVIDER_RESPONSES", parser: "ACTUAL_RSS_AND_REMOTEOK_JSON",
      persistence: "ACTUAL_ROUTE_DRIZZLE_NATIVE_SQLITE_FTS_GATEWAY", clock: CLOCK_SCOPE,
      reference: REFERENCE, replacementCount, clockProjection,
      bindingBudget: scenario.enforceD1BindingBudget ? "D1_PARAMETER_CAP_ONLY_NOT_FULL_D1_RUNTIME" : "NO_D1_PARAMETER_CAP_SIMULATION",
      maxBoundParameters: D1_MAX_BOUND_PARAMETERS,
      limitation: "Bun has no SQLite UDF registration; installed Node SQLite has no FTS5. Only literal ledger clock is projected; no live D1/provider/browser evidence." },
    scenario, rawInputs, parsed, status: response.status, body: await response.json(), aiCalls,
    rows: sqlite.query("SELECT id, title, is_active AS active, inactive_reason AS reason, ph_eligibility AS eligibility, location_type AS type, source_id AS source, posted_at AS postedAt, scraped_at AS scrapedAt, updated_at AS updatedAt FROM opportunities ORDER BY id").all(),
    visible, ftsCount: (sqlite.query("SELECT COUNT(*) AS n FROM opportunities_fts").get() as { n: number }).n,
    ledger: sqlite.query("SELECT source_id AS source, published_count AS n, published_ids_json AS ids FROM source_publication_ledger ORDER BY id").all(),
    ownershipReads, actualReturnedIds, transports, bindingAttempts, opportunityInsertAttempts, insertFaultInjected,
    opportunityInserts: queries.filter(query => /^insert into "opportunities"/i.test(query)).length,
    deleteQueries: queries.filter(query => /^delete\b/i.test(query)).length,
  };
  console.log(`NATIVE_POSTING_DATE_RESULT ${JSON.stringify(result)}`);
} finally { sqlite.close(); setSystemTime(); }
