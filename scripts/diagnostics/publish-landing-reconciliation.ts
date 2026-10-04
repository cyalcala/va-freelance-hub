/**
 * INCIDENT-0410(q) — a consumed lake row is not a publication.
 *
 * The publish stage has no landing proof. VERIFIED_QUERY + VERIFIED_CODE,
 * 2026-10-04, read-only:
 * - `scripts/lake/sync-to-d1.ts:371-401` appends the ledger receipt statement to
 *   the same wrangler batch as the rows, then marks the lake candidates
 *   `SYNCED_TO_D1` after `execSync` returns without throwing.
 * - On 2026-10-04 the `06:47:05Z` `lake-publish-job` execution reported
 *   `succeeded=1` (digest `sha256:b8bcc639…`, git sha `780f0e86`), the lake's
 *   `SYNCED_TO_D1` count rose 916 -> 920, and prod D1 received no row, no update
 *   and no `lake-sync:` receipt. Four candidates are now recorded as published
 *   with zero publication evidence.
 * - `buildSyncSql` (`sync-to-d1.ts:183-199`) sets `scraped_at` on INSERT and
 *   leaves it alone on `ON CONFLICT(source_url) DO UPDATE`, and the conflict
 *   branch does not touch `updated_at`. So a re-synced, already-public URL
 *   leaves no D1 trace from this writer at all, while `updated_at` is maintained
 *   by other writers (789 rows on 2026-10-04). Neither column attributes a row to
 *   a specific publisher run.
 *
 * Therefore: the receipt is the landing proof (CONSTITUTION §3.2 condition 14);
 * D1 row counts corroborate and measure net-new rows; `updated_at` touches are
 * reported but never used as evidence of landing.
 *
 * Scope: pure. No writer, gateway, client, clock, `child_process`, `fs` or network
 * import. It reports; it never repairs, retries, authorizes or publishes. Every
 * verdict is `L1_ADVISE` with `repairAuthority: "NONE"`, and fresh first-publication
 * flow is never derived here (CONSTITUTION §3.3 cohort separation — D1 has no
 * first-publication column).
 */

export interface PublishWindow {
  /** Inclusive lower bound, ISO-8601 UTC. */
  startIso: string;
  /** Exclusive upper bound, ISO-8601 UTC. */
  endIso: string;
}

/** One lake candidate per row the publisher recorded as `SYNCED_TO_D1` in the window. */
export interface LakeSyncTransitionObservation {
  sourceId: string;
  rowCount: number;
}

/** Prod D1 evidence for one source in the window. `touchedRows` is never landing evidence. */
export interface D1WriteObservation {
  sourceId: string;
  /** Rows whose `scraped_at` falls in the window (net-new storage), possibly from another writer. */
  newRows: number;
  /** Rows whose `updated_at` falls in the window, from any writer. Diagnostic only. */
  touchedRows: number;
}

/** `source_publication_ledger` receipts for one source in the window. */
export interface LedgerReceiptObservation {
  sourceId: string;
  receipts: number;
  publishedCount: number;
}

export interface PublishLandingInput {
  window: PublishWindow;
  /** `null` means "not collected", which is UNKNOWN and never zero. */
  lake: LakeSyncTransitionObservation[] | null;
  d1: D1WriteObservation[] | null;
  ledger: LedgerReceiptObservation[] | null;
  /** Cloud Run / CI conclusion for the window, if known. Never a landing proof. */
  runConclusion?: "succeeded" | "failed" | "unknown";
}

export type SourceLandingClassification =
  /** A receipt was written and the batch that carried it applied. */
  | "LANDED"
  /** The lake consumed rows and no receipt exists for the window. */
  | "CLAIMED_NOT_LANDED"
  /** New D1 rows exist in the window but no receipt does; the rows may belong to another writer. */
  | "LANDED_WITHOUT_RECEIPT"
  /** A receipt exists for the window but no net-new D1 row supports it. */
  | "RECEIPT_WITHOUT_LANDING"
  /** Another writer published or touched rows for this source in the window. */
  | "ACTIVITY_WITHOUT_CLAIM"
  /** Nothing claimed, nothing landed, nothing recorded. */
  | "NO_SUPPLY"
  /** A required observation was not collected. */
  | "UNKNOWN_MISSING_EVIDENCE";

