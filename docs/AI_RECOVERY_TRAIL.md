# AI Recovery Trail

## 2026-09-24 — COMPLETED: JEV-SHADOW-VERDICT — deployed & first production observation (current)

Continued the prior session's in-flight JEV-SHADOW-VERDICT work (preserved as
dirty tree on start SHA `0cd785b`), verified it, shipped it, and collected the
first production decision record:

- **Start SHA**: `0cd785b` (clean tree + prior session's dirty JEV work:
  jev-client/shadow-verdict modules, route adjudication, assessor verdict
  path, workflow echo, live eval — all uncommitted).
- **Behavior commit**: `f3ed459` (local) → rebased onto `origin/main` as
  **`7ff7172`**; pushed. Sovereign CI Guardrail run `36053213665` success
  (validate + Pages deploy); Worker deploy `36053213677` success.
- **Verification**: `bun test` 1,393 pass / 0 fail across 138 files (+46);
  typecheck 0; `audit:guardrails` 0; build clean. Live Jev eval exit 0
  (Tier 1 deterministic; Tier 2 `ACCEPT_NOTES` @ 0.77,
  `sv-ed7d5d8c287c-mufys40p`) using the authorized credential injected via
  environment only — never printed or stored.
- **Production observation #1**: manual EX-03 dispatch run `36053508847`
  (headSha `7ff7172`): 12/12 dispatched; myjewellery chronic 24-byte
  oversize classified Tier 1 `known_limit_over_budget` deterministically
  (no model call); 5× `workable:*` `RATE_LIMITED` in the same window went
  to Tier 2; **live Jev consulted once** (`typesafe/jev-1.13-20260917`,
  correlation `sv-54b9887998ca-mufz1cfm`) → `ABSTAIN` @ 0.35 < 0.5
  threshold → enforced verdict `failed` conservatively; the assessor
  failed the run exactly as designed. Zero authority/publication change.
- **Jev maturity**: shadow/advisory at one runtime boundary (run verdict
  only). OPENROUTER_API_KEY bound as a Pages secret (production). Kill
  switch `JEV_ADJUDICATION_DISABLED=1`; missing key → conservative fail.
- **Remaining known issue (unchanged)**: the EX-03 503 storage mode needs a
  future 503 window to surface its `errorClass`; myjewellery shadow-budget
  review remains an owner policy decision.

## 2026-09-24 — COMPLETED: EX-CANARY-INGESTION — Graduation Executed, Canary Fetch Path Enabled, Publication Clamp (historical)

Completed unit `EX-CANARY-INGESTION` (Run 80) and verified the end-to-end
publication of the newly graduated sources on https://remotejobs-ph.pages.dev:

- **Base Commit**: `b41b590` (docs: update enrichment digest; `d1168b7` had
  already added the active-only registry merge, migration 0045, and the
  one-shot graduation ingestion runner)
- **Behavior Commit**: `c637146` (`feat(governance): enable canary fetch and
  clamp canary publication to its per-tick cap (EX-CANARY-INGESTION)`) —
  Sovereign CI Guardrail run `35990129865` (100% green).
- **Root Cause of "new sources not appearing" (Sep 19–24)**: the 5 Breezy
  PH-VA agencies were promoted shadow→canary on 2026-09-19, but the production
  scrape loop never fetched canary rows — `isEnabledForFetch` (policy-resolver)
  returned true only for `operational === "active"` and the registry merge
  filter (scrape.ts) merged `active` rows only. The planned EX-CANARY-INGESTION
  unit was never executed, so the canary period produced zero publications.
  The owner's canary→active graduation (2026-09-24T01:59Z, transition events
  27–31) bypassed the gap; jobs flowed within one minute (first fetch
  02:00:20Z, count=102).
- **Jev Decisions (typesafe/jev-1.13-20260917, key from Desktop jev777.txt)**:
  - implement_now: noul 0.91 → implement and deploy now.
  - architecture: Branch A (caller clamp in publish-opportunities.ts; gateway
    fail-closed rollback unchanged) — choice confidence 1.0.
  - safety: noul 0.94 → behavior-neutral for current production.
- **Implemented (Branch A)**:
  1. `isEnabledForFetch` (packages/scraper/policy-resolver.ts): canary rows
     enabled for fetch when publishable (allowed/conditional, not opted out);
     shadow/candidate remain unfetched.
  2. `mergeRegistryAtsSources` (apps/web/src/pages/api/cron/scrape.ts): inline
     registry merge extracted into an exported, unit-tested pure function;
     merges both `active` and `canary` registry rows so a promoted canary not
     cataloged in va_directory is still ingested.
  3. `canaryClampedProposal` (apps/web/src/lib/publish-opportunities.ts):
     clamps proposed batches to `canaryMaxNewItemsPerTick` via
     `loadPublicationPolicy` in BOTH `publishGroupedInserts` and
     `publishGroupedActivations` so the gateway's automatic
     rollback-to-shadow never fires; unreadable policy/invalid cap proposes
     zero (missed tick, dedup-retried) — never an unclamped proposal.
