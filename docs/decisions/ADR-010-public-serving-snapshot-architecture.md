# ADR-010: Public Serving Snapshot Architecture

## Status
Accepted and Deployed (2026-10-06)

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

## Consequences
- **Positive**: D1 row reads per public visitor dropped from thousands to 0 (warm) or 1 (cold miss).
- **Positive**: Site latency dropped to sub-50ms for cached responses.
- **Positive**: Full immunity to search crawler read-amplification.
- **Trade-off**: Newly published jobs or agency updates become visible on the public site after the 1-hour snapshot refresh interval (or upon an explicit snapshot rebuild) rather than synchronously on the next HTTP request.
