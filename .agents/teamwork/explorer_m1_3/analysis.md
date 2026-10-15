# Comprehensive Test Coverage Audit & Adversarial Test Plan

**Milestone**: M1 (Pipeline Bloat Elimination & Redundant Complexity Elimination)  
**Author**: `explorer_m1_3`  
**Date**: 2026-10-15  
**Working Directory**: `c:\Users\admin\Desktop\va-freelance-hub\.agents\teamwork\explorer_m1_3`  
**Scope**: Ingestion and filtering pipeline consolidation across 5 core layers, 5 protected invariants, and empirical counterexamples (Pineapple Staffing, Affordable Staff, UpGuard).

---

## 1. Executive Summary

This investigation audits existing test coverage across all five simplified and consolidated pipeline layers in VA Freelance Hub following the behavioral bloat reductions documented in `docs/operations/BEHAVIORAL_BLOAT_LEDGER_2026-10-14.md` and `astra777.txt`. It formulates a comprehensive adversarial test plan to mathematically and empirically prove all five protected invariants, specifically preventing regressions where simplified code could either starve legitimate Philippine-eligible remote roles or inadvertently publish ineligible, stale, or office-bound jobs.

### Current Test Suite Baseline
Execution of the five target test suites on Bun `1.3.14`:
```sh
bun test --no-env-file --preload ./scripts/ci/test-environment.ts \
  ./apps/web/tests/intake-fairness.test.ts \
  ./apps/web/tests/rotation-vs-intake.test.ts \
  ./packages/scraper/triage-decision.test.ts \
  ./packages/scraper/geoGate.test.ts \
  ./packages/scraper/publication-freshness.test.ts
```
- **Observed Result**: 114 passing tests, 0 failures, 287 assertions in 648 ms.
- **Coverage Status**: Baseline unit functionality is solid for nominal happy paths, but critical edge cases, boundary conditions, asymmetric starvation attacks, and multi-layer counterexample proofs are currently unrepresented or scattered.

---

## 2. Layer-by-Layer Test Coverage Audit

### Layer 1: Multi-Source Intake Fairness (`selectIntakeBatch`)
- **Production Files**:
  - `apps/web/src/lib/conditional-state.ts` (lines 66–100)
  - `apps/web/src/pages/api/cron/scrape.ts` (lines 2720–2738)
- **Current Test File**: `apps/web/tests/intake-fairness.test.ts` (6 tests, 34 assertions)
- **Behavioral Context & Bloat Elimination**:
  - *Bloat Removed*: Previously, `newItems.slice(0, limit)` gave absolute head-of-line priority to RSS feeds because the scrape array concatenated `[...rss, ...html, ...json, ...ats]`. Fifty fresh RSS items completely choked the intake cap, systematically dropping newly scraped ATS items from Hunt St and Coconut VA.
  - *Replacement*: `selectIntakeBatch` implements round-robin slot allocation across distinct `sourceId` buckets up to `limit` (default 50, max 100), placing excess items into `deferred`. `mergeSourceIdsByUrl` preserves URL source attribution so deferred items trigger conditional validator resets via `sourceIdsForUrls` and `retrySourceIds`.
- **Existing Coverage**:
  - Tests 50 RSS items + 1 Hunt + 1 Coconut item under cap 50: proves both ATS items enter `selected`.
  - Tests 50 RSS + 27 Hunt + 7 Coconut items over two cycles: proves first pass selects 50, and second pass selects all deferred Hunt URLs beside 50 new RSS items.
  - Tests `buildSourceIdsByUrl` + `mergeSourceIdsByUrl` + `sourceIdsForUrls` overflow attribution.
  - Tests `omitKnownSourceUrls` dropping stored URLs.
- **Identified Coverage Gaps**:
  1. *Boundary Caps*: Missing explicit tests for `limit = 0`, negative limits, non-integer limits, `limit = NaN`, `limit >= items.length`, and `items = []`.
  2. *Source Id Degeneracy*: Items with `sourceId: null`, `sourceId: undefined`, `sourceId: ""`, or whitespace-only source IDs must be bucketed safely without throwing or causing infinite loops.
  3. *Adversarial Asymmetric Skew*: If one feed injects 1,000 items while three ATS feeds inject 1 item each under `limit = 10`, does round-robin allocate fairly across rounds without bucket index out-of-bounds?
  4. *Immutability & Object Identity*: The input array must not be mutated, and selected/deferred items must retain referential identity (`===`) so downstream metadata (e.g. `clientTimezone`, `sourcePlatform`, `tags`) is never lost.

