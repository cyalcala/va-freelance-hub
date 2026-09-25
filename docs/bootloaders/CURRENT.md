# Current resume pointer

**Refreshed 2026-09-25 (EXECUTE: PR #150 merged and production deployment confirmed).**
The newest authoritative baton is the 2026-09-25 PR-150-MERGE savepoint entry
in [`../SYSTEM_SAVEPOINT.md`](../SYSTEM_SAVEPOINT.md): PR #150 was merged
(merge commit `a40a09d`, 2026-09-25T07:51:43Z) after both release
prerequisites were re-verified, and the deployment was confirmed by inspected
run evidence — Sovereign CI run 36109825168 (Validate/Detect/Migrate-and-deploy
production all success) and Worker deploy run 36109825135, both on `a40a09d`.
Shadow verdict 1.1.0 provenance fields and the economics-snapshot wiring are
now live but not yet exercised in production. The master operating prompt is
[`./MASTER_OPERATING_PROMPT.md`](./MASTER_OPERATING_PROMPT.md). Do not act on
the historical graduation material below without first reading the savepoint.

NEXT: investigate the largest recoverable losses (Sourcefit 46, 20Four7VA 37
unclear / 7d) via a bounded evidence-only stratified audit; reconcile stale
SP/expansion-ledger pointers. The open Jev verdict observation stays pending.

The later PROMPT-AUTOMATION-REVISION entry records a documentation-only improvement
and a preserved 02:31:49Z economics snapshot (117/7d, 16.71/day proxy). Its
proposed automation and Jev expansion are not deployed behavior. The production
observation remains open; a rare Tier-2 case need not block independent
authorized planning/measurement work. See the
[automation prompt audit](../audits/MASTER_PROMPT_AUTOMATION_REVIEW_2026-09-25.md).

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


