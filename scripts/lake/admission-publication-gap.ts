/**
 * INCIDENT-0410 — the admission statistic and the publication statistic are two
 * different statistics of the same two counters, and they share one number.
 *
 * VERIFIED_CODE at f5725864 (read-only; neither producer was edited):
 *
 *   admission   domain-ats-discovery.ts:45   AUTO_APPROVE_PH_RATE = 0.20
 *               domain-ats-discovery.ts:267  ADMIT when phRate >= AUTO_APPROVE_PH_RATE
 *               phRate = qualifiedReady / rawJobs.length   (a POINT ESTIMATE, line 542)
 *
 *   publication auto-publish-policy.ts:12     PUBLISH_PH_RATE_FLOOR = 0.20
 *               auto-publish-policy.ts:131    PUBLISH only when the WILSON LOWER BOUND
 *                                              of (qualifiedReady, job_count) >= that floor
 *
 * Both read `lake_ats_discovery.qualified_ready` and `job_count`. Both thresholds are the
 * same literal 0.20. One applies it to the point estimate, the other to the Wilson lower
 * bound, and `wilsonLowerBound(p, n) <= p` for every p and n. So a tenant can be
 * auto-approved and simultaneously un-publishable, with no amount of waiting involved:
 * the ambiguous band's only relief is a confident Jev ADMIT recorded in `jev_raw`.
 *
 * This module is characterisation only. It reads the two real exported functions and
 * derives the shape of the gap. It changes no threshold, no gate, no registry and no
 * runtime path, and no function here is imported by any writer.
 */

import {
  AUTO_APPROVE_PH_RATE,
  AUTO_REJECT_PH_RATE,
  MIN_JOBS_TO_EVALUATE,
  mergeAdmissionDecision,
} from "./domain-ats-discovery";
import {
  JEV_MIN_CONFIDENCE,
  MIN_JOBS_FOR_RATE,
  PUBLISH_PH_RATE_FLOOR,
  REJECT_PH_RATE_FLOOR,
  decideAutoPublish,
  wilsonLowerBound,
  type AdmissionVerdict,
  type PublishAction,
} from "./auto-publish-policy";

export interface CohortSample {
  /** `lake_ats_discovery.qualified_ready` */
  qualifiedReady: number;
  /** `lake_ats_discovery.job_count` */
  totalJobs: number;
}

/** Why a cohort that admission approved is nevertheless not publishable. */
export type GapKind =
  /** Admission approved it and publication publishes it. */
  | "aligned_publish"
  /** Both sides refuse it. */
  | "aligned_reject"
  /** Admission parked it in shadow; publication holds it. Not a disagreement. */
  | "aligned_shadow"
  /** Publication holds it for a sample-size reason, before any rate is scored. */
  | "sample_floor"
  /** THE DEFECT: `auto_approved` in the lake, HOLD at the publication gate. */
  | "admitted_but_held";

/** What, if anything, can lift a HOLD without new observations. */
export type HoldRelief =
  /**
   * Nothing but a confident stored Jev ADMIT. `decideAutoPublish` returns HOLD in
   * the ambiguous band whatever the point estimate is, and the only branch that
   * overrides it is a Jev ADMIT at or above `JEV_MIN_CONFIDENCE`.
   */
  | "confident_jev_admit_only"
  /** Not held. */
  | "none";

export interface CohortClassification {
  qualifiedReady: number;
  totalJobs: number;
  /** Point estimate, or null when the denominator is empty. */
  phRate: number | null;
  wilsonLower: number | null;
  admission: AdmissionVerdict;
  admissionReason: string;
  admissionJevRaw: string | undefined;
  publication: PublishAction;
  publicationReason: string;
  kind: GapKind;
  relief: HoldRelief;
}

function nonNegativeInt(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

/** Point estimate, or null when there is no denominator to divide by. */
export function phRateOf(sample: CohortSample): number | null {
  const total = nonNegativeInt(sample.totalJobs);
  if (total <= 0) return null;
  return nonNegativeInt(sample.qualifiedReady) / total;
}

/**
 * The admission decision for a cohort when Jev returned nothing.
 * `mergeAdmissionDecision` is called with `jev = null` because that is the
 * reproducible shape of the lake rows: `lake_ats_discovery.jev_raw` is NULL for
 * 37 of 37 `auto_approved` tenants (measured 2026-10-04, see the incident note),
 * and a NULL verdict is exactly the `null` argument here.
 */
export function admissionVerdictFor(sample: CohortSample): {
  verdict: AdmissionVerdict;
  confidence: number;
  reason: string;
  jevRaw: string | undefined;
} {
  const qualifiedReady = nonNegativeInt(sample.qualifiedReady);
  const totalJobs = nonNegativeInt(sample.totalJobs);
  const phRate = qualifiedReady / totalJobs;
  return mergeAdmissionDecision(
    {
      totalJobs,
      qualifiedReady,
      excluded: 0,
      ambiguous: 0,
      phRate: Number.isFinite(phRate) ? phRate : 0,
      topCategories: [],
    },
    null,
  );
}

export interface PublicationOptions {
  /** `lake_ats_discovery.jev_raw`, already parsed into a choice and confidence. */
  jevChoice?: AdmissionVerdict | null;
  jevConfidence?: number | null;
  sourceId?: string;
}

/** The publication decision for the same cohort, with no inventory snapshot. */
export function publicationVerdictFor(
  sample: CohortSample,
  options: PublicationOptions = {},
): { action: PublishAction; reason: string; wilsonLower: number | null } {
  const decision = decideAutoPublish({
    sourceId: options.sourceId ?? "probe:cohort",
    totalJobs: nonNegativeInt(sample.totalJobs),
    qualifiedReady: nonNegativeInt(sample.qualifiedReady),
    jevChoice: options.jevChoice ?? null,
    jevConfidence: options.jevConfidence ?? null,
    inventory: null,
  });
  return { action: decision.action, reason: decision.reason, wilsonLower: decision.wilsonLower };
}

/**
 * Classify one cohort across both real gates.
 *
 * `admitted_but_held` is the condition INCIDENT-0410 needs to be visible: the lake
 * says the source is authorised, the publication plan says hold, and neither side
 * records the disagreement anywhere a reader would look for it.
 */
export function classifyCohort(
  sample: CohortSample,
  options: PublicationOptions = {},
): CohortClassification {
  const qualifiedReady = nonNegativeInt(sample.qualifiedReady);
  const totalJobs = nonNegativeInt(sample.totalJobs);
  const admission = admissionVerdictFor({ qualifiedReady, totalJobs });
  const publication = publicationVerdictFor({ qualifiedReady, totalJobs }, options);
  const wilsonLower = wilsonLowerBound(Math.min(qualifiedReady, totalJobs), totalJobs);

  let kind: GapKind;
  if (qualifiedReady <= 0 || totalJobs < MIN_JOBS_FOR_RATE) {
    kind = "sample_floor";
  } else if (admission.verdict === "ADMIT" && publication.action === "PUBLISH") {
    kind = "aligned_publish";
  } else if (admission.verdict === "ADMIT") {
    kind = "admitted_but_held";
  } else if (admission.verdict === "REJECT" && publication.action === "REJECT") {
    kind = "aligned_reject";
  } else {
    kind = "aligned_shadow";
  }

  let relief: HoldRelief = "none";
  if (publication.action === "HOLD") {
    relief = "confident_jev_admit_only";
  }

  return {
    qualifiedReady,
    totalJobs,
    phRate: phRateOf({ qualifiedReady, totalJobs }),
    wilsonLower,
    admission: admission.verdict,
    admissionReason: admission.reason,
    admissionJevRaw: admission.jevRaw,
    publication: publication.action,
    publicationReason: publication.reason,
    kind,
    relief,
  };
}

/** Every qualified count a tenant of `totalJobs` observations could hold. */
export function qualifiedRange(totalJobs: number): number[] {
  const total = nonNegativeInt(totalJobs);
  return Array.from({ length: total + 1 }, (_, index) => index);
}

/**
 * The qualified counts at which a tenant of `totalJobs` observations is admitted
 * and then held. For every member the Wilson lower bound is below the floor while
 * the point estimate is at or above the admission threshold.
 */
export function admittedButHeldQualifications(totalJobs: number): number[] {
  return qualifiedRange(totalJobs).filter(
    (qualifiedReady) => classifyCohort({ qualifiedReady, totalJobs }).kind === "admitted_but_held",
  );
}

/**
 * The smallest qualified count that clears the Wilson floor for a tenant of
 * `totalJobs` observations, or null when no count can clear it.
 */
export function minQualifiedForWilsonFloor(totalJobs: number): number | null {
  const total = nonNegativeInt(totalJobs);
  if (total <= 0) return null;
  for (const qualifiedReady of qualifiedRange(total)) {
    const lower = wilsonLowerBound(qualifiedReady, total);
    if (lower !== null && lower >= PUBLISH_PH_RATE_FLOOR) return qualifiedReady;
  }
  return null;
}

/**
 * The true observation rate the publication gate actually demands: the smallest
 * `qualifiedReady / totalJobs` whose Wilson lower bound reaches the floor. It is
 * always strictly greater than the floor itself, because a Wilson lower bound is
 * strictly below its own rate.
 */
export function effectiveFloorRate(totalJobs: number): number | null {
  const minimum = minQualifiedForWilsonFloor(totalJobs);
  if (minimum === null) return null;
  return minimum / nonNegativeInt(totalJobs);
}

/**
 * True when the floor, read as a required *true* rate, is unreachable: a cohort
 * whose point estimate is exactly the floor never clears the gate at any sample
 * size, because the Wilson lower bound approaches the rate from below.
 * Bounded sweep; callers choose the range.
 */
export function floorUnreachableForExactRate(maxTotalJobs: number): boolean {
  const total = nonNegativeInt(maxTotalJobs);
  for (const trials of qualifiedRange(total)) {
    if (trials <= 0) continue;
    if (trials % PUBLISH_PH_RATE_FLOOR !== 0) continue;
    const successes = trials * PUBLISH_PH_RATE_FLOOR;
    if (!Number.isInteger(successes)) continue;
    const lower = wilsonLowerBound(successes, trials);
    if (lower === null) continue;
    if (lower >= PUBLISH_PH_RATE_FLOOR) return false;
  }
  return true;
}

/**
 * A one-line, quotable statement of the mismatch, built from the constants the two
 * real modules export rather than from literals written here.
 */
export function statisticMismatchReceipt(): {
  admissionThreshold: number;
  admissionStatistic: string;
  publicationThreshold: number;
  publicationStatistic: string;
  thresholdsNumericallyEqual: boolean;
  admissionMinJobs: number;
  publicationMinJobs: number;
  jevConfidenceFloor: number;
  admissionRejectThreshold: number;
  publicationRejectThreshold: number;
  rejectThresholdsNumericallyEqual: boolean;
} {
  return {
    admissionThreshold: AUTO_APPROVE_PH_RATE,
    admissionStatistic: "point estimate qualified_ready / job_count",
    publicationThreshold: PUBLISH_PH_RATE_FLOOR,
    publicationStatistic: "Wilson lower bound of (qualified_ready, job_count)",
    thresholdsNumericallyEqual: AUTO_APPROVE_PH_RATE === PUBLISH_PH_RATE_FLOOR,
    admissionMinJobs: MIN_JOBS_TO_EVALUATE,
    publicationMinJobs: MIN_JOBS_FOR_RATE,
    jevConfidenceFloor: JEV_MIN_CONFIDENCE,
    admissionRejectThreshold: AUTO_REJECT_PH_RATE,
    publicationRejectThreshold: REJECT_PH_RATE_FLOOR,
    rejectThresholdsNumericallyEqual: AUTO_REJECT_PH_RATE === REJECT_PH_RATE_FLOOR,
  };
}

/**
 * What the publication gate accepts as relief for a held cohort, given the verdict
 * that is actually recorded in `lake_ats_discovery.jev_raw`. Null verdict first:
 * that is the state measured for every `auto_approved` tenant.
 */
export function heldCohortWithVerdict(
  sample: CohortSample,
  verdict: { choice: AdmissionVerdict; confidence: number } | null,
): { action: PublishAction; reason: string } {
  const result = publicationVerdictFor(sample, {
    jevChoice: verdict?.choice ?? null,
    jevConfidence: verdict?.confidence ?? null,
  });
  return { action: result.action, reason: result.reason };
}
