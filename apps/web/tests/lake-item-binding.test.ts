import { Database } from "bun:sqlite";
import { expect, spyOn, test } from "bun:test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { createGreenhouseItemEvidence } from "../../../packages/scraper/greenhouse-item-evidence";
import { greenhousePostingDate } from "../../../packages/scraper/ats";
import { buildAdmissionEvidence, persistAdmissionEvidence } from "../../../packages/scraper/admission-evidence";
import { liveAdmissionFixture } from "../../../packages/scraper/test-fixtures/admission";
import { captureLakePublicationAuthority } from "../src/lib/lake-publication-authority";
import { parseLakeStageRequest } from "../src/lib/lake-publication-contract";
import { inspectLakeItemBindings } from "../src/lib/lake-item-binding";
import type { LakeEvidenceSnapshot, LakeEvidenceCandidateRow, LakeEvidenceRawObservationRow, LakeEvidenceSightingMetadata } from "../src/lib/lake-evidence-reader";
import { ensureLakeSchema } from "../../../scripts/lake/init-lake";
import { processAndRefineCandidate } from "../../../scripts/lake/ingest-to-lake";
import { storeRawObservation } from "../../../scripts/lake/lake-shared";

const sourceId = "greenhouse:test";
const endpoint = "https://boards-api.greenhouse.io/v1/boards/test/jobs";
const hash = (text: string) => createHash("sha256").update(text).digest("hex");
const instant = (ms: number) => new Date(ms).toISOString();

/** Real current-admission capture against the existing SQLite migrations. */
async function authority() {
  const sqlite = new Database(":memory:");
  sqlite.exec("PRAGMA foreign_keys=ON");
  const migration = (name: string) => readFileSync(new URL(`../../../packages/db/migrations/${name}`, import.meta.url), "utf8");
  const migrate = (name: string) => { for (const sql of migration(name).split(/--> statement-breakpoint/)) {
    if (sql.replace(/--[^\r\n]*/g, "").trim()) sqlite.exec(sql);
  } };
  for (const name of ["0036_registry_foundation.sql", "0037_source_lifecycle_opt_out.sql", "0038_shadow_observations.sql"]) migrate(name);
  const transition = migration("0039_canary_transition_plane.sql").split("-- New identities begin dormant.");
  sqlite.exec(transition[0]!);
  const base = await liveAdmissionFixture();
  const provider = { ...base.provider, evidenceCapturedAt: instant(Date.now() - 1_000) };
  const insert = (table: string, values: Record<string, unknown>) => sqlite.query(`INSERT INTO ${table} (${Object.keys(values).join(",")}) VALUES (${Object.keys(values).map(() => "?").join(",")})`).run(...Object.values(values) as any[]);
  insert("provider_profiles", { id: provider.id, display_name: "Fixture", provider_family: provider.providerFamily,
    mechanism: provider.mechanism, auth_class: provider.authClass, endpoint_pattern: provider.endpointPattern,
    allowed_hosts: provider.allowedHosts, evidence_url: provider.evidenceUrl, evidence_hash: provider.evidenceHash,
    evidence_captured_at: provider.evidenceCapturedAt, visibility_filter: provider.visibilityFilter,
    content_scope: provider.contentScope, cadence_min_minutes: provider.cadenceMinMinutes,
    cadence_max_minutes: provider.cadenceMaxMinutes, rate_guidance: provider.rateGuidance,
    robots_handling: provider.robotsHandling, removal_semantics: provider.removalSemantics,
    evidence_lease_days: provider.evidenceLeaseDays, default_compliance_state: "needs_review", default_operational_state: "candidate" });
  insert("source_registry", { source_id: base.source.sourceId, provider_id: base.source.providerId,
    display_name: base.source.displayName, endpoint_url: base.source.endpointUrl, company_token: base.source.companyToken,
    discovery_provenance: base.source.discoveryProvenance, compliance_state: base.source.complianceState,
    operational_state: "canary", review_deadline: base.source.reviewDeadline, policy_expiry: base.source.policyExpiry,
    canary_max_new_items_per_tick: 2 });
  sqlite.exec("-- New identities begin dormant." + transition[1]!);
  for (const name of ["0040_current_evidence_admission.sql", "0041_publication_ledger.sql",
    "0042_d1_like_glob_limit.sql", "0043_canary_promotion_trigger_alignment.sql", "0044_canary_to_active_graduation.sql"]) migrate(name);
  const source = { ...base.source, operationalState: "canary" as const, lastTransitionHash: null, canaryMaxNewItemsPerTick: 2,
    governanceRevision: (sqlite.query("SELECT governance_revision FROM source_registry WHERE source_id=?").get(sourceId) as any).governance_revision };
  const db: any = { prepare(sql: string) { return { values: [] as any[], sql,
    bind(...values: any[]) { this.values = values; return this; },
    async first() { return sqlite.query(sql).get(...this.values); },
    async run() { sqlite.query(sql).all(...this.values); return { success: true }; } }; },
    async batch(statements: any[]) { return sqlite.transaction(() => statements.map(s => {
      sqlite.query(s.sql).all(...s.values); return { success: true }; }))(); } };
  const capturedAt = instant(Date.now() - 100);
  const built = await buildAdmissionEvidence({ source, provider, probe: { ...base.packet.probe, timestamp: capturedAt },
    primaryEvidence: [{ url: provider.evidenceUrl!, contentSha256: provider.evidenceHash!, capturedAt: provider.evidenceCapturedAt! }],
    authorityActions: ["recurrent_private_shadow", "public_minimal_metadata_canary"], adjudicationRef: "binder-fixture", capturedAt,
    expiresAt: source.policyExpiry! });
  if (!built.ok) throw new Error(built.reason);
  const stored = await persistAdmissionEvidence(db, source, provider, built, capturedAt);
  if (!stored.ok) throw new Error(stored.reason);
  const result = await captureLakePublicationAuthority(db, sourceId, instant(Date.now()));
  sqlite.close();
  if (!result.ok) throw new Error(result.reason);
  return result.snapshot;
}

