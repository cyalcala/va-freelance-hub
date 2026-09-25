# Planning Decision: Constitutional Active Source Leak Repair & Title Geo-Gate Precision (2026-09-25)

## Context & Problem
Following the constitutional promotion of mature shadow sources (`greenhouse:ghost`, `greenhouse:nearform`, `breezy:time-etc`) to canary in remote production D1, immediate verification of live ingestion ticks revealed two critical structural leaks:

1. **Constitutional Active Leak from Non-Promoted Sources (223 jobs)**:
   - Historical opportunities from July/August belonging to sources currently in `candidate` or `shadow` states in `source_registry` (`ashby:supabase`: 51, `greenhouse:remotecom`: 40, `greenhouse:gitlab`: 33, `greenhouse:grafanalabs`: 29, `ashby:ashby`: 28, `ashby:camunda`: 19, `ashby:amplify`: 14, `ashby:tremendous`: 9) were still marked `is_active = 1`.
   - Under ADR-007, sources in `candidate` and `shadow` modes are strictly non-publishing.

2. **Canary Title-Level Geo-Gate Escape (Nearform 9 country-locked jobs)**:
   - `greenhouse:nearform` feed contains positions with titles like `"Senior DevOps Engineer (Perm, UK, Remote)"`, `"Technical Director (Perm, Canada, Remote)"`, `"Technical Director (Perm, USA, Remote)"`, and `"Technical Director (Perm, Ireland, Remote)"`.
   - In `geoGate.ts`, `TITLE_COUNTRY_LOCK_REGEX` only anchored country prefixes at the immediate boundary of brackets/hyphens, failing to parse country tokens preceded by employment terms (e.g. `(Perm, UK, ...)` or `(Contract, Brazil, ...)`).
   - In `scrape.ts`, `reactivateFeedConfirmedJobs` did not check `phEligibility IN ('eligible_verified', 'eligible_likely')`, reactivating stale feed matches even when eligibility was unclear or country-locked.

3. **Philippine Provincial Locations Unmatched (Yokly 5 jobs)**:
   - Genuine remote Philippine VA jobs from Yokly with locations like `"bohol, PH"`, `"Luzon, PH"`, `"leyte, PH"`, `"batangas, PH"`, and `"general santos, PH"` were left as `unclear` because `PH_POSITIVE_REGEX` lacked those provincial tokens and did not match country code suffix `,\s*PH$`.

## Decision & Actions (Jev 1.13 Calibrated)
Jev 1.13 evaluated options and selected `Variant_A` (confidence 1.0, probability 1.0) for comprehensive remediation:

1. **`packages/scraper/geoGate.ts`**:
   - Added `PH_LOCATION_RAW_REGEX` (`(?:,\s*|\/\s*|^)\s*ph\s*$`) and expanded `PH_POSITIVE_REGEX` to cover major Philippine provinces (`bohol`, `luzon`, `visayas`, `mindanao`, `leyte`, `batangas`, etc.).
   - Added parenthetical / bracket content inspection to detect country locks, US states, and excluded regions within multipart expressions (e.g. `(Perm, UK, Remote)`).
   - Added pipe and dash segment parsing (`| United States | Remote`, `| CA | Remote`) with `AMBIGUOUS_STATE_WORDS` exclusion to preserve Virtual Assistant acronyms (`VA`, `PA`).
   - Added comprehensive tests in `packages/scraper/geoGate.test.ts` (48 tests passing).

2. **`apps/web/src/pages/api/cron/scrape.ts`**:
   - Enforced `inArray(opportunities.phEligibility, ["eligible_verified", "eligible_likely"])` in `recoverableWhere` in `reactivateFeedConfirmedJobs`.
   - Verified via `apps/web/tests/reactivate-feed.test.ts`.

3. **`packages/db/migrations/0047_deactivate_shadow_candidate_jobs_and_unclear_titles.sql`**:
   - Step 1: Deactivates active opportunities from non-active / non-canary sources (`candidate`, `shadow`, `quarantined`).
   - Step 2: Deactivates Nearform country-locked positions and marks them `ineligible` / `country_locked`.
   - Step 3: Upgrades genuine Yokly Philippine provincial positions to `eligible_verified` / `ph_only`.
   - Step 4: Deactivates any remaining active opportunities with `ph_eligibility = 'unclear'`.
   - Verified via `packages/db/migration-0047.test.ts`.
