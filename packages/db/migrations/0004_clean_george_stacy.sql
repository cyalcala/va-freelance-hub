CREATE TABLE IF NOT EXISTS `logs` (
	`id` text PRIMARY KEY NOT NULL,
	`message` text NOT NULL,
	`level` text DEFAULT 'info',
	`timestamp` integer NOT NULL,
	`metadata` text DEFAULT '{}'
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `vitals` (
	`id` text PRIMARY KEY NOT NULL,
	`ai_quota_count` integer DEFAULT 0,
	`ai_quota_date` text,
	`lock_status` text DEFAULT 'IDLE',
	`lock_updated_at` integer,
	`successive_failure_count` integer DEFAULT 0,
	`last_error_hash` text,
	`last_recovery_at` integer
);