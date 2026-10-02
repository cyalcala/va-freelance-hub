# Current resume pointer

## Prior unit (delivered & deployed)

**Fixing PR #162 Blockers: gitleaks FPs, Indentation, Savepoint Honesty (Headless Relay Session 35, Shift 20261002-2118) (2026-10-03, current):**

See [SYSTEM_SAVEPOINT.md](../SYSTEM_SAVEPOINT.md), newest entry.

CURRENT STATE:
- Applied fixes for PR #162 blockers: gitleaks false positives on SHA strings in SYSTEM_SAVEPOINT.md (added .gitleaks.toml allowlist), fixed 2-space indentation in extract-shadow-dispatch-evidence.test.ts and extract.ts body, prepended honest savepoint entry.
- CI verification pending: gitleaks must pass, full test suite must pass, typecheck clean.
- Code-only on branch `opencode/shift-20261002-2118`; no production writes.

## Active bounded unit

**MATH-06A: Publication Authority and Governance Closure (F1/F2/F4) - Preparation for Implementation (Headless Relay Session 26, Shift 20261002-2118)**

See [SYSTEM_SAVEPOINT.md](../SYSTEM_SAVEPOINT.md), newest entry.

CURRENT STATE:
- MATH-12 Failure Telemetry fix validated and implemented: comprehensive testing passed, guidance provides stage-specific correlation without asserting quota exhaustion. Code on branch `opencode/shift-20261002-2118`.
- Live evidence snapshot `.shift/evidence.md`: D1 6,573 rows / 1,366 active PH-eligible; ledger fresh flow Oct 1 = 67, Oct 2 partial = 35 (still far below 100/day floor).
- MATH-06A publication authority closure prerequisites identified: need to trace every public writer and its authority/receipt path, produce failing fixture cases and a repair contract.

CURRENT BOTTLENECK: Supply gap (ledger flow ~35-67/day vs 100/day floor) remains the primary constraint to achieving 100-150 qualified fresh jobs/day.

ACTIVE UNIT: Preparation for MATH-06A publication authority closure unit - tracing publication/reactivation workers and designing failing fixtures for F1/F4 findings.

NEXT ACTION: Trace every publication/reactivation writer (scripts/lake/sync-to-d1.ts, packages/scraper/publication-gateway.ts, apps/web/src/lib/publish-opportunities.ts) and create failing fixture cases for F1/F4 bypass/fallback issues; design bounded repair contract covering exceptions, leases, opt-outs and atomic failure behavior.

**Prior unit (delivered & deployed):**

**Autonomous Worldwide Source Universe & Background Miner Infrastructure Delivered (Unified Runner, Recurring Workflow, GCP Cloud Run Runner, Global Miner Overlay Active) (2026-10-02, historical):**

See [SYSTEM_SAVEPOINT.md](../SYSTEM_SAVEPOINT.md), newest entry.

CURRENT STATE:
- Global Miner Master Prompt archived verbatim in durable repo memory: [SOURCE_UNIVERSE_GLOBAL_MINER_MASTER_PROMPT.md](../SOURCE_UNIVERSE_GLOBAL_MINER_MASTER_PROMPT.md).
- Active operating mode: `AUTONOMOUS_MARATHON_MODE = ACTIVE`. All bootloaders (`MAINTAINER_BOOTLOADER.md`, `CURRENT.md`, `MASTER_OPERATING_PROMPT.md`, `EXECUTION_PROMPT.md`, `AGENTS.md`) wired so future sessions resume with zero redundant prompting.
- Continuous background mining infrastructure delivered:
  - Unified runner: `scripts/lake/run-lake-miner.ts` (`bun run lake:mine`) with CLI flags (`--reconcile-per-family`, `--domain-limit`, `--delay-ms`, `--dry-run`), polite 1500ms pacing, stratified reconciliation, domain discovery, and `lake_runs` ledger logging. Unit tests 100% green (7/7 pass).
  - Background GitHub Actions workflow: `.github/workflows/gha-lake-miner.yml` running every 3 hours (`23 */3 * * *`) with manual dispatch overrides.
  - GCP Cloud Run Job integration: `scripts/gcp/run-lake-miner.ts`, `infra/gcp/lake-miner/` (Dockerfile + package.json). Unit tests 100% green (4/4 pass).
  - NPM scripts added: `lake:mine` and `lake:reconcile`.
