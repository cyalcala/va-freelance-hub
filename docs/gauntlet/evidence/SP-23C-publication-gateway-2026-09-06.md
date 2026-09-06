# SP-23C shared publication and automatic rollback

Status: **IN_PROGRESS / VERIFYING**. This slice does not activate a source or
enable canary fetch.

## Bounded work contract

Public writers reserve exposure through `publishPublicExposure` and migration 0041.
Exact-six / registry-active sources stay unlimited. A canary batch that itself
exceeds the cap rolls back to shadow and publishes nothing. A later batch in the
same tick that would exceed the remaining cap is blocked without a partial
publish. Hidden pending/rejected inserts are not exposure.

Wired: scrape accepted inserts, `/api/ingest` public inserts, Inngest
triage-drain publish, inline pending-triage drain, gate-eligible recovery, and
stale/link reactivation. Tests without `env.DB.prepare` keep the legacy write
path. Production 0041 evidence:
`docs/gauntlet/evidence/SP-23C-production-verification-2026-09-06/source-transition-evidence.json`.
