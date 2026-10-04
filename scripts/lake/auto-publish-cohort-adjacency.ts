/**
 * Cohort adjacency between the auto-publish decision inputs and the pending
 * publication queue.
 *
 * Labels: "INCIDENT-0410:" (supply outage triage) + MATH-06.
 *
 * INCIDENT-0410 (2026-10-04): production D1 has received no new rows since
 * 2026-10-03T14:01Z. Session 17 of the shift measured the proximate symptom —
 * `planAutoPublishSources` believed the plan had been empty since 14:11Z — but
 * could not isolate the deciding branch, because it had no Turso read access.
 * This module makes the adjacency measurable instead of inferable, using the
 * real decision function and the real planner.
 *
 * Two independent records decide publication, and they are read from two
 * different tables that are never joined:
 *
 * - `lake_ats_discovery` (`loadAutoPublishTenants` in `sync-to-d1.ts`) supplies
 *   the per-tenant *lifetime* counters `job_count` / `qualified_ready`, plus
 *   `jev_raw`. `decideAutoPublish` scores the tenant on those counters.
 * - `lake_candidate_jobs` (`CANDIDATE_SELECT` in `sync-to-d1.ts`) supplies the
 *   *pending* rows to actually write: `status = 'QUALIFIED_READY'` and a
 *   `ph_eligibility` filter.
 *
 * The planner grants `publishCount` per tenant; the writer then asks each
 * granted tenant for that many pending rows. When the two record sets do not
 * overlap, the plan is healthy, every grant is unusable, `candidates` is empty
 * and `syncQualifiedJobsToD1` returns `{ syncedCount: 0 }` having written
 * nothing and recorded no ledger receipt. This module measures that overlap and
 * attributes it per tenant.
 *
 * It also records why the obvious repair must not be applied blindly: the
 * pending queue is pre-filtered to `ph_eligibility IN ('eligible_verified',
 * 'eligible_likely')` by the very SELECT that drains it, so a PH rate computed
 * from pending rows alone is 1.0 by construction. Substituting the pending
 * cohort for the lifetime sample would make the rate test vacuous, which is why
 * the honest repair needs evidence this module cannot manufacture.
 *
 * Scope limits, stated honestly:
 * - Pure. No writer, gateway, ledger, network, database or clock import. The
 *   only production code it calls is the planner and the decision function
 *   themselves.
 * - Adds no numeric gate. Every threshold is read from the module that owns it.
 * - Lowers no Wilson floor, sample floor, reject floor or Jev confidence floor,
 *   and `floor_lowering_required` is a constant `false` so that cannot be
 *   inferred away.
 * - Grants no publication authority. It reports; the gateway and the planner
 *   still decide.
 * - Proves nothing about runtime. Every count is a caller-supplied record.
 */

import {
  decideAutoPublish,
  wilsonLowerBound,
  MIN_JOBS_FOR_RATE,
  parseJevRaw,
  PUBLISH_PH_RATE_FLOOR,
  REJECT_PH_RATE_FLOOR,
  JEV_MIN_CONFIDENCE,
  type AutoPublishDecision,
  type InventorySnapshot,
  type PublishAction,
} from "./auto-publish-policy";
import { planAutoPublishSources, type DiscoveryTenantRow } from "./sync-to-d1";

/** A rate computed from the drained pending queue is 1.0 by construction. */
export const PENDING_RATE_IS_CIRCULAR = true;

/** This module never proposes relaxing a floor; the constant makes that explicit. */
export const floor_lowering_required = false as const;

/** The `ph_eligibility` values the pending SELECT admits, per `CANDIDATE_SELECT`. */
export const PENDING_PH_ELIGIBILITY_VALUES = ["eligible_verified", "eligible_likely"] as const;

export interface PendingCohortRow {
  source_id: string;
  ready: number;
  oldest_observed_at?: string | null;
  newest_observed_at?: string | null;
}

