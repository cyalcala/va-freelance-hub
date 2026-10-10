# Portfolio source-count vector — 2026-10-10

Local slice of PUBLICATION_PORTFOLIO_SOURCE_COUNT_VECTOR. This is not
production acceptance, a MATH card, a certified daily flow, or directory
enrichment.

## What changed

After the source sets, the gateway stores one
`source_publication_portfolio_source_counts` row. Each side is a sorted JSON
array of source id and count. `counts_differ` is 1 only when those arrays
differ. The table rejects a flag that disagrees with the arrays. A missing
table fails open: publication and the source-set row stand. Migration 0066
adds no `julianday('now')`. It was not applied to production D1. No new clock,
source, parameter, provider, or cadence. This does not claim MATH-08.

## What stays unchanged

- Unknown dates and null workplace stay on their existing holds.
- A lost ledger acknowledgement still returns `POST_PERSISTENCE_FAILURE` with
  exposure `UNKNOWN` and is not rolled back.
- Unlimited exact-six publication does not use the canary reservation.
- A missing reservation table still fails closed for capped writers. Do not
  deploy the reservation gateway before migration 0057.
- Status agreement remains a comparison of status labels.
- Equal totals remain a comparison of totals.
- An equal source set remains a comparison of source ids, not of counts.
- The Manila-day open count remains the newest OPEN snapshot.

## Evidence

Native bun:sqlite. Ledger history is We Work Remotely 2 and Remotive 1.
Serving rows before the publish are We Work Remotely 1 and Remotive 2. One
Remote OK publish stays unlimited. The source ids match and the totals are
equal, so `totals_differ` and `sets_differ` are 0. The per-source counts do
not match. The stored arrays match an independent walk and `counts_differ` is
1. One shared source stores `counts_differ` 0. Dropping the table still
publishes and still writes the source sets. No live D1, provider, or browser
proof.

Before the writer stored the row, the counts already differed while the set
and the totals matched, and the count row was null: 0 pass / 1 fail / 7
expect().

| Check | Result |
| --- | --- |
| Targeted source-count tests | 3 pass / 0 fail / 18 expect() / 225 filtered / 470ms |
| `bun run typecheck` | exit 0 |
| Full suite | 4038 pass / 0 fail / 327239 expect() / 255 files / 135.07s |

The suite gained three tests and 18 expects from the prior 4035 / 327221 run.
The typecheck log wraps `bunx tsc --noEmit -p apps/web/tsconfig.json` and
contains no TypeScript error.

## Backup

Behavior commit `cf1119bb3737d6000b43446c11daa25b75fd66ab`. Parent
`248837993d0ecc2906312e8714ba8d115f84dc40`. The push target is Secure Source
Manager `origin`, branch `codex/verified-flow-directory-checkpoint`. `ls-remote`
returned that same SHA. GitLab was not pushed. `main` was not pushed. GitHub
was not probed. Cloud Run, Scheduler, Artifact Registry, Turso, D1, and
Cloudflare were unchanged.

## Still open

Accepted MATH remains 0/13. Certified fresh flow remains UNKNOWN. Equal
per-source counts do not prove the same opportunity ids. Directory packets 234
and 237 stay proposals. 236 stays parked. No directory SQL. Migrations 0056
through 0066 were not applied. The next gap is
PUBLICATION_PORTFOLIO_JOB_IDENTITY. Record whether the named ledger receipt
ids and the serving ids differ. An empty id list stays unknown. Do not treat
equal counts as the same jobs, and do not certify a production daily flow.