async function fixture(options: { items?: any[]; captureAgeDays?: number } = {}) {
  const sqlite = new Database(":memory:");
  const client: any = { async execute(q: any) { const sql = typeof q === "string" ? q : q.sql;
    return { rows: sqlite.query(sql).all(...(typeof q === "string" ? [] : q.args ?? [])) }; } };
  await ensureLakeSchema(client);
  const nowMs = Date.now();
  const posting = (id: number, overrides: Record<string, unknown> = {}) => ({ id, internal_job_id: id + 100,
    title: "Virtual Assistant", absolute_url: `https://boards.greenhouse.io/test/jobs/${id}`,
    location: { name: "Philippines" }, first_published: instant(nowMs - 7 * 86_400_000),
    updated_at: instant(nowMs - 86_400_000), ...overrides });
  const items = options.items ?? [posting(1)];
  const age = (options.captureAgeDays ?? 0) * 86_400_000;
  const receipt = createGreenhouseItemEvidence({ sourceId, tenantSlug: "test", endpointUrl: endpoint, httpStatus: 200,
    startedAt: instant(nowMs - age - 10_000), completedAt: instant(nowMs - age - 9_000), responseBody: JSON.stringify({ jobs: items }) });
  const rawId = await storeRawObservation(client, { sourceId, sourcePlatform: "Greenhouse/test", fetchUrl: endpoint,
    httpStatus: 200, rawPayload: receipt.payload, contentHash: receipt.retainedSha256, requireCompletePayload: true });
  const stats = { totalExtracted: 0, duplicates: 0, excluded: 0, qualifiedReady: 0, ambiguous: 0 };
  // Actual refinery writes retain its default location_type and Unknown company.
  for (const j of items) if (typeof j.title === "string" && typeof j.absolute_url === "string") {
    const loc = typeof j.location?.name === "string" ? j.location.name : "";
    await processAndRefineCandidate(client, rawId, { sourceId, sourcePlatform: "Greenhouse/test",
      sourceUrl: j.absolute_url, title: j.title, company: "", category: "other", locationRaw: loc,
      description: loc ? `Location: ${loc.replace(/<[^>]*>/g, "").trim()}` : "", applicationUrl: j.absolute_url,
      postedAt: greenhousePostingDate(j.first_published), tags: [] }, stats);
  }
  const snapshot = (): LakeEvidenceSnapshot => ({ sourceId,
    candidates: sqlite.query("SELECT id,raw_observation_id,source_id,source_platform,source_url,title,company,location_type,location_raw,description,application_url,posted_at,fingerprint_hash FROM lake_candidate_jobs").all() as LakeEvidenceCandidateRow[],
    rawObservations: sqlite.query("SELECT id,source_id,source_platform,fetch_url,http_status,raw_payload,content_hash,fetched_at FROM lake_raw_observations").all() as LakeEvidenceRawObservationRow[],
    sightingMetadata: sqlite.query(`SELECT c.id AS candidate_id,COUNT(s.id) AS sighting_count,
      COUNT(DISTINCT s.raw_observation_id) AS distinct_raw_observation_count,COUNT(DISTINCT s.source_id) AS distinct_source_count,
      COUNT(DISTINCT s.source_url) AS distinct_source_url_count,MAX(s.observed_at) AS latest_observed_at,
      SUM(CASE WHEN s.id IS NOT NULL AND (s.raw_observation_id IS NOT c.raw_observation_id
        OR s.source_id IS NOT c.source_id OR s.source_url IS NOT c.source_url) THEN 1 ELSE 0 END) AS mismatched_sighting_count
      FROM lake_candidate_jobs c LEFT JOIN lake_sightings s ON s.candidate_id=c.id GROUP BY c.id`).all().map((row: any) => ({ ...row, complete: true })) as LakeEvidenceSightingMetadata[],
    publicationAuthorized: false as const, qualificationAuthorized: false as const });
  const candidate: any = (snapshot().candidates as any[])[0];
  const first = receipt.items.find(item => item.facts.absoluteUrl.state === "value" && item.facts.absoluteUrl.value === candidate.source_url)!;
  const loc = first.facts.locationName.state === "value" ? first.facts.locationName.value : null;
  const summary = loc?.replace(/<[^>]*>/g, "").trim();
  const material = { lakeCandidateId: candidate.id, lakeFingerprint: candidate.fingerprint_hash, title: candidate.title.trim(),
    company: null, sourceUrl: candidate.source_url, applicationUrl: candidate.application_url,
    sourcePlatform: candidate.source_platform, locationType: "unknown", locationRaw: loc,
    postedAt: first.assessment.postedAt, evidenceText: summary ? `Location: ${summary}` : null };
  const stage = async (overrides: Record<string, unknown> = {}) => {
    const parsed = await parseLakeStageRequest({ operation: "lake-stage", version: 1, operationId: "binder-fixture",
      sourceId, candidates: [{ ...material, ...overrides }] });
    if (!parsed.ok) throw new Error(parsed.message);
    return { operationKey: parsed.request.operationId, sourceId, manifestHash: parsed.manifestHash,
      descriptors: parsed.descriptors, stagedAt: instant(nowMs), revision: 0 as const };
  };
  const currentAuthority = await authority();
  const input = async () => ({ intent: await stage(), snapshot: snapshot(), currentAuthority, now: instant(Date.now()) });
  return { sqlite, client, receipt, rawId, posting, snapshot, stage, input, currentAuthority, material };
}

