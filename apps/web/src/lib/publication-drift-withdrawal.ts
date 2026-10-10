import { and, eq, inArray, isNotNull, or, sql, type SQL } from "drizzle-orm";
import { getDb, opportunities } from "@va-hub/db";
import {
  assessPostingFreshness,
  hasExplicitNonRemoteLocationType,
  PUBLIC_PH_ELIGIBILITIES,
} from "@va-hub/scraper";

/** Not feed-recoverable. A later healthy feed must not republish this row. */
export const PUBLICATION_DRIFT_INACTIVE_REASON = "publication-drift";

type PublicationDb = ReturnType<typeof getDb>;

export type PublicationDriftWithdrawal = {
  examined: number;
  withdrawnIds: number[];
};

/**
 * Idempotently removes already-public rows whose stored workplace is explicit
 * non-remote, or whose stored original date is outside the current inclusive
 * window. Unknown dates and null workplace stay. Rows with no publication
 * ledger are not treated as failed acknowledgements. This does not rewrite the
 * serving snapshot; ADR-010 still rejects a collapsed replacement board.
 */
export async function withdrawInvalidPublicDrift(
  db: PublicationDb,
  observedAt: string,
): Promise<PublicationDriftWithdrawal> {
  if (assessPostingFreshness("2026-01-01T00:00:00.000Z", observedAt).state === "INVALID") {
    return { examined: 0, withdrawnIds: [] };
  }

  const candidates = await db.select({
    id: opportunities.id,
    postedAt: opportunities.postedAt,
    locationType: opportunities.locationType,
  }).from(opportunities).where(and(
    eq(opportunities.isActive, true),
    inArray(opportunities.phEligibility, [...PUBLIC_PH_ELIGIBILITIES]),
    or(
      inArray(opportunities.locationType, ["onsite", "hybrid"]),
      and(isNotNull(opportunities.postedAt), sql`${opportunities.postedAt} <> ''`),
    ),
  ));

  const withdrawnIds: number[] = [];
  for (const row of candidates) {
    const workplace = hasExplicitNonRemoteLocationType(row.locationType);
    const dated = typeof row.postedAt === "string" && row.postedAt.trim() !== "";
    const dateInvalid = dated && assessPostingFreshness(row.postedAt, observedAt).state !== "WITHIN_WINDOW";
    if (!workplace && !dateInvalid) continue;
    const evidence: SQL[] = [];
    if (hasExplicitNonRemoteLocationType(row.locationType)) {
      evidence.push(eq(opportunities.locationType, row.locationType));
    }
    if (dateInvalid && typeof row.postedAt === "string") evidence.push(eq(opportunities.postedAt, row.postedAt));
    const matchedEvidence = evidence.length === 1 ? evidence[0]! : or(...evidence);
    const updated = await db.update(opportunities).set({
      isActive: false,
      inactiveReason: PUBLICATION_DRIFT_INACTIVE_REASON,
      updatedAt: observedAt,
    }).where(and(
      eq(opportunities.id, row.id),
      eq(opportunities.isActive, true),
      inArray(opportunities.phEligibility, [...PUBLIC_PH_ELIGIBILITIES]),
      matchedEvidence,
    )).returning({ id: opportunities.id });
    if (updated.length === 1 && updated[0]?.id === row.id) withdrawnIds.push(row.id);
  }
  return { examined: candidates.length, withdrawnIds };
}