---

### Layer 2: Workable Rotation Cadence & Clock Decoupling (`selectWorkableRotation`)
- **Production Files**:
  - `apps/web/src/lib/workable-rotation.ts` (lines 1–131)
  - `apps/web/src/pages/api/cron/scrape.ts` (lines 1779–1791, 2337–2371)
- **Current Test Files**: `apps/web/tests/rotation-vs-intake.test.ts` (3 tests), `apps/web/tests/intake-fairness.test.ts` (1 test)
- **Behavioral Context & Bloat Elimination**:
  - *Bloat Removed*: The scrape loop previously contained a redundant second 60-minute `Date.parse` check inside the ATS agency iteration loop. Because `selectWorkableRotation` had already vetted durable `lastAttemptAt` from database states before the loop, the second clock was a duplicate decision that could never change an admitted tenant's status, while adding potential timezone parsing drift.
  - *Consolidation*: `atsFetchCadenceSkip` immediately returns `null` for `platform === "workable"`, while non-Workable boards (e.g. Breezy, Ashby) continue to enforce the 60-minute cadence.
- **Existing Coverage**:
  - Tests rotation with empty attempt state selecting first two alphabetical tenants (`coconutva`, `crewbloom`) and marking Hunt `ROTATION_DEFERRED`.
  - Tests a 30-minute-old attempt resulting in `COOLDOWN` in rotation diagnostics, and asserts `atsFetchCadenceSkip("workable", ...)` is `null`.
  - Tests two due tenants taking the two available slots, leaving unselected tenants to contribute 0 items.
- **Identified Coverage Gaps**:
  1. *Complete Neutralization Proof*: No adversarial test proves `atsFetchCadenceSkip("workable", ...)` returns `null` across all degenerate timestamp inputs (0ms, future, non-ISO, malformed, empty string).
  2. *Timestamp Corruption Robustness*: In `selectWorkableRotation`, corrupt or impossible timestamps (e.g., `"2026-02-29T12:00:00Z"` non-leap, `"2026-09-31T12:00:00Z"` impossible calendar, `"2026-10-14 12:00:00"` non-ISO) must produce `INVALID_ATTEMPT_TIME` rather than throwing or defaulting to epoch 0.
  3. *Exact 60-Minute Boundary Precision*: Sub-millisecond boundary precision: `now - lastAttempt = 3,599,999 ms` (59m 59.999s) MUST be `COOLDOWN`; `now - lastAttempt = 3,600,000 ms` MUST be DUE.
  4. *Degraded System States*: Explicit assertion of `unavailableReason: "STATE_UNAVAILABLE"` when `statesAvailable = false`, and `unavailableReason: "INVALID_OBSERVED_AT"` when `observedAt` is malformed or invalid.
  5. *Directory Decoupling*: Directory `verifiedAt` timestamps must be proven to have zero influence on rotation ordering.

---

### Layer 3: Triage Decision Geo-Scope Sovereignty (`decideTriage`)
- **Production Files**:
  - `packages/scraper/triage-decision.ts` (lines 59–135)
  - `packages/scraper/triage.ts`
- **Current Test File**: `packages/scraper/triage-decision.test.ts` (13 tests across 3 describes)
- **Behavioral Context & Bloat Elimination**:
  - *Bloat Removed*: `geoGate` already deterministically verifies structured geographic scopes (`ph_only`, `apac_incl_ph`, `worldwide`). Previously, `decideTriage` allowed an LLM model vote (`eligibleForFilipinos: false`) or a transient Workers AI outage/unavailability to override that deterministic decision and unpublish or withhold verified openings.
  - *Consolidation*: `decideTriage` guarantees that for structured scopes, the model's eligibility vote cannot override the verified geoGate scope, nor can an AI outage unpublish the job. However, deterministic phrase rejection (e.g. `isObviousGeoRestriction` like "US citizens only") is strictly preserved.
- **Existing Coverage**:
  - Tests missing Workers AI binding failing closed on `geoScope: "unknown"`.
  - Tests model rejection overridden for `ph_only`, `apac_incl_ph`, and `worldwide` when no deterministic phrases are present.
  - Tests "US citizens only" phrase properly overriding and rejecting a `ph_only` listing.
  - Tests AI outage falling back to heuristic category on `ph_only`.
  - Tests skeptic behavior for `unknown` scope (agreement publishes, split quarantines).
