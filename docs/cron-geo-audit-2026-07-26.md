# Cron/geo audit — handoff (2026-07-26)

## Deployment topology (this tripped me up — read first)

Scope is **`remotejobs-ph.pages.dev`** + this repo. Nothing else.

Two other Cloudflare Pages projects exist and are **paused / irrelevant**:
`remoteph-jobs` (last deploy ~1 month ago) and `va-freelance-hub` (~2 months).
Do not use them to judge whether something shipped — I did, and briefly drew the
wrong conclusion that Pages had stopped auto-deploying. Note also that
`apps/web/wrangler.jsonc` says `"name": "remoteph-jobs"`, which does **not**
match the live project name. That mismatch is the trap.

Two independent deploy paths:

| Change under | Deploys via | Trigger |
|---|---|---|
| `workers/freshness-cron/**` | `.github/workflows/gha-deploy-cron-worker.yml` | push to `main` **matching that path only** |
| `apps/web/**` | Cloudflare Pages git integration on project `remotejobs-ph` | push to `main` |

The cron Worker calls
`SCRAPE_URL = "https://remotejobs-ph.pages.dev/api/cron/scrape"`
(`workers/freshness-cron/wrangler.toml`), every 15 min (`crons = ["*/15 * * * *"]`).

## Shipped

### Critical #1 — unauthenticated scrape trigger — DONE
- Commit `ebe37e6`; touches `workers/freshness-cron/{src/index.ts,wrangler.toml}`,
  which matches the deploy workflow's path filter.
- Worker now has no public route: `# No public route. Cron Triggers fire
  scheduled(), which does not need one.`
- Production checks: `scheduled()` still fires (cron timestamps advance every
  15 min), and unauthenticated `POST /api/cron/scrape` returns **401**.

### Critical #4 — sweep never ran on most ticks (ROOT CAUSE) — DONE
This was the dominant cause; the two fixes below were real bugs but were
hardening a path that mostly did not execute.

The handler returns early at `if (allItems.length === 0)`
(`apps/web/src/pages/api/cron/scrape.ts`, ~line 771) with `"No jobs scraped"`.
The unclear-backlog sweep sat ~330 lines *below* that return. At a 15-min
cadence most ticks scrape nothing new — feeds answer 304 (`sourcesUnchanged`)
or every source is cadence-skipped — so the run returned before ever reaching
the sweep.

Signature that identified it: active `unclear` rows with `geo_checked_at` inside
the last 45 min was **0** across four consecutive cron runs. Since the fixed
failure path advances `geoCheckedAt` while leaving the row `unclear`, a sweep
that was *running and failing* would still have produced a non-zero count. Zero
means it never entered the block.

There are **two** such early returns above the sweep, and the first fix only
covered one — the backlog stayed flat at 1435 through the next tick, which is
what exposed the miss:

| Line | Guard | When it fires |
|---|---|---|
| ~771 | `allItems.length === 0` — "No jobs scraped" | all feeds 304 / cadence-skipped |
| ~957 | `newItems.length === 0` — "Zero new jobs after dedup" | **dominant**: feeds returned their usual items, none new after URL dedup |

The second is the common one: RSS feeds keep serving their current listings
every tick, so `allItems` is usually non-zero, but at a 15-min cadence almost
nothing in them is new.

Fix: extracted the block to `sweepUnclearBacklog(db, env, observedAt)` and call
it on **all three** non-error exits — both early returns and the normal ingest
path. The exits deliberately left uncovered are unauthorized, rate-limited, and
run-lock-held (another run is already doing the work), plus the catch-all 500.

Diagnostic worth reusing: if the sweep is entered at all, `touched` must be
non-zero, because every path inside it — success, `aiUnavailable`, and thrown
error — advances `geoCheckedAt`. Exactly zero therefore distinguishes "never
reached" from "reached and failing". Note that `MAX(last_attempt_at)` over
`source_fetch_state` includes the `__scrape_run_lock__` row, so it proves only
that the run *started*, not how far it got.

### Critical #2 + #3 — sweep wedge + AI cost — DONE
- Commit `3a5b7b1`, **deployed to `remotejobs-ph` Production**.
- 169 tests pass; web build clean.
- Both in `apps/web/src/pages/api/cron/scrape.ts` section 6c:
  1. **Poison-row wedge.** Rows are picked by oldest `geoCheckedAt`. A row whose
     content made every model fail returned `aiUnavailable` (indistinguishable
     from a quota outage); the loop did `break` and the `catch` never advanced
     `geoCheckedAt`, so that row stayed first in line and re-blocked the sweep
     every run. Now *any* failure advances the cursor, and only **two
     consecutive** failures stop the sweep.
  2. **Cost.** The sweep is ~95% of AI call volume (12 rows x up to 2 calls x 96
     runs/day) and ran on the 70B rung, exhausting the 10,000 neuron/day budget
     and starving new-item triage too. Sweep pinned to
     `@cf/meta/llama-3.1-8b-instruct` via the `AI_MODEL` override that both
     `triageJob` and `skepticEligibilityCheck` honour
     (`packages/scraper/triage.ts:239`, `:395`). New-item triage keeps the 70B
     ladder — low volume, high stakes.

Backlog sat flat at **1435** across the whole observation window (04:58 → 05:56),
with zero unclear rows touched. See Critical #4 above for why: the sweep was not
being reached at all. The 9 rows that gained `eligible_likely` in that window are
attributable to new-item triage on ingest, not to the sweep.

## Investigated, NOT a bug

**Run lock.** `__scrape_run_lock__` in `source_fetch_state` has no explicit
release, which looks like a leak. It is a TTL lock: `RUN_LOCK_TTL_MIN = 8`, cron
cadence 15 min, so the next scheduled run always finds it stale and reclaims it
via the atomic conditional UPDATE. Self-healing. Left alone.

Residual (low priority, not fixed): a run exceeding 8 min could be lapped by the
next run. Raising the TTL toward the cadence would trade that for a crashed run
blocking the following one.

## Caveat on the sweep fix

Setting `AI_MODEL` collapses the ladder to a **single** model with no fallback,
and JSON mode is only enabled for `llama-3.3` in `triage.ts`, so the 8B sweep
parses free-form output. Failures are now safe (row rotates out instead of
wedging), but if 8B parse failures are common the backlog will churn without
converging. Watch the `Unclear backlog: re-triaged N` log line, or simply
re-check that the backlog count is falling.

Verify with:

```bash
npx wrangler d1 execute remoteph-jobs-db --remote --command "SELECT COUNT(*) FROM opportunities WHERE is_active=1 AND ph_eligibility='unclear';"
```

## Environment note

`C:` ran out of disk mid-session, which made `git fetch`/`push` fail with
`unable to write loose object file: No space left on device` — and git reported
it as a misleading non-fast-forward hint. `node_modules` alone is 1.7 GB. Keep
~5 GB free; a `node_modules` reinstall cannot complete below that.
