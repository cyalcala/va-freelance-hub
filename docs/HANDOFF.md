# Handoff

## Current Handoff — 2026-08-29 Source Perpetuity (SP-08, SP-09, SP-16, SP-17 TERMINAL — KEEP; SP-12 VERIFYING)

Status: **Registry/lifecycle/discovery phases complete through SP-09, plus both SP-05-independent tracks (SP-16, SP-17). SP-12 (first adapter canary) is evidence-ready but deliberately stopped short of activation.**

This checkpoint covers one long owner-authorized unattended session (owner: "proceed with all... do not stop... fair and reasonable... approved", resting ~8 hours). Four units reached TERMINAL — KEEP, one reached VERIFYING at a genuine safety boundary:

- **SP-08** (evidence packets + review-debt alerts) — finished a prior session's in-progress core module; added the read-only D1 integration script. Behavior `075be3b`+`fc4e5ab` (PR #88) → `a03631b`.
- **SP-09** (Workable global XML feasibility) — one bounded live probe of the real feed (44.41 MiB, 11,603 entries, 337 PH) → decision `GITHUB_ACTION_PREPROCESSING`. Behavior `618dba9` (PR #89) → `806b2d7`.
- **SP-16** (no-account employer "bring your feed" intake) — GitHub issue form + workflow + `PROXY_SECRET`-gated route; rejects secret-like/candidate-data-like content outright. Behavior `8d1a05a` (PR #90) → `eba3c0f`.
- **SP-17** (partner/permission evidence pipeline) — real, revalidated evidence packs for Ashby (outreach-ready), Jobvite (outreach-ready), and Breezy (correctly `draft` — Breezy has **no** partner-request path at all, only customer-generated PATs). Behavior `cede086` (PR #91) → `39e88b5`.
- **SP-12** (Greenhouse minimal-index shadow) — **VERIFYING, not KEEP.** Real live shadow probe against `greenhouse:grafanalabs` came back healthy (134 real jobs, robots allowed) and the evidence packet is `review_ready`, but the actual `source_registry` write to activate it was **blocked by the harness's own auto-mode safety classifier** and was not routed around. Code merged (`7769d69` → `23e74dd`, PR #92); **zero D1 mutation occurred.** Full evidence: `docs/gauntlet/evidence/SP-12-greenhouse-grafanalabs-day1-evidence.md`.

Exact-six production behavior (`ROBOTS_ENFORCE_SOURCE_IDS`) and the five-token `ATS_TOKEN_POLICIES` Greenhouse pause are both completely unchanged by everything above.

- Next exact action: **owner reviews the SP-12 evidence doc** and either authorizes the pending registry write (unlocking a real 7-day shadow window, then canary) or names a different curated board. Independently, SP-11/13/14/15 (Lever/SmartRecruiters/Teamtailor/Recruitee) would hit the identical classifier block at their own registry-write step — their code-only shape (adapter/evidence, no write) can still be built on request.
- Environment note: the session hit 0-bytes-free disk three times, always recovering after the owner freed space; the recurring root cause was not yet found by the owner as of this checkpoint.

This is a milestone pointer. For mutable current facts and the next exact
command, always prefer the top of `docs/SYSTEM_SAVEPOINT.md`.

## Prior Handoff — 2026-08-29 Source Perpetuity (SP-00..SP-03 TERMINAL — KEEP) (historical)

Status: **Registry foundation complete.** SP-00 (durable planning), SP-01 (exact
source identity), SP-02 (truthful source economics + 304 unchanged-separation
fix), and SP-03 (provider/source registry foundation) are all TERMINAL — KEEP.
Latest behavior `0331fa13bfda527e2420da3363e9a894e5466095` (PR #83); exact-SHA
Sovereign CI Guardrail run `33247081804` applied migration `0036`, verified FTS
integrity, and deployed Pages. Prior `ed0040a`/`33243425545` remain accepted.

- Additive `provider_profiles` + `source_registry` introduce independent
  compliance/operational states (ADR-006) and CHECKs, but no `apps/web`
  runtime reads them yet — rollback is ignore tables.
- Read-only dump `scripts/diagnostics/source-registry.ts` maps 26 known
  static+ATS ids vs registry rows (0 mapped / 26 unmapped on empty registry).
- Existing exact-six production sources remain unchanged; `690` tests pass.
- Next dependency-ready implementation: **SP-04** registry-backed
  behavior-preserving policy resolver.

This is a milestone pointer. For mutable current facts and the next exact
command, always prefer the top of `docs/SYSTEM_SAVEPOINT.md`.

## Handoff — 2026-08-22 Gauntlet planning checkpoint (historical)

Status: **PLANNING COMPLETE — KEEP**. No implementation unit is active, no
worktree is assigned to the Gauntlet, and no production behavior changed.

- Planning baseline: clean synchronized `main` at `bd84cc1`.
- Accepted planning package: `d21cd9e`; GitHub Actions run `32552942171`
  passed validation and skipped production migration/deploy as docs-only.
- Last accepted behavior: `07f582b`, deployed by run `32475868471`.
- Latest scheduled evidence inspected: watchdog `32550368138`, source health
  `32546699929`, directory health `32545246416`, Prospector `32544606954`, and
  enrichment `32550872494` all completed successfully; their payload findings
  remain inputs to the plan.
- Fresh local planning-package verification passed all 454 tests/1,209
  assertions, production guardrails, strict typecheck, and the full build.
- Resume with the current [System Savepoint](./SYSTEM_SAVEPOINT.md), then the
  [Master Execution Plan](./MASTER_EXECUTION_PLAN.md), then
  [Portable Implementation Units](./gauntlet/IMPLEMENTATION_UNITS.md).
- Use the [Agent-Reach Study](./research/agent-reach-study-2026-08-22.md) only as
  a bounded reference.
- First exact action: re-sync `main`, confirm the starting SHA, and execute the
  read-only `REC-01` continuity inventory without cleanup. Then execute
  `DATA-05A` without combining it with repair, source expansion, or unrelated
  refactoring.

If execution stops before acceptance, record the unit state, changed files,
tests run, failures, last safe commit, branch/worktree, and next exact action;
push recoverable partial work only to its isolated branch and never label it
KEEP.

## Prior Accepted Handoffs — historical below this checkpoint

The append-only handoffs below preserve accepted decisions and incident history.
Their older "current" and "next" instructions are superseded for resume routing
by the 2026-08-22 block above.

## Current Checkpoint — 2026-08-21 agency logos restored

Commit `07f582b` is on `main` and deployed by successful run `32475868471`.
Agency cards use `/api/company-logo` to restore real favicons without exposing
the browser to upstream 404s. Keep the fixed upstream, hostname validation,
three-second timeout, content limits, caching, and SVG initial fallback
together. Live desktop/mobile proof found zero broken images, overflow, or
console errors/warnings. Full evidence is in
`docs/directory-organization-restoration-2026-08-21.md`.

## Current Checkpoint — 2026-08-21 organized Agencies directory restored

Read `docs/directory-organization-restoration-2026-08-21.md`. Commit `df76adf`
is on `main` and deployed by successful run `32474522646`. The directory keeps
server pagination but is category-first again: six explained employer lanes,
Dayshift and Marketplace quick views, grouped result sections, and filter-aware
search/pagination. Do not flatten it back into a single alphabetical card grid.

The owner also wants Filipino-owned companies discoverable. Do not infer that
from names. Add a reviewed ownership field plus source evidence and backfill
before exposing an ownership filter.

## Current Checkpoint — 2026-08-21 10-minute freshness hardening

Read `docs/karpathy-freshness-mobile-gauntlet-2026-08-21.md` first. Commits
`123aed2`, `a631c2f`, and `a44972e` are deployed. The Worker runs every 10 minutes; free AI
capacity automatically enables inline pending recovery; every AI-deferred item
is written as hidden `pending-triage`; and degraded API counters can no longer
produce a false-success schedule. Gemini, Groq, and Cloudflare failure signatures
are preserved in `__ingest_diag__`. The Agencies navigation switches once at the
768 px breakpoint. Commit `07f582b` subsequently restored logos through the
same-origin resilient endpoint documented above.
Runs `32471235256`, `32471235312`, and `32472691564` passed. The first post-deploy
heartbeat was clean at `2026-08-21T10:20:39.440Z`, and the final deployed 700 px
browser check had zero overflow and zero console errors.

Do not restore the old `*/15` clock or make ATS fetch success synonymous with
candidate durability. Keep source-specific cadence guards and the fail-closed
response assessor together with the 10-minute Worker schedule.

## Current Checkpoint — 2026-08-20 Free-first AI triage cascade (Gemini→Groq→Cloudflare)

Full writeup: `docs/ai-fallback-cascade-2026-08-20.md`. Follows directly from the
Inngest-divert freeze checkpoint below — read that first for the freeze root
cause, this one picks up from "board recovers at the next neuron reset."

The owner asked whether OpenRouter/NVIDIA/other free AI providers could raise
the Workers-AI 10k-neuron/day ceiling (the project's chronic freshness
constraint — see `docs/incident-2026-08-20-inngest-divert-freeze.md` and
[[project_cf-freetier-limits]]). Researched current free-tier terms:
OpenRouter (50/day free, too small), NVIDIA NIM (free tier is dev/test-only,
production-prohibited — wrong fit for a public board), Gemini (~1-1.5k/day
Flash-Lite, owner already had a key), Groq (30 RPM / ~66 triages-worth of
tokens/day on 70B, very fast). Gemini and Groq were adopted; OpenRouter and
NVIDIA were not.

Shipped to `main`, deployed, tested (439 pass / typecheck 0 / guardrails 0 / build):
- `5b0ce9b` — initial Cloudflare-first + Gemini-fallback-on-exhaustion.
- `e36d303` — one-time recovery: published the 58 orphaned `pending-triage`
  rows the deterministic geo-gate had already verified eligible, without
  waiting on AI.
- `dfec65f` — `geminiConfigured` runtime probe + the redeploy that bound
  `GEMINI_API_KEY` (Cloudflare Pages binds env vars/secrets at DEPLOY time,
  not set time — a key added after the last deploy needs a fresh deploy).
- `c17f4e5` — the full cascade: reordered to **Gemini primary → Groq overflow
  → Cloudflare reserve** for both bulk triage (`triageJob`) and the critical
  skeptic vote (`skepticEligibilityCheck`, now on the more capable Gemini 2.5
  Flash / Groq 70B tier); added the Groq client
  (`groqGenerateContent`/`triageViaGroq`); triage concurrency 3→2 to smooth
  bursts against free-tier RPM limits; `AI_PRIMARY=cloudflare` inverts back to
  the original order if ever needed. 10 new tests.
- `cb88665` — `groqConfigured` probe + the redeploy that bound `GROQ_API_KEY`.

**Verified live in production** while Cloudflare's neurons were still spent
(`4006`) — so this could only be the free-provider cascade at work: the
board's newest visible job advanced from frozen-at-`2026-08-18T14:00Z` past
`2026-08-20T14:00Z`; `geminiConfigured:true`; both keys confirmed bound.
7 `pending-triage` rows remain as a static pre-fix leftover (not growing) —
low-priority; see the cascade doc's "current backlog state" for the option to
clear them now that free-provider capacity exists for it.

**Net effect: the board's freshness is no longer capped by the 10k-neuron/day
ceiling, at $0.** Owner decisions now open: (1) optionally set
`DRAIN_PENDING_TRIAGE=1` to clear the 7 static backlog rows; (2)
`INNGEST_SIGNING_KEY` remains inert/safe to delete; (3) Workers Paid is no
longer the only lever for daily throughput, though it would still remove the
Cloudflare-reserve ceiling entirely if ever wanted.

## Previous Checkpoint — 2026-08-20 Board-freeze incident (Inngest divert + neuron ceiling)

Full writeup: `docs/incident-2026-08-20-inngest-divert-freeze.md`.

The board froze at jobs scraped Aug-18 14:00Z (~30h, green heartbeat). Root
cause: `INNGEST_SIGNING_KEY` was still set on the Pages project while the Inngest
`triage-drain` cron was dead, so `triageViaInngest = Boolean(key)` parked every
new job as hidden `pending-triage` and never published it. Compounded by the
chronic Workers-AI 10k-neuron/day ceiling (error 4006) — the only AI consumers
are scrape's new-item triage + the unclear sweep, and the sweep (~200 neurons/row)
at 50/day drained the budget alone.

Shipped to `main`, deployed, tested (426 pass / typecheck 0 / guardrails 0 / build):
- `4c7c934` — durable triage now needs BOTH `INNGEST_SIGNING_KEY` and
  `TRIAGE_VIA_INNGEST="1"` (`shouldTriageViaInngest`); default is inline triage, so
  a stray key can't re-freeze the board.
- `3d6cd74`/`1d825f7`/`3c6a3cb` — `drainPendingTriageInline` (cheap-ladder,
  budget-bounded) to recover orphaned pending-triage rows, **OPT-IN OFF** via
  `DRAIN_PENDING_TRIAGE=1` (free-tier neurons too scarce).
- `a349bb6` — `DAILY_SWEEP_CAP` 50→15 (reserve neurons for fresh jobs) + watchdog
  board-freshness alert (>36h with no new visible job).

**Inngest cannot reduce the neuron cost** (same AI binding/quota) — do not re-adopt
it for that. Owner decisions: (1) board recovers at the next 00:00Z neuron reset —
confirm newest `is_active=1` advances; (2) to clear the 77 stuck rows and lift the
daily throughput ceiling, go Workers Paid then set `DRAIN_PENDING_TRIAGE=1`;
(3) `INNGEST_SIGNING_KEY` can be deleted from the Pages project (now inert).

## Current Checkpoint — 2026-08-18 Apex Debugging & Hardening Audit (complete)

Status: adversarial audit of the live Cloudflare/Astro/D1 system. Two real bugs
found, proven, fixed, tested, and committed on `main` (`d6114b2`, `6e07bcf`).
Full report + confidence scores: `docs/apex-audit-2026-08-18.md`.

The codebase is already heavily hardened (2026-06 → 2026-08 audit trail), so
finding density was intentionally low; the effort concentrated on the newest,
least-audited code (the 2026-08-16 Directory Growth Engine) and on the project's
cardinal failure mode — the Workers-Free 50-subrequest/invocation cap.

### What was fixed

| # | Sev | Fix | Commit |
| --- | --- | --- | --- |
| U1 | P1 | directory-enrich **budget starvation** — `ORDER BY id ASC LIMIT` re-selected the same un-enrichable low-id rows every run and starved every higher-id row (silent zero-progress success). Now `ORDER BY RANDOM()` + ATS-scoped hiring-page clause + `[1,100]` budget clamp, extracted as `buildEnrichmentTargetSql` with real `bun:sqlite` regression tests. | `d6114b2` |
| F2 | P2 | directory-audit **subrequest-cap breach** — `DEFAULT_BUDGET=60` link-check fetches per invocation vs the 50-subrequest Workers-Free cap (the workflow POSTs with no `?limit` override). Overflow fetches were caught as `unreachable` (never a strike → bounded, no corruption) but silently reported as checked. Lowered to 40 (D1 calls don't count toward the cap; rotation defers the rest), exported + regression-tested, stale workflow comment corrected. | `6e07bcf` |

### Verification

| Check | Result |
| --- | --- |
| `bun run test` | 408 pass, 0 fail, 1068 expectations, 49 files (was 407/48 at start) |
| `bun run typecheck` | exit 0 |
| `bun run build` | exit 0 |
| `bun run audit:guardrails` | exit 0 |

### Verified robust (audited, not changed)

scrape AI-budget threading (all AI paths), `auth.ts` (constant-time), `ingest.ts`
(column allow-list), directory seed/prospect (idempotent + guarded), directory
visibility/health predicates, all pulse workflows (concurrency + real-signal
validation), `public-query.ts` input hardening. See the report for the full list.

### Deferred (P3 / monitor — documented, low ROI vs regression risk)

- directory-audit per-row `db.update()` inside `Promise.all` is un-try/caught (one
  transient D1 write error 500s the run); F2 removed the main trigger.
- Optional hard fetch-guard for directory-audit (redirect-hop safety).
- Inngest `triage-drain` step-batching (monitor if it activates at volume).

Owner actions unchanged from prior checkpoints: confirm the Inngest drain; rotate
the leaked `tr_dev_` / Turso / ISR secrets.

## Current Checkpoint — 2026-08-16 Directory Growth Engine Hardening (complete)

Status: all P1 findings fixed, tested, and pushed to
`origin/codex/apex-flash-continuation` (commits `a17d00b` → `4372c9b`).
Full plan and ranked findings:
`docs/masterplan-2026-08-16-directory-engine-hardening.md`.

The prior session shipped the Directory Growth Engine (`41c0336`) — an
enrichment cron (`/api/cron/directory-enrich`), a curated seed import
(`/api/cron/directory-seed`), and `gha-enrichment-pulse.yml` (2x/day). It
built clean but had never been code-reviewed or tested.

This session ran the brainstorming + code-reviewer + debugging skills
against `41c0336` and found 6 P1 issues (no P0). All are now fixed.

### What was fixed (6 P1 + 3 P2)

| # | Fix | Commit |
| --- | --- | --- |
| P1-1 | Silent `hiringPageUrl` overwrite — deleted the redundant ATS block in the `needsWebsite` branch that gated on the local `updates` object instead of the DB value | `a17d00b` |
| P1-2 | Poison-row wedge hazard — wrapped the per-target loop in try/catch; one failing target no longer aborts the run; `result.errors` surfaced in the API response | `a17d00b` |
| P1-6 | LinkedIn/Indeed/Glassdoor/ZipRecruiter/SmartRecruiters not filtered — extended `knownAtsHosts` so a third-party job board is never written as a company website | `a17d00b` |
| P1-3 | Silent seed insert failures — `directory-seed` response now includes `failed`, `failedNames`, and `insertErrors` | `0926afd` |
| P1-5 | Curated name idempotency collisions — renamed `"Shepherd (formerly Support Shepherd)"` → `"Shepherd"` and `"Sitel (Foundever)"` → `"Foundever"` (former names already in notes) | `0dca892` |
| P1-4 | Zero tests — new `apps/web/tests/directory-enrich.test.ts` (15 tests) covering ATS URL builders, domain extraction blocklist, and `enrichDirectory` against a mock db (including the P1-1 and P1-2 regression cases) | `8a44a74` |
| P2-1 | No durable heartbeat — added `__enrich_diag__` reserved row pattern (run-diagnostics.ts) + Sentinel pulse query/alert step with a 36h stale threshold | `4372c9b` |
| P2-6 | `niche: entry.niche as any` — dropped the `as any`; the CuratedEntry type already constrains the enum | `4372c9b` |
| P2-7 | `updates: Record<string, any>` — typed as `Partial<typeof vaDirectory.$inferInsert>` so misspelled keys fail at compile time | `4372c9b` |

### Verification (final)

| Check | Result |
| --- | --- |
| `bun run test` | 399 pass, 0 fail, 1047 expectations, 48 files (was 379/976/47 at session start) |
| `bun run typecheck` | exit 0 (strict) |
| `bun run build` | exit 0 (server build ~29s) |
| `bun run audit:guardrails` | exit 0 |
| Branch | `codex/apex-flash-continuation`, pushed to origin (all 7 session commits) |

### Remaining work (not this session's scope)

- **Merge + deploy**: the branch is ready to merge to `main` via the
  migration-first release path. No D1 migration is required (the
  `__enrich_diag__` row reuses the existing `source_fetch_state` table).
  After deploy, watch the first Sentinel run: it should report
  "Enrichment healthy" (or "No __enrich_diag__ row yet" until the first
  enrichment pulse runs).
- **Confirm the Inngest drain** (owner action, unchanged from the
  2026-08-15/16 checkpoint): `pending_triage: 155` should drop, `active`
  should climb past `Aug 14`.
- **Rotate the leaked `tr_dev_` / Turso / ISR secrets** (owner action).
- P2 follow-ups noted in the masterplan: N+1 batching (P2-3), stuck-row
  backoff (P2-4), 4 curated entries missing `hiringPageUrl` (P2-5).

## Current Checkpoint — 2026-08-15/16 AI-Subrequest Freeze Fixed + Inngest Durable Triage LIVE

Status: implemented on `codex/apex-flash-continuation`, all commits **merged to
`main`** (`5986311`, `77101b5`). Typecheck 0, **379 tests pass**, build clean.
**Inngest is ACTIVATED in production** (2026-08-16): valid `INNGEST_SIGNING_KEY`
set on Pages, app registered with Inngest cloud, `triage-drain` cron live every
10 min. **Remaining acceptance: confirm the queue actually drains.** Baseline @
22:02Z: `pending_triage: 155`, `active: 1362`, freshest active `Aug 14`.
Consolidated session summary + repo state for any agent:
`docs/checkpoint-2026-08-16-documentation-backup.md`.

**The board was frozen at jobs posted 2026-08-07** for 8 days. Confirmed root
cause from live D1 (Sentinel workflow): the scrape route runs the whole pipeline
in ONE Cloudflare Pages Function request, and the Free plan caps subrequests at
**50 per invocation** (D1 + every `env.AI.run` count). Busy ticks blew past 50,
triage failed closed (`Too many subrequests` / `triageAiUnavailable=50`), and
nothing inserted — heartbeat green the whole time.

Two-layer fix:
1. **Emergency tourniquet (`21cbbeb`)** — `AI_SUBREQUEST_BUDGET_PER_RUN = 15`
   caps AI calls per invocation and defers overflow to the next tick. Deploying
   this alone unfreezes ingestion. Doc: `docs/incident-2026-08-15-ai-subrequest-freeze.md`.
2. **Structural fix — Inngest durable triage** (this checkpoint) — moves triage
   out of the scrape invocation and fans it out one-listing-per-step, each its
   own invocation/budget, under concurrency 5 + throttle 30/min (also respects
   the 10k-neuron/day quota, error `4006`). Doc:
   `docs/inngest-durable-triage-2026-08-15.md`.

**The Inngest signing key IS the feature flag.** With no `INNGEST_SIGNING_KEY`,
scrape triages inline exactly as before (with the budget guard). Set the key on
the Pages project → scrape persists new listings as hidden `pending-triage` rows
(is_active=0) and the `triage-drain` Inngest cron classifies them out-of-band.

### Next steps (owner)
1. **Confirm the drain** — after a few `triage-drain` cycles (every 10 min),
   re-query D1 and record that `pending_triage` is dropping, `active` is
   climbing, and the freshest active date passes `Aug 14`. Watch the Inngest
   dashboard for `triage-drain` runs returning `{ claimed, published, rejected,
   quarantined, deferred }`.
2. Confirm the board fills the Aug 8-15 gap. `4006` during backlog drain is
   expected and self-heals (rows stay pending and are reclaimed next pass).
3. Record the drain evidence in `docs/checkpoint-2026-08-16-documentation-backup.md`.

## Current Checkpoint — 2026-08-11 Alerting Regression + Sovereign Crawler 4A/4B

Status: implemented, tested, pushed on `codex/audit-worktree-bootstrap`.
Not merged, not deployed. Audit: `docs/major-audit-2026-08-11.md`.

### The finding that mattered

Ingestion alerting had been dead since 2026-07-31 and nothing reported it.
Removing the Hunter GHA schedule (finding P-5) correctly made the Cloudflare
cron Worker the primary clock, but it also orphaned Hunter's `alerts` job —
the only reader of per-run insert failures, triage failures, fetch-event
logging failures and cadence-guard state. Ingestion stayed healthy by luck,
so the eleven-day silence was invisible.

Fixed durably: run diagnostics now land on a reserved `__ingest_diag__` row in
`source_fetch_state`, and the daily Sentinel pulse alerts on both degradation
and a **stale heartbeat**. Alerting no longer depends on which clock ran the
scrape, and a stopped clock is detectable for the first time.

### Also in this checkpoint

- Daily source-health rollup restored, now derived from D1 instead of a Hunter
  artifact (it had frozen on 2026-07-31).
- **Phase 4A** — runtime robots.txt engine: RFC 9309 subset, Content Signals,
  D1 cache keyed by origin, migration 0030. Ships in **observe mode**; the
  flip-to-enforce checklist is at the `ROBOTS_MODE` constant in `scrape.ts`.
- **Phase 4B** — one declared crawler identity (`RemotePHJobsBot/1.0`) replacing
  five drifted UA strings; four ATS endpoints that sent no UA at all now declare
  one. Link-liveness checks deliberately keep a browser UA, and that is now a
  named decision rather than drift.
- Stale worktree holding `main` removed; polyfill removal committed.

327 tests pass, typecheck and build clean.

### Next safe work

1. Merge and deploy via the migration-first path so 0030 lands before the code
   that reads `robots_cache`.
2. Confirm the first post-deploy Sentinel run reports `Ingestion: healthy`.
3. Collect ~24h of `robotsWouldBlock` evidence, then flip `ROBOTS_MODE` to
   `enforce` in its own revertible commit.
4. Watch `failedSources` for Breezy and HTML sources after the UA change; per
   standing policy, a source that blocks a declared bot gets paused and asked,
   not disguised.
5. Then Phase 4C (acquisition ladder: sitemap + JSON-LD `JobPosting` feeding
   `applicantLocationRequirements` into the geo gate).

OWNER ACTION still open: rotate the leaked `tr_dev_` / Turso / ISR secrets.

## Previous Checkpoint — 2026-08-10 Production Hardening Audit

Status: merged, deployed, and independently verified.

The five-track production hardening audit was merged to `main` via PR #55
(commit `2497620`) and deployed to Cloudflare Pages (CI run on `8da74fb`).
All 29 D1 migrations including 0028/0029 are applied to production.

Independent verification (2026-08-10 Claude Opus) confirmed:
- All 16 ranked findings (3 P0, 9 P1, 3 P2) correctly implemented
- 234 tests passing, 0 failures, 448 expectations
- TypeScript strict-mode clean; Astro production build clean
- Security headers live on production (CSP, HSTS, X-Frame-Options, etc.)
- Job detail pages, JSON-LD, sitemap all functioning
- Unnecessary MessageChannel polyfill removed (Nemotron artifact)
- ADR-005 (Pages compatibility line) validated as sound

The five audited workstreams:
1. public runtime, security, and performance;
2. ingestion/data integrity;
3. scheduled automation and CI honesty;
4. supply chain and Cloudflare runtime configuration; and
5. legacy quarantine and operational recovery.

Full audit ledger: docs/major-production-audit-2026-08-10.md
Compatibility decision: docs/decisions/ADR-005-cloudflare-pages-compatibility-line.md

### Previous State

Date: 2026-07 (later)
Status: Freshness masterplan implemented selectively (checkpoint F-30,
`docs/freshness-masterplan-2026-07.md`). Conditional requests
(ETag/If-Modified-Since + body-hash diff) now skip parse+triage on unchanged
feeds (migration 0020, `sourcesUnchanged` reported, 7 tests). The real
freshness fix — GitHub cron lag — is addressed by a free-plan Cloudflare Cron
Trigger Worker (`workers/freshness-cron/`, every 15 min) deployed by
`gha-deploy-cron-worker.yml`; ONE manual step remains: `wrangler secret put
PROXY_SECRET` in that worker dir. A run-level lock dedupes overlapping
triggers and closes the audit's cadence TOCTOU. 120/120 tests. Rejected from
the plan: Cloudflare Queues (paid), 5-min polling (source terms), Zod/admin-UI.
Deferred & scoped: D1 FTS5 search (next headline feature), ATS conditional
fetch. OWNER ACTION: set the Worker's PROXY_SECRET to activate 15-min
freshness (GitHub Hunter is the fallback until then).

### Previous State

Date: 2026-07-14 (later)
Status: IMPLEMENTED the autonomous Prospector (checkpoint F-29) — the Hunter
upgrade that auto-discovers and adds new Filipino-hiring companies from
already-ingested eligible jobs, ending the manual spreadsheet-import loop.
`packages/scraper/prospector.ts` (two gates: name-quality + source-trust,
+16 tests), `apps/web/src/pages/api/cron/prospect.ts` (idempotent auto-add,
mass-add guard, fail-closed ATS), `.github/workflows/gha-prospector-pulse.yml`
(4x/day, git digest backup, human-gated ATS-enable proposals). 113/113 tests,
build green. Enabling scraping of a discovered ATS token stays a human code
edit (Phase 3). Details + remaining phases: `docs/company-hunter-strategy.md`.
Post-deploy: watch the first Prospector run add trusted companies (LawnStarter,
Airalo, Proxify, etc.) and file ats-proposal issues; confirm garbage/spam
excluded.

### Earlier same day

Status: (1) Fixed the "lost customer-service island" bug — the homepage
"Fresh opportunities by category" sourced a flat latest-60-overall pool, so
tech-heavy ingestion hid whole categories (customer-service: 177 jobs,
design: 98) that had zero rows in the latest 60. Root-cause fix: source the
preview PER CATEGORY via a window query, and pass true per-category totals so
each card's "See all N" is accurate. Files: apps/web/src/pages/index.astro,
apps/web/src/components/OpportunitySearch.tsx.
(2) NEW STRATEGY DOC FOR THE NEXT AI: `docs/company-hunter-strategy.md` — a
full plan to upgrade the Hunter to autonomously discover and auto-add new
companies that hire Filipino talent (the "Prospector"), removing the manual
spreadsheet-import loop. Key idea: mine the already-ingested, already-eligible
jobs for companies/ATS tokens not yet in va_directory; auto-add directory rows
(paused for scraping by default = fail-closed); keep scraping-enable
human/PR-gated per the compliance policy. Phased rollout, cadence design
(~48/day extraction, batched verification), schema + workflow changes, and
guardrails are all specified there. NOT YET BUILT — it is the recommended
next major workstream.

### Previous State

Date: 2026-07-12
Status: RemoteWork3.8 import + Ashby ATS expansion (checkpoint F-27,
`docs/remotework38-import-2026-07-12.md`). Added a NEW Ashby ATS adapter
(supabase/camunda/tremendous/amplify/ashby, all probed live) plus 2 Greenhouse
tokens (grafanalabs, nearform), and 14 new directory companies via idempotent
migration 0019 (CI applies it — local Wrangler OAuth was expired with error
7403, so delivery is migration-based). 97/97 tests, build passed. Post-deploy:
confirm deploy-migrations green for 0019 and the 7 new ATS tokens appear in the
next Hunter run's source_fetch_events. Prior work: comprehensive audit complete
(F-24 to F-26).

### Previous State

Date: 2026-07-11
Status: Comprehensive audit COMPLETE — all 8 dimensions swept across Parts
1-3 (checkpoint F-26, `docs/comprehensive-audit-report-2026-07.md`). Part 3
(perf, frontend, workflows, data-integrity, code-quality) done by static
analysis + live EXPLAIN plans. Fixed: schema.ts drift on the 0018 expression
index (drop-trap), and a Hunter/Verifier total-outage watermelon (now fail
on any non-2xx). Verified-clean: no rejected-row UI leak, category pages
index-served, pagination guarded, ISO timestamps everywhere. 91/91 tests,
build passed. STILL PENDING OWNER ACTION from Part 2: rotate the leaked
Turso / Trigger.dev / ISR secrets at their providers (git history purge is a
separate consented step). Remaining work is the roadmap in the report
(events retention, va_directory unique index, dead-code removal, scrape.ts
modularization) — no known correctness/security defects remain unaddressed.

### Previous State

Date: 2026-07-10
Status: Comprehensive audit Part 2 complete (checkpoint F-25,
`docs/comprehensive-audit-report-2026-07.md`). CRITICAL: leaked legacy
secrets in tracked build artifacts were untracked (`f85eed9`) — **OWNER MUST
ROTATE** the Turso, Trigger.dev, and ISR secrets at their providers (they
remain in git history until a consented purge). Also fixed: verify-links
D1-param wedge (chunked), /api/ingest mass-assignment (allow-list +
sanitize), ci-guardrail/deploy-migrations concurrency, bot push rebase-retry,
Sentinel branch re-entrancy, /api/click rate limit, atomic verify increment,
constant-time auth on prune/verify-links. 91/91 tests. Five audit dimensions
(performance, frontend, workflows-CI, data-integrity, code-quality) remain
queued — they errored on agent capacity, not findings.

### Previous State

Date: 2026-07-08
Status: Comprehensive audit Part 1 complete (checkpoint F-24,
`docs/comprehensive-audit-report-2026-07.md`). Fixed: triage fail-open
during AI outages (now fail-closed + counted), unvalidated LLM apply-URLs
(sanitized precedence), hostile-entity feed kills (guarded decode +
per-item isolation), infinite re-triage of rejected items (persisted as
inactive rows), production-confirmed temp-B-tree board sort (expression
index migration 0018), plus consistency/observability fixes (shared
contentHash/text/urls modules, funnel counters, unmatched-pause
reconciliation, new Hunter annotations). 91/91 tests. Remaining dimension
sweeps (W2-W8) stay queued in the masterplan. Post-deploy acceptance:
confirm production EXPLAIN plan uses `active_effective_posted_idx`, and
watch the next Hunter run for the new response fields.

### Previous State

Date: 2026-07-08
Status: Tier-3 autonomous auto-pause implemented (checkpoint F-23). Sentinel
now detects flapping sources and — when the `SENTINEL_BOT_PAT` secret exists —
appends them to `packages/scraper/paused-sources.json` on a branch, validates
with full guardrail parity in-runner, opens an evidence PR, squash-merges, and
the resulting CI deploy activates the pause. Mass-failure guard (>3 flapping =
infrastructure issue, zero pauses), one PR/day cap, append-only JSON, un-pause
human-only. Without the PAT it files recommendation issues as before. User
setup steps: `docs/maintenance-bot-2026-07-04.md`. Next planned work:
`docs/comprehensive-audit-masterplan-2026-07-07.md` (W0-W9).

### Previous State

Date: 2026-07-04
Status: Tier-1 maintenance bot implemented (`docs/maintenance-bot-2026-07-04.md`):
Hunter now files deduped alert issues on internal degradation, the daily
Sentinel pulse detects flapping sources from real fetch-event history and files
pause recommendations (never edits code), and the weekly Medic pulse commits an
automated data-quality digest to `docs/health-digest-latest.md`. All free
(public-repo Actions, read-only D1, built-in token). First scheduled runs:
alerts on next Hunter tick, Sentinel daily 01:30 UTC, Medic Sunday 02:00 UTC.

Earlier same day: Major audit complete (`docs/major-audit-2026-07-04.md`). Fixed the
silent fetch-event logging failure (D1 100-bound-parameter limit, broken since
2026-06-13), rewrote the hard-deleting prune endpoint to policy-compliant
soft-archive, surfaced triage failures / cadence-guard state / verification
backlog in cron responses and workflow annotations, and adopted five standing
durability rules. 70/70 tests pass. Post-deploy acceptance checklist is in the
audit doc: fetch events must accumulate past the single test row, prune must
report soft-archive mode with no row-count decrease, and the never-verified
backlog (456) must shrink.

Earlier same day: Gold777 directory import complete. 32 new va_directory
companies added (265 -> 297) and 4 confirmed Greenhouse/Breezy ATS tokens
wired for GitLab, Ghost, Remote.com, and Time Etc. See
`docs/gold777-directory-import-2026-07-04.md`.
Active branch: `main`

Previous state:

Date: 2026-06-13
Status: All 6 workstreams of the Gemini Masterplan completed successfully.
Overall accepted completion: 100% of Masterplan.

Latest stop-point handoffs:

- `docs/source-expansion-2026-06-13.md` (Commit: `70ff8cf`)
  - Purpose: records the completed Workstream 5 (Bounded Source Expansion), adding the `jobicy-supporting-apac` RSS feed with appropriate caps and cadence.
- `docs/query-indexing-audit-2026-06-13.md` (Commit: `80f2075`)
  - Purpose: records the completed Workstream 4 (Query and Indexing Audit), adding the `company_name_idx` index to `va_directory` to eliminate sorting overhead.
- `docs/stale-policy-report-2026-06-13.md` & `docs/data-quality-snapshot-2026-06-13.md` (Commit: `fe57510`)
  - Purpose: records the completed Workstream 3 (Data Quality & Stale Policy), archiving 12 stale/duplicate opportunities in D1.
- `docs/breezy-source-review-2026-06-13.md` (Commit: `020ba7d`)
  - Purpose: records the completed Workstream 2 (Breezy Source Review), auditing robots.txt and compliance notes.
- `docs/source-health-audit.md` (Commit: `2b91c68`)
  - Purpose: records the completed Workstream 1 (Source-Health History), logging scraper attempts to `source_fetch_events`.

Previous stop-point handoff:

- `docs/gemini-masterplan-handoff-2026-06-13.md`
  - Purpose: records the current verified baseline after Gemini's payload/test
    work and Codex's CI guardrail QA, then gives Gemini an ordered masterplan for
    source-health history, Breezy review, data-quality refresh, query/index
    audit, bounded source expansion, and portfolio polish.

Previous stop-point handoff:

- `docs/remote-ok-json-source-handoff-2026-06-13.md`
- Purpose: records the accepted Remote OK JSON ingestion slice, source evidence,
  direct-link compliance posture, quality filter, cleanup migration, workflow
  evidence, production D1 snapshot, and next safe work.
- Important state: Remote OK is enabled as a capped, cadence-guarded JSON
  source. Physical/logistics outliers from the first run were archived by D1
  migration `0015_remote_ok_quality_filter.sql`.

Previous implementation checkpoint:

- `docs/source-expansion-2026-06-12.md`
- Purpose: records the accepted bounded RSS source expansion, source fetch
  caps, durable cadence tracking, source-state D1 evidence, deployment recovery,
  Hunter evidence, and next safe source work.
- Important state: Real Work From Anywhere and Jobicy Admin Support APAC are now
  enabled as capped, cadence-guarded `allowed` RSS sources. Remote OK remains
  deferred until a JSON adapter exists.

Previous takeover note:

- `docs/goldilocks-source-expansion-handoff-2026-06-12.md`
- Purpose: captures the balanced source-compliance posture, source candidates,
  source evidence gathered so far, ingestion/cadence safeguards, performance
  indexing plan, and the next safe implementation sequence.
- Important state: this plan has now been partially executed. Jobicy and Real
  Work From Anywhere are enabled with caps and cadence. Remote OK still requires
  a JSON adapter before enabling.

Current Goldilocks policy wording:

- Current reviewed Breezy tokens remain enabled as `needs_review`.
- Notes now say these are public, robots-allowed, CORS-readable Breezy career
  endpoints where the project should collect minimal factual metadata, link
  back to ATS-hosted URLs, and pause on objection or clarified hostile terms.

Latest health audit and repair checkpoint:

- Gemini/Codex QA checkpoint:
  - `8d499df` - reduced homepage and directory DB projections and added 54
    Remote OK scraper tests.
  - `3036a53` - updated implementation/savepoint docs for F-09.
  - `e719a2c` - added `bun test` to CI guardrail.
- Verification:
  - `bun test packages/scraper/json.test.ts` passed.
  - `bun test` passed.
  - `bun run --cwd apps/web build` passed.
  - `git diff --check` passed.
  - CI guardrail `27461079903` passed.
  - Production deployment
    `2bbecd9c-1247-4805-b017-70574afa6e37` completed for `e719a2c`.
  - Production smoke returned 200 for `/`, `/directory`, `/opportunities`, and
    `/categories/tech`.
  - Read-only D1 snapshot remained healthy: 878 active opportunities, 38 active
    RemoteOK rows, 4 inactive RemoteOK cleanup rows, and 0 active RemoteOK
    physical/logistics outliers.

- Remote OK handoff: `docs/remote-ok-json-source-handoff-2026-06-13.md`
- Product commits:
  - `92ca443` - added Remote OK JSON source support.
  - `4c2374b` - tightened Remote OK physical/logistics filtering and added the
    cleanup migration.
- Generated rollup commit:
  - `562355e` - refreshed `docs/source-health-latest.md`.
- Verification:
  - `bun run --cwd apps/web build` passed.
  - `git diff --check` passed.
  - CI guardrail `27435140046` passed for `92ca443`.
  - Production deployment `b8b04c38-2b56-42e6-89df-2b980c6a6266` deployed
    `92ca443`.
  - Manual Hunter `27435248150` passed with Remote OK JSON count 33 in the
    first loop, 25 accepted/attempted inserts total, 0 failed sources, 0 failed
    insert batches, and 0 insert errors.
  - CI guardrail `27435636180` passed for `4c2374b`.
  - D1 migration workflow `27435636177` passed for
    `0015_remote_ok_quality_filter.sql`.
  - Source-health rollup `27450540244` passed with 8 accepted/attempted inserts,
    0 failed sources, 0 failed insert batches, and 0 insert errors.
  - Later scheduled Hunter `27457196402` passed on rollup commit `562355e`.
  - Read-only D1 snapshot: 878 active opportunities, 38 active RemoteOK rows, 4
    inactive RemoteOK cleanup rows, and 0 active RemoteOK physical/logistics
    outliers.

Previous health audit and repair checkpoint:

- Source expansion report: `docs/source-expansion-2026-06-12.md`
- Product commits:
  - `686e312` - added capped/cadence-guarded RSS sources and D1 source fetch
    state.
  - `b948828` - fixed paused-source skip reasons after discovering array-index
    leakage in disabled source reporting.
- Generated rollup commit:
  - `79e46f8` - refreshed `docs/source-health-latest.md`.
- Verification:
  - `bun run --cwd apps/web build` passed.
  - `git diff --check` passed.
  - CI/deploy run `27422527473` passed.
  - D1 migration workflow `27422527574` passed.
  - CI run `27422888691` passed for the skip-reason fix.
  - Manual Cloudflare Pages deployment `8863383f-2f01-4c64-8110-51b8e8d5f222`
    recovered production after an async Pages deployment failure for `b948828`.
  - Hunter run `27422685577` passed with 25 accepted/attempted inserts, 0
    failed source records, 0 failed insert batches, and 0 insert errors.
  - Hunter run `27423455086` passed with new hourly sources skipped by cadence
    and paused sources reporting readable skip reasons.
  - Rollup-writing Hunter run `27423574670` passed and updated
    `docs/source-health-latest.md`.
  - Production D1 reports 797 active opportunities and four healthy
    `source_fetch_state` rows.

Previous health audit and repair checkpoint:

- ATS follow-up report: `docs/ats-policy-follow-up-2026-06-12.md`
- Latest product commit:
  - `6304ea4` - requires token-specific review for Breezy ATS sources.
- Latest generated rollup commit:
  - `14db966` - refreshed `docs/source-health-latest.md`.
- Verification:
  - `bun run --cwd apps/web build` passed.
  - CI/deploy run `27372929451` passed.
  - Direct probes for current Breezy JSON endpoints returned 200.
  - Hunter run `27372988265` had one transient `20Four7VA` timeout; retry run
    `27373090226` passed with 0 failed sources, 0 failed insert batches, and
    0 insert errors.
  - Rollup-writing Hunter run `27373196600` passed.
  - Future unknown Breezy tokens now default to `paused`.

Previous health audit and repair checkpoint:

- ATS follow-up report: `docs/ats-policy-follow-up-2026-06-12.md`
- Product commit:
  - `aa670ee` - paused unreviewed/noisy ATS platforms by default.
- Generated rollup commit:
  - `f635f3f` - refreshed `docs/source-health-latest.md`.
- Verification:
  - `bun run --cwd apps/web build` passed.
  - CI/deploy run `27372355271` passed.
  - Manual Hunter run `27372436554` passed with 0 failed sources, 0 failed
    insert batches, and 0 insert errors.
  - Rollup-writing Hunter run `27372521005` passed.
  - Latest source-health rollup reports Workable ATS rows as `paused`.

Previous health audit and repair checkpoint:

- Follow-up report: `docs/wrangler-d1-audit-2026-06-12.md`
- Commit:
  - `ad03990` - upgraded active Wrangler tooling to v4 and refreshed the Bun
    lockfile for the current Astro workspace graph.
- Verification:
  - `bun install --frozen-lockfile` passed.
  - `bun run --cwd apps/web build` passed.
  - CI/deploy run `27371741236` passed.
  - Local Wrangler reports `4.100.0`.
  - Local read-only D1 audit works and reported 748 active opportunities.
  - Query plans use `active_posted_idx` and `category_active_posted_idx`.
  - Production routes smoked green and unauthenticated scrape POST returned 401.

Previous health audit and repair checkpoint:

- Audit report: `docs/major-audit-2026-06-11.md`
- Fix commits:
  - `e861071` - reduced scrape insert batch size after D1
    `too many SQL variables` failures.
  - `45e2f2d` - paginated category pages server-side and removed the large
    hydrated category payload.
  - `ae72998` - stopped tracking local `.wrangler` runtime state.
- Generated rollup commit:
  - `6e76c67` - refreshed `docs/source-health-latest.md`.
- Verification:
  - CI/deploy runs `27353756293`, `27353939869`, and `27354017177` passed.
  - Manual Hunter run `27354089629` passed with 35 accepted/attempted inserts,
    0 failed insert batches, 0 insert errors, and 0 failed sources.
  - Rollup-writing Hunter run `27354219672` passed with 0 failed sources and
    0 insert errors.
  - Production `/categories/tech` dropped from about 980 KB to about 94 KB.

The user resumed the original roadmap and approved continuing slice by slice.
P1 was implemented, pushed, passed CI, manually deployed, and smoked in
production. P2 indexes were implemented, pushed, migrated, and verified against
production query plans. P2 timestamp normalization was implemented, pushed,
deployed, and verified against production route smoke plus read-only D1 parsing
evidence. P3 Slice 1 added structured source results to the scrape route,
deployed it, and verified it through a manual Hunter workflow run. P3 Slice 2
made `inserted` reflect actual D1 changes and exposed failed insert batches and
insert errors in the scrape response. P3 Slice 3 added Hunter workflow warnings
and summary metrics for partial source failures, zero-count sources, and insert
accounting. P4 Slice 1 added conservative source compliance metadata and updated
the public data policy language. P4 Slice 2 reviewed RSS/HTML source evidence,
paused risky or unproductive sources, and kept paused sources visible as skipped
records in live scrape results. P4 Slice 3 de-duplicated ATS source fetches,
paused Workable-backed ATS rows after repeated HTTP 429s, and verified the live
Hunter workflow with no failed sources. P5 Slice 1 captured a read-only
production data-quality snapshot and made no production row mutations. P5 Slice
2 defined a no-mutation stale/source dry-run policy and found no immediate
archive action. P5 Slice 3 backfilled `application_url` from `source_url`,
updated future ingest/scrape writes to populate it, deployed the write path, and
proved the next Hunter insertion kept `application_url` populated. P6 Slice 1
removed Hunter's per-run alert commit/push path and now stores per-run
`harvest.log` plus `source-health-summary.md` artifacts. P6 Slice 2 added a
guarded daily/manual repo-readable rollup at `docs/source-health-latest.md`.
P7 completed the final acceptance audit and updated the README to match the
current production architecture and public-source policy.

## What Was Completed

- Major audit was documented in `docs/major-audit-2026-06-06.md`.
- Recovery-driven methodology was adopted.
- Active architecture was corrected in `AGENTS.md`.
- Roadmap, status, recovery trail, savepoint, and ADR were added.
- P0 is accepted at 5%.
- P1 is accepted at 20% overall.
- P2 is accepted at 35% overall.
- P3 Slice 1 is accepted at 40% overall.
- P3 Slice 2 is accepted at 45% overall.
- P3 is accepted at 55% overall.
- P4 Slice 1 is accepted at 60% overall.
- P4 Slice 2 is accepted at 65% overall.
- P4 is accepted at 70% overall.
- P5 Slice 1 is accepted at 75% overall.
- P5 Slice 2 is accepted at 80% overall.
- P5 Slice 3 is accepted at 85% overall.
- P6 Slice 1 is accepted at 90% overall.
- P6 Slice 2 is accepted at 95% overall.
- P7 is accepted at 100% overall.

Accepted P0 evidence:

- Commit: `9657c4a`
- CI run: `27040684807`
- Acceptance docs commit: `a6fcf70`
- CI run: `27040764996`

Accepted pause handoff evidence:

- Commit: `431ab60`
- CI run: `27041163556`
- Scope: docs-only recovery trail; no implementation files changed.

## What Was Completed In P1

- Added `apps/web/src/pages/opportunities.astro`.
- Reused existing opportunity cards and visual styling.
- Added server-side search/filtering and pagination to `/opportunities`.
- Changed homepage query limit from 500 to 60.
- Made the homepage a preview rather than the full search surface.
- Moved the global "Find a Job Now" CTA to `/opportunities`.
- Build passed with `npm.cmd run build --workspace apps/web`.
- Local route smoke passed for `/`, `/opportunities`, paginated/filter URLs,
  and `/directory`.
- Pushed commit `2475103`.
- GitHub Actions run `27141658140` passed.
- Deployed with Wrangler to `https://68b1259d.remotejobs-ph.pages.dev`.
- Public alias `https://remotejobs-ph.pages.dev/opportunities` returned 200.

## P1 Exploration Notes

Files read during P1 exploration:

- `apps/web/src/pages/index.astro`
- `apps/web/src/components/OpportunitySearch.tsx`
- `apps/web/src/pages/categories/[category].astro`
- `apps/web/src/components/CategoryOpportunitySearch.tsx`
- `apps/web/src/components/opportunity-card.tsx`
- `apps/web/src/lib/categories.ts`
- `apps/web/src/layouts/Layout.astro`
- `apps/web/src/components/nav.tsx`
- `apps/web/src/components/footer.tsx`
- `apps/web/astro.config.mjs`
- `packages/db/schema.ts`

Observed P1 facts:

- Homepage currently selects up to 500 active opportunities and hydrates them
  into `OpportunitySearch`.
- `/opportunities` is linked in navigation but has no active Astro page.
- Category pages already have a search/list pattern that can be reused.
- The simplest next slice is to add an Astro `/opportunities` page and reduce
  homepage data volume to a smaller latest-jobs preview.

## Next Safe Resume Task

No required recovery-roadmap work remains. The user explicitly asked for a
Gemini-ready masterplan and handoff. Start from
`docs/gemini-masterplan-handoff-2026-06-13.md`.

Recommended next slice:

1. Run `git status --short --branch`.
2. Read `docs/gemini-masterplan-handoff-2026-06-13.md`.
3. Prefer Workstream 1: compact source-health history, unless fresh CI/source
   evidence shows a more urgent issue.
4. Continue source-specific Breezy review and decide whether each current token
   remains `needs_review`, becomes `allowed`, or is paused.
5. Re-run query/index audits before adding indexes or enabling more sources.
6. Add at most one new source per slice, only after source-health evidence is
   green and the source has documented caps, cadence, and linkback posture.

Known follow-up: local direct D1 audits now work with Wrangler v4. Use
`bunx wrangler d1 info remoteph-jobs-db` for remote metadata and
`bunx wrangler d1 execute remoteph-jobs-db --remote --command "..."` for
read-only SQL probes. Continue ATS/source policy review for current Breezy
sources that remain `needs_review`; unknown future Breezy tokens now pause by
default.

P7 evidence:

- Final audit report: `docs/final-acceptance-audit-2026-06-09.md`
- Build: `npm.cmd run build --workspace apps/web` passed.
- Production smoke:
  - `/`, `/opportunities`, `/directory`, `/data-policy`, `/privacy`, and
    `/categories/tech` returned 200;
  - unauthenticated POST to `/api/cron/scrape` returned 401.
- D1 snapshot:
  - 688 active opportunities;
  - 0 missing `application_url`;
  - 0 unparseable freshness dates.
- Query plans:
  - homepage query uses `active_posted_idx`;
  - category query uses `category_active_posted_idx`.
- Source health:
  - `docs/source-health-latest.md` reports 0 failed sources for run
    `27204417574`.
- README:
  - replaced stale Next/old-source/pnpm language with current Bun,
    Astro/Cloudflare/D1, public-source indexing, and recovery-doc language.

P6 Slice 2 evidence:

- Workflow commit: `0ba92d2`
- CI run: `27204381138`
- Manual Hunter run: `27204417574` with `write_rollup=true`
- Hunter result: success.
- Artifact:
  - name: `hunter-health-27204417574`;
  - ID: `7506838648`.
- Generated rollup commit:
  - `d4b33a7` - `docs: update daily source health`;
  - created `docs/source-health-latest.md`.
- Live response:
  - HTTP 200;
  - `failedSources: []`;
  - `inserted: 0`;
  - `actualChanges: 0`;
  - `acceptedForInsert: 0`;
  - `attemptedInsert: 0`;
  - `insertFailedBatches: 0`;
  - `insertErrors: []`.
- Repo-readable rollup:
  - date: 2026-06-09;
  - run: `https://github.com/cyalcala/va-freelance-hub/actions/runs/27204417574`;
  - 0 failed sources;
  - 1 zero-count successful source;
  - 18 skipped sources.

P6 Slice 1 evidence:

- Commit: `f8fadfb`
- CI run: `27204009191`
- Manual Hunter run: `27204051068`
- Hunter result: success.
- Artifact:
  - name: `hunter-health-27204051068`;
  - ID: `7506687492`;
  - files: `harvest.log` and `source-health-summary.md`.
- Verification:
  - `git diff --check` passed with only normal CRLF warnings;
  - `rg` confirmed Hunter no longer contains `contents: write`, `git commit`,
    `git push`, or `scraper-alerts` references;
  - downloaded artifact summary reported 0 failed sources, 1 zero-count
    successful source, and 18 skipped sources;
  - after fetching `origin/main`, branch status was `## main...origin/main`,
    confirming no bot alert commit was created.
- Live response:
  - HTTP 200;
  - `failedSources: []`;
  - `inserted: 0`;
  - `actualChanges: 0`;
  - `acceptedForInsert: 0`;
  - `attemptedInsert: 0`;
  - `insertFailedBatches: 0`;
  - `insertErrors: []`.

P5 Slice 3 evidence:

- Commit: `2754740`
- CI run: `27203416725`
- Migration workflow: `27203416643`
- Build: `npm.cmd run build --workspace apps/web` passed.
- Deploy: `https://936f10a7.remotejobs-ph.pages.dev`
- Manual Hunter run: `27203556963`
- Hunter result: success.
- D1 evidence:
  - after migration: 687 active rows and 0 missing `application_url`;
  - after Hunter: 688 active rows and 0 missing `application_url`;
  - newest Hunter row `2138` preserved a distinct application URL from triage.
- Live response:
  - HTTP 200;
  - `failedSources: []`;
  - `inserted: 1`;
  - `actualChanges: 1`;
  - `acceptedForInsert: 1`;
  - `attemptedInsert: 1`;
  - `insertFailedBatches: 0`;
  - `insertErrors: []`.
- Public smoke:
  - `/`, `/opportunities`, and `/directory` returned 200;
  - `/api/cron/scrape` returned 401 without credentials;
  - `/api/click/2135` with the validated source URL returned 302.

P2 Slice 1 evidence:

- Commit: `be3d646`
- Migration workflow: `27155847940`
- CI run: `27155847992`
- Before: hot queries used temp B-trees.
- After: hot queries use `active_posted_idx`,
  `category_active_posted_idx`, and `active_last_verified_idx`.

P2 Slice 2 evidence:

- Commit: `e32e580`
- CI run: `27165936753`
- Build: `npm.cmd run build --workspace apps/web` passed.
- Deploy: `https://4bb0cf93.remotejobs-ph.pages.dev`
- Public smoke: `/`, `/opportunities`, `/opportunities?page=2`, and
  `/directory` returned 200.
- Protected API smoke: `/api/cron/scrape`, `/api/cron/verify-links`,
  `/api/ingest`, and `/api/ingest-digest` returned 401 without credentials.
- D1 read-only evidence: 672 active opportunities and 0 unparseable active
  values for `scraped_at`, `last_seen_in_feed_at`, and `last_verified_at` when
  parsed through SQLite `unixepoch`.
- ADR: `docs/decisions/ADR-002-canonical-utc-iso-timestamps.md`

P3 Slice 1 evidence:

- Commit: `27794d8`
- CI run: `27166648567`
- Build: `npm.cmd run build --workspace apps/web` passed.
- Deploy: `https://44501583.remotejobs-ph.pages.dev`
- Manual Hunter run: `27166770708`
- Hunter result: success.
- Live response:
  - HTTP 200;
  - inserted 11 jobs;
  - `actualChanges: 11`;
  - `backlogRemaining: 0`;
  - included `sourceResults` for RSS, HTML, and ATS sources;
  - preserved `failedSources`;
  - Remote.co was visible as `ok: false` with HTTP 520;
  - zero-count sources were visible as `ok: true`.
- Workflow follow-up: bot committed `ca1f06d` to
  `docs/scraper-alerts.md` for the Remote.co failure.
- D1 read-only evidence: active opportunities count was 683 after the manual
  Hunter run.

P3 Slice 2 evidence:

- Commit: `e86b854`
- CI run: `27167396371`
- Build: `npm.cmd run build --workspace apps/web` passed.
- Deploy: `https://cde106a3.remotejobs-ph.pages.dev`
- Manual Hunter run: `27198077806`
- Hunter result: success.
- Live response:
  - HTTP 200;
  - `inserted: 1`;
  - `actualChanges: 1`;
  - `acceptedForInsert: 1`;
  - `attemptedInsert: 1`;
  - `insertFailedBatches: 0`;
  - `insertErrors: []`;
  - Remote.co remained visible as a partial source failure.
- Workflow follow-up: bot committed `bc255c8` to
  `docs/scraper-alerts.md` for the Remote.co failure.
- D1 read-only evidence: active opportunities count was 686 after later
  scheduled/manual ingestion.

P3 Slice 3 evidence:

- Commit: `e0a32fb`
- CI run: `27198767290`
- Manual Hunter run: `27198807621`
- Hunter result: success.
- Annotation evidence: warning emitted with
  `1 source(s) failed. See sourceResults in harvest.log.`
- Live response:
  - HTTP 200;
  - `inserted: 1`;
  - `actualChanges: 1`;
  - `acceptedForInsert: 1`;
  - `attemptedInsert: 1`;
  - `insertFailedBatches: 0`;
  - `insertErrors: []`.
- Summary evidence: workflow wrote failed-source, zero-count source, failed
  insert batch, and insert error metrics to the GitHub step summary.
- Workflow follow-up: bot committed `baf2bd8` to
  `docs/scraper-alerts.md` for the Remote.co failure.
- D1 read-only evidence: active opportunities count was 687 after the latest
  manual Hunter run.

P4 Slice 1 evidence:

- Commit: `fa2d6eb`
- CI run: `27199810692`
- Build: `npm.cmd run build --workspace apps/web` passed.
- Deploy: `https://1896b637.remotejobs-ph.pages.dev`
- Manual Hunter run: `27199890298`
- Hunter result: success.
- Live response:
  - included `collectionMethod` and `complianceStatus` for RSS, HTML, and ATS
    source results;
  - all configured sources and ATS results are conservatively `needs_review`;
  - Remote.co remained visible as a partial source failure.
- Public smoke:
  - `/data-policy` returned 200;
  - page included the June 2026 update and public-visibility caution text;
  - `/api/cron/scrape` returned 401 without credentials.
- Workflow follow-up: bot committed `3174068` to
  `docs/scraper-alerts.md` for the Remote.co failure.
- D1 read-only evidence: active opportunities count was 687 after the latest
  manual Hunter run.

P4 Slice 2 evidence:

- Commit: `1143798`
- CI run: `27200812470`
- Build: `npm.cmd run build --workspace apps/web` passed.
- Deploy: `https://1a74a454.remotejobs-ph.pages.dev`
- Manual Hunter run: `27200899849`
- Hunter result: success.
- Source review doc: `docs/source-review-2026-06-09.md`
- Source decisions:
  - We Work Remotely and Remotive remain enabled as `allowed` RSS sources with
    attribution/linkback notes;
  - ProBlogger, Remote.co, Authentic Jobs, Dribbble Jobs, OnlineJobs.ph, and
    Jobspresso are paused.
- Live response:
  - HTTP 200;
  - `failedSources: []`;
  - We Work Remotely returned 100 RSS items;
  - Remotive returned 29 RSS items;
  - six paused sources returned `skipped: true` with pause reasons;
  - `inserted: 0`;
  - `actualChanges: 0`;
  - `insertFailedBatches: 0`;
  - `insertErrors: []`.
- Public smoke:
  - `/`, `/opportunities`, `/directory`, and `/data-policy` returned 200;
  - `/api/cron/scrape` returned 401 without credentials.
- D1 read-only evidence: active opportunities count was 687 after the latest
  manual Hunter run, with 0 row changes.

P4 Slice 3 evidence:

- Final commit: `95e6665`
- Supporting commits:
  - `e3714d8` - de-duplicated duplicate ATS token fetches.
  - `3256127` - throttled ATS polling after first Workable 429 proof.
- CI run: `27202145473`
- Build: `npm.cmd run build --workspace apps/web` passed.
- Deploy: `https://6b3bc9b2.remotejobs-ph.pages.dev`
- Manual Hunter run: `27202221523`
- Hunter result: success with no partial-failure annotation.
- ATS source review doc: `docs/ats-source-review-2026-06-09.md`
- Live response:
  - HTTP 200;
  - `failedSources: []`;
  - Breezy ATS fetched `20Four7VA` with 61 items, `Sourcefit` with 67 items,
    and `VAA Philippines` with 0 items;
  - 11 Workable-backed directory rows returned `skipped: true` with
    `complianceStatus: "paused"`;
  - `24/7 Virtual Assistant` returned `skipped: true` because the
    `breezy:20four7va` token was already fetched for `20Four7VA`;
  - `inserted: 0`;
  - `actualChanges: 0`;
  - `insertFailedBatches: 0`;
  - `insertErrors: []`.
- Public smoke:
  - `/`, `/opportunities`, and `/directory` returned 200;
  - `/api/cron/scrape` returned 401 without credentials.
- D1 read-only evidence: active opportunities count was 687 after the latest
  manual Hunter run, with 0 row changes.

P5 Slice 1 evidence:

- Snapshot doc: `docs/data-quality-snapshot-2026-06-09.md`
- D1 query mode: read-only; all sampled queries returned `changed_db: false`.
- Active opportunities: 687.
- Duplicate `source_url`, `content_hash`, and non-empty `description_hash`
  groups: 0 each.
- Missing fields:
  - `company`: 95;
  - `pay_range`: 524;
  - `client_timezone`: 687;
  - `application_url`: 687;
  - `experience_level`: 522;
  - `posted_at`: 62;
  - `description_hash`: 507;
  - `last_seen_in_feed_at`: 124.
- Freshness:
  - `posted_at` unparseable: 0;
  - posted older than 30 days: 247;
  - posted older than 60 days: 111;
  - posted older than 90 days: 81;
  - last seen in feed older than 30 days: 0.
- Category distribution:
  - `other`: 531;
  - `tech`: 86;
  - `admin`: 31;
  - `customer-service`: 20;
  - `design`: 18;
  - `marketing`: 1.
- Source policy split:
  - currently enabled source rows: 497;
  - now-paused source rows: 185;
  - unclassified source rows: 5 (`RemoteOK`).

P5 Slice 2 evidence:

- Dry-run report: `docs/stale-policy-dry-run-2026-06-09.md`
- D1 query mode: read-only; all sampled queries returned `changed_db: false`.
- Dry-run actions:
  - `keep_enabled_source`: 497 rows;
  - `hold_paused_recently_seen`: 175 rows;
  - `review_paused_missing_last_seen`: 10 rows;
  - `classify_source_before_action`: 5 rows.
- Candidate buckets:
  - paused-source rows missing `last_seen_in_feed_at`: 10;
  - unclassified `RemoteOK` rows: 5.
- Decision: no immediate production archival; hold recently seen paused-source
  rows through a grace window and classify `RemoteOK` first.

P5 Slice 3 suggested scope:

- Implement one reversible data-quality improvement.
- Good low-risk candidates:
  - derive `application_url` from `source_url` with before/after counts; or
  - add a repeatable stale-candidate script/endpoint; or
  - improve category triage for the highest-volume `other` source path.
- Do not archive production rows until the pause grace-window policy is
  reviewed.

## Stop Rule

If the user says stop, pause, or backup, stop implementation and only update
handoff/status docs plus GitHub backup evidence.
