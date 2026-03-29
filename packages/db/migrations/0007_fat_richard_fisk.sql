CREATE TABLE IF NOT EXISTS `noteslog` (
	`id` text PRIMARY KEY NOT NULL,
	`timestamp` integer NOT NULL,
	`drift_minutes` integer NOT NULL,
	`actions_taken` text NOT NULL,
	`status` text NOT NULL,
	`metadata` text DEFAULT '{}'
);