# Inngest Durable Triage — Structural Fix for the Subrequest Freeze

Date: 2026-08-15
Branch: `codex/apex-flash-continuation`
Status: implemented, typecheck/test/build green (379 tests). **Inert in production
until the owner sets `INNGEST_SIGNING_KEY` and syncs the app** (steps below).
Companion to: `docs/incident-2026-08-15-ai-subrequest-freeze.md` (the emergency
budget fix, commit `21cbbeb`).

## Why this exists

The board froze at jobs posted **2026-08-07**. Root cause (confirmed from live
D1 via the Sentinel workflow): the scrape route runs the whole pipeline —
~41 source fetches + robots checks + up to 50 new listings × (4-model triage
ladder + skeptic) — inside **one** Cloudflare Pages Function request, and the
Workers **Free plan caps subrequests at 50 per invocation** (D1, KV, and every
`env.AI.run` all count). Busy ticks blew past 50, every remaining AI call failed
`Too many subrequests by single Worker invocation`, triage **failed closed**, and
nothing inserted — while the heartbeat stayed green. Production `__ingest_diag__`
read `triageAiUnavailable=50`; `__sweep_diag__` carried the subrequest error.

The emergency fix (`21cbbeb`, `AI_SUBREQUEST_BUDGET_PER_RUN = 15`) throttles AI
calls *within* one invocation and defers the rest. That unfreezes ingestion, but
it is a tourniquet: it races the same 50-cap (D1 counts too), has no cross-tick
memory, and cannot respect the *second* Free-tier wall — the **10,000-neuron/day
Workers AI quota** (error `4006`, hit during the Aug-13 audit).

**Inngest removes both limits structurally** by moving triage out of the scrape
invocation and fanning it out — one listing per Inngest step, i.e. per Pages
Function invocation, each with its own fresh 50-subrequest budget — under a
concurrency + throttle ceiling that keeps the daily neuron burn sustainable.

| Limit | Budget fix (`21cbbeb`) | Inngest durable triage |
| --- | --- | --- |
| 50 subrequests / invocation | Throttles to 15 AI calls/tick; still shares one budget with fetch+D1 | **Removed** — each step is its own invocation with its own 50-budget |
| 10,000 neurons / day (`4006`) | No cross-invocation memory; cannot help | `concurrency:5` + `throttle:30/min`; over-quota rows fail closed and are reclaimed next pass |
| Silent green heartbeat | Surfaces `triageBudgetDeferred` | Every run durable + visible in the Inngest dashboard with retries/alerts |

This is the **pilot** the project scoped (memory `inngest-pilot`,
`docs/apex-part-1-audit-and-implementation-plan-2026-08-12.md`): wire ONE
workload — triage — through `inngest/cloudflare`, keep everything else (GHA cron,
CF Cron Worker, D1, Workers AI, the budget guard) untouched. Evaluate before
expanding. Triage, not source-fetch fan-out, is the workload because triage is
the subrequest bottleneck **and** fanning out fetches every 15 min would exceed
the 50k-exec/month free tier (~118k/mo) while triage-only fits (~4k/mo).

## Architecture (self-contained Inngest cron, key-gated)

```
CF Cron Worker (unchanged, every 15 min)
        │  pings /api/cron/scrape
        ▼
/api/cron/scrape  ── fetch + dedup + geo-gate (deterministic, no AI) ──┐
        │                                                              │
        │  if INNGEST_SIGNING_KEY set: persist gate-passed listings    │
        │  as HIDDEN pending-triage rows (is_active=0) — NO env.AI.run  │
        ▼                                                              │
     D1 opportunities  ◄── (is_active=0, inactive_reason='pending-triage')
        ▲                                                              │
        │  Inngest cron every 10 min: claim ≤12 pending rows,          │
        │  fan out one step per listing (own invocation/budget),       │
        │  decideTriage() → UPDATE row: publish / reject / quarantine  │
        ▼                                                              │
   Inngest triage-drain ── each step: geoGate + triageJob + skeptic ───┘
```

- **The signing key IS the feature flag.** `scrape.ts` computes
  `triageViaInngest = Boolean(env.INNGEST_SIGNING_KEY)`. With no key, the inline
  triage loop runs **byte-for-byte as before** (with the `21cbbeb` budget guard).
  Set the key → scrape persists pending rows and Inngest owns triage. Remove the
  key → instant rollback to inline. No deploy needed to flip either way.
- **Hidden until classified.** Pending rows are `is_active=0`; the board filters
  `is_active=1` everywhere, so an untriaged (possibly ineligible) listing can
  never appear before the worker rules on it.
