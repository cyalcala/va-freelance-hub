-- Bootstrap-safe migration ledger sync for Cloudflare D1.
--
-- This script is idempotent and safe for both fresh and legacy databases:
-- - Fresh database: core tables don't exist → no premarking → wrangler applies all migrations 0000-0033
-- - Legacy database: core tables exist → premarks foundational migrations 0000-0008 → wrangler applies remaining
--
-- The foundational migrations (0000-0008) create the core schema:
--   0000: opportunities, va_directory, content_digests tables + unique indexes
--   0001-0003: va_directory boolean columns
--   0005-0008: additional schema evolution
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS d1_migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint

-- Only premark foundational migrations if core tables already exist (legacy database).
-- This prevents fresh databases from skipping the actual table creation in 0000.
INSERT OR IGNORE INTO d1_migrations (name)
SELECT '0000_workable_sandman.sql'
WHERE EXISTS (SELECT 1 FROM sqlite_master WHERE type='table' AND name='opportunities');
--> statement-breakpoint

INSERT OR IGNORE INTO d1_migrations (name)
SELECT '0001_true_quasar.sql'
WHERE EXISTS (SELECT 1 FROM sqlite_master WHERE type='table' AND name='opportunities');
--> statement-breakpoint

INSERT OR IGNORE INTO d1_migrations (name)
SELECT '0002_dashing_microchip.sql'
WHERE EXISTS (SELECT 1 FROM sqlite_master WHERE type='table' AND name='opportunities');
--> statement-breakpoint

INSERT OR IGNORE INTO d1_migrations (name)
SELECT '0003_yielding_maelstrom.sql'
WHERE EXISTS (SELECT 1 FROM sqlite_master WHERE type='table' AND name='opportunities');
--> statement-breakpoint

INSERT OR IGNORE INTO d1_migrations (name)
SELECT '0005_harsh_punisher.sql'
WHERE EXISTS (SELECT 1 FROM sqlite_master WHERE type='table' AND name='opportunities');
--> statement-breakpoint

INSERT OR IGNORE INTO d1_migrations (name)
SELECT '0006_third_bloodstorm.sql'
WHERE EXISTS (SELECT 1 FROM sqlite_master WHERE type='table' AND name='opportunities');
--> statement-breakpoint

INSERT OR IGNORE INTO d1_migrations (name)
SELECT '0007_orange_wolf_cub.sql'
WHERE EXISTS (SELECT 1 FROM sqlite_master WHERE type='table' AND name='opportunities');
--> statement-breakpoint

INSERT OR IGNORE INTO d1_migrations (name)
SELECT '0008_amused_lilith.sql'
WHERE EXISTS (SELECT 1 FROM sqlite_master WHERE type='table' AND name='opportunities');