import {queryD1ReadOnly} from './scripts/diagnostics/query-d1-readonly';
import {validateCohort,SOURCE_CWD} from './.tmp-workable-postrelease-observe-2026-10-20';
import {createHash} from 'node:crypto';
const file='tmp/workable-exact-loss-reasons-2026-10-20.json';if(await Bun.file(file).exists())throw new Error('Preserve prior receipt');
const cohort=validateCohort(await Bun.file('docs/evidence/continuation-2026-10-20/workable-grouped-cohort.json').json());
const sql=`SELECT id,source_id,source_url,title,is_active,inactive_reason,ph_eligibility,geo_scope,geo_evidence,geo_checked_at,location_type,location_raw,posted_at,scraped_at,updated_at,application_url,tags,category,last_verified_at,failed_verification_count FROM opportunities WHERE source_url IN (${cohort.map(r=>"'"+r.sourceUrl+"'").join(',')}) ORDER BY source_url,id LIMIT 68`;
const start=new Date().toISOString(),q=queryD1ReadOnly<any>(sql,SOURCE_CWD);if(q.meta?.rows_written!==0)throw new Error('Explicit zero writes required');
const out={scope:'CURRENT_STORED_EXACT_COHORT_REASONS_NOT_INFERRED_MODEL_VERDICTS',observedStart:start,observedEnd:new Date().toISOString(),query:sql,querySha256:createHash('sha256').update(sql).digest('hex'),...q,limitations:['Stored reason is observed but does not prove all internal execution decisions','No model calls, provider fetches, mutation, human eligibility adjudication or first-publication certification']};
await Bun.write(file,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({file,rowsWritten:q.meta?.rows_written,rows:q.results.map((r:any)=>({id:r.id,title:r.title,active:r.is_active,inactiveReason:r.inactive_reason,geoEvidence:r.geo_evidence,tags:r.tags,lastVerifiedAt:r.last_verified_at}))}));
