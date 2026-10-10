# Portfolio job identity — 2026-10-10

Local slice of PUBLICATION_PORTFOLIO_JOB_IDENTITY. This is not production
acceptance, a MATH card, a certified daily flow, or directory enrichment.

## What changed

After the per-source counts, the gateway stores one
`source_publication_portfolio_job_identity` row. It copies the named ledger
receipt ids and the active serving ids. `ids_known` is 1 only when every
positive receipt names positive ids and the serving id list is well formed.
`ids_differ` is 1 only in that known case, and only when the id arrays differ.
An empty receipt id list keeps `ids_known` at 0 and `ids_differ` at 0. The
table rejects a known difference flag that disagrees with the arrays, and it
rejects a difference flag while the ids are unknown. A missing table fails
open: publication and the source-count row stand. Migration 0067 adds no
`julianday('now')`. It was not applied to production D1. No new clock, source,
parameter, provider, or cadence. This does not claim MATH-08.

## What stays unchanged

- Unknown dates and null workplace stay on their existing holds.
- A lost ledger acknowledgement still returns `POST_PERSISTENCE_FAILURE` with
  exposure `UNKNOWN` and is not rolled back.
- Unlimited exact-six publication does not use the canary reservation.
- A missing reservation table still fails closed for capped writers. Do not
  deploy the reservation gateway before migration 0057.
- Status agreement, equal totals, equal source sets, and equal per-source
  counts remain separate comparisons.
- The Manila-day open count remains the newest OPEN snapshot.

## Evidence

Native bun:sqlite. One We Work Remotely job is published and withdrawn, a
different active We Work Remotely row is present, and one Remote OK publish
stays unlimited. The named ledger ids and the serving ids differ. The
per-source counts match, so `counts_differ` is 0. The identity row is known
and `ids_differ` is 1. One shared job stores `ids_differ` 0. A ledger receipt
with an empty id list stores `ids_known` 0 and `ids_differ` 0. Dropping the
table still publishes and still writes the source counts. No live D1,
provider, or browser proof.

Before the writer stored the row, the ids already differed while the counts
matched, and the identity row was null: 0 pass / 1 fail / 6 expect().

| Check | Result |
| --- | --- |
| Targeted job-identity tests | 4 pass / 0 fail / 23 expect() / 228 filtered / 448ms |
| `bun run typecheck` | exit 0 |
| Full suite | 4042 pass / 0 fail / 327262 expect() / 255 files / 135.92s |

The suite gained four tests and 23 expects from the prior 4038 / 327239 run.
The typecheck log wraps `bunx tsc --noEmit -p apps/web/tsconfig.json` and
contains no TypeScript error.

## Backup

Behavior commit `e96c33dbdd813f1011989fc2db946d807d18a170`. Parent
`1f96dc8c7bb2721c229a12ca7b39d934bfb0f516`. The push target is Secure Source
Manager `origin`, branch `codex/verified-flow-directory-checkpoint`. `ls-remote`
returned that same SHA. GitLab was not pushed. `main` was not pushed. GitHub
was not probed. Cloud Run, Scheduler, Artifact Registry, Turso, D1, and
Cloudflare were unchanged.

## Still open

Accepted MATH remains 0/13. Certified fresh flow remains UNKNOWN. The latest
Manila-day snapshot stores counts, not the ids behind those counts. Directory
packets 234 and 237 stay proposals. 236 stays parked. No directory SQL.
Migrations 0056 through 0067 were not applied. The next gap is
PUBLICATION_MANILA_DAY_SNAPSHOT_IDS. Store the first-publish ids and the
still-public ids on the latest open snapshot. Do not sum snapshot rows, and
do not certify a production daily flow.
