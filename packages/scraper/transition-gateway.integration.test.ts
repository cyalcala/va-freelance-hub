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
    'old-token', '{}', '00', '00')`)).toThrow(/sp23-v2|current evidence|canonical replay/i);

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
