/**
 * SSAE-07 — Exclusive Processing Modes and Cache Validity
 *
 * Pure TypeScript module. No network fetches, no database writes, no production
 * mutations, no parameter or schema change. The module adds the missing
 * invalidation *behaviour* described in
 * docs/plans/SPARSE_SOURCE_ATTENTION_IMPLEMENTATION_PLAN.md (SSAE-07) on top of
 * the SSAE-03 ranker's advisory mode classification:
 *
 * - exactly one primary processing mode per entity/action/epoch, with a separate
 *   disposition (mode is not authority);
 * - authoritative invalidation that outranks a cached positive decision;
 * - conservative handling of unknown/unversioned dependencies (never REUSE);
 * - a conditional fetch (including 304) that costs a request and never renews a
 *   source observation or an evidence lease;
 * - bounded replay with an explicit version transition, a stable cursor and
 *   preserved original clocks.
 *
 * Advances MATH-10 (change detection and cache invalidation) and MATH-06
 * (publication state/transition invariants). Does not create MATH-14 and does
 * not grant publication authority: publication remains exclusively
 * packages/scraper/publication-gateway.ts.
 *
 * Run: bun test scripts/lake/processing-modes.test.ts
 */

import {
  CURRENT_VERSIONS,
  evaluateFeasibility,
  selectProcessingMode,
  type Dependency,
  type FeasibilityGate,
  type ProcessingMode,
  type SourceMemoryRecord,
  type VersionDeps,
} from "./source-ranker";

export const SSAE_07_CONTRACT_VERSION = 1;

// ─── Cache validity ───────────────────────────────────────────────────────────

/** Kinds of invalidation that outrank any cached positive decision. */
export type InvalidationKind =
  | "OPT_OUT"
  | "WITHDRAWAL"
  | "SAFETY"
  | "POLICY_EXPIRY"
  | "LEASE_EXPIRY"
  | "EVIDENCE_TTL"
  | "BODY_MISSING"
  | "UNKNOWN_DEPENDENCY"
  | "VERSION_MISMATCH";

/** Durable per-entity cache state. Absent evidence stays absent — never inferred. */
export interface CacheState {
  /** Expiry of the stored decision/evidence lease. null means never established. */
  evidence_expires_at: string | null;
  /** Material content digest of the last observed body. */
  body_hash: string | null;
  /** Conditional-fetch validators, persisted only under the existing contract. */
  etag: string | null;
  last_modified: string | null;
  /** Versions the stored decision was produced under. null means unrecorded. */
  stored_versions: VersionDeps | null;
  /** Items still awaiting a durable terminal outcome. */
  unresolved_items: number;
}

export interface CacheValidity {
  valid: boolean;
  invalidators: InvalidationKind[];
  reasons: string[];
  /** Version keys whose stored value is unknown/unversioned. */
  unknown_version_keys: string[];
  /** Dependencies whose recorded version no longer matches the current one. */
  mismatched_dependencies: Dependency[];
}

const VERSION_KEYS: (keyof VersionDeps)[] = [
  "policy_version",
  "processor_version",
  "geo_gate_version",
  "triage_version",
  "jev_version",
  "fingerprint_version",
  "content_hash_version",
];

const VERSION_KEY_TO_DEPENDENCY: Record<keyof VersionDeps, Dependency> = {
  policy_version: "POLICY",
  processor_version: "PARSER",
  geo_gate_version: "GEO",
  triage_version: "TAXONOMY",
  jev_version: "MODEL",
  fingerprint_version: "IDENTITY",
  content_hash_version: "IDENTITY",
};

/**
 * Targeted dependencies can re-evaluate a bounded cohort; broad dependencies
 * (parser/model) require re-deriving indexes. Mirrors the SSAE-03 ranker split
 * on purpose: a ranker branch that consults the wall clock cannot decide a mode
 * from a caller-supplied clock, and a mode must be reproducible. A test asserts
 * the two classifications still agree.
 */
const TARGETED_DEPENDENCIES: readonly Dependency[] = ["GEO", "TAXONOMY", "IDENTITY", "POLICY"];

/** A stored version is trustworthy only if it is recorded and versioned. */
function isUsableVersion(value: string | null | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized !== "" && normalized !== "unknown" && normalized !== "unversioned";
}

function expired(expiry: string | null, now: Date): boolean {
  if (expiry === null) return false;
  const at = Date.parse(expiry);
  // An unparseable expiry is unknown, and unknown evidence is not valid evidence.
  if (Number.isNaN(at)) return true;
  return at <= now.getTime();
}

/**
 * Decide whether a stored decision may still be relied on. Conservative by
 * construction: a URL, fingerprint, job-ID set, body hash or HTTP 304 alone does
 * not prove unchanged geography, remote scope, apply link or safety facts, so a
 * missing body digest or an unknown dependency version invalidates the cache.
 */
export function evaluateCacheValidity(
  cache: CacheState,
  currentVersions: VersionDeps,
  now: Date,
): CacheValidity {
  const invalidators: InvalidationKind[] = [];
  const reasons: string[] = [];
  const unknown_version_keys: string[] = [];
  const mismatched_dependencies: Dependency[] = [];

  if (cache.body_hash === null) {
    invalidators.push("BODY_MISSING");
    reasons.push("no material body digest stored; content equivalence is unproved");
  }

  // A null evidence expiry means no lease was ever established. Unlike a source
  // lease, whose absence simply means "not time-limited", an unestablished
  // evidence lease cannot be assumed current.
  if (cache.evidence_expires_at === null) {
    invalidators.push("EVIDENCE_TTL");
    reasons.push("no evidence expiry recorded; the evidence lease cannot be assumed current");
  } else if (expired(cache.evidence_expires_at, now)) {
    invalidators.push("EVIDENCE_TTL");
    reasons.push(`evidence lease expired at ${cache.evidence_expires_at}`);
  }

  if (cache.stored_versions === null) {
    invalidators.push("UNKNOWN_DEPENDENCY");
    reasons.push("no recorded version dependencies; reuse is unavailable");
    unknown_version_keys.push(...VERSION_KEYS);
  } else {
    for (const key of VERSION_KEYS) {
      const stored = cache.stored_versions[key];
      if (!isUsableVersion(stored)) {
        unknown_version_keys.push(key);
        continue;
      }
      if (stored !== currentVersions[key]) {
        invalidators.push("VERSION_MISMATCH");
        reasons.push(`dependency ${key} changed: stored ${stored} != current ${currentVersions[key]}`);
        if (!mismatched_dependencies.includes(VERSION_KEY_TO_DEPENDENCY[key])) {
          mismatched_dependencies.push(VERSION_KEY_TO_DEPENDENCY[key]);
        }
      }
    }
    if (unknown_version_keys.length > 0) {
      invalidators.push("UNKNOWN_DEPENDENCY");
      reasons.push(`unversioned dependency state: ${unknown_version_keys.join(", ")}`);
    }
  }

  return {
    valid: invalidators.length === 0,
    invalidators,
    reasons,
    unknown_version_keys,
    mismatched_dependencies,
  };
}

// ─── Exclusive mode selection ─────────────────────────────────────────────────

export type Disposition =
  | "ACQUIRE_PERMITTED"
  | "RECOMPUTE_FROM_STORED"
  | "REUSE_DURABLE_RESULT"
  | "REPLAY_AFFECTED_COHORT"
  | "HOLD_NEEDS_PERMITTED_ACQUISITION"
  | "DEFERRED_NO_ACTION";

export interface ProcessingModeDecision {
  source_id: string;
  mode: ProcessingMode;
  /** Exactly one mode; asserted, not documented. */
  exclusive: true;
  disposition: Disposition;
  reasons: string[];
  invalidators: InvalidationKind[];
  dependencies: Dependency[] | null;
  feasibility: FeasibilityGate;
  /** The ranker's wall-clock-dependent classification, kept for traceability. */
  upstream_mode: ProcessingMode;
  /** Original posting/observation/first-publication clocks are never rewritten. */
  preserves_original_clocks: true;
  contract_version: number;
}

export interface ModeDecisionInput {
  record: SourceMemoryRecord;
  cache: CacheState;
  now: Date;
  currentVersions?: VersionDeps;
  /** A withdrawal, safety or source-authority invalidation observed upstream. */
  withdrawal?: boolean;
  safety_invalidation?: boolean;
  /** Ranking/index context changed: re-derive indexes without re-acquisition. */
  index_context_changed?: boolean;
}

/** Restrictive dependencies can change already-served records and their clocks. */
const AUTHORITY_INVALIDATORS: readonly InvalidationKind[] = [
  "OPT_OUT",
  "WITHDRAWAL",
  "SAFETY",
  "POLICY_EXPIRY",
  "LEASE_EXPIRY",
];

/**
 * Select exactly one processing mode per entity/action/epoch, deterministically
 * from a caller-supplied clock. Precedence:
 *
 * 1. authority invalidation (opt-out/withdrawal/safety/policy/lease) → re-evaluate
 *    the affected cohort (BOUNDED_REPLAY), or an owned hold when retained
 *    evidence is insufficient for a bounded replay;
 * 2. missing body evidence, expired evidence lease or unknown dependency version
 *    → conservative FULL acquisition; REUSE is unreachable from here;
 * 3. known dependency change → bounded cohort re-evaluation (targeted) or
 *    index re-derivation (broad);
 * 4. changed index context → REINDEX;
 * 5. otherwise → REUSE of a compatible durable result.
 *
 * A hard feasibility failure (robots, backoff, compliance) never becomes
 * permission: it defers or holds the action instead of dispatching a probe.
 */
export function decideProcessingMode(input: ModeDecisionInput): ProcessingModeDecision {
  const { record, cache, now } = input;
  const currentVersions = input.currentVersions ?? CURRENT_VERSIONS;
  const validity = evaluateCacheValidity(cache, currentVersions, now);
  const feasibility = evaluateFeasibility(record, now);
  const upstream = selectProcessingMode(record, currentVersions);

  const base = {
    source_id: record.source_id,
    exclusive: true as const,
    feasibility,
    upstream_mode: upstream.mode,
    preserves_original_clocks: true as const,
    contract_version: SSAE_07_CONTRACT_VERSION,
  };

  const authorityInvalidators: InvalidationKind[] = [];
  const reasons: string[] = [];
  if (record.publication_state.opt_out) {
    authorityInvalidators.push("OPT_OUT");
    reasons.push("source opted out: withdrawal propagation outranks any cached positive decision");
  }
  if (input.withdrawal === true) {
    authorityInvalidators.push("WITHDRAWAL");
    reasons.push("withdrawal recorded for the source");
  }
  if (input.safety_invalidation === true) {
    authorityInvalidators.push("SAFETY");
    reasons.push("safety invalidation recorded");
  }
  if (expired(record.publication_state.policy_expiry, now)) {
    authorityInvalidators.push("POLICY_EXPIRY");
    reasons.push(`policy expiry ${record.publication_state.policy_expiry} is not current`);
  }
  if (expired(record.publication_state.lease_expiry, now)) {
    authorityInvalidators.push("LEASE_EXPIRY");
    reasons.push(`evidence lease expiry ${record.publication_state.lease_expiry} is not current`);
  }

  const invalidators = [...new Set([...authorityInvalidators, ...validity.invalidators])];

  // 1. Authoritative invalidation first.
  if (authorityInvalidators.length > 0) {
    const missing = missingReplayEvidence(record);
    if (missing.length > 0) {
      return {
        ...base,
        mode: "FULL",
        disposition: "HOLD_NEEDS_PERMITTED_ACQUISITION",
        reasons: [
          ...reasons,
          `bounded replay is not supported for this entity (missing: ${missing.join(", ")}); permitted acquisition or an owned hold is required`,
        ],
        invalidators,
        dependencies: null,
      };
    }
    return {
      ...base,
      mode: "BOUNDED_REPLAY",
      disposition: "REPLAY_AFFECTED_COHORT",
      reasons: [...reasons, "authoritative invalidation requires re-evaluation of the affected cohort"],
      invalidators,
      dependencies: ["SOURCE_AUTHORITY", "POLICY"],
    };
  }

  // 2. Unknown dependency, missing body or expired evidence: conservative FULL.
  if (
    validity.unknown_version_keys.length > 0 ||
    invalidators.includes("BODY_MISSING") ||
    invalidators.includes("EVIDENCE_TTL")
  ) {
    return {
      ...base,
      mode: "FULL",
      disposition: "ACQUIRE_PERMITTED",
      reasons: [...reasons, ...validity.reasons, "reuse is unavailable; fresh acquisition is required"],
      invalidators,
      dependencies: upstream.dependencies,
    };
  }

  // 3. Known dependency change: a single targeted dependency re-evaluates a
  //    bounded cohort; anything broader re-derives indexes from stored evidence.
  if (validity.invalidators.includes("VERSION_MISMATCH")) {
    const targeted =
      validity.mismatched_dependencies.length === 1 &&
      TARGETED_DEPENDENCIES.includes(validity.mismatched_dependencies[0]);
    return {
      ...base,
      mode: targeted ? "BOUNDED_REPLAY" : "REINDEX",
      disposition: targeted ? "REPLAY_AFFECTED_COHORT" : "RECOMPUTE_FROM_STORED",
      reasons: [
        ...reasons,
        ...validity.reasons,
        targeted
          ? `targeted dependency change: ${validity.mismatched_dependencies[0]}`
          : `broad dependency change: ${validity.mismatched_dependencies.join(", ")}`,
      ],
      invalidators,
      dependencies: validity.mismatched_dependencies,
    };
  }

  // 4. Changed ranking/index context only.
  if (input.index_context_changed === true) {
    return {
      ...base,
      mode: "REINDEX",
      disposition: "RECOMPUTE_FROM_STORED",
      reasons: [...reasons, "index/ranking context changed; re-derive indexes from stored evidence"],
      invalidators,
      dependencies: null,
    };
  }

  // 5. Cache valid, no invalidation: durable reuse, subject to hard feasibility.
  if (!feasibility.permitted) {
    return {
      ...base,
      mode: "REUSE",
      disposition: "DEFERRED_NO_ACTION",
      reasons: [
        ...reasons,
        ...validity.reasons,
        `action deferred: ${feasibility.reason} (hard gate ${feasibility.hardGate})`,
      ],
      invalidators,
      dependencies: null,
    };
  }

  return {
    ...base,
    mode: "REUSE",
    disposition: "REUSE_DURABLE_RESULT",
    reasons: [...reasons, ...validity.reasons, "compatible durable result: material digests and versions match"],
    invalidators,
    dependencies: null,
  };
}

/** Replay coverage the entity would need for a bounded re-evaluation. */
function missingReplayEvidence(record: SourceMemoryRecord): string[] {
  const missing = [...record.replay_coverage.missing_fields];
  if (!record.replay_coverage.can_replay_geo_gate) missing.push("can_replay_geo_gate");
  if (!record.replay_coverage.can_replay_triage) missing.push("can_replay_triage");
  if (!record.replay_coverage.can_replay_fingerprint) missing.push("can_replay_fingerprint");
  if (!record.replay_coverage.can_replay_publication) missing.push("can_replay_publication");
  return [...new Set(missing)].sort();
}

// ─── Conditional fetch outcomes ───────────────────────────────────────────────

export interface ConditionalResponseInput {
  http_status: number;
  /** Material digest of the returned body; null when the body was not captured. */
  body_hash: string | null;
  now: Date;
}

export interface ConditionalResponseOutcome {
  http_status: number;
  /** Every response consumes request capacity, including 304 and errors. */
  request_costed: true;
  /** 304 and errors are not qualifying source observations. */
  counts_as_qualifying_observation: boolean;
  /** Validators may only be persisted under the existing conditional contract. */
  persist_validators: boolean;
  validators: { etag: string | null; last_modified: string | null; body_hash: string | null };
  /** A fetch never renews an evidence lease; only re-evaluation does. */
  evidence_extended: false;
  evidence_expires_at: string | null;
  /** Only a material change makes a fresh acquisition worth scheduling next. */
  material_change: boolean;
  observations_renewed: false;
  unresolved_items: number;
  note: string;
}

/**
 * Apply one conditional-fetch response to durable cache state. An unchanged
 * response still consumes request capacity; it is not a qualifying source
 * observation and it never extends an evidence lease or a source observation
 * clock. Validators survive an error so the next epoch can still fetch
 * conditionally, and unresolved items keep validators unpersistable.
 */
export function applyConditionalResponse(
  cache: CacheState,
  response: ConditionalResponseInput,
): ConditionalResponseOutcome {
  const notModified = response.http_status === 304;
  const isError = response.http_status >= 400 || response.http_status < 200;
  const unchanged = !notModified && !isError && cache.body_hash !== null && response.body_hash === cache.body_hash;

  if (notModified) {
    return {
      http_status: response.http_status,
      request_costed: true,
      counts_as_qualifying_observation: false,
      persist_validators: cache.unresolved_items === 0,
      validators: { etag: cache.etag, last_modified: cache.last_modified, body_hash: cache.body_hash },
      evidence_extended: false,
      evidence_expires_at: cache.evidence_expires_at,
      material_change: false,
      observations_renewed: false,
      unresolved_items: cache.unresolved_items,
      note: "304 not modified: the request cost is spent, no source observation is recorded and the evidence lease is untouched",
    };
  }

  if (isError) {
    return {
      http_status: response.http_status,
      request_costed: true,
      counts_as_qualifying_observation: false,
      persist_validators: false,
      validators: { etag: cache.etag, last_modified: cache.last_modified, body_hash: cache.body_hash },
      evidence_extended: false,
      evidence_expires_at: cache.evidence_expires_at,
      material_change: false,
      observations_renewed: false,
      unresolved_items: cache.unresolved_items,
      note: "error response: validators preserved for the next conditional fetch; a transient failure is not evidence for permanent rejection",
    };
  }

  return {
    http_status: response.http_status,
    request_costed: true,
    counts_as_qualifying_observation: true,
    persist_validators: cache.unresolved_items === 0 && response.body_hash !== null,
    validators: { etag: cache.etag, last_modified: cache.last_modified, body_hash: response.body_hash },
    evidence_extended: false,
    evidence_expires_at: cache.evidence_expires_at,
    material_change: !unchanged,
    observations_renewed: false,
    unresolved_items: cache.unresolved_items,
    note: response.body_hash === null
      ? "body captured without a material digest: a hash alone cannot prove equivalence, so the next epoch re-acquires"
      : unchanged
        ? "body unchanged: no material change, evidence lease not renewed"
        : "material change: the affected cohort requires re-evaluation",
  };
}

// ─── Bounded replay ───────────────────────────────────────────────────────────

export interface ReplayCursor {
  cursor_id: string;
  /** Records already re-evaluated under this version transition. */
  position: number;
  version_transition: string;
}

export interface ReplayPlanInput {
  record: SourceMemoryRecord;
  now: Date;
  /** Dependencies whose version changed and triggered the re-evaluation. */
  changed_dependencies: readonly Dependency[];
  /** Version transition the cursor belongs to, e.g. "geo_gate@2026-09-15". */
  version_transition: string;
  cohort_size: number;
  budget: { max_records: number };
  cursor: ReplayCursor | null;
}

export interface ReplayPlan {
  permitted: boolean;
  mode: ProcessingMode;
  disposition: Disposition;
  /** Restrictive replay never covers only rejected/ambiguous rows. */
  affected_cohorts: ("QUALIFIED" | "SYNCED" | "PUBLIC")[];
  next_cursor: ReplayCursor | null;
  complete: boolean;
  holds: string[];
  reason: string;
  preserves_original_clocks: true;
}

/**
 * Plan a bounded replay of the affected cohort under an explicit version
 * transition. Retained evidence, a stable cursor and a bounded budget are
 * required; missing fields produce a named hold instead of a partial replay, and
 * original posting/observation/first-publication clocks are never rewritten.
 */
export function planBoundedReplay(input: ReplayPlanInput): ReplayPlan {
  const { record, cursor, cohort_size, budget } = input;
  const holds: string[] = [];

  if (input.changed_dependencies.length === 0) {
    return {
      permitted: false,
      mode: "REINDEX",
      disposition: "DEFERRED_NO_ACTION",
      affected_cohorts: [],
      next_cursor: null,
      complete: false,
      holds: [],
      reason: "no invalidating dependency change: nothing to replay",
      preserves_original_clocks: true,
    };
  }

  const missing = missingReplayEvidence(record);
  if (missing.length > 0) {
    holds.push(`missing retained evidence: ${missing.join(", ")}`);
  }
  if (budget.max_records <= 0) {
    holds.push("no replay budget available");
  }
  if (cohort_size <= 0) {
    holds.push("affected cohort is empty");
  }
  if (cursor !== null && cursor.version_transition !== input.version_transition) {
    holds.push(
      `cursor belongs to version transition ${cursor.version_transition}, not ${input.version_transition}`,
    );
  }

  if (holds.length > 0) {
    return {
      permitted: false,
      mode: "FULL",
      disposition: "HOLD_NEEDS_PERMITTED_ACQUISITION",
      affected_cohorts: ["QUALIFIED", "SYNCED", "PUBLIC"],
      next_cursor: null,
      complete: false,
      holds,
      reason: "bounded replay is not available; permitted acquisition or an owned hold is required",
      preserves_original_clocks: true,
    };
  }

  const start = cursor === null ? 0 : cursor.position;
  const advanced = Math.min(start + budget.max_records, cohort_size);
  const complete = advanced >= cohort_size;

  return {
    permitted: true,
    mode: "BOUNDED_REPLAY",
    disposition: "REPLAY_AFFECTED_COHORT",
    affected_cohorts: ["QUALIFIED", "SYNCED", "PUBLIC"],
    next_cursor: complete
      ? null
      : {
          cursor_id: cursor?.cursor_id ?? `${record.source_id}:${input.version_transition}`,
          position: advanced,
          version_transition: input.version_transition,
        },
    complete,
    holds: [],
    reason: `replaying records ${start}..${advanced} of ${cohort_size} under ${input.version_transition}`,
    preserves_original_clocks: true,
  };
}

// ─── Receipt ──────────────────────────────────────────────────────────────────

/** Versioned, deterministic receipt for one entity/action/epoch mode decision. */
export function generateProcessingModeReceipt(decision: ProcessingModeDecision): string {
  return JSON.stringify({
    contract_version: decision.contract_version,
    source_id: decision.source_id,
    mode: decision.mode,
    exclusive: decision.exclusive,
    disposition: decision.disposition,
    invalidators: [...decision.invalidators].sort(),
    dependencies: decision.dependencies === null ? null : [...decision.dependencies].sort(),
    feasibility: {
      permitted: decision.feasibility.permitted,
      hard_gate: decision.feasibility.hardGate,
    },
    upstream_mode: decision.upstream_mode,
    preserves_original_clocks: decision.preserves_original_clocks,
    reasons: decision.reasons,
  });
}