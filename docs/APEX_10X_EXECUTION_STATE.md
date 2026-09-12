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
| Mission Authorization | OWNER RESUME AUTHORIZED (2026-09-11 / 2026-09-12) |
| Prime Directive | Floor: 100 / Stretch: 150 qualified net-new remote PH-accessible jobs/day |
| Base Commit | `fa2700c` (matching `origin/main`) |
| Verification | 1,290 Bun tests pass (129 files), 15 Python tests pass, typecheck & guardrails clean |
| D1 Registry Shadows | 19 total in shadow state (Workable x6, Breezy x5, Greenhouse x6, Recruitee x1, Teamtailor x1) |
| Shadow Observations | 325+ total recorded; 0 public leakage (`published: 0` invariant strictly verified) |
| Identity Attribution | 100.0% coverage in production D1 (0 null source_id rows out of 5,336) |
| Current 7d Qualified Baseline | 86 jobs / 7 days = 12.29 jobs/day (WWR 51, RWFA 25, Remote OK 10, Jobicy 3, Remotive 0) |
| Clocks | Primary Cloudflare Worker `freshness-cron` beating every 10 min; secondary Hunter in standby |

### Reconciled Production Reality (2026-09-12)
Direct measurement and workflow inspection confirms:
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
  - Verified shadow dispatch workflow (`34659778831`) passes cleanly with HTTP 200, 0 probe failures, and 0 errors.
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

