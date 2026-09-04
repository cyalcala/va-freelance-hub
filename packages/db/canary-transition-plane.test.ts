import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { readFileSync } from "fs";
import { join } from "path";

const NOW = "2026-09-05T00:00:00.000Z";
const FUTURE_LEASE = "2030-01-01T00:00:00.000Z";

function freshDb(): Database {
  const db = new Database(":memory:");
  db.exec("PRAGMA foreign_keys = ON;");
  for (const migration of [
    "0036_registry_foundation.sql",
    "0037_source_lifecycle_opt_out.sql",
    "0038_shadow_observations.sql",
    "0039_canary_transition_plane.sql",
  ]) {
    db.exec(readFileSync(join(import.meta.dir, "./migrations", migration), "utf-8"));
  }
  return db;
}

function insertProvider(db: Database, id = "provider-1"): void {
  db.exec(
    `INSERT INTO provider_profiles (id, display_name, provider_family, mechanism, auth_class, evidence_lease_days, default_compliance_state, default_operational_state)
     VALUES ('${id}', '${id}', '${id}-family', 'rss_feed', 'none', 180, 'allowed', 'active')`,
  );
}

function sqlNullable(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "NULL";
  return typeof value === "number" ? String(value) : `'${value.replaceAll("'", "''")}'`;
}

function insertCandidate(db: Database, values: {
  sourceId: string;
  cap?: number | null;
  policyExpiry?: string | null;
}): void {
  db.exec(
    `INSERT INTO source_registry (
      source_id, provider_id, display_name, endpoint_url, compliance_state,
      operational_state, policy_expiry, canary_max_new_items_per_tick
    ) VALUES (
      '${values.sourceId}', 'provider-1', 'Test source', 'https://example.com/jobs',
      'allowed', 'candidate', ${sqlNullable(values.policyExpiry ?? FUTURE_LEASE)}, ${sqlNullable(values.cap ?? null)}
    )`,
  );
}

function insertTransitionEvent(db: Database, values: {
  sourceId: string;
  fromOperational: "candidate" | "shadow" | "canary" | "active";
  toOperational: "shadow" | "canary" | "active" | "quarantined";
  cause: string;
  cap?: number | null;
  policyExpiry?: string | null;
  evidenceHash?: string | null;
  observedShadowCount?: number | null;
  requiredShadowCount?: number | null;
  proposedNewItems?: number | null;
  decisionHash?: string;
  now?: string;
}): void {
  const now = values.now ?? NOW;
  const input = {
    version: "sp23-v1",
    sourceId: values.sourceId,
    fromCompliance: "allowed",
    fromOperational: values.fromOperational,
    toCompliance: "allowed",
    toOperational: values.toOperational,
    optOut: false,
    cause: values.cause,
    now,
    policyExpiry: values.policyExpiry ?? FUTURE_LEASE,
    evidenceHash: values.evidenceHash ?? "evidence-sha",
    observedShadowCount: values.observedShadowCount ?? 3,
    requiredShadowCount: values.requiredShadowCount ?? 3,
    canaryMaxNewItemsPerTick: values.cap ?? null,
    proposedNewItems: values.proposedNewItems ?? null,
  };
  const inputJson = JSON.stringify(input);
  const decisionHash = values.decisionHash ?? `${values.sourceId}-${values.fromOperational}-${values.toOperational}-${values.cause}`;
  db.exec(
    `INSERT INTO source_transition_events (
      transition_plane_version, source_id,
      from_compliance, from_operational, to_compliance, to_operational,
      cause, decided_at, evidence_hash, input_json, input_hash, decision_hash
    ) VALUES (
      'sp23-v1', '${values.sourceId}',
      'allowed', '${values.fromOperational}', 'allowed', '${values.toOperational}',
      '${values.cause}', '${now}', ${sqlNullable(values.evidenceHash ?? "evidence-sha")},
      '${inputJson.replaceAll("'", "''")}', 'input-${decisionHash}', '${decisionHash}'
    )`,
  );
}

function promoteCandidateToShadow(db: Database, sourceId: string, cap: number | null): void {
  insertTransitionEvent(db, {
    sourceId,
    fromOperational: "candidate",
    toOperational: "shadow",
    cause: "requested_shadow_entry",
    cap,
  });
}

