import { expect, test } from "bun:test";
import { fileURLToPath } from "node:url";

async function native(scenario: Record<string,unknown>) {
  const child=Bun.spawn([process.execPath,"run","--no-env-file","--preload","./scripts/ci/test-environment.ts",
    "./apps/web/tests/fixtures/native-workable-publication.ts",JSON.stringify(scenario)],{
    cwd:fileURLToPath(new URL("../../..",import.meta.url)),stdout:"pipe",stderr:"pipe"});
  const [stdout,stderr,exit]=await Promise.all([new Response(child.stdout).text(),new Response(child.stderr).text(),child.exited]);
  if(exit!==0)throw new Error(`Native fixture failed ${exit}: ${stderr.slice(-2200)}`);
  const markers=stdout.split(/\r?\n/).filter(line=>line.startsWith("NATIVE_WORKABLE_PUBLICATION_RESULT "));
  if(markers.length!==1)throw new Error(`Missing native result: ${stdout.slice(-1000)} ${stderr.slice(-1000)}`);
  const r=JSON.parse(markers[0]!.slice("NATIVE_WORKABLE_PUBLICATION_RESULT ".length));
  r.reactivationHolds = stdout.split(/\r?\n/).filter(line => line.startsWith('{"event":"WORKABLE_REACTIVATION_HOLD"')).map(line => JSON.parse(line));
  r.admissionHolds = stdout.split(/\r?\n/).filter(line => line.startsWith('{"event":"WORKABLE_ADMISSION_HOLD"')).map(line => JSON.parse(line));
  r.pendingHolds = stdout.split(/\r?\n/).filter(line => line.startsWith('{"event":"WORKABLE_PENDING_HOLD"')).map(line => JSON.parse(line));
  console.log(`NATIVE_WORKABLE_PUBLICATION_EVIDENCE ${JSON.stringify(r)}`);
  expect(r.replies.every((x:any)=>x.status===200)).toBe(true);
  expect(r.transports.every((x:any)=>x.allowed)).toBe(true);
  expect(r.maxBoundParameters).toBeLessThanOrEqual(100);
  expect(r.finalRegistry).toEqual(r.initialRegistry);
  expect(r.appliedMigrations.at(-1)).toBe("0054_public_serving_snapshot.sql");
  expect(r.clockProjection).toHaveLength(1);
  return r;
}
test("fresh date-only Workable opening reaches real public rows and FTS under retained canary cap",async()=>{
  const r=await native({kind:"fresh"});
  expect(r.publicRows).toHaveLength(2);
  expect(r.publicRows.every((x:any)=>x.postedAt==="2026-10-17T00:00:00.000Z")).toBe(true);
  expect(r.publicRows.every((x:any)=>Number.isSafeInteger(x.id)&&x.id>0)).toBe(true);
  expect(r.ftsCount).toBe(2);
  expect(r.ledger.every((x:any)=>x.published_count<=2)).toBe(true);
},45000);
test("admitted registry-only tenants escape disabled directory rotation and a full RSS head",async()=>{
  const r=await native({kind:"fresh",starvation:true,rssHead:true});
  expect(r.transports.filter((x:any)=>x.kind==="workable").map((x:any)=>x.token)).toEqual(["coconutva","crewbloom"]);
  expect(r.publicRows).toHaveLength(2);
  expect(r.replies[0].body.processed).toBe(50);
  expect(r.replies[0].body.backlogRemaining).toBe(2);
},45000);
for(const kind of ["stale","future","impossible","created-only","us","onsite"]){
  test(`native Workable ${kind} opening remains unpublished`,async()=>{
    const r=await native({kind});expect(r.publicRows).toEqual([]);expect(r.ledger).toEqual([]);expect(r.aiCalls).toBe(0);
  },45000);
}
for(const robots of ["disallowed","http503"]){
  test(`native Workable ${robots} robots withholds widget requests`,async()=>{
    const r=await native({robots,starvation:true});expect(r.transports.filter((x:any)=>x.kind==="workable")).toEqual([]);
    expect(r.publicRows).toEqual([]);expect(r.aiCalls).toBe(0);
  },45000);
}
test("mixed observed openings retain per-source two-item publication cap and deferred URLs retry without duplicates",async()=>{
  const r=await native({kind:"mixed",repeat:true});
  expect(r.publicRows.filter((x:any)=>x.sourceId==="workable:coconutva")).toHaveLength(3);
  expect(r.publicRows.filter((x:any)=>x.sourceId==="workable:crewbloom")).toHaveLength(3);
  expect(r.publicRows.every((x:any)=>!/(stale|onsite|us)/.test(x.title))).toBe(true);
  expect(new Set(r.publicRows.map((x:any)=>x.sourceUrl)).size).toBe(r.publicRows.length);
  expect(r.ledger.every((x:any)=>x.published_count<=2)).toBe(true);
},45000);

