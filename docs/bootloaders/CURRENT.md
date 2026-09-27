# Current resume pointer

## Active bounded unit

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
   - Floor shortfall: -82.6 fresh jobs/day; Stretch shortfall: -132.6 fresh jobs/day.
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
- [EX-03 run 36277921498](https://github.com/cyalcala/va-freelance-hub/actions/runs/36277921498)
  returned HTTP 503 / `d1_quota_or_limit` at 2026-09-26T22:57:38Z.
- Current active D1 stock: 1,002 opportunities (WWR 322, RWFA 158, 20Four7VA 131, Canonical 122, Sourcefit 109, Remote OK 55, Jobicy 55, others 50).
- Current Turso Lake discovery (post 2026-09-27 cohort run): 249 ATS endpoints (140 shadow_monitor, 100 auto_rejected, 9 auto_approved).
- MATH-04 live finding (2026-09-27): 6 admitted Workable shadow sources cannot
  graduate — residual RATE_LIMITED observations reset the zero-tolerance 8-day
  qualifying window; shadow dispatcher lacks host-aware 429 backoff.

**Follow-on unit:** MATH-04 host-aware 429 backoff in the shadow dispatcher
(per this pointer's active unit above). After canary graduation, lake:sync flows
canary output to D1; measured fleet requirement remains P50 202 / P90 270 active
endpoints toward the 100/day floor.
