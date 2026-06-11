# System Savepoint

## Current Savepoint

Date: 2026-06-12
Branch: `main`
Repository: `cyalcala/va-freelance-hub`

Last accepted implementation commit:

- `ad03990` - `chore: upgrade wrangler for current cloudflare config`
- Audit report: `docs/wrangler-d1-audit-2026-06-12.md`
- Build: `bun run --cwd apps/web build` passed.
- Install integrity: `bun install --frozen-lockfile` passed.
- CI/deploy run: `27371741236` passed.
- Wrangler: active local CLI reports `4.100.0`.
- D1 local audit:
  - `bunx wrangler d1 info remoteph-jobs-db` passed with no `ratelimits`
    config warning;
  - active opportunities: 748;
  - homepage query plan uses `active_posted_idx`;
  - category query plan uses `category_active_posted_idx`;
  - read-only probes returned `changed_db: false`.
- Production smoke: `/`, `/opportunities`, `/opportunities?page=2`,
  `/directory`, `/data-policy`, `/privacy`, `/categories/tech`, and
  `/categories/tech?page=2` returned 200.
- Protected scrape route: unauthenticated `POST /api/cron/scrape` returned 401.

Previous accepted implementation commit:

- `ae72998` - `chore: stop tracking local wrangler state (F-03)`
- Supporting commits:
  - `e861071` - `fix: reduce D1 scrape insert batch size (F-01)`
  - `45e2f2d` - `fix: paginate category pages server-side (F-02)`
- Generated rollup commit:
  - `6e76c67` - `docs: update daily source health`
- Audit report: `docs/major-audit-2026-06-11.md`
- Build: `bun run --cwd apps/web build` passed.
- CI/deploy runs: `27353756293`, `27353939869`, and `27354017177` passed.
- Production smoke: `/`, `/opportunities`, `/opportunities?page=2`,
  `/directory`, `/data-policy`, `/privacy`, `/categories/tech`, and
  `/categories/tech?page=2` returned 200.
- Category payload: `/categories/tech` dropped from about 980 KB to about
  94 KB after server-side pagination.
- Protected scrape route: unauthenticated `POST /api/cron/scrape` returned 401.
- Hunter recovery evidence:
  - manual run `27354089629` passed with 35 accepted/attempted inserts, 0 failed
    insert batches, 0 insert errors, and 0 failed sources;
  - rollup-writing run `27354219672` passed and refreshed
    `docs/source-health-latest.md`.
- Source-health rollup: `docs/source-health-latest.md` reports 0 failed sources
  and 0 insert errors for run `27354219672`.
- Verification limit resolved by the 2026-06-12 follow-up: local direct
  Wrangler D1 reads now work with Wrangler v4.

Previous accepted implementation commit:

- Final acceptance audit and README update
- Build: `npm.cmd run build --workspace apps/web` passed.
- Production smoke: `/`, `/opportunities`, `/directory`, `/data-policy`,
  `/privacy`, and `/categories/tech` returned 200.
- D1 snapshot: 688 active rows, 0 missing `application_url`, 0 unparseable
  freshness dates.
- Source-health rollup: `docs/source-health-latest.md` reports 0 failed
  sources for run `27204417574`.

Previous accepted implementation commit:

- `0ba92d2` - `ci: add source health rollup`
- GitHub Actions run: `27204381138`
- Hunter workflow run: `27204417574`
- Generated rollup commit: `d4b33a7` - `docs: update daily source health`
- Result: success
- Artifact: `hunter-health-27204417574`
- Artifact ID: `7506838648`
- Repo-readable rollup: `docs/source-health-latest.md`

Earlier accepted implementation commit:

- `f8fadfb` - `ci: stop hunter alert commit spam`
- GitHub Actions run: `27204009191`
- Hunter workflow run: `27204051068`
- Result: success
- Artifact: `hunter-health-27204051068`
- Artifact ID: `7506687492`
- Result: Hunter uploaded `harvest.log` and `source-health-summary.md` without
  creating a bot alert commit.

Earlier accepted product commit:

- `2754740` - `fix: derive application urls from source urls`
- GitHub Actions run: `27203416725`
- D1 migration workflow: `27203416643`
- Hunter workflow run: `27203556963`
- Result: success
- Deployment: `https://936f10a7.remotejobs-ph.pages.dev`
- Public alias: `https://remotejobs-ph.pages.dev`

Earlier accepted product commit:

- `95e6665` - `fix: pause rate limited workable ats sources`
- GitHub Actions run: `27202145473`
- Hunter workflow run: `27202221523`
- Result: success
- Deployment: `https://6b3bc9b2.remotejobs-ph.pages.dev`
- Public alias: `https://remotejobs-ph.pages.dev`

Earlier accepted product commit:

- `1143798` - `feat: enforce source compliance pauses`
- GitHub Actions run: `27200812470`
- Hunter workflow run: `27200899849`
- Result: success
- Deployment: `https://1a74a454.remotejobs-ph.pages.dev`
- Public alias: `https://remotejobs-ph.pages.dev`

Earlier accepted product commit:

- `fa2d6eb` - `feat: add source compliance metadata`
- GitHub Actions run: `27199810692`
- Hunter workflow run: `27199890298`
- Result: success
- Deployment: `https://1896b637.remotejobs-ph.pages.dev`
- Public alias: `https://remotejobs-ph.pages.dev`

Earlier accepted product commit:

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
- Review RSS/HTML source evidence, pause risky or unproductive sources, and
  report paused sources as skipped in live scrape results.
- De-duplicate ATS source fetches and pause Workable-backed ATS sources after
  repeated HTTP 429s.
- Capture a read-only production data-quality snapshot for P5 Slice 1.
- Define a no-mutation stale/source dry-run policy for P5 Slice 2.
- Backfill missing `application_url` values from `source_url` and ensure future
  ingest/scrape writes populate `application_url`.
- Stop Hunter from committing per-run scraper alerts and preserve per-run
  source-health evidence as artifacts instead.
- Add guarded daily/manual source-health rollup in
  `docs/source-health-latest.md`.
- Complete final acceptance audit and align README with current production
  architecture.
- Fix Hunter D1 insert batching after scheduled runs failed with
  `too many SQL variables`.
- Paginate category pages server-side to avoid hydrating large all-category job
  payloads.
- Stop tracking local `.wrangler` D1 runtime state.
- Refresh the source-health latest rollup after Hunter recovery.
- Upgrade active Wrangler tooling to v4 and restore local direct D1 audits.
- Accepted completion: 100%.

Next pending work:

- Optional future roadmap only. No required recovery-roadmap work remains.
- Continue optional source policy, data quality, and reporting hardening.
- For local D1 audits, use Wrangler v4 command shapes recorded in
  `docs/wrangler-d1-audit-2026-06-12.md`.

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

Accepted P4 source pause enforcement:

- Commit: `1143798`
- Source review evidence: `docs/source-review-2026-06-09.md`
- Build: `npm.cmd run build --workspace apps/web` passed.
- GitHub Actions: `27200812470` passed.
- Cloudflare deploy: `https://1a74a454.remotejobs-ph.pages.dev`.
- Production smoke:
  - `/`: 200, about 187 KB.
  - `/opportunities`: 200, about 96 KB.
  - `/directory`: 200, about 272 KB.
  - `/data-policy`: 200.
  - `/api/cron/scrape` returned 401 without credentials.
- Live Hunter workflow:
  - run `27200899849` passed.
  - response reported `failedSources: []`.
  - We Work Remotely fetched as `allowed` with 100 RSS items.
  - Remotive fetched as `allowed` with 29 RSS items.
  - ProBlogger, Remote.co, Authentic Jobs, Dribbble Jobs, OnlineJobs.ph, and
    Jobspresso were visible as `skipped: true` with pause reasons.
  - `insertFailedBatches: 0` and `insertErrors: []`.
- D1 evidence:
  - active opportunity count after latest Hunter run: 687.
  - read-only D1 count query changed 0 rows.

Accepted P4 ATS source policy implementation:

- Final commit: `95e6665`
- Supporting commits:
  - `e3714d8` - `fix: dedupe duplicate ats source fetches`
  - `3256127` - `fix: throttle ats source polling`
- ATS source review evidence: `docs/ats-source-review-2026-06-09.md`
- Build: `npm.cmd run build --workspace apps/web` passed.
- GitHub Actions: `27202145473` passed.
- Cloudflare deploy: `https://6b3bc9b2.remotejobs-ph.pages.dev`.
- Production smoke:
  - `/`: 200, about 187 KB.
  - `/opportunities`: 200, about 96 KB.
  - `/directory`: 200, about 272 KB.
  - `/api/cron/scrape` returned 401 without credentials.
- Live Hunter workflow:
  - run `27202221523` passed.
  - response reported `failedSources: []`.
  - Breezy ATS results included `20Four7VA` with 61 items, `Sourcefit` with 67
    items, and `VAA Philippines` with 0 items.
  - 11 Workable-backed directory rows were skipped as `paused` after repeated
    HTTP 429s.
  - `24/7 Virtual Assistant` was skipped because `breezy:20four7va` was already
    fetched for `20Four7VA`.
  - `insertFailedBatches: 0` and `insertErrors: []`.
- D1 evidence:
  - active opportunity count after latest Hunter run: 687.
  - read-only D1 count query changed 0 rows.

Accepted P5 data-quality snapshot:

- Snapshot: `docs/data-quality-snapshot-2026-06-09.md`
- Verification:
  - D1 queries were read-only and returned `changed_db: false`.
  - `git diff --check` passed with only normal CRLF warnings.
- Key production metrics:
  - active opportunities: 687.
  - duplicate `source_url`, `content_hash`, and non-empty `description_hash`
    groups: 0 each.
  - missing `company`: 95.
  - missing `pay_range`: 524.
  - missing `client_timezone`: 687.
  - missing `application_url`: 687.
  - missing `experience_level`: 522.
  - missing `posted_at`: 62.
  - missing `description_hash`: 507.
  - category `other`: 531.
  - posted older than 30 days: 247.
  - currently enabled source rows: 497.
  - now-paused source rows: 185.
  - unclassified source rows: 5 (`RemoteOK`).

Accepted P5 stale policy dry run:

- Dry-run report: `docs/stale-policy-dry-run-2026-06-09.md`
- Verification:
  - D1 queries were read-only and returned `changed_db: false`.
  - `git diff --check` passed with only normal CRLF warnings.
- Dry-run action counts:
  - `keep_enabled_source`: 497 rows.
  - `hold_paused_recently_seen`: 175 rows.
  - `review_paused_missing_last_seen`: 10 rows.
  - `classify_source_before_action`: 5 rows.
- Decision:
  - no rows should be archived immediately;
  - now-paused sources get a grace window;
  - `RemoteOK` must be classified before action.

Accepted Lens 2 implementation:

- Final commit: `f5b9827`
- Build: `bun run build` passed.
- GitHub Actions: run `27207069121` passed, deploying to Cloudflare Pages automatically.
- Production smoke:
  - `/` returned 200, renders the new `FINANCE & ACCOUNTING` card.
  - `/opportunities` and `/directory` returned 200.
- D1 evidence:
  - Backfilled D1 categories, reducing `other` jobs count from 532 to 47.
  - Staggered Workable rotation polling correctly saves `verifiedAt` timestamps in D1.

## Production Baseline From Audit

- Public site: `https://remotejobs-ph.pages.dev`
- `/`: 200, roughly 187 KB HTML after final P4 source policy deploy
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

- Local direct D1 audit commands now work with Wrangler v4; keep using the
  command shapes documented in `docs/wrangler-d1-audit-2026-06-12.md`.
- Source health is visible in scrape responses, workflow artifacts, and the
  latest rollup, but not yet persisted as long-term D1 history.
- Several ATS sources remain `needs_review` and need source-specific policy
  review before being treated as fully approved.

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
