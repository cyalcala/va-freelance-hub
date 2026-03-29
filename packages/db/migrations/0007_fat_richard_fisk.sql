CREATE TABLE `noteslog` (
	`id` text PRIMARY KEY NOT NULL,
	`timestamp` integer NOT NULL,
	`drift_minutes` integer NOT NULL,
	`actions_taken` text NOT NULL,
	`status` text NOT NULL,
	`metadata` text DEFAULT '{}'
);
--> statement-breakpoint
ALTER TABLE `extraction_rules` ADD `failure_reason` text;--> statement-breakpoint
ALTER TABLE `extraction_rules` ADD `last_error_log` text;