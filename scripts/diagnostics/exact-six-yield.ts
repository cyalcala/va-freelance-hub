/** EX-01: classify exact-six accepted yield without mutating geo-gate or fetch policy. */

export const EXACT_SIX_SOURCE_IDS = [
  "we-work-remotely",
  "remotive",
  "real-work-from-anywhere",
  "remote-ok",
  "jobicy-admin-support-apac",
  "jobicy-supporting-apac",
] as const;

export type ExactSixSourceId = (typeof EXACT_SIX_SOURCE_IDS)[number];

export type ExactSixYieldClass =
  | "eligible_inflow"
  | "eligible_with_high_reject"
  | "eligible_quiet_24h"
  | "fetching_but_ineligible"
  | "silent_zero_storage";

export interface SourceSupplyRow {
  source_id: string | null;
  eligible_active: number;
  first_storage_1d: number;
  first_storage_7d: number;
}

export interface FirstStorageOutcomeRow {
  source_id: string | null;
  is_active: number;
  ph_eligibility: string | null;
  inactive_reason: string | null;
  row_count: number;
}

export interface ExactSixSourceYield {
  sourceId: ExactSixSourceId;
  eligibleActive: number;
  eligibleFirstStorage1d: number;
  eligibleFirstStorage7d: number;
  rejected7d: number;
  class: ExactSixYieldClass;
  repairable: boolean;
}

export interface ExactSixYieldReport {
  sources: ExactSixSourceYield[];
}

function isExactSix(id: string | null): id is ExactSixSourceId {
  return EXACT_SIX_SOURCE_IDS.some((candidate) => candidate === id);
}

function classify(eligible1d: number, eligible7d: number, rejected7d: number): ExactSixYieldClass {
  if (eligible7d > 0 && eligible1d === 0) return "eligible_quiet_24h";
  if (eligible7d > 0 && rejected7d > eligible7d) return "eligible_with_high_reject";
  if (eligible7d > 0) return "eligible_inflow";
  if (rejected7d > 0) return "fetching_but_ineligible";
  return "silent_zero_storage";
}

export function classifyExactSixYield(input: {
  perSourceSupply: SourceSupplyRow[];
  firstStorageOutcomes7d: FirstStorageOutcomeRow[];
}): ExactSixYieldReport {
  const supply = new Map<ExactSixSourceId, SourceSupplyRow>();
  for (const row of input.perSourceSupply) {
    if (isExactSix(row.source_id)) supply.set(row.source_id, row);
  }
  const rejected = new Map<ExactSixSourceId, number>();
  for (const row of input.firstStorageOutcomes7d) {
    if (!isExactSix(row.source_id)) continue;
    const isRejected = row.is_active === 0 && row.inactive_reason === "policy-rejected";
    if (!isRejected) continue;
    rejected.set(row.source_id, (rejected.get(row.source_id) ?? 0) + Number(row.row_count));
  }

  return {
    sources: EXACT_SIX_SOURCE_IDS.map((sourceId) => {
      const row = supply.get(sourceId);
      const eligibleFirstStorage1d = Number(row?.first_storage_1d ?? 0);
      const eligibleFirstStorage7d = Number(row?.first_storage_7d ?? 0);
      const rejected7d = rejected.get(sourceId) ?? 0;
      const yieldClass = classify(eligibleFirstStorage1d, eligibleFirstStorage7d, rejected7d);
      return {
        sourceId,
        eligibleActive: Number(row?.eligible_active ?? 0),
        eligibleFirstStorage1d,
        eligibleFirstStorage7d,
        rejected7d,
        class: yieldClass,
        repairable: yieldClass === "silent_zero_storage",
      };
    }),
  };
}
