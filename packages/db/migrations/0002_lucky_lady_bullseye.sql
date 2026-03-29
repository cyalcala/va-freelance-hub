-- SURGICAL REPAIR (Warden Protocol)
-- All tables and columns already exist from previous corrupted migrations.
-- Only the unique index is missing.
CREATE UNIQUE INDEX IF NOT EXISTS `title_company_idx` ON `opportunities` (`title`,`company`);