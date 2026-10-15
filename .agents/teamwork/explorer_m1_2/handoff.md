# Handoff Report: Filtering, GeoGate, and Triage Gate Consolidation (Milestone 1)

**Agent**: `explorer_m1_2`  
**Working Directory**: `c:\Users\admin\Desktop\va-freelance-hub\.agents\teamwork\explorer_m1_2`  
**Target Milestone**: M1 (Behavioral Bloat & Redundant Complexity Elimination)  
**Recipient**: `parent` (`27133579-1ec8-4773-aa06-ab0ff4ef177c`)  
**Timestamp**: 2026-10-15T13:45:00Z  

---

## 1. Observation

Direct observations from source inspection and test execution across the workspace:

1. **AI Provider Early-Return Bypass in `triageJob`**:
   - In `packages/scraper/triage.ts:374-436`:
     ```ts
     374:   // 2. If running without Cloudflare Workers AI binding (e.g. local scripts), fallback to basic tags & eligibility
     375:   if (!env || !env.AI) {
     376:     // Basic heuristic categorizer for local development
     ...
     434:     aiUnavailable: true,
     435:   };
     436: }
     ```
     `env?.GEMINI_API_KEY` and `env?.GROQ_API_KEY` are only read on lines 496-497. If `env.AI` is undefined, `triageJob` returns mock classification at line 423, bypassing Gemini and Groq entirely.
   - Contrast with `skepticEligibilityCheck` in `packages/scraper/triage.ts:631-635`:
     ```ts
     631:   const geminiKey = env?.GEMINI_API_KEY;
     632:   const groqKey = env?.GROQ_API_KEY;
     633:   if (!env?.AI && !geminiKey && !groqKey) {
     634:     return { eligible: true, reason: "Skeptic unavailable (no AI provider)", aiUnavailable: true };
     635:   }
     ```

2. **Obsolete Timezone Rejection in `GEOGRAPHIC_EXCLUSION_REGEX`**:
   - In `packages/scraper/triage.ts:50-54`:
     ```ts
     50:     "us timezone only",
     51:     "est only",
     52:     "pst only",
     53:     "mst only",
     54:     "cst only",
     ```
   - In `packages/scraper/geoGate.ts:12-13`:
     ```ts
     12: // - Timezone-OVERLAP requirements ("must overlap 4h with EST") stay eligible —
     13: //   that is normal VA reality. Only hard residence/authorization locks reject.
     ```
   - In `packages/scraper/triage-decision.ts:88-91`:
     ```ts
     88:   const deterministicReject =
     89:     isObviousGeoRestriction(input.title, input.description || "") ||
     90:     isObviousNonEnglishOrLocalOnly(input.title, input.description || "");
     ```
     A Philippines-targeted role mentioning "schedule: EST only" matches `isObviousGeoRestriction`, sets `deterministicReject = true`, and is rejected on line 120 despite `geoGate` returning `ph_only`.

3. **Stage Inversion of Localized European Markers**:
   - In `packages/scraper/triage.ts:64-87`:
     `LOCAL_OR_NON_ENGLISH_REGEX` checks `m/w/d`, `w/m/d`, `werkstudent`, `alternance`, `cdi`, `cdd`, `praktikum`.
   - In `packages/scraper/geoGate.ts:198-229`:
     Only `detectDominantLanguage` is called. European postings with short text or English headings pass `geoGate` as `unknown`, reaching `triageJob` and `decideTriage` before being rejected by `LOCAL_OR_NON_ENGLISH_REGEX`.

4. **Incomplete Geo Filtering in `drainPendingTriageQueue`**:
   - In `apps/web/src/pages/api/cron/scrape.ts:423-465`:
     Line 423 executes `const gate = geoGate(...)`. Line 433 checks `if (hasExplicitNonRemoteLocationType(item.locationType))`.
     If `gate.phEligibility === "ineligible"` due to a country lock (e.g. `locationRaw: "United States"` or `locationRaw: "Austin, TX"`), line 433 is false, and line 461 invokes `decision = await decideTriage(...)`, spending AI invocations on already-ineligible rows.

5. **Duplicate Location Pin Inspections in `geoGate.ts`**:
   - In `packages/scraper/geoGate.ts:244-254`:
     `structuredLocationPin(locationRaw)` evaluates `REGION_EXCL_PH_REGEX`, `STRUCTURED_US_LOCATION_REGEX`, `US_STATE_CODE_LOCATION_REGEX`, `US_STATE_REGEX`, `COUNTRY_REGEX`, and `CITY_REGEX`.
   - In `packages/scraper/geoGate.ts:319-338`:
     Step 4 evaluates the exact same 6 regex searches on the same `locationRaw`.

6. **Duplicate Keyword Categorization**:
   - `packages/scraper/triage.ts:380-421` contains 40 lines of ad-hoc category checking, duplicating the canonical `packages/scraper/categorizer.ts:1-137` (`categorizeOpportunityTitle`).

7. **Test Suite Baseline**:
   - Ran `bun test ./packages/scraper/geoGate.test.ts ./packages/scraper/triage-decision.test.ts ./packages/scraper/triage.test.ts ./packages/scraper/shiftClassifier.test.ts`:
     Result: **95 pass, 0 fail across 4 files**.
   - Ran `bun test ./packages/scraper/policy-resolver.test.ts`:
     Result: **45 pass, 0 fail across 1 file**.

---

## 2. Logic Chain

