# Implementation Status

## Start Here

When starting a new chat or work session, read these in order:

1. `AGENTS.md`
2. `docs/MASTER_EXECUTION_PLAN.md`
3. `docs/IMPLEMENTATION_STATUS.md`
4. `docs/AI_RECOVERY_TRAIL.md`
5. `docs/SYSTEM_SAVEPOINT.md`
6. `docs/gemini-masterplan-handoff-2026-06-13.md`
7. `docs/goldilocks-source-expansion-handoff-2026-06-12.md`
8. `docs/major-audit-2026-06-11.md`
9. `docs/major-audit-2026-06-10.md`
10. `docs/major-audit-2026-06-06.md`

### Current Focus

Post-audit health repairs complete. The system is healthy after the 2026-06-11
major audit fixed Hunter D1 insert batching, reduced category page payloads, and
removed tracked local Wrangler state. The 2026-06-12 follow-up also restored
local direct D1 audit capability and upgraded active Wrangler tooling for the
current Cloudflare Pages config. The latest ATS follow-up pauses unreviewed or
noisy ATS platforms by default, requires token-specific review for Breezy, and
refreshed the source-health rollup.

The latest user-requested stop-point is
`docs/gemini-masterplan-handoff-2026-06-13.md`. It records the verified
post-Gemini/post-Codex-QA baseline at `e719a2c`, confirms CI now runs unit
tests, and gives Gemini an ordered masterplan for source-health history, Breezy
review, data-quality refresh, query/index audit, bounded source expansion, and
portfolio polish.

The previous source-specific stop-point is
`docs/remote-ok-json-source-handoff-2026-06-13.md`. It records the accepted
Remote OK JSON ingestion slice, direct-link compliance posture, physical-role
quality filter, cleanup migration, workflow evidence, and production D1
snapshot.

## Overall Completion

Current accepted completion: 100% of Lens 2.

## Phase Status (Lens 2)

| Phase | Weight | Current accepted % | Status | Next acceptance evidence |
| --- | ---: | ---: | --- | --- |
| L1 Category Alignment & AI Triage | 35% | 35% | Accepted | Complete |
| L2 Staggered Workable Polling | 35% | 35% | Accepted | Complete |
| L3 CI/CD Auto-Deployments | 30% | 30% | Accepted | Complete |

## Latest Accepted Checkpoint

### Post-Handoff F-26 - Comprehensive Audit Part 3: Perf/Frontend/Workflows/Data/Quality

- Date: 2026-07-11
- Status: implemented, 91/91 tests, build passed; report extended in `docs/comprehensive-audit-report-2026-07.md`. The final 5 dimensions were audited by direct static analysis + live EXPLAIN plans (agent fleet was capacity-blocked).
- Confirmed + fixed:
  - C-1 (MEDIUM): `schema.ts` did not declare `active_effective_posted_idx` (migration 0018), so a future `drizzle-kit generate` could emit a migration dropping it and regress the board-sort perf fix. Declared it as an expression index in schema.ts (build-verified).
  - C-2 (LOW): Hunter + Verifier failed only on `HTTP_CODE -ge 400`, letting a curl connection failure (`000` on a total outage) pass as an all-zero warning. Both now fail on any non-2xx.
- Verified-CLEAN (suspected, disproved): no user-facing query can surface the new inactive `triage-rejected` rows (all filter is_active=1); category pages are index-served (live EXPLAIN shows active_effective_posted_idx, no temp B-tree); pagination clamps 0/negative/NaN to page 1; all insert paths write ISO scrapedAt (no datetime('now') drift).
- Advisory (not changed): Workers AI model list duplicated across triage.ts + 2 workflow bash helpers.
- With this, all 8 audit dimensions have been swept (Part 1: ingestion; Part 2: concurrency + security; Part 3: the remaining five).

### Post-Handoff F-25 - Comprehensive Audit Part 2: Concurrency & Security

- Date: 2026-07-10
- Status: implemented, 91/91 tests, build gate pending push; report extended in `docs/comprehensive-audit-report-2026-07.md`
- CRITICAL (B-0): 63 tracked apps/web-nextjs-backup/.wrangler build artifacts hardcoded live LEGACY secrets (Turso rw JWT, Trigger.dev key, ISR_SECRET). Untracked in commit `f85eed9`. OWNER MUST ROTATE the three secrets at their providers — values persist in git history until a consented history purge. Legacy stack (not the D1 production path), which bounds the exposure.
- HIGH fixes: verify-links stale-archive chunked under the D1 100-param limit (B-1, would wedge the whole verifier); /api/ingest hardened from `...item` mass-assignment to an explicit server-owned allow-list with sanitizeApplyUrl + server-computed hashes + enum validation (B-2); ci-guardrail given a concurrency group to stop out-of-order deploys (B-3).
- MEDIUM fixes: ingest-digest insert chunked (B-4); deploy-migrations concurrency group (B-5); Hunter-rollup + Medic pushes given bounded rebase-retry (B-6); Sentinel branch push made re-entrant via --force-with-lease (B-7); /api/click DB write rate-limited after redirect-target validation (B-8).
- LOW fixes: atomic SQL increment for failedVerificationCount; shared constant-time `src/lib/auth.ts` applied to prune + verify-links (which also gained rate limiting) (B-9).
- Deferred (documented, latent): Workable rotation liveness (fix before re-enabling Workable); cadence-guard TOCTOU atomic claim; isAuthorized adoption in scrape/ingest/ingest-digest; 5 queued dimension sweeps.
- Verification: `bun test` 91/91; all 5 edited workflow YAMLs parse; build gate + CI on push.

### Post-Handoff F-24 - Comprehensive Audit Part 1: Pipeline Correctness Fixes

- Date: 2026-07-08
- Status: implemented, 91/91 tests, build passed; production index applied via deploy-migrations pipeline on push
- Report: `docs/comprehensive-audit-report-2026-07.md`
- Confirmed findings fixed (each verified against code before action):
  - Triage fail-open during AI outages -> fail-closed with `triageAiUnavailable` counter + Hunter warning (A-1).
  - Unvalidated LLM applicationUrl overriding verified URLs -> shared `sanitizeApplyUrl()` with sanitized precedence (A-2).
  - Hostile numeric HTML entity zeroing a whole feed per run -> shared guarded `text.ts` decode + per-item try/catch (A-3).
  - Rejected items re-triaged forever / head-of-line starvation -> persisted as inactive `triage-rejected` rows joining dedup (A-4).
  - Production-confirmed temp-B-tree board sort -> expression index migration `0018_effective_posted_idx.sql` (A-5, plan verified locally).
  - "[object Object]" category tags, leaky funnel accounting, silently-unmatched auto-pause entries -> fixed with counters + annotations (A-6..A-8).
  - content_hash: four private copies + false sha256 schema comment -> single shared `contentHash.ts`, honest docs; harvest.ts confirmed dead (A-9).
- Cross-dimension manual checks: zero HTML-injection sinks (grep), applicationUrl unrendered, chef.ts live / harvest.ts dead, 1 duplicate company group in production.
- Verification: `bun test` 91/91 (12 new); local D1 plan uses `active_effective_posted_idx` with no temp B-tree; YAMLs parse.

### Post-Handoff F-23 - Tier-3 Autonomous Auto-Pause (Sentinel)

- Date: 2026-07-08
- Status: implemented and pushed; autonomy activates when the user adds the `SENTINEL_BOT_PAT` secret (setup steps in `docs/maintenance-bot-2026-07-04.md`); until then Sentinel falls back to recommendation issues
- Scope:
  - New `packages/scraper/paused-sources.json` — machine-managed pause list the bot only ever appends to; config-over-code per AGENTS.md engineering preferences.
  - New `packages/scraper/pause.ts` — defensive validation (malformed entries dropped, never thrown) + pure `applyAutoPauses` overlay; 9 unit tests in `pause.test.ts`.
  - `sources.ts` overlays auto-pauses so paused feeds flow through existing skip reporting unchanged; `atsPlatformPolicy()` in scrape.ts checks `isAutoPaused()` for ATS tokens.
  - Sentinel workflow upgraded to three modes: infrastructure guard (>3 sources flapping = outage signature -> one alert issue, zero pauses), autonomous PR mode (date-keyed branch, jq append, in-runner `bun test` + `bun run build` guardrail parity before merge, PR with evidence + AI diagnosis, squash-merge via PAT -> CI deploys the pause), and the prior recommendation-issue fallback when no PAT.
  - Un-pause, source enabling, and code edits remain human-gated permanently.
- Verification:
  - `bun test` 79/79 (9 new pause tests).
  - `bun run --cwd apps/web build` passed with the JSON import bundled.
  - Workflow YAML parses; CI guardrail green on push.

### Post-Handoff F-22 - Tier-2 AI Diagnosis On Bot Issues

- Date: 2026-07-04
- Status: implemented and pushed; exercises on the next real degradation event
- Design doc: `docs/maintenance-bot-2026-07-04.md` (Tier 2 section)
- Scope:
  - Hunter `alerts` job now appends a Workers AI root-cause diagnosis as a comment on each daily degradation issue.
  - Sentinel pulse now appends a per-source transient-vs-persistent assessment to each pause-recommendation issue.
  - Safety design: AI output is advisory comment text only (never executed, never written to code, never fed back into automation), evidence is framed as untrusted data in the system prompt, AI steps degrade gracefully if Workers AI is unavailable, and no new credentials were added (reuses the `ai`-scoped `CLOUDFLARE_API_TOKEN` and built-in `GITHUB_TOKEN`).
  - Models: the production-proven `@cf/meta/llama-3.1-8b-instruct` chain already used by triage, within the Workers AI free allocation.
- Verification:
  - All workflow YAMLs parse (local PyYAML check).
  - CI guardrail green on the push.
  - Live exercise occurs on the next degradation event; the deterministic Tier-1 issue is unaffected if the AI call fails.

### Post-Handoff F-21 - Tier-1 Maintenance Bot (Free 24/7 Detection)

- Date: 2026-07-04
- Status: implemented and pushed; first live runs occur on their schedules (alerts: next Hunter tick; Sentinel: daily 01:30 UTC; Medic: Sunday 02:00 UTC)
- Design doc: `docs/maintenance-bot-2026-07-04.md`
- Scope:
  - Added an `alerts` job to `gha-hunter-pulse.yml`: parses `harvest.log` after every Hunter run and files a deduped, labeled GitHub issue (max one per UTC day) when any internal degradation signal is present (failed sources, fetch-event log failures, triage failures, insert failures, cadence-guard unavailability).
  - Added `gha-sentinel-pulse.yml` (daily): window-function query over `source_fetch_events` detects sources whose last 4 non-skipped attempts all failed and files a per-source pause-recommendation issue with evidence and exact file pointers. The bot never edits code — pausing remains a human/agent decision per AGENTS.md compliance rules.
  - Added `gha-medic-pulse.yml` (weekly): automates the major-audit data-quality snapshot (staleness, backlogs, duplicates, missing fields, 7-day per-source reliability) into `docs/health-digest-latest.md` via the same guarded bot-commit pattern as the daily rollup.
  - Cost posture: $0 — public-repo Actions minutes, read-only D1 within free tier, built-in GITHUB_TOKEN, no new secrets or services.
- Verification:
  - All five workflow YAMLs parse (local PyYAML check).
  - Sentinel SQL validated against production D1 (window functions OK; 0 flapping sources today).
  - Medic reliability SQL validated against production D1: 34 sources in the last 7 days, including gold777 ATS additions (greenhouse:gitlab 143 items, greenhouse:ghost 4, breezy:time-etc 1) — end-to-end proof of the F-20 fetch-event fix.

### Post-Handoff F-20 - Major Audit: Silent-Error Elimination & Durability Hardening

- Date: 2026-07-04
- Status: implemented, deployed (`9762994`, CI run `28701640187`), and S-1 accepted live in production — Hunter run `28702090635` recorded 35 real fetch events, taking `source_fetch_events` from its single stuck test row to 36 rows. Prune (midnight UTC) and verifier (12h) acceptance criteria remain listed in the audit doc for their next scheduled runs.
- Audit report: `docs/major-audit-2026-07-04.md`
- Silent errors found and fixed:
  - S-1 (critical): `source_fetch_events` history was never recorded in production — the batch insert exceeded D1's 100-bound-parameter limit on every run since 2026-06-13 and the failure only reached `console.warn`. Proof: the table's only row was a 2026-06-15 local test insertion. Fixed by chunked inserts via new `packages/scraper/batch.ts` (`chunkArray`, `maxRowsPerD1Batch`), surfaced as `fetchEventLog` in the scrape response, annotated by the Hunter workflow.
  - S-2 (critical): the daily prune endpoint hard-DELETEd rows — cross-company `description_hash` collisions could delete legitimate jobs, archived history was purged, and deleted-but-still-listed URLs re-inserted as "new" (churn). Rewritten to soft-archive active rows only, scoped to `(description_hash, company)`, keeping the oldest row; response reports `mode: "soft-archive"`, `deleted: 0`; the prune workflow warns if the mode ever regresses.
  - S-3 (high): jobs dropped by triage exceptions were invisible; the scrape response now reports `triageFailures` and Hunter annotates it.
  - S-4 (medium): the never-verified backlog (456 rows) could not drain at 50 links/run twice daily; the limit is now 120, the response reports `neverVerifiedRemaining`, and the verifier summary warns above 300.
  - S-5/S-6 (low): cadence-guard state availability is now reported (`cadenceGuards`) and annotated instead of silently degrading.
- Durability rules adopted (recorded in the audit doc): no silent catches in write paths; all D1 batch inserts go through `maxRowsPerD1Batch`; no destructive SQL in cron paths; workflows assert on response fields, not just HTTP 200; backlog metrics are reported in run summaries.
- Verification:
  - `bun test` passed (70/70; 9 new tests in `packages/scraper/batch.test.ts`).
  - `bun run --cwd apps/web build` passed.
  - `git diff --check` passed.
  - Production acceptance checklist (post-deploy) is in `docs/major-audit-2026-07-04.md`: fetch events must accumulate, prune must report soft-archive with no row-count decrease, verifier backlog must shrink.

### Post-Handoff F-19 - Gold777 Directory Import & Verified ATS Expansion

- Date: 2026-07-04
- Status: completed cross-referenced directory import and confirmed-only ATS token verification
- Scope:
  - Cross-referenced `gold777.xlsx` (79 rows) against the production `va_directory` table (265 rows); found 44 exact/normalized duplicates and 3 near-duplicates already present under slightly different names (Pepper Virtual Assistant, Belay, GetMagic).
  - Imported 32 genuinely new companies into `va_directory` via `apps/web/gold777_imports.sql`, bringing the total from 265 to 297.
  - Classified each new entry's `niche` (`job-boards`, `bpo`, `tech`, `ecommerce`, `global-va`) following existing directory precedent, researching real websites via WebSearch for lesser-known regional platforms (VA Workers PH, Kerja-Remote, HireBasis, Prosple, GigaBPO, Remote Philippines, Amentum).
  - Probed public Greenhouse/Lever/Workable/Breezy Job Board APIs for every remote-first tech company candidate rather than guessing tokens; confirmed 4 live endpoints (`greenhouse:gitlab` 143 jobs, `greenhouse:ghost` 4 jobs, `greenhouse:remotecom` 287 jobs, `breezy:time-etc`) and left all unconfirmed guesses (Zapier, Buffer, Doist, Automattic, ClickUp, Wise, Canva, Shopify, Help Scout, Wishup, Atlassian) as directory-only entries with no ATS wiring.
  - Completed in-progress, previously uncommitted work already present in `packages/scraper/ats.ts` and `apps/web/src/pages/api/cron/scrape.ts` (referencing "Gold777 review 2026-07-03") by adding matching `va_directory` rows with `ats_platform`/`ats_token` for the 4 confirmed companies.
  - Documented full method, dedupe logic, and ATS probe evidence in `docs/gold777-directory-import-2026-07-04.md`.
- Verification:
  - Dry-run applied cleanly against local D1 (`wrangler d1 execute remoteph-jobs-db --local`), 32/32 statements succeeded.
  - Production import applied via `wrangler d1 execute remoteph-jobs-db --remote`; `SELECT COUNT(*) FROM va_directory` confirmed 265 -> 297.
  - Spot-checked all 32 new rows' `niche`/`ats_platform`/`ats_token` values against the intended import.
  - `bun test` passed (61/61 tests).
  - `bun run --cwd apps/web build` passed.
  - No new credentials were introduced; used the existing `gh` CLI GitHub login and the existing local Wrangler/Cloudflare OAuth login already configured on this machine.

### Post-Handoff F-18 - Dayshift Directory Imports & ATS Expansion

- Date: 2026-06-15
- Status: completed dayshift directory updates, new inserts, and mapped ATS expansion opportunities
- Scope:
  - Imported and updated 8 Australian Dayshift companies in `va_directory` (Cloudstaff, Flat Planet, Virtual Staff 365, RocketAMS, Vault Outsourcing, OneWorld Business Solutions, Stantaro, and Hunt St), bringing total dayshift count from 16 to 24.
  - Configured Workable ATS tokens (`rocketams`, `virtualstaff365`, `hunt-st`) and Lever ATS token (`vaultoutsourcing`) in the database entries.
  - Documented expansion opportunities: (1) token-specific Workable slow rotation allowances to circumvent global 429 locks for RocketAMS, Virtual Staff 365, and Hunt St, and (2) enabling Lever platform scraper specifically for the new Vault Outsourcing token under Goldilocks guidelines.
- Verification:
  - Remote D1 database verification complete. Count of `niche = 'australian-dayshift'` is 24.
  - ATS platform/token mappings for the inserted companies verified.

### Post-Handoff F-17 - Major Debugging and Audit

- Date: 2026-06-15
- Status: completed major debugging, sort order fix, limit and cadence tuning, and work777.xlsx directory imports
- Scope:
  - Fixed the "silent freshness bug" where new jobs were hidden by sorting by `posted_at DESC`. SQLite sorted NULLs first, and past posting dates made same-day scrapes look stale. Changed sort order to `desc(sql`coalesce(${opportunities.postedAt}, ${opportunities.scrapedAt})`)` in [index.astro](file:///c:/Users/admin/Desktop/va-freelance-hub/apps/web/src/pages/index.astro), [opportunities.astro](file:///c:/Users/admin/Desktop/va-freelance-hub/apps/web/src/pages/opportunities.astro), and [\[category\].astro](file:///c:/Users/admin/Desktop/va-freelance-hub/apps/web/src/pages/categories/%5Bcategory%5D.astro).
  - Reduced Remote OK min fetch interval from 120 minutes to 60 minutes in [sources.ts](file:///c:/Users/admin/Desktop/va-freelance-hub/packages/scraper/sources.ts) to capture same-day jobs faster.
  - Increased scraper default processing limit from 25 to 50 jobs per run in [scrape.ts](file:///c:/Users/admin/Desktop/va-freelance-hub/apps/web/src/pages/api/cron/scrape.ts) to process backlogs faster.
  - Audited and verified `source_fetch_events` Drizzle schema, TypeScript types, and database schema using local test insertions.
  - Cross-referenced `work777.xlsx` against the existing directory and successfully imported 22 new companies into the production `va_directory` table, bringing the total from 238 to 260.
  - Updated existing `Support Shepherd` directory entry website from `somewhere.com` to `https://supportshepherd.com`.
- Verification:
  - `bun run build` passed.
  - Remote D1 import of 22 new companies verified by `SELECT count(*) FROM va_directory;` returning `260`.
  - `Support Shepherd` website update verified by querying `va_directory`.
  - Local test script for Drizzle insertion succeeded.

### Post-Handoff F-16 - Non-English and Local European Pre-Filter

- Date: 2026-06-13
- Status: accepted after adding regex pre-filters for non-English languages and localized student/apprentice schemes, and adding unit tests
- Scope:
  - Addressed the issue where German job listings (like "Werkstudent (m/w/d) SAP-Consulting im Kundenservice") were incorrectly ingested.
  - Implemented `LOCAL_OR_NON_ENGLISH_REGEX` pre-filter matching localized gender classifications (e.g., m/w/d, w/m/d) and local university/national programs (e.g., German Werkstudent, French Alternance/Apprentissage).
  - Updated LLM triage prompt to explicitly instruct the AI model to mark non-English listings and regional student/apprentice programs as ineligible.
  - Added comprehensive unit tests in `packages/scraper/triage.test.ts`.
  - Manually deactivated/archived the active German job listing (ID 2281) in the remote D1 database to immediately remove it from the website.
- Verification:
  - `bun test` passed (61/61 tests);
  - `bun run --cwd apps/web build` passed;
  - Verified remote D1 database opportunity ID 2281 is successfully set to `is_active = 0`.

### Post-Handoff F-15 - Bounded Source Expansion

- Date: 2026-06-13
- Status: accepted after evaluating, compliance-auditing, and local probing of the new Jobicy Customer Support APAC RSS feed
- Scope:
  - Added `jobicy-supporting-apac` source feed targeting the `supporting` (customer support) category for the `apac` region.
  - Implemented Goldilocks compliance limits (`maxItems: 40`, `minFetchIntervalMinutes: 60`) in `packages/scraper/sources.ts`.
  - Audited robots.txt and `<legalNotice>` feed parameters to ensure compliance.
  - Probed feed locally and verified successful retrieval of 26 relevant jobs (e.g. Technical Customer Support Specialist, Customer Care Specialist).
  - Documented findings in `docs/source-expansion-2026-06-13.md`.
- Verification:
  - `bun test` passed (54/54 tests);
  - `bun run --cwd apps/web build` passed;
  - Local script successfully executed feed parsing.

### Post-Handoff F-14 - Query and Indexing Audit

- Date: 2026-06-13
- Status: accepted after running query plans, adding database migration, and verifying index utilization
- Scope:
  - Audited hot queries on homepage, opportunities filters, and directory pages.
  - Added `company_name_idx` on `va_directory(company_name)` to eliminate a `SCAN va_directory` + `USE TEMP B-TREE FOR ORDER BY` sorting overhead on the directory page.
  - Verified that query plan for `va_directory` now successfully uses the index: `SCAN va_directory USING INDEX company_name_idx`.
  - Documented findings and plans in `docs/query-indexing-audit-2026-06-13.md`.
- Verification:
  - `bun test` passed (54/54 tests);
  - `bun run --cwd apps/web build` passed;
  - Local and remote D1 migrations applied cleanly;
  - Query plan verified using `EXPLAIN QUERY PLAN`.

### Post-Handoff F-13 - Data Quality and Stale Policy Refresh

- Date: 2026-06-13
- Status: accepted after running SQL audit queries, deactivating stale rows from paused sources, deduplicating description hashes, and documentation updates
- Scope:
  - Ran a fresh read-only D1 snapshot of active opportunities, duplicate url/content/description hashes, and missing fields.
  - Found that the `other` category has been significantly reduced to 14.48% (down from 77.3% on June 9), showing excellent triage improvement.
  - Deactivated 10 stale active opportunities from paused sources (Dribbble, Pearl Talent, Coconut VA, CrewBloom) that had no `last_seen_in_feed_at` timestamp and were scraped more than 14 days ago.
  - Deduplicated 2 pairs (4 rows) of active opportunities from Passion.io via RealWorkFromAnywhere with identical title/company/description hashes by deactivating the older scraped row.
  - Documented findings, SQL queries, and before/after counts in `docs/data-quality-snapshot-2026-06-13.md` and `docs/stale-policy-report-2026-06-13.md`.
- Verification:
  - `bun test` passed (54/54 tests);
  - Remote D1 count queries confirmed active job count decreased from 884 to 871 (after deactivating stale/duplicate listings and the German job);
  - `git diff --check` passed.

### Post-Handoff F-12 - Breezy Source Review

- Date: 2026-06-13
- Status: accepted after fresh endpoint probing, robots.txt compliance analysis, and documentation updates
- Product commit:
  - `020ba7d` - `docs: add breezy source review findings`
- Scope:
  - Re-probed all configured Breezy ATS endpoints (`20Four7VA` returning 60 jobs, `Sourcefit` returning 65 jobs, and `VAA Philippines` returning 0 jobs).
  - Audited standard `robots.txt` rules for Breezy subdomains and confirmed automated access to the `/json` feed path is allowed.
  - Formulated the compliance decision to maintain these subdomains in `needs_review` status to enforce Goldilocks safety constraints (minimal metadata, direct apply links, immediate pause on objection).
  - Documented findings, probe counts, duplicate skip rules, and the policy decision in `docs/breezy-source-review-2026-06-13.md`.
- Verification:
  - `bun test` passed (54/54 tests);
  - `bun run --cwd apps/web build` completed successfully;
  - `git diff --check` passed.

### Post-Handoff F-11 - Source-Health History

- Date: 2026-06-13
- Status: accepted after local build, Bun test runner verification, git commit/push, and Wrangler D1 local/remote migrations
- Product commit:
  - `2b91c68` - `feat: add compact source-health history logs, database schema and migration`
- Scope:
  - Added the `source_fetch_events` table in the database to record historical logs for each scraper cron attempt (timestamp, ok/skipped, counts, duration, error, skip reason).
  - Wrote SQL migration `0016_source_fetch_events.sql` and applied it to local and remote D1 databases.
  - Implemented the `recordSourceFetchEvents` helper in `scrape.ts` that maps and inserts scraper run metrics in a single database batch transaction.
  - Created `docs/source-health-audit.md` documenting key database queries for auditing scraper trends, latencies, success rates, and errors.
- Verification:
  - `bun test` passed (54/54 tests);
  - `bun run --cwd apps/web build` passed;
  - `bunx wrangler d1 migrations apply remoteph-jobs-db --local` & `--remote` executed successfully;
  - `git diff --check` passed.

### Post-QA F-10 - Gemini Masterplan And CI Test Guardrail

- Date: 2026-06-13
- Status: accepted after Codex QA, local build/test verification, CI guardrail,
  production deploy, production smoke, read-only D1 checks, and docs handoff
- Handoff:
  - `docs/gemini-masterplan-handoff-2026-06-13.md`
- Product/CI commits:
  - `8d499df` - `feat: reduce payload size by slimming DB projections, add Remote OK unit tests`
  - `3036a53` - `docs: update implementation status and system savepoint with F-09 post-handoff details`
  - `e719a2c` - `ci: run unit tests in guardrail`
- Scope:
  - QA reviewed Gemini's projection slimming and Remote OK tests.
  - Added `bun test` to the CI guardrail so unit tests are enforced on every
    push and PR.
  - Created a Gemini-ready masterplan that prioritizes compact source-health
    history before more source expansion, then Breezy policy review, data
    quality, query/index audit, bounded source expansion, and portfolio polish.
- Verification:
  - `bun test packages/scraper/json.test.ts` passed with 54/54 tests.
  - `bun test` passed.
  - `bun run --cwd apps/web build` passed.
  - `git diff --check` passed.
  - CI guardrail `27461079903` passed for `e719a2c`.
  - Production deployment
    `2bbecd9c-1247-4805-b017-70574afa6e37` completed for `e719a2c`.
  - Production smoke returned 200 for `/`, `/directory`, `/opportunities`, and
    `/categories/tech`.
  - Read-only D1 snapshot reported 878 active opportunities, 38 active RemoteOK
    rows, 4 inactive RemoteOK cleanup rows, and 0 active RemoteOK
    physical/logistics outliers.

### Post-Handoff F-09 - Payload Reduction & Remote OK Tests

- Date: 2026-06-13
- Status: accepted after local build, Bun test runner verification, git commit/push, and manual D1 database query plan checks
- Product commit:
  - `8d499df` - `feat: reduce payload size by slimming DB projections, add Remote OK unit tests`
- Scope:
  - Slimmed DB projections for homepage `/` (from 22 columns to 10 fields used by `OpportunityCard`/`OpportunitySearch`). This reduces payload size by omitting heavy columns like `description`, `contentHash`, etc.
  - Slimmed DB projections for directory page `/directory` (from all columns to 8 fields used by `DirectorySearch`/`CategoryCard`), reducing payload size by dropping `notes`, `hiringPageUrl`, `verifiedAt`, `createdAt`, `rating`, `atsToken`, `atsPlatform`.
  - Added comprehensive unit tests for the Remote OK JSON scraper in `packages/scraper/json.test.ts` verifying placeholder title detection, role regex filters, hub-relevance rules, URL normalization, HTML entity decoding, and pay range normalization.
  - Investigated the zero-count successful source signal (`breezy:vaaphilippines-recruitment` returning 0 jobs successfully) and confirmed no references to `echojobs` or `dynamite-jobs` exist in the codebase except for the "Dynamite Jobs" directory entry.
- Verification:
  - `bun test packages/scraper/json.test.ts` passed (54/54 tests passing);
  - `bun run --cwd apps/web build` completed successfully;
  - `git diff --check` passed.

### Post-Audit F-08 - Remote OK JSON Source

- Date: 2026-06-13
- Status: accepted and stopped after local build/probe, CI, production deploy,
  D1 migration, Hunter evidence, source-health rollup, and read-only D1 checks
- Evidence report: `docs/remote-ok-json-source-handoff-2026-06-13.md`
- Product commits:
  - `92ca443` - `feat: add remote ok json source`
  - `4c2374b` - `fix: filter remote ok physical roles`
- Generated rollup commit:
  - `562355e` - `docs: update daily source health`
- Scope:
  - added JSON source support;
  - enabled Remote OK through `https://remoteok.com/api`;
  - enforced caps and 120-minute cadence;
  - linked Remote OK cards directly to Remote OK job URLs;
  - added source-specific relevance and physical/logistics filters;
  - archived four already-inserted RemoteOK physical/logistics outliers.
- Verification:
  - `bun run --cwd apps/web build` passed;
  - `git diff --check` passed;
  - CI guardrail `27435140046` passed for `92ca443`;
  - production deployment `b8b04c38-2b56-42e6-89df-2b980c6a6266` deployed
    `92ca443`;
  - manual Hunter `27435248150` passed with Remote OK JSON count 33 in the first
    loop, 25 accepted/attempted inserts total, 0 failed sources, 0 failed insert
    batches, and 0 insert errors;
  - CI guardrail `27435636180` passed for `4c2374b`;
  - D1 migration workflow `27435636177` passed;
  - source-health rollup `27450540244` passed with 0 failed sources and 0 insert
    errors;
  - later scheduled Hunter `27457196402` passed on `562355e`;
  - read-only D1 snapshot reported 878 active opportunities, 38 active RemoteOK
    rows, 4 inactive RemoteOK cleanup rows, and 0 active RemoteOK
    physical/logistics outliers.

### Post-Audit F-07 - Cadence-Guarded RSS Source Expansion

- Date: 2026-06-12
- Status: accepted after local build, D1 migration, CI, production deploy
  recovery, manual Hunter evidence, read-only D1 checks, and source-health
  rollup refresh
- Evidence report: `docs/source-expansion-2026-06-12.md`
- Product commits:
  - `686e312` - `feat: add cadence guarded rss sources`
  - `b948828` - `fix: preserve paused source skip reasons`
- Generated rollup commit:
  - `79e46f8` - `docs: update daily source health`
- Scope:
  - added source-level `maxItems`;
  - added durable `source_fetch_state` cadence tracking;
  - enabled Real Work From Anywhere RSS and Jobicy Admin Support APAC RSS with
    caps and 60-minute minimum fetch intervals;
  - preserved paused-source visibility with readable skip reasons;
  - kept Remote OK deferred until a JSON adapter exists.
- Verification:
  - `bun run --cwd apps/web build` passed;
  - `git diff --check` passed;
  - CI/deploy run `27422527473` passed;
  - D1 migration workflow `27422527574` passed;
  - CI run `27422888691` passed for the skip-reason fix;
  - manual production deployment
    `8863383f-2f01-4c64-8110-51b8e8d5f222` recovered production after an async
    Cloudflare Pages deployment failure for `b948828`;
  - Hunter run `27422685577` passed with 25 accepted/attempted inserts, 0 failed
    source records, 0 failed insert batches, and 0 insert errors;
  - Hunter run `27423455086` passed with cadence skips for the new hourly
    sources and readable paused-source skip reasons;
  - rollup-writing Hunter run `27423574670` passed and updated
    `docs/source-health-latest.md`;
  - read-only D1 checks reported 797 active opportunities, four healthy
    `source_fetch_state` rows, and use of
    `source_fetch_state_last_attempt_idx`.

### Post-Audit F-06 - Breezy ATS Token Allowlist

- Date: 2026-06-12
- Status: accepted after local build, CI/deploy, direct endpoint probes, manual
  Hunter retry, and source-health rollup refresh
- Evidence report: `docs/ats-policy-follow-up-2026-06-12.md`
- Product commit:
  - `6304ea4` - `fix: require token review for breezy ats`
- Generated rollup commit:
  - `14db966` - `docs: update daily source health`
- Scope:
  - changed Breezy from platform-wide enabled to token-specific policy;
  - kept current tokens `breezy:20four7va`, `breezy:sourcefit`, and
    `breezy:vaaphilippines-recruitment` enabled as `needs_review`;
  - paused unknown future Breezy tokens by default until source-specific review.
- Verification:
  - `bun run --cwd apps/web build` passed;
  - CI/deploy run `27372929451` passed;
  - direct probes for the three current Breezy JSON endpoints returned 200;
  - Hunter run `27372988265` showed one transient `20Four7VA` timeout, followed
    by healthy direct probes;
  - retry Hunter run `27373090226` passed with 0 failed sources, 0 failed insert
    batches, and 0 insert errors;
  - rollup-writing Hunter run `27373196600` passed and updated
    `docs/source-health-latest.md`.

### Post-Audit F-05 - ATS Policy Fail-Closed Hardening

- Date: 2026-06-12
- Status: accepted after local build, CI/deploy, manual Hunter evidence, and
  source-health rollup refresh
- Evidence report: `docs/ats-policy-follow-up-2026-06-12.md`
- Product commit:
  - `aa670ee` - `fix: pause unreviewed ats platforms`
- Generated rollup commit:
  - `f635f3f` - `docs: update daily source health`
- Scope:
  - paused Workable ATS collection after repeated HTTP 429 history and no
    reviewed source-supported access path;
  - paused Lever and Greenhouse by default because no current production
    directory rows use them and future rows need source-specific review first;
  - kept Breezy enabled as `needs_review` while preserving linkback to original
    ATS-hosted URLs.
- Verification:
  - `bun run --cwd apps/web build` passed;
  - `git diff --check` passed with only expected CRLF warnings;
  - CI/deploy run `27372355271` passed;
  - manual Hunter run `27372436554` passed with 0 failed sources, 0 failed
    insert batches, and 0 insert errors;
  - rollup-writing Hunter run `27372521005` passed and updated
    `docs/source-health-latest.md`;
  - latest source-health rollup reports 18 skipped sources, including Workable
    ATS rows as `paused`.

### Post-Audit F-04 - Wrangler v4 And Local D1 Audit Recovery

- Date: 2026-06-12
- Status: accepted after local frozen install, active app build, read-only D1
  audit, CI/deploy, and production route smoke
- Evidence report: `docs/wrangler-d1-audit-2026-06-12.md`
- Commit:
  - `ad03990` - `chore: upgrade wrangler for current cloudflare config`
- Scope:
  - upgraded active root and `apps/web` Wrangler dev dependencies to
    `^4.100.0`;
  - refreshed `bun.lock` so it matches the active Astro workspace dependency
    graph;
  - confirmed Wrangler v4 accepts the current `ratelimits` Pages Functions
    config without the Wrangler v3 warning;
  - restored local direct read-only D1 audits from this machine.
- Verification:
  - `bun install --frozen-lockfile` passed;
  - `bun run --cwd apps/web build` passed;
  - `bunx wrangler --version` returned `4.100.0`;
  - `bunx wrangler d1 info remoteph-jobs-db` passed with no `ratelimits`
    warning;
  - D1 read-only audit reported 748 active opportunities and `changed_db:
    false`;
  - query plans use `active_posted_idx` and `category_active_posted_idx`;
  - CI/deploy run `27371741236` passed;
  - production route smoke passed for `/`, `/opportunities`,
    `/opportunities?page=2`, `/directory`, `/data-policy`, `/privacy`,
    `/categories/tech`, and `/categories/tech?page=2`;
  - unauthenticated `POST /api/cron/scrape` returned 401.

### Major Health Audit - Hunter Recovery, Category Payload, Repo Hygiene

- Date: 2026-06-11
- Status: accepted after local build, production route smoke, CI/deploy runs,
  manual Hunter recovery, and source-health rollup refresh
- Evidence report: `docs/major-audit-2026-06-11.md`
- Product commits:
  - `e861071` - `fix: reduce D1 scrape insert batch size (F-01)`
  - `45e2f2d` - `fix: paginate category pages server-side (F-02)`
  - `ae72998` - `chore: stop tracking local wrangler state (F-03)`
- Generated rollup commit:
  - `6e76c67` - `docs: update daily source health`
- Scope:
  - fixed repeated scheduled Hunter failures caused by D1
    `too many SQL variables` insert errors;
  - reduced category pages from a hydrated all-category payload to
    server-side pagination;
  - removed committed local `.wrangler` D1 runtime state and ignored it going
    forward;
  - refreshed `docs/source-health-latest.md` with post-fix Hunter evidence.
- Verification:
  - `bun run --cwd apps/web build` passed after F-01 and after F-02;
  - `git diff --check` passed with only normal CRLF warnings;
  - CI/deploy runs `27353756293`, `27353939869`, and `27354017177` passed;
  - production route smoke passed for `/`, `/opportunities`,
    `/opportunities?page=2`, `/directory`, `/data-policy`, `/privacy`,
    `/categories/tech`, and `/categories/tech?page=2`;
  - `/categories/tech` dropped from about 980 KB to about 94 KB;
  - unauthenticated `POST /api/cron/scrape` returned 401;
  - manual Hunter run `27354089629` passed with 35 accepted/attempted inserts,
    0 failed insert batches, 0 insert errors, and 0 failed sources;
  - rollup-writing Hunter run `27354219672` passed and wrote
    `docs/source-health-latest.md` with 0 failed sources and 0 insert errors.
- Verification limit at the time, resolved by F-04 above:
  - local direct Wrangler D1 reads failed with Cloudflare API error `7403`;
    production write health was verified through GitHub Hunter workflow
    evidence instead.

### P5 Debt - Historical Datetime Backfill & Major Health Audit

- Date: 2026-06-10
- Status: accepted after read-only D1 audit, D1 migration, and GitHub documentation push
- Commit: `4336de4`
- Message: `docs: add 2026-06-10 major audit report`
- Supporting commit: `6a9fd40` (`fix: backfill historical datetimes to ISO UTC`)
- Scope:
  - Validated that Lens 1 and Lens 2 successfully cleared prior technical debt (indexing, `/opportunities` route, noisy GitHub action scraper alerts).
  - Executed a major D1 health audit which revealed 704 total jobs with drastically improved category signal (`other` reduced to 48).
  - Executed remaining P5 technical debt: backfilled and normalized thousands of legacy `YYYY-MM-DD HH:MM:SS` timestamps across the database into canonical UTC ISO strings using `0013_historical_datetime_backfill.sql`.
  - Exported the complete audit report into `docs/major-audit-2026-06-10.md` for the next AI agent.
- Key evidence:
  - D1 migration `0013` successfully applied remotely.
  - `docs/major-audit-2026-06-10.md` pushed to `main`.

### Lens 2 - Sourcing Expansion & Data Quality

- Date: 2026-06-09
- Status: accepted after local build, D1 SQL backfill, staggered Workable setup, and CI validation success
- Commit: `f5b9827`
- Message: `feat: implement Lens 2 roadmap (category alignment, SQL backfill, staggered Workable rotation, and auto-deploy)`
- Scope:
  - Added `finance` category and updated triage prompts/regex mappings.
  - Increased description extraction slice to 1500 characters.
  - Implemented staggered Workable ATS rotation polling (fetching 2 agencies per run) and tracking via `verifiedAt`.
  - Added auto-deploy to Cloudflare Pages on `main` push to CI workflow.
- Key evidence:
  - Local build passed.
  - GitHub Actions run `27207069121` passed, deploying the app to Cloudflare Pages.
  - D1 category counts updated, reducing `other` from 532 to 47.
  - Live page loading correctly with the new categories.

### P7 - Final Acceptance Audit

- Date: 2026-06-09
- Status: accepted after local build, production smoke, D1 checks, query-plan
  checks, README update, docs checkpoint, and CI
- Evidence report: `docs/final-acceptance-audit-2026-06-09.md`
- Scope:
  - re-ran active app build;
  - smoked production routes;
  - checked protected scrape endpoint;
  - captured D1 active-row, missing-field, source-state, category, and query
    plan evidence;
  - verified latest workflow and source-health rollup state;
  - replaced stale README language with the current production architecture,
    public-source policy, and recovery docs.
- Key evidence:
  - `npm.cmd run build --workspace apps/web` passed;
  - `/`, `/opportunities`, `/directory`, `/data-policy`, `/privacy`, and
    `/categories/tech` returned 200;
  - unauthenticated POST to `/api/cron/scrape` returned 401;
  - D1 reported 688 active opportunities and 0 missing `application_url`;
  - query plans use `active_posted_idx` and `category_active_posted_idx`;
  - `docs/source-health-latest.md` reports 0 failed sources.
- Accepted completion after this checkpoint: 100%.

### P6 Slice 2 - Source Health Rollup

- Date: 2026-06-09
- Status: accepted after CI, manual Hunter, generated rollup commit, and
  repo-readable rollup verification
- Workflow commit: `0ba92d2`
- Message: `ci: add source health rollup`
- Generated rollup commit: `d4b33a7`
- Message: `docs: update daily source health`
- Evidence report: `docs/source-health-rollup-2026-06-09.md`
- Scope:
  - added manual `write_rollup` workflow input for acceptance testing;
  - added `daily-rollup` job that downloads the Hunter artifact and writes
    `docs/source-health-latest.md`;
  - guarded scheduled rollups to at most one commit per UTC date;
  - kept the main Hunter job read-only and isolated write permission to the
    rollup job.
- Verification:
  - `git diff --check` passed with only normal CRLF warnings;
  - GitHub Actions run `27204381138` passed for the workflow change;
  - manual Hunter workflow run `27204417574` passed with
    `write_rollup=true`;
  - Hunter artifact `hunter-health-27204417574` uploaded with artifact ID
    `7506838648`;
  - `Update Source Health Rollup` job created commit `d4b33a7`;
  - local repo fast-forwarded to include `docs/source-health-latest.md`.
- Hunter evidence:
  - response reported HTTP 200;
  - response reported `failedSources: []`;
  - response reported `inserted: 0`, `actualChanges: 0`,
    `acceptedForInsert: 0`, `attemptedInsert: 0`,
    `insertFailedBatches: 0`, and `insertErrors: []`;
  - rollup reports 0 failed sources, 1 zero-count successful source, and 18
    skipped sources.
- Accepted completion after this checkpoint: 95%.

### P6 Slice 1 - Hunter Health Artifacts

- Date: 2026-06-09
- Status: accepted after CI, manual Hunter, artifact download, and no-bot-commit
  verification
- Commit: `f8fadfb`
- Message: `ci: stop hunter alert commit spam`
- Evidence report: `docs/hunter-health-artifacts-2026-06-09.md`
- Scope:
  - changed Hunter workflow permissions from `contents: write` to
    `contents: read`;
  - removed the per-run `docs/scraper-alerts.md` append/commit/push path;
  - kept warning/error annotations for source failures and insert errors;
  - added `source-health-summary.md`;
  - uploaded `harvest.log` and `source-health-summary.md` as run artifacts.
- Verification:
  - `git diff --check` passed with only normal CRLF warnings;
  - `rg` confirmed no `contents: write`, `git commit`, `git push`, or
    `scraper-alerts` references remain in Hunter;
  - GitHub Actions run `27204009191` passed;
  - manual Hunter workflow run `27204051068` passed;
  - artifact `hunter-health-27204051068` uploaded with artifact ID
    `7506687492`;
  - downloaded artifact contained `harvest.log` and
    `source-health-summary.md`;
  - `git status --short --branch` after fetching `origin/main` reported
    `## main...origin/main`, confirming Hunter did not create a bot commit.
- Hunter evidence:
  - response reported HTTP 200;
  - response reported `failedSources: []`;
  - response reported `inserted: 0`, `actualChanges: 0`,
    `acceptedForInsert: 0`, `attemptedInsert: 0`,
    `insertFailedBatches: 0`, and `insertErrors: []`;
  - artifact summary reported 0 failed sources, 1 zero-count successful source,
    and 18 skipped sources.
- Accepted completion after this checkpoint: 90%.

### P5 Slice 3 - Application URL Backfill

- Date: 2026-06-09
- Status: accepted after product CI, D1 migration, deploy, production smoke,
  and Hunter evidence
- Product commit: `2754740`
- Message: `fix: derive application urls from source urls`
- Evidence report: `docs/application-url-backfill-2026-06-09.md`
- Scope:
  - normalized manual ingest writes so `applicationUrl` falls back to
    `sourceUrl`;
  - normalized cron scrape writes so triage-discovered `applicationUrl` wins,
    then scraper-provided `applicationUrl`, then `sourceUrl`;
  - added D1 migration `0012_application_url_backfill.sql`;
  - did not change the visible job-card routing, which still links through
    `sourceUrl`.
- Verification:
  - `git diff --check` passed with only normal CRLF warnings;
  - `npm.cmd run build --workspace apps/web` passed;
  - GitHub Actions run `27203416725` passed;
  - D1 migration workflow run `27203416643` passed;
  - migration applied `0012_application_url_backfill.sql`;
  - deployed `apps/web/dist` with Wrangler to
    `https://936f10a7.remotejobs-ph.pages.dev`;
  - production `/`, `/opportunities`, and `/directory` returned 200;
  - unauthenticated POST to `/api/cron/scrape` returned 401;
  - sample click redirect for job `2135` returned 302 to the validated source
    URL.
- D1 evidence:
  - after migration and before Hunter: 687 active rows, 0 missing
    `application_url`, 687 rows where `application_url = source_url`;
  - after Hunter: 688 active rows, 0 missing `application_url`, 687 rows where
    `application_url = source_url`, and 1 row with a distinct application URL.
- Live workflow evidence:
  - manual Hunter workflow run `27203556963` passed;
  - response reported `failedSources: []`;
  - response reported `inserted: 1`, `actualChanges: 1`,
    `acceptedForInsert: 1`, `attemptedInsert: 1`,
    `insertFailedBatches: 0`, and `insertErrors: []`.
- Accepted completion after this checkpoint: 85%.

### P5 Slice 2 - Stale Policy Dry Run

- Date: 2026-06-09
- Status: accepted after docs CI
- Dry-run report: `docs/stale-policy-dry-run-2026-06-09.md`
- Scope:
  - defined source states: `enabled`, `paused`, and `unclassified`;
  - defined no-mutation dry-run actions for keep, hold, review, and classify;
  - ran read-only D1 candidate queries against production;
  - made no production row mutations.
- Dry-run action counts:
  - `keep_enabled_source`: 497 rows;
  - `hold_paused_recently_seen`: 175 rows;
  - `review_paused_missing_last_seen`: 10 rows;
  - `classify_source_before_action`: 5 rows.
- Review buckets:
  - paused-source rows missing `last_seen_in_feed_at`: 10;
  - unclassified `RemoteOK` rows: 5.
- Verification:
  - all D1 checks were read-only and reported `changed_db: false`;
  - `git diff --check` passed with only normal CRLF warnings.
- Accepted completion after this checkpoint: 80%.

### P5 Slice 1 - Data Quality Snapshot

- Date: 2026-06-09
- Status: accepted after docs CI
- Snapshot: `docs/data-quality-snapshot-2026-06-09.md`
- Scope:
  - captured read-only production D1 data quality metrics;
  - separated currently enabled source rows, now-paused source rows, and
    unclassified source rows;
  - recorded category, source, stale-risk, missing-field, duplicate-key, and
    last-seen gap metrics;
  - made no production row mutations.
- Key findings:
  - active opportunities: 687;
  - duplicate `source_url`, `content_hash`, and non-empty `description_hash`
    groups: 0 each;
  - missing `application_url` and `client_timezone`: 687 rows each;
  - missing `pay_range`: 524 rows;
  - missing `experience_level`: 522 rows;
  - category `other`: 531 rows;
  - posted older than 30 days: 247 rows;
  - rows from currently enabled sources: 497;
  - historical rows from now-paused sources: 185;
  - unclassified source rows: 5 (`RemoteOK`).
- Verification:
  - all D1 checks were read-only and reported `changed_db: false`;
  - `git diff --check` passed with only normal CRLF warnings.
- Accepted completion after this checkpoint: 75%.

### P4 Slice 3 - ATS Source Policy And Duplicate Control

- Date: 2026-06-09
- Status: accepted
- Final commit: `95e6665`
- Message: `fix: pause rate limited workable ats sources`
- Supporting commits:
  - `e3714d8` - `fix: dedupe duplicate ats source fetches`
  - `3256127` - `fix: throttle ats source polling`
- ATS source review evidence: `docs/ats-source-review-2026-06-09.md`
- Scope:
  - added ATS platform policy notes to scrape `sourceResults`;
  - de-duplicated directory rows that share the same ATS platform/token;
  - reported duplicate ATS rows as `skipped: true` with reasons;
  - paused Workable ATS polling after repeated HTTP 429s, including after
    sequential polling;
  - kept Breezy ATS JSON enabled as `needs_review`.
- Verification:
  - production D1 read-only query found 15 ATS-enabled rows and one duplicate
    token: `breezy:20four7va` for `20Four7VA` and
    `24/7 Virtual Assistant`.
  - `npm.cmd run build --workspace apps/web` passed.
  - `git diff --check` passed with only normal CRLF warnings.
  - GitHub Actions run `27202145473` passed for the final Workable pause
    commit.
- Deployment:
  - manually deployed `apps/web/dist` with Wrangler;
  - final Cloudflare preview URL: `https://6b3bc9b2.remotejobs-ph.pages.dev`.
- Production smoke:
  - `/` returned 200 at about 187 KB;
  - `/opportunities` returned 200 at about 96 KB;
  - `/directory` returned 200 at about 272 KB;
  - unauthenticated POST to `/api/cron/scrape` returned 401.
- Live workflow evidence:
  - final manual Hunter workflow run `27202221523` passed;
  - response reported `failedSources: []`;
  - Breezy ATS results included `20Four7VA` with 61 items, `Sourcefit` with 67
    items, and `VAA Philippines` with 0 items;
  - 11 Workable-backed directory rows were reported as `skipped: true` with
    `complianceStatus: "paused"`;
  - `24/7 Virtual Assistant` was reported as `skipped: true` because the
    `20four7va` Breezy token was already fetched for `20Four7VA`;
  - response reported `inserted: 0`, `actualChanges: 0`,
    `acceptedForInsert: 0`, `attemptedInsert: 0`,
    `insertFailedBatches: 0`, and `insertErrors: []`.
- D1 evidence:
  - active opportunity count after the latest Hunter run: 687;
  - read-only D1 count query changed 0 rows.
- Accepted completion after this checkpoint: 70%.

### P4 Slice 2 - Source Review And Pause Enforcement

- Date: 2026-06-09
- Status: accepted
- Commit: `1143798`
- Message: `feat: enforce source compliance pauses`
- Source review evidence: `docs/source-review-2026-06-09.md`
- Scope:
  - marked We Work Remotely and Remotive as enabled `allowed` RSS sources with
    attribution/linkback notes;
  - paused ProBlogger, Remote.co, Authentic Jobs, Dribbble Jobs,
    OnlineJobs.ph, and Jobspresso with source-specific reasons;
  - changed `rssSources` and `htmlSources` to include only enabled sources;
  - kept disabled sources visible in scrape `sourceResults` as `skipped: true`
    with `skipReason`;
  - updated the Hunter workflow summary to count skipped sources separately from
    failed and zero-count successful sources.
- Verification:
  - current source evidence was reviewed via source pages, robots files, terms
    pages, and live feed probes.
  - `npm.cmd run build --workspace apps/web` passed.
  - `git diff --check` passed with only normal CRLF warnings.
  - GitHub Actions run `27200812470` passed.
- Deployment:
  - manually deployed `apps/web/dist` with Wrangler;
  - Cloudflare preview URL: `https://1a74a454.remotejobs-ph.pages.dev`.
- Production smoke:
  - `/` returned 200 at about 187 KB;
  - `/opportunities` returned 200 at about 96 KB;
  - `/directory` returned 200 at about 272 KB;
  - `/data-policy` returned 200;
  - unauthenticated POST to `/api/cron/scrape` returned 401.
- Live workflow evidence:
  - manual Hunter workflow run `27200899849` passed;
  - final response reported `failedSources: []`;
  - We Work Remotely fetched as `allowed` with 100 RSS items;
  - Remotive fetched as `allowed` with 29 RSS items;
  - ProBlogger, Remote.co, Authentic Jobs, Dribbble Jobs, OnlineJobs.ph, and
    Jobspresso were reported as `skipped: true` with pause reasons;
  - response reported `inserted: 0`, `actualChanges: 0`,
    `acceptedForInsert: 0`, `attemptedInsert: 0`,
    `insertFailedBatches: 0`, and `insertErrors: []`.
- D1 evidence:
  - active opportunity count after the latest Hunter run: 687;
  - read-only D1 count query changed 0 rows.
- Accepted completion after this checkpoint: 65%.

### P4 Slice 1 - Conservative Source Metadata

- Date: 2026-06-09
- Status: accepted
- Commit: `fa2d6eb`
- Message: `feat: add source compliance metadata`
- Scope:
  - added `collectionMethod`, `complianceStatus`, and `complianceNotes` to
    configured RSS/HTML scraper sources;
  - exported `CollectionMethod` and `ComplianceStatus` types from
    `@va-hub/scraper`;
  - exposed `collectionMethod` and `complianceStatus` in scrape
    `sourceResults`;
  - defaulted ATS-derived source results to `public_ats_json` and
    `needs_review` until directory-level source policy exists;
  - updated `/data-policy` to use public-indexing language and explicitly state
    that public visibility is not blanket permission.
- Verification:
  - `npm.cmd run build --workspace apps/web` passed.
  - `git diff --check` passed with only normal CRLF warnings.
  - GitHub Actions run `27199810692` passed.
- Deployment:
  - manually deployed `apps/web/dist` with Wrangler;
  - Cloudflare preview URL: `https://1896b637.remotejobs-ph.pages.dev`.
- Production smoke:
  - `/` returned 200 at about 187 KB;
  - `/opportunities` returned 200 at about 96 KB;
  - `/data-policy` returned 200 and included the June 2026 update plus the
    public-visibility caution;
  - unauthenticated POST to `/api/cron/scrape` returned 401.
- Live workflow evidence:
  - manual Hunter workflow run `27199890298` passed;
  - response included `collectionMethod` and `complianceStatus` on RSS, HTML,
    and ATS source results;
  - configured sources and ATS results were conservatively marked
    `needs_review`;
  - workflow produced scraper-alert commit `3174068` for the Remote.co failure.
- D1 evidence:
  - active opportunity count after the latest Hunter run: 687;
  - read-only D1 count query changed 0 rows.
- Accepted completion after this checkpoint: 60%.

### P3 Slice 3 - Hunter Workflow Annotations

- Date: 2026-06-09
- Status: accepted
- Commit: `e0a32fb`
- Message: `ci: surface hunter scrape health`
- Scope:
  - added Hunter workflow totals for accepted rows, attempted inserts, failed
    insert batches, and insert errors;
  - added warning annotations for partial source failures;
  - added insert-error warning annotations and threshold behavior;
  - expanded the GitHub step summary with source failure, zero-count source, and
    insert accounting metrics;
  - preserved existing scraper-alert commit behavior until P6 rollups replace it.
- Verification:
  - `git diff --check` passed with only normal CRLF warnings.
  - GitHub Actions run `27198767290` passed.
- Live workflow evidence:
  - manual Hunter workflow run `27198807621` passed;
  - run emitted a warning annotation:
    `1 source(s) failed. See sourceResults in harvest.log.`;
  - final response reported `inserted: 1`, `actualChanges: 1`,
    `acceptedForInsert: 1`, `attemptedInsert: 1`,
    `insertFailedBatches: 0`, and `insertErrors: []`;
  - summary step wrote failed-source, zero-count source, and insert accounting
    metrics;
  - workflow produced scraper-alert commit `baf2bd8` for the Remote.co failure.
- D1 evidence:
  - active opportunity count after the latest Hunter run: 687;
  - read-only D1 count query changed 0 rows.
- Accepted completion after this checkpoint: 55%.

### P3 Slice 2 - Honest Insert Accounting

- Date: 2026-06-09
- Status: accepted
- Commit: `e86b854`
- Message: `fix: report actual scrape inserts`
- Scope:
  - changed `/api/cron/scrape` so `inserted` equals D1 `meta.changes`;
  - added `acceptedForInsert` for rows that passed triage;
  - added `attemptedInsert` for rows submitted to D1;
  - added `insertFailedBatches` and `insertErrors` response fields;
  - preserved backward compatibility for `.github/workflows/gha-hunter-pulse.yml`
    because it still reads `.inserted`.
- Local verification:
  - `npm.cmd run build --workspace apps/web` passed.
  - `git diff --check` passed with only normal CRLF warnings.
  - Static check confirmed the new response fields are present in no-data,
    no-new-job, no-triage-pass, and successful-insert branches.
- GitHub:
  - pushed to `origin/main`;
  - GitHub Actions run `27167396371` passed.
- Deployment:
  - manually deployed `apps/web/dist` with Wrangler;
  - Cloudflare preview URL: `https://cde106a3.remotejobs-ph.pages.dev`.
- Production smoke:
  - `/` returned 200 at about 186 KB;
  - `/opportunities` returned 200 at about 96 KB;
  - `/directory` returned 200;
  - unauthenticated POST to `/api/cron/scrape` returned 401.
- Live ingestion evidence:
  - manual Hunter workflow run `27198077806` passed;
  - authenticated production scrape response returned HTTP 200;
  - response reported `inserted: 1`, `actualChanges: 1`,
    `acceptedForInsert: 1`, `attemptedInsert: 1`,
    `insertFailedBatches: 0`, and `insertErrors: []`;
  - Remote.co remained visible in `failedSources` and `sourceResults`;
  - workflow produced scraper-alert commit `bc255c8` for the Remote.co failure.
- D1 evidence:
  - active opportunity count after later scheduled/manual ingestion: 686;
  - read-only D1 count query changed 0 rows.
- Accepted completion after this checkpoint: 45%.

### P3 Slice 1 - Structured Source Status

- Date: 2026-06-09
- Status: accepted
- Commit: `27794d8`
- Message: `feat: report source scrape status`
- Scope:
  - added structured `sourceResults` to `/api/cron/scrape` responses;
  - preserved the existing `failedSources` array used by
    `.github/workflows/gha-hunter-pulse.yml`;
  - each source result includes `sourceName`, `sourceType`, `ok`, `count`,
    `durationMs`, and `error` when failed;
  - changed ATS fetch errors to throw so broken ATS sources become failed source
    records instead of silent zero-item successes.
- Local verification:
  - `npm.cmd run build --workspace apps/web` passed.
  - `git diff --check` passed with only normal CRLF warnings.
  - Static check confirmed `sourceResults` is returned by all successful scrape
    response branches.
- GitHub:
  - pushed to `origin/main`;
  - GitHub Actions run `27166648567` passed.
- Deployment:
  - manually deployed `apps/web/dist` with Wrangler;
  - Cloudflare preview URL: `https://44501583.remotejobs-ph.pages.dev`.
- Production smoke:
  - `/` returned 200 at about 181 KB;
  - `/opportunities` returned 200 at about 96 KB;
  - `/directory` returned 200;
  - unauthenticated POST to `/api/cron/scrape` returned 401.
- Live ingestion evidence:
  - manual Hunter workflow run `27166770708` passed;
  - authenticated production scrape response returned HTTP 200;
  - response inserted 11 jobs, reported `actualChanges: 11`, and left
    `backlogRemaining: 0`;
  - response included `sourceResults` for RSS, HTML, and ATS sources;
  - Remote.co was explicitly reported as
    `ok: false`, `count: 0`, `error: "[rss] Failed to fetch Remote.co: HTTP 520"`;
  - zero-count successful sources such as ProBlogger, Jobspresso,
    OnlineJobs.ph, MyOutDesk, and others were distinguishable from failures via
    `ok: true`;
  - the workflow produced scraper-alert commit `ca1f06d` for the Remote.co
    failure.
- D1 evidence:
  - active opportunity count after the manual Hunter run: 683;
  - read-only D1 count query changed 0 rows.
- Accepted completion after this checkpoint: 40%.

### P2 Slice 2 - Canonical Timestamp Writes

- Date: 2026-06-09
- Status: accepted
- Commit: `e32e580`
- Message: `feat: normalize app timestamp writes`
- Scope:
  - added `apps/web/src/lib/time.ts` for app-owned UTC ISO timestamp helpers;
  - normalized opportunity timestamps in `/api/cron/scrape`;
  - normalized opportunity timestamps in `/api/ingest`;
  - normalized digest timestamps in `/api/ingest-digest`;
  - changed `/api/cron/verify-links` to write ISO `lastVerifiedAt` and
    `updatedAt` values;
  - changed stale comparisons to parse both historical SQLite timestamps and
    new ISO timestamps through SQLite `unixepoch`;
  - documented the decision in
    `docs/decisions/ADR-002-canonical-utc-iso-timestamps.md`.
- Local verification:
  - `npm.cmd run build --workspace apps/web` passed.
  - `git diff --check` passed with only normal CRLF warnings.
  - `rg` found no remaining `datetime('now')` writes under `apps/web/src`.
- GitHub:
  - pushed to `origin/main`;
  - GitHub Actions run `27165936753` passed.
- Deployment:
  - manually deployed `apps/web/dist` with Wrangler because CI currently builds
    but does not deploy;
  - Cloudflare preview URL: `https://4bb0cf93.remotejobs-ph.pages.dev`.
- Production smoke:
  - `/` returned 200 at about 181 KB;
  - `/opportunities` returned 200 at about 96 KB;
  - `/opportunities?page=2` returned 200 at about 97 KB;
  - `/directory` returned 200;
  - unauthenticated POST requests to `/api/cron/scrape`,
    `/api/cron/verify-links`, `/api/ingest`, and `/api/ingest-digest` all
    returned 401.
- D1 evidence:
  - active opportunity count at verification time: 672;
  - `unixepoch(scraped_at)`, `unixepoch(last_seen_in_feed_at)`, and
    `unixepoch(last_verified_at)` had 0 unparseable active rows;
  - read-only D1 query changed 0 rows.
- Remaining debt:
  - production table defaults still use SQLite `datetime('now')` as fallback;
  - historical timestamp backfill and any table-default rebuild remain P5 work.
- Accepted completion after this checkpoint: 35%.

### P2 Slice 1 - Query-Aligned Indexes

- Date: 2026-06-08
- Status: accepted
- Commit: `be3d646`
- Rebased local commit: `c255f17`
- Message: `feat: add query aligned opportunity indexes`
- Scope:
  - added migration `packages/db/migrations/0011_query_aligned_indexes.sql`;
  - added `active_posted_idx` on `(is_active, posted_at DESC)`;
  - added `category_active_posted_idx` on `(category, is_active, posted_at DESC)`;
  - added `active_last_verified_idx` on `(is_active, last_verified_at ASC)`;
  - aligned `packages/db/schema.ts`.
- Pre-migration evidence:
  - `PRAGMA index_list('opportunities')` showed only older indexes such as
    `active_scraped_idx`, `category_idx`, and `last_verified_idx`;
  - homepage query used `active_scraped_idx` plus `USE TEMP B-TREE FOR ORDER BY`;
  - category query used `category_idx` plus `USE TEMP B-TREE FOR ORDER BY`;
  - verifier query used `active_scraped_idx` plus `USE TEMP B-TREE FOR ORDER BY`.
- Verification:
  - `npm.cmd run build --workspace apps/web` passed.
  - Migration workflow `27155847940` passed.
  - CI guardrail `27155847992` passed.
- Post-migration evidence:
  - `PRAGMA index_list('opportunities')` shows `active_posted_idx`,
    `category_active_posted_idx`, and `active_last_verified_idx`.
  - Homepage query uses `active_posted_idx` with no temp B-tree.
  - Category query uses `category_active_posted_idx` with no temp B-tree.
  - Verifier query uses `active_last_verified_idx` with no temp B-tree.
- Accepted completion after this checkpoint: 27.5%.

### P1 Product Surface And Homepage Payload

- Date: 2026-06-08
- Status: accepted
- Commit: `2475103`
- Message: `feat: add paginated opportunities board`
- Scope:
  - added `apps/web/src/pages/opportunities.astro`;
  - reduced homepage job payload from 500 rows to a 60-row preview;
  - made the homepage preview use `OpportunitySearch` without the search bar;
  - moved the global "Find a Job Now" CTA to `/opportunities`.
- Local verification:
  - `npm.cmd run build --workspace apps/web` passed.
  - Local Astro dev server route smoke passed:
    - `/` returned 200;
    - `/opportunities` returned 200;
    - `/opportunities?page=2` returned 200;
    - `/opportunities?category=tech` returned 200;
    - `/directory` returned 200.
- GitHub:
  - pushed to `origin/main`;
  - GitHub Actions run `27141658140` passed.
- Deployment:
  - manually deployed `apps/web/dist` with Wrangler because CI currently builds
    but does not deploy;
  - Cloudflare preview URL: `https://68b1259d.remotejobs-ph.pages.dev`;
  - public alias updated: `https://remotejobs-ph.pages.dev`.
- Production smoke:
  - `/` returned 200 at about 183 KB;
  - `/opportunities` returned 200 at about 97 KB;
  - `/opportunities?page=2` returned 200 on preview;
  - `/directory` returned 200.
- Accepted completion after this checkpoint: 20%.

### Pause And Recovery Handoff

- Date: 2026-06-06
- Status: accepted
- Reason: user asked to stop everything for now and back up all progress/plans.
- Scope: docs-only handoff; no P1 implementation files changed.
- Commit: `431ab60`
- Message: `docs: add paused ai recovery handoff`
- Local verification: `git diff --check` passed with only normal Windows
  LF/CRLF warnings.
- GitHub Actions run: `27041163556`
- Result: success
- Evidence:
  - `docs/DOCS_INDEX.md`
  - `docs/HANDOFF.md`
  - `CLAUDE.md`
  - `docs/AI_RECOVERY_TRAIL.md`
  - `docs/IMPLEMENTATION_STATUS.md`
  - `docs/SYSTEM_SAVEPOINT.md`

### P0 Recovery Methodology

- Date: 2026-06-06
- Commit: `9657c4a`
- Message: `docs: adopt recovery-driven execution plan`
- Local verification: `git diff --check` passed with only normal Windows
  LF/CRLF warnings.
- GitHub Actions run: `27040684807`
- Result: success
- Evidence:
  - `AGENTS.md`
  - `docs/MASTER_EXECUTION_PLAN.md`
  - `docs/IMPLEMENTATION_STATUS.md`
  - `docs/AI_RECOVERY_TRAIL.md`
  - `docs/SYSTEM_SAVEPOINT.md`
  - `docs/decisions/ADR-001-recovery-driven-public-job-index.md`
- Accepted completion after this checkpoint: 5%.

### Major Audit Baseline

- Date: 2026-06-06
- Commit: `74c0416`
- Message: `docs: add major audit and agent instructions`
- GitHub Actions run: `27039365056`
- Result: success
- Evidence: `docs/major-audit-2026-06-06.md`

## Next Task

Stopped by user request. Next AI should start from
`docs/gemini-masterplan-handoff-2026-06-13.md`, run
`git status --short --branch`, and implement one small vertical slice from the
masterplan. Prefer compact source-health history first unless fresh evidence
shows a higher-priority issue.

## Open Risks To Keep Visible

- Some sources may be public but not automation-friendly under their terms.
- Local direct D1 audit commands now work with Wrangler v4; keep using the
  command shapes documented in `docs/wrangler-d1-audit-2026-06-12.md`.
- ATS sources marked `needs_review` still need source-specific policy review
  before being considered fully compliant.
