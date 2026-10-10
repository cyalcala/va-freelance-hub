# Manila-day count and id agreement — 2026-10-10

Local slice of PUBLICATION_MANILA_DAY_COUNT_ID_AGREEMENT. This is not
production acceptance, a MATH card, a certified daily flow, or directory
enrichment.

## What changed

`agreedManilaSnapshotIdCount` returns the shared number only when the snapshot
`first_publish_count` and the known first-publish id length are the same safe
integer. A disagreement returns null. An unknown pair returns null, including
a count of 0 beside empty id arrays. The reader does not prefer either
number and does not fall back to an older snapshot. The publication writer
does not call this reader. No migration was added. No new clock, source,
parameter, provider, or cadence. This does not claim MATH-08.

## What stays unchanged

- Unknown dates and null workplace stay on their existing holds.
- A lost ledger acknowledgement still returns `POST_PERSISTENCE_FAILURE` with
  exposure `UNKNOWN` and is not rolled back.
- Unlimited exact-six publication does not use the canary reservation.
- A missing reservation table still fails closed for capped writers. Do not
  deploy the reservation gateway before migration 0057.
- An unknown id pair still reports null, not zero.
- A known open pair still reports its first-publish id length.
- An open count is still not a completed Manila-day flow.
- The stored snapshot state remains OPEN. No CLOSED row is written.

## Evidence

Native bun:sqlite. One We Work Remotely publish stays unlimited. That
snapshot's first-publish count equals its known id length, and the agreed
count is that shared number. A later OPEN snapshot records
`first_publish_count` 4 with id list `[9001]`. The id-length reader returns
1. The agreed count is null, not 1, not 4, and not the older agreeing count.
A still later OPEN snapshot records count 0 and has no id row. Its agreed
count is null, not 0, and not the empty-array length. The table contains no
CLOSED row. No live D1, provider, or browser proof.

Before the reader existed, the snapshot count was already 4 and the known id
length was already 1, and `agreedManilaSnapshotIdCount` was undefined:
0 pass / 1 fail / 19 expect(). The failing assertion was
`expect(typeof agreedManilaSnapshotIdCount).toBe("function")` at
`packages/scraper/publication-gateway.integration.test.ts:2795`.

| Check | Result |
| --- | --- |
| Targeted agreement test | 1 pass / 0 fail / 33 expect() / 240 filtered / 412.00ms |
| `bun x tsc --noEmit -p apps/web/tsconfig.json` | exit 0, empty stdout and stderr |
| Full suite | 4051 pass / 0 fail / 327400 expect() / 255 files / 139.46s |

The suite gained one test and 33 expects from the prior 4050 / 327367 run.
The typecheck output contains no TypeScript error. The suite process exit
code was not captured from the redirected process handle; the runner summary
is the recorded result.

## Backup

Behavior commit `1ff29b7198fd0b8a724266de7195f535d620e67d`. Parent
`0567c701772f845dc904d08547f00c95a7b83c79`. The push target is Secure Source
Manager `origin`, branch `codex/verified-flow-directory-checkpoint`. `ls-remote`
returned that same SHA. GitLab was not pushed. `main` was not pushed. GitHub
was not probed. Cloud Run, Scheduler, Artifact Registry, Turso, D1, and
Cloudflare were unchanged.

## Still open

Accepted MATH remains 0/13. Certified fresh flow remains UNKNOWN. A repeated
id can still make the raw id length match the snapshot count. Directory
packets 234 and 237 stay proposals. 236 stays parked. No directory SQL.
Migrations 0056 through 0068 were not applied. The next gap is
PUBLICATION_MANILA_DAY_DUPLICATE_IDS_DO_NOT_AGREE. When a known id list
repeats an id, the agreed count stays absent even if the raw length matches
the snapshot count. Do not prefer the raw length or the distinct length, and
do not certify a production daily flow.