- **Production Verification (2026-09-24 ~11:00–12:15Z)**: all 5 graduated
  sources fetched hourly; ~270 active jobs in D1 (20four7va 126, sourcefit 110,
  remote-craft 14, yokly 11, value-virtual-assistants 9); live board page 1
  renders 20Four7VA/Sourcefit/Yokly jobs; Remote Craft filtered view renders 14
  PH-exclusive jobs; `/jobs/7167` renders attribution, PH-exclusive badge,
  category, and canonical VALUE Virtual Assistants apply linkback. Exact-six
  all fetching hourly (12:11Z) — zero regression. Registry truth: 5 active /
  15 shadow / 14 candidate / 1 quarantined (teamtailor `health_quarantine`
  2026-09-24T02:02Z). No canary rows in D1 — the ghost/nearform/time-etc
  canary promotion claimed elsewhere did not land (no transition events).
- **Verification**: 1,347 tests pass across 136 files (11 new: canary merge x6,
  insert clamp x3, activation clamp x1, fetch refusals x1); typecheck 0;
  guardrails 0; build clean.
- **Remaining Known Issue**: EX-03 Shadow Dispatch CI failing 7 of last 8 runs
  since 2026-09-23 — two modes: HTTP 503 evidence/storage-unavailable catch-all
  (`shadow-dispatch.ts:93`) and HTTP 200 + 1 `DEGRADED_ANOMALOUS` rejected by
  `assessShadowResponse`. Needs Pages-function-log diagnosis before any change.

## 2026-09-19 — COMPLETED: Canary Promotion of 5 Philippine VA Agencies & Trigger Alignment (historical — the 5 sources are now `active` per events 27–31)

Completed unit `EX-CANARY-PROMOTION`: aligned migration triggers, hardened admission evidence packet projection, deployed authenticated promotion endpoint, and graduated 5 Breezy Philippine VA agencies to live `canary` operational state:
- **Base Commit**: `4f458b8` (`feat(governance): verify canary readiness predicate and harden workable probe pacing (EX-CANARY-READINESS)`)
- **Behavior Commits**:
  - `543f5d5` (`feat(governance): align canary promotion triggers and implement promotion gateway (EX-CANARY-PROMOTION)`) — GitHub Actions run `35412951998` (100% green).
  - `2806799` (`fix(governance): allow early admission evidence with null canary cap to match backfilled registry cap (EX-CANARY-PROMOTION)`) — GitHub Actions run `35413370337` (100% green).
- **Migration 0043 Applied to Production D1 (`packages/db/migrations/0043_canary_promotion_trigger_alignment.sql`)**:
  - Gated raw observation count check in `source_transition_events_validate_insert` with `NEW.transition_plane_version = 'sp23-v1'`, allowing `sp23-v2` transitions to be guarded by `source_transition_events_current_admission_guard` without contradiction.
  - Safely backfilled `canary_max_new_items_per_tick = 2` across all shadow sources where it was `NULL`.
  - Hardened `source_registry_governance_revision_bump` trigger with column value-change checks (`OLD.col IS NOT NEW.col`), preventing operational state transitions from erroneously bumping `governance_revision` from 1 to 2.
- **Hardened Admission Evidence Packet Projection (`packages/scraper/admission-evidence.ts`)**:
  - Resolved `validateAdmissionPacket` rejection where early admission packets recorded `packet.source.canaryMaxNewItemsPerTick: null`: allowed matching against positive backfilled registry caps while strictly maintaining cryptographic integrity across all governance fields.
  - Unit tests added in `packages/scraper/admission-evidence.test.ts` (22/22 pass).
- **Promotion Endpoint Implemented & Deployed (`apps/web/src/pages/api/cron/source-promote.ts`)**:
  - Authenticated route enforcing `isAuthorized(request, env.PROXY_SECRET || env.CRON_SECRET)`.
  - Restricted to `SOURCE_PROMOTE_ALLOWLIST` and executing typed transitions via `applyTypedTransition`.
  - Tests in `apps/web/tests/source-promote-route.test.ts` (11 pass) and `packages/scraper/transition-gateway.integration.test.ts` (2 pass).
