## 2026-10-11T05:21:58Z
You are a Worker agent for VA Freelance Hub.
Your working directory is: c:\Users\admin\Desktop\va-freelance-hub\.agents\teamwork\teamwork_preview_worker_m2_1\
Read the original request at: c:\Users\admin\Desktop\va-freelance-hub\.agents\teamwork\ORIGINAL_REQUEST.md

Read the Explorer and Spec Miner handoff reports:
- c:\Users\admin\Desktop\va-freelance-hub\.agents\teamwork\teamwork_preview_spec_miner_m1_3\handoff.md
- c:\Users\admin\Desktop\va-freelance-hub\.agents\teamwork\teamwork_preview_explorer_m1_2_rep\handoff.md
- c:\Users\admin\Desktop\va-freelance-hub\.agents\teamwork\teamwork_preview_explorer_m1_1_rep\handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

File write ownership:
You own exclusively:
- `packages/scraper/manila-day.ts`
- `packages/scraper/publication-gateway.integration.test.ts`
Do NOT edit any files outside your ownership.

Mission:
Implement and verify `PUBLICATION_UNCERTAIN_EFFECTS_WITHDRAWAL_CONTRACT`.
1. In `packages/scraper/manila-day.ts`:
   Implement and export:
   - `uncertainMatchedManilaStillPublicCount`:
     Evaluates an intact snapshot pair against `activeMatchedManilaStillPublicCount`. If matched is null or pair is missing, returns null. If any still-public ID is present in `uncertainIds`, returns null. Otherwise returns matched. Also export alias `withdrawalSafeManilaStillPublicCount`.
   - `uncertainMatchedManilaDayFlowCount`:
     Returns null if dayState is empty string or matchedCount is not a safe integer (when non-null). Unconditionally returns null for both "OPEN" and "CLOSED" (an open day count is not a completed flow; caller cannot fabricate closed-day evidence). Also export alias `withdrawalSafeManilaDayFlowCount`.
2. In `packages/scraper/publication-gateway.integration.test.ts`:
   Add a test block locking the invariant:
   An intact snapshot pair with active matched IDs that are uncertain or withdrawn is not a completed Manila-day flow:
   - Sets up or reloads the 5-ID snapshot pair.
   - When all 5 IDs remain active and `uncertainIds` is empty (`[]`), `uncertainMatchedManilaStillPublicCount` returns 5.
   - When an ID is in `uncertainIds` (e.g. `[3]`), returns null.
   - When an ID leaves `activeIds` (e.g. deactivated), returns null.
   - `uncertainMatchedManilaDayFlowCount("OPEN", matched)` is null, not matched and not 0.
   - `uncertainMatchedManilaDayFlowCount("CLOSED", matched)` is null.
   - `uncertainMatchedManilaDayFlowCount("OPEN", 100)` is null.
   - `uncertainMatchedManilaDayFlowCount("OPEN", 150)` is null.
   - `uncertainMatchedManilaDayFlowCount("OPEN", null)` is null.
   - Verifies the publication ledger stays empty, writer was not called, and 0 `CLOSED` snapshot rows exist.
3. Verification:
   Run the targeted integration test:
   `bun test packages/scraper/publication-gateway.integration.test.ts`
   Run typecheck:
   `bun run typecheck`
4. Document all changes in `c:\Users\admin\Desktop\va-freelance-hub\.agents\teamwork\teamwork_preview_worker_m2_1\changes.md` and write a full handoff report in `c:\Users\admin\Desktop\va-freelance-hub\.agents\teamwork\teamwork_preview_worker_m2_1\handoff.md`.
5. Send a completion message via send_message to your caller when done.
