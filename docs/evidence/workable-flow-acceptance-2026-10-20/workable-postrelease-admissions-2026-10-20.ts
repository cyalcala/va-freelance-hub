import {queryD1ReadOnly} from './scripts/diagnostics/query-d1-readonly';
import {loadCurrentAdmissionEvidence} from './packages/scraper/admission-evidence';
import {createHash} from 'node:crypto';
const file='tmp/workable-postrelease-admissions-2026-10-20.json';
if(await Bun.file(file).exists())throw new Error('Preserve prior receipt');
const ids=['workable:coconutva','workable:crewbloom','workable:hello-rache','workable:hunt-st','workable:pearltalent','workable:pineapple-staffing','workable:rocketams'];
const code=await Bun.file('packages/scraper/admission-evidence.ts').text();
const frozen=await Bun.file('tmp/workable-rotation-release-proof/source/packages/scraper/admission-evidence.ts').text();
if(code!==frozen)throw new Error('Validator differs from release');
const m=code.match(/const LOAD_CURRENT_SQL = `([\s\S]*?)`;/);if(!m)throw new Error('Existing SELECT not found');
const sql=m[1].replace('WHERE s.source_id=?',`WHERE s.source_id IN (${ids.map(id=>"'"+id+"'").join(',')})`);
if(sql===m[1])throw new Error('Exact binding unavailable');
const start=new Date().toISOString(),q=queryD1ReadOnly<any>(sql),now=new Date().toISOString();
const map=new Map(q.results.map((r:any)=>[JSON.parse(r.sourceJson).sourceId,r]));
const db:any={prepare:()=>({bind:(id:string)=>({first:async()=>map.get(id)??null})})};
const checks=[];
for(const id of ids){const r:any=await loadCurrentAdmissionEvidence(db,id,now);checks.push(r.ok?{sourceId:id,ok:true,evidenceId:r.evidence.id,packetSha256:r.evidence.packetSha256,sourceRevision:r.source.governanceRevision,providerRevision:r.provider.governanceRevision,expiresAt:r.evidence.expiresAt}:{sourceId:id,ok:false,reason:r.reason});}
const out={scope:'EXISTING_FULL_CURRENT_ADMISSION_VALIDATOR_ON_FRESH_READ_ONLY_CAPTURE',observedStart:start,observedAt:now,validatorSha256:createHash('sha256').update(code).digest('hex'),query:sql,querySha256:createHash('sha256').update(sql).digest('hex'),meta:q.meta,checks,expectedSixCurrentAndPineappleHeld:checks.filter(x=>x.ok).length===6&&checks.some(x=>x.sourceId==='workable:pineapple-staffing'&&!x.ok),limitations:['Sequential SELECT and in-memory validation, not mutation authority at a future instant','No packet renewal, source fetch, grant or publication performed']};
await Bun.write(file,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({file,rowsWritten:q.meta?.rows_written,checks,expected:out.expectedSixCurrentAndPineappleHeld}));
