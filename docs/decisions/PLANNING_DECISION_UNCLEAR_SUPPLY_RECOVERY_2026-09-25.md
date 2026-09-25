# Planning Decision: Reconcile Expansion Ledgers and Authorize Unclear Supply Recovery

**Decision Date:** 2026-09-25  
**Auditor / Architect:** Antigravity / Codex  
**Status:** ACCEPTED (Planning Contract)  
**Authority:** Master Operating Prompt §2 ("PLAN: Produce bounded contracts and reconcile the canonical queue"), §5 ("Supply strategy: measure, recover, expand, sustain"), §8 ("Improvement loop"), and ADR-007.

---

## 1. Context and Baseline

A multi-step preflight and D1 measurement on 2026-09-25 established the following facts:
1. **PR #150 Merged & Deployed (`9f2871a`):**
   - Provenance fields (findings #1, #3, #4) and the versioned daily economics snapshot pipeline are live on Cloudflare Pages and the Freshness Cron Worker.
   - First live snapshot `docs/economics-snapshots/snapshots/2026-09-25T08-08-32-705Z.json` confirmed 120 qualified new / 7d (17.14/day), 867 qualified active / 1,108 all active.
2. **Expansion Ledgers Outdated:**
   - `docs/APEX_10X_EXECUTION_STATE.md` and `docs/APEX_10X_WORKSTREAM_LEDGER.md` retained dated September 11/19 references claiming the 5 Breezy sources (`20four7va`, `sourcefit`, `remote-craft`, `value-virtual-assistants`, `yokly`) were in canary with a cap of 2/tick.
   - Production D1 truth: all 5 graduated to `operational_state = 'active'` on 2026-09-24 via Migration 0044. 0 canaries exist in D1.
   - `teamtailor:career.teamtailor.com` was quarantined (`health_quarantine`) due to HTTP 404 endpoint failure.
3. **Largest Unclear Loss Cohort Demonstrated:**
   - As documented in [`docs/audits/STRATIFIED_UNCLEAR_LOSS_AUDIT_2026-09-25.md`](../audits/STRATIFIED_UNCLEAR_LOSS_AUDIT_2026-09-25.md), Sourcefit (47) and 20Four7VA (37) account for 83.2% of the 7-day unclear losses.
   - 22 Sourcefit jobs were identified as onsite BPO positions (`Remote: no.`), representing an active policy violation that must be deactivated.
   - 85 jobs (33 Sourcefit + 52 20Four7VA) were verified as genuine remote positions accessible to Filipinos, held in `unclear` status due to pipeline drop of deterministic gate verdicts.

---

## 2. Planning Reconciliations

### A. Ledger Reconciliations
- `docs/APEX_10X_EXECUTION_STATE.md` is updated to record the current D1 registry truth (5 active, 0 canary, 15 shadow, 14 candidate, 1 quarantined) and the baseline of 120 / 7d (17.14/day).
- `docs/APEX_10X_WORKSTREAM_LEDGER.md` is updated: `EX-BREEZY` is marked `DONE_VERIFIED` (Graduated to Active via Migration 0044); `EX-05 Teamtailor` is marked `QUARANTINED`.
- The stale SP-10..SP-15 historical queue remains terminal; the Source Perpetuity program is bound by current live D1 registry state.

### B. Problem Statement for Next Execution Unit
The largest bottleneck preventing qualified daily inflow from reaching the 100/day floor is not lack of scraping activity, but a **demonstrated classification and publication defect** in the Breezy ingestion and fallback pipeline:
1. `fetchBreezy` ignores `is_remote: false`, letting onsite positions enter the system as "remote".
2. `geoGate` matches positive Philippine keywords before checking onsite/hybrid markers, allowing onsite jobs in Manila/Cebu to receive `ph_only` verdicts.
3. `buildPendingTriageItem` and `recoverGateEligiblePending` drop `gate.phEligibility` (`eligible_verified` / `eligible_likely`) and freeze listings as `unclear`, blocking them from `/jobs/[id]`, `sitemap.xml`, and the economics KPI.

---

## 3. Implementation Contract: Bounded Fix

The next production-changing unit is authorized under the following contract:

```text
Unit: FIX-BREEZY-ONSITE-AND-GATE-RECOVERY
Queue reference: APEX-10X Priority 4 / Master Operating Prompt §8
Mode: EXECUTE
Start SHA: 9f2871a (main branch tip)
Target Files:
  - packages/scraper/ats.ts
  - packages/scraper/ats.test.ts (or breezy-canary.test.ts)
  - packages/scraper/geoGate.ts
  - packages/scraper/geoGate.test.ts
  - apps/web/src/pages/api/cron/scrape.ts
  - apps/web/tests/pending-recovery.test.ts
  - packages/db/migrations/0046_reconcile_breezy_onsite_and_unclear_eligibility.sql

Changes:
  1. In packages/scraper/ats.ts (fetchBreezy):
     - When `remoteSignals.length > 0 && !remoteSignals.some(Boolean)`, set `locationType: "onsite"` and append `(onsite)` to `locationRaw`.
  2. In packages/scraper/geoGate.ts (geoGate):
     - Check `ONSITE_TITLE_REGEX` before returning PH positive matches. If `title` or `locationRaw` explicitly marks the job as onsite/hybrid, return `ineligible` ("Onsite/hybrid marker in structured field").
  3. In apps/web/src/pages/api/cron/scrape.ts:
     - In `buildPendingTriageItem`: preserve `gate.phEligibility` instead of hardcoding `"unclear"`.
     - In `recoverGateEligiblePending`: update `phEligibility` to match the gate tier: `eligible_verified` for `ph_only`, and `eligible_likely` for `worldwide` / `apac_incl_ph`.
  4. Migration 0046:
     - Deactivate the 22 onsite Sourcefit jobs (`is_active = 0, inactive_reason = 'policy-rejected', ph_eligibility = 'ineligible', location_type = 'onsite'`).
     - Upgrade verified active remote Sourcefit rows (where `description LIKE '%Remote: yes%'`) to `ph_eligibility = 'eligible_verified'`.
     - Upgrade verified active remote 20Four7VA rows (where `description LIKE '%Remote: yes%'`) to `ph_eligibility = 'eligible_likely'`.

Acceptance Criteria:
  - `bun run test` passes (all unit tests for ats, geoGate, pending-recovery).
  - Onsite jobs in PH are proven rejected by new geoGate unit test.
  - Breezy feed parser test verifies `(onsite)` and `locationType = "onsite"` for non-remote jobs.
  - `recoverGateEligiblePending` test verifies that `phEligibility` is restored to `eligible_verified` / `eligible_likely`.
  - Zero regression on existing 1,416 tests.
  - Migration 0046 verified against D1 schema.
```

---

## 4. Rollback and Stop Conditions

- **Stop Condition:** If any migration or code change alters the classification of non-Breezy sources or breaks the G3 test suite, halt immediately and revert.
- **Rollback Point:** `9f2871a`.
- **Expected Outcome:** Immediately recovers ~80 qualified net-new remote jobs for Filipino freelancers while removing 22 onsite violations, advancing daily qualified supply toward 25–30/day on the existing active sources.