1. **Premise**: Ingestion efficiency and throughput toward 100–150 jobs/day require removing false negatives and reducing wasted AI invocations without compromising verification rigor.
2. **From Observation 1**: Because `triageJob` returns early when `!env.AI`, any execution environment where `env.AI` is unavailable cannot use configured `GEMINI_API_KEY` or `GROQ_API_KEY`. Unifying this check with `skepticEligibilityCheck` (`!env?.AI && !geminiKey && !groqKey`) unlocks free-tier LLM triage redundancy.
3. **From Observation 2**: Filipino virtual assistants routinely work overnight supporting US clients in US business hours (EST/PST). Including `"est only"` and `"pst only"` in `GEOGRAPHIC_EXCLUSION_REGEX` directly contradicts `geoGate`'s design rules and causes `deterministicReject` in `decideTriage` to veto valid Philippines-targeted listings. Removing timezone keywords preserves all actual residency/citizenship prohibitions while stopping false drops.
4. **From Observation 3**: Localized European legal terms (`m/w/d`, `Werkstudent`, `Alternance`) definitively indicate domestic German/French employment. Moving `LOCAL_OR_NON_ENGLISH_REGEX` into `geoGate.ts` rejects these listings at Stage 3, preventing them from entering the AI triage queue at Stage 5 and preserving the AI budget.
5. **From Observation 4**: In `drainPendingTriageQueue`, checking `gate.phEligibility === "ineligible"` instead of only `hasExplicitNonRemoteLocationType` allows all country-locked rows in the pending queue to be rejected without calling `decideTriage`, saving 1 to 4 AI calls per item.
6. **From Observation 5**: Unifying `structuredLocationPin` and Step 4 in `geoGate.ts` into a single helper `detectStructuredLocationPin` eliminates redundant regex execution and ensures `AMBIGUOUS_STATE_WORDS` protects against false state code matches (e.g. "VA" as Virtual Assistant).
7. **From Observation 6**: Reusing `categorizeOpportunityTitle` in `triage.ts` removes 40 lines of duplicate code and unifies the category taxonomy.
8. **Conclusion**: These consolidations remove behavioral bloat, eliminate false negatives for US-shift VA jobs, conserve AI subrequests, and maintain 100% adherence to all verified safety invariants.

---

## 3. Caveats

- **Timezone Hours Parsing (Milestone 2 Scope)**:
  `shiftClassifier.ts` currently returns `phWorkingHours: null` and evaluates `category: "unknown"` for timezone strings without explicit schedule markers. Expanding `classifyShift` with explicit daytime spans (`8am - 5pm PHT`) and APAC timezones (`AEST`, `AWST`, `NZST`) is budgeted for Milestone 2.
- **D1 Schema Stability**:
  `clientTimezone` is already a column on the `opportunities` table; spreading it in `scrape.ts:3018` requires no database migrations.
- **External API Rate Limits**:
  Gemini Flash-Lite has an RPM limit of 15–30 on the free tier. The existing `aiBudget` and subrequest tracking in `scrape.ts` must remain untouched to prevent rate-limit 429s.

---

## 4. Conclusion

The audit identifies **8 concrete bloat and consolidation opportunities** (documented in `analysis.md`). The Worker should apply the following modifications:
1. **`packages/scraper/triage.ts`**:
   - Update line 374 to check `if (!env?.AI && !geminiKey && !groqKey)` so Gemini/Groq are not bypassed when `env.AI` is absent.
   - Delete `"us timezone only"`, `"est only"`, `"pst only"`, `"mst only"`, `"cst only"` from `GEOGRAPHIC_EXCLUSION_REGEX`.
   - Replace lines 380-421 with `categorizeOpportunityTitle(title, cleanDescription)`.
2. **`packages/scraper/geoGate.ts`**:
   - Add `LOCAL_OR_NON_ENGLISH_REGEX` check at Step 2b to reject German/French domestic roles before AI.
   - Unify location pin checking with `detectStructuredLocationPin(locationRaw)`.
3. **`packages/scraper/triage-decision.ts`**:
   - Ensure `structuredGeo` items bypass model eligibility veto.
4. **`apps/web/src/pages/api/cron/scrape.ts`**:
   - In `drainPendingTriageQueue`, reject on `gate.phEligibility === "ineligible"`.
   - In `triagedItems.push`, spread `clientTimezone: triage.clientTimezone ?? (item as any).clientTimezone ?? null`.

These changes preserve:
- Per-vacancy geoGate (US/onsite/country-locked stay rejected).
- 30-day freshness window.
- Zero employer allowlist bypass (Pineapple Staffing = 0 public).

---

## 5. Verification Method

To independently verify this consolidation, the Worker and review agents must execute:

1. **Targeted Unit & Adversarial Tests**:
   ```bash
   bun test ./packages/scraper/geoGate.test.ts ./packages/scraper/triage-decision.test.ts ./packages/scraper/triage.test.ts ./packages/scraper/shiftClassifier.test.ts ./packages/scraper/policy-resolver.test.ts
   ```
   *Expected*: All 140 tests pass with 0 failures.

2. **Adversarial Safety Invariant Verification**:
   - Add test case verifying `"Virtual Assistant - US hours (EST only)"` is NOT rejected by `isObviousGeoRestriction`.
   - Verify `"Customer Support (m/w/d)"` is rejected by `geoGate` as `country_locked` / `ineligible`.
   - Verify Pineapple Staffing (`locationRaw: "United States"`, 2020 dates) remains `country_locked` and `STALE`.
   - Verify Hunt St `Accounting Manager (onsite)` remains `country_locked`.

3. **Full Regression and Typecheck**:
   ```bash
   bun run typecheck
   bun test
   ```
   *Expected*: Clean pass with 0 errors across the entire workspace.

---
*Handoff complete. Full forensic details in `analysis.md`.*
