/**
 * Durable ingestion diagnostics.
 *
 * Background: the scrape route reports per-run degradation (failed insert
 * batches, triage exceptions, fetch-event logging failures, unavailable cadence
 * state) in its HTTP response. That was fine while the GitHub Hunter workflow
 * was the clock, because the Hunter `alerts` job read the response and filed a
 * deduped issue.
 *
 * Commit b3347f3 (audit finding P-5) removed the Hunter schedule so the
 * Cloudflare cron Worker is the sole clock. The Worker validates the response
 * shape but files nothing, so every signal above became invisible — the exact
 * silent-error class the 2026-07-04 audit (S-1..S-6) was built to surface. S-1
 * had already proved the cost: fetch-event logging was broken for two months
 * and only `console.warn` knew.
 *
 * Fix: park a compact run summary on a reserved `source_fetch_state` row, the
 * same trick the unclear sweep uses for `__sweep_diag__`. D1 is durable and
 * already read by the daily Sentinel pulse, so alerting no longer depends on
 * *who* triggered the scrape.
 *
 * The row carries two independent signals:
 *   1. `lastError` — degradation on the most recent run (null when clean).
 *   2. `lastAttemptAt` — a heartbeat. Every run stamps it, so a stale value
 *      means the clock itself stopped. Nothing detected that before: when the
 *      Hunter schedule was removed, an 11-day ingestion silence would have
 *      passed unnoticed had the Worker not been healthy.
 */

/** Reserved source_fetch_state row id. Not a real source. */
export const INGEST_DIAG_ID = "__ingest_diag__";

/** D1 text columns are bounded to keep a pathological error from bloating the row. */
export const DIAG_ERROR_MAX_LENGTH = 500;

export type RunDiagnosticsInput = {
  /** Batches that threw during the opportunity insert loop. */
  insertFailedBatches?: number;
  /** Individual insert errors, including missing-`meta.changes` responses. */
  insertErrorCount?: number;
  /** Listings dropped because triage threw. */
  triageFailures?: number;
  /** Listings whose verdict was withheld because Workers AI was unreachable. */
  triageAiUnavailable?: number;
  /** Listings deferred because the per-invocation AI subrequest budget was hit. */
  triageBudgetDeferred?: number;
  /** Batches that threw while persisting triage-rejected rows. */
  rejectedInsertFailedBatches?: number;
  /** Failed `source_fetch_events` insert batches (the S-1 regression class). */
  fetchEventFailedBatches?: number;
  /** Sources whose fetch threw this run. */
  failedSourceCount?: number;
  /** Parser rows rejected because their source URL was absent or unsafe. */
  droppedNoUrl?: number;
  /** False when cadence state could not be read, so guards degraded open. */
  cadenceStateAvailable?: boolean;
};

export type RunDiagnosticsSummary = {
  /** True when at least one degradation signal fired. */
  degraded: boolean;
  /** Number of distinct signals that fired. */
  signalCount: number;
  /** Compact human-readable summary, or null on a clean run. */
  summary: string | null;
};

function count(value: number | undefined): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : 0;
}

/**
 * Reduces a run's counters to a durable summary.
 *
 * Pure so the signal set is testable without D1. Order is stable and most
 * severe first, because the string is truncated for storage and the front of it
 * is what a human reads in the issue title.
 */
export function summarizeRunDiagnostics(input: RunDiagnosticsInput): RunDiagnosticsSummary {
  const signals: string[] = [];

  const insertFailedBatches = count(input.insertFailedBatches);
  if (insertFailedBatches > 0) {
    signals.push(`insertFailedBatches=${insertFailedBatches}`);
  }

  const insertErrorCount = count(input.insertErrorCount);
  if (insertErrorCount > 0) {
    signals.push(`insertErrors=${insertErrorCount}`);
  }

  const rejectedInsertFailedBatches = count(input.rejectedInsertFailedBatches);
  if (rejectedInsertFailedBatches > 0) {
    signals.push(`rejectedInsertFailedBatches=${rejectedInsertFailedBatches}`);
  }

  // The S-1 regression class: when this logging fails, source health history
  // stops accumulating and every downstream detector goes blind.
  const fetchEventFailedBatches = count(input.fetchEventFailedBatches);
  if (fetchEventFailedBatches > 0) {
    signals.push(`fetchEventFailedBatches=${fetchEventFailedBatches}`);
  }

  const triageFailures = count(input.triageFailures);
  if (triageFailures > 0) {
    signals.push(`triageFailures=${triageFailures}`);
  }

  const triageAiUnavailable = count(input.triageAiUnavailable);
  if (triageAiUnavailable > 0) {
    signals.push(`triageAiUnavailable=${triageAiUnavailable}`);
  }

  const triageBudgetDeferred = count(input.triageBudgetDeferred);
  if (triageBudgetDeferred > 0) {
    signals.push(`triageBudgetDeferred=${triageBudgetDeferred}`);
  }

  const failedSourceCount = count(input.failedSourceCount);
  if (failedSourceCount > 0) {
    signals.push(`failedSources=${failedSourceCount}`);
  }

  const droppedNoUrl = count(input.droppedNoUrl);
  if (droppedNoUrl > 0) {
    signals.push(`droppedNoUrl=${droppedNoUrl}`);
  }

  // Explicit false only. `undefined` means the caller did not report cadence
  // state, which is not the same as reporting that it was unavailable.
  if (input.cadenceStateAvailable === false) {
    signals.push("cadenceStateUnavailable");
  }

  if (signals.length === 0) {
    return { degraded: false, signalCount: 0, summary: null };
  }

  return {
    degraded: true,
    signalCount: signals.length,
    summary: truncateSignals(signals.join(", "), DIAG_ERROR_MAX_LENGTH),
  };
}

/**
 * Truncates the signal string at the last complete `key=value` token so a
 * Sentinel issue title never reads a cut-off signal name. Falls back to a
 * hard cut with an ellipsis only when no token boundary fits within the limit.
 */
export function truncateSignals(joined: string, maxLength: number): string {
  if (joined.length <= maxLength) return joined;
  const cut = joined.slice(0, maxLength);
  const lastBoundary = cut.lastIndexOf(", ");
  if (lastBoundary > 0) return cut.slice(0, lastBoundary);
  return cut.slice(0, Math.max(0, maxLength - 1)) + "\u2026";
}

/**
 * Builds the reserved row for the current run.
 *
 * `lastCount` holds the signal count so a query can rank runs without parsing
 * the summary string.
 */
export function buildIngestDiagRow(observedAt: string, summary: RunDiagnosticsSummary) {
  return {
    sourceId: INGEST_DIAG_ID,
    sourceName: "ingest diagnostics",
    sourceType: "diag",
    collectionMethod: "diag",
    complianceStatus: "diag",
    lastAttemptAt: observedAt,
    lastSuccessAt: summary.degraded ? null : observedAt,
    lastCount: summary.signalCount,
    lastError: summary.summary,
    updatedAt: observedAt,
  };
}

/**
 * Builds the `onConflictDoUpdate` set for the reserved row.
 *
 * A degraded run deliberately omits `lastSuccessAt` instead of writing null:
 * the column must keep pointing at the last run that was actually clean, so
 * the gap between it and `lastAttemptAt` measures how long degradation has
 * persisted. Writing null would erase exactly the value that makes the row
 * useful during an incident.
 */
export function buildIngestDiagUpdate(observedAt: string, summary: RunDiagnosticsSummary) {
  const base = {
    lastAttemptAt: observedAt,
    lastCount: summary.signalCount,
    lastError: summary.summary,
    updatedAt: observedAt,
  };
  return summary.degraded ? base : { ...base, lastSuccessAt: observedAt };
}

// ─── Directory Enrichment Diagnostics ─────────────────────────────────────────
//
// Same reserved-row trick as __ingest_diag__, applied to the directory
// enrichment pulse (apps/web/src/pages/api/cron/directory-enrich.ts). The
// enrichment route runs 2x/day via gha-enrichment-pulse.yml. Without a durable
// heartbeat, a stopped clock (workflow disabled, secret rotated, route 500ing)
// would be invisible until someone notices the directory is stale.

/** Reserved source_fetch_state row id for the directory enrichment pulse. */
export const ENRICH_DIAG_ID = "__enrich_diag__";

export function buildEnrichDiagRow(observedAt: string, summary: RunDiagnosticsSummary) {
  return {
    sourceId: ENRICH_DIAG_ID,
    sourceName: "directory enrichment diagnostics",
    sourceType: "diag",
    collectionMethod: "diag",
    complianceStatus: "diag",
    lastAttemptAt: observedAt,
    lastSuccessAt: summary.degraded ? null : observedAt,
    lastCount: summary.signalCount,
    lastError: summary.summary,
    updatedAt: observedAt,
  };
}

export function buildEnrichDiagUpdate(observedAt: string, summary: RunDiagnosticsSummary) {
  const base = {
    lastAttemptAt: observedAt,
    lastCount: summary.signalCount,
    lastError: summary.summary,
    updatedAt: observedAt,
  };
  return summary.degraded ? base : { ...base, lastSuccessAt: observedAt };
}
