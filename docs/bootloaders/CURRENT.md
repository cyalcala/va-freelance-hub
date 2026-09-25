# Current resume pointer

**Refreshed 2026-09-25 (EXECUTE: EX-CANARY-INGESTION-MONITORING verified in production, read-only).**
The newest authoritative baton is the 2026-09-25 `EX-CANARY-INGESTION-MONITORING` savepoint entry
in [`../SYSTEM_SAVEPOINT.md`](../SYSTEM_SAVEPOINT.md):
- Post-promotion scrape tick `2026-09-25T11:50:10.753Z` fetched all 5 canaries (`ok=1`, no errors): GitLab 201 items, Grafana Labs 146, Nearform 24, Ghost 6, Time Etc 1. Later ticks correctly cadence-skipped (60-min minimum).
- Publication clamp holds with zero leakage: 50 post-promotion GitLab rows all inactive (`49 policy-rejected/ineligible`, `1 unclear`), 0 active (0 <= cap 2); Grafana Labs 0 new rows (dedup), 0 active; Ghost/Time Etc 1 eligible_likely active each (legacy July).
- Robots evidence: `boards-api.greenhouse.io` 200 at `2026-09-25T00:20:23Z`; Breezy origins 200. Public board `/` and `/opportunities` return 854 open roles, matching D1 (854 eligible, 0 unclear).
- Workable x7 remain correctly held in shadow: HEALTHY_WITH_RESULTS since `2026-09-24T20:15Z`, last seen `2026-09-25T10:20Z`; pre-fix RATE_LIMITED rows still inside the 7-day window, so the constitutional trigger has not yet cleared.

NEXT: EX-WORKABLE-CANARY-READINESS-WATCH: hold Workable in shadow until the 7-day error-free window clears the pre-fix 429s (~Oct 1-2); continue canary observation. Next supply gains come from existing shadow maturation, not new reservoirs.

1. [System savepoint](../SYSTEM_SAVEPOINT.md) — newest current entry first
2. [Master operating prompt](./MASTER_OPERATING_PROMPT.md)
3. [GitLab & Grafana Canary Promotion Evidence](../gauntlet/evidence/SEPTEMBER-25-GITLAB-GRAFANA-CANARY-PROMOTION.md)
4. [Constitutional Source Leak & Geo Repair Evidence](../gauntlet/evidence/SEPTEMBER-25-CONSTITUTIONAL-SOURCE-AND-GEO-REPAIR.md)
5. [Execution state](../APEX_10X_EXECUTION_STATE.md)
6. [Workstream ledger](../APEX_10X_WORKSTREAM_LEDGER.md)
7. [Source health latest](../source-health-latest.md)
8. [Source economics latest](../source-economics-latest.md)

Production Reality Baseline (2026-09-25):
- **Active Supply Truth**: 854 active opportunities in production D1 (100% eligible: 745 `eligible_likely`, 109 `eligible_verified`, 0 `unclear`).
- **Flow Truth**: 28.86 qualified jobs/day (202 net-new in 7d, snapshot `2026-09-25T10-33-43-612Z.json`).
- **Canary Sources (5 Sources)**:
  - `greenhouse:ghost` (cap: 2) -> `operational_state = 'canary'`
  - `greenhouse:nearform` (cap: 2) -> `operational_state = 'canary'`
  - `greenhouse:gitlab` (cap: 2) -> `operational_state = 'canary'`
  - `greenhouse:grafanalabs` (cap: 2) -> `operational_state = 'canary'`
  - `breezy:time-etc` (cap: 1) -> `operational_state = 'canary'`
- **Active Production Sources (5 Sources)**:
  - `breezy:20four7va` (126 active jobs in D1)
  - `breezy:sourcefit` (84 active remote jobs in D1, 22 onsite BPO jobs deactivated)
  - `breezy:remote-craft` (14 active jobs)
  - `breezy:yokly` (11 active jobs)
  - `breezy:value-virtual-assistants` (9 active jobs)
- **EX-CANARY-INGESTION**: canary fetch path enabled (`isEnabledForFetch`), registry merge covers `active`+`canary`, publication clamp (`canaryClampedProposal`) enforces per-tick caps.
- **Quarantined**: `teamtailor:career.teamtailor.com` (`health_quarantine`, HTTP 404 endpoint failure).
- **Registry Truth**: 5 active / 5 canary / 10 shadow / 14 candidate / 1 quarantined = 35 total sources.
- **Migration Truth**: Migrations 0000–0047 applied.
- **EX-03 Shadow Dispatch**: Run 36110303012 succeeded cleanly (HTTP 200, healthy).



