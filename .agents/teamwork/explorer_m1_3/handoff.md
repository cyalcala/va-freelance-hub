# Handoff Report — explorer_m1_3

**Milestone**: M1 (Pipeline Bloat Elimination & Adversarial Safety Test Design)  
**Task**: Audit test coverage for all simplified and consolidated layers; design comprehensive adversarial test plan proving all 5 protected invariants and counterexamples (Pineapple Staffing, Affordable Staff, UpGuard); specify exact test files, cases, fixtures, and verification commands for Worker and Challengers.  
**Working Directory**: `c:\Users\admin\Desktop\va-freelance-hub\.agents\teamwork\explorer_m1_3`  
**Analysis Reference**: `c:\Users\admin\Desktop\va-freelance-hub\.agents\teamwork\explorer_m1_3\analysis.md`

---

## 1. Observation

### Audited Production Code Locations
1. **Layer 1 (Intake Fairness)**:
   - `apps/web/src/lib/conditional-state.ts:66-100`: `selectIntakeBatch<T>(items, limit)` cycles round-robin across `sourceId` buckets up to `limit` (default 50, max 100), returning `{ selected, deferred }`.
   - `apps/web/src/pages/api/cron/scrape.ts:2720-2738`: Replaced head-of-line `newItems.slice(0, limit)` with `selectIntakeBatch(newItems, limit)`. Line 2729 maps `intake.deferred` to `retrySourceIds` via `sourceIdsForUrls` so validators reset on deferred sources.
   - `apps/web/src/lib/conditional-state.ts:48-58`: `mergeSourceIdsByUrl` merges ATS URL ownership into `sourceIdsByUrl`.
2. **Layer 2 (Rotation Cadence & Clock Decoupling)**:
   - `apps/web/src/lib/workable-rotation.ts:1-131`: `selectWorkableRotation` allocates exactly 2 slots (`WORKABLE_ROTATION_LIMIT = 2`) using durable `lastAttemptAt` against a 60-minute window (`WORKABLE_MIN_INTERVAL_MS = 3600000`).
   - `apps/web/src/pages/api/cron/scrape.ts:1779-1791`: `atsFetchCadenceSkip` immediately returns `null` for `platform === "workable"`:
     ```typescript
     if (platform === "workable" || !lastAttemptAt) return null;
     ```
     Non-Workable platforms (e.g. Breezy, Ashby) retain the 60-minute cadence check.
   - `apps/web/src/pages/api/cron/scrape.ts:2337-2371`: Loop skips Workable agencies not in `workableRotation.selectedSourceIds`.
3. **Layer 3 (Triage Decision Geo-Scope Sovereignty)**:
   - `packages/scraper/triage-decision.ts:84-121`: `decideTriage` evaluates `structuredGeo = (gate.geoScope === "ph_only" || gate.geoScope === "apac_incl_ph" || gate.geoScope === "worldwide")`.
     - Lines 92–106: If `triage.aiUnavailable` is true, structured scopes publish as `eligible` with `reason: "Structured ${gate.geoScope} stands; AI unavailable"`.
     - Lines 108–121: If `!triage.eligibleForFilipinos` is true, structured scopes stand over the model vote.
     - Lines 88–90: Deterministic phrase rejection (`isObviousGeoRestriction` or `isObviousNonEnglishOrLocalOnly`, e.g. "US citizens only") strictly overrides structured scopes to return `ineligible`.
4. **Layer 4 (GeoGate Location Pin Dominance)**:
   - `packages/scraper/geoGate.ts:244-254`: `structuredLocationPin(locationRaw)` evaluates whether location contains an excluded region, US country/state, foreign country, or city token.
   - `packages/scraper/geoGate.ts:301-304`:
     ```typescript
     const apacInTitle = firstMatch(APAC_POSITIVE_REGEX, title);
     if (apacInTitle && !structuredLocationPin(locationRaw)) {
       return verdict("apac_incl_ph", "eligible_verified", `APAC region named: "${apacInTitle}"`);
     }
     ```
     If `structuredLocationPin(locationRaw)` is true (e.g. "Australia"), title APAC is suppressed, and Step 4 locks the country (`country_locked`, `ineligible`).
