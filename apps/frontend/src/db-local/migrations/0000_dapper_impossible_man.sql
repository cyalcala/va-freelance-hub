CREATE TABLE `agencies` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`website_url` text,
	`hiring_url` text NOT NULL,
	`logo_url` text,
	`description` text,
	`status` text DEFAULT 'active',
	`last_sync` integer NOT NULL,
	`verified_at` integer,
	`metadata` text,
	`score` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agencies_slug_unique` ON `agencies` (`slug`);