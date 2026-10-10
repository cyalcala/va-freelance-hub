# Portfolio book membership — 2026-10-10

Local slice of PUBLICATION_PORTFOLIO_BOOK_MEMBERSHIP. This is not production
acceptance, a MATH card, a certified daily flow, or directory enrichment.

## What changed

After the book totals, the gateway stores one
`source_publication_portfolio_book_membership` row. Each side is a sorted JSON
array of source ids. `sets_differ` is 1 only when those arrays differ. The
table rejects a flag that disagrees with the arrays. A missing table fails
open: publication, the status comparison, and the book totals stand. Migration
0065 adds no `julianday('now')`. It was not applied to production D1. No new
clock, source, parameter, provider, or cadence. This does not claim MATH-08.

## What stays unchanged

- Unknown dates and null workplace stay on their existing holds.
- A lost ledger acknowledgement still returns `POST_PERSISTENCE_FAILURE` with
  exposure `UNKNOWN` and is not rolled back.
- Unlimited exact-six publication does not use the canary reservation.
- A missing reservation table still fails closed for capped writers. Do not
  deploy the reservation gateway before migration 0057.
- Status agreement remains a comparison of status labels.
- Equal book totals remain a comparison of totals. They are not the same
  source set.
- The Manila-day open count remains the newest OPEN snapshot.

## Evidence

Native bun:sqlite. A ledger history of two We Work Remotely receipts and two
already-public Remotive rows is followed by one Remotive publish. The write
stays unlimited. The ledger source set is Remotive and We Work Remotely. The
serving source set is Remotive only. The book totals are equal and
`totals_differ` is 0. Both source and family statuses agree. The stored arrays
match those sets and `sets_differ` is 1. One source on both sides stores
`sets_differ` 0. Dropping the table still publishes and still writes the book
totals and the status comparison. No live D1, provider, or browser proof.

Before the writer stored the row, the sets already differed while the totals
matched and the statuses agreed, and the membership row was null: 0 pass /
1 fail / 9 expect().

| Check | Result |
| --- | --- |
| Targeted membership tests | 3 pass / 0 fail / 21 expect() / 222 filtered / 514ms |
| `bun run typecheck` | exit 0 |
| Full suite | 4035 pass / 0 fail / 327221 expect() / 255 files / 135.75s |

The suite gained three tests and 21 expects from the prior 4032 / 327200 run.
The typecheck log wraps `bunx tsc --noEmit -p apps/web/tsconfig.json` and
contains no TypeScript error.

## Backup

Behavior commit `10dd3980a964d6640558eeed6ac2d9477b62c8aa`. Parent
`98733562b06ac660ebb806fb2c25673ddca4d682`. The push target is Secure Source
Manager `origin`, branch `codex/verified-flow-directory-checkpoint`. `ls-remote`
returned that same SHA. GitLab was not pushed. `main` was not pushed. GitHub
was not probed. Cloud Run, Scheduler, Artifact Registry, Turso, D1, and
Cloudflare were unchanged.

## Still open

Accepted MATH remains 0/13. Certified fresh flow remains UNKNOWN. The same
source set and equal totals do not prove the same count for each source.
Directory packets 234 and 237 stay proposals. 236 stays parked. No directory
SQL. Migrations 0056 through 0065 were not applied. The next gap is
PUBLICATION_PORTFOLIO_SOURCE_COUNT_VECTOR. Record whether any source count
differs between the ledger book and the serving book. Do not treat an equal
set as equal counts, and do not certify a production daily flow.
