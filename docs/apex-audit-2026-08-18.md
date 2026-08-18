# Apex Debugging & Hardening Audit — 2026-08-18

Principal-engineer adversarial audit of the live Cloudflare/Astro/D1 production
system. Operating loop: DISCOVER → MODEL → BASELINE → HYPOTHESIZE → REPRODUCE →
PROVE → FIX → TEST → ADVERSARIAL REVIEW → KEEP/REVERT. Doctrine: preserve the
working architecture; smallest high-confidence interventions; evidence over
intuition; prove the bug before fixing it.

## Executive Summary

The system is **already heavily hardened** by the prior audit trail (2026-06 → 2026-08).
The low-hanging silent-failure fruit is gone: `ingest.ts` uses an explicit column
allow-list, `auth.ts` is constant-time, every pulse workflow validates real
response signals, and the Aug-7 subrequest-freeze fix (`withAiSubrequestBudget`)
is correctly threaded through **every** AI path. This audit therefore found a low
density of new defects — as expected for a mature codebase — and concentrated on
the newest, least-audited code (the Directory Growth Engine, deployed 2026-08-16).

Two real bugs found, both proven, fixed, tested, and shipped:

| ID | Sev | Title | Commit |
| --- | --- | --- | --- |
| U1 | P1 | Directory-enrich budget **starvation** (`ORDER BY id ASC LIMIT` re-selected the same un-enrichable low-id rows every run → silent zero-progress success) | `d6114b2` |
| F2 | P2 | Directory-audit **subrequest-cap breach** (`DEFAULT_BUDGET=60` link-check fetches vs the Workers-Free 50/invocation cap → silent partial success; same failure class as Aug-7) | `6e07bcf` |

Baseline and post-fix state are both fully green: **408 tests pass**, typecheck
exit 0, build exit 0, guardrails exit 0.

## Architecture Verified (from repository evidence)

Active production path (confirmed, not assumed):
- Bun workspaces; Astro app in `apps/web`; Cloudflare Pages host; Cloudflare D1.
- **Clock:** the `workers/freshness-cron` Worker is the sole reliable cron; GHA
  pulses POST to authed cron endpoints.
- **Pipeline:** GHA pulse → scraper fetch (RSS/JSON/HTML/ATS) → geoGate + AI
  triage (+ skeptic consensus) → normalize → dedupe (`onConflictDoNothing`) →
  authed POST → Astro API → D1 → public board.
- **Hard constraint:** Workers Free = **50 subrequests / invocation**; Workers AI
  Free = ~10k neurons/day. This is the dominant reliability constraint and the
  root of the Aug-7 freeze.

## Bugs Found

### U1 (P1) — Directory-enrich target starvation → silent zero-progress

**Observed/root cause.** `enrichDirectory` selected its per-run budget with
`ORDER BY id ASC LIMIT budget`. The candidate set is dominated by rows this pass
can never enrich in a given run — a prospector-added company whose only job URLs
are aggregator links (weworkremotely, remoteok) yields no inferable website, and
a row with no ATS token can never get a hiring page. Those stuck rows never leave
the candidate set, so ascending-id ordering re-selected the same lowest-id rows
every run and **permanently starved every higher-id row, including the few that
were actually enrichable.** The pulse returned HTTP 200 with a success body every
run while making no forward progress — a *silent success* (task §7B).

**Fix (`d6114b2`).** Extracted the selection as `buildEnrichmentTargetSql(budget)`
(raw SQL, `bun:sqlite`-testable, mirroring the shipped `duplicateSurvivorSql`
pattern) and:
- `ORDER BY RANDOM()` instead of `id ASC` — every candidate gets a fair turn;
  the migration-free analogue of the cursor rotation `directory-audit` /
  `verify-links` already use.
- ATS-scoped the hiring-page clause so non-ATS rows missing a hiring page they
  can never obtain are no longer held in the budget forever.
