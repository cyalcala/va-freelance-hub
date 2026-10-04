/**
 * Publication-decision input binding and hold resolution.
 *
 * Labels: "v6.5-CASES:" (case C resolution half) + MATH-05 / MATH-10.
 *
 * Two problems this module makes executable, both about the real
 * `decideAutoPublish` in `scripts/lake/auto-publish-policy.ts`:
 *
 * 1. **A stored publication decision does not carry its inputs.**
 *    `AutoPublishDecision` records `wilsonLower`, `publishCount`, `concentration`
 *    and a human-readable `reason`, but not the sample it was computed from, not
 *    the inventory snapshot, and not the policy constants it read. A PUBLISH
 *    therefore cannot be told apart from a re-derivation after the cohort shrank
 *    or after a mirrored constant moved. This is the MATH-10 "invalidation
 *    coverage unverified" gap in its publication-decision form.
 *
 * 2. **A HOLD does not name the missing evidence or a next action.**
 *    The v6.5 contract requires "small sample missing-evidence resolution
 *    without lower floors": a hold must name the specific missing evidence and
 *    the next evidence-producing action. The repository already owns that
 *    contract as `checkHoldDiscipline` in `scripts/lake/stage-latency.ts`
 *    (MATH-13). This module projects a real auto-publish decision into the real
 *    latency observation shape, runs the real discipline check over it, and
 *    derives the missing-evidence scope and next action from the sample that the
 *    decision was computed over.
 *
 * Scope limits, stated honestly:
 * - Pure. No writer, gateway, network, database or clock import.
 * - Adds no numeric gate. Every threshold is read from the module that owns it.
 * - Lowers no Wilson floor, sample floor or Jev confidence floor. A hold is
 *   resolved by producing evidence, never by relaxing a floor, and
 *   `floor_lowering_required` is a constant `false` so that cannot be inferred
 *   away.
 * - Proves nothing about runtime. Every input is a caller-supplied record.
 */

import {
  decideAutoPublish,
  concentrationAllowance,
  wilsonLowerBound,
  MIN_JOBS_FOR_RATE,
  MIN_INVENTORY_FOR_CONCENTRATION,
  JEV_MIN_CONFIDENCE,
  PUBLISH_PH_RATE_FLOOR,
  REJECT_PH_RATE_FLOOR,
  WILSON_Z,
  type AutoPublishDecision,
  type AutoPublishInput,
  type InventorySnapshot,
} from "./auto-publish-policy";
import {
  providerFamily,
  TOP_PROVIDER_FAMILY_SHARE_MAX,
  TOP_SOURCE_SHARE_MAX,
} from "../ci/constitution-metrics";
import { checkHoldDiscipline, type LatencyObservation } from "./stage-latency";
import { hashString } from "../../packages/scraper/contentHash";

/** Bumped when the shape of a binding changes, so old bindings never compare equal. */
export const DECISION_BINDING_SCHEMA_VERSION = 1;

// ─── Policy binding: the constants the decision function actually reads ───────

/**
 * Every threshold `decideAutoPublish` consults, read from the module that owns
 * it rather than restated here. Restating a constant would create a second
 * source of truth and hide a policy move from the binding.
 */
export interface PolicyBinding {
  publish_ph_rate_floor: number;
  reject_ph_rate_floor: number;
  min_jobs_for_rate: number;
  jev_min_confidence: number;
  wilson_z: number;
  min_inventory_for_concentration: number;
  top_source_share_max: number;
  top_provider_family_share_max: number;
}

export function currentPolicyBinding(): PolicyBinding {
  return {
    publish_ph_rate_floor: PUBLISH_PH_RATE_FLOOR,
    reject_ph_rate_floor: REJECT_PH_RATE_FLOOR,
    min_jobs_for_rate: MIN_JOBS_FOR_RATE,
    jev_min_confidence: JEV_MIN_CONFIDENCE,
    wilson_z: WILSON_Z,
    min_inventory_for_concentration: MIN_INVENTORY_FOR_CONCENTRATION,
    top_source_share_max: TOP_SOURCE_SHARE_MAX,
    top_provider_family_share_max: TOP_PROVIDER_FAMILY_SHARE_MAX,
  };
}

