# Unknown snapshot ids are not zero — 2026-10-10

Local slice of PUBLICATION_MANILA_DAY_UNKNOWN_IDS_ARE_NOT_ZERO. This is not
production acceptance, a MATH card, a certified daily flow, or directory
enrichment.

## What changed

`reportableManilaSnapshotIdCount` returns the first-publish id count only when
the latest count snapshot's id pair is known. An unknown pair keeps empty
arrays, and the reportable count is null. Null is not zero. A known pair
reports the length of its first-publish ids. The publication writer does not
call this reader. No migration was added. No new clock, source, parameter,
provider, or cadence. This does not claim MATH-08. The snapshot remains OPEN,
and the number is not a completed Manila day.

## What stays unchanged

- Unknown dates and null workplace stay on their existing holds.
- A lost ledger acknowledgement still returns `POST_PERSISTENCE_FAILURE` with
  exposure `UNKNOWN` and is not rolled back.
- Unlimited exact-six publication does not use the canary reservation.
- A missing reservation table still fails closed for capped writers. Do not
  deploy the reservation gateway before migration 0057.
- A newer count snapshot with no id row still does not keep an older id row.
- The open count remains the newest OPEN snapshot. Rows are not summed.

## Evidence

Native bun:sqlite. One We Work Remotely job is published. A later OPEN count
snapshot for the same Manila date stores counts 0 and 0 and has no id row.
The pair is unknown and its id arrays are empty. The reportable count is
null, not 0. Removing that newer snapshot leaves the known pair, and the
reportable count is 1. No live D1, provider, or browser proof.

Before the reader existed, the pair was already unknown with empty arrays,
and `reportableManilaSnapshotIdCount` was undefined: 0 pass / 1 fail / 8
expect(). The failing assertion was
`expect(typeof reportableManilaSnapshotIdCount).toBe("function")` at
`packages/scraper/publication-gateway.integration.test.ts:2710`.

| Check | Result |
| --- | --- |
| Targeted unknown-id test | 1 pass / 0 fail / 12 expect() / 238 filtered / 406.00ms |
| `bun run typecheck` | exit 0 |
| Full suite | 4049 pass / 0 fail / 327357 expect() / 255 files / 141.54s |

The suite gained one test and 12 expects from the prior 4048 / 327345 run.
The typecheck log wraps `bunx tsc --noEmit -p apps/web/tsconfig.json` and
contains no TypeScript error.

## Backup

Behavior commit `0110e37d26e30d8618d7ce895657c42bd275f18f`. Parent
`f37bc670f96f702aa6e4a8ebce53745b1a91176b`. The push target is Secure Source
Manager `origin`, branch `codex/verified-flow-directory-checkpoint`. `ls-remote`
returned that same SHA. GitLab was not pushed. `main` was not pushed. GitHub
was not probed. Cloud Run, Scheduler, Artifact Registry, Turso, D1, and
Cloudflare were unchanged.

## Still open

Accepted MATH remains 0/13. Certified fresh flow remains UNKNOWN. The
reportable id count is the size of a known open snapshot. It is not a
completed Manila-day flow. Directory packets 234 and 237 stay proposals. 236
stays parked. No directory SQL. Migrations 0056 through 0068 were not
applied. The next gap is PUBLICATION_MANILA_DAY_OPEN_COUNT_IS_NOT_A_FLOW.
A completed-day total stays absent while the snapshot is OPEN. Do not compare
the open count with the 100 floor, and do not certify a production daily flow.
