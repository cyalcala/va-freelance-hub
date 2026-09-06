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
import {
  ADMISSION_POLICY,
  loadCurrentAdmissionEvidence,
  validateAdmissionProbe,
  isAdmissionInstant,
  type CurrentAdmissionEvidenceResult,
} from "./admission-evidence";
import { sha256Hex } from "./contentHash";

export interface TransitionGatewayStatement {
  bind(...values: unknown[]): TransitionGatewayStatement;
  first<T>(): Promise<T | null>;
  run(): Promise<TransitionGatewayRunResult>;
}

/** Minimal D1 write result used to fail closed on a resolved unsuccessful run. */
export interface TransitionGatewayRunResult {
  success: boolean;
  meta?: {
    changes?: number;
    rows_written?: number;
    last_row_id?: number;
  };
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

export interface ApplyTypedTransitionRequest {
  sourceId: string;
  to: LifecycleState;
  cause: TransitionCause;
  /** Must come from a trusted server/worker clock, never model output. */
  now: string;
  evidenceHash?: string | null;
  /** Historical compatibility only. Current admissions ignore this caller value. */
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

const LOAD_CURRENT_OBSERVATIONS_SQL = `
  SELECT json_group_array(json_object(
    'id', id, 'sourceId', source_id, 'providerId', provider_id,
    'observedAt', observed_at, 'outcome', outcome, 'plausibleItems', plausible_items,
    'requestCount', request_count, 'bytesReceived', bytes_received, 'itemCount', item_count,
    'evidenceHash', evidence_hash, 'resultJson', result_json,
    'admissionEvidenceId', admission_evidence_id, 'shadowEntryHash', shadow_entry_hash,
    'dispatchKey', dispatch_key
  )) AS observations_json
  FROM (
    SELECT * FROM source_shadow_observations
    WHERE source_id = ? AND admission_evidence_id = ? AND shadow_entry_hash = ?
      AND observed_at >= ? AND observed_at >= ? AND observed_at <= ?
    ORDER BY observed_at, id LIMIT 513
  )
`;

export interface AdmissionObservation {
  id: number;
  sourceId: string;
  providerId: string;
  observedAt: string;
  outcome: string;
  plausibleItems: number;
  requestCount: number;
  bytesReceived: number;
  itemCount: number;
  evidenceHash: string;
  resultJson: string;
  admissionEvidenceId: number;
  shadowEntryHash: string;
  dispatchKey: string;
}

/** Replays the fixed current-window observation contract from immutable raw records. */
export async function qualifyAdmissionObservations(
  current: Extract<CurrentAdmissionEvidenceResult, { ok: true }>,
  observations: AdmissionObservation[],
  now: string,
): Promise<{ ok: true; ids: number[] } | GatewayRejection> {
  if (!isAdmissionInstant(now) || !current.source.lastTransitionHash || !Array.isArray(observations) || observations.length > 512) {
    return { ok: false, reason: "current observation epoch or bounded observation window is unavailable" };
  }
  const cutoff = new Date(Date.parse(now) - ADMISSION_POLICY.lookbackMs).toISOString();
  const eligible = observations.filter((row) => isAdmissionInstant(row.observedAt)
    && row.observedAt >= cutoff && row.observedAt >= current.evidence.capturedAt && row.observedAt <= now);
  if (eligible.some((row) => row.sourceId !== current.source.sourceId || row.providerId !== current.provider.id
    || row.admissionEvidenceId !== current.evidence.id || row.shadowEntryHash !== current.source.lastTransitionHash
    || !Number.isSafeInteger(row.id) || row.id <= 0 || typeof row.dispatchKey !== "string" || row.dispatchKey.length === 0)
    || new Set(eligible.map((row) => row.id)).size !== eligible.length
    || new Set(eligible.map((row) => row.dispatchKey)).size !== eligible.length) {
    return { ok: false, reason: "observation identities, revisions, or distinct dispatch references are invalid" };
  }
  const healthy = eligible.filter((row) => ["HEALTHY_WITH_RESULTS", "HEALTHY_EMPTY"].includes(row.outcome));
  const perDay = new Map<string, AdmissionObservation>();
  for (const row of healthy) {
    const day = row.observedAt.slice(0, 10);
    const prior = perDay.get(day);
    if (!prior || row.id < prior.id) perDay.set(day, row);
  }
  const selected = [...perDay.values()].sort((a, b) => a.observedAt.localeCompare(b.observedAt) || a.id - b.id);
  const first = selected[0];
  const last = selected[selected.length - 1];
  if (!first || !last || selected.length < ADMISSION_POLICY.minimumDays
    || Date.parse(last.observedAt) - Date.parse(first.observedAt) < ADMISSION_POLICY.minimumSpanMs
    || Date.parse(now) - Date.parse(last.observedAt) > ADMISSION_POLICY.maximumLatestAgeMs
    || !selected.some((row) => Number.isSafeInteger(row.plausibleItems) && row.plausibleItems > 0)) {
    return { ok: false, reason: "insufficient distinct current shadow days, span, freshness, or plausible results" };
  }
  if (eligible.some((row) => row.observedAt >= first.observedAt && !["HEALTHY_WITH_RESULTS", "HEALTHY_EMPTY"].includes(row.outcome))) {
    return { ok: false, reason: "a disqualifying observation follows the start of the current qualifying window" };
  }
  for (const row of selected) {
    try {
      if (typeof row.resultJson !== "string" || row.resultJson.length > 128 * 1024
        || !/^[a-f0-9]{64}$/.test(row.evidenceHash) || await sha256Hex(row.resultJson) !== row.evidenceHash) {
        return { ok: false, reason: "observation raw evidence digest is invalid" };
      }
      const probe = JSON.parse(row.resultJson);
      const binding = probe.admissionBinding;
      if (binding?.evidenceId !== current.evidence.id || binding?.shadowEntryHash !== current.source.lastTransitionHash
        || binding?.dispatchKey !== row.dispatchKey || probe.timestamp !== row.observedAt
        || probe.diagnostic?.outcome !== row.outcome || probe.sampleFunnel?.plausibleItems !== row.plausibleItems
        || probe.diagnostic?.requestCount !== row.requestCount || probe.diagnostic?.bytesReceived !== row.bytesReceived
        || probe.parse?.itemCount !== row.itemCount) {
        return { ok: false, reason: "observation columns do not match their bound raw probe facts" };
      }
      const validation = validateAdmissionProbe(probe, current.source, current.provider, now);
      if (!validation.ok) return validation;
    } catch { return { ok: false, reason: "observation raw evidence could not be validated" }; }
  }
  return { ok: true, ids: selected.map((row) => row.id) };
}

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
  let requiredShadowCount: number | null = null;
  let evidenceHash = request.evidenceHash ?? null;
  let admission: import("./transition-plane").TransitionAdmissionContext | undefined;
  if (current.operational_state === "canary" && request.to.operational === "active") {
    return { persisted: false, decision: { ok: false, reason: "active promotion is unavailable until the shared publication and exposure gate exists" } };
  }
  const isAdmission = (current.operational_state === "candidate" && request.to.operational === "shadow")
    || (current.operational_state === "shadow" && request.to.operational === "canary");
  if (isAdmission) {
    const verified = await loadCurrentAdmissionEvidence(db, request.sourceId, request.now);
    if (!verified.ok) return { persisted: false, decision: verified };
    if (verified.source.operationalState !== current.operational_state || verified.source.complianceState !== current.compliance_state) {
      return { persisted: false, decision: { ok: false, reason: "source state changed while loading current admission evidence" } };
    }
    let qualifyingObservationIds: number[] = [];
    if (request.to.operational === "canary") {
      if (!verified.packet.authorityActions.includes("public_minimal_metadata_canary")) {
        return { persisted: false, decision: { ok: false, reason: "current adjudication does not cover minimal-metadata canary exposure" } };
      }
      try {
        const raw = await db.prepare(LOAD_CURRENT_OBSERVATIONS_SQL).bind(
          request.sourceId, verified.evidence.id, verified.source.lastTransitionHash,
          verified.evidence.capturedAt, new Date(Date.parse(request.now) - ADMISSION_POLICY.lookbackMs).toISOString(), request.now,
        ).first<{ observations_json: string }>();
        const qualification = await qualifyAdmissionObservations(verified, JSON.parse(raw?.observations_json ?? "[]"), request.now);
        if (!qualification.ok) return { persisted: false, decision: qualification };
        qualifyingObservationIds = qualification.ids;
      } catch { return { persisted: false, decision: { ok: false, reason: "current shadow observation evidence is unavailable" } }; }
      requiredShadowCount = ADMISSION_POLICY.minimumDays;
      observedShadowCount = qualifyingObservationIds.length;
    }
    evidenceHash = verified.evidence.packetSha256;
    admission = {
      admissionEvidenceId: verified.evidence.id,
      sourceGovernanceRevision: verified.source.governanceRevision,
      providerGovernanceRevision: verified.provider.governanceRevision,
      observationPolicyVersion: ADMISSION_POLICY.version,
      shadowEntryHash: request.to.operational === "canary" ? verified.source.lastTransitionHash : null,
      qualifyingObservationIds,
    };
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
    evidenceHash,
    observedShadowCount,
    requiredShadowCount,
    canaryMaxNewItemsPerTick: current.canary_max_new_items_per_tick,
    proposedNewItems: request.proposedNewItems ?? null,
    admission,
  });

  if (!decision.ok) return { persisted: false, decision };

  const event = decision.event;
  try {
    const write = await db
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
    if (!write.success) {
      return {
        persisted: false,
        decision: {
          ok: false,
          reason: "transition persistence returned an unsuccessful D1 write result",
        },
      };
    }
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