- **Live Production Graduation of 5 Breezy Philippine VA Agencies**:
  - Executed `/api/cron/source-promote` against live production (`https://remotejobs-ph.pages.dev/api/cron/source-promote`):
    1. `breezy:20four7va`: HTTP 200 `{ "outcome": "canary", "published": 0 }` (Event ID 22)
    2. `breezy:sourcefit`: HTTP 200 `{ "outcome": "canary", "published": 0 }` (Event ID 23)
    3. `breezy:remote-craft`: HTTP 200 `{ "outcome": "canary", "published": 0 }` (Event ID 24)
    4. `breezy:value-virtual-assistants`: HTTP 200 `{ "outcome": "canary", "published": 0 }` (Event ID 25)
    5. `breezy:yokly`: HTTP 200 `{ "outcome": "canary", "published": 0 }` (Event ID 26)
  - Direct D1 verification confirms all 5 sources in `operational_state = 'canary'`, `governance_revision = 1`, `canary_max_new_items_per_tick = 2`, `last_decision = 'sp23:requested_promotion'`.
- **Verification**: 1,329 tests pass across 132 files (`bun test`); TypeScript typecheck clean; production CI guardrails clean.

## 2026-09-19 — COMPLETED: Canary Readiness Audit & Workable Probe Pacing Hardening (historical)

Completed formal qualification audit of the mature shadow cohort under the Autonomy Cutover Predicate and deployed surgical rate-limiting hardening for Workable:
- **Base Commit**: `b33b51d` (`fix(cron): release run lock on completion and crash to eliminate failover contention`)
- **Autonomy Cutover Predicate Audit Completed (`docs/audits/EX_CANARY_READINESS_AUDIT.md`)**:
  - Direct measurement of production Cloudflare D1 confirms 9 mature shadow sources have achieved 100% clean, defect-free track records over >= 9 distinct days and > 7 calendar days of span (`604,800,000 ms`):
    - Philippine VA Agencies (Breezy): `20four7va` (67 obs, 9d, 7.39d span), `sourcefit` (63 obs, 9d, 7.39d span), `remote-craft` (61 obs, 9d, 7.33d span), `value-virtual-assistants` (61 obs, 9d, 7.33d span), `yokly` (62 obs, 9d, 7.33d span).
    - Global ATS Feeds: `teamtailor:career.teamtailor.com` (124 obs, 13d, 12.43d span), `recruitee:myjewellery` (122 obs, 13d, 12.43d span), `greenhouse:ghost` (63 obs, 9d, 7.44d span), `greenhouse:nearform` (63 obs, 9d, 7.44d span).
  - All 10 conditions of the Autonomy Cutover Predicate (`docs/SOURCE_REPLENISHMENT_MASTERPLAN.md` Section 4) audited and verified satisfied.
  - Read-only diagnostic CLI built and tested in `scripts/diagnostics/canary-readiness.ts` (5/5 unit tests pass).
- **Workable Probe Pacing & Rate Limit Hardening**:
  - Root cause resolved: `shadow-dispatch.ts` previously ordered by `source_id`, clustering all 7 Workable agencies into Window 1 and hitting `apply.workable.com` within 10 seconds, triggering HTTP 429 rate limits across 80%+ of runs.
  - Implemented provider-interleaved enumeration in `apps/web/src/pages/api/cron/shadow-dispatch.ts` via SQLite window function: `ORDER BY ROW_NUMBER() OVER (PARTITION BY provider_id ORDER BY source_id), provider_id`.
  - Implemented host-aware polite delay in `packages/scraper/shadow-dispatcher.ts`: applies extended 3,000 ms delay for consecutive probes targeting the same origin host.
  - Implemented adaptive `Retry-After` header parsing and 3,000–5,000 ms backoff on HTTP 429 in `packages/scraper/candidate-shadow.ts`.
- **Candidate Queue Backlog Audit Completed (`docs/audits/CANDIDATE_QUEUE_BACKLOG_AUDIT.md`)**:
  - Audited all 14 candidates sitting in `source_registry` with `operational_state = 'candidate'`.
  - Maintained Ashby quarantine (`COMP-01C`, 5 candidates) pending partner feed grant.
  - Identified 9 candidates ready for staged shadow admission (Breezy x1, Lever x1, Workable x7).
- **Exact-Six Board Boundary Invariant Strictly Preserved**:
  - `is_active = 1` only for exact-six feeds; `published: 0` for all 21 shadow identities. Zero board leakage.
- **Verification**: 1,316 tests pass across 131 files (`bun test`); TypeScript typecheck clean; production guardrails clean.

## 2026-09-19 — COMPLETED: Fenced Run-Lock Release & Shadow Maturity Verification (historical)

