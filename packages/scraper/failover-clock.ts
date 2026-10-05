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

/**
 * What the reserved `__scrape_run_lock__` row says about a run in flight.
 *
 * - `unknown`   — no usable lock evidence (row missing, read failed, unparseable,
 *                 or the evaluation instant itself was invalid). Fail-open: the
 *                 heartbeat decision stands unchanged.
 * - `released`  — the lock row carries the `1970-01-01T00:00:00.000Z` sentinel
 *                 that `releaseRunLock` writes, so no run holds it.
 * - `held`      — claimed at or inside the endpoint's run-lock TTL; `acquireRunLock`
 *                 would still refuse, so placing a takeover call now is a wasted
 *                 pulse that returns `run-lock-held`.
 * - `stale`     — claimed outside that TTL, so the endpoint has already made the
 *                 claim reclaimable and the fallback may take over. An abandoned
 *                 claim from a killed run therefore cannot wedge the fallback.
 * - `future`    — a future-dated claim (clock skew). Untrustworthy in BOTH
 *                 directions: it is equally consistent with a run that claimed
 *                 the lock seconds ago and with an abandoned claim, so the
 *                 decision fails safe to `unknown` instead of reading it as
 *                 either held or reclaimable.
 */
export type RunLockState = "unknown" | "released" | "held" | "stale" | "future";

export interface FailoverDecision {
  action: FailoverAction;
  reason: string;
  minutesSinceAttempt: number | null;
  /** State of the reserved run-lock row, when lock evidence was supplied. */
  lockState: RunLockState;
  /** Age of the run-lock claim in minutes; null when it cannot be established. */
  lockAgeMinutes: number | null;
}