test("actual SQLite candidate/native replay binds exact private material but never clears legacy collection", async () => {
  const f = await fixture();
  try {
    const before = f.sqlite.serialize();
    const result = await inspectLakeItemBindings(await f.input());
    expect(result).toMatchObject({ version: "lake-item-binding-v1", state: "HELD", publicationAuthorized: false,
      qualificationAuthorized: false, publishedCount: 0, syncedCount: 0 });
    expect(result.outcomes).toHaveLength(1);
    expect(result.outcomes[0]).toMatchObject({ lakeCandidateId: 1, state: "HELD", freshness: "WITHIN_WINDOW",
      binding: { sourceId, candidateId: 1, rawObservationId: f.rawId, retainedSha256: f.receipt.retainedSha256,
        index: 0, itemMaterialSha256: f.receipt.items[0]!.materialSha256, postingId: 1, requisitionId: 101 } });
    expect(result.outcomes[0].reasons).toContain("LEGACY_COLLECTION_UNVERIFIED");
    expect(f.sqlite.serialize()).toEqual(before);
    expect(JSON.stringify(result)).not.toContain("Virtual Assistant");
    expect(JSON.stringify(result)).not.toContain("Location: Philippines");
  } finally { f.sqlite.close(); }
});

test("all eleven staged facts must match the conservative server profile; no claims are rewritten", async () => {
  const f = await fixture();
  try {
    const changes = [{ lakeCandidateId: 2 }, { lakeFingerprint: "changed" }, { title: "Changed role" },
      { company: "Unproven company" }, { sourceUrl: "https://boards.greenhouse.io/test/jobs/2" },
      { applicationUrl: null }, { sourcePlatform: "Other" }, { locationType: "remote" },
      { locationRaw: "APAC" }, { postedAt: null }, { evidenceText: "Remote PASS" }];
    for (const change of changes) {
      const input = { ...await f.input(), intent: await f.stage(change) };
      const result = await inspectLakeItemBindings(input);
      expect(result.outcomes[0]?.binding).toBeUndefined();
      expect(result.publicationAuthorized).toBe(false);
      expect(result.outcomes[0]?.reasons.length).toBeGreaterThan(0);
      expect(input.intent).toEqual(await f.stage(change));
    }
  } finally { f.sqlite.close(); }
});

