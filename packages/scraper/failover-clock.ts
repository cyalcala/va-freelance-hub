// SP-21 — fenced automatic failover clock.
//
// The masterplan (docs/SOURCE_REPLENISHMENT_MASTERPLAN.md, Section 11,
// "Independent clocks and safe takeover") requires at least two automatic
// scheduling paths in distinct failure domains for the freshness loop, with
// safe fencing: "A second clock without fencing is duplicate traffic, not
// resilience." Today there is exactly one automatic clock (the Cloudflare
// Worker Cron Trigger in workers/freshness-cron, every 10 minutes); the
// 2026-08-31 audit measured a largest observed gap of 15.17 hours with no
// automatic recovery.
//
// This module is the fence, not the clock. It is a PURE decision function:
// given the primary clock's last known real-attempt timestamp (the
// `__ingest_diag__` heartbeat row's `last_attempt_at`, already written on
// every real scrape run — see apps/web/src/pages/api/cron/scrape.ts's
// recordIngestDiagnostics) and the current instant, it decides whether a
// second, independent scheduling path (a GitHub Actions `schedule:` trigger
// on .github/workflows/gha-hunter-pulse.yml — a distinct trigger, runtime,
// and administrator identity from the Cloudflare Worker) should take over one
// bounded scrape call. It performs no I/O and calls nothing itself; the CLI
// wrapper that reads the heartbeat (scripts/gha/evaluate-failover-clock.ts)
// and the workflow that invokes it execute ONLY the action this returns.
// The wrapper lives outside this package deliberately: this file is part of
// the `@va-hub/scraper` barrel the production Pages Function bundles, and a
// CLI's `node:fs` import has no business reaching that bundle.
//
// Deliberately reuses the existing `source_fetch_state`-backed run lock
// (acquireRunLock in scrape.ts) rather than inventing a new epoch-fenced
// lease: that lock already proves safe under two independent triggers
// calling the same endpoint concurrently (the GitHub Hunter's existing
// `workflow_dispatch` path and the Cloudflare Worker have done exactly this
// since OPS-06). This unit's own fencing responsibility is narrower and
// upstream of that lock: decide WHETHER to place the call at all, so a
// healthy primary is never doubled, and fail safe (no call) whenever the
// evidence needed to decide is missing or malformed.

export type FailoverAction = "takeover" | "standby" | "unknown";

export interface FailoverDecision {
  action: FailoverAction;
  reason: string;
  minutesSinceAttempt: number | null;
}

export interface FailoverEvidence {
  /**
   * ISO timestamp of the primary clock's last real scrape attempt
   * (source_fetch_state.last_attempt_at for source_id='__ingest_diag__'), or
   * null/undefined when the row is missing or the read itself failed.
   */
  lastAttemptAt: string | null | undefined;
  /** Evaluation instant, ISO timestamp. */
  now: string;
}

// The primary clock fires every 10 minutes (workers/freshness-cron). Three
// missed ticks is a genuine stall, not scheduling jitter or a single slow
// run — deliberately far tighter than the hourly watchdog's 3-hour alert
// threshold (scripts/gha/evaluate-ingest-health.mjs DEFAULT_STALE_HOURS),
// which exists to notify a human, not to bound the gap in minutes. This
// value is what turns "recovery within hours" into "recovery within tens of
// minutes."
export const DEFAULT_STALE_AFTER_MINUTES = 30;

/**
 * Decide whether the secondary scheduling path should take over one bounded
 * scrape call. Never throws; unreadable or nonsensical evidence always
 * degrades to "unknown" (no action) rather than a guess in either direction —
 * a wrong "takeover" guess risks duplicate ingestion traffic against a
 * primary that is actually fine, and a wrong "standby" guess merely waits for
 * the next scheduled check, which already recurs on a short interval.
 */
export function decideFailoverTakeover(
  evidence: FailoverEvidence,
  staleAfterMinutes: number = DEFAULT_STALE_AFTER_MINUTES,
): FailoverDecision {
  const now = new Date(evidence.now);
  if (!Number.isFinite(now.getTime())) {
    return { action: "unknown", reason: "evaluation instant is not a valid timestamp", minutesSinceAttempt: null };
  }

  const raw = evidence.lastAttemptAt;
  if (!raw) {
    return {
      action: "unknown",
      reason: "no heartbeat evidence (row missing or read failed)",
      minutesSinceAttempt: null,
    };
  }

  const lastAttempt = new Date(raw);
  if (!Number.isFinite(lastAttempt.getTime())) {
    return {
      action: "unknown",
      reason: `heartbeat timestamp is not a valid ISO date: ${raw}`,
      minutesSinceAttempt: null,
    };
  }

  const minutesSinceAttempt = (now.getTime() - lastAttempt.getTime()) / 60_000;
  if (minutesSinceAttempt < 0) {
    // Clock skew or a future-dated row: nonsensical evidence, not proof of
    // health — fail safe rather than guess.
    return {
      action: "unknown",
      reason: `heartbeat timestamp is in the future (${minutesSinceAttempt.toFixed(1)}min)`,
      minutesSinceAttempt,
    };
  }

  if (minutesSinceAttempt >= staleAfterMinutes) {
    return {
      action: "takeover",
      reason: `primary clock has not attempted a run in ${minutesSinceAttempt.toFixed(1)}min (>= ${staleAfterMinutes}min threshold)`,
      minutesSinceAttempt,
    };
  }

  return {
    action: "standby",
    reason: `primary clock attempted a run ${minutesSinceAttempt.toFixed(1)}min ago (within ${staleAfterMinutes}min threshold)`,
    minutesSinceAttempt,
  };
}
