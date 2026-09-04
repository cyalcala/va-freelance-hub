/**
 * SP-23 — capability-limited persistence gateway for typed transitions.
 *
 * This module is intentionally not imported by the live scrape route. When a
 * future control surface is approved, it receives this narrow interface rather
 * than general SQL authority: it may read the source snapshot and append one
 * canonical transition event. Migration 0039's AFTER INSERT trigger applies
 * the matching registry state change atomically, while its BEFORE INSERT guard
 * rejects a stale snapshot/event pair.
 */

import {
  decideTypedTransition,
  type LifecycleState,
  type TransitionCause,
  type TypedTransitionDecision,
} from "./transition-plane";

export interface TransitionGatewayStatement {
  bind(...values: unknown[]): TransitionGatewayStatement;
  first<T>(): Promise<T | null>;
  run(): Promise<unknown>;
}

/** Structural subset of a Cloudflare D1 binding; no arbitrary execute API. */
export interface TransitionGatewayDatabase {
  prepare(query: string): TransitionGatewayStatement;
}

interface RegistryTransitionSnapshot {
  source_id: string;
  compliance_state: LifecycleState["compliance"];
  operational_state: LifecycleState["operational"];
  opt_out: number | boolean;
  policy_expiry: string | null;
  canary_max_new_items_per_tick: number | null;
}

interface ShadowCountRow {
  qualifying_count: number | string;
}

export interface ApplyTypedTransitionRequest {
  sourceId: string;
  to: LifecycleState;
  cause: TransitionCause;
  /** Must come from a trusted server/worker clock, never model output. */
  now: string;
  evidenceHash?: string | null;
  requiredShadowCount?: number | null;
  proposedNewItems?: number | null;
}

type GatewayRejection = { ok: false; reason: string };

export type ApplyTypedTransitionResult =
  | {
      persisted: true;
      decision: Extract<TypedTransitionDecision, { ok: true }>;
    }
  | {
      persisted: false;
      decision: Exclude<TypedTransitionDecision, { ok: true }> | GatewayRejection;
    };

const LOAD_REGISTRY_SNAPSHOT_SQL = `
  SELECT source_id, compliance_state, operational_state, opt_out,
         policy_expiry, canary_max_new_items_per_tick
  FROM source_registry
  WHERE source_id = ?
`;

const LOAD_DURABLE_OPT_OUT_SQL = `
  SELECT source_id FROM source_opt_outs WHERE source_id = ? LIMIT 1
`;

const LOAD_QUALIFYING_SHADOW_COUNT_SQL = `
  SELECT COUNT(*) AS qualifying_count
  FROM source_shadow_observations
  WHERE source_id = ?
    AND outcome IN ('HEALTHY_WITH_RESULTS', 'HEALTHY_EMPTY')
`;

const INSERT_TRANSITION_EVENT_SQL = `
  INSERT INTO source_transition_events (
    transition_plane_version, source_id,
    from_compliance, from_operational, to_compliance, to_operational,
    cause, decided_at, evidence_hash, input_json, input_hash, decision_hash
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

/**
 * Re-read current state and durable opt-out memory before deciding, then write
 * exactly one event. The 0039 trigger applies the state change in the same SQL
 * statement, so this module never performs independent event/state writes.
 */
export async function applyTypedTransition(
  db: TransitionGatewayDatabase,
  request: ApplyTypedTransitionRequest,
): Promise<ApplyTypedTransitionResult> {
  const current = await db
    .prepare(LOAD_REGISTRY_SNAPSHOT_SQL)
    .bind(request.sourceId)
    .first<RegistryTransitionSnapshot>();

  if (!current) {
    return {
      persisted: false,
      decision: { ok: false, reason: `source ${request.sourceId} is not present in source_registry` },
    };
  }

  const durableOptOut = await db
    .prepare(LOAD_DURABLE_OPT_OUT_SQL)
    .bind(request.sourceId)
    .first<{ source_id: string }>();

  let observedShadowCount: number | null = null;
  if (request.to.operational === "canary") {
    const count = await db
      .prepare(LOAD_QUALIFYING_SHADOW_COUNT_SQL)
      .bind(request.sourceId)
      .first<ShadowCountRow>();
    observedShadowCount = Number(count?.qualifying_count ?? 0);
  }

  const decision = decideTypedTransition({
    sourceId: request.sourceId,
    from: {
      compliance: current.compliance_state,
      operational: current.operational_state,
    },
    to: request.to,
    optOut: Boolean(current.opt_out) || Boolean(durableOptOut),
    cause: request.cause,
    now: request.now,
    policyExpiry: current.policy_expiry,
    evidenceHash: request.evidenceHash ?? null,
    observedShadowCount,
    requiredShadowCount: request.requiredShadowCount ?? null,
    canaryMaxNewItemsPerTick: current.canary_max_new_items_per_tick,
    proposedNewItems: request.proposedNewItems ?? null,
  });

  if (!decision.ok) return { persisted: false, decision };

  const event = decision.event;
  try {
    await db
      .prepare(INSERT_TRANSITION_EVENT_SQL)
      .bind(
        event.input.version,
        event.sourceId,
        event.fromCompliance,
        event.fromOperational,
        event.toCompliance,
        event.toOperational,
        event.cause,
        event.decidedAt,
        event.evidenceHash,
        event.inputJson,
        event.inputHash,
        event.decisionHash,
      )
      .run();
  } catch {
    // A source can change after the read above. The migration rejects that
    // stale event atomically; surface it as a normal failed decision so a
    // caller can re-read/retry rather than treating the race as an exception.
    return {
      persisted: false,
      decision: {
        ok: false,
        reason: "transition persistence was rejected by the current source-state guard",
      },
    };
  }

  return { persisted: true, decision };
}
