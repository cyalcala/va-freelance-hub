import { createHash } from 'node:crypto';
const path='docs/evidence/continuation-2026-10-20/workable-reconciliation.json';
const data:any=await Bun.file(path).json();
const out:any={scope:'EXACT_SOURCE_AND_URL_GROUPING_OF_RETAINED_LOCATION_VARIANTS',inputSha256:createHash('sha256').update(await Bun.file(path).text()).digest('hex'),sources:[]};
for(const source of data.sources){
 const groups=new Map<string,any[]>();
 for(const d of source.details){const rows=groups.get(d.sourceUrl)??[];rows.push(d);groups.set(d.sourceUrl,rows);}
 const details=[...groups.entries()].map(([sourceUrl,variants])=>({sourceUrl,title:variants[0].title,locationVariants:variants.length,metadataHoldCodes:[...new Set(variants.map(v=>v.currentMetadataHold))],hasPlausiblePhVariant:variants.some(v=>v.currentMetadataHold===null),exactActiveEligibleStored:variants.some(v=>v.exactActiveEligibleStored),allCurrentDatesStale:variants.every(v=>v.currentMetadataHold==='CURRENT_POSTING_DATE_STALE')}));
 const positive=details.filter(d=>d.hasPlausiblePhVariant);
 out.sources.push({sourceId:source.sourceId,rawLocationRows:source.details.length,uniqueUrls:groups.size,duplicateLocationRows:source.details.length-groups.size,plausibleUniqueOpenings:positive.length,plausibleUniqueActiveEligibleStored:positive.filter(d=>d.exactActiveEligibleStored).length,plausibleUniqueMissing:positive.filter(d=>!d.exactActiveEligibleStored).length,allOriginalDatesStaleButExistingActive:details.filter(d=>d.allCurrentDatesStale&&d.exactActiveEligibleStored).length,details});
}
out.limitations=['A widget location row is not a distinct opening; exact source plus URL is the grouping identity.','At least one plausible PH variant is a metadata observation, not independent adjudication or a prescription to ignore contradictory job-level evidence.','An old original date on an existing active row is not, by itself, evidence that current serving violates the accepted retention contract; first publication and current liveness need separate evidence.','No network, AI, database writes or candidate changes.'];
await Bun.write('tmp/workable-grouped-cohort-reproduced-2026-10-20.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({sources:out.sources.map(({details,...s}:any)=>s)},null,2));
