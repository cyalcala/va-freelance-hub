# Workable Pacing Diagnostic + Badge-Live Observation — 2026-09-26 (~02:30Z)

**Mode:** EXECUTE (read-only diagnostic + observation; zero production writes).
**Unit:** `WORKABLE-PACING-DIAGNOSTIC` + badge-live observation step from `REMOVE-NEW-BADGE`.
**Authorization:** owner "All approved" + `docs/bootloaders/CURRENT.md` NEXT
("verify badge-free board live; then remotecom re-eval after 18:20Z; Workable-pacing diagnostic").
**Start SHA:** `43dc8884004ffbcdfd70a29fb95d72a03b5cff7e` (clean, == `origin/main`).
**Method:** repo-pinned wrangler (`apps/web/wrangler.jsonc`,
`bun ../../node_modules/wrangler/bin/wrangler.js d1 execute DB --remote --env production`),
SELECT-only. Every D1 query returned `changed_db=false`, `rows_written=0`.
Live board checks via `curl.exe` GET. Code reads only.
**Autonomy:** L1 ADVISE both domains, unchanged; Jev not invoked; no autonomous decisions.

## 1. Badge-live observation (REMOVE-NEW-BADGE closeout)

- Code (VERIFIED CODE): `apps/web/src/components/opportunity-card.tsx` contains
  no `New` badge JSX, no `isFreshArrival`, no `NEW_BADGE_WINDOW_MS`.
  `scrapedAt` remains as an optional non-displayed recency field.
- Deploy (VERIFIED LIVE via CI): `6e388c2` + checkpoint `43dc888`;
  Sovereign CI Guardrail success on `43dc888` at `2026-09-26T02:23:19Z`
  (validate + Pages deploy).
- Live (OBSERVED ~02:30Z):
  - `GET /` → 200; `GET /opportunities?fresh=today` → 200.
  - `?fresh=today` renders "Showing 1–14 of 14" with "New arrivals:"
    filter label, "Last 24h" + "Today (Manila)" chips, `aria-current="page"`
    on Today — fresh views intact.
  - No card-level NEW badge elements in the served HTML; only the
    "New arrivals:" filter-section label remains (not a per-card badge).
- Reality level: OBSERVED (single live fetch, not a measured window).

## 2. Remotecom gate re-check (falsification-first)

- `greenhouse:remotecom` bad outcomes (all history):
  single `UNREACHABLE` at `2026-09-12T18:20:56.711Z`, `plausible_items=0`.
- At ~02:30Z on 2026-09-26 that singleton is still inside the rolling 14-day
  window → **NOT promotable. Hold until ~2026-09-26T18:20Z**, then re-run the
  bad-outcomes-back-to-MIN-qualifying query FIRST (lesson from EX-CANARY-EVAL).
- Reality level: MEASURED (fresh SELECT).

## 3. Workable pacing diagnostic

### 3.1 Post-fix burst pattern (MEASURED, fresh SELECTs)

Hourly outcome groups for `workable:%` since `2026-09-24T00:00Z`:

| Hour (UTC) | Outcome | n |
| --- | --- | ---: |
| 09-26T01 | HEALTHY_WITH_RESULTS | 7 |
| 09-26T00 | HEALTHY_WITH_RESULTS | 7 |
| 09-25T22 | HEALTHY_WITH_RESULTS | 7 |
| 09-25T20 | HEALTHY_WITH_RESULTS | 7 |
| 09-25T18 | RATE_LIMITED | 7 |
| 09-25T17 | HEALTHY_WITH_RESULTS | 7 |
| 09-25T15 | HEALTHY_WITH_RESULTS | 7 |
| 09-25T13 | RATE_LIMITED | 7 |
| 09-25T12 and earlier | HEALTHY_WITH_RESULTS | mixed 2/5 rotation |

- Bursts are **all-or-nothing per tick**: all 7 agencies `RATE_LIMITED` within
  the same minute (e.g. 09-25T18:43:07Z→18:44:01Z, 7 probes in ~54s, avg ~9s
  apart), then fully healthy the next tick (09-25T20:20Z onward: 4 consecutive
  healthy 7-probe ticks ≈ 5.5h streak).
- The "100% HEALTHY_WITH_RESULTS since 2026-09-24T20:15Z" claim stays
  FALSIFIED (already corrected in FUNNEL-MEASUREMENT): post-fix bursts at
  09-24T20Z (5), 09-25T13Z (7), 09-25T18Z (7).
- Plausible-item yields are stable when healthy (pearltalent ~200, hunt-st
  ~147–148, crewbloom ~107, coconutva ~38, rocketams ~9, pineapple ~3,
  hello-rache ~3) — the agencies have real supply; the loss is pacing, not market.

### 3.2 Mechanism vs behavior (VERIFIED CODE vs OBSERVED)

Current pacing (code):
- `packages/scraper/shadow-dispatcher.ts:466`: 3000ms same-host,
  1200ms cross-host inter-probe delay.
- `packages/scraper/candidate-shadow.ts:437-463`: single retry on 429 for
  unauthenticated ATS APIs with `Retry-After` (capped 5000ms) else 3000ms.
- `apps/web/src/pages/api/cron/shadow-dispatch.ts:85-94`: provider-interleaved
  enumeration (`ROW_NUMBER() OVER (PARTITION BY provider_id ...)`).

Observed behavior contradicts the "3s spacing prevents bursts" assumption:
7 probes ~9s apart (fetch time + 3s delay + 3s retry) ALL return 429 including
the retry. The origin (`apply.workable.com`) appears to rate-limit at a
**window level** (per-minute/hour from the Pages egress IP), not just burst
spacing. Interleaving spreads Workable probes among other providers but all 7
still land within ~1 minute on full-dispatch ticks.

### 3.3 Window impact

The constitutional 7-day error-free window keeps sliding with each burst tick.
Workable x7 remain `shadow`; no promotion path until 7 consecutive clean days.
This blocks the largest permissible expansion cohort (7 of 10 shadows).

### 3.4 Options (NOT implemented in this unit — needs a bounded follow-up)

1. **Skip-remaining-same-host on 429 (recommended):** when a probe in a tick
   returns 429 for a host, skip the remaining same-host probes that tick
   (record as cadence-held, not as 7 separate 429s). Converts a 7-error burst
   into 1 error + 6 skips; stops poisoning the 7-day window 7x per event.
2. **Workable 1-per-tick cap:** stagger the 7 agencies across ticks (extends
   the existing 2-per-tick rotation idea to 1 for this host).
3. **Longer same-host delay for `apply.workable.com`** (e.g. 15–30s): costly
   in tick time; least preferred without evidence the window is that short.
4. **Accept as transient and wait:** if bursts are rare (2/day currently), the
   window may still never clear — not recommended as the plan.

Any option needs: bounded unit contract, tests (skip logic, rotation,
verdict classification of skips vs 429s), replay against the 09-24/25 burst
windows, and human review — it changes dispatch behavior and the
evidence semantics (skip ≠ healthy ≠ error). **No code changed here.**

## 4. Stock snapshot (fresh, read-only)

- Registry: 5 active / 5 canary / 10 shadow / 14 candidate / 1 quarantined = 35
  (unchanged).
- Active eligible: 901 (681 `eligible_likely` + 220 `eligible_verified`),
  0 active unclear (unchanged from funnel).
- UTC-today first-stored active eligible: 2 (evidence-window note: UTC date,
  not the Manila-day KPI; live `?fresh=today` shows 14 Manila-day arrivals).

## 5. Impossible-target note (§10, no change)

Sustained rate ~12.6/d ex-spike (FUNNEL-MEASUREMENT 01:55Z, ~35min before this
unit); gap ~87/d; honest ceiling ~15–30/d. Nothing in this unit changes the
ceiling. Largest permissible expansion remains the shadow pipeline (remotecom
due ~18:20Z today, wikimedia ~Sept 29, Workable blocked pending pacing fix).

## 6. Recommendation (one concrete next action)

Re-evaluate `greenhouse:remotecom` shadow→canary **after 2026-09-26T18:20Z**
with the staged script, running the bad-outcomes-back-to-MIN-qualifying query
FIRST; open the bounded skip-on-429 dispatch unit as the Workable follow-up.
Do NOT promote remotecom early and do NOT live-sync the lake on an unapproved
cohort.
