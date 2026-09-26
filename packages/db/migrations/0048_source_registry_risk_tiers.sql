-- Migration 0048: Add risk_tier and shadow_window_days to source_registry (ADR-008 enforcement)
--
-- Closes paper risk D1-MIGRATION-0048-RISK-TIERS.
-- Adds typed risk_tier and required minimum shadow observation window in days.

ALTER TABLE source_registry ADD COLUMN risk_tier TEXT CHECK (risk_tier IN ('tier_a', 'tier_b', 'tier_c') OR risk_tier IS NULL);
--> statement-breakpoint

ALTER TABLE source_registry ADD COLUMN shadow_window_days INTEGER CHECK (shadow_window_days IS NULL OR shadow_window_days > 0);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS source_registry_risk_tier_idx ON source_registry (risk_tier);
--> statement-breakpoint

-- Backfill existing sources with their ADR-008 risk tiers based on mechanism and provider
UPDATE source_registry
SET risk_tier = 'tier_a', shadow_window_days = 3
WHERE (provider_id LIKE '%ats%' OR provider_id LIKE '%greenhouse%' OR provider_id LIKE '%lever%' OR provider_id LIKE '%ashby%' OR provider_id LIKE '%breezy%' OR provider_id = 'we-work-remotely')
  AND risk_tier IS NULL;
--> statement-breakpoint

UPDATE source_registry
SET risk_tier = 'tier_b', shadow_window_days = 7
WHERE (provider_id LIKE '%jobicy%' OR provider_id LIKE '%remotive%' OR provider_id LIKE '%remote-ok%')
  AND risk_tier IS NULL;
--> statement-breakpoint

UPDATE source_registry
SET risk_tier = 'tier_c', shadow_window_days = 14
WHERE (provider_id LIKE '%html%' OR provider_id LIKE '%dom%')
  AND risk_tier IS NULL;