export type PublishLandingSystemVerdict =
  | "PUBLICATION_CONFIRMED"
  | "PUBLICATION_CLAIMED_NOT_CONFIRMED"
  | "NO_PUBLICATION_CLAIMED"
  | "UNKNOWN_MISSING_EVIDENCE";

export interface SourceLandingVerdict {
  sourceId: string;
  classification: SourceLandingClassification;
  claimedRows: number;
  d1NewRows: number;
  touchedRows: number;
  ledgerReceipts: number;
  receiptPublishedCount: number;
  /** Always false: `updated_at` is maintained by writers other than this publisher. */
  d1TouchesUsedAsEvidence: false;
  evidence: string[];
  missing: string[];
  decisionClass: "L1_ADVISE";
  repairAuthority: "NONE";
}

export interface PublishLandingReport {
  window: PublishWindow;
  runConclusion: "succeeded" | "failed" | "unknown";
  verdicts: SourceLandingVerdict[];
  systemVerdict: PublishLandingSystemVerdict;
  /** Rows the lake recorded as `SYNCED_TO_D1` in the window. */
  claimedRows: number;
  /** Claimed rows with no receipt and no net-new D1 row: consumed, unpublished. */
  lostRows: number;
  /** Never derived here; see `freshFlowUnavailableReason`. */
  freshFirstPublicationRows: null;
  freshFlowUnavailableReason: string;
  missing: string[];
  decisionClass: "L1_ADVISE";
  repairAuthority: "NONE";
  /** This module observes only. It writes nothing, so its own publication effect is none. */
  publicationEffect: "NONE";
}

const FRESH_FLOW_UNAVAILABLE =
  "cohort separation (CONSTITUTION §3.3): prod D1 has no first-publication column. " +
  "`scraped_at` is a storage-time proxy that other writers also set and `updated_at` is not " +
  "attributable to this publisher, so fresh first-publication flow is not derivable here.";

const LAKE_MISSING = "lake_sync_transitions";
const D1_MISSING = "prod_d1_write_observation";
const LEDGER_MISSING = "publication_ledger_receipts";

function assertWindow(startIso: string, endIso: string): void {
  const start = Date.parse(startIso);
  const end = Date.parse(endIso);
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    throw new RangeError(`Window bounds must be ISO-8601 instants: ${startIso} .. ${endIso}`);
  }
  if (start >= end) {
    throw new RangeError(`Window start must precede its end: ${startIso} >= ${endIso}`);
  }
}

function count(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.trunc(value) : 0;
}

function sumBySource<T>(
  rows: T[] | null,
  sourceId: (row: T) => string,
  amount: (row: T) => number,
): Map<string, number> {
  const totals = new Map<string, number>();
  if (!rows) return totals;
  for (const row of rows) {
    const id = sourceId(row);
    totals.set(id, (totals.get(id) ?? 0) + count(amount(row)));
  }
  return totals;
}

