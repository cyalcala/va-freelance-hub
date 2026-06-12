-- Archive Remote OK physical/logistics roles that slipped through before the
-- source-specific JSON adapter filter was tightened.
UPDATE opportunities
SET
  is_active = 0,
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE
  source_platform = 'RemoteOK'
  AND is_active = 1
  AND (
    lower(title) LIKE '%courier%'
    OR lower(title) LIKE '%mail carrier%'
    OR lower(title) LIKE '%driver%'
    OR lower(title) LIKE '%delivery%'
    OR lower(title) LIKE '%warehouse%'
    OR lower(title) LIKE '%photographer%'
    OR lower(title) LIKE '%civil engineer%'
    OR lower(title) LIKE '%logistics%'
    OR lower(title) LIKE '%fulfillment operations%'
  );
