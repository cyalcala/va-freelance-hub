# Forensic Integrity Audit Report: Milestone 2

**Work Product**: Milestone 2 — Trusted PH Employer Evidence, Shift & Working-Hour Classification, GeoGate Step 8 Integration, and Public Slicing Filters
**Files Audited**:
- `packages/scraper/trustedEmployers.ts`
- `packages/scraper/shiftClassifier.ts`
- `packages/scraper/geoGate.ts`
- `packages/scraper/trustedEmployers.test.ts`
- `packages/scraper/shiftClassifier.test.ts`
- `packages/scraper/adversarial-counterexamples.test.ts`
- `apps/web/src/lib/public-board.ts`
- `apps/web/src/pages/opportunities.astro`
- `apps/web/tests/public-snapshot.test.ts`
- `apps/web/tests/job-detail-shift.test.ts`

**Profile**: General Project
**Integrity Mode**: Development Mode (as specified in `ORIGINAL_REQUEST.md`)
**VERDICT: CLEAN**

---

## Forensic Verification Check Summary

| # | Forensic Check | Result | Evidence / Details |
|---|----------------|:------:|-------------------|
| 1 | **Hardcoded Test Results** | **PASS** | No test-specific return strings, constant short-circuits, or hardcoded pass values found in production modules. Catalog of 11 vetted employers in `trustedEmployers.ts` is a formal domain model required by R2 of `ORIGINAL_REQUEST.md`. Dynamic normalization and lookups are genuinely computed. |
| 2 | **Facade / Stub Implementations** | **PASS** | Zero dummy functions, zero placeholder stubs, and zero unimplemented methods. All exported functions (`findTrustedEmployer`, `isTrustedPhEmployer`, `classifyShift`, `geoGate`, `slicePublicJobs`) execute genuine parsing, regex matching, and boolean logic. |
| 3 | **Fabricated Verification Outputs** | **PASS** | No pre-populated logs, mock assertions, or attestation files exist in the workspace. All test results were produced through live, empirical tool executions (`bun test`, `bun run test`, `bun run typecheck`, `bun run build`). |
| 4 | **Self-Certifying Tests** | **PASS** | Test suites execute meaningful assertions against diverse inputs, edge cases, negative constraints, and adversarial counterexamples. No trivial tautologies (`expect(true).toBe(true)`). |
| 5 | **Constitutional Invariant Preservation** | **PASS** | Constitutional Zeros strictly verified: Pineapple Staffing (0% published), Affordable Staff onsite/hybrid (0% published), UpGuard Australia (0% published). The 4-way separation matrix (`Employer PH confidence != Job validity != PH eligibility != Role relevance`) is strictly upheld. |
| 6 | **Schedule Fabrication Safeguards** | **PASS** | `shiftClassifier.ts` strictly extracts explicit textual/time cues. Timezone metadata alone (`clientTimezone`), deadlines, clinical terminology, negation, and conflicting shift markers safely evaluate to `unknown` without fabricating work schedules. |

---

## 1. Observation

Direct empirical inspections, static code audits, and test executions yielded the following evidence:

### A. Static Code Audit
1. `packages/scraper/trustedEmployers.ts`:
   - Catalogs 11 high-confidence vetted employers hiring remote Filipinos (`hunt-st`, `coconutva`, `20four7va`, `crewbloom`, `pearltalent`, `hammerjack`, `multiplymii`, `athena`, `hello-rache`, `sourcefit`, `rocketams`).
   - Normalization function `normalizeIdentifier` (lines 156–162) genuinely strips platform prefixes (`workable:`, `breezy:`, `greenhouse:`, `ashby:`, `lever:`), non-alphanumeric punctuation, and lowercases tokens.
   - `findTrustedEmployer` (lines 167–195) iterates through catalog profiles, matching on `id`, `companyName`, and `aliases`.
   - No hardcoded test bypasses or mock branches exist.

2. `packages/scraper/shiftClassifier.ts`:
   - Genuine regex implementations: `FLEXIBLE` (line 19), `PHT_DAYTIME_SPAN` (line 20), `SHIFT_MARKERS` (lines 22–26).
   - Negation regex `/\b(?:no|not|without)\b[^.!?\n]{0,40}\b(?:shift|hours|async|flexible)\b/i` prevents false positives on negated phrases (e.g. "no night shift required").
   - Conflicting markers (`effectiveMatches.length > 1`) safely fall back to `category: "unknown"`.
   - `phWorkingHours` is extracted strictly when `category === "day_shift"` and an explicit PHT daytime span is present.

