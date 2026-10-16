# Milestone 2 Adversarial Verification Handoff Report

## 1. Observation

Direct empirical tests and code execution yielded the following concrete observations:

### A. Execution of Required Test Suites
- **Command**:
  ```bash
  bun test packages/scraper/adversarial-counterexamples.test.ts packages/scraper/trustedEmployers.test.ts packages/scraper/adversarial-m2-empirical.test.ts
  ```
- **Output**:
  ```
  57 pass
  0 fail
  1009 expect() calls
  Ran 57 tests across 3 files. [2.77s]
  ```
- Specifically:
  - `packages/scraper/adversarial-counterexamples.test.ts`: 30 passed tests, 137 assertions.
  - `packages/scraper/trustedEmployers.test.ts`: 14 passed tests, 71 assertions.
  - `packages/scraper/adversarial-m2-empirical.test.ts`: 13 passed tests, 801 assertions.

### B. Workspace Typecheck
- **Command**:
  ```bash
  bun run typecheck
  ```
- **Output**:
  Exited with code 0 (`bunx tsc --noEmit -p apps/web/tsconfig.json`). Zero type errors.

### C. Constitutional Zero Counterexamples Verification
1. **Pineapple Staffing** (`workable:pineapple-staffing`):
   - Payloads: Stale posting dates (2020, 2021, 2022) with United States location pin.
   - Tested:
     - Exact historical US-pinned rows: `geoGate` returns `phEligibility: "ineligible"`, `geoScope: "country_locked"`.
     - `assessPostingFreshness` on `2020-01-14`, `2021-06-20`, `2022-11-05` against observed clock returns `state: "STALE"`.
     - Adversarial spoofing: Even when posted dates were forced to current time (`2026-10-15`), `geoGate` Step 4 pinned location to US, yielding 0 published rows.
     - Publication rate: Strictly 0% (0 published).
2. **Affordable Staff** (`company: "Affordable Staff"`):
   - Payloads: Bacolod office onsite and hybrid roles.
   - Tested:
     - `locationType: "onsite"`: Caught by `geoGate` Step 0 (`hasExplicitNonRemoteLocationType`), returns `phEligibility: "ineligible"`, `geoScope: "country_locked"`, `evidence: "Not fully remote: \"onsite\" workplace type"`.
     - `locationType: "hybrid"`: Caught by `geoGate` Step 0, returns `phEligibility: "ineligible"`, `geoScope: "country_locked"`.
     - Title or locationRaw onsite marker (`(onsite)`, `Office-Based Bacolod`): Caught by `geoGate` Step 0 (`ONSITE_TITLE_REGEX`), returning `phEligibility: "ineligible"`.
     - Step 0 executes BEFORE Step 1 (which checks `PH_POSITIVE_REGEX`), ensuring Bacolod/Philippines location tokens cannot grant remote eligibility to onsite/hybrid jobs.
     - Publication rate: Strictly 0% (0 published).
3. **UpGuard Australia** (`company: "UpGuard"`):
   - Payloads: `title: "Director of Customer Success, APAC"`, `locationRaw: "Australia"`.
   - Tested:
     - In `geoGate` Step 1: line 322 guards `if (apacInTitle && !structuredLocationPin(locationRaw))`. Because `locationRaw: "Australia"` resolves `structuredLocationPin("Australia")` to truthy, Step 1 does NOT fire on the APAC title token.
     - In `geoGate` Step 4: `detectStructuredLocationPin("Australia")` returns `{ scope: "country_locked", evidence: "Location pinned: \"Australia\" in \"Australia\"" }`.
     - Tested across Australian cities (`Sydney, Australia`, `Melbourne`, `Brisbane`): all evaluate to `phEligibility: "ineligible"`, `geoScope: "country_locked"`.
     - Publication rate: Strictly 0% (0 published).

### D. Stress-Testing Employer Confidence Bypass Resistance
- Tested all 11 cataloged trusted employers in `TRUSTED_PH_EMPLOYERS`:
  - `hunt-st`, `coconutva`, `20four7va`, `crewbloom`, `pearltalent`, `hammerjack`, `multiplymii`, `athena`, `hello-rache`, `sourcefit`, `rocketams`.
- Adversarial test harness executed:
  - 11 employers x 12 foreign locations (`United States`, `London, United Kingdom`, `Toronto, Canada`, `Sydney, Australia`, `Berlin, Germany`, `Tokyo, Japan`, `Paris, France`, `Auckland, New Zealand`, `Singapore`, `Austin, TX`, `San Francisco, CA`, `Seattle, WA`) -> 132/132 tests strictly rejected (`country_locked`, `ineligible`).
  - 11 employers x 2 non-remote location types (`onsite`, `hybrid`) with `locationRaw: "Manila, Philippines"` -> 22/22 tests strictly rejected at Step 0 (`Not fully remote`).
  - 11 employers x 6 title country/state locks (`Virtual Assistant (US Only)`, `Executive Assistant (UK Remote)`, `Bookkeeper - Canada Candidates Only`, `Operations Specialist (Austin, TX)`, `Customer Success Lead | New York, NY | Remote`, `Support Representative - London`) -> 66/66 tests strictly rejected (`country_locked`).
  - 11 employers x 5 hard residence/clearance locks -> 55/55 tests strictly rejected (`region_excl_ph`, `ineligible`).
  - 11 employers x 3 non-English domestic localized titles (`Frontend Developer (m/w/d)`, `Werkstudent Recruiting`, `Assistant Administratif en Alternance`) -> 33/33 tests strictly rejected at Step 2 (`country_locked`).
  - Stale posting dates (>30 days): assessPostingFreshness returns `STALE` regardless of employer confidence, withholding 100% of stale postings from publication.
- Total bypass count across all tested negative constraints: **0** (Zero bypasses).

---

## 2. Logic Chain

1. **Ordering Invariant in `geoGate`**:
   - `packages/scraper/geoGate.ts` lines 282–441 define the sequential execution pipeline:
     * Step 0: Workplace type & onsite/hybrid regex check (Lines 289–301)
     * Step 1: Explicit PH & APAC signals (Lines 303–324)
     * Step 2: Non-English & domestic student/local roles (Lines 326–333)
     * Step 3: Source language tags (Lines 335–339)
     * Step 4: Structured location pin (Lines 341–347)
     * Step 5: Title parentheticals, segments, and country locks (Lines 349–409)
     * Step 6: Hard residence / authorization locks (Lines 411–415)
     * Step 7: Worldwide metadata (Lines 418–425)
     * **Step 8: Authoritative employer evidence (`findTrustedEmployer`)** (Lines 427–437)
     * Step 9: Default `unknown` (Lines 439–441)
2. **Bypass Impossibility**:
   - Step 8 is evaluated only after Steps 0 through 7 have returned null.
   - Any opening that triggers Step 0 (onsite/hybrid), Step 2 (non-English), Step 4 (foreign country pin), Step 5 (title country pin), or Step 6 (residence lock) terminates with an `ineligible` verdict immediately.
   - Therefore, it is architecturally and mathematically impossible for a trusted employer token to bypass `country_locked` or `ineligible`.
3. **Freshness Immutability**:
   - In `apps/web/src/pages/api/cron/scrape.ts` lines 2836–2859, `assessPostingFreshness` executes on all gate-passed items. If `state !== "WITHIN_WINDOW"`, the row is immediately pushed to `rejectedItems` with `isActive: false` and `continue` is invoked.
   - Therefore, employer trust cannot bypass the 30-day freshness ceiling.
4. **Counterexample Integrity**:
   - Pineapple Staffing fails Step 4 (`United States` location pin) and fails freshness (>30 days stale).
   - Affordable Staff onsite/hybrid fails Step 0 (`hasExplicitNonRemoteLocationType` and `ONSITE_TITLE_REGEX`), which precedes Step 1's Philippines check.
   - UpGuard Australia fails Step 4 because structured country pin suppresses title APAC token.
   - All three counterexamples empirically yield 0 published rows.

---

## 3. Caveats

- **Free-text Residence Phrasing**: While hard residence locks in `RESIDENCE_LOCK_REGEX` strictly catch standard patterns ("must be based in US", "US citizen", "security clearance required"), novel colloquial phrases without structured country pins (e.g. "right to work in the UK" without "UK" in title or locationRaw) rely on AI triage rather than deterministic Step 6 regex. However, whenever a structured location pin exists (e.g. `locationRaw: "United Kingdom"`), Step 4 reliably and deterministically rejects it.
- **Preload Parameter for Bun**: Tests importing web components or DB dependencies should be run with `--preload ./scripts/ci/test-environment.ts` or directly on package test files to avoid uninitialized environment bindings.

---

## 4. Conclusion

All invariants for Milestone 2 have been empirically verified under adversarial conditions:
- Constitutional Zero counterexamples (Pineapple Staffing, Affordable Staff, UpGuard Australia) strictly maintain 0% published status.
- Employer confidence bypass resistance is 100% verified: high confidence cannot bypass explicit `country_locked` or negative constraints.
- Test suites pass 100% (57 passed tests, 1,009 assertions, 0 errors).
- Workspace typecheck passes cleanly with 0 errors.

**VERDICT: APPROVE**

---

## 5. Verification Method

To independently reproduce and verify this assessment:

1. **Run the Milestone 2 Test Suites**:
   ```bash
   bun test packages/scraper/adversarial-counterexamples.test.ts packages/scraper/trustedEmployers.test.ts packages/scraper/adversarial-m2-empirical.test.ts
   ```
   *Expected*: 57 pass, 0 fail, 1,009 expect() calls.

2. **Run Workspace Typecheck**:
   ```bash
   bun run typecheck
   ```
   *Expected*: Exits with code 0.

3. **Verify Bypass Resistance Programmatically**:
   ```bash
   bun -e "
   import { geoGate } from './packages/scraper/geoGate';
   import { TRUSTED_PH_EMPLOYERS } from './packages/scraper/trustedEmployers';
   let bypass = 0;
   for (const emp of Object.values(TRUSTED_PH_EMPLOYERS)) {
     if (geoGate({ company: emp.companyName, locationRaw: 'United States', locationType: 'remote' }).phEligibility !== 'ineligible') bypass++;
     if (geoGate({ company: emp.companyName, locationType: 'onsite' }).phEligibility !== 'ineligible') bypass++;
     if (geoGate({ company: emp.companyName, title: 'VA (US)' }).phEligibility !== 'ineligible') bypass++;
   }
   console.log('Bypass count:', bypass);
   process.exit(bypass === 0 ? 0 : 1);
   "
   ```
   *Expected*: Outputs `Bypass count: 0` and exits with code 0.