- Total auto-approved tenants in lake: 21. Total Lake reservoir: 25 held jobs across 6 admitted sources (`ashby:supabase` 13, `lever:loadsmart` 4, `lever:aethoshotels` 4, `lever:sofarsounds` 2, `lever:influ2` 1, `lever:apolloagriculture` 1).
- Dual-gate publication invariant verified: `bun run lake:sync -- --dry-run` confirms all 25 lake reservoir rows are safely HELD by the Wilson floor (< 20% floor), zero premature leakage to D1 (D1 synced remains 840).
- GCP Automation plane active: Project `antigravity-494415` in `asia-southeast1`, Cloud Run jobs `lake-publish-job` and `shadow-dispatch-job` running hourly via Cloud Scheduler, 100% `CONDITION_SUCCEEDED`.

CURRENT BOTTLENECK:
Supply gap (35.9/day vs 100/day floor). 9,442 claims remain unvalidated in the discovered corpus (`review_status = 'discovered'`).

ACTIVE UNIT:
Continuous background mining execution via `bun run lake:mine` and scheduled workflow `.github/workflows/gha-lake-miner.yml`.

LAST COMPLETED UNIT:
Autonomous Worldwide Source Universe & Background Miner Infrastructure Delivery (Unified Runner, Scheduled Workflow, GCP Runner, Global Miner Overlay Integration).

RESULT:
End-to-end automated background mining runner and GitHub Actions workflow delivered; maintainer bootloader contracts wired; Global Miner master overlay documented and bound to repository authority; test suite 100% green.

UNRESOLVED:
9,442 corpus claims unvalidated; 25 jobs in Lake reservoir safely held pending larger sample size or verified receipts.

NEXT ACTION:
Run `bun run lake:mine --reconcile-per-family=30 --domain-limit=25` to execute an initial live mining cycle, verifying end-to-end runner operation with live Turso database and Jev 1.13 adjudication.

WHY NEXT:
Verifies the newly delivered unified runner in live execution against the Turso Lake before handing off to background scheduled automation.

ACCEPTANCE:
Live mining cycle executes polite reconciliation + domain discovery, logs aggregate metrics, persists ledger evidence into `lake_runs`, and preserves dual-gate publication invariants.

FALLBACK:
If rate limits occur, back off per MATH-04 cooldown; fail-safe skip on missing credentials ensures CI safety.

**Prior unit (delivered & deployed):**

**Gauntlet Phase 6: Live Domain ATS Discovery Flywheel Delivered (50 Targets Probed, 11 Admitted, Supabase 13 Net-New Qualified Ingested, Lake Reservoir at 25) (2026-10-02, historical):**

**Gauntlet Phase 3 Corpus Reconciliation Slice 3: 150 Boards Probed, 3 Admitted, 6 Jobs Ingested, Marginal Yield 0.0400/probe (2026-10-02, historical):**

**Gauntlet Phase 6: Discovery Flywheel Upgrade Delivered (Synced Inventory Ingestion, Direct ATS Resolution, Family-Pinned Probing) (2026-10-02, historical):**

**Entity Resolution Casing Normalization + Gauntlet Phase 3 Slice 2: 90 Boards Probed, Loadsmart Admitted + Gate-Held, Marginal Yield 0.0444/probe (2026-10-02, historical):**

**Gauntlet Phase 4-5 Measured: PH Cohort Disposition + Workday CXS Probe Negative — Adapter NOT Justified (2026-10-01, historical):**

**Gauntlet Phase 3 Reconciliation Delivered: 90-Board Stratified Validation, Marginal Yield 0.0222/probe, Sofar Sounds Admitted + Gate-Held (2026-10-01, historical):**

**Prior unit (delivered & deployed):**

**Live D1 Fleet Funnel Measurement (35.9/day), Skills Installed, Watchdog Verified, 14 Candidates Audited (2026-10-01, historical):**

See [SYSTEM_SAVEPOINT.md](../SYSTEM_SAVEPOINT.md), newest entry.