- Clamped `budget` into `[1,100]` at the SQL boundary so the interpolated `LIMIT`
  is always a safe integer.

**Reproduction/test.** A real in-memory `bun:sqlite` test proves the old
`ORDER BY id ASC LIMIT 3` returns `[1,2,3]` forever (id 4 starved), and the new
ordering reaches every candidate across runs; plus ATS-scoping and clamp tests.

### F2 (P2) — Directory-audit exceeds the 50-subrequest cap → silent partial check

**Observed/root cause.** `directory-audit` runs in one Pages Function invocation
and makes one `checkDirectoryLink()` fetch per company. `DEFAULT_BUDGET = 60`, and
`gha-directory-pulse.yml` POSTs with no `?limit` override, so **60 external
fetches per invocation is the live value, 4×/day** — over the 50-subrequest
Workers-Free cap. Whenever ≥~50 rows carry a website, fetches 51+ throw "Too many
subrequests"; `checkDirectoryLink` catches the throw and classifies it as
`unreachable` (line 129). Because `unreachable` is `isHardDead:false` it **never
counts a strike** — so there is *no data corruption and no false de-verification*
— but the run reports those rows as "checked" when they were not, and pollutes the
`unreachable` tally. A *silent partial success* in the exact failure class as the
Aug-7 freeze, in the one production route lacking a subrequest safeguard. As the
enrichment engine fills in missing websites the checkable pool grows toward the
full directory, so the breach moves from latent to active.

**Why D1 does not save it / why 40 is safe.** Internal evidence proves D1 binding
calls do **not** consume the 50-subrequest budget: the scrape route performs
dozens of D1 ops per invocation without tripping the cap, and its only guard is
`AI_SUBREQUEST_BUDGET_PER_RUN`. So for `directory-audit` only the `fetch()` calls
count, and a per-run budget of 40 (40 fetches + 2 selects + redirect headroom)
sits safely under 50.

**Fix (`6e07bcf`).** Lowered `DEFAULT_BUDGET` to 40, exported it, added a
regression test mirroring `ai-subrequest-budget.test.ts`, and corrected the stale
"60/run" workflow comment. No active guard is needed — unlike scrape, the
oldest-checked-first rotation is the deferral mechanism, so a smaller per-run
budget only lengthens the full sweep (~2–3 days), it never skips a company.

## Verified robust (audited, NOT changed — Chesterton's Fence respected)

- **`scrape.ts` AI subrequest budget** — `withAiSubrequestBudget` is threaded
  through *every* AI path: main triage (1810), skeptic (1817), and the sweep
  (772/834 via `sweepEnv = {...aiEnv, AI_MODEL}`). The Aug-7 fix is sound.
- **`auth.ts`** — length-folded constant-time compare; Bearer / `x-cron-secret`.
- **`ingest.ts`** — explicit column allow-list (no `...item` spread), payload
  caps, `.returning()`-accurate insert counts, `rejectedForUrl` surfaced.
- **`directory-seed.ts` / `prospect.ts`** — idempotent normalized-name filters
  (`normalizeCompanyName` is byte-consistent across both sides), batch-with-
  per-row-fallback, mass-add anomaly guard, fail-closed ATS, full accounting.
- **`directory-visibility.ts` / `directory-health.ts`** — shared visibility
  predicate; transient `unreachable` never strikes, only `isHardDead` does,
  de-verify at 3 strikes + `isVerified`, with a systemic-egress gate.
- **Workflows** — every pulse has a `concurrency` group (`cancel-in-progress:
  false`), `set -euo pipefail`, HTTP+JSON validation; hunter extracts ~15 health
  signals; `continue-on-error` only on `if: always()` summary steps; health
  alerting reads D1, never workflow status.
- **`public-query.ts`** — strict page parsing (rejects `1e2`), `MAX_PAGE` OFFSET
  ceiling, query length/token caps, parameterized `LIKE` escaping. The public
  `directory.astro` applies `directoryVisibilityFilters()` (provenance confirmed).