- **One verdict, two callers.** `decideTriage()` (`packages/scraper/triage-decision.ts`)
  is the single source of truth for publish/reject/quarantine, shared so the
  inline path and the Inngest worker cannot drift. Covered by unit tests.

## Files

| File | Change |
| --- | --- |
| `packages/scraper/triage-decision.ts` | **New.** `decideTriage()` shared verdict + `mapTriageCategoryToUiCategory`. |
| `packages/scraper/triage-decision.test.ts` | **New.** 6 tests: fail-closed, ineligible, gate-verified skip-skeptic, consensus agree/split. |
| `packages/scraper/index.ts` | Export `decideTriage`, `mapTriageCategoryToUiCategory`, types. |
| `apps/web/src/lib/inngest/client.ts` | **New.** Inngest client + Cloudflare bindings middleware (`wrapRequest` captures `requestArgs[1]` = env → `transformFunctionInput` injects `ctx.env`). |
| `apps/web/src/lib/inngest/functions/triage-drain.ts` | **New.** Cron `*/10 * * * *`, concurrency 5, throttle 30/min, retries 2. Claims ≤12 pending rows, fans out `decideTriage` per listing, UPDATEs verdict. |
| `apps/web/src/pages/api/inngest.ts` | **New.** `inngest/cloudflare` serve, called workers-style `(request, env, ctx)` from an Astro route so Inngest reads the signing key from Pages secrets. |
| `apps/web/src/pages/api/cron/scrape.ts` | Guarded `triageViaInngest` branch: persist pending instead of inline triage; `pendingPersisted` in diagnostics. Inline loop unchanged. |
| `apps/web/src/env.d.ts` | `INNGEST_SIGNING_KEY` / `INNGEST_EVENT_KEY` on `ENV`. |
| `apps/web/package.json` | `inngest@4.18.1`. |

No D1 migration — reuses the existing `is_active` / `inactive_reason` /
`ph_eligibility` columns. Production already ships `nodejs_compat`
(`wrangler.jsonc`), which Inngest's AsyncLocalStorage needs.

## Owner activation (the two external steps I can't automate)

1. **Set the signing key on Pages** (run it yourself so the secret never passes
   through the agent). Use Inngest's **Signing Key** (`signkey-prod-…`):
   ```bash
   bunx wrangler pages secret put INNGEST_SIGNING_KEY --project-name remotejobs-ph
   ```
2. **Deploy** this branch (merge to `main` → CI deploys, or `bun run --cwd apps/web deploy`).
3. **Sync the app in Inngest**: dashboard → *Apps* → *Sync new app*, URL
   `https://remotejobs-ph.pages.dev/api/inngest`. Confirm the `triage-drain`
   function appears with its `*/10 * * * *` schedule.

Until step 1, everything above is inert — production keeps triaging inline.

## Verification (after activation)

- `/api/inngest` returns 200 to GET (Inngest introspection).
- First scrape after the key is set: response shows `triageViaInngest: true` and
  `pendingPersisted > 0`; no new `is_active=1` rows come from scrape directly.
- Inngest dashboard: `triage-drain` runs every 10 min; step returns
  `{ claimed, published, rejected, quarantined, deferred }`.
- Board freshness advances past 2026-08-07 as the backlog drains.
- `4006` during backlog drain is **expected and benign**: the row stays pending
  and is reclaimed next pass (fail closed). The ~8-day backlog drains at the
  neuron-quota-limited pace over several days — steady state (~65/day) fits.

## Rollback

Remove the Pages secret (`wrangler pages secret delete INNGEST_SIGNING_KEY
--project-name remotejobs-ph`) → next scrape reverts to inline triage. Any rows
left `pending-triage` are re-fetched into the normal flow on their next feed
appearance, or can be flipped back with a one-line D1 update. Reverting the
branch also fully removes the path.

## Follow-ups (deliberately out of pilot scope)

1. Move the inline `sweepUnclearBacklog` into Inngest too, so a key-on scrape
   makes **zero** `env.AI.run` calls.
2. Consolidate the inline scrape triage loop onto `decideTriage()` (the pilot
   left it untouched to minimize risk to the just-unfrozen path; two copies of
   the verdict mapping exist until then).
3. Add a `claimed_at` marker if overlapping cron passes ever double-process
   (currently harmless — the UPDATE is idempotent — but wastes a few calls).
4. Once proven, retire `AI_SUBREQUEST_BUDGET_PER_RUN` inline throttling.
