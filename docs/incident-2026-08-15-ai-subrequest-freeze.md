# Incident: Job Board Frozen at 2026-08-07 — Workers AI Subrequest Limit

Date resolved: 2026-08-15
Root-cause agent: DeepSeek v4 Flash 0731 (OpenRouter), continuing from
`codex/apex-flash-continuation`.
Severity: High (production ingestion silently stalled for ~7 days while the
heartbeat stayed green).

## Symptom

`https://remotejobs-ph.pages.dev` showed no job newer than **2026-08-07** even
though today is 2026-08-15. The site still rendered 1,396 active roles, but
nothing new was reaching the board.

## Diagnosis (evidence-first)

Direct reads of production D1 (wrangler 4.120.0, remote, env production):

| Table / signal | Value |
| --- | --- |
| `source_fetch_state` `__ingest_diag__` | `last_error = triageAiUnavailable=50` |
| `source_fetch_state` `__sweep_diag__` | `last_error = "Workers AI error fallback (all models failed): Too many subrequests by single Worker invocation."` |
| `opportunities` | `MAX(scraped_at) = 2026-08-08T10:15:34.668Z`, `MAX(posted_at) = 2026-08-07T21:24:24.000Z` |
| Inserts/day | Aug 5: 67, Aug 6: 64, Aug 7: 51, **Aug 8: 21, Aug 9: 3, Aug 10: 2, Aug 11: 1, Aug 12: 2, Aug 14: 6** |
| Heartbeat | Fresh (07:30Z on 2026-08-15) — the scrape ran every 15 min the whole time |

The scrape engine was healthy: 30,688 items were fetched from 41 sources in the
last 24h, and fetch events were recording normally. The failure was entirely in
the **AI triage** step.

## Root cause

Cloudflare counts **every `fetch()` and every `env.AI.run()` as a subrequest**,
and the **Workers Free plan caps subrequests at 50 per invocation** (Paid:
10,000 — see https://developers.cloudflare.com/workers/platform/limits/).

One scrape invocation is a single Pages Function request that:

1. fetches ~41 sources (each fetch = 1 subrequest);
2. runs robots.txt checks (each = 1 subrequest);
3. triages up to `limit` (default 50) new items, each with a 4-model ladder
   plus a skeptic call — up to ~6 AI subrequests per item.

So a busy tick makes ~15-40 fetch subrequests plus 50-300 AI subrequests in one
invocation. Once the invocation crossed 50, **every** remaining `env.AI.run()`
failed with `Too many subrequests by single Worker invocation`. Triage **fails
closed** (`aiUnavailable: true` → `markItemsForRetry`), so no new job was
inserted — exactly the silent-error class this repo's audits (S-1..S-6,
2026-07-04) were built to surface. The heartbeat and source-health signals all
stayed green, which is why the freeze was invisible.

### Why it started ~Aug 8

The production-hardening audit (#55, merged 2026-08-10) plus the crawler
robots/identity changes (2026-08-11) added per-source subrequests (robots gate)
and widened the fetch set, pushing a busy tick over the 50-subrequest cliff.
Before that, most ticks fit under the cap.

## Fix (implemented on `codex/apex-flash-continuation`)

Make the scrape invocation **subrequest-budget-aware**:

- `apps/web/src/pages/api/cron/scrape.ts`
  - Added `AI_SUBREQUEST_BUDGET_PER_RUN = 15`, `AiBudgetExceededError`, and
    `withAiSubrequestBudget(env, budget)` — a closure-scoped wrapper around the
    AI binding that throws once `budget` calls are made.
  - The scrape handler creates one budgeted env per invocation and passes it to
    every AI consumer: new-item triage, the consensus skeptic, and all three
    `sweepUnclearBacklog` call sites.
  - The triage loop now checks `aiBudget.exhausted()` before each chunk; when
    the budget is consumed it defers the remaining items via the existing
    `markItemsForRetry` mechanism (source conditional validators are cleared, so
    the next 15-min tick re-fetches and retries them). No data is lost; work is
    simply spread across ticks (96/day), which is far more capacity than the
    ~65 items/day the site ingests.
  - New telemetry: `triageBudgetDeferred`, `aiSubrequestCalls`,
    `aiSubrequestBudget` in the scrape response.
- `apps/web/src/lib/run-diagnostics.ts`
  - Added `triageBudgetDeferred` as a distinct, durable degradation signal so
    future budget pressure is visible in Sentinel, not silent.
- Tests:
  - `apps/web/tests/ai-subrequest-budget.test.ts` (5 tests) — caps calls,
    passes requests through, no-binding local case, default budget sanity.
  - `apps/web/tests/run-diagnostics.test.ts` — budget-deferred is a surfaced
    signal.

### Why 15, not 50

The budget must leave headroom for the fetch phase (~20 subrequests on a busy
tick) so total stays under the 50 cap. 15 AI calls × 96 ticks/day ≈ 1,440
items/day of triage capacity — ~20x the real need. When the ladder falls through
a few models, the next item's pre-chunk check trips the budget and defers rather
than failing closed.

## Verification

- `bun run test`: **373 pass, 0 fail** (was 367 baseline; +5 budget tests, +1
  diagnostics test, 960 expectations).
- `bun run typecheck`: exit 0.
- `bun run build`: exit 0 (Pages-compatible server build, 90.94s).
- `bun run audit:guardrails`: exit 0.

## Deployment path

Follow the repo's migration-first release path: merge to `main` → CI guardrail
(`ci-guardrail.yml`) runs tests/typecheck/build → Cloudflare Pages deploy via the
release workflow. No D1 migration is required (no schema change). After deploy:

1. Watch the next scrape run: `triageAiUnavailable` should drop to ~0 and
   `inserted` should become > 0 on ticks with fresh feed items.
2. Watch `__ingest_diag__` and `__sweep_diag__`: the `Too many subrequests`
   error should disappear.
3. Confirm the site shows jobs newer than 2026-08-08 within a day.
4. If `triageBudgetDeferred` stays > 0 run after run, raise
   `AI_SUBREQUEST_BUDGET_PER_RUN` (and/or the per-tick sweep budget) — the
   diagnostic now makes the constraint visible.

## Follow-ups / residual

- The AI-01 model-ladder rollout remains deferred per `docs/apex-part-2-gauntlet-state-2026-08-13.md`
  (C-04: free-tier 10,000-neuron daily quota). The subrequest budget is
  independent of that and safe to ship.
- Sources that keep failing (remote.co / we-work-remotely timeouts) are a
  separate concern tracked by the daily Sentinel pulse; not part of this fix.
