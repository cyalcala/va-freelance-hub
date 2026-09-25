-- Migration 0046: Reconcile Breezy onsite and unclear eligibility
--
-- Rectifies the largest demonstrated loss in the repository (Sourcefit & 20Four7VA 7d cohorts).
-- 1. Deactivates onsite Sourcefit positions (BPO positions in Eastwood/Bridgetowne/Cebu with Remote: no).
-- 2. Upgrades verified remote Sourcefit positions (Remote: yes) to eligible_verified.
-- 3. Upgrades verified remote 20Four7VA positions (Remote: yes) to eligible_likely.
-- 4. Reconciles auto-published gate-eligible pending rows to their deterministic gate tier.

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

-- Step 1: Deactivate onsite Sourcefit positions that slipped past as remote
UPDATE opportunities
SET is_active = 0,
    inactive_reason = 'policy-rejected',
    location_type = 'onsite',
    ph_eligibility = 'ineligible',
    geo_evidence = 'Onsite BPO posting: non-remote position in the Philippines (Remote: no)',
    updated_at = datetime('now')
WHERE source_id = 'breezy:sourcefit'
  AND description LIKE '%Remote: no%';
--> statement-breakpoint

-- Step 2: Upgrade verified remote Sourcefit jobs to eligible_verified
UPDATE opportunities
SET ph_eligibility = 'eligible_verified',
    geo_scope = 'ph_only',
    geo_evidence = 'Verified remote Philippine opportunity (Sourcefit WFH)',
    updated_at = datetime('now')
WHERE source_id = 'breezy:sourcefit'
  AND is_active = 1
  AND ph_eligibility = 'unclear'
  AND description LIKE '%Remote: yes%';
--> statement-breakpoint

-- Step 3: Upgrade verified remote 20Four7VA jobs to eligible_likely
UPDATE opportunities
SET ph_eligibility = 'eligible_likely',
    geo_scope = 'worldwide',
    geo_evidence = 'Verified remote VA opportunity (20Four7VA Worldwide)',
    updated_at = datetime('now')
WHERE source_id = 'breezy:20four7va'
  AND is_active = 1
  AND ph_eligibility = 'unclear'
  AND description LIKE '%Remote: yes%';
--> statement-breakpoint

-- Step 4: Reconcile auto-published gate-eligible pending rows with clean remote descriptions
UPDATE opportunities
SET ph_eligibility = (CASE
      WHEN geo_scope = 'ph_only' THEN 'eligible_verified'
      ELSE 'eligible_likely'
    END),
    updated_at = datetime('now')
WHERE is_active = 1
  AND ph_eligibility = 'unclear'
  AND geo_evidence = 'Geo-gate eligible; auto-published pending AI re-vet'
  AND (description IS NULL OR description NOT LIKE '%Remote: no%');
