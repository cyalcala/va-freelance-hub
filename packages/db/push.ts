/**
 * LEGACY_QUARANTINE
 *
 * Direct schema pushes can silently diverge from reviewable migrations. The
 * old Turso helper is retained only as a Git-history recovery reference.
 */
throw new Error("LEGACY_QUARANTINE: direct Turso schema pushes are archived. Use checked-in Cloudflare D1 migrations.");
