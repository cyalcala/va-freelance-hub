# Current resume pointer

**Refreshed 2026-09-25 (EXECUTE: FIX-CONSTITUTIONAL-ACTIVE-SOURCE-LEAK-AND-TITLE-GEO-GATE deployed & verified in production).**
The newest authoritative baton is the 2026-09-25 `FIX-CONSTITUTIONAL-ACTIVE-SOURCE-LEAK-AND-TITLE-GEO-GATE` savepoint entry
in [`../SYSTEM_SAVEPOINT.md`](../SYSTEM_SAVEPOINT.md):
- Rectified 223 active opportunities from non-promoted candidate/shadow sources (`ashby:*`, `greenhouse:gitlab/remotecom/grafanalabs`) remaining from legacy summer scraping.
- Resolved title-level geoGate blind spots on multipart parentheticals (`(Perm, UK, Remote)`, `(Perm, Canada, Remote)`, etc.) and pipe segments (`| United States | Remote`, `| CA | Remote`).
- Upgraded genuine Philippine Yokly provincial positions (`bohol, PH`, `Luzon, PH`, etc.) to `eligible_verified`.
- Gated `reactivateFeedConfirmedJobs` with `inArray(opportunities.phEligibility, ["eligible_verified", "eligible_likely"])`.
- Deployed commit `323e50c` via Sovereign CI run 36120849935; remote D1 applied Migration 0047 at 2026-09-25 09:53:29.
- Verified remote D1 truth: 854 active jobs, 100% constitutionally eligible (745 `eligible_likely`, 109 `eligible_verified`), 0 unclear active.
- Measured clean supply via versioned economics snapshot `2026-09-25T10-33-43-612Z.json`: 202 net-new in 7d = **28.86 jobs/day** (up from 17.14/day).

NEXT: EX-CANARY-PROMOTION-WORKABLE-PH-AGENCIES: Prepare staged Canary promotion for mature, defect-free Workable Philippine VA agencies (Coconut VA, CrewBloom, Hello Rache, Hunt St, Pearl Talent, Pineapple Staffing, RocketAMS; 11–13 qualifying observation dates, 12–14d spans, 0 errors, unexpired 2027 leases).

1. [System savepoint](../SYSTEM_SAVEPOINT.md) — newest current entry first
2. [Master operating prompt](./MASTER_OPERATING_PROMPT.md)
3. [Constitutional Source Leak & Geo Repair Evidence](../gauntlet/evidence/SEPTEMBER-25-CONSTITUTIONAL-SOURCE-AND-GEO-REPAIR.md)
4. [September 25 Canary Promotion Evidence](../gauntlet/evidence/SEPTEMBER-25-CANARY-PROMOTION.md)
5. [Execution state](../APEX_10X_EXECUTION_STATE.md)
6. [Workstream ledger](../APEX_10X_WORKSTREAM_LEDGER.md)
7. [Source health latest](../source-health-latest.md)
8. [Source economics latest](../source-economics-latest.md)

Production Reality Baseline (2026-09-25):
- **Active Supply Truth**: 854 active opportunities in production D1 (100% eligible: 745 `eligible_likely`, 109 `eligible_verified`, 0 `unclear`).
- **Flow Truth**: 28.86 qualified jobs/day (202 net-new in 7d, snapshot `2026-09-25T10-33-43-612Z.json`).
- **Canary Sources (3 Sources)**:
  - `greenhouse:ghost` (cap: 2) -> `operational_state = 'canary'`
  - `greenhouse:nearform` (cap: 2) -> `operational_state = 'canary'` (clamp verified live in tick `09:30:10Z`)
  - `breezy:time-etc` (cap: 1) -> `operational_state = 'canary'`
- **Active Production Sources (5 Sources)**:
  - `breezy:20four7va` (126 active jobs in D1)
  - `breezy:sourcefit` (84 active remote jobs in D1, 22 onsite BPO jobs deactivated)
  - `breezy:remote-craft` (14 active jobs)
  - `breezy:yokly` (11 active jobs)
  - `breezy:value-virtual-assistants` (9 active jobs)
- **EX-CANARY-INGESTION**: canary fetch path enabled (`isEnabledForFetch`), registry merge covers `active`+`canary`, publication clamp (`canaryClampedProposal`) enforces per-tick caps.
- **Quarantined**: `teamtailor:career.teamtailor.com` (`health_quarantine`, HTTP 404 endpoint failure).
- **Registry Truth**: 5 active / 3 canary / 12 shadow / 14 candidate / 1 quarantined = 35 total sources.
- **Migration Truth**: Migrations 0000–0047 applied.
- **EX-03 Shadow Dispatch**: Run 36110303012 succeeded cleanly (HTTP 200, healthy).



