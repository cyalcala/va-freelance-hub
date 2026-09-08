SELECT
  COUNT(*) AS active,
  SUM(CASE WHEN unixepoch(scraped_at) >= 1788256769 THEN 1 ELSE 0 END) AS net_new_7d,
  SUM(CASE WHEN unixepoch(scraped_at) >= 1787651969 THEN 1 ELSE 0 END) AS net_new_14d,
  SUM(CASE WHEN unixepoch(scraped_at) >= 1786269569 THEN 1 ELSE 0 END) AS net_new_30d
FROM opportunities
WHERE is_active = 1;
