-- DATA-05B (2026-08-23): structured provenance for va_directory.website.
--
-- The retired enrichment heuristic wrote company websites from job URLs with
-- only dated free-text notes as evidence (see the DATA-05A incident). These
-- additive columns give every current and future website value an explicit
-- source, evidence pointer, and write timestamp:
--
--   website_source   'curated'       seed/import insert
--                    'manual'        human edit
--                    'enrichment'    automated writer (retired; never written)
--                    'repair_cleared' approval-gated DATA-05B repair cleared an
--                                    unsupported value (website is then NULL)
--   website_evidence redacted evidence pointer (note marker / evidence hash)
--   website_set_at   ISO timestamp of the last website write
--
-- NULL means legacy/unknown provenance. NULL is unclassified, never trusted:
-- classification happens only through the read-only DATA-05B report, and any
-- mutation stays approval-gated behind human-reviewed evidence. No existing
-- values are modified or backfilled by this migration.

ALTER TABLE va_directory ADD COLUMN website_source TEXT;

ALTER TABLE va_directory ADD COLUMN website_evidence TEXT;

ALTER TABLE va_directory ADD COLUMN website_set_at TEXT;
