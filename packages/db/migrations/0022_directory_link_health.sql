-- 0022: Directory link-health tracking (automated directory pulse, 2026-07)
-- The 2026-07 manual audit found 16 dead directory links (vanished domains,
-- parked/for-sale pages) plus 41 bot-wall false positives that a naive checker
-- would have wrongly removed. This makes that distinction a first-class,
-- recurring check: a scheduled pulse re-verifies every company's website on a
-- rotating budget and records verdict + evidence + a 3-strike counter.
-- Flagging is human-gated by design: three consecutive hard-dead checks set
-- is_verified = 0 and annotate — nothing is ever auto-deleted.
--
-- link_status: ok | bot_wall | dead_http | dead_dns | parked | no_url
-- Idempotency: "duplicate column name" treated as already-applied (0020/0021 pattern).

ALTER TABLE va_directory ADD COLUMN link_status TEXT;
ALTER TABLE va_directory ADD COLUMN link_checked_at TEXT;
ALTER TABLE va_directory ADD COLUMN link_evidence TEXT;
ALTER TABLE va_directory ADD COLUMN link_fail_count INTEGER NOT NULL DEFAULT 0;

-- The pulse selects its per-run budget by oldest check first.
CREATE INDEX IF NOT EXISTS va_directory_link_checked_idx
  ON va_directory (link_checked_at);
