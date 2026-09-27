# Current resume pointer

## Active bounded unit

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
Measured 7-day baseline: **17.4 fresh jobs/day** (-82.6 floor gap).

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
- Current Turso Lake discovery: 238 ATS endpoints (140 shadow_monitor, 97 auto_rejected, 1 auto_approved).

**Follow-on unit:** HRI-04 / SOURCING-PORTFOLIO-SCALING (MATH-03).
Enroll Batch 1 high-intent candidates from `lake_ats_discovery` (63 Philippine & Australian dedicated agency endpoints) into shadow observation and canary graduation to bridge the -82.6 jobs/day gap toward the 100/day floor.
