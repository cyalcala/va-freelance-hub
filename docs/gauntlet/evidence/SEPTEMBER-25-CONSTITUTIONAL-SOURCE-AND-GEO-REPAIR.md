# Operational Evidence: Constitutional Source Leak Repair and Title Geo-Gate Precision

## Date
2026-09-25

## Summary
Audit of live D1 production following commit `d1eebc5` (canary promotion) revealed:
1. 223 active opportunities belonging to candidate/shadow sources (`ashby:*`, `greenhouse:gitlab/remotecom/grafanalabs`) remaining from legacy summer scraping.
2. 9 Nearform canary jobs reactivated with explicit country locks in titles (e.g., `(Perm, UK, Remote)`).
3. 5 Yokly Philippine provincial positions marked `unclear` due to missing provincial keywords in `PH_POSITIVE_REGEX`.
4. Feed reactivation in `scrape.ts` lacking `phEligibility` gating.

## Changes Implemented
1. `packages/scraper/geoGate.ts`:
   - Enhanced `PH_POSITIVE_REGEX` and `PH_LOCATION_RAW_REGEX` to match Philippine provinces and trailing `, PH`.
   - Enhanced Step 5 with parenthetical/bracket inspection and pipe/dash segment inspection.
   - Guarded against false positives on technical titles and VA acronyms.
2. `apps/web/src/pages/api/cron/scrape.ts`:
   - Gated `reactivateFeedConfirmedJobs` with `inArray(opportunities.phEligibility, ["eligible_verified", "eligible_likely"])`.
3. `packages/db/migrations/0047_deactivate_shadow_candidate_jobs_and_unclear_titles.sql`:
   - Deactivates candidate/shadow source active jobs.
   - Deactivates country-locked Nearform titles.
   - Upgrades confirmed Philippine Yokly positions.
   - Deactivates any remaining unclear active rows.

## Verification
- Unit test suite: 1,429 tests passing across 140 files (`bun run test`).
- Typecheck: 0 errors (`bun run typecheck`).
- Production build: Succeeded in 20.35s (`bun run build`).
- Freshness Cron Worker: Typecheck and deploy dry-run succeeded.
