# Current resume pointer

**Refreshed 2026-09-25 (EXECUTE: EX-CANARY-PROMOTION-GHOST-NEARFORM-TIME-ETC executed and verified in production).**
The newest authoritative baton is the 2026-09-25 `EX-CANARY-PROMOTION-GHOST-NEARFORM-TIME-ETC` savepoint entry
in [`../SYSTEM_SAVEPOINT.md`](../SYSTEM_SAVEPOINT.md):
- Evaluated and promoted three mature defect-free shadow sources (`greenhouse:ghost` [cap 2], `greenhouse:nearform` [cap 2], `breezy:time-etc` [cap 1]) to Canary.
- All three verified in remote production D1 with operational_state = 'canary', valid leases through 2027, 0 errors, and spans of 12.00–13.44 days.
- Jev 1.13 decision trace confirmed `Variant_A` (promote to canary, confidence 0.73).
- Applied typed transition via `scripts/graduation/promote-proven-shadow-canary.ts` using `decideTypedTransition`.
- Registry counts in remote D1: 5 active / 3 canary / 12 shadow / 14 candidate / 1 quarantined = 35 total sources.
- Full verification: 1,422 tests pass, typecheck clean, guardrails clean, build Complete. Site returns 200 OK.

NEXT: Monitor next scheduled hourly scrape tick to verify canary fetch ingestion and clamp enforcement for Ghost, Nearform, and Time Etc.

1. [System savepoint](../SYSTEM_SAVEPOINT.md) — newest current entry first
2. [Master operating prompt](./MASTER_OPERATING_PROMPT.md)
3. [September 25 Canary Promotion Evidence](../gauntlet/evidence/SEPTEMBER-25-CANARY-PROMOTION.md)
4. [September 24 Graduation Evidence](../gauntlet/evidence/SEPTEMBER-24-PRODUCTION-GRADUATION.md)
5. [Execution state](../APEX_10X_EXECUTION_STATE.md)
6. [Workstream ledger](../APEX_10X_WORKSTREAM_LEDGER.md)
7. [Source health latest](../source-health-latest.md)
8. [Source economics latest](../source-economics-latest.md)

Historical Production Reality (2026-09-25):
- **Canary Promotion EXECUTED (3 Sources)** (2026-09-25T09:23Z):
  - `greenhouse:ghost` (cap: 2) -> `operational_state = 'canary'`
  - `greenhouse:nearform` (cap: 2) -> `operational_state = 'canary'`
  - `breezy:time-etc` (cap: 1) -> `operational_state = 'canary'`
- **Active Production Sources (5 Sources)**:
  - `breezy:20four7va` (126 active jobs in D1)
  - `breezy:sourcefit` (82 active remote jobs in D1, 22 onsite BPO jobs deactivated)
  - `breezy:remote-craft` (14 active jobs)
  - `breezy:value-virtual-assistants` (9 active jobs)
  - `breezy:yokly` (11 active jobs)
- **EX-CANARY-INGESTION**: canary fetch path enabled (`isEnabledForFetch`), registry merge covers `active`+`canary`, publication clamp (`canaryClampedProposal`) enforces per-tick caps.
- **Quarantined**: `teamtailor:career.teamtailor.com` (`health_quarantine`, HTTP 404 endpoint failure).
- **Registry Truth**: 5 active / 3 canary / 12 shadow / 14 candidate / 1 quarantined.
- **Migration Truth**: Migrations 0000–0046 applied.
- **EX-03 Shadow Dispatch**: Run 36110303012 succeeded cleanly (HTTP 200, healthy).


