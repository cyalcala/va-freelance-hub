import { renderReport } from './scripts/diagnostics/source-economics';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const root='tmp/economics-runtime-39422707911/_temp/economics', file='tmp/economics-runtime-proof-2026-10-20.json';
if(await Bun.file(file).exists()) throw new Error('Preserve prior receipt');
const hash=(s:string|Uint8Array)=>createHash('sha256').update(s).digest('hex');
const combined=await Bun.file(`${root}/combined.json`).json();
const sha='fe3599d4617e7d573a391e8596cc0988ff5b25f5';
const committed=execFileSync('git',['show',`${sha}:docs/source-economics-latest.md`],{encoding:'utf8',windowsHide:true});
const rendered=renderReport(combined.byName,combined.meta);
const normalize=(s:string)=>s.replaceAll('\r\n','\n').replace(/\n$/,'');
const queries=[];
for(const name of combined.meta.queryOrder){
 if(!['qualified_supply','identity_coverage','supply_totals','source_supply','fetch_outcomes_7d','triage_outcomes_7d'].includes(name)) throw new Error('Unexpected query');
 const bytes=await Bun.file(`${root}/results/${name}.json`).bytes();
 const results=JSON.parse(new TextDecoder().decode(bytes));
 if(!Array.isArray(results)||results.length!==1) throw new Error('Unexpected result envelope');
 const r=results[0];
 queries.push({name,sha256:hash(bytes),success:r.success,rowsWritten:r.meta?.rows_written,changedDb:r.meta?.changed_db,changes:r.meta?.changes,rowsRead:r.meta?.rows_read,combinedRowsMatch:JSON.stringify(r.results)===JSON.stringify(combined.byName[name])});
}
const section=committed.split('## Yield efficiency (last 7 days)')[1]??'';
const rows=section.split(/\r?\n/).filter((s:string)=>s.startsWith('| ')&&!s.startsWith('| source_id')&&!s.startsWith('| ---')).map((s:string)=>s.split('|').slice(1,-1).map(v=>v.trim()));
const out={scope:'DOWNLOADED_ACTUAL_WORKFLOW_ARTIFACT_REPLAY_NO_NETWORK_OR_DATABASE_MUTATION',observedAt:new Date().toISOString(),runId:39422707911,workflowHead:'216b7124c4c7fdfbb9b563f478f13002421c35b0',reportCommit:sha,asOf:combined.meta.asOf,queries,allSixReadOnly:queries.length===6&&queries.every(r=>r.success===true&&r.rowsWritten===0&&r.changedDb===false&&r.changes===0&&r.combinedRowsMatch),committedReportSha256:hash(committed),renderedSha256:hash(rendered),exactBytesMatch:committed===rendered,matchAllowingCRLFAndOneTerminalLF:normalize(committed)===normalize(rendered),yieldRows:rows.length,unknownRatioCells:rows.flatMap((r:string[])=>r.slice(4)).filter((v:string)=>v==='UNKNOWN').length,storedOnlySourceRows:rows.filter((r:string[])=>r[1]==='UNKNOWN'&&r[2]==='UNKNOWN'),qualifiedFirstStoredProxy:combined.byName.qualified_supply?.[0],reconciliation:combined.reconciliation,limitations:['Stored eligibility counts and fetch cohorts do not certify verified marginal first-publication yield','Workflow Git persistence is not GCP or Pages runtime acceptance','No provider fetch, model call, deployment, migration or production write was made by this replay']};
await Bun.write(file,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(out));
if(!out.allSixReadOnly||!out.matchAllowingCRLFAndOneTerminalLF)process.exitCode=1;
