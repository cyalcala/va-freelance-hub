/**
 * INCIDENT-0410(o) — a "successful" publisher run is not evidence of publication.
 *
 * VERIFIED_QUERY, 2026-10-04 14:2x Manila, read-only:
 * - prod D1 `source_publication_ledger` newest `lake-sync:` receipt = `2026-10-03T14:00:42.218Z`
 * - Turso `MAX(lake_candidate_jobs.synced_to_d1_at)` = `2026-10-03 14:00:48`
 * - `lake_candidate_jobs` QUALIFIED_READY = 64 rows in 18 sources
 * - `lake-publish-job` (Cloud Run, `47 * * * *`, digest sha256:b8bcc639…, git sha 780f0e86)
 *   reports SUCCESS on every hourly execution, including ~16 h with zero receipts
 *
 * `scripts/gcp/run-lake-publish.ts` returns `{ ok: true }` — exit status 0 — for BOTH
 * "nothing to publish" and the credential-skip path, so the only durable distinction
 * between a healthy publish, a supply-starved run and a skipped run is a console line
 * that is overwritten every tick. This classifier turns the observable records into one
 * named verdict so the next occurrence is one query instead of one incident.
 *
 * Scope: pure. No writer, gateway, ledger, network, database, clock or writer import.
 * Adds no numeric gate: every branch is presence/absence of an observable record.
 * Lowers no threshold and grants no publication authority; it reports.
 */
import type { CohortAdjacencyReport } from "../lake/auto-publish-cohort-adjacency";
import type { DiscoveryTenantRow } from "../lake/sync-to-d1";

export type JobExitStatus = "succeeded" | "failed" | "unknown";

export type PublisherRunOutcome =
  | "PUBLISHED"
  | "SILENT_ZERO_NO_AUTHORIZED_CANDIDATES"
  | "SILENT_ZERO_CREDENTIAL_SKIP"
  | "SILENT_ZERO_WRITER_DID_NOT_RECEIPT"
  | "RUN_FAILED"
  | "UNKNOWN_MISSING_EVIDENCE";

export type PublisherSupplyVerdict =
  | "supply_available_to_publisher"
  | "supply_exhausted"
  | "unknown";

export interface PublisherRunObservation {
  /** Cloud Run / CI conclusion for the run window under inspection. */
  jobExit: JobExitStatus;
  /**
   * Count of `lake-sync:` rows in `source_publication_ledger` for the run window.
   * `null` means the reviewer did not measure it — never "zero".
   */
  ledgerReceiptRows: number | null;
  /** Output of the real `measureCohortAdjacency` over the same window. */
  adjacency: CohortAdjacencyReport;
  /**
   * Whether the run's own structured log carried
   * `lake_publish_skipped_missing_credentials`. "unknown" means the log was not read;
   * it is not evidence that the run was not skipped.
   */
  credentialSkipSignal: "reported" | "absent" | "unknown";
}

export interface PublisherRunClassification {
  outcome: PublisherRunOutcome;
  supplyVerdict: PublisherSupplyVerdict;
  /** Rows the real planner granted this run (`authorizedCapacity`). */
  plannedRows: number;
  /** QUALIFIED_READY rows an authorized path can actually reach this run. */
  reachableRows: number;
  /** `plannedRows - reachableRows`: granted capacity no pending row backs. */
  unbackedPlanRows: number;
  /** QUALIFIED_READY rows the source gate holds (rate-held or unauthorized tenants). */
  heldBySourceGateRows: number;
  evidenceCompleteness: "complete" | "partial";
  missingEvidence: string[];
  nextEvidence: string;
  reason: string;
}

/** Receipts and the pending census are the only durable publication evidence. */
function reachablePendingRows(adjacency: CohortAdjacencyReport): number {
  return Math.max(
    0,
    Math.trunc(adjacency.pendingRowsInAuthorizedSources) + Math.trunc(adjacency.pendingRowsInBaseAuthorizedSources),
  );
}

/**
 * Classifies one publisher run. Every branch is decided by the presence or absence
 * of an observable record, never by a score, so a low-scoring run is never cleared.
 */
