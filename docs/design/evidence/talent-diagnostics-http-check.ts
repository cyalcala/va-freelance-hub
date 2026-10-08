// Read-only acceptance probe; no production bindings or tracked Apply requests.
const [origin, output, sourceSha] = process.argv.slice(2);
if (!origin || !output || !sourceSha) throw new Error('Origin, receipt path and source SHA required');
const fields = [
  ['status', 'X-Public-Snapshot'],
  ['generated-at', 'X-Public-Snapshot-Generated-At'],
  ['source', 'X-Public-Snapshot-Source'],
  ['age-seconds', 'X-Public-Snapshot-Age-Seconds'],
  ['jobs', 'X-Public-Snapshot-Jobs'],
  ['companies', 'X-Public-Snapshot-Companies'],
];
const paths = ['/', '/opportunities', '/opportunities?q=assistant', '/directory', '/directory?q=unmatchedpremiumqa', '/categories/admin', '/jobs/8992', '/jobs/7508', '/data-policy', '/privacy', '/sitemap.xml'];
const results = [];
for (const path of paths) {
  const response = await fetch(new URL(path, origin), { signal: AbortSignal.timeout(15000) });
  const body = await response.text();
  if (response.status !== 200) throw new Error(`Unexpected status ${response.status} on ${path}`);
  if (body.includes('Showing saved listings') || body.includes('saved-board-notice')) throw new Error(`Public snapshot strip remains on ${path}`);
  const metadata: Record<string, string | null> = {};
  for (const [name, header] of fields) {
    const expected = response.headers.get(header);
    const actual = body.match(new RegExp(`<meta name="va-hub:snapshot-${name}" content="([^"]*)"`))?.[1] ?? null;
    metadata[name] = actual;
    if (path !== '/sitemap.xml' && actual !== expected) throw new Error(`Header/meta mismatch for ${header} on ${path}`);
  }
  if (!['/data-policy', '/privacy'].includes(path) && !response.headers.has('X-Public-Snapshot')) throw new Error(`Snapshot state missing on ${path}`);
  if (['stale', 'lkg_fallback', 'degraded'].includes(response.headers.get('X-Public-Snapshot') ?? '') && !response.headers.get('Cache-Control')?.includes('no-store')) throw new Error(`Unsafe saved HTML caching on ${path}`);
  if (path === '/' && (!body.includes('class="talent-dot') || body.includes('✳'))) throw new Error('Homepage brand dot missing or old star remains');
  results.push({ path, status: response.status, snapshot: response.headers.get('X-Public-Snapshot'), cacheControl: response.headers.get('Cache-Control'), metadata, publicStrip: false });
}
const receipt = { checkedAt: new Date().toISOString(), origin, sourceSha, results };
await Bun.write(output, JSON.stringify(receipt, null, 2) + '\n');
console.info(JSON.stringify({ checkedAt: receipt.checkedAt, sourceSha, routes: results.length, states: [...new Set(results.map(row => row.snapshot))], headerMetaAgreement: true, publicStrip: false }));