export interface FailoverEvidence {
  /**
   * ISO timestamp of the primary clock's last real scrape attempt
   * (source_fetch_state.last_attempt_at for source_id='__ingest_diag__'), or
   * null/undefined when the row is missing or the read itself failed.
   */
  lastAttemptAt: string | null | undefined;
  /**
   * OPTIONAL ISO timestamp of the reserved run-lock row's claim
   * (source_fetch_state.last_attempt_at for source_id='__scrape_run_lock__').
   *
   * The scrape cron endpoint gates mutual exclusion on that row: `acquireRunLock`
   * claims it only when the stored claim is older than the run lock TTL, and
   * `releaseRunLock` resets it to the epoch sentinel. A primary that is killed
   * mid-run (Cloudflare Pages free-tier CPU limit) leaves the claim behind, so
   * the heartbeat alone cannot distinguish "no run in progress" from "a run
   * claimed the lock after the last recorded heartbeat". Optional so every
   * existing caller keeps today's exact behaviour when it has no lock evidence
   * to offer.
   */
  lockLastAttemptAt?: string | null;
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

// The scrape endpoint's own run-lock TTL, mirroring `RUN_LOCK_TTL_MIN` in
// apps/web/src/pages/api/cron/scrape.ts. This is a DIFFERENT clock from
// DEFAULT_STALE_AFTER_MINUTES and must not be derived from it:
//
//   - DEFAULT_STALE_AFTER_MINUTES answers "how long may the primary clock's
//     heartbeat stay silent before I believe the primary is dead?"
//   - DEFAULT_RUN_LOCK_TTL_MINUTES answers "how old may a lock claim be before
//     `acquireRunLock` hands the lock to the next caller?"
//
// `acquireRunLock` grants only when `last_attempt_at < Date.now() - TTL`, so a
// claim of exactly TTL minutes is still refused with `run-lock-held`. The fence
// below mirrors that strict-less-than boundary: `held` while
// `ageMinutes <= ttl`, reclaimable only once `ageMinutes > ttl`. Basing this on
// the 30-minute heartbeat window instead would refuse takeover for every claim
// aged 8–30 min — a window in which the endpoint is free and would serve the
// call — delaying exactly the incident recovery this fence exists for.
//
// Change this only together with the endpoint constant, and prefer passing an
// explicit override when the two deployments ever diverge.
export const DEFAULT_RUN_LOCK_TTL_MINUTES = 8;

// The sentinel `acquireRunLock` seeds and `releaseRunLock` restores. Any claim
// older than this is indistinguishable from "never claimed" by design, so it
// is read as released rather than as an infinitely old lock.
const RUN_LOCK_RELEASED_SENTINEL = "1970-01-01T00:00:00.000Z";

function unknownDecision(reason: string): FailoverDecision {
  return { action: "unknown", reason, minutesSinceAttempt: null, lockState: "unknown", lockAgeMinutes: null };
}

/**
 * Decide whether the secondary scheduling path should take over one bounded
 * scrape call. Never throws; unreadable or nonsensical evidence always
 * degrades to "unknown" (no action) rather than a guess in either direction —
 * a wrong "takeover" guess risks duplicate ingestion traffic against a
 * primary that is actually fine, and a wrong "standby" guess merely waits for
 * the next scheduled check, which already recurs on a short interval.
 *
 * When the caller supplies the reserved run lock's claim
 * (`lockLastAttemptAt`), the decision also refuses to place a takeover call
 * while the endpoint would refuse it: `acquireRunLock` grants only when the
 * claim is older than its TTL (`runLockTtlMinutes`), so a call placed inside
 * that TTL spends the fallback's one permitted invocation and returns
 * `run-lock-held`. The lock claim is an operational fact about who is working,
 * never a publication authority signal: a claim older than the TTL is reported
 * `stale` and the takeover proceeds.
 *
 * The heartbeat window (`staleAfterMinutes`) and the lock window
 * (`runLockTtlMinutes`) are deliberately independent. Conflating them is a
 * measured defect, not a simplification: it made the fence refuse takeover for
 * claims the endpoint would have granted, delaying recovery in exactly the
 * killed-run scenario the fence was written for.
 *
 * Lock evidence that cannot be placed on the timeline — a future-dated claim —
 * fails safe to `unknown` for the same reason a future-dated heartbeat does. It
 * is neither proof that a run is in progress nor proof that the claim is
 * abandoned, and the module's contract is to refuse to guess. The cost is one
 * scheduled interval of recovery delay; the benefit is that no caller can reach
 * `takeover` on evidence the module itself calls untrustworthy.
 *
 * A nonsensical threshold (`NaN`, `Infinity`, or a negative number) yields
 * `unknown` with a named reason rather than a confident-looking decision. Both
 * parameters are operator-supplied configuration; validating them is what keeps
 * the fail-safe contract above true for configuration errors, not just for
 * malformed evidence.
 */
export function decideFailoverTakeover(
  evidence: FailoverEvidence,
  staleAfterMinutes: number = DEFAULT_STALE_AFTER_MINUTES,
  runLockTtlMinutes: number = DEFAULT_RUN_LOCK_TTL_MINUTES,
): FailoverDecision {
  // Both thresholds are operator-supplied configuration, so a nonsensical one is
  // as unusable as a nonsensical timestamp and must be refused before any
  // evidence is interpreted. Left unvalidated they fail in the *confident*
  // direction: `minutesSinceAttempt >= NaN` is false, so the fence stands by
  // forever behind a normal-looking "within NaNmin threshold" reason — the
  // permanent starvation this module exists to avoid — and `ageMinutes > NaN`
  // is false (every claim `held`) just as `ageMinutes > -1` is true (every
  // claim reclaimable), which silently detaches the fence from the endpoint's
  // real TTL. Zero is finite and non-negative, so it stays a coherent if
  // unusual configuration and is not treated as an operator error.
  if (!Number.isFinite(staleAfterMinutes) || staleAfterMinutes < 0) {
    return unknownDecision("stale-after-minutes threshold is not a finite non-negative number");
  }
  if (!Number.isFinite(runLockTtlMinutes) || runLockTtlMinutes < 0) {
    return unknownDecision("run-lock TTL minutes is not a finite non-negative number");
  }

  const now = new Date(evidence.now);
  if (!Number.isFinite(now.getTime())) {
    return unknownDecision("evaluation instant is not a valid timestamp");
  }

  const raw = evidence.lastAttemptAt;
  if (!raw) {
    return unknownDecision("no heartbeat evidence (row missing or read failed)");
  }

  const lastAttempt = new Date(raw);
  if (!Number.isFinite(lastAttempt.getTime())) {
    return unknownDecision(`heartbeat timestamp is not a valid ISO date: ${raw}`);
  }

  const minutesSinceAttempt = (now.getTime() - lastAttempt.getTime()) / 60_000;
  if (minutesSinceAttempt < 0) {
    // Clock skew or a future-dated row: nonsensical evidence, not proof of
    // health — fail safe rather than guess.
    return {
      action: "unknown",
      reason: `heartbeat timestamp is in the future (${minutesSinceAttempt.toFixed(1)}min)`,
      minutesSinceAttempt,
      lockState: "unknown",
      lockAgeMinutes: null,
    };
  }

  const lock = readRunLock(evidence.lockLastAttemptAt, now, runLockTtlMinutes);

  // A future-dated claim is clock skew between this evaluation and whatever wrote
  // the row, and it is simultaneously consistent with "a run claimed the lock
  // seconds ago" and "the claim is hours old". Deciding either way is a guess,
  // and the two guesses have opposite failure modes: `held` risks a permanent
  // stall behind an abandoned claim, `takeover` spends the fallback's one call
  // against a primary that may be mid-run — the duplicate-ingestion cost this
  // fence exists to bound. The heartbeat branch above already refuses to guess
  // on a future-dated heartbeat for exactly this reason; refusing here is the
  // same fail-safe contract applied to the same class of nonsensical evidence,
  // not a second rule. Cost of refusing: the next scheduled check re-reads the
  // claim with a sane clock and decides normally, so recovery is delayed by at
  // most one interval.
  if (lock.state === "future") {
    return {
      action: "unknown",
      reason: `run lock claim is future-dated (${lock.ageMinutes?.toFixed(1)}min), so its age cannot be established; primary heartbeat is ${minutesSinceAttempt.toFixed(1)}min old`,
      minutesSinceAttempt,
      lockState: lock.state,
      lockAgeMinutes: lock.ageMinutes,
    };
  }

  if (minutesSinceAttempt >= staleAfterMinutes) {
    if (lock.state === "held") {
      // The heartbeat says stalled but a run claimed the lock inside the
      // window, so a scrape is very likely already in progress. Standing by is
      // the smaller mistake: the next scheduled check recurs in minutes.
      return {
        action: "standby",
        reason: `primary heartbeat is stale (${minutesSinceAttempt.toFixed(1)}min >= ${staleAfterMinutes}min)${lock.suffix}; a scrape run holds the lock`,
        minutesSinceAttempt,
        lockState: lock.state,
        lockAgeMinutes: lock.ageMinutes,
      };
    }

    return {
      action: "takeover",
      reason: `primary clock has not attempted a run in ${minutesSinceAttempt.toFixed(1)}min (>= ${staleAfterMinutes}min threshold)${lock.suffix}`,
      minutesSinceAttempt,
      lockState: lock.state,
      lockAgeMinutes: lock.ageMinutes,
    };
  }

  return {
    action: "standby",
    reason: `primary clock attempted a run ${minutesSinceAttempt.toFixed(1)}min ago (within ${staleAfterMinutes}min threshold)${lock.suffix}`,
    minutesSinceAttempt,
    lockState: lock.state,
    lockAgeMinutes: lock.ageMinutes,
  };
}

interface RunLockReading {
  state: RunLockState;
  ageMinutes: number | null;
  /** Appended to the heartbeat reason so the CLI already logs the lock. */
  suffix: string;
}

function readRunLock(
  raw: string | null | undefined,
  now: Date,
  runLockTtlMinutes: number,
): RunLockReading {
  if (!raw) {
    return { state: "unknown", ageMinutes: null, suffix: "" };
  }
  if (raw === RUN_LOCK_RELEASED_SENTINEL) {
    return { state: "released", ageMinutes: null, suffix: "; run lock released" };
  }

  const claimedAt = new Date(raw);
  if (!Number.isFinite(claimedAt.getTime())) {
    return { state: "unknown", ageMinutes: null, suffix: "; run lock evidence unreadable" };
  }

  const ageMinutes = (now.getTime() - claimedAt.getTime()) / 60_000;
  if (ageMinutes < 0) {
    return {
      state: "future",
      ageMinutes,
      suffix: `; run lock claim is future-dated (${ageMinutes.toFixed(1)}min)`,
    };
  }
  // `<=` not `<`: `acquireRunLock` uses `lt(lastAttemptAt, cutoff)`, so a claim
  // of exactly the TTL is still refused. Mirroring the refusal keeps the fence
  // from spending its single permitted call on a guaranteed rejection.
  if (ageMinutes > runLockTtlMinutes) {
    return {
      state: "stale",
      ageMinutes,
      suffix: `; run lock claim is ${ageMinutes.toFixed(1)}min old and reclaimable`,
    };
  }
  return {
    state: "held",
    ageMinutes,
    suffix: `; run lock claimed ${ageMinutes.toFixed(1)}min ago`,
  };
}
