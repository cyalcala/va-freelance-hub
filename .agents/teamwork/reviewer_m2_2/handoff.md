# Milestone 2 Independent Adversarial Review Report (Reviewer 2)

## 1. Observation

Direct code examination, adversarial stress testing, and build verification yielded the following verified evidence:

### A. Code Robustness & Interface Contracts
1. **`packages/scraper/trustedEmployers.ts` (lines 1–203)**:
   - Contains immutable definitions for 11 high-confidence vetted Philippine employers (`hunt-st`, `coconutva`, `20four7va`, `crewbloom`, `pearltalent`, `hammerjack`, `multiplymii`, `athena`, `hello-rache`, `sourcefit`, `rocketams`).
   - `normalizeIdentifier` cleanly strips ATS prefixes (`workable:`, `breezy:`, `greenhouse:`, `ashby:`, `lever:`) and non-alphanumeric characters.
   - `findTrustedEmployer` performs strict normalization and exact match checks against canonical IDs, company names, and aliases. Lookups for unknown or empty employers return `null` (`isTrustedPhEmployer` returns `false`).
   - The 4-way separation matrix is explicitly defined and enforced:
     ```
     Employer PH confidence != Job validity != PH eligibility != Role relevance
     ```

2. **`packages/scraper/geoGate.ts` (lines 282–441)**:
   - Gate evaluation sequence strictly enforces negative boundary filters BEFORE employer trust:
     - **Step 0 (lines 289–301)**: Rejects non-remote workplace types (`hasExplicitNonRemoteLocationType(input.locationType)`) and onsite/hybrid markers in title and `locationRaw` via `ONSITE_TITLE_REGEX`.
     - **Step 1 (lines 303–324)**: Detects explicit Philippines and APAC mentions.
     - **Step 2 (lines 326–333)**: Rejects non-English text and domestic localized non-English or student roles (`m/w/d`, `werkstudent`, `alternance`).
     - **Step 3 (lines 335–339)**: Rejects non-English source language tags.
     - **Step 4 (lines 341–347)**: Detects structured foreign location pins (`detectStructuredLocationPin(locationRaw)` covering US country/state codes, foreign countries, foreign cities, and excluded regions).
     - **Step 5 (lines 349–409)**: Inspects title parentheticals, bracket segments, pipe/dash delimiters, and title country locks.
     - **Step 6 (lines 411–415)**: Rejects hard residence and work-authorization locks (`RESIDENCE_LOCK_REGEX`).
     - **Step 7 (lines 418–425)**: Evaluates worldwide metadata.
     - **Step 8 (lines 427–437)**: Resolves authoritative employer evidence via `findTrustedEmployer(input.company || input.sourceId)`.
     - **Step 9 (lines 439–441)**: Defaults to `unknown` / `unclear`.

3. **`packages/scraper/shiftClassifier.ts` (lines 1–67)**:
   - `classifyShift(input: ShiftClassifierInput)` extracts shift categories (`day_shift`, `mid_shift`, `night_shift`, `flexible`, `unknown`) and Philippine daytime spans.
   - PHT Daytime Span Regex (line 20):
     ```typescript
     const PHT_DAYTIME_SPAN = /\b((?:(?:0?[6-9]|10)(?::[0-5][0-9])?\s*(?:am|a\.m\.)?)\s*[-–—to]+\s*(?:(?:0?[2-6]|1[4-8])(?::[0-5][0-9])?\s*(?:pm|p\.m\.)?)\s*(?:pht\b|manila(?:\s*time)?|philippine(?:\s*time)?|\(pht\)))/i;
     ```
   - Working hours extraction rule (lines 50–52):
     ```typescript
     const phWorkingHours = (!negated && category === "day_shift" && phtSpanMatch)
       ? phtSpanMatch[1].trim()
       : null;
     ```
   - Negation check (line 34) and conflict handling (line 46) force `category: "unknown"` and `phWorkingHours: null` when negated (`"no night shift required"`, `"no 8am - 5pm Manila time shift required"`) or when conflicting shifts appear (`"day shift or night shift"`).

