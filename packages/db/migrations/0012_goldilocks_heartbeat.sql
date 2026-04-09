ALTER TABLE `vitals` ADD `last_ingestion_heartbeat_ms` integer;--> statement-breakpoint
ALTER TABLE `vitals` ADD `last_processing_heartbeat_ms` integer;--> statement-breakpoint
ALTER TABLE `vitals` ADD `heartbeat_source` text;