/**
 * Length-prefixed canonical serialization. The `::` aliasing defect recorded as
 * F-W2-2 in docs/plans/MATH_WAVE2_CHARACTERIZATION.md is exactly why a separator
 * alone is not injective; a length prefix removes the class of collision rather
 * than relying on "no `::` appears in the data".
 */
function canonical(parts: readonly string[]): string {
  return parts.map((part) => `${part.length}:${part}`).join("|");
}

export function policyBindingDigest(binding: PolicyBinding): string {
  return hashString(
    canonical([
      `v${DECISION_BINDING_SCHEMA_VERSION}`,
      "policy",
      ...Object.keys(binding)
        .sort()
        .map((key) => `${key}=${String(binding[key as keyof PolicyBinding])}`),
    ]),
  );
}

// ─── Sample normalization: what the decision function really consumes ─────────

/**
 * The sample after the exact normalization `decideAutoPublish` applies. Two
 * caller records that differ only below the floor (`totalJobs` 3 vs 3.9) are the
 * same decision input, so the binding must not treat them as drift.
 */
export interface NormalizedSample {
  total_jobs: number;
  qualified_ready: number;
  /** `Math.min(qualifiedReady, totalJobs)`: what the Wilson interval is built from. */
  wilson_successes: number;
  wilson_lower: number | null;
}

export function normalizeSample(input: AutoPublishInput): NormalizedSample {
  const qualifiedReady = Math.max(0, Math.floor(input.qualifiedReady));
  const totalJobs = Math.max(0, Math.floor(input.totalJobs));
  const wilsonSuccesses = Math.min(qualifiedReady, totalJobs);
  return {
    total_jobs: totalJobs,
    qualified_ready: qualifiedReady,
    wilson_successes: wilsonSuccesses,
    wilson_lower: totalJobs > 0 ? wilsonLowerBound(wilsonSuccesses, totalJobs) : null,
  };
}

/** The inventory snapshot exactly as the concentration allowance reads it. */
export interface NormalizedInventory {
  present: boolean;
  active_total: number;
  /** Family label per source id, in stable sorted order. */
  rows: string[];
}

export function normalizeInventory(inventory: InventorySnapshot | null): NormalizedInventory {
  if (!inventory) return { present: false, active_total: 0, rows: [] };
  return {
    present: true,
    active_total: inventory.activeTotal,
    rows: [...inventory.bySource]
      .map((row) => `${providerFamily(row.sourceId)}=${row.count}`)
      .sort(),
  };
}

// ─── The binding itself ──────────────────────────────────────────────────────

export interface DecisionBinding {
  contract_version: number;
  source_id: string;
  provider_family: string;
  sample: NormalizedSample;
  inventory: NormalizedInventory;
  /** Advisory verdict and confidence as supplied; nulls retained, never coerced. */
  jev_choice: string | null;
  jev_confidence: number | null;
  opted_out: boolean;
  policy: PolicyBinding;
  policy_digest: string;
  /** Content address over every field above. */
  binding_digest: string;
}

/**
 * A content address over the decision's complete input set. Two records with the
 * same digest are the same decision input; anything that changes the outcome
 * necessarily changes the digest, because nothing the decision reads is omitted.
 */
export function bindDecisionInputs(
  input: AutoPublishInput,
  policy: PolicyBinding = currentPolicyBinding(),
): DecisionBinding {
  const sample = normalizeSample(input);
  const inventory = normalizeInventory(input.inventory);
  const policyDigest = policyBindingDigest(policy);
  const digest = hashString(
    canonical([
      `v${DECISION_BINDING_SCHEMA_VERSION}`,
      input.sourceId,
      providerFamily(input.sourceId),
      `total=${sample.total_jobs}`,
      `qualified=${sample.qualified_ready}`,
      `wilson_successes=${sample.wilson_successes}`,
      `wilson_lower=${sample.wilson_lower === null ? "null" : sample.wilson_lower}`,
      `inventory_present=${inventory.present}`,
      `active_total=${inventory.active_total}`,
      ...inventory.rows,
      `jev_choice=${input.jevChoice ?? "null"}`,
      `jev_confidence=${input.jevConfidence ?? "null"}`,
      `opted_out=${input.optOut === true}`,
      `policy=${policyDigest}`,
    ]),
  );
  return {
    contract_version: DECISION_BINDING_SCHEMA_VERSION,
    source_id: input.sourceId,
    provider_family: providerFamily(input.sourceId),
    sample,
    inventory,
    jev_choice: input.jevChoice ?? null,
    jev_confidence: input.jevConfidence ?? null,
    opted_out: input.optOut === true,
    policy,
    policy_digest: policyDigest,
    binding_digest: digest,
  };
}

export type DriftClass =
  | "UNCHANGED"
  | "COHORT_INPUT_CHANGED"
  | "INVENTORY_INPUT_CHANGED"
  | "EVIDENCE_INPUT_CHANGED"
  | "POLICY_CONSTANTS_CHANGED"
  | "SOURCE_IDENTITY_CHANGED"
  | "NOT_COMPARABLE";

export interface DriftCheck {
  class: DriftClass;
  drift: boolean;
  /** Every changed dimension, so a caller never has to diff two digests by hand. */
  dimensions: string[];
  /** True only for `UNCHANGED`. A stored decision is reusable only here. */
  reusable: boolean;
}

export function classifyBindingDrift(stored: DecisionBinding, current: DecisionBinding): DriftCheck {
  if (stored.contract_version !== current.contract_version) {
    return { class: "NOT_COMPARABLE", drift: true, dimensions: ["contract_version"], reusable: false };
  }
  const dimensions: string[] = [];
  if (stored.policy_digest !== current.policy_digest) dimensions.push("policy_digest");
  if (stored.source_id !== current.source_id) dimensions.push("source_id");
  if (stored.sample.total_jobs !== current.sample.total_jobs) dimensions.push("sample.total_jobs");
  if (stored.sample.qualified_ready !== current.sample.qualified_ready) dimensions.push("sample.qualified_ready");
  if (stored.inventory.present !== current.inventory.present) dimensions.push("inventory.present");
  if (stored.inventory.active_total !== current.inventory.active_total) dimensions.push("inventory.active_total");
  if (stored.inventory.rows.join(",") !== current.inventory.rows.join(",")) dimensions.push("inventory.rows");
  if (stored.jev_choice !== current.jev_choice) dimensions.push("jev_choice");
  if (stored.jev_confidence !== current.jev_confidence) dimensions.push("jev_confidence");
  if (stored.opted_out !== current.opted_out) dimensions.push("opted_out");

  if (dimensions.length === 0 && stored.binding_digest === current.binding_digest) {
    return { class: "UNCHANGED", drift: false, dimensions: [], reusable: true };
  }
  if (dimensions.length === 0) {
    // Same declared inputs, different content address: refuse rather than guess.
    return { class: "NOT_COMPARABLE", drift: true, dimensions: ["binding_digest"], reusable: false };
  }

  const policyChanged = dimensions.includes("policy_digest");
  const sampleChanged = dimensions.some((d) => d.startsWith("sample."));
  const inventoryChanged = dimensions.some((d) => d.startsWith("inventory."));
  const evidenceChanged = dimensions.includes("jev_choice")
    || dimensions.includes("jev_confidence")
    || dimensions.includes("opted_out");
  const identityChanged = dimensions.includes("source_id");

  let driftClass: DriftClass;
  if (identityChanged) driftClass = "SOURCE_IDENTITY_CHANGED";
  else if (policyChanged) driftClass = "POLICY_CONSTANTS_CHANGED";
  else if (sampleChanged) driftClass = "COHORT_INPUT_CHANGED";
  else if (inventoryChanged) driftClass = "INVENTORY_INPUT_CHANGED";
  else if (evidenceChanged) driftClass = "EVIDENCE_INPUT_CHANGED";
  else driftClass = "NOT_COMPARABLE";

  return { class: driftClass, drift: true, dimensions, reusable: false };
}

/**
 * A stored decision plus the binding that justifies it. `inputs_bound` is the
 * whole point: a decision with no binding cannot be reused, because nothing in
 * `AutoPublishDecision` distinguishes it from a decision over another sample.
 */
export interface BoundDecision {
  binding: DecisionBinding;
  decision: AutoPublishDecision;
}

export type ReuseRefusal =
  | "REUSABLE"
  | "REFUSED_NO_BINDING"
  | "REFUSED_INPUT_DRIFT"
  | "REFUSED_DECISION_NOT_REPRODUCIBLE";

/**
 * Which policy constants the decision reads have moved, named one by one in a
 * stable order as `key old -> new`.
 *
 * `POLICY_CONSTANTS_CHANGED` deliberately covers a tightening and a loosening
 * alike, so a consumer cannot read the class as "safe to re-decide". Naming the
 * moved constants and their direction is what makes the refusal actionable
 * without widening the drift taxonomy.
 */
export function movedPolicyConstants(
  stored: PolicyBinding,
  current: PolicyBinding,
): string[] {
  const keys = Object.keys(current).sort() as (keyof PolicyBinding)[];
  return keys
    .filter((key) => stored[key] !== current[key])
    .map((key) => `${key} ${String(stored[key])} -> ${String(current[key])}`);
}

export interface ReuseVerdict {
  refusal: ReuseRefusal;
  drift: DriftCheck;
  /** The decision recomputed from the current inputs. Null when not reproducible. */
  current_decision: AutoPublishDecision | null;
  /** Always false. No reuse path may lower a floor. */
  floor_lowering_required: false;
  reasons: string[];
}

/**
 * Whether a stored publication decision may be reused as-is.
 *
 * Three independent refusals, none of which a stored decision's own text can
 * detect:
 * - it carries no input binding at all;
 * - the inputs it was computed over are not the current inputs, so its
 *   `wilsonLower` describes a sample that no longer exists;
 * - a policy constant the decision reads has moved since it was recorded, so
 *   the decision was computed over rules that no longer hold; and
 * - the stored decision does not equal a fresh `decideAutoPublish` over the
 *   current inputs, which means either the stored record is wrong or the code
 *   changed underneath it.
 *
 * `policy` defaults to the live constants and MUST be bound at the current
 * constants, not the ones recorded in `stored.binding.policy`. Re-binding under
 * the stored policy compares a decision against the rules that produced it and
 * can never observe a restrictive rule moving, which is the gap closed here
 * (F-CI-1). The default is evaluated per call, so a ceiling that moves between
 * calls is picked up without a version label.
 */
export function classifyDecisionReuse(
  stored: BoundDecision | null,
  current: AutoPublishInput,
  policy: PolicyBinding = currentPolicyBinding(),
): ReuseVerdict {
  const fresh = decideAutoPublish(current);
  if (!stored) {
    return {
      refusal: "REFUSED_NO_BINDING",
      drift: { class: "NOT_COMPARABLE", drift: true, dimensions: ["binding"], reusable: false },
      current_decision: fresh,
      floor_lowering_required: false,
      reasons: ["a decision with no input binding cannot be shown to describe the current sample"],
    };
  }
  const nowBinding = bindDecisionInputs(current, policy);
  const drift = classifyBindingDrift(stored.binding, nowBinding);
  const policyMoves = movedPolicyConstants(stored.binding.policy, nowBinding.policy);
  if (drift.drift) {
    return {
      refusal: "REFUSED_INPUT_DRIFT",
      drift,
      current_decision: fresh,
      floor_lowering_required: false,
      reasons: [
        `stored decision was computed over ${stored.binding.sample.qualified_ready}/${stored.binding.sample.total_jobs}; current inputs are ${nowBinding.sample.qualified_ready}/${nowBinding.sample.total_jobs}`,
        ...(policyMoves.length > 0
          ? [`the policy constants the decision reads have moved since the decision was recorded: ${policyMoves.join("; ")}`]
          : []),
      ],
    };
  }
  if (
    stored.decision.action !== fresh.action
    || stored.decision.publishCount !== fresh.publishCount
    || stored.decision.wilsonLower !== fresh.wilsonLower
    || stored.decision.concentration !== fresh.concentration
  ) {
    return {
      refusal: "REFUSED_DECISION_NOT_REPRODUCIBLE",
      drift,
      current_decision: fresh,
      floor_lowering_required: false,
      reasons: [
        `stored ${stored.decision.action}/${stored.decision.publishCount} does not reproduce as ${fresh.action}/${fresh.publishCount} over identical inputs`,
      ],
    };
  }
  return { refusal: "REUSABLE", drift, current_decision: fresh, floor_lowering_required: false, reasons: [] };
}

// ─── Hold resolution: named missing evidence and a next evidence action ───────

/**
 * What is blocking a hold. An opt-out is deliberately absent: `decideAutoPublish`
 * returns `REJECT` for an opted-out source, so there is no hold to resolve and no
 * evidence that could unblock it.
 */
export type BlockingConstraint =
  | "SAMPLE_FLOOR"
  | "WILSON_AMBIGUOUS_BAND"
  | "CONCENTRATION_CEILING"
  | "NOT_HELD";

export interface MissingEvidenceItem {
  /** The exact fact that is missing, not a prose symptom. */
  field: string;
  /** Why this fact blocks the decision. */
  why: string;
  /** Observed value now, when it is known. */
  observed: number | string | null;
  /** Value the existing floor requires. Never a new threshold. */
  required: number | string | null;
}

export interface NextEvidenceAction {
  description: string;
  /** The one field this action produces. */
  produces_field: string;
  owner_role: "MAINTAINER";
  /** What makes the action due. */
  trigger: string;
}

export interface HoldResolution {
  source_id: string;
  provider_family: string;
  action: AutoPublishDecision["action"];
  publish_count: number;
  wilson_lower: number | null;
  concentration: AutoPublishDecision["concentration"];
  blocking_constraint: BlockingConstraint;
  sample: NormalizedSample;
  /** Observations still needed to reach the existing sample floor; 0 when met. */
  additional_observations_needed: number;
  /** True when the cohort cleared the sample floor but not the Wilson floor. */
  resolution_requires_new_observations: boolean;
  missing_evidence: MissingEvidenceItem[];
  next_action: NextEvidenceAction | null;
  /** Always false: a hold resolves with evidence, never with a lower floor. */
  floor_lowering_required: false;
  /**
   * The result of the repository's own hold-discipline check over the projection
   * of this decision into a latency observation. Recorded as measured, not
   * asserted: the policy function's `reason` prose is mapped in, so a change to
   * that prose changes this result.
   */
  hold_discipline: ReturnType<typeof checkHoldDiscipline>;
  /** Human-readable, carried from the real decision. */
  reason: string;
}

/**
 * Project a real auto-publish decision into the `LatencyObservation` shape the
 * MATH-13 measurement contract already uses. Only the hold fields are populated;
 * every latency clock stays null because a hold has no observed terminal clock.
 */
export function projectDecisionAsObservation(
  sourceId: string,
  decision: AutoPublishDecision,
  at: string | null,
): LatencyObservation {
  return {
    identity_hash: `source:${sourceId}`,
    source_id: sourceId,
    service_class: null,
    cohort: "FRESH_DISCOVERY",
    terminal_state: "PENDING",
    reported_at: null,
    first_probe_at: null,
    qualified_at: null,
    publication_decided_at: at,
    d1_synced_at: null,
    public_visible_at: null,
    visibility_verified: false,
    first_report_at: null,
    held_at: decision.action === "HOLD" ? at : null,
    hold_reason: decision.action === "HOLD" ? decision.reason : null,
    next_evidence_action: null,
    next_evidence_at: null,
    posted_at: null,
    freshness_deadline_at: null,
    failure_stage: null,
    failed_attempts: 0,
  };
}

function classifyConstraint(
  input: AutoPublishInput,
  decision: AutoPublishDecision,
  sample: NormalizedSample,
): BlockingConstraint {
  if (decision.action !== "HOLD") return "NOT_HELD";
  if (sample.qualified_ready <= 0 || sample.total_jobs < MIN_JOBS_FOR_RATE) return "SAMPLE_FLOOR";
  if (
    decision.concentration === "BLOCKED"
    || decision.reason.includes("Concentration ceiling blocks")
  ) return "CONCENTRATION_CEILING";
  return "WILSON_AMBIGUOUS_BAND";
}

/**
 * Derive, for a held cohort, exactly which evidence is missing and which single
 * action produces it. Nothing here relaxes a threshold: the sample requirement is
 * the existing `MIN_JOBS_FOR_RATE`, and the `required` fields are read from the
 * owning modules.
 */
export function deriveHoldResolution(
  input: AutoPublishInput,
  decision: AutoPublishDecision,
  at: string | null = null,
): HoldResolution {
  const sample = normalizeSample(input);
  const constraint = classifyConstraint(input, decision, sample);
  const additional = Math.max(0, MIN_JOBS_FOR_RATE - sample.total_jobs);
  const inventory = normalizeInventory(input.inventory);

  const missingEvidence: MissingEvidenceItem[] = [];
  let nextAction: NextEvidenceAction | null = null;

  if (constraint === "SAMPLE_FLOOR") {
    missingEvidence.push({
      field: "cohort.total_jobs",
      why: "the PH-rate sample is below the existing sample floor, so no rate interval is interpretable",
      observed: sample.total_jobs,
      required: MIN_JOBS_FOR_RATE,
    });
    nextAction = {
      description: `observe ${additional} further permitted postings from this source and re-run the existing decision; do not lower the sample floor`,
      produces_field: "cohort.total_jobs",
      owner_role: "MAINTAINER",
      trigger: "new permitted observations land in the lake, or the cohort ages past its review deadline",
    };
  } else if (constraint === "WILSON_AMBIGUOUS_BAND") {
    missingEvidence.push({
      field: "cohort.qualified_ready",
      why: "the Wilson lower bound sits in the ambiguous band: it neither clears the publish floor nor falls below the reject floor",
      observed: sample.qualified_ready,
      required: PUBLISH_PH_RATE_FLOOR,
    });
    missingEvidence.push({
      field: "jev.choice",
      why: "the band is resolved by an advisory verdict at or above the confidence floor, and no such verdict is recorded",
      observed: input.jevChoice ?? null,
      required: JEV_MIN_CONFIDENCE,
    });
    nextAction = {
      description: "request one bounded advisory verdict for this cohort and record its choice and confidence with the sample it judged",
      produces_field: "jev.choice",
      owner_role: "MAINTAINER",
      trigger: "the cohort is still inside the ambiguous band at the next decision epoch",
    };
  } else if (constraint === "CONCENTRATION_CEILING") {
    const room = concentrationAllowance(input.sourceId, sample.qualified_ready, input.inventory);
    missingEvidence.push({
      field: "inventory.active_total",
      why: "the concentration allowance is zero, so another publication from this family would breach a share ceiling",
      observed: inventory.present ? inventory.active_total : null,
      required: TOP_PROVIDER_FAMILY_SHARE_MAX,
    });
    missingEvidence.push({
      field: "family.share",
      why: "the provider family is already at or over its ceiling share",
      observed: providerFamily(input.sourceId),
      required: TOP_SOURCE_SHARE_MAX,
    });
    nextAction = {
      description: "re-run the allowance against the current inventory once the family share changes; no share ceiling may be raised",
      produces_field: "inventory.active_total",
      owner_role: "MAINTAINER",
      trigger: `allowance is ${room.allowed}; re-check when the active inventory changes`,
    };
  }

  const observation = projectDecisionAsObservation(input.sourceId, decision, at);

  return {
    source_id: input.sourceId,
    provider_family: providerFamily(input.sourceId),
    action: decision.action,
    publish_count: decision.publishCount,
    wilson_lower: sample.wilson_lower,
    concentration: decision.concentration,
    blocking_constraint: constraint,
    sample,
    additional_observations_needed: constraint === "SAMPLE_FLOOR" ? additional : 0,
    resolution_requires_new_observations: constraint === "SAMPLE_FLOOR",
    missing_evidence: missingEvidence,
    next_action: nextAction,
    floor_lowering_required: false,
    hold_discipline: checkHoldDiscipline(observation),
    reason: decision.reason,
  };
}

