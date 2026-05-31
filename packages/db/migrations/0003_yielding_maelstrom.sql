ALTER TABLE `opportunities` ADD `updated_at` text;--> statement-breakpoint
ALTER TABLE `opportunities` ADD `last_seen_in_feed_at` text;--> statement-breakpoint
ALTER TABLE `opportunities` ADD `failed_verification_count` integer DEFAULT 0 NOT NULL;