5. **Layer 5 (Freshness & Counterexamples)**:
   - `packages/scraper/publication-freshness.ts:1-55`: `assessPostingFreshness` validates original posting instants against the strict inclusive 30-day window `[observedAt - 30d, observedAt]`.
   - `astra777.txt` lines 48–51, 80–103, 178–185:
     - Pineapple Staffing (`workable:pineapple-staffing`): 3 open US telecommuting roles from 2020–2022; public count 0.
     - Affordable Staff (`exp:affordablestaff` / Pathcutters): Bacolod PH office-only; WFH model explicitly rejected; public count 0.
     - UpGuard (`Jobicy`): "Director of Customer Success, APAC" with location "Australia"; public card was legacy APAC, but freshly evaluated row is `country_locked` / 0% published.

### Existing Test Suite Baseline Execution
Command:
```sh
bun test --no-env-file --preload ./scripts/ci/test-environment.ts \
  ./apps/web/tests/intake-fairness.test.ts \
  ./apps/web/tests/rotation-vs-intake.test.ts \
  ./packages/scraper/triage-decision.test.ts \
  ./packages/scraper/geoGate.test.ts \
  ./packages/scraper/publication-freshness.test.ts
```
Output:
- `apps/web/tests/intake-fairness.test.ts`: 6 passed
- `apps/web/tests/rotation-vs-intake.test.ts`: 3 passed
- `packages/scraper/triage-decision.test.ts`: 13 passed
- `packages/scraper/geoGate.test.ts`: 44 passed
- `packages/scraper/publication-freshness.test.ts`: 48 passed (34 test cases + parameter matrix)
- **Total**: 114 pass, 0 fail, 287 expect() assertions in 648 ms.

---

## 2. Logic Chain

1. **Proof of Invariant 1 (Intake Fairness)**:
   - *Observation*: `apps/web/src/lib/conditional-state.ts:66-100` and `apps/web/tests/intake-fairness.test.ts:14-65`.
   - *Reasoning*: When 50 RSS items arrive alongside fresh ATS items, grouping into source buckets and pulling one item per bucket per round ensures that ATS items are selected in the first pass up to `limit`. Items exceeding `limit` are returned in `deferred` and their source IDs are merged into `retrySourceIds`. In the next pass, those deferred URLs are selected beside a new RSS head. Hence, RSS head-of-line blocking is eliminated and deferred URLs are preserved.
2. **Proof of Invariant 2 (Rotation Cadence Decoupling)**:
   - *Observation*: `apps/web/src/pages/api/cron/scrape.ts:1785` and `apps/web/src/lib/workable-rotation.ts:102`.
   - *Reasoning*: Because `atsFetchCadenceSkip` immediately returns `null` for Workable, the in-loop clock cannot block or skip any Workable tenant. Selection is governed solely by `selectWorkableRotation`, which evaluates durable `lastAttemptAt` from database state before the loop, enforcing the 2-slot and 60-minute interval constraints. Non-Workable ATS boards continue to use `atsFetchCadenceSkip`.
3. **Proof of Invariant 3 (Geo-Scope Sovereignty)**:
   - *Observation*: `packages/scraper/triage-decision.ts:84-121` and `packages/scraper/triage-decision.test.ts:60-108`.
   - *Reasoning*: For structured scopes (`ph_only`, `apac_incl_ph`, `worldwide`), `decideTriage` ignores model negative votes and handles AI outages by returning `eligible` with the structured scope preserved. However, `deterministicReject` (`isObviousGeoRestriction` / `isObviousNonEnglishOrLocalOnly`) runs first; if a deterministic phrase such as "US citizens only" or "Top Secret clearance" is found, the listing returns `ineligible`.
4. **Proof of Invariant 4 (Authoritative Country Pin Dominance)**:
   - *Observation*: `packages/scraper/geoGate.ts:244-254`, `301-304` and `packages/scraper/geoGate.test.ts:100-128`.
   - *Reasoning*: When `locationRaw` contains an authoritative place pin (such as Australia, US, UK, Austin TX, London), `structuredLocationPin(locationRaw)` evaluates to `true`. This prevents `apacInTitle` from triggering. Step 4 then evaluates the location string, returning `country_locked` / `ineligible`. Only when `locationRaw` is free of conflicting place pins does title APAC grant `apac_incl_ph`.
