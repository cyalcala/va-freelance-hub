# Manila-day snapshot pair — 2026-10-10

Local slice of PUBLICATION_MANILA_DAY_SNAPSHOT_PAIR. This is not production
acceptance, a MATH card, a certified daily flow, or directory enrichment.

## What changed

`latestManilaSnapshotPair` binds the latest OPEN count snapshot to the id row
with the same retry key. The day's ids are that snapshot's ids. If the latest
count snapshot has no id row, `idsKnown` stays false and both id arrays stay
empty. The reader does not fall back to an older id row. When the latest
count snapshot has its own valid id row, those ids are returned, not the
union of earlier rows. The publication writer does not call this reader. No
migration was added. No new clock, source, parameter, provider, or cadence.
This does not claim MATH-08. The snapshot remains OPEN.

## What stays unchanged

- Unknown dates and null workplace stay on their existing holds.
- A lost ledger acknowledgement still returns `POST_PERSISTENCE_FAILURE` with
  exposure `UNKNOWN` and is not rolled back.
- Unlimited exact-six publication does not use the canary reservation.
- A missing reservation table still fails closed for capped writers. Do not
  deploy the reservation gateway before migration 0057.
- The open count remains the newest OPEN snapshot. Rows are not summed.
- The newest valid id row remains the id-table selection. This pair does not
  replace that reader.

## Evidence

Native bun:sqlite. One We Work Remotely job is published and withdrawn, and
one Remotive publish stays unlimited. The Remotive snapshot has an id row.
A later OPEN count snapshot for the same Manila date, with counts 4 and 3 and
retry key `snapshot-pair-newer`, has no id row. The count reader selects that
newer snapshot. The older id row still names the Remotive job. The pair
returns `snapshot-pair-newer` with `idsKnown` false and empty arrays. A second
publish path, without the extra count row, returns the latest snapshot's own
ids. Those still-public ids are the Remotive job, not the union of both
snapshots. No live D1, provider, or browser proof.

Before the pair reader existed, the newer snapshot already had no ids and the
older id row still named a job, and `latestManilaSnapshotPair` was undefined:
0 pass / 1 fail / 10 expect(). The failing assertion was
`expect(typeof latestManilaSnapshotPair).toBe("function")` at
`packages/scraper/publication-gateway.integration.test.ts:2640`.

| Check | Result |
| --- | --- |
| Targeted snapshot-pair tests | 2 pass / 0 fail / 26 expect() / 236 filtered / 616.00ms |
| `bun run typecheck` | exit 0 |
| Full suite | 4048 pass / 0 fail / 327345 expect() / 255 files / 144.50s |

The suite gained two tests and 26 expects from the prior 4046 / 327319 run.
The typecheck log wraps `bunx tsc --noEmit -p apps/web/tsconfig.json` and
contains no TypeScript error.

## Backup

Behavior commit `bf4e1414e585d06e2536adf0c987faf946939244`. Parent
`6c813ba06ec54b196101f75aad7c7287bda527b5`. The push target is Secure Source
Manager `origin`, branch `codex/verified-flow-directory-checkpoint`. `ls-remote`
returned that same SHA. GitLab was not pushed. `main` was not pushed. GitHub
was not probed. Cloud Run, Scheduler, Artifact Registry, Turso, D1, and
Cloudflare were unchanged.

## Still open

Accepted MATH remains 0/13. Certified fresh flow remains UNKNOWN. An unknown
id pair stores empty arrays. Empty is not a measured zero. Directory packets
234 and 237 stay proposals. 236 stays parked. No directory SQL. Migrations
0056 through 0068 were not applied. The next gap is
PUBLICATION_MANILA_DAY_UNKNOWN_IDS_ARE_NOT_ZERO. The reportable id count is
absent when `idsKnown` is false. Do not read the empty arrays as zero, and
do not certify a production daily flow.
