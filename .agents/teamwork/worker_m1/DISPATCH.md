# Dispatch Assignment — worker_m1

**Milestone**: M1 (Behavioral Bloat Elimination & Adversarial Safety Tests)
**Role**: Implementation Worker (`teamwork_preview_worker`)
**Working Directory**: c:\Users\admin\Desktop\va-freelance-hub\.agents\teamwork\worker_m1
**Original Request**: c:\Users\admin\Desktop\va-freelance-hub\.agents\teamwork\ORIGINAL_REQUEST.md
**Project Plan**: c:\Users\admin\Desktop\va-freelance-hub\.agents\teamwork\orchestrator_9\PROJECT.md
**Explorer Reports**:
- Explorer M1-1 Handoff: c:\Users\admin\Desktop\va-freelance-hub\.agents\teamwork\explorer_m1_1\handoff.md
- Explorer M1-1 Analysis: c:\Users\admin\Desktop\va-freelance-hub\.agents\teamwork\explorer_m1_1\analysis.md
- Explorer M1-2 Handoff: c:\Users\admin\Desktop\va-freelance-hub\.agents\teamwork\explorer_m1_2\handoff.md
- Explorer M1-2 Analysis: c:\Users\admin\Desktop\va-freelance-hub\.agents\teamwork\explorer_m1_2\analysis.md
- Explorer M1-3 Handoff: c:\Users\admin\Desktop\va-freelance-hub\.agents\teamwork\explorer_m1_3\handoff.md
- Explorer M1-3 Analysis: c:\Users\admin\Desktop\va-freelance-hub\.agents\teamwork\explorer_m1_3\analysis.md
- Bloat Ledger: c:\Users\admin\Desktop\va-freelance-hub\docs\operations\BEHAVIORAL_BLOAT_LEDGER_2026-10-14.md

## MANDATORY INTEGRITY WARNING
> DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Assigned Tasks
Implement the concrete bloat consolidations and adversarial tests synthesized from Explorer reports:

1. **`packages/scraper/triage.ts`**:
   - Update line 374 to check `if (!env?.AI && !geminiKey && !groqKey)` so Gemini/Groq providers are not bypassed when `env.AI` is undefined.
   - Delete obsolete timezone strings (`"us timezone only"`, `"est only"`, `"pst only"`, `"mst only"`, `"cst only"`) from `GEOGRAPHIC_EXCLUSION_REGEX` so US-hours remote VA roles are not falsely vetoed by `deterministicReject`.
   - In lines 380-421, replace duplicate keyword categorization logic by reusing canonical `categorizeOpportunityTitle` from `packages/scraper/categorizer.ts`.

2. **`packages/scraper/geoGate.ts`**:
   - Add `LOCAL_OR_NON_ENGLISH_REGEX` check at Step 2b to reject German/French domestic roles (`m/w/d`, `werkstudent`, `alternance`, etc.) early, preserving AI budget.
   - Unify location pin checking with `detectStructuredLocationPin(locationRaw)`.

3. **`packages/scraper/json.ts`**:
   - In `PHYSICAL_OR_LOGISTICS_ROLE_REGEX` (line 74), narrow `\bdelivery\b` to `\b(delivery driver|food delivery|parcel delivery)\b` to prevent dropping valid remote tech/service delivery roles.

4. **`apps/web/src/pages/api/cron/scrape.ts`**:
   - In `drainPendingTriageQueue` (lines 423-465), reject immediately when `gate.phEligibility === "ineligible"` before spending AI subrequests.
   - Fix D1 `clientTimezone` data loss: in `triagedItems.push` (lines 3017-3043) and `drainPendingTriageInline` (lines 513-531), spread `clientTimezone: triage.clientTimezone ?? (item as any).clientTimezone ?? null`.
   - Add in-memory URL deduplication to `newItems` before `selectIntakeBatch` to prevent duplicate AI calls on identical scraped URLs.

5. **Adversarial Test Suite Implementation**:
   - Implement `packages/scraper/adversarial-counterexamples.test.ts` as specified in Explorer M1-3's analysis.
   - Assert all 5 protected invariants and counterexamples (Pineapple Staffing = 0 public, Affordable Staff = 0 public, UpGuard APAC country lock, intake fairness, workable rotation decoupling).
   - Run tests:
     `bun test ./packages/scraper/adversarial-counterexamples.test.ts ./apps/web/tests/intake-fairness.test.ts ./apps/web/tests/rotation-vs-intake.test.ts ./packages/scraper/triage-decision.test.ts ./packages/scraper/geoGate.test.ts ./packages/scraper/publication-freshness.test.ts`
   - Run typecheck and full suite: `bun run typecheck`, `bun test`.

## Output Requirements
Produce `handoff.md` in your working directory documenting:
- Observations & Logic Chain
- Exact files modified and changes made
- Test execution commands and full results (passing test counts, assertions, runtime)
- Layout compliance and verification method
- Send completion message to parent orchestrator (`27133579-1ec8-4773-aa06-ab0ff4ef177c`).

## 2026-10-15T13:48:31Z
Received dispatch message:
Tasks:
1. Implement the concrete bloat consolidations in packages/scraper/triage.ts, packages/scraper/geoGate.ts, packages/scraper/json.ts, and apps/web/src/pages/api/cron/scrape.ts (including D1 clientTimezone propagation and intra-batch URL dedup).
2. Implement packages/scraper/adversarial-counterexamples.test.ts as specified by Explorer M1-3.
3. Run tests and typecheck:
   bun test ./packages/scraper/adversarial-counterexamples.test.ts ./apps/web/tests/intake-fairness.test.ts ./apps/web/tests/rotation-vs-intake.test.ts ./packages/scraper/triage-decision.test.ts ./packages/scraper/geoGate.test.ts ./packages/scraper/publication-freshness.test.ts
   bun run typecheck
   bun test
4. Document all changes and test outputs in c:\Users\admin\Desktop\va-freelance-hub\.agents\teamwork\worker_m1\handoff.md.
5. Send completion message to parent (Recipient: 27133579-1ec8-4773-aa06-ab0ff4ef177c).
