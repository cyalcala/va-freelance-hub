# Latest Manila-day snapshot ids — 2026-10-10

Local slice of PUBLICATION_MANILA_DAY_SNAPSHOT_ID_LATEST. This is not production
acceptance, a MATH card, a certified daily flow, or directory enrichment.

## What changed

`latestManilaSnapshotIds` reads the newest valid id row for one Manila date.
Equal `recorded_at` values use the higher id. Rows are not unioned. A later
row for another date does not replace this date. A newer row whose
still-public ids are not a subset of its first-publish ids is skipped. The
publication writer does not call this reader. No migration was added. No new
clock, source, parameter, provider, or cadence. This does not claim MATH-08.
The row remains an open snapshot, not a closed day.

## What stays unchanged

- Unknown dates and null workplace stay on their existing holds.
- A lost ledger acknowledgement still returns `POST_PERSISTENCE_FAILURE` with
  exposure `UNKNOWN` and is not rolled back.
- Unlimited exact-six publication does not use the canary reservation.
- A missing reservation table still fails closed for capped writers. Do not
  deploy the reservation gateway before migration 0057.
- The open count remains the newest OPEN snapshot. Rows are not summed.
- Each snapshot's stored ids remain the ids written with that snapshot.

## Evidence

Native bun:sqlite. One We Work Remotely job is published and withdrawn, and
one Remotive publish stays unlimited. Both id rows share one `recorded_at`.
The union of their still-public ids is both jobs. The reader returns the
higher id, and its still-public ids are only the Remotive job. A later row
for another Manila date, storing `[9001]`, does not replace today. A newer
today row whose still-public id is outside its first-publish ids does not
replace the valid row. No live D1, provider, or browser proof.

Before the reader existed, the union already differed from the latest ids,
and `latestManilaSnapshotIds` was undefined: 0 pass / 1 fail / 11 expect().
The failing assertion was `expect(typeof latestManilaSnapshotIds).toBe("function")`
at `packages/scraper/publication-gateway.integration.test.ts:2548`.

| Check | Result |
| --- | --- |
| Targeted latest-id test | 1 pass / 0 fail / 21 expect() / 235 filtered / 307.00ms |
| `bun run typecheck` | exit 0 |
| Full suite | 4046 pass / 0 fail / 327319 expect() / 255 files / 135.49s |

The suite gained one test and 21 expects from the prior 4045 / 327298 run.
The typecheck log wraps `bunx tsc --noEmit -p apps/web/tsconfig.json` and
contains no TypeScript error.

## Backup

Behavior commit `03bd8ebc412442e127f47c4cf7368af439b69ae5`. Parent
`1d3f00270781f0c16851a5a5a43d59a83f52b57f`. The push target is Secure Source
Manager `origin`, branch `codex/verified-flow-directory-checkpoint`. `ls-remote`
returned that same SHA. GitLab was not pushed. `main` was not pushed. GitHub
was not probed. Cloud Run, Scheduler, Artifact Registry, Turso, D1, and
Cloudflare were unchanged.

## Still open

Accepted MATH remains 0/13. Certified fresh flow remains UNKNOWN. The latest
count snapshot and the latest id row are selected on separate tables. A newer
count snapshot with no id row would leave the latest ids on an older publish.
Directory packets 234 and 237 stay proposals. 236 stays parked. No directory
SQL. Migrations 0056 through 0068 were not applied. The next gap is
PUBLICATION_MANILA_DAY_SNAPSHOT_PAIR. The day's ids are the ids of the latest
count snapshot. If that snapshot has no id row, the ids stay unknown. Do not
fall back to an older id row, and do not certify a production daily flow.
