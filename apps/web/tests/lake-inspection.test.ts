import { Database } from "bun:sqlite";
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { POST } from "../src/pages/api/ingest";
import { parseLakeInspectRequest, parseLakeStageRequest } from "../src/lib/lake-publication-contract";
import { stageLakePublicationIntent } from "../src/lib/lake-publication-intent";
import { buildAdmissionEvidence, persistAdmissionEvidence } from "@va-hub/scraper";
import { liveAdmissionFixture } from "../../../packages/scraper/test-fixtures/admission";
import { createGreenhouseItemEvidence } from "../../../packages/scraper/greenhouse-item-evidence";
import { ensureLakeSchema } from "../../../scripts/lake/init-lake";
import { processAndRefineCandidate } from "../../../scripts/lake/ingest-to-lake";
import { computeFingerprint, storeRawObservation } from "../../../scripts/lake/lake-shared";

const sourceId = "greenhouse:test";
const operationKey = "inspection-fixture:1";
const inspectBody = (overrides: Record<string, unknown> = {}) => ({
  operation: "lake-inspect", version: 1, operationId: operationKey, sourceId, ...overrides,
});
const candidate = { lakeCandidateId: 1, lakeFingerprint: computeFingerprint("", "Virtual Assistant", "https://boards.greenhouse.io/test/jobs/1"),
  title: "Virtual Assistant", company: null, sourceUrl: "https://boards.greenhouse.io/test/jobs/1",
  applicationUrl: "https://boards.greenhouse.io/test/jobs/1", sourcePlatform: "Greenhouse/test",
  locationType: "unknown", locationRaw: "Philippines", postedAt: "2026-10-01T00:00:00.000Z",
  evidenceText: "Location: Philippines" };

