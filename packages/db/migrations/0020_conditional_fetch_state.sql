-- Freshness masterplan 2026-07 (Phase-2 core): conditional-request state.
-- Stores HTTP validators (ETag / Last-Modified) and a hash of the last feed
-- body per source so the scraper can send If-None-Match / If-Modified-Since
-- and skip parse+triage entirely when a feed is unchanged (304 or identical
-- body). This REDUCES load on third-party sources — compliance-positive.
ALTER TABLE `source_fetch_state` ADD COLUMN `etag` TEXT;--> statement-breakpoint
ALTER TABLE `source_fetch_state` ADD COLUMN `last_modified` TEXT;--> statement-breakpoint
ALTER TABLE `source_fetch_state` ADD COLUMN `last_body_hash` TEXT;
