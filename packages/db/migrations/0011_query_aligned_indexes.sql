CREATE INDEX IF NOT EXISTS `active_posted_idx` ON `opportunities` (`is_active`, `posted_at` DESC);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `category_active_posted_idx` ON `opportunities` (`category`, `is_active`, `posted_at` DESC);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `active_last_verified_idx` ON `opportunities` (`is_active`, `last_verified_at` ASC);