export interface AdjacencyInput {
  /** `lake_ats_discovery` rows with `review_status = 'auto_approved'`. */
  tenants: DiscoveryTenantRow[];
  /** `lake_candidate_jobs` counts grouped by source for `status = 'QUALIFIED_READY'`. */
  pending: PendingCohortRow[];
  /** Live D1 active inventory, as `fetchD1InventorySnapshot` builds it. */
  inventory: InventorySnapshot | null;
  /** `BASE_AUTHORIZED_SOURCE_IDS`; these bypass the rate test entirely. */
  baseAuthorizedSourceIds: string[];
  /** `lake_candidate_jobs` `ph_eligibility` split for the pending rows, if measured. */
  pendingEligibilitySplit?: Array<{ ph_eligibility: string; n: number }>;
  holdAutoApproved?: boolean;
}

export type StarvationBranch =
  | "sample_floor"
  | "ph_rate_floor"
  | "wilson_ambiguous_without_jev"
  | "wilson_ambiguous_jev_not_admit"
  | "concentration_blocked"
  | "no_qualified_counter";

export interface AuthorizedGrant {
  sourceId: string;
  publishCount: number;
  /** Pending rows this tenant could actually deliver right now. */
  pendingReady: number;
  reason: string;
}

export interface StarvedSource {
  sourceId: string;
  pendingReady: number;
  lifetimeTotalJobs: number;
  lifetimeQualifiedReady: number;
  wilsonLower: number | null;
  action: PublishAction;
  branch: StarvationBranch;
  reason: string;
  /** PH rate implied by the pending queue alone; 1.0 whenever `pendingReady > 0`. */
  pendingRate: number | null;
  pendingRateIsCircular: boolean;
  missingEvidence: string[];
  nextAction: string;
}

export interface CohortAdjacencyReport {
  tenantCount: number;
  authorizedSourceCount: number;
  /** Sum of `publishCount` the planner granted. */
  authorizedCapacity: number;
  /** Grants that have no pending row to spend. */
  unusableGrantCount: number;
  unusableGrants: AuthorizedGrant[];
  pendingSourceCount: number;
  pendingRowCount: number;
  /** Pending rows in a tenant the planner authorised. */
  pendingRowsInAuthorizedSources: number;
  /** Pending rows in a base-authorised source (exact-six, breezy, himalayas). */
  pendingRowsInBaseAuthorizedSources: number;
  /** Pending rows whose tenant is auto-approved but rate-held. */
  pendingRowsInHeldSources: number;
  /** Pending rows whose source has no auto-approval at all. */
  pendingRowsInUnauthorizedSources: number;
  starvedSources: StarvedSource[];
  /** True when eligible pending rows exist that no authorised path can reach. */
  supplyIsFrozen: boolean;
  eligiblePendingPhShare: number | null;
  summary: string;
}

/** Runs `fn` with `console.log` captured, so the planner's own `[AutoPublish]`
 *  lines become evidence instead of scroll-past. */
export function captureAutoPublishLog<T>(fn: () => T): { result: T; log: string[] } {
  const original = console.log;
  const log: string[] = [];
  console.log = (...args: unknown[]) => {
    log.push(args.map((value) => String(value)).join(" "));
  };
  try {
    return { result: fn(), log };
  } finally {
    console.log = original;
  }
}

/** Classifies which branch of the real `decideAutoPublish` returned a non-PUBLISH. */
export function classifyStarvationBranch(
  tenant: DiscoveryTenantRow,
  decision: AutoPublishDecision,
): StarvationBranch {
  const qualifiedReady = Math.max(0, Math.floor(tenant.qualified_ready));
  const totalJobs = Math.max(tenant.job_count, qualifiedReady);
  if (qualifiedReady <= 0 || totalJobs < MIN_JOBS_FOR_RATE) return "sample_floor";
  if (qualifiedReady / totalJobs < REJECT_PH_RATE_FLOOR) return "ph_rate_floor";
  const wilson = wilsonLowerBound(Math.min(qualifiedReady, totalJobs), totalJobs);
  if (wilson !== null && wilson >= PUBLISH_PH_RATE_FLOOR) return "concentration_blocked";
  return parseJevRaw(tenant.jev_raw) ? "wilson_ambiguous_jev_not_admit" : "wilson_ambiguous_without_jev";
}

/** The evidence a held tenant would have to produce, per branch. Never a lower floor. */
export function missingEvidenceForStarvation(
  branch: StarvationBranch,
  tenant: DiscoveryTenantRow,
): { missingEvidence: string[]; nextAction: string } {
  const sourceId = tenant.source_id;
  switch (branch) {
    case "sample_floor":
      return {
        missingEvidence: [
          `lake_ats_discovery.qualified_ready or job_count below MIN_JOBS_FOR_RATE for ${sourceId}`,
        ],
        nextAction: `observe ${sourceId} until the lifetime sample clears the sample floor; do not lower it`,
      };
    case "ph_rate_floor":
      return {
        missingEvidence: [`lifetime PH rate for ${sourceId} below REJECT_PH_RATE_FLOOR`],
        nextAction: `re-measure ${sourceId} qualification; a floor breach is not repaired by more traffic`,
      };
    case "concentration_blocked":
      return {
        missingEvidence: [`D1 inventory share for ${sourceId} at or above the concentration ceiling`],
        nextAction: `let inventory rotate or publish elsewhere; concentration is a brake, not a defect`,
      };
    case "wilson_ambiguous_without_jev":
      return {
        missingEvidence: [
          `lake_ats_discovery.jev_raw for ${sourceId} is absent, so the ambiguous band has no verdict`,
        ],
        nextAction: `obtain an advisory Jev verdict at or above JEV_MIN_CONFIDENCE ${JEV_MIN_CONFIDENCE} for ${sourceId}, or widen the lifetime sample`,
      };
    case "wilson_ambiguous_jev_not_admit":
      return {
        missingEvidence: [`lake_ats_discovery.jev_raw for ${sourceId} exists but is not a confident ADMIT`],
        nextAction: `re-observe ${sourceId} for a larger lifetime sample before any verdict is trusted`,
      };
    default:
      return {
        missingEvidence: [`lake_ats_discovery.qualified_ready for ${sourceId} is zero`],
        nextAction: `confirm ${sourceId} still produces qualified candidates`,
      };
  }
}

function toNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Measures how much of the pending publication queue the planner's own grants
 * can actually reach, and names the branch that holds the rest.
 */
export function measureCohortAdjacency(input: AdjacencyInput): CohortAdjacencyReport {
  const baseIds = new Set(input.baseAuthorizedSourceIds);
  const pendingBySource = new Map<string, PendingCohortRow>();
  for (const row of input.pending ?? []) {
    if (!row.source_id) continue;
    pendingBySource.set(row.source_id, row);
  }

  const { result: planned } = captureAutoPublishLog(() =>
    planAutoPublishSources(input.tenants ?? [], input.inventory ?? null, input.holdAutoApproved === true),
  );
  const authorized = new Set(planned.map((entry) => entry.sourceId));

  const usableGrants: AuthorizedGrant[] = [];
  const unusableGrants: AuthorizedGrant[] = [];
  let authorizedCapacity = 0;
  for (const grant of planned) {
    const pendingReady = toNumber(pendingBySource.get(grant.sourceId)?.ready);
    authorizedCapacity += grant.publishCount;
    const row: AuthorizedGrant = { sourceId: grant.sourceId, publishCount: grant.publishCount, pendingReady, reason: grant.reason };
    (pendingReady > 0 ? usableGrants : unusableGrants).push(row);
  }

  let pendingRowCount = 0;
  let pendingRowsInAuthorizedSources = 0;
  let pendingRowsInBaseAuthorizedSources = 0;
  let pendingRowsInHeldSources = 0;
  let pendingRowsInUnauthorizedSources = 0;
  for (const row of pendingBySource.values()) {
    const ready = toNumber(row.ready);
    pendingRowCount += ready;
    if (authorized.has(row.source_id)) pendingRowsInAuthorizedSources += ready;
    else if (baseIds.has(row.source_id)) pendingRowsInBaseAuthorizedSources += ready;
    else if ((input.tenants ?? []).some((tenant) => tenant.source_id === row.source_id)) pendingRowsInHeldSources += ready;
    else pendingRowsInUnauthorizedSources += ready;
  }

  const starvedSources: StarvedSource[] = [];
  for (const tenant of input.tenants ?? []) {
    const pendingRow = pendingBySource.get(tenant.source_id);
    const pendingReady = toNumber(pendingRow?.ready);
    if (authorized.has(tenant.source_id)) continue;
    if (pendingReady <= 0) continue;
    const qualifiedReady = Math.max(0, Math.floor(toNumber(tenant.qualified_ready)));
    const totalJobs = Math.max(toNumber(tenant.job_count), qualifiedReady);
    const { result: decision } = captureAutoPublishLog(() =>
      decideAutoPublish({
        sourceId: tenant.source_id,
        totalJobs,
        qualifiedReady,
        jevChoice: parseJevRaw(tenant.jev_raw)?.choice ?? null,
        jevConfidence: parseJevRaw(tenant.jev_raw)?.confidence ?? null,
        inventory: input.inventory ?? null,
      }),
    );
    const branch = classifyStarvationBranch(tenant, decision);
    const { missingEvidence, nextAction } = missingEvidenceForStarvation(branch, tenant);
    starvedSources.push({
      sourceId: tenant.source_id,
      pendingReady,
      lifetimeTotalJobs: totalJobs,
      lifetimeQualifiedReady: qualifiedReady,
      wilsonLower: decision.wilsonLower,
      action: decision.action,
      branch,
      reason: decision.reason,
      pendingRate: pendingReady > 0 ? 1 : null,
      pendingRateIsCircular: pendingReady > 0,
      missingEvidence,
      nextAction,
    });
  }
  starvedSources.sort((a, b) => b.pendingReady - a.pendingReady || a.sourceId.localeCompare(b.sourceId));

  const split = input.pendingEligibilitySplit ?? [];
  const splitTotal = split.reduce((sum, row) => sum + toNumber(row.n), 0);
  const eligibleInSplit = split
    .filter((row) => (PENDING_PH_ELIGIBILITY_VALUES as readonly string[]).includes(row.ph_eligibility))
    .reduce((sum, row) => sum + toNumber(row.n), 0);
  const eligiblePendingPhShare = splitTotal > 0 ? eligibleInSplit / splitTotal : null;

  const reachable = pendingRowsInAuthorizedSources + pendingRowsInBaseAuthorizedSources;
  const supplyIsFrozen = pendingRowCount > 0 && reachable === 0;

  const summary = supplyIsFrozen
    ? `${pendingRowCount} pending QUALIFIED_READY row(s) exist and none is reachable: ` +
      `${pendingRowsInHeldSources} in rate-held tenant(s), ${pendingRowsInUnauthorizedSources} with no authority; ` +
      `${authorizedCapacity} grant(s) of capacity were issued against ${unusableGrants.length} tenant(s) with no pending row.`
    : `${pendingRowCount} pending row(s); ${reachable} reachable by an authorised path.`;

  return {
    tenantCount: (input.tenants ?? []).length,
    authorizedSourceCount: planned.length,
    authorizedCapacity,
    unusableGrantCount: unusableGrants.length,
    unusableGrants,
    pendingSourceCount: pendingBySource.size,
    pendingRowCount,
    pendingRowsInAuthorizedSources,
    pendingRowsInBaseAuthorizedSources,
    pendingRowsInHeldSources,
    pendingRowsInUnauthorizedSources,
    starvedSources,
    supplyIsFrozen,
    eligiblePendingPhShare,
    summary,
  };
}