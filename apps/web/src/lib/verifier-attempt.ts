import { opportunities } from "@va-hub/db";
import { sql } from "drizzle-orm";

export type VerifierAttemptResult = {
  deactivated: number;
  succeeded: boolean;
};

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
      if (result.value.succeeded) summary.succeeded += 1;
      else summary.failedChecks += 1;
    } else {
      summary.failedChecks += 1;
    }
    return summary;
  }, { attempted: 0, succeeded: 0, failedChecks: 0, deactivated: 0 });
}