- **Identified Coverage Gaps**:
  1. *Complete Scope Matrix under AI Outage*: While `ph_only` was tested under AI unavailability, `apac_incl_ph` and `worldwide` were not tested under complete AI outage.
  2. *Full Deterministic Rejection Suite*: Only "US citizens only" was tested. Gaps include security clearance ("active Top Secret / TS/SCI clearance"), tax locks ("W2 only, no C2C"), explicit US residence ("must reside in the United States"), and non-English text ("Per il nostro reparto online...").
  3. *Exception Hardening*: If `triageJob` throws an unexpected runtime error (e.g. network disconnect, memory abort), `decideTriage` must catch and return `{ kind: "error" }` without crashing the parent batch.
  4. *Skeptic Isolation*: Proving that `skepticEligibilityCheck` is NEVER called when `geoScope` is `ph_only`, `apac_incl_ph`, or `worldwide`, even under adversarial mocking.

---

### Layer 4: GeoGate Country Pin Dominance over Title APAC Tokens (`geoGate`)
- **Production Files**:
  - `packages/scraper/geoGate.ts` (lines 262–305, 319–338)
- **Current Test File**: `packages/scraper/geoGate.test.ts` (44 tests)
- **Behavioral Context & Bloat Elimination**:
  - *Bloat Removed*: Previously, `geoGate` checked title tokens for "APAC" before verifying structured location pins. A Jobicy posting titled "Director of Customer Success, APAC" with structured location `Australia` was erroneously marked `apac_incl_ph` / `eligible_verified` because the title token overrode the country pin (a classic "watermelon" false positive).
  - *Consolidation*: `geoGate` now checks `structuredLocationPin(locationRaw)`. If the location contains an authoritative country, US state, city, or excluded region, title-level APAC tokens are suppressed, and the structured country pin locks the opening as `country_locked` / `ineligible`.
- **Existing Coverage**:
  - Tests Jobicy Australia + APAC title -> `country_locked`, `ineligible`.
  - Tests title-only APAC with no location -> `apac_incl_ph`, `eligible_verified`.
  - Tests location "APAC, Australia" -> `apac_incl_ph`, `eligible_verified`.
- **Identified Coverage Gaps**:
  1. *Comprehensive Geographic Matrix*: Gaps exist for other country pins with title APAC: United States, Canada, United Kingdom, Germany, Japan, Singapore, and New Zealand.
  2. *US State Codes with APAC Title*: E.g., title "Customer Support (APAC)" with location "Austin, TX" or "San Francisco, CA".
  3. *Excluded Regions with APAC Title*: E.g., title "APAC Regional Lead" with location "EMEA" or "North America" -> must return `region_excl_ph`, `ineligible`.
  4. *Legitimate Philippines Roles with APAC Title*: Must verify that title "Customer Support Specialist (APAC)" with location "Philippines" or "Cebu, PH" correctly resolves to `ph_only`, `eligible_verified` (the country pin rule must not lock the Philippines).

---

### Layer 5: Publication Freshness & Empirical Counterexamples
- **Production Files**:
  - `packages/scraper/publication-freshness.ts`
  - `apps/web/tests/native-fresh-scrape-posting-date.test.ts`
- **Current Test Files**: `packages/scraper/publication-freshness.test.ts` (34 tests), `apps/web/tests/native-fresh-scrape-posting-date.test.ts`
- **Behavioral Context & Protected Invariants**:
  - *Invariant Kept*: Publication strictly requires an authentic posting instant within the inclusive 30-day window (`[observedAt - 30d, observedAt]`). Stale, future, missing, or malformed dates fail closed.
  - *Counterexample Mandate*: Real-world counterexamples must remain at exactly 0% published:
    - **Pineapple Staffing** (`workable:pineapple-staffing`): 3 open US telecommuting roles from 2020–2022. Fails both geography (United States) and freshness (stale).
    - **Affordable Staff** (`exp:affordablestaff` / Pathcutters): Bacolod, Philippines office-only roles. Despite Philippine geography, dayshift alignment, and high employer trust, workplace type is `onsite` / non-remote.
    - **UpGuard** (`Jobicy`): "Director of Customer Success, APAC" in Australia. Country pin locks it out.
- **Identified Coverage Gaps**:
  - Currently, there is NO unified adversarial test file verifying that Pineapple Staffing and Affordable Staff remain 0% published when passed through the full pipeline under simulated employer trust.
  - Tests must prove that 5-tier employer evidence (L1 legal entity, L2 mandate, L3 preset, L4 history, L5 directory) and dayshift classification cannot bypass `geoGate` or `assessPostingFreshness`.