function privateFixture() {
  const sqlite = new Database(":memory:");
  sqlite.exec(readFileSync(new URL("../../../packages/db/migrations/0055_lake_publication_operations.sql", import.meta.url), "utf8"));
  const queries: string[] = [];
  const binding: any = { prepare(sql: string) {
    return { sql, values: [] as any[], bind(...values: any[]) { return { ...this, values }; },
      async first() { queries.push(sql); return sqlite.query(sql).get(...this.values); },
      async run() { queries.push(sql); return { success: true, results: sqlite.query(sql).all(...this.values) }; } };
  }, async batch(statements: any[]) {
    return sqlite.transaction(() => statements.map(statement => {
      queries.push(statement.sql);
      return { success: true, results: sqlite.query(statement.sql).all(...statement.values) };
    }))();
  } };
  return { sqlite, binding, queries };
}
async function authorityFixture(options: { admissionExpiryMs?: number; stageCandidate?: Record<string, unknown> } = {}) {
  const f = privateFixture();
  const migrate = (name: string) => {
    const source = readFileSync(new URL(`../../../packages/db/migrations/${name}`, import.meta.url), "utf8");
    for (const sql of source.split(/--> statement-breakpoint/)) if (sql.replace(/--[^\r\n]*/g, "").trim()) f.sqlite.exec(sql);
  };
  for (const name of ["0036_registry_foundation.sql", "0037_source_lifecycle_opt_out.sql", "0038_shadow_observations.sql"]) migrate(name);
  const transition = readFileSync(new URL("../../../packages/db/migrations/0039_canary_transition_plane.sql", import.meta.url), "utf8")
    .split("-- New identities begin dormant.");
  f.sqlite.exec(transition[0]!);
  const base = await liveAdmissionFixture();
  const provider = { ...base.provider, evidenceCapturedAt: new Date(Date.now() - 1000).toISOString() };
  const insert = (table: string, row: Record<string, unknown>) => f.sqlite.query(
    `INSERT INTO ${table} (${Object.keys(row).join(",")}) VALUES (${Object.keys(row).map(() => "?").join(",")})`,
  ).run(...Object.values(row) as any[]);
  insert("provider_profiles", { id: provider.id, display_name: "Fixture provider", provider_family: provider.providerFamily,
    mechanism: provider.mechanism, auth_class: provider.authClass, endpoint_pattern: provider.endpointPattern,
    allowed_hosts: provider.allowedHosts, evidence_url: provider.evidenceUrl, evidence_hash: provider.evidenceHash,
    evidence_captured_at: provider.evidenceCapturedAt, visibility_filter: provider.visibilityFilter,
    content_scope: provider.contentScope, cadence_min_minutes: provider.cadenceMinMinutes, cadence_max_minutes: provider.cadenceMaxMinutes,
    rate_guidance: provider.rateGuidance, robots_handling: provider.robotsHandling, removal_semantics: provider.removalSemantics,
    evidence_lease_days: provider.evidenceLeaseDays, default_compliance_state: "needs_review", default_operational_state: "candidate" });
  insert("source_registry", { source_id: base.source.sourceId, provider_id: base.source.providerId,
    display_name: base.source.displayName, endpoint_url: base.source.endpointUrl, company_token: base.source.companyToken,
    discovery_provenance: base.source.discoveryProvenance, compliance_state: base.source.complianceState,
    operational_state: "canary", review_deadline: base.source.reviewDeadline, policy_expiry: base.source.policyExpiry,
    canary_max_new_items_per_tick: 2 });
  f.sqlite.exec("-- New identities begin dormant." + transition[1]!);
  for (const name of ["0040_current_evidence_admission.sql", "0041_publication_ledger.sql", "0042_d1_like_glob_limit.sql",
    "0043_canary_promotion_trigger_alignment.sql", "0044_canary_to_active_graduation.sql"]) migrate(name);
  const currentSource = { ...base.source, operationalState: "canary" as const, lastTransitionHash: null,
    canaryMaxNewItemsPerTick: 2, governanceRevision: (f.sqlite.query("SELECT governance_revision FROM source_registry WHERE source_id=?")
      .get(sourceId) as any).governance_revision };
  const capturedAt = new Date(Date.now() - 100).toISOString();
  const built = await buildAdmissionEvidence({ source: currentSource, provider,
    probe: { ...base.packet.probe, timestamp: capturedAt },
    primaryEvidence: [{ url: provider.evidenceUrl!, contentSha256: provider.evidenceHash!, capturedAt: provider.evidenceCapturedAt! }],
    authorityActions: ["recurrent_private_shadow", "public_minimal_metadata_canary"],
    adjudicationRef: "inspection-fixture-only", capturedAt,
    expiresAt: options.admissionExpiryMs ? new Date(Date.now() + options.admissionExpiryMs).toISOString() : currentSource.policyExpiry! });
  if (!built.ok) throw new Error(built.reason);
  const persisted = await persistAdmissionEvidence(f.binding, currentSource, provider, built, capturedAt);
  if (!persisted.ok) throw new Error(persisted.reason);
  f.sqlite.exec("CREATE TABLE opportunities(id INTEGER PRIMARY KEY)");
  await stage(f.binding, options.stageCandidate);
  f.queries.length = 0;
  return { ...f, async renewAdmission() {
    const renewedAt = new Date(Date.now() - 100).toISOString();
    const next = await buildAdmissionEvidence({ source: currentSource, provider,
      probe: { ...base.packet.probe, timestamp: renewedAt },
      primaryEvidence: [{ url: provider.evidenceUrl!, contentSha256: provider.evidenceHash!, capturedAt: provider.evidenceCapturedAt! }],
      authorityActions: ["recurrent_private_shadow", "public_minimal_metadata_canary"], adjudicationRef: "inspection-fixture-renewal-only",
      capturedAt: renewedAt, expiresAt: currentSource.policyExpiry! });
    if (!next.ok) throw new Error(next.reason);
    const result = await persistAdmissionEvidence(f.binding, currentSource, provider, next, renewedAt);
    if (!result.ok) throw new Error(result.reason);
  } };
}
async function lakeFixture(options: { postedAt?: string; completedAt?: string } = {}) {
  const sqlite = new Database(":memory:");
  const client: any = { async execute(q: any) { return { rows: sqlite.query(typeof q === "string" ? q : q.sql)
    .all(...(typeof q === "string" ? [] : q.args ?? [])) }; } };
  await ensureLakeSchema(client);
  const endpointUrl = "https://boards-api.greenhouse.io/v1/boards/test/jobs";
  const postedAt = options.postedAt ?? candidate.postedAt;
  const completedAt = options.completedAt ?? new Date(Date.now() - 500).toISOString();
  const receipt = createGreenhouseItemEvidence({ sourceId, tenantSlug: "test", endpointUrl, httpStatus: 200,
    startedAt: new Date(Date.parse(completedAt) - 500).toISOString(), completedAt,
    responseBody: JSON.stringify({ jobs: [{ id: 1, internal_job_id: 101, title: candidate.title,
      absolute_url: candidate.sourceUrl, location: { name: candidate.locationRaw }, first_published: postedAt }] }) });
  const rawId = await storeRawObservation(client, { sourceId, sourcePlatform: candidate.sourcePlatform,
    fetchUrl: endpointUrl, httpStatus: 200, rawPayload: receipt.payload, contentHash: receipt.retainedSha256, requireCompletePayload: true });
  await processAndRefineCandidate(client, rawId, { sourceId, sourcePlatform: candidate.sourcePlatform,
    sourceUrl: candidate.sourceUrl, title: candidate.title, company: "", category: "other",
    locationRaw: candidate.locationRaw, description: candidate.evidenceText, applicationUrl: candidate.applicationUrl,
    postedAt, tags: [] }, { totalExtracted: 0, duplicates: 0, excluded: 0, qualifiedReady: 0, ambiguous: 0 });
  const requests: Request[] = [], statements: string[] = [];
  const cachedSql = new Map<number, string>();
  const empty = () => ({ cols: [], rows: [], affected_row_count: 0, last_insert_rowid: null });
  let queryOnly = false;
  function execute(stmt: any) {
    const sql = stmt.sql ?? cachedSql.get(stmt.sql_id);
    statements.push(sql);
    if (sql === "BEGIN TRANSACTION READONLY") { sqlite.exec("BEGIN"); return empty(); }
    if (sql === "COMMIT" || sql === "ROLLBACK") { sqlite.exec(sql); return empty(); }
    if (typeof sql !== "string" || !/^\s*(SELECT|WITH)\b/.test(sql)) throw new Error("Fixture refuses non-read SQL");
    const args = (stmt.args ?? []).map((v: any) => v.type === "integer" ? Number(v.value) : v.type === "null" ? null : v.value);
    const statement = sqlite.query(sql);
    const rows = statement.all(...args) as Record<string, unknown>[];
    const keys = statement.columnNames;
    return { cols: keys.map(name => ({ name, decltype: null })), rows: rows.map(row => keys.map(key => {
      const value = row[key];
      return value === null ? { type: "null" } : typeof value === "number" ? { type: "integer", value: String(value) }
        : { type: "text", value };
    })), affected_row_count: 0, last_insert_rowid: null };
  }
  const fetch = (async (input: RequestInfo | URL) => {
    if (!queryOnly) { sqlite.exec("PRAGMA query_only=ON"); queryOnly = true; }
    const request = input as Request;
    if (request.url !== "https://fixture.turso.io/v2/pipeline") throw new Error("Fixture refuses unexpected host");
    requests.push(request);
    const body = JSON.parse(await request.clone().text());
    const results = body.requests.map((req: any) => {
      if (req.type === "store_sql") { cachedSql.set(req.sql_id, req.sql); return { type: "ok", response: { type: req.type } }; }
      if (req.type === "close_sql" || req.type === "close") return { type: "ok", response: { type: req.type } };
      if (req.type !== "batch") throw new Error("Fixture refuses unexpected protocol operation");
      const step_results: unknown[] = [], step_errors: unknown[] = [];
      const condition = (cond: any): boolean => !cond ? true : cond.type === "ok" ? step_results[cond.step] !== null
        : cond.type === "not" ? !condition(cond.cond) : cond.type === "and" ? cond.conds.every(condition) : false;
      for (const step of req.batch.steps) {
        if (!condition(step.condition)) { step_results.push(null); step_errors.push(null); continue; }
        try { step_results.push(execute(step.stmt)); step_errors.push(null); }
        catch { step_results.push(null); step_errors.push({ code: "SQLITE_ERROR", message: "Fixture statement failed" }); }
      }
      return { type: "ok", response: { type: "batch", result: { step_results, step_errors } } };
    });
    return new Response(JSON.stringify({ baton: null, results }), { headers: { "content-type": "application/json" } });
  }) as typeof globalThis.fetch;
  return { sqlite, requests, statements, fetch };
}
async function send(binding: any, value: unknown = inspectBody(), env: Record<string, unknown> = {}, secret = "fixture-secret") {
  return POST({ request: new Request("https://example.com/api/ingest", { method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` }, body: JSON.stringify(value) }),
    locals: { runtime: { env: { DB: binding, PROXY_SECRET: "fixture-secret", ...env } } } } as any);
}
async function stage(binding: any, overrides: Record<string, unknown> = {}) {
  const parsed = await parseLakeStageRequest({ operation: "lake-stage", version: 1,
    operationId: operationKey, sourceId, candidates: [{ ...candidate, ...overrides }] });
  if (!parsed.ok) throw new Error(parsed.message);
  return stageLakePublicationIntent(binding, { operationId: operationKey, sourceId,
    manifestHash: parsed.manifestHash, candidateDescriptorsJson: parsed.candidateDescriptorsJson });
}

test("authenticated inspection reads an existing private operation instead of accepting client material", async () => {
  const f = privateFixture();
  try {
    const response = await send(f.binding);
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ code: "INSPECTION_INTENT_NOT_FOUND",
      publicationAuthorized: false, publishedCount: 0, syncedCount: 0 });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(f.queries).toHaveLength(1);
    expect(f.queries[0]).toMatch(/^SELECT/);
  } finally { f.sqlite.close(); }
});

test("inspection rejects all extra claims and unauthorized calls before reads", async () => {
  const f = privateFixture();
  try {
    expect((await send(f.binding, inspectBody(), {}, "wrong-secret")).status).toBe(401);
    for (const extra of [{ candidates: [candidate] }, { items: [] }, { manifestHash: "a".repeat(64) },
      { publicationAuthorized: true }, { observedAt: new Date().toISOString() },
      { TURSO_READONLY_AUTH_TOKEN: "client-secret" }, { operationKey }]) {
      const response = await send(f.binding, inspectBody(extra));
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ code: "INVALID_LAKE_INSPECT_REQUEST" });
    }
    expect(f.queries).toEqual([]);
  } finally { f.sqlite.close(); }
});

test("inspection wire grammar, rate limits and body bounds apply before database reads", async () => {
  const f = privateFixture();
  try {
    for (const patch of [{ version: "1" }, { operationId: "" }, { operationId: "a/b" }, { sourceId: "unattributed" },
      { sourceId: "Greenhouse:test" }, { sourceId: "s".repeat(201) }]) {
      expect(parseLakeInspectRequest(inspectBody(patch)).ok).toBe(false);
      expect((await send(f.binding, inspectBody(patch))).status).toBe(400);
    }
    for (const key of Object.keys(inspectBody())) {
      const body = inspectBody(); delete body[key as keyof typeof body];
      expect(parseLakeInspectRequest(body).ok).toBe(false);
    }
    expect((await send(f.binding, inspectBody(), { API_RATE_LIMITER: { limit: async () => ({ success: false }) } })).status).toBe(429);
    expect((await send(f.binding, inspectBody({ oversized: "x".repeat(2 * 1024 * 1024) }))).status).toBe(413);
    expect((await send(f.binding, inspectBody({ operation: "lake-commit", items: [{ title: "must not write" }] }))).status).toBe(400);
    expect(f.queries).toEqual([]);
  } finally { f.sqlite.close(); }
});

test("inspection refuses changed source and advanced intent controls without writing", async () => {
  const f = privateFixture();
  try {
    expect((await stage(f.binding)).ok).toBe(true);
    f.queries.length = 0;
    const mismatch = await send(f.binding, inspectBody({ sourceId: "greenhouse:other" }));
    expect(mismatch.status).toBe(409);
    expect(await mismatch.json()).toMatchObject({ code: "INSPECTION_SOURCE_MISMATCH", publicationAuthorized: false });
    f.sqlite.query("UPDATE lake_publication_operations SET revision=1, source_identity_hash=? WHERE operation_key=?")
      .run("a".repeat(64), operationKey);
    const advanced = await send(f.binding);
    expect(advanced.status).toBe(409);
    expect(await advanced.json()).toMatchObject({ code: "INSPECTION_INTENT_STATE_CONFLICT" });
    expect(f.queries.every(sql => /^SELECT/.test(sql))).toBe(true);
  } finally { f.sqlite.close(); }
});

test("inspection holds current missing authority before any internal fetch", async () => {
  const f = privateFixture();
  const originalFetch = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = (async () => { requests++; throw new Error("must not fetch"); }) as unknown as typeof fetch;
  try {
    await stage(f.binding); f.queries.length = 0;
    const response = await send(f.binding);
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: "INSPECTION_AUTHORITY_REJECTED", publicationAuthorized: false,
      publishedCount: 0, syncedCount: 0 });
    expect(requests).toBe(0);
    expect(f.queries.every(sql => /^SELECT/.test(sql))).toBe(true);
  } finally { globalThis.fetch = originalFetch; f.sqlite.close(); }
});

test("current admitted intent still requires separate server readonly credentials", async () => {
  const f = await authorityFixture();
  const originalFetch = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = (async () => { requests++; throw new Error("must not fetch"); }) as unknown as typeof fetch;
  try {
    for (const env of [{}, { TURSO_DATABASE_URL: "libsql://fixture.turso.io" }, { TURSO_READONLY_AUTH_TOKEN: "fixture-readonly-secret" },
      { TURSO_DATABASE_URL: "libsql://fixture.turso.io", TURSO_AUTH_TOKEN: "admin-token-must-not-be-used" }]) {
      const response = await send(f.binding, inspectBody(), env);
      expect(response.status).toBe(503);
      expect(await response.json()).toMatchObject({ code: "LAKE_READONLY_BINDING_UNAVAILABLE", publicationAuthorized: false,
        publishedCount: 0, syncedCount: 0 });
    }
    expect(requests).toBe(0);
    expect(f.queries.every(sql => /^SELECT/.test(sql))).toBe(true);
  } finally { globalThis.fetch = originalFetch; f.sqlite.close(); }
});

test("corrupt stored descriptors and read errors remain fixed private diagnostics", async () => {
  const f = privateFixture();
  try {
    await stage(f.binding);
    const stored = f.sqlite.query(`SELECT operation_key AS operationId,source_id AS sourceId,manifest_hash AS manifestHash,
      candidate_descriptors_json AS candidateDescriptorsJson,staged_at AS stagedAt,revision,
      source_identity_hash AS sourceIdentityHash,publication_tick_key AS publicationTickKey,
      committed_receipt_key AS committedReceiptKey,committed_outcomes_json AS committedOutcomesJson
      FROM lake_publication_operations`).get() as any;
    const descriptor = JSON.parse(stored.candidateDescriptorsJson)[0];
    for (const corrupt of [
      { ...stored, manifestHash: "a".repeat(64) },
      { ...stored, candidateDescriptorsJson: JSON.stringify([{ ...descriptor, publishedId: 1 }]) },
      { ...stored, candidateDescriptorsJson: JSON.stringify([descriptor, descriptor]) },
      { ...stored, candidateDescriptorsJson: JSON.stringify([{ ...descriptor, lakeCandidateId: "1" }]) },
      { ...stored, candidateDescriptorsJson: "broken-json" },
      { ...stored, stagedAt: "2026-02-30T00:00:00.000Z" },
      { ...stored, sourceIdentityHash: undefined },
    ]) {
      const binding = { prepare() { return { bind() { return { first: async () => corrupt }; } }; } };
      const response = await send(binding);
      expect(response.status).toBe(503);
      expect(await response.json()).toMatchObject({ code: "INSPECTION_INTENT_INVALID", publicationAuthorized: false,
        publishedCount: 0, syncedCount: 0 });
    }
    const binding = { prepare() { throw new Error("libsql://fixture.turso.io?authToken=must-never-escape"); } };
    const response = await send(binding);
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("must-never-escape");
  } finally { f.sqlite.close(); }
});

test("current opt-out and tenant changes hold before readonly lake requests", async () => {
  const originalFetch = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = (async () => { requests++; throw new Error("must not fetch"); }) as unknown as typeof fetch;
  try {
    for (const mutate of [
      (f: Awaited<ReturnType<typeof authorityFixture>>) => f.sqlite.query("UPDATE source_registry SET opt_out=1 WHERE source_id=?").run(sourceId),
      (f: Awaited<ReturnType<typeof authorityFixture>>) => f.sqlite.query("INSERT INTO source_opt_outs(source_id,reason) VALUES (?,?)").run(sourceId, "fixture-only"),
      (f: Awaited<ReturnType<typeof authorityFixture>>) => f.sqlite.query("UPDATE source_registry SET company_token='other' WHERE source_id=?").run(sourceId),
    ]) {
      const f = await authorityFixture();
      try {
        mutate(f); f.queries.length = 0;
        const response = await send(f.binding, inspectBody(), { TURSO_DATABASE_URL: "libsql://fixture.turso.io",
          TURSO_READONLY_AUTH_TOKEN: "fixture-readonly-secret" });
        expect(response.status).toBe(409);
        expect(await response.json()).toMatchObject({ code: "INSPECTION_AUTHORITY_REJECTED", publicationAuthorized: false,
          publishedCount: 0, syncedCount: 0 });
        expect(f.queries.every(sql => /^SELECT/.test(sql))).toBe(true);
      } finally { f.sqlite.close(); }
    }
    expect(requests).toBe(0);
  } finally { globalThis.fetch = originalFetch; }
});

test("current admission expiry holds before readonly lake requests without changing immutable leases", async () => {
  const f = await authorityFixture({ admissionExpiryMs: 500 });
  const originalFetch = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = (async () => { requests++; throw new Error("must not fetch"); }) as unknown as typeof fetch;
  try {
    await Bun.sleep(650);
    const response = await send(f.binding, inspectBody(), { TURSO_DATABASE_URL: "libsql://fixture.turso.io",
      TURSO_READONLY_AUTH_TOKEN: "fixture-readonly-secret" });
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: "INSPECTION_AUTHORITY_REJECTED", publicationAuthorized: false,
      publishedCount: 0, syncedCount: 0 });
    expect(requests).toBe(0);
    expect(f.queries.every(sql => /^SELECT/.test(sql))).toBe(true);
  } finally { globalThis.fetch = originalFetch; f.sqlite.close(); }
});

test("inspection leaves exact staging retries and their original clock unchanged", async () => {
  const f = privateFixture();
  try {
    const original = await stage(f.binding);
    expect(original.ok).toBe(true);
    await send(f.binding);
    const retry = await stage(f.binding);
    expect(retry).toEqual(original);
    expect(f.sqlite.query("SELECT revision,source_identity_hash,publication_tick_key,committed_receipt_key,committed_outcomes_json FROM lake_publication_operations")
      .get()).toEqual({ revision: 0, source_identity_hash: null, publication_tick_key: null,
        committed_receipt_key: null, committed_outcomes_json: null });
  } finally { f.sqlite.close(); }
});

const readonlyEnv = { TURSO_DATABASE_URL: "libsql://fixture.turso.io", TURSO_READONLY_AUTH_TOKEN: "fixture-readonly-secret" };
test("actual route inspects native evidence through readonly HTTP with zero public or control writes", async () => {
  const f = await authorityFixture(), lake = await lakeFixture();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = lake.fetch;
  try {
    const before = f.sqlite.query("SELECT * FROM lake_publication_operations").get();
    const response = await send(f.binding, inspectBody(), readonlyEnv);
    expect(response.status).toBe(200);
    const text = await response.text(), result = JSON.parse(text);
    expect(result).toMatchObject({ operationId: operationKey, sourceId, state: "HELD", publicationAuthorized: false,
      qualificationAuthorized: false, publishedCount: 0, syncedCount: 0 });
    expect(result.outcomes).toHaveLength(1);
    expect(result.outcomes[0].binding).toMatchObject({ sourceId, candidateId: 1, rawObservationId: 1, index: 0,
      postingId: 1, requisitionId: 101 });
    expect(result.outcomes[0].reasons).toContain("LEGACY_COLLECTION_UNVERIFIED");
    expect(text).not.toContain(readonlyEnv.TURSO_READONLY_AUTH_TOKEN);
    expect(text).not.toContain("raw_payload");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(f.sqlite.query("SELECT * FROM lake_publication_operations").get()).toEqual(before);
    expect(f.queries.every(sql => /^SELECT/.test(sql))).toBe(true);
    expect(f.sqlite.query("SELECT COUNT(*) AS n FROM opportunities").get()).toEqual({ n: 0 });
    expect(f.sqlite.query("SELECT COUNT(*) AS n FROM source_publication_ledger").get()).toEqual({ n: 0 });
    expect(lake.requests).toHaveLength(1);
    expect(lake.statements[0]).toBe("BEGIN TRANSACTION READONLY");
    expect(lake.statements.at(-1)).toBe("COMMIT");
    expect(lake.statements.every(sql => !/\b(INSERT|UPDATE|DELETE|REPLACE|opportunities|source_registry|publication_ledger)\b/.test(sql))).toBe(true);
    expect(lake.requests[0]!.headers.get("Authorization")).toBe(`Bearer ${readonlyEnv.TURSO_READONLY_AUTH_TOKEN}`);
    expect(await lake.requests[0]!.clone().text()).not.toContain(readonlyEnv.TURSO_READONLY_AUTH_TOKEN);
  } finally { globalThis.fetch = originalFetch; lake.sqlite.close(); f.sqlite.close(); }
});

for (const [field, value] of Object.entries({ lakeCandidateId: 2, lakeFingerprint: "changed-fingerprint", title: "Changed role",
  company: "Invented company", sourceUrl: "https://boards.greenhouse.io/test/jobs/2",
  applicationUrl: "https://boards.greenhouse.io/test/jobs/1/apply", sourcePlatform: "Changed source label",
  locationType: "remote", locationRaw: "APAC", postedAt: "2026-10-02T00:00:00.000Z", evidenceText: "Invented clearance" })) {
  test(`actual route withholds a staged ${field} mismatch against internal evidence`, async () => {
    const f = await authorityFixture({ stageCandidate: { [field]: value } }), lake = await lakeFixture();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = lake.fetch;
    try {
      const before = f.sqlite.query("SELECT * FROM lake_publication_operations").get();
      const response = await send(f.binding, inspectBody(), readonlyEnv);
      const result = await response.json() as any;
      expect(response.status).toBe(field === "lakeCandidateId" ? 503 : 200);
      expect(result).toMatchObject({ publicationAuthorized: false, qualificationAuthorized: false, publishedCount: 0, syncedCount: 0 });
      if (field === "lakeCandidateId") expect(result.code).toBe("LAKE_EVIDENCE_INVALID");
      else {
        expect(result.outcomes).toHaveLength(1);
        expect(result.outcomes[0].reasons).toContain("STAGED_MATERIAL_MISMATCH");
      }
      expect(result.outcomes?.some((row: any) => row.binding)).not.toBe(true);
      expect(f.sqlite.query("SELECT * FROM lake_publication_operations").get()).toEqual(before);
      expect(f.queries.every(sql => /^SELECT/.test(sql))).toBe(true);
      expect(lake.statements.every(sql => !/\b(INSERT|UPDATE|DELETE|REPLACE)\b/.test(sql))).toBe(true);
    } finally { globalThis.fetch = originalFetch; lake.sqlite.close(); f.sqlite.close(); }
  });
}

test("current authority is recaptured after the internal read before returning correspondence", async () => {
  const f = await authorityFixture(), lake = await lakeFixture();
  const originalFetch = globalThis.fetch;
  let changed = false;
  globalThis.fetch = (async (...args: Parameters<typeof fetch>) => {
    const response = await lake.fetch(...args);
    if (!changed) { f.sqlite.query("INSERT INTO source_opt_outs(source_id,reason) VALUES (?,?)").run(sourceId, "mid-read fixture-only"); changed = true; }
    return response;
  }) as typeof fetch;
  try {
    const response = await send(f.binding, inspectBody(), readonlyEnv);
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: "INSPECTION_AUTHORITY_REJECTED", publicationAuthorized: false,
      publishedCount: 0, syncedCount: 0 });
    expect(lake.requests).toHaveLength(1);
    expect(f.queries.every(sql => /^SELECT/.test(sql))).toBe(true);
  } finally { globalThis.fetch = originalFetch; lake.sqlite.close(); f.sqlite.close(); }
});

test("transport failures never return server credentials or fall through the ordinary writer", async () => {
  const f = await authorityFixture();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => { throw new Error(`authToken=${readonlyEnv.TURSO_READONLY_AUTH_TOKEN}`); }) as unknown as typeof fetch;
  try {
    const response = await send(f.binding, inspectBody(), readonlyEnv);
    expect(response.status).toBe(503);
    const text = await response.text();
    expect(text).not.toContain(readonlyEnv.TURSO_READONLY_AUTH_TOKEN);
    expect(JSON.parse(text)).toMatchObject({ publicationAuthorized: false, publishedCount: 0, syncedCount: 0 });
    expect(f.queries.every(sql => /^SELECT/.test(sql))).toBe(true);
  } finally { globalThis.fetch = originalFetch; f.sqlite.close(); }
});

test("an intent advanced during readonly acquisition cannot be inspected as revision zero", async () => {
  const f = await authorityFixture(), lake = await lakeFixture();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (...args: Parameters<typeof fetch>) => {
    const response = await lake.fetch(...args);
    f.sqlite.query("UPDATE lake_publication_operations SET revision=1 WHERE operation_key=?").run(operationKey);
    return response;
  }) as typeof fetch;
  try {
    const response = await send(f.binding, inspectBody(), readonlyEnv);
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: "INSPECTION_INTENT_STATE_CONFLICT", publicationAuthorized: false });
    expect(f.queries.every(sql => /^SELECT/.test(sql))).toBe(true);
  } finally { globalThis.fetch = originalFetch; lake.sqlite.close(); f.sqlite.close(); }
});

test("a renewed current admission context during internal reading withholds the earlier CAS", async () => {
  const f = await authorityFixture(), lake = await lakeFixture();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (...args: Parameters<typeof fetch>) => {
    const response = await lake.fetch(...args);
    await f.renewAdmission();
    return response;
  }) as typeof fetch;
  try {
    const before = f.sqlite.query("SELECT * FROM lake_publication_operations").get();
    const response = await send(f.binding, inspectBody(), readonlyEnv);
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: "INSPECTION_AUTHORITY_CHANGED", publicationAuthorized: false,
      publishedCount: 0, syncedCount: 0 });
    expect(f.sqlite.query("SELECT * FROM lake_publication_operations").get()).toEqual(before);
  } finally { globalThis.fetch = originalFetch; lake.sqlite.close(); f.sqlite.close(); }
});

test("actual route reevaluates formerly fresh acquisition against the current server date", async () => {
  const now = Date.now();
  const postedAt = new Date(now - 31 * 86_400_000).toISOString();
  const f = await authorityFixture({ stageCandidate: { postedAt } });
  const lake = await lakeFixture({ postedAt, completedAt: new Date(now - 30 * 86_400_000).toISOString() });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = lake.fetch;
  try {
    const response = await send(f.binding, inspectBody(), readonlyEnv);
    expect(response.status).toBe(200);
    const result = await response.json() as any;
    expect(result.outcomes[0]).toMatchObject({ state: "REJECTED", freshness: "STALE" });
    expect(result).toMatchObject({ publicationAuthorized: false, qualificationAuthorized: false, publishedCount: 0, syncedCount: 0 });
    expect(f.queries.every(sql => /^SELECT/.test(sql))).toBe(true);
  } finally { globalThis.fetch = originalFetch; lake.sqlite.close(); f.sqlite.close(); }
});
