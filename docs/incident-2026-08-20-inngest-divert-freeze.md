# Incident 2026-08-20 — Board froze at Aug-18 (Inngest divert) + neuron ceiling

## Symptom
Owner reported the public job board empty for Aug-19 / no fresh jobs for many
hours. Live D1: newest **visible** (`is_active=1`) job stuck at
`2026-08-18T14:00:59Z` while **hidden** (`is_active=0`) rows kept advancing
(newest `2026-08-19T19:30Z`). Green heartbeat throughout — a silent success.

## Root cause (two stacked layers)

### 1. The freeze: a stray Inngest signing key (P1, fixed)
`INNGEST_SIGNING_KEY` was still set on the `remotejobs-ph` Pages project, but the
Inngest `triage-drain` cloud cron was no longer firing (published 0 rows for
days). The old gate `triageViaInngest = Boolean(env.INNGEST_SIGNING_KEY)`
therefore kept scrape in **park-only** mode: every gate-passed new listing was
written hidden as `pending-triage` and never classified/published. From ~Aug-18
17:00Z the board froze; 55→77 eligible jobs orphaned. The external drain was a
single point of failure with no inline fallback and no board-freshness alert.

### 2. The recovery blocker: Workers-AI neuron ceiling (chronic)
Publishing requires AI triage. `__sweep_diag__` showed
`4006: you have used up your daily free allocation of 10,000 neurons` — and it
recurred ~75 min after the 00:00Z reset. The **only** AI consumers are in
`scrape.ts`: new-item triage (70B-first, high value) and the unclear sweep
(`sweepUnclearBacklog`, low value). Pulses use zero AI. Measured: the sweep is
~200 neurons/row (cheap rungs miss → 70B fallback), ~4× its design estimate, so
at 50/day it drained the whole budget alone.

## Fixes shipped to `main` (all deployed via CI, tested)

| Commit | Change |
| --- | --- |
| `4c7c934` | **Freeze fix.** `shouldTriageViaInngest` requires BOTH `INNGEST_SIGNING_KEY` AND `TRIAGE_VIA_INNGEST="1"`. Default = inline triage; a stray key can never silently freeze the board again. +regression test. |
| `3d6cd74`/`1d825f7`/`3c6a3cb` | `drainPendingTriageInline` — inline recovery of orphaned `pending-triage` rows (reuses `decideTriage`), on the cheap ladder, budget-bounded, runs on all 3 tick paths. **OPT-IN, OFF by default** via `DRAIN_PENDING_TRIAGE=1` (neurons too scarce on free tier). +8 tests. |
| `a349bb6` (scrape) | `DAILY_SWEEP_CAP` 50→15 to reserve the neuron budget for fresh jobs. |
| `a349bb6` (watchdog) | Board-freshness alert: the hourly watchdog now reads the newest visible job's age and alerts when nothing new published in >36h (catches silent freezes the heartbeat misses). +5 tests. |

Verification: 426 tests pass, typecheck 0, `audit:guardrails` 0, build clean.

## Inngest study (owner asked: can it replace/shoulder the AI load?)
**No.** `triage-drain` calls `decideTriage(...,env)` → `env.AI.run` — the same
Workers-AI binding and the same 10k-neuron/day account quota as inline triage. It
adds zero neurons. Inngest only solves per-invocation **subrequest** isolation
(the Aug-7 50-cap) + durability. Re-adopting it for the neuron problem would
re-introduce the exact fragility that caused this freeze. The neuron ceiling
moves only by (a) reducing AI demand (done: sweep cut) or (b) Workers Paid.

## Resolution (superseded the "current state" below same-day)

Two more moves, same session, closed the loop:

1. **Immediate relief** (`e36d303`) — one-time publish of the 58 orphaned
   `pending-triage` rows the deterministic geo-gate had already verified
   eligible (`worldwide` / `apac_incl_ph`), without waiting on AI at all.
2. **The structural fix for the neuron ceiling itself** — a free-first AI
   provider cascade (Gemini primary, Groq overflow, Cloudflare AI as reserve
   instead of the primary path). Full writeup, evaluation of OpenRouter/NVIDIA/
   Gemini/Groq, architecture, and live verification:
   `docs/ai-fallback-cascade-2026-08-20.md`.

Verified in production: the board's newest visible job advanced from the
frozen `2026-08-18T14:00Z` past `2026-08-20T14:00Z` **while Cloudflare's
neurons were still exhausted** — proof the free-provider cascade, not the
neuron reset, is what's carrying triage now. 7 `pending-triage` rows remain as
a static (non-growing) leftover from before the divert fix; see the cascade
doc's "current backlog state" for why that's low-priority.

## Current state / what to watch (as of the original incident, now historical)
- Board still frozen at Aug-18 at time of writing: **today's neurons are spent**;
  the budget resets 00:00 UTC. After reset, with the divert fixed and the sweep
  capped, fresh-item triage should publish a daily batch again.
- The 77 `pending-triage` rows stay hidden until `DRAIN_PENDING_TRIAGE=1` is set
  (recommended only with neuron headroom, i.e. Workers Paid).
- Watch: newest `is_active=1` `scraped_at` should advance after the reset; the
  new watchdog will file an issue if it stalls >36h again.

## Owner decision (capacity) — superseded by the cascade doc
This section assumed the only levers were "reduce AI demand" or "Workers
Paid" — written before the owner asked whether other free providers could
help. They can: see `docs/ai-fallback-cascade-2026-08-20.md` for the
evaluation and the shipped fix. Kept here for the historical record.
~~Free-tier 10k neurons/day caps daily fresh-job throughput. Options: reduce AI
demand further (already cut the sweep; could lower fresh-triage quality), or
Workers Paid (~$5/mo) to raise the ceiling and then enable the drain to clear
the 77 backlog.~~ See [[project_cf-freetier-limits]] / [[project_inngest-pilot]].
