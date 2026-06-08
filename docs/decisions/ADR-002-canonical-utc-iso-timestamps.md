# ADR-002: Use UTC ISO 8601 Timestamps For App-Owned Writes

## Status

Accepted

## Date

2026-06-09

## Context

The audit found mixed timestamp formats in D1. Source scrapers usually emit UTC
ISO 8601 strings such as `2026-06-05T18:44:00.000Z`, while SQLite defaults and
some API updates emitted `YYYY-MM-DD HH:MM:SS` through `datetime('now')`.

Because D1 stores these fields as text, mixed formats can make freshness and
stale-job comparisons fragile. Rebuilding production tables only to change
defaults would be a larger migration than this phase needs.

## Decision

Use `new Date().toISOString()` as the canonical format for TypeScript-owned
timestamp writes.

Application routes must:

- normalize incoming source timestamps to UTC ISO when a source provides them;
- leave unknown `postedAt` values as `null` instead of inventing a posting date;
- write app-generated `scrapedAt`, `lastSeenInFeedAt`, `lastVerifiedAt`,
  `updatedAt`, and digest `processedAt` values as UTC ISO strings;
- compare stale-job timestamps through SQLite date functions until historical
  rows are backfilled.

Existing SQLite defaults remain fallback debt for now. The production backfill
and any table-default rebuild belong to the later data-quality phase because
they need measured production evidence and rollback planning.

## Alternatives Considered

### Rebuild D1 Tables To Change Defaults Immediately

This would make database defaults canonical too, but it requires a table rebuild
and production migration risk for little immediate benefit because API routes can
write explicit timestamps.

### Use Epoch Milliseconds

Epoch values compare well numerically, but they would require wider changes to
rendering, source import paths, and existing text-date records.

### Continue With Mixed Text Dates

This avoids code changes, but keeps the stale-data bug class open and conflicts
with the audit's indexing/freshness foundation.

## Consequences

- New API-created opportunity and digest records no longer depend on mixed
  SQLite `datetime('now')` values.
- Historical rows can remain mixed until the P5 backfill slice.
- Stale checks can safely parse both historical SQLite timestamps and new ISO
  timestamps while the database is mixed.
- Future agents should not add new `datetime('now')` writes in app-owned
  ingestion or verification code.