export function classifyPublisherRun(observation: PublisherRunObservation): PublisherRunClassification {
  const { jobExit, ledgerReceiptRows, adjacency, credentialSkipSignal } = observation;
  const plannedRows = Math.max(0, Math.trunc(adjacency.authorizedCapacity));
  const reachableRows = reachablePendingRows(adjacency);
  const heldBySourceGateRows = Math.max(0, Math.trunc(adjacency.pendingRowsInHeldSources));
  const unbackedPlanRows = Math.max(0, plannedRows - reachableRows);
  const missingEvidence: string[] = [];
  if (ledgerReceiptRows === null) missingEvidence.push("ledgerReceiptRows");
  if (jobExit === "unknown") missingEvidence.push("jobExit");

  const base = {
    plannedRows,
    reachableRows,
    unbackedPlanRows,
    heldBySourceGateRows,
    missingEvidence,
  };

  if (jobExit === "failed") {
    return {
      ...base,
      outcome: "RUN_FAILED",
      supplyVerdict: "unknown",
      evidenceCompleteness: ledgerReceiptRows === null ? "partial" : "complete",
      nextEvidence: "Read the failing execution's error line (`lake_publish_failed`) before any supply conclusion.",
      reason: "The run reported failure, so its absence of receipts is explained by the failure itself.",
    };
  }

  if (jobExit === "unknown") {
    return {
      ...base,
      outcome: "UNKNOWN_MISSING_EVIDENCE",
      supplyVerdict: "unknown",
      evidenceCompleteness: "partial",
      nextEvidence: "Establish the run's exit status (`oc-gcp-deploy status lake-publish-job`) before any supply conclusion.",
      reason: "Exit status is not evidence in either direction; no outcome is inferred from it.",
    };
  }

  if (credentialSkipSignal === "reported") {
    return {
      ...base,
      outcome: "SILENT_ZERO_CREDENTIAL_SKIP",
      supplyVerdict: "unknown",
      evidenceCompleteness: ledgerReceiptRows === null ? "partial" : "complete",
      nextEvidence:
        "Check whether the Cloud Run job's secret bindings resolved (TURSO_DATABASE_URL / CLOUDFLARE_API_TOKEN) for that revision.",
      reason:
        "The run reported `lake_publish_skipped_missing_credentials` and still exited 0, so supply was never evaluated.",
    };
  }

  if (ledgerReceiptRows !== null && ledgerReceiptRows > 0) {
    return {
      ...base,
      outcome: "PUBLISHED",
      supplyVerdict: reachableRows > 0 ? "supply_available_to_publisher" : "supply_exhausted",
      evidenceCompleteness: "complete",
      nextEvidence:
        reachableRows > 0
          ? "Compare the receipt's published_count against this run's reachableRows to size the remaining plan."
          : "Receipts exist although no authorized pending row backs them; confirm which path wrote them.",
      reason: `The ledger recorded ${ledgerReceiptRows} lake-sync receipt(s) for the window.`,
    };
  }

  if (ledgerReceiptRows === null) {
    return {
      ...base,
      outcome: "UNKNOWN_MISSING_EVIDENCE",
      supplyVerdict: "unknown",
      evidenceCompleteness: "partial",
      nextEvidence: "Count the window's `lake-sync:` rows in `source_publication_ledger` (PUBLISHER_OUTCOME_SQL.ledger).",
      reason: "Receipt count was not measured; zero publications is not inferred from an absent measurement.",
    };
  }

  if (reachableRows === 0) {
    return {
      ...base,
      outcome: "SILENT_ZERO_NO_AUTHORIZED_CANDIDATES",
      supplyVerdict: "supply_exhausted",
      evidenceCompleteness: "complete",
      nextEvidence:
        heldBySourceGateRows > 0
          ? "Adjudicate the held cohort through the EXISTING gate (a bounded re-evaluation pass), or record that its rows are not PH-eligible supply."
          : "Acquire new QUALIFIED_READY rows; no authorized source has a pending row to publish.",
      reason:
        `The run succeeded, wrote no receipt, and ${heldBySourceGateRows} QUALIFIED_READY row(s) sit behind the source gate ` +
        `while ${unbackedPlanRows} planned row(s) have no pending row behind them.`,
    };
  }

  return {
    ...base,
    outcome: "SILENT_ZERO_WRITER_DID_NOT_RECEIPT",
    supplyVerdict: "supply_available_to_publisher",
    evidenceCompleteness: "complete",
    nextEvidence:
      "Read that execution's stdout for `syncQualifiedJobsToD1`; the `[Queue] …` and `[AutoPublish] …` lines exist only there.",
    reason:
      `${reachableRows} authorized QUALIFIED_READY row(s) were reachable and the run still exited 0 with no receipt, ` +
      "so the break is inside the writer or its D1 batch, not in the supply census.",
  };
}

/** One console line for a manual run; no threshold, no severity escalation. */
export function formatPublisherOutcome(classification: PublisherRunClassification): string {
  return [
    `[publisher-outcome] ${classification.outcome}`,
    `planned=${classification.plannedRows}`,
    `reachable=${classification.reachableRows}`,
    `unbackedPlan=${classification.unbackedPlanRows}`,
    `heldBySourceGate=${classification.heldBySourceGateRows}`,
    `evidence=${classification.evidenceCompleteness}`,
    `next=${classification.nextEvidence}`,
  ].join(" ");
}

/**
 * SELECT-only reads for a maintainer to run by hand, beside the function that consumes
 * their rows so the field names cannot drift apart. `lake-sync:` is the tick_key prefix
 * `buildPublicationReceiptSql` writes, so a row with any other prefix is not this writer.
 * None of these takes a bound parameter: `ledger` is deliberately unbounded in time and
 * ordered newest-first, so the reviewer reads the newest receipt and compares its
 * `decided_at` against the run window under inspection. They return data and write nothing.
 */
export const PUBLISHER_OUTCOME_SQL = {
  /** Prod D1: the newest receipt this writer left. Empty result = no publisher write ever. */
  ledger:
    "SELECT tick_key, source_id, proposed_count, published_count, decided_at FROM source_publication_ledger WHERE tick_key LIKE 'lake-sync:%' ORDER BY decided_at DESC LIMIT 20",
  /** Prod D1: the serving inventory `fetchD1InventorySnapshot` builds, for the concentration step. */
  inventory: "SELECT source_id AS sourceId, count(*) AS count FROM opportunities WHERE is_active = 1 GROUP BY source_id",
  /** Turso lake: the planner's decision inputs (`loadAutoApprovedTenants`). */
  lakeTenants:
    "SELECT source_id, job_count, qualified_ready, ph_rate, jev_raw FROM lake_ats_discovery WHERE review_status = 'auto_approved'",
  /** Turso lake: the rows the writer can actually select (`CANDIDATE_SELECT`). */
  lakePending:
    "SELECT source_id, COUNT(*) AS ready FROM lake_candidate_jobs WHERE status = 'QUALIFIED_READY' AND ph_eligibility IN ('eligible_verified', 'eligible_likely') GROUP BY source_id",
  /** Turso lake: last successful write; a value older than one job cadence is the outage window. */
  lakeLastSync:
    "SELECT MAX(synced_to_d1_at) AS last_sync FROM lake_candidate_jobs WHERE synced_to_d1_at IS NOT NULL",
} as const;