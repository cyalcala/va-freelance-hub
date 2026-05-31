ALTER TABLE `opportunities` ADD `last_verified_at` text;--> statement-breakpoint
CREATE INDEX `last_verified_idx` ON `opportunities` (`last_verified_at`);