ALTER TABLE `opportunities` ADD `experience_level` text;--> statement-breakpoint
ALTER TABLE `opportunities` ADD `description_hash` text;--> statement-breakpoint
ALTER TABLE `opportunities` ADD `click_count` integer DEFAULT 0 NOT NULL;