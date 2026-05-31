ALTER TABLE `opportunities` ADD `category` text DEFAULT 'other' NOT NULL;--> statement-breakpoint
CREATE INDEX `category_idx` ON `opportunities` (`category`);