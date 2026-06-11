# Implementation Status

## Start Here

When starting a new chat or work session, read these in order:

1. `AGENTS.md`
2. `docs/MASTER_EXECUTION_PLAN.md`
3. `docs/IMPLEMENTATION_STATUS.md`
4. `docs/AI_RECOVERY_TRAIL.md`
5. `docs/SYSTEM_SAVEPOINT.md`
6. `docs/major-audit-2026-06-11.md`
7. `docs/major-audit-2026-06-10.md`
8. `docs/major-audit-2026-06-06.md`

### Current Focus

Post-audit health repairs complete. The system is healthy after the 2026-06-11
major audit fixed Hunter D1 insert batching, reduced category page payloads, and
removed tracked local Wrangler state. The 2026-06-12 follow-up also restored
local direct D1 audit capability and upgraded active Wrangler tooling for the
current Cloudflare Pages config. The latest ATS follow-up pauses unreviewed or
noisy ATS platforms by default and refreshed the source-health rollup.

## Overall Completion

Current accepted completion: 100% of Lens 2.

## Phase Status (Lens 2)

| Phase | Weight | Current accepted % | Status | Next acceptance evidence |
| --- | ---: | ---: | --- | --- |
| L1 Category Alignment & AI Triage | 35% | 35% | Accepted | Complete |
| L2 Staggered Workable Polling | 35% | 35% | Accepted | Complete |
| L3 CI/CD Auto-Deployments | 30% | 30% | Accepted | Complete |

## Latest Accepted Checkpoint

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

Optional future hardening only. Recommended next slice: continue ATS/source
policy review or choose a new data-quality/reporting improvement.

## Open Risks To Keep Visible

- Some sources may be public but not automation-friendly under their terms.
- Local direct D1 audit commands now work with Wrangler v4; keep using the
  command shapes documented in `docs/wrangler-d1-audit-2026-06-12.md`.
- ATS sources marked `needs_review` still need source-specific policy review
  before being considered fully compliant.
