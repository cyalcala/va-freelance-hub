# Current resume pointer

**RESUMED by owner.** Explicit owner authorization granted on 2026-09-24 for the
**September 24 Production Graduation Window** toward the Prime Directive:
sustaining 100–150 qualified net-new remote Filipino-accessible jobs/day.

1. [September 24 Graduation Evidence](../gauntlet/evidence/SEPTEMBER-24-PRODUCTION-GRADUATION.md)
2. [Execution state](../APEX_10X_EXECUTION_STATE.md)
3. [Workstream ledger](../APEX_10X_WORKSTREAM_LEDGER.md)
4. [System savepoint](../SYSTEM_SAVEPOINT.md)
5. [Source health latest](../source-health-latest.md)
6. [Source economics latest](../source-economics-latest.md)

Production Reality (2026-09-24):
- **Canary -> Active Graduation (5 Sources)**:
  - `breezy:20four7va` (101 live roles)
  - `breezy:sourcefit` (82 live roles)
  - `breezy:remote-craft` (15 live roles)
  - `breezy:value-virtual-assistants` (9 live roles)
  - `breezy:yokly` (11 live roles)
  Combined 218 authentic Philippine remote roles graduating to active Production.
- **Shadow -> Canary Promotion (3 Clean Mature Sources)**:
  - `greenhouse:ghost` (13 obs, 12d span, cap: 2)
  - `greenhouse:nearform` (13 obs, 12d span, cap: 2)
  - `breezy:time-etc` (11 obs, 10d span, cap: 1)
- **Quarantined**: `teamtailor:career.teamtailor.com` (HTTP 404 endpoint failure).
- **Migration 0044 Verified**: `packages/db/migrations/0044_canary_to_active_graduation.sql` establishes the constitutional active graduation gate.
- **D1 Quota Hardened**: Edge caching in `apps/web/src/middleware.ts` (`caches.default`), warm cache `homepageCache` in `apps/web/src/pages/index.astro`, and prune retention window reduced to 14 days in `apps/web/src/pages/api/cron/prune.ts`.
- **D1 Free-Tier Write Reset Window**: Resets daily at 00:00:00 UTC (08:00:00 PHT). Runner `scripts/graduation/execute-september-24-graduation.ts` ready for execution.



