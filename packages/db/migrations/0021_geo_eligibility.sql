-- 0021: Geo-eligibility fields (geo masterplan L0, 2026-07)
-- Persist the structured location signals sources already send (RemoteOK
-- `location`, WWR RSS `<region>`, ATS office objects) plus the verdicts of
-- the deterministic geo-gate, so "truly hires Filipinos" is a first-class,
-- auditable property of every listing instead of an implicit AI guess.
--
-- geo_scope:      worldwide | apac_incl_ph | ph_only | region_excl_ph | country_locked | unknown
-- ph_eligibility: eligible_verified | eligible_likely | unclear | ineligible
-- geo_evidence:   one-line human-readable reason (shown in UI later)
--
-- Idempotency: SQLite has no IF NOT EXISTS for ADD COLUMN; the runner treats
-- "duplicate column name" as already-applied (same pattern as 0020).

ALTER TABLE opportunities ADD COLUMN location_raw TEXT;
ALTER TABLE opportunities ADD COLUMN geo_scope TEXT;
ALTER TABLE opportunities ADD COLUMN ph_eligibility TEXT;
ALTER TABLE opportunities ADD COLUMN geo_evidence TEXT;
ALTER TABLE opportunities ADD COLUMN geo_checked_at TEXT;

-- Board filtering will read (is_active, ph_eligibility) once the UI defaults
-- to "Open to Philippines".
CREATE INDEX IF NOT EXISTS active_ph_eligibility_idx
  ON opportunities (is_active, ph_eligibility);
