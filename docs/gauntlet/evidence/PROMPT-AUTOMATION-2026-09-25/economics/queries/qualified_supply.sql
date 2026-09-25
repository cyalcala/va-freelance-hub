SELECT
  COUNT(*) AS qualified_active,
  SUM(CASE WHEN unixepoch(scraped_at) >= 1789698709 THEN 1 ELSE 0 END) AS qualified_new_7d,
  SUM(CASE WHEN unixepoch(scraped_at) >= 1787711509 THEN 1 ELSE 0 END) AS qualified_new_30d
FROM opportunities
WHERE is_active = 1 AND ph_eligibility IN ('eligible_verified', 'eligible_likely')
  AND unixepoch(scraped_at) <= 1790303509;
