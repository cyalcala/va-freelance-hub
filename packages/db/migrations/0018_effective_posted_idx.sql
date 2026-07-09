-- 2026-07 comprehensive audit, performance fix (confirmed via EXPLAIN QUERY
-- PLAN on production): the F-17 freshness fix changed the board sort to
-- ORDER BY coalesce(posted_at, scraped_at) DESC, which active_posted_idx
-- (is_active, posted_at) cannot serve — every homepage/opportunities/category
-- render sorted all ~1.9k active rows through a temp B-tree.
--
-- SQLite expression indexes match structurally, so this serves
-- WHERE is_active = ? ORDER BY coalesce(posted_at, scraped_at) DESC directly.
CREATE INDEX IF NOT EXISTS `active_effective_posted_idx`
ON `opportunities` (`is_active`, coalesce(`posted_at`, `scraped_at`) DESC);
