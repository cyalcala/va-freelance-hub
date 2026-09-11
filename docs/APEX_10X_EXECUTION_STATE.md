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
| Base Commit | `46e143af8f70c93d2d7c6c0a04e214727fbcedab` (matching `origin/main`) |
| Verification | 1,286 Bun tests pass (129 files), 15 Python tests pass, typecheck & guardrails clean |
| D1 Registry Shadows | 15 total in shadow state (Greenhouse, Recruitee, Teamtailor, Breezy, Workable) |
| Shadow Observations | 260+ total recorded; earliest cohort has 6 distinct UTC dates; 0 public leakage |
| Identity Attribution | 100.0% coverage in production D1 (0 null source_id rows out of 5,331) |
| Current 7d Qualified Baseline | 88 jobs / 7 days = 12.57 jobs/day (WWR 53, RWFA 22, Remote OK 9, Jobicy 4, Remotive 0) |
| Clocks | Primary Cloudflare Worker `freshness-cron` beating every 10 min; secondary Hunter in standby |

### Reconciled Production Reality (2026-09-12)
Direct measurement and workflow inspection confirms:
- **Workable ATS Widget Integration Deployed**: Official public unauthenticated widget API integrated (`https://apply.workable.com/api/v1/widget/accounts/{token}`). Six Philippine agencies qualified with 540 remote jobs (`pearltalent`: 235, `hunt-st`: 153, `crewbloom`: 97, `coconutva`: 41, `rocketams`: 11, `hello-rache`: 3).
- **Shadow Admissions**: `workable:coconutva` and `workable:crewbloom` admitted to shadow mode in production D1 (runs 34649757920 and 34649812610) with 0 public leakage.
- **Probe Pacing & Transient 429 Resilience (Run 67)**: `shadow-dispatcher.ts` paces consecutive probes with 1200ms polite delay; `candidate-shadow.ts` retries transient 429 on unauthenticated ATS GET; `robotsGate.ts` retries transient 429 on robots.txt and strictly never caches 429 or error responses.
- **Legacy Attribution**: 100.0% coverage verified (0 null `source_id` rows).

### Active Execution Queue
1. **Unit EX-03-VERIFY (Deploy & Trigger Shadow Dispatch Check)**:
   - Deploy Run 67 pacing/retry enhancements to production.
   - Dispatch `gha-shadow-dispatch.yml` to verify that shadow observation runs return clean `HEALTHY_WITH_RESULTS` / `HEALTHY_EMPTY` across all probed candidates.
2. **Unit EX-PH-ATS-ADMIT (Safe Phased Shadow Admission of Qualified High-Yield Agencies)**:
   - Admit remaining allowlisted Philippine VA agencies: `workable:pearltalent` (235 jobs), `workable:hunt-st` (153 jobs), `breezy:sourcefit` (78 jobs), `breezy:yokly` (11 jobs), `breezy:remote-craft` (15 jobs), `workable:rocketams` (11 jobs), `breezy:value-virtual-assistants` (6 jobs), `workable:hello-rache` (3 jobs). Spaced safely to avoid external rate limiting.
3. **Unit EX-ATS-EXPANSION (Lever Retarget & Ashby Candidate Queue)**:
   - Retarget Lever with authentic Philippine-accessible hiring employers.
   - Promote validated Ashby candidate reserve (`ashby:supabase`, `ashby:camunda`, `ashby:ashby`, `ashby:amplify`).
4. **Unit PROSPECTOR-3 (Continuous ATS Candidate Factory)**:
   - Drain company directory into automated careers page discovery and ATS token extraction to maintain a continuous, self-replenishing candidate reserve.
