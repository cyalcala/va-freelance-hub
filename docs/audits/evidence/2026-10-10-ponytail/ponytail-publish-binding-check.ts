import { getDb } from "../packages/db/client";
import { opportunities } from "../packages/db/schema";
import { D1_MAX_BOUND_PARAMETERS } from "../packages/scraper/batch";
import { publishGroupedInserts } from "../apps/web/src/lib/publish-opportunities";
for (const name of ["TURSO_DATABASE_URL", "TURSO_AUTH_TOKEN", "OPENROUTER_API_KEY"]) delete process.env[name];
globalThis.fetch = (async () => { throw new Error("NETWORK_DISABLED_FOR_OFFLINE_QUERY_COMPILE"); }) as typeof fetch;
const observedAt = "2026-10-10T12:00:00.000Z";
const mkrow = (i: number) => ({ title: `Support ${i}`, company: "Fixture", type: "freelance" as const,
 sourceUrl: `https://example.test/${i}`, sourcePlatform: "Remotive", sourceId: "remotive", tags: ["remote"], category: "customer-service",
 locationType: "remote" as const, clientTimezone: null, payRange: null, description: "Remote support in the Philippines", applicationUrl: `https://example.test/${i}`,
 postedAt: "2026-10-09T12:00:00.000Z", scrapedAt: observedAt, isActive: true, inactiveReason: null, contentHash: `hash-${i}`, descriptionHash: `description-${i}`,
 experienceLevel: null, clickCount: 0, failedVerificationCount: 0, updatedAt: observedAt, lastSeenInFeedAt: observedAt, lastVerifiedAt: null,
 locationRaw: "Philippines", geoScope: "ph_only" as const, phEligibility: "eligible_verified" as const, geoEvidence: "Philippines", geoCheckedAt: observedAt });
const db = getDb({ DB: { prepare() { throw new Error("COMPILE_ONLY_NO_DATABASE_EXECUTION"); } } } as any);
const compiled = (rows: ReturnType<typeof mkrow>[]) => db.insert(opportunities).values(rows).onConflictDoNothing().returning({ id: opportunities.id }).toSQL();
const sizes = [1, 2, 3, 4, 5, 200].map(n => { const q = compiled(Array.from({length:n},(_,i)=>mkrow(i))); return { rows:n, bindings:q.params.length, exceedsBudget:q.params.length>D1_MAX_BOUND_PARAMETERS }; });
const fakePolicyDatabase = { prepare(query: string) { let params: unknown[]=[]; return {
 bind(...v: unknown[]) { params=v; return this; },
 async first() { if(query.includes("SUM(published_count)")) return { published:0 }; return null; },
 async run() { return {success:true}; },
}; } };
const callbackGroups: Array<{rows:number;bindings:number}> = [];
const outcome = await publishGroupedInserts(fakePolicyDatabase as any, async rows => {
 const q=compiled(rows as ReturnType<typeof mkrow>[]); callbackGroups.push({rows:rows.length,bindings:q.params.length}); return [];
}, Array.from({length:4},(_,i)=>mkrow(i)), observedAt, "ingest");
if (sizes.find(x=>x.rows===3)?.bindings !== 90 || sizes.find(x=>x.rows===4)?.bindings !== 120 || callbackGroups[0]?.rows !== 4) throw new Error("Unexpected query shape; inspect rather than count as evidence");
console.log("PONYTAIL_QUERY_COMPILE_RESULT " + JSON.stringify({runtime:Bun.version,kind:"COMPILED_DRIZZLE_QUERY_AND_FAKE_POLICY_CONTROL_NOT_D1_EXECUTION",budget:D1_MAX_BOUND_PARAMETERS,normalizedRowFields:Object.keys(mkrow(0)).length,sizes,callbackGroups,outcome,noDatabaseExecution:true,noNetwork:true}));

