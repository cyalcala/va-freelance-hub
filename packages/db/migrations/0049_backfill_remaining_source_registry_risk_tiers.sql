-- Migration 0049: Backfill remaining source_registry risk tiers (workable, recruitee, teamtailor)
--
-- Closes risk tier gaps for all unauthenticated structured ATS and syndication providers
-- classifying them as Tier A (minShadowDays = 3) under ADR-008.

UPDATE source_registry
SET risk_tier = 'tier_a', shadow_window_days = 3
WHERE risk_tier IS NULL
  AND provider_id IN ('workable', 'recruitee', 'teamtailor');