---

## 3. The 5 Protected Invariants Mapping

| Invariant # | Invariant Name | Production Gate / Function | Mathematical / Behavioral Contract | Failure Mode if Broken |
| :--- | :--- | :--- | :--- | :--- |
| **Invariant 1** | Multi-Source Round-Robin Intake Fairness | `selectIntakeBatch` (`conditional-state.ts`) | For $N$ sources and cap $C$, slots are distributed cyclically $\min(1, \text{rem})$ per source. Deferred items stay queued; zero ATS items dropped due to RSS head. | RSS flood starves fresh ATS roles; Hunt St and Coconut VA drop out permanently. |
| **Invariant 2** | Durable Cadence Clock Decoupling | `selectWorkableRotation` & `atsFetchCadenceSkip` | Workable cadence is governed solely by durable `lastAttemptAt` in `selectWorkableRotation` (max 2 slots/hr). `atsFetchCadenceSkip` is a no-op for Workable. | Duplicate in-loop check creates timing jitter, false skips, or loop starvation. |
| **Invariant 3** | Geo-Scope Sovereignty over Model Disagreement | `decideTriage` (`triage-decision.ts`) | Verified scopes (`ph_only`, `apac_incl_ph`, `worldwide`) remain `eligible` regardless of model dissent or AI outage, UNLESS deterministic phrase rejection matches. | LLM hallucinations or Cloudflare AI downtime silently unpublish valid PH jobs. |
| **Invariant 4** | Authoritative Location Pin Dominance | `geoGate` (`geoGate.ts`) | If `structuredLocationPin(locationRaw)` is TRUE, title token "APAC" is ignored; structured pin enforces `country_locked` / `ineligible`. | Non-PH jobs (e.g. Australia UpGuard) leak through as "APAC incl. PH" (watermelon defect). |
| **Invariant 5** | Absolute Counterexample Exclusion (0% Published) | `geoGate` + `assessPostingFreshness` | Openings from Pineapple Staffing (US/stale), Affordable Staff (onsite), and UpGuard (Australia) MUST result in 0 published opportunities. | Employer trust or dayshift tags bypass remote/geo rules, destroying index integrity. |

---

## 4. Adversarial Analysis of Counterexamples

### 1. Pineapple Staffing (`workable:pineapple-staffing`)
- **Observed Production State**: 3 open roles on Workable widget:
  1. *Business Virtual Assistant* (Workable ID `BVA-2020-01`)
  2. *Marketing Virtual Assistant* (Workable ID `MVA-2021-06`)
  3. *Executive Virtual Assistant* (Workable ID `EVA-2022-11`)
- **Attributes**:
  - `locationRaw`: "United States"
  - `locationType`: "remote" (telecommuting `true`)
  - `postedAt`: 2020–2022 (e.g. `2020-01-14T00:00:00.000Z`)
  - `employerConfidence`: High (Directory ID 208, Level 5 Curated Directory)
- **Adversarial Vector**: Attempting to publish based on high VA relevance (title contains "Virtual Assistant") and employer directory presence.
- **Enforced Defense**:
  - `geoGate` evaluates `locationRaw: "United States"` $\to$ `country_locked`, `ineligible`.
  - `assessPostingFreshness` evaluates `2020-01-14` against current time $\to$ `STALE` (> 1,400 days old).
  - Outcome: **0 public rows, 0 publication ledger entries**.

### 2. Affordable Staff (`exp:affordablestaff` / Pathcutters)
- **Observed Production State**: Directory entry 242; Bacolod, Negros Occidental, Philippines.
- **Attributes**:
  - `locationRaw`: "Bacolod, Philippines"
  - `locationType`: "onsite" (or `locationRaw: "Bacolod, Philippines (onsite)"`)
  - `postedAt`: `2026-10-14T08:00:00.000Z` (Fresh, within window)
  - `schedule`: Australian business hours dayshift (8:00 AM – 5:00 PM PHT)
  - `employerConfidence`: Level 1 (Registered Philippine Entity / Bacolod office)
