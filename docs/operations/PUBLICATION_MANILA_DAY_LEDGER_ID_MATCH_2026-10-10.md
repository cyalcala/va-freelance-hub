# Agreed snapshot ids must match the ledger — 2026-10-10

Local slice of PUBLICATION_MANILA_DAY_AGREED_IDS_MUST_MATCH_LEDGER. This is
not production acceptance, a MATH card, a certified daily flow, or directory
enrichment.

## What changed

`ledgerMatchedManilaSnapshotIdCount` returns the shared number only when the
distinct agreed count exists and the known first-publish ids are the same
positive ids as the ledger's first-publish ids. A distinct foreign id list of
the same length returns null. The reader does not prefer the snapshot length
or the ledger length. The publication writer does not call this reader. No
migration was added. No new clock, source, parameter, provider, or cadence.
This does not claim MATH-08.

## What stays unchanged

- Unknown dates and null workplace stay on their existing holds.
- A lost ledger acknowledgement still returns `POST_PERSISTENCE_FAILURE` with
  exposure `UNKNOWN` and is not rolled back.
- Unlimited exact-six publication does not use the canary reservation.
- A missing reservation table still fails closed for capped writers. Do not
  deploy the reservation gateway before migration 0057.
- An unknown id pair still reports null, not zero.
- A disagreement between the snapshot count and the id length still stays
  absent.
- A repeated id still stays absent even when the raw length matches.
- An open count is still not a completed Manila-day flow.
- The stored snapshot state remains OPEN. No CLOSED row is written.

## Evidence

Native bun:sqlite. One We Work Remotely publish stays unlimited. That
snapshot's ids equal the ledger's first-publish ids, and the ledger-matched
count is that shared length. A later OPEN snapshot records
`first_publish_count` 1 with id list `[9001]`. The distinct agreed count is
1, the same length as the ledger. Those ids are not the ledger ids. The
ledger-matched count is null, not 1. The real snapshot still matches the
ledger and returns that shared length. The table contains no CLOSED row. No
live D1, provider, or browser proof.

Before the reader existed, the foreign distinct count was already 1 and
already equal to the ledger length, and
`ledgerMatchedManilaSnapshotIdCount` was undefined: 0 pass / 1 fail / 18
expect(). The failing assertion was
`expect(typeof ledgerMatchedManilaSnapshotIdCount).toBe("function")` at
`packages/scraper/publication-gateway.integration.test.ts:2919`.

| Check | Result |
| --- | --- |
| Targeted ledger-match test | 1 pass / 0 fail / 22 expect() / 242 filtered / 419.00ms |
| `bun x tsc --noEmit -p apps/web/tsconfig.json` | empty stdout and stderr |
| Full suite | 4053 pass / 0 fail / 327445 expect() / 255 files / 149.52s |

The suite gained one test and 22 expects from the prior 4052 / 327423 run.
The typecheck output contains no TypeScript error. The typecheck and suite
process exit codes were not captured from the redirected process handles; the
empty typecheck output and the runner summary are the recorded results.

## Backup

Behavior commit `14cc74949408790b22802d82026ecd683527ee1b`. Parent
`4b006e04a5c366b9fea1b878b80ac719caa97325`. The push target is Secure Source
Manager `origin`, branch `codex/verified-flow-directory-checkpoint`. `ls-remote`
returned that same SHA. GitLab was not pushed. `main` was not pushed. GitHub
was not probed. Cloud Run, Scheduler, Artifact Registry, Turso, D1, and
Cloudflare were unchanged.

## Still open

Accepted MATH remains 0/13. Certified fresh flow remains UNKNOWN. The
ledger-matched count is still an open snapshot. A still-public count can
disagree with the known still-public id length while the first-publish ids
match the ledger. Directory packets 234 and 237 stay proposals. 236 stays
parked. No directory SQL. Migrations 0056 through 0068 were not applied. The
next gap is PUBLICATION_MANILA_DAY_STILL_PUBLIC_COUNT_ID_AGREEMENT. When the
still-public count disagrees with the known still-public id length, that
still-public number stays absent. Do not prefer either number, and do not
certify a production daily flow.
