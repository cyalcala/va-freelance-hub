/**
 * Stage-transition latency and stage-transparency contract — scripts/lake/stage-latency.ts
 *
 * The v6.5 latency obligation that no session has delivered yet. The bootloader
 * requires: report->probe, probe->qualification, qualification->public
 * visibility, report->visibility and hold->next evidence reported at p50/p90/p95
 * with n/window/coverage, plus pending/oldest-ready age, stage dwell,
 * expired-before-visible, failures and blocked/censored denominators.
 *
 * What already exists and is deliberately NOT duplicated here:
 * - `scripts/lake/measurement-contracts.ts` records per-stage `LatencySpan`s and a
 *   `JobLatencyTrace`. It measures a *pipeline stage's own* duration. It does not
 *   derive the stage-to-stage transitions above, has no percentile aggregation,
 *   and has no pending/oldest-ready or censored denominators.
 * - `scripts/ci/queue-metrics.ts` reports percentiles for queue residence only.
 * - `scripts/lake/observation-clocks.ts` (this branch, session 4) owns the
 *   earliest-wins first-* clocks. This module consumes those clocks as inputs
 *   and never re-derives them; it refuses a non-first report instead.
 *
 * Scope guards, all enforced below:
 * - Pure. No writer import, no DB client, no network, no production mutation.
 * - No threshold, gate, verdict or SLO pass/fail is introduced. The v6.5 p95/p50
 *   targets are PROPOSED and are absent from `docs/ACCEPTED_PARAMETERS.yaml`, so
 *   this module reports distributions and coverage and evaluates nothing.
 * - D1 sync and a publication decision are NOT public visibility. An observation
 *   that claims visibility without a verified public receipt, or that places
 *   visibility before the serving-store write, is refused as inconsistent.
 * - Component p95s do not imply an end-to-end p95. End-to-end percentiles are
 *   computed only from directly observed per-item endpoints, and a partial cohort
 *   yields `null` with a named reason instead of an approximation.
 * - A missing timestamp is unknown, never substituted with a processing time or
 *   "now". Unknown endpoints are counted as `missing`, distinct from `pending`
 *   (started, terminal clock not yet observed = right-censored).
 * - A HOLD must name its missing evidence and a next evidence-producing action.
 *   A hold without both is surfaced as a governance defect, not reported as a
 *   legitimate hold.
 * - Fresh, replay, backlog and reactivation stay separate cohorts; a late
 *   visibility past its freshness deadline is counted as expired-before-visible
 *   and never as fresh supply.
 * - Nothing here grants publication authority, and no numeric publication gate is
 *   introduced. This is a measurement contract, not an enforcement point.
 *
 * Run: bun run scripts/lake/stage-latency.ts --report
 */

import {
  isValidPipelineStage,
  PIPELINE_STAGES,
  type PipelineStage,
} from "./measurement-contracts";

// ─── Types─────────────────────────────────────────────────────────────────────

/** Contract version; bump when field semantics change. */
export const STAGE_LATENCY_VERSION = 1;

/**
 * The v6.5 named stage transitions. `REPORT_TO_VISIBILITY` is end-to-end; the
 * rest are components or a hold path and must never be summed into it.
 */
export const STAGE_TRANSITIONS = [
  "REPORT_TO_PROBE",
  "PROBE_TO_QUALIFICATION",
  "QUALIFICATION_TO_VISIBILITY",
  "REPORT_TO_VISIBILITY",
  "HOLD_TO_NEXT_EVIDENCE",
] as const;

export type StageTransition = (typeof STAGE_TRANSITIONS)[number];

/** True for the single end-to-end transition; everything else is a component. */
export function isEndToEndTransition(transition: StageTransition): boolean {
  return transition === "REPORT_TO_VISIBILITY";
}

/**
 * Supply cohorts. Reactivation is an event on an existing publication, never a
 * first-publication cohort, so it is listed for separation, not for flow counting.
 */
export const FLOW_COHORTS = [
  "FRESH_DISCOVERY",
  "REPLAY_RECOVERY",
  "BACKLOG_IMPORT",
  "REACTIVATION",
] as const;

export type FlowCohort = (typeof FLOW_COHORTS)[number];

