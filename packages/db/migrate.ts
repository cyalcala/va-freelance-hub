/**
 * LEGACY_QUARANTINE
 *
 * The former Turso/Drizzle migration runner is intentionally disabled. Its
 * implementation remains available in Git history; the only supported
 * production migration path is the checked-in Cloudflare D1 command:
 * `bun run db:migrate` from the repository root.
 */
throw new Error("LEGACY_QUARANTINE: Turso migrations are archived. Use `bun run db:migrate` from the repository root.");
