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
| Mission Authorization | OWNER RESUME AUTHORIZED (2026-09-11 / 2026-09-12 / 2026-09-13 / 2026-09-19) |
| Prime Directive | Floor: 100 / Stretch: 150 qualified net-new remote PH-accessible jobs/day |
| Base Commit | Pushed to `main` (`ea81366`, advancing to Run 79) |
| Verification | 1,329 Bun tests pass (132 files), typecheck & guardrails clean (Runs 35412951998, 35413370337, 35413959555 green) |
| D1 Registry Canaries | 5 sources in `operational_state = 'canary'` (`breezy:20four7va`, `breezy:sourcefit`, `breezy:remote-craft`, `breezy:value-virtual-assistants`, `breezy:yokly`) with cap 2/tick |
| D1 Registry Shadows | 16 sources in `operational_state = 'shadow'` (Workable x7, Greenhouse x6, Recruitee x1, Teamtailor x1, Breezy x1) |
| Durable Candidate Queue | 14 distinct ATS candidates in `needs_review/candidate` (Ashby x5, Breezy x1, Workable x7, Lever x1) |
| Shadow Observations | 1,565+ total recorded across 14 distinct calendar days; zero unlogged public exposure |
| Identity Attribution | 100.0% coverage in production D1 (0 null source_id rows out of 5,348) |
| Current 7d Qualified Baseline | 86 jobs / 7 days = 12.29 jobs/day (WWR 51, RWFA 25, Remote OK 10, Jobicy 3, Remotive 0) |
| Clocks | Primary Cloudflare Worker `freshness-cron` beating every 10 min; secondary Hunter in standby |

### Reconciled Production Reality (2026-09-19)
Direct measurement and workflow inspection confirms:
- **Canary Promotion of 5 Philippine VA Agencies (Run 79)**:
  - Authored & applied Migration 0043 (`packages/db/migrations/0043_canary_promotion_trigger_alignment.sql`): fixed trigger conflict between migrations 0039/0042 and 0040 on canary promotion, backfilled `canary_max_new_items_per_tick = 2` across all shadow sources, and hardened `source_registry_governance_revision_bump` with column value-change checks.
  - Hardened admission evidence packet projection in `packages/scraper/admission-evidence.ts` for backward-compatible null canary cap matching while preserving cryptographic authority.
  - Implemented authenticated promotion endpoint `apps/web/src/pages/api/cron/source-promote.ts` (11 unit tests, 2 integration tests pass).
  - Graduated 5 Breezy Philippine VA agencies to `canary` in production D1: `breezy:20four7va` (event 22), `breezy:sourcefit` (event 23), `breezy:remote-craft` (event 24), `breezy:value-virtual-assistants` (event 25), `breezy:yokly` (event 26).
  - Live D1 query confirms all 5 in `operational_state = 'canary'`, `governance_revision = 1`, `canary_max_new_items_per_tick = 2`.
- **Autonomy Cutover Predicate Formal Audit & Workable Pacing (Run 78)**:
  - Direct measurement of production Cloudflare D1 confirmed 9 mature shadow sources satisfied all 10 conditions of the Autonomy Cutover Predicate ([`docs/audits/EX_CANARY_READINESS_AUDIT.md`](audits/EX_CANARY_READINESS_AUDIT.md)).
  - Eliminated Workable HTTP 429 rate limiting via provider-interleaved dispatch ordering, host-sensitive polite delay, and adaptive `Retry-After` backoff.
  - Audited 14 candidates in `source_registry` ([`docs/audits/CANDIDATE_QUEUE_BACKLOG_AUDIT.md`](audits/CANDIDATE_QUEUE_BACKLOG_AUDIT.md)).
- **P1 Clock Failover Fenced Lock Release Implemented (Run 77)**:
  - Resolved Recommendation 1 of the Publication Funnel Audit (`docs/debugging/PUBLICATION_DEBUG_STATE.md`).
  - Added `releaseRunLock(db, observedAt)` with atomic fencing to `apps/web/src/pages/api/cron/scrape.ts` and executed inside guaranteed `finally` block.
  - Guarantees `__scrape_run_lock__` is immediately released on completion or unhandled error, eliminating 8-minute failover lockouts.
