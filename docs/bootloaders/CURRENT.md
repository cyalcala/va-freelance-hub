# Current resume pointer

**Refreshed 2026-09-25 (EXECUTE: FIX-BREEZY-ONSITE-AND-GATE-RECOVERY verified and ready to deploy).**
The newest authoritative baton is the 2026-09-25 `FIX-BREEZY-ONSITE-AND-GATE-RECOVERY` savepoint entry
in [`../SYSTEM_SAVEPOINT.md`](../SYSTEM_SAVEPOINT.md):
- Merged PR #150 / `codex/master-operating-prompt` into `main` (`9f2871a`).
- Executed stratified audit of the largest 7-day unclear loss cohorts (Sourcefit 46, 20Four7VA 37).
- Authored planning decision (`PLANNING_DECISION_UNCLEAR_SUPPLY_RECOVERY_2026-09-25.md`).
- Fixed Breezy parser onsite detection (`is_remote: false` -> `onsite`).
- Hoisted `ONSITE_TITLE_REGEX` to Step 0 in `geoGate.ts`.
- Restored `phEligibility` assignment in `recoverGateEligiblePending`.
- Authored Migration 0046 (`0046_reconcile_breezy_onsite_and_unclear_eligibility.sql`).
- All 1,423 tests pass, typecheck clean, guardrails clean, build clean.

NEXT: Commit unit, apply Migration 0046 via D1 remote, push to `origin/main`, and inspect deployment CI.

1. [System savepoint](../SYSTEM_SAVEPOINT.md) — newest current entry first
2. [Master operating prompt](./MASTER_OPERATING_PROMPT.md)
3. [September 24 Graduation Evidence](../gauntlet/evidence/SEPTEMBER-24-PRODUCTION-GRADUATION.md)
4. [Execution state](../APEX_10X_EXECUTION_STATE.md)
5. [Workstream ledger](../APEX_10X_WORKSTREAM_LEDGER.md)
6. [Source health latest](../source-health-latest.md)
7. [Source economics latest](../source-economics-latest.md)

Historical Production Reality (2026-09-24, verified in D1 after Run 80; the
EX-03 failure item below was since diagnosed and the registry counts reverified
on 2026-09-25):
- **Canary -> Active Graduation EXECUTED (5 Sources)** (transition events 27–31, 2026-09-24T01:59Z):
  - `breezy:20four7va` (126 active jobs in D1)
  - `breezy:sourcefit` (110 active jobs)
  - `breezy:remote-craft` (14 active jobs)
  - `breezy:value-virtual-assistants` (9 active jobs)
  - `breezy:yokly` (11 active jobs)
  All 5 now `operational_state = 'active'`, fetched hourly, publishing on the live board. ~270 active PH jobs verified end-to-end.
- **EX-CANARY-INGESTION (Run 80) TERMINAL — KEEP**: canary fetch path enabled (`isEnabledForFetch`), registry merge covers `active`+`canary`, publication clamp (`canaryClampedProposal`) prevents cap-breach rollback. Code `c637146`, CI run `35990129865`.
- **No canary rows currently in D1**: the previously claimed "Shadow -> Canary Promotion" of ghost/nearform/time-etc did NOT land (no transition events); those 3 remain `shadow`. That promotion is the natural next unit.
- **Quarantined**: `teamtailor:career.teamtailor.com` (`health_quarantine`, 2026-09-24T02:02Z, HTTP 404 endpoint failure).
- **Registry Truth**: 5 active / 15 shadow / 14 candidate / 1 quarantined.
- **Migration 0044 Verified**: `packages/db/migrations/0044_canary_to_active_graduation.sql` establishes the constitutional active graduation gate. Migrations 0000–0045 applied.
- **Remaining Known Issue**: EX-03 Shadow Dispatch CI failing 7 of last 8 runs since 2026-09-23 — diagnose via Cloudflare Pages function logs before changing anything.


