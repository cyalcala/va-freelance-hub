CREATE TABLE `content_digests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`creator_name` text NOT NULL,
	`video_id` text NOT NULL,
	`video_title` text NOT NULL,
	`video_url` text NOT NULL,
	`transcript_raw` text,
	`action_plan` text DEFAULT '[]',
	`tags` text DEFAULT '[]',
	`published_at` text,
	`processed_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `opportunities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`company` text,
	`type` text DEFAULT 'freelance' NOT NULL,
	`source_url` text NOT NULL,
	`source_platform` text NOT NULL,
	`tags` text DEFAULT '[]',
	`location_type` text DEFAULT 'remote',
	`pay_range` text,
	`description` text,
	`posted_at` text,
	`scraped_at` text DEFAULT (datetime('now')) NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`content_hash` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `va_directory` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_name` text NOT NULL,
	`website` text,
	`hires_filipinos` integer DEFAULT true NOT NULL,
	`niche` text DEFAULT 'admin',
	`hiring_page_url` text,
	`verified_at` text,
	`notes` text,
	`rating` integer,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `content_digests_video_id_unique` ON `content_digests` (`video_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `opportunities_source_url_unique` ON `opportunities` (`source_url`);