import { opportunities } from "@va-hub/db";
import { sql } from "drizzle-orm";

export type VerifierAttemptResult = {
  deactivated: number;
  succeeded: boolean;
  platformBudgetFailure?: boolean;
};

// Cloudflare Workers Free permits 50 external subrequests per invocation.
// Redirect hops also consume that budget, so keep ten requests of headroom
// rather than selecting right up to the platform ceiling.
export const VERIFIER_EXTERNAL_SUBREQUEST_CAP = 50;
export const VERIFIER_SAFE_FETCH_BUDGET = 40;
export const VERIFIER_MAX_REDIRECT_HOPS = 1;
export const VERIFIER_MAX_FETCHES_PER_ITEM = 1 + VERIFIER_MAX_REDIRECT_HOPS;
export const VERIFIER_SAFE_ITEM_BUDGET = Math.floor(
  VERIFIER_SAFE_FETCH_BUDGET / VERIFIER_MAX_FETCHES_PER_ITEM,
);
export const VERIFIER_LEGACY_REQUESTED_LIMIT = 120;

export function clampVerifierLimit(requested: number): number {
  if (!Number.isFinite(requested) || requested < 1) {
    return VERIFIER_SAFE_ITEM_BUDGET;
  }
  return Math.min(Math.floor(requested), VERIFIER_SAFE_ITEM_BUDGET);
}

export function isPlatformSubrequestLimitError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /too many subrequests|subrequest limit|subrequests exceeded/i.test(message);
}

export function buildVerifierSelectionQuery(limit: number) {
  return sql`
    SELECT ${opportunities.id} AS id,
           ${opportunities.sourceUrl} AS sourceUrl,
           ${opportunities.failedVerificationCount} AS failedCount
    FROM ${opportunities}
    WHERE ${opportunities.isActive} = 1
    ORDER BY ${opportunities.lastVerifiedAt} ASC, ${opportunities.id} ASC
    LIMIT ${limit}
  `;
}

export function buildVerifierFailureUpdate(
  attemptedAt: string,
) {
  return {
    lastVerifiedAt: attemptedAt,
    updatedAt: attemptedAt,
  };
}

export function summarizeVerifierAttempts(
  results: PromiseSettledResult<VerifierAttemptResult>[],
) {
  return results.reduce((summary, result) => {
    summary.attempted += 1;
    if (result.status === "fulfilled") {
      summary.deactivated += result.value.deactivated;
      if (result.value.platformBudgetFailure) summary.platformBudgetFailures += 1;
      if (result.value.succeeded) summary.succeeded += 1;
      else summary.failedChecks += 1;
    } else {
      summary.failedChecks += 1;
    }
    return summary;
  }, { attempted: 0, succeeded: 0, failedChecks: 0, deactivated: 0, platformBudgetFailures: 0 });
}
