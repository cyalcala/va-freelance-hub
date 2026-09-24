-- Migration 0045: Add September 24 graduated Breezy VA agencies to va_directory
--
-- Registers Remote Craft, VALUE Virtual Assistants, and Yokly in the public
-- VA Directory so they appear on /directory and are automatically included in
-- ATS opportunity ingestion.

CREATE TABLE IF NOT EXISTS va_directory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_name TEXT NOT NULL,
  website TEXT,
  hires_filipinos INTEGER DEFAULT 1 NOT NULL,
  niche TEXT DEFAULT 'australian-dayshift' NOT NULL,
  hiring_page_url TEXT,
  verified_at TEXT,
  notes TEXT,
  rating INTEGER,
  is_dayshift INTEGER DEFAULT 0 NOT NULL,
  is_verified INTEGER DEFAULT 0 NOT NULL,
  is_remote INTEGER DEFAULT 1 NOT NULL,
  is_marketplace INTEGER DEFAULT 0 NOT NULL,
  ats_platform TEXT,
  ats_token TEXT,
  link_status TEXT,
  link_checked_at TEXT,
  link_evidence TEXT,
  link_fail_count INTEGER DEFAULT 0 NOT NULL,
  website_source TEXT,
  website_evidence TEXT,
  website_set_at TEXT,
  created_at TEXT DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint


INSERT INTO va_directory (
  company_name,
  website,
  hires_filipinos,
  niche,
  hiring_page_url,
  verified_at,
  notes,
  is_dayshift,
  is_verified,
  is_remote,
  is_marketplace,
  ats_platform,
  ats_token,
  link_status,
  link_checked_at,
  link_evidence,
  link_fail_count,
  created_at
)
SELECT
  'Remote Craft',
  'https://remote-craft.breezy.hr',
  1,
  'global-va',
  'https://remote-craft.breezy.hr',
  datetime('now'),
  'Graduated Breezy HR agency for Filipino talent (September 24, 2026 graduation).',
  0,
  1,
  1,
  0,
  'breezy',
  'remote-craft',
  'ok',
  datetime('now'),
  'HTTP 200',
  0,
  datetime('now')
WHERE NOT EXISTS (
  SELECT 1 FROM va_directory WHERE ats_platform = 'breezy' AND ats_token = 'remote-craft'
);
--> statement-breakpoint

INSERT INTO va_directory (
  company_name,
  website,
  hires_filipinos,
  niche,
  hiring_page_url,
  verified_at,
  notes,
  is_dayshift,
  is_verified,
  is_remote,
  is_marketplace,
  ats_platform,
  ats_token,
  link_status,
  link_checked_at,
  link_evidence,
  link_fail_count,
  created_at
)
SELECT
  'VALUE Virtual Assistants',
  'https://value-virtual-assistants.breezy.hr',
  1,
  'global-va',
  'https://value-virtual-assistants.breezy.hr',
  datetime('now'),
  'Graduated Breezy HR agency for Filipino talent (September 24, 2026 graduation).',
  0,
  1,
  1,
  0,
  'breezy',
  'value-virtual-assistants',
  'ok',
  datetime('now'),
  'HTTP 200',
  0,
  datetime('now')
WHERE NOT EXISTS (
  SELECT 1 FROM va_directory WHERE ats_platform = 'breezy' AND ats_token = 'value-virtual-assistants'
);
--> statement-breakpoint

INSERT INTO va_directory (
  company_name,
  website,
  hires_filipinos,
  niche,
  hiring_page_url,
  verified_at,
  notes,
  is_dayshift,
  is_verified,
  is_remote,
  is_marketplace,
  ats_platform,
  ats_token,
  link_status,
  link_checked_at,
  link_evidence,
  link_fail_count,
  created_at
)
SELECT
  'Yokly',
  'https://yokly.breezy.hr',
  1,
  'global-va',
  'https://yokly.breezy.hr',
  datetime('now'),
  'Graduated Breezy HR agency for Filipino talent (September 24, 2026 graduation).',
  0,
  1,
  1,
  0,
  'breezy',
  'yokly',
  'ok',
  datetime('now'),
  'HTTP 200',
  0,
  datetime('now')
WHERE NOT EXISTS (
  SELECT 1 FROM va_directory WHERE ats_platform = 'breezy' AND ats_token = 'yokly'
);
