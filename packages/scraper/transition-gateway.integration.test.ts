import { expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { readFileSync } from "fs";
import { join } from "path";
import {
  applyTypedTransition,
  type TransitionGatewayDatabase,
  type TransitionGatewayStatement,
} from "./transition-gateway";

const NOW = "2026-09-05T00:00:00.000Z";

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

  async run(): Promise<unknown> {
    return this.db.query(this.query).run(...this.values);
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
  db.close();
});