Completed P1 reliability fix eliminating run-lock contention and verified remote D1 shadow maturity across all 21 sources:
- **Base Commit**: `2232746` (fast-forwarded from remote automated pulses)
- **Resolved Defect**: Fenced run-lock release (`releaseRunLock`) implemented in `apps/web/src/pages/api/cron/scrape.ts` with guaranteed `finally` execution, resolving Recommendation 1 of the Publication Funnel Audit (`docs/debugging/PUBLICATION_DEBUG_STATE.md`). Hunter failover watchdog is no longer locked out for 8 minutes on worker stalls or unhandled errors.
- **Production Truth (Direct D1 Query)**:
  - 1,565 total shadow observations recorded across 14 distinct calendar days (2026-09-06 to 2026-09-19).
  - 19 of 21 shadow identities have matured past the 8-day / 7-calendar-day threshold.
  - Perfect 100% healthy track records for Breezy agencies (20Four7VA, Sourcefit, Yokly, Remote-Craft, Value VA), Teamtailor, Recruitee, and Greenhouse (Ghost, Nearform).
  - Zero public board leakage verified (`published: 0` across all shadow identities).
- **Verification**: 1,308 tests pass (130 files), TypeScript typecheck clean, production guardrails clean.

## 2026-09-14 — COMPLETED: Parallel Debugging Bootloader & Funnel Audit (historical)

Completed empirical audit of the publication funnel answering: *Where are otherwise valid opportunities disappearing before publication?*
- **Base Commit**: `2bb83dc` (`docs(debugging): trace opportunity funnel, derive loss ledger, and record debug state`)
- **CI Status**: Sovereign CI Guardrail run `34833996843` passed (green).
- **Core Empirical Findings**:
  - Valid opportunities are **not** leaking or disappearing inside the software pipeline.
  - Geo-gate and AI triage passed **71.55%** of net-new candidate URLs (83 of 116 in 7 days). All 33 rejections were non-remote on-site retail/trades (RemoteOK noise) or explicitly non-PH geographic locks.
  - 100% of eligible items passed the publication gateway (`proposed == published = 40/40`), and 100% are displayed by Astro frontend routes without hidden filters.
  - Supply starvation in 50% of active source portfolio: Remotive (0 active/7d), Jobicy Admin (0 active/7d), and Jobicy Support (1 active/7d) produce near-zero turnover; 98.8% of site volume is carried by WWR, RWFA, and RemoteOK.
  - Clock gap: 11-hour ingestion gap observed due to primary cron stall + 8-minute run-lock collision with secondary Hunter failover.
- **Artifacts & Documentation**:
  - Daily Funnel Accounting: [PUBLICATION_FUNNEL.md](debugging/PUBLICATION_FUNNEL.md)
  - Loss Ledger & Taxonomy: [PUBLICATION_LOSS_LEDGER.md](debugging/PUBLICATION_LOSS_LEDGER.md)
  - Debug State & Hypotheses: [PUBLICATION_DEBUG_STATE.md](debugging/PUBLICATION_DEBUG_STATE.md)
- **Protected State**: Shadow patience-mode observation (21 sources), Crawl4AI experiments, and Cloudflare Kitesurf code strictly preserved without modification.

## 2026-09-13 — RESUMED: Autonomous Source Expansion & Capacity Milestone (historical)

Explicit OWNER RESUME AUTHORIZATION granted. Autonomous engineering loop active:
- **Base Commit**: Pushed to `main` with full CI passing on GitHub Actions.
- **Production Truth**: 21 active shadow sources in D1 `source_registry` (Workable x7, Breezy x6, Greenhouse x6, Recruitee x1, Teamtailor x1).
- **Candidate Queue**: 14 durable candidates in `needs_review/candidate` discovered via `va_directory` ATS mining (`COALESCE(hiring_page_url, website)`).
- **Recent Shadow Admission**: `breezy:time-etc` admitted to shadow mode with `canary_max_new_items_per_tick: 1` and evidence ID 24. First probe `HEALTHY_WITH_RESULTS` (1 active role).
- **Shadow Observations**: 532+ total observations across 7 distinct UTC days; top cohort at 7 distinct days; zero public leakage (`published: 0` invariant strictly verified).
- **Canary Enforcement**: `canary_max_new_items_per_tick: 1` defaulted in candidate builders and wired into `source-admit` route.
- **Verification**: 1,292 passed, 0 failed across 129 test files; strict typecheck and CI guardrails clean.
- **Current Canonical Pointers**:
  - Savepoint: [SYSTEM_SAVEPOINT.md](SYSTEM_SAVEPOINT.md) (Run 75)
  - Handoff: [HANDOFF.md](HANDOFF.md)
  - Execution State: [APEX_10X_EXECUTION_STATE.md](APEX_10X_EXECUTION_STATE.md)
  - Bootloader: [CURRENT.md](bootloaders/CURRENT.md)

