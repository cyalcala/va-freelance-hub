CREATE INDEX `active_scraped_idx` ON `opportunities` (`is_active`,`scraped_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `content_hash_idx` ON `opportunities` (`content_hash`);