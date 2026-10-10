# Manila-day snapshot ids — 2026-10-10

Local slice of PUBLICATION_MANILA_DAY_SNAPSHOT_IDS. This is not production
acceptance, a MATH card, a certified daily flow, or directory enrichment.

## What changed

After the open snapshot counts, the gateway stores one
`source_publication_manila_snapshot_ids` row. It copies that snapshot's
first-publish ids and still-public ids. The still-public list is stored only
when it is well formed, the same length as the still-public count, and a
subset of the first-publish ids. The day's ids are that snapshot's ids. They
are not the union of earlier snapshots. A later snapshot for another Manila
date does not replace this date. A missing table fails open: publication and
the open snapshot stand. Migration 0068 adds no `julianday('now')`. It was not
applied to production D1. No new clock, source, parameter, provider, or
cadence. This does not claim MATH-08. The stored state remains OPEN.

## What stays unchanged

- Unknown dates and null workplace stay on their existing holds.
- A lost ledger acknowledgement still returns `POST_PERSISTENCE_FAILURE` with
  exposure `UNKNOWN` and is not rolled back.
- Unlimited exact-six publication does not use the canary reservation.
- A missing reservation table still fails closed for capped writers. Do not
  deploy the reservation gateway before migration 0057.
- Status agreement, equal totals, equal source sets, equal per-source counts,
  and equal known job ids remain separate comparisons.
- The open count remains the newest OPEN snapshot. Rows are not summed.

## Evidence

Native bun:sqlite. One We Work Remotely job is published and withdrawn, and
one Remotive publish stays unlimited. Both snapshots store a still-public
count of 1. The latest first-publish count is 2. The independent first-publish
ids are both jobs. The independent still-public ids are only the Remotive job.
The stored latest arrays match those ids. The union of the two snapshots'
still-public ids is both jobs, and the latest still-public ids are not that
union. A later snapshot for another Manila date does not replace today's ids.
One job that stays public stores the same id in both arrays. Dropping the
table still publishes and still writes the open snapshot. No live D1,
provider, or browser proof.

Before the writer stored the row, the counts already matched and the
independent ids already differed, and the id row was null: 0 pass / 1 fail /
11 expect(). The failing assertion was `expect(stored).not.toBeNull()` at
`packages/scraper/publication-gateway.integration.test.ts:2400`.

| Check | Result |
| --- | --- |
| Targeted snapshot-id tests | 3 pass / 0 fail / 36 expect() / 232 filtered / 437.00ms |
| `bun run typecheck` | exit 0 |
| Full suite | 4045 pass / 0 fail / 327298 expect() / 255 files / 140.19s |

The suite gained three tests and 36 expects from the prior 4042 / 327262 run.
The typecheck log wraps `bunx tsc --noEmit -p apps/web/tsconfig.json` and
contains no TypeScript error.

## Backup

Behavior commit `b1df5b0ef6098494a22ec5f9e067f02626cd7ccb`. Parent
`10cbe06ffd0541fb0425ed5a8451477c6d80a726`. The push target is Secure Source
Manager `origin`, branch `codex/verified-flow-directory-checkpoint`. `ls-remote`
returned that same SHA. GitLab was not pushed. `main` was not pushed. GitHub
was not probed. Cloud Run, Scheduler, Artifact Registry, Turso, D1, and
Cloudflare were unchanged.

## Still open

Accepted MATH remains 0/13. Certified fresh flow remains UNKNOWN. Each open
snapshot now has ids, and a reader can still union those rows. Directory
packets 234 and 237 stay proposals. 236 stays parked. No directory SQL.
Migrations 0056 through 0068 were not applied. The next gap is
PUBLICATION_MANILA_DAY_SNAPSHOT_ID_LATEST. The day's ids are the latest id
row for that Manila date. Do not union snapshot rows, and do not certify a
production daily flow.
