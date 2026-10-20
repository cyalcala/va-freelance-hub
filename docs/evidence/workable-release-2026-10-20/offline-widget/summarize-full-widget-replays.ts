import { join } from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
const proof=import.meta.dir,source=join(proof,"source");
const output=join(proof,"actual-full-widget-replay-summary.json");
if(await Bun.file(output).exists())throw new Error("Preserve existing summary");
const sha=(bytes:Uint8Array)=>createHash("sha256").update(bytes).digest("hex");
const read=async(name:string)=>JSON.parse(await Bun.file(join(proof,name)).text());
const stems=["actual-full-widget-native","actual-full-widget-native-insert-audit","actual-full-widget-native-reverse","actual-full-widget-native-nonph-first"];
const results=[];
for(const stem of stems){
 const r=await read(`${stem}-receipt.json`);
 const exit=Number((await Bun.file(join(proof,`${stem}-run.exit`)).text()).trim());
 results.push({artifact:`${stem}-receipt.json`,sha256:sha(await Bun.file(join(proof,`${stem}-receipt.json`)).bytes()),exit,
  permutation:r.permutation??"original",safetyChecksPassed:r.safetyChecksPassed,
  failedChecks:Object.entries(r.checks).filter(([,passed])=>!passed).map(([name])=>name),totalStored:r.totalStored,totalPublic:r.totalPublic,syntheticAiCalls:r.aiCalls,
  responseSummary:Object.fromEntries(["processed","acceptedForInsert","actualChanges","geoGateRejected","triageBudgetDeferred","pendingPersisted","rejectedPersisted"].map(key=>[key,r.replies[0].body[key]])),
  sources:r.bySource.map((s:any)=>({sourceId:s.sourceId,rawLocationRecords:s.rawLocationRecords,uniqueUrls:s.uniqueUrls,stored:s.storedRows.length,
   storedReasonCounts:s.storedRows.reduce((counts:any,row:any)=>{const key=row.inactive_reason??"active";counts[key]=(counts[key]??0)+1;return counts;},{}),
   public:s.publicRows.map((row:any)=>({id:row.id,url:row.sourceUrl,postedAt:row.postedAt,storedLocation:row.locationRaw,phEligibility:row.phEligibility,capturedCountries:[...new Set(row.capturedVariants.map((v:any)=>v.country))]})),
   ledgerPublished:s.ledger.reduce((n:number,row:any)=>n+row.published_count,0),postingHolds:s.sourceResult[0]?.postingHolds??{}})),
  ...(r.mutationAudit?{firstPublicInsertAudit:r.mutationAudit.slice(0,4)}:{})});
}
const dist=await read("dist-tree-b2768ac40a51ccbd.json");
const distChecks=await Promise.all(dist.files.map(async(f:any)=>{const bytes=await Bun.file(join(source,"apps/web/dist",f.path)).bytes();return bytes.length===f.bytes&&sha(bytes)===f.sha256;}));
const trackedSourceStatus=execFileSync("git",["status","--porcelain"],{cwd:source,encoding:"utf8"});
const receipt={scope:"SUPPLEMENTAL_OFFLINE_ACTUAL_MINIMAL_WIDGET_SHAPE_PROOF_WITH_EXPLICIT_FAILED_ADVERSARIAL_MODEL_CONTROL",recordedAt:new Date().toISOString(),
 sourceCommit:execFileSync("git",["rev-parse","HEAD"],{cwd:source,encoding:"utf8"}).trim(),trackedSourceClean:!trackedSourceStatus.trim(),
 retainedDistInventory:{fileCount:dist.fileCount,treeSha256:dist.treeSha256,allRecordedFilesByteIdentical:distChecks.every(Boolean)},
 inputSha256:"c2897964d774765ef4988c528a36167e9bd288724f1865cd573c9dd880a8363c",runtime:"Bun 1.3.14",results,
 setupFailure:{artifact:"actual-full-widget-native-setup-first.log",exit:1,cause:"Windows command-line size limit before native route execution; full arrays subsequently read from retained input file"},
 nativeChangeMetadata:{artifact:"native-change-metadata-probe.json",fixtureMaps:"Bun Statement.run().changes directly to synthetic D1 meta.changes",
  pinnedImplementation:"sqlite3_total_changes(after) minus before, including trigger effects",directProbe:{bunChanges:2,sqlChanges:1,physicalItemInserts:1,triggerAuditInserts:1},
  officialSources:["https://github.com/oven-sh/bun/blob/bun-v1.3.14/src/jsc/bindings/sqlite/JSSQLStatement.cpp#L2223","https://www.sqlite.org/c3ref/total_changes.html","https://developers.cloudflare.com/d1/worker-api/return-object/#d1result"],
  productionD1TriggerAccounting:"UNVERIFIED; official D1 documentation does not specify FTS trigger inclusion"},
 interpretation:["Original and reversed full minimal arrays pass all16 explicit safety checks with3 and4 public unique openings respectively; exact IDs/dates/countries are retained",
  "Original Crew first insert changes7 creates1 physical row; second duplicate insert changes0 creates0; legacy ledger clamps raw7 to proposed2, so response4/ledger4 versus3 physical public rows is conservative native metadata amplification, not extra exposure",
  "Non-PH-first permutation fails explicit captured-PH support: Crew FA5B16F03E (Honduras; captured alternatives Mexico/US/Costa Rica/Honduras) becomes eligible_likely under deliberately always-positive synthetic primary and skeptic",
  "That red control demonstrates the existing uncertain-geo AI dependency; geoGate/triage/triage-decision/publication-gateway are unchanged34e to f349. It does not establish real AI adjudication, actual D1 publication, or a newly introduced deterministic gate bypass",
  "Input order changes which unique openings receive capped publication; canonical variant consolidation and physical-ID receipts are separate bounded follow-ups, not implemented here",
  "These start with an empty synthetic SQLite opportunity table, distinct from the actual259-existing production baseline; they do not prove production recall or multi-location inactive recovery"],
 preservedLimits:["No provider request, realAI call, production write, source/config/build/ref modification or deployment","Synthetic current authority packets and AI replies; actual inputs are minimal projected fields, not complete rawHTTP responses","No overall all-green claim: permutation red and initial setup failure are preserved","No global serving lifetime-age filter or employer schedule priors added"]};
await Bun.write(output,JSON.stringify(receipt,null,2)+"\n");
console.log(JSON.stringify({output,sha256:sha(await Bun.file(output).bytes()),trackedSourceClean:receipt.trackedSourceClean,distUnchanged:receipt.retainedDistInventory.allRecordedFilesByteIdentical,results:results.map(r=>({permutation:r.permutation,exit:r.exit,totalPublic:r.totalPublic,failedChecks:r.failedChecks}))}));