### B. Verification of Absence of Backdoors
- **Foreign Country Lock Override**:
  - Direct test: `geoGate({ company: "Hunt St", locationRaw: "London, United Kingdom", locationType: "remote" })` returns `phEligibility: "ineligible"`, `geoScope: "country_locked"`.
  - Direct test: `geoGate({ company: "Hunt St", title: "Operations Assistant (Austin, TX)", locationType: "remote" })` returns `phEligibility: "ineligible"`, `geoScope: "country_locked"`.
  - Direct test: `geoGate({ company: "Hunt St", description: "Must be a US citizen and currently reside in the United States", locationType: "remote" })` returns `phEligibility: "ineligible"`, `geoScope: "region_excl_ph"`.
  - Conclusion: No backdoor exists. Employer trust is evaluated strictly at Step 8; any foreign location pin, title country token, or residence lock rejects at Step 4, 5, or 6 and never reaches Step 8.
- **Onsite / Hybrid Workplace Type Override**:
  - Direct test: `geoGate({ company: "Hunt St", locationType: "onsite", locationRaw: "Manila, Philippines" })` returns `phEligibility: "ineligible"`, `geoScope: "country_locked"`.
  - Direct test: `geoGate({ company: "Hunt St", locationType: "hybrid", locationRaw: "Manila, Philippines" })` returns `phEligibility: "ineligible"`, `geoScope: "country_locked"`.
  - Direct test: `geoGate({ company: "Hunt St", title: "Office Coordinator (Onsite)", locationType: "remote" })` returns `phEligibility: "ineligible"`, `geoScope: "country_locked"`.
  - Conclusion: No backdoor exists. Step 0 unconditionally intercepts any non-remote workplace type or onsite/hybrid marker, returning `country_locked` / `ineligible`.
- **Constitutional Zero Counterexamples**:
  - `Pineapple Staffing`: Location pinned to "United States" and posted date stale (2020–2022) fails Step 4 and freshness -> 0% published.
  - `Affordable Staff`: Bacolod office onsite listing fails Step 0 -> 0% published.
  - `UpGuard`: Australia location pin dominates the title APAC token at Step 4 -> 0% published.

### C. Verification of Shift Classification Invariants
- **Unstated Schedule Hours**:
  - Text: `"Work Australian business hours"` -> `category: "day_shift"`, `phWorkingHours: null`, `isDayshift: true`.
  - Text: `"Filipino VA, day shift"` -> `category: "day_shift"`, `phWorkingHours: null`, `isDayshift: true`.
  - Evidence text: `"Source states day shift; exact Philippine hours are not established"`.
  - Conclusion: `phWorkingHours` is NEVER fabricated or guessed when unstated in the vacancy text.
- **Client Timezone Independence**:
  - Direct test: `classifyShift({ clientTimezone: "AEST", description: "Support our Sydney headquarters" })` returns `category: "unknown"`, `phWorkingHours: null`.
  - Direct test: `classifyShift({ clientTimezone: "UTC-5" })` returns `category: "unknown"`, `phWorkingHours: null`.
  - Conclusion: Client timezone alone does not establish a work schedule.
- **Non-schedule Cues & Deadlines**:
  - Direct test: `classifyShift({ description: "Apply before 5 PM PST" })` returns `category: "unknown"`, `phWorkingHours: null`.
  - Direct test: `classifyShift({ title: "CT Imaging Documentation Specialist" })` returns `category: "unknown"`, `phWorkingHours: null`.

### D. Targeted Test & Build Command Verification
1. **Targeted Test Execution**:
   - Command: `bun test packages/scraper/trustedEmployers.test.ts packages/scraper/shiftClassifier.test.ts packages/scraper/adversarial-counterexamples.test.ts`
   - Output: `99 pass, 0 fail, 357 expect() calls. Ran 99 tests across 5 files.` (Direct path targeting: `69 pass, 0 fail, 283 expect() calls. Ran 69 tests across 3 files. [529.00ms]`)
2. **Adversarial Stress Test Script**:
   - Command: `bun scripts/adversarial-shift-challenge.ts`
   - Output: `ALL ADVERSARIAL CHALLENGES PASSED (0 failures)`