- **Adversarial Vector**: Attempting to publish based on verified Philippine location, AU dayshift hours, and Level 1 employer trust.
- **Enforced Defense**:
  - `hasExplicitNonRemoteLocationType("onsite")` evaluates to `true`.
  - `geoGate` Step 0 triggers: `country_locked`, `ineligible` (`Not fully remote: "onsite" workplace type`).
  - Strict 4-way separation invariant: `Employer PH confidence != Job validity != PH eligibility != Role relevance`.
  - Outcome: **0 public rows, 0 publication ledger entries**.

### 3. UpGuard (`Jobicy`)
- **Observed Production State**: Jobicy listing #4667 variant:
  - Title: "Director of Customer Success, APAC"
  - `locationRaw`: "Australia"
  - `locationType`: "remote"
  - `postedAt`: `2026-10-14T10:00:00.000Z` (Fresh)
- **Adversarial Vector**: Exploiting title token "APAC" to achieve `apac_incl_ph` classification while bypassing Australia country lock.
- **Enforced Defense**:
  - `structuredLocationPin("Australia")` evaluates to `true`.
  - Title token "APAC" check (`!structuredLocationPin(locationRaw)`) is suppressed.
  - Step 4 structured location pin evaluates `COUNTRY_REGEX.test("Australia")` $\to$ `country_locked`, `ineligible`.
  - Outcome: **0 public rows for newly ingested record**.

---

## 5. Comprehensive Adversarial Test Plan

To provide unambiguous, drop-in test specifications for Worker and Challengers, the test plan defines targeted additions to existing test files plus one new dedicated adversarial test suite.

### Suite 1: Intake Fairness Stress & Edge Test Suite
**Target File**: `apps/web/tests/intake-fairness.test.ts` (Extend with new describe block)

#### Test Cases to Add:
1. `selectIntakeBatch handles boundary and invalid caps safely without dropping items`:
   - Inputs: 10 items across 2 sources. Test `limit = 0`, `limit = -5`, `limit = NaN`, `limit = 100`.
   - Assertions: `limit <= 0` or invalid returns `selected: []`, `deferred: [...items]`. `limit = 100` returns `selected: [...items]`, `deferred: []`.
2. `selectIntakeBatch safely handles empty and degenerate source identities`:
   - Inputs: Items with `sourceId: null`, `sourceId: undefined`, `sourceId: ""`, `sourceId: "   "`.
   - Assertions: All items bucketed into fallback empty-string source without crashing; round-robin cycles cleanly.
3. `selectIntakeBatch resists massive single-source flood (1,000 RSS vs 3 ATS)`:
   - Inputs: 1,000 RSS items (`we-work-remotely`) + 1 Hunt St item + 1 Coconut VA item + 1 Pearl Talent item. `limit = 50`.
   - Assertions: All 3 ATS items selected in first pass. RSS allocated exactly 47 items. Exactly 953 RSS items deferred. Total selected + deferred = 1,003.
4. `selectIntakeBatch guarantees referential immutability and metadata preservation`:
   - Inputs: Frozen objects with custom symbols and deep properties.
   - Assertions: Input array length unchanged; returned objects `selected[i] === input[j]`.

---

### Suite 2: Rotation Cadence & Timestamp Hardening Suite
**Target File**: `apps/web/tests/rotation-vs-intake.test.ts` (Extend with new describe block)

#### Test Cases to Add:
1. `atsFetchCadenceSkip is unconditionally neutralized for Workable platform`:
   - Inputs: `platform: "workable"`, `lastAttemptAt` tested with `now`, `now - 1ms`, `now + 1hr`, `"corrupt-date"`, `""`, `null`.
   - Assertions: Returns `null` in 100% of cases.
2. `selectWorkableRotation enforces millisecond boundary precision on 60-minute interval`:
   - Inputs:
     - Tenant A: `lastAttemptAt = now - 3,599,999 ms` (59m 59.999s ago)
     - Tenant B: `lastAttemptAt = now - 3,600,000 ms` (exactly 60m 00.000s ago)
   - Assertions: Tenant A diagnosed as `COOLDOWN`; Tenant B is due and selected.
3. `selectWorkableRotation rejects malformed, impossible calendar, and future attempt timestamps`:
   - Inputs:
     - Tenant 1: `"2026-02-29T12:00:00.000Z"` (non-leap year February 29)
     - Tenant 2: `"2026-09-31T12:00:00.000Z"` (impossible calendar date)
     - Tenant 3: `new Date(Date.parse(now) + 1000).toISOString()` (future)
   - Assertions: Tenants 1 & 2 yield `INVALID_ATTEMPT_TIME`. Tenant 3 yields `FUTURE_ATTEMPT_TIME`. Selected count = 0.
