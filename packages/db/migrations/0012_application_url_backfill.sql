-- Backfill application_url with source_url for rows where no separate application URL exists.
UPDATE opportunities
SET application_url = source_url
WHERE (application_url IS NULL OR TRIM(application_url) = '')
  AND source_url IS NOT NULL
  AND TRIM(source_url) <> '';
