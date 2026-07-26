# Cron/geo audit — handoff (2026-07-26)

## Commit ledger

| Commit | Fix | Deployed | Proven working? |
|---|---|---|---|
| `ebe37e6` | Unauthenticated scrape trigger closed | yes | **yes** — unauth `POST` → 401, cron still fires |
| `3a5b7b1` | Poison-row wedge + keep 70B out of sweep | yes | wedge yes; the cost pin caused `5173234` |
| `b0c2b23` | Sweep on the `allItems===0` exit | yes | insufficient alone |
| `9b03ebb` | Sweep on the `newItems===0` exit | yes | **yes** — sweep provably entered |
| `5173234` | `AI_MODEL` as ladder, not single model | yes | **not yet** — see Open question |

All commits: 169 tests pass, web build clean.

**Honest summary:** four attempts to reach the real cause. Three distinct bugs
stacked (sweep unreachable → reachable but AI failing closed), and two
intermediate "verified" claims did not hold up. The only trustworthy proof is
the backlog count falling while inflow is zero.

Two misreads worth not repeating:
- Judging deploys against the wrong Pages project (see topology below).
- Attributing ~20 rows with fresh `geo_checked_at` to the sweep when other
  pulses also stamp that column. With `inflow = 0` and a static backlog, those
  could not have been sweep resolutions. Break down by
  `ph_eligibility, is_active` before concluding.

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

### Critical #5 — the cost fix broke the sweep's AI calls — DONE
Commit `5173234`. This was self-inflicted by Critical #3 above, and was logged
here first as a hypothetical caveat before the data confirmed it.

Once #4 landed, the sweep ran on every tick but still resolved nothing: with
`inflow_60min = 0` over a full hour, the active-unclear backlog held at exactly
1435 while only 2–4 unclear rows were touched.

The `2` is the tell. The sweep's `catch` branch advances the cursor **without**
incrementing the failure counter and **without** breaking, so N thrown errors
would touch N rows. Only the `aiUnavailable` path increments and breaks at two.
So every AI call was failing closed — and multiples of 2 across ticks confirmed
it was one break per run.

Cause: `env.AI_MODEL ? [env.AI_MODEL] : [...]` collapses a **four-rung ladder to
a single model with no fallback**, and JSON mode is enabled only for `llama-3.3`
(`triage.ts`, the `model.includes("llama-3.3")` guard), so the pinned 8B rung
parses free-form output. One bad parse exhausts the ladder → `aiUnavailable`.
That the sweep *had* historically resolved rows (backlog fell ~1870 → 1435 on
the full ladder) is what pointed here.

Fix: `parseModelOverride()` parses `AI_MODEL` as a comma-separated ladder
(single values still work), and the sweep now uses
`llama-3.1-8b → llama-3-8b → mistral-7b`. Keeps the expensive 70B rung out of
the high-volume path while restoring the fallbacks that make free-form parsing
survivable.

**Lesson worth keeping:** a cost control that pins a model also removes every
fallback. Prefer constraining a ladder to swapping in a single rung.

## Open question — is any of this enough?

At the time of writing this is **not yet proven**. The backlog had been pinned at
exactly 1435 for ~4 hours. Nothing above counts as working until that number
drops with inflow at zero.

If the backlog still holds at 1435 after several ticks on `5173234`, the
remaining suspect is **account-level Workers AI quota** (10,000 neurons/day),
which no model ladder can fix. The mitigation is to lower
`UNCLEAR_RETRIAGE_BUDGET` (currently 12) — that trades convergence speed
(~1.5 days → a week or more) for AI cost, and is a product decision, not a
technical one. Deliberately left unpushed.

Related sizing note: with the sweep now genuinely running every tick, volume is
12 rows x 96 ticks x up to 2 calls ≈ 2,300 calls/day. `UNCLEAR_RETRIAGE_BUDGET`
was sized for a sweep that almost never ran, so it likely needs lowering
regardless of the quota question.

Verify with:

```bash
npx wrangler d1 execute remoteph-jobs-db --remote --command "SELECT COUNT(*) FROM opportunities WHERE is_active=1 AND ph_eligibility='unclear';"
```

## Environment note

`C:` ran out of disk mid-session, which made `git fetch`/`push` fail with
`unable to write loose object file: No space left on device` — and git reported
it as a misleading non-fast-forward hint. `node_modules` alone is 1.7 GB. Keep
~5 GB free; a `node_modules` reinstall cannot complete below that.
