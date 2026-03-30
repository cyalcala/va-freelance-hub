DROP INDEX IF EXISTS `opportunities_content_hash_unique`;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `tier_latest_idx` ON `opportunities` (`tier`,`latest_activity_ms`);