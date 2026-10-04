/**
 * INCIDENT-0410(p): the bounded Jev re-adjudication plan.
 *
 * Why this module exists. INCIDENT-0410 (2026-10-04) is a supply outage: prod D1
 * has received no new row since 2026-10-03T14:01Z. VERIFIED_QUERY put the
 * reason past every gate the incident originally named — 60 `QUALIFIED_READY`
 * lake rows sit behind 18 `auto_approved` tenants, 17 of which hold 56 of those
 * rows with `lake_ats_discovery.jev_raw` NULL, so `decideAutoPublish` returns the
 * ambiguous band's default HOLD ("ambiguous cohort stays in shadow until Jev
 * returns a confident verdict"). The tech lead's 13:25 instruction asks for a
 * bounded re-adjudication pass over exactly those tenants.
 *
 * VERIFIED_CODE, why that pass does not happen today. `evaluateTenant` in
 * `scripts/lake/domain-ats-discovery.ts:568-679` is the only caller of
 * `decideAdmission`, and it runs only after `probeTenantJobs` performs a fresh
 * HTTP fetch of the tenant's board. The tenant set probed per run comes from
 * `extractDiscoveryCandidates` (`:479-500`), which orders candidates by
 * `MAX(sighting_count)` in `lake_candidate_jobs` — a discovery ranking with no
 * knowledge of held supply. Measured consequence: all 27 `auto_approved`
 * tenants without a verdict have `last_evaluated_at` BEFORE 2026-10-04, i.e.
 * today's miner run re-evaluated only the 11 tenants that already had verdicts,
 * and 10 of those 11 have no pending rows at all. Held supply is therefore never
 * selected for re-adjudication, and no amount of waiting changes that.
 *
 * What this module is. Pure selection logic for the one thing the repository
 * lacks: which `auto_approved` tenants need a verdict, in which order, capped
 * per run and by the remaining daily AI-call budget, idempotent against an
 * already recorded verdict, silent about tenants the production gate has already
 * decided, and naming the evidence that would clear each hold with no paid call
 * at all. It plans evidence production. It cannot decide, publish or authorize.
 *
 * What this module is not. It does not widen or narrow a gate: `PUBLISH_PH_RATE_FLOOR`,
 * `REJECT_PH_RATE_FLOOR`, `MIN_JOBS_FOR_RATE`, `JEV_MIN_CONFIDENCE` and `WILSON_Z`
 * are imported from production and never restated, and every decision below is
 * taken by calling the real `decideAutoPublish` with no Jev fields supplied. It
 * introduces no new numeric constant of its own — the per-run cap and the daily
 * budget are caller-supplied and validated, so no number is added to any path.
 * Every planned row carries `decisionClass: "L1_ADVISE"` (CONSTITUTION §2.2,
 * §7.1): Jev is advisory and a verdict is evidence, never authority. It writes
 * nothing, imports no client, no database, no gateway and no network.
 *
 * Wiring it into the miner requires `domain-ats-discovery.ts` /
 * `run-lake-miner.ts`, both MERGE_RUBRIC §4.3 HOLD paths, so the adoption is a
 * proposal for the reviewer, not a commit. Note also that this plan can only
 * produce evidence; a confident ADMIT still has to pass the existing gate, and
 * CONSTITUTION §3.2 conditions 6 and 14 (registry authority and a ledger
 * receipt) are outside anything computed here.
 *
 * Relationship to existing modules. `admission-publication-gap.ts` characterises
 * why a point-estimate admission and a Wilson publication gate disagree;
 * `jev-call-budget.test.ts` shows a hard-reject cohort never spends a call;
 * `jev-verdict-receipt.ts` makes an attempt durable. None of them answers "which
 * tenants should be re-consulted next, and what would clear the hold instead",
 * which is the selection this file owns.
 */

import {
  MIN_JOBS_FOR_RATE,
  PUBLISH_PH_RATE_FLOOR,
  decideAutoPublish,
  parseJevRaw,
  wilsonLowerBound,
  type AdmissionVerdict,
} from "./auto-publish-policy";
import { isJevAttemptReceipt } from "./jev-verdict-receipt";

