CREATE TABLE IF NOT EXISTS `source_fetch_events` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  `source_id` TEXT NOT NULL,
  `source_name` TEXT NOT NULL,
  `source_type` TEXT NOT NULL,
  `collection_method` TEXT NOT NULL,
  `compliance_status` TEXT NOT NULL,
  `timestamp` TEXT NOT NULL,
  `ok` INTEGER NOT NULL,
  `skipped` INTEGER NOT NULL,
  `count` INTEGER DEFAULT 0 NOT NULL,
  `duration_ms` INTEGER DEFAULT 0 NOT NULL,
  `error` TEXT,
  `skip_reason` TEXT
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `source_fetch_events_source_id_idx` ON `source_fetch_events` (`source_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `source_fetch_events_timestamp_idx` ON `source_fetch_events` (`timestamp`);
