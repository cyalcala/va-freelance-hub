// SSAE-06 measurement-contract adoption — one versioned replay-and-latency receipt.
//
// Three separate definitions of "we replayed the affected cohort" and "the replay
// was fast" already exist in this repository:
//
//   * SSAE-09 (`job-delta-replay.ts`) proves snapshot coverage, selects the exact
//     affected cohort, names every hold and returns a content-addressed cursor.
//   * MATH-09/10 (`observation-clocks.ts`) owns the distinct clocks a replay must
//     not renew.
//   * MATH-13 (`stage-latency.ts`) measures the stage transitions with named
//     denominators and refuses D1 sync as visibility.
//
// Each is correct on its own and none of them knows about the other two. A future
// runtime claim about replay coverage *and* replay latency therefore has to be
// assembled by hand from three separately-versioned receipts, and nothing checks
// that they were measured over the same population. This module binds them into a
// single deterministic, content-addressed receipt that names the contradictions
// instead of hiding them.
//
// Hard properties of the receipt:
//   * every number is either recomputed from real repo code or compared against
//     what that code produced; nothing is asserted that cannot be re-derived;
//   * an aggregate that cannot be reproduced from its own observations is a
//     high-severity finding, not a silently trusted input;
//   * absence is never evidence: unknown coverage yields UNKNOWN, never a grade;
//   * a serving-store write is never public visibility;
//   * no target is claimed: `slo_status` is always PROPOSED_UNACCEPTED because no
//     latency target exists in docs/ACCEPTED_PARAMETERS.yaml;
//   * the receipt describes a measurement. It performs no write, so it cannot
//     grant or deny publication authority, and it resolves no MATH item.

import { hashString } from "../../packages/scraper/contentHash";
import {
  checkHoldDiscipline,
  checkObservation,
  isEndToEndTransition,
  refuseSyncAsVisibility,
  summarize,
  STAGE_LATENCY_VERSION,
  type FlowCohort,
  type LatencyObservation,
  type LatencyReceipt,
  type PercentileSummary,
} from "./stage-latency";
import { OBSERVATION_CLOCKS_VERSION } from "./observation-clocks";
import {
  proveCompleteSnapshot,
  SSAE_09_CONTRACT_VERSION,
  type ExactReplayPlan,
  type MaterialFieldName,
  type RecordCohort,
} from "./job-delta-replay";

export const REPLAY_LATENCY_RECEIPT_VERSION = 1;

/** How much of the receipt is actually supported by its own evidence. */
export type EvidenceGrade =
  | "END_TO_END_MEASURED"
  | "PARTIAL"
  | "WITHHELD"
  | "UNKNOWN";

export type FindingSeverity = "info" | "medium" | "high";

export interface ReceiptFinding {
  code: string;
  severity: FindingSeverity;
  detail: string;
  /** Affected identities, sorted, capped; a count is carried separately. */
  identities: string[];
  affected_count: number;
}

export interface CoverageAgreement {
  /** Coverage re-proved from the identities the replay snapshot actually held. */
  complete: boolean;
  coverage_unknown: boolean;
  absence_derived_actions_permitted: boolean;
  replay_observed: number;
  replay_expected: number | null;
  replay_missing_identities: string[];
  replay_unexpected_identities: string[];
  /** `plan.snapshot` agreed with the re-proof. */
  snapshot_proof_reproducible: boolean;
  window_observed: number;
  window_missing_identities: string[];
  /** Observed in the latency window but not covered by the replay snapshot. */
  only_in_window: string[];
  /** Covered by the replay snapshot but not observed in the latency window. */
  only_in_replay: string[];
  population:
    | "SAME"
    | "WINDOW_EXCEEDS_REPLAY"
    | "REPLAY_EXCEEDS_WINDOW"
    | "DISJOINT"
    | "UNKNOWN";
}

export interface ReplaySummary {
  permitted: boolean;
  version_transition: string;
  cohort_digest: string;
  batch_size: number;
  complete: boolean;
  cursor_id: string | null;
  cursor_position: number | null;
  cursor_total: number | null;
  cursor_open_without_remaining_batch: boolean;
  /** Distinct record cohorts the plan actually names, batch plus holds. */
  cohorts_in_plan: RecordCohort[];
  absence_derived_actions_permitted: boolean;
  preserves_original_clocks: true;
}

export interface HoldSummary {
  replay_holds: number;
  positive_state_holds: number;
  replay_hold_identities: string[];
  /** Distinct material fields the replay held on. */
  named_gaps: MaterialFieldName[];
  /**
   * True when at least one hold named no specific field and the field scope had to
   * come from the dependency closure instead. The hold is still bounded, but its
   * scope is the closure's rather than the record's.
   */
  gaps_taken_from_closure: boolean;
  /** Expected, held records the same latency window does not observe at all. */
  holds_absent_from_window: string[];
  /** Positive-state holds that the same latency window also measures. */
  holds_in_window: number;
  /** Holds present in the window whose named-next-action discipline fails. */
  holds_without_next_action: string[];
}

export interface LatencySummary {
  items: number;
  accepted: number;
  refused_inconsistent: number;
  refused_rediscovery: number;
  hold_discipline_defects: number;
  end_to_end_observed: number;
  end_to_end_denominator: number;
  end_to_end_coverage_ratio: number | null;
  end_to_end: PercentileSummary | null;
  /** `plan.snapshot`-independent aggregate reproduced from the observations. */
  aggregate_reproducible: boolean;
  /** Flow cohorts present in the window, kept separate rather than merged. */
  cohorts: FlowCohort[];
  /** Fresh first-publications only, per the accepted cohort separation rule. */
  fresh_first_publications: number;
  /**
   * Items with a publication decision or serving-store write and no verified
   * public visibility clock. A store write is never publication.
   */
  d1_synced_not_visible: number;
  /** Observations whose report clock is not their first-report clock. */
  freshness_reset_attempts: number;
  freshness_reset_identities: string[];
  expired_before_visible: number;
  expired_deadline_unknown: number;
}

export interface ReplayLatencyReceipt {
  receipt_version: number;
  window_manila_day: string;
  generated_at: string | null;
  versions: {
    replay_latency_receipt: number;
    ssae_09_contract: number;
    stage_latency: number;
    observation_clocks: number;
  };
  coverage: CoverageAgreement;
  replay: ReplaySummary;
  holds: HoldSummary;
  latency: LatencySummary;
  evidence_grade: EvidenceGrade;
  grade_reasons: string[];
  findings: ReceiptFinding[];
  claims_permitted: string[];
  claims_forbidden: string[];
  slo_status: "PROPOSED_UNACCEPTED";
  digest: string;
}

export interface ReplayLatencyReceiptInput {
  /** Complete Asia/Manila day the latency samples belong to. Recorded, not derived. */
  window_manila_day: string;
  replay_plan: ExactReplayPlan;
  /** The identities the replay snapshot actually contained. Re-proves coverage. */
  replay_identities: readonly string[];
  /** Coverage evidence given to the plan. null means UNKNOWN coverage. */
  expected_identities: readonly string[] | null;
  latency_observations: readonly LatencyObservation[];
  latency_receipt: LatencyReceipt;
  now_timestamp: string | null;
  generated_at?: string | null;
}

const MAX_LISTED_IDENTITIES = 20;

function capped(ids: string[]): string[] {
  return [...ids].sort().slice(0, MAX_LISTED_IDENTITIES);
}

