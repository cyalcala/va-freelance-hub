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