- **Direct Remote D1 Shadow Maturity Confirmed**:
  - 1,565 total shadow observations recorded across 14 distinct calendar days (2026-09-06 to 2026-09-19).
  - 19 of 21 shadow sources achieved >= 8 distinct calendar days of healthy shadow observations spanning >= 7 calendar days.
  - Zero public board leakage verified (`published: 0` invariant strictly preserved across all shadow identities).

### Reconciled Production Reality (2026-09-13)
Direct measurement and workflow inspection confirms:
- **Time Etc Admitted to Production Shadow (Run 75)**:
  - Dispatched `gha-source-admit.yml` ([Run `34726239182`](https://github.com/cyalcala/va-freelance-hub/actions/runs/34726239182)) admitting `breezy:time-etc` with `canary_max_new_items_per_tick: 1` and evidence ID 24.
  - Admission probe logged `HEALTHY_WITH_RESULTS` with 1 active role (`Role at Time etc - New Pipeline`). 0 public leakage (`published: 0`).
  - Total shadow registry capacity expanded to 21 active sources.
- **Shadow Dispatch Observation Window Executed (`34726310784`)**:
  - Rotating observation window 1 executed cleanly (`HTTP 200`), observing `recruitee:myjewellery` with 88 healthy items.
- **Owner Strategic Directive & Ratified Decision**:
  - Detailed trade-off analysis between immediate promotion and empirical observation compiled in [`docs/plans/ACCELERATED_PH_AGENCY_PROMOTION_ANALYSIS.md`](plans/ACCELERATED_PH_AGENCY_PROMOTION_ANALYSIS.md).
  - Founder ratified **Pathway 1 (Patience & Constitutional Gauntlet)**, prioritizing uncompromised architectural integrity and empirical evidence over artificial shortcuts. The system will let the 7-day empirical span (`604,800,000 ms`) and 8 distinct UTC days mature organically without manual bypasses. Top tier graduates 2026-09-14/15; Philippine agencies graduate 2026-09-18.
- **Pineapple Staffing Admitted to Production Shadow (Run 74)**:
  - Dispatched `gha-source-admit.yml` ([Run `34725118883`](https://github.com/cyalcala/va-freelance-hub/actions/runs/34725118883)) admitting `workable:pineapple-staffing` with `canary_max_new_items_per_tick: 1` and evidence ID 23.
  - First hourly shadow probe logged `HEALTHY_WITH_RESULTS` with 3 active roles (Business VA, Legal VA, Multimedia VA). 0 public leakage.
- **Sovereign Prospector Pulse Harvest (`34725347183`)**:
  - Successfully harvested `va_directory` using `COALESCE(hiring_page_url, website)`.
  - Discovered and inserted 10 new authentic ATS candidates into `source_registry` (`needs_review/candidate`): `workable:myoutdesk`, `workable:outsource-access`, `workable:staff-domain-inc`, `workable:superstaff`, `breezy:vaaphilippines-recruitment`, `workable:virtualstaff365`, `workable:global-strategic`, `workable:connectos`, `lever:vaultoutsourcing`, `ashby:tremendous`.
  - Refreshed 5 existing candidates. Total candidate queue backlog now 14 distinct candidates.
- **Directory ATS Candidate Mining & Pineapple Staffing (Run 73)**:
  - Updated `buildDirectoryAtsMiningQuery` with `COALESCE(d.hiring_page_url, d.website)` unlocking 23+ ATS-using companies in `va_directory`.
  - Added `canaryMaxNewItemsPerTick: 1` to `buildCandidateRow` in `packages/scraper/prospect-candidate.ts`.
  - Verified live endpoint for Pineapple Staffing (3 active VA roles) and added `workable:pineapple-staffing` to `SOURCE_ADMIT_ALLOWLIST`.
- **Default Canary Cap in Candidate Builders & Admission Route (Run 72)**:
  - Wired `canaryMaxNewItemsPerTick: 1` in candidate row builders for Greenhouse, Recruitee, Teamtailor, Breezy, and Workable ATS.
  - Updated `apps/web/src/pages/api/cron/source-admit.ts` to propagate `candidate.canaryMaxNewItemsPerTick ?? 1` to align with Migration 0042 `source_transition_events_validate_insert` requirements for canary promotion.
- **Prospector Shortlink & Reserved Slug Hardening (Run 71, `656b1c3`)**:
  - `packages/scraper/prospector.ts`: Filtered Workable job shortlinks (`/j/{id}`) where company slug is absent from the URL, preventing `"j"` from being extracted as a company token.
  - Added reserved slug blocklists for Workable, Breezy, and Greenhouse.
  - Verified live via Sovereign Prospector pulse ([Run `34661138924`](https://github.com/cyalcala/va-freelance-hub/actions/runs/34661138924)) and EX-03 Shadow Dispatch ([Run `34661198821`](https://github.com/cyalcala/va-freelance-hub/actions/runs/34661198821)).
- **All 6 Workable Philippine Agencies Admitted to Shadow**:
  - `workable:pearltalent` (235 active roles)
  - `workable:hunt-st` (153 active roles)
  - `workable:crewbloom` (97 active roles)
  - `workable:coconutva` (41 active roles)
  - `workable:rocketams` (11 active roles)
  - `workable:hello-rache` (3 active roles)
  - Total Workable shadow roles: 540 active remote Philippine roles observed with strictly zero public board leakage (`published: 0`).
- **All 19 Production Shadow Sources Operational**:
  - Workable (6), Breezy (5), Greenhouse (6), Recruitee (1), Teamtailor (1).
- **Candidate Transition & Evidence Hash Stability Repaired**:
  - `d32aa1e`: Added UPSERT transition path in `source-admission.ts` enabling pre-existing candidate rows to cleanly transition to shadow mode.
  - `152da42`: In `source-admit.ts`, reused unexpired persisted provider evidence to eliminate hash drift from dynamic third-party help center pages.
- **D1-Backed Robots Cache & RFC 9309 Fallback Repaired**:
  - `19dfe24`: Connected production `shadow-dispatch.ts` to persistent D1 `createRobotsStore(db)` and added RFC 9309 §2.3.1.4 stale cache fallback on transient 429/network errors.
  - Verified shadow dispatch workflow (`34661198821`) passes cleanly with HTTP 200, 12/12 dispatched, 12/12 `HEALTHY_WITH_RESULTS`, 0 probe failures, and 0 errors.
- **Legacy Attribution & Board Safety**:
  - 100.0% attribution coverage verified (0 null `source_id` rows).
  - Exact-six publishing invariant strictly maintained on the public board (`published: 0` for all 19 shadow sources).

### Active Execution Queue
1. **Unit EX-CANARY-READINESS (Autonomy Cutover Predicate Audit & Pacing Hardening)**: `DONE_VERIFIED`
   - All 10 conditions of the Autonomy Cutover Predicate verified satisfied in `docs/audits/EX_CANARY_READINESS_AUDIT.md`.
   - 9 mature shadow sources (5 Breezy Philippine VA agencies, 4 global ATS feeds) verified 100% clean and ready for canary promotion.
   - Provider-interleaved dispatch ordering, host-aware polite delay (3,000 ms), and adaptive `Retry-After` backoff deployed.
2. **Unit CANDIDATE-BACKLOG-AUDIT**: `DONE_VERIFIED`
   - Complete audit of 14 candidates in `docs/audits/CANDIDATE_QUEUE_BACKLOG_AUDIT.md`. Ashby x5 quarantined; 9 candidates ready for staged admission.
3. **Unit EX-CANARY-PROMOTION (Canary Transition Execution)**:
   - Prepare formal canary promotion gateway transition (`source-promote.ts`) for qualified cohort.
4. **Unit PROSPECTOR-3 (Continuous ATS Candidate Factory)**:
   - Expand automated mining of VA directory careers pages into direct ATS candidate discovery to maintain a continuous, self-replenishing candidate reserve.


