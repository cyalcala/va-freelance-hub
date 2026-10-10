# Portfolio book-total divergence — 2026-10-10

Local slice of PUBLICATION_PORTFOLIO_BOOK_TOTAL_DIVERGENCE. This is not
production acceptance, a MATH card, a certified daily flow, or directory
enrichment.

## What changed

After the status comparison, the gateway stores one
`source_publication_portfolio_book_total` row. It copies the ledger book total
and the serving book total, and `totals_differ` is 1 only when those totals
are not equal. The table rejects a flag that disagrees with the totals. A
missing table fails open: publication, both exposure rows, and the status
comparison stand. Migration 0064 adds no `julianday('now')`. It was not
applied to production D1. No new clock, source, parameter, provider, or
cadence. This does not claim MATH-08.

## What stays unchanged

- Unknown dates and null workplace stay on their existing holds.
- A lost ledger acknowledgement still returns `POST_PERSISTENCE_FAILURE` with
  exposure `UNKNOWN` and is not rolled back.
- Unlimited exact-six publication does not use the canary reservation.
- A missing reservation table still fails closed for capped writers. Do not
  deploy the reservation gateway before migration 0057.
- Status agreement remains a comparison of status labels. It is not equality
  of the books.
- The Manila-day open count remains the newest OPEN snapshot. Rows are not
  summed, and the writer still cannot record CLOSED.

## Evidence

Native bun:sqlite. Two exact-six jobs are published, one is withdrawn, and a
third job is published. The write stays unlimited. An independent ledger total
is 3 and an independent serving total is 2. Both source and family statuses
agree. The stored totals are 3 and 2, and `totals_differ` is 1. A single
active job stores equal totals and `totals_differ` 0. Dropping the table still
publishes and still writes both exposure rows and the status comparison. No
live D1, provider, or browser proof.

Before the writer stored the row, the totals already differed and the
statuses already agreed, and the comparison row was null: 0 pass / 1 fail /
12 expect().

| Check | Result |
| --- | --- |
| Targeted book-total tests | 3 pass / 0 fail / 26 expect() / 219 filtered / 419ms |
| `bun run typecheck` | exit 0 |
| Full suite | 4032 pass / 0 fail / 327200 expect() / 255 files / 141.06s |

The suite gained three tests and 26 expects from the prior 4029 / 327174 run.
The typecheck log wraps `bunx tsc --noEmit -p apps/web/tsconfig.json` and
contains no TypeScript error.

## Backup

Behavior commit `e71fe3e6da233b8ad376acdd639bc7cd23ae33fb`. Parent
`ea6ab227fa3eccdcce16c53eea151edb6b4f3648`. The push target is Secure Source
Manager `origin`, branch `codex/verified-flow-directory-checkpoint`. `ls-remote`
returned that same SHA. GitLab was not pushed. `main` was not pushed. GitHub
was not probed. Cloud Run, Scheduler, Artifact Registry, Turso, D1, and
Cloudflare were unchanged.

## Still open

Accepted MATH remains 0/13. Certified fresh flow remains UNKNOWN. Equal totals
and agreeing status do not prove the same source set. Directory packets 234
and 237 stay proposals. 236 stays parked. No directory SQL. Migrations 0056
through 0064 were not applied. The next gap is
PUBLICATION_PORTFOLIO_BOOK_MEMBERSHIP. Record whether the ledger source set
and the serving source set differ. Do not treat equal totals as the same
book, and do not certify a production daily flow.
