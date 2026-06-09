# Handoff

## Current State

Date: 2026-06-09
Status: P4 accepted, P5 data quality and triage metrics next
Overall accepted completion: 70%
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
Hunter workflow with no failed sources.

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

P5 Slice 1: add data-quality and stale-source metrics.

Known follow-up: CI currently builds but does not deploy automatically. P1, P2,
and P3 needed manual Wrangler deployments after CI passed.

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

P5 Slice 1 suggested scope:

- Add or document a repeatable data-quality snapshot for missing company, pay,
  timezone, application URL, experience level, posted date, description hash,
  and stale source/platform distribution.
- Separate historical rows from now-paused sources from currently enabled
  ingestion sources.
- Do not mutate/archive production rows until the metrics and stale policy are
  documented.

## Stop Rule

If the user says stop, pause, or backup, stop implementation and only update
handoff/status docs plus GitHub backup evidence.
