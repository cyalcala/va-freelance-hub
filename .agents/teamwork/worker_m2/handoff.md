# Milestone 2 Verification Handoff Report: High-Confidence Trusted PH Employer Evidence & Dayshift Coverage

## 1. Observation

Direct inspections of the codebase and test runs yielded the following verified evidence:

### A. Trusted Employer Evidence & 4-Way Separation Matrix
- **File**: `packages/scraper/trustedEmployers.ts` (lines 1–203)
  - `TRUSTED_PH_EMPLOYERS` catalogs high-confidence employers hiring remote Filipinos:
    - `hunt-st` ("Hunt St"): `confidenceTier: "tier_a_vetted"`, `evidenceTypes: ["vetted_va_agency", "recurring_ph_hiring_history", "ph_specific_careers_page"]`, `defaultGeoScope: "ph_only"`, `typicalWorkingHours: "day_shift"`.
    - `coconutva` ("Coconut VA"): `confidenceTier: "tier_a_vetted"`, `evidenceTypes: ["vetted_va_agency", "recurring_ph_hiring_history"]`, `defaultGeoScope: "ph_only"`.
    - `20four7va` ("20Four7VA"): `confidenceTier: "tier_a_vetted"`, `evidenceTypes: ["vetted_va_agency", "recurring_ph_hiring_history", "ph_registered_entity"]`, `defaultGeoScope: "ph_only"`.
    - `crewbloom` ("CrewBloom"): `confidenceTier: "tier_a_vetted"`, `evidenceTypes: ["vetted_va_agency", "recurring_ph_hiring_history"]`, `defaultGeoScope: "ph_only"`.
    - `pearltalent` ("Pearl Talent"): `confidenceTier: "tier_a_vetted"`, `evidenceTypes: ["vetted_va_agency", "recurring_ph_hiring_history", "ats_location_metadata"]`, `defaultGeoScope: "ph_only"`.
    - `hammerjack` ("Hammerjack"): `confidenceTier: "tier_a_vetted"`, `evidenceTypes: ["ph_registered_entity", "vetted_va_agency", "recurring_ph_hiring_history"]`, `defaultGeoScope: "apac_incl_ph"`, `typicalWorkingHours: "day_shift"`.
    - `multiplymii` ("MultiplyMii"): `confidenceTier: "tier_a_vetted"`, `defaultGeoScope: "ph_only"`.
    - `athena` ("Athena"): `confidenceTier: "tier_a_vetted"`, `defaultGeoScope: "ph_only"`.
    - `hello-rache` ("Hello Rache"): `confidenceTier: "tier_a_vetted"`, `defaultGeoScope: "ph_only"`.
    - `sourcefit` ("Sourcefit"): `confidenceTier: "tier_a_vetted"`, `evidenceTypes: ["ph_registered_entity", "vetted_va_agency", "recurring_ph_hiring_history"]`, `defaultGeoScope: "ph_only"`.
    - `rocketams` ("RocketAMS"): `confidenceTier: "tier_a_vetted"`, `defaultGeoScope: "apac_incl_ph"`, `typicalWorkingHours: "day_shift"`.
  - Normalization in `findTrustedEmployer(identifier)` strips ATS prefixes (`workable:`, `breezy:`, `greenhouse:`, `ashby:`, `lever:`), non-alphanumeric punctuation, and performs case-insensitive matching across canonical IDs, company names, and aliases.
  - Constitutional Separation stated in lines 7–16:
    ```
    Employer PH confidence != Job validity != PH eligibility != Role relevance
    ```

- **File**: `packages/scraper/geoGate.ts` (lines 282–441)
  - Step execution order in `geoGate(input)`:
    - **Step 0** (lines 289–301): Rejects non-remote workplace types via `hasExplicitNonRemoteLocationType(input.locationType)` and onsite/hybrid markers in title and `locationRaw` via `ONSITE_TITLE_REGEX`.
    - **Step 1** (lines 303–324): Detects explicit Philippine and APAC mentions in locationRaw and text.
    - **Step 2** (lines 326–333): Rejects non-English text and domestic localized non-English or student roles (`m/w/d`, `werkstudent`, `alternance`).
    - **Step 3** (lines 335–339): Checks source language tags.
    - **Step 4** (lines 341–347): Detects structured location pins (`detectStructuredLocationPin` checking excluded regions, US country/state codes, foreign countries/cities).
    - **Step 5** (lines 349–409): Inspects title parentheticals, bracket segments, pipe/dash delimiters, and title country locks.
    - **Step 6** (lines 411–415): Inspects hard residence and work-authorization locks (`RESIDENCE_LOCK_REGEX`).
    - **Step 7** (lines 418–425): Inspects worldwide language hints.
    - **Step 8** (lines 427–437): Resolves authoritative employer evidence:
      ```typescript
      const employer = findTrustedEmployer(input.company || input.sourceId);
      if (employer) {
        return verdict(
          employer.defaultGeoScope,
          "eligible_verified",
          `Authoritative employer evidence: ${employer.companyName} (${employer.confidenceTier}) - ${employer.evidenceNotes}`,
        );
      }
      ```
    - **Step 9** (lines 439–441): Defaults to `unknown` / `unclear`.

- **Constitutional Zero Counterexamples**:
  - `Pineapple Staffing`: Location pinned to "United States" and posted date stale (2020–2022). Caught by Step 4 structured US location pin -> `country_locked` / `ineligible`, and `assessPostingFreshness` -> `STALE`. Publication rate: 0%.
  - `Affordable Staff (Bacolod Office onsite)`: Caught by Step 0 (`locationType: "onsite"` or `ONSITE_TITLE_REGEX`) -> `country_locked` / `ineligible`. Publication rate: 0%.
  - `UpGuard (Australia)`: Has `locationRaw: "Australia"`. Title has "APAC", but Step 4 structured country pin dominates title APAC token -> `country_locked` / `ineligible`. Publication rate: 0%.

### B. Shift & Working-Hour Classification
- **File**: `packages/scraper/shiftClassifier.ts` (lines 1–67)
  - `PHT_DAYTIME_SPAN` regex (line 20):
    ```typescript
    const PHT_DAYTIME_SPAN = /\b((?:(?:0?[6-9]|10)(?::[0-5][0-9])?\s*(?:am|a\.m\.)?)\s*[-–—to]+\s*(?:(?:0?[2-6]|1[4-8])(?::[0-5][0-9])?\s*(?:pm|p\.m\.)?)\s*(?:pht\b|manila(?:\s*time)?|philippine(?:\s*time)?|\(pht\)))/i;
    ```
  - `SHIFT_MARKERS` includes `"day_shift"` matching: `day[- ]?shift`, `daytime (?:shift|hours)`, `morning shift`, `australian (?:business )?hours`, `philippine (?:business )?hours`, `new zealand (?:business )?hours`, `apac (?:business )?hours`, `au (?:business )?hours`, `nz (?:business )?hours`, `aest (?:business )?hours`, `awst (?:business )?hours`.
  - Safeguards:
    - Negation check: `/\b(?:no|not|without)\b[^.!?\n]{0,40}\b(?:shift|hours|async|flexible)\b/i`.
    - Conflicting markers: If negated or `effectiveMatches.length > 1`, returns `category: "unknown"`.
    - Unstated hours: If clientTimezone alone is supplied (e.g. `clientTimezone: "AEST"` or `clientTimezone: "GMT"`), or deadline text (`"Apply before 5 PM PST"`) or medical title (`"CT Imaging..."`), returns `category: "unknown"` with `phWorkingHours: null`.

### C. Public Filter Exposure
- **File**: `apps/web/src/lib/public-board.ts`:
  - `PublicJob` includes `shiftCategory?: ShiftCategory | null;` and `isDayshift?: boolean;` (lines 29–30).
  - `slicePublicJobs` (lines 145–156) resolves `resolvedCategory = job.shiftCategory ?? (job.isDayshift ? "day_shift" : classifyShift(...).category)` and filters by `options.shift`.
- **File**: `apps/web/src/pages/opportunities.astro`:
  - `SHIFT_OPTIONS` (lines 29–34):
    - `day_shift`: `Day shift (PH / AU / NZ / APAC)`
    - `flexible`: `Flexible / Async`
    - `mid_shift`: `Mid shift (UK / Europe)`
    - `night_shift`: `Night shift (US / Graveyard)`
  - Reads `shift` query param (line 49), passes `shift: shift || undefined` to `slicePublicJobs` (line 108), renders `<select id="shift" name="shift" ...>` (lines 206–213), and surfaces active filter pills (lines 95, 234–235).

### D. Verification Command Outputs
1. **Targeted Tests**:
   - Command: `bun test --no-env-file --preload ./scripts/ci/test-environment.ts ./packages/scraper/trustedEmployers.test.ts ./packages/scraper/shiftClassifier.test.ts ./packages/scraper/adversarial-counterexamples.test.ts`
   - Output: `69 pass, 0 fail, 283 expect() calls. Ran 69 tests across 3 files. [559.00ms]`
2. **Public Snapshot Tests**:
   - Command: `bun test --no-env-file --preload ./scripts/ci/test-environment.ts ./apps/web/tests/public-snapshot.test.ts`
   - Output: `43 pass, 0 fail, 155 expect() calls. Ran 43 tests across 1 file. [4.94s]`
3. **Workspace Typecheck**:
   - Command: `bun run typecheck` (`bunx tsc --noEmit -p apps/web/tsconfig.json`)
   - Output: Exited with code 0 (zero type errors).
4. **Web Build Preflight**:
   - Command: `bun run build` (`astro build`)
   - Output: Exited with code 0 (Client built in 3.83s, Server built in 45.42s, Complete!).
5. **Full Project Test Suite**:
   - Command: `bun run test`
   - Output: `4385 pass, 0 fail, 330423 expect() calls. Ran 4385 tests across 266 files. [374.37s]`

---

## 2. Logic Chain

1. **Premise 1: 4-Way Separation Matrix Integrity**
   - Observations show that `packages/scraper/trustedEmployers.ts` and `packages/scraper/geoGate.ts` structurally decouple employer identity from vacancy geography and validity.
   - Authoritative employer evidence is placed at Step 8 of `geoGate`, strictly after Step 0 (non-remote workplace types, onsite markers), Step 2 (non-English text), Step 4 (structured location pins), Step 5 (title country pins), and Step 6 (hard residence/authorization locks).
   - Therefore, a trusted employer's presence cannot convert an onsite, hybrid, foreign-pinned, or country-locked opening into an eligible opening. This satisfies the constitutional constraint `Employer PH confidence != Job validity != PH eligibility != Role relevance`.

2. **Premise 2: Safe Recovery of Legitimate PH Openings**
   - When a job from a vetted employer (e.g., Hunt St, Coconut VA, CrewBloom, Pearl Talent) has NO contradictory country locks or onsite requirements, Step 8 establishes Philippine eligibility (`ph_only` or `apac_incl_ph`) with `eligible_verified`.
   - The job is published without requiring the job description to artificially repeat "Philippines", resolving the identified false negatives where remote Filipino roles were lost due to unstated country strings in ATS payloads.

3. **Premise 3: Invariant Preservation for Constitutional Zeros**
   - The adversarial tests in `packages/scraper/adversarial-counterexamples.test.ts` and `packages/scraper/trustedEmployers.test.ts` prove that:
     * Pineapple Staffing: Stale posting date + United States location pin fails Step 4 and freshness, resulting in 0 published rows.
     * Affordable Staff: Bacolod office onsite listing fails Step 0, resulting in 0 published rows.
     * UpGuard: Australia location pin dominates the title APAC token at Step 4, resulting in 0 published rows.
   - All three counterexamples are rigorously proven with zero leakage into published status.

