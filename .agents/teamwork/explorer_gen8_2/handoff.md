# Handoff Report: High-Confidence Trusted PH Employer Evidence & Dayshift Coverage

**Agent**: teamwork_preview_explorer (Explorer 2 - High-Confidence Trusted PH Employer Evidence & Dayshift Coverage)  
**Assigned Directory**: `c:\Users\admin\Desktop\va-freelance-hub\.agents\teamwork\explorer_gen8_2`  
**Handoff Type**: Hard (Investigation & Architecture Design Complete)  
**Parent Orchestrator**: `c26c4203-90a4-409b-bdac-08147628927d`  
**Reference Analysis**: `c:\Users\admin\Desktop\va-freelance-hub\.agents\teamwork\explorer_gen8_2\analysis.md`  

---

## 1. Observation

1. **`va_directory` Table Schema & Current Storage (`packages/db/schema.ts:96-136`)**:
   - The directory schema defines `company_name`, `website`, `hires_filipinos` (boolean, default true), `niche` (enum), `is_dayshift` (boolean), `is_verified` (boolean), `is_remote` (boolean), `is_marketplace` (boolean), `ats_platform`, `ats_token`, `link_status`, and website provenance fields (`website_source`, `website_evidence`).
   - Observations: There is no structured evidence model for why an employer is trusted or verified beyond boolean flags. There is no foreign key or explicit link between `opportunities` and `va_directory`. Matching is done purely by string normalization (`identityKey` in `apps/web/src/lib/company-identity.ts:4`) or `source_id` prefixes.

2. **Ingestion & Data Loss of `clientTimezone` (`apps/web/src/pages/api/cron/scrape.ts:3018-3043`, `513-531`, `packages/scraper/triage.ts:7,194,471`)**:
   - `packages/scraper/triage.ts` explicitly defines `clientTimezone: string | null` in `TriageResult` (line 7), extracts it (line 194), and prompts the model with `"clientTimezone": "string", // ONLY extract if explicitly stated` (line 471).
   - However, in `apps/web/src/pages/api/cron/scrape.ts`, `triagedItems.push` (lines 3018–3043) spreads `...item` but fails to map `clientTimezone: triage.clientTimezone`. Similarly, `snapshotPublicationUpdate` (lines 513–531) omits `clientTimezone`.
   - Consequently, `docs/SYSTEM_SAVEPOINT.md:12573` and `docs/data-quality-snapshot-2026-06-13.md:20` confirm missing `client_timezone` at 100.0% in D1 `opportunities` rows.

3. **Current Shift Classification Behavior (`packages/scraper/shiftClassifier.ts:18-47`)**:
   - `SHIFT_MARKERS` in `shiftClassifier.ts` only matches `day_shift` against:
     `/\b(day[- ]?shift|australian (?:business )?hours|philippine (?:business )?hours)\b/i`.
   - It returns `phWorkingHours: null` unconditionally.
   - It fails to identify explicit Philippine daytime hour spans (e.g., `"8:00 AM - 5:00 PM Manila Time"`, `"8am - 5pm PHT"`), common Australian schedule abbreviations (e.g., `"AEST daytime"`, `"AU business hours"`), or structured APAC timezone codes (`AEST`, `AEDT`, `AWST`, `NZST`).
   - Conversely, in `shiftClassifier.test.ts:20`, `{ clientTimezone: "AEST", description: "Support our Sydney headquarters" }` correctly returns `unknown`, proving the existing safeguard against unevidenced geographic schedule fabrication.

4. **Ad-Hoc Featured Agency Heuristics (`apps/web/src/lib/public-board.ts:98-104`, `homepage-data.ts:86`)**:
   - `isFeaturedAgencyJob(job: PublicJob)` relies on:
     ```typescript
     const FEATURED_PLATFORMS = new Set([
       "20Four7VA", "Sourcefit", "Yokly", "VALUE Virtual Assistants", "Remote Craft", "MultiplyMii",
     ]);
     return sourceId.startsWith("breezy:") || sourceId.startsWith("workable:") || sourceId.startsWith("ashby:") || FEATURED_PLATFORMS.has(job.sourcePlatform);
     ```
   - This creates two flaws:
     - Non-agency Workable tenants (e.g. Pineapple Staffing) match `sourceId.startsWith("workable:")`.
     - Vetted Philippine employers ingested via non-ATS feeds (e.g. `hammerjack` static RSS on Teamtailor) are excluded because their platform is `"Teamtailor"` and `sourceId` is `"hammerjack"`.

