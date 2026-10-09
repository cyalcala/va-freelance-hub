import { Database } from "bun:sqlite";
import { mock } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { NewOpportunity } from "@va-hub/db";
import * as scraper from "@va-hub/scraper";

// This child process substitutes only provider-adapter outputs. The currently
// enabled exact-six adapters hardcode remote; these synthetic structured values
// reproduce a consumer boundary, not reachable provider behavior or admission.
const scenario = JSON.parse(process.argv[2]!) as {
  types: Array<string | null>; description?: string; textMarker?: boolean; breezyTextMarker?: boolean;
  dedup?: boolean; postWriteDrift?: boolean; prefixDrift?: boolean;
};
const observed = new Date().toISOString();
const postedAt = new Date(Date.parse(observed) - 86_400_000).toISOString();
const items = scenario.types.map((locationType, i) => ({
  title: scenario.breezyTextMarker ? "National Material Quantity Surveyor"
    : scenario.textMarker ? `Customer Support (On-site) ${i}` : `Customer Support ${i}`,
  company: "Synthetic Fixture Co", type: "freelance", locationType,
  sourceUrl: `https://example.test/fresh-consumer/${i}`,
  sourcePlatform: "Remotive", contentHash: `fixture-${i}`, postedAt,
  description: scenario.breezyTextMarker ? "Location: Bridgetowne Quezon City, PH. Remote: no."
    : scenario.description ?? "Remote role open to applicants in the Philippines.",
  locationRaw: scenario.breezyTextMarker ? "Bridgetowne Quezon City, PH (onsite)"
    : scenario.textMarker ? "On-site in the Philippines" : "Philippines",
  tags: ["remote", "philippines"],
})) as NewOpportunity[];
const feedCalls: string[] = [];
const actualScraper = { ...scraper };
const syntheticFeed = async (source: { id: string }) => {
  feedCalls.push(source.id);
  const selected = scenario.prefixDrift
    ? source.id === "remotive" ? items.slice(0, 1)
      : source.id === "real-work-from-anywhere" ? items.slice(1, 2)
      : source.id === "remote-ok" ? items.slice(2, 3) : []
    : source.id === "remotive" ? items : [];
  return { items: selected, notModified: false,
    etag: null, lastModified: null, bodyHash: `synthetic-${source.id}` };
};
mock.module("@va-hub/scraper", () => ({ ...actualScraper,
  fetchRSSFeed: syntheticFeed, fetchHTMLSource: syntheticFeed,
  fetchJSONSource: syntheticFeed,
  fetchATSFeed: async () => { throw new Error("unexpected ATS adapter call in exact-six fixture"); },
}));
const { getDb, opportunities } = await import("@va-hub/db");
const { createScrapeHandler } = await import("../../src/pages/api/cron/scrape");
const sqlite = new Database(":memory:");
const migrations = join(import.meta.dir, "../../../../packages/db/migrations");
for (const migration of readdirSync(migrations).filter(name => /^\d{4}_.+\.sql$/.test(name)).sort()) {
  try { sqlite.exec(readFileSync(join(migrations, migration), "utf8")); }
  catch (error) { throw new Error(`native schema setup failed at ${migration}`, { cause: error }); }
}
// These are synthetic fixture tables, not observations or mutations of a real
// inventory. An empty governance/directory fixture uses the actual exact-six
// fallback and makes no provider admission.
sqlite.exec("DELETE FROM source_registry; DELETE FROM source_opt_outs; DELETE FROM va_directory; DELETE FROM opportunities;");
const queries: string[] = [];
let ownershipReads = 0;
const binding = { prepare(query: string) {
  queries.push(query);
  const statement = sqlite.query(query);
  let params: any[] = [];
  return {
    bind(...values: any[]) { params = values; return this; },
    async first() {
      if (query.includes("SELECT COUNT(*) AS ownedCount") && query.includes("FROM opportunities")) {
        ownershipReads++;
        if (scenario.postWriteDrift || (scenario.prefixDrift && ownershipReads === 2)) {
          sqlite.query("UPDATE opportunities SET location_type = 'onsite' WHERE id = (SELECT MAX(id) FROM opportunities)").run();
        }
      }
      return statement.get(...params);
    },
    async all() { return { results: statement.all(...params) }; },
    async raw() { return statement.values(...params); },
    async run() { const result = statement.run(...params); return { success: true, meta: { changes: result.changes } }; },
  };
} };
const db = getDb({ DB: binding as any });
let aiCalls = 0;
const transports: string[] = [];
const configuredOrigins = new Set(actualScraper.sources.map(source => new URL(source.url).origin));
globalThis.fetch = (async (input: RequestInfo | URL) => {
  const url = new URL(input instanceof Request ? input.url : String(input));
  if (url.pathname !== "/robots.txt" || !configuredOrigins.has(url.origin)) throw new Error("unexpected transport in fresh scrape fixture");
  transports.push(url.origin);
  return new Response("User-agent: *\nAllow: /\n", { status: 200, headers: { "content-type": "text/plain" } });
}) as typeof fetch;
const env = { DB: binding, CRON_SECRET: "synthetic-cron-secret", AI: { run: async () => {
  aiCalls++;
  return { response: JSON.stringify({ eligibleForFilipinos: true, eligible: true,
    reason: "Open to applicants in the Philippines", category: "support" }) };
} } };
try {
  if (scenario.dedup) await db.insert(opportunities).values(items.map(item => ({ ...item,
    sourceId: "remotive", phEligibility: "eligible_verified" as const, isActive: true,
    contentHash: actualScraper.toContentHash(item.title, item.sourceUrl) })));
  const response = await createScrapeHandler()({
    request: new Request("https://example.test/api/cron/scrape?limit=100", {
      method: "POST", headers: { authorization: "Bearer synthetic-cron-secret" } }),
    locals: { runtime: { env } },
  } as any);
  const result = { status: response.status, body: await response.json(), aiCalls,
    rows: sqlite.query("SELECT id, is_active AS active, inactive_reason AS reason, location_type AS type, source_id AS source FROM opportunities ORDER BY id").all(),
    ftsCount: (sqlite.query("SELECT COUNT(*) AS n FROM opportunities_fts").get() as { n: number }).n,
    ledger: sqlite.query("SELECT source_id AS source, published_count AS n, published_ids_json AS ids FROM source_publication_ledger ORDER BY id").all(),
    ownershipReads, feedCalls, transports,
    opportunityInserts: queries.filter(query => /^insert into \"opportunities\"/i.test(query)).length,
    deleteQueries: queries.filter(query => /^delete\b/i.test(query)).length,
  };
  console.log(`NATIVE_FRESH_SCRAPE_RESULT ${JSON.stringify(result)}`);
} finally { sqlite.close(); }