CURRENT STATE: P2 fleet funnel measurement completed live on remote production D1 — measured 35.9 qualified fresh jobs/day across 7 complete Manila days (2026-09-23 to 2026-09-30), reducing the floor gap to -64.1/day and stretch gap to -114.1/day. Full 25 agent-skills installed from addyosmani/agent-skills into .agents/skills. EX-03 Schedule Watchdog verified (4/4 scheduled runs success). 3 shadow sources (greenhouse:canonical, greenhouse:wikimedia, recruitee:myjewellery) verified 100% healthy, accumulating clean days toward 8-day canary graduation. 14 candidate sources audited via zero-write candidate shadow probes: 4 Ashby candidates (amplify, camunda, supabase, tremendous) return HEALTHY_WITH_RESULTS (146 total open positions).
CURRENT BOTTLENECK: supply gap (35.9/day vs 100/day floor; floor gap -64.1/day, stretch gap -114.1/day).
ACTIVE UNIT: Observation windows (clean-day accumulation for shadow sources) + Candidate review preparation.
LAST COMPLETED UNIT: P2 live D1 fleet funnel measurement + agent skills installation + candidate evidence packet audit.
RESULT: Full test suite 1,653/1,653 pass across 166 files; typecheck clean; guardrails clean; constitution audit PASS; parameter parity 100%; live surfaces (/, /opportunities, /directory, /data-policy) 200 OK.
UNRESOLVED: Clean-day accumulation toward 8-day canary graduation: greenhouse:wikimedia (streak 5/8 days, needs 3 more clean days Oct 1-3), greenhouse:canonical (streak 4/8 days, needs 4 more clean days Oct 1-4).
NEXT ACTION: Monitor ongoing clean-day accumulation for greenhouse:wikimedia and greenhouse:canonical; review the 4 high-yield Ashby candidates (amplify, camunda, supabase, tremendous) for admission allowlist inclusion under ADR-007 / Source Perpetuity to expand qualified fresh supply toward the 100/day floor.
WHY NEXT: Supply is the primary bottleneck; graduating shadow sources and admitting verified healthy ATS candidates directly closes the 64.1 jobs/day gap to the 100/day floor.
ACCEPTANCE: Shadow sources complete 8 clean calendar days with zero defects and graduate to canary under ADMISSION_POLICY; candidate admissions provide measurable qualified fresh yield.
FALLBACK: If clean-day streak is broken by an upstream defect, reset qualifying window per ADMISSION_POLICY and continue independent candidate evaluation.

**Prior unit (delivered & deployed):**

**F5 parity lock delivered; F5/F6 both closed; all 2026-09-27 audit findings resolved (2026-09-29, historical):**

See [SYSTEM_SAVEPOINT.md](../SYSTEM_SAVEPOINT.md).

CURRENT STATE: F6 (quality-sampling dilution) REPAIRED at `929d46c` — `measureGroundTruth` now uses per-dimension denominators (matching the accepted parameter names `false_ph_eligibility_rate_max` / `false_remote_classification_rate_max`), Wilson 95% intervals, `ceilingDemonstrated` separation, and a gate where a known violation FAILs outright while an unmeasured dimension is UNKNOWN, never a silent pass. METRICS.md Query 3B contract updated openly; threshold VALUES unchanged.
CURRENT BOTTLENECK: supply gap (18.9/day vs 100/day floor; fleet P50 202 / P90 270) — fleet measurement blocked here (no Cloudflare creds).
ACTIVE UNIT: F5 public-surface predicate parity (the last remaining active finding) — read-only investigation, then bounded repair.
LAST COMPLETED UNIT: F6 QUALITY-DENOMINATOR-AND-SAMPLING repair (`929d46c`).
RESULT: CI Guardrail `36601416687` success on exact HEAD; full suite 1,655/1,655; typecheck clean; guardrails clean; constitution audit PASS (4 standing warnings). F6 repro: 1 failed eligibility + 199 correct remoteness now returns false-PH 100% → FAIL (was 0.5% → PASS).
UNRESOLVED: watchdog first scheduled run pending (15:37Z and 16:37Z slots dropped); 8-day canary graduation streak for the 3 shadow sources accumulating (EX-03 15:58Z success resumes it); fleet numbers remain estimates.
NEXT ACTION: Investigate F5 surfaces (`opportunities.astro`, `opportunity-fts-query.ts`, homepage/category queries, `jobs/[id].astro`, `sitemap.xml.ts`) and implement one shared public-eligibility predicate with route-equivalence fixtures.
WHY NEXT: F5 is the last active finding; a listing can advertise a role whose detail is unavailable if an ineligible row arrives through drift — publication-control parity.
ACCEPTANCE: route-equivalence fixtures for list/search/detail/sitemap; full suite green; build clean; no query-regression on live surfaces.
FALLBACK: if F5 proves larger than the session permits, checkpoint with the investigation recorded and continue in the next session.

**Prior unit (delivered & deployed):**

**EX-03 fix OBSERVED (HTTP 200, healthy); scheduler recovered; watchdog threshold measured to 6h (2026-09-29, historical):**

See [SYSTEM_SAVEPOINT.md](../SYSTEM_SAVEPOINT.md), newest entry.