## Evidence

| Check | Baseline | After U1 + F2 |
| --- | --- | --- |
| `bun run test` | 407 pass, 0 fail | **408 pass, 0 fail** (49 files) |
| `bun run typecheck` | exit 0 | exit 0 |
| `bun run build` | — | exit 0 (server ~37s) |
| `bun run audit:guardrails` | — | exit 0 |

Runtime proof note: direct production-D1 verification was not possible from this
environment (Cloudflare API 7403 on local Wrangler, a known project condition).
Both fixes are exercised by real `bun:sqlite` semantics and by the shipped
`db.all(sql.raw(...))` pattern already in production (`prune.ts`), so the SQLite
behavior they depend on is proven.

## Reliability & Observability improvements

- Enrichment now makes measurable forward progress every run instead of silently
  churning the same stuck rows (U1).
- Directory link-health stops silently mis-recording overflow rows as
  `unreachable`; the per-run tally becomes trustworthy (F2).
- A new invariant test guards the directory-audit budget against ever crossing
  the 50-subrequest ceiling again, joining the existing AI-budget guard test.

## Security

No new findings. Trust boundaries reviewed: cron/ingest auth is constant-time and
correctly required (401 on missing/invalid secret); ingest uses a server-owned
column allow-list; scraped/external content is treated as untrusted (URL
sanitization, geo-gate, budget caps). The standing OWNER ACTION to rotate the
historically-leaked `tr_dev_` / Turso / ISR secrets is unchanged by this audit.

## Remaining risks & Deferred work (noted, intentionally not changed)

- **directory-audit `db.update()` inside `Promise.all` is un-try/caught** — one
  row's transient D1 write error rejects the whole run → 500 (loses the batch).
  F2 removes the main trigger (subrequest exhaustion); the residual is a rare
  transient-D1 case. P3 resilience follow-up: wrap per-row writes and surface a
  failure count.
- **Optional hard fetch-guard for directory-audit** — provably bounds fetches
  against redirect hops regardless of budget. Low ROI now that budget 40 +
  rotation cover it. P3.
- **Inngest `triage-drain` step batching (monitor-only)** — the design fans out
  one `step.run` per row (each its own invocation/budget), which is correct *if*
  Inngest never collapses parallel steps into one invocation. Unconfirmed
  Inngest-internals behavior on dormant pilot code; adding `withAiSubrequestBudget`
  there would be cheap belt-and-suspenders if it ever activates at volume.
- **`prospect.ts` inline normalizer** duplicates `normalizeCompanyName` (byte-
  identical, no bug) — P3 DRY only.

## Final Confidence (evidence-based, not optimism)

| Dimension | Confidence | Basis |
| --- | --- | --- |
| Correctness | High | 408 tests, typecheck/build clean; two real bugs fixed with regression tests |
| Data integrity | High | No corruption found; U1/F2 both fail safe (no false strikes, additive-only) |
| Ingestion reliability | High | Aug-7 subrequest guard verified end-to-end; F2 removes the one remaining cap breach |
| Workflow reliability | High | All pulses validate real signals, guard concurrency, read D1 for health |
| Security | High | Constant-time auth, allow-listed ingest, untrusted-input handling verified |
| Performance | Medium-High | Not the focus; hot-query indexes were validated in prior audits |
| Observability | Medium-High | Diagnostics heartbeats + digests exist; F2 makes the audit tally honest |
| Maintainability | High | Fixes reduce accidental complexity; no architecture change; fully revertible |

## Definition of Done

P0: none found. P1 (U1): resolved. P2 (F2): resolved. Core invariants have tests.
Build/tests/typecheck/guardrails green. Remaining items are P3/monitor with
documented rationale and low ROI vs regression risk — the mature-audit stop
condition (task §26) is met. The system is more correct, more observable, and
less likely to fail silently than at audit start, with the working architecture
preserved.
