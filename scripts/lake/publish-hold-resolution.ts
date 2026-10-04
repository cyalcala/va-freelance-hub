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
 * 3. **A REJECT is the only decision class with no evidence record at all.**
 *    `decideAutoPublish` has three distinct reject branches — an opt-out, a raw
 *    PH rate under the reject floor, and a confident advisory `REJECT` — and
 *    `AutoPublishDecision` carries nothing that tells them apart: `action` is
 *    `"REJECT"` in all three, `concentration` is `"UNKNOWN"` on every reject
 *    path whatever inventory was supplied, and the rate, the confidence and the
 *    floor the decision compared against survive only inside the `reason` prose.
 *    `describeReject` measures the branch and names the evidence, or states
 *    plainly that no observation resolves it.
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

// ─── Concentration ceiling: which accepted ceiling actually left no room ──────

/**
 * Which of the two accepted share ceilings blocked, each half in the unit it is
 * measured in: a share against a share, a row count against a row count.
 *
 * `concentrationAllowance` returns only `{ allowed, concentration }`, so a caller
 * that is held cannot tell which ceiling bit — its only clue is the prose in
 * `AutoPublishDecision.reason`. This recomputes both shares from the same snapshot
 * rows and the same two live constants. `shareRoom` in
 * `scripts/lake/auto-publish-policy.ts` returns zero room exactly when
 * `rows >= ceiling * activeTotal`, so `binding` names the ceiling on the same
 * arithmetic the allowance acts on; the tests re-check that agreement against
 * `concentrationAllowance` itself rather than restating it as a constant.
 *
 * No ceiling is proposed, raised or lowered, and no numeric gate is added: both
 * thresholds are read from `scripts/ci/constitution-metrics.ts`, the module that
 * owns them.
 */
export interface ConcentrationCeiling {
  /** An inventory snapshot was supplied at all. */
  present: boolean;
  /** The snapshot is large enough for a ceiling to be measured on it. */
  measurable: boolean;
  source_family: string;
  active_total: number;
  source_rows: number;
  family_rows: number;
  /** Share of the active board, or null when it cannot be measured. */
  source_share: number | null;
  family_share: number | null;
  /** The ceiling that leaves no room; `NONE` when the allowance is positive. */
  binding: "TOP_SOURCE_SHARE_MAX" | "TOP_PROVIDER_FAMILY_SHARE_MAX" | "BOTH" | "NONE";
}

export function describeConcentrationCeiling(
  sourceId: string,
  inventory: InventorySnapshot | null,
): ConcentrationCeiling {
  const family = providerFamily(sourceId);
  const rows: InventorySnapshot["bySource"] = inventory === null ? [] : inventory.bySource;
  const activeTotal = inventory === null ? 0 : inventory.activeTotal;
  const measurable = inventory !== null && activeTotal >= MIN_INVENTORY_FOR_CONCENTRATION;
  const sourceRows = rows
    .filter((row) => row.sourceId === sourceId)
    .reduce((sum, row) => sum + row.count, 0);
  const familyRows = rows
    .filter((row) => providerFamily(row.sourceId) === family)
    .reduce((sum, row) => sum + row.count, 0);
  const sourceShare = measurable ? sourceRows / activeTotal : null;
  const familyShare = measurable ? familyRows / activeTotal : null;
  const sourceAtCeiling = sourceShare !== null && sourceShare >= TOP_SOURCE_SHARE_MAX;
  const familyAtCeiling = familyShare !== null && familyShare >= TOP_PROVIDER_FAMILY_SHARE_MAX;
  const binding = sourceAtCeiling && familyAtCeiling
    ? "BOTH"
    : sourceAtCeiling
      ? "TOP_SOURCE_SHARE_MAX"
      : familyAtCeiling
        ? "TOP_PROVIDER_FAMILY_SHARE_MAX"
        : "NONE";
  return {
    present: inventory !== null,
    measurable,
    source_family: family,
    active_total: activeTotal,
    source_rows: sourceRows,
    family_rows: familyRows,
    source_share: sourceShare,
    family_share: familyShare,
    binding,
  };
}

/** A share as a percentage string for prose, without inventing precision. */
function shareText(value: number | null): string {
  return value === null ? "an unmeasured share" : `${(value * 100).toFixed(2)}%`;
}

// ─── Concentration relief: the one concentration outcome a ceiling cannot name ──

/**
 * Whether publishing this source's room reduces an over-ceiling concentration,
 * and whose concentration that is.
 *
 * `concentrationAllowance` returns exactly one positive signal — `RELIEVES` — and it
 * is the only one the ceiling projection cannot express. `describeConcentrationCeiling`
 * answers "which ceiling left no room", so a board where this publication *relieves*
 * an over-ceiling family held by a different provider family reports `NONE`: the same
 * value as a board with no concentration pressure at all. The two are not the same
 * fact, and only the second one means a publication is doing useful concentration work.
 *
 * `RELIEVES` is measured, not asserted: it is the leading family's share strictly
 * above `TOP_PROVIDER_FAMILY_SHARE_MAX` before publication and strictly lower after
 * it. The leading family is a *family*, so the share moves because the denominator
 * grew, not because the family shrank. This projection recomputes the same two shares
 * from the same snapshot rows and the same live ceiling; the tests re-check that
 * agreement against `concentrationAllowance` itself over every fixture rather than
 * restating its result.
 *
 * Nothing here changes an allowance. `publishes_rows` is the real function's own
 * `allowed`, and no ceiling is proposed, raised or lowered.
 */
export interface ConcentrationRelief {
  /** True when the snapshot is large enough for a share ceiling to mean anything. */
  measurable: boolean;
  /** The provider family holding the largest share of the active board. */
  leading_family: string | null;
  leading_family_rows: number | null;
  leading_family_share: number | null;
  /** That share strictly above the accepted family ceiling, as RELIEVES tests it. */
  over_ceiling: boolean;
  /** Rows by which the leading family exceeds the ceiling; 0 when it does not. */
  rows_over_ceiling: number | null;
  /** The leading family's share after this publication adds its room to the board. */
  leading_family_share_after: number | null;
  /** True exactly when `concentrationAllowance` reports `RELIEVES`. */
  relieves: boolean;
  /** Why it does not relieve, or null when it does. */
  not_relieved_because: string | null;
  /** Rows this publication would add to the active board; 0 when it cannot publish. */
  publishes_rows: number;
  /** The denominator the shares above were computed on. */
  denominator: number;
  /** Sum of the snapshot's own rows, which `concentrationAllowance` never checks. */
  row_sum: number;
  /** Whether the declared total is the row sum. Measured whether or not it matters. */
  denominator_matches_rows: boolean;
}

export function describeConcentrationRelief(
  sourceId: string,
  qualifiedReady: number,
  inventory: InventorySnapshot | null,
): ConcentrationRelief {
  const family = providerFamily(sourceId);
  const rows: InventorySnapshot["bySource"] = inventory === null ? [] : inventory.bySource;
  const denominator = inventory === null ? 0 : inventory.activeTotal;
  const rowSum = rows.reduce((sum, row) => sum + row.count, 0);
  const measurable = inventory !== null && denominator >= MIN_INVENTORY_FOR_CONCENTRATION;

  const rowsByFamily = new Map<string, number>();
  for (const row of rows) {
    const name = providerFamily(row.sourceId);
    rowsByFamily.set(name, (rowsByFamily.get(name) ?? 0) + row.count);
  }
  // Sorted iteration makes a tie resolve to the alphabetically first family, so the
  // projection is stable where the real function needs no tie-break at all.
  let leading: string | null = null;
  for (const name of [...rowsByFamily.keys()].sort()) {
    if (leading === null || (rowsByFamily.get(name) ?? 0) > (rowsByFamily.get(leading) ?? 0)) {
      leading = name;
    }
  }
  const leadingRows = leading === null ? null : rowsByFamily.get(leading) ?? 0;
  const leadingShare = measurable && leadingRows !== null ? leadingRows / denominator : null;
  // Strictly greater, because that is what `concentrationAllowance` tests. A family
  // exactly on its ceiling has no room left for itself and is still not `RELIEVES`.
  const overCeiling = leadingShare !== null && leadingShare > TOP_PROVIDER_FAMILY_SHARE_MAX;
  const rowsOverCeiling = measurable && leadingRows !== null
    ? Math.max(0, leadingRows - TOP_PROVIDER_FAMILY_SHARE_MAX * denominator)
    : null;

  const room = concentrationAllowance(sourceId, qualifiedReady, inventory);
  const publishes = room.allowed;
  // The publication's rows land in its own family, so the leading family's numerator
  // grows only when the leading family is this cohort's own; otherwise the larger
  // denominator alone is what reduces the share.
  const leadingShareAfter = measurable && leadingRows !== null && publishes > 0
    ? (leadingRows + (leading === family ? publishes : 0)) / (denominator + publishes)
    : null;
  const relieves = overCeiling && leadingShare !== null && leadingShareAfter !== null
    && leadingShareAfter < leadingShare;

  let notRelievedBecause: string | null = null;
  if (!measurable) {
    notRelievedBecause = `no share ceiling applies below ${MIN_INVENTORY_FOR_CONCENTRATION} active rows`;
  } else if (publishes <= 0) {
    notRelievedBecause = "this publication has no room on the active board, so it cannot relieve any share";
  } else if (!overCeiling) {
    // The over-ceiling family is never this cohort's own on this branch: an
    // over-ceiling family has exactly zero share room, so `concentrationAllowance`
    // returns `allowed: 0` and blocks before any relief can be reported. That is
    // why the cases are ordered as they are and why `not_relieved_because` has no
    // "it is my own family" case.
    notRelievedBecause = "no provider family is above its accepted ceiling, so there is nothing to relieve";
  }

  return {
    measurable,
    leading_family: leading,
    leading_family_rows: leadingRows,
    leading_family_share: leadingShare,
    over_ceiling: overCeiling,
    rows_over_ceiling: rowsOverCeiling,
    leading_family_share_after: leadingShareAfter,
    relieves,
    not_relieved_because: notRelievedBecause,
    publishes_rows: publishes,
    denominator,
    row_sum: rowSum,
    denominator_matches_rows: denominator === rowSum,
  };
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
   * Both share ceilings as measured on the snapshot, and which one actually left
   * no room. Present on every decision, not only a concentration hold, so a
   * caller never has to re-derive it and can see `NONE` where the ceilings were
   * not what blocked.
   */
  concentration_ceiling: ConcentrationCeiling;
  /**
   * Whether this publication relieves an over-ceiling provider family, and whose
   * concentration that is. Separate from `concentration_ceiling` because that field
   * names a ceiling that left *no room* and therefore reports `NONE` for a relieving
   * publication; without this a caller cannot tell that pressure from none at all.
   */
  concentration_relief: ConcentrationRelief;
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
  const ceiling = describeConcentrationCeiling(input.sourceId, input.inventory);
  const relief = describeConcentrationRelief(input.sourceId, sample.qualified_ready, input.inventory);

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
    // One item per ceiling that actually left no room, each a share against a
    // share, so a caller can evaluate `observed >= required` on every item. The
    // denominator is reported as the row count it is, with no invented threshold.
    if (ceiling.binding === "TOP_SOURCE_SHARE_MAX" || ceiling.binding === "BOTH") {
      missingEvidence.push({
        field: "inventory.source_share",
        why: `this source already holds ${shareText(ceiling.source_share)} of the ${ceiling.active_total} active rows, so the source share ceiling leaves no room for another publication from it`,
        observed: ceiling.source_share,
        required: TOP_SOURCE_SHARE_MAX,
      });
    }
    if (ceiling.binding === "TOP_PROVIDER_FAMILY_SHARE_MAX" || ceiling.binding === "BOTH") {
      missingEvidence.push({
        field: "inventory.family_share",
        why: `provider family ${ceiling.source_family} already holds ${shareText(ceiling.family_share)} of the active rows, so the family share ceiling leaves no room for another publication from it`,
        observed: ceiling.family_share,
        required: TOP_PROVIDER_FAMILY_SHARE_MAX,
      });
    }
    missingEvidence.push({
      field: "inventory.active_total",
      why: "share room is a ratio of this board's active rows to a ceiling, so it is reported as the row count it is; it is the denominator of the shares above, not a threshold of its own",
      observed: ceiling.active_total,
      required: null,
    });
    nextAction = {
      description: "re-measure both share ceilings against the current inventory; the producer is other sources publishing or existing rows leaving the active board, not further observations from this cohort, and no share ceiling may be raised",
      produces_field: ceiling.binding === "TOP_SOURCE_SHARE_MAX"
        ? "inventory.source_share"
        : ceiling.binding === "TOP_PROVIDER_FAMILY_SHARE_MAX"
          ? "inventory.family_share"
          : "inventory.active_total",
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
    concentration_ceiling: ceiling,
    concentration_relief: relief,
    hold_discipline: checkHoldDiscipline(observation),
    reason: decision.reason,
  };
}

// ─── Reject resolution: which branch refused, and what evidence could change it ─

/**
 * Which of `decideAutoPublish`'s three reject branches produced a decision.
 *
 * The order mirrors the function's own: an opt-out is refused before the sample
 * is looked at, and a raw rate under the reject floor is refused before any
 * advisory verdict is consulted. `JEV_ADVISORY_REJECT` is therefore the residual
 * case — a cohort that cleared the reject floor, sat inside the ambiguous band
 * and was refused by a confident advisory verdict.
 */
export type RejectCause =
  | "OPT_OUT"
  | "PH_RATE_BELOW_REJECT_FLOOR"
  | "JEV_ADVISORY_REJECT"
  | "NOT_REJECTED";

export interface RejectResolution {
  source_id: string;
  provider_family: string;
  action: AutoPublishDecision["action"];
  reject_cause: RejectCause;
  /**
   * True when `reject_cause` and `action` describe the same decision, both read
   * against the input's own branch conditions. A caller that pairs a decision
   * with the wrong input — a stale record replayed against a current cohort —
   * sees this go false instead of reading a cause that does not belong to it.
   */
  cause_agrees_with_decision: boolean;
  /**
   * The raw PH rate `decideAutoPublish` compares against its floors, measured on
   * the same normalized sample the policy function used. It is reported here
   * because the decision object discards it.
   *
   * `qualified_ready > total_jobs` is caller-reachable, and the policy function
   * computes this ratio from the unclamped numerator, so the rate can exceed 1.
   * `ph_rate_exceeds_one` reports that rather than hiding it; no gate is added.
   */
  ph_rate: number | null;
  ph_rate_exceeds_one: boolean;
  /** The rate the decision refused, or the advisory confidence it refused. */
  observed_against_floor: number | null;
  /**
   * The floor `observed_against_floor` was compared against, read from the module
   * that owns it. `observed_against_floor` and `reject_floor` always share units
   * within one cause: both are rates, or both are confidences. Null for an
   * opt-out, which compares against no floor.
   */
  reject_floor: number | null;
  /** `reject_floor - observed_against_floor`, only when the observed value is below it. */
  below_floor_by: number | null;
  wilson_lower: number | null;
  /**
   * Whether further permitted observations can change this outcome. True only for
   * a rate reject, where the rate is computed from a sample that can grow. False
   * for an advisory reject, which a new verdict resolves rather than an
   * observation, and false for an opt-out, which no observation resolves.
   */
  resolution_requires_new_observations: boolean;
  /** The decision's own concentration field, `UNKNOWN` on every reject path. */
  decision_concentration: AutoPublishDecision["concentration"];
  /**
   * True when the decision reports `UNKNOWN` concentration although a measurable
   * snapshot was supplied, so a reader cannot tell an unmeasured share from a
   * rejected source that is at its ceiling.
   */
  concentration_unknown_despite_snapshot: boolean;
  /** Both share ceilings measured on the snapshot, independent of the reject. */
  concentration_ceiling: ConcentrationCeiling;
  missing_evidence: MissingEvidenceItem[];
  next_action: NextEvidenceAction | null;
  /** Always false, exactly as on a hold: a reject resolves with evidence, not with a moved floor. */
  floor_lowering_required: false;
  reason: string;
}

/**
 * Describe a real `REJECT` decision: which branch refused it, what it was
 * measured against, and what evidence could change it.
 *
 * This names evidence. It never moves a floor, never re-runs the decision with
 * different inputs, and never treats a reject as a hold: an opt-out stays an
 * opt-out, and `deriveHoldResolution` remains the projection that owns a held
 * cohort's evidence. A non-rejecting decision yields `NOT_REJECTED` with no
 * missing evidence, so this projection and `deriveHoldResolution` cannot report
 * conflicting scopes for the same decision.
 */
export function describeReject(
  input: AutoPublishInput,
  decision: AutoPublishDecision,
): RejectResolution {
  const sample = normalizeSample(input);
  // The policy function's own ratio: normalized `qualified_ready` over normalized
  // `total_jobs`, unclamped, and only reached after the sample floor is met.
  const phRate = sample.total_jobs > 0 ? sample.qualified_ready / sample.total_jobs : null;

  // The branch this input selects, read from the same conditions the policy
  // function tests in the same order, so a stale decision paired with a current
  // input is visible rather than silently re-labelled.
  const jevConfident = (input.jevConfidence ?? 0) >= JEV_MIN_CONFIDENCE;
  const impliedCause: RejectCause = input.optOut === true
    ? "OPT_OUT"
    : sample.qualified_ready <= 0 || sample.total_jobs < MIN_JOBS_FOR_RATE
      ? "NOT_REJECTED"
      : phRate !== null && phRate < REJECT_PH_RATE_FLOOR
        ? "PH_RATE_BELOW_REJECT_FLOOR"
        : jevConfident && input.jevChoice === "REJECT"
          ? "JEV_ADVISORY_REJECT"
          : "NOT_REJECTED";
  const cause: RejectCause = decision.action === "REJECT" ? impliedCause : "NOT_REJECTED";

  const missingEvidence: MissingEvidenceItem[] = [];
  let nextAction: NextEvidenceAction | null = null;
  let requiresObservations = false;
  let observed: number | null = null;
  let floor: number | null = null;

  if (cause === "PH_RATE_BELOW_REJECT_FLOOR") {
    observed = phRate;
    floor = REJECT_PH_RATE_FLOOR;
    requiresObservations = true;
    missingEvidence.push({
      field: "cohort.ph_rate",
      why: "the cohort's PH rate is below the existing reject floor, so the deterministic gate refuses it before any advisory verdict is consulted",
      observed: phRate,
      required: REJECT_PH_RATE_FLOOR,
    });
    missingEvidence.push({
      field: "cohort.total_jobs",
      why: "the floor is applied to a rate over a sample, so the sample is the evidence that can move it; no finite observation count is named by current authority and none is invented here",
      observed: sample.total_jobs,
      required: null,
    });
    nextAction = {
      description: "observe further permitted postings from this source and re-run the existing decision; the reject floor is not lowered, and a deterministic rate reject is not rescued through the ambiguous band",
      produces_field: "cohort.total_jobs",
      owner_role: "MAINTAINER",
      trigger: "new permitted observations land in the lake, or the cohort ages past its review deadline",
    };
  } else if (cause === "JEV_ADVISORY_REJECT") {
    observed = input.jevConfidence ?? null;
    floor = JEV_MIN_CONFIDENCE;
    missingEvidence.push({
      field: "jev.choice",
      why: "the cohort cleared the reject floor and sat inside the ambiguous band, where a recorded advisory verdict at or above the confidence floor is the only evidence that decides it; the verdict recorded here refused",
      observed: input.jevChoice ?? null,
      required: JEV_MIN_CONFIDENCE,
    });
    nextAction = {
      description: "request one bounded advisory verdict for this cohort and record its choice and confidence with the sample it judged; the verdict is advisory and is never itself a publication authority",
      produces_field: "jev.choice",
      owner_role: "MAINTAINER",
      trigger: "the cohort is still inside the ambiguous band at the next decision epoch",
    };
  }

  const ceiling = describeConcentrationCeiling(input.sourceId, input.inventory);

  return {
    source_id: input.sourceId,
    provider_family: providerFamily(input.sourceId),
    action: decision.action,
    reject_cause: cause,
    cause_agrees_with_decision:
      cause === impliedCause && (decision.action === "REJECT") === (impliedCause !== "NOT_REJECTED"),
    ph_rate: phRate,
    ph_rate_exceeds_one: phRate !== null && phRate > 1,
    observed_against_floor: observed,
    reject_floor: floor,
    below_floor_by: observed !== null && floor !== null && observed < floor ? floor - observed : null,
    wilson_lower: sample.wilson_lower,
    resolution_requires_new_observations: requiresObservations,
    decision_concentration: decision.concentration,
    concentration_unknown_despite_snapshot:
      decision.concentration === "UNKNOWN" && ceiling.measurable,
    concentration_ceiling: ceiling,
    missing_evidence: missingEvidence,
    next_action: nextAction,
    floor_lowering_required: false,
    reason: decision.reason,
  };
}

/**
 * Whether two decisions are distinguishable without reading their prose.
 *
 * Compared with the `reason` string removed and the remaining fields serialized in
 * a fixed key order. Two refusals that differ only in which branch produced them
 * are field-identical, so an auditor reading the recorded decision — or the single
 * console line `planAutoPublishSources` writes for it — cannot recover the cause
 * from the record.
 */
export function decisionsAreIndistinguishableWithoutReason(
  a: AutoPublishDecision,
  b: AutoPublishDecision,
): boolean {
  const strip = (decision: AutoPublishDecision): string => JSON.stringify([
    decision.action,
    decision.publishCount,
    decision.wilsonLower,
    decision.concentration,
  ]);
  return strip(a) === strip(b) && a.reason !== b.reason;
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