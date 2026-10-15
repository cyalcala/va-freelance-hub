# Orchestrator Generation 9 Context

- **Assigned Agent**: teamwork_preview_orchestrator
- **Working Directory**: c:\Users\admin\Desktop\va-freelance-hub\.agents\teamwork\orchestrator_9
- **Original Request**: c:\Users\admin\Desktop\va-freelance-hub\.agents\teamwork\ORIGINAL_REQUEST.md
- **Audit Baseline**: c:\Users\admin\Desktop\va-freelance-hub\astra777.txt
- **Skills Directory**: c:\Users\admin\Desktop\va-freelance-hub\.agents\skills\
- **Ponytail Skill**: c:\Users\admin\Desktop\va-freelance-hub\.agents\skills\ponytail-upstream
- **Git Branch**: codex/verified-flow-directory-checkpoint

## Mission & Requirements (from User Request 2026-10-14T20:00:03Z)

Eliminate behavioral bloat across the ingestion and filtering pipeline, and ensure legitimate remote employers verifiably hiring Filipinos (especially vetted VA companies and dayshift employers) consistently surface their jobs, scaling toward 100–150+ newly published verified Philippines-eligible remote jobs per day.

### R1. Behavioral Bloat & Redundant Complexity Elimination
Audit the ingestion, filtering, and triage pipeline using Ponytail (`.agents/skills/ponytail-upstream`) and agent-skills (`code-simplification`, `debugging-and-error-recovery`). Trace behavior to identify duplicated gates, redundant deduplication, overlapping cadence checks, and obsolete defensive heuristics. For every removal or consolidation, prove the protected invariant with adversarial tests, compare before/after behavior, and verify zero regression on verified safety invariants.

### R2. High-Confidence Trusted PH Employer Evidence & Dayshift Coverage
Formalize a principled employer-level evidence model (e.g. explicit PH hiring statement, PH entity/office, repeated verified hiring history, ATS location metadata) without creating a reckless global allowlist. Maintain strict separation of concerns:
`Employer PH confidence != Job validity != PH eligibility != Role relevance`.
Capture and surface working-hour alignment (Philippine daytime, AU/NZ/APAC hours, explicit dayshift) based on reliable evidence without fabricating schedule claims.

### R3. False-Negative Budget & Systematic Employer Reconciliation
Implement stage-by-stage pipeline loss tracking:
`Authoritative Source -> Discovery -> Fetch -> Parse -> Normalize -> Dedup -> PH Eligibility -> Policy -> Role Gates -> Triage -> Scoring -> Qualification -> Publication`.
Establish a recurring reconciliation workflow for high-confidence employers (including Hunt St, Coconut VA, CrewBloom, Pearl Talent, Hammerjack, MultiplyMii, 20Four7VA, and other prioritized remote/VA employers), diagnosing and eliminating root causes of missing openings.

### R4. Mathematical Rigor, Operational Invariants & Living Engineering Memory
Preserve all production invariants (strict per-vacancy geoGate, 30-day freshness window, billing ceilings <=200 req/src/day, <=500 AI/day, <=50,000 writes/day, idempotency, duplicate protection). Continue progressing reproducible proofs for MATH 1–13. Keep `astra777.txt` and canonical Google Secure Source Manager (`origin`) git commits synchronized and up to date after each verified slice.

## Predecessor Research Ready for Aggregation
Predecessor Gen 8 completed major survey deliverables:
1. `explorer_gen8_2/handoff.md` and `analysis.md`:
   - 5-level tiered employer evidence model.
   - 4-way separation matrix (`Employer PH confidence != Job validity != PH eligibility != Role relevance`).
   - Root cause fix for 100% missing `client_timezone` in D1 (`triagedItems.push` spread omission in `scrape.ts:3018-3043`).
   - Dayshift classification schema expanding coverage to AU/NZ/APAC/PHT without fabricating schedule claims.
2. `explorer_gen8_3_rep/handoff.md` and `analysis.md`:
   - Stage-by-stage loss tracking matrix across all 13 pipeline phases.
   - Root cause diagnosis for prioritized employer drops: intake batch limit (50/100 cap deferral) and Workable 2-slot rotation cadence.
   - Reconciliation strategy for Hunt St, Coconut VA, CrewBloom, Pearl Talent, Hammerjack, MultiplyMii, 20Four7VA.
3. R1 Bloat Audit:
   - Check `.agents/teamwork/explorer_gen8_1_rep/` or dispatch a targeted bloat investigator if needed.

## Autonomous Execution Loop
Operate autonomously and continuously. After completing any bounded slice:
1. run targeted adversarial tests;
2. run the appropriate broader regression/typecheck/build verification;
3. commit the verified result to canonical Google Secure Source Manager on branch `codex/verified-flow-directory-checkpoint` and mirror to GitLab (`gitlab`);
4. update the durable checkpoint/evidence with exactly what was proven and what remains unproven;
5. identify the highest-value NEXT unresolved prerequisite, invariant, counterexample, or bottleneck;
6. immediately continue working on NEXT without waiting.

Do not interpret completion of a prerequisite as completion of a MATH requirement. Do not mark a requirement complete without reproducible evidence and independent verification. Preserve production safety, billing guards, publication correctness, and existing verified invariants.

Maintain your progress in `.agents/teamwork/orchestrator_9/progress.md` regularly so the Sentinel can monitor your progress via its cron.
When victory is claimed, deliver a completion report to the Sentinel for independent victory audit.
