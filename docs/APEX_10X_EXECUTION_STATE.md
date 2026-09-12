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
| Mission Authorization | OWNER RESUME AUTHORIZED (2026-09-11 / 2026-09-12 / 2026-09-13) |
| Prime Directive | Floor: 100 / Stretch: 150 qualified net-new remote PH-accessible jobs/day |
| Base Commit | `38f41d7` (matching `origin/main`) |
| Verification | 1,292 Bun tests pass (129 files), 7 Python tests pass, typecheck & guardrails clean |
| D1 Registry Shadows | 20 total in shadow state (Workable x7, Breezy x5, Greenhouse x6, Recruitee x1, Teamtailor x1) |
| Durable Candidate Queue | 15 distinct ATS candidates in `needs_review/candidate` (Ashby, Breezy, Workable, Lever) |
| Shadow Observations | 467+ total recorded across 7 distinct UTC days; 0 public leakage (`published: 0` invariant strictly verified) |
| Identity Attribution | 100.0% coverage in production D1 (0 null source_id rows out of 5,348) |
| Current 7d Qualified Baseline | 86 jobs / 7 days = 12.29 jobs/day (WWR 51, RWFA 25, Remote OK 10, Jobicy 3, Remotive 0) |
| Clocks | Primary Cloudflare Worker `freshness-cron` beating every 10 min; secondary Hunter in standby |

### Reconciled Production Reality (2026-09-13)
Direct measurement and workflow inspection confirms:
- **Pineapple Staffing Admitted to Production Shadow (Run 74)**:
  - Dispatched `gha-source-admit.yml` ([Run `34725118883`](https://github.com/cyalcala/va-freelance-hub/actions/runs/34725118883)) admitting `workable:pineapple-staffing` with `canary_max_new_items_per_tick: 1` and evidence ID 23.
  - First hourly shadow probe logged `HEALTHY_WITH_RESULTS` with 3 active roles (Business VA, Legal VA, Multimedia VA). 0 public leakage.
- **Sovereign Prospector Pulse Harvest (`34725347183`)**:
  - Successfully harvested `va_directory` using `COALESCE(hiring_page_url, website)`.
  - Discovered and inserted 10 new authentic ATS candidates into `source_registry` (`needs_review/candidate`): `workable:myoutdesk`, `workable:outsource-access`, `workable:staff-domain-inc`, `workable:superstaff`, `breezy:vaaphilippines-recruitment`, `workable:virtualstaff365`, `workable:global-strategic`, `workable:connectos`, `lever:vaultoutsourcing`, `ashby:tremendous`.
  - Refreshed 5 existing candidates. Total candidate queue backlog now 15 distinct candidates.
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
1. **Unit EX-SHADOW-CADENCE (Accumulate Recurrent Shadow Observations)**:
   - Monitor hourly shadow observation runs across the 19 shadow sources to build required observation history for promotion qualification.
2. **Unit EX-ATS-EXPANSION (Lever Retargeting & Ashby Evaluation)**:
   - Re-evaluate Lever ATS targeting with authentic Philippine-accessible hiring employers (Lever mechanism qualified under EX-06).
   - Maintain Ashby candidate quarantine (`COMP-01C`) pending dedicated partner feed or explicit customer permission.
3. **Unit PROSPECTOR-3 (Continuous ATS Candidate Factory)**:
   - Expand automated mining of VA directory careers pages into direct ATS candidate discovery to maintain a continuous, self-replenishing candidate reserve.
4. **Unit EX-CANARY-READINESS (Prepare Canary Cutover Predicate)**:
   - Verify qualification criteria for earliest mature shadow cohorts (Greenhouse, Recruitee, Teamtailor, Breezy, Workable) under the Autonomy Cutover Predicate.

