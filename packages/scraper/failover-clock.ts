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
  // The threshold is evidence too. A non-positive or non-finite value makes
  // `minutesSinceAttempt >= staleAfterMinutes` true (or incomparable) for
  // every heartbeat, which is duplicate scrape traffic against a primary that
  // may be perfectly healthy — the exact failure mode this module exists to
  // prevent. Validate it before anything else so the reason names the caller's
  // actual bug rather than the heartbeat it also happened to be holding.
  if (!Number.isFinite(staleAfterMinutes) || staleAfterMinutes <= 0) {
    return {
      action: "unknown",
      reason: `stale-after-minutes threshold is not a positive finite number (${String(staleAfterMinutes)}); refusing to decide`,
      minutesSinceAttempt: null,
    };
  }

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

// INCIDENT-0410(s-53) — what the placed call actually did.
//
// decideFailoverTakeover answers "should I place a call?". It says nothing
// about what came back, and /api/cron/scrape answers HTTP **200** with
// `{skipped: true, reason: "run-lock-held"}` when its reserved
// `__scrape_run_lock__` row is still claimed — a response byte-shape a caller
// cannot distinguish from real work. So an authorised takeover can silently
// fetch nothing, and the only way to notice today is to read the lock row out
// of D1, which is impossible during exactly the row-read exhaustion that makes
// a takeover necessary in the first place (Cloudflare error 7500, observed
// 2026-10-04). This classifier is the pure contract that makes the no-op
// visible from the response alone.
//
// Pure, no I/O. NOT WIRED: scripts/gha/evaluate-failover-clock.ts and
// apps/web/src/pages/api/cron/scrape.ts are both on the merge HOLD list, so
// this session cannot connect a caller. Wiring is a reviewer decision, and the
// reviewed change is deliberately one pure module plus its tests.

export type FailoverOutcome = "worked" | "lock-blocked" | "skipped" | "unreadable";

export interface FailoverOutcomeClassification {
  outcome: FailoverOutcome;
  /**
   * True only when this session authorised a takeover and the primary's
   * run-lock turned that call into a no-op. That combination is the stale-lock
   * takeover failure: the primary has been silent past the threshold, yet its
   * lock is still blocking the fallback.
   */
  takeoverBlocked: boolean;
  reason: string;
}

/** The exact `reason` string scrape.ts returns when the run-lock short-circuits a run. */
const RUN_LOCK_HELD_REASON = "run-lock-held";

/**
 * Classify the scrape response a failover decision produced. Never throws and
 * never assumes work happened: an unreadable or error-shaped body is
 * `unreadable`, not `worked`, because "we placed a call" must never be
 * recorded as "the fallback recovered the pipeline".
 */
export function classifyFailoverOutcome(
  decision: FailoverDecision,
  response: unknown,
): FailoverOutcomeClassification {
  const body =
    response !== null && typeof response === "object" && !Array.isArray(response)
      ? (response as Record<string, unknown>)
      : null;
  if (!body) {
    return {
      outcome: "unreadable",
      takeoverBlocked: false,
      reason: "scrape response is not a JSON object",
    };
  }

  if (typeof body.error === "string" && body.error.length > 0) {
    return {
      outcome: "unreadable",
      takeoverBlocked: false,
      reason: `scrape response was an error, not work: ${body.error}`,
    };
  }

  if (body.skipped !== true) {
    return {
      outcome: "worked",
      takeoverBlocked: false,
      reason: "scrape endpoint reported no skip",
    };
  }

  const reason = typeof body.reason === "string" ? body.reason : "";
  if (reason !== RUN_LOCK_HELD_REASON) {
    return {
      outcome: "skipped",
      takeoverBlocked: false,
      reason: reason
        ? `scrape endpoint skipped the run: ${reason}`
        : "scrape endpoint skipped the run without a reason",
    };
  }

  if (decision.action === "takeover") {
    const silent = decision.minutesSinceAttempt === null
      ? "an unknown amount of"
      : `${decision.minutesSinceAttempt.toFixed(1)}min of`;
    return {
      outcome: "lock-blocked",
      takeoverBlocked: true,
      reason: `takeover authorised after ${silent} primary silence was still blocked by the primary run-lock; no stale-lock takeover occurred`,
    };
  }

  return {
    outcome: "lock-blocked",
    takeoverBlocked: false,
    reason: "run-lock held as expected: the primary is running and this call correctly stood by",
  };
}
