CREATE TABLE `opportunities` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`company` text,
	`type` text DEFAULT 'agency',
	`source_url` text NOT NULL,
	`source_platform` text,
	`tags` text DEFAULT '[]',
	`location_type` text DEFAULT 'remote',
	`pay_range` text,
	`description` text,
	`posted_at` integer,
	`scraped_at` integer NOT NULL,
	`is_active` integer DEFAULT true,
	`content_hash` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `opportunities_content_hash_unique` ON `opportunities` (`content_hash`);