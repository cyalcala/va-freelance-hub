CREATE TABLE IF NOT EXISTS `source_fetch_state` (
  `source_id` TEXT PRIMARY KEY NOT NULL,
  `source_name` TEXT NOT NULL,
  `source_type` TEXT NOT NULL,
  `collection_method` TEXT NOT NULL,
  `compliance_status` TEXT NOT NULL,
  `last_attempt_at` TEXT,
  `last_success_at` TEXT,
  `last_count` INTEGER DEFAULT 0 NOT NULL,
  `last_error` TEXT,
  `updated_at` TEXT NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `source_fetch_state_last_attempt_idx` ON `source_fetch_state` (`last_attempt_at`);
