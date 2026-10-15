# Dispatch Assignment — explorer_m1_3

**Milestone**: M1 (Behavioral Bloat & Redundant Complexity Elimination)
**Specialization**: Adversarial Safety Test Design & Protected Invariants Mapping
**Working Directory**: c:\Users\admin\Desktop\va-freelance-hub\.agents\teamwork\explorer_m1_3
**Original Request**: c:\Users\admin\Desktop\va-freelance-hub\.agents\teamwork\ORIGINAL_REQUEST.md
**Project Plan**: c:\Users\admin\Desktop\va-freelance-hub\.agents\teamwork\orchestrator_9\PROJECT.md
**Baseline Reference**: c:\Users\admin\Desktop\va-freelance-hub\astra777.txt
**Bloat Ledger**: c:\Users\admin\Desktop\va-freelance-hub\docs\operations\BEHAVIORAL_BLOAT_LEDGER_2026-10-14.md
**Ponytail Skill**: c:\Users\admin\Desktop\va-freelance-hub\.agents\skills\ponytail-upstream\ponytail-audit\SKILL.md
**Test Driven Development**: c:\Users\admin\Desktop\va-freelance-hub\.agents\skills\test-driven-development\SKILL.md

## Mission & Tasks
1. Audit test coverage across the simplified/consolidated layers (`apps/web/tests/intake-fairness.test.ts`, `apps/web/tests/rotation-vs-intake.test.ts`, `packages/scraper/triage-decision.test.ts`, `packages/scraper/geoGate.test.ts`, `packages/scraper/publication-freshness.test.ts`).
2. Design a comprehensive adversarial test plan to prove that:
   - Invariant 1: `selectIntakeBatch` distributes slots fairly without RSS head-of-line blocking and preserves deferred ATS URLs on subsequent passes.
   - Invariant 2: `selectWorkableRotation` operates on durable `lastAttemptAt` without relying on redundant in-loop clocks.
   - Invariant 3: `decideTriage` never lets model disagreement unpublish verified structured geo scopes (`ph_only`, `apac_incl_ph`, `worldwide`), but preserves deterministic phrase rejection (e.g. "US citizens only").
   - Invariant 4: `geoGate` treats country pins as authoritative locks over title APAC tokens.
   - Invariant 5: Known counterexamples (Pineapple Staffing US telecommuting roles, Affordable Staff office-only roles) remain 0% published.
3. Specify exact test filenames, test cases, inputs, assertions, and verification commands for the Worker and Challengers.
4. Produce `analysis.md` and `handoff.md` in your working directory.
5. Send completion message with summary.


## 2026-10-15T13:30:13Z
[Message] sender=27133579-1ec8-4773-aa06-ab0ff4ef177c priority=MESSAGE_PRIORITY_HIGH
You are explorer_m1_3.
Your working directory is: c:\Users\admin\Desktop\va-freelance-hub\.agents\teamwork\explorer_m1_3
Read your dispatch file at: c:\Users\admin\Desktop\va-freelance-hub\.agents\teamwork\explorer_m1_3\DISPATCH.md
Read the original request at: c:\Users\admin\Desktop\va-freelance-hub\.agents\teamwork\ORIGINAL_REQUEST.md
Read the project plan at: c:\Users\admin\Desktop\va-freelance-hub\.agents\teamwork\orchestrator_9\PROJECT.md
Also inspect:
- c:\Users\admin\Desktop\va-freelance-hub\astra777.txt
- c:\Users\admin\Desktop\va-freelance-hub\docs\operations\BEHAVIORAL_BLOAT_LEDGER_2026-10-14.md
- Ponytail skill: c:\Users\admin\Desktop\va-freelance-hub\.agents\skills\ponytail-upstream\ponytail-audit\SKILL.md
- Test driven development: c:\Users\admin\Desktop\va-freelance-hub\.agents\skills\test-driven-development\SKILL.md

Task:
Audit test coverage for all simplified and consolidated layers (intake fairness, rotation cadence, triage decision, geoGate, publication freshness). Design a comprehensive adversarial test plan to prove all 5 protected invariants and counterexamples (Pineapple Staffing, Affordable Staff, UpGuard). Specify exact test files, cases, fixtures, and verification commands for Worker and Challengers.
Do NOT modify production source files. Write your analysis to c:\Users\admin\Desktop\va-freelance-hub\.agents\teamwork\explorer_m1_3\analysis.md and your formal handoff to c:\Users\admin\Desktop\va-freelance-hub\.agents\teamwork\explorer_m1_3\handoff.md.
When complete, notify parent (Recipient: 27133579-1ec8-4773-aa06-ab0ff4ef177c) via send_message.
