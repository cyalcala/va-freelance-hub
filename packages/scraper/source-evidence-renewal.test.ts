import { expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { readFileSync } from "fs";
import { join } from "path";
import { admitReviewedSourceToShadow } from "./source-admission";
import { loadCurrentAdmissionEvidence, type AdmissionStatement } from "./admission-evidence";
import { renewProviderEvidence, type RenewProviderEvidenceInput } from "./source-evidence-renewal";
import { liveAdmissionFixture } from "./test-fixtures/admission";
import { sha256Hex } from "./contentHash";
import { dispatchShadowObservations } from "./shadow-dispatcher";
import { applyTypedTransition, qualifyAdmissionObservations } from "./transition-gateway";

class Statement implements AdmissionStatement {
  values: unknown[] = [];
  constructor(readonly sqlite: Database, readonly sql: string) {}
  bind(...values: unknown[]) { this.values = values; return this; }
  async first<T>() { return (this.sqlite.query(this.sql).get(...this.values as any[]) ?? null) as T | null; }
  execute() { this.sqlite.query(this.sql).all(...this.values as any[]); return { success: true }; }
  async run() { return this.execute(); }
}
class AtomicDb {
  beforeBatch?: () => void;
  failAfterStatement?: number;
  constructor(readonly sqlite: Database) {}
  prepare(sql: string) { return new Statement(this.sqlite, sql); }
  async batch(statements: AdmissionStatement[]) {
    this.beforeBatch?.();
    return this.sqlite.transaction(() => statements.map((statement, index) => {
      const result = (statement as Statement).execute();
      if (index === this.failAfterStatement) throw new Error("Injected mid-batch failure");
      return result;
    }))();
  }
}
async function setup() {
  const sqlite = new Database(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON");
  for (const name of ["0036_registry_foundation.sql", "0037_source_lifecycle_opt_out.sql", "0038_shadow_observations.sql",
    "0039_canary_transition_plane.sql", "0040_current_evidence_admission.sql", "0041_publication_ledger.sql", "0042_d1_like_glob_limit.sql"]) {
    sqlite.exec(readFileSync(join(import.meta.dir, "../db/migrations", name), "utf8"));
  }
  const db = new AtomicDb(sqlite);
  const fixture = await liveAdmissionFixture();
  const sources = [fixture.source, { ...fixture.source, sourceId: "greenhouse:second", companyToken: "second",
    endpointUrl: "https://boards-api.greenhouse.io/v1/boards/second/jobs" }];
  const probes = sources.map(source => ({ ...fixture.packet.probe, sourceId: source.sourceId,
    endpoint: { ...fixture.packet.probe.endpoint, url: source.endpointUrl } }));
  for (let index = 0; index < sources.length; index++) {
    const result = await admitReviewedSourceToShadow(db, { now: new Date().toISOString(), source: sources[index],
      provider: fixture.provider, probe: probes[index], primaryEvidence: fixture.packet.primaryEvidence,
      adjudicationRef: fixture.packet.adjudicationRef });
    expect(result.ok).toBe(true);
  }
  const capturedAt = new Date().toISOString();
  const content = "Reviewed public API documentation, minimal metadata collection and source links.";
  const url = fixture.provider.evidenceUrl!;
  const current = await Promise.all(sources.map(source => loadCurrentAdmissionEvidence(db, source.sourceId, capturedAt)));
  const input: RenewProviderEvidenceInput = {
    providerId: fixture.provider.id, expectedProviderRevision: fixture.provider.governanceRevision,
    expectedEvidenceIds: Object.fromEntries(current.map(context => {
      if (!context.ok) throw new Error(context.reason);
      return [context.source.sourceId, context.evidence.id];
    })),
    now: capturedAt, captures: [{ url, content, capturedAt }],
    probes: probes.map(probe => ({ ...probe, timestamp: capturedAt })),
    adjudication: { decision: "renew_existing_scope", reference: "reviewed-primary-content-renewal",
      reviewedContentHashes: { [url]: await sha256Hex(content) } },
  };
  return { sqlite, db, input };
}
function snapshot(sqlite: Database) {
  return Object.fromEntries(["provider_profiles", "source_registry", "source_admission_evidence", "source_transition_events"]
    .map(table => [table, sqlite.query(`SELECT * FROM ${table}`).all()]));
}

test("atomically renews all shared-provider evidence while preserving sources, leases, authority, and history", async () => {
  const { sqlite, db, input } = await setup();
  const before = snapshot(sqlite);
  const result = await renewProviderEvidence(db, input);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.reason);
  expect(result.providerRevision).toBe(input.expectedProviderRevision + 1);
  expect(Object.keys(result.evidenceIds).sort()).toEqual(Object.keys(input.expectedEvidenceIds).sort());
  expect(sqlite.query("SELECT * FROM source_registry").all()).toEqual(before.source_registry);
  expect(sqlite.query("SELECT * FROM source_transition_events").all()).toEqual(before.source_transition_events);
  expect(sqlite.query("SELECT * FROM source_admission_evidence WHERE id<=2").all()).toEqual(before.source_admission_evidence);
  for (const sourceId of Object.keys(result.evidenceIds)) {
    const current = await loadCurrentAdmissionEvidence(db, sourceId, input.now);
    expect(current.ok).toBe(true);
    if (!current.ok) throw new Error(current.reason);
    expect(current.evidence.id).toBeGreaterThan(input.expectedEvidenceIds[sourceId]);
    expect(current.packet.authorityActions).toEqual(["recurrent_private_shadow", "public_minimal_metadata_canary"]);
    expect(current.provider.evidenceHash).toBe(await sha256Hex(input.captures[0].content));
  }
});

test("a failure after the first evidence insert rolls back every provider and evidence change", async () => {
  const { sqlite, db, input } = await setup();
  const before = snapshot(sqlite);
  db.failAfterStatement = 2;
  expect((await renewProviderEvidence(db, input)).ok).toBe(false);
  expect(snapshot(sqlite)).toEqual(before);
});

test("rejects group membership, source revision, and provider revision races atomically", async () => {
  for (const change of [
    (sqlite: Database) => sqlite.exec(`INSERT INTO source_registry(source_id,provider_id,display_name,endpoint_url,compliance_state,operational_state)
      VALUES('greenhouse:concurrent','greenhouse','Concurrent','https://boards-api.greenhouse.io/v1/boards/concurrent/jobs','needs_review','candidate')`),
    (sqlite: Database) => sqlite.exec("UPDATE source_registry SET display_name='Concurrently reviewed' WHERE source_id='greenhouse:test'"),
    (sqlite: Database) => sqlite.exec(`UPDATE provider_profiles SET evidence_hash='${"c".repeat(64)}' WHERE id='greenhouse'`),
  ]) {
    const { sqlite, db, input } = await setup();
    let raced: ReturnType<typeof snapshot>;
    db.beforeBatch = () => { change(sqlite); raced = snapshot(sqlite); };
    expect((await renewProviderEvidence(db, input)).ok).toBe(false);
    expect(snapshot(sqlite)).toEqual(raced!);
  }
});

test("refuses mixed operational groups without pausing or altering the other shadow", async () => {
  const { sqlite, db, input } = await setup();
  const transition = await applyTypedTransition(db, { sourceId: "greenhouse:second",
    to: { compliance: "conditional", operational: "paused" }, cause: "emergency_pause", now: input.now });
  expect(transition.persisted).toBe(true);
  const before = snapshot(sqlite);
  const result = await renewProviderEvidence(db, input);
  expect(result.ok).toBe(false);
  expect(snapshot(sqlite)).toEqual(before);
});

test("rejects partial groups, content not covered by adjudication, stale captures, and unhealthy probes before writes", async () => {
  const mutations: ((input: RenewProviderEvidenceInput) => void)[] = [
    input => { delete input.expectedEvidenceIds["greenhouse:second"]; },
    input => { input.captures[0].content += " unreviewed change"; },
    input => { input.captures[0].capturedAt = "2026-01-01T00:00:00.000Z"; },
    input => { input.probes[0].diagnostic.outcome = "SCHEMA_BROKEN"; },
    input => { input.adjudication.reference = ""; },
  ];
  for (const mutate of mutations) {
    const { sqlite, db, input } = await setup();
    const before = snapshot(sqlite);
    mutate(input);
    expect((await renewProviderEvidence(db, input)).ok).toBe(false);
    expect(snapshot(sqlite)).toEqual(before);
  }
});

test("new evidence IDs restart dispatch cadence and cannot count the old observation window", async () => {
  const { sqlite, db, input } = await setup();
  async function dispatch() {
    const contexts = await Promise.all(Object.keys(input.expectedEvidenceIds).map(id => loadCurrentAdmissionEvidence(db, id, input.now)));
    return dispatchShadowObservations({
      loadRegistryRows: async () => contexts.map(context => { if (!context.ok) throw new Error(context.reason); return context.source; }),
      loadAdmissionContext: (id, now) => loadCurrentAdmissionEvidence(db, id, now),
      loadLastObservedAt: async context => {
        const row = sqlite.query("SELECT MAX(observed_at) AS observed FROM source_shadow_observations WHERE source_id=? AND admission_evidence_id=? AND shadow_entry_hash=?")
          .get(context.source.sourceId, context.evidence.id, context.source.lastTransitionHash!) as { observed: string | null };
        return row.observed;
      },
      now: () => new Date(input.now),
      runProbe: async source => input.probes.find(probe => probe.sourceId === source.sourceId)!,
      persistObservation: async record => {
        const keys = Object.keys(record);
        const columns = keys.map(key => key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`));
        sqlite.query(`INSERT INTO source_shadow_observations(${columns.join(",")}) VALUES(${keys.map(() => "?").join(",")})`)
          .run(...Object.values(record));
      },
    });
  }
  expect((await dispatch()).dispatched).toBe(2);
  expect((await dispatch()).dispatched).toBe(0);
  const historical = sqlite.query("SELECT * FROM source_shadow_observations").all();
  const renewed = await renewProviderEvidence(db, input);
  expect(renewed.ok).toBe(true);
  expect((await dispatch()).dispatched).toBe(2);
  expect(sqlite.query("SELECT * FROM source_shadow_observations WHERE id<=2").all()).toEqual(historical);
  const stale = { ...historical[0] } as Record<string, any>;
  delete stale.id;
  stale.dispatch_key = "stale-inflight-probe-after-renewal";
  const resultJson = JSON.parse(stale.result_json);
  resultJson.admissionBinding.dispatchKey = stale.dispatch_key;
  stale.result_json = JSON.stringify(resultJson);
  stale.evidence_hash = await sha256Hex(stale.result_json);
  expect(() => sqlite.query(`INSERT INTO source_shadow_observations(${Object.keys(stale).join(",")}) VALUES(${Object.keys(stale).map(() => "?").join(",")})`)
    .run(...Object.values(stale))).toThrow("observation admission context changed or expired");
  for (const id of Object.keys(input.expectedEvidenceIds)) {
    const current = await loadCurrentAdmissionEvidence(db, id, input.now);
    if (!current.ok) throw new Error(current.reason);
    expect((await qualifyAdmissionObservations(current, [], input.now)).ok).toBe(false);
    const groups = sqlite.query("SELECT admission_evidence_id AS evidenceId, COUNT(*) AS n FROM source_shadow_observations WHERE source_id=? GROUP BY admission_evidence_id").all(id);
    expect(groups).toHaveLength(2);
  }
});
