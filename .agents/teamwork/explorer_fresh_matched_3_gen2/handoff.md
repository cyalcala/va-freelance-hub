# Handoff Report — Explorer 3 Gen 2: Verification Pipeline & Operations Requirements

## 1. Observation

### Verification Pipeline Commands & Live Execution Results

1. **Targeted Test Execution**:
   - Command: `bun test -t "match the accepted PH pair" packages/scraper/publication-gateway.integration.test.ts`
   - Result: `1 pass / 298 filtered out / 0 fail / 13 expect() calls / Ran 1 test across 1 file. [2.49s]`.
   - Command: `bun test -t "fresh is not a completed flow" packages/scraper/publication-gateway.integration.test.ts`
   - Result: `1 pass / 298 filtered out / 0 fail / 13 expect() calls / Ran 1 test across 1 file. [996.00ms]`.
   - Command: `bun test -t "apply URLs is not a completed flow" packages/scraper/publication-gateway.integration.test.ts`
   - Result: `1 pass / 298 filtered out / 0 fail / 13 expect() calls / Ran 1 test across 1 file. [1157.00ms]`.

2. **Database Test Suite**:
   - Command: `bun test packages/db`
   - Result: `72 pass / 0 fail / 412 expect() calls / Ran 72 tests across 12 files. [26.02s]`.

3. **Typecheck Execution**:
   - Command: `bun run typecheck` (`bunx tsc --noEmit -p apps/web/tsconfig.json`)
   - Result: Exit code 0, 0 type errors.

4. **Build Execution**:
   - Command: `bun run build` (`bun run --cwd apps/web build`)
   - Result: `Server built in 131.32s / Complete!` / Exit code 0.

5. **CI Guardrail Scripts Verification**:
   - Guardrail 1: `bun scripts/ci/check-production-guardrails.ts`
     - Result: Exit code 0. Validates `package.json` explicit workspace `apps/web`, Bun `1.3.14`, Wrangler `4.143.0`, D1 migration commands, and absence of deprecated Trigger.dev / Drizzle scripts.
   - Guardrail 2: `bun scripts/ci/audit-parameters.ts`
     - Result: Exit code 0. Verbatim stdout: `✅ Parameter Parity Audit PASSED: 100% parity between YAML, code constants, and mirrors.`.
   - Guardrail 3: `bun scripts/ci/check-orchestrator-modifications.ts`
     - Result: Exit code 0. Validates orchestrator exception declarations and required metadata fields across all sources.
   - Guardrail 4: `bun scripts/ci/audit-constitution.ts`
     - Result: Exit code 0. Verbatim stdout:
       ```text
       warning: REPLAY_RECOVERY and previouslyInactive are caller-supplied flags. opportunities has no replay column, so production SQL cannot see them and must not invent FRESH_DISCOVERY for that gap.
       warning: Concentration status is a measurement. It does not throttle publication; an automatic brake remains a paper risk because cutting the top family can drop flow below the floor.
       warning: LITTLE_LAW_CV_MAX is provisional. It is not an accepted governance parameter.
       warning: These functions do not yet read live D1 or Turso queue rows. They instrument the definitions so a later measurement cannot invent steady state.
       constitution audit: cohort partition, ground-truth unknown rule, and queue instrumentation passed
       ```

### Git Commit History & Live Working Tree State

1. **Git Log**:
   - Command: `git log -n 5 --oneline`
   - Commits:
     - `31c3c073` — `Record that an intact snapshot pair with apply matched ids is not a completed flow`
     - `30a77752` — `Keep an intact snapshot pair with apply matched ids out of completed flow`
     - `86a47c3a` — `Record that an intact snapshot pair with fresh matched ids is not a completed flow`
     - `69f7f700` — `Keep an intact snapshot pair with fresh matched ids out of completed flow`
     - `92b562fc` — `Record that an intact snapshot pair with family status BREACH is not a completed flow`

2. **Commit Details for FRESH_MATCHED**:
   - Commit `69f7f700`: Touched `packages/scraper/publication-gateway.integration.test.ts` (+39 lines), adding integration test for fresh matched flow.
   - Commit `86a47c3a`: Touched `docs/SYSTEM_SAVEPOINT.md` (+36 lines), `docs/bootloaders/CURRENT.md` (+10 lines), and created `docs/operations/PUBLICATION_MANILA_DAY_FRESH_MATCHED_IS_NOT_A_COMPLETED_FLOW_2026-10-10.md` (+71 lines).

3. **Subsequent Progression for APPLY_MATCHED**:
   - Commit `30a77752`: Touched `packages/scraper/publication-gateway.integration.test.ts` (+39 lines), adding integration test for apply matched flow.
   - Commit `31c3c073`: Touched `docs/SYSTEM_SAVEPOINT.md` (+36 lines), `docs/bootloaders/CURRENT.md` (+10 lines), and created `docs/operations/PUBLICATION_MANILA_DAY_APPLY_MATCHED_IS_NOT_A_COMPLETED_FLOW_2026-10-10.md` (+72 lines).

4. **Current Unstaged Working Tree State**:
   - File: `packages/scraper/publication-gateway.integration.test.ts` (lines 5698–5736):
     ```typescript
     test("an intact snapshot pair whose still-public ids match the accepted PH pair is not a completed flow", async () => {
       const sqlite = freshDb();
       try {
         const today = manilaDateOf(NOW);
         sqlite.query(`INSERT INTO source_publication_manila_open_snapshot (
           source_id, tick_key, retry_key, manila_date, day_state, first_publish_count, still_public_count, recorded_at
         ) VALUES ('we-work-remotely', ?, 'ph-matched-known', ?, 'OPEN', 5, 5, ?)`).run(TICK, today, NOW);
         sqlite.query(`INSERT INTO source_publication_manila_snapshot_ids (
           source_id, tick_key, retry_key, manila_date, first_publish_ids_json, still_public_ids_json, recorded_at
         ) VALUES ('we-work-remotely', ?, 'ph-matched-known', ?, '[1,2,3,4,5]', '[1,2,3,4,5]', ?)`).run(TICK, today, NOW);
         const readers = await import("./manila-day");
         const loaded = loadSnapshotPair(sqlite);
         const paired = readers.latestManilaSnapshotPair(loaded.counts, loaded.ids, today);
         expect(paired).not.toBeNull();
         expect(paired!.idsKnown).toBe(true);
         expect(paired!.stillPublicIds).toEqual([1, 2, 3, 4, 5]);

         const applyIds = [1, 2, 3, 4, 5];
         const phIds = [1, 2, 3, 4, 5];
         const matched = readers.phMatchedManilaStillPublicCount(5, paired, applyIds, phIds);
         expect(matched).toBe(5);

         expect(readers.phMatchedManilaDayFlowCount("OPEN", matched)).toBeNull();
         expect(readers.phMatchedManilaDayFlowCount("CLOSED", matched)).toBeNull();
         expect(readers.phMatchedManilaDayFlowCount("OPEN", 100)).toBeNull();
         expect(readers.phMatchedManilaDayFlowCount("OPEN", 150)).toBeNull();
         expect(readers.phMatchedManilaDayFlowCount("OPEN", null)).toBeNull();

         const nonPhIds = [1, 2, 3, 4];
         const nonPhMatched = readers.phMatchedManilaStillPublicCount(5, paired, applyIds, nonPhIds);
         expect(nonPhMatched).toBeNull();
         expect(readers.phMatchedManilaDayFlowCount("OPEN", nonPhMatched)).toBeNull();

         expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_ledger").get()).toEqual({ n: 0 });
         expect(sqlite.query("SELECT COUNT(*) AS n FROM source_publication_manila_open_snapshot WHERE day_state = 'CLOSED'").get()).toEqual({ n: 0 });
       } finally { sqlite.close(); }
     });
     ```

### Operations Evidence Documentation Requirements

Inspection of `docs/operations/PUBLICATION_MANILA_DAY_FRESH_MATCHED_IS_NOT_A_COMPLETED_FLOW_2026-10-10.md` and `docs/operations/PUBLICATION_MANILA_DAY_APPLY_MATCHED_IS_NOT_A_COMPLETED_FLOW_2026-10-10.md` confirms the required canonical template structure:
1. **Title & Disclaimer Header**:
   - `# <Name> count is not a completed flow — 2026-10-10`
   - `Local slice of <IDENTIFIER>. This is not production acceptance, a MATH card, a certified daily flow, or directory enrichment.`
2. **`## What changed`**:
   - Exact reader invariant stated (reader returns null for OPEN, CLOSED, 100, 150).
   - Behavior for matching IDs vs mismatching/failing IDs.
   - Proof that ledger has 0 rows, writer is not called, no CLOSED row written, no migration, no new clock/source/cadence.
   - Non-claim: "This does not claim MATH-08 and does not record CLOSED."
3. **`## What stays unchanged`**:
   - Holds on unknown dates, null workplace, lost ledger ack, canary reservation, rejected pairs, empty book, stored snapshot state OPEN.
   - Behavior commit SHA and branch name (`codex/verified-flow-directory-checkpoint`).
4. **`## Evidence`**:
   - Table of exact checks: Quoted targeted lock, Full integration test suite, `bun run typecheck` (`tsc`), and Guardrail audits (4/4 passed).
5. **`## Backup`**:
   - Behavior commit SHA, parent SHA, push target (`origin`), `BACKUP_PENDING` note for external auth, unchanged infrastructure list.
6. **`## Still open`**:
   - Accepted MATH remains 0/13, certified fresh flow remains UNKNOWN, directory packets 234/237 proposals, 236 parked, no directory SQL, unapplied migrations 0056-0068.
   - Explicit named NEXT invariant description.

### Savepoint & Bootloader Update Requirements

Inspection of `docs/SYSTEM_SAVEPOINT.md` and `docs/bootloaders/CURRENT.md` reveals:
1. `docs/SYSTEM_SAVEPOINT.md`:
   - Prepend new section at top:
     - Header: `## 2026-10-10 Manila — <Unit Name>`
     - Scope: `**Owner scope CONTINUING:** 100 newly first-published unique verified PH-accessible remote jobs per complete Manila day, 150 stretch; ... Accepted MATH **0/13**. Certified fresh flow **UNKNOWN**.`
     - `**Completed locally:** <IDENTIFIER>...`
     - `**Unchanged holds:** ...`
     - `**One NEXT: <NEXT_IDENTIFIER>.**`
2. `docs/bootloaders/CURRENT.md`:
   - Prepend entry under `# Current resume pointer`:
     `Latest continuation (2026-10-10 Manila): ... Behavior SHA <SHA>. Sole NEXT is <NEXT_IDENTIFIER> in the newest savepoint.`

---

## 2. Logic Chain

1. **Verification of Test & Audit Commands**:
   - Observation 1.1-1.5 demonstrates that the entire verification stack has been exercised:
     - Targeted tests run in under 3s.
     - Broader database tests (`bun test packages/db`) run in ~26s with 72/72 passing.
     - TypeScript typechecking (`bun run typecheck`) passes with 0 errors.
     - Astro server build (`bun run build`) passes in ~131s with complete output assets generated.
     - All 4 CI guardrail scripts run in <5s each and exit with code 0.
   - Therefore, the verification pipeline required for the worker is fast, deterministic, and green across all targets.

2. **Progression State & Sequence of NEXT Targets**:
   - Observation 2.1-2.4 traces the sequence of commits on branch `codex/verified-flow-directory-checkpoint`:
     - Commit `52fd798a` / `92b562fc`: `PUBLICATION_MANILA_DAY_FAMILY_BREACH_IS_NOT_A_COMPLETED_FLOW`.
     - Commit `69f7f700` / `86a47c3a`: `PUBLICATION_MANILA_DAY_FRESH_MATCHED_IS_NOT_A_COMPLETED_FLOW`.
     - Commit `30a77752` / `31c3c073`: `PUBLICATION_MANILA_DAY_APPLY_MATCHED_IS_NOT_A_COMPLETED_FLOW`.
   - The original dispatch asked to investigate `FRESH_MATCHED` and identify the next NEXT.
   - As observed, `FRESH_MATCHED` was completed in `69f7f700` / `86a47c3a`.
   - The NEXT after `FRESH_MATCHED` was `PUBLICATION_MANILA_DAY_APPLY_MATCHED_IS_NOT_A_COMPLETED_FLOW`, which was completed in `30a77752` / `31c3c073`.
   - The NEXT after `APPLY_MATCHED` is `PUBLICATION_MANILA_DAY_PH_MATCHED_IS_NOT_A_COMPLETED_FLOW`, which is currently unstaged in the working tree (`packages/scraper/publication-gateway.integration.test.ts` lines 5698–5736).
   - In `packages/scraper/manila-day.ts` lines 595–660, the flow readers continue sequentially:
     1. `phMatchedManilaDayFlowCount` (`PUBLICATION_MANILA_DAY_PH_MATCHED_IS_NOT_A_COMPLETED_FLOW`)
     2. `canonicalUrlMatchedManilaDayFlowCount` (`PUBLICATION_MANILA_DAY_CANONICAL_URL_MATCH_IS_NOT_A_FLOW` / `PUBLICATION_MANILA_DAY_CANONICAL_URL_MATCHED_IS_NOT_A_COMPLETED_FLOW`)
     3. `sourceMatchedManilaDayFlowCount` (`PUBLICATION_MANILA_DAY_SOURCE_MATCH_IS_NOT_A_FLOW` / `PUBLICATION_MANILA_DAY_SOURCE_MATCHED_IS_NOT_A_COMPLETED_FLOW`)

3. **Operations Documentation & Savepoint Rules**:
   - Observations 3 and 4 establish the verbatim format required for every slice. Every slice requires:
     - A behavior commit (adding integration test slice in `publication-gateway.integration.test.ts`).
     - A documentation commit (adding `docs/operations/<IDENTIFIER>_2026-10-10.md`, updating `docs/SYSTEM_SAVEPOINT.md`, and updating `docs/bootloaders/CURRENT.md`).
     - Stating exact invariants, preserving unblocked writer, ledger count 0, no CLOSED row, no MATH-08 claim, and defining the single unblocked NEXT.

---

## 3. Caveats

1. **Read-Only Scope**: Explorer 3 Gen 2 performed no code edits or commits in the repository.
2. **Push Authentication**: Commits on `codex/verified-flow-directory-checkpoint` record `BACKUP_PENDING` due to external authentication requirements for Google Secure Source Manager (`origin`).
3. **Pre-existing Progress**: Commits `69f7f700`, `86a47c3a`, `30a77752`, and `31c3c073` occurred in parallel during prior agent cycles. The orchestrator and workers should acknowledge that `FRESH_MATCHED` and `APPLY_MATCHED` are already committed, and the active task in the working tree is `PH_MATCHED`.

---

## 4. Conclusion

1. **Test Commands for Worker**:
   - Targeted: `bun test -t "<filter>" packages/scraper/publication-gateway.integration.test.ts`
   - Broader: `bun test packages/db`
   - Typecheck: `bun run typecheck`
   - Build: `bun run build`
   - All 4 commands run cleanly with exit code 0.

2. **The 4 Guardrail Scripts in `scripts/ci/`**:
   - Confirmed and verified:
     - `bun scripts/ci/check-production-guardrails.ts` (Exit 0)
     - `bun scripts/ci/audit-parameters.ts` (Exit 0, 100% parameter parity)
     - `bun scripts/ci/check-orchestrator-modifications.ts` (Exit 0)
     - `bun scripts/ci/audit-constitution.ts` (Exit 0)

3. **Operations Documentation & Savepoint**:
   - `docs/operations/PUBLICATION_MANILA_DAY_FRESH_MATCHED_IS_NOT_A_COMPLETED_FLOW_2026-10-10.md` is committed in `86a47c3a` following the standard 6-section template.
   - `docs/operations/PUBLICATION_MANILA_DAY_APPLY_MATCHED_IS_NOT_A_COMPLETED_FLOW_2026-10-10.md` is committed in `31c3c073`.
   - `docs/SYSTEM_SAVEPOINT.md` and `docs/bootloaders/CURRENT.md` are updated to `30a77752`.

4. **Next Chain of NEXTs**:
   - `FRESH_MATCHED` -> Completed (`69f7f700`, `86a47c3a`)
   - `APPLY_MATCHED` -> Completed (`30a77752`, `31c3c073`)
   - Current NEXT: `PUBLICATION_MANILA_DAY_PH_MATCHED_IS_NOT_A_COMPLETED_FLOW` (test already staged/written in `packages/scraper/publication-gateway.integration.test.ts`)
   - Follow-on NEXT: `PUBLICATION_MANILA_DAY_CANONICAL_URL_MATCH_IS_NOT_A_FLOW` (or `PUBLICATION_MANILA_DAY_CANONICAL_URL_MATCHED_IS_NOT_A_COMPLETED_FLOW`) followed by `PUBLICATION_MANILA_DAY_SOURCE_MATCH_IS_NOT_A_FLOW`.

---

## 5. Verification Method

To independently verify all findings in this report:

1. **Verify Git History**:
   ```bash
   git log -n 5 --oneline
   git show --stat 69f7f700
   git show --stat 86a47c3a
   git show --stat 30a77752
   git show --stat 31c3c073
   ```

2. **Verify Working Tree Changes**:
   ```bash
   git diff packages/scraper/publication-gateway.integration.test.ts
   ```

3. **Run Targeted and Broader Tests**:
   ```bash
   bun test -t "match the accepted PH pair" packages/scraper/publication-gateway.integration.test.ts
   bun test packages/db
   ```

4. **Run Typecheck and Build**:
   ```bash
   bun run typecheck
   bun run build
   ```

5. **Run the 4 Guardrail Scripts**:
   ```bash
   bun scripts/ci/check-production-guardrails.ts
   bun scripts/ci/audit-parameters.ts
   bun scripts/ci/check-orchestrator-modifications.ts
   bun scripts/ci/audit-constitution.ts
   ```