/**
 * How an observation ended. `NOT_VISIBLE` covers a decided or synced row that
 * never resolved publicly; `PENDING` is right-censored; `BLOCKED` is an
 * authority/permission/robots refusal; `FAILED` is a technical failure.
 */
export type TerminalState = "VISIBLE" | "NOT_VISIBLE" | "PENDING" | "BLOCKED" | "FAILED";

export const TERMINAL_STATES: ReadonlyArray<TerminalState> = [
  "VISIBLE",
  "NOT_VISIBLE",
  "PENDING",
  "BLOCKED",
  "FAILED",
];

/**
 * One canonical item's stage clocks. Timestamps must come from
 * `observation-clocks.ts` first-* fields; null is "not observed" and is retained.
 */
export interface LatencyObservation {
  /** Canonical identity hash; independent of material equality. */
  identity_hash: string;
  source_id: string;
  /** Conceptual service class label as reported. Never a new DB enum. */
  service_class: string | null;
  cohort: FlowCohort;
  terminal_state: TerminalState;

  /** First report of this identity. Must be the first-* report clock. */
  reported_at: string | null;
  /** First permitted probe of this identity. */
  first_probe_at: string | null;
  /** First qualification decision of record. */
  qualified_at: string | null;
  /** Publication decision in the governed mart. Explicitly NOT visibility. */
  publication_decided_at: string | null;
  /** Serving-store row written. Explicitly NOT visibility. */
  d1_synced_at: string | null;
  /** Public visibility time; only meaningful with `visibility_verified`. */
  public_visible_at: string | null;
  /** True only when the live public surface actually resolved the item. */
  visibility_verified: boolean;
  /** The first-report clock from the clock layer, used to catch a reset. */
  first_report_at: string | null;

  held_at: string | null;
  /** Named missing evidence for a hold. Null when not held. */
  hold_reason: string | null;
  /** The next evidence-producing action for a hold, or its resolution time. */
  next_evidence_action: string | null;
  next_evidence_at: string | null;

  /** Original source posting time. Null is retained, never substituted. */
  posted_at: string | null;
  /** Freshness deadline for flow eligibility. Null means the deadline is unknown. */
  freshness_deadline_at: string | null;

  /** Pipeline stage a technical failure occurred at, if any. */
  failure_stage: PipelineStage | null;
  failed_attempts: number;
}

/** A reported distribution. Percentiles are null unless n >= 1. */
export interface PercentileSummary {
  unit: "ms";
  n: number;
  p50: number | null;
  p90: number | null;
  p95: number | null;
}

/** Per-transition coverage in the measured window. */
export interface TransitionCoverage {
  transition: StageTransition;
  /** True only for `REPORT_TO_VISIBILITY`. */
  end_to_end: boolean;
  /** Items with both endpoints directly observed; the percentile sample. */
  observed: number;
  /** Started but the terminal clock is not yet observed (right-censored). */
  pending: number;
  /** Authority, permission or robots refusal; no latency sample is possible. */
  blocked: number;
  /** Technical failure before the terminal clock. */
  failed: number;
  /** An endpoint is genuinely unknown. Unknown, not zero. */
  missing: number;
  /** observed + pending + blocked + failed + missing. The named denominator. */
  denominator: number;
  /** observed / denominator; null when the denominator is 0. */
  coverage_ratio: number | null;
  /** Age of the oldest still-pending item, in ms. Null when nothing is pending. */
  oldest_pending_ms: number | null;
  /** Identity hash of that oldest pending item, for the named next action. */
  oldest_pending_identity: string | null;
  summary: PercentileSummary | null;
  /** Why no distribution is reported. Empty when a distribution is reported. */
  withheld_reason: string | null;
}