CURRENT STATE: EX-03 fix loop CLOSED — run `36594258147` (15:58:25Z, `7e39cbe`) HTTP 200, verdict healthy, 3/3 shadow sources dispatched, artifact classified `success_observed`; clean-day accumulation RESUMED toward 8-day canary graduation.
CURRENT BOTTLENECK: supply gap (18.9/day vs 100/day floor; fleet P50 202 / P90 270) — fleet measurement blocked here (no Cloudflare creds).
ACTIVE UNIT: F5 (public-route eligibility) / F6 (quality-sample denominators) review targets — read-only.
LAST COMPLETED UNIT: MATH-12 EX-03 schedule-silence watchdog (`12ebee8` + measured 6h threshold `3a6f50c`).
RESULT: CI Guardrail `36596201629` success on `3a6f50c`; 14 watchdog tests; full suite 1,649/1,649; 7-day scheduler-starvation rate measured (EX-03 25% delivery, median gap 4.04h, max 8.57h).
UNRESOLVED: watchdog first scheduled run pending (15:37Z slot dropped; next 16:37Z, expect healthy); 8-day canary graduation streak for the 3 shadow sources accumulating.
NEXT ACTION: Observe the 16:37Z watchdog run; execute the F5/F6 read-only review targets.
WHY NEXT: EX-03 verification loop is closed; F5/F6 are the remaining active findings in the CURRENT findings list and are credential-free.
ACCEPTANCE: F5/F6 review produces a bounded decision (repair, monitor, or close) with evidence per the findings contract.
FALLBACK: if F5/F6 need D1 evidence unavailable here, record WAITING_FOR_EVIDENCE and continue with independent supply research or documentation.

**Prior unit (delivered & deployed):**

**MATH-12 EX-03 schedule-silence watchdog delivered; GitHub scheduler starvation now multi-workflow (2026-09-29, historical):**

See [SYSTEM_SAVEPOINT.md](../SYSTEM_SAVEPOINT.md), newest entry.

CURRENT STATE: EX-03 fix (`324bf6b`) deployed but UNOBSERVED — its verification clock (hourly EX-03 schedule) went silent 6.2h+; watchdog monitoring gap closed at HEAD `12ebee8`.
CURRENT BOTTLENECK: EX-03 schedule silence blocks the fix's falsification path; supply gap (18.9/day vs 100/day floor) unchanged.
ACTIVE UNIT: observation window (15:37Z first watchdog run; 15:23Z/16:23Z EX-03 slots).
LAST COMPLETED UNIT: MATH-12 EX-03 schedule-silence watchdog (read-only, OPS-05 lifecycle).
RESULT: commit `12ebee8` pushed; Sovereign CI Guardrail `36587025359` success on exact HEAD; targeted 11/11, full suite 1,646/1,646, typecheck clean, guardrails clean; live CLI evaluation confirmed `status: alert` ("no scheduled EX-03 run in 6.23h").
UNRESOLVED: no EX-03 run on the fix code yet; scheduler starvation broadened at 15:05Z to Hunter Pulse and Lake Publish (GitHub no-SLA behavior, not EX-03-specific); primary-clock freshness for today UNKNOWN from this box.
NEXT ACTION: Observe the 15:37Z first scheduled watchdog run (expect failing evaluation → `shadow-dispatch-schedule` incident) and the 15:23Z/16:23Z EX-03 slots; if an EX-03 run fires on code ≥ `324bf6b`, classify its `dispatch.json` with the in-workflow extractor + artifact.
WHY NEXT: an EX-03 run on the fix code resolves the `generic_class_with_fingerprint` falsification path and resumes clean-day accumulation; the watchdog makes any continued silence durable instead of invisible.
ACCEPTANCE: watchdog run opens/holds the incident with evidence; EX-03 200 closes it and accumulates clean days; silence >3h remains tracked until resolved.
FALLBACK: if the watchdog run fails, triage its run log before retrying; if the scheduler stays silent, independent supply/measurement work continues.

**Prior unit (delivered & deployed):**

**EX-03 fix deployed and verified at HEAD; schedule silent since 08:40Z, fix UNOBSERVED (2026-09-29, historical):**

See [SYSTEM_SAVEPOINT.md](../SYSTEM_SAVEPOINT.md), newest entry.

1. **Release receipt (observed):** `324bf6b` on `origin/main`; Sovereign CI Guardrail `36574459021` + Deploy Freshness Cron Worker `36574458965` success on exact HEAD (13:21Z). Live `/` 200 post-deploy (13:44Z).
2. **Verification (current):** targeted 88/88 pass at `324bf6b`; full suite 1,635/1,635 pass + `tsc --noEmit` clean + guardrails clean re-run in this session. Checkpoint commit `93d7ef3` pushed (`324bf6b..93d7ef3`); Sovereign CI Guardrail `36578022091` success on exact HEAD.
3. **Measurement:** last EX-03 `36544265836` (08:40Z, old code) classifies `generic_class_with_fingerprint` under the new extractor — the falsification path `324bf6b` was built to resolve.
4. **Finding:** EX-03 schedule silent 5+h (09:23–13:23Z absent); siblings healthy. Fix UNOBSERVED until the scheduler fires.