test("raw bytes, stored digest, source, endpoint and status mismatch cannot produce a native binding", async () => {
  const f = await fixture();
  try {
    for (const change of [{ raw_payload: `${f.receipt.payload} ` }, { content_hash: "a".repeat(64) },
      { source_id: "greenhouse:other" }, { fetch_url: `${endpoint}?content=true` }, { http_status: 304 }]) {
      const input = await f.input(); Object.assign(input.snapshot.rawObservations[0]!, change);
      const result = await inspectLakeItemBindings(input);
      expect(result.outcomes[0]?.binding).toBeUndefined();
      expect(result.outcomes[0]?.state).toBe("REJECTED");
    }
    const input = await f.input(); const envelope = JSON.parse(f.receipt.payload);
    envelope.items[0].assessment.fullRemote = "PASS";
    const payload = JSON.stringify(envelope);
    Object.assign(input.snapshot.rawObservations[0]!, { raw_payload: payload, content_hash: hash(payload) });
    expect((await inspectLakeItemBindings(input)).outcomes[0]?.state).toBe("REJECTED");
  } finally { f.sqlite.close(); }
});

test("candidate/native material drift stays held even when old geo-only status was qualified", async () => {
  const f = await fixture();
  try {
    for (const change of [{ title: "New title" }, { location_raw: "United States" },
      { posted_at: null }, { description: "UNEXPECTED FULL CONTENT" },
      { application_url: "https://boards.greenhouse.io/test/jobs/999" }, { company: "Unproven" }]) {
      const input = await f.input(); Object.assign(input.snapshot.candidates[0]!, change);
      const result = await inspectLakeItemBindings(input);
      expect(result.outcomes[0]?.state).toBe("HELD");
      expect(result.outcomes[0]?.reasons).toContain("CANDIDATE_NATIVE_MATERIAL_MISMATCH");
      expect(result.outcomes[0]?.binding).toBeUndefined();
    }
  } finally { f.sqlite.close(); }
});

test("coarse-fingerprint consolidation and every additional sighting hold lineage", async () => {
  const f = await fixture();
  try {
    const second = f.posting(2);
    await processAndRefineCandidate(f.client, f.rawId, { sourceId, sourcePlatform: "Greenhouse/test",
      sourceUrl: second.absolute_url, title: second.title, company: "", category: "other", locationRaw: "Philippines",
      description: "Location: Philippines", applicationUrl: second.absolute_url, postedAt: second.first_published, tags: [] },
      { totalExtracted: 0, duplicates: 0, excluded: 0, qualifiedReady: 0, ambiguous: 0 });
    expect(f.snapshot().candidates).toHaveLength(1);
    const result = await inspectLakeItemBindings(await f.input());
    expect(result.outcomes[0]?.reasons).toContain("LINEAGE_SIGHTINGS_UNRECONCILED");
    expect(result.outcomes[0]?.binding).toBeUndefined();
    for (const metadata of [[], [{ ...f.snapshot().sightingMetadata[0], complete: false }]]) {
      const input = await f.input(); input.snapshot.sightingMetadata = metadata as any;
      expect((await inspectLakeItemBindings(input)).outcomes[0]?.binding).toBeUndefined();
    }
  } finally { f.sqlite.close(); }
});