## 2026-09-08 — PAUSED after completed capacity deployment (historical)

## 2026-09-08 — APEX audit and repair (current)

Current truth is in [execution state](APEX_10X_EXECUTION_STATE.md) and
[audit evidence](gauntlet/evidence/APEX-AUDIT-2026-09-08/AUDIT.md). September 7
Wave 0–8 completion/admission claims below were branch-local, not production.
Start main 727ca4a06dda26b9dcddddf5824238cfdd5ce137; repairs are on
the accepted PR135–139 release chain. PR134 duplicate exports are repaired.
Geo restrictions, shift fabrication, shadow health/clock, Workable validation,
primary evidence, and shared-provider orphan bugs are repaired with tests.
Five live shadows now exist; GitLab and Remote.com were truly admitted. Greenhouse/Recruitee evidence renewed September8; old epochs do not qualify.
Strict qualified first-stored baseline is 89/7 = 12.71/day, not 8.5/day.
No source promotion or 10x success is claimed. Final CI/release evidence is
recorded in the current audit; do not replay historical next actions below.

Next command: `git fetch origin; git status -sb`; follow CURRENT.md.


## Purpose

This file defines how future agents and humans recover the project state without
depending on chat history. Every meaningful implementation move should be
recoverable from GitHub: code, docs, verification, workflow evidence, and the
next task.

## Current Recovery Checkpoint — 2026-09-05 SP-23 control plane

Latest: Run **43** in `docs/SYSTEM_SAVEPOINT.md` records verified production
deployment `436441d239d0133168b794a1b73aacb34833bf63`, CI/deploy **33968921265**,
read-only D1 schema/supply evidence and successful site smoke. SP-23 remains
VERIFYING (REVISE); **SP-23B current-evidence admission is next**. No source
activation or new schedule occurred. Earlier Run 42 and the text below preserve
the implementation/release history, not the latest production state.

Continuation: `docs/SYSTEM_SAVEPOINT.md` Run 42 supersedes the release/next-action
facts below. Independent review repaired the live scrape caller's fail-open
fallback on registry/opt-out errors, removed shared policy state, and bounded
the remaining SP-23 admission/publication work. Fresh dated production evidence
separates raw sightings and scheduler outcomes from accepted supply. SP-23 still
does not have KEEP or autonomous-admission acceptance.

Status: **SP-23 is implemented/control-plane VERIFYING, explicitly not
`KEEP` and not production-accepted.** The branch
`codex/sp-23-transition-plane` contains commits `f6c6d21`, `d3ae321`, and
`d909d96`: deterministic typed transitions, a capped canary resolver envelope,
and schema migration 0039 with an append-only guarded transition-event path.
It also contains `c634e1e`, a narrow Hunter workflow status repair for healthy
zero-insert scrapes.

The code is deliberately not a live source expansion. Registry canaries remain
disabled in the legacy scrape loop until a later unified publisher can apply
the source cap to final canonical public candidates across every insertion
path. Exact-six fallback behavior remains active and uncapped. At this
checkpoint migration 0039 is not deployed, no registry/profile source has
been activated or promoted, no shadow-dispatch schedule has been enabled, and
no opportunity publication path has changed.

Recover by reading `docs/SYSTEM_SAVEPOINT.md` Run 41, then the Source
Replenishment Masterplan and SP implementation plan. The next evidence is
independent review plus exact-SHA CI/deploy/read-only D1 confirmation. Do not
turn SP-23 into `KEEP`, restart historical registry SQL, or infer autonomy from
the deterministic replay fingerprints: a real unified publisher and recurrent
real-source shadow/canary observations remain required by the complete
Autonomy Cutover Predicate.

## Current Recovery Checkpoint — 2026-08-31 Source Replenishment constitution

Status: **Durable masterplan and ADR-007 adopted as planning authority; zero
production behavior change.** The authority chain now separates the permanent
source constitution from the 2026 Source Perpetuity bootstrap strategy and its
sole executable SP unit queue.

The permanent destination is constitutional autonomous replenishment rather
than founder approval for each ordinary source. That autonomy becomes valid
only after recurrent shadow dispatch/observations, enforced canary bounds,
schema-contract validation, typed least-privilege transitions, replay, and
rollback have accepted implementation evidence. Exact-six remains the current
production boundary. External permission, contracts, payments, credentials,
constitutional changes, genuine legal disputes, and appeals still require
accountable external/human/organizational authority.