/** One source's landing decision. Pure; no aggregate state. */
export function classifySourceLanding(input: {
  sourceId: string;
  claimedRows: number;
  d1NewRows: number;
  touchedRows: number;
  receipts: number;
  publishedCount: number;
}): SourceLandingVerdict {
  const claimedRows = count(input.claimedRows);
  const d1NewRows = count(input.d1NewRows);
  const touchedRows = count(input.touchedRows);
  const receipts = count(input.receipts);
  const publishedCount = count(input.publishedCount);

  // A receipt row exists only if its statement applied, and `published_count` is
  // written as the proposed count. published_count = 0 is therefore not a receipt.
  const effectiveReceipt = receipts > 0 && publishedCount > 0;

  const evidence = [
    `lake_claimed_rows=${claimedRows}`,
    `ledger_receipts=${receipts}`,
    `receipt_published_count=${publishedCount}`,
    `d1_new_rows=${d1NewRows}`,
    `d1_touched_rows_ignored=${touchedRows}`,
  ];

  // Decision ladder:
  //   claimed > 0  -> receipt                                  => LANDED
  //                  new D1 rows, no receipt                   => LANDED_WITHOUT_RECEIPT
  //                  no receipt, no new D1 row                  => CLAIMED_NOT_LANDED
  //   claimed = 0  -> receipt row, no new D1 row               => RECEIPT_WITHOUT_LANDING
  //                  any other D1 or receipt activity          => ACTIVITY_WITHOUT_CLAIM
  //                  nothing at all                            => NO_SUPPLY
  const classification: SourceLandingClassification =
    claimedRows > 0
      ? effectiveReceipt
        ? "LANDED"
        : d1NewRows > 0
          ? "LANDED_WITHOUT_RECEIPT"
          : "CLAIMED_NOT_LANDED"
      : receipts > 0 && d1NewRows === 0
        ? "RECEIPT_WITHOUT_LANDING"
        : receipts > 0 || d1NewRows > 0 || touchedRows > 0
          ? "ACTIVITY_WITHOUT_CLAIM"
          : "NO_SUPPLY";

  return {
    sourceId: input.sourceId,
    classification,
    claimedRows,
    d1NewRows,
    touchedRows,
    ledgerReceipts: receipts,
    receiptPublishedCount: publishedCount,
    d1TouchesUsedAsEvidence: false,
    evidence,
    missing: [],
    decisionClass: "L1_ADVISE",
    repairAuthority: "NONE",
  };
}

/**
 * Reconciles one publisher window from three independently collected,
 * read-only observations. Any observation left `null` was not collected, which is
 * UNKNOWN rather than zero, so the window verdict degrades instead of inventing a
 * supply loss or a publication.
 */
export function reconcilePublishLanding(input: PublishLandingInput): PublishLandingReport {
  assertWindow(input.window.startIso, input.window.endIso);

  const missing: string[] = [];
  if (!input.lake) missing.push(LAKE_MISSING);
  if (!input.d1) missing.push(D1_MISSING);
  if (!input.ledger) missing.push(LEDGER_MISSING);

  const claimed = sumBySource(input.lake, (row) => row.sourceId, (row) => row.rowCount);
  const newRows = sumBySource(input.d1, (row) => row.sourceId, (row) => row.newRows);
  const touched = sumBySource(input.d1, (row) => row.sourceId, (row) => row.touchedRows);
  const receipts = sumBySource(input.ledger, (row) => row.sourceId, (row) => row.receipts);
  const published = sumBySource(input.ledger, (row) => row.sourceId, (row) => row.publishedCount);

  const sourceIds = [...new Set([...claimed.keys(), ...newRows.keys(), ...receipts.keys()])].sort();

  const verdicts: SourceLandingVerdict[] = sourceIds.map((sourceId) => {
    if (missing.length > 0) {
      return {
        sourceId,
        classification: "UNKNOWN_MISSING_EVIDENCE" as const,
        claimedRows: claimed.get(sourceId) ?? 0,
        d1NewRows: newRows.get(sourceId) ?? 0,
        touchedRows: touched.get(sourceId) ?? 0,
        ledgerReceipts: receipts.get(sourceId) ?? 0,
        receiptPublishedCount: published.get(sourceId) ?? 0,
        d1TouchesUsedAsEvidence: false as const,
        evidence: [],
        missing: [...missing],
        decisionClass: "L1_ADVISE" as const,
        repairAuthority: "NONE" as const,
      };
    }
    return classifySourceLanding({
      sourceId,
      claimedRows: claimed.get(sourceId) ?? 0,
      d1NewRows: newRows.get(sourceId) ?? 0,
      touchedRows: touched.get(sourceId) ?? 0,
      receipts: receipts.get(sourceId) ?? 0,
      publishedCount: published.get(sourceId) ?? 0,
    });
  });

  const claimedRows = verdicts.reduce((sum, verdict) => sum + verdict.claimedRows, 0);
  const lostRows = verdicts.reduce(
    (sum, verdict) => sum + (verdict.classification === "CLAIMED_NOT_LANDED" ? verdict.claimedRows : 0),
    0,
  );

  let systemVerdict: PublishLandingSystemVerdict;
  if (missing.length > 0) {
    systemVerdict = "UNKNOWN_MISSING_EVIDENCE";
  } else if (
    verdicts.some(
      (verdict) =>
        verdict.classification === "CLAIMED_NOT_LANDED" || verdict.classification === "LANDED_WITHOUT_RECEIPT",
    )
  ) {
    systemVerdict = "PUBLICATION_CLAIMED_NOT_CONFIRMED";
  } else if (claimedRows > 0) {
    systemVerdict = "PUBLICATION_CONFIRMED";
  } else {
    systemVerdict = "NO_PUBLICATION_CLAIMED";
  }

  return {
    window: input.window,
    runConclusion: input.runConclusion ?? "unknown",
    verdicts,
    systemVerdict,
    claimedRows,
    lostRows,
    freshFirstPublicationRows: null,
    freshFlowUnavailableReason: FRESH_FLOW_UNAVAILABLE,
    missing,
    decisionClass: "L1_ADVISE",
    repairAuthority: "NONE",
    publicationEffect: "NONE",
  };
}

/**
 * Read-only. Lake candidates the publisher consumed in the window, per source.
 *
 * `synced_to_d1_at` is written by `datetime('now')`, i.e. `YYYY-MM-DD HH:MM:SS`,
 * so the ISO-8601 bounds are normalised through SQLite's `datetime()`. Comparing
 * the raw column against an ISO string would silently match nothing, because a
 * space sorts before `T`.
 */
export function buildLakeSyncTransitionSql(
  startIso: string,
  endIso: string,
): { sql: string; args: string[] } {
  assertWindow(startIso, endIso);
  return {
    sql: `SELECT source_id AS sourceId, COUNT(*) AS rowCount
FROM lake_candidate_jobs
WHERE status = 'SYNCED_TO_D1' AND synced_to_d1_at >= datetime(?) AND synced_to_d1_at < datetime(?)
GROUP BY source_id
ORDER BY rowCount DESC`,
    args: [startIso, endIso],
  };
}

/**
 * Read-only. Prod D1 row evidence for the window, per source. `newRows` counts
 * rows first stored in the window (`scraped_at`); `touchedRows` counts rows
 * written in the window by any writer (`updated_at`) and is diagnostic only.
 */
export function buildD1LandingSql(startIso: string, endIso: string): { sql: string; args: string[] } {
  assertWindow(startIso, endIso);
  return {
    sql: `SELECT source_id AS sourceId,
       SUM(CASE WHEN scraped_at >= ? AND scraped_at < ? THEN 1 ELSE 0 END) AS newRows,
       COUNT(*) AS touchedRows
FROM opportunities
WHERE updated_at >= ? AND updated_at < ?
GROUP BY source_id
ORDER BY newRows DESC`,
    args: [startIso, endIso, startIso, endIso],
  };
}

/** Read-only. `lake-sync:` publication receipts decided in the window, per source. */
export function buildLedgerReceiptSql(startIso: string, endIso: string): { sql: string; args: string[] } {
  assertWindow(startIso, endIso);
  return {
    sql: `SELECT source_id AS sourceId, COUNT(*) AS receipts, SUM(published_count) AS publishedCount
FROM source_publication_ledger
WHERE tick_key LIKE 'lake-sync:%' AND decided_at >= ? AND decided_at < ?
GROUP BY source_id
ORDER BY receipts DESC`,
    args: [startIso, endIso],
  };
}