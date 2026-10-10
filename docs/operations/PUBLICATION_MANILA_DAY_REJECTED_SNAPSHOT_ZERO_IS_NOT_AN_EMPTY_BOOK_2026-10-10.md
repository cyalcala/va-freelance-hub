# Rejected snapshot zero is not an empty book — 2026-10-10

Local slice of PUBLICATION_MANILA_DAY_REJECTED_SNAPSHOT_ZERO_IS_NOT_AN_EMPTY_BOOK.
This is not production acceptance, a MATH card, a certified daily flow, or
directory enrichment.

## What changed

No reader changed. `loadedSameSourcePairManilaFamilyStatus` already returns
null when `idsKnown` is false. The new integration test locks that result for
matched count 0 and empty recorded and supplied rows. Five We Work Remotely
publishes are followed by a same-length foreign still-public id. The reloaded
pair has `idsKnown` false. The loaded family status of that pair, matched
count 0, and empty rows is null, not `UNKNOWN`. Direct
`sameSourcePairManilaFamilyStatus(0, [], [], [])` stays `UNKNOWN`. A later
known empty id row, with `idsKnown` true and both arrays empty, scores
`UNKNOWN` through the loaded reader. The rejected pair still scores null after
that later row exists. `sameSourcePairManilaDayFlowCount` of OPEN and of
CLOSED with that null status and matched count 0 stays null. The publication
writer does not call these readers. No migration was added. No new clock,
source, parameter, provider, or cadence. This does not claim MATH-08 and does
not record `CLOSED`.

## What stays unchanged

- Unknown dates and null workplace stay on their existing holds.
- A lost ledger acknowledgement still returns `POST_PERSISTENCE_FAILURE` with
  exposure `UNKNOWN` and is not rolled back.
- Unlimited exact-six publication does not use the canary reservation.
- A missing reservation table still fails closed for capped writers. Do not
  deploy the reservation gateway before migration 0057.
- Agreement of a rejected pair with 0 stays null. A known empty id row still
  reports 0.
- Direct `sameSourcePairManilaFamilyStatus(null, [], [], [])` stays `UNKNOWN`.
- The stored snapshot state remains OPEN. No CLOSED row is written.

## Evidence

Native bun:sqlite. The quoted filter isolated one test. The shipped reader
already returned null for the rejected pair and `UNKNOWN` for the known empty
pair, so this slice adds the lock and does not change reader code. No live D1,
provider, or browser proof. Production SQL is unchanged.

| Check | Result |
| --- | --- |
| Quoted targeted lock | 1 pass / 0 fail / 14 expect() / 289 filtered / 1 file / 1132.00ms |
| `bun x tsc --noEmit -p apps/web/tsconfig.json` | empty stdout and stderr, exit 0 |
| Full regression suite | 4100 pass / 0 fail / 328336 expect() / 255 files / 189.59s |

## Backup

Behavior commit `dbd5d22da4d0b30a9c1de8b3fbf95e1a7d63ff81`. Parent
`c6ab9ebf00f9bff22e778c460f78ba3e3306156b`. The push target is Secure Source
Manager `origin`, branch `codex/verified-flow-directory-checkpoint`. GitLab
was not pushed. `main` was not pushed. GitHub was not probed. Cloud Run,
Scheduler, Artifact Registry, Turso, D1, and Cloudflare were unchanged.

## Still open

Accepted MATH remains 0/13. Certified fresh flow remains UNKNOWN. The same
loaded call with a null matched count, rather than 0, is not yet proven. The
reader treats null and 0 as the same empty-book input only after `idsKnown`
is true. Directory packets 234 and 237 stay proposals. 236 stays parked. No
directory SQL. Migrations 0056 through 0068 were not applied. The next gap is
PUBLICATION_MANILA_DAY_REJECTED_SNAPSHOT_NULL_COUNT_IS_NOT_AN_EMPTY_BOOK.
`loadedSameSourcePairManilaFamilyStatus(rejected, null, [], [])` is null, not
`UNKNOWN`. The same call on the known empty pair is `UNKNOWN`. Direct
`sameSourcePairManilaFamilyStatus(null, [], [], [])` stays `UNKNOWN`. Do not
certify a production daily flow.
