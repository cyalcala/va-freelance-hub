# Orchestrator Generation 13 Context

- **Assigned Agent**: teamwork_preview_orchestrator
- **Working Directory**: c:\Users\admin\Desktop\va-freelance-hub\.agents\teamwork\orchestrator_13
- **Original Request**: c:\Users\admin\Desktop\va-freelance-hub\.agents\teamwork\ORIGINAL_REQUEST.md
- **Audit Baseline**: c:\Users\admin\Desktop\va-freelance-hub\astra777.txt
- **Project Plan**: c:\Users\admin\Desktop\va-freelance-hub\.agents\teamwork\orchestrator_10\PROJECT.md
- **Skills Directory**: c:\Users\admin\Desktop\va-freelance-hub\.agents\skills\
- **Git Branch**: codex/verified-flow-directory-checkpoint

## Mission & Requirements (from Latest User Request 2026-10-15T23:22:15Z)

Own and execute the next phase of VA Freelance Hub: eliminate behavioral bloat, recover legitimate Philippines-eligible remote jobs from trusted employers across all 13 pipeline stages, and move toward 100–150+ newly published, verified jobs per day under strict production invariants.
Use a very large team of agents as requested.

### R1. Behavioral Bloat Elimination & Pipeline Compression
Audit and simplify the live pipeline (discovery, intake, geoGate, freshness, dedup, triage, scoring, qualification, publication). Eliminate redundant schedulers, repeated eligibility gates, duplicated cadence timers, and obsolete compatibility shims. Consolidate overlapping heuristics into single authoritative decision points while preserving all core invariants (30-day freshness, geoGate accuracy, D1 parameter budget <= 100, billing limits).

### R2. Trusted Employer Coverage & 13-Stage False-Negative Elimination
Enumerate and reconcile authoritative career/ATS openings from vetted Philippines-hiring and dayshift-friendly employers (e.g., Hunt St, Coconut VA, Hammerjack, Pearl Talent, CrewBloom, 20Four7VA, Sourcefit, RocketAMS). Enforce the 4-way separation matrix: `Employer PH confidence != Job validity != PH eligibility != Role relevance`. Trace every legitimate missing opening across all 13 canonical stages (SOURCE through PUBLICATION) using `PipelineLossTracker`, distinguishing healthy drops (stale, onsite, country-locked) from coverage defects, and recovering legitimate openings into publication.

### R3. Dayshift and APAC Schedule Recognition
Capture and retain explicit schedule markers (Australian, New Zealand, Philippine daytime, APAC business hours, morning shifts, and explicit PHT daytime spans like "8am - 5pm Manila time") without fabricating unstated hours. Ensure dayshift jobs are accurately classified, queryable, and exposed on public filters.

### R4. Throughput & Scalable Intake toward 100–150+ Verified Jobs/Day
Expand and balance multi-source intake fairness (`selectIntakeBatch`) across ATS feeds, RSS, and structured discovery. Prevent head-of-line blocking and rotation starvation so fresh eligible openings reach qualification and publication without exceeding Cloudflare D1 write or query constraints.

### R5. Autonomous Execution Loop, Memory Maintenance & Repository Parity
Operate in continuous, bounded, verified slices. After each slice: run targeted adversarial tests, regressions, and builds; record proven vs unproven evidence in `astra777.txt`; commit verified changes to Google Secure Source Manager (`origin`) as the canonical source of truth; and verify mirror synchronization with GitHub and GitLab.

## Acceptance Criteria

### Behavioral Compression & Invariants
- [ ] Redundant gates or duplicate clocks identified in the bloat ledger are consolidated into single authoritative checks with zero regression in geoGate precision.
- [ ] Constitutional Zero invariants strictly held: Pineapple Staffing (0 published), Affordable Staff onsite (0 published), and UpGuard Australia (0 published) remain unpublished.
- [ ] Cloudflare D1 query batching strictly adheres to <= 100 parameters per batch (28 parameters/row * 3 rows = 84 max).

### Trusted Employer & Loss Tracking Verification
- [ ] 13-stage loss tracking (`PipelineLossTracker`) records stage transitions and explicit rejection codes for all reconciled employers.
- [ ] Systematic misses from vetted employers (such as fresh telecommuting Philippines openings from Hunt St, Coconut VA, Hammerjack, Pearl Talent, and CrewBloom) are verified through intake and publication qualification.
- [ ] Zero legitimate remote PH openings from vetted employers are silently dropped without an explicit machine-readable reason code.

### Dayshift Recognition
- [ ] Explicit daytime spans and AU/NZ/APAC daytime hours are parsed and indexed with `isDayshift: true` and appropriate `shiftCategory`.
- [ ] Public opportunities filter `/opportunities` accurately slices and returns verified dayshift listings.

### Test & Build Health
- [ ] Full test suite (`bun test`) passes 100% with zero regressions across all test suites.
- [ ] Static typecheck (`apps/web/tsconfig.json`) passes cleanly with zero type errors.

### Repository & Documentation Integrity
- [ ] `astra777.txt` accurately records CURRENT, PROVEN, OBSERVED, ACTIVE, UNPROVEN, and NEXT states.
- [ ] Verified commits are pushed to canonical Google Secure Source Manager (`origin`) on the working branch (`codex/verified-flow-directory-checkpoint`), and mirror freshness on GitHub and GitLab is verified.

## Autonomous Execution Loop
Operate autonomously and continuously. After completing any bounded slice:
1. run targeted adversarial tests;
2. run the appropriate broader regression/typecheck/build verification;
3. commit the verified result to canonical Google Secure Source Manager on branch `codex/verified-flow-directory-checkpoint` and mirror to GitHub/GitLab;
4. update the durable checkpoint/evidence with exactly what was proven and what remains unproven;
5. identify the highest-value NEXT unresolved prerequisite, invariant, counterexample, or bottleneck;
6. immediately continue working on NEXT without waiting.

Maintain your progress in `.agents/teamwork/orchestrator_13/progress.md` regularly so the Sentinel can monitor your progress via its cron.
When all requirements and acceptance criteria are met, deliver your completion report to the Sentinel for independent victory audit.
