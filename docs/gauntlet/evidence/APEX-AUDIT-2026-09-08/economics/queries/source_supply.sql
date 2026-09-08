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
