/**
 * INCIDENT-0410(r) — size the claimed-versus-receipted publication gap.
 *
 * A lake candidate stamped `SYNCED_TO_D1` is a claim, not a publication. The
 * landing proof is the `lake-sync:` receipt in prod D1 `source_publication_ledger`
 * (CONSTITUTION §3.2 condition 14), because `buildSyncSql` sets `scraped_at` only
 * on INSERT and leaves `ON CONFLICT(source_url) DO UPDATE` without any timestamp,
 * so a re-synced already-public URL leaves no D1 trace from this writer.
 *
 * The gap was previously measured for one run window only
 * (`publish-landing-reconciliation.ts`, INCIDENT-0410(q)). That module answers
 * "did this window land?". It cannot answer "how much of the retained publish
 * history has landing evidence at all?", which is the sizing input for the
 * reviewer-owned writer fix in `sync-to-d1.ts` (MERGE_RUBRIC §4.3 HOLD) and for
 * recovering rows consumed without publication.
 *
 * The measurement rule this module encodes, and the reason it is not arithmetic:
 * a day on which **no** receipt of any kind exists carries no evidence about its
 * own claims, because the receipt mechanism itself may not have been running then.
 * Such a day is reported `CLAIMS_NO_RECEIPT_ANYWHERE` with `evidenceStrength:
 * "UNKNOWN"` and `unevidencedClaimedRows: null` — it is never counted as lost
 * supply. Only inside a day that carries at least one receipt is a claim shortfall
 * measured evidence of missing publication evidence, and even then it is an upper
 * bound on *unevidenced* publications, not proof that rows are absent from D1.
 *
 * Scope: pure. No writer, gateway, client, clock, `child_process`, `fs` or network
 * import. It reports; it never repairs, retries, authorizes or publishes, and it
 * derives no fresh first-publication flow (CONSTITUTION §3.3). Callers must group
 * both sides into `day` in the same timezone window; the two production clocks
 * stamp `synced_to_d1_at` as `YYYY-MM-DD HH:MM:SS` and `decided_at` as ISO-8601
 * UTC, and this module deliberately performs no timezone conversion of its own.
 *
 * Types are declared locally rather than imported from
 * `scripts/diagnostics/publish-landing-reconciliation.ts`: that module is not yet
 * merged to `origin/main`, and this module must stay compilable without it.
 */

export const INCIDENT = "INCIDENT-0410(r)";

/** Lake-side claim for one source on one caller-normalized day. */
export interface ClaimedSyncDayRow {
  day: string;
  sourceId: string;
  claimedRows: number;
}

/** Prod D1 `lake-sync:` receipt evidence for one source on one caller-normalized day. */
export interface LedgerReceiptDayRow {
  day: string;
  sourceId: string;
  receipts: number;
  publishedCount: number;
}

export type PublicationEvidenceClass =
  /** Claims exist and the day's receipted `published_count` covers them. */
  | "RECEIPTS_COVER_CLAIMS"
  /** Claims exist, receipts exist for the day, and receipts cover fewer rows. */
  | "RECEIPT_GAP"
  /** Claims exist and the day carries no receipt at all: coverage UNKNOWN, not loss. */
  | "CLAIMS_NO_RECEIPT_ANYWHERE"
  /** Receipts exist but the lake recorded no claim that day (attribution to resolve). */
  | "RECEIPTS_NO_CLAIMS"
  /** Neither side recorded anything. */
  | "NO_ACTIVITY";

export type EvidenceStrength = "MEASURED" | "UNKNOWN";

export interface DayReceiptCensusRow {
  day: string;
  claimedRows: number;
  receiptedPublishedCount: number;
  receipts: number;
  sourcesClaimed: number;
  sourcesWithReceipts: number;
  evidenceClass: PublicationEvidenceClass;
  evidenceStrength: EvidenceStrength;
  /**
   * Claims with no receipt covering them on a day that carries receipts.
   * `null` whenever coverage is UNKNOWN, so it can never be summed into a loss figure.
   */
  unevidencedClaimedRows: number | null;
}

export type SourceEvidenceClass =
  /** This source has its own receipts and they cover its claims. */
  | "SOURCE_RECEIPTED"
  /** This source has claims, no receipt of its own, and the day carries receipts for siblings. */
  | "SOURCE_CLAIM_UNRECEIPTED_COVERED_DAY"
  /** This source has claims and the day carries no receipt at all: coverage UNKNOWN. */
  | "SOURCE_CLAIM_COVERAGE_UNKNOWN"
  /** This source has receipts but no lake claim that day (attribution to resolve). */
  | "RECEIPT_WITHOUT_SOURCE_CLAIM";

export interface SourceReceiptCensusRow {
  day: string;
  sourceId: string;
  claimedRows: number;
  receiptedPublishedCount: number;
  receipts: number;
  evidenceClass: SourceEvidenceClass;
  evidenceStrength: EvidenceStrength;
  unevidencedClaimedRows: number | null;
}

