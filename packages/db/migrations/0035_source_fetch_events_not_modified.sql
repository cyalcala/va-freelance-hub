-- SP-02 (2026-08-29): record whether a fetch event was an unchanged-feed
-- (HTTP 304 / identical body) conditional response.
--
-- A conditional-fetch "not modified" result is recorded as ok=1, skipped=0, and
-- its count is carried forward from the previous run (scrape.ts) so the feed
-- does not read as a zero-count source. That carry-forward is correct for
-- health display, but it silently inflates source economics: an unchanged poll
-- looks like a real fetch that produced N items, when it produced zero new
-- supply. "Items seen across unchanged polls is not supply" (SOURCE_PERPETUITY
-- strategy), so the source-economics report must separate unchanged feeds from
-- real fetches, failures, and true zero-yield.
--
-- Additive and nullable. Legacy event rows stay NULL and are treated as
-- "changed" (a real fetch) by coalesce in the report; every event written from
-- this migration onward carries the explicit flag.

ALTER TABLE source_fetch_events ADD COLUMN not_modified INTEGER;
