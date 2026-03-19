ALTER TABLE `agencies` ADD `hiring_heat` integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE `agencies` ADD `friction_level` integer DEFAULT 3;--> statement-breakpoint
ALTER TABLE `opportunities` ADD `tier` integer DEFAULT 3;