/** The full measured receipt for one window. */
export interface LatencyReceipt {
  contract_version: number;
  /** Measurement window: complete Asia/Manila day the samples belong to. */
  window_manila_day: string;
  /** ISO timestamp the report was produced at. Recorded, never substituted. */
  generated_at: string | null;
  /** Total observations supplied for the window. */
  items: number;
  transitions: TransitionCoverage[];
  /** Sum of per-stage dwell, grouped by pipeline stage. */
  stage_dwell: StageDwellRow[];
  cohorts: CohortRow[];
  /** Visible past its freshness deadline. Never counted as fresh supply. */
  expired_before_visible: number;
  /** Visible with an unknown freshness deadline; eligibility is unknown. */
  expired_deadline_unknown: number;
  /** Holds with no named missing evidence or no next evidence action. */
  hold_discipline_defects: number;
  /** Observations refused as internally inconsistent; excluded from all samples. */
  refused_inconsistent: number;
  /** Observations refused for a non-first report; excluded from all samples. */
  refused_rediscovery: number;
  failures: FailureRow[];
  /** Always PROPOSED_UNACCEPTED: no latency target exists in ACCEPTED_PARAMETERS. */
  slo_status: "PROPOSED_UNACCEPTED";
  /** Human-readable limitations. Never empty when a number is withheld. */
  limitations: string[];
}

export interface StageDwellRow {
  stage: PipelineStage;
  observations: number;
  total_ms: number;
  mean_ms: number | null;
  p95_ms: number | null;
}

export interface CohortRow {
  cohort: FlowCohort;
  observations: number;
  visible: number;
  pending: number;
  blocked: number;
  failed: number;
  /** Fresh first-publications: visible, verified, cohort FRESH_DISCOVERY, not expired. */
  fresh_first_publication: number;
}

export interface FailureRow {
  stage: PipelineStage | "NONE";
  failures: number;
}

/** Refusal detail for one observation. */
export interface ObservationCheck {
  accepted: boolean;
  reasons: string[];
}

