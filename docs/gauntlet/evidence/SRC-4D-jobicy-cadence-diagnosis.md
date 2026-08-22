# SRC-4D Jobicy Shared-Origin Cadence — Diagnosis Evidence

## Status

Diagnosis phase COMPLETE (evidence-only commit, authorized by the unit's commit
plan). Root cause verified from seven days of durable event timing plus a
read-only robots/terms re-check. Implementation of the bounded shared-origin
scheduler is the next slice; terminal KEEP still requires a 48-hour post window.

## Seven-day pre-baseline (source_fetch_events, read-only D1 query)

Daily totals per feed (`attempts` = events; `skipped` = cadence-guard skips;
fetches ≈ attempts − skipped):

| Day | admin-support attempts/skips/fetches | supporting attempts/skips/fetches |
| --- | --- | --- |
| 2026-08-15 | 73 / 54 / ~19 | 73 / 54 / ~19 |
| 2026-08-16 | 30 / 23 / ~7 | 30 / 23 / ~7 |
| 2026-08-17 | 19 / 15 / ~4 | 19 / 15 / ~4 |
| 2026-08-18 | 50 / 38 / ~12 | 50 / 38 / ~12 |
| 2026-08-19 | 83 / 65 / ~18 | 83 / 65 / ~18 |
| 2026-08-20 | 64 / 50 / ~14 | 64 / 50 / ~14 |

Both feeds are always attempted together and mostly skipped together; every
actual network fetch occurs as a same-millisecond PAIR against jobicy.com.

## Failure evidence (all ok=0 Jobicy events, last 3 days)

| Timestamp (identical for both feeds) | Feeds failed |
| --- | --- |
| 2026-08-19T06:31:00.007Z | both — HTTP 429 |
| 2026-08-21T12:50:39.291Z | both — HTTP 429 |
| 2026-08-21T16:30:39.295Z | both — HTTP 429 |
| 2026-08-22T08:00:39.413Z | both — HTTP 429 |
| 2026-08-22T11:30:39.286Z | both — HTTP 429 |

Every 429 hits BOTH feeds at the identical timestamp: the scrape invocation
requests both feeds back-to-back, and the origin's allowance rejects the pair
together. Between failure windows, the same paired pattern succeeds — so this
is a rate allowance, not an outage or schema change.

## Root cause verdict

**CONFIRMED** (hypothesis from the unit contract): cadence state is
source-scoped (`minFetchIntervalMinutes` per source ID) while Jobicy's limit is
origin-scoped. Two near-simultaneous requests per cycle double the effective
origin load (~8–38 real fetches/day combined) and trip the allowance, failing
both feeds simultaneously. The provider's own guidance (recorded in the source
compliance notes) recommends "only a few checks daily/hourly."

## Compliance re-check (2026-08-22)

`https://jobicy.com/robots.txt` does NOT disallow `/feed/job_feed*` (only the
exact `/feed$` and unrelated paths) and sets no crawl-delay for `User-agent: *`.
The documented RSS-intent review in `packages/scraper/sources.ts` stands. The
throttle is application-level; honoring it via cadence coordination is the
compliant response. No evasion tactics are permitted or planned.

## Next exact action (implementation slice)

Implement the smallest contract-compliant fix, then observe ≥48h:

1. Add an optional `cadenceGroup` marker to the two Jobicy entries in
   `packages/scraper/sources.ts` (Jobicy-only; no generic scheduler).
2. Pure deterministic alternation: within a cadence group, only one source is
   eligible per tick (staggered turns using existing `source_fetch_state`
   timestamps), halving origin load immediately.
3. On HTTP 429: raise that source's next eligible time with a capped exponential
   cooldown within fixed min/max bounds; never retry in the same invocation.
4. Fixture tests: alternation fairness/starvation, 429 backoff, success
   recovery, clock skew, missing state; then full G3.
5. Deploy; record 48-hour post-rollup (per-feed attempt/429/publication-lag
   table) before any KEEP verdict.

Revert path: restore the previous per-source interval config; if 429s persist at
minimum traffic, pause Jobicy rather than increase traffic.

## Implementation status (2026-08-22)

The bounded fix is implemented, verified, and deployed:

- Commit `90f3243` `fix(source): coordinate Jobicy origin cadence` (rebased onto
  bot commit `5082279`; pushed to `origin/main`).
- `packages/scraper/sources.ts`: optional `cadenceGroup` marker; only the two
  Jobicy entries carry `"jobicy.com"`.
- `apps/web/src/pages/api/cron/scrape.ts`: pure `planCadenceGroupTurns`
  (deterministic oldest-attempt alternation inside a group, configured order as
  tie-break), `countConsecutiveRateLimitErrors` + capped exponential
  `rateLimitBackoffMinutes` (+30m base, ×2 per consecutive 429, cap +240m)
  fed by a newest-first read of durable non-skipped `source_fetch_events`;
  `sourceCadenceSkipReason` accepts the extra delay. No retry in the same
  invocation; no schema change; no generic scheduler.
- Fixtures: `apps/web/tests/cadence-group.test.ts` — 13 tests covering group
  fixture guard, alternation fairness, six-tick starvation-free simulation,
  missing state, clock skew, capped backoff flipping a turn, streak reset on
  success, and zero/one-eligible no-op cases.
- Local G3 at `90f3243`: 602 tests, 0 failures, 1,403 assertions; typecheck,
  build, production guardrails all passed.
- CI/deploy: GitHub Actions run `32592205884` (`90f3243`) — Validate,
  Migrate, and Deploy to production all success
  (https://github.com/cyalcala/va-freelance-hub/actions/runs/32592205884).
  Deploy completed ~2026-08-22T18:57Z, which starts the ≥48h post window.

### Remaining acceptance gate (VERIFYING)

KEEP still requires the 48-hour post-rollup: a per-feed table of attempts,
429s, deferrals (`skipReason LIKE 'Deferred by cadence group%'`), backoff
applications (`skipReason LIKE '%shared-origin 429 backoff%'`), and
publication lag from `source_fetch_events` on/after
`2026-08-22T18:57:00Z`, showing reduced 429s, no same-invocation retries, no
starvation (each feed receiving bounded turns), and bounded freshness. If 429s
persist at minimum traffic, pause Jobicy instead of increasing load.
