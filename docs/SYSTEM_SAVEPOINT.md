# System Savepoint

## Current Savepoint

Date: 2026-06-09
Branch: `main`
Repository: `cyalcala/va-freelance-hub`

Last accepted product commit:

- `fa2d6eb` - `feat: add source compliance metadata`
- GitHub Actions run: `27199810692`
- Hunter workflow run: `27199890298`
- Result: success
- Deployment: `https://1896b637.remotejobs-ph.pages.dev`
- Public alias: `https://remotejobs-ph.pages.dev`

Previous accepted product commit:

- `e0a32fb` - `ci: surface hunter scrape health`
- GitHub Actions run: `27198767290`
- Hunter workflow run: `27198807621`
- Result: success

Earlier accepted product commit:

- `e86b854` - `fix: report actual scrape inserts`
- GitHub Actions run: `27167396371`
- Hunter workflow run: `27198077806`
- Result: success
- Deployment: `https://cde106a3.remotejobs-ph.pages.dev`
- Public alias: `https://remotejobs-ph.pages.dev`

Earlier accepted product commit:

- `27794d8` - `feat: report source scrape status`
- GitHub Actions run: `27166648567`
- Hunter workflow run: `27166770708`
- Result: success
- Deployment: `https://44501583.remotejobs-ph.pages.dev`
- Public alias: `https://remotejobs-ph.pages.dev`

Earlier accepted product commit:

- `e32e580` - `feat: normalize app timestamp writes`
- GitHub Actions run: `27165936753`
- Result: success
- Deployment: `https://4bb0cf93.remotejobs-ph.pages.dev`
- Public alias: `https://remotejobs-ph.pages.dev`

Earlier accepted product commit:

- `be3d646` - `feat: add query aligned opportunity indexes`
- Migration workflow: `27155847940`
- GitHub Actions run: `27155847992`
- Result: success

Earlier accepted product commit:

- `2475103` - `feat: add paginated opportunities board`
- GitHub Actions run: `27141658140`
- Result: success
- Deployment: `https://68b1259d.remotejobs-ph.pages.dev`
- Public alias: `https://remotejobs-ph.pages.dev`

Last accepted docs commit:

- `431ab60` - `docs: add paused ai recovery handoff`
- GitHub Actions run: `27041163556`
- Result: success

Previous accepted methodology commit:

- `9657c4a` - `docs: adopt recovery-driven execution plan`
- GitHub Actions run: `27040684807`
- Result: success

Previous accepted audit commit:

- `74c0416` - `docs: add major audit and agent instructions`
- GitHub Actions run: `27039365056`
- Result: success

Current accepted work:

- Adopt recovery-driven execution methodology.
- Add master roadmap, implementation status, recovery trail, and ADR.
- Update agent context to the active Cloudflare/Astro/D1 architecture.
- Add `/opportunities` as the canonical paginated board.
- Reduce homepage payload from a 500-row hydrated board to a 60-row preview.
- Deploy and smoke production.
- Add production D1 indexes for active posted order, category active posted
  order, and active verification order.
- Normalize app-owned opportunity and digest timestamp writes to UTC ISO.
- Change stale comparisons to parse historical SQLite timestamps and new ISO
  timestamps through SQLite `unixepoch`.
- Add structured `sourceResults` to the scrape route and make ATS fetch errors
  visible as failed source records.
- Report actual D1 changes as the primary scrape `inserted` count and expose
  insert batch errors in the scrape response.
- Add Hunter workflow warning annotations and summary metrics for source
  failures, zero-count sources, insert counts, and insert errors.
- Add conservative source compliance metadata and update the public data policy
  to avoid treating public visibility as blanket permission.
- Accepted completion: 60%.

Next pending work:

- P4 Slice 2: review source terms/robots signals and pause or keep sources based
  on conservative evidence.
- CI deploy automation remains a known follow-up because P1 required manual
  Wrangler deployment after CI passed and P2/P3 required the same.

Current handoff files:

- `docs/DOCS_INDEX.md`
- `docs/HANDOFF.md`
- `CLAUDE.md`

Pause acceptance:

- Commit: `431ab60`
- GitHub Actions run: `27041163556`
- Result: success

Accepted P1 implementation:

- Commit: `2475103`
- Build: `npm.cmd run build --workspace apps/web` passed.
- Local smoke: `/`, `/opportunities`, `/opportunities?page=2`,
  `/opportunities?category=tech`, and `/directory` returned 200 on local Astro.
- GitHub Actions: `27141658140` passed.
- Cloudflare deploy: `https://68b1259d.remotejobs-ph.pages.dev`.
- Production smoke:
  - `/`: 200, about 183 KB.
  - `/opportunities`: 200, about 97 KB.
  - `/directory`: 200.

Accepted P2 index implementation:

- Commit: `be3d646`
- Migration: `packages/db/migrations/0011_query_aligned_indexes.sql`
- Migration workflow: `27155847940`
- CI run: `27155847992`
- Before: three hot query plans used temp B-trees for ordering.
- After:
  - homepage query uses `active_posted_idx`;
  - category query uses `category_active_posted_idx`;
  - verifier query uses `active_last_verified_idx`;
  - no temp B-tree appears in the sampled hot query plans.

Accepted P2 timestamp implementation:

- Commit: `e32e580`
- ADR: `docs/decisions/ADR-002-canonical-utc-iso-timestamps.md`
- Build: `npm.cmd run build --workspace apps/web` passed.
- GitHub Actions: `27165936753` passed.
- Cloudflare deploy: `https://4bb0cf93.remotejobs-ph.pages.dev`.
- Production smoke:
  - `/`: 200, about 181 KB.
  - `/opportunities`: 200, about 96 KB.
  - `/opportunities?page=2`: 200, about 97 KB.
  - `/directory`: 200.
  - protected cron/ingest routes returned 401 without credentials.
- D1 evidence:
  - active opportunity count: 672 at verification time.
  - `unixepoch` parsed active `scraped_at`, `last_seen_in_feed_at`, and
    `last_verified_at` rows with 0 unparseable values.
  - read-only D1 evidence changed 0 rows.

Accepted P3 source-status implementation:

- Commit: `27794d8`
- Build: `npm.cmd run build --workspace apps/web` passed.
- GitHub Actions: `27166648567` passed.
- Cloudflare deploy: `https://44501583.remotejobs-ph.pages.dev`.
- Production smoke:
  - `/`: 200, about 181 KB.
  - `/opportunities`: 200, about 96 KB.
  - `/directory`: 200.
  - `/api/cron/scrape` returned 401 without credentials.
- Live Hunter workflow:
  - run `27166770708` passed.
  - response returned `sourceResults` and preserved `failedSources`.
  - Remote.co was explicitly `ok: false` with HTTP 520.
  - zero-count sources were distinguishable as `ok: true`.
  - inserted 11 jobs with `actualChanges: 11` and `backlogRemaining: 0`.
  - workflow produced scraper-alert commit `ca1f06d`.
- D1 evidence:
  - active opportunity count after Hunter: 683.
  - read-only D1 count query changed 0 rows.

Accepted P3 insert-accounting implementation:

- Commit: `e86b854`
- Build: `npm.cmd run build --workspace apps/web` passed.
- GitHub Actions: `27167396371` passed.
- Cloudflare deploy: `https://cde106a3.remotejobs-ph.pages.dev`.
- Production smoke:
  - `/`: 200, about 186 KB.
  - `/opportunities`: 200, about 96 KB.
  - `/directory`: 200.
  - `/api/cron/scrape` returned 401 without credentials.
- Live Hunter workflow:
  - run `27198077806` passed.
  - response reported `inserted: 1`, `actualChanges: 1`,
    `acceptedForInsert: 1`, `attemptedInsert: 1`,
    `insertFailedBatches: 0`, and `insertErrors: []`.
  - Remote.co remained explicitly visible as a partial source failure.
  - workflow produced scraper-alert commit `bc255c8`.
- D1 evidence:
  - active opportunity count after later scheduled/manual ingestion: 686.
  - read-only D1 count query changed 0 rows.

Accepted P3 workflow annotation implementation:

- Commit: `e0a32fb`
- GitHub Actions: `27198767290` passed.
- Live Hunter workflow:
  - run `27198807621` passed.
  - warning annotation emitted:
    `1 source(s) failed. See sourceResults in harvest.log.`
  - response reported `inserted: 1`, `actualChanges: 1`,
    `acceptedForInsert: 1`, `attemptedInsert: 1`,
    `insertFailedBatches: 0`, and `insertErrors: []`.
  - summary step wrote source failure, zero-count source, and insert accounting
    metrics.
  - workflow produced scraper-alert commit `baf2bd8`.
- D1 evidence:
  - active opportunity count after latest Hunter run: 687.
  - read-only D1 count query changed 0 rows.

Accepted P4 source metadata implementation:

- Commit: `fa2d6eb`
- Build: `npm.cmd run build --workspace apps/web` passed.
- GitHub Actions: `27199810692` passed.
- Cloudflare deploy: `https://1896b637.remotejobs-ph.pages.dev`.
- Production smoke:
  - `/`: 200, about 187 KB.
  - `/opportunities`: 200, about 96 KB.
  - `/data-policy`: 200 with June 2026/public-visibility caution text.
  - `/api/cron/scrape` returned 401 without credentials.
- Live Hunter workflow:
  - run `27199890298` passed.
  - response included `collectionMethod` and `complianceStatus` for RSS, HTML,
    and ATS source results.
  - configured sources and ATS results are conservatively `needs_review`.
  - workflow produced scraper-alert commit `3174068`.
- D1 evidence:
  - active opportunity count after latest Hunter run: 687.
  - read-only D1 count query changed 0 rows.

## Production Baseline From Audit

- Public site: `https://remotejobs-ph.pages.dev`
- `/`: 200, roughly 187 KB HTML after P4 source metadata deploy
- `/directory`: 200
- `/categories/tech`: 200
- `/opportunities`: 200
- Authenticated cron/API routes reject unauthenticated calls with 401

## Data Baseline From Audit

- Opportunities: 635 total, 635 active
- Directory companies: 238 total
- ATS-enabled companies: 15
- Content digests: 0
- Active jobs never link-verified: 184
- Active jobs older than 30 days by `posted_at`: 209
- Active jobs missing application URL: 635
- Active jobs missing client timezone: 635
- Active jobs in `other`: 523

## Known Healthy Controls

- GitHub repository is public and active.
- CI guardrail is green at the latest accepted checkpoint.
- Build passed locally during the major audit.
- Cron/API routes require authentication.
- Duplicate `source_url`, `content_hash`, and non-null `description_hash` counts
  were zero in the audit snapshot.

## Known Weak Controls

- Source failures are committed too noisily into `docs/scraper-alerts.md`.
- Source status is now visible in scrape responses, but not yet persisted in a
  source-health table or summarized in daily rollups.
- CI guardrail builds but does not deploy; manual Wrangler deploy was needed for
  P1, P2, and P3.
- Batch insert failures now surface in scrape responses and workflow annotations,
  but are not yet persisted outside workflow logs and alert commits.
- Historical dates still need P5 backfill/default cleanup, but new app-owned
  opportunity and digest writes use UTC ISO.
- Source compliance states are not yet explicit enough.

## Recovery Command Hints

Common local checks:

```bash
git status --short --branch
bun run build
git diff --check
```

Common GitHub checks:

```bash
gh run list --repo cyalcala/va-freelance-hub --limit 10
gh run view <run-id> --repo cyalcala/va-freelance-hub --log-failed
```

Common production smoke checks:

```bash
curl -I https://remotejobs-ph.pages.dev/
curl -I https://remotejobs-ph.pages.dev/directory
curl -I https://remotejobs-ph.pages.dev/opportunities
```

Use read-only D1 queries for data checks. Never mutate production data during an
audit unless the task explicitly calls for a migration or repair and the change
has been backed up in Git.