5. **Proof of Invariant 5 (Counterexample 0% Publication Guarantee)**:
   - *Observation*: `astra777.txt:48-51`, `184`, `DAYSHIFT_PRIORITY_CAREERS_2026-10-13.md:17-21`.
   - *Reasoning*:
     - *Pineapple Staffing*: Roles are located in United States $\to$ `geoGate` returns `country_locked` / `ineligible`. Stated dates are 2020–2022 $\to$ `assessPostingFreshness` returns `STALE`. Both gates independently guarantee 0% publication.
     - *Affordable Staff*: Located in Bacolod, PH, but workplace type is `onsite` / non-remote $\to$ `geoGate` Step 0 returns `country_locked` / `ineligible` (`Not fully remote`). Employer Level 1/2 trust and dayshift tags cannot bypass workplace ineligibility.
     - *UpGuard*: Title contains APAC, but location is Australia $\to$ `geoGate` returns `country_locked` / `ineligible`. Newly ingested rows yield 0% publication.
     - Strict 4-way separation invariant holds: `Employer PH confidence != Job validity != PH eligibility != Role relevance`.

---

## 3. Caveats

1. **Read-Only Scope**: This task is strictly investigative and design-oriented. No production code files in `apps/web/` or `packages/` have been modified.
2. **Pages Cron Deployment Separation**: As documented in `astra777.txt` and `BEHAVIORAL_BLOAT_LEDGER_2026-10-14.md`, the local git codebase contains these simplified layers, but the live Cloudflare Pages cron has not yet loaded this handler. The verification plan confirms repository code correctness, not live Cloudflare runtime deployment.
3. **Database Environment Isolation**: Tests run in in-memory test environments with isolated SQLite/mock bindings (`./scripts/ci/test-environment.ts`). Live Cloudflare D1 and Turso production tables were not accessed.

---

## 4. Conclusion

The audit confirms that the five simplified layers in `va-freelance-hub` successfully eliminate behavioral bloat while retaining all core safety invariants. The existing 114 tests verify primary functional paths, but lack adversarial edge-case stress, timestamp corruption resilience, and explicit multi-layer counterexample proofs.

The comprehensive adversarial test plan specified in `analysis.md` provides:
1. Extended test blocks for `intake-fairness.test.ts`, `rotation-vs-intake.test.ts`, `triage-decision.test.ts`, and `geoGate.test.ts`.
2. A new dedicated adversarial test suite: `packages/scraper/adversarial-counterexamples.test.ts`.
3. Concrete fixtures, test cases, and assertions proving the 5 protected invariants and counterexamples (Pineapple Staffing, Affordable Staff, UpGuard).
4. Concrete execution commands and mutation audit steps for Worker and Challengers.

---

## 5. Verification Method

To independently verify the audit and reproduce the empirical findings:

1. **Run Current Test Suites**:
   ```sh
   bun test --no-env-file --preload ./scripts/ci/test-environment.ts \
     ./apps/web/tests/intake-fairness.test.ts \
     ./apps/web/tests/rotation-vs-intake.test.ts \
     ./packages/scraper/triage-decision.test.ts \
     ./packages/scraper/geoGate.test.ts \
     ./packages/scraper/publication-freshness.test.ts
   ```
   *Expected Output*: Exactly 114 pass, 0 fail, 287 expect() calls.

2. **Inspect Code Locations**:
   - `apps/web/src/lib/conditional-state.ts:66-100` (Intake batch selector)
   - `apps/web/src/pages/api/cron/scrape.ts:1779-1791` (Workable cadence check removal)
   - `packages/scraper/triage-decision.ts:84-121` (Model veto removal on structured geo)
   - `packages/scraper/geoGate.ts:244-254`, `301-304` (Country pin dominance over title APAC)
   - `packages/scraper/publication-freshness.ts:1-55` (30-day inclusive window)

3. **Inspect Detailed Analysis**:
   - View `c:\Users\admin\Desktop\va-freelance-hub\.agents\teamwork\explorer_m1_3\analysis.md` for complete test code, mock specifications, and Challenger mutation checks.

4. **Invalidation Conditions**:
   - Any test failure in the 5 test suites.
   - Any test where `selectIntakeBatch` drops an ATS item in favor of an RSS item under capacity.
   - Any scenario where Pineapple Staffing, Affordable Staff, or UpGuard returns `eligible` or `within_window`.
   - Any scenario where `decideTriage` unpublishes `ph_only`, `apac_incl_ph`, or `worldwide` due to an AI outage.
