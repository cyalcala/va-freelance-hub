# Orchestrator Generation 11 Context

- **Assigned Agent**: teamwork_preview_orchestrator
- **Working Directory**: c:\Users\admin\Desktop\va-freelance-hub\.agents\teamwork\orchestrator_11
- **Original Request**: c:\Users\admin\Desktop\va-freelance-hub\.agents\teamwork\ORIGINAL_REQUEST.md
- **Audit Baseline**: c:\Users\admin\Desktop\va-freelance-hub\astra777.txt
- **Project Plan**: c:\Users\admin\Desktop\va-freelance-hub\.agents\teamwork\orchestrator_10\PROJECT.md
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

## Current State & Next Steps
1. The 4-milestone plan is fully established in `orchestrator_10/PROJECT.md`.
2. All Explorer research for M1, M2, and M3 is complete:
   - `explorer_m1_1/handoff.md` (Ingestion bloat audit)
   - `explorer_m1_2/handoff.md` (Filtering gates consolidation)
   - `explorer_m1_3/handoff.md` & `analysis.md` (Adversarial test suite design)
   - `explorer_gen8_2/handoff.md` & `analysis.md` (Employer evidence & dayshift model)
   - `explorer_gen8_3_rep/handoff.md` & `analysis.md` (Loss tracking & reconciliation)
3. Milestone 1 implementation:
   - A complete worker specification exists in `c:\Users\admin\Desktop\va-freelance-hub\.agents\teamwork\worker_m1_gen10\DISPATCH.md`.
   - Dispatch `worker_m1_gen11` to execute the changes across `triage.ts`, `geoGate.ts`, `json.ts`, `scrape.ts`, and write `adversarial-counterexamples.test.ts`.
   - Upon worker completion, dispatch Reviewers (2), Challengers (2), Forensic Auditor (1), evaluate the Gate, and proceed through M2, M3, M4.

## Autonomous Execution Loop
Operate autonomously and continuously. After completing any bounded slice:
1. run targeted adversarial tests;
2. run the appropriate broader regression/typecheck/build verification;
3. commit the verified result to canonical Google Secure Source Manager on branch `codex/verified-flow-directory-checkpoint` and mirror to GitLab (`gitlab`);
4. update the durable checkpoint/evidence with exactly what was proven and what remains unproven;
5. identify the highest-value NEXT unresolved prerequisite, invariant, counterexample, or bottleneck;
6. immediately continue working on NEXT without waiting.

Do not interpret completion of a prerequisite as completion of a MATH requirement. Do not mark a requirement complete without reproducible evidence and independent verification. Preserve production safety, billing guards, publication correctness, and existing verified invariants.

Maintain your progress in `.agents/teamwork/orchestrator_11/progress.md` regularly so the Sentinel can monitor your progress via its cron.
When all requirements and acceptance criteria are met, deliver your completion report to the Sentinel for independent victory audit.