4. `selectWorkableRotation fails closed when states or observed clock are unavailable`:
   - Inputs: `statesAvailable: false` and `observedAt: "invalid"`.
   - Assertions: Selected count = 0; `unavailableReason` matches expected error codes.
5. `selectWorkableRotation strictly limits selection to exactly WORKABLE_ROTATION_LIMIT`:
   - Inputs: 20 due Workable tenants.
   - Assertions: `selected.length === 2`. Remaining 18 receive `ROTATION_DEFERRED`.

---

### Suite 3: Triage Decision Geo-Scope Sovereignty Suite
**Target File**: `packages/scraper/triage-decision.test.ts` (Extend with new describe block)

#### Test Cases to Add:
1. `structured geo scopes (ph_only, apac_incl_ph, worldwide) publish during complete AI outage`:
   - Inputs: `env: {}` (no AI binding). Test items across `ph_only`, `apac_incl_ph`, `worldwide`.
   - Assertions: All return `kind: "eligible"`, `triage.eligibleForFilipinos: true`, `triage.reason` contains "AI unavailable".
2. `deterministic rejection phrases override structured geo across all three positive scopes`:
   - Inputs:
     - `ph_only` + description "Must possess active Top Secret / TS/SCI clearance"
     - `apac_incl_ph` + description "W2 only; no C2C candidates allowed"
     - `worldwide` + description "Must be based in the United States and have US work authorization"
   - Assertions: All return `kind: "ineligible"` despite structured positive scope.
3. `decideTriage catches unexpected triageJob exceptions and returns error kind`:
   - Inputs: Mock `env.AI.run` throwing `new Error("Cloudflare worker CPU limit exceeded")`.
   - Assertions: Returns `{ kind: "error", error: "Cloudflare worker CPU limit exceeded" }` without throwing.
4. `adversarial skeptic is strictly bypassed for structured scopes even if model disagrees`:
   - Inputs: `gate.geoScope = "ph_only"`, model returns `eligibleForFilipinos: false`, skeptic mock configured to refute.
   - Assertions: Decision is `eligible`, `skeptic` is `null`, skeptic mock call count is strictly 0.

---

### Suite 4: GeoGate Authoritative Country Pin Matrix Suite
**Target File**: `packages/scraper/geoGate.test.ts` (Extend with new describe block)

#### Test Cases to Add:
1. `title APAC token is suppressed by all authoritative country pins`:
   - Inputs: Title "Director of Operations (APAC)" paired with `locationRaw`:
     - `"United States"`, `"Canada"`, `"United Kingdom"`, `"Germany"`, `"Japan"`, `"Singapore"`, `"New Zealand"`.
   - Assertions: All yield `geoScope: "country_locked"`, `phEligibility: "ineligible"`.
2. `title APAC token is suppressed by US state abbreviations and major foreign cities`:
   - Inputs: Title "Customer Support Lead - APAC" paired with `locationRaw`:
     - `"Austin, TX"`, `"San Francisco, CA"`, `"London"`, `"Sydney"`, `"Berlin"`.
   - Assertions: All yield `geoScope: "country_locked"`, `phEligibility: "ineligible"`.
3. `title APAC token is suppressed by excluded regions`:
   - Inputs: Title "Regional Marketing Manager (APAC)" paired with `locationRaw: "EMEA"` and `"North America"`.
   - Assertions: Yields `geoScope: "region_excl_ph"`, `phEligibility: "ineligible"`.
4. `legitimate Philippine locations retain ph_only eligibility when title contains APAC`:
   - Inputs: Title "Support Engineer (APAC)" paired with `locationRaw: "Philippines"`, `"Manila, PH"`, `"Cebu"`.
   - Assertions: Yields `geoScope: "ph_only"`, `phEligibility: "eligible_verified"`.

---

### Suite 5: Dedicated Adversarial Counterexamples Suite (NEW)
**Target File**: `packages/scraper/adversarial-counterexamples.test.ts` (NEW file)

