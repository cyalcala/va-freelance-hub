# Current resume pointer

**RESUMED by owner.** Explicit owner authorization granted on 2026-09-11 to resume
the autonomous source-expansion mission toward the Prime Directive:
sustaining 100–150 qualified net-new remote Filipino-accessible jobs/day.

1. [Execution state](../APEX_10X_EXECUTION_STATE.md)
2. [Workstream ledger](../APEX_10X_WORKSTREAM_LEDGER.md)
3. [System savepoint](../SYSTEM_SAVEPOINT.md)
4. [Source health latest](../source-health-latest.md)
5. [Source economics latest](../source-economics-latest.md)

Capacity & candidate infrastructure active on branch `main`.
Production D1 reality confirmed via direct query:
- 21 active shadows in `source_registry`:
  - Workable (7): `coconutva`, `crewbloom`, `hello-rache`, `hunt-st`, `pearltalent`, `pineapple-staffing`, `rocketams`.
  - Breezy (6): `20four7va`, `remote-craft`, `sourcefit`, `time-etc`, `value-virtual-assistants`, `yokly`.
  - Greenhouse (6): `ghost`, `gitlab`, `grafanalabs`, `nearform`, `remotecom`, `wikimedia`.
  - Recruitee (1): `myjewellery`.
  - Teamtailor (1): `career.teamtailor.com`.
- 14 durable candidates queued in `needs_review/candidate` (Ashby x5, Breezy x1, Workable x7, Lever x1).
- Over 540 active remote Philippine roles observed in shadow across agencies; zero public leakage (`published: 0` invariant strictly preserved).
- 1,565 shadow observations across 14 distinct calendar days (2026-09-06 to 2026-09-19); 19 of 21 sources matured past Day 8 threshold; top cohort (Grafana, Teamtailor, My Jewellery) at 13–14 distinct days and 119–124 observations; GitLab/Remote.com at 12 distinct days and 103–107 observations; Breezy agencies (20Four7VA, Sourcefit, Yokly, Remote-Craft, Value VA) and Greenhouse (Ghost, Nearform, Wikimedia) at 9 distinct days with 100% healthy track records; Workable agencies at 8 distinct days.
- Exact source attribution at 100.0% coverage in D1 (0 null source_id rows out of 5,348).
- Measured strict qualified 7d baseline: 86 jobs / 7 days = 12.29 jobs/day.

Active execution queue:
1. P1 clock failover optimization implemented: fenced `releaseRunLock` in `apps/web/src/pages/api/cron/scrape.ts` guarantees `__scrape_run_lock__` is immediately released on exit/error, unblocking Hunter failover watchdog.
2. Shadow observation maturity confirmed across 19 of 21 sources (Day 8+ achieved).
3. Monitor rotating shadow dispatch windows (Window 0 covers Breezy & Greenhouse; Window 1 covers Workable & other ATS).
4. Audit candidate queue backlog (14 candidates) under ADR-008 fast-track guidelines.
