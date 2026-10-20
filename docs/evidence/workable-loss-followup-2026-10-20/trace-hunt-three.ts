import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { fetchATSFeed } from "../workable-rotation-release-proof/source/packages/scraper/ats";
import { normalizeScrapedItems } from "../workable-rotation-release-proof/source/apps/web/src/pages/api/cron/scrape";
import { geoGate } from "../workable-rotation-release-proof/source/packages/scraper/geoGate";
import { workableOpeningHold } from "../workable-rotation-release-proof/source/apps/web/src/lib/workable-admission";
import { assessPostingFreshness } from "../workable-rotation-release-proof/source/packages/scraper/publication-freshness";
import { toContentHash } from "../workable-rotation-release-proof/source/packages/scraper/contentHash";
import { selectIntakeBatch } from "../workable-rotation-release-proof/source/apps/web/src/lib/conditional-state";
const root=join(import.meta.dir,"../.."),dir=join(root,"docs/evidence/continuation-2026-10-20");
const inputPaths=["workable-observation.json","workable-reconciliation.json","workable-grouped-cohort.json"];
const inputs=await Promise.all(inputPaths.map(async path=>{const bytes=await readFile(join(dir,path));return{path,sha256:createHash("sha256").update(bytes).digest("hex"),json:JSON.parse(bytes.toString("utf8").replace(/^\uFEFF/,""))};}));
const capture=inputs[0].json,reconciliation=inputs[1].json,grouped=inputs[2].json;
const hunt=capture.sources.find((source:any)=>source.sourceId==="workable:hunt-st");
const raw=hunt.minimalOpenings;
assert.ok(Array.isArray(raw));
const targets=["8902E9B839","13FFDFE94E","BB4A8BD9FA"];
const originalFetch=globalThis.fetch;let syntheticRequests=0;
globalThis.fetch=(async (url)=>{assert.equal(String(url),"https://apply.workable.com/api/v1/widget/accounts/hunt-st");syntheticRequests++;return Response.json({jobs:raw});}) as typeof fetch;
let parsed:any[];
try{parsed=await fetchATSFeed("workable","hunt-st","Hunt St");}finally{globalThis.fetch=originalFetch;}
parsed=parsed.map(row=>({...row,sourceId:"workable:hunt-st"}));
const normalized=normalizeScrapedItems(parsed);
const retainedStored=capture.storedComparison?.results;
assert.ok(Array.isArray(retainedStored));
const retainedUrls=new Set(retainedStored.map((row:any)=>row.source_url));
const restrictedFresh=normalized.items.filter(row=>assessPostingFreshness(row.postedAt,capture.observedEnd).state==="WITHIN_WINDOW");
const restrictedNew=restrictedFresh.filter(row=>!retainedUrls.has(row.sourceUrl));
const restrictedIntake=selectIntakeBatch(restrictedNew,50);
const sourceRecon=reconciliation.sources.find((source:any)=>source.sourceId==="workable:hunt-st");
const sourceGrouped=grouped.sources.find((source:any)=>source.sourceId==="workable:hunt-st");
const retainedPost=JSON.parse((await readFile(join(root,"tmp/workable-exact-loss-reasons-2026-10-20.json"),"utf8")).replace(/^\uFEFF/,""));
const facts=targets.map(code=>{
  const url=`https://apply.workable.com/j/${code}`;
  const variants=raw.filter((row:any)=>row.shortcode===code||row.url===url);
  const parserRows=parsed.filter(row=>row.sourceUrl===url);
  const rows=normalized.items.filter(row=>row.sourceUrl===url);
  assert.equal(variants.length,1);assert.equal(parserRows.length,1);assert.equal(rows.length,1);
  const item=rows[0]!;
  return{shortcode:code,sourceUrl:url,variants,parserRows:parserRows.length,normalizedRows:rows.length,
    normalized:{title:item.title,sourceId:item.sourceId,sourceUrl:item.sourceUrl,applicationUrl:item.applicationUrl,postedAt:item.postedAt,locationRaw:item.locationRaw,locationType:item.locationType,tags:item.tags,description:item.description,contentHash:item.contentHash},
    freshnessAtCapture:assessPostingFreshness(item.postedAt,capture.observedEnd),
    freshnessAtPostRead:assessPostingFreshness(item.postedAt,retainedPost.observedEnd),
    geoGate:geoGate(item),metadataHold:workableOpeningHold(item,capture.observedEnd,true),
    preReleaseRetainedDetail:sourceRecon.details?.filter((row:any)=>row.sourceUrl===url)??sourceRecon.plausibleMissing?.filter((row:any)=>row.sourceUrl===url),
    groupedRetainedDetail:sourceGrouped.details.filter((row:any)=>row.sourceUrl===url),
    postReadExactRows:retainedPost.results.filter((row:any)=>row.source_url===url),
    retainedRawIndex:raw.findIndex((row:any)=>row.url===url),
    retainedHuntHashMatches:normalized.items.filter(row=>row.contentHash===item.contentHash).map(row=>({title:row.title,sourceUrl:row.sourceUrl})),
    restrictedCohortOnlyNewIndex:restrictedNew.findIndex(row=>row.sourceUrl===url),
    restrictedCohortOnlyIntakeSelected:restrictedIntake.selected.some(row=>row.sourceUrl===url),
    calculatedHash:toContentHash(item.title,item.sourceUrl)};
});
const quote=(value:string)=>`'${value.replaceAll("'","''")}'`;
const urls=facts.map(row=>quote(row.sourceUrl)).join(",");
const hashes=facts.map(row=>quote(row.calculatedHash)).join(",");
const query=`SELECT id,source_id,source_url,title,content_hash,is_active,inactive_reason,ph_eligibility,geo_scope,posted_at,scraped_at,updated_at,CASE WHEN source_url IN (${urls}) THEN 'EXACT_URL' ELSE 'HASH_ONLY' END AS match_basis FROM opportunities WHERE source_url IN (${urls}) OR content_hash IN (${hashes}) ORDER BY id LIMIT 7`;
await writeFile(join(root,"tmp/hunt-three-url-hash-readonly-2026-10-20.sql"),query+";\n");
const result={checkedAt:new Date().toISOString(),scope:"RETAINED_INPUT_ACTUAL_F349_PARSER_NORMALIZER_GATES_NO_LIVE_SOURCE_AI_DB_ACCESS",f349:"f34965b0c7bbfb76395259ccce0b60ad4533eee0",captureObservedEnd:capture.observedEnd,postReadObservedEnd:retainedPost.observedEnd,inputs:inputs.map(({json,...rest})=>rest),syntheticTransportRequests:syntheticRequests,normalization:{allHuntRetainedRows:raw.length,parsed:parsed.length,normalized:normalized.items.length,droppedNoUrl:normalized.droppedNoUrl,quarantinedApplicationUrls:normalized.quarantinedApplicationUrls},restrictedCohortOnlyReplay:{scope:"RETAINED_HUNT_ONLY_AND_BOUNDED_PRIOR_D1_ROWS_NOT_PRODUCTION_ALL_SOURCE_STATE",retainedStoredRows:retainedStored.length,freshHuntRows:restrictedFresh.length,newByRetainedUrlSet:restrictedNew.length,limit:50,selected:restrictedIntake.selected.length,deferred:restrictedIntake.deferred.length},facts,query,queryExecuted:false,limitations:["Captured10:14widget is not per-opening evidence of the11:41live response","No complete production newItems list, intake order, per-URL outcome or hash conflict receipt is retained","Initial259-row D1 capture is a bounded same-source read, not a complete simultaneous production batch or all-source state"]};
await writeFile(join(root,"tmp/hunt-three-missing-trace-2026-10-20.json"),JSON.stringify(result,null,2)+"\n");
console.info(JSON.stringify({normalization:result.normalization,facts:facts.map(({shortcode,variants,normalized,freshnessAtCapture,metadataHold,postReadExactRows})=>({shortcode,variants:variants.length,...normalized,freshness:freshnessAtCapture.state,metadataHold,postReadExactRows:postReadExactRows.length})),query}));