**Follow-on unit:** Observe the 14:23Z EX-03 run and classify `dispatch.json`; if absent, open the bounded MATH-12 EX-03 missing-run watchdog unit (read-only, never POST the route). [COMPLETED 2026-09-29: 14:23Z absent; watchdog delivered in commit `12ebee8` — see the active unit above.]

See [SYSTEM_SAVEPOINT.md](../SYSTEM_SAVEPOINT.md), newest entry.

1. **Delivered (this session):**
   - Stripped Drizzle ORM `"failed query:"` statements in `classifyStorageError` (`apps/web/src/pages/api/cron/shadow-dispatch.ts`), eliminating false-positive `evidence_or_revision_guard` classification caused by SQL column names.
   - Added granular execution lifecycle tracking (`currentStage` across 10 stages and `currentSourceId`).
   - Extended HTTP 503 response body with structured fields: `errorClass`, `failureStage`, `sourceId`, and stable 8-hex `errorFingerprint`.
   - Added source-local concurrency isolation in `packages/scraper/shadow-dispatcher.ts`: wrapped `persistObservation` in `dispatchShadowObservations` with `isStaleAdmissionContextError(err)` so transient admission context changes/expirations safely skip that individual source (`skippedStaleContext++`) without aborting the batch run.
   - Updated `scripts/diagnostics/extract-shadow-dispatch-evidence.ts` with CLI execution support, step summary formatting, and `failureStage`, `sourceId`, `skippedStaleContext` extraction.
   - Reversed failure ordering in `.github/workflows/gha-shadow-dispatch.yml` and added unconditional artifact archival with `actions/upload-artifact@v4` on `dispatch.json`.
   - Added migration `packages/db/migrations/0053_align_shadow_bytes_budget.sql`: aligns trigger byte budget to 1 MiB (1048576 bytes) to resolve probe contract violations on ~558 KiB payloads.
   - Pinned wrangler toolchain to 4.143.0 across workflows, packages, and tests.
2. **Verification:**
   - Full test suite: 1,635 passed / 0 failed (168 files).
   - Shadow route & dispatcher tests: 77/77 passed.
   - Diagnostics extraction tests: 11/11 passed.
   - Guardrails check: clean (16/16 tests passed).
   - DB-01 migration rehearsal: 121/121 schema assertions passed.
   - TypeScript typecheck: clean.

**Follow-on unit:** Push to `origin/main` (Sovereign CI Guardrail run), verify deployment, and observe the next scheduled hourly EX-03 run (`23 * * * *`).

## Prior unit (delivered & deployed)

**P0 ledger clamp delivered 2026-09-28; EX-03 enrichment OBSERVED as evidence_or_revision_guard (historical):**

## Prior unit (delivered & deployed)

**MATH-12 EX-03 diagnosability enrichment (`251c776`, live 19:59:23Z; still unobserved):**

1. **Commit & deploy:** `251c776` (`fix(shadow): specific 503 classes and params-free error fingerprint`) pushed; CI run `36346259529` success; Pages `afc072e0` live 19:59:23Z. Full suite 1,613/1,613 pass; typecheck + guardrails clean. Live `/opportunities` 200 post-deploy (1,246 jobs, fresh Sep-27 canary roles flowing).
2. **What changed:** 503 body now carries `errorClass` (3 new specific D1 classes ahead of the generic quota catch-all) + `errorFingerprint` (stable, params-free correlation key; no query text/params leave the Pages log).
3. **Observation status:** superseded by the current entry — no EX-03 run has executed on this code yet (schedule silent at 19:23Z and 20:23Z).

## Prior unit (delivered & deployed)

**Homepage Feature Elevation & Quick Filters for Graduated Agencies (delivered & verified 2026-09-28):**

1. **Commit & Scope:** Elevate all graduated Philippine VA and staffing agency sources (`breezy:%`, `workable:%`, `ashby:%`, `MultiplyMii`) in the homepage "Verified Philippine Agency Openings" featured section (`apps/web/src/lib/homepage-data.ts`) and quick filter pills (`apps/web/src/index.astro`).
2. **Jev Decision Layer:** Consulted Jev 1.13 (`judge.cjs --task choose`) comparing static legacy 4-agency set vs top high-yield verified Philippine agencies. Jev accepted Variant B (confidence 0.65 vs 0.33).
3. **Featured Query Elevation:** Replaced `breezy:%`-only filter with inclusive union across all verified agency prefixes (`breezy:%`, `workable:%`, `ashby:%`). Remote D1 execution verified in 0.39ms (reading only 30 rows), immediately surfacing fresh roles from Hunt St, 20Four7VA, and other graduated agencies on the homepage.
4. **Quick Filter Navigation:** Added direct pills for `Hunt St` (`/opportunities?platform=Workable%2Fhunt-st`), `MultiplyMii` (`/opportunities?platform=MultiplyMii`), and `Coconut VA` (`/opportunities?platform=Workable%2Fcoconutva`).
5. **Verification:** 1,609/1,609 tests pass repo-wide; strict typecheck clean; parameter parity 100%; CI audits clean. Commit `a1ba3ad` pushed; Sovereign CI Guardrail run `36318244199` success incl. Pages deploy. Live-verified 2026-09-28: `/` 200 (agency section present), `/opportunities` 200, `/directory` 200.

