DROP INDEX `opportunities_content_hash_unique`;--> statement-breakpoint
ALTER TABLE `opportunities` ADD `latest_activity_ms` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `tier_latest_idx` ON `opportunities` (`tier`,`latest_activity_ms`);