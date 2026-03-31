DROP INDEX `title_company_unique_idx`;--> statement-breakpoint
CREATE UNIQUE INDEX `unique_job_idx` ON `opportunities` (`title`,`company`,`source_url`);