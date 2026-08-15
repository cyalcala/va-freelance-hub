# Checkpoint - 2026-08-15 to 2026-08-16 Documentation & Backup Session

Date: 2026-08-16
Session scope: document every change from Saturday 2026-08-15 up to today, and
back up the repository to GitHub so all AI agents can read, maintain, repair,
and continue the work.
Session agent: opencode (DeepSeek v4 Flash 0731 via OpenRouter)
Working branch: `codex/apex-flash-continuation`

## Why this document exists

This is the **single consolidated entry point** for the 2026-08-15 work window.
It ties together the incident, the three-layer fix, the gauntlet units, and the
current repository state so that any agent (or the owner) can resume without
re-deriving history from `git log`. The granular docs it summarizes are linked
below and remain the authoritative detail for each piece.

## What happened on 2026-08-15 (all commits)

| Time (UTC) | Commit | Type | What |
| --- | --- | --- | --- |
| 01:50 | `d07c201` | docs | Prospector digest (automated) |
| 02:03 | `7834d70` | docs | Directory health digest (automated) |
| 02:35 | `9967263` | docs | Daily source health rollup (automated) |
| 15:22 | `b6877e2` | fix | Complete remaining Apex gauntlet units |
| 16:25 | `21cbbeb` | fix | Cap per-invocation Workers AI subrequest budget |
| 17:15 | `c897560` | feat | Inngest durable triage (structural fix) |
| 17:33 | `5986311` | merge | Merge `codex/apex-flash-continuation` into `main` |
| 22:42 | `1d60282` | fix | Polyfill `FinalizationRegistry` so `/api/inngest` stops 500ing |
| 22:42 | `77101b5` | merge | Merge the FinalizationRegistry fix into `main` |

### The incident and the three-layer fix

The production job board froze at jobs posted **2026-08-07** for ~8 days while
the heartbeat stayed green. Root cause: one Cloudflare Pages Function request
runs the whole scrape pipeline (fetch + robots + up to 50 listings x multi-model
AI triage + skeptic), and the Workers **Free plan caps subrequests at 50 per
invocation**. Busy ticks blew past 50, every remaining `env.AI.run()` failed with
`Too many subrequests by single Worker invocation`, triage **failed closed**, and
nothing inserted. Confirmed from live production D1 via the Sentinel workflow
(`__ingest_diag__` = `triageAiUnavailable=50`; `__sweep_diag__` carried the
subrequest error).

The fix landed in three layers:

1. **`21cbbeb` - Emergency tourniquet.** `AI_SUBREQUEST_BUDGET_PER_RUN = 15`
   caps AI calls per invocation via a closure-scoped budgeted env wrapper and
   defers overflow to the next 15-min tick (`markItemsForRetry`). New durable
   degradation signal `triageBudgetDeferred` so future budget pressure is
   visible in Sentinel, not silent. Doc:
   `docs/incident-2026-08-15-ai-subrequest-freeze.md`.
2. **`c897560` - Structural fix: Inngest durable triage.** Moves triage out of
   the scrape invocation and fans it out one-listing-per-step, each step its own
   invocation (own fresh 50-subrequest budget), under `concurrency: 5` +
   `throttle: 30/min` which also respects the 10,000-neuron/day Workers AI quota
   (error `4006`). The **Inngest signing key IS the feature flag**: with no key,
   scrape triages inline exactly as before; with the key, scrape persists
   gate-passed listings as hidden `pending-triage` rows (`is_active=0`) and the
   `triage-drain` Inngest cron classifies them out-of-band. New shared
   `decideTriage()` verdict so the inline path and the worker cannot drift. Doc:
   `docs/inngest-durable-triage-2026-08-15.md`.
3. **`1d60282` - Runtime gap closed: `FinalizationRegistry` polyfill.** Inngest
   v4's OTel span processor constructs a `FinalizationRegistry` at init, which
   the Workers runtime does not expose. `/api/inngest` returned a bare 500 on
   every request - confirmed from live production Function logs (deployment
   `aa151f12`) - before the signing key was ever read. Fixed with a no-op
   polyfill imported before any `inngest` module in both entry points
   (`apps/web/src/lib/inngest/polyfill.ts`). Safe because Workers are
   short-lived and GC finalizers never fire deterministically. This closes the
   exact "runtime-unverifiable until deployed" risk the Inngest doc flagged.

### Apex gauntlet units completed in `b6877e2`

Detailed in `docs/checkpoint-2026-08-15-deepseek-continuation.md`. Summary:

- **Unit 15 (DATA-02)**: homepage "Vetted companies" count uses the directory
  visibility predicate; shared `directoryVisibilityFilters()`.
- **Unit 10 (REL-04)**: sweep counters increment only after durable D1 writes;
  quota read failure is fail-closed; quota write failure surfaces as
  `quotaUnavailable`.
- **Unit 11 (REL-06)**: `recordSourceFetchState` returns `{ ok, error }`;
  conditional/ATS/rotation state-write failures aggregate into
  `stateWriteOk/Failed/Errors` in all three response paths.