/** The only review state whose ambiguous band is relieved by a Jev verdict. */
export const AUTO_APPROVED_REVIEW_STATUS = "auto_approved";

/**
 * One `lake_ats_discovery` tenant joined with the real pending supply behind it.
 *
 * `jobCount` / `qualifiedReady` are the lifetime counters the publisher scores
 * (`lake_ats_discovery.job_count` / `qualified_ready`); `pendingQualified` is the
 * actual `lake_candidate_jobs` count of `status = 'QUALIFIED_READY'` rows for the
 * same `source_id`. The two disagree, and only the second one is rows that could
 * actually become public visibility.
 */
export interface HeldSupplyTenant {
  sourceId: string;
  reviewStatus: string;
  /** `lake_ats_discovery.job_count`. */
  jobCount: number;
  /** `lake_ats_discovery.qualified_ready`. */
  qualifiedReady: number;
  /** `lake_ats_discovery.jev_raw`: a recorded verdict, an attempt receipt, or NULL. */
  jevRaw?: string | null;
  /** Real `lake_candidate_jobs` rows with `status = 'QUALIFIED_READY'`. */
  pendingQualified: number;
  /** Registry opt-out, when a reader already knows it. */
  optOut?: boolean;
}

export type ReAdjudicationDisposition =
  /** Selected for a re-consultation within the run's budget. */
  | "PLANNED"
  /** Eligible, but the per-run cap or the daily budget deferred it. */
  | "DEFERRED_BUDGET"
  /** A verdict is already recorded; a second call would be spent for nothing. */
  | "VERDICT_RECORDED"
  /** The production gate already clears this cohort; a verdict is discarded. */
  | "GATE_ALREADY_CLEARS"
  /** The production gate rejects this cohort; a verdict cannot change that. */
  | "GATE_REJECTS"
  /** The sample is too small to publish; the missing evidence is the denominator. */
  | "SMALL_SAMPLE_HOLD"
  /** No QUALIFIED_READY row is pending, so a verdict unlocks nothing today. */
  | "NO_PENDING_SUPPLY"
  /** Not `auto_approved`; the ambiguous band does not apply to it. */
  | "NOT_AUTO_APPROVED";

export interface ReAdjudicationCandidate {
  sourceId: string;
  disposition: ReAdjudicationDisposition;
  /** The production gate's own reason string, verbatim, when the gate decided. */
  gateReason: string | null;
  pendingQualified: number;
  /** Lifetime counters, reported so a reader never has to re-derive them. */
  jobCount: number;
  qualifiedReady: number;
  wilsonLower: number | null;
  recordedVerdict: { choice: AdmissionVerdict; confidence: number } | null;
  /** Set when `jev_raw` holds a failed-attempt receipt rather than a verdict. */
  attemptReceipt: string | null;
  /**
   * Additional QUALIFIED_READY rows that would clear the hold at the same
   * denominator with no paid call, or null when that is unreachable. This is the
   * evidence-first alternative to buying a verdict.
   */
  qualifiedRowsToClearWithoutJev: number | null;
  /** Additional total jobs needed to reach the production minimum sample. */
  additionalJobsForSampleFloor: number | null;
  aiCallPlanned: boolean;
  /** CONSTITUTION §2.2 / §7.1: every decision class in production is L1 ADVISE. */
  decisionClass: "L1_ADVISE";
}

/** Caller-supplied bounds. No default is provided, so this module adds no number. */
export interface ReAdjudicationBudget {
  /** Maximum tenants this run may consult. */
  maxPerRun: number;
  /** AI calls still available today under the accepted daily budget. */
  remainingDailyCalls: number;
}

export interface ReAdjudicationSummary {
  tenantsExamined: number;
  eligibleTenants: number;
  plannedTenants: number;
  deferredTenants: number;
  pendingRowsBehindEligibleTenants: number;
  pendingRowsPlanned: number;
  pendingRowsDeferred: number;
  aiCallsPlanned: number;
  maxPerRun: number;
  remainingDailyCalls: number;
  /** A plan is not a publication. Always "NONE". */
  publicationEffect: "NONE";
}

export interface ReAdjudicationPlan {
  /** Planned first (in selection order), then deferred, then everything excluded. */
  candidates: ReAdjudicationCandidate[];
  summary: ReAdjudicationSummary;
}

/**
 * Minimal additional QUALIFIED_READY rows that lift the Wilson lower bound of
 * `(qualifiedReady, totalJobs)` to the production publish floor, at that same
 * denominator. `0` when the cohort already clears; `null` when no reachable
 * numerator clears it, in which case the denominator itself is the missing
 * evidence.
 *
 * Derived entirely from the real `wilsonLowerBound` and the real
 * `PUBLISH_PH_RATE_FLOOR`, so a future threshold change moves this with it.
 */
export function qualifiedRowsToClearWithoutJev(qualifiedReady: number, totalJobs: number): number | null {
  if (!Number.isInteger(totalJobs) || totalJobs <= 0) return null;
  const successes = Math.max(0, Math.min(Math.floor(qualifiedReady), totalJobs));
  if ((wilsonLowerBound(successes, totalJobs) ?? -1) >= PUBLISH_PH_RATE_FLOOR) return 0;
  for (let numerator = successes + 1; numerator <= totalJobs; numerator += 1) {
    if ((wilsonLowerBound(numerator, totalJobs) ?? -1) >= PUBLISH_PH_RATE_FLOOR) {
      return numerator - successes;
    }
  }
  return null;
}

