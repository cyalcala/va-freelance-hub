SELECT
  COUNT(*) AS total,
  SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active,
  SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) AS inactive,
  SUM(CASE WHEN source_id IS NOT NULL THEN 1 ELSE 0 END) AS with_source_id,
  SUM(CASE WHEN source_id IS NULL THEN 1 ELSE 0 END) AS null_source_id,
  SUM(CASE WHEN is_active = 1 AND source_id IS NOT NULL THEN 1 ELSE 0 END) AS active_with_source_id,
  SUM(CASE WHEN is_active = 1 AND source_id IS NULL THEN 1 ELSE 0 END) AS active_null_source_id
FROM opportunities;
