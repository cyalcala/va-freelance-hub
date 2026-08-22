# DB-01 Evidence: Fresh/Legacy D1 Migration Rehearsal

**Unit ID:** DB-01
**Status:** TERMINAL — KEEP
**Commit:** `857ca34`
**CI/Deploy Run:** `32560891840`
**Date:** 2026-08-22

## Objective

Prove the active migration chain creates a working database from empty state; make `sync_migrations.sql` safe for that case; assert schema/index/FTS and directory niche-default contracts.

## Changes Made

### 1. Rehearsal Script (`scripts/ci/rehearse-d1-migrations.ts`)

Created a new CI-verifiable rehearsal script that:
- Applies `sync_migrations.sql` (bootstrap premarking)
- Applies all 31 migrations (0000–0031, excluding missing 0004) in order
- Asserts complete schema: tables, columns, indexes, FTS5 virtual table + triggers, unique constraints
- Runs against both fresh (`:memory:`) and legacy (simulated pre-existing tables) databases
- Exits with code 0 on success, 1 on failure

### 2. Migration 0000 Fix (`packages/db/migrations/0000_workable_sandman.sql`)

Corrected `va_directory.niche` default from `'admin'` to `'australian-dayshift'` to match the schema contract in `packages/db/schema.ts:96`.

### 3. Bootstrap-Safe Premarking (`packages/db/sync_migrations.sql`)

Already modified before this unit: premarking now conditional on `EXISTS (SELECT 1 FROM sqlite_master WHERE type='table' AND name='opportunities')`, preventing fresh databases from skipping table creation in 0000.

## Verification Results

### Local Rehearsal

```
=== FRESH DATABASE REHEARSAL ===
Schema assertions: 85 passed, 0 failed

=== LEGACY DATABASE REHEARSAL ===
Schema assertions: 85 passed, 0 failed

=== SUMMARY ===
Fresh rehearsal: PASS
Legacy rehearsal: PASS
✅ DB-01 REHEARSAL PASSED
```

### CI/Deploy Run `32560891840`

- **Detect deployable changes:** ✓
- **Validate project-owned code:** ✓ (464 tests, 1,053 assertions, typecheck, build, guardrails, freshness cron validation)
- **Migrate and deploy production:** ✓ (D1 migrations applied, FTS verified, Cloudflare Pages deployed)

### Production Smoke Checks

| Route | Status | Notes |
|-------|--------|-------|
| `https://remotejobs-ph.pages.dev/` | HTTP 200 | Homepage |
| `https://remotejobs-ph.pages.dev/directory` | HTTP 200 | Directory |
| `https://remotejobs-ph.pages.dev/opportunities` | HTTP 200 | Opportunities board |

## Schema Assertions Verified

- **Core tables:** `opportunities`, `va_directory`, `content_digests`, `source_fetch_state`, `source_fetch_events`, `robots_cache`, `opportunities_fts`
- **All required columns** on `opportunities` and `va_directory` (including geo-eligibility, link-health, inactive-reason fields)
- **All required indexes** (17 indexes including `active_posted_idx`, `category_active_posted_idx`, `active_ph_eligibility_idx`, `unclear_sweep_idx`, `robots_cache_fetched_at_idx`, `va_directory_link_checked_idx`, etc.)
- **FTS5 virtual table** `opportunities_fts` with `content='opportunities'` external content mode
- **FTS5 triggers:** `opportunities_fts_insert`, `opportunities_fts_update`, `opportunities_fts_delete`
- **Unique constraints:** `opportunities.source_url`, `content_digests.video_id`
- **Migration ledger:** 31 applied migrations (0000–0031 minus missing 0004)
- **Niche default:** `va_directory.niche` default is `'australian-dayshift'` (matches schema contract)

## Niche Contract Resolution

**Finding:** `packages/db/schema.ts` declares `niche` default as `"australian-dayshift"` (line 96), but migration 0000 created the column with default `'admin'`.

**Resolution:** Updated migration 0000 to use `'australian-dayshift'`. This affects only fresh databases; production data is unchanged.

## Migration Chain Integrity

| Migration | Description | Applied in Rehearsal |
|-----------|-------------|---------------------|
| 0000 | Core tables + unique indexes | ✓ |
| 0001–0003 | VA directory boolean columns | ✓ |
| 0005–0008 | Schema evolution | ✓ |
| 0009–0018 | Indexes, backfills, fetch state | ✓ |
| 0019 | RemoteWork38 directory import | ✓ |
| 0020 | Conditional fetch state | ✓ |
| 0021 | Geo-eligibility fields + index | ✓ |
| 0022 | Directory link health + index | ✓ |
| 0023 | Directory audit URL fixes | ✓ |
| 0024 | Directory soft hide | ✓ |
| 0025 | Unclear sweep index | ✓ |
| 0026 | FTS5 search + triggers | ✓ |
| 0027 | FTS5 trigger scope | ✓ |
| 0028 | Opportunity inactive reason | ✓ |
| 0029 | Category effective posted index | ✓ |
| 0030 | Robots cache + index | ✓ |
| 0031 | Remotephjobs incident repair | ✓ |

**Missing:** 0004 (gap in sequence, no file exists)

## Rehearsal Command

```bash
bun run scripts/ci/rehearse-d1-migrations.ts
```

## CI Integration

The rehearsal script is designed to run in CI without credentials (uses in-memory SQLite). It can be added as a mandatory step in `ci-guardrail.yml` or `deploy-migrations.yml` for future migration changes.

## Rollback Plan

If a regression is discovered:
1. Revert commit `857ca34` (single commit containing rehearsal script + niche fix + sync_migrations.sql)
2. The niche default in 0000 would revert to `'admin'` for fresh databases
3. Production database unaffected (already has table with existing data)

## Next Unit

**REL-10** — Restore homepage detail-link data contract (add `phEligibility` to slim homepage projection and type the contract)

## Handoff

- **Base commit:** `1b5ab29` (origin/main before push)
- **Head commit:** `857ca34`
- **Branch:** `main`
- **Files changed:**
  - `scripts/ci/rehearse-d1-migrations.ts` (new)
  - `packages/db/migrations/0000_workable_sandman.sql` (niche default fix)
  - `packages/db/sync_migrations.sql` (bootstrap-safe premarking, pre-existing)
- **All tests pass:** 464/464 locally, 464/464 in CI
- **Typecheck:** PASS
- **Build:** PASS
- **Guardrails:** PASS
- **Production deployment:** PASS (run 32560891840)
- **Production smoke:** PASS (3/3 routes HTTP 200)
- **Blockers:** None
- **Recommended next model:** Standard Astro/React/TypeScript executor for REL-10