5. **Operational Audit Baseline (`astra777.txt:45-50`, `176-185`, `docs/research/DAYSHIFT_PRIORITY_CAREERS_2026-10-13.md`)**:
   - `astra777.txt:45-50`: "Employer PH confidence, job validity, PH eligibility, and role relevance stay separate. Confidence is evidence that the employer hires Filipinos. It does not publish a closed, stale, duplicate, onsite, or country-locked opening. Direct job country and telecommuting beat the employer label. There is no global allowlist. Pineapple Staffing is the counterexample: three open US telecommuting roles from 2020–2022, public count 0, and that zero is correct."
   - `astra777.txt:176-185`: Confirms live search `q=day+shift` returned only 3 explicit titles on 2026-10-14. "Affordable Staff office-only remains a precision counterexample."
   - `docs/research/DAYSHIFT_PRIORITY_CAREERS_2026-10-13.md:19`: Affordable Staff FAQ explicitly mandates that employees work from its Bacolod office with no work-from-home model, demonstrating that employer `niche="australian-dayshift"` cannot override vacancy workplace restrictions (`isRemote`).

---

## 2. Logic Chain

1. **Premise 1 (From Observations 1 & 5)**:
   An employer's business model (e.g., Virtual Assistant staffing) is an organization-level characteristic. Individual job requisitions posted by that organization vary in location, employment arrangement, and active lifecycle. Therefore, treating an employer label as a blanket clearance mechanism for individual vacancies is mathematically and operationally invalid.

2. **Premise 2 (From Observations 1, 4 & 5)**:
   In the absence of a principled evidence hierarchy, the system oscillates between:
   - Fragile ad-hoc heuristics (`FEATURED_PLATFORMS` set, prefix checks on `breezy:`/`workable:`), which miss legitimate sources like Hammerjack while misattributing generic foreign ATS boards.
   - Or dangerous allowlists that would publish stale US roles (Pineapple Staffing) or non-remote office roles (Affordable Staff).

3. **Premise 3 (From Observation 3 & Timezone Arithmetic)**:
   Philippine Standard Time is fixed at UTC+8. Australian and APAC standard business hours (09:00–17:00 in AWST [UTC+8], AEST [UTC+10], AEDT [UTC+11], and NZST [UTC+12]) translate directly to Philippine daylight hours (05:00/07:00 to 14:00/17:00 PHT). However, an Australian client address alone does not prove working hours without schedule evidence. Therefore, dayshift classification requires a two-tiered evidence structure:
   - Tier 1: Explicit schedule phrasing or explicit PHT daytime hour spans.
   - Tier 2: Structured APAC timezone metadata (`clientTimezone`) without conflicting night-shift text.

4. **Premise 4 (From Observation 2)**:
   The omission of `clientTimezone` during D1 insert in `scrape.ts` directly starves downstream shift classification and public filtering of structured timezone evidence. Passing `clientTimezone: triage.clientTimezone ?? (item as any).clientTimezone ?? null` fixes this pipeline defect at zero performance cost.

5. **Deductive Conclusion**:
   By establishing a 5-level evidence model for Employer PH Confidence, strictly maintaining the 4-way separation matrix ($\text{Employer PH Confidence} \neq \text{Job Validity} \neq \text{PH Eligibility} \neq \text{Role Relevance}$), enhancing `classifyShift` with explicit PHT spans and structured APAC timezones, and enriching the in-memory public snapshot with shift categories, VA Freelance Hub can reliably surface verified dayshift and vetted employer opportunities without bypassing `geoGate`, `assessPostingFreshness`, or billing invariants.

---

## 3. Caveats

1. **Workable Widget Description Nullability**:
   As noted in `astra777.txt:182-184`, Workable widget API payloads often return `description: null` for list items, with full descriptions available only on detail pages. Consequently, Workable vacancies that mention dayshift only in their full description cannot be classified as dayshift at intake without additional subrequests. Only title-stated shifts or structured timezone hints are currently visible for those items during list scraping.
2. **Read-Only Scope**:
   In strict accordance with the explorer archetype and project instructions, no production files, database tables, or live routes were altered. All proposed schemas, algorithms, and integration patches are documented in `analysis.md` for implementer execution.
3. **Database Migration Dependency**:
   Adding the proposed `employer_evidence_ledger` table requires a D1 migration (e.g. `0056_*.sql`). However, the public snapshot and `classifyShift` enhancements can be implemented immediately in memory without waiting for a database migration.

---

## 4. Conclusion

1. **Formal Employer Evidence Model**:
   - Establish 5 evidence levels: Level 1 (PH Legal Entity / Registered Office), Level 2 (Explicit PH Mandate), Level 3 (Structured ATS PH Presets), Level 4 (Empirical Ingestion History $\ge 5$ verified jobs), Level 5 (Curated Directory Provenance).
   - Classify employers into `tier_a_verified`, `tier_b_established`, `tier_c_casual`, or `disqualified`.
   - Plug Tier A confidence into triage to resolve ambiguous `geoGate: unknown` cases, while strictly forbidding it from overriding `country_locked` or `onsite` verdicts.

2. **Dayshift & Working-Hour Classification**:
   - Refactor `classifyShift` in `packages/scraper/shiftClassifier.ts` to support explicit PHT spans (`PHT_DAYTIME_SPAN`) and structured APAC/AU/NZ timezones (`APAC_AU_NZ_TIMEZONES`), while retaining fail-closed behavior for ambiguous or negated text.
   - Fix the bug in `apps/web/src/pages/api/cron/scrape.ts` to preserve `clientTimezone` from triage into D1.

3. **Public Exposure & Discovery Scaling**:
   - Augment `PublicJob` with `shiftCategory: ShiftCategory` and `isDayshift: boolean` derived during snapshot generation.
   - Add schedule filtering (`?shift=day_shift`, `?shift=flexible`) to `/opportunities`.
   - Replace the ad-hoc `FEATURED_PLATFORMS` heuristic with evidence-backed employer trust tiers, properly recognizing vetted employers like Hammerjack, Hunt St, Coconut VA, CrewBloom, Pearl Talent, MultiplyMii, and 20Four7VA.

---

## 5. Verification Method

To independently verify these findings and validate future implementations:

1. **Shift Classifier Unit Verification**:
   Inspect and execute existing tests:
   ```bash
   bun test packages/scraper/shiftClassifier.test.ts
   bun test apps/web/tests/job-detail-shift.test.ts
   ```
   Add new test cases specified in `analysis.md` §7.1 and verify all pass with zero regressions.

2. **Company Identity Verification**:
   Execute the company identity test suite:
   ```bash
   bun test apps/web/tests/company-identity.test.ts
   ```
   Verify that exact recorded identities, whitespace/case normalization, and provider domain exclusion remain green.

3. **Adversarial Anti-Allowlist Proof**:
   Verify against known counterexample fixtures:
   - Pass Pineapple Staffing US openings to `geoGate` and `assessPostingFreshness`; assert `phEligibility === "ineligible"` and `freshness.state === "STALE"`.
   - Pass Affordable Staff office-only opening to `geoGate`; assert `phEligibility === "ineligible"` due to `hasExplicitNonRemoteLocationType`.
   - Pass Hammerjack remote vs hybrid openings to `geoGate`; assert remote passes and hybrid is rejected.

4. **Pipeline Data Flow Inspection**:
   Inspect lines 3018–3043 in `apps/web/src/pages/api/cron/scrape.ts` and verify whether `clientTimezone` is assigned to `triagedItems`.
