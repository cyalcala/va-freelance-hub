# KNOWN ISSUES & RESOLUTIONS

## 1. Feed Empty / "No matching signals found" (Ref: Warden Protocol v2)
- **Status**: RESOLVED (2026-03-20)
- **Symptom**: Frontend shows "No matching signals found" while Health API reports active listings.
- **Root Causes**:
    - `ReferenceError`: `apps/frontend/src/pages/index.astro` attempted to query `opportunitiesTable` which was not defined (import was `opportunities`).
    - `ReferenceError`: Missing Drizzle imports for `not` and `asc` in `index.astro`.
- **Resolution**: Surgically corrected table reference and added missing imports. 
- **Verification**: Visual check confirmed 270+ listings live on production.

## 2. Trigger.dev Deployment - @libsql Native Binary Mismatch
- **Status**: RESOLVED (2026-03-21)
- **Symptom**: `trigger deploy` fails on Windows due to `@libsql/linux-x64-gnu` resolution.
- **Resolution**: Use `@libsql/client/http` and refactor database initialization to be ASYNCHRONOUS. This isolates environment-sensitive drivers from the Trigger.dev indexing phase.

## 3. 2026-03-21 — Silent Blocker / CI/CD Stagnation
- **Status**: RESOLVED (2026-03-21)
- **Symptom**: `harvest-opportunities` fetching 1080 items but processing 0. Feed stuck at 273 listings.
- **Root Cause**: GitHub Actions pipeline blocked by missing secrets and workflow configuration.
- **Resolution**: 
    1. Created `.github/workflows/trigger-deploy.yml`.
    2. User provided `TRIGGER_ACCESS_TOKEN`.
    3. Refactored `jobs/lib/db.ts` with dynamic imports to unblock indexing.
    4. Switched to `bun` runtime in `trigger.config.ts`.
- **Verification**: GitHub Action Run `23375287104` — SUCCESS. Target Version `20260321.14` live.

## 4. 2026-03-21 — Stale Feed Despite Green Runs (Scene A/B)
- **Status**: RESOLVED (2026-03-21)
- **Symptom**: Trigger.dev showed "green" runs with processed > 0 but the website displayed the same listings for 15+ minutes (e.g., ClickGUARD at top).
- **Root Causes**:
    - **Scraper Caching**: RSS/API fetches were likely hitting a cache in the runtime or at the source, preventing new signals from being detected.
    - **Fidelity Gap**: The "processed" count included both new and refreshed items, making the pipeline look active even when no new data was being found.
- **Resolution**:
    1. Added `Cache-Control: no-cache` and `Pragma: no-cache` to all scraper fetch calls.
    2. Appended a timestamp `?t=...` to all scraper URLs to bust intermediate caches.
    3. Refactored `harvest` task to report `NEW` vs `REFRESHED` items separately.
- **Verification**: `turso-check.ts` confirmed fresh writes and `health` API confirmed current heartbeat.

## 5. 2026-03-21 — Silent Blockage (Property Mismatch + Sifter Strictness)
- **Status**: RESOLVED (2026-03-21)
- **Symptom**: `totalActive` stuck at 415 for 60+ minutes despite "completed" harvest runs. `newest` timestamp stuck at 11:45 UTC.
- **Root Causes**:
    - **Property Mismatch**: Deduplication logic compared `title|company` but didn't select `company` from the DB, leading to incomplete/corrupt fingerprints.
    -14. **INC-020: Architectural Hardening**: Migration 0002 added a UNIQUE index on `(title, company)` to natively automate semantic deduplication and handle "Still Hiring" re-posts correctly.
15. **INC-021: NULL Leak (Warden v3)**: Identified that `UNIQUE(title, company)` index was bypassed by NULL companies, and `NULL tier` excluded listings from frontend. Fixed via database backfill and harvester hardening (2026-03-21).
    - **Sifter Hyper-Purity**: Sifter was trashing all "Senior" and "Lead" roles globally, discarding legitimate specialist roles.
    - **Heartbeat Invisibility**: Upsert was using `sql` excluded syntax that didn't consistently update `scrapedAt` for existing items.
- **Resolution**:
    1. Added `company` to DB select in `harvest` task.
    2. Relaxed sifter to allow Specialist roles (Senior/Lead) matching target signals.
    3. Switched to explicit `new Date()` for upsert timestamps to ensure heartbeat visibility.
- **Verification**: `totalActive` increased from 415 to **427** (+12) in next run. `stalenessHrs` dropped to 0.03.

## 6. 2026-03-21 — Hash Explosion (Zombie Listings)
- **Status**: RESOLVED (2026-03-21)
- **Symptom**: `totalActive` count inflated (454+), and many items appeared duplicated in the feed. Some 18-day old items had "Just Now" badges.
- **Root Cause**: Sources (likely `remotecom`) were providing shifting URLs for the same roles. Since `contentHash` is based on URL, it created new database rows instead of updates.
- **Resolution**:
    1. Hardened `scrape-opportunities.ts` with **Semantic Deduplication** (checks `title|company` fingerprint even if `contentHash` is different).
    2. Surgical Purge: Deleted 78 redundant rows from Turso using a `ROW_NUMBER()` subquery.
    3. Frontend Hardening: Removed `scrapedAt` updates on every pulse to prevent artificial freshness for old jobs.
- **Verification**: `totalActive` dropped from 454 to **376** (Purity-Certified). `audit-duplicates.ts` confirmed 0 semantic duplicates remaining.
