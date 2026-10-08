import { Database } from "bun:sqlite";
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  buildAdmissionEvidence, persistAdmissionEvidence, sha256Hex, applyTypedTransition,
  type AdmissionSourceSnapshot,
} from "@va-hub/scraper";
import type { AdmissionStatement } from "../../../packages/scraper/admission-evidence";
import { liveAdmissionFixture } from "../../../packages/scraper/test-fixtures/admission";
import {
  captureLakePublicationAuthority, prepareLakePublicationAuthorityGuard, isIssuedLakePublicationAuthoritySnapshot,
  type LakeAuthorityDatabase, type LakePublicationAuthoritySnapshot,
} from "../src/lib/lake-publication-authority";

class Statement implements AdmissionStatement {
  values: unknown[] = [];
  constructor(readonly sqlite: Database, readonly sql: string) {}
  bind(...values: unknown[]) { this.values = values; return this; }
  async first<T>() { return (this.sqlite.query(this.sql).get(...this.values as any[]) ?? null) as T | null; }
  async run() { return this.execute(); }
  execute() { this.sqlite.query(this.sql).all(...this.values as any[]); return { success: true }; }
}
class AtomicDatabase implements LakeAuthorityDatabase {
  constructor(readonly sqlite: Database) {}
  prepare(sql: string) { return new Statement(this.sqlite, sql); }
  async batch(statements: AdmissionStatement[]) {
    return this.sqlite.transaction(() => statements.map(statement => (statement as Statement).execute()))();
  }
}

function insert(sqlite: Database, table: "provider_profiles" | "source_registry", values: Record<string, unknown>) {
  sqlite.query(`INSERT INTO ${table} (${Object.keys(values).join(",")}) VALUES (${Object.keys(values).map(() => "?").join(",")})`)
    .run(...Object.values(values) as any[]);
}

async function fixture(options: { state?: "active" | "canary" | "shadow"; publicAction?: boolean; expiryMs?: number } = {}) {
  const sqlite = new Database(":memory:");
  sqlite.exec("PRAGMA foreign_keys=ON");
  const statements = (name: string) => readFileSync(new URL(`../../../packages/db/migrations/${name}`, import.meta.url), "utf8")
    .split(/--> statement-breakpoint/).map(sql => sql.trim()).filter(sql => sql.replace(/--[^\r\n]*/g, "").trim());
  const migrate = (name: string) => { for (const sql of statements(name)) sqlite.exec(sql); };
  for (const name of ["0036_registry_foundation.sql", "0037_source_lifecycle_opt_out.sql", "0038_shadow_observations.sql"]) migrate(name);
  const transitionMigration = readFileSync(new URL("../../../packages/db/migrations/0039_canary_transition_plane.sql", import.meta.url), "utf8")
    .split("-- New identities begin dormant.");
  // The two additive columns precede historical reconstruction. All guards are
  // subsequently installed from the actual migration and retained for tests.
  sqlite.exec(transitionMigration[0]!);
  const base = await liveAdmissionFixture();
  // Keep captured instants slightly behind wall time so Windows/SQLite clock
  // resolution cannot turn a just-captured valid fixture into future evidence.
  const provider = { ...base.provider, evidenceCapturedAt: new Date(Date.now() - 1_000).toISOString() };
  const state = options.state ?? "canary";
  // Seed historical current state before 0039's dormant-insert gate. This tests
  // authority dependencies, not permission to perform a new source cutover.
  insert(sqlite, "provider_profiles", {
    id: provider.id, display_name: "Fixture provider", provider_family: provider.providerFamily, mechanism: provider.mechanism,
    auth_class: provider.authClass, endpoint_pattern: provider.endpointPattern, allowed_hosts: provider.allowedHosts,
    evidence_url: provider.evidenceUrl, evidence_hash: provider.evidenceHash, evidence_captured_at: provider.evidenceCapturedAt,
    visibility_filter: provider.visibilityFilter, content_scope: provider.contentScope, cadence_min_minutes: provider.cadenceMinMinutes,
    cadence_max_minutes: provider.cadenceMaxMinutes, rate_guidance: provider.rateGuidance, robots_handling: provider.robotsHandling,
    removal_semantics: provider.removalSemantics, evidence_lease_days: provider.evidenceLeaseDays,
    default_compliance_state: "needs_review", default_operational_state: "candidate",
  });
  insert(sqlite, "source_registry", {
    source_id: base.source.sourceId, provider_id: base.source.providerId, display_name: base.source.displayName,
    endpoint_url: base.source.endpointUrl, company_token: base.source.companyToken, discovery_provenance: base.source.discoveryProvenance,
    compliance_state: base.source.complianceState, operational_state: state, review_deadline: base.source.reviewDeadline,
    policy_expiry: base.source.policyExpiry, canary_max_new_items_per_tick: 2,
  });
  sqlite.exec("-- New identities begin dormant." + transitionMigration[1]!);
  for (const name of ["0040_current_evidence_admission.sql", "0041_publication_ledger.sql",
    "0042_d1_like_glob_limit.sql", "0043_canary_promotion_trigger_alignment.sql", "0044_canary_to_active_graduation.sql"]) migrate(name);
  const source: AdmissionSourceSnapshot = { ...base.source, operationalState: state, lastTransitionHash: null, canaryMaxNewItemsPerTick: 2,
    governanceRevision: (sqlite.query("SELECT governance_revision FROM source_registry WHERE source_id=?").get(base.source.sourceId) as any).governance_revision };
  const db = new AtomicDatabase(sqlite);
  const persist = async (reference = "authority-fixture-reviewed", expiresAt = source.policyExpiry!) => {
    const capturedAt = new Date(Date.now() - 100).toISOString();
    const built = await buildAdmissionEvidence({ source, provider,
      probe: { ...base.packet.probe, timestamp: capturedAt },
      primaryEvidence: [{ url: provider.evidenceUrl!, contentSha256: provider.evidenceHash!, capturedAt: provider.evidenceCapturedAt! }],
      authorityActions: options.publicAction === false ? ["recurrent_private_shadow"] : ["recurrent_private_shadow", "public_minimal_metadata_canary"],
      adjudicationRef: reference, capturedAt, expiresAt });
    if (!built.ok) throw new Error(built.reason);
    const result = await persistAdmissionEvidence(db, source, provider, built, capturedAt);
    if (!result.ok) throw new Error(result.reason);
    return result;
  };
  await persist("authority-fixture-reviewed", options.expiryMs ? new Date(Date.now() + options.expiryMs).toISOString() : source.policyExpiry!);
  sqlite.exec("CREATE TABLE private_authority_sentinel(id INTEGER PRIMARY KEY, value TEXT NOT NULL)");
  return { sqlite, db, source, provider, persist };
}

async function capture(db: LakeAuthorityDatabase, sourceId = "greenhouse:test") {
  const result = await captureLakePublicationAuthority(db, sourceId, new Date().toISOString());
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.reason);
  return result;
}
const sentinels = (sqlite: Database) => sqlite.query("SELECT * FROM private_authority_sentinel").all();
async function guardedWrite(db: AtomicDatabase, snapshot: LakePublicationAuthoritySnapshot) {
  return db.batch([
    db.prepare("INSERT INTO private_authority_sentinel(value) VALUES ('before-guard')"),
    prepareLakePublicationAuthorityGuard(db, snapshot),
    db.prepare("UPDATE private_authority_sentinel SET value='after-guard'"),
  ]);
}

test("captures verified registry identity separately from current authority without publication or mutations", async () => {
  const f = await fixture();
  try {
    const before = f.sqlite.serialize();
    const result = await capture(f.db);
    expect(result).toMatchObject({ publicationAuthorized: false, itemProofRequired: true, aggregateProofRequired: true });
    expect(result.snapshot.sourceIdentity).toEqual({ version: "lake-source-identity-v1", sourceId: f.source.sourceId,
      providerId: f.provider.id, providerFamily: f.provider.providerFamily, mechanism: f.provider.mechanism,
      endpointUrl: f.source.endpointUrl, companyToken: f.source.companyToken });
    expect(result.snapshot.sourceIdentityHash).toBe(await sha256Hex(JSON.stringify(result.snapshot.sourceIdentity)));
    expect(result.snapshot.cas).toMatchObject({ sourceGovernanceRevision: f.source.governanceRevision,
      providerGovernanceRevision: f.provider.governanceRevision, operationalState: "canary", canaryMaxNewItemsPerTick: 2 });
    expect(f.sqlite.serialize()).toEqual(before);
    await guardedWrite(f.db, result.snapshot);
    expect(sentinels(f.sqlite)).toEqual([{ id: 1, value: "after-guard" }]);
  } finally { f.sqlite.close(); }
});

test("active registry identity still requires current public-action evidence and all item/aggregate proof", async () => {
  const f = await fixture({ state: "active" });
  try {
    const result = await capture(f.db);
    expect(result.publicationAuthorized).toBe(false);
    expect(result.snapshot.cas.operationalState).toBe("active");
    await guardedWrite(f.db, result.snapshot);
    expect(sentinels(f.sqlite)).toHaveLength(1);
  } finally { f.sqlite.close(); }
});

test("does not turn recurring-private evidence or shadow state into public authority", async () => {
  for (const options of [{ publicAction: false }, { state: "shadow" as const }]) {
    const f = await fixture(options);
    try {
      expect(await captureLakePublicationAuthority(f.db, f.source.sourceId, new Date().toISOString())).toMatchObject({
        ok: false, code: "LAKE_AUTHORITY_REJECTED", publicationAuthorized: false });
      expect(sentinels(f.sqlite)).toEqual([]);
    } finally { f.sqlite.close(); }
  }
});

test("missing native batch and invalid evaluation time fail before authority access; no legacy fallback exists", async () => {
  let reads = 0;
  const missing = { prepare() { reads++; throw new Error("must not access"); } } as any;
  expect(await captureLakePublicationAuthority(missing, "greenhouse:test", new Date().toISOString())).toMatchObject({ ok: false, code: "LAKE_AUTHORITY_BINDING_UNAVAILABLE" });
  expect(reads).toBe(0);
  const f = await fixture();
  try {
    for (const sourceId of ["unattributed", "remotive", "greenhouse:missing"]) {
      expect((await captureLakePublicationAuthority(f.db, sourceId, new Date().toISOString())).ok).toBe(false);
    }
    for (const now of ["invalid", "2026-10-08", "2026-02-30T12:00:00.000Z"]) {
      expect((await captureLakePublicationAuthority(f.db, f.source.sourceId, now)).ok).toBe(false);
    }
  } finally { f.sqlite.close(); }
});

test("frozen issued snapshots reject caller cloning, forged identity and missing batch before private mutation", async () => {
  const f = await fixture();
  try {
    const { snapshot } = await capture(f.db);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.sourceIdentity)).toBe(true);
    expect(Object.isFrozen(snapshot.cas)).toBe(true);
    expect(() => { (snapshot.cas as any).policyExpiry = "2099-01-01T00:00:00.000Z"; }).toThrow();
    expect(isIssuedLakePublicationAuthoritySnapshot(snapshot)).toBe(true);
    for (const invalid of [null, undefined, 1, "snapshot", {}]) expect(isIssuedLakePublicationAuthoritySnapshot(invalid)).toBe(false);
    for (const forged of [JSON.parse(JSON.stringify(snapshot)), { ...snapshot }, { ...snapshot, sourceIdentityHash: "a".repeat(64) }]) {
      expect(isIssuedLakePublicationAuthoritySnapshot(forged)).toBe(false);
      expect(() => prepareLakePublicationAuthorityGuard(f.db, forged)).toThrow();
    }
    expect(() => prepareLakePublicationAuthorityGuard({ prepare: f.db.prepare.bind(f.db) } as any, snapshot)).toThrow();
    expect(sentinels(f.sqlite)).toEqual([]);
  } finally { f.sqlite.close(); }
});

test("identity survives evidence renewal while stale latest-packet CAS rolls back earlier private writes", async () => {
  const f = await fixture();
  try {
    const original = await capture(f.db);
    await f.persist("renewed-reviewed-evidence");
    const renewed = await capture(f.db);
    expect(renewed.snapshot.sourceIdentityHash).toBe(original.snapshot.sourceIdentityHash);
    expect(renewed.snapshot.cas.admissionEvidenceId).toBeGreaterThan(original.snapshot.cas.admissionEvidenceId);
    expect(renewed.snapshot.cas.admissionPacketSha256).not.toBe(original.snapshot.cas.admissionPacketSha256);
    await expect(guardedWrite(f.db, original.snapshot)).rejects.toThrow();
    expect(sentinels(f.sqlite)).toEqual([]);
    await guardedWrite(f.db, renewed.snapshot);
    expect(sentinels(f.sqlite)).toHaveLength(1);
  } finally { f.sqlite.close(); }
});

test("provider evidence renewal changes CAS revision while stable tenant identity stays unchanged", async () => {
  const f = await fixture();
  try {
    const original = await capture(f.db);
    f.provider.evidenceHash = "b".repeat(64);
    f.provider.evidenceCapturedAt = new Date(Date.now() - 250).toISOString();
    f.sqlite.query("UPDATE provider_profiles SET evidence_hash=?,evidence_captured_at=? WHERE id=?")
      .run(f.provider.evidenceHash, f.provider.evidenceCapturedAt, f.provider.id);
    f.provider.governanceRevision++;
    await f.persist("renewed-provider-evidence");
    const renewed = await capture(f.db);
    expect(renewed.snapshot.sourceIdentityHash).toBe(original.snapshot.sourceIdentityHash);
    expect(renewed.snapshot.cas.providerGovernanceRevision).toBe(original.snapshot.cas.providerGovernanceRevision + 1);
    await expect(guardedWrite(f.db, original.snapshot)).rejects.toThrow();
    expect(sentinels(f.sqlite)).toEqual([]);
  } finally { f.sqlite.close(); }
});

test("typed operational change invalidates CAS even without a source governance revision change", async () => {
  const f = await fixture();
  try {
    const original = await capture(f.db);
    const transition = await applyTypedTransition(f.db, { sourceId: f.source.sourceId,
      to: { compliance: "conditional", operational: "paused" }, cause: "emergency_pause", now: new Date().toISOString() });
    expect(transition.persisted).toBe(true);
    const changed = f.sqlite.query("SELECT governance_revision,operational_state,last_transition_hash FROM source_registry WHERE source_id=?")
      .get(f.source.sourceId) as any;
    expect(changed.last_transition_hash).not.toBe(original.snapshot.cas.lastTransitionHash);
    expect(changed.operational_state).toBe("paused");
    expect(changed.governance_revision)
      .toBe(original.snapshot.cas.sourceGovernanceRevision);
    await expect(guardedWrite(f.db, original.snapshot)).rejects.toThrow();
    expect(sentinels(f.sqlite)).toEqual([]);
  } finally { f.sqlite.close(); }
});

test("unbumped provider reassignment aborts rather than reusing the old tenant authority", async () => {
  const f = await fixture();
  try {
    const original = await capture(f.db);
    const alternate = f.sqlite.query("SELECT * FROM provider_profiles WHERE id=?").get(f.provider.id) as Record<string, unknown>;
    insert(f.sqlite, "provider_profiles", { ...alternate, id: "greenhouse-alternate" });
    f.sqlite.query("UPDATE source_registry SET provider_id=? WHERE source_id=?").run("greenhouse-alternate", f.source.sourceId);
    expect((f.sqlite.query("SELECT governance_revision FROM source_registry WHERE source_id=?").get(f.source.sourceId) as any).governance_revision)
      .toBe(original.snapshot.cas.sourceGovernanceRevision);
    await expect(guardedWrite(f.db, original.snapshot)).rejects.toThrow();
    expect(sentinels(f.sqlite)).toEqual([]);
    expect((await captureLakePublicationAuthority(f.db, f.source.sourceId, new Date().toISOString())).ok).toBe(false);
  } finally { f.sqlite.close(); }
});

test("deleted source identity makes the outer scalar guard throw and roll back the whole batch", async () => {
  const f = await fixture();
  try {
    const original = await capture(f.db);
    f.sqlite.query("DELETE FROM source_registry WHERE source_id=?").run(f.source.sourceId);
    expect(f.sqlite.query("SELECT COUNT(*) AS count FROM source_admission_evidence").get()).toEqual({ count: 1 });
    await expect(guardedWrite(f.db, original.snapshot)).rejects.toThrow();
    expect(sentinels(f.sqlite)).toEqual([]);
    expect((await captureLakePublicationAuthority(f.db, f.source.sourceId, new Date().toISOString())).ok).toBe(false);
  } finally { f.sqlite.close(); }
});

test("registry and durable opt-outs arriving after capture abort the whole native batch", async () => {
  for (const durable of [false, true]) {
    const f = await fixture();
    try {
      const original = await capture(f.db);
      if (durable) f.sqlite.query("INSERT INTO source_opt_outs(source_id,reason) VALUES (?,?)").run(f.source.sourceId, "fixture-opt-out");
      else f.sqlite.query("UPDATE source_registry SET opt_out=1 WHERE source_id=?").run(f.source.sourceId);
      await expect(guardedWrite(f.db, original.snapshot)).rejects.toThrow();
      expect(sentinels(f.sqlite)).toEqual([]);
      expect((await captureLakePublicationAuthority(f.db, f.source.sourceId, new Date().toISOString())).ok).toBe(false);
    } finally { f.sqlite.close(); }
  }
});

test("cap and exact endpoint/tenant changes after capture cannot be admitted by an old snapshot", async () => {
  for (const [sql, value] of [["canary_max_new_items_per_tick", 3], ["endpoint_url", "https://boards-api.greenhouse.io/v1/boards/other/jobs"],
    ["company_token", "other"]] as const) {
    const f = await fixture({ state: "active" });
    try {
      const original = await capture(f.db);
      f.sqlite.query(`UPDATE source_registry SET ${sql}=? WHERE source_id=?`).run(value, f.source.sourceId);
      await expect(guardedWrite(f.db, original.snapshot)).rejects.toThrow();
      expect(sentinels(f.sqlite)).toEqual([]);
    } finally { f.sqlite.close(); }
  }
});

test("D1 clock expiry between capture and execution aborts even when caller capture time is still supplied", async () => {
  const f = await fixture({ expiryMs: 500 });
  try {
    const original = await capture(f.db);
    await Bun.sleep(650);
    await expect(guardedWrite(f.db, original.snapshot)).rejects.toThrow();
    expect(sentinels(f.sqlite)).toEqual([]);
    expect((await captureLakePublicationAuthority(f.db, f.source.sourceId, new Date().toISOString())).ok).toBe(false);
  } finally { f.sqlite.close(); }
});
