# Major Audit - 2026-06-06

This audit reviewed GitHub Actions, ingestion, triage, upload/write paths, indexing,
live production data quality, stale data handling, latency, silent errors, and backup
state for `cyalcala/va-freelance-hub`.

## Current State

- Repository: `cyalcala/va-freelance-hub`
- Default branch: `main`
- Production target observed: Cloudflare Pages + D1, not the older Next.js/Vercel plan.
- Local build verification: `bun run build` passed.
- Live public checks:
  - `/`: 200, about 1.75 MB HTML, about 1.7 to 2.2 seconds from Manila edge checks.
  - `/directory`: 200, about 272 KB, about 0.6 seconds.
  - `/categories/tech`: 200, about 305 KB, about 0.8 seconds.
  - `/opportunities`: 404.
  - Unauthenticated cron/API calls return 401 as expected.

## GitHub Actions

Recent failures were clustered on 2026-05-31 and 2026-06-01 and are now followed by
green runs.

- Hunter failures: HTTP 401 from `/api/cron/scrape`; fixed by accepting current
  secret/header variants.
- Verifier failure: HTTP 404 from `/api/cron/verify-links`; fixed after the route
  existed in production.
- Pruner failure: `D1_ERROR: no such column: descriptionHash`; fixed by using
  `description_hash`.
- Migration failures: D1 migration table drift, invalid Wrangler arguments, and
  Cloudflare auth/account errors; later migration runs are green.
- CI guardrail failures: missing `jobs` workspace and build/type issues; current
  guardrail is green.

Current green runs still hide source-level noise. The latest sampled Hunter success
inserted 12 jobs and skipped 447, but also returned:

```json
{"failedSources":["Remote.co (RSS): [rss] Failed to fetch Remote.co: HTTP 520"]}
```

`docs/scraper-alerts.md` records Remote.co failing every logged Hunter run from
2026-06-01 through 2026-06-05, plus one Dribbble timeout.

## Live Data Snapshot

Production D1 metrics from read-only `wrangler d1 execute` queries:

- Opportunities: 635 total, 635 active, 0 inactive.
- Directory companies: 238 total, 238 marked verified.
- ATS-enabled companies: 15 of 238.
- Content digests: 0.
- Active jobs never link-verified: 184.
- Active jobs older than 30 days by `posted_at`: 209.
- Active jobs stale by current verifier predicate: 0.
- Duplicate `source_url`: 0.
- Duplicate `content_hash`: 0.
- Duplicate non-null `description_hash`: 0.

Missing data across active opportunities:

- Missing company: 95 of 635.
- Missing pay range: 475 of 635.
- Missing client timezone: 635 of 635.
- Missing application URL: 635 of 635.
- Missing experience level: 515 of 635.
- Missing description hash: 507 of 635.
- Missing posted date: 61 of 635.
- Missing last seen in feed: 139 of 635.

Category distribution:

- `other`: 523
- `tech`: 62
- `admin`: 23
- `customer-service`: 13
- `design`: 13
- `marketing`: 1

Source distribution:

- WeWorkRemotely: 276 active
- Dribbble: 108 active
- Sourcefit: 73 active
- 20Four7VA: 72 active
- Remotive: 30 active
- Pearl Talent: 25 active
- Coconut VA: 17 active
- CrewBloom: 13 active
- AuthenticJobs: 10 active
- RemoteOK: 5 active
- Pineapple Staffing: 3 active
- Hello Rache: 3 active

Configured source health from local scraper fetch:

- We Work Remotely: 99 raw items.
- Remotive: 28 raw items.
- Authentic Jobs: 10 raw items.
- Dribbble Jobs: 96 raw items.
- ProBlogger: 0 raw items.
- Jobspresso: 0 raw items.
- OnlineJobs.ph: 0 raw items.
- Remote.co: timeout / HTTP 520 in production.

## Main Findings

### 1. Homepage payload is already too large

`apps/web/src/pages/index.astro` selects 500 active opportunities and passes them
into a hydrated React island. The live homepage is about 1.75 MB of HTML before
client assets. Repeated checks did not show a `CF-Cache-Status` header and remained
around 1.7 to 2.2 seconds.

Risk: as rows grow, bandwidth and hydration cost will dominate long before D1 SQL
duration becomes the bottleneck.

Recommended fix: server-render only the first visible set, move search/filtering
behind a paginated JSON endpoint, and cache that endpoint deliberately.

### 2. Indexes do not match the primary ordering queries

SQLite query plans show temp B-trees for:

- Homepage: `WHERE is_active = 1 ORDER BY posted_at DESC LIMIT 500`
- Category page: `WHERE is_active = 1 AND category = ? ORDER BY posted_at DESC`
- Verifier: `WHERE is_active = 1 ORDER BY last_verified_at ASC LIMIT 50`

Current indexes help filtering, but not the ordering.

Recommended indexes:

- `(is_active, posted_at DESC)`
- `(category, is_active, posted_at DESC)`
- `(is_active, last_verified_at ASC)`
- Consider `(is_active, last_seen_in_feed_at)` if stale scans grow.

### 3. Date strings are mixed-format text

`posted_at` contains ISO strings such as `2026-06-05T18:44:00.000Z`, while D1
timestamps like `scraped_at`, `last_seen_in_feed_at`, and `last_verified_at` use
`YYYY-MM-DD HH:MM:SS`. Plain SQLite text comparisons against `datetime('now')`
can be wrong unless normalized or wrapped consistently.

Recommended fix: normalize all datetime writes to one UTC format, or use numeric
epoch milliseconds/seconds for comparison fields.

### 4. Current stale-data policy is feed-presence based, not job-age based

The verifier archives jobs unseen in feeds for 30 days. That is useful, but many
old-looking jobs are still active because sources keep returning them. Examples
include Dribbble and WeWorkRemotely records with `posted_at` from 2022-2024 and
fresh `last_seen_in_feed_at`.

Recommended fix: add a separate freshness policy, for example:

- auto-flag or demote jobs older than N days by source-specific rules;
- keep feed-presence as a liveness signal;
- show "seen recently" separately from "posted recently".

### 5. ATS failures can be silent

`packages/scraper/ats.ts` catches errors and returns `[]`. Because the caller uses
`Promise.allSettled`, a broken ATS integration appears as a fulfilled zero-item
source rather than a failed source. Eight enabled ATS entries currently have zero
active jobs, and one token is duplicated (`20four7va` for both `20Four7VA` and
`24/7 Virtual Assistant`).

Recommended fix: return structured source results with `{ ok, count, error }`,
record per-source status in a table, and de-duplicate ATS tokens before fetching.

### 6. Insert accounting can over-report success

In `apps/web/src/pages/api/cron/scrape.ts`, `inserted` is incremented by batch
length after `onConflictDoNothing()`, while `actualChanges` uses D1 metadata.
The latest sampled run had both equal, but conflict or partial-write situations
would produce misleading success counts.

Recommended fix: report `actualChanges` as the primary inserted count, and fail or
alert if `actualChanges` diverges from accepted rows unexpectedly.

### 7. Batch insert errors are swallowed

Batch insert exceptions are logged, but the route still returns HTTP 200 with partial
counts. This is good for resilience but weak for operations.

Recommended fix: track `insertFailedBatches` and `insertErrors` in the response,
then have GitHub Actions fail or at least produce a warning annotation above a
threshold.

### 8. Remote.co alert commits are useful but noisy

The Hunter workflow commits `docs/scraper-alerts.md` on every partial failure.
Remote.co has failed repeatedly, creating many auto-logged commits and making local
clones fall behind.

Recommended fix: summarize repeated source failures by source/day/count instead of
committing one line per run, or store source health in D1 and commit only daily
rollups.

### 9. Phase/context drift is substantial

The project context still says Bun + Next.js 14 + Vercel + Trigger.dev + Turso +
Zig parser. The active production path is Astro + Cloudflare Pages + D1 + GitHub
Actions + Workers AI. `packages/zig-parser` exists, but active HTML scraping is a
TypeScript regex parser.

Recommended fix: update project context and README architecture so future agents
do not make changes against the wrong deployment model.

### 10. Product surface drift exists

The brief says `/opportunities` exists, but the active site returns 404 there.
The homepage currently functions as the job board. This is acceptable if intentional,
but the route mismatch should be resolved.

Recommended fix: either add `/opportunities` as a real paginated board or redirect
it to `/#search`.

## Data We Have vs Data We Need

Current data is good enough for a live portfolio proof:

- 635 active opportunities.
- 238-company directory.
- Source URL, platform, title, category, click count, timestamps, and dedup fields.
- A functioning scheduled ingestion/verification/pruning loop.

For a high-trust VA job resource, the ideal next data layer is:

- Per-source health table: last success, last failure, item count, duration, error.
- Per-job source freshness: first seen, last seen, last source status.
- Better job quality fields: pay, timezone, contract type, experience, direct apply URL.
- Normalized location constraints and Filipino eligibility reason.
- Source-specific close/deactivate rules.
- Directory verification evidence, not only a boolean.
- Digest content if Phase 2 remains in scope.

## Priority Fix List

1. Add source-health telemetry and stop treating zero-item ATS fetches as silent success.
2. Add `/opportunities` or redirect it.
3. Replace homepage full-data hydration with pagination or endpoint-backed search.
4. Add query-aligned indexes for `posted_at` and verifier ordering.
5. Normalize datetime storage and comparisons.
6. Add source-specific freshness rules for old-but-still-seen jobs.
7. Collapse repeated Remote.co alert commits into daily rollups.
8. Update architecture docs to match Cloudflare/Astro/D1/GitHub Actions reality.
9. Repair OnlineJobs.ph parsing or disable it until it returns nonzero items.
10. Decide whether Phase 2 digest is still in scope; currently it has zero rows.