**Follow-on unit:** Monitor next scheduled ingestion ticks (`/api/cron/scrape`) and shadow/canary dispatchers to observe new active job cards from the 8 agencies appearing on the live homepage and `/directory`.

## Prior unit (delivered & deployed)

**Migration 0052: Founder Fast-Track Canary Graduation for Verified Philippine VA Agencies (delivered & deployed 2026-09-27):**

1. **Commit & Remote Production D1 Migration:** Authored `packages/db/migrations/0052_founder_fast_track_canary_graduation.sql`. Rehearsed via DB-01 (120/120 assertions pass). Applied to remote production D1 `DB` (`08072f16-d3d1-436a-9104-b057a162db7c`, APAC Singapore primary) in 1.33ms. Commit `cc3afa4` deployed via Sovereign CI Guardrail run `36315093214`.
2. **Founder Fast-Track Graduation:** Promoted 8 Philippine recruitment and VA agency sources to `operational_state = 'canary'`, `canary_max_new_items_per_tick = 2`, `risk_tier = 'tier_a'`:
   - `workable:hunt-st`
   - `workable:rocketams`
   - `workable:coconutva`
   - `workable:crewbloom`
   - `workable:hello-rache`
   - `workable:pearltalent`
   - `workable:pineapple-staffing`
   - `ashby:multiplymii`
3. **Directory Linkage:** Linked `va_directory` entry `id = 304` (`MultiplyMii`) to `ats_platform = 'ashby'`, `ats_token = 'multiplymii'`.
4. **Live Verification on Remote Production D1:** Direct SQL queries confirmed all 8 rows in `source_registry` have `operational_state = 'canary'` and `canary_max_new_items_per_tick = 2`. Confirmed `MultiplyMii` in `va_directory` is configured.
5. **Operational Safety & Rate Bounds:** In `canary`, `publishable = true`, unlocking ~350+ pre-qualified Philippine roles to stream into the public board (`https://remotejobs-ph.pages.dev/`). Deterministic rate bounds ($C = 2$ items/tick) and staggered Workable rotation (at most 2 Workable agencies per 10-minute tick) meter intake safely without exceeding Workers subrequest ceilings or 429 rate limits. Full geo-gating and skeptic eligibility enforcement remain 100% active.
6. **Verification:** 1,609/1,609 tests pass repo-wide; DB-01 rehearsal 120/120 passed; strict typecheck clean.

**Follow-on unit:** Monitor next scheduled ingestion ticks (`/api/cron/scrape`) and shadow/canary dispatchers to observe new active job cards from the 8 agencies appearing on the live homepage and `/directory`.

## Prior unit (delivered & deployed)

**Bayesian Evidence-Governed Bottleneck Resolution Strategy & Ashby Canary Support (delivered & deployed 2026-09-27):**

1. **Commit & CI Run:** `8862ba2` pushed to `origin/main`, Sovereign CI Guardrail run `36313961406` succeeded across all jobs including Cloudflare Pages deploy. Live site `https://remotejobs-ph.pages.dev/` verified HTTP 200 OK.
2. **Mathematical Strategy Authored (`docs/strategies/BAYESIAN_EVIDENCE_GOVERNED_BOTTLENECK_RESOLUTION_STRATEGY.md`):** Formulated Wald's SPRT with informative Bayesian prior odds $\Lambda_0 \ge 6.907$ ($P_0 \ge 0.999$) for human-verified Philippine VA agencies. Clarified that Shadow is a silent non-publishing hold while Canary is a safe, rate-controlled public exposure state ($C \le 5$ items/tick). Promoting shadow sources to Canary immediately fulfills the founder's directive without flooding downstream systems. Formulated 3-level capacity model and Little's Law fleet sizing ($K^* \in [106, 202]$).
3. **Ashby Canary Provider Support (`packages/scraper/ashby-canary.ts`):** Complete provider profile and candidate row generators with `ASHBY_PROVIDER_ID = "ashby"`, official static documentation evidence URL, and 180-day lease. Exported in scraper index.
4. **Robots Origin Disambiguation for Ashby (`packages/scraper/robotsGate.ts`):** Fixed false `POLICY_BLOCKED` on `api.ashbyhq.com` (401 on root) by mapping to `https://jobs.ashbyhq.com` (200 OK allowing job board paths).
5. **Route Allowlisting & Ingestion Integration:** Added `"ashby:multiplymii"` to `SOURCE_ADMIT_ALLOWLIST` and `SOURCE_PROMOTE_ALLOWLIST`. Configured `targetConfig` in `source-admit.ts` to build `ashby` provider profiles and candidate rows with 2 canary items/tick.
6. **Live Lake Enrollment (`bun run lake:enroll`):** Executed against production; `ashby:multiplymii` admitted with `status: 200`, `outcome: "shadow"`, `probeOutcome: "HEALTHY_WITH_RESULTS"`. Resolved prior HTTP 400 rejection.
7. **Verification:** 1,614 tests pass, typecheck clean, guardrails clean, parameters 100% parity, constitution audit clean, production build clean.

**Follow-on unit:** Observe next hourly shadow-dispatch ticks for clean observation accumulation across Workable and Ashby sources; upon completing qualifying streak, trigger canary promotion to activate bounded publication ($C \le 2-5$ items/tick).

## Prior unit (delivered & deployed)

**Production outage resolved, MATH-04 persistent host cooldown delivered, and GLM measurement reconciled (2026-09-27):**

1. **Homepage Outage Fix (Live 200 OK):** Root cause was 9 `UNION ALL` subqueries exceeding Cloudflare D1's `SQLITE_LIMIT_COMPOUND_SELECT = 5` ceiling. Replaced with single-statement window query bounded by the 9 UI categories (0 compound SELECTs, 12 binds). Deployed Pages build `7338f1f1`, verified live `https://remotejobs-ph.pages.dev/` returning HTTP 200 with 206,975 bytes.
2. **MATH-04 Persistent Host Cooldown:** Migration `0051_shadow_host_backoff.sql` applied to production D1. Dispatcher skips held hosts and respects RFC 9110 Retry-After; skipped probes write no adverse observation rows, protecting the 8-day clean qualifying window.
3. **GLM Findings Reconciliation:** Corrected `measure-first-publication-funnel.ts` and `measure-manila-daily-publications.ts` to enforce complete 7-day Manila windows, separate storage from verified flow, and report unmeasured populations honestly as `null` / `UNKNOWN`. 1,605 tests pass repo-wide.

HRI-04 Batch 1 / MATH-03 measurement slice delivered and deployed on 2026-09-27
(commit `254050d`, CI run `36292899429` success including Pages deploy).

1. **First-publication loss funnel (`scripts/diagnostics/measure-first-publication-funnel.ts`):**
   - Empirical r1 (qualification) -> r2 (authorization) -> r3 (fresh publication) -> r4
      (public consistency) per source, composite yield eta, capacity estimator
      J_hat = sum(lambda * eta), fleet sizing P50/P90. 5-test suite green.
   - Live D1 observation query is implemented but NOT executed from this box
      (no Cloudflare credentials locally); fleet numbers remain estimates until run.
2. **Focused VA cohort runner (`scripts/lake/ingest-focused-va-cohort.ts`):**
   - 12 high-intent ATS seeds (Australian/Dayshift + Global VA) wired to
      `runBulkAtsDiscovery` with 1500ms polite pacing. NOT executed (would live-fetch
      and lake-write); awaiting authorized run with lake credentials.
3. **Hardening in the same slice:**
   - Workable widget API adapter fix (v1 widget endpoint + extractor); live response
      shape unverified — fail-closed (null on mismatch), needs probe evidence.
   - Deterministic publication-receipt timestamp (`decided_at` = batch time).
   - Bad-outcomes shadow gate before canary promotion in remotecom promotion script.
4. **Verification:** 171 pass lake+diagnostics locally; guardrails clean; parameters
   100% parity; constitution pass (4 known residuals); typecheck clean; full CI green.

MATH-06A (Publication Authority & Governance Closure — Findings F1, F2, F4) and Empirical
Manila-Day Publication Measurement completed and verified on 2026-09-27.

1. **Empirical Baseline Measured (`scripts/diagnostics/measure-manila-daily-publications.ts`):**
   - 7-day complete Manila-day audit (2026-09-21 to 2026-09-27): **17.4 fresh jobs/day** average.
   - Floor shortfall: -82.6 fresh jobs/day; Stretch shortfall: -132.6.
   - Separation of fresh flow ($\le 48$h) from one-time graduation stock absorption (95 Breezy, 122 Canonical).
   - Upstream arrival rates for 5 Breezy agencies physically capped at ~3–6 jobs/weekday and 0 on weekends.
2. **Canonical Mathematical Strategy V2 (`docs/strategies/GRADUATED_SOURCES_VISIBILITY_MATHEMATICAL_STRATEGY.md`):**
   - Reconciled all 13 challenges to canonical v5.2 definitions. Zero mathematics theater.
   - Three-level capacity model: $R_{\text{raw}} \to R_{\text{qualified}} \to R_{\text{published}}$.
   - Portfolio scaling (MATH-03): $K^* \ge 106$ active company endpoints needed to reach 100 fresh jobs/day.
3. **Governance & Publication Authority Closure (MATH-06A / F1, F2, F4):**
   - F4: Gateway fallback restricted strictly to `LEGACY_EXACT_SIX_SOURCE_IDS` + legacy pre-SP-01 `unattributed`. All other unregistered sources blocked. Checked `source_opt_outs` before fallback. Enforced `policyExpiry`.
   - F1: Added `buildPublicationReceiptSql` to record idempotent publication receipts in `source_publication_ledger` for every synced candidate batch.
   - F2: Added `fetchD1InventorySnapshot()` in `sync-to-d1.ts` to query real serving inventory before planning auto-publish sources.
4. **Verification:** 1,576 pass / 0 fail repo-wide (160 test files); `typecheck` clean; `apps/web` build clean.

## Optional human research intake — HRI-01/02/03 ACCEPTED; HRI-04 READY

See the [intake plan](../plans/HUMAN_RESEARCH_INTAKE_PLAN.md). Units HRI-01, HRI-02, and HRI-03
are accepted (all 488 directory companies captured in Turso Lake; 138 active ATS endpoints discovered).
With MATH-06A publication authority closure passed, **HRI-04** (shared qualification & publication
controls) is now unblocked and ready for execution.

Refreshed 2026-09-27 for **PROMPT-MATH-PROGRAM-V5.2**.
This pointer is navigation and dated evidence, not policy or a dispatch command.

1. Read the newest entry in [SYSTEM_SAVEPOINT.md](../SYSTEM_SAVEPOINT.md).
2. Use the [maintainer bootloader](MAINTAINER_BOOTLOADER.md) for a fresh session,
   [execution prompt](EXECUTION_PROMPT.md) for a concrete task, and
   [master operating prompt v5.2](MASTER_OPERATING_PROMPT.md) for the full contract.
3. Read the [fusion review](../audits/2026-09-27-PROMPT-FUSION-REVIEW.md) and
   [repository findings](../audits/2026-09-27-REPOSITORY-CHECK.md) before resuming
   publication or source-expansion work.

All three v5.2 prompts explicitly pursue **100 to 150 qualified, unique, fresh
jobs published on the website per day** (100/day floor target; 150/day stretch).
Newest measured 7-day baseline: **18.9 fresh jobs/day** (-81.1 floor gap; prior
measurement 17.4/day, -82.6).

## Mathematical program v5.2

Read the [strategy](../MATHEMATICAL_IMPROVEMENT_STRATEGY.md) and
[plan and working register](../plans/MATHEMATICAL_IMPROVEMENT_PLAN.md).
All 13 challenges have active work cards. Direction:
trustworthy publication and measurement -> stable processing -> resilient source
portfolio -> adaptive control -> measured operation with drift and recovery checks.

## Open operational findings — refresh before acting

- F1/F2/F4 repaired under MATH-06A. Ledger writes, serving inventory snapshots, and exact-six gateway fallbacks are tested and active.
- Public-route eligibility (F5) and quality-sample denominators (F6) remain active review targets.
- **EX-03 Shadow Dispatch 503s (8 consecutive, ~29.5h):** `d1_quota_or_limit`; root cause unconfirmed (D1 read-quota vs Pages resource limit); last shadow observation write 2026-09-26T15:21Z; 3 shadow sources blocked from canary graduation.
- Current active D1 stock: ~1,002 opportunities (WWR 322, RWFA 158, 20Four7VA 131, Canonical 122, Sourcefit 109, Remote OK 55, Jobicy 55, others 50).
- Current Turso Lake discovery (post 2026-09-27 cohort run): 249 ATS endpoints (140 shadow_monitor, 100 auto_rejected, 9 auto_approved).
- [EX-03 run 36277921498](https://github.com/cyalcala/va-freelance-hub/actions/runs/36277921498)
   returned HTTP 503 / `d1_quota_or_limit` at 2026-09-26T22:57:38Z (historical; superseded by the 8-failure streak above).

**Follow-on unit:** Capture the actual shadow-dispatch error via tail + sanctioned EX-03 dispatch, then remediate by error class. Measured fleet requirement remains P50 202 / P90 270 active endpoints toward the 100/day floor.