3. `packages/scraper/geoGate.ts`:
   - Sequential 10-step pipeline:
     * **Step 0** (lines 289–301): Rejects non-remote location types via `hasExplicitNonRemoteLocationType` and onsite/hybrid markers in title and structured location string via `ONSITE_TITLE_REGEX`.
     * **Step 1** (lines 303–324): Detects explicit Philippine and APAC mentions. Title APAC tokens require `!structuredLocationPin(locationRaw)`.
     * **Step 2** (lines 326–333): Rejects non-English text and domestic localized non-remote/student roles (`m/w/d`, `werkstudent`, `alternance`).
     * **Step 3** (lines 335–339): Checks source language tags.
     * **Step 4** (lines 341–347): Detects structured location pins (US country/states/cities, foreign countries/cities, excluded regions).
     * **Step 5** (lines 349–409): Inspects title parentheticals, bracket segments, pipe/dash delimiters, and title country locks.
     * **Step 6** (lines 411–415): Inspects hard residence and work-authorization locks (`RESIDENCE_LOCK_REGEX`).
     * **Step 7** (lines 418–425): Inspects worldwide language hints.
     * **Step 8** (lines 427–437): Resolves authoritative employer evidence via `findTrustedEmployer(input.company || input.sourceId)`.
     * **Step 9** (lines 439–441): Defaults to `unknown`.
   - Step 8 evaluates ONLY after Steps 0 through 7 have returned null. Any opening that triggers Step 0, Step 2, Step 4, Step 5, or Step 6 terminates immediately with `ineligible`.

4. `apps/web/src/lib/public-board.ts` & `apps/web/src/pages/opportunities.astro`:
   - `PublicJob` includes optional `shiftCategory` and `isDayshift`.
   - `slicePublicJobs` (lines 145–156) resolves `shiftCategory` with fallback to `classifyShift` and accurately filters by `options.shift`.
   - `opportunities.astro` exposes the `Work schedule` dropdown (`day_shift`, `flexible`, `mid_shift`, `night_shift`), passes the query parameter into `slicePublicJobs`, and renders active filter removal chips.

### B. Empirical Command Execution
1. **Targeted Milestone 2 Tests**:
   - Command: `bun test --no-env-file --preload ./scripts/ci/test-environment.ts ./packages/scraper/trustedEmployers.test.ts ./packages/scraper/shiftClassifier.test.ts ./packages/scraper/adversarial-counterexamples.test.ts`
   - Output: `69 pass, 0 fail, 283 expect() calls. Ran 69 tests across 3 files. [574.00ms]`
2. **Public Snapshot Tests**:
   - Command: `bun test --no-env-file --preload ./scripts/ci/test-environment.ts ./apps/web/tests/public-snapshot.test.ts`
   - Output: `43 pass, 0 fail, 155 expect() calls. Ran 43 tests across 1 file. [7.96s]`
3. **Job Detail Shift Tests**:
   - Command: `bun test --no-env-file --preload ./scripts/ci/test-environment.ts ./apps/web/tests/job-detail-shift.test.ts`
   - Output: `1 pass, 0 fail, 6 expect() calls. Ran 1 test across 1 file. [893.00ms]`
4. **Workspace Typecheck**:
   - Command: `bun run typecheck` (`bunx tsc --noEmit -p apps/web/tsconfig.json`)
   - Output: Exited with code 0 (zero type errors).
5. **Web Build Preflight**:
   - Command: `bun run build` (`astro build`)
   - Output: Exited with code 0 (Client built in 7.84s, Server built in 83.26s, Complete!).