4. **Premise 4: Rigorous Dayshift Recognition without Schedule Fabrication**
   - `packages/scraper/shiftClassifier.ts` extracts explicit daytime spans (such as `8am - 5pm Manila time` or `7:00 AM - 4:00 PM PHT`) into `phWorkingHours`.
   - It expands `day_shift` markers to include Australian, New Zealand, Philippine, and APAC business hours, setting `isDayshift: true` and `shiftCategory: 'day_shift'`.
   - It safeguards against schedule fabrication: client timezone alone (`AEST`, `GMT`, `UTC-5`), application deadlines, medical terminology, negation (`"no night shift required"`), and conflicting shifts (`"day shift or night shift"`) evaluate to `unknown` with `phWorkingHours: null`.

5. **Premise 5: End-to-End Filter Propagation**
   - `PublicJob` in `apps/web/src/lib/public-board.ts` incorporates `shiftCategory` and `isDayshift`.
   - `slicePublicJobs` faithfully filters jobs by the selected shift.
   - `apps/web/src/pages/opportunities.astro` exposes the `Work schedule` dropdown filter (`day_shift`, `flexible`, `mid_shift`, `night_shift`), passes the query parameter into `slicePublicJobs`, and renders active filter removal chips.

---

## 3. Caveats

- **Upstream Data Availability**: While `shiftClassifier` accurately extracts source-stated hours, if a job posting omits schedule details entirely, it safely falls back to `unknown`. It does not guess working hours based solely on employer identity or client timezone.
- **Preload Requirement for Bun Tests**: Directly executing `bun test` without `--preload ./scripts/ci/test-environment.ts` or with broad directory globs can pick up inactive backup snapshots in `tmp/`. The standard project scripts (`bun test` / `bun run test`) properly configure preloads and target directories, executing cleanly with 0 failures across 4,385 tests.

---

## 4. Conclusion

**Verdict: Milestone 2 is FULLY VERIFIED and READY.**
- The 4-way separation matrix is genuinely enforced in code and validated through adversarial counterexamples.
- Trusted PH employer evidence safely recovers remote openings from vetted agencies at geoGate Step 8 without bypassing negative country or workplace constraints.
- Constitutional Zero invariants (Pineapple Staffing = 0, Affordable Staff onsite = 0, UpGuard Australia = 0) are strictly preserved.
- Dayshift classification accurately identifies AU/NZ/APAC/PH daytime roles and explicit PHT time spans without fabricating unstated schedules.
- Public schedule filtering is fully integrated and tested across `opportunities.astro`, `public-board.ts`, and snapshot test suites.
- Full workspace test suite (4,385 tests across 266 files), typecheck, and production build pass with 0 errors.

---

## 5. Verification Method

To independently verify these findings, run:

1. **Targeted Milestone 2 Tests**:
   ```bash
   bun test --no-env-file --preload ./scripts/ci/test-environment.ts ./packages/scraper/trustedEmployers.test.ts ./packages/scraper/shiftClassifier.test.ts ./packages/scraper/adversarial-counterexamples.test.ts
   ```
   *Expected*: 69 tests pass, 0 fail, 283 expect() assertions.

2. **Public Board & Snapshot Tests**:
   ```bash
   bun test --no-env-file --preload ./scripts/ci/test-environment.ts ./apps/web/tests/public-snapshot.test.ts
   ```
   *Expected*: 43 tests pass, 0 fail, 155 expect() assertions.

3. **Workspace Typecheck**:
   ```bash
   bun run typecheck
   ```
   *Expected*: Exits with code 0.

4. **Production Web Build**:
   ```bash
   bun run build
   ```
   *Expected*: Astro build completes with code 0.

5. **Full Repository Test Suite**:
   ```bash
   bun run test
   ```
   *Expected*: 4,385 tests pass, 0 fail across 266 files.
