-- Category pages filter by category + active state and then order by the same
-- effective publication expression as the main board. The global expression
-- index can serve the sort, but it must scan active rows from every category.
-- This narrower index keeps category page work proportional to that category.
CREATE INDEX IF NOT EXISTS `category_active_effective_posted_idx`
ON `opportunities` (`category`, `is_active`, coalesce(`posted_at`, `scraped_at`) DESC);
