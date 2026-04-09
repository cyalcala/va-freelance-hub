ALTER TABLE `opportunities` ADD `region` text DEFAULT 'Philippines' NOT NULL;--> statement-breakpoint
ALTER TABLE `vitals` ADD `region` text DEFAULT 'GLOBAL';--> statement-breakpoint
CREATE INDEX `region_idx` ON `opportunities` (`region`);