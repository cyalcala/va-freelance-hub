# Major Audit - 2026-07-04

## Purpose

User-requested major health audit with an explicit durability mandate: find
and fix silent errors, strengthen the code against future failures, document
everything, and back the work up on GitHub. This follows the format of
`docs/major-audit-2026-06-11.md` and earlier audits.

Audit baseline commit: `aa03741` (gold777 directory import).

## Production Surface (Healthy)

| Check | Result |
| --- | --- |
| `/` | 200, ~141 KB |
| `/opportunities` | 200, ~95 KB |
| `/directory` | 200, ~232 KB |
| `/categories/tech` | 200, ~93 KB |
| `/data-policy` | 200 |
| Unauthenticated `POST /api/cron/scrape` | 401 |
| CI guardrail on `aa03741` | passed (run `28693875975`) |
| Hunter / Verifier / Prune pulses | all green on recent runs |

## Production D1 Snapshot (Read-Only)

- Active opportunities: 1,896 (2,072 total; 878 at the 2026-06-13 checkpoint)
- Directory companies: 297
- Missing `application_url` on active rows: 0
- Missing `company` on active rows: 105
- Active rows older than 30 days (posted/scraped): 555; older than 60: 153
- Active rows not seen in any feed for 14+ days: 635
- Active rows never link-verified: 456
- Duplicate `content_hash` groups: 0
- Same title+company active groups: 96 (cross-source duplicates; follow-up)
- `source_fetch_state`: 6 rows, all fresh (same-day `last_attempt_at`)
- `source_fetch_events`: **1 row — a local test insertion** (see S-1)

## Silent Errors Found (The Watermelon Layer)

All workflows were green while the following were broken or degraded —
exactly the "green outside, red inside" risk AGENTS.md warns about.

### S-1 (Critical, confirmed): fetch-event history never recorded in production

`recordSourceFetchEvents` in `apps/web/src/pages/api/cron/scrape.ts` inserted
all source results (~25 rows x 12 columns ≈ 300 bound parameters) in a single
D1 statement. D1 rejects statements with more than 100 bound parameters
("too many SQL variables") — the same failure class F-01 fixed for the
opportunities insert on 2026-06-11. The catch block reduced the failure to a
`console.warn` that no one reads, so every production run since the feature
shipped (2026-06-13, F-11) failed silently. Proof: the only row in
`source_fetch_events` is `source_id = 'test-id'`, `timestamp =
2026-06-15T10:00:00Z` — the F-17 local test insertion. Zero real events in
three weeks of green Hunter runs.

Fix (this audit):

- Added `packages/scraper/batch.ts` with `chunkArray` and
  `maxRowsPerD1Batch` (documents the 100-parameter limit as a named
  constant; 12-column event rows batch at 8 rows = 96 parameters).
- `recordSourceFetchEvents` now chunks inserts and returns
  `{ attempted, recorded, failedBatches, errors }`.
- The scrape response now includes a `fetchEventLog` object in every branch,
  and the Hunter workflow emits a `::warning::` annotation plus summary line
  whenever `failedBatches > 0`, so any regression is visible in the run UI
  instead of a Pages log.
- Regression test in `packages/scraper/batch.test.ts` pins the 12-column →
  8-rows-per-batch math.

### S-2 (Critical): prune endpoint hard-deleted rows with false-positive risk

`apps/web/src/pages/api/cron/prune.ts` (daily cron since it was added)
hard-`DELETE`d rows, which violated the project's archive-only stale policy
and created two concrete failure modes:

1. Cross-company false positives. `description_hash = sha256(title +
   description[0:1500])`. Two different companies posting the same generic
   title ("Virtual Assistant") with an empty description produce identical
   hashes; the endpoint kept `MIN(id)` and permanently deleted the other
   company's job. It also considered INACTIVE rows, deleting archived
   history.
2. Re-scrape churn. Scrape dedup checks incoming items against existing
   `source_url` rows. Hard-deleting a row whose URL still appears in a feed
   causes the same job to re-insert as "new" on the next Hunter run,
   resetting freshness timestamps and inflating counts. This churn is a
   plausible contributor to the active-count jump (878 → 1,896) alongside
   legitimate source growth.

Fix (this audit): rewrote prune to soft-archive (`is_active = 0` +
`updated_at`), consider only active rows, scope the duplicate key to
`(description_hash, lower(company))` so distinct companies never collapse,
and keep the oldest row. Removed the dead second pass (URL dedup — impossible
by unique index). Response now reports `archivedHashDuplicates`, `deleted: 0`,
and `mode: "soft-archive"`; the prune workflow warns if the endpoint ever
stops reporting soft-archive mode.

Unrecoverable damage note: rows already hard-deleted by past prune runs left
no tombstones, so the exact loss cannot be quantified retroactively. The
2026-06-13 D1 archives (F-13) may be among the deleted inactive rows.

### S-3 (High): triage exceptions silently dropped jobs

In the scrape route, a thrown `triageJob` error dropped the job with only a
`console.error` — indistinguishable in the response from policy filtering.
If the Workers AI binding degraded for a week, all new jobs would vanish
while every dashboard stayed green. (`triageJob` itself has an internal
all-models-failed fallback that returns eligible/other, so this path fires on
unexpected errors — but it fired invisibly.)

Fix: added a `triageFailures` counter to the scrape response and a Hunter
`::warning::` annotation whenever it is non-zero.

### S-4 (Medium): link-verification backlog could never drain

456 active rows have never been verified. The verifier checks 50 links per
run, twice a day (cron `0 */12`), while ~30+ new rows arrive daily — the
queue mathematically never drains. Fix: per-run limit raised to 120 (still
bounded: HEAD requests, 8s timeouts, batches of 10), the response now
reports `neverVerifiedRemaining`, the workflow summary displays it, and a
warning fires if the backlog exceeds 300.

### S-5/S-6 (Low): cadence-state failures only reached console.warn

If loading `source_fetch_state` failed, cadence guards silently disabled for
the run (every source fetched at full frequency). Fix: the scrape response
now carries `cadenceGuards.stateAvailable` (+ error message), and Hunter
annotates when guards were skipped.

## Durability Strategy Going Forward

1. **No silent catch blocks in write paths.** Every catch in a cron route
   must either surface into the JSON response (counted, with error strings)
   or rethrow. The scrape route now complies; ingest/ingest-digest already
   return errors.
2. **D1 batch inserts must use `maxRowsPerD1Batch`.** The 100-parameter
   limit is now a named constant with tests; new tables get chunking for
   free by using the helper instead of hand-rolled inserts.
3. **Destructive SQL is banned in cron paths.** Prune archives; nothing
   deletes. Any future hard delete requires an explicit migration file and a
   docs entry (existing migration workflow already enforces review).
4. **Workflows must assert on response fields, not just HTTP 200.** Hunter
   now checks `fetchEventLog`, `cadenceGuards`, and `triageFailures`; the
   verifier checks backlog; prune checks mode. A green run now actually
   means the insides were green.
5. **Backlog metrics are reported, not inferred.** never-verified count,
   fetch-event recording ratio, and triage failure count are in run
   summaries, so drift is visible week-over-week in the Actions UI.

## Verification For This Audit's Changes

- `bun test`: 70/70 pass (9 new tests in `packages/scraper/batch.test.ts`).
- `bun run --cwd apps/web build`: passed.
- `git diff --check`: passed (normal CRLF warnings only).
- Post-deploy acceptance (run after CI deploys `main`):
  1. Trigger a manual Hunter run; confirm the response contains
     `fetchEventLog.recorded > 0` and 0 failed batches.
  2. Read-only D1: `SELECT COUNT(*) FROM source_fetch_events;` must exceed 1
     and grow per Hunter run.
  3. Next scheduled prune: response reports `mode: "soft-archive"` and
     `deleted: 0`; total row count in `opportunities` must NOT decrease.
  4. Next verifier run: summary shows `Never-Verified Backlog Remaining`
     decreasing from ~456.

## Follow-Ups (Not Done In This Slice)

- 96 same-title+company active duplicate groups predate this audit (some
  may be re-scrape churn artifacts from S-2). After one soft-archive prune
  cycle, take a fresh dedup snapshot and archive survivors via the
  same-company rule.
- 105 active rows missing `company`; consider a backfill from
  `source_platform` where unambiguous.
- The active-count jump (878 → 1,896 in 3 weeks) deserves a per-source
  breakdown once fetch-event history accumulates a week of real data.
- `.astro/types.d.ts` generated-file tracking: `apps/web/.astro/` is
  committed but is build output; consider ignoring it in a future hygiene
  slice.
