// `opportunities` has `posted_at` and `scraped_at`, but no `created_at`.
// Keep the trusted raw fragments here so the cron query and its regression
// contract cannot drift apart when its freshness policy changes.
export const PROSPECT_SAMPLE_FRESHNESS_SQL = "COALESCE(o2.scraped_at, o2.posted_at)";
export const PROSPECT_CANDIDATE_FRESHNESS_SQL = "COALESCE(o.scraped_at, o.posted_at)";
