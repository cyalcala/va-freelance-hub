# Current resume pointer

**Refreshed 2026-09-26 (REMOVE-NEW-BADGE deployed; fresh views + Manila dates intact).**
Newest baton: top entry of [`../SYSTEM_SAVEPOINT.md`](../SYSTEM_SAVEPOINT.md). Behavior commit `6e388c2`, CI run `36211413069` all-success with Pages deploy.

NEXT: verify badge-free board live; then remotecom re-eval after 18:20Z; Workable-pacing diagnostic.

---
*Prior pointer (2026-09-25) preserved below.*

**Refreshed 2026-09-25 (EXECUTE: FEAT-HIMALAYAS-ADAPTER-AND-OPERATING-PROMPT-FUSION executed, deployed, verified in production).**
The newest authoritative baton is the 2026-09-25 `FEAT-HIMALAYAS-ADAPTER-AND-OPERATING-PROMPT-FUSION` savepoint entry
in [`../SYSTEM_SAVEPOINT.md`](../SYSTEM_SAVEPOINT.md):
- Unified canonical master operating prompt fused from strategy777.txt and strategy888.txt and updated in [`./MASTER_OPERATING_PROMPT.md`](./MASTER_OPERATING_PROMPT.md).
- Complete pure Himalayas remote jobs adapter implemented in `packages/scraper/himalayas.ts`, `packages/scraper/himalayas-canary.ts`, and `packages/scraper/himalayas.test.ts` (6/6 tests pass); `candidate-shadow.ts` updated to recognize `applicationLink`/`guid` fields (40/40 tests pass).
- Full verification: 1,441 test assertions pass, typecheck clean, audit:guardrails clean, build clean. Deployed via CI run `36145151976` (commit `608ef3c`).
- Production D1 truth: 856 active opportunities (746 `eligible_likely`, 110 `eligible_verified`, 0 `unclear`), HTTP 200 on public board. Registry 5/5/10/14/1 = 35 total.

Prior baton (2026-09-25 `EX-CANARY-EVAL-REMOTECOM-WIKIMEDIA`, still valid background):
- `greenhouse:remotecom` (15 qualifying obs, 13.46d span, max 180) and `greenhouse:wikimedia` (14 obs, ~13.5d, max 17) deferred on single transient `UNREACHABLE`s inside qualifying window; remain `shadow`.

NEXT: EX-WORKABLE-CANARY-READINESS-WATCH: hold Workable in shadow until the 7-day error-free window clears the pre-fix 429s (~Oct 1-2); continue canary observation; stage admission evaluation for `himalayas:remote-jobs` into `source_registry` as shadow candidate under ADR-006/007.

1. [System savepoint](../SYSTEM_SAVEPOINT.md) — newest current entry first
2. [Master operating prompt](./MASTER_OPERATING_PROMPT.md)
3. [GitLab & Grafana Canary Promotion Evidence](../gauntlet/evidence/SEPTEMBER-25-GITLAB-GRAFANA-CANARY-PROMOTION.md)
4. [Constitutional Source Leak & Geo Repair Evidence](../gauntlet/evidence/SEPTEMBER-25-CONSTITUTIONAL-SOURCE-AND-GEO-REPAIR.md)
5. [Execution state](../APEX_10X_EXECUTION_STATE.md)
6. [Workstream ledger](../APEX_10X_WORKSTREAM_LEDGER.md)
7. [Source health latest](../source-health-latest.md)
8. [Source economics latest](../source-economics-latest.md)

Production Reality Baseline (2026-09-25):
- **Active Supply Truth**: 856 active opportunities in production D1 (100% eligible: 746 `eligible_likely`, 110 `eligible_verified`, 0 `unclear`).
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