3. **Workspace Typecheck**:
   - Command: `bun run typecheck` (`bunx tsc --noEmit -p apps/web/tsconfig.json`)
   - Output: Exit code 0 (zero errors).
4. **Production Web Build**:
   - Command: `bun run build` (`astro build`)
   - Output: Exit code 0 (Client built in 4.70s, Server built in 112.06s, Complete!).

---

## 2. Logic Chain

1. **Integrity & Independence Audit**:
   - Source code across `trustedEmployers.ts`, `geoGate.ts`, and `shiftClassifier.ts` was audited for hardcoded test shortcuts, facade implementations, or bypassed verification.
   - All logic implements genuine algorithmic behavior: `normalizeIdentifier` executes deterministic string normalization, `findTrustedEmployer` evaluates against complete profiles, `geoGate` executes 10 ordered deterministic evaluation steps, and `classifyShift` uses strict regex pattern matching.
   - No integrity violations or self-certifying mock shortcuts exist.

2. **Negative Boundary Condition Integrity**:
   - The primary risk in trusted employer integration is the creation of a global allowlist backdoor.
   - The code places `findTrustedEmployer` exclusively at Step 8 of `geoGate.ts`.
   - Steps 0 (workplace type / onsite markers), 2 (language / localized student roles), 4 (structured foreign location pins), 5 (title country / region markers), and 6 (residence / authorization locks) execute prior to Step 8.
   - Therefore, any vacancy with a foreign country lock or onsite workplace requirement is rejected before Step 8 is evaluated.
   - Counterexamples (Pineapple Staffing, Affordable Staff, UpGuard Australia) rigorously confirm 0% publication leakage.

3. **Schedule Truthfulness & Anti-Fabrication Guarantee**:
   - The secondary risk is hallucinating or assuming Philippine working hours (e.g. defaulting to 8am-5pm PHT for Australian clients).
   - In `shiftClassifier.ts`, `phWorkingHours` is gated by `(!negated && category === "day_shift" && phtSpanMatch)`.
   - `phtSpanMatch` matches only when the source text contains an explicit time span combined with an explicit PHT / Manila / Philippine suffix.
   - Timezones alone, application deadlines, and medical titles are proven to return `unknown` with `phWorkingHours: null`.
   - In `apps/web/src/pages/jobs/[id].astro`, only source-stated categories are rendered, with an explicit disclaimer ("Confirm exact hours in the original listing").

4. **Public Filter Contract Conformance**:
   - `apps/web/src/lib/public-board.ts` filters jobs using `resolvedCategory = job.shiftCategory ?? (job.isDayshift ? "day_shift" : classifyShift(...).category)`.
   - `apps/web/src/pages/opportunities.astro` renders the `Work schedule` dropdown filter and filter removal chips.
   - Slicing and pagination pass all adversarial and snapshot checks.

---

## 3. Caveats

No caveats. All investigated areas (gate order, backdoor absence, shift extraction rigor, test passes, typecheck, build) were verified directly through code inspection and command execution.

---

## 4. Conclusion

The implementation of Milestone 2 meets all functional, architectural, and adversarial requirements. The 4-way separation matrix is rigorously preserved, no backdoors exist for employer trust, working hours are never fabricated, and all test suites and builds pass with zero errors.

VERDICT: APPROVE

---

## 5. Verification Method

To independently verify these findings, run:

1. **Targeted Milestone 2 Test Suite**:
   ```bash
   bun test packages/scraper/trustedEmployers.test.ts packages/scraper/shiftClassifier.test.ts packages/scraper/adversarial-counterexamples.test.ts
   ```
   *Expected*: Passes with 0 failures.

2. **Adversarial Shift Stress Challenge**:
   ```bash
   bun scripts/adversarial-shift-challenge.ts
   ```
   *Expected*: Output ends with `ALL ADVERSARIAL CHALLENGES PASSED (0 failures)`.

3. **Workspace Typecheck**:
   ```bash
   bun run typecheck
   ```
   *Expected*: Exits with code 0.

4. **Production Build Preflight**:
   ```bash
   bun run build
   ```
   *Expected*: Astro build completes with code 0.
