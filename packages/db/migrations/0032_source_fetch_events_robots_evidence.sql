-- COMP-01A: Persist robots decisions for static and ATS sources (2026-08-22).
--
-- Robots evidence was previously computed per-fetch but only reported in the
-- scrape response. Static sources had a `robotsCheckForSource` call; ATS fetches
-- bypassed the robots gate entirely. The event schema recorded only 12 columns,
-- omitting the verdict, evidence, crawl-delay, would-block flag, mode, and
-- the origin that was actually checked. This migration adds a minimal,
-- append-only set of columns so every fetch attempt — static or ATS — leaves a
-- durable, queryable robots decision record.
--
-- The gate remains in observe mode (ROBOTS_MODE="observe"); enforcement is a
-- separate, approval-gated step (COMP-01B). Idempotent: safe to re-apply.

ALTER TABLE source_fetch_events ADD COLUMN robots_origin TEXT;
ALTER TABLE source_fetch_events ADD COLUMN robots_verdict TEXT;
ALTER TABLE source_fetch_events ADD COLUMN robots_evidence TEXT;
ALTER TABLE source_fetch_events ADD COLUMN robots_crawl_delay INTEGER;
ALTER TABLE source_fetch_events ADD COLUMN robots_would_block INTEGER;
ALTER TABLE source_fetch_events ADD COLUMN robots_mode TEXT;

-- Supports compliance rollups and Sentinel queries: "which origins were
-- disallowed this week?" without scanning every event's full evidence text.
CREATE INDEX IF NOT EXISTS source_fetch_events_robots_origin_idx
  ON source_fetch_events (robots_origin);
CREATE INDEX IF NOT EXISTS source_fetch_events_robots_verdict_idx
  ON source_fetch_events (robots_verdict);