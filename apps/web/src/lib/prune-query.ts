/**
 * The one survivor for each active (description hash, company) duplicate set.
 * ISO timestamps sort lexically, so a latest feed observation wins; `id DESC`
 * makes otherwise identical records deterministic.
 */
export const duplicateSurvivorSql = `
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY description_hash, lower(coalesce(company, ''))
        ORDER BY coalesce(last_seen_in_feed_at, posted_at, scraped_at) DESC, id DESC
      ) AS duplicate_rank
    FROM opportunities
    WHERE is_active = 1
      AND description_hash IS NOT NULL
  )
  WHERE duplicate_rank = 1
`;
