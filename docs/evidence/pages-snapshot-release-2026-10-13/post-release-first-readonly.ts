import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const directory = new URL("./", import.meta.url);
const prior = JSON.parse(await readFile(new URL("preflight.json", directory), "utf8"));
const expectedSource = "34e3bd1efa34dc3a2c31f2cc3e5b6c5b04790e83";
const account = "76cf15ef361089aa0411e75ff77d343a";
const database = "08072f16-d3d1-436a-9104-b057a162db7c";
const base = `https://api.cloudflare.com/client/v4/accounts/${account}`;
const hash = (text: string) => createHash("sha256").update(text).digest("hex");
const errors = (body: any) => Array.isArray(body?.errors) ? body.errors.map((e: any) => e.code).filter((v: any) => typeof v === "number") : [];
const variableNames = (vars: any) => Object.entries(vars ?? {}).map(([name, v]: [string, any]) =>
  ({ name, type: typeof v?.type === "string" ? v.type : "UNKNOWN" })).sort((a, b) => a.name.localeCompare(b.name));
const configuration = (c: any) => c ? {
  compatibilityDate: c.compatibility_date ?? null, compatibilityFlags: c.compatibility_flags ?? [],
  d1Bindings: Object.entries(c.d1_databases ?? {}).map(([binding, v]: [string, any]) => ({ binding, id: v?.id ?? null })),
  aiBindingNames: Object.keys(c.ai_bindings ?? {}), envVars: variableNames(c.env_vars),
  otherBindingNames: Object.fromEntries(["kv_namespaces", "r2_buckets", "services", "durable_object_namespaces", "vectorize_bindings", "hyperdrive_bindings"]
    .map(k => [k, Object.keys(c[k] ?? {})])),
} : null;
const deployment = (d: any) => d ? {
  id: d.id ?? null, environment: d.environment ?? null, createdOn: d.created_on ?? null,
  commitHash: d.deployment_trigger?.metadata?.commit_hash ?? null, branch: d.deployment_trigger?.metadata?.branch ?? null,
  latestStage: d.latest_stage ? { name: d.latest_stage.name, status: d.latest_stage.status } : null,
  envVars: variableNames(d.env_vars),
} : null;
const observations: any[] = [];
const report: any = { scope: "FIRST_POST_RELEASE_METADATA_PUBLIC_GETS_AND_ONE_SNAPSHOT_SELECT_NO_RUNTIME_ACCEPTANCE",
  observedStart: new Date().toISOString(), expectedSource, observations };
let token: string | undefined;
try {
  const text = await readFile(process.env.USERPROFILE + "/.wrangler/config/default.toml", "utf8");
  token = text.match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];
} catch {}
let scriptName: string | undefined;
let deployedAt: string | undefined;
if (token) {
  try {
    const response = await fetch(`${base}/pages/projects/remotejobs-ph`, {
      headers: { Authorization: `Bearer ${token}` }, redirect: "manual", signal: AbortSignal.timeout(20000),
    });
    const body: any = await response.json().catch(() => null);
    const p = body?.result;
    const config = body?.success ? configuration(p.deployment_configs?.production) : null;
    observations.push({ kind: "pages-project", observedAtUtc: new Date().toISOString(), status: response.status,
      success: body?.success === true, errorCodes: errors(body), ...(body?.success ? {
        name: p.name, subdomain: p.subdomain, productionBranch: p.production_branch,
        canonicalDeployment: deployment(p.canonical_deployment), latestDeployment: deployment(p.latest_deployment),
        productionScriptName: typeof p.production_script_name === "string" ? p.production_script_name : null,
        productionConfig: config,
        productionConfigMatchesPreflight: JSON.stringify(config) === JSON.stringify(prior.observations[0].productionConfig),
        canonicalSourceMatchesExpected: p.canonical_deployment?.deployment_trigger?.metadata?.commit_hash === expectedSource,
      } : {}) });
    if (body?.success && typeof p.production_script_name === "string") scriptName = p.production_script_name;
    if (body?.success && typeof p.canonical_deployment?.created_on === "string") deployedAt = p.canonical_deployment.created_on;
  } catch (e) { observations.push({ kind: "pages-project", requestErrorClass: e instanceof Error ? e.name : "UnknownError" }); }
} else observations.push({ kind: "pages-project", status: "CACHED_OAUTH_UNAVAILABLE" });

observations.push(...await Promise.all(["/", "/opportunities?fresh=today", "/jobs/9214", "/data-policy"].map(async path => {
  const started = Date.now();
  try {
    const response = await fetch(`https://remotejobs-ph.pages.dev${path}`, { redirect: "manual", signal: AbortSignal.timeout(20000) });
    const html = await response.text();
    return { kind: "ordinary-public-get", path, observedAtUtc: new Date().toISOString(), status: response.status, elapsedMs: Date.now() - started,
      headers: Object.fromEntries([...response.headers].filter(([name]) => name.startsWith("x-public-snapshot") || ["date", "cache-control", "cf-cache-status", "x-edge-cache", "age"].includes(name))),
      snapshotMeta: [...html.matchAll(/<meta\s+(?:[^>]*?\s)?name=["'](va-hub:snapshot-[^"']+)["']\s+content=["']([^"']*)["']/g)].map(m => ({ name: m[1], content: m[2] })),
      counts: [...html.matchAll(/<strong(?:\s[^>]*)?>([\d,]+)\s+(opportunit(?:y|ies)|jobs?)<\/strong>/g)].map(m => Number(m[1].replaceAll(",", ""))),
      renderedJobIds: [...new Set([...html.matchAll(/href=["']\/jobs\/(\d+)["']/g)].map(m => Number(m[1])))],
      jsonLdDatePosted: [...html.matchAll(/"datePosted"\s*:\s*"([^"\\]+)"/g)].map(m => m[1]),
      bodySha256: hash(html), bodyBytes: Buffer.byteLength(html), rawBodyRetained: false };
  } catch (e) { return { kind: "ordinary-public-get", path, observedAtUtc: new Date().toISOString(), elapsedMs: Date.now() - started, requestErrorClass: e instanceof Error ? e.name : "UnknownError" }; }
})));
if (token) {
  const sql = "SELECT id,generated_at,refresh_started_at,LENGTH(payload) AS payload_chars,json_valid(payload) AS payload_is_plain_json FROM public_serving_snapshot WHERE id=1";
  const params: unknown[] = [];
  try {
    const response = await fetch(`${base}/d1/database/${database}/query`, {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ sql, params }), redirect: "manual", signal: AbortSignal.timeout(20000),
    });
    const body: any = await response.json().catch(() => null);
    observations.push({ kind: "snapshot-metadata", observedAtUtc: new Date().toISOString(), status: response.status,
      success: body?.success === true, errorCodes: errors(body), query: sql, params, querySha256: hash(JSON.stringify({ sql, params })),
      ...(body?.success ? { results: body.result.map((r: any) => ({ success: r.success, rowsRead: r.meta?.rows_read, rowsWritten: r.meta?.rows_written, rows: r.results })) } : {}) });
  } catch (e) { observations.push({ kind: "snapshot-metadata", requestErrorClass: e instanceof Error ? e.name : "UnknownError" }); }
}
// One bounded documented analytics query only when the authoritative project names its Worker.
if (token && scriptName && deployedAt) {
  const query = "query PostRelease($accountTag: string, $start: string, $end: string, $scriptName: string) { viewer { accounts(filter: {accountTag: $accountTag}) { workersInvocationsAdaptive(limit: 20, filter: {scriptName: $scriptName, datetime_geq: $start, datetime_leq: $end}) { dimensions {scriptName status} sum {requests errors} quantiles {cpuTimeP50 cpuTimeP99} } } } }";
  const variables = { accountTag: account, start: deployedAt, end: new Date().toISOString(), scriptName };
  try {
    const response = await fetch("https://api.cloudflare.com/client/v4/graphql", {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }), redirect: "manual", signal: AbortSignal.timeout(20000),
    });
    const body: any = await response.json().catch(() => null);
    observations.push({ kind: "worker-analytics", observedAtUtc: new Date().toISOString(), status: response.status,
      query, variables, errorCount: Array.isArray(body?.errors) ? body.errors.length : 0,
      errorCategories: (body?.errors ?? []).map((e: any) => /permission|unauthorized|not authorized|authentication/i.test(e?.message ?? "") ? "AUTHORIZATION" : /unknown|cannot query|not found/i.test(e?.message ?? "") ? "SCHEMA_OR_RESOURCE" : "OTHER"),
      rows: (body?.data?.viewer?.accounts ?? []).flatMap((a: any) => (a.workersInvocationsAdaptive ?? []).map((r: any) => ({
        scriptName: r.dimensions?.scriptName, status: r.dimensions?.status,
        requests: r.sum?.requests, errors: r.sum?.errors, cpuTimeP50: r.quantiles?.cpuTimeP50, cpuTimeP99: r.quantiles?.cpuTimeP99,
      }))), note: "Adaptive analytics may lag; empty results are not zero cost or errors. Time bounds alone do not attest a particular Worker version." });
  } catch (e) { observations.push({ kind: "worker-analytics", requestErrorClass: e instanceof Error ? e.name : "UnknownError" }); }
} else observations.push({ kind: "worker-analytics", status: "NOT_QUERIED", reason: "Authoritative production script name or deployment time unavailable" });
report.observedEnd = new Date().toISOString();
await writeFile(new URL("post-release-first.json", directory), JSON.stringify(report, null, 2) + "\n", { encoding: "utf8", flag: "wx" });
console.log(JSON.stringify({ observedEnd: report.observedEnd, observations: observations.map(o => ({ kind: o.kind, path: o.path, status: o.status, errorCount: o.errorCount,
  canonicalSourceMatchesExpected: o.canonicalSourceMatchesExpected, productionConfigMatchesPreflight: o.productionConfigMatchesPreflight })) }));