for (const reactivation of ["onsite", "us", "stored-stale", "stored-missing", "stored-onsite", "stored-restricted", "current-restricted", "identity"]) {
  test(`native existing Workable ${reactivation} cannot reactivate from a fresh widget date`, async () => {
    const r = await native({ reactivation });
    expect(r.publicRows).toEqual([]);
    expect(r.rows.every((row:any) => row.is_active === 0)).toBe(true);
    expect(r.ledger).toEqual([]);
    expect(r.aiCalls).toBe(0);
    expect(r.reactivationHolds).toHaveLength(2);
    const reasons: Record<string,string> = { onsite: "CURRENT_PH_INELIGIBLE", us: "CURRENT_PH_INELIGIBLE",
      "stored-stale": "STORED_POSTING_DATE_STALE", "stored-missing": "STORED_POSTING_DATE_UNKNOWN", "stored-onsite": "STORED_NOT_REMOTE",
      "stored-restricted": "STORED_GEO_RESTRICTION", "current-restricted": "CURRENT_GEO_RESTRICTION", identity: "SOURCE_IDENTITY_MISMATCH" };
    expect(r.reactivationHolds.every((hold:any) => hold.reason === reasons[reactivation])).toBe(true);
    if (reactivation === "stored-stale") expect(r.rows.every((row:any) => row.posted_at === "2020-01-14T00:00:00.000Z")).toBe(true);
  },45000);
}

test("native fresh Workable recovery keeps original posting date and reactivates through the gateway", async () => {
  const r = await native({ reactivation: "fresh" });
  expect(r.publicRows).toHaveLength(2);
  expect(r.rows.every((row:any) => row.is_active === 1 && row.posted_at === "2026-10-17T00:00:00.000Z")).toBe(true);
  expect(r.ledger.every((row:any) => row.published_count === 1)).toBe(true);
  expect(r.ftsCount).toBe(2);
  expect(r.aiCalls).toBe(0);
},45000);

for (const reactivation of ["source-race", "facts-race", "date-race", "eligibility-race"]) {
  test(`native existing Workable ${reactivation} is fenced at the activation mutation`, async () => {
    const r = await native({ reactivation });
    expect(r.raceInjected).toBe(true);
    expect(r.publicRows).toEqual([]);
    expect(r.rows.every((row:any) => row.is_active === 0)).toBe(true);
    expect(r.ledger.every((row:any) => row.published_count === 0)).toBe(true);
    expect(r.aiCalls).toBe(0);
    expect(r.reactivationHolds.every((hold:any) => hold.reason === "STORED_FACTS_CHANGED")).toBe(true);
    expect(r.reactivationHolds).toHaveLength(2);
  },45000);
}

for (const admission of ["missing", "stale-revision", "expired"]) {
  test(`native Workable ${admission} admission withholds widget transport and public exposure`, async () => {
    const r = await native({ admission });
    expect(r.transports.filter((row:any) => row.kind === "workable")).toEqual([]);
    expect(r.publicRows).toEqual([]);
    expect(r.ledger).toEqual([]);
    expect(r.admissionHolds).toHaveLength(7);
    expect(r.aiCalls).toBe(0);
  },45000);
}