export interface PublicationReceiptCensus {
  days: DayReceiptCensusRow[];
  sources: SourceReceiptCensusRow[];
  summary: {
    daysObserved: number;
    coveredDays: number;
    /** Days whose receipt coverage is UNKNOWN; their claims are excluded from every total. */
    uncoveredDays: number;
    claimedRowsTotal: number;
    receiptedPublishedCountTotal: number;
    /** Sum over covered days only. Upper bound on unevidenced publications, never a loss count. */
    unevidencedClaimedRowsInCoveredDays: number;
    coveredClaimedRows: number;
    coveredReceiptedPublishedCount: number;
  };
  invariants: {
    decisionClass: "L1_ADVISE";
    repairAuthority: "NONE";
    publicationEffect: "NONE";
    coverageRule: string;
    lossClaimRule: string;
  };
  caveats: string[];
  nextEvidence: string;
}

function sumByDay(
  rows: Array<{ day: string; sourceId: string; value: number }>,
): Map<string, Map<string, number>> {
  const byDay = new Map<string, Map<string, number>>();
  for (const row of rows) {
    let sources = byDay.get(row.day);
    if (!sources) {
      sources = new Map<string, number>();
      byDay.set(row.day, sources);
    }
    sources.set(row.sourceId, (sources.get(row.sourceId) ?? 0) + row.value);
  }
  return byDay;
}

function dayKeys(claims: ClaimedSyncDayRow[], receipts: LedgerReceiptDayRow[]): string[] {
  return Array.from(new Set([...claims.map((r) => r.day), ...receipts.map((r) => r.day)])).sort();
}

/**
 * Builds the per-day and per-source receipt census.
 *
 * A day is "covered" when it carries at least one receipt, whatever its source. Only covered
 * days yield a measured `unevidencedClaimedRows`; a source's coverage comes from the day, not
 * from its own receipts, because a sibling source's receipt in the same batch is what proves
 * the receipt mechanism was live for that batch.
 */
