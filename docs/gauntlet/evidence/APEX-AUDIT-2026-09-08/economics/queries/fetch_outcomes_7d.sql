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
