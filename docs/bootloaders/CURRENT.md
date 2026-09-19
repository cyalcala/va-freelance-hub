# Current resume pointer

**RESUMED by owner.** Explicit owner authorization granted on 2026-09-11 to resume
the autonomous source-expansion mission toward the Prime Directive:
sustaining 100–150 qualified net-new remote Filipino-accessible jobs/day.

1. [Execution state](../APEX_10X_EXECUTION_STATE.md)
2. [Workstream ledger](../APEX_10X_WORKSTREAM_LEDGER.md)
3. [System savepoint](../SYSTEM_SAVEPOINT.md)
4. [Source health latest](../source-health-latest.md)
5. [Source economics latest](../source-economics-latest.md)
6. [Canary Expansion Bootloader](2026-09-19-CANARY-EXPANSION-BOOTLOADER.md)

Capacity & candidate infrastructure active on branch `main`.
Production D1 reality confirmed via direct query:
- **5 Canary Sources Active in Production D1**:
  - `breezy:20four7va` (Event ID 22, cap 2/tick, rev 1)
  - `breezy:sourcefit` (Event ID 23, cap 2/tick, rev 1)
  - `breezy:remote-craft` (Event ID 24, cap 2/tick, rev 1)
  - `breezy:value-virtual-assistants` (Event ID 25, cap 2/tick, rev 1)
  - `breezy:yokly` (Event ID 26, cap 2/tick, rev 1)
  Over 350 active remote Philippine roles in historical observation across these 5 agencies.
- **16 Shadow Sources Active**:
  - Workable (7): `coconutva`, `crewbloom`, `hello-rache`, `hunt-st`, `pearltalent`, `pineapple-staffing`, `rocketams`.
  - Greenhouse (6): `ghost`, `gitlab`, `grafanalabs`, `nearform`, `remotecom`, `wikimedia`.
  - Recruitee (1): `myjewellery`.
  - Teamtailor (1): `career.teamtailor.com`.
  - Breezy (1): `time-etc`.
- **14 Durable Candidates Queued** in `needs_review/candidate` (Ashby x5 quarantined under `COMP-01C`, Breezy x1, Workable x7, Lever x1).
- **Migration 0043 Live**: Canary promotion trigger alignment and canary cap backfill (`canary_max_new_items_per_tick = 2`) active in production D1.
- **Attribution Coverage**: 100.0% exact source attribution in D1 (0 null source_id rows).
- **Supply Baseline**: Measured strict qualified 7d baseline is 86 jobs / 7 days = 12.29 jobs/day.

Active execution queue:
1. **REL-CLOCK-FAILOVER-LOCK-RELEASE** (COMPLETE): Fenced run lock release in guaranteed `finally` block eliminates 8-min primary/secondary clock lockout.
2. **EX-CANARY-READINESS** (COMPLETE): Autonomy Cutover Predicate formal qualification audit verified 9 mature sources; Workable HTTP 429 burst pacing resolved; 14 candidates audited.
3. **EX-CANARY-PROMOTION** (COMPLETE): Migration 0043 applied; admission evidence packet projection hardened; authenticated `/api/cron/source-promote` route deployed; 5 Breezy Philippine VA agencies graduated to `canary` (events 22–26).
4. **EX-CANARY-INGESTION** (READY TO EXECUTE): Enable canary fetch in `packages/scraper/policy-resolver.ts` (`isEnabledForFetch`) and implement cap-safe batch proposal in `apps/web/src/lib/publish-opportunities.ts` to publish up to 2 items/tick without triggering `canary_cap_breach`.


