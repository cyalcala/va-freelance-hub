# Stratified Audit: Largest Unclear Loss Cohorts (Sourcefit & 20Four7VA)

**Date:** 2026-09-25  
**Auditor:** Engineering Maintainer (Antigravity / Codex)  
**Authority:** Master Operating Prompt §5 ("Recover supply without redefining quality") & §8 ("The largest demonstrated recoverable loss of qualified publications")  
**Evidence Source:** Production Cloudflare D1 (`DB`, remote, APAC/SIN), `docs/economics-snapshots/latest.json` (Run 36111278336), local codebase inspection.  
**Mode:** AUDIT + PLANNING (Non-destructive investigation).

---

## 1. Executive Summary

The latest production economics snapshot (`2026-09-25T08:08:32.705Z`, Run 36111278336) reported:
- **7-day strict qualified inflow:** 120 jobs (17.14/day proxy).
- **Largest unclear losses (7-day cohort):**
  1. `breezy:sourcefit`: **47 unclear** (out of 49 total new rows, only 1 eligible)
  2. `breezy:20four7va`: **37 unclear** (out of 43 total new rows, only 6 eligible)
  3. `we-work-remotely`: 6 unclear
  4. `breezy:yokly`: 5 unclear
  5. `real-work-from-anywhere`: 4 unclear

Together, Sourcefit and 20Four7VA account for **84 out of 101 (83.2%)** of all unclear listings in the 7-day inflow window. Across total active inventory, they account for **100 active unclear rows** (Sourcefit 49, 20Four7VA 51).

This stratified audit inspected 100% of these unclear rows using read-only D1 queries to determine:
1. Whether they represent genuine remote opportunities for Filipino freelancers or onsite/non-remote roles.
2. The exact mechanism and software flaw that classified them as `unclear` instead of `eligible_verified`, `eligible_likely`, or `ineligible`.
3. The exact recoverable qualified yield without diluting the strict remote standard.

---

## 2. Empirical Findings from Production D1

### A. Sourcefit (`breezy:sourcefit`) Cohort Analysis

Sourcefit is an outsourcing provider with physical facilities in Metro Manila (Eastwood, Bridgetowne) and Cebu (Cebu IT Park), but also offers work-from-home positions.

A bounded read-only inspection of all 55 active `breezy:sourcefit` rows with `ph_eligibility = 'unclear'` revealed:
- **22 listings explicitly state `Remote: no.` in the structured description snippet.**
  - Examples:
    - ID 6331: *"National Material Quantity Surveyor"*, `location_raw: "Bridgetowne Quezon City, PH"`, `description: "Location: Bridgetowne Quezon City, PH. Remote: no."`
    - ID 6332: *"National Material Quantity Surveyor - Cebu"*, `location_raw: "Cebu IT Park Cebu City, PH"`, `description: "Location: Cebu IT Park Cebu City, PH. Remote: no."`
    - ID 7214: *"Tier 1 Technical Support Specialist (APAC Seasonal) | Onsite"*, `location_raw: "Bridgetowne Quezon City, PH"`, `description: "Location: Bridgetowne Quezon City, PH. Remote: no."`
  - **Verdict:** These 22 jobs are **ONSITE BPO POSITIONS**. They are NOT remote freelance/VA opportunities. They violate Core Rule §1.2 ("The work is remote from the Philippines. A PH office location alone does not establish this"). They should have been classified as `ineligible` and deactivated, but were published with `location_type = 'remote'` and `ph_eligibility = 'unclear'`.
- **33 listings explicitly state `Remote: yes.` in the structured description snippet.**
  - Examples:
    - ID 7213: *"Systems Administrator"*, `location_raw: "Eastwood Quezon City, PH"`, `description: "... Remote: yes."`
    - ID 7212: *"Staff Accountant"*, `location_raw: "Eastwood Quezon City, PH"`, `description: "... Remote: yes."`
    - ID 7209: *"Senior Systems Engineer (L3 / Escalation Support)"*, `location_raw: "Philippines"`, `description: "... Remote: yes."`
  - **Verdict:** These 33 jobs are **GENUINE REMOTE JOBS** based in the Philippines. They are 100% compliant with the remote mandate and role taxonomy.

### B. 20Four7VA (`breezy:20four7va`) Cohort Analysis

20Four7VA is a virtual assistant staffing agency serving remote clients globally.

A bounded read-only inspection of all 52 active `breezy:20four7va` rows with `ph_eligibility = 'unclear'` revealed:
- **52 out of 52 listings (100.0%) explicitly state `Remote: yes.`**
- Locations:
  - 46 rows: `location_raw: "Worldwide"`
  - 3 rows: `location_raw: "Worldwide; Philippines; South Africa"` or `"Philippines"`
  - 1 row: `location_raw: "Worldwide; APAC"`
  - 2 rows: other worldwide permutations.
- Examples:
  - ID 6359: *"CPT-11420 Digital Marketing & Patient Engagement Virtual Assistant"*, `location_raw: "Worldwide"`, `description: "Location: Worldwide. Remote: yes."`
  - ID 6374: *"CPT-11390 Amazon Online Arbitrage Product Sourcing Specialist"*, `location_raw: "Worldwide"`, `description: "Location: Worldwide. Remote: yes."`
  - ID 6375: *"CPT-11425 Construction Operations & Client Support Virtual Assistant"*, `location_raw: "Worldwide; Philippines; South Africa"`, `description: "Location: Worldwide; Philippines; South Africa. Remote: yes."`
- **Verdict:** All 52 listings are **GENUINE REMOTE VIRTUAL ASSISTANT JOBS** accessible to Filipinos working from the Philippines. Zero listings are onsite.

---

## 3. Root Cause Analysis

Three distinct software flaws in the ingestion and triage pipeline caused this breakdown:

### Flaw 1: `fetchBreezy` in `packages/scraper/ats.ts` ignores `is_remote: false`

In `packages/scraper/ats.ts`:
- Breezy's JSON feed provides `job.locations[].is_remote` (boolean).
- The helper `breezyLocationSummary(job)` correctly reads this boolean and formats `Remote: yes.` or `Remote: no.` into the description.
- However, `fetchBreezy` (lines 267-274):
  1. Hardcodes `locationType: "remote"` for all listings regardless of `is_remote`.
  2. Does not append `(onsite)` to `locationRaw` when `is_remote` is `false`.
- Contrast this with `fetchAshby` and `fetchWorkable` in the same file:
  ```typescript
  // Ashby:
  locationType: (job?.isRemote === false ? "onsite" : "remote"),
  locationRaw: [normalizeText(job?.location), job?.isRemote === false ? "(onsite)" : ""].filter(Boolean).join(" "),

  // Workable:
  locationType: (job.telecommuting === false ? "onsite" : "remote"),
  locationRaw: job.telecommuting === false ? `${locationRaw} (onsite)`.trim() : locationRaw,
  ```
Because `fetchBreezy` lacked this check, onsite positions entered the pipeline labeled as `remote` with no onsite marker in `locationRaw`.

### Flaw 2: `geoGate.ts` Step 1 matches PH positive before Step 5 Onsite check

In `packages/scraper/geoGate.ts`:
- Step 1 (lines 244-253) checks `PH_POSITIVE_REGEX` in `locationRaw` and `titleAndDesc`.
- Because Quezon City, Cebu, and Philippines match `PH_POSITIVE_REGEX`, Step 1 immediately returns `verdict("ph_only", "eligible_verified", ...)`.
- Step 5 (line 294) checks `ONSITE_TITLE_REGEX` (`\b(on[- ]?site|in[- ]office|hybrid)\b`), but is located *after* Step 1.
- Consequently, any job with a Philippine location or title mention (even one explicitly titled *"Tier 1 Technical Support Specialist | Onsite"*) was granted a `ph_only` gate verdict before the onsite detector could ever evaluate it.

### Flaw 3: `buildPendingTriageItem` and `recoverGateEligiblePending` in `scrape.ts` drop gate eligibility

In `apps/web/src/pages/api/cron/scrape.ts`:
- When a high-volume feed like Breezy is scraped, `aiBudget.exhausted()` triggers after the first few items due to the free-tier subrequest limit.
- Remaining items are deferred to `pendingItems` via `buildPendingTriageItem` (line 309).
- `buildPendingTriageItem` hardcodes `phEligibility: "unclear"`, completely discarding the verdict `gate.phEligibility` that `geoGate` had already assigned (`eligible_verified` or `eligible_likely`).
- Later in the tick, `recoverGateEligiblePending` un-hides items whose `geoScope` is in `GATE_ELIGIBLE_GEO_SCOPES` (`ph_only`, `worldwide`, `apac_incl_ph`) by setting `isActive: true` and `inactiveReason: null`.
- However, `recoverGateEligiblePending` does NOT update `phEligibility`: it leaves `phEligibility = 'unclear'`.
- The code comment at line 561 claimed: *"lets the unclear sweep AI-re-vet/enrich them later — phEligibility stays 'unclear'"*.
- But the unclear sweep is capped at `DAILY_SWEEP_CAP = 15` per day, uses flaky free-tier Workers AI neurons that frequently fail or hit quotas, and processes only 0-2 jobs per day.
- As a result, ~90+ fully gate-eligible remote jobs were stranded permanently in `ph_eligibility = 'unclear'`.

---

## 4. Consequences on Public Surface and Metrics

Because these listings remained `ph_eligibility = 'unclear'`:
1. **Excluded from Detail Pages:** Line 36 of `apps/web/src/pages/jobs/[id].astro` requires:
   ```typescript
   inArray(opportunities.phEligibility, ['eligible_verified', 'eligible_likely'])
   ```
   Users clicking on these jobs receive a 404 Not Eligible error.
2. **Excluded from Sitemap:** `sitemap.xml.ts` line 33 filters on the same verified/likely predicate.
3. **Excluded from Source Economics Supply KPI:** `scripts/diagnostics/source-economics.ts` measures:
   ```sql
   WHERE is_active = 1 AND ph_eligibility IN ('eligible_verified', 'eligible_likely')
   ```
   All 84 new 7-day items were counted as "loss to unclear" rather than qualified fresh flow.
4. **Onsite Pollution Risk:** The 22 onsite Sourcefit jobs were published as active listings on the index, violating the remote mandate.

---

## 5. Recoverable Yield & Recommended Action Plan

### Measured Quantities:
- **Total active unclear reviewed:** 107 rows (55 Sourcefit, 52 20Four7VA).
- **Onsite (unrecoverable / must be deactivated):** 22 rows (all Sourcefit).
- **Genuine Remote (recoverable / verified PH-accessible):**
  - Sourcefit: 33 rows (`ph_only`, remote from Philippines)
  - 20Four7VA: 52 rows (`worldwide` / `apac_incl_ph`, remote VA)
  - **Total recoverable qualified supply:** **85 jobs** (approx. 70-80 of which fall within the active 7-day/30-day windows).

### Required Changes:

1. **Scraper Ingestion (`packages/scraper/ats.ts`):**
   - In `fetchBreezy`, inspect `locations[].is_remote`.
   - If `remoteSignals.length > 0 && !remoteSignals.some(Boolean)`, set `locationType: "onsite"` and append `(onsite)` to `locationRaw`.

2. **Deterministic Geo-Gate (`packages/scraper/geoGate.ts`):**
   - Check `ONSITE_TITLE_REGEX` before or during positive PH matching. Any listing with `(onsite)` in `locationRaw` or `on-site`/`hybrid` in `title` must return `country_locked` / `ineligible`, even if located in the Philippines.

3. **Fallback Recovery (`apps/web/src/pages/api/cron/scrape.ts`):**
   - In `recoverGateEligiblePending`, restore `phEligibility` to its gate-approved tier:
     - `ph_only` -> `eligible_verified`
     - `worldwide` / `apac_incl_ph` -> `eligible_likely`
   - In `buildPendingTriageItem`, preserve `gate.phEligibility` instead of overwriting with `"unclear"`.

4. **Data Cleanup Migration:**
   - Deactivate the 22 onsite Sourcefit rows: set `is_active = 0`, `inactive_reason = 'policy-rejected'`, `ph_eligibility = 'ineligible'`, `location_type = 'onsite'`.
   - Upgrade the verified remote Sourcefit (33) and 20Four7VA (52) rows from `unclear` to `eligible_verified` / `eligible_likely`.

This single coherent unit rectifies the largest demonstrated loss in the repository, eliminates 22 onsite leakage violations, and recovers 85 verified remote jobs for Filipino freelancers.
