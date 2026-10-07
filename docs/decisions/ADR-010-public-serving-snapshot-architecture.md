# ADR-010: Public Serving Snapshot Architecture

## Status
Accepted. Production correction recorded 2026-10-07.

The status line on 2026-10-06 was "Accepted and Deployed (2026-10-06)". That deployment claim was not true of Cloudflare Pages on the morning of 2026-10-07. The correction below is the production evidence. The 2026-10-04 quota facts in Context are unchanged.

## Context
On 2026-10-04, production Cloudflare D1 experienced a daily row-read quota exhaustion incident (code 7500 / 14-hour 503 outage) under search crawler and visitor traffic. Prior to this ADR, every public route request (`/`, `/opportunities`, `/directory`, `/categories/[slug]`, `/jobs/[id]`) performed un-coalesced D1 queries:
- The homepage ran window partition queries, category `COUNT()` aggregates, and agency counts in `va_directory`.
- Cold misses took ~3.2s on `/`, 529ms on `/opportunities`, and 412ms on `/directory`.
- Each visitor hit performed multiple row scans against the database, scaling read consumption as $O(N)$ with public traffic.

## Decision
We implement a three-tier **Public Serving Snapshot** architecture (`public-serving-snapshot.ts` and `public-board.ts`) backed by D1 migration `0054_public_serving_snapshot.sql`:

1. **Materialized Single-Row Snapshot (`public_serving_snapshot`)**:
   A dedicated SQLite table storing exactly one row (`id = 1`) with the compressed JSON representation of all currently active public opportunities and directory agencies.
   ```sql
   CREATE TABLE IF NOT EXISTS public_serving_snapshot (
     id INTEGER PRIMARY KEY CHECK (id = 1),
     generated_at TEXT NOT NULL,
     refresh_started_at TEXT,
     payload TEXT NOT NULL
   );
   ```

2. **Three-Tier Caching Hierarchy**:
   - **Tier 1 (In-Memory Isolate Cache)**: Warm Cloudflare Workers isolates serve from in-memory module state (`slot.board`), achieving 0ms query time and 0 D1 row reads.
   - **Tier 2 (Cloudflare Edge Cache)**: The compressed snapshot is written to `caches.default` (`Cache-Control: public, max-age=86400`) so edge nodes can resolve cold isolates without querying D1.
   - **Tier 3 (Single-Row D1 Read)**: A cold isolate without an edge match reads only `id = 1` (`SELECT generated_at, payload FROM public_serving_snapshot WHERE id = 1`), taking exactly 1 row read instead of thousands.

3. **Distributed Lease & Background Rebuilds**:
   - The underlying `opportunities` and `va_directory` tables are scanned only when the snapshot row is missing or older than 1 hour (`REBUILD_AFTER_MS`).
   - Rebuilding uses an atomic conditional lease (`refresh_started_at`) preventing thundering herds.
   - Rebuild tasks are scheduled via `ctx.waitUntil()` in the background, ensuring visitors never experience rebuild latency.

4. **In-Memory Search, Slicing & Pagination**:
   - Category filtering, employment type, source platform, and Philippine geo-eligibility filtering are computed in memory via `slicePublicJobs()`.
   - Unicode tokenized keyword search is evaluated in memory via `matchesJobQuery()`, eliminating runtime full-text index query overhead for routine browsing.
   - Directory search and category filtering run in memory via `sliceDirectory()`.

5. **Payload Compression & Resilience**:
   - Payloads are gzipped using native `CompressionStream("gzip")` and base64 encoded.
   - If payload size approaches quota ceilings, `packBoard()` sheds job descriptions while preserving all core discovery metadata.
   - If D1 quota fails (`d1_quota` or `d1_busy`) but a cached snapshot is available, the board continues serving smoothly without returning 500/503 errors.

## Correction 2026-10-07 — availability when the snapshot cannot be read

On 2026-10-07 the live Pages deployment was still git `8875e2328443c82e71c0fe1473b1edd4da03c615` (deployment `53fe5e7b`). That build has no `public-serving-snapshot.ts`. Migration `0054_public_serving_snapshot.sql` was not applied. `221650a4` was on `main` and was not an ancestor of the deployed SHA. A cold isolate in `221650a4` also threw from `loadCold` when D1 quota or a missing snapshot row left no memory and no edge copy. Cache TTL and a failed refresh could therefore become a public 503. The edge cache and isolate memory are not durable across a deploy.

The availability invariant is: a backend failure may reduce freshness, and it must not remove the public board while a previously valid board exists.

What shipped on branch `codex/public-availability-lkg` commit `019333f72261e8d182567163239f23e663c8d43f`:

- A candidate snapshot is validated and promoted atomically. An empty board, a malformed board, or a collapse below 10% of an active board of at least 20 jobs is rejected. The active board stays.
- A stale in-memory board is served while a refresh is scheduled. Expiry does not delete the only copy.
- When memory, edge, and D1 cannot supply a valid board, the worker serves `apps/web/src/data/public-lkg.json`, a production export captured `2026-10-07T08:15:58.968Z` (1,518 jobs, 735 directory rows). Descriptions are omitted in that file. It is real inventory, not a sample catalog.
- Public routes set `X-Public-Snapshot`, `X-Public-Snapshot-Jobs`, and `X-Public-Snapshot-Source`.
- Migration `0054` was applied to D1 `08072f16-d3d1-436a-9104-b057a162db7c` on 2026-10-07. The first successful rebuild wrote one row: `generated_at` `2026-10-07T08:34:17.737Z`, payload length 598,055, lease clear. A follow-up read of that row reported `rows_read` 1.

Pages deployment `https://62a5be85.remotejobs-ph.pages.dev` was published to project `remotejobs-ph` branch `main` and was serving on `https://remotejobs-ph.pages.dev` the same afternoon. Measured with `curl` after the snapshot row existed:

| URL | HTTP | TTFB | Snapshot |
| --- | --- | --- | --- |
| `/` | 200 | 0.220s | fresh, 1518 jobs, source d1, edge HIT |
| `/opportunities` | 200 | 0.237s | fresh, 1518, source d1, edge HIT |
| `/directory` | 200 | 0.211s | fresh, 1518, source d1, edge HIT |
| `/categories/admin` | 200 | 0.255s | fresh, 1518, source d1 |
| `/categories/customer-service` | 200 | 0.231s | fresh, 1518, source d1 |
| `/jobs/7` | 200 | 0.210s | NoGigiddy, lastmod 2026-09-27 |
| `/jobs/251` | 200 | 0.208s | Inside Sales Contractor |
| `/sitemap.xml` | 200 | 0.200s | fresh, 1518, both job URLs present |
| `/categories/not-a-category` | 302 | 0.224s | redirect to `/` before a board load |

The first miss on the new deployment, before the row existed, took 2.3s on `/` and then wrote the snapshot. Later misses stayed near 0.23s. Directory HTML included Affordable Staff, 20Four7VA, and 24x7 Direct. No invented Athena listings were present.

The consequence line that claimed sub-50ms cached responses was not met. Warm edge TTFB in this measurement was about 0.20–0.25s. A live quota failure was not injected against production D1. Tests A–I in `apps/web/tests/public-snapshot.test.ts` cover that path. `apps/web` `bun test` was 441 pass, `tsc --noEmit` passed, and `bun run build` passed before the Pages upload.

`main` was still `f35bcdc3` when this correction was written. A later CI deploy from that SHA would replace this Pages build with the pre-fallback snapshot. Merging the review branch is what makes GitHub match production.

## Consequences
- **Positive**: Warm board loads and HTML edge hits do not query D1. A cold stored-snapshot read uses one row; a missing row can still require controlled reconstruction.
- **Positive**: Database, refresh and cache failures preserve a validated cached or bundled board. Cache expiry triggers refresh without deleting usable in-memory data.
- **Measured limit**: The October 7 evidence did not establish sub-50ms public network latency or fleet-wide immunity to database read amplification. Headers retain a board's origin and are not SQL counters.
- **Trade-off**: Newly published jobs or agency updates become visible on the public site after the 1-hour snapshot refresh interval (or upon an explicit snapshot rebuild) rather than synchronously on the next HTTP request.

## Follow-up acceptance — 2026-10-07 17:45 Manila

PR #215 merged and main CI/release `37602023203` successfully deployed
`6297335ac3bbeb84f4f094a916d2155b8ac83adb` as Pages `c6d071c1`. The additional
hardening persists candidates before promotion, rejects unsafe renderer fields and
severe directory collapse, fences older stored/edge writes, bounds dependency waits
and contains outer HTML cache failures. All 3,003 tests pass; ten production routes
returned 200. A built Worker without D1 served the dated real LKG with 200 on eight
routes. The live board progressed from a stale 1,518-job edge copy to fresh 1,519 jobs.
No live quota exhaustion was induced. The bundled fallback ages until a reviewed
replacement build; apply-click redirects retain their live-D1 gate. Exact receipts,
measurements and rollback: [incident record](../incident-2026-10-07-public-snapshot-availability.md).
