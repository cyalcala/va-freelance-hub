/**
 * LEGACY_QUARANTINE
 *
 * This one-off Gemini SDK probe is intentionally disabled. Production uses
 * the documented REST endpoint in scripts/gha/chef.ts and never exposes keys
 * in request URLs.
 */
throw new Error("LEGACY_QUARANTINE: standalone Gemini model probing is disabled.");