Resume at `docs/SYSTEM_SAVEPOINT.md`, then follow the read order in
`docs/DOCS_INDEX.md`. The next action is a bounded implementation-plan
reconciliation; do not replay historical registry SQL. This file remains a
milestone pointer rather than a duplicate mutable-state log.

## Current Recovery Checkpoint — 2026-08-29 Source Perpetuity

Status: **SP-08, SP-09, SP-16, SP-17 TERMINAL — KEEP; SP-12 VERIFYING at a deliberate safety boundary.** This checkpoint closes one long owner-authorized unattended session ("proceed with all... do not stop... fair and reasonable... approved" while the owner rested ~8 hours).

Terminal this session, each merged/deployed with exact-SHA CI/deploy evidence:

- **SP-08** evidence packets + review-debt alerts — behavior `075be3b`+`fc4e5ab` (PR #88) → `main` `a03631b`.
- **SP-09** Workable global XML feasibility — one bounded live probe of the real feed → `GITHUB_ACTION_PREPROCESSING` decision; behavior `618dba9` (PR #89) → `main` `806b2d7`.
- **SP-16** no-account employer "bring your feed" intake — behavior `8d1a05a` (PR #90) → `main` `eba3c0f`.
- **SP-17** partner/permission evidence pipeline (Ashby/Breezy/Jobvite, revalidated live) — behavior `cede086` (PR #91) → `main` `39e88b5`.

**SP-12 (Greenhouse minimal-index shadow) is VERIFYING, not KEEP.** Real live SP-07 shadow probe against `greenhouse:grafanalabs` returned healthy (134 real jobs, robots allowed); the SP-08 evidence packet is `review_ready`. Code merged (`7769d69` → `main` `23e74dd`, PR #92) with **zero D1 mutation** — the actual `source_registry`/`provider_profiles`/`source_decisions` write was **blocked by the harness's own auto-mode safety classifier** (a real compliance-state change on a source outside the exact six) and was deliberately not routed around; it awaits explicit owner authorization. Evidence: `docs/gauntlet/evidence/SP-12-greenhouse-grafanalabs-day1-evidence.md`. Exact-six `ROBOTS_ENFORCE_SOURCE_IDS` and the five-token `ATS_TOKEN_POLICIES` Greenhouse pause are both unchanged.

Resume in the canonical order defined at the top of `docs/DOCS_INDEX.md`, with
`docs/SYSTEM_SAVEPOINT.md` as the sole mutable current-session baton. Use
`docs/bootloaders/SOURCE_PERPETUITY_BOOTLOADER.md` to reconstruct a fresh AI
session. Next exact action: owner reviews the SP-12 evidence doc and either
authorizes the pending write or names a different curated board; SP-11/13/14/15
would hit the identical classifier block at their own equivalent step.

This file is updated for milestones and interruptions, not after every unit.
The savepoint plus SP plan/status ledgers carry mutable current execution facts.

## Recovery Checkpoint — 2026-08-29 Source Perpetuity SP-00..SP-02 (historical)

Status: **Measurement foundation TERMINAL — KEEP (SP-00..SP-02).** SP-01 exact
source identity and SP-02 truthful source-economics + 304 unchanged-separation
fix are merged and deployed; latest behavior `ed0040a` (PR #82), exact-SHA
CI/deploy `33243425545` applied migration `0035` and deployed Pages. Current
exact-six production behavior remains unchanged. Next dependency-ready unit at
the time of this checkpoint: **SP-03** provider/source registry foundation.

## Recovery Checkpoint — 2026-08-22 Gauntlet planning (historical)

Status: **PLANNING COMPLETE — KEEP**. The synchronized audit baseline was
`bd84cc1`; the planning package is backed up on `main` at `d21cd9e` and passed
GitHub Actions run `32552942171` (docs-only deploy correctly skipped). The last
accepted production behavior remains `07f582b`, deployed by successful run
`32475868471`. No Gauntlet implementation unit has begun.

Current scheduled evidence includes successful watchdog `32550368138`,
source-health `32546699929`, directory `32545246416`, Prospector `32544606954`,
and enrichment `32550872494` runs. Treat the generated payloads as evidence;
workflow success alone is not production-health acceptance.

Recovery and resume order:

1. [System Savepoint](./SYSTEM_SAVEPOINT.md)
2. [Master Execution Plan](./MASTER_EXECUTION_PLAN.md)
3. [Portable Implementation Units](./gauntlet/IMPLEMENTATION_UNITS.md)
4. [Agent-Reach Study](./research/agent-reach-study-2026-08-22.md)
5. [Implementation Status](./IMPLEMENTATION_STATUS.md)
6. [Handoff](./HANDOFF.md)

The next unit is read-only `REC-01`; it inventories and classifies existing
worktrees without deleting them. The first production implementation after that
preflight is `DATA-05A`. Before starting either unit, re-sync `main`, preserve
unrelated work, and record the actual starting SHA because automated digest
commits may advance the branch. Partial implementation is recoverable only when
clearly marked non-accepted on an isolated pushed branch.

## Historical Recovery Checkpoint — 2026-08-10 (superseded)

The current recoverable work is the paused production-hardening branch
codex/production-apex-audit-2026-08-09. It is a backup checkpoint, not a
production release. Do not deploy or merge it merely because the code is
present.

The primary code checkpoint is 33c1995 on the remote branch of the same name.
No GitHub Actions run was triggered by that branch push because the CI guardrail
targets main and pull requests. Treat the saved branch as recoverable code and
documentation, not as an accepted release.

Read docs/major-production-audit-2026-08-10.md and
docs/decisions/ADR-005-cloudflare-pages-compatibility-line.md before resuming.
They contain the five-workstream audit ledger, fixed findings, residual
advisories, deferred release gates, and the reason the project remains on its
Cloudflare Pages-compatible adapter line. Then read HANDOFF.md and
SYSTEM_SAVEPOINT.md for the exact Git savepoint.

The owner’s 2/5 marker is a stop-and-handoff marker. All five workstreams were
audited; no deployment acceptance is implied.

The model is intentionally similar to `cyalcala/techwriter-bot`: small slices,
documented checkpoints, percentage progress, GitHub-backed evidence, and a clear
handoff after every important move.

## Canonical Recovery Files

Read these first when starting a new work session:

1. `docs/DOCS_INDEX.md`
2. `AGENTS.md`
3. `docs/IMPLEMENTATION_STATUS.md`
4. `docs/HANDOFF.md`
5. `docs/MASTER_EXECUTION_PLAN.md`
6. `docs/AI_RECOVERY_TRAIL.md`
7. `docs/SYSTEM_SAVEPOINT.md`
8. `docs/ats-policy-follow-up-2026-06-12.md`
9. `docs/wrangler-d1-audit-2026-06-12.md`
10. `docs/major-audit-2026-06-11.md`
11. `docs/major-audit-2026-06-10.md`
12. `docs/major-audit-2026-06-06.md`
13. `docs/source-review-2026-06-09.md`
14. `docs/ats-source-review-2026-06-09.md`
15. `docs/data-quality-snapshot-2026-06-09.md`
16. `docs/stale-policy-dry-run-2026-06-09.md`
17. `docs/application-url-backfill-2026-06-09.md`
18. `docs/hunter-health-artifacts-2026-06-09.md`
19. `docs/source-health-rollup-2026-06-09.md`
20. `docs/source-health-latest.md`
21. `docs/final-acceptance-audit-2026-06-09.md`
22. `docs/scraper-alerts.md`
23. `docs/scraper-troubleshooting.md`
24. `docs/decisions/ADR-001-recovery-driven-public-job-index.md`
25. `docs/decisions/ADR-002-canonical-utc-iso-timestamps.md`
26. `docs/major-code-audit-2026-08-09.md`
27. `docs/decisions/ADR-004-migrate-before-deploy-and-validate-fts.md`

## Latest Recovery Checkpoint — 2026-08-09

- Branch: `main`
- Production merge commit: `5bc6d09`; source implementation commit: `2ea2226`.
- Read the major audit and ADR-004 before changing the release, FTS, or pulse
  workflows. They explain why FTS indexes all external-content rows, why only
  indexed text triggers an FTS rewrite, and why production migration must
  precede Pages deployment.
- Local evidence: `bun run verify` passed on the merged tree in 55.8 seconds with 190 tests, zero
  failures, 354 assertions, strict TypeScript, and an Astro production build.
  The four edited workflow files parse with PyYAML.
- Production acceptance: GitHub Actions run `31317525008` passed its
  validation job and then the migration-first release job: D1 migrations,
  remote FTS integrity, and Pages deployment all completed successfully. Public
  smoke checks for `/`, `/opportunities`, `/opportunities?q=assistant`, and
  `/directory` each returned HTTP 200.
- Do not run D1 migration 0027 manually unless recovering from a failed main
  release. If recovery is necessary, use the manual `Deploy Database
  Migrations` workflow with a recorded reason; it shares the production D1
  lock and performs the FTS integrity check.

## Required Backup Loop

Use this loop for every non-trivial change:

1. Choose the smallest useful slice.
2. Make the change.
3. Run targeted local verification.
4. Run `bun run build` when the change touches app behavior, routing, schema,
   runtime code, or frontend rendering.
5. For data/indexing work, capture read-only D1 evidence such as counts, query
   plans, and before/after timings where available.
6. Commit the code or documentation slice.
7. Push to GitHub.
8. Watch GitHub Actions for that commit.
9. Update `docs/IMPLEMENTATION_STATUS.md` with:
   - phase and overall percentage;
   - commit hash;
   - verification commands and result;
   - GitHub Actions run ID and result;
   - production smoke check when relevant;
   - exact next task.
10. Commit and push the acceptance checkpoint when the evidence is known.

For tiny docs-only updates, `git diff --check` plus a successful GitHub Actions
run is enough verification. For code paths, do not replace behavior tests with
documentation.

## Required Evidence

Record the evidence that matches the type of change:

| Change type | Minimum evidence |
| --- | --- |
| Docs/process | `git diff --check`, commit hash, GitHub Actions run ID |
| Frontend route/UI | `bun run build`, route smoke check, GitHub Actions run ID |
| Database/indexing | migration file, query plan before/after, D1 count sanity check |
| Ingestion | source-level counts, failed-source list, insert accounting, workflow run ID |
| Compliance/source policy | source config status, reason, policy note, source-review evidence, opt-out path |
| Production acceptance | immutable commit, deployed URL/status, smoke response evidence |

## Percentage Rules

Percentages are weighted acceptance points, not optimism.

Overall percentage is the sum of accepted phase points:

| Phase | Weight | Acceptance definition |
| --- | ---: | --- |
| P0 | 5% | Recovery docs, roadmap, ADR, and agent context are committed, pushed, and CI-accepted |
| P1 | 15% | `/opportunities` exists and homepage payload is reduced with route smoke evidence |
| P2 | 15% | D1 indexes and datetime normalization are migrated and query plans improve |
| P3 | 20% | Ingestion returns structured source status and no longer hides ATS/write failures |
| P4 | 15% | Source compliance states are explicit and high-risk sources are paused or approved |
| P5 | 15% | Data quality gaps are backfilled or intentionally marked unknown |
| P6 | 10% | Alerts become rollups and backup/reporting hygiene is stable |
| P7 | 5% | Final audit passes and portfolio docs match production behavior |

Partial phase credit is allowed only when a sub-slice has its own acceptance
evidence. Example: P3 can move from 0% to 5% when source status responses are
merged and CI-accepted, even before alert rollups ship.

## Watermelon And Rathole Controls

Watermelon risk means a system is green externally but red internally. In this
repo, a green GitHub Actions run is not enough when the workflow body reports
failed sources, zero-item fetches, insert errors, or stale data. Acceptance must
include source-level health.

Rathole risk means over-investing in one failing source or one elegant internal
abstraction while the public product remains broken. Time-box source-specific
debugging. If a source repeatedly fails, mark it `paused` or `needs_review`,
record why, and keep the rest of the ingestion system healthy.

## Decision Trail Rules

- Product strategy and phase weights live in `docs/MASTER_EXECUTION_PLAN.md`.
- Current status, percentages, and next tasks live in
  `docs/IMPLEMENTATION_STATUS.md`.
- Durable architectural decisions live in `docs/decisions/`.
- Raw audit evidence and findings live in `docs/major-audit-2026-06-06.md`.
- Latest ATS source policy hardening evidence lives in
  `docs/ats-policy-follow-up-2026-06-12.md`.
- Latest Wrangler/D1 audit recovery evidence lives in
  `docs/wrangler-d1-audit-2026-06-12.md`.
- Major health repair evidence lives in `docs/major-audit-2026-06-11.md`.
- Source failure history previously lived in `docs/scraper-alerts.md`; Hunter
  now uploads per-run `harvest.log` and `source-health-summary.md` artifacts.
  The latest repo-readable rollup lives in `docs/source-health-latest.md`.

Do not bury important decisions only in commit messages or chat.

## Pause And Handoff Protocol

When the user asks to stop, pause, or only back up progress:

1. Stop implementation immediately.
2. Confirm whether the working tree has code changes.
3. If no code changes exist, do not invent a code checkpoint.
4. Update `docs/HANDOFF.md`, `docs/IMPLEMENTATION_STATUS.md`, and
   `docs/SYSTEM_SAVEPOINT.md` with the exact pause point.
5. Commit, push, and watch CI for the docs-only recovery checkpoint.
6. Record the checkpoint evidence before ending the turn.