for (const admission of ["publish-race", "reactivate-race"]) {
  test(`native Workable ${admission} invalidates admission at public mutation`, async () => {
    const r = await native({ admission, ...(admission === "reactivate-race" ? { reactivation: "fresh" } : {}) });
    expect(r.raceInjected).toBe(true);
    expect(r.publicRows).toEqual([]);
    expect(r.rows.every((row:any) => row.is_active === 0)).toBe(true);
    expect(r.ledger.every((row:any) => row.published_count === 0)).toBe(true);
  },45000);
}

test("native permitted non-Workable ATS still reaches its provider transport without a Workable admission", async () => {
  const r = await native({ nonWorkable: true });
  expect(r.transports.filter((row:any) => row.kind === "non-workable")).toHaveLength(1);
  const result = r.replies[0].body.sourceResults.find((row:any) => row.sourceId === "lever:native-control");
  expect(result.ok).toBe(true);
  expect(Boolean(result.skipped)).toBe(false);
},45000);

test("native Workable reactivation and new inserts share the two-item source tick cap and retry later", async () => {
  const r = await native({ kind: "mixed", reactivation: "fresh", repeat: true });
  const sums = new Map<string,number>();
  for (const row of r.ledger) {
    const key = `${row.source_id}:${row.tick_key}`;
    sums.set(key, (sums.get(key) ?? 0) + row.published_count);
  }
  expect([...sums.values()].every(n => n <= 2)).toBe(true);
  expect(r.ledger.every((row:any) => row.tick_key.startsWith("scrape:"))).toBe(true);
  expect(r.publicRows.filter((row:any) => row.sourceId === "workable:coconutva")).toHaveLength(3);
  expect(r.publicRows.filter((row:any) => row.sourceId === "workable:crewbloom")).toHaveLength(3);
  expect(new Set(r.publicRows.map((row:any) => row.sourceUrl)).size).toBe(6);
  expect(r.publicRows.every((row:any) => !/(onsite|stale|us)/.test(row.title))).toBe(true);
},45000);

test("native admitted Workable insertion preserves Drizzle null, JSON, boolean and default storage", async () => {
  const r = await native({ codec: true });
  expect(r.codecComparison).toHaveLength(3);
  for (const pair of r.codecComparison) expect(pair.guarded).toEqual(pair.normal);
  expect(r.codecComparison[1].guarded.tags).toBe(null);
  expect(r.codecComparison[1].guarded.tagsType).toBe("null");
},45000);

for (const pending of ["fresh", "drain-fresh"]) {
  test(`native Workable ${pending} pending recovery uses admitted public mutation and the shared scrape cap`, async () => {
    const r = await native({ pending });
    expect(r.publicRows).toHaveLength(2);
    expect(r.ledger.every((row:any) => row.published_count === 1 && row.tick_key.startsWith("scrape:"))).toBe(true);
    expect(r.pendingHolds).toEqual([]);
    expect(r.aiCalls).toBe(pending === "fresh" ? 0 : 2);
  },45000);
}

for (const pending of ["fresh", "drain-fresh"]) {
  test(`native Workable ${pending} pending rows cannot bypass a revoked admission`, async () => {
    const r = await native({ pending, admission: "stale-revision" });
    expect(r.publicRows).toEqual([]);
    expect(r.ledger.every((row:any) => row.published_count === 0)).toBe(true);
    expect(r.aiCalls).toBe(0);
    expect(r.pendingHolds).toHaveLength(2);
  },45000);
}

for (const pending of ["stale", "onsite", "drain-stale", "drain-onsite"]) {
  test(`native Workable ${pending} pending opening remains hidden`, async () => {
    const r = await native({ pending });
    expect(r.publicRows).toEqual([]);
    expect(r.rows.every((row:any) => row.is_active === 0)).toBe(true);
    expect(r.aiCalls).toBe(0);
    expect(r.pendingHolds).toHaveLength(2);
  },45000);
}

for (const pending of ["facts-race", "drain-race", "drain-company-race", "drain-application-race"]) {
  test(`native Workable ${pending} pending activation is fenced by stored facts CAS`, async () => {
    const r = await native({ pending });
    expect(r.raceInjected).toBe(true);
    expect(r.publicRows).toEqual([]);
    expect(r.rows.every((row:any) => row.is_active === 0)).toBe(true);
    expect(r.ledger.every((row:any) => row.published_count === 0)).toBe(true);
  },45000);
}

test("native Workable pending and new rows share the source tick cap", async () => {
  const r = await native({ pending: "mixed", kind: "mixed" });
  expect(r.publicRows).toHaveLength(2);
  expect(r.publicRows.every((row:any) => row.title.includes("pending"))).toBe(true);
  expect(r.ledger.every((row:any) => row.tick_key.startsWith("scrape:"))).toBe(true);
},45000);

test("native separate durable Workable triage defers explicitly before AI or public mutation", async () => {
  const r = await native({ pending: "durable" });
  expect(r.publicRows).toEqual([]);
  expect(r.aiCalls).toBe(0);
  expect(r.ledger).toEqual([]);
  expect(r.pendingHolds).toHaveLength(2);
  expect(r.pendingHolds.every((row:any) => row.reason === "DURABLE_WORKABLE_PUBLICATION_NOT_ACCEPTED")).toBe(true);
  expect(r.replies[0].body.deferred).toBe(2);
},45000);

test("native unclear but fresh remote Workable pending rows still use existing AI and skeptic recovery", async () => {
  const r = await native({ pending: "drain-fresh", unclearPending: true, currentPendingUnclear: true });
  expect(r.publicRows).toHaveLength(2);
  expect(r.aiCalls).toBe(4);
  expect(r.pendingHolds).toEqual([]);
},45000);

test("native current PH widget evidence recovers pending rows with unclear stored text without AI", async () => {
  const r = await native({ pending: "fresh", unclearPending: true });
  expect(r.publicRows).toHaveLength(2);
  expect(r.aiCalls).toBe(0);
  expect(r.pendingHolds).toEqual([]);
},45000);

test("native unclear current widget evidence defers zero-AI pending recovery", async () => {
  const r = await native({ pending: "fresh", currentPendingUnclear: true });
  expect(r.publicRows).toEqual([]);
  expect(r.aiCalls).toBe(0);
  expect(r.pendingHolds).toHaveLength(2);
  expect(r.pendingHolds.every((hold:any) => hold.reason === "CURRENT_PH_UNCLEAR")).toBe(true);
},45000);

for (const pending of ["fresh", "drain-fresh"]) for (const pendingCurrent of ["missing", "stale-original", "onsite", "us"]) {
  test(`native Workable ${pending} pending with ${pendingCurrent} current opening stays hidden despite fresh stored creation date`, async () => {
    const r = await native({ pending, pendingCurrent });
    expect(r.publicRows).toEqual([]);
    expect(r.rows.every((row:any) => row.is_active === 0 && row.posted_at === "2026-10-17T00:00:00.000Z")).toBe(true);
    expect(r.aiCalls).toBe(0);
    expect(r.pendingHolds).toHaveLength(2);
  },45000);
}

for (const activation of ["feed", "pending", "drain"]) for (const earlier of ["current", "stored"]) {
  test(`native Workable ${activation} activation preserves the earlier ${earlier} original date and first storage time`, async () => {
    const r = await native({ ...(activation === "feed" ? { reactivation: "fresh" } : { pending: activation === "pending" ? "fresh" : "drain-fresh" }),
      currentPublishedOn: earlier === "current" ? "2026-09-19" : "2026-10-17",
      storedPostedAt: earlier === "stored" ? "2026-09-19T00:00:00.000Z" : "2026-10-17T00:00:00.000Z" });
    expect(r.publicRows).toHaveLength(2);
    expect(r.publicRows.every((row:any) => row.postedAt === "2026-09-19T00:00:00.000Z")).toBe(true);
    expect(r.rows.every((row:any) => row.scraped_at === "2026-10-18T08:00:00.000Z")).toBe(true);
  },45000);
}
