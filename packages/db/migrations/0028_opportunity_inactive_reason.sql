-- Make inactive state explicit so automated recovery never mistakes a policy
-- rejection for a stale or temporarily unavailable listing.
--
-- Existing eligible rows are labelled only when their prior state is safely
-- inferable. This does not reactivate anything; it merely permits a future
-- healthy feed observation to do so. Policy-rejected/unclear legacy rows stay
-- unlabelled and therefore fail closed.

ALTER TABLE opportunities ADD COLUMN inactive_reason TEXT;

UPDATE opportunities
SET inactive_reason = CASE
  WHEN COALESCE(failed_verification_count, 0) >= 3 THEN 'link-unavailable'
  ELSE 'stale-feed'
END
WHERE is_active = 0
  AND inactive_reason IS NULL
  AND ph_eligibility IN ('eligible_verified', 'eligible_likely');