function assertBudget(name: string, value: number): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative integer, received ${String(value)}`);
  }
}

/**
 * Orders eligible tenants by the supply a verdict could actually unlock:
 * pending QUALIFIED_READY rows descending, then the lifetime qualified counter,
 * then `sourceId` so two runs on the same inputs select the same tenants.
 */
function compareCandidates(a: ReAdjudicationCandidate, b: ReAdjudicationCandidate): number {
  if (a.pendingQualified !== b.pendingQualified) return b.pendingQualified - a.pendingQualified;
  if (a.qualifiedReady !== b.qualifiedReady) return b.qualifiedReady - a.qualifiedReady;
  return a.sourceId.localeCompare(b.sourceId);
}

const DISPOSITION_RANK: Record<ReAdjudicationDisposition, number> = {
  PLANNED: 0,
  DEFERRED_BUDGET: 1,
  VERDICT_RECORDED: 2,
  GATE_ALREADY_CLEARS: 3,
  SMALL_SAMPLE_HOLD: 4,
  NO_PENDING_SUPPLY: 5,
  NOT_AUTO_APPROVED: 6,
  GATE_REJECTS: 7,
};

/**
 * Builds the bounded re-adjudication plan. Pure: no client, no database, no
 * gateway, no network, no clock.
 */
export function planJevReAdjudication(
  tenants: HeldSupplyTenant[],
  budget: ReAdjudicationBudget,
): ReAdjudicationPlan {
  assertBudget("maxPerRun", budget.maxPerRun);
  assertBudget("remainingDailyCalls", budget.remainingDailyCalls);
  const cap = Math.min(budget.maxPerRun, budget.remainingDailyCalls);

  const eligible: ReAdjudicationCandidate[] = [];
  const candidates: ReAdjudicationCandidate[] = [];

  for (const tenant of tenants) {
    const verdict = parseJevRaw(tenant.jevRaw ?? null);
    const wilsonLower = wilsonLowerBound(
      Math.min(Math.max(0, Math.floor(tenant.qualifiedReady)), Math.max(0, Math.floor(tenant.jobCount))),
      Math.floor(tenant.jobCount),
    );
    const base = {
      sourceId: tenant.sourceId,
      pendingQualified: Math.max(0, Math.floor(tenant.pendingQualified)),
      jobCount: Math.floor(tenant.jobCount),
      qualifiedReady: Math.floor(tenant.qualifiedReady),
      wilsonLower,
      recordedVerdict: verdict,
      attemptReceipt: isJevAttemptReceipt(tenant.jevRaw) ? (tenant.jevRaw as string) : null,
      qualifiedRowsToClearWithoutJev: null as number | null,
      additionalJobsForSampleFloor: null as number | null,
      decisionClass: "L1_ADVISE" as const,
    };

    const exclude = (disposition: ReAdjudicationDisposition, gateReason: string | null): ReAdjudicationCandidate => ({
      ...base,
      disposition,
      gateReason,
      aiCallPlanned: false,
    });

    if (tenant.reviewStatus !== AUTO_APPROVED_REVIEW_STATUS) {
      candidates.push(exclude("NOT_AUTO_APPROVED", null));
      continue;
    }
    if (verdict) {
      candidates.push(exclude("VERDICT_RECORDED", null));
      continue;
    }
    if (base.pendingQualified <= 0) {
      candidates.push(exclude("NO_PENDING_SUPPLY", null));
      continue;
    }

    // The production gate, asked with no Jev fields at all: its own answer
    // decides whether a call could change anything, and its own reason string is
    // reported rather than paraphrased.
    const withoutVerdict = decideAutoPublish({
      sourceId: tenant.sourceId,
      totalJobs: tenant.jobCount,
      qualifiedReady: tenant.qualifiedReady,
      optOut: tenant.optOut,
      inventory: null,
    });

    if (withoutVerdict.action === "REJECT") {
      candidates.push(exclude("GATE_REJECTS", withoutVerdict.reason));
      continue;
    }
    if (withoutVerdict.action === "PUBLISH") {
      candidates.push(exclude("GATE_ALREADY_CLEARS", withoutVerdict.reason));
      continue;
    }
    if (withoutVerdict.reason !== "ambiguous cohort stays in shadow until Jev returns a confident verdict") {
      candidates.push({
        ...exclude("SMALL_SAMPLE_HOLD", withoutVerdict.reason),
        additionalJobsForSampleFloor: Math.max(0, MIN_JOBS_FOR_RATE - Math.floor(tenant.jobCount)),
      });
      continue;
    }

    eligible.push({
      ...base,
      disposition: "PLANNED",
      gateReason: withoutVerdict.reason,
      qualifiedRowsToClearWithoutJev: qualifiedRowsToClearWithoutJev(tenant.qualifiedReady, tenant.jobCount),
      additionalJobsForSampleFloor: null,
      aiCallPlanned: false,
    });
  }

  eligible.sort(compareCandidates);

  const plannedCount = Math.min(cap, eligible.length);
  const plannedRows = eligible.slice(0, plannedCount).map((row) => ({ ...row, aiCallPlanned: true }));
  const deferredRows = eligible.slice(plannedCount).map((row) => ({ ...row, disposition: "DEFERRED_BUDGET" as const }));

  // Planned and deferred keep their selection order (Array#sort is stable); the
  // excluded rows follow in rank order so a reader sees one list, planned first.
  const excluded = [...candidates].sort(
    (a, b) =>
      DISPOSITION_RANK[a.disposition] - DISPOSITION_RANK[b.disposition] ||
      a.sourceId.localeCompare(b.sourceId),
  );
  const ordered = [...plannedRows, ...deferredRows, ...excluded];

  const pendingRowsBehindEligibleTenants = eligible.reduce((sum, row) => sum + row.pendingQualified, 0);
  const pendingRowsPlanned = plannedRows.reduce((sum, row) => sum + row.pendingQualified, 0);

  return {
    candidates: ordered,
    summary: {
      tenantsExamined: tenants.length,
      eligibleTenants: eligible.length,
      plannedTenants: plannedRows.length,
      deferredTenants: deferredRows.length,
      pendingRowsBehindEligibleTenants,
      pendingRowsPlanned,
      pendingRowsDeferred: pendingRowsBehindEligibleTenants - pendingRowsPlanned,
      aiCallsPlanned: plannedRows.length,
      maxPerRun: budget.maxPerRun,
      remainingDailyCalls: budget.remainingDailyCalls,
      publicationEffect: "NONE",
    },
  };
}