function ms(value: string | null): number | null {
  if (value === null) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function endToEndTransition(
  receipt: LatencyReceipt,
): LatencyReceipt["transitions"][number] | null {
  return receipt.transitions.find((row) => isEndToEndTransition(row.transition)) ?? null;
}

function samePercentiles(a: PercentileSummary | null, b: PercentileSummary | null): boolean {
  if (a === null || b === null) return a === b;
  return a.n === b.n && a.p50 === b.p50 && a.p90 === b.p90 && a.p95 === b.p95;
}

/**
 * Bind one replay plan and one latency window into a single receipt.
 *
 * Every cross-definition fact is recomputed from the two real modules rather than
 * copied from either aggregate, so a fabricated or stale aggregate shows up as a
 * high-severity finding instead of silently becoming evidence.
 */
export function buildReplayLatencyReceipt(
  input: ReplayLatencyReceiptInput,
): ReplayLatencyReceipt {
  const plan = input.replay_plan;
  const findings: ReceiptFinding[] = [];

  const add = (
    code: string,
    severity: FindingSeverity,
    detail: string,
    identities: string[] = [],
  ): void => {
    const all = [...new Set(identities)].sort();
    findings.push({
      code,
      severity,
      detail,
      identities: capped(all),
      affected_count: all.length,
    });
  };

  // ── Coverage: re-prove it from the snapshot the replay actually held ─────────
  const reproof = proveCompleteSnapshot(input.replay_identities, input.expected_identities);
  const snapshot_proof_reproducible =
    reproof.complete === plan.snapshot.complete &&
    reproof.coverage_unknown === plan.snapshot.coverage_unknown &&
    reproof.absence_derived_actions_permitted === plan.snapshot.absence_derived_actions_permitted &&
    reproof.observed === plan.snapshot.observed &&
    reproof.missing_identities.join(",") === plan.snapshot.missing_identities.join(",") &&
    reproof.unexpected_identities.join(",") === plan.snapshot.unexpected_identities.join(",");

  const windowIdentities = [
    ...new Set(input.latency_observations.map((o) => o.identity_hash)),
  ].sort();
  const windowSet = new Set(windowIdentities);
  const replaySet = new Set(input.replay_identities);
  const onlyInWindow = reproof.coverage_unknown
    ? []
    : windowIdentities.filter((id) => !replaySet.has(id));
  const onlyInReplay = reproof.coverage_unknown
    ? []
    : [...replaySet].filter((id) => !windowSet.has(id)).sort();

  let population: CoverageAgreement["population"];
  if (reproof.coverage_unknown) population = "UNKNOWN";
  else if (onlyInWindow.length === 0 && onlyInReplay.length === 0) population = "SAME";
  else if (onlyInWindow.length === 0) population = "REPLAY_EXCEEDS_WINDOW";
  else if (onlyInReplay.length === 0) population = "WINDOW_EXCEEDS_REPLAY";
  else population = "DISJOINT";

  const coverage: CoverageAgreement = {
    complete: reproof.complete,
    coverage_unknown: reproof.coverage_unknown,
    absence_derived_actions_permitted: reproof.absence_derived_actions_permitted,
    replay_observed: reproof.observed,
    replay_expected: reproof.expected,
    replay_missing_identities: reproof.missing_identities,
    replay_unexpected_identities: reproof.unexpected_identities,
    snapshot_proof_reproducible,
    window_observed: windowIdentities.length,
    window_missing_identities: windowIdentities,
    only_in_window: onlyInWindow,
    only_in_replay: onlyInReplay,
    population,
  };

  if (!snapshot_proof_reproducible) {
    add(
      "SNAPSHOT_PROOF_NOT_REPRODUCIBLE",
      "high",
      "the replay plan's coverage proof does not match the identities its own snapshot contained, so coverage for this plan is UNKNOWN",
    );
  }
  if (reproof.coverage_unknown) {
    add(
      "COVERAGE_UNKNOWN",
      "high",
      "no coverage evidence was supplied: the snapshot is partial by assumption, so neither a replay coverage claim nor a latency coverage ratio is measurable",
    );
  } else if (!reproof.complete) {
    add(
      "SNAPSHOT_INCOMPLETE",
      "high",
      `replay snapshot coverage is incomplete: ${reproof.missing_identities.length} expected identities absent, ${reproof.unexpected_identities.length} unexpected`,
      [...reproof.missing_identities, ...reproof.unexpected_identities],
    );
  }
  if (population === "DISJOINT") {
    add(
      "POPULATION_DISJOINT",
      "high",
      "no identity appears in both the replay cohort and the latency window, so replay and latency describe different populations",
    );
  } else if (population !== "SAME" && population !== "UNKNOWN") {
    add(
      "POPULATION_DISAGREEMENT",
      "high",
      `the replay cohort and the latency window are different populations (${population}); latency percentiles measured here do not describe the replayed records`,
      [...onlyInWindow, ...onlyInReplay],
    );
  }

  // ── Replay summary, checked for internal consistency ─────────────────────────
  const cursor = plan.next_cursor;
  const cursor_open_without_remaining_batch =
    cursor !== null && plan.batch.length === 0 && !plan.complete;

  const replay: ReplaySummary = {
    permitted: plan.permitted,
    version_transition: plan.version_transition,
    cohort_digest: plan.cohort_digest,
    batch_size: plan.batch.length,
    complete: plan.complete,
    cursor_id: cursor?.cursor_id ?? null,
    cursor_position: cursor?.position ?? null,
    cursor_total: cursor?.total ?? null,
    cursor_open_without_remaining_batch,
    cohorts_in_plan: [
      ...new Set([...plan.batch, ...plan.holds].map((record) => record.cohort)),
    ].sort(),
    absence_derived_actions_permitted: plan.withdrawal_propagation.absence_derived_actions_permitted,
    preserves_original_clocks: plan.preserves_original_clocks,
  };

  if (!plan.permitted) {
    add(
      "REPLAY_NOT_PERMITTED",
      "medium",
      "the plan refuses itself (no budget, no version transition, or a cursor that does not match this cohort): no replay coverage or latency claim may be drawn from it",
    );
  }
  if (cursor_open_without_remaining_batch) {
    add(
      "CURSOR_OPEN_WITH_EMPTY_BATCH",
      "medium",
      "the plan reports an open cursor while returning no records, so a restart would stall without naming a reason",
    );
  }
  if (plan.withdrawal_propagation.absence_derived_actions_permitted === false) {
    add(
      "ABSENCE_DERIVED_ACTIONS_DISABLED",
      "info",
      "absence-derived writes are disabled for this snapshot; only records actually observed can produce a serving-store action",
    );
  }

  // ── Holds: every hold names its gap and its next evidence action ────────────
  const observationsByIdentity = new Map<string, LatencyObservation>();
  for (const observation of input.latency_observations) {
    observationsByIdentity.set(observation.identity_hash, observation);
  }

  const namedGaps = new Set<MaterialFieldName>();
  let gapsTakenFromClosure = false;
  for (const hold of plan.holds) {
    if (hold.missing_critical_fields.length === 0) {
      // A closure such as PARSER invalidates every retained fact; the field scope
      // exists but belongs to the closure, not to this record's own unknowns.
      if (plan.closure.invalidated_fields.length === 0) {
        add(
          "REPLAY_HOLD_WITHOUT_FIELD_SCOPE",
          "high",
          `held record ${hold.identity_hash} names neither a missing material field nor a closure that invalidates one, so no evidence would resolve the hold`,
          [hold.identity_hash],
        );
      } else {
        gapsTakenFromClosure = true;
      }
      for (const field of plan.closure.invalidated_fields) namedGaps.add(field);
    } else {
      for (const field of hold.missing_critical_fields) namedGaps.add(field);
    }
  }

  const holdsInWindow = plan.holds.filter((h) => observationsByIdentity.has(h.identity_hash));
  const holdsAbsentFromWindow = plan.holds
    .filter((h) => !observationsByIdentity.has(h.identity_hash))
    .map((h) => h.identity_hash);
  const holdsWithoutNextAction: string[] = [];
  for (const hold of holdsInWindow) {
    const observation = observationsByIdentity.get(hold.identity_hash);
    if (!observation) continue;
    const discipline = checkHoldDiscipline(observation);
    if (discipline.held && !discipline.valid) holdsWithoutNextAction.push(hold.identity_hash);
  }

  const holds: HoldSummary = {
    replay_holds: plan.holds.length,
    positive_state_holds: plan.holds.filter((h) => h.is_positive_state).length,
    replay_hold_identities: capped(plan.holds.map((h) => h.identity_hash)),
    named_gaps: [...namedGaps].sort(),
    gaps_taken_from_closure: gapsTakenFromClosure,
    holds_absent_from_window: capped(holdsAbsentFromWindow),
    holds_in_window: holdsInWindow.length,
    holds_without_next_action: capped(holdsWithoutNextAction),
  };

  if (holdsWithoutNextAction.length > 0) {
    add(
      "REPLAY_HOLD_WITHOUT_NEXT_EVIDENCE_ACTION",
      "high",
      "a held record carries no named next evidence-producing action in the latency window, so the hold has no route to resolution",
      holdsWithoutNextAction,
    );
  }
  if (holdsAbsentFromWindow.length > 0) {
    add(
      "REPLAY_HOLD_NOT_IN_WINDOW",
      "medium",
      `${holdsAbsentFromWindow.length} held record(s) are not observed in this window, so hold-to-next-evidence latency is unmeasured for them and they cannot be resolved by this receipt`,
      holdsAbsentFromWindow,
    );
  }

  // ── Latency: reproduce the aggregate from its own observations ──────────────
  const samples: number[] = [];
  let accepted = 0;
  let refusedInconsistent = 0;
  let refusedRediscovery = 0;
  let holdDefects = 0;
  let d1SyncedNotVisible = 0;
  const freshnessResetIdentities: string[] = [];

  for (const observation of input.latency_observations) {
    const check = checkObservation(observation);
    if (!check.accepted) {
      if (check.reasons.includes("REDISCOVERY_REPORT_CANNOT_RESET_LATENCY")) {
        refusedRediscovery += 1;
        freshnessResetIdentities.push(observation.identity_hash);
      } else {
        refusedInconsistent += 1;
        if (check.reasons.some((r) => r.startsWith("HOLD_"))) holdDefects += 1;
      }
    } else {
      accepted += 1;
    }

    // A store write or publication decision exists but no verified public
    // visibility clock does: refuseSyncAsVisibility catches a *claimed*
    // visibility without a receipt, and the clock check catches the silent case
    // where no visibility was ever claimed at all.
    const refusedAsVisibility = refuseSyncAsVisibility(observation);
    const decided = ms(observation.publication_decided_at) !== null;
    const synced = ms(observation.d1_synced_at) !== null;
    if (refusedAsVisibility.refused || ((decided || synced) && ms(observation.public_visible_at) === null)) {
      d1SyncedNotVisible += 1;
    }

    const reported = ms(observation.reported_at);
    const visible = ms(observation.public_visible_at);
    if (reported !== null && visible !== null) samples.push(visible - reported);
  }

  const recomputed = summarize(samples);
  const reportedRow = endToEndTransition(input.latency_receipt);
  const aggregateReproducible =
    reportedRow !== null && samePercentiles(recomputed, reportedRow.summary);

  const latency: LatencySummary = {
    items: input.latency_observations.length,
    accepted,
    refused_inconsistent: refusedInconsistent,
    refused_rediscovery: refusedRediscovery,
    hold_discipline_defects: holdDefects,
    end_to_end_observed: recomputed?.n ?? 0,
    end_to_end_denominator: reportedRow?.denominator ?? 0,
    end_to_end_coverage_ratio: reportedRow?.coverage_ratio ?? null,
    end_to_end: recomputed,
    aggregate_reproducible: aggregateReproducible,
    cohorts: [
      ...new Set(input.latency_observations.map((o) => o.cohort)),
    ].sort(),
    fresh_first_publications: input.latency_receipt.cohorts
      .filter((row) => row.cohort === "FRESH_DISCOVERY")
      .reduce((sum, row) => sum + row.fresh_first_publication, 0),
    d1_synced_not_visible: d1SyncedNotVisible,
    freshness_reset_attempts: freshnessResetIdentities.length,
    freshness_reset_identities: capped(freshnessResetIdentities),
    expired_before_visible: input.latency_receipt.expired_before_visible,
    expired_deadline_unknown: input.latency_receipt.expired_deadline_unknown,
  };

  if (!aggregateReproducible) {
    add(
      "LATENCY_AGGREGATE_NOT_REPRODUCIBLE",
      "high",
      "the reported end-to-end distribution does not match the observations it claims to summarize, so the reported percentiles are not evidence",
    );
  }
  if (d1SyncedNotVisible > 0) {
    add(
      "SERVING_STORE_WRITE_NOT_VISIBILITY",
      "info",
      `${d1SyncedNotVisible} observation(s) carry a publication decision or serving-store write with no verified public visibility clock; a D1 sync is never counted as public publication`,
    );
  }
  if (freshnessResetIdentities.length > 0) {
    add(
      "FRESHNESS_RESET_ATTEMPT",
      "high",
      "an observation's report clock is not its first-report clock, which would make a re-report look like a new first report and reset measured latency",
      freshnessResetIdentities,
    );
  }
  if (holdDefects > 0) {
    add(
      "HOLD_DISCIPLINE_DEFECT",
      "high",
      `${holdDefects} observation(s) are held without named missing evidence or a next evidence-producing action`,
    );
  }
  if (input.latency_receipt.expired_before_visible > 0) {
    add(
      "EXPIRED_BEFORE_VISIBLE",
      "medium",
      `${input.latency_receipt.expired_before_visible} item(s) became visible past their freshness deadline; they are inventory, never fresh flow`,
    );
  }
  if (input.latency_receipt.expired_deadline_unknown > 0) {
    add(
      "FRESHNESS_DEADLINE_UNKNOWN",
      "medium",
      `${input.latency_receipt.expired_deadline_unknown} visible item(s) have an unknown freshness deadline; flow eligibility is UNKNOWN, not passed`,
    );
  }
  if ((recomputed?.n ?? 0) === 0) {
    add(
      "END_TO_END_UNMEASURED",
      "medium",
      "no observation has both a report clock and a verified public visibility clock, so no end-to-end distribution can be reported; component timings must not be summed into one",
    );
  }
  if ((reportedRow?.denominator ?? 0) === 0) {
    add(
      "END_TO_END_DENOMINATOR_ZERO",
      "medium",
      "the end-to-end denominator is zero, so a coverage ratio would be undefined rather than perfect",
    );
  }

  // ── Grade, claims, digest ───────────────────────────────────────────────────
  const gradeReasons: string[] = [];
  let evidenceGrade: EvidenceGrade;
  const hasHigh = findings.some((f) => f.severity === "high");

  if (coverage.coverage_unknown) {
    evidenceGrade = "UNKNOWN";
    gradeReasons.push("coverage is UNKNOWN, so the measured population is not established");
  } else if ((recomputed?.n ?? 0) === 0) {
    evidenceGrade = "WITHHELD";
    gradeReasons.push("no end-to-end sample exists, so no distribution is reported rather than a zero one");
  } else if (hasHigh || coverage.population !== "SAME") {
    evidenceGrade = "PARTIAL";
    gradeReasons.push("end-to-end samples exist but at least one high-severity finding or a population disagreement limits the claim");
  } else {
    evidenceGrade = "END_TO_END_MEASURED";
    gradeReasons.push("the end-to-end distribution is reproducible from its observations over a complete, identical population");
  }

  const claimsPermitted: string[] = [];
  const claimsForbidden: string[] = [
    "this receipt does not establish any latency target, cadence or SLO achievement; slo_status is PROPOSED_UNACCEPTED",
    "this receipt does not grant, widen or satisfy publication authority, and no decision class moves above L1 ADVISE",
    "this receipt does not resolve a MATH or SSAE card and accepts no new parameter",
  ];

  if (evidenceGrade === "END_TO_END_MEASURED") {
    claimsPermitted.push(
      `end-to-end report-to-verified-visibility distribution over ${recomputed?.n ?? 0} observed item(s) in Manila day ${input.window_manila_day}, cohort ${coverage.population}, denominator ${latency.end_to_end_denominator}`,
    );
  } else {
    claimsForbidden.push(
      `no end-to-end latency claim is permitted from this window (grade ${evidenceGrade})`,
    );
  }
  if (coverage.complete && coverage.population === "SAME" && plan.permitted) {
    claimsPermitted.push(
      `replay coverage over a complete snapshot: ${plan.snapshot.observed} observed of ${plan.snapshot.expected} expected, cohort digest ${plan.cohort_digest}`,
    );
  } else {
    claimsForbidden.push(
      "no replay coverage claim is permitted from this receipt: coverage or cohort agreement is not established",
    );
  }
  if (plan.holds.length > 0) {
    claimsPermitted.push(
      `${plan.holds.length} record(s) are held for missing evidence on: ${holds.named_gaps.join(", ") || "(gap not named — see findings)"}`,
    );
  }
  if (latency.refused_rediscovery > 0) {
    claimsForbidden.push(
      "a re-reported item's latency must not be reported as a new first-report latency",
    );
  }
  if (latency.d1_synced_not_visible > 0) {
    claimsForbidden.push("a serving-store write is not public visibility and is not counted as publication");
  }
  const nonFresh = latency.cohorts.filter((c) => c !== "FRESH_DISCOVERY");
  if (nonFresh.length > 0) {
    claimsForbidden.push(
      `cohorts ${nonFresh.join(", ")} are not fresh flow and are not reported as such; only ${latency.fresh_first_publications} fresh first-publication(s) in this window qualify`,
    );
  }
  if (latency.expired_before_visible > 0 || latency.expired_deadline_unknown > 0) {
    claimsForbidden.push(
      `${latency.expired_before_visible} expired-before-visible and ${latency.expired_deadline_unknown} unknown-deadline item(s) are inventory, never fresh flow`,
    );
  }

  const receipt: ReplayLatencyReceipt = {
    receipt_version: REPLAY_LATENCY_RECEIPT_VERSION,
    window_manila_day: input.window_manila_day,
    generated_at: input.generated_at ?? null,
    versions: {
      replay_latency_receipt: REPLAY_LATENCY_RECEIPT_VERSION,
      ssae_09_contract: SSAE_09_CONTRACT_VERSION,
      stage_latency: STAGE_LATENCY_VERSION,
      observation_clocks: OBSERVATION_CLOCKS_VERSION,
    },
    coverage,
    replay,
    holds,
    latency,
    evidence_grade: evidenceGrade,
    grade_reasons: gradeReasons,
    findings,
    claims_permitted: claimsPermitted,
    claims_forbidden: claimsForbidden,
    slo_status: "PROPOSED_UNACCEPTED",
    digest: "",
  };

  receipt.digest = receiptDigest(receipt);
  return receipt;
}

/**
 * Content address over everything a reader would act on. Field order is fixed, so
 * two receipts over the same evidence digest identically and any changed
 * definition changes the digest instead of silently producing a second truth.
 */
export function receiptDigest(receipt: ReplayLatencyReceipt): string {
  return hashString(
    [
      `v=${receipt.receipt_version}`,
      `defs=${receipt.versions.ssae_09_contract}/${receipt.versions.stage_latency}/${receipt.versions.observation_clocks}`,
      `window=${receipt.window_manila_day}`,
      `transition=${receipt.replay.version_transition}`,
      `population=${receipt.coverage.population}`,
      `coverage=${receipt.coverage.complete}/${receipt.coverage.coverage_unknown}/${receipt.coverage.replay_observed}/${receipt.coverage.replay_expected}`,
      `replay=${receipt.replay.permitted}/${receipt.replay.cohort_digest}/${receipt.replay.batch_size}/${receipt.replay.complete}/${receipt.replay.cursor_position}/${receipt.replay.cursor_total}`,
      `holds=${receipt.holds.replay_holds}/${receipt.holds.positive_state_holds}/${receipt.holds.named_gaps.join("|")}/${receipt.holds.gaps_taken_from_closure}/${receipt.holds.holds_absent_from_window.length}/${receipt.holds.holds_without_next_action.length}`,
      `latency=${receipt.latency.end_to_end_observed}/${receipt.latency.end_to_end_denominator}/${receipt.latency.end_to_end?.p95 ?? "none"}/${receipt.latency.d1_synced_not_visible}/${receipt.latency.freshness_reset_attempts}/${receipt.latency.expired_before_visible}/${receipt.latency.expired_deadline_unknown}`,
      `cohorts=${receipt.latency.cohorts.join(",") || "none"} fresh_first_publications=${receipt.latency.fresh_first_publications}`,
      `grade=${receipt.evidence_grade}`,
      `findings=${receipt.findings.map((f) => `${f.code}:${f.severity}:${f.affected_count}`).join("|")}`,
    ].join("\n"),
  );
}

/** True when a receipt's recorded digest still matches its own content. */
export function verifyReceiptDigest(receipt: ReplayLatencyReceipt): boolean {
  return receiptDigest(receipt) === receipt.digest;
}

/** Findings of one severity, for a caller's escalation path. */
export function findingsBySeverity(
  receipt: ReplayLatencyReceipt,
  severity: FindingSeverity,
): ReceiptFinding[] {
  return receipt.findings.filter((finding) => finding.severity === severity);
}

/** Deterministic human-readable rendering. Never reports a withheld number. */
export function formatReplayLatencyReceipt(receipt: ReplayLatencyReceipt): string {
  const lines: string[] = [];
  lines.push(`replay-latency receipt v${receipt.receipt_version} — Manila day ${receipt.window_manila_day}`);
  lines.push(
    `definitions: ssae-09=${receipt.versions.ssae_09_contract} stage-latency=${receipt.versions.stage_latency} observation-clocks=${receipt.versions.observation_clocks}`,
  );
  lines.push(
    `coverage: complete=${receipt.coverage.complete} unknown=${receipt.coverage.coverage_unknown} replay=${receipt.coverage.replay_observed}/${receipt.coverage.replay_expected ?? "?"} window=${receipt.coverage.window_observed} population=${receipt.coverage.population}`,
  );
  lines.push(
    `replay: permitted=${receipt.replay.permitted} transition=${receipt.replay.version_transition} batch=${receipt.replay.batch_size} complete=${receipt.replay.complete} digest=${receipt.replay.cohort_digest}`,
  );
  lines.push(
    `holds: ${receipt.holds.replay_holds} held (${receipt.holds.positive_state_holds} positive-state), gaps [${receipt.holds.named_gaps.join(", ")}]${receipt.holds.gaps_taken_from_closure ? " (scope from closure)" : ""}, in window ${receipt.holds.holds_in_window}, absent from window ${receipt.holds.holds_absent_from_window.length}, without next action ${receipt.holds.holds_without_next_action.length}`,
  );
  const summary = receipt.latency.end_to_end;
  lines.push(
    `latency end-to-end: ${summary === null ? "WITHHELD (no sample)" : `n=${summary.n} p50=${summary.p50}ms p90=${summary.p90}ms p95=${summary.p95}ms`} denominator=${receipt.latency.end_to_end_denominator} coverage=${receipt.latency.end_to_end_coverage_ratio ?? "UNDEFINED"}`,
  );
  lines.push(
    `also: accepted=${receipt.latency.accepted} refused_inconsistent=${receipt.latency.refused_inconsistent} freshness_reset=${receipt.latency.freshness_reset_attempts} d1_synced_not_visible=${receipt.latency.d1_synced_not_visible} expired_before_visible=${receipt.latency.expired_before_visible} deadline_unknown=${receipt.latency.expired_deadline_unknown}`,
  );
  lines.push(
    `cohorts: ${receipt.latency.cohorts.join(", ") || "none"}; fresh first-publications ${receipt.latency.fresh_first_publications} (backlog, replay and reactivation excluded)`,
  );
  lines.push(`grade: ${receipt.evidence_grade} — ${receipt.grade_reasons.join("; ")}`);
  for (const finding of receipt.findings) {
    const which = finding.affected_count > 0 ? ` (${finding.affected_count} identity/identities)` : "";
    lines.push(`  [${finding.severity}] ${finding.code}${which}: ${finding.detail}`);
  }
  for (const claim of receipt.claims_permitted) lines.push(`permitted: ${claim}`);
  for (const claim of receipt.claims_forbidden) lines.push(`forbidden: ${claim}`);
  lines.push(`slo_status: ${receipt.slo_status}`);
  lines.push(`digest: ${receipt.digest}`);
  return lines.join("\n");
}
