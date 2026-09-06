# SP-23C shared publication and automatic rollback

Status: **IN_PROGRESS**. This slice does not activate a source or enable canary fetch.

## Bounded work contract

Public writers reserve exposure through `publishPublicExposure` and migration 0041.
Exact-six / registry-active sources stay unlimited. A canary batch that itself
exceeds the cap rolls back to shadow and publishes nothing. A later batch in the
same tick that would exceed the remaining cap is blocked without a partial
publish. Hidden pending/rejected inserts are not exposure.

Wired now: scrape accepted inserts, `/api/ingest` public inserts, and the Inngest
triage-drain publish path. Inline pending-triage drain, gate-eligible recovery,
and stale/link reactivation still need the same helper before this slice is
complete.