/**
 * Findings about the current policy function itself, recomputed from real calls.
 *
 * These are characterised, not patched. Each carries the consequence it implies
 * so that a reviewer can decide whether it needs its own authorized unit.
 */
export interface PolicyBindingFindings {
  /** A PUBLISH whose stored text stays literally true of a sample that no longer exists. */
  publish_is_unstable_under_cohort_shrink: boolean;
  /** A decision object carries no field from which its sample can be recovered. */
  decision_object_records_no_sample: boolean;
  /** A null inventory publishes the whole cohort with concentration UNKNOWN. */
  null_inventory_publishes_unbounded_by_share_ceilings: boolean;
  /** A decision object carries no policy digest, so a constant move is invisible. */
  decision_object_records_no_policy_digest: boolean;
  /** The projection of a real HOLD fails the repository's own hold discipline. */
  hold_names_no_missing_evidence_or_next_action: boolean;
  /** True when a hold exists but no hold clock was supplied, so nothing can be checked. */
  hold_discipline_unmeasurable: boolean;
  limitations: string[];
}

export function characterizeDecisionBinding(
  input: AutoPublishInput,
  policy: PolicyBinding = currentPolicyBinding(),
  observedAt: string | null = null,
): PolicyBindingFindings {
  const decision = decideAutoPublish(input);
  const sample = normalizeSample(input);
  const shrinking: AutoPublishInput = { ...input, qualifiedReady: 1 };
  const shrunkDecision = decideAutoPublish(shrinking);
  const nullInventoryRoom = concentrationAllowance(
    input.sourceId,
    Math.max(1, sample.qualified_ready),
    null,
  );
  const holdResolution = deriveHoldResolution(input, decision, observedAt);
  const unmeasurable = decision.action === "HOLD" && observedAt === null;

  const decisionKeys = Object.keys(decision);
  return {
    publish_is_unstable_under_cohort_shrink:
      decision.action === "PUBLISH" && shrunkDecision.action !== "PUBLISH",
    decision_object_records_no_sample: !decisionKeys.some((key) =>
      ["total_jobs", "qualified_ready", "sample", "sample_size"].includes(key),
    ),
    null_inventory_publishes_unbounded_by_share_ceilings:
      input.inventory === null
      && nullInventoryRoom.concentration === "UNKNOWN"
      && nullInventoryRoom.allowed >= Math.max(1, sample.qualified_ready),
    decision_object_records_no_policy_digest: !decisionKeys.some((key) => key.includes("policy")),
    hold_names_no_missing_evidence_or_next_action:
      decision.action === "HOLD" && !unmeasurable && !holdResolution.hold_discipline.valid,
    hold_discipline_unmeasurable: unmeasurable,
    limitations: [
      "characterizes pure functions over caller-supplied records only; no runtime, D1 or lake read",
      "hold_discipline is measured on the projected observation, which maps the decision's reason prose into hold_reason and leaves next_evidence_action null as the caller would supply it",
      unmeasurable
        ? "no hold clock was supplied, so the hold-discipline finding is unmeasurable and is not asserted"
        : "the hold clock was supplied by the caller; a hold without a clock cannot be checked at all",
      `policy digest is ${policyBindingDigest(policy)} for the constants read at this SHA`,
    ],
  };
}