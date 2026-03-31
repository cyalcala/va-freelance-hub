DROP INDEX `title_company_idx`;--> statement-breakpoint
CREATE UNIQUE INDEX `title_company_unique_idx` ON `opportunities` (`title`,`company`);