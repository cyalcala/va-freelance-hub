# ADR-004: Migrate Before Deploy and Validate FTS

## Status

Accepted

## Date

2026-08-09

## Context

The Pages deployment and D1 migration workflows previously ran independently
on a migration push. They had different concurrency groups, so a Pages build
containing FTS query code could deploy before the migration that created or
repaired the associated D1 index. The user-facing search route treats a D1
failure as an empty result set, making this a green-workflow, empty-search
failure mode.

The FTS table is an SQLite external-content table backed by `opportunities`.
Its original active-only backfill did not cover every content row, while its
unscoped update trigger rewrote index entries for unrelated operational fields.

## Decision

Use the main CI workflow as the sole normal production release path:

1. Validate project-owned tests, build, and strict TypeScript.
2. Acquire a production-D1 concurrency lock.
3. Apply D1 migrations.
4. Run SQLite FTS5 `integrity-check` against production D1.
5. Deploy Pages only after every prior step succeeds.

The standalone migration workflow remains manual recovery only and shares the
same D1 lock. Migration 0027 rebuilds the FTS index from all external-content
rows and limits FTS update triggers to `title`, `company`, and `tags`.

## Alternatives Considered

### Keep independent push-triggered migration and Pages workflows

- Pros: shorter workflows and no duplicate build.
- Cons: does not establish a happens-before relationship between schema and
  query code; a concurrency setting in either workflow alone cannot order them.
- Rejected: correctness of search availability is more important than the
  extra release-job build.

### Deploy first and rely on a later migration retry

- Pros: fastest code deployment.
- Cons: creates a window where a new query can produce empty results, and the
  retry masks the release defect instead of preventing it.
- Rejected: unacceptable for a public job discovery surface.

### Remove external-content FTS and store copied text in a contentless index

- Pros: simpler isolation from the main table.
- Cons: duplicates text storage and requires a larger data-model change with
  no demonstrated need.
- Rejected: repairing the established external-content model is lower risk.

## Consequences

- Production releases take one additional build in the release job.
- A failed migration or FTS integrity check blocks Pages deployment, yielding a
  visible failure rather than an implicit empty-search incident.
- Manual recovery requires an explicit reason and waits behind an active
  normal release.
- Future indexed fields must be added to both the FTS table and the scoped
  update trigger in a migration, with an integrity contract test.
