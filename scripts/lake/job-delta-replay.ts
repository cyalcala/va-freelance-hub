/**
 * SSAE-09 — Field-Sensitive Job Delta and Exact Bounded Replay
 * — scripts/lake/job-delta-replay.ts
 *
 * Pure TypeScript module. No writer, gateway, sync or cron import; no network, DB,
 * AI call, cost, request, schema, parameter or clock change. It supplies the half of
 * SSAE-09 that the merged SSAE-07 (`processing-modes.ts`) and the clock layer
 * (`observation-clocks.ts`) deliberately do not:
 *
 * - version dependency CLOSURE: which material fields a changed dependency can
 *   actually change, so a GEO version change is not replayed as a full reparse and
 *   an unrecognised dependency degrades conservatively to everything;
 * - exact affected-cohort SELECTION over canonical jobs, never over rejected or
 *   ambiguous rows only;
 * - complete-snapshot PROOF, with the distinction the SSAE-02 characterization
 *   (F-RC-3) found missing: an incomplete snapshot may still justify re-evaluating
 *   records it actually contains, but it may never justify a write derived from
 *   ABSENCE;
 * - cursor / restart / concurrency fixtures as a stable, content-addressed cursor
 *   with an injected clock, so a historical replay is reproducible (F-RC-5);
 * - exact bounded RECONSTRUCTION and idempotent supersession that preserves every
 *   original clock, including the observation clocks a replay must not manufacture;
 * - WITHDRAWAL PROPAGATION to the serving store as a derived, ordered, idempotent
 *   action set that never restores withdrawn data, never creates a first-publication
 *   clock and never substitutes for the governed publication path.
 *
 * Field sensitivity is deliberately independent of `toContentHash`, which encodes
 * only `${title}::${sourceUrl}` (F-RC-4): an unchanged URL or content hash is not
 * evidence that geography, remote scope, apply link, posting date or safety facts
 * are unchanged. `materialDigest`/`materialDelta` from the clock layer are the
 * only oracles used here.
 *
 * Advances MATH-10 (change detection and cache invalidation) primarily, and
 * MATH-06 (publication state/transition invariants) and MATH-09 (canonical
 * identity) secondarily. It creates no MATH-14, grants no publication authority
 * and adds no numeric gate: publication remains exclusively
 * packages/scraper/publication-gateway.ts.
 *
 * Run: bun test scripts/lake/job-delta-replay.test.ts
 */

import { hashString } from "../../packages/scraper/contentHash";
import {
  applyRestriction,
  checkReplayCoverage,
  emptyClocks,
  MATERIAL_FIELDS,
  materialDelta,
  materialDigest,
  unknownMaterialFields,
  type DiscoveryClocks,
  type JobMaterialFacts,
} from "./observation-clocks";
import {
  CURRENT_VERSIONS,
  type Dependency,
  type VersionDeps,
} from "./source-ranker";

export const SSAE_09_CONTRACT_VERSION = 1;

/** A material fact that can change a public decision. */
export type MaterialFieldName = keyof JobMaterialFacts;

/** Every material field, in the clock layer's stable digest order. */
const MATERIAL_FIELD_NAMES: readonly MaterialFieldName[] = [...MATERIAL_FIELDS];

/** Every recorded decision-version key. */
const VERSION_KEY_NAMES: readonly (keyof VersionDeps)[] = [
  "policy_version",
  "processor_version",
  "geo_gate_version",
  "triage_version",
  "jev_version",
  "fingerprint_version",
  "content_hash_version",
];

// ─── Records ──────────────────────────────────────────────────────────────────

/** Governed position of one canonical job. */
export type RecordCohort = "DISCOVERED" | "QUALIFIED" | "SYNCED" | "PUBLIC";

/**
 * Cohorts whose served state a restrictive rule can change. Restrictive replay
 * must cover these; replaying only rejected/ambiguous rows is a defect.
 */
export const POSITIVE_STATE_COHORTS: readonly RecordCohort[] = ["QUALIFIED", "SYNCED", "PUBLIC"];

/** Source-level authority facts as observed at replay time. Never assumed. */
export interface SourceAuthorityFacts {
  opt_out: boolean;
  /** null means "no expiry recorded", which is not the same as expired. */
  policy_expiry: string | null;
  lease_expiry: string | null;
}

/** One canonical job under replay: retained evidence plus its governed position. */
export interface ReplayRecord {
  identity_hash: string;
  source_id: string;
  cohort: RecordCohort;
  clocks: DiscoveryClocks;
  /** Versions the stored decision for this record was produced under. */
  decision_versions: VersionDeps | null;
  /** Material facts of the newest permitted observation, when a complete set exists. */
  observed_facts: JobMaterialFacts | null;
  source_authority: SourceAuthorityFacts;
}

function expiredAt(expiry: string | null, now: Date): boolean {
  if (expiry === null) return false;
  const at = Date.parse(expiry);
  // An unparseable expiry is unknown, and unknown authority evidence is not
  // evidence of a current lease.
  if (Number.isNaN(at)) return true;
  return at <= now.getTime();
}

// ─── Dependency closure ───────────────────────────────────────────────────────

export interface DependencyClosure {
  /** The dependencies as supplied, including any unrecognised string. */
  changed: string[];
  /** Dependencies the closure could not map; forces the conservative full closure. */
  unknown_dependencies: string[];
  /** Material fields whose stored decisions the change can actually alter. */
  invalidated_fields: MaterialFieldName[];
  /** Every stored material fact must be re-derived: the body or its parse changed. */
  requires_full_redigest: boolean;
  /** Retained evidence cannot reconstruct the decision; a permitted acquisition is needed. */
  requires_reacquisition: boolean;
  /** Canonical identity and deduplication must be re-derived. */
  requires_identity_rederivation: boolean;
  /** Role taxonomy must be recomputed. */
  requires_reclassification: boolean;
  /** The governed serving state (exposure, index, cache) can change. */
  affects_serving_state: boolean;
  /** Version keys whose stored value must differ for a record to be affected. */
  version_keys: (keyof VersionDeps)[];
  reasons: string[];
}

interface ClosureEntry {
  fields: readonly MaterialFieldName[];
  full_redigest?: boolean;
  reacquisition?: boolean;
  identity?: boolean;
  reclassification?: boolean;
  serving?: boolean;
  version_keys: readonly (keyof VersionDeps)[];
  reason: string;
}

/**
 * Per-dependency closure. `MODEL` deliberately maps to the geography, remote and
 * safety facts: the advisory model resolves ambiguity in exactly those, and an
 * advisory re-run is never used to *narrow* an earlier restriction.
 */
const DEPENDENCY_CLOSURE: Record<Dependency, ClosureEntry> = {
  GEO: {
    fields: ["location_raw", "remote"],
    version_keys: ["geo_gate_version"],
    reason: "geography/remote eligibility can change; posting date, apply link and safety facts cannot",
  },
  REMOTE: {
    fields: ["remote"],
    version_keys: ["geo_gate_version"],
    reason: "remote scope can change without any other material fact moving",
  },
  URL: {
    fields: ["apply_url"],
    version_keys: ["policy_version"],
    reason: "the canonical apply link can change; a broken-apply gate depends on it",
  },
  IDENTITY: {
    fields: [],
    identity: true,
    version_keys: ["fingerprint_version", "content_hash_version"],
    reason: "canonical identity and deduplication must be re-derived before any dedup claim",
  },
  SOURCE_AUTHORITY: {
    fields: [],
    serving: true,
    version_keys: ["policy_version"],
    reason: "source authority, opt-out and lease govern exposure, not material facts",
  },
  POLICY: {
    fields: ["posted_at", "safety"],
    serving: true,
    version_keys: ["policy_version"],
    reason: "freshness window and safety rules can reclassify an unchanged observation",
  },
  PARSER: {
    fields: [],
    full_redigest: true,
    reacquisition: true,
    version_keys: ["processor_version"],
    reason: "the body or its parse changed; no retained fact set survives",
  },
  SCHEMA: {
    fields: [],
    full_redigest: true,
    reacquisition: true,
    version_keys: ["processor_version", "policy_version"],
    reason: "schema change: retained facts may no longer be interpretable",
  },
  MODEL: {
    fields: ["location_raw", "remote", "safety"],
    version_keys: ["jev_version"],
    reason: "the advisory model resolves ambiguity in geography, remote scope and safety",
  },
  TAXONOMY: {
    fields: [],
    reclassification: true,
    version_keys: ["triage_version"],
    reason: "role taxonomy can change while every material fact is unchanged",
  },
};

/**
 * Close a changed-dependency set over the material field set and the version keys
 * it touches. An unrecognised dependency, an unknown version value or a
 * GEO/PARSER-class change degrades conservatively to the whole field set, because
 * an unknown dependency invalidates reuse (SSAE-07) and must equally invalidate a
 * reconstruction. An empty change set has an empty closure and is not an error;
 * callers that need a decision still get one, with no affected fields.
 */
export function closeDependencies(
  changed_dependencies: readonly (Dependency | string)[],
): DependencyClosure {
  const unknown_dependencies: string[] = [];
  const fields = new Set<MaterialFieldName>();
  const version_keys = new Set<keyof VersionDeps>();
  const reasons: string[] = [];
  let requires_full_redigest = false;
  let requires_reacquisition = false;
  let requires_identity_rederivation = false;
  let requires_reclassification = false;
  let affects_serving_state = false;

  for (const dependency of changed_dependencies) {
    const entry = DEPENDENCY_CLOSURE[dependency as Dependency];
    if (entry === undefined) {
      unknown_dependencies.push(dependency);
      continue;
    }
    for (const field of entry.fields) fields.add(field);
    for (const key of entry.version_keys) version_keys.add(key);
    requires_full_redigest ||= entry.full_redigest === true;
    requires_reacquisition ||= entry.reacquisition === true;
    requires_identity_rederivation ||= entry.identity === true;
    requires_reclassification ||= entry.reclassification === true;
    affects_serving_state ||= entry.serving === true;
    reasons.push(`${dependency}: ${entry.reason}`);
  }

  if (unknown_dependencies.length > 0) {
    // Conservative closure: an unrecognised dependency may change anything.
    reasons.push(
      `unrecognised dependencies (${unknown_dependencies.join(", ")}): closed over every material field and every version key`,
    );
    return {
      changed: [...changed_dependencies],
      unknown_dependencies: [...unknown_dependencies],
      invalidated_fields: [...MATERIAL_FIELD_NAMES],
      requires_full_redigest: true,
      requires_reacquisition: true,
      requires_identity_rederivation: true,
      requires_reclassification: true,
      affects_serving_state: true,
      version_keys: [...VERSION_KEY_NAMES],
      reasons,
    };
  }

  if (requires_full_redigest) {
    // A body/parse change invalidates every retained fact, not just the parsed ones.
    for (const field of MATERIAL_FIELD_NAMES) fields.add(field);
    for (const key of VERSION_KEY_NAMES) version_keys.add(key);
  }
  return {
    changed: [...changed_dependencies],
    unknown_dependencies,
    invalidated_fields: [...fields].sort(),
    requires_full_redigest,
    requires_reacquisition,
    requires_identity_rederivation,
    requires_reclassification,
    affects_serving_state,
    version_keys: [...version_keys].sort(),
    reasons,
  };
}

// ─── Complete-snapshot proof ──────────────────────────────────────────────────

export interface SnapshotProof {
  /** Every record the caller expected to cover was present. */
  complete: boolean;
  /** Coverage could not be established from the caller's evidence. */
  coverage_unknown: boolean;
  /**
   * Whether a write may be derived from the ABSENCE of a record. Permitted only on
   * a proven-complete snapshot. This is the SSAE-02 F-RC-3 discipline applied to
   * replay: absence-derived publication is forbidden, and so is absence-derived
   * withdrawal.
   */
  absence_derived_actions_permitted: boolean;
  observed: number;
  expected: number | null;
  /** Expected identities absent from the observed set. Empty on a complete snapshot. */
  missing_identities: string[];
  /** Observed identities outside the expected set. Empty on a complete snapshot. */
  unexpected_identities: string[];
  reasons: string[];
}

/**
 * Prove the snapshot is complete before any absence is read as evidence.
 *
 * `expected_identities` is the caller's coverage evidence. When it is null the
 * coverage is UNKNOWN: an incomplete view may still justify re-evaluating the
 * records it contains, but nothing may be concluded about a record it does not.
 * A partial view is therefore never a licence to withdraw, deactivate or expire
 * anything.
 */
export function proveCompleteSnapshot(
  observed_identities: readonly string[],
  expected_identities: readonly string[] | null,
): SnapshotProof {
  const observed = new Set(observed_identities);
  const reasons: string[] = [];

  if (expected_identities === null) {
    return {
      complete: false,
      coverage_unknown: true,
      absence_derived_actions_permitted: false,
      observed: observed.size,
      expected: null,
      missing_identities: [],
      unexpected_identities: [],
      reasons: [
        "no coverage evidence supplied: the snapshot is partial by assumption, so no absence is evidence and no absence-derived action is permitted",
      ],
    };
  }

  const expected = new Set(expected_identities);
  const missing = [...expected].filter((id) => !observed.has(id)).sort();
  const unexpected = [...observed].filter((id) => !expected.has(id)).sort();
  const complete = missing.length === 0 && unexpected.length === 0;

  if (!complete) {
    reasons.push(
      `snapshot coverage mismatch: ${missing.length} expected identities absent, ${unexpected.length} unexpected`,
    );
  }

  return {
    complete,
    coverage_unknown: false,
    absence_derived_actions_permitted: complete,
    observed: observed.size,
    expected: expected.size,
    missing_identities: missing,
    unexpected_identities: unexpected,
    reasons,
  };
}

// ─── Affected cohort selection ────────────────────────────────────────────────

/** Why one record is in or out of the affected cohort. */
export interface AffectedRecord {
  identity_hash: string;
  source_id: string;
  cohort: RecordCohort;
  reasons: string[];
  /** Material fields that differ from the last complete retained fact set. */
  changed_fields: MaterialFieldName[];
  /** An unchanged URL, fingerprint or content hash does not appear here. */
  material_changed: boolean;
  authority_invalidated: boolean;
  version_invalidated: boolean;
  /** Retained evidence cannot reconstruct the affected fields exactly. */
  requires_full_reacquisition: boolean;
  /** Missing fields that matter for THIS closure. */
  missing_critical_fields: MaterialFieldName[];
  /** The decision can be reconstructed from retained evidence under this closure. */
  replayable: boolean;
  is_positive_state: boolean;
}

export interface NotAffectedRecord {
  identity_hash: string;
  cohort: RecordCohort;
  reason: string;
}

export interface CohortSelection {
  closure: DependencyClosure;
  affected: AffectedRecord[];
  not_affected: NotAffectedRecord[];
  /** Distinct cohorts present in the affected set. */
  cohorts_affected: RecordCohort[];
  /**
   * Positive-state records that need re-evaluation but cannot be reconstructed.
   * Each one is a named hold with missing evidence, never a silent omission.
   */
  positive_state_holds: AffectedRecord[];
  /** Positive-state cohorts a restrictive change could reach but did not. */
  positive_state_cohorts_omitted: RecordCohort[];
  counts: {
    examined: number;
    affected: number;
    replayable: number;
    held: number;
    not_affected: number;
  };
}

export interface CohortSelectionInput {
  records: readonly ReplayRecord[];
  changed_dependencies: readonly (Dependency | string)[];
  current_versions?: VersionDeps;
  now: Date;
}

function usableVersion(value: string | null | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized !== "" && normalized !== "unknown" && normalized !== "unversioned";
}

/**
 * Select the exact affected cohort for a dependency closure.
 *
 * A record is affected when any of three independent facts holds: an authority
 * invalidation (opt-out, expired policy or lease), a material delta against the
 * last complete retained fact set, or a version dependency whose stored value is
 * absent/unusable or differs from the current one for a key the closure touches.
 *
 * Records in a positive-state cohort are selected by the same rule as any other;
 * there is no "rejected rows only" shortcut. A record whose affected fields are
 * unknown in the retained fact set is selected but marked unreconstructable, which
 * produces a named hold rather than a partial reconstruction.
 */
export function selectAffectedCohort(input: CohortSelectionInput): CohortSelection {
  const current = input.current_versions ?? CURRENT_VERSIONS;
  const closure = closeDependencies(input.changed_dependencies);
  const affected: AffectedRecord[] = [];
  const not_affected: NotAffectedRecord[] = [];

  // Sorted iteration keeps the cohort, the cursor and the receipt deterministic.
  const ordered = [...input.records].sort((a, b) => (a.identity_hash < b.identity_hash ? -1 : a.identity_hash > b.identity_hash ? 1 : 0));

  for (const record of ordered) {
    const reasons: string[] = [];
    const is_positive_state = POSITIVE_STATE_COHORTS.includes(record.cohort);
    const authority = record.source_authority;

    // 1. Authority invalidation outranks every cached positive fact.
    const authority_invalidated =
      authority.opt_out ||
      expiredAt(authority.policy_expiry, input.now) ||
      expiredAt(authority.lease_expiry, input.now);
    if (authority.opt_out) reasons.push("source opted out");
    if (expiredAt(authority.policy_expiry, input.now)) {
      reasons.push(`policy expiry ${authority.policy_expiry} is not current`);
    }
    if (expiredAt(authority.lease_expiry, input.now)) {
      reasons.push(`evidence lease expiry ${authority.lease_expiry} is not current`);
    }

    // 2. Material delta, independent of canonical identity and of content_hash.
    let changed_fields: MaterialFieldName[] = [];
    const retained = record.clocks.material_facts;
    if (retained !== null && record.observed_facts !== null) {
      if (materialDigest(record.observed_facts) !== record.clocks.material_digest) {
        changed_fields = materialDelta(retained, record.observed_facts) as MaterialFieldName[];
        reasons.push(`material delta in: ${changed_fields.join(", ") || "(digest differs)"}`);
      }
    } else if (record.observed_facts !== null && retained === null) {
      reasons.push("no retained complete fact set: no earlier material decision to invalidate");
    }

    // 3. Version dependencies the closure actually touches.
    let version_invalidated = false;
    const stored = record.decision_versions;
    if (stored === null) {
      version_invalidated = true;
      reasons.push("no recorded decision versions: unrecorded dependencies invalidate conservatively");
    } else if (closure.unknown_dependencies.length > 0 || closure.version_keys.length > 0) {
      const differing: (keyof VersionDeps)[] = [];
      const unusable: (keyof VersionDeps)[] = [];
      for (const key of closure.version_keys) {
        if (!usableVersion(stored[key])) unusable.push(key);
        else if (stored[key] !== current[key]) differing.push(key);
      }
      if (unusable.length > 0) {
        version_invalidated = true;
        reasons.push(`unversioned dependency keys: ${unusable.join(", ")}`);
      }
      if (differing.length > 0) {
        version_invalidated = true;
        reasons.push(`changed dependency keys: ${differing.join(", ")}`);
      }
    }

    const material_changed = changed_fields.length > 0;
    if (!authority_invalidated && !material_changed && !version_invalidated) {
      not_affected.push({
        identity_hash: record.identity_hash,
        cohort: record.cohort,
        reason:
          record.cohort === "DISCOVERED"
            ? "no authority invalidation, material delta or changed version dependency"
            : "no authority invalidation, material delta or changed version dependency (positive state verified unchanged)",
      });
      continue;
    }

    // Field-sensitive coverage: only the fields this closure can change matter. A
    // retained unknown outside the closure stays unknown and is not guessed; an
    // unknown INSIDE it makes the reconstruction inexact.
    const unknown_now =
      record.observed_facts !== null
        ? unknownMaterialFields(record.observed_facts)
        : record.clocks.unknown_material_fields;
    const missing_critical = closure.invalidated_fields.filter((field) =>
      unknown_now.includes(field),
    ) as MaterialFieldName[];
    const coverage = checkReplayCoverage(record.clocks);
    // An observed authority invalidation (opt-out, expired lease) needs no material
    // fact to propagate a withdrawal, so it is reconstructable even from an
    // incomplete fact set. Only a change to a material fact requires those facts.
    const needs_material_reconstruction = material_changed || version_invalidated;
    const requires_full_reacquisition =
      closure.requires_reacquisition || (needs_material_reconstruction && missing_critical.length > 0);

    if (requires_full_reacquisition) {
      const gap =
        missing_critical.length > 0
          ? missing_critical.join(", ")
          : `${closure.changed.join(", ")} invalidates every retained fact`;
      reasons.push(
        `bounded replay is not exact for this record (missing: ${gap}; retained unknowns: ${
          coverage.missing_material_fields.join(", ") || "none"
        }); permitted acquisition or an owned hold is required`,
      );
    }

    affected.push({
      identity_hash: record.identity_hash,
      source_id: record.source_id,
      cohort: record.cohort,
      reasons,
      changed_fields,
      material_changed,
      authority_invalidated,
      version_invalidated,
      requires_full_reacquisition,
      missing_critical_fields: missing_critical,
      replayable: !requires_full_reacquisition,
      is_positive_state,
    });
  }

  const cohorts_affected = [...new Set(affected.map((record) => record.cohort))].sort() as RecordCohort[];
  const positive_state_holds = affected.filter((record) => record.is_positive_state && !record.replayable);
  const observed_positive = new Set(
    input.records.filter((record) => POSITIVE_STATE_COHORTS.includes(record.cohort)).map((record) => record.cohort),
  );
  const positive_state_cohorts_omitted = cohorts_affected.filter(
    (cohort) => POSITIVE_STATE_COHORTS.includes(cohort) && !observed_positive.has(cohort),
  );

  return {
    closure,
    affected,
    not_affected,
    cohorts_affected,
    positive_state_holds,
    positive_state_cohorts_omitted,
    counts: {
      examined: input.records.length,
      affected: affected.length,
      replayable: affected.filter((record) => record.replayable).length,
      held: affected.filter((record) => !record.replayable).length,
      not_affected: not_affected.length,
    },
  };
}

// ─── Exact bounded replay plan ────────────────────────────────────────────────

export interface ExactReplayCursor {
  cursor_id: string;
  /** Records already re-evaluated under this version transition. */
  position: number;
  version_transition: string;
  /**
   * Content address of the whole replayable cohort this cursor walks. A restart
   * whose cohort digest differs is a DIFFERENT cohort, not a continuation, so the
   * stale cursor is refused instead of silently skipping records.
   */
  cohort_digest: string;
  total: number;
}

export type ServingStoreActionKind =
  | "STOP_ABSENCE_DERIVED_WRITES"
  | "WITHDRAW_FROM_PUBLIC_SURFACE"
  | "WITHDRAW_FROM_INDEX"
  | "EXPIRE_SERVING_CACHE"
  | "RETAIN_ORIGINAL_CLOCKS"
  | "REQUIRE_GOVERNED_PUBLICATION_PATH";

export interface ServingStoreAction {
  identity_hash: string;
  cohort: RecordCohort;
  action: ServingStoreActionKind;
  reasons: string[];
}

export interface WithdrawalPropagation {
  actions: ServingStoreAction[];
  /** Always false: this module never derives a write from a record's absence. */
  absence_derived: false;
  /** A withdrawal is never a first publication. */
  counts_as_first_publication: false;
  /** A withdrawal is never fresh supply. */
  counts_as_fresh_flow: false;
  /** Exposure remains the governed publication path's exclusive job. */
  requires_governed_publication_path: true;
  /** Original observation/qualification/publication clocks are retained. */
  preserves_original_clocks: true;
  identities: string[];
  reasons: string[];
}

export interface ExactReplayPlanInput extends CohortSelectionInput {
  version_transition: string;
  budget: { max_records: number };
  cursor: ExactReplayCursor | null;
  /** Coverage evidence for the snapshot. null means UNKNOWN coverage. */
  expected_identities?: readonly string[] | null;
}

export interface ExactReplayPlan {
  permitted: boolean;
  version_transition: string;
  closure: DependencyClosure;
  snapshot: SnapshotProof;
  /** This batch's records, in stable identity order. */
  batch: AffectedRecord[];
  /** Records selected but held for missing evidence, with the named gap. */
  holds: AffectedRecord[];
  next_cursor: ExactReplayCursor | null;
  complete: boolean;
  /** Whole-cohort digest, independent of the cursor position. */
  cohort_digest: string;
  withdrawal_propagation: WithdrawalPropagationResult;
  reasons: string[];
  preserves_original_clocks: true;
}

function cohortDigestOf(identities: readonly string[], version_transition: string): string {
  return hashString(`${version_transition}::${[...identities].sort().join(",")}`);
}

/**
 * Plan one bounded batch of the exact affected cohort.
 *
 * The cursor is content-addressed, so a restart is exact rather than positional:
 * the same version transition over the same cohort resumes; a cursor from another
 * transition, or one whose cohort digest no longer matches, is refused and named.
 * The batch is derived from the positive evidence in the snapshot. Records held
 * for missing evidence are returned with their gap so a restrictive change cannot
 * hide an unreconstructable public record, and no withdrawal is ever derived from
 * absence.
 */
export function planExactBoundedReplay(input: ExactReplayPlanInput): ExactReplayPlan {
  const selection = selectAffectedCohort(input);
  const snapshot = proveCompleteSnapshot(
    input.records.map((record) => record.identity_hash),
    input.expected_identities ?? null,
  );

  const replayable = selection.affected.filter((record) => record.replayable);
  const holds = selection.affected.filter((record) => !record.replayable);
  const cohort_digest = cohortDigestOf(
    replayable.map((record) => record.identity_hash),
    input.version_transition,
  );

  const planReasons: string[] = [...snapshot.reasons, ...selection.closure.reasons];
  const holdsBlockers: string[] = [];

  if (input.changed_dependencies.length === 0) {
    // An observed authority invalidation is its own trigger: an opt-out or an
    // expired lease must not wait for a version change to be replayed.
    if (selection.affected.length === 0) {
      holdsBlockers.push("no invalidating dependency change: nothing to replay");
    } else {
      planReasons.push(
        "no dependency change: the affected cohort is driven by observed authority invalidation",
      );
    }
  }
  if (input.budget.max_records <= 0) {
    holdsBlockers.push("no replay budget available");
  }
  if (typeof input.version_transition !== "string" || input.version_transition.length === 0) {
    holdsBlockers.push("an explicit version transition is required");
  }

  const cursor = input.cursor;
  if (cursor !== null) {
    if (cursor.version_transition !== input.version_transition) {
      holdsBlockers.push(
        `cursor belongs to version transition ${cursor.version_transition}, not ${input.version_transition}`,
      );
    } else if (cursor.cohort_digest !== cohort_digest) {
      holdsBlockers.push(
        `cursor cohort digest ${cursor.cohort_digest} does not match the current cohort ${cohort_digest}: the affected cohort changed, so the stale cursor is refused instead of skipping records`,
      );
    }
  }

  if (holds.length > 0) {
    for (const held of holds) {
      planReasons.push(`held ${held.identity_hash}: ${held.reasons.join("; ")}`);
    }
  }

  const start = cursor === null ? 0 : cursor.position;
  const advanced = Math.min(start + Math.max(input.budget.max_records, 0), replayable.length);
  const complete = advanced >= replayable.length;
  const batch = replayable.slice(start, advanced);

  const next_cursor = complete
    ? null
    : {
        cursor_id: cursor?.cursor_id ?? `${input.version_transition}:${cohort_digest}`,
        position: advanced,
        version_transition: input.version_transition,
        cohort_digest,
        total: replayable.length,
      };

  const withdrawal_propagation = propagateWithdrawals({
    selection,
    snapshot,
    records: input.records,
    identities: batch.map((record) => record.identity_hash),
  });

  if (withdrawal_propagation.absence_derived_actions_permitted === false) {
    planReasons.push(
      "absence-derived writes are disabled for this snapshot; only records actually observed can produce an action",
    );
  }

  return {
    permitted: holdsBlockers.length === 0,
    version_transition: input.version_transition,
    closure: selection.closure,
    snapshot,
    batch,
    holds,
    next_cursor,
    complete,
    cohort_digest,
    withdrawal_propagation,
    reasons: [...planReasons, ...holdsBlockers],
    preserves_original_clocks: true,
  };
}

// ─── Withdrawal propagation ───────────────────────────────────────────────────

export interface WithdrawalPropagationInput {
  selection: CohortSelection;
  snapshot: SnapshotProof;
  records: readonly ReplayRecord[];
  /** Identities of the records in the current batch. */
  identities: readonly string[];
}

export interface WithdrawalPropagationResult extends WithdrawalPropagation {
  /** False whenever the snapshot cannot prove it covers the whole cohort. */
  absence_derived_actions_permitted: boolean;
}

/**
 * Derive the serving-store actions a restrictive change requires.
 *
 * Only records present in the batch produce actions, so nothing is derived from
 * absence; the flag that says so is carried in the receipt. A record already
 * restricted produces no new action, which makes the derivation idempotent.
 * Withdrawing hides a record; it never erases the first-publication clock or its
 * cohort, never restores withdrawn data, and never counts as fresh flow.
 */
export function propagateWithdrawals(
  input: WithdrawalPropagationInput,
): WithdrawalPropagationResult {
  const by_identity = new Map(input.records.map((record) => [record.identity_hash, record]));
  const affectedByIdentity = new Map(input.selection.affected.map((record) => [record.identity_hash, record]));
  const actions: ServingStoreAction[] = [];
  const identities: string[] = [];
  const reasons: string[] = [];

  for (const identity of input.identities) {
    const affected = affectedByIdentity.get(identity);
    if (affected === undefined) continue;
    const record = by_identity.get(identity);
    if (record === undefined) continue;
    if (!affected.authority_invalidated) continue;

    if (record.clocks.restricted_at !== null) {
      // Already propagated. Re-deriving must not repeat a withdrawal.
      reasons.push(`${identity}: already restricted since ${record.clocks.restricted_at}; no new action`);
      continue;
    }

    const recordActions: ServingStoreActionKind[] = [];
    if (affected.is_positive_state) {
      recordActions.push("WITHDRAW_FROM_PUBLIC_SURFACE", "WITHDRAW_FROM_INDEX", "EXPIRE_SERVING_CACHE");
    } else {
      // Never served: there is nothing to withdraw, but the record must still never
      // reach the serving store outside the governed publication path.
      reasons.push(`${identity}: never served; no serving withdrawal applies`);
    }
    recordActions.push("RETAIN_ORIGINAL_CLOCKS", "REQUIRE_GOVERNED_PUBLICATION_PATH");
    if (!input.snapshot.absence_derived_actions_permitted) {
      recordActions.push("STOP_ABSENCE_DERIVED_WRITES");
    }

    for (const action of recordActions) {
      actions.push({
        identity_hash: identity,
        cohort: affected.cohort,
        action,
        reasons: affected.reasons,
      });
    }
    identities.push(identity);
  }

  return {
    actions,
    absence_derived: false,
    absence_derived_actions_permitted: input.snapshot.absence_derived_actions_permitted,
    counts_as_first_publication: false,
    counts_as_fresh_flow: false,
    requires_governed_publication_path: true,
    preserves_original_clocks: true,
    identities,
    reasons,
  };
}

// ─── Reconstructed decision and idempotent supersession ───────────────────────

/** Per-record replay state: which version transitions have already been applied. */
export interface ReplayState {
  contract_version: number;
  /** Applied version transitions, in application order. */
  applied_transitions: string[];
  last_transition: string | null;
  last_decision_id: string | null;
  /** Append-only decision lineage; an earlier decision is never rewritten. */
  lineage: ReplayDecision[];
}

/** One re-evaluated decision produced by a bounded replay. */
export interface ReplayDecision {
  identity_hash: string;
  decision_id: string;
  /** The decision this one supersedes. Required when replacing one in the same transition. */
  supersedes_decision_id: string | null;
  decided_at: string;
  version_transition: string;
  outcome: "RECONSTRUCTED" | "WITHDRAW" | "HOLD_NEEDS_EVIDENCE";
  /** Reconstructed material facts, when the replay produced a complete set. */
  facts: JobMaterialFacts | null;
  reasons: string[];
}

export interface SupersessionResult {
  ok: boolean;
  clocks: DiscoveryClocks;
  state: ReplayState;
  /** The decision was recorded and the material block updated. */
  applied: boolean;
  /** The identical decision was already applied; nothing changed. */
  idempotent_noop: boolean;
  /** A decision for an already-applied transition arrived without superseding it. */
  stale_rejected: boolean;
  /** Material fields the reconstruction changed. */
  changed_fields: MaterialFieldName[];
  errors: string[];
}

export function emptyReplayState(): ReplayState {
  return {
    contract_version: SSAE_09_CONTRACT_VERSION,
    applied_transitions: [],
    last_transition: null,
    last_decision_id: null,
    lineage: [],
  };
}

/**
 * Apply one replayed decision.
 *
 * Exact reconstruction must not manufacture an observation: the observation,
 * storage, qualification and publication clocks are copied through byte-for-byte,
 * and only the material block (facts, digest, unknown fields, revision) moves. A
 * withdrawal routes through the clock layer's restriction transition, which
 * retains the first-publication clock and its cohort by construction.
 *
 * Supersession is idempotent and conflict-checked: the identical decision applied
 * twice is a no-op, a different decision for an already-applied transition must
 * name the decision it supersedes, and the superseded decision stays in the
 * lineage (C18 — supersession must not falsify the earlier decision).
 */
export function applyReplayDecision(
  clocks: DiscoveryClocks,
  state: ReplayState,
  decision: ReplayDecision,
): SupersessionResult {
  const errors: string[] = [];
  if (decision.identity_hash !== clocks.identity_hash) {
    return {
      ok: false,
      clocks,
      state,
      applied: false,
      idempotent_noop: false,
      stale_rejected: false,
      changed_fields: [],
      errors: [
        `identity mismatch: record holds ${clocks.identity_hash}, decision carries ${decision.identity_hash}`,
      ],
    };
  }
  if (typeof decision.decision_id !== "string" || decision.decision_id.length === 0) {
    errors.push("decision_id must be a non-empty string");
  }
  if (typeof decision.version_transition !== "string" || decision.version_transition.length === 0) {
    errors.push("version_transition must be a non-empty string");
  }
  if (Number.isNaN(Date.parse(decision.decided_at))) {
    errors.push("decided_at must be a valid ISO8601 string");
  }
  if (errors.length > 0) {
    return {
      ok: false,
      clocks,
      state,
      applied: false,
      idempotent_noop: false,
      stale_rejected: false,
      changed_fields: [],
      errors,
    };
  }

  const alreadyApplied = state.applied_transitions.includes(decision.version_transition);
  if (alreadyApplied && state.last_decision_id === decision.decision_id) {
    return {
      ok: true,
      clocks,
      state,
      applied: false,
      idempotent_noop: true,
      stale_rejected: false,
      changed_fields: [],
      errors: [],
    };
  }
  if (alreadyApplied && decision.supersedes_decision_id !== state.last_decision_id) {
    return {
      ok: false,
      clocks,
      state,
      applied: false,
      idempotent_noop: false,
      stale_rejected: true,
      changed_fields: [],
      errors: [
        `version transition ${decision.version_transition} was already applied as ${state.last_decision_id}: a replacement must supersede that decision explicitly`,
      ],
    };
  }

  if (decision.outcome === "WITHDRAW") {
    const restricted = applyRestriction(clocks, {
      restricted_at: decision.decided_at,
      reason: decision.reasons.join("; ") || "restrictive replay",
    });
    if (!restricted.ok) {
      return {
        ok: false,
        clocks,
        state,
        applied: false,
        idempotent_noop: false,
        stale_rejected: false,
        changed_fields: [],
        errors: restricted.errors,
      };
    }
    return {
      ok: true,
      clocks: restricted.clocks,
      state: {
        ...state,
        contract_version: SSAE_09_CONTRACT_VERSION,
        applied_transitions: [...state.applied_transitions, decision.version_transition],
        last_transition: decision.version_transition,
        last_decision_id: decision.decision_id,
        lineage: [...state.lineage, decision],
      },
      applied: true,
      idempotent_noop: false,
      stale_rejected: false,
      changed_fields: [],
      errors: [],
    };
  }

  if (decision.outcome === "HOLD_NEEDS_EVIDENCE") {
    return {
      ok: true,
      clocks,
      state: {
        ...state,
        contract_version: SSAE_09_CONTRACT_VERSION,
        applied_transitions: [...state.applied_transitions, decision.version_transition],
        last_transition: decision.version_transition,
        last_decision_id: decision.decision_id,
        lineage: [...state.lineage, decision],
      },
      applied: true,
      idempotent_noop: false,
      stale_rejected: false,
      changed_fields: [],
      errors: [],
    };
  }

  // RECONSTRUCTED. Only the material block may move.
  if (decision.facts === null) {
    return {
      ok: false,
      clocks,
      state,
      applied: false,
      idempotent_noop: false,
      stale_rejected: false,
      changed_fields: [],
      errors: ["a reconstructed decision requires the reconstructed material facts"],
    };
  }
  if (clocks.restricted_at !== null) {
    return {
      ok: false,
      clocks,
      state,
      applied: false,
      idempotent_noop: false,
      stale_rejected: false,
      changed_fields: [],
      errors: [
        `record is restricted since ${clocks.restricted_at}: a reconstruction cannot restore it without an explicit authority`,
      ],
    };
  }

  const digest = materialDigest(decision.facts);
  const unchanged = clocks.material_digest !== null && clocks.material_digest === digest;
  const changed_fields =
    unchanged || clocks.material_facts === null
      ? []
      : (materialDelta(clocks.material_facts, decision.facts) as MaterialFieldName[]);

  return {
    ok: true,
    clocks: {
      ...clocks,
      material_facts: { ...decision.facts },
      material_digest: digest,
      unknown_material_fields: unknownMaterialFields(decision.facts),
      material_revision: unchanged ? clocks.material_revision : clocks.material_revision + 1,
    },
    state: {
      ...state,
      contract_version: SSAE_09_CONTRACT_VERSION,
      applied_transitions: [...state.applied_transitions, decision.version_transition],
      last_transition: decision.version_transition,
      last_decision_id: decision.decision_id,
      lineage: [...state.lineage, decision],
    },
    applied: true,
    idempotent_noop: false,
    stale_rejected: false,
    changed_fields,
    errors: [],
  };
}

// ─── Receipt ──────────────────────────────────────────────────────────────────

/**
 * Versioned, deterministic receipt for one exact bounded replay plan. Two runs
 * over the same snapshot, clock and budget produce byte-identical output, so a
 * receipt is evidence of the plan rather than of the moment it was produced.
 */
export function generateReplayReceipt(plan: ExactReplayPlan): string {
  return JSON.stringify({
    contract_version: SSAE_09_CONTRACT_VERSION,
    version_transition: plan.version_transition,
    permitted: plan.permitted,
    cohort_digest: plan.cohort_digest,
    closure: {
      changed: [...plan.closure.changed].sort(),
      unknown_dependencies: [...plan.closure.unknown_dependencies].sort(),
      invalidated_fields: [...plan.closure.invalidated_fields].sort(),
      requires_full_redigest: plan.closure.requires_full_redigest,
      requires_reacquisition: plan.closure.requires_reacquisition,
      requires_identity_rederivation: plan.closure.requires_identity_rederivation,
      affects_serving_state: plan.closure.affects_serving_state,
      version_keys: [...plan.closure.version_keys].sort(),
    },
    snapshot: {
      complete: plan.snapshot.complete,
      coverage_unknown: plan.snapshot.coverage_unknown,
      absence_derived_actions_permitted: plan.snapshot.absence_derived_actions_permitted,
      observed: plan.snapshot.observed,
      expected: plan.snapshot.expected,
      missing_identities: [...plan.snapshot.missing_identities].sort(),
    },
    batch: plan.batch.map((record) => ({
      identity_hash: record.identity_hash,
      cohort: record.cohort,
      changed_fields: [...record.changed_fields].sort(),
      material_changed: record.material_changed,
      authority_invalidated: record.authority_invalidated,
      version_invalidated: record.version_invalidated,
      replayable: record.replayable,
    })),
    holds: plan.holds.map((record) => ({
      identity_hash: record.identity_hash,
      cohort: record.cohort,
      missing_critical_fields: [...record.missing_critical_fields].sort(),
      requires_full_reacquisition: record.requires_full_reacquisition,
    })),
    next_cursor: plan.next_cursor,
    complete: plan.complete,
    withdrawal_propagation: {
      identities: [...plan.withdrawal_propagation.identities].sort(),
      actions: plan.withdrawal_propagation.actions.map((action) => ({
        identity_hash: action.identity_hash,
        action: action.action,
      })),
      absence_derived: false,
      counts_as_first_publication: false,
      counts_as_fresh_flow: false,
      requires_governed_publication_path: true,
      preserves_original_clocks: true,
    },
    preserves_original_clocks: true,
  });
}

/** Convenience: an empty record, used by callers and tests. */
export function emptyReplayRecord(
  identity_hash: string,
  cohort: RecordCohort = "DISCOVERED",
): ReplayRecord {
  return {
    identity_hash,
    source_id: `source:${identity_hash}`,
    cohort,
    clocks: emptyClocks(identity_hash),
    decision_versions: null,
    observed_facts: null,
    source_authority: { opt_out: false, policy_expiry: null, lease_expiry: null },
  };
}
