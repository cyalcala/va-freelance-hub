import { expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { readFileSync } from "fs";
import { join } from "path";
import {
  applyTypedTransition,
  type TransitionGatewayDatabase,
  type TransitionGatewayRunResult,
  type TransitionGatewayStatement,
} from "./transition-gateway";
import { persistAdmissionEvidence, type AdmissionDatabase } from "./admission-evidence";
import { liveAdmissionFixture } from "./test-fixtures/admission";
import { replayTransitionEvent, type TransitionEvent } from "./transition-plane";

class BunStatement implements TransitionGatewayStatement {
  private values: unknown[] = [];

  constructor(private readonly db: Database, private readonly query: string) {}

  bind(...values: unknown[]): TransitionGatewayStatement {
    this.values = values;
    return this;
  }

  async first<T>(): Promise<T | null> {
    return (this.db.query(this.query).get(...this.values) as T | null) ?? null;
  }

  async run(): Promise<TransitionGatewayRunResult> {
    this.db.query(this.query).run(...this.values);
    return { success: true, meta: { last_row_id: Number(this.db.query("SELECT last_insert_rowid() AS id").get()?.id) } };
  }
}

class BunGatewayDatabase implements TransitionGatewayDatabase {
  constructor(private readonly db: Database) {}
  prepare(query: string): TransitionGatewayStatement {
    return new BunStatement(this.db, query);
  }
}

function freshDb(): Database {
  const db = new Database(":memory:");
  db.exec("PRAGMA foreign_keys = ON;");
  for (const migration of [
    "0036_registry_foundation.sql",
    "0037_source_lifecycle_opt_out.sql",
    "0038_shadow_observations.sql",
    "0039_canary_transition_plane.sql",
    "0040_current_evidence_admission.sql",
    "0041_publication_ledger.sql",
    "0042_d1_like_glob_limit.sql",
    "0043_canary_promotion_trigger_alignment.sql",
  ]) {
    db.exec(readFileSync(join(import.meta.dir, "../db/migrations", migration), "utf-8"));
  }
  return db;
}

function seedSource(db: Database, fixture: Awaited<ReturnType<typeof liveAdmissionFixture>>): void {
  const { source, provider } = fixture;
  db.query(`INSERT INTO provider_profiles (
    id, display_name, provider_family, mechanism, auth_class, endpoint_pattern, allowed_hosts,
    evidence_url, evidence_hash, evidence_captured_at, visibility_filter, content_scope,
    cadence_min_minutes, cadence_max_minutes, rate_guidance, robots_handling, removal_semantics,
    evidence_lease_days, default_compliance_state, default_operational_state
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'allowed', 'candidate')`).run(
    provider.id, provider.id, provider.providerFamily, provider.mechanism, provider.authClass,
    provider.endpointPattern, provider.allowedHosts, provider.evidenceUrl, provider.evidenceHash,
    provider.evidenceCapturedAt, provider.visibilityFilter, provider.contentScope,
    provider.cadenceMinMinutes, provider.cadenceMaxMinutes, provider.rateGuidance,
    provider.robotsHandling, provider.removalSemantics, provider.evidenceLeaseDays,
  );
  db.query(`INSERT INTO source_registry (
    source_id, provider_id, display_name, endpoint_url, company_token, discovery_provenance,
    compliance_state, operational_state, review_deadline, policy_expiry, canary_max_new_items_per_tick
  ) VALUES (?, ?, ?, ?, ?, ?, ?, 'candidate', ?, ?, ?)`).run(
    source.sourceId, source.providerId, source.displayName, source.endpointUrl, source.companyToken,
    source.discoveryProvenance, source.complianceState, source.reviewDeadline, source.policyExpiry,
    source.canaryMaxNewItemsPerTick,
  );
}

test("SP-23B gateway persists evidenced shadow entry and rejects v1 or under-observed canary promotion", async () => {
  const db = freshDb();
  const gateway = new BunGatewayDatabase(db);
  const fixture = await liveAdmissionFixture();
  seedSource(db, fixture);
  const now = new Date().toISOString();
  const persisted = await persistAdmissionEvidence(gateway as unknown as AdmissionDatabase, fixture.source, fixture.provider, {
    packet: fixture.packet, packetJson: fixture.evidence.packetJson, packetSha256: fixture.evidence.packetSha256,
  }, now);
  if (!persisted.ok) throw new Error(persisted.reason);

  const shadow = await applyTypedTransition(gateway, {
    sourceId: fixture.source.sourceId,
    to: { compliance: fixture.source.complianceState, operational: "shadow" },
    cause: "requested_shadow_entry",
    now: new Date().toISOString(),
    evidenceHash: "ignored-caller-token",
  });
  expect(shadow.persisted).toBe(true);
  expect((db.query(
    `SELECT operational_state, last_transition_hash FROM source_registry WHERE source_id=?`,
  ).get(fixture.source.sourceId) as { operational_state: string; last_transition_hash: string }).operational_state).toBe("shadow");

  expect(() => db.exec(`INSERT INTO source_transition_events (
    transition_plane_version, source_id, from_compliance, from_operational, to_compliance, to_operational,
    cause, decided_at, evidence_hash, input_json, input_hash, decision_hash
  ) VALUES ('sp23-v1', '${fixture.source.sourceId}', '${fixture.source.complianceState}', 'shadow',
    '${fixture.source.complianceState}', 'canary', 'requested_promotion', '${new Date().toISOString()}',
    'old-token', '{}', '00', '00')`)).toThrow(/sp23-v2|current evidence|canonical replay|canary promotion requires/i);

  const canary = await applyTypedTransition(gateway, {
    sourceId: fixture.source.sourceId,
    to: { compliance: fixture.source.complianceState, operational: "canary" },
    cause: "requested_promotion",
    now: new Date().toISOString(),
    requiredShadowCount: 1,
  });
  expect(canary.persisted).toBe(false);

  const pause = await applyTypedTransition(gateway, {
    sourceId: fixture.source.sourceId,
    to: { compliance: fixture.source.complianceState, operational: "paused" },
    cause: "emergency_pause",
    now: new Date().toISOString(),
  });
  expect(pause.persisted).toBe(true);
  expect((db.query(
    `SELECT operational_state FROM source_registry WHERE source_id=?`,
  ).get(fixture.source.sourceId) as { operational_state: string }).operational_state).toBe("paused");

  const stored = db.query(
    `SELECT source_id, from_compliance, from_operational, to_compliance, to_operational,
            cause, decided_at, evidence_hash, input_json, input_hash, decision_hash
     FROM source_transition_events WHERE cause='requested_shadow_entry' LIMIT 1`,
  ).get() as {
    source_id: string;
    from_compliance: TransitionEvent["fromCompliance"];
    from_operational: TransitionEvent["fromOperational"];
    to_compliance: TransitionEvent["toCompliance"];
    to_operational: TransitionEvent["toOperational"];
    cause: TransitionEvent["cause"];
    decided_at: string;
    evidence_hash: string | null;
    input_json: string;
    input_hash: string;
    decision_hash: string;
  };
  const rehydrated: TransitionEvent = {
    sourceId: stored.source_id,
    fromCompliance: stored.from_compliance,
    fromOperational: stored.from_operational,
    toCompliance: stored.to_compliance,
    toOperational: stored.to_operational,
    cause: stored.cause,
    decidedAt: stored.decided_at,
    evidenceHash: stored.evidence_hash,
    input: JSON.parse(stored.input_json),
    inputJson: stored.input_json,
    inputHash: stored.input_hash,
    decisionHash: stored.decision_hash,
  };
  expect(replayTransitionEvent(rehydrated)).toEqual({ ok: true, reason: "replay matches" });
  expect(rehydrated.input.version).toBe("sp23-v2");
  expect(JSON.parse(stored.input_json).admission.qualifyingObservationIds).toEqual([]);
  db.close();
});

test("migration 0043 backfill and canary promotion with 8 distinct qualifying shadow days", async () => {
  const db = new Database(":memory:");
  db.exec("PRAGMA foreign_keys = ON;");
  for (const migration of [
    "0036_registry_foundation.sql",
    "0037_source_lifecycle_opt_out.sql",
    "0038_shadow_observations.sql",
    "0039_canary_transition_plane.sql",
    "0040_current_evidence_admission.sql",
    "0041_publication_ledger.sql",
    "0042_d1_like_glob_limit.sql",
  ]) {
    db.exec(readFileSync(join(import.meta.dir, "../db/migrations", migration), "utf-8"));
  }

  const gateway = new BunGatewayDatabase(db);
  const fixture = await liveAdmissionFixture();
  const nowMs = Date.now();
  const pastDate = (daysAgo: number, hourOffset = 0) => new Date(nowMs - daysAgo * 86_400_000 + hourOffset * 3600_000).toISOString();
  const tenDaysAgo = pastDate(10, 0);
  const evidenceExpiresAt = new Date(Date.parse(tenDaysAgo) + 20 * 86_400_000).toISOString();

  const source = { ...fixture.source, policyExpiry: evidenceExpiresAt, operationalState: "candidate" as const, canaryMaxNewItemsPerTick: null };
  const provider = { ...fixture.provider, evidenceCapturedAt: tenDaysAgo };

  db.query(`INSERT INTO provider_profiles (
    id, display_name, provider_family, mechanism, auth_class, endpoint_pattern, allowed_hosts,
    evidence_url, evidence_hash, evidence_captured_at, visibility_filter, content_scope,
    cadence_min_minutes, cadence_max_minutes, rate_guidance, robots_handling, removal_semantics,
    evidence_lease_days, default_compliance_state, default_operational_state
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'allowed', 'candidate')`).run(
    provider.id, provider.id, provider.providerFamily, provider.mechanism, provider.authClass,
    provider.endpointPattern, provider.allowedHosts, provider.evidenceUrl, provider.evidenceHash,
    tenDaysAgo, provider.visibilityFilter, provider.contentScope,
    provider.cadenceMinMinutes, provider.cadenceMaxMinutes, provider.rateGuidance,
    provider.robotsHandling, provider.removalSemantics, provider.evidenceLeaseDays,
  );
  db.query(`INSERT INTO source_registry (
    source_id, provider_id, display_name, endpoint_url, company_token, discovery_provenance,
    compliance_state, operational_state, review_deadline, policy_expiry, canary_max_new_items_per_tick
  ) VALUES (?, ?, ?, ?, ?, ?, ?, 'candidate', ?, ?, NULL)`).run(
    source.sourceId, source.providerId, source.displayName, source.endpointUrl, source.companyToken,
    source.discoveryProvenance, source.complianceState, source.reviewDeadline, evidenceExpiresAt,
  );

  // Apply migration 0043 to test backfill
  db.exec(readFileSync(join(import.meta.dir, "../db/migrations/0043_canary_promotion_trigger_alignment.sql"), "utf-8"));

  const backfilledSource = db.query("SELECT canary_max_new_items_per_tick, governance_revision FROM source_registry WHERE source_id=?").get(source.sourceId) as any;
  expect(backfilledSource.canary_max_new_items_per_tick).toBe(2);
  expect(backfilledSource.governance_revision).toBe(1);

  const { buildAdmissionEvidence } = await import("./admission-evidence");
  const { sha256Hex } = await import("./contentHash");
  const built = await buildAdmissionEvidence({
    source: { ...source, canaryMaxNewItemsPerTick: 2 },
    provider,
    probe: { ...fixture.packet.probe, timestamp: tenDaysAgo },
    primaryEvidence: [{ url: provider.evidenceUrl!, contentSha256: provider.evidenceHash!, capturedAt: tenDaysAgo }],
    authorityActions: ["recurrent_private_shadow", "public_minimal_metadata_canary"],
    adjudicationRef: "fixture-adjudication",
    capturedAt: tenDaysAgo,
    expiresAt: evidenceExpiresAt,
  });
  if (!built.ok) throw new Error(built.reason);

  db.exec("DROP TRIGGER IF EXISTS source_admission_evidence_validate_insert;");
  const persisted = await persistAdmissionEvidence(gateway as unknown as AdmissionDatabase, { ...source, canaryMaxNewItemsPerTick: 2 }, provider, {
    packet: built.packet, packetJson: built.packetJson, packetSha256: built.packetSha256,
  }, tenDaysAgo);
  if (!persisted.ok) throw new Error(persisted.reason);
  db.exec(readFileSync(join(import.meta.dir, "../db/migrations/0042_d1_like_glob_limit.sql"), "utf-8"));
  db.exec(readFileSync(join(import.meta.dir, "../db/migrations/0043_canary_promotion_trigger_alignment.sql"), "utf-8"));

  // Shadow entry transition at 10 days ago
  db.exec("DROP TRIGGER IF EXISTS source_transition_events_validate_insert;");
  const shadow = await applyTypedTransition(gateway, {
    sourceId: source.sourceId,
    to: { compliance: source.complianceState, operational: "shadow" },
    cause: "requested_shadow_entry",
    now: tenDaysAgo,
  });
  expect(shadow.persisted).toBe(true);
  db.exec(readFileSync(join(import.meta.dir, "../db/migrations/0043_canary_promotion_trigger_alignment.sql"), "utf-8"));

  const updatedSource = db.query("SELECT * FROM source_registry WHERE source_id=?").get(source.sourceId) as any;
  expect(updatedSource.operational_state).toBe("shadow");

  // Insert 8 distinct calendar days of healthy shadow observations
  db.exec("DROP TRIGGER IF EXISTS source_shadow_observations_admission_insert;");
  for (let day = 8; day >= 1; day--) {
    const obsTime = pastDate(day, 2);
    const dispatchKey = `dispatch-day-${day}`;
    const probe = {
      ...fixture.packet.probe,
      timestamp: obsTime,
      admissionBinding: {
        evidenceId: 1,
        shadowEntryHash: updatedSource.last_transition_hash,
        dispatchKey,
      },
    };
    const resultJson = JSON.stringify(probe);
    const hash = await sha256Hex(resultJson);
    db.query(`
      INSERT INTO source_shadow_observations (
        id, source_id, provider_id, observed_at, outcome, plausible_items, request_count, bytes_received,
        item_count, evidence_hash, result_json, admission_evidence_id, shadow_entry_hash, dispatch_key, dispatcher_version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '1.0.0')
    `).run(
      10 - day, source.sourceId, provider.id, obsTime, "HEALTHY_WITH_RESULTS", 1, 2,
      100, 1, hash, resultJson, 1,
      updatedSource.last_transition_hash, dispatchKey
    );
  }

  // Verify qualifying observations view sees all 8 days
  const qualCount = (db.query("SELECT COUNT(*) as c FROM source_admission_qualifying_observations WHERE source_id=?").get(source.sourceId) as any).c;
  expect(qualCount).toBe(8);

  // Now promote to canary using applyTypedTransition
  const evalNow = new Date().toISOString();
  const canary = await applyTypedTransition(gateway, {
    sourceId: source.sourceId,
    to: { compliance: source.complianceState, operational: "canary" },
    cause: "requested_promotion",
    now: evalNow,
  });

  expect(canary.persisted).toBe(true);
  expect(canary.decision.ok).toBe(true);

  const finalSource = db.query("SELECT operational_state, governance_revision, canary_max_new_items_per_tick FROM source_registry WHERE source_id=?").get(source.sourceId) as any;
  expect(finalSource.operational_state).toBe("canary");
  expect(finalSource.governance_revision).toBe(1);
  expect(finalSource.canary_max_new_items_per_tick).toBe(2);

  db.close();
});

