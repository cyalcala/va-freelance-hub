# Handoff

## Current State

Date: 2026-06-09
Status: Recovery roadmap complete
Overall accepted completion: 100%
Active branch: `main`

The user resumed the original roadmap and approved continuing slice by slice.
P1 was implemented, pushed, passed CI, manually deployed, and smoked in
production. P2 indexes were implemented, pushed, migrated, and verified against
production query plans. P2 timestamp normalization was implemented, pushed,
deployed, and verified against production route smoke plus read-only D1 parsing
evidence. P3 Slice 1 added structured source results to the scrape route,
deployed it, and verified it through a manual Hunter workflow run. P3 Slice 2
made `inserted` reflect actual D1 changes and exposed failed insert batches and
insert errors in the scrape response. P3 Slice 3 added Hunter workflow warnings
and summary metrics for partial source failures, zero-count sources, and insert
accounting. P4 Slice 1 added conservative source compliance metadata and updated
the public data policy language. P4 Slice 2 reviewed RSS/HTML source evidence,
paused risky or unproductive sources, and kept paused sources visible as skipped
records in live scrape results. P4 Slice 3 de-duplicated ATS source fetches,
paused Workable-backed ATS rows after repeated HTTP 429s, and verified the live
Hunter workflow with no failed sources. P5 Slice 1 captured a read-only
production data-quality snapshot and made no production row mutations. P5 Slice
2 defined a no-mutation stale/source dry-run policy and found no immediate
archive action. P5 Slice 3 backfilled `application_url` from `source_url`,
updated future ingest/scrape writes to populate it, deployed the write path, and
proved the next Hunter insertion kept `application_url` populated. P6 Slice 1
removed Hunter's per-run alert commit/push path and now stores per-run
`harvest.log` plus `source-health-summary.md` artifacts. P6 Slice 2 added a
guarded daily/manual repo-readable rollup at `docs/source-health-latest.md`.
P7 completed the final acceptance audit and updated the README to match the
current production architecture and public-source policy.

## What Was Completed

- Major audit was documented in `docs/major-audit-2026-06-06.md`.
- Recovery-driven methodology was adopted.
- Active architecture was corrected in `AGENTS.md`.
- Roadmap, status, recovery trail, savepoint, and ADR were added.
- P0 is accepted at 5%.
- P1 is accepted at 20% overall.
- P2 is accepted at 35% overall.
- P3 Slice 1 is accepted at 40% overall.
- P3 Slice 2 is accepted at 45% overall.
- P3 is accepted at 55% overall.
- P4 Slice 1 is accepted at 60% overall.
- P4 Slice 2 is accepted at 65% overall.
- P4 is accepted at 70% overall.
- P5 Slice 1 is accepted at 75% overall.
- P5 Slice 2 is accepted at 80% overall.
- P5 Slice 3 is accepted at 85% overall.
- P6 Slice 1 is accepted at 90% overall.
- P6 Slice 2 is accepted at 95% overall.
- P7 is accepted at 100% overall.

Accepted P0 evidence:

- Commit: `9657c4a`
- CI run: `27040684807`
- Acceptance docs commit: `a6fcf70`
- CI run: `27040764996`

Accepted pause handoff evidence:

- Commit: `431ab60`
- CI run: `27041163556`
- Scope: docs-only recovery trail; no implementation files changed.

## What Was Completed In P1

- Added `apps/web/src/pages/opportunities.astro`.
- Reused existing opportunity cards and visual styling.
- Added server-side search/filtering and pagination to `/opportunities`.
- Changed homepage query limit from 500 to 60.
- Made the homepage a preview rather than the full search surface.
- Moved the global "Find a Job Now" CTA to `/opportunities`.
- Build passed with `npm.cmd run build --workspace apps/web`.
- Local route smoke passed for `/`, `/opportunities`, paginated/filter URLs,
  and `/directory`.
- Pushed commit `2475103`.
- GitHub Actions run `27141658140` passed.
- Deployed with Wrangler to `https://68b1259d.remotejobs-ph.pages.dev`.
- Public alias `https://remotejobs-ph.pages.dev/opportunities` returned 200.

## P1 Exploration Notes

Files read during P1 exploration:

- `apps/web/src/pages/index.astro`
- `apps/web/src/components/OpportunitySearch.tsx`
- `apps/web/src/pages/categories/[category].astro`
- `apps/web/src/components/CategoryOpportunitySearch.tsx`
- `apps/web/src/components/opportunity-card.tsx`
- `apps/web/src/lib/categories.ts`
- `apps/web/src/layouts/Layout.astro`
- `apps/web/src/components/nav.tsx`
- `apps/web/src/components/footer.tsx`
- `apps/web/astro.config.mjs`
- `packages/db/schema.ts`

Observed P1 facts:

- Homepage currently selects up to 500 active opportunities and hydrates them
  into `OpportunitySearch`.
- `/opportunities` is linked in navigation but has no active Astro page.
- Category pages already have a search/list pattern that can be reused.
- The simplest next slice is to add an Astro `/opportunities` page and reduce
  homepage data volume to a smaller latest-jobs preview.

## Next Safe Resume Task

No required recovery-roadmap work remains. Start a new optional roadmap for
future data quality, source portfolio, or deploy automation work.

Known follow-up: CI currently builds but does not deploy automatically. P1, P2,
and P3 needed manual Wrangler deployments after CI passed.

P7 evidence:

- Final audit report: `docs/final-acceptance-audit-2026-06-09.md`
- Build: `npm.cmd run build --workspace apps/web` passed.
- Production smoke:
  - `/`, `/opportunities`, `/directory`, `/data-policy`, `/privacy`, and
    `/categories/tech` returned 200;
  - unauthenticated POST to `/api/cron/scrape` returned 401.
- D1 snapshot:
  - 688 active opportunities;
  - 0 missing `application_url`;
  - 0 unparseable freshness dates.
- Query plans:
  - homepage query uses `active_posted_idx`;
  - category query uses `category_active_posted_idx`.
- Source health:
  - `docs/source-health-latest.md` reports 0 failed sources for run
    `27204417574`.
- README:
  - replaced stale Next/old-source/pnpm language with current Bun,
    Astro/Cloudflare/D1, public-source indexing, and recovery-doc language.

P6 Slice 2 evidence:

- Workflow commit: `0ba92d2`
- CI run: `27204381138`
- Manual Hunter run: `27204417574` with `write_rollup=true`
- Hunter result: success.
- Artifact:
  - name: `hunter-health-27204417574`;
  - ID: `7506838648`.
- Generated rollup commit:
  - `d4b33a7` - `docs: update daily source health`;
  - created `docs/source-health-latest.md`.
- Live response:
  - HTTP 200;
  - `failedSources: []`;
  - `inserted: 0`;
  - `actualChanges: 0`;
  - `acceptedForInsert: 0`;
  - `attemptedInsert: 0`;
  - `insertFailedBatches: 0`;
  - `insertErrors: []`.
- Repo-readable rollup:
  - date: 2026-06-09;
  - run: `https://github.com/cyalcala/va-freelance-hub/actions/runs/27204417574`;
  - 0 failed sources;
  - 1 zero-count successful source;
  - 18 skipped sources.

P6 Slice 1 evidence:

- Commit: `f8fadfb`
- CI run: `27204009191`
- Manual Hunter run: `27204051068`
- Hunter result: success.
- Artifact:
  - name: `hunter-health-27204051068`;
  - ID: `7506687492`;
  - files: `harvest.log` and `source-health-summary.md`.
- Verification:
  - `git diff --check` passed with only normal CRLF warnings;
  - `rg` confirmed Hunter no longer contains `contents: write`, `git commit`,
    `git push`, or `scraper-alerts` references;
  - downloaded artifact summary reported 0 failed sources, 1 zero-count
    successful source, and 18 skipped sources;
  - after fetching `origin/main`, branch status was `## main...origin/main`,
    confirming no bot alert commit was created.
- Live response:
  - HTTP 200;
  - `failedSources: []`;
  - `inserted: 0`;
  - `actualChanges: 0`;
  - `acceptedForInsert: 0`;
  - `attemptedInsert: 0`;
  - `insertFailedBatches: 0`;
  - `insertErrors: []`.

P5 Slice 3 evidence:

- Commit: `2754740`
- CI run: `27203416725`
- Migration workflow: `27203416643`
- Build: `npm.cmd run build --workspace apps/web` passed.
- Deploy: `https://936f10a7.remotejobs-ph.pages.dev`
- Manual Hunter run: `27203556963`
- Hunter result: success.
- D1 evidence:
  - after migration: 687 active rows and 0 missing `application_url`;
  - after Hunter: 688 active rows and 0 missing `application_url`;
  - newest Hunter row `2138` preserved a distinct application URL from triage.
- Live response:
  - HTTP 200;
  - `failedSources: []`;
  - `inserted: 1`;
  - `actualChanges: 1`;
  - `acceptedForInsert: 1`;
  - `attemptedInsert: 1`;
  - `insertFailedBatches: 0`;
  - `insertErrors: []`.
- Public smoke:
  - `/`, `/opportunities`, and `/directory` returned 200;
  - `/api/cron/scrape` returned 401 without credentials;
  - `/api/click/2135` with the validated source URL returned 302.

P2 Slice 1 evidence:

- Commit: `be3d646`
- Migration workflow: `27155847940`
- CI run: `27155847992`
- Before: hot queries used temp B-trees.
- After: hot queries use `active_posted_idx`,
  `category_active_posted_idx`, and `active_last_verified_idx`.

P2 Slice 2 evidence:

- Commit: `e32e580`
- CI run: `27165936753`
- Build: `npm.cmd run build --workspace apps/web` passed.
- Deploy: `https://4bb0cf93.remotejobs-ph.pages.dev`
- Public smoke: `/`, `/opportunities`, `/opportunities?page=2`, and
  `/directory` returned 200.
- Protected API smoke: `/api/cron/scrape`, `/api/cron/verify-links`,
  `/api/ingest`, and `/api/ingest-digest` returned 401 without credentials.
- D1 read-only evidence: 672 active opportunities and 0 unparseable active
  values for `scraped_at`, `last_seen_in_feed_at`, and `last_verified_at` when
  parsed through SQLite `unixepoch`.
- ADR: `docs/decisions/ADR-002-canonical-utc-iso-timestamps.md`

P3 Slice 1 evidence:

- Commit: `27794d8`
- CI run: `27166648567`
- Build: `npm.cmd run build --workspace apps/web` passed.
- Deploy: `https://44501583.remotejobs-ph.pages.dev`
- Manual Hunter run: `27166770708`
- Hunter result: success.
- Live response:
  - HTTP 200;
  - inserted 11 jobs;
  - `actualChanges: 11`;
  - `backlogRemaining: 0`;
  - included `sourceResults` for RSS, HTML, and ATS sources;
  - preserved `failedSources`;
  - Remote.co was visible as `ok: false` with HTTP 520;
  - zero-count sources were visible as `ok: true`.
- Workflow follow-up: bot committed `ca1f06d` to
  `docs/scraper-alerts.md` for the Remote.co failure.
- D1 read-only evidence: active opportunities count was 683 after the manual
  Hunter run.

P3 Slice 2 evidence:

- Commit: `e86b854`
- CI run: `27167396371`
- Build: `npm.cmd run build --workspace apps/web` passed.
- Deploy: `https://cde106a3.remotejobs-ph.pages.dev`
- Manual Hunter run: `27198077806`
- Hunter result: success.
- Live response:
  - HTTP 200;
  - `inserted: 1`;
  - `actualChanges: 1`;
  - `acceptedForInsert: 1`;
  - `attemptedInsert: 1`;
  - `insertFailedBatches: 0`;
  - `insertErrors: []`;
  - Remote.co remained visible as a partial source failure.
- Workflow follow-up: bot committed `bc255c8` to
  `docs/scraper-alerts.md` for the Remote.co failure.
- D1 read-only evidence: active opportunities count was 686 after later
  scheduled/manual ingestion.

P3 Slice 3 evidence:

- Commit: `e0a32fb`
- CI run: `27198767290`
- Manual Hunter run: `27198807621`
- Hunter result: success.
- Annotation evidence: warning emitted with
  `1 source(s) failed. See sourceResults in harvest.log.`
- Live response:
  - HTTP 200;
  - `inserted: 1`;
  - `actualChanges: 1`;
  - `acceptedForInsert: 1`;
  - `attemptedInsert: 1`;
  - `insertFailedBatches: 0`;
  - `insertErrors: []`.
- Summary evidence: workflow wrote failed-source, zero-count source, failed
  insert batch, and insert error metrics to the GitHub step summary.
- Workflow follow-up: bot committed `baf2bd8` to
  `docs/scraper-alerts.md` for the Remote.co failure.
- D1 read-only evidence: active opportunities count was 687 after the latest
  manual Hunter run.

P4 Slice 1 evidence:

- Commit: `fa2d6eb`
- CI run: `27199810692`
- Build: `npm.cmd run build --workspace apps/web` passed.
- Deploy: `https://1896b637.remotejobs-ph.pages.dev`
- Manual Hunter run: `27199890298`
- Hunter result: success.
- Live response:
  - included `collectionMethod` and `complianceStatus` for RSS, HTML, and ATS
    source results;
  - all configured sources and ATS results are conservatively `needs_review`;
  - Remote.co remained visible as a partial source failure.
- Public smoke:
  - `/data-policy` returned 200;
  - page included the June 2026 update and public-visibility caution text;
  - `/api/cron/scrape` returned 401 without credentials.
- Workflow follow-up: bot committed `3174068` to
  `docs/scraper-alerts.md` for the Remote.co failure.
- D1 read-only evidence: active opportunities count was 687 after the latest
  manual Hunter run.

P4 Slice 2 evidence:

- Commit: `1143798`
- CI run: `27200812470`
- Build: `npm.cmd run build --workspace apps/web` passed.
- Deploy: `https://1a74a454.remotejobs-ph.pages.dev`
- Manual Hunter run: `27200899849`
- Hunter result: success.
- Source review doc: `docs/source-review-2026-06-09.md`
- Source decisions:
  - We Work Remotely and Remotive remain enabled as `allowed` RSS sources with
    attribution/linkback notes;
  - ProBlogger, Remote.co, Authentic Jobs, Dribbble Jobs, OnlineJobs.ph, and
    Jobspresso are paused.
- Live response:
  - HTTP 200;
  - `failedSources: []`;
  - We Work Remotely returned 100 RSS items;
  - Remotive returned 29 RSS items;
  - six paused sources returned `skipped: true` with pause reasons;
  - `inserted: 0`;
  - `actualChanges: 0`;
  - `insertFailedBatches: 0`;
  - `insertErrors: []`.
- Public smoke:
  - `/`, `/opportunities`, `/directory`, and `/data-policy` returned 200;
  - `/api/cron/scrape` returned 401 without credentials.
- D1 read-only evidence: active opportunities count was 687 after the latest
  manual Hunter run, with 0 row changes.

P4 Slice 3 evidence:

- Final commit: `95e6665`
- Supporting commits:
  - `e3714d8` - de-duplicated duplicate ATS token fetches.
  - `3256127` - throttled ATS polling after first Workable 429 proof.
- CI run: `27202145473`
- Build: `npm.cmd run build --workspace apps/web` passed.
- Deploy: `https://6b3bc9b2.remotejobs-ph.pages.dev`
- Manual Hunter run: `27202221523`
- Hunter result: success with no partial-failure annotation.
- ATS source review doc: `docs/ats-source-review-2026-06-09.md`
- Live response:
  - HTTP 200;
  - `failedSources: []`;
  - Breezy ATS fetched `20Four7VA` with 61 items, `Sourcefit` with 67 items,
    and `VAA Philippines` with 0 items;
  - 11 Workable-backed directory rows returned `skipped: true` with
    `complianceStatus: "paused"`;
  - `24/7 Virtual Assistant` returned `skipped: true` because the
    `breezy:20four7va` token was already fetched for `20Four7VA`;
  - `inserted: 0`;
  - `actualChanges: 0`;
  - `insertFailedBatches: 0`;
  - `insertErrors: []`.
- Public smoke:
  - `/`, `/opportunities`, and `/directory` returned 200;
  - `/api/cron/scrape` returned 401 without credentials.
- D1 read-only evidence: active opportunities count was 687 after the latest
  manual Hunter run, with 0 row changes.

P5 Slice 1 evidence:

- Snapshot doc: `docs/data-quality-snapshot-2026-06-09.md`
- D1 query mode: read-only; all sampled queries returned `changed_db: false`.
- Active opportunities: 687.
- Duplicate `source_url`, `content_hash`, and non-empty `description_hash`
  groups: 0 each.
- Missing fields:
  - `company`: 95;
  - `pay_range`: 524;
  - `client_timezone`: 687;
  - `application_url`: 687;
  - `experience_level`: 522;
  - `posted_at`: 62;
  - `description_hash`: 507;
  - `last_seen_in_feed_at`: 124.
- Freshness:
  - `posted_at` unparseable: 0;
  - posted older than 30 days: 247;
  - posted older than 60 days: 111;
  - posted older than 90 days: 81;
  - last seen in feed older than 30 days: 0.
- Category distribution:
  - `other`: 531;
  - `tech`: 86;
  - `admin`: 31;
  - `customer-service`: 20;
  - `design`: 18;
  - `marketing`: 1.
- Source policy split:
  - currently enabled source rows: 497;
  - now-paused source rows: 185;
  - unclassified source rows: 5 (`RemoteOK`).

P5 Slice 2 evidence:

- Dry-run report: `docs/stale-policy-dry-run-2026-06-09.md`
- D1 query mode: read-only; all sampled queries returned `changed_db: false`.
- Dry-run actions:
  - `keep_enabled_source`: 497 rows;
  - `hold_paused_recently_seen`: 175 rows;
  - `review_paused_missing_last_seen`: 10 rows;
  - `classify_source_before_action`: 5 rows.
- Candidate buckets:
  - paused-source rows missing `last_seen_in_feed_at`: 10;
  - unclassified `RemoteOK` rows: 5.
- Decision: no immediate production archival; hold recently seen paused-source
  rows through a grace window and classify `RemoteOK` first.

P5 Slice 3 suggested scope:

- Implement one reversible data-quality improvement.
- Good low-risk candidates:
  - derive `application_url` from `source_url` with before/after counts; or
  - add a repeatable stale-candidate script/endpoint; or
  - improve category triage for the highest-volume `other` source path.
- Do not archive production rows until the pause grace-window policy is
  reviewed.

## Stop Rule

If the user says stop, pause, or backup, stop implementation and only update
handoff/status docs plus GitHub backup evidence.