export function censusPublicationReceipts(input: {
  claims: ClaimedSyncDayRow[];
  receipts: LedgerReceiptDayRow[];
}): PublicationReceiptCensus {
  const claimedByDay = sumByDay(
    input.claims.map((r) => ({ day: r.day, sourceId: r.sourceId, value: r.claimedRows })),
  );
  const receiptedByDay = sumByDay(
    input.receipts.map((r) => ({ day: r.day, sourceId: r.sourceId, value: r.publishedCount })),
  );
  const receiptsByDay = sumByDay(
    input.receipts.map((r) => ({ day: r.day, sourceId: r.sourceId, value: r.receipts })),
  );
  const allDays = dayKeys(input.claims, input.receipts);

  const days: DayReceiptCensusRow[] = [];
  const sources: SourceReceiptCensusRow[] = [];
  let coveredClaimedRows = 0;
  let coveredReceiptedPublishedCount = 0;
  let unevidencedInCoveredDays = 0;
  let coveredDays = 0;
  let uncoveredDays = 0;

  for (const day of allDays) {
    const claimed = claimedByDay.get(day);
    const receipted = receiptedByDay.get(day);
    const claimedRows = sumSources(claimed);
    const receiptedPublishedCount = sumSources(receipted);
    const receipts = sumSources(receiptsByDay.get(day));

    let evidenceClass: PublicationEvidenceClass;
    if (claimedRows > 0 && receiptedPublishedCount >= claimedRows && receipts > 0) {
      evidenceClass = "RECEIPTS_COVER_CLAIMS";
    } else if (claimedRows > 0 && receipts > 0) {
      evidenceClass = "RECEIPT_GAP";
    } else if (claimedRows > 0) {
      evidenceClass = "CLAIMS_NO_RECEIPT_ANYWHERE";
    } else if (receipts > 0 || receiptedPublishedCount > 0) {
      evidenceClass = "RECEIPTS_NO_CLAIMS";
    } else {
      evidenceClass = "NO_ACTIVITY";
    }

    const covered = receipts > 0;
    const gap = claimedRows > receiptedPublishedCount ? claimedRows - receiptedPublishedCount : 0;
    // Inside a covered day the shortfall is measured even when it is zero; outside coverage
    // it stays `null` so it can never be summed into a loss figure.
    const unevidenced = covered && claimedRows > 0 ? gap : null;

    days.push({
      day,
      claimedRows,
      receiptedPublishedCount,
      receipts,
      sourcesClaimed: claimed?.size ?? 0,
      sourcesWithReceipts: receipted?.size ?? 0,
      evidenceClass,
      evidenceStrength: covered ? "MEASURED" : "UNKNOWN",
      unevidencedClaimedRows: unevidenced,
    });

    if (!covered) continue;
    coveredDays += 1;
    coveredClaimedRows += claimedRows;
    coveredReceiptedPublishedCount += receiptedPublishedCount;
    unevidencedInCoveredDays += gap;
  }

  // Per-source census, read from the same per-day maps as the day loop.
  for (const day of allDays) {
    const dayCovered = (receiptsByDay.get(day)?.size ?? 0) > 0;
    const sourceIds = Array.from(
      new Set([...(claimedByDay.get(day)?.keys() ?? []), ...(receiptedByDay.get(day)?.keys() ?? [])]),
    ).sort();
    for (const sourceId of sourceIds) {
      const sourceClaims = claimedByDay.get(day)?.get(sourceId) ?? 0;
      const sourceReceipts = receiptsByDay.get(day)?.get(sourceId) ?? 0;
      const sourceReceipted = receiptedByDay.get(day)?.get(sourceId) ?? 0;
      let evidenceClass: SourceEvidenceClass;
      if (sourceClaims > 0 && sourceReceipted >= sourceClaims && sourceReceipts > 0) {
        evidenceClass = "SOURCE_RECEIPTED";
      } else if (sourceClaims > 0 && dayCovered) {
        // Coverage comes from the day, not from this source: a sibling source's receipt in the
        // same batch proves the receipt mechanism was live, so this source's shortfall is measured.
        evidenceClass = "SOURCE_CLAIM_UNRECEIPTED_COVERED_DAY";
      } else if (sourceClaims > 0) {
        evidenceClass = "SOURCE_CLAIM_COVERAGE_UNKNOWN";
      } else {
        evidenceClass = "RECEIPT_WITHOUT_SOURCE_CLAIM";
      }
      const sourceGap = sourceClaims - sourceReceipted;
      sources.push({
        day,
        sourceId,
        claimedRows: sourceClaims,
        receiptedPublishedCount: sourceReceipted,
        receipts: sourceReceipts,
        evidenceClass,
        evidenceStrength: dayCovered ? "MEASURED" : "UNKNOWN",
        unevidencedClaimedRows:
          evidenceClass === "SOURCE_CLAIM_UNRECEIPTED_COVERED_DAY" ? sourceGap : null,
      });
    }
  }

  for (const row of days) {
    if (row.evidenceClass === "CLAIMS_NO_RECEIPT_ANYWHERE") uncoveredDays += 1;
  }

  return {
    days,
    sources,
    summary: {
      daysObserved: days.length,
      coveredDays,
      uncoveredDays,
      claimedRowsTotal: days.reduce((acc, d) => acc + d.claimedRows, 0),
      receiptedPublishedCountTotal: days.reduce((acc, d) => acc + d.receiptedPublishedCount, 0),
      unevidencedClaimedRowsInCoveredDays: unevidencedInCoveredDays,
      coveredClaimedRows,
      coveredReceiptedPublishedCount,
    },
    invariants: {
      decisionClass: "L1_ADVISE",
      repairAuthority: "NONE",
      publicationEffect: "NONE",
      coverageRule:
        "A day with no receipt of any kind is coverage UNKNOWN; its claims are excluded from every total and are never reported as lost supply.",
      lossClaimRule:
        "unevidencedClaimedRows counts claims with no receipt on a covered day. It is an upper bound on missing publication evidence, never a count of absent public rows.",
    },
    caveats: [
      "A receipt is written in the same batch as the rows, so a missing receipt can mean a failed batch, a rejected statement, or a run that consumed the queue without submitting anything; the ledger does not distinguish them.",
      "A claimed row whose URL was already public produces no new D1 row from this writer, so D1 row counts can neither confirm nor refute a claim; only the receipt can.",
      "Both sides must be grouped into `day` in the same timezone window by the caller; this module performs no timezone conversion.",
      "Re-synced rows carry the lake stamp of the latest claim, so a row claimed on several days appears on each of them.",
    ],
    nextEvidence:
      "For each `RECEIPT_GAP` day and source, read the `lake-publish-job` execution log for that window and confirm whether wrangler submitted the batch, then re-run this census over the recovered receipts.",
  };
}

function sumSources(sources: Map<string, number> | undefined): number {
  if (!sources) return 0;
  let total = 0;
  for (const value of sources.values()) total += value;
  return total;
}

/** Lake-side claim census. Read-only; caller supplies the group window. */
export function buildLakeClaimCensusSql(): { sql: string; args: string[] } {
  return {
    sql: `SELECT date(synced_to_d1_at) AS day, source_id AS sourceId, COUNT(*) AS claimedRows
FROM lake_candidate_jobs
WHERE status = 'SYNCED_TO_D1' AND synced_to_d1_at IS NOT NULL
GROUP BY day, source_id
ORDER BY day, source_id`,
    args: [],
  };
}

/** Prod D1 receipt census. Read-only; caller supplies the group window. */
export function buildLedgerReceiptCensusSql(): { sql: string; args: string[] } {
  return {
    sql: `SELECT date(decided_at) AS day, source_id AS sourceId,
COUNT(*) AS receipts, SUM(published_count) AS publishedCount
FROM source_publication_ledger
WHERE tick_key LIKE 'lake-sync:%'
GROUP BY day, source_id
ORDER BY day, source_id`,
    args: [],
  };
}