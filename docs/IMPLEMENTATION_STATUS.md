# Implementation Status

## Start Here

When starting a new chat or work session, read these in order:

1. `AGENTS.md`
2. `docs/MASTER_EXECUTION_PLAN.md`
3. `docs/IMPLEMENTATION_STATUS.md`
4. `docs/AI_RECOVERY_TRAIL.md`
5. `docs/SYSTEM_SAVEPOINT.md`
6. `docs/major-audit-2026-06-06.md`

## Current Focus

Phase P4: Source compliance and portfolio cleanup.

P4 Slice 1 is accepted. Configured sources now carry conservative compliance
metadata, and the public data policy no longer treats public visibility as
blanket permission.

## Overall Completion

Current accepted completion: 60%.

P0, P1, P2, P3, and the first 5% slice of P4 are accepted.

## Phase Status

| Phase | Weight | Current accepted % | Status | Next acceptance evidence |
| --- | ---: | ---: | --- | --- |
| P0 Recovery docs and methodology | 5% | 5% | Accepted | Complete |
| P1 Product surface and payload | 15% | 15% | Accepted | Complete |
| P2 Indexing and datetime foundation | 15% | 15% | Accepted | Complete |
| P3 Ingestion observability | 20% | 20% | Accepted | Complete |
| P4 Source compliance and portfolio | 15% | 5% | Source metadata accepted; source review/enforcement pending | Review terms/robots and pause risky or unproductive sources |
| P5 Data quality and triage | 15% | 0% | Not started | Missing-field metrics and better category distribution |
| P6 Reporting and backup hygiene | 10% | 0% | Not started | Daily rollup replaces noisy repeated alert commits |
| P7 Final acceptance and polish | 5% | 0% | Not started | Re-audit and production acceptance |

## Latest Accepted Checkpoint

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

P4 Slice 2: review source terms/robots signals and pause or keep sources based
on conservative evidence.

Acceptance criteria:

- Capture source-review evidence for each configured RSS/HTML source.
- Mark repeatedly broken or non-source-supported sources as `paused` when
  appropriate.
- Keep source metadata conservative: `allowed` only with clear source-supported
  evidence; otherwise `needs_review` or `paused`.
- The app build remains green.
- Data policy/source docs are updated if source metadata changes public claims.
- Existing GitHub Actions remain green.

## Open Risks To Keep Visible

- Some sources may be public but not automation-friendly under their terms.
- Historical date strings remain mixed until the P5 backfill/default-rebuild
  work, though new app-owned writes are canonical UTC ISO.
- CI currently builds but does not deploy automatically; P1 required manual
  Wrangler deployment and P2 required the same.
- The Hunter workflow still commits noisy alert entries for repeated source
  failures; P6 should replace that with a daily rollup.
- `other` category dominance makes browsing weaker than the raw job count
  suggests.
