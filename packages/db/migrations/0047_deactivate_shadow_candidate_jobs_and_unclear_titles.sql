-- Migration 0047: Deactivate shadow/candidate jobs and unclear titles
--
-- Rectifies constitutional governance leaks and title-level geo-gate escapes:
-- 1. Deactivates active jobs belonging to sources that are in shadow, candidate, or quarantined states.
-- 2. Deactivates active Nearform positions with country-locked titles (UK, Canada, USA, Ireland, etc.).
-- 3. Upgrades genuine Philippine Yokly positions with verified provincial locations to eligible_verified.
-- 4. Deactivates any remaining active jobs with unclear eligibility to guarantee that 100% of public board jobs are eligible.

CREATE TABLE IF NOT EXISTS opportunities (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  source_id TEXT,
  title TEXT NOT NULL,
  company TEXT,
  type TEXT DEFAULT 'freelance' NOT NULL,
  source_url TEXT NOT NULL,
  source_platform TEXT NOT NULL,
  tags TEXT DEFAULT '[]',
  location_type TEXT DEFAULT 'remote',
  location_raw TEXT,
  pay_range TEXT,
  description TEXT,
  posted_at TEXT,
  scraped_at TEXT DEFAULT (datetime('now')) NOT NULL,
  is_active INTEGER DEFAULT 1 NOT NULL,
  content_hash TEXT NOT NULL,
  inactive_reason TEXT,
  ph_eligibility TEXT DEFAULT 'unclear',
  geo_scope TEXT DEFAULT 'unknown',
  geo_evidence TEXT,
  updated_at TEXT
);
--> statement-breakpoint

-- Step 1: Deactivate active jobs belonging to sources in candidate, shadow, or quarantined states
UPDATE opportunities
SET is_active = 0,
    inactive_reason = 'policy-rejected',
    updated_at = datetime('now')
WHERE is_active = 1
  AND source_id IN (
    SELECT source_id FROM source_registry
    WHERE operational_state IN ('candidate', 'shadow', 'quarantined')
  );
--> statement-breakpoint

-- Step 2: Deactivate active Nearform positions with country-locked titles
UPDATE opportunities
SET is_active = 0,
    inactive_reason = 'policy-rejected',
    ph_eligibility = 'ineligible',
    geo_scope = 'country_locked',
    geo_evidence = 'Title-level country restriction: country-locked title',
    updated_at = datetime('now')
WHERE source_id = 'greenhouse:nearform'
  AND is_active = 1
  AND (
    title LIKE '%(Perm, UK%'
    OR title LIKE '%(Perm, Canada%'
    OR title LIKE '%(Perm, USA%'
    OR title LIKE '%(Perm, Ireland%'
    OR title LIKE '%(Contract, Brazil%'
    OR title LIKE '%(Perm, Romania%'
  );
--> statement-breakpoint

-- Step 3: Upgrade genuine Philippine Yokly positions with verified provincial locations
UPDATE opportunities
SET ph_eligibility = 'eligible_verified',
    geo_scope = 'ph_only',
    geo_evidence = 'Philippines-targeted: location in Philippines (Yokly WFH)',
    updated_at = datetime('now')
WHERE source_id = 'breezy:yokly'
  AND is_active = 1
  AND ph_eligibility = 'unclear'
  AND (
    location_raw LIKE '%, PH%'
    OR location_raw LIKE '%bohol%'
    OR location_raw LIKE '%luzon%'
    OR location_raw LIKE '%leyte%'
    OR location_raw LIKE '%batangas%'
    OR location_raw LIKE '%general santos%'
  );
--> statement-breakpoint

-- Step 4: Deactivate any remaining active jobs with unclear eligibility
UPDATE opportunities
SET is_active = 0,
    inactive_reason = 'policy-rejected',
    updated_at = datetime('now')
WHERE is_active = 1
  AND (ph_eligibility IS NULL OR ph_eligibility = 'unclear');
