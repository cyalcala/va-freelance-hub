# Current resume pointer

**Refreshed 2026-09-26 (~15:30Z, CANONICAL-SHADOW-CLOCK).**
Newest baton: top entry of [`../SYSTEM_SAVEPOINT.md`](../SYSTEM_SAVEPOINT.md).
- Canonical's public board is about 568 KB. The 512 KiB shadow budget rejected it. The accepted ceiling is now 1 MiB.
- A local probe returned `HEALTHY_WITH_RESULTS` (200 sampled items).
- `lake:enroll` admits auto-approved sources and requests canary. The gateway still requires 8 healthy shadow days over 7 days.
- Production admit succeeded after deploy. `greenhouse:canonical` is `shadow`. Canary promotion returned 409 until 8 healthy shadow days exist.

NEXT: Let the hourly shadow clock collect those days. `lake:enroll` promotes Canonical when the gateway allows.

---
*Prior pointer preserved below.*

**Refreshed 2026-09-26 (~15:15Z, AUTO-PUBLISH-CANONICAL-122).**
Newest baton: top entry of [`../SYSTEM_SAVEPOINT.md`](../SYSTEM_SAVEPOINT.md).
- The 122 `greenhouse:canonical` qualified jobs are on production D1. No human approval flag. Wilson lower bound was 34.5% against a 20% floor.
- Live board after the insert: 1,026 active. Canonical is 11.9%. We Work Remotely fell from 36.8% to 32.5% and is still above the 25% source ceiling.
- Hourly publish and a daily 25-domain probe are in `gha-lake-publish.yml`. Kill switch: `lake:sync --hold-auto-approved`.
- These rows are active supply. August posting dates mean they are not today's fresh-discovery flow.

NEXT: Watch the first scheduled `gha-lake-publish` run.

---
*Prior pointer preserved below.*

**Refreshed 2026-09-26 (~14:50Z, P1-P2-METRIC-AND-QUEUE-ENFORCEMENT).**
Newest baton: top entry of [`../SYSTEM_SAVEPOINT.md`](../SYSTEM_SAVEPOINT.md).
- P1: unknown posting dates are `OTHER_NON_FRESH`. An empty `adjudication_audit_samples` set is `UNKNOWN`, not a 0% error rate. Migration `0050` adds that table. `bun run audit:constitution` enforces the contract.
- P2: `scripts/ci/queue-metrics.ts` implements depth evolution, residence percentiles, stability (`service > arrival`), and Little's law only when interarrival CV is known and `<= 1`.
- Not done: no `greenhouse:canonical` D1 sync. `greenhouse:remotecom` was still inside its shadow window at `2026-09-26T14:47:58Z` (gate `2026-09-26T18:20:56Z`). Flow gap was not re-measured.
- Residuals named in [`../ENFORCEMENT.md`](../ENFORCEMENT.md) §8: no replay column, no concentration publication brake, 70/30 still prose.

NEXT: Adjudicate at least 50 published opportunities into `adjudication_audit_samples` and run `measureGroundTruth` before any canonical sync or remotecom promotion.

---
*Prior pointer preserved below.*

**Refreshed 2026-09-26 (~13:15Z, MOC-V3-ACTIVATION-AND-METRIC-SEMANTICS-P0; Master Operating Constitution v3.0 codified, P0 metric semantics resolved).**
Newest baton: top entry of [`../SYSTEM_SAVEPOINT.md`](../SYSTEM_SAVEPOINT.md).
- Master Operating Constitution v3.0 codified in [`../MASTER_OPERATING_CONSTITUTION.md`](../MASTER_OPERATING_CONSTITUTION.md) per owner approval ("Proceed in this. Act in all of this. All approved.").
- P0 Metric Semantic Correctness implemented in [`../METRICS.md`](../METRICS.md): replaced overlapping subtractive formula with mutually exclusive cohort partition (`FRESH_DISCOVERY`, `BACKLOG_IMPORT`, `REACTIVATION`, `REPLAY_RECOVERY`, `OTHER_NON_FRESH`); decoupled classifier output from ground-truth adjudication quality error rates (Query 3A vs 3B); codified Part IX metric validity specifications.
- Part V Current State Report codified in [`../architecture/CURRENT_STATE.md`](../architecture/CURRENT_STATE.md) (25 labeled telemetry dimensions; binding constraint identified as 66.57 jobs/day flow gap).
- Full verification: 100% parameter parity (`audit:parameters`), repo guardrails clean (`audit:guardrails`), orchestrator modification guard clean (`audit:orchestrator`).

NEXT: Review P1 High-risk paper-system remediation and P2 Queue instrumentation / Canary graduation candidates (`greenhouse:canonical` preview sync and `greenhouse:remotecom` shadow window review).

---
*Prior pointer preserved below.*

**Refreshed 2026-09-26 (~03:00Z, SHADOW-DISPATCH-SKIP-ON-429 + prompt v3.1; skip-on-429 implemented, master prompt upgraded to v3.1).**
Newest baton: top entry of [`../SYSTEM_SAVEPOINT.md`](../SYSTEM_SAVEPOINT.md). Evidence `docs/gauntlet/evidence/SHADOW-DISPATCH-SKIP-ON-429-2026-09-26.md`.
- `shadow-dispatcher.ts`: `DISPATCHER_VERSION = "2.1.0"`, `rateLimitedHosts` run-scoped tracking, subsequent same-host probes skipped to prevent multi-429 burst penalties in same window; verified 39/0 narrow, 1,464/0 full.
- Master operating prompt: upgraded to Autonomous Operating Prompt v3.1 (`docs/bootloaders/MASTER_OPERATING_PROMPT.md`).

NEXT: re-evaluate `greenhouse:remotecom` shadow→canary after 2026-09-26T18:20Z (bad-outcomes query FIRST); observe live shadow dispatch for `skippedRateLimitedHost` metric. No early promotion, no unapproved lake live sync.

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