function insertQualifyingShadowObservations(db: Database, sourceId: string, count = 3): void {
  for (let index = 0; index < count; index += 1) {
    db.exec(
      `INSERT INTO source_shadow_observations (
        source_id, provider_id, dispatcher_version, outcome, evidence_hash, result_json
      ) VALUES (
        '${sourceId}', 'provider-1', 'sp22-v1', 'HEALTHY_WITH_RESULTS', 'observation-${index}', '{}'
      )`,
    );
  }
}

describe("SP-23 source_registry canary constraint", () => {
  test("new sources start dormant; only a typed event may enter a capped canary", () => {
    const db = freshDb();
    insertProvider(db);

    expect(() => db.exec(
      `INSERT INTO source_registry (source_id, provider_id, display_name, endpoint_url, compliance_state, operational_state)
       VALUES ('direct-canary', 'provider-1', 'Direct', 'https://example.com', 'allowed', 'canary')`,
    )).toThrow();

    insertCandidate(db, { sourceId: "no-cap", cap: null });
    promoteCandidateToShadow(db, "no-cap", null);
    expect(() => insertTransitionEvent(db, {
      sourceId: "no-cap",
      fromOperational: "shadow",
      toOperational: "canary",
      cause: "requested_promotion",
      cap: null,
    })).toThrow();

    insertCandidate(db, { sourceId: "valid", cap: 2 });
    expect(() => db.exec(
      `UPDATE source_registry SET operational_state='canary' WHERE source_id='valid'`,
    )).toThrow();
    promoteCandidateToShadow(db, "valid", 2);
    insertQualifyingShadowObservations(db, "valid");
    expect(() => insertTransitionEvent(db, {
      sourceId: "valid",
      fromOperational: "shadow",
      toOperational: "canary",
      cause: "requested_promotion",
      cap: 2,
    })).not.toThrow();

    const row = db.query(
      `SELECT operational_state, canary_max_new_items_per_tick FROM source_registry WHERE source_id='valid'`,
    ).get() as { operational_state: string; canary_max_new_items_per_tick: number };
    expect(row).toEqual({ operational_state: "canary", canary_max_new_items_per_tick: 2 });
    expect(() => db.exec(
      `UPDATE source_registry SET canary_max_new_items_per_tick=NULL WHERE source_id='valid'`,
    )).toThrow();
    expect(() => db.exec(
      `UPDATE source_registry SET operational_state='active', canary_max_new_items_per_tick=NULL WHERE source_id='valid'`,
    )).toThrow();
    db.close();
  });
});

describe("SP-23 source_transition_events", () => {
  test("records a canonical rollback exactly once, updates source state atomically, and rejects mutation", () => {
    const db = freshDb();
    insertProvider(db);
    insertCandidate(db, { sourceId: "greenhouse:test", cap: 3 });
    promoteCandidateToShadow(db, "greenhouse:test", 3);
    insertQualifyingShadowObservations(db, "greenhouse:test");
    insertTransitionEvent(db, {
      sourceId: "greenhouse:test",
      fromOperational: "shadow",
      toOperational: "canary",
      cause: "requested_promotion",
      cap: 3,
    });
    insertTransitionEvent(db, {
      sourceId: "greenhouse:test",
      fromOperational: "canary",
      toOperational: "shadow",
      cause: "canary_cap_breach",
      cap: 3,
      proposedNewItems: 4,
      decisionHash: "rollback-decision-hash",
    });

    const event = db.query(
      `SELECT source_id, cause, decision_hash FROM source_transition_events WHERE decision_hash='rollback-decision-hash'`,
    ).get() as { source_id: string; cause: string; decision_hash: string };
    expect(event).toEqual({
      source_id: "greenhouse:test",
      cause: "canary_cap_breach",
      decision_hash: "rollback-decision-hash",
    });
    expect((db.query(
      `SELECT operational_state FROM source_registry WHERE source_id='greenhouse:test'`,
    ).get() as { operational_state: string }).operational_state).toBe("shadow");
    expect(() => db.exec(
      `UPDATE source_transition_events SET cause='invalid_canary_cap' WHERE decision_hash='rollback-decision-hash'`,
    )).toThrow();
    expect(() => db.exec(
      `DELETE FROM source_transition_events WHERE decision_hash='rollback-decision-hash'`,
    )).toThrow();
    db.close();
  });

  test("rejects stale or malformed event inputs", () => {
    const db = freshDb();
    insertProvider(db);
    insertCandidate(db, { sourceId: "stale", cap: 2 });

    expect(() => insertTransitionEvent(db, {
      sourceId: "stale",
      fromOperational: "shadow",
      toOperational: "canary",
      cause: "requested_promotion",
      cap: 2,
    })).toThrow();
    expect(() => db.exec(
      `INSERT INTO source_transition_events (
        transition_plane_version, source_id,
        from_compliance, from_operational, to_compliance, to_operational,
        cause, decided_at, input_json, input_hash, decision_hash
      ) VALUES (
        'sp23-v1', 'stale',
        'allowed', 'candidate', 'allowed', 'shadow',
        'manual_magic', '${NOW}', '{}', 'input', 'bad-cause'
      )`,
    )).toThrow();
    expect(() => db.exec(
      `INSERT INTO source_transition_events (
        transition_plane_version, source_id,
        from_compliance, from_operational, to_compliance, to_operational,
        cause, decided_at, input_json, input_hash, decision_hash
      ) VALUES (
        'sp23-v1', 'stale',
        'allowed', 'candidate', 'allowed', 'shadow',
        'requested_shadow_entry', '${NOW}', 'not json', 'input', 'bad-json'
      )`,
    )).toThrow();
    db.close();
  });

  test("fails closed for invalid event timestamps, graph-invalid quarantine, and an old-hash raw replay", () => {
    const db = freshDb();
    insertProvider(db);

    insertCandidate(db, { sourceId: "invalid-timestamp", cap: 2 });
    promoteCandidateToShadow(db, "invalid-timestamp", 2);
    expect(() => insertTransitionEvent(db, {
      sourceId: "invalid-timestamp",
      fromOperational: "shadow",
      toOperational: "canary",
      cause: "requested_promotion",
      cap: 2,
      now: "not-a-date",
    })).toThrow();
    expect((db.query(
      `SELECT operational_state FROM source_registry WHERE source_id='invalid-timestamp'`,
    ).get() as { operational_state: string }).operational_state).toBe("shadow");

    insertCandidate(db, { sourceId: "invalid-quarantine" });
    expect(() => insertTransitionEvent(db, {
      sourceId: "invalid-quarantine",
      fromOperational: "candidate",
      toOperational: "quarantined",
      cause: "health_quarantine",
    })).toThrow();
    expect((db.query(
      `SELECT operational_state FROM source_registry WHERE source_id='invalid-quarantine'`,
    ).get() as { operational_state: string }).operational_state).toBe("candidate");

    insertCandidate(db, { sourceId: "self-declared-observations", cap: 2 });
    promoteCandidateToShadow(db, "self-declared-observations", 2);
    expect(() => insertTransitionEvent(db, {
      sourceId: "self-declared-observations",
      fromOperational: "shadow",
      toOperational: "canary",
      cause: "requested_promotion",
      cap: 2,
      observedShadowCount: 3,
      requiredShadowCount: 3,
    })).toThrow();
    expect((db.query(
      `SELECT operational_state FROM source_registry WHERE source_id='self-declared-observations'`,
    ).get() as { operational_state: string }).operational_state).toBe("shadow");

    insertCandidate(db, { sourceId: "old-hash-replay", cap: 2 });
    promoteCandidateToShadow(db, "old-hash-replay", 2);
    insertQualifyingShadowObservations(db, "old-hash-replay");
    insertTransitionEvent(db, {
      sourceId: "old-hash-replay",
      fromOperational: "shadow",
      toOperational: "canary",
      cause: "requested_promotion",
      cap: 2,
      decisionHash: "original-promotion-hash",
    });
    insertTransitionEvent(db, {
      sourceId: "old-hash-replay",
      fromOperational: "canary",
      toOperational: "shadow",
      cause: "canary_cap_breach",
      cap: 2,
      proposedNewItems: 3,
      decisionHash: "latest-rollback-hash",
    });
    expect(() => db.exec(
      `UPDATE source_registry
       SET operational_state='canary', last_transition_hash='original-promotion-hash'
       WHERE source_id='old-hash-replay'`,
    )).toThrow();
    expect((db.query(
      `SELECT operational_state FROM source_registry WHERE source_id='old-hash-replay'`,
    ).get() as { operational_state: string }).operational_state).toBe("shadow");
    expect((db.query(
      `SELECT COUNT(*) AS count FROM source_transition_apply_permits`,
    ).get() as { count: number }).count).toBe(0);
    db.close();
  });
});
