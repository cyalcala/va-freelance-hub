const origin = process.argv[2];
const output = process.argv[3];
if (!origin || !output) throw new Error('Origin and receipt path required');
const paths = ['/', '/opportunities', '/opportunities?q=assistant', '/directory', '/directory?q=unmatchedpremiumqa', '/categories/admin', '/jobs/8992', '/jobs/7508', '/data-policy', '/privacy', '/sitemap.xml'];
const results = [];
const resourceUrls = new Set<string>();
let trackedApplyHref: string | null = null;
for (const path of paths) {
  const response = await fetch(new URL(path, origin), {signal: AbortSignal.timeout(15000)});
  const body = await response.text();
  if (path === '/jobs/8992') trackedApplyHref = body.match(/href="(\/api\/click\/8992\?url=[^"]+)"/)?.[1] ?? null;
  results.push({path, status: response.status, snapshot: response.headers.get('X-Public-Snapshot'), source: response.headers.get('X-Public-Snapshot-Source'), generatedAt: response.headers.get('X-Public-Snapshot-Generated-At'), jobs: response.headers.get('X-Public-Snapshot-Jobs'), companies: response.headers.get('X-Public-Snapshot-Companies'), htmlBytes: new TextEncoder().encode(body).length, savedNotice: body.includes('Showing saved listings'), hydratedIslands: (body.match(/<astro-island\b/g) ?? []).length, clientScriptSources: [...body.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map(match=>match[1])});
  for (const match of body.matchAll(/href="([^"\s]+\.css)"/g)) resourceUrls.add(new URL(match[1], origin).href);
}
const stylesheets = [];
for (const url of resourceUrls) {
  const response = await fetch(url, {signal: AbortSignal.timeout(15000)});
  const body = await response.arrayBuffer();
  stylesheets.push({url, status:response.status, decodedBytes:body.byteLength});
}
let applyProbe = null;
if (process.argv[5] === 'offline') {
  if (!trackedApplyHref) throw new Error('Expected tracked Apply href absent');
  const response = await fetch(new URL(trackedApplyHref.replaceAll('&amp;', '&'), origin), {redirect:'manual',signal:AbortSignal.timeout(10000)});
  await response.arrayBuffer();
  applyProbe = {status:response.status,retryAfter:response.headers.get('Retry-After'),cacheControl:response.headers.get('Cache-Control'),outboundRedirect:response.headers.has('Location')};
  if (applyProbe.status!==503 || applyProbe.retryAfter!=='30' || applyProbe.cacheControl!=='no-store' || applyProbe.outboundRedirect) throw new Error('Offline Apply refusal failed');
}
const receipt = {checkedAt: new Date().toISOString(), sourceSha:process.argv[4]??null, origin, measurement: 'Ordinary HTTP requests; decoded HTML/CSS bytes, not compressed transfer sizes or field Core Web Vitals.', results, stylesheets,applyProbe};
await Bun.write(output, JSON.stringify(receipt, null, 2)+'\n');
console.info(JSON.stringify({checkedAt:receipt.checkedAt,sourceSha:receipt.sourceSha, results:results.map(({path,status,snapshot,htmlBytes,hydratedIslands})=>({path,status,snapshot,htmlBytes,hydratedIslands})),stylesheets,applyProbe}));
if (results.some(row=>row.status!==200) || stylesheets.some(row=>row.status!==200)) process.exitCode=1;
