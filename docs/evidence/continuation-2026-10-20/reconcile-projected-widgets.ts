import { createHash } from 'node:crypto';
import { fetchATSFeed } from '../../../tmp/workable-rotation-release-proof/source/packages/scraper/ats';
import { workableOpeningHold } from '../../../tmp/workable-rotation-release-proof/source/apps/web/src/lib/workable-admission';
const input='docs/evidence/continuation-2026-10-20/workable-observation.json';
const file='tmp/workable-reconciliation-reproduced-2026-10-20.json';
if(await Bun.file(file).exists())throw new Error('Preserve existing reconciliation');
const capture:any=await Bun.file(input).json();
const nativeFetch=globalThis.fetch;
const output:any={input,inputSha256:createHash('sha256').update(await Bun.file(input).text()).digest('hex'),evaluatedAt:capture.observedEnd,scope:'PROJECTED_ACTUAL_WIDGET_FIELDS_OFFLINE_PARSER_AND_CURRENT_D1_RECONCILIATION',sources:[]};
const stored=capture.storedComparison?.results;
if(!Array.isArray(stored))throw new Error('Stored comparison unavailable');
try{
  for(const source of capture.sources.filter((x:any)=>x.status==='OBSERVED')){
    const token=source.sourceId.split(':')[1];
    globalThis.fetch=(async(input:any)=>{if(String(input)!==source.endpoint)throw new Error('No external requests in offline reconciliation');return new Response(JSON.stringify({jobs:source.minimalOpenings}),{status:200,headers:{'Content-Type':'application/json'}});}) as typeof fetch;
    const parsed=await fetchATSFeed('workable',token,token==='hunt-st'?'Hunt St':'CrewBloom');
    const holds:Record<string,number>={};
    const details=parsed.map((job:any)=>{
      job.sourceId=source.sourceId;
      const hold=workableOpeningHold(job,capture.observedEnd,true);
      holds[hold??'CURRENT_METADATA_PLAUSIBLY_ELIGIBLE']=(holds[hold??'CURRENT_METADATA_PLAUSIBLY_ELIGIBLE']??0)+1;
      const matches=stored.filter((r:any)=>r.source_url===job.sourceUrl);
      return{sourceUrl:job.sourceUrl,title:job.title,postedAt:job.postedAt,locationRaw:job.locationRaw,currentMetadataHold:hold,exactStored:matches.map((r:any)=>({id:r.id,sourceId:r.source_id,active:r.is_active,phEligibility:r.ph_eligibility,postedAt:r.posted_at,scrapedAt:r.scraped_at})),exactActiveEligibleStored:matches.some((r:any)=>r.source_id===source.sourceId&&r.is_active===1&&['eligible_verified','eligible_likely'].includes(r.ph_eligibility))};
    });
    const plausible=details.filter((d:any)=>d.currentMetadataHold===null);
    output.sources.push({sourceId:source.sourceId,authoritativeOpenings:source.authoritativeOpenings,parsed:parsed.length,metadataDistribution:holds,unknownTelecommuting:source.minimalOpenings.filter((j:any)=>typeof j.telecommuting!=='boolean').length,plausiblyEligibleCurrentMetadata:plausible.length,plausibleExactStored:plausible.filter((d:any)=>d.exactStored.length>0).length,plausibleActiveEligibleStored:plausible.filter((d:any)=>d.exactActiveEligibleStored).length,plausibleMissing:plausible.filter((d:any)=>!d.exactActiveEligibleStored),details});
  }
}finally{globalThis.fetch=nativeFetch;}
output.limitations=['Only actual minimal widget fields were replayed; full raw responses were not retained.','Existing candidate parser and deterministic facts helper were used; this is not an independent eligibility adjudication or full-route/AI/publication replay.','Missing means no same-source exact-URL active eligible row in the sequential bounded D1 read; historical qualifications, alternate canonical URLs and public snapshot membership are not inferred.','No network, AI or database writes were made during reconciliation.'];
await Bun.write(file,JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({file,sources:output.sources.map(({details,plausibleMissing,...s}:any)=>({...s,missingExamples:plausibleMissing.slice(0,4)}))},null,2));