6. **Empirical Edge-Case Probe** (`bun -e`):
   - Command:
     ```bash
     bun -e "
     import { findTrustedEmployer } from './packages/scraper/trustedEmployers';
     import { classifyShift } from './packages/scraper/shiftClassifier';
     import { geoGate } from './packages/scraper/geoGate';
     console.log('hunt-st:', findTrustedEmployer('hunt-st')?.companyName);
     console.log('workable:hunt-st:', findTrustedEmployer('workable:hunt-st')?.companyName);
     console.log('HUNT STREET:', findTrustedEmployer('HUNT STREET')?.companyName);
     console.log('bogus:', findTrustedEmployer('bogus-company'));
     console.log('PHT span:', JSON.stringify(classifyShift({ description: 'Schedule: 8am - 5pm Manila time' })));
     console.log('Negated span:', JSON.stringify(classifyShift({ description: 'No 8am - 5pm Manila time shift' })));
     console.log('Conflicting shifts:', JSON.stringify(classifyShift({ description: 'Day shift or night shift' })));
     console.log('Hunt St remote clean:', geoGate({ company: 'Hunt St', title: 'VA', locationRaw: 'Remote', locationType: 'remote' }).phEligibility);
     console.log('Hunt St UK locked:', geoGate({ company: 'Hunt St', title: 'VA', locationRaw: 'London, UK', locationType: 'remote' }).phEligibility);
     console.log('Hunt St onsite:', geoGate({ company: 'Hunt St', title: 'VA', locationRaw: 'Manila', locationType: 'onsite' }).phEligibility);
     console.log('Pineapple US locked:', geoGate({ company: 'Pineapple Staffing', locationRaw: 'United States', locationType: 'remote' }).phEligibility);
     console.log('Affordable Staff onsite:', geoGate({ company: 'Affordable Staff', locationRaw: 'Bacolod, Philippines', locationType: 'onsite' }).phEligibility);
     console.log('UpGuard Australia:', geoGate({ company: 'UpGuard', title: 'Director, APAC', locationRaw: 'Australia', locationType: 'remote' }).phEligibility);
     "
     ```
   - Output:
     ```
     hunt-st: Hunt St
     workable:hunt-st: Hunt St
     HUNT STREET: Hunt St
     bogus: null
     PHT span: {"category":"day_shift","clientTimezone":null,"phWorkingHours":"8am - 5pm Manila time","isAsyncOrFlexible":false,"isDayshift":true,"evidence":"Source states day shift (8am - 5pm Manila time)"}
     Negated span: {"category":"unknown","clientTimezone":null,"phWorkingHours":null,"isAsyncOrFlexible":false,"isDayshift":false,"evidence":"Working schedule is unstated, negated, or conflicting"}
     Conflicting shifts: {"category":"unknown","clientTimezone":null,"phWorkingHours":null,"isAsyncOrFlexible":false,"isDayshift":false,"evidence":"Working schedule is unstated, negated, or conflicting"}
     Hunt St remote clean: eligible_verified
     Hunt St UK locked: ineligible
     Hunt St onsite: ineligible
     Pineapple US locked: ineligible
     Affordable Staff onsite: ineligible
     UpGuard Australia: ineligible
     ```
7. **Adversarial Stress Test Scripts**:
   - `bun scripts/adversarial-dayshift-stress.ts`: Exited with code 0 (All empirical adversarial stress tests passed, 0 failures).
   - `bun scripts/adversarial-shift-challenge.ts`: Exited with code 0 (All adversarial challenges passed, 0 failures).
8. **Full Repository Test Suite**:
   - Command: `bun run test`
   - Output: `4469 pass, 0 fail, 331551 expect() calls. Ran 4469 tests across 268 files. [463.55s]`

---

## 2. Logic Chain

1. **Decoupling of Employer Identity and Vacancy Geography (4-Way Separation Matrix)**:
   - `packages/scraper/trustedEmployers.ts` explicitly establishes the separation `Employer PH confidence != Job validity != PH eligibility != Role relevance`.
   - In `packages/scraper/geoGate.ts`, Step 8 (trusted employer lookup) is situated strictly after Step 0 (workplace type and onsite/hybrid markers), Step 2 (non-English text), Step 4 (structured foreign location pins), Step 5 (title country pins), and Step 6 (hard residence/authorization locks).
   - Any job failing Steps 0 through 6 returns `ineligible` immediately.
   - Therefore, employer trust cannot bypass foreign country pins, onsite requirements, or residence restrictions.

2. **Safe Recovery of Legitimate Remote Filipino Openings**:
   - When a job from a vetted employer (e.g. Hunt St, Coconut VA, Hammerjack) has remote workplace type, no foreign country lock, and no onsite requirement, Step 8 reliably resolves it to `eligible_verified` under its designated scope (`ph_only` or `apac_incl_ph`).
   - This fixes the false-negative problem where remote Philippine openings from vetted agencies were previously dropped due to unstated country strings in ATS payloads, without requiring descriptions to artificially repeat "Philippines".

3. **Strict Invariant Holding for Constitutional Zeros**:
   - Pineapple Staffing: Has United States location pin and stale dates (2020–2022). Fails Step 4 and freshness, resulting in strictly 0 published rows.
   - Affordable Staff: Bacolod office onsite listing fails Step 0 (`locationType: "onsite"` or `ONSITE_TITLE_REGEX`), resulting in strictly 0 published rows.
   - UpGuard: Australia location pin at Step 4 suppresses title APAC token, resulting in strictly 0 published rows.
   - Counterexample tests pass 100% across all suites.

