import {execFile} from 'node:child_process';import {promisify} from 'node:util';
const run=promisify(execFile),file='tmp/economics-main-mirror-2026-10-20.json';
if(await Bun.file(file).exists())throw new Error('Preserve prior receipt');
const opts={ssm:['-c','http.version=HTTP/1.1','-c','credential.helper=','-c','credential.helper=!bun .tmp-ssm-credential.ts'],github:[],gitlab:['-c','http.version=HTTP/1.1','-c','http.lowSpeedTime=30','-c','http.lowSpeedLimit=100']};
const remote={ssm:'origin',github:'github',gitlab:'gitlab'};
async function git(args:string[]){return(await run('git',args,{encoding:'utf8',timeout:60000,windowsHide:true,maxBuffer:1000000})).stdout.trim();}
async function heads(){const rows=await Promise.all(Object.keys(remote).map(async n=>{const output=await git([...opts[n], 'ls-remote',remote[n],'refs/heads/main']);const m=output.match(/^([a-f0-9]{40})\s+refs\/heads\/main$/);if(!m)throw new Error('Unexpected advertised main');return[n,m[1]];}));return Object.fromEntries(rows);}
const out:any={scope:'NORMAL_FAST_FORWARD_MAIN_BACKUP_AFTER_SSM_FIRST_REPORT_WRITE',startedAt:new Date().toISOString(),operations:[]};
try{
 out.before=await heads();
 await git([...opts.ssm,'fetch','origin','refs/heads/main:refs/backup-audit/ssm/heads/main']);
 const sha=await git(['rev-parse','refs/backup-audit/ssm/heads/main']);
 if(sha!==out.before.ssm)throw new Error('Canonical main advanced during preparation');
 for(const name of ['github','gitlab']){
  if(out.before[name]===sha){out.operations.push({repository:name,status:'ALREADY_MATCHED'});continue;}
  await git([...opts[name],'fetch',remote[name],`refs/heads/main:refs/backup-audit/${name}/heads/main`]);
  const current=await git(['rev-parse',`refs/backup-audit/${name}/heads/main`]);
  if(current!==out.before[name])throw new Error('Mirror main advanced during preparation');
  await git(['merge-base','--is-ancestor',current,sha]);
  await git([...opts[name],'push',...(name==='gitlab'?['-o','ci.skip','-o','ci.no_pipeline','-o','integrations.skip_ci']:[]),remote[name],`${sha}:refs/heads/main`]);
  out.operations.push({repository:name,status:'NORMAL_FF_PUSH',oldSha:current,newSha:sha});
 }
 out.after=await heads();out.exactMainParity=Object.values(out.after).every(s=>s===sha);if(!out.exactMainParity)throw new Error('Post-write mismatch');
}catch(e:any){out.error={class:e?.name,exitCode:e?.code};process.exitCode=1;}
out.finishedAt=new Date().toISOString();await Bun.write(file,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out));