- **Unit 12 (OPS-02)**: lock-held scrape response includes `backlogRemaining: 1`
  and `lockState: "held"` so Hunter cannot silently default to completion; added
  `runDurationMs`.
- **Unit 19 (REL-07)**: sweep diag row receives a null-error "recovered" stamp
  after a failure-free sweep.
- **Unit 21 (DEP-01)**: `docs/decisions/DEP-01-dependency-exceptions.md` plus a
  CI guardrail that checks the doc exists.
- **Unit 13 (AI-02, safe slice)**: `skepticUnavailable` counter surfaced as
  `unclearSkepticUnavailable`.
- Also in this commit: directory visibility unit tests, sweep tests, and the
  DeepSeek continuation checkpoint doc itself.

## Repository state as of 2026-08-16

- `origin/main` is at `9fbc282` and **already contains all 2026-08-15 work**
  (gauntlet fixes, budget tourniquet, Inngest durable triage, and the
  FinalizationRegistry polyfill) via merge commits `5986311` and `77101b5`.
- Working branch `codex/apex-flash-continuation` is 1 commit ahead of
  `origin/codex/apex-flash-continuation` (`1d60282`, the polyfill fix). Pushed
  as part of this backup session.
- Untracked, deliberately not committed (agent-local / generated): `.claude/`
  (local Claude Code config) and `graphify-out/` (graphify knowledge-graph
  output). They are not part of any implementation or documentation commit.
- Verification on this tree (ran 2026-08-16): **379 tests pass, 0 fail, 976
  expectations across 47 files**; `tsc --noEmit` clean; Astro production build
  clean (server build 85s). One benign build warning: vite externalizes
  `node:async_hooks` (imported by `inngest/execution/als.js`); no action needed.

## Activation milestone — 2026-08-16 (owner/claude)

The two manual owner steps are **done** (reported by a Claude session operating
directly on production):

| Milestone | Status |
| --- | --- |
| Aug-7 subrequest freeze | fixed (budget cap `21cbbeb`) |
| `FinalizationRegistry` crash on Workers | fixed (polyfill `1d60282`) |
| Valid signing key set + bound | done — `INNGEST_SIGNING_KEY` set on Pages (value stays in the Pages secret store; not committed to the repo) |
| App registered with Inngest | done — `{"message":"Successfully registered","modified":true}` |
| `triage-drain` cron live | done — every 10 min |

**Baseline @ 22:02Z (2026-08-16):** `pending_triage: 155`, `active: 1362`,
freshest active `Aug 14`. The 155 orphaned `pending-triage` rows are the fresh
Aug 8-15 jobs that were stuck in the freeze.

**Drain verification is the remaining acceptance step** — per the project's own
"registered ≠ draining" lesson, activation alone is not acceptance. Watch
targets: `pending_triage` drops across 10-min drain cycles, `active` climbs, and
the freshest active date advances past `Aug 14`. `4006` during backlog drain is
expected and self-heals (rows stay pending and are reclaimed next pass).

## What is still pending (owner actions)

1. **Confirm the drain** — re-query D1 after a few `triage-drain` cycles and
   record that `pending_triage` is dropping and `active` / freshest-date are
   climbing. If the drain throws, catch it in the Inngest/Function logs and fix.
2. **Confirm the board freshness gap closes** — jobs newer than 2026-08-14
   (and past the original 2026-08-07 freeze line) reach production.
3. Record the evidence in this doc / `docs/inngest-durable-triage-2026-08-15.md`
   once the drain is confirmed.

Unrelated standing owner action (unchanged): rotate the leaked `tr_dev_` /
Turso / ISR secrets at their providers.

## Files changed in this documentation session

- `docs/checkpoint-2026-08-16-documentation-backup.md` (this file, new)
- `docs/HANDOFF.md` - current checkpoint updated with the polyfill fix and repo state
- `docs/DOCS_INDEX.md` - reading order points at the 2026-08-15/16 docs
- `docs/IMPLEMENTATION_STATUS.md` - latest checkpoint section updated
- `docs/inngest-durable-triage-2026-08-15.md` - addendum for the polyfill fix

No implementation code was changed in this session.

## Where to resume

1. Read `docs/DOCS_INDEX.md` for the canonical reading order.
2. Read `docs/HANDOFF.md` for the latest stop/resume note.
3. For the incident mechanics: `docs/incident-2026-08-15-ai-subrequest-freeze.md`.
4. For the Inngest architecture and activation: `docs/inngest-durable-triage-2026-08-15.md`.
5. For the gauntlet program: `docs/checkpoint-2026-08-15-deepseek-continuation.md`
   and `docs/apex-part-2-gauntlet-state-2026-08-13.md`.

Next safe work (once drain is verified): consolidate the inline scrape triage
loop onto `decideTriage()`, move `sweepUnclearBacklog` into Inngest too, and,
once the Inngest path is proven in production, retire the
`AI_SUBREQUEST_BUDGET_PER_RUN` inline throttling (see follow-ups in the Inngest
doc).