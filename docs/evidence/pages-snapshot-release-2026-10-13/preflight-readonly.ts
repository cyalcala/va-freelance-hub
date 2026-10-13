import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";

// Deliberately bounded: one project GET and two SELECTs; no deployment or rollback.
const output = new URL("./preflight.json", import.meta.url);
const account = "76cf15ef361089aa0411e75ff77d343a";
const database = "08072f16-d3d1-436a-9104-b057a162db7c";
const base = `https://api.cloudflare.com/client/v4/accounts/${account}`;
const expected = {
  source: "34e3bd1efa34dc3a2c31f2cc3e5b6c5b04790e83",
  deployment: "e1b0ff66-8a93-41b0-b9c7-6de8346c81c7",
  liveCommit: "3065f0d709d5a1950c247d5a11df542b07721bcb",
  migration: "0054_public_serving_snapshot.sql",
};
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
const errors = (body: any) => Array.isArray(body?.errors)
  ? body.errors.map((e: any) => e.code).filter((v: any) => typeof v === "number") : [];
const variableNames = (vars: any) => Object.entries(vars ?? {}).map(([name, v]: [string, any]) =>
  ({ name, type: typeof v?.type === "string" ? v.type : "UNKNOWN" })).sort((a, b) => a.name.localeCompare(b.name));
const config = (c: any) => c ? {
  compatibilityDate: c.compatibility_date ?? null,
  compatibilityFlags: c.compatibility_flags ?? [],
  d1Bindings: Object.entries(c.d1_databases ?? {}).map(([binding, v]: [string, any]) => ({ binding, id: v?.id ?? null })),
  aiBindingNames: Object.keys(c.ai_bindings ?? {}),
  envVars: variableNames(c.env_vars),
  otherBindingNames: Object.fromEntries(["kv_namespaces", "r2_buckets", "services", "durable_object_namespaces", "vectorize_bindings", "hyperdrive_bindings"]
    .map(k => [k, Object.keys(c[k] ?? {})])),
} : null;
const deployment = (d: any) => d ? {
  id: d.id ?? null, environment: d.environment ?? null, createdOn: d.created_on ?? null,
  commitHash: d.deployment_trigger?.metadata?.commit_hash ?? null,
  branch: d.deployment_trigger?.metadata?.branch ?? null,
  latestStage: d.latest_stage ? { name: d.latest_stage.name, status: d.latest_stage.status } : null,
  envVars: variableNames(d.env_vars),
} : null;
const observations: any[] = [];
const report: any = { scope: "PAGES_RELEASE_PREFLIGHT_READ_ONLY", observedStart: new Date().toISOString(), expected, observations };
let token: string | undefined;
try {
  const text = await readFile(process.env.USERPROFILE + "/.wrangler/config/default.toml", "utf8");
  token = text.match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];
} catch {}
let hold: string[] = [];
if (!token) hold.push("CACHED_OAUTH_UNAVAILABLE");
if (token) {
  try {
    const response = await fetch(`${base}/pages/projects/remotejobs-ph`, {
      headers: { Authorization: `Bearer ${token}` }, redirect: "manual", signal: AbortSignal.timeout(20000),
    });
    const body: any = await response.json().catch(() => null);
    const p = body?.result;
    const projection = { kind: "pages-project", observedAtUtc: new Date().toISOString(), status: response.status,
      success: body?.success === true, errorCodes: errors(body), ...(body?.success ? {
        name: p.name, subdomain: p.subdomain, productionBranch: p.production_branch,
        canonicalDeployment: deployment(p.canonical_deployment), latestDeployment: deployment(p.latest_deployment),
        productionConfig: config(p.deployment_configs?.production),
      } : {}) };
    observations.push(projection);
    if (!body?.success || response.status !== 200) hold.push("PROJECT_READ_UNAVAILABLE");
    else {
      if (p.name !== "remotejobs-ph" || p.production_branch !== "main") hold.push("PROJECT_OR_BRANCH_DRIFT");
      if (p.canonical_deployment?.id !== expected.deployment || p.canonical_deployment?.deployment_trigger?.metadata?.commit_hash !== expected.liveCommit)
        hold.push("CANONICAL_DEPLOYMENT_DRIFT");
      if (p.canonical_deployment?.environment !== "production" || p.canonical_deployment?.latest_stage?.status !== "success")
        hold.push("ROLLBACK_TARGET_NOT_SUCCESSFUL_PRODUCTION");
      const c = p.deployment_configs?.production;
      if (c?.compatibility_date !== "2024-11-01" || JSON.stringify(c?.compatibility_flags) !== JSON.stringify(["nodejs_compat"])) hold.push("COMPATIBILITY_DRIFT");
      if (Object.keys(c?.d1_databases ?? {}).length !== 1 || c?.d1_databases?.DB?.id !== database) hold.push("D1_BINDING_DRIFT");
      if (JSON.stringify(Object.keys(c?.ai_bindings ?? {}).sort()) !== JSON.stringify(["AI"])) hold.push("AI_BINDING_DRIFT");
    }
  } catch (e) { observations.push({ kind: "pages-project", requestErrorClass: e instanceof Error ? e.name : "UnknownError" }); hold.push("PROJECT_READ_FAILED"); }
}
if (token && !hold.includes("PROJECT_READ_UNAVAILABLE") && !hold.includes("PROJECT_READ_FAILED")) {
  for (const [kind, sql] of [
    ["schema-ceiling", "SELECT id,name,applied_at FROM d1_migrations ORDER BY id DESC LIMIT 1"],
    ["snapshot-metadata", "SELECT id,generated_at,refresh_started_at,LENGTH(payload) AS payload_chars,json_valid(payload) AS payload_is_plain_json FROM public_serving_snapshot WHERE id=1"],
  ]) {
    const params: unknown[] = [];
    try {
      const response = await fetch(`${base}/d1/database/${database}/query`, {
        method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ sql, params }), redirect: "manual", signal: AbortSignal.timeout(20000),
      });
      const body: any = await response.json().catch(() => null);
      const results = body?.success ? body.result.map((r: any) => ({ success: r.success,
        rowsRead: r.meta?.rows_read, rowsWritten: r.meta?.rows_written, rows: r.results })) : undefined;
      observations.push({ kind, observedAtUtc: new Date().toISOString(), status: response.status, success: body?.success === true,
        errorCodes: errors(body), query: sql, params, querySha256: hash(JSON.stringify({ sql, params })), ...(results ? { results } : {}) });
      if (!body?.success || results?.some((r: any) => !r.success || r.rowsWritten !== 0)) hold.push(`${kind}_READ_UNPROVEN`);
      if (kind === "schema-ceiling" && results?.[0]?.rows?.[0]?.name !== expected.migration) hold.push("SCHEMA_DRIFT");
    } catch (e) { observations.push({ kind, requestErrorClass: e instanceof Error ? e.name : "UnknownError" }); hold.push(`${kind}_READ_FAILED`); }
  }
}
report.observedEnd = new Date().toISOString();
report.decision = hold.length ? "HOLD" : "PREFLIGHT_MATCHES_EXPECTED_METADATA_ONLY";
report.holdReasons = [...new Set(hold)];
await mkdir(new URL("./", import.meta.url), { recursive: true });
await writeFile(output, JSON.stringify(report, null, 2) + "\n", { encoding: "utf8", flag: "wx" });
console.log(JSON.stringify({ decision: report.decision, holdReasons: report.holdReasons, observedEnd: report.observedEnd, observationCount: observations.length }));
