# APEX-10X Execution State

**RESUMED — Owner-authorized autonomous source-expansion gauntlet.**
As of 2026-09-11. Prime Directive: sustain 100–150 qualified net-new remote Filipino-accessible jobs/day.

Canonical continuation:
1. [CURRENT pointer](bootloaders/CURRENT.md)
2. [Workstream ledger](APEX_10X_WORKSTREAM_LEDGER.md)
3. [System savepoint](SYSTEM_SAVEPOINT.md)
4. [Source economics latest](source-economics-latest.md)
5. [Source health latest](source-health-latest.md)

| Item | Exact state |
| --- | --- |
| Mission Authorization | OWNER RESUME AUTHORIZED (2026-09-11) |
| Prime Directive | Floor: 100 / Stretch: 150 qualified net-new remote PH-accessible jobs/day |
| Base Commit | `e69f637a795fad8ccdd86cedfd92f155dacb1890` (matching `origin/main`) |
| Deployed Capacity Code | `c3f5951ae387ad0a6f9023d4bbe48dc618678841` (PR #141) at https://280f2e6b.remotejobs-ph.pages.dev |
| Verification | 1,270 Bun tests pass (128 files), 15 Python tests pass, typecheck & guardrails clean |
| D1 Registry Shadows | 8 active: `greenhouse:grafanalabs`, `recruitee:myjewellery`, `teamtailor:career.teamtailor.com`, `greenhouse:gitlab`, `greenhouse:remotecom`, `greenhouse:nearform`, `greenhouse:ghost`, `greenhouse:wikimedia` |
| Shadow Observations | 259 total recorded; 6 distinct UTC dates for earliest cohorts; 0 public leakage |
| Identity Attribution | 100.0% coverage in production D1 (0 null source_id rows out of 5,331) |
| Current 7d Qualified Baseline | 88 jobs / 7 days = 12.57 jobs/day (WWR 53, RWFA 22, Remote OK 9, Jobicy 4, Remotive 0) |
| Clocks | Primary Cloudflare Worker `freshness-cron` beating every 10 min; secondary Hunter in standby |

### Reconciled Production Reality (2026-09-11)
Direct D1 read verification confirms:
- Nearform, Ghost, and Wikimedia were admitted with evidence IDs 9, 10, 11 on 2026-09-11.
- Hourly shadow dispatcher is active and executing across all 8 shadow identities without public leakage.
- Legacy null-source_id debt is completely resolved (0 nulls).
- Jobicy admin/support zero-yield diagnosed: namespaced tags (`job_listing:*`) omitted by scraper.

### Active Execution Queue
1. **Queue A (Yield Repair)**: Fix Jobicy namespaced XML parsing in `packages/scraper/rss.ts` to capture location, company, and category.
2. **Queue B (Attribution Tooling)**: Commit deterministic attribution backfill generator and unit tests.
3. **Queue D & E (PH-First ATS)**: Implement Breezy HR capability adapter (`packages/scraper/breezy.ts`) for Philippine agencies (`20four7va`, `sourcefit`, `time-etc`).
4. **Queue H (Prospector 2.0)**: Upgrade Prospector to automatically extract ATS tokens from careers pages and file durable candidate recommendations.
