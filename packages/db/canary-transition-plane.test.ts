import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { readFileSync } from "fs";
import { join } from "path";

const NOW = new Date().toISOString();
const FUTURE_LEASE = "2030-01-01T00:00:00.000Z";

function freshPreTransitionPlaneDb(): Database {
  const db = new Database(":memory:");
  db.exec("PRAGMA foreign_keys = ON;");
  for (const migration of [
    "0036_registry_foundation.sql",
    "0037_source_lifecycle_opt_out.sql",
    "0038_shadow_observations.sql",
  ]) {
    db.exec(readFileSync(join(import.meta.dir, "./migrations", migration), "utf-8"));
  }
  return db;
}

function freshDb(): Database {
  const db = freshPreTransitionPlaneDb();
  db.exec(readFileSync(join(import.meta.dir, "./migrations", "0039_canary_transition_plane.sql"), "utf-8"));
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

/** Mirrors SQLite `hex(input_json)` so valid fixture events are replayable. */
function canonicalFingerprint(value: string): string {
  return Array.from(new TextEncoder().encode(value), (byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

function insertCandidate(db: Database, values: {
  sourceId: string;
  cap?: number | null;
  policyExpiry?: string | null;
}): void {
  const sourceId = values.sourceId.includes("\0") ? "?" : sqlNullable(values.sourceId);
  const statement =
    `INSERT INTO source_registry (
      source_id, provider_id, display_name, endpoint_url, compliance_state,
      operational_state, policy_expiry, canary_max_new_items_per_tick
    ) VALUES (
      ${sourceId}, 'provider-1', 'Test source', 'https://example.com/jobs',
      'allowed', 'candidate', ${sqlNullable(values.policyExpiry ?? FUTURE_LEASE)}, ${sqlNullable(values.cap ?? null)}
    )`;
  if (sourceId === "?") db.query(statement).run(values.sourceId);
  else db.exec(statement);
}

function insertTransitionEvent(db: Database, values: {
  sourceId: string;
  fromOperational: "candidate" | "shadow" | "canary" | "active";
  toOperational: "shadow" | "canary" | "active" | "review_due" | "quarantined";
  cause: string;
  cap?: number | null;
  policyExpiry?: string | null;
  evidenceHash?: string | null;
  observedShadowCount?: number | null;
  requiredShadowCount?: number | null;
  proposedNewItems?: number | null;
  id?: number | string;
  inputHash?: string;
  decisionHash?: string;
  now?: string;
  version?: string;
  inputJsonOverride?: string;
}): string {
  const now = values.now ?? NOW;
  const version = values.version ?? "sp23-v1";
  const input = {
    version,
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
  const inputJson = values.inputJsonOverride ?? JSON.stringify(input);
  const inputHash = values.inputHash ?? canonicalFingerprint(inputJson);
  const decisionHash = values.decisionHash ?? inputHash;
  const sourceId = values.sourceId.includes("\0") ? "?" : sqlNullable(values.sourceId);
  const statement =
    `INSERT INTO source_transition_events (
      id, transition_plane_version, source_id,
      from_compliance, from_operational, to_compliance, to_operational,
      cause, decided_at, evidence_hash, input_json, input_hash, decision_hash
    ) VALUES (
      ${sqlNullable(values.id ?? null)}, '${version}', ${sourceId},
      'allowed', '${values.fromOperational}', 'allowed', '${values.toOperational}',
      '${values.cause}', '${now}', ${sqlNullable(values.evidenceHash ?? "evidence-sha")},
      '${inputJson.replaceAll("'", "''")}', '${inputHash}', '${decisionHash}'
    )`;
  if (sourceId === "?") db.query(statement).run(values.sourceId);
  else db.exec(statement);
  return decisionHash;
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
    expect(() => insertCandidate(db, { sourceId: "not a canonical source id" })).toThrow();
    expect(() => insertCandidate(db, { sourceId: `non${String.fromCharCode(160)}breaking-space` })).toThrow();
    expect(() => insertCandidate(db, { sourceId: "emoji-source-🙂" })).toThrow();
    expect(() => insertCandidate(db, { sourceId: "nul\0source" })).toThrow();
    expect(() => db.exec(
      `INSERT INTO source_registry (
        source_id, provider_id, display_name, endpoint_url, compliance_state,
        operational_state, policy_expiry, canary_max_new_items_per_tick
      ) VALUES (
        'unsafe-cap', 'provider-1', 'Unsafe cap', 'https://example.com/jobs', 'allowed',
        'candidate', '${FUTURE_LEASE}', 9007199254740993
      )`,
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
    expect(() => insertTransitionEvent(db, {
      sourceId: "valid",
      fromOperational: "canary",
      toOperational: "shadow",
      cause: "canary_cap_breach",
      cap: 2,
      proposedNewItems: null,
    })).toThrow();
    expect((db.query(
      `SELECT operational_state FROM source_registry WHERE source_id='valid'`,
    ).get() as { operational_state: string }).operational_state).toBe("canary");
    expect(() => db.exec(
      `UPDATE source_registry SET canary_max_new_items_per_tick=NULL WHERE source_id='valid'`,
    )).toThrow();
    expect(() => db.exec(
      `UPDATE source_registry SET operational_state='active', canary_max_new_items_per_tick=NULL WHERE source_id='valid'`,
    )).toThrow();
    expect(() => db.exec(
      `UPDATE source_registry SET canary_max_new_items_per_tick=999999 WHERE source_id='valid'`,
    )).toThrow();
    expect(() => db.exec(
      `UPDATE source_registry SET policy_expiry='2000-01-01T00:00:00.000Z' WHERE source_id='valid'`,
    )).toThrow();
    expect(() => db.exec(
      `UPDATE source_registry SET source_id='renamed-source' WHERE source_id='valid'`,
    )).toThrow();

    insertCandidate(db, { sourceId: "negative-event-id" });
    expect(() => insertTransitionEvent(db, {
      id: -1,
      sourceId: "negative-event-id",
      fromOperational: "candidate",
      toOperational: "shadow",
      cause: "requested_shadow_entry",
    })).toThrow();
    expect(() => insertTransitionEvent(db, {
      id: "9223372036854775807",
      sourceId: "negative-event-id",
      fromOperational: "candidate",
      toOperational: "shadow",
      cause: "requested_shadow_entry",
    })).toThrow();
    expect(() => insertTransitionEvent(db, {
      sourceId: "negative-event-id",
      fromOperational: "candidate",
      toOperational: "shadow",
      cause: "requested_shadow_entry",
    })).not.toThrow();
    expect((db.query(
      `SELECT operational_state FROM source_registry WHERE source_id='negative-event-id'`,
    ).get() as { operational_state: string }).operational_state).toBe("shadow");

    insertCandidate(db, { sourceId: "independent-compliance-axis" });
    expect(() => db.exec(
      `UPDATE source_registry SET compliance_state='needs_review' WHERE source_id='independent-compliance-axis'`,
    )).not.toThrow();
    expect((db.query(
      `SELECT compliance_state FROM source_registry WHERE source_id='independent-compliance-axis'`,
    ).get() as { compliance_state: string }).compliance_state).toBe("needs_review");
    expect(() => db.exec(
      `UPDATE source_registry SET operational_state='shadow' WHERE source_id='independent-compliance-axis'`,
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
    const rollbackFingerprint = insertTransitionEvent(db, {
      sourceId: "greenhouse:test",
      fromOperational: "canary",
      toOperational: "shadow",
      cause: "canary_cap_breach",
      cap: 3,
      proposedNewItems: 4,
    });

    const event = db.query(
      `SELECT source_id, cause, decision_hash FROM source_transition_events WHERE decision_hash='${rollbackFingerprint}'`,
    ).get() as { source_id: string; cause: string; decision_hash: string };
    expect(event).toEqual({
      source_id: "greenhouse:test",
      cause: "canary_cap_breach",
      decision_hash: rollbackFingerprint,
    });
    expect((db.query(
      `SELECT operational_state FROM source_registry WHERE source_id='greenhouse:test'`,
    ).get() as { operational_state: string }).operational_state).toBe("shadow");
    expect(() => db.exec(
      `UPDATE source_transition_events SET cause='invalid_canary_cap' WHERE decision_hash='${rollbackFingerprint}'`,
    )).toThrow();
    expect(() => db.exec(
      `DELETE FROM source_transition_events WHERE decision_hash='${rollbackFingerprint}'`,
    )).toThrow();

    const rollbackRow = db.query(
      `SELECT id FROM source_transition_events WHERE decision_hash='${rollbackFingerprint}'`,
    ).get() as { id: number };
    const replacementInput = JSON.stringify({
      version: "sp23-v1",
      sourceId: "greenhouse:test",
      fromCompliance: "allowed",
      fromOperational: "shadow",
      toCompliance: "allowed",
      toOperational: "quarantined",
      optOut: false,
      cause: "health_quarantine",
      now: NOW,
      policyExpiry: FUTURE_LEASE,
      evidenceHash: "replacement-health-evidence",
      observedShadowCount: 3,
      requiredShadowCount: 3,
      canaryMaxNewItemsPerTick: 3,
      proposedNewItems: null,
    });
    const replacementFingerprint = canonicalFingerprint(replacementInput);
    expect(() => db.exec(
      `INSERT OR REPLACE INTO source_transition_events (
        id, transition_plane_version, source_id,
        from_compliance, from_operational, to_compliance, to_operational,
        cause, decided_at, evidence_hash, input_json, input_hash, decision_hash
      ) VALUES (
        ${rollbackRow.id}, 'sp23-v1', 'greenhouse:test',
        'allowed', 'shadow', 'allowed', 'quarantined',
        'health_quarantine', '${NOW}', 'replacement-health-evidence',
        '${replacementInput.replaceAll("'", "''")}', '${replacementFingerprint}', '${replacementFingerprint}'
      )`,
    )).toThrow();
    expect((db.query(
      `SELECT COUNT(*) AS count FROM source_transition_events WHERE decision_hash='${rollbackFingerprint}'`,
    ).get() as { count: number }).count).toBe(1);
    expect((db.query(
      `SELECT operational_state FROM source_registry WHERE source_id='greenhouse:test'`,
    ).get() as { operational_state: string }).operational_state).toBe("shadow");
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

  test("rejects JavaScript-whitespace-only evidence and legacy embedded-NUL identities", () => {
    const db = freshDb();
    insertProvider(db);
    for (const [sourceId, evidenceHash] of [
      ["tab-only-evidence", "\t"],
      ["nbsp-only-evidence", String.fromCharCode(160)],
    ]) {
      insertCandidate(db, { sourceId });
      expect(() => insertTransitionEvent(db, {
        sourceId,
        fromOperational: "candidate",
        toOperational: "shadow",
        cause: "requested_shadow_entry",
        evidenceHash,
      })).toThrow();
      expect((db.query(
        `SELECT operational_state FROM source_registry WHERE source_id='${sourceId}'`,
      ).get() as { operational_state: string }).operational_state).toBe("candidate");
      expect((db.query(
        `SELECT COUNT(*) AS count FROM source_transition_events WHERE source_id='${sourceId}'`,
      ).get() as { count: number }).count).toBe(0);
    }

    // SQLite JSON can preserve malformed UTF-8 TEXT bytes even though a JS
    // driver later decodes them as U+FFFD. Exercise the raw binding path so an
    // event can never be accepted with a fingerprint the replayer cannot see.
    const invalidUtf8SourceId = "invalid-utf8-evidence";
    insertCandidate(db, { sourceId: invalidUtf8SourceId });
    const invalidUtf8 = Buffer.from([0xff]);
    expect(() => db.query(`
      WITH packet AS (
        SELECT
          json_object(
            'version', 'sp23-v1',
            'sourceId', '${invalidUtf8SourceId}',
            'fromCompliance', 'allowed',
            'fromOperational', 'candidate',
            'toCompliance', 'allowed',
            'toOperational', 'shadow',
            'optOut', json('false'),
            'cause', 'requested_shadow_entry',
            'now', '${NOW}',
            'policyExpiry', '${FUTURE_LEASE}',
            'evidenceHash', CAST(? AS TEXT),
            'observedShadowCount', 3,
            'requiredShadowCount', 3,
            'canaryMaxNewItemsPerTick', NULL,
            'proposedNewItems', NULL
          ) AS input_json,
          CAST(? AS TEXT) AS evidence_hash
      )
      INSERT INTO source_transition_events (
        transition_plane_version, source_id,
        from_compliance, from_operational, to_compliance, to_operational,
        cause, decided_at, evidence_hash, input_json, input_hash, decision_hash
      )
      SELECT 'sp23-v1', '${invalidUtf8SourceId}',
             'allowed', 'candidate', 'allowed', 'shadow',
             'requested_shadow_entry', '${NOW}', evidence_hash,
             input_json, hex(input_json), hex(input_json)
      FROM packet
    `).run(invalidUtf8, invalidUtf8)).toThrow();
    expect((db.query(
      `SELECT operational_state FROM source_registry WHERE source_id='${invalidUtf8SourceId}'`,
    ).get() as { operational_state: string }).operational_state).toBe("candidate");
    db.close();

    const legacy = freshPreTransitionPlaneDb();
    insertProvider(legacy);
    const nulSourceId = "legacy\0source";
    legacy.query(
      `INSERT INTO source_registry (
        source_id, provider_id, display_name, endpoint_url, compliance_state,
        operational_state, policy_expiry
      ) VALUES (?, 'provider-1', 'Legacy NUL source', 'https://example.com/jobs', 'allowed', 'candidate', '${FUTURE_LEASE}')`,
    ).run(nulSourceId);
    legacy.exec(readFileSync(
      join(import.meta.dir, "./migrations", "0039_canary_transition_plane.sql"),
      "utf-8",
    ));
    expect(() => insertTransitionEvent(legacy, {
      sourceId: nulSourceId,
      fromOperational: "candidate",
      toOperational: "shadow",
      cause: "requested_shadow_entry",
    })).toThrow();
    expect((legacy.query(
      `SELECT operational_state FROM source_registry WHERE source_id = ?`,
    ).get(nulSourceId) as { operational_state: string }).operational_state).toBe("candidate");
    legacy.close();
  });

  test("requires lease-dependent events to be valid at both D1 time and their canonical packet time", () => {
    const db = freshDb();
    insertProvider(db);
    const baseTime = Date.now();
    const leaseBeforePacket = new Date(baseTime + 120_000).toISOString();
    const packetAfterLease = new Date(baseTime + 240_000).toISOString();

    insertCandidate(db, {
      sourceId: "packet-time-promotion",
      policyExpiry: leaseBeforePacket,
    });
    expect(() => insertTransitionEvent(db, {
      sourceId: "packet-time-promotion",
      fromOperational: "candidate",
      toOperational: "shadow",
      cause: "requested_shadow_entry",
      policyExpiry: leaseBeforePacket,
      now: packetAfterLease,
    })).toThrow();
    expect((db.query(
      `SELECT operational_state FROM source_registry WHERE source_id='packet-time-promotion'`,
    ).get() as { operational_state: string }).operational_state).toBe("candidate");

    insertCandidate(db, { sourceId: "packet-time-review" });
    promoteCandidateToShadow(db, "packet-time-review", null);
    const leaseAfterPacket = new Date(baseTime - 120_000).toISOString();
    const packetBeforeLease = new Date(baseTime - 240_000).toISOString();
    db.exec(
      `UPDATE source_registry SET policy_expiry='${leaseAfterPacket}' WHERE source_id='packet-time-review'`,
    );
    expect(() => insertTransitionEvent(db, {
      sourceId: "packet-time-review",
      fromOperational: "shadow",
      toOperational: "review_due",
      cause: "policy_expiry_review",
      policyExpiry: leaseAfterPacket,
      now: packetBeforeLease,
    })).toThrow();
    expect((db.query(
      `SELECT operational_state FROM source_registry WHERE source_id='packet-time-review'`,
    ).get() as { operational_state: string }).operational_state).toBe("shadow");
    db.close();

    const legacyCanary = freshPreTransitionPlaneDb();
    insertProvider(legacyCanary);
    const legacyLease = new Date(baseTime - 120_000).toISOString();
    legacyCanary.exec(`INSERT INTO source_registry (
      source_id, provider_id, display_name, endpoint_url, compliance_state,
      operational_state, policy_expiry
    ) VALUES (
      'packet-time-rollback', 'provider-1', 'Legacy canary', 'https://example.com/jobs', 'allowed',
      'canary', '${legacyLease}'
    )`);
    legacyCanary.exec(readFileSync(
      join(import.meta.dir, "./migrations", "0039_canary_transition_plane.sql"),
      "utf-8",
    ));
    expect(() => insertTransitionEvent(legacyCanary, {
      sourceId: "packet-time-rollback",
      fromOperational: "canary",
      toOperational: "shadow",
      cause: "evidence_lease_expired",
      policyExpiry: legacyLease,
      now: packetBeforeLease,
    })).toThrow();
    expect((legacyCanary.query(
      `SELECT operational_state FROM source_registry WHERE source_id='packet-time-rollback'`,
    ).get() as { operational_state: string }).operational_state).toBe("canary");
    legacyCanary.close();
  });

  test("rejects a legacy timezone-less lease before it can produce an unreplayable promotion", () => {
    const db = freshPreTransitionPlaneDb();
    insertProvider(db);
    const timezoneLessLease = new Date(Date.now() + 120_000)
      .toISOString()
      .replace("T", " ")
      .replace("Z", "");
    db.exec(`INSERT INTO source_registry (
      source_id, provider_id, display_name, endpoint_url, compliance_state,
      operational_state, policy_expiry
    ) VALUES (
      'timezone-less-lease', 'provider-1', 'Legacy lease', 'https://example.com/jobs', 'allowed',
      'candidate', '${timezoneLessLease}'
    )`);
    db.exec(readFileSync(
      join(import.meta.dir, "./migrations", "0039_canary_transition_plane.sql"),
      "utf-8",
    ));

    expect(() => insertTransitionEvent(db, {
      sourceId: "timezone-less-lease",
      fromOperational: "candidate",
      toOperational: "shadow",
      cause: "requested_shadow_entry",
      policyExpiry: timezoneLessLease,
    })).toThrow();
    expect((db.query(
      `SELECT COUNT(*) AS count FROM source_transition_events WHERE source_id='timezone-less-lease'`,
    ).get() as { count: number }).count).toBe(0);
    db.close();
  });

  test("rejects a legacy null-cap breach packet before it can produce an unreplayable rollback", () => {
    const db = freshPreTransitionPlaneDb();
    insertProvider(db);
    db.exec(`INSERT INTO source_registry (
      source_id, provider_id, display_name, endpoint_url, compliance_state,
      operational_state, policy_expiry
    ) VALUES (
      'legacy-null-cap', 'provider-1', 'Legacy canary', 'https://example.com/jobs', 'allowed',
      'canary', '${FUTURE_LEASE}'
    )`);
    db.exec(readFileSync(
      join(import.meta.dir, "./migrations", "0039_canary_transition_plane.sql"),
      "utf-8",
    ));

    expect(() => insertTransitionEvent(db, {
      sourceId: "legacy-null-cap",
      fromOperational: "canary",
      toOperational: "shadow",
      cause: "canary_cap_breach",
      cap: null,
      proposedNewItems: null,
    })).toThrow();
    expect((db.query(
      `SELECT operational_state FROM source_registry WHERE source_id='legacy-null-cap'`,
    ).get() as { operational_state: string }).operational_state).toBe("canary");
    db.close();
  });

  test("rejects SQLite-only 24:00 UTC leases before they can produce an unreplayable promotion", () => {
    const db = freshPreTransitionPlaneDb();
    insertProvider(db);
    const sqliteOnlyLease = "2030-01-01T24:00:00.000Z";
    db.exec(`INSERT INTO source_registry (
      source_id, provider_id, display_name, endpoint_url, compliance_state,
      operational_state, policy_expiry
    ) VALUES (
      'twenty-four-hour-lease', 'provider-1', 'Legacy lease', 'https://example.com/jobs', 'allowed',
      'candidate', '${sqliteOnlyLease}'
    )`);
    db.exec(readFileSync(
      join(import.meta.dir, "./migrations", "0039_canary_transition_plane.sql"),
      "utf-8",
    ));

    expect(() => insertTransitionEvent(db, {
      sourceId: "twenty-four-hour-lease",
      fromOperational: "candidate",
      toOperational: "shadow",
      cause: "requested_shadow_entry",
      policyExpiry: sqliteOnlyLease,
    })).toThrow();
    expect((db.query(
      `SELECT COUNT(*) AS count FROM source_transition_events WHERE source_id='twenty-four-hour-lease'`,
    ).get() as { count: number }).count).toBe(0);
    db.close();

    const fresh = freshDb();
    insertProvider(fresh);
    expect(() => insertCandidate(fresh, {
      sourceId: "new-twenty-four-hour-lease",
      policyExpiry: sqliteOnlyLease,
    })).toThrow();
    fresh.close();
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

    const shortExpiredLease = new Date(Date.now() - 60_000).toISOString();
    const backdatedBeforeExpiry = new Date(Date.now() - 120_000).toISOString();
    insertCandidate(db, {
      sourceId: "backdated-expired-lease",
      policyExpiry: shortExpiredLease,
    });
    expect(() => insertTransitionEvent(db, {
      sourceId: "backdated-expired-lease",
      fromOperational: "candidate",
      toOperational: "shadow",
      cause: "requested_shadow_entry",
      policyExpiry: shortExpiredLease,
      now: backdatedBeforeExpiry,
    })).toThrow();
    expect((db.query(
      `SELECT operational_state FROM source_registry WHERE source_id='backdated-expired-lease'`,
    ).get() as { operational_state: string }).operational_state).toBe("candidate");

    insertCandidate(db, { sourceId: "forged-fingerprint" });
    expect(() => insertTransitionEvent(db, {
      sourceId: "forged-fingerprint",
      fromOperational: "candidate",
      toOperational: "shadow",
      cause: "requested_shadow_entry",
      inputHash: "definitely-not-a-canonical-fingerprint",
      decisionHash: "definitely-not-a-canonical-fingerprint",
    })).toThrow();
    expect((db.query(
      `SELECT operational_state FROM source_registry WHERE source_id='forged-fingerprint'`,
    ).get() as { operational_state: string }).operational_state).toBe("candidate");

    insertCandidate(db, { sourceId: "unsafe-event-number" });
    const oversizedUnusedNumberPacket = JSON.stringify({
      version: "sp23-v1",
      sourceId: "unsafe-event-number",
      fromCompliance: "allowed",
      fromOperational: "candidate",
      toCompliance: "allowed",
      toOperational: "shadow",
      optOut: false,
      cause: "requested_shadow_entry",
      now: NOW,
      policyExpiry: FUTURE_LEASE,
      evidenceHash: "evidence-sha",
      observedShadowCount: 3,
      requiredShadowCount: 3,
      canaryMaxNewItemsPerTick: null,
      proposedNewItems: null,
    }).replace('"observedShadowCount":3', '"observedShadowCount":9007199254740993');
    expect(() => insertTransitionEvent(db, {
      sourceId: "unsafe-event-number",
      fromOperational: "candidate",
      toOperational: "shadow",
      cause: "requested_shadow_entry",
      inputJsonOverride: oversizedUnusedNumberPacket,
    })).toThrow();
    expect((db.query(
      `SELECT operational_state FROM source_registry WHERE source_id='unsafe-event-number'`,
    ).get() as { operational_state: string }).operational_state).toBe("candidate");

    insertCandidate(db, { sourceId: "noncanonical-packet" });
    const reorderedPacket = JSON.stringify({
      sourceId: "noncanonical-packet",
      version: "sp23-v1",
      fromCompliance: "allowed",
      fromOperational: "candidate",
      toCompliance: "allowed",
      toOperational: "shadow",
      optOut: false,
      cause: "requested_shadow_entry",
      now: NOW,
      policyExpiry: FUTURE_LEASE,
      evidenceHash: "evidence-sha",
      observedShadowCount: 3,
      requiredShadowCount: 3,
      canaryMaxNewItemsPerTick: null,
      proposedNewItems: null,
      ignoredExtra: "must-not-be-stored",
    });
    expect(() => insertTransitionEvent(db, {
      sourceId: "noncanonical-packet",
      fromOperational: "candidate",
      toOperational: "shadow",
      cause: "requested_shadow_entry",
      inputJsonOverride: reorderedPacket,
    })).toThrow();
    expect((db.query(
      `SELECT operational_state FROM source_registry WHERE source_id='noncanonical-packet'`,
    ).get() as { operational_state: string }).operational_state).toBe("candidate");

    insertCandidate(db, { sourceId: "unsupported-version" });
    expect(() => insertTransitionEvent(db, {
      sourceId: "unsupported-version",
      fromOperational: "candidate",
      toOperational: "shadow",
      cause: "requested_shadow_entry",
      version: "other-v1",
    })).toThrow();
    expect((db.query(
      `SELECT operational_state FROM source_registry WHERE source_id='unsupported-version'`,
    ).get() as { operational_state: string }).operational_state).toBe("candidate");

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

    insertCandidate(db, { sourceId: "premature-policy-expiry" });
    promoteCandidateToShadow(db, "premature-policy-expiry", null);
    expect(() => insertTransitionEvent(db, {
      sourceId: "premature-policy-expiry",
      fromOperational: "shadow",
      toOperational: "review_due",
      cause: "policy_expiry_review",
    })).toThrow();
    expect((db.query(
      `SELECT operational_state FROM source_registry WHERE source_id='premature-policy-expiry'`,
    ).get() as { operational_state: string }).operational_state).toBe("shadow");

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
    const originalPromotionFingerprint = insertTransitionEvent(db, {
      sourceId: "old-hash-replay",
      fromOperational: "shadow",
      toOperational: "canary",
      cause: "requested_promotion",
      cap: 2,
    });
    insertTransitionEvent(db, {
      sourceId: "old-hash-replay",
      fromOperational: "canary",
      toOperational: "shadow",
      cause: "canary_cap_breach",
      cap: 2,
      proposedNewItems: 3,
    });
    expect(() => db.exec(
      `UPDATE source_registry
       SET operational_state='canary', last_transition_hash='${originalPromotionFingerprint}'
       WHERE source_id='old-hash-replay'`,
    )).toThrow();
    expect((db.query(
      `SELECT operational_state FROM source_registry WHERE source_id='old-hash-replay'`,
    ).get() as { operational_state: string }).operational_state).toBe("shadow");
    expect(() => db.exec(
      `INSERT INTO source_transition_apply_permits (source_id, decision_hash)
       VALUES ('old-hash-replay', '${originalPromotionFingerprint}')`,
    )).toThrow();

    insertCandidate(db, { sourceId: "historical-identity", cap: 2 });
    promoteCandidateToShadow(db, "historical-identity", 2);
    db.exec(`DELETE FROM source_registry WHERE source_id='historical-identity'`);
    expect(() => insertCandidate(db, { sourceId: "historical-identity", cap: 2 })).toThrow();
    expect((db.query(
      `SELECT COUNT(*) AS count FROM source_transition_events WHERE source_id='historical-identity'`,
    ).get() as { count: number }).count).toBe(1);
    db.close();
  });
});