#### Comprehensive Test Cases:
```typescript
import { describe, expect, test } from "bun:test";
import { geoGate, assessPostingFreshness, classifyShift } from "./index";

const OBSERVED_NOW = "2026-10-15T12:00:00.000Z";

describe("Adversarial Counterexample Verification (0% Published Invariant)", () => {
  describe("Counterexample 1: Pineapple Staffing (workable:pineapple-staffing)", () => {
    const PINEAPPLE_ROLES = [
      {
        id: "pine-1",
        title: "Business Virtual Assistant",
        locationRaw: "United States",
        locationType: "remote",
        postedAt: "2020-01-14T00:00:00.000Z",
        employerLevel: "L5_CURATED_DIRECTORY",
      },
      {
        id: "pine-2",
        title: "Marketing Virtual Assistant",
        locationRaw: "United States",
        locationType: "remote",
        postedAt: "2021-06-20T00:00:00.000Z",
        employerLevel: "L5_CURATED_DIRECTORY",
      },
      {
        id: "pine-3",
        title: "Executive Virtual Assistant",
        locationRaw: "United States",
        locationType: "remote",
        postedAt: "2022-11-05T00:00:00.000Z",
        employerLevel: "L5_CURATED_DIRECTORY",
      },
    ];

    for (const role of PINEAPPLE_ROLES) {
      test(`Pineapple Staffing "${role.title}" remains 0% published (geo locked & stale)`, () => {
        // Gate 1: GeoGate
        const geo = geoGate({
          title: role.title,
          locationRaw: role.locationRaw,
          locationType: role.locationType,
        });
        expect(geo.phEligibility).toBe("ineligible");
        expect(geo.geoScope).toBe("country_locked");

        // Gate 2: Freshness Window (30 days)
        const freshness = assessPostingFreshness(role.postedAt, OBSERVED_NOW);
        expect(freshness.state).toBe("STALE");

        // Proof of zero publication
        const isQualified = geo.phEligibility !== "ineligible" && freshness.state === "WITHIN_WINDOW";
        expect(isQualified).toBe(false);
      });
    }
  });

  describe("Counterexample 2: Affordable Staff (exp:affordablestaff / Pathcutters)", () => {
    const AFFORDABLE_STAFF_ROLES = [
      {
        id: "as-1",
        title: "Virtual Assistant (Dayshift)",
        locationRaw: "Bacolod, Philippines",
        locationType: "onsite", // Explicit workplace type
        postedAt: "2026-10-14T08:00:00.000Z", // Fresh
        employerLevel: "L1_REGISTERED_PH_ENTITY",
      },
      {
        id: "as-2",
        title: "Administrative Assistant - Bacolod Office",
        locationRaw: "Bacolod, Philippines (onsite)", // String marker
        locationType: "remote",
        postedAt: "2026-10-14T08:00:00.000Z",
        employerLevel: "L1_REGISTERED_PH_ENTITY",
      },
      {
        id: "as-3",
        title: "AU Accounting Specialist",
        locationRaw: "Bacolod, Philippines",
        locationType: "hybrid",
        postedAt: "2026-10-14T08:00:00.000Z",
        employerLevel: "L1_REGISTERED_PH_ENTITY",
      },
    ];

    for (const role of AFFORDABLE_STAFF_ROLES) {
      test(`Affordable Staff "${role.title}" remains 0% published (onsite/hybrid lock)`, () => {
        // Gate 1: GeoGate
        const geo = geoGate({
          title: role.title,
          locationRaw: role.locationRaw,
          locationType: role.locationType,
        });
        expect(geo.phEligibility).toBe("ineligible");
        expect(geo.geoScope).toBe("country_locked");
        expect(geo.evidence).toContain("Not fully remote");

        // Dayshift classification may detect day_shift from explicit hours,
        // but it CANNOT bypass workplace ineligibility.
        const shift = classifyShift({ title: role.title });
        const isQualified = geo.phEligibility !== "ineligible";
        expect(isQualified).toBe(false);
      });
    }
  });

  describe("Counterexample 3: UpGuard (Jobicy)", () => {
    test("UpGuard 'Director of Customer Success, APAC' in Australia remains 0% published", () => {
      const upguard = {
        title: "Director of Customer Success, APAC",
        locationRaw: "Australia",
        locationType: "remote",
        postedAt: "2026-10-14T10:00:00.000Z",
      };

      const geo = geoGate(upguard);
      expect(geo.phEligibility).toBe("ineligible");
      expect(geo.geoScope).toBe("country_locked");
      expect(geo.evidence).toContain("Australia");

      const freshness = assessPostingFreshness(upguard.postedAt, OBSERVED_NOW);
      expect(freshness.state).toBe("WITHIN_WINDOW");

      const isQualified = geo.phEligibility !== "ineligible" && freshness.state === "WITHIN_WINDOW";
      expect(isQualified).toBe(false);
    });
  });

  describe("4-Way Separation Matrix Proof", () => {
    test("Employer trust level cannot bypass geoGate or freshness", () => {
      // High trust employer (L1 Entity), but job is in US and Stale
      const fakeHighTrustJob = {
        title: "Virtual Assistant",
        locationRaw: "United States",
        locationType: "remote",
        postedAt: "2020-01-01T00:00:00.000Z",
      };

      const geo = geoGate(fakeHighTrustJob);
      const freshness = assessPostingFreshness(fakeHighTrustJob.postedAt, OBSERVED_NOW);

      // Even with Employer Confidence Level = 1.0:
      const canPublish = geo.phEligibility !== "ineligible" && freshness.state === "WITHIN_WINDOW";
      expect(canPublish).toBe(false);
    });
  });
});
```

