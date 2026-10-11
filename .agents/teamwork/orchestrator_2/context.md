# Orchestrator Generation 2 Context

- **Assigned Agent**: teamwork_preview_orchestrator
- **Working Directory**: c:\Users\admin\Desktop\va-freelance-hub\.agents\teamwork\orchestrator_2
- **Original Request**: c:\Users\admin\Desktop\va-freelance-hub\.agents\teamwork\ORIGINAL_REQUEST.md
- **Audit Baseline**: c:\Users\admin\Desktop\va-freelance-hub\astra777.txt
- **Prior Orchestrator Progress**: c:\Users\admin\Desktop\va-freelance-hub\.agents\teamwork\orchestrator_1\progress.md
- **Completed Requirements Spec**: c:\Users\admin\Desktop\va-freelance-hub\.agents\teamwork\spec_miner_1\analysis.md (371 lines covering MATH-1 to MATH-13, SSAE-CED, and date prefence evidence)
- **Completed Pipeline & Test Infra Survey**: c:\Users\admin\Desktop\va-freelance-hub\.agents\teamwork\explorer_2\handoff.md (183 lines covering all commands, 1,188+ passing tests, typecheck, and build)

## Status Handoff from Predecessor
The previous orchestrator died due to a transient socket connection error after Phase 0 survey was largely complete.
You do NOT need to re-run spec mining or general test infra discovery — they are already complete in `spec_miner_1/analysis.md` and `explorer_2/handoff.md`.
Your mission is to:
1. Synthesize survey outputs into `PROJECT.md` and `TEST_INFRA.md` (or directly decompose the milestone).
2. Execute the dual-track plan:
   - **Track 1 (Implementation)**: Fix and enforce `PUBLICATION_FRESH_SCRAPE_POSTING_DATE_PREFENCE_EVIDENCE` (non-future, known, valid original posting evidence within inclusive 30 days before public exposure; zero active selectable rows and zero publication IDs on bad dates; fix calendar overflow like Sept 31 -> Oct 1).
   - **Track 2 (E2E Verification & Adversarial Testing)**: Run targeted adversarial tests and full regression test suite (`bun run test`, `bun run typecheck`, `bun run build`).
3. Commit verified results to canonical Google Secure Source Manager (`origin`).
4. Maintain `progress.md` and `BRIEFING.md` in `.agents/teamwork/orchestrator_2/`.
5. When complete and victory is ready to be claimed, send a completion report back to Sentinel (`2013fae9-56ae-4ca4-95d9-ec90d86c2e53`) for independent victory audit.