4. **Algorithmic Integrity in Shift Classification**:
   - `shiftClassifier.ts` implements explicit regex checks for daytime spans and schedule markers.
   - It respects schedule boundaries: timezone alone (`clientTimezone`) does not trigger dayshift classification. Application deadlines, medical terminology, negation, and conflicting markers cleanly evaluate to `unknown`.
   - Public board integration (`slicePublicJobs` and `opportunities.astro`) cleanly filters by shift without leaking unclassified listings.

5. **No Prohibited Forensic Patterns**:
   - Mode-specific verification under Development Mode (as defined in `ORIGINAL_REQUEST.md`) detected zero hardcoded test results, zero facade functions, and zero fabricated verification outputs.

---

## 3. Caveats

- **No Caveats**: The codebase, test suites, builds, and typechecks were independently measured and verified with direct tool execution. All assertions and invariants hold cleanly.

---

## 4. Conclusion

**VERDICT: CLEAN**

Milestone 2 is completely clean of integrity violations:
- The 4-way separation matrix is rigorously implemented in production code and validated through adversarial tests.
- Trusted PH employer evidence safely resolves at geoGate Step 8 without bypassing negative country or workplace constraints.
- Constitutional Zero invariants (Pineapple Staffing = 0, Affordable Staff onsite = 0, UpGuard Australia = 0) strictly hold.
- Dayshift classification accurately extracts PHT daytime spans and APAC daytime markers without fabricating unstated schedules.
- Public schedule filtering is fully integrated across Astro templates, TypeScript libraries, and snapshot test suites.
- Full workspace test suite (4,469 tests across 268 files), typecheck, and production web build pass with 0 errors.

The work product is approved without reservations.

---

## 5. Verification Method

To independently reproduce this forensic audit:

1. **Execute Targeted Milestone 2 Tests**:
   ```bash
   bun test --no-env-file --preload ./scripts/ci/test-environment.ts ./packages/scraper/trustedEmployers.test.ts ./packages/scraper/shiftClassifier.test.ts ./packages/scraper/adversarial-counterexamples.test.ts
   ```
   *Expected*: 69 pass, 0 fail, 283 assertions.

2. **Execute Public Snapshot Tests**:
   ```bash
   bun test --no-env-file --preload ./scripts/ci/test-environment.ts ./apps/web/tests/public-snapshot.test.ts
   ```
   *Expected*: 43 pass, 0 fail, 155 assertions.

3. **Execute Workspace Typecheck**:
   ```bash
   bun run typecheck
   ```
   *Expected*: Exits with code 0.

4. **Execute Production Web Build**:
   ```bash
   bun run build
   ```
   *Expected*: Astro build completes with code 0.

5. **Execute Full Repository Test Suite**:
   ```bash
   bun run test
   ```
   *Expected*: 4,469 tests pass, 0 fail across 268 files.

6. **Execute Empirical Edge-Case Probe**:
   ```bash
   bun -e "
   import { findTrustedEmployer } from './packages/scraper/trustedEmployers';
   import { classifyShift } from './packages/scraper/shiftClassifier';
   import { geoGate } from './packages/scraper/geoGate';
   console.log('hunt-st:', findTrustedEmployer('hunt-st')?.companyName);
   console.log('workable:hunt-st:', findTrustedEmployer('workable:hunt-st')?.companyName);
   console.log('PHT span:', JSON.stringify(classifyShift({ description: 'Schedule: 8am - 5pm Manila time' })));
   console.log('Hunt St remote:', geoGate({ company: 'Hunt St', title: 'VA', locationRaw: 'Remote', locationType: 'remote' }).phEligibility);
   console.log('Hunt St UK locked:', geoGate({ company: 'Hunt St', title: 'VA', locationRaw: 'London, UK', locationType: 'remote' }).phEligibility);
   console.log('Pineapple US locked:', geoGate({ company: 'Pineapple Staffing', locationRaw: 'United States', locationType: 'remote' }).phEligibility);
   console.log('Affordable Staff onsite:', geoGate({ company: 'Affordable Staff', locationRaw: 'Bacolod, Philippines', locationType: 'onsite' }).phEligibility);
   console.log('UpGuard Australia:', geoGate({ company: 'UpGuard', title: 'Director, APAC', locationRaw: 'Australia', locationType: 'remote' }).phEligibility);
   "
   ```
   *Expected*: Validates normalization, shift span extraction, and negative constraint dominance.
