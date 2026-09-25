# Current resume pointer

**Refreshed 2026-09-25 (EXECUTE: EX-CANARY-PROMOTION-GITLAB-GRAFANA-AND-WORKABLE-AUDIT executed & verified in production).**
The newest authoritative baton is the 2026-09-25 `EX-CANARY-PROMOTION-GITLAB-GRAFANA-AND-WORKABLE-AUDIT` savepoint entry
in [`../SYSTEM_SAVEPOINT.md`](../SYSTEM_SAVEPOINT.md):
- Audited all 7 Workable PH agencies against Migration 0044 trigger invariants; discovered pre-fix burst rate limiting (`bad_count = 62-64`, last seen 2026-09-24T20:15Z). Since polite delay deployment, 100% HEALTHY_WITH_RESULTS achieved. Workable strictly held in shadow to naturally accumulate its required 7-day error-free span per constitutional trigger without artificial bypass.
- Promoted proven, defect-free Tier A sources `greenhouse:gitlab` (cap 2) and `greenhouse:grafanalabs` (cap 2) to Canary via atomic trigger execution into `source_transition_events`. Both verified with 15 qualifying dates in 14d, 13.5d clean spans, 0 errors, unexpired 2027 leases.
- Evaluated options via Jev 1.13 (`Variant_A`, confidence 0.98, prob 0.99).
- Verified remote D1 truth: 5 active / 5 canary / 10 shadow / 14 candidate / 1 quarantined = 35 total sources.

NEXT: EX-CANARY-INGESTION-MONITORING: Monitor next scheduled hourly scrape tick (Worker cron) to verify canary fetch ingestion, robots checking, and publication clamp enforcement for GitLab and Grafana Labs.

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



