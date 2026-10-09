import { Database } from "bun:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { getDb, opportunities } from "../packages/db/index";
import { sources } from "../packages/scraper/index";
import { createScrapeHandler } from "../apps/web/src/pages/api/cron/scrape";
import { publicOpportunityFilters } from "../apps/web/src/lib/public-opportunities";
const scenario = JSON.parse(process.argv[2]!);
const now = Date.now();
const date = scenario.date === "calendar-repaired" ? "2026-09-31T12:00:00.000Z" : scenario.date === "missing" ? undefined : scenario.date === "invalid" ? "not-a-date" : new Date(now + (scenario.date === "stale" ? -31 : scenario.date === "future" ? 1 : -1) * 86400000).toISOString();
const selected = sources.find(s => s.id === scenario.source)!;
const xml = `<rss><channel><item><title>Audit Customer Support</title><link>https://remotive.com/remote-jobs/customer-support/audit-native-123</link><description>Remote role open to applicants in the Philippines.</description><region>Philippines</region>${date === undefined ? "" : `<pubDate>${date}</pubDate>`}<author>Audit Fixture Co</author></item></channel></rss>`;
const json = JSON.stringify([{position:"Audit Customer Support",company:"Audit Fixture Co",url:"https://remoteok.com/remote-jobs/audit-native-123",description:"Remote role open to applicants in the Philippines.",location:"Philippines",date}]);
const raw = scenario.source === "remote-ok" ? json : xml;
const transports: string[] = [];
globalThis.fetch = (async (input: RequestInfo | URL) => {
  const url = new URL(input instanceof Request ? input.url : String(input));
  transports.push(url.href);
  if (url.pathname === "/robots.txt" && sources.some(s => new URL(s.url).origin === url.origin)) return new Response("User-agent: *\nAllow: /\n");
  const source = sources.find(s => s.url === url.href);
  if (!source) throw new Error("No external transport authorized: " + url.href);
  return new Response(source.id === selected.id ? raw : source.type === "json" ? "[]" : "<rss><channel></channel></rss>", {headers:{"content-type":source.type === "json" ? "application/json" : "application/xml"}});
}) as typeof fetch;
const sqlite = new Database(":memory:");
const migrations=join(import.meta.dir,"../packages/db/migrations");
for (const name of readdirSync(migrations).filter(n=>/^\d{4}_.+\.sql$/.test(n)).sort()) sqlite.exec(readFileSync(join(migrations,name),"utf8"));
sqlite.exec("DELETE FROM source_registry; DELETE FROM source_opt_outs; DELETE FROM va_directory; DELETE FROM opportunities;");
const queries:string[]=[];
const binding={prepare(query:string){queries.push(query); const statement=sqlite.query(query);let params:any[]=[];return {bind(...values:any[]){params=values;return this;},async first(){return statement.get(...params);},async all(){return {results:statement.all(...params)};},async raw(){return statement.values(...params);},async run(){const result=statement.run(...params);return {success:true,meta:{changes:result.changes}};}};}};
let aiCalls=0;
const env={DB:binding,CRON_SECRET:"synthetic-secret",AI:{run:async()=>{aiCalls++;return {response:JSON.stringify({eligibleForFilipinos:true,eligible:true,reason:"Open to applicants in the Philippines",category:"support"})};}}};
try {
 const response=await createScrapeHandler()({request:new Request("https://example.test/api/cron/scrape?limit=100",{method:"POST",headers:{authorization:"Bearer synthetic-secret"}}),locals:{runtime:{env}}} as any);
 const db=getDb({DB:binding as any});
 const visible=await db.select({id:opportunities.id}).from(opportunities).where(publicOpportunityFilters());
 console.log("AUDIT_RESULT "+JSON.stringify({scenario,rawResponse:raw,status:response.status,body:await response.json(),aiCalls,rows:sqlite.query("SELECT id,is_active,location_type,ph_eligibility,posted_at,scraped_at FROM opportunities").all(),visible,fts:sqlite.query("SELECT count(*) AS n FROM opportunities_fts").get(),ledger:sqlite.query("SELECT source_id,published_count,published_ids_json FROM source_publication_ledger").all(),transports,scope:"SYNTHETIC_RAW_RESPONSE_REAL_PARSERS_NATIVE_ROUTE_SQLITE_NO_NETWORK_NO_PRODUCTION"}));
} finally {sqlite.close();}


