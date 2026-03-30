CREATE TABLE IF NOT EXISTS `extraction_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`source_name` text NOT NULL,
	`jsonata_pattern` text NOT NULL,
	`confidence_score` integer DEFAULT 0,
	`sample_payload` text,
	`last_validated_at` integer,
	`created_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `extraction_rules_source_name_unique` ON `extraction_rules` (`source_name`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `__new_opportunities` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`company` text DEFAULT 'Generic' NOT NULL,
	`type` text DEFAULT 'agency' NOT NULL,
	`source_url` text NOT NULL,
	`source_platform` text DEFAULT 'Generic' NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`location_type` text DEFAULT 'remote' NOT NULL,
	`pay_range` text,
	`description` text,
	`posted_at` integer,
	`scraped_at` integer NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`tier` integer DEFAULT 3 NOT NULL,
	`content_hash` text,
	`latest_activity_ms` integer DEFAULT 0 NOT NULL,
	`company_logo` text,
	`metadata` text DEFAULT '{}' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
INSERT OR IGNORE INTO `__new_opportunities`("id", "title", "company", "type", "source_url", "source_platform", "tags", "location_type", "pay_range", "description", "posted_at", "scraped_at", "is_active", "tier", "content_hash", "latest_activity_ms", "company_logo", "metadata", "created_at") SELECT "id", "title", "company", "type", "source_url", "source_platform", "tags", "location_type", "pay_range", "description", "posted_at", "scraped_at", "is_active", "tier", "content_hash", "latest_activity_ms", "company_logo", "metadata", "created_at" FROM `opportunities`;--> statement-breakpoint
DROP TABLE IF EXISTS `opportunities`;--> statement-breakpoint
ALTER TABLE `__new_opportunities` RENAME TO `opportunities`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `title_company_idx` ON `opportunities` (`title`,`company`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `tier_latest_idx` ON `opportunities` (`tier`,`latest_activity_ms`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `active_idx` ON `opportunities` (`is_active`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `source_platform_idx` ON `opportunities` (`source_platform`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `type_idx` ON `opportunities` (`type`);--> statement-breakpoint
-- ALTER TABLE `system_health` ADD `consecutive_failures` integer DEFAULT 0;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `timestamp_idx` ON `logs` (`timestamp`);