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
import { replayTransitionEvent, type TransitionEvent } from "./transition-plane";

const NOW = new Date().toISOString();

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
    return { success: true };
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
  ]) {
    db.exec(readFileSync(join(import.meta.dir, "../db/migrations", migration), "utf-8"));
  }
  db.exec(`INSERT INTO provider_profiles (id, display_name, provider_family, mechanism, auth_class, evidence_lease_days, default_compliance_state, default_operational_state)
    VALUES ('greenhouse', 'Greenhouse', 'greenhouse', 'ats_api', 'none', 180, 'allowed', 'candidate')`);
  db.exec(`INSERT INTO source_registry (
    source_id, provider_id, display_name, endpoint_url, compliance_state,
    operational_state, policy_expiry, canary_max_new_items_per_tick
  ) VALUES (
    'greenhouse:grafanalabs', 'greenhouse', 'Grafana Labs', 'https://boards.greenhouse.io/grafanalabs', 'allowed',
    'candidate', '2030-01-01T00:00:00.000Z', 3
  )`);
  return db;
}

test("SP-23 gateway persists event-backed shadow, canary, and automatic cap rollback transitions atomically", async () => {
  const db = freshDb();
  const gateway = new BunGatewayDatabase(db);

  const shadow = await applyTypedTransition(gateway, {
    sourceId: "greenhouse:grafanalabs",
    to: { compliance: "allowed", operational: "shadow" },
    cause: "requested_shadow_entry",
    now: NOW,
    evidenceHash: "evidence-shadow-entry",
  });
  expect(shadow.persisted).toBe(true);

  for (let i = 0; i < 3; i += 1) {
    db.exec(`INSERT INTO source_shadow_observations (
      source_id, provider_id, dispatcher_version, outcome, evidence_hash, result_json
    ) VALUES (
      'greenhouse:grafanalabs', 'greenhouse', 'sp22-v1', 'HEALTHY_WITH_RESULTS', 'observation-${i}', '{}'
    )`);
  }

  const canary = await applyTypedTransition(gateway, {
    sourceId: "greenhouse:grafanalabs",
    to: { compliance: "allowed", operational: "canary" },
    cause: "requested_promotion",
    now: NOW,
    evidenceHash: "evidence-shadow-promotion",
    requiredShadowCount: 3,
  });
  expect(canary.persisted).toBe(true);

  // The durable opt-out ledger may update before a legacy registry cache bit.
  // An automatic canary exit must still persist with optOut=true in its
  // canonical replay packet, rather than leaving the source in canary.
  db.exec(`INSERT INTO source_opt_outs (source_id, provider_id, reason)
    VALUES ('greenhouse:grafanalabs', 'greenhouse', 'test durable opt-out')`);

  const rollback = await applyTypedTransition(gateway, {
    sourceId: "greenhouse:grafanalabs",
    to: { compliance: "allowed", operational: "shadow" },
    cause: "canary_cap_breach",
    now: NOW,
    evidenceHash: "evidence-cap-breach",
    proposedNewItems: 4,
  });
  expect(rollback).toMatchObject({ persisted: true, decision: { ok: true, cause: "canary_cap_breach" } });
  expect((db.query(
    `SELECT operational_state FROM source_registry WHERE source_id='greenhouse:grafanalabs'`,
  ).get() as { operational_state: string }).operational_state).toBe("shadow");
  expect((db.query(
      `SELECT COUNT(*) AS count FROM source_transition_events WHERE source_id='greenhouse:grafanalabs'`,
  ).get() as { count: number }).count).toBe(3);
  const stored = db.query(
    `SELECT source_id, from_compliance, from_operational, to_compliance, to_operational,
            cause, decided_at, evidence_hash, input_json, input_hash, decision_hash
     FROM source_transition_events
     WHERE source_id='greenhouse:grafanalabs'
     ORDER BY id DESC LIMIT 1`,
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
  expect(rehydrated.input.optOut).toBe(true);
  db.close();
});