---

## 6. Execution & Verification Playbook for Worker and Challengers

### For Worker (Implementation Agent)
1. **Target Test Implementations**:
   - Create `packages/scraper/adversarial-counterexamples.test.ts`.
   - Append stress suites to `apps/web/tests/intake-fairness.test.ts`.
   - Append decoupling and precision suites to `apps/web/tests/rotation-vs-intake.test.ts`.
   - Append full structured geo matrix to `packages/scraper/triage-decision.test.ts`.
   - Append country pin matrix to `packages/scraper/geoGate.test.ts`.
2. **Worker Verification Commands**:
   ```sh
   # Focused Layer Test Execution
   bun test --no-env-file --preload ./scripts/ci/test-environment.ts ./apps/web/tests/intake-fairness.test.ts
   bun test --no-env-file --preload ./scripts/ci/test-environment.ts ./apps/web/tests/rotation-vs-intake.test.ts
   bun test --no-env-file --preload ./scripts/ci/test-environment.ts ./packages/scraper/triage-decision.test.ts
   bun test --no-env-file --preload ./scripts/ci/test-environment.ts ./packages/scraper/geoGate.test.ts
   bun test --no-env-file --preload ./scripts/ci/test-environment.ts ./packages/scraper/adversarial-counterexamples.test.ts

   # Package Regression Suites
   bun test packages/scraper
   bun test apps/web/tests

   # Typecheck & Build
   bun run typecheck
   bun run build
   ```
3. **Acceptance Threshold**:
   - 0 test failures.
   - 0 TypeScript diagnostics errors (`tsc --noEmit`).
   - Clean Astro production build with exit code 0.

---

### For Challengers (Adversarial Audit Agents)
Challengers must independently audit and challenge the Worker's implementation using targeted adversarial probes:
1. **Mutation Attacks**:
   - *Mutation 1 (Intake Reversion)*: Revert `selectIntakeBatch(newItems, limit)` to `newItems.slice(0, limit)`. Assert `apps/web/tests/intake-fairness.test.ts` FAILS.
   - *Mutation 2 (Clock Re-coupling)*: Revert `atsFetchCadenceSkip` to execute for Workable. Assert `apps/web/tests/rotation-vs-intake.test.ts` FAILS.
   - *Mutation 3 (AI Veto Reintroduction)*: Remove `structuredGeo && !deterministicReject` check in `decideTriage`. Assert `packages/scraper/triage-decision.test.ts` FAILS.
   - *Mutation 4 (Pin Bypass)*: Invert `!structuredLocationPin(locationRaw)` in `geoGate.ts:302`. Assert `packages/scraper/geoGate.test.ts` and `adversarial-counterexamples.test.ts` FAIL.
   - *Mutation 5 (Counterexample Leak)*: Attempt to bypass `geoGate` using an employer trust flag. Assert `adversarial-counterexamples.test.ts` FAILS.
2. **Challenger Audit Commands**:
   ```sh
   # Run all 5 suites simultaneously in isolated runner
   bun test --no-env-file --preload ./scripts/ci/test-environment.ts \
     ./apps/web/tests/intake-fairness.test.ts \
     ./apps/web/tests/rotation-vs-intake.test.ts \
     ./packages/scraper/triage-decision.test.ts \
     ./packages/scraper/geoGate.test.ts \
     ./packages/scraper/adversarial-counterexamples.test.ts
   ```
3. **Verdict Criteria**:
   - `APPROVE`: All 5 invariants proven; counterexamples 100% excluded; mutations cleanly caught.
   - `REQUEST_CHANGES`: Any watermelon bypass, untested boundary condition, or regression.