test("current time re-evaluates original posting date without resetting captured evidence", async () => {
  for (const [date, expected] of [[null, "UNKNOWN"], [instant(Date.now() + 86_400_000), "FUTURE"],
    [instant(Date.now() - 31 * 86_400_000), "STALE"]] as const) {
    const f = await fixture({ captureAgeDays: 2, items: [{ id: 1, internal_job_id: 101, title: "Virtual Assistant",
      absolute_url: "https://boards.greenhouse.io/test/jobs/1", location: { name: "Philippines" }, first_published: date }] });
    try {
      const before = f.receipt.payload;
      const result = await inspectLakeItemBindings(await f.input());
      expect(result.outcomes[0]?.freshness).toBe(expected);
      expect(result.outcomes[0]?.state).toBe(expected === "UNKNOWN" ? "HELD" : "REJECTED");
      expect(f.receipt.payload).toBe(before);
      if (expected === "STALE") expect(f.receipt.items[0]!.assessment.freshness).toBe("WITHIN_WINDOW");
    } finally { f.sqlite.close(); }
  }
});

test("manifest, runtime IDs, source context and forged authority cannot produce false proof", async () => {
  const f = await fixture();
  try {
    for (const mutate of [(x: any) => { x.intent.manifestHash = "a".repeat(64); },
      (x: any) => { x.snapshot.candidates[0].id = "1"; },
      (x: any) => { x.snapshot.sourceId = "greenhouse:other"; },
      (x: any) => { x.currentAuthority = JSON.parse(JSON.stringify(x.currentAuthority)); },
      (x: any) => { x.now = "2026-02-30T00:00:00.000Z"; }]) {
      const input = await f.input(); mutate(input);
      const result = await inspectLakeItemBindings(input);
      expect(result.outcomes.every((x: any) => !x.binding)).toBe(true);
      expect(result.reasons.length + result.outcomes.reduce((n: number, x: any) => n + x.reasons.length, 0)).toBeGreaterThan(0);
      expect(result.publicationAuthorized).toBe(false);
      expect(result.publishedCount).toBe(0);
    }
  } finally { f.sqlite.close(); }
});

test("edge package bundles without reaching process environment or generic lake client", async () => {
  const built = await Bun.build({ entrypoints: [fileURLToPath(new URL("../../../packages/scraper/greenhouse-item-evidence.ts", import.meta.url))],
    target: "browser", external: ["node:crypto"] });
  expect(built.success).toBe(true);
  const bundle = await built.outputs[0]!.text();
  expect(bundle).not.toContain("TURSO_DATABASE_URL");
  expect(bundle).not.toContain("getLakeClient");
  expect(bundle).not.toContain("process.env");
});

test("sole mismatched source, URL or raw pointer sightings cannot masquerade as exact lineage", async () => {
  const f = await fixture();
  try {
    const row = f.snapshot().candidates[0]!;
    for (const change of [{ source_id: "greenhouse:other" }, { source_url: `${row.source_url}?other=1` }, { raw_observation_id: f.rawId + 1 }]) {
      f.sqlite.exec("DELETE FROM lake_sightings");
      const values = { raw_observation_id: f.rawId, source_id: sourceId, source_url: row.source_url, ...change };
      f.sqlite.query("INSERT INTO lake_sightings(candidate_id,raw_observation_id,source_id,source_platform,source_url) VALUES (?,?,?,?,?)")
        .run(row.id, values.raw_observation_id, values.source_id, row.source_platform, values.source_url);
      expect(f.snapshot().sightingMetadata[0]).toMatchObject({ sighting_count: 1, mismatched_sighting_count: 1 });
      const result = await inspectLakeItemBindings(await f.input());
      expect(result.outcomes[0]?.binding).toBeUndefined();
      expect(result.outcomes[0]?.reasons).toContain("LINEAGE_SIGHTINGS_UNRECONCILED");
    }
    f.sqlite.exec("DELETE FROM lake_sightings");
    const input = await f.input(); input.snapshot.sightingMetadata[0]!.mismatched_sighting_count = 1;
    expect((await inspectLakeItemBindings(input)).outcomes[0]?.reasons).toContain("LINEAGE_METADATA_INCOMPLETE");
  } finally { f.sqlite.close(); }
});

test("exact tenant/native posting URL and one native item are required; prospects never become vacancies", async () => {
  const now = Date.now();
  const posting = { id: 1, internal_job_id: 101, title: "Virtual Assistant", location: { name: "Philippines" }, first_published: instant(now - 7 * 86_400_000) };
  for (const [items, reason] of [
    [[{ ...posting, absolute_url: "https://boards.greenhouse.io/other/jobs/1" }], "NATIVE_POSTING_URL_MISMATCH"],
    [[{ ...posting, absolute_url: "https://boards.greenhouse.io/test/jobs/999" }], "NATIVE_POSTING_URL_MISMATCH"],
    [[{ ...posting, absolute_url: "https://boards.greenhouse.io/TEST/jobs/1" }], "NATIVE_POSTING_URL_MISMATCH"],
    [[{ ...posting, absolute_url: "https://boards.greenhouse.io/test/jobs/1", internal_job_id: null }], "NATIVE_PROSPECT"],
    [[{ ...posting, absolute_url: "https://boards.greenhouse.io/test/jobs/1" }, { ...posting, absolute_url: "https://boards.greenhouse.io/test/jobs/1" }], "NATIVE_ITEM_AMBIGUOUS"],
  ] as const) {
    const f = await fixture({ items: [...items] });
    try {
      const result = await inspectLakeItemBindings(await f.input());
      expect(result.outcomes[0]?.reasons).toContain(reason);
      expect(result.outcomes[0]?.binding).toBeUndefined();
      expect(result.publicationAuthorized).toBe(false);
    } finally { f.sqlite.close(); }
  }
});

test("exact thirty-day freshness is inclusive and current authority equality is expired", async () => {
  const postedAt = instant(Date.now() - 29 * 86_400_000);
  const f = await fixture({ captureAgeDays: 2, items: [{ id: 1, internal_job_id: 101, title: "Virtual Assistant",
    absolute_url: "https://boards.greenhouse.io/test/jobs/1", location: { name: "Philippines" }, first_published: postedAt }] });
  try {
    const input = await f.input(); input.now = instant(Date.parse(postedAt) + 30 * 86_400_000);
    expect((await inspectLakeItemBindings(input)).outcomes[0]?.freshness).toBe("WITHIN_WINDOW");
    input.now = instant(Date.parse(input.now) + 1);
    expect((await inspectLakeItemBindings(input)).outcomes[0]?.freshness).toBe("STALE");
    input.now = input.currentAuthority.cas.admissionExpiresAt;
    const expired = await inspectLakeItemBindings(input);
    expect(expired.reasons).toContain("AUTHORITY_CONTEXT_EXPIRED");
    expect(expired.outcomes).toEqual([]);
  } finally { f.sqlite.close(); }
});

test("rehashed native index/material tampering and oversized aggregate evidence yield no binding", async () => {
  const f = await fixture();
  try {
    for (const change of [(e: any) => { e.items[0].index = 1; }, (e: any) => { e.items[0].materialSha256 = "0".repeat(64); }]) {
      const input = await f.input(); const envelope = JSON.parse(f.receipt.payload); change(envelope);
      const payload = JSON.stringify(envelope);
      Object.assign(input.snapshot.rawObservations[0]!, { raw_payload: payload, content_hash: hash(payload) });
      const result = await inspectLakeItemBindings(input);
      expect(result.outcomes[0]?.reasons).toContain("NATIVE_REPLAY_INVALID");
      expect(result.outcomes[0]?.binding).toBeUndefined();
    }
    const input = await f.input(); input.snapshot.rawObservations[0]!.raw_payload = "x".repeat(1024 * 1024 + 1);
    const oversized = await inspectLakeItemBindings(input);
    expect(oversized.reasons).toContain("RAW_SNAPSHOT_OVER_BUDGET");
    expect(oversized.outcomes).toEqual([]);
  } finally { f.sqlite.close(); }
});

test("one shared raw observation has bounded replay/context parsing for every candidate", async () => {
  const now = Date.now();
  const items = Array.from({ length: 8 }, (_, i) => ({ id: i + 1, internal_job_id: i + 101,
    title: `Virtual Assistant ${i + 1}`, absolute_url: `https://boards.greenhouse.io/test/jobs/${i + 1}`,
    location: { name: "Philippines" }, first_published: instant(now - 7 * 86_400_000) }));
  const f = await fixture({ items });
  try {
    const snapshot = f.snapshot();
    expect(snapshot.candidates).toHaveLength(items.length);
    expect(snapshot.rawObservations).toHaveLength(1);
    const parsed = await parseLakeStageRequest({ operation: "lake-stage", version: 1, operationId: "binder-shared-raw",
      sourceId, candidates: snapshot.candidates.map(row => ({ ...f.material, lakeCandidateId: row.id,
        lakeFingerprint: row.fingerprint_hash, title: row.title, sourceUrl: row.source_url,
        applicationUrl: row.application_url })) });
    if (!parsed.ok) throw new Error(parsed.message);
    const before = f.sqlite.serialize();
    for (const sourceMatches of [true, false]) {
      const input = await f.input();
      input.intent = { ...input.intent, operationKey: parsed.request.operationId,
        manifestHash: parsed.manifestHash, descriptors: parsed.descriptors };
      if (!sourceMatches) {
        const other = createGreenhouseItemEvidence({ sourceId: "greenhouse:other", tenantSlug: "other",
          endpointUrl: "https://boards-api.greenhouse.io/v1/boards/other/jobs", httpStatus: 200,
          startedAt: instant(now - 10_000), completedAt: instant(now - 9_000), responseBody: JSON.stringify({ jobs: items }) });
        Object.assign(input.snapshot.rawObservations[0]!, { raw_payload: other.payload, content_hash: other.retainedSha256 });
      }
      const payload = input.snapshot.rawObservations[0]!.raw_payload;
      const parse = JSON.parse;
      let payloadParses = 0;
      const parsing = spyOn(JSON, "parse").mockImplementation((value, reviver) => {
        if (value === payload) payloadParses++;
        return parse(value, reviver);
      });
      let result;
      try { result = await inspectLakeItemBindings(input); }
      finally { parsing.mockRestore(); }
      expect(payloadParses).toBeLessThanOrEqual(2);
      expect(result.outcomes).toHaveLength(items.length);
      expect(result).toMatchObject({ publicationAuthorized: false, qualificationAuthorized: false, publishedCount: 0, syncedCount: 0 });
      if (sourceMatches) expect(result.outcomes.every(item => item.state === "HELD" && !!item.binding)).toBe(true);
      else expect(result.outcomes.every(item => item.state === "REJECTED" && !item.binding
        && item.reasons.includes("NATIVE_SOURCE_BINDING_MISMATCH"))).toBe(true);
    }
    expect(f.sqlite.serialize()).toEqual(before);
  } finally { f.sqlite.close(); }
});

test("duplicate posting IDs with unique native URLs cannot produce a private item binding", async () => {
  const now = Date.now();
  const posting = { id: 1, internal_job_id: 101, title: "Virtual Assistant", location: { name: "Philippines" },
    first_published: instant(now - 7 * 86_400_000) };
  const f = await fixture({ items: [{ ...posting, absolute_url: "https://boards.greenhouse.io/test/jobs/1" },
    { ...posting, title: "Executive Assistant", absolute_url: "https://job-boards.greenhouse.io/test/jobs/1" }] });
  try {
    expect(f.snapshot().candidates).toHaveLength(2);
    expect(f.receipt.items.every(item => item.assessment.reasons.includes("DUPLICATE_POSTING_ID"))).toBe(true);
    const result = await inspectLakeItemBindings(await f.input());
    expect(result.outcomes[0]?.state).toBe("REJECTED");
    expect(result.outcomes[0]?.reasons).toContain("NATIVE_POSTING_ID_AMBIGUOUS");
    expect(result.outcomes[0]?.binding).toBeUndefined();
    expect(result).toMatchObject({ publicationAuthorized: false, qualificationAuthorized: false, publishedCount: 0, syncedCount: 0 });
  } finally { f.sqlite.close(); }
});
