-- Runtime robots.txt cache (masterplan Phase 4A).
--
-- Before this table, every "robots allows this" claim in the codebase was a
-- human-written note in sources.ts recording a check made when the source was
-- added. Compliance was a snapshot, not a live contract: a source could revoke
-- access and nothing in the runtime would notice.
--
-- One row per origin, not per source. Several sources can share an origin, and
-- a single robots.txt governs all of them, so caching by origin means one fetch
-- serves every check against that host. That matters on two axes at once: it
-- keeps the crawl polite (we do not re-request robots.txt for each feed) and it
-- keeps us inside the Workers free tier.
--
-- Idempotent: safe to re-apply.

CREATE TABLE IF NOT EXISTS robots_cache (
  -- Scheme + host + port, e.g. "https://remoteok.com". The unit robots.txt
  -- actually governs.
  origin TEXT PRIMARY KEY NOT NULL,

  -- When this entry was fetched. TTL is enforced at read time rather than by a
  -- cleanup job, so a stale row is harmless until it is next consulted.
  fetched_at TEXT NOT NULL,

  -- HTTP status of the robots.txt fetch itself. Retained because the status
  -- carries meaning independent of the body: 404 means "no rules published"
  -- while 429/5xx mean "we could not ask", and those must not be conflated.
  status INTEGER NOT NULL,

  -- Raw document, bounded by the fetcher. Stored so a decision can be re-derived
  -- and audited after the fact rather than only trusted.
  body TEXT,

  -- Crawl-delay in seconds for the group matching our user agent, when declared.
  crawl_delay INTEGER,

  -- Content Signals as JSON, e.g. {"search":true,"aiTrain":false,"use":"reference"}.
  -- Kept as a blob because the signal vocabulary is still evolving; promoting a
  -- signal to a column is a later migration once one proves load-bearing.
  content_signals TEXT,

  -- Populated when the fetch failed outright (network error, timeout). Distinct
  -- from a non-2xx status, which is a successful fetch of a refusal.
  error TEXT
);

-- Supports the TTL sweep and any "which origins have we checked recently" audit
-- on the transparency ledger (masterplan 4E).
CREATE INDEX IF NOT EXISTS robots_cache_fetched_at_idx
  ON robots_cache (fetched_at);
