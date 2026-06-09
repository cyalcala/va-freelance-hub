# Application URL Backfill - 2026-06-09

## Purpose

P5 Slice 3 made `application_url` reliable without changing the public routing
surface. Current job cards still send users through `source_url`; this slice
stores a usable application URL for future improvements and falls back to the
original public source URL when no separate apply URL is known.

## Change

- `apps/web/src/pages/api/ingest.ts` now normalizes incoming rows so
  `applicationUrl` falls back to `sourceUrl`.
- `apps/web/src/pages/api/cron/scrape.ts` now preserves triage-discovered
  `applicationUrl`, then scraper-provided `applicationUrl`, then `sourceUrl`.
- `packages/db/migrations/0012_application_url_backfill.sql` backfilled
  existing rows where `application_url` was empty and `source_url` existed.

## Verification

- Local build: `npm.cmd run build --workspace apps/web` passed.
- Product commit: `2754740` (`fix: derive application urls from source urls`).
- GitHub Actions:
  - CI guardrail run `27203416725` passed.
  - D1 migration run `27203416643` passed.
- Migration evidence:
  - `0012_application_url_backfill.sql` was applied successfully.
  - Pre-Hunter D1 check: 687 active rows, 0 missing `application_url`, 687
    rows with `application_url = source_url`.
- Deployment:
  - Cloudflare Pages preview: `https://936f10a7.remotejobs-ph.pages.dev`.
  - Public alias: `https://remotejobs-ph.pages.dev`.
- Production smoke:
  - `/` returned 200.
  - `/opportunities` returned 200.
  - `/directory` returned 200.
  - unauthenticated POST to `/api/cron/scrape` returned 401.
  - `/api/click/2135` with the validated source URL returned 302 to the source.
- Hunter evidence:
  - Manual Hunter run `27203556963` passed.
  - Response reported `failedSources: []`.
  - Response reported `inserted: 1`, `actualChanges: 1`,
    `acceptedForInsert: 1`, `attemptedInsert: 1`,
    `insertFailedBatches: 0`, and `insertErrors: []`.
- Post-Hunter D1 check:
  - active rows: 688.
  - missing `application_url`: 0.
  - `application_url = source_url`: 687.
  - `application_url <> source_url`: 1.
  - newest Hunter-inserted row `2138` preserved a distinct application URL
    discovered by triage.

## Rollback

If this needs to be reversed before distinct application URLs are adopted in
the UI, use:

```sql
UPDATE opportunities
SET application_url = NULL
WHERE application_url = source_url;
```

Do not run the rollback after the UI starts relying on distinct
`application_url` values without first preserving rows where
`application_url <> source_url`.
