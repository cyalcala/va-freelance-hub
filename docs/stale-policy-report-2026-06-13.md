# Stale Policy Report - 2026-06-13

This report outlines the stale/paused-source cleanup and deduplication actions applied to the remote D1 database.

## Policy Rules

1. **Paused Sources Grace Period**: Rows from paused sources (e.g. Dribbble, Workable ATS platforms) are held for a 14-day grace period from their last seen timestamp. If a row has no `last_seen_in_feed_at` timestamp and was scraped more than 14 days ago, it is archived.
2. **Deduplication**: Active listings with identical titles, companies, and descriptions (matching `description_hash`) are deduplicated. The oldest scraped listing is archived, keeping only the newest.

## Targeted Rows for Archival

### 1. Stale Paused Source Rows (10 rows)

These opportunities belong to paused sources, have no `last_seen_in_feed_at` timestamps, and were scraped in late May 2026 (more than 14 days ago):

- **ID 1411**: "Edra is hiring for a position of Product Designer..." (Dribbble)
- **ID 1452**: "Tuan Cannabis is hiring for a position of Full Time Designer..." (Dribbble)
- **ID 1454**: "Prime Scale Creative is hiring for a position of Mid-Level Graphic..." (Dribbble)
- **ID 1455**: "TRUEdotDESIGN is hiring for a position of Senior Graphic Designer..." (Dribbble)
- **ID 1458**: "Concilio Labs, Inc. is hiring for a position of Senior UI/UX Designer..." (Dribbble)
- **ID 1460**: "Ancient Gaming is hiring for a position of Product Designer..." (Dribbble)
- **ID 1692**: "🥥 Sales Development Representative..." (Coconut VA)
- **ID 1707**: "Chief of Staff" (CrewBloom)
- **ID 1718**: "Customer Success Manager - REMOTE..." (Pearl Talent)
- **ID 1720**: "Patient Care Coordinator - REMOTE..." (Pearl Talent)

### 2. Duplicate Listings (2 rows)

These rows represent duplicate postings from Passion.io via RealWorkFromAnywhere with identical content but different URLs:

- **ID 2246** (duplicate of 2325): "Creator Success Manager (Business & Monetisation)..." (RealWorkFromAnywhere)
- **ID 2249** (duplicate of 2326): "Technical Customer Success Manager (Creator Economy)..." (RealWorkFromAnywhere)

## Mutation Command

The following SQL update statement was executed against `remoteph-jobs-db` to archive these 12 rows:

```sql
UPDATE opportunities
SET is_active = 0, updated_at = '2026-06-13T08:31:00.000Z'
WHERE id IN (1411, 1452, 1454, 1455, 1458, 1460, 1692, 1707, 1718, 1720, 2246, 2249);
```

## Before/After Counts

- **Before Active Count**: 884
- **Archived Count**: 12
- **After Active Count**: 872
