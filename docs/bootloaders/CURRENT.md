# Current resume pointer

**Refreshed 2026-09-25 (EXECUTE: FIX-CONSTITUTIONAL-ACTIVE-SOURCE-LEAK-AND-TITLE-GEO-GATE executed and verified).**
The newest authoritative baton is the 2026-09-25 `FIX-CONSTITUTIONAL-ACTIVE-SOURCE-LEAK-AND-TITLE-GEO-GATE` savepoint entry
in [`../SYSTEM_SAVEPOINT.md`](../SYSTEM_SAVEPOINT.md):
- Rectified 223 active opportunities from non-promoted candidate/shadow sources (`ashby:*`, `greenhouse:gitlab/remotecom/grafanalabs`) remaining from legacy summer scraping.
- Resolved title-level geoGate blind spots on multipart parentheticals (`(Perm, UK, Remote)`, `(Perm, Canada, Remote)`, etc.) and pipe segments (`| United States | Remote`, `| CA | Remote`).
- Upgraded genuine Philippine Yokly provincial positions (`bohol, PH`, `Luzon, PH`, etc.) to `eligible_verified`.
- Gated `reactivateFeedConfirmedJobs` with `inArray(opportunities.phEligibility, ["eligible_verified", "eligible_likely"])`.
- Authored and verified Migration 0047 to ensure 100% of public board jobs are constitutionally eligible.
- Full verification: 1,429 tests pass, typecheck clean, guardrails clean, build Complete.

NEXT: Commit, push to origin/main, verify deployment run, and observe live migration 0047 execution in remote production D1.

1. [System savepoint](../SYSTEM_SAVEPOINT.md) — newest current entry first
2. [Master operating prompt](./MASTER_OPERATING_PROMPT.md)
3. [Constitutional Source Leak & Geo Repair Evidence](../gauntlet/evidence/SEPTEMBER-25-CONSTITUTIONAL-SOURCE-AND-GEO-REPAIR.md)
4. [September 25 Canary Promotion Evidence](../gauntlet/evidence/SEPTEMBER-25-CANARY-PROMOTION.md)
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