/** The refusal a caller must accept instead of a synthetic end-to-end number. */
export interface ComponentRollup {
  usable: false;
  reason: string;
  /** The only defensible end-to-end basis. */
  required_basis: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isIso(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function ms(value: string | null): number | null {
  if (value === null) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Nearest-rank percentile over an ascending sample. Returns null for an empty
 * sample rather than 0, so an unreported quantile is never read as a fast one.
 */
function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  const rank = Math.ceil((p / 100) * sorted.length);
  const index = Math.min(sorted.length - 1, Math.max(0, rank - 1));
  return sorted[index];
}

export function summarize(samples: number[]): PercentileSummary | null {
  if (samples.length === 0) return null;
  const sorted = [...samples].sort((a, b) => a - b);
  return {
    unit: "ms",
    n: sorted.length,
    p50: percentile(sorted, 50),
    p90: percentile(sorted, 90),
    p95: percentile(sorted, 95),
  };
}

/** The endpoints each transition needs, and which of them are truly terminal. */
const TRANSITION_ENDPOINTS: Record<StageTransition, { from: keyof LatencyObservation; to: keyof LatencyObservation }> = {
  REPORT_TO_PROBE: { from: "reported_at", to: "first_probe_at" },
  PROBE_TO_QUALIFICATION: { from: "first_probe_at", to: "qualified_at" },
  QUALIFICATION_TO_VISIBILITY: { from: "qualified_at", to: "public_visible_at" },
  REPORT_TO_VISIBILITY: { from: "reported_at", to: "public_visible_at" },
  HOLD_TO_NEXT_EVIDENCE: { from: "held_at", to: "next_evidence_at" },
};

/**
 * A hold must name the specific missing evidence and the next evidence-producing
 * action. A hold with either missing is a governance defect, so it is surfaced
 * instead of being reported as a legitimate hold.
 */
export function checkHoldDiscipline(observation: LatencyObservation): { held: boolean; valid: boolean; reasons: string[] } {
  if (observation.held_at === null) return { held: false, valid: true, reasons: [] };
  const reasons: string[] = [];
  if (observation.hold_reason === null || observation.hold_reason.trim() === "") {
    reasons.push("HOLD_MISSING_EVIDENCE_NOT_NAMED");
  }
  if (observation.next_evidence_action === null || observation.next_evidence_action.trim() === "") {
    reasons.push("HOLD_WITHOUT_NEXT_EVIDENCE_ACTION");
  }
  return { held: true, valid: reasons.length === 0, reasons };
}

/**
 * Per-observation admission. An observation is refused when it claims public
 * visibility without a verified public receipt, places visibility before the
 * serving-store write, is internally ordered backwards, or carries a non-first
 * report clock (a rediscovery that would reset latency).
 */
export function checkObservation(observation: LatencyObservation): ObservationCheck {
  const reasons: string[] = [];

  if (typeof observation.identity_hash !== "string" || observation.identity_hash === "") {
    reasons.push("IDENTITY_REQUIRED");
  }
  if (typeof observation.source_id !== "string" || observation.source_id === "") {
    reasons.push("SOURCE_REQUIRED");
  }
  if (!FLOW_COHORTS.includes(observation.cohort)) {
    reasons.push("UNKNOWN_COHORT");
  }
  if (!TERMINAL_STATES.includes(observation.terminal_state)) {
    reasons.push("UNKNOWN_TERMINAL_STATE");
  }
  if (observation.failure_stage !== null && !isValidPipelineStage(observation.failure_stage)) {
    reasons.push("UNKNOWN_FAILURE_STAGE");
  }

  const reported = ms(observation.reported_at);
  const probe = ms(observation.first_probe_at);
  const qualified = ms(observation.qualified_at);
  const visible = ms(observation.public_visible_at);
  const synced = ms(observation.d1_synced_at);
  const held = ms(observation.held_at);

  if (observation.public_visible_at !== null && !observation.visibility_verified) {
    reasons.push("VISIBILITY_WITHOUT_VERIFIED_PUBLIC_RECEIPT");
  }
  if (visible !== null && synced !== null && visible < synced) {
    reasons.push("VISIBILITY_PRECEDES_SERVING_STORE_WRITE");
  }
  if (reported !== null && probe !== null && probe < reported) {
    reasons.push("PROBE_PRECEDES_REPORT");
  }
  if (probe !== null && qualified !== null && qualified < probe) {
    reasons.push("QUALIFICATION_PRECEDES_PROBE");
  }
  if (held !== null && visible !== null && held > visible) {
    reasons.push("HOLD_AFTER_VISIBILITY");
  }

  const posted = ms(observation.posted_at);
  if (posted !== null && visible !== null && visible < posted) {
    reasons.push("VISIBILITY_PRECEDES_SOURCE_POSTING_DATE");
  }

  // A later re-report must not become this item's latency origin.
  if (observation.first_report_at !== null) {
    const first = ms(observation.first_report_at);
    if (first !== null && reported !== null && reported !== first) {
      reasons.push("REDISCOVERY_REPORT_CANNOT_RESET_LATENCY");
    }
  }

  const hold = checkHoldDiscipline(observation);
  if (!hold.valid) reasons.push(...hold.reasons);

  return { accepted: reasons.length === 0, reasons };
}

/**
 * D1 sync and a publication decision are not public visibility. This is the
 * explicit refusal a caller gets instead of a synthesized visibility time.
 */
export function refuseSyncAsVisibility(
  observation: LatencyObservation,
): { refused: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (observation.public_visible_at !== null && !observation.visibility_verified) {
    reasons.push("D1_SYNC_OR_DECISION_IS_NOT_PUBLIC_VISIBILITY");
  }
  if (observation.terminal_state === "VISIBLE" && observation.public_visible_at === null) {
    reasons.push("VISIBLE_WITHOUT_A_PUBLIC_VISIBILITY_CLOCK");
  }
  return { refused: reasons.length > 0, reasons };
}

/**
 * Component p95s do not imply an end-to-end p95. This function exists so the
 * rule is executable rather than prose: it never returns a number.
 */
export function refuseComponentRollup(
  transition: StageTransition,
  components: Partial<Record<StageTransition, PercentileSummary | null>>,
): ComponentRollup {
  void components;
  return {
    usable: false,
    reason: `${transition} cannot be derived from component percentiles; component p95s do not imply an end-to-end p95`,
    required_basis: "directly observed per-item reported_at and public_visible_at",
  };
}

// ─── Aggregation ──────────────────────────────────────────────────────────────

interface Mutable {
  observed: number;
  pending: number;
  blocked: number;
  failed: number;
  missing: number;
  samples: number[];
  oldest_pending_ms: number | null;
  oldest_pending_identity: string | null;
}

function emptyMutable(): Mutable {
  return {
    observed: 0,
    pending: 0,
    blocked: 0,
    failed: 0,
    missing: 0,
    samples: [],
    oldest_pending_ms: null,
    oldest_pending_identity: null,
  };
}

function notePending(
  state: Mutable,
  observation: LatencyObservation,
  ageMs: number,
): void {
  state.pending += 1;
  if (state.oldest_pending_ms === null || ageMs > state.oldest_pending_ms) {
    state.oldest_pending_ms = ageMs;
    state.oldest_pending_identity = observation.identity_hash;
  }
}

/**
 * Aggregates accepted observations for one window into the measured receipt.
 *
 * `nowTimestamp` is used only to age items that are still pending. It never
 * fills a missing clock: an unknown endpoint stays `missing`.
 */
export function buildLatencyReceipt(
  windowManilaDay: string,
  observations: LatencyObservation[],
  options: { nowTimestamp: string | null; generatedAt?: string | null } = { nowTimestamp: null },
): LatencyReceipt {
  const now = ms(options.nowTimestamp ?? null);
  const nowIso = options.nowTimestamp ?? null;

  const transitions = new Map<StageTransition, Mutable>(STAGE_TRANSITIONS.map((t) => [t, emptyMutable()]));
  const dwell = new Map<PipelineStage, { total: number; samples: number[] }>();
  const cohorts = new Map<FlowCohort, CohortRow>();
  const failures = new Map<PipelineStage | "NONE", number>();

  let refusedInconsistent = 0;
  let refusedRediscovery = 0;
  let holdDisciplineDefects = 0;
  let expiredBeforeVisible = 0;
  let expiredDeadlineUnknown = 0;

  for (const observation of observations) {
const check = checkObservation(observation);
    if (!check.accepted) {
      if (check.reasons.includes("REDISCOVERY_REPORT_CANNOT_RESET_LATENCY")) {
        refusedRediscovery += 1;
      } else {
        refusedInconsistent += 1;
        for (const reason of check.reasons) {
          // One defect per defective hold, not one per missing field.
          if (reason.startsWith("HOLD_")) {
            holdDisciplineDefects += 1;
            break;
          }
        }
      }
      continue;
    }

    const visible = ms(observation.public_visible_at);

    // Stage dwell: only directly observed, ordered, non-negative stage pairs.
    const stagePairs: Array<[PipelineStage, number | null, number | null]> = [
      ["fetch", observation.reported_at, observation.first_probe_at],
      ["parse", observation.first_probe_at, observation.qualified_at],
      ["qualify", observation.qualified_at, observation.public_visible_at],
      ["publish", observation.publication_decided_at, observation.d1_synced_at],
    ];
    for (const [stage, from, to] of stagePairs) {
      const a = ms(from);
      const b = ms(to);
      if (a === null || b === null || b < a) continue;
      const row = dwell.get(stage) ?? { total: 0, samples: [] };
      row.total += b - a;
      row.samples.push(b - a);
      dwell.set(stage, row);
    }

    if (observation.failure_stage !== null || observation.failed_attempts > 0) {
      const stage = observation.failure_stage ?? "NONE";
      failures.set(stage, (failures.get(stage) ?? 0) + 1);
    }

    if (visible !== null) {
      const deadline = ms(observation.freshness_deadline_at);
      if (deadline === null) {
        expiredDeadlineUnknown += 1;
      } else if (visible > deadline) {
        expiredBeforeVisible += 1;
      }
    }

    const cohortRow = cohorts.get(observation.cohort) ?? {
      cohort: observation.cohort,
      observations: 0,
      visible: 0,
      pending: 0,
      blocked: 0,
      failed: 0,
      fresh_first_publication: 0,
    };

    for (const transition of STAGE_TRANSITIONS) {
      const state = transitions.get(transition)!;
      const { from, to } = TRANSITION_ENDPOINTS[transition];
      const a = ms(observation[from] as string | null);
      const b = ms(observation[to] as string | null);

      if (observation.terminal_state === "BLOCKED") {
        state.blocked += 1;
        cohortRow.blocked += 1;
        continue;
      }
      if (observation.terminal_state === "FAILED") {
        state.failed += 1;
        cohortRow.failed += 1;
        continue;
      }
      if (a !== null && b !== null && b >= a) {
        if (transition !== "HOLD_TO_NEXT_EVIDENCE" || observation.held_at !== null) {
          state.observed += 1;
          state.samples.push(b - a);
          continue;
        }
      }
      const started = a !== null;
      if (started && now !== null) {
        notePending(state, observation, now - a);
        cohortRow.pending += 1;
      } else {
        state.missing += 1;
      }
    }

    if (observation.terminal_state === "VISIBLE") {
      cohortRow.visible += 1;
      const deadline = ms(observation.freshness_deadline_at);
      const expired = deadline !== null && visible !== null && visible > deadline;
      if (observation.cohort === "FRESH_DISCOVERY" && observation.visibility_verified && !expired) {
        cohortRow.fresh_first_publication += 1;
      }
    }
    cohortRow.observations += 1;
    cohorts.set(observation.cohort, cohortRow);
  }

  const coverage: TransitionCoverage[] = STAGE_TRANSITIONS.map((transition) => {
    const state = transitions.get(transition)!;
    const denominator = state.observed + state.pending + state.blocked + state.failed + state.missing;
    const summary = summarize(state.samples);
    const withheld: string[] = [];
    if (summary === null) {
      withheld.push("NO_OBSERVED_SAMPLES_IN_WINDOW");
    } else if (isEndToEndTransition(transition) && summary.n < denominator) {
      withheld.push("END_TO_END_SAMPLE_IS_PARTIAL; p95 is withheld rather than approximated");
    }
    return {
      transition,
      end_to_end: isEndToEndTransition(transition),
      observed: state.observed,
      pending: state.pending,
      blocked: state.blocked,
      failed: state.failed,
      missing: state.missing,
      denominator,
      coverage_ratio: denominator === 0 ? null : state.observed / denominator,
      oldest_pending_ms: state.oldest_pending_ms,
      oldest_pending_identity: state.oldest_pending_identity,
      summary,
      withheld_reason: withheld.length === 0 ? null : withheld.join("; "),
    };
  });

  const stageDwell: StageDwellRow[] = PIPELINE_STAGES.map((stage) => {
    const row = dwell.get(stage);
    if (!row) return { stage, observations: 0, total_ms: 0, mean_ms: null, p95_ms: null };
    return {
      stage,
      observations: row.samples.length,
      total_ms: row.total,
      mean_ms: row.samples.length === 0 ? null : row.total / row.samples.length,
      p95_ms: percentile([...row.samples].sort((x, y) => x - y), 95),
    };
  }).filter((row) => row.observations > 0 || row.stage === "qualify");

  const limitations: string[] = [
    "No latency target exists in docs/ACCEPTED_PARAMETERS.yaml; this receipt reports distributions and coverage and evaluates no SLO.",
    "Component stage percentiles do not imply the end-to-end percentile; only REPORT_TO_VISIBILITY is end-to-end.",
    "D1 sync and a publication decision are not public visibility and are never used as a visibility clock.",
    "pending is right-censored and missing is unknown; neither is counted as zero.",
  ];
  if (refusedInconsistent > 0 || refusedRediscovery > 0) {
    limitations.push(
      `${refusedInconsistent} observation(s) refused as inconsistent and ${refusedRediscovery} refused for a non-first report clock; both are excluded from every sample and denominator here.`,
    );
  }
  if (holdDisciplineDefects > 0) {
    limitations.push(
      `${holdDisciplineDefects} hold-discipline defect(s) found: a hold must name its missing evidence and a next evidence-producing action.`,
    );
  }
  if (expiredDeadlineUnknown > 0) {
    limitations.push(
      `${expiredDeadlineUnknown} visible item(s) had an unknown freshness deadline; their flow eligibility is unknown, not passed.`,
    );
  }

  return {
    contract_version: STAGE_LATENCY_VERSION,
    window_manila_day: windowManilaDay,
    generated_at: options.generatedAt ?? nowIso,
    items: observations.length,
    transitions: coverage,
    stage_dwell: stageDwell,
    cohorts: [...cohorts.values()].sort((a, b) => (a.cohort < b.cohort ? -1 : 1)),
    expired_before_visible: expiredBeforeVisible,
    expired_deadline_unknown: expiredDeadlineUnknown,
    hold_discipline_defects: holdDisciplineDefects,
    refused_inconsistent: refusedInconsistent,
    refused_rediscovery: refusedRediscovery,
    failures: [...failures.entries()]
      .map(([stage, count]) => ({ stage, failures: count }))
      .sort((a, b) => (a.stage < b.stage ? -1 : 1)),
    slo_status: "PROPOSED_UNACCEPTED",
    limitations,
  };
}

/** Renders the receipt as text. No verdict, no threshold, no target comparison. */
export function formatLatencyReceipt(receipt: LatencyReceipt): string {
  const lines: string[] = [];
  lines.push(`Stage-transition latency — window ${receipt.window_manila_day}`);
  lines.push(`  contract v${receipt.contract_version} · ${receipt.items} observation(s) · SLO ${receipt.slo_status}`);
  lines.push("");
  for (const row of receipt.transitions) {
    const q = row.summary;
    const dist = q === null ? "no observed samples" : `n=${q.n} p50=${q.p50}ms p90=${q.p90}ms p95=${q.p95}ms`;
    lines.push(
      `  ${row.transition}${row.end_to_end ? " (end-to-end)" : ""}: ${dist}`,
    );
    lines.push(
      `    observed=${row.observed} pending=${row.pending} blocked=${row.blocked} failed=${row.failed} missing=${row.missing} denominator=${row.denominator} coverage=${row.coverage_ratio === null ? "n/a" : row.coverage_ratio.toFixed(3)}`,
    );
    if (row.oldest_pending_ms !== null) {
      lines.push(`    oldest pending ${row.oldest_pending_ms}ms (${row.oldest_pending_identity})`);
    }
    if (row.withheld_reason !== null) lines.push(`    withheld: ${row.withheld_reason}`);
  }
  if (receipt.stage_dwell.length > 0) {
    lines.push("");
    lines.push("  Stage dwell:");
    for (const row of receipt.stage_dwell) {
      lines.push(`    ${row.stage}: n=${row.observations} total=${row.total_ms}ms mean=${row.mean_ms} p95=${row.p95_ms}`);
    }
  }
  if (receipt.cohorts.length > 0) {
    lines.push("");
    lines.push("  Cohorts (stock is not flow):");
    for (const row of receipt.cohorts) {
      lines.push(
        `    ${row.cohort}: n=${row.observations} visible=${row.visible} pending=${row.pending} blocked=${row.blocked} failed=${row.failed} fresh_first_publication=${row.fresh_first_publication}`,
      );
    }
  }
  lines.push("");
  lines.push(`  expired_before_visible=${receipt.expired_before_visible} expired_deadline_unknown=${receipt.expired_deadline_unknown}`);
  lines.push(`  hold_discipline_defects=${receipt.hold_discipline_defects} refused_inconsistent=${receipt.refused_inconsistent} refused_rediscovery=${receipt.refused_rediscovery}`);
  if (receipt.failures.length > 0) {
    lines.push(`  failures: ${receipt.failures.map((f) => `${f.stage}=${f.failures}`).join(", ")}`);
  }
  lines.push("");
  for (const limitation of receipt.limitations) lines.push(`  ! ${limitation}`);
  return lines.join("\n");
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

if (import.meta.main) {
  const args = process.argv.slice(2);
  if (args.includes("--help")) {
    console.log(
      [
        "stage-latency — pure stage-transition latency contract (no writer, no network, no SLO verdict).",
        "",
        "  --report  print this module's capability summary",
        "",
        "Library: buildLatencyReceipt(windowManilaDay, observations, { nowTimestamp })",
        "          checkObservation(o), checkHoldDiscipline(o), refuseSyncAsVisibility(o)",
        "          refuseComponentRollup(transition, components), summarize(samples)",
      ].join("\n"),
    );
  } else {
    console.log(
      [
        "stage-latency — stage transitions:",
        ...STAGE_TRANSITIONS.map((t) => `  ${t}${isEndToEndTransition(t) ? " (end-to-end)" : ""}`),
        "",
        "This module reports distributions and coverage only. No latency target exists in",
        "docs/ACCEPTED_PARAMETERS.yaml, so it evaluates no SLO. Run with --report for detail.",
      ].join("\n"),
    );
  }
}