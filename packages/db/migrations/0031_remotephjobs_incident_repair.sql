-- DATA-05 incident repair (2026-08-22).
--
-- remotephjobs.com is an external site and is not owned by VA Freelance Hub.
-- The production site is remotejobs-ph.pages.dev. Preserve legitimate indexing
-- where remotephjobs.com is itself the attributable source; repair only values
-- where that host was copied across unrelated source/company boundaries.

UPDATE opportunities
SET application_url = source_url,
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE (
    lower(trim(application_url)) GLOB 'http://remotephjobs.com/*'
    OR lower(trim(application_url)) GLOB 'https://remotephjobs.com/*'
    OR lower(trim(application_url)) GLOB 'http://www.remotephjobs.com/*'
    OR lower(trim(application_url)) GLOB 'https://www.remotephjobs.com/*'
  )
  AND NOT (
    lower(trim(source_url)) GLOB 'http://remotephjobs.com/*'
    OR lower(trim(source_url)) GLOB 'https://remotephjobs.com/*'
    OR lower(trim(source_url)) GLOB 'http://www.remotephjobs.com/*'
    OR lower(trim(source_url)) GLOB 'https://www.remotephjobs.com/*'
  );

UPDATE va_directory
SET website = NULL,
    link_status = NULL,
    link_checked_at = NULL,
    link_evidence = NULL,
    link_fail_count = 0,
    notes = coalesce(notes || ' | ', '')
      || '[incident 2026-08-22] cleared unattributable remotephjobs.com website; external source is not company ownership evidence'
WHERE company_name IN (
    'Alpaca',
    'Xapo Bank',
    'Metabase',
    'CoinMarketCap',
    'Instrumentl',
    'Bobtail',
    'Maven Clinic',
    'APEX TRADE'
  )
  AND lower(trim(website)) IN (
    'http://remotephjobs.com',
    'http://remotephjobs.com/',
    'https://remotephjobs.com',
    'https://remotephjobs.com/',
    'http://www.remotephjobs.com',
    'http://www.remotephjobs.com/',
    'https://www.remotephjobs.com',
    'https://www.remotephjobs.com/'
  );
