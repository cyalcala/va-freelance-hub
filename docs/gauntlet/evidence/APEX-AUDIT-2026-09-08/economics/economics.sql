-- SP-02 read-only source-economics bundle
-- asOf: 2026-09-08T09:59:29.962Z
-- cut7  (unix s): 1788256769 (2026-09-01T09:59:29.000Z)
-- cut14 (unix s): 1787651969 (2026-08-25T09:59:29.000Z)
-- cut30 (unix s): 1786269569 (2026-08-09T09:59:29.000Z)
-- Read-only: SELECT statements only, no mutations.

-- [qualified_supply]
SELECT
  COUNT(*) AS qualified_active,
  SUM(CASE WHEN unixepoch(scraped_at) >= 1788256769 THEN 1 ELSE 0 END) AS qualified_new_7d,
  SUM(CASE WHEN unixepoch(scraped_at) >= 1786269569 THEN 1 ELSE 0 END) AS qualified_new_30d
FROM opportunities
WHERE is_active = 1 AND ph_eligibility IN ('eligible_verified', 'eligible_likely')
  AND unixepoch(scraped_at) <= 1788861569;

-- [identity_coverage]
SELECT
  COUNT(*) AS total,
  SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active,
  SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) AS inactive,
  SUM(CASE WHEN source_id IS NOT NULL THEN 1 ELSE 0 END) AS with_source_id,
  SUM(CASE WHEN source_id IS NULL THEN 1 ELSE 0 END) AS null_source_id,
  SUM(CASE WHEN is_active = 1 AND source_id IS NOT NULL THEN 1 ELSE 0 END) AS active_with_source_id,
  SUM(CASE WHEN is_active = 1 AND source_id IS NULL THEN 1 ELSE 0 END) AS active_null_source_id
FROM opportunities;

-- [supply_totals]
SELECT
  COUNT(*) AS active,
  SUM(CASE WHEN unixepoch(scraped_at) >= 1788256769 THEN 1 ELSE 0 END) AS net_new_7d,
  SUM(CASE WHEN unixepoch(scraped_at) >= 1787651969 THEN 1 ELSE 0 END) AS net_new_14d,
  SUM(CASE WHEN unixepoch(scraped_at) >= 1786269569 THEN 1 ELSE 0 END) AS net_new_30d
FROM opportunities
WHERE is_active = 1;

-- [source_supply]
SELECT
  coalesce(source_id, '(unknown)') AS source_id,
  MIN(source_platform) AS source_platform,
  SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active,
  SUM(CASE WHEN is_active = 1 AND unixepoch(scraped_at) >= 1788256769 THEN 1 ELSE 0 END) AS net_new_7d,
  SUM(CASE WHEN is_active = 1 AND unixepoch(scraped_at) >= 1787651969 THEN 1 ELSE 0 END) AS net_new_14d,
  SUM(CASE WHEN is_active = 1 AND unixepoch(scraped_at) >= 1786269569 THEN 1 ELSE 0 END) AS net_new_30d,
  SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) AS inactive
FROM opportunities
GROUP BY coalesce(source_id, '(unknown)')
ORDER BY active DESC, source_id ASC;

-- [fetch_outcomes_7d]
SELECT
  source_id,
  SUM(CASE WHEN ok = 1 AND skipped = 0 AND coalesce(not_modified, 0) = 0 THEN 1 ELSE 0 END) AS real_fetches,
  SUM(CASE WHEN ok = 1 AND skipped = 0 AND coalesce(not_modified, 0) = 1 THEN 1 ELSE 0 END) AS unchanged,
  SUM(CASE WHEN skipped = 1 THEN 1 ELSE 0 END) AS skips,
  SUM(CASE WHEN ok = 0 AND skipped = 0 THEN 1 ELSE 0 END) AS failures,
  SUM(CASE WHEN ok = 1 AND skipped = 0 AND coalesce(not_modified, 0) = 0 AND count = 0 THEN 1 ELSE 0 END) AS zero_yield,
  SUM(CASE WHEN ok = 1 AND skipped = 0 AND coalesce(not_modified, 0) = 0 THEN count ELSE 0 END) AS items
FROM source_fetch_events
WHERE unixepoch(timestamp) >= 1788256769
  AND substr(source_id, 1, 2) <> '__'
GROUP BY source_id
ORDER BY real_fetches DESC, source_id ASC;

-- [triage_outcomes_7d]
SELECT
  coalesce(source_id, '(unknown)') AS source_id,
  SUM(CASE WHEN ph_eligibility IN ('eligible_verified', 'eligible_likely') THEN 1 ELSE 0 END) AS eligible,
  SUM(CASE WHEN ph_eligibility = 'unclear' THEN 1 ELSE 0 END) AS unclear,
  SUM(CASE WHEN ph_eligibility = 'ineligible' THEN 1 ELSE 0 END) AS ineligible,
  SUM(CASE WHEN inactive_reason = 'policy-rejected' THEN 1 ELSE 0 END) AS policy_rejected,
  COUNT(*) AS total_stored
FROM opportunities
WHERE unixepoch(scraped_at) >= 1788256769
GROUP BY coalesce(source_id, '(unknown)')
ORDER BY total_stored DESC, source_id ASC;
