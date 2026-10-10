# Rejected snapshot null count is not an empty book — 2026-10-10

Local slice of PUBLICATION_MANILA_DAY_REJECTED_SNAPSHOT_NULL_COUNT_IS_NOT_AN_EMPTY_BOOK.
This is not production acceptance, a MATH card, a certified daily flow, or
directory enrichment.

## What changed

No reader changed. `loadedSameSourcePairManilaFamilyStatus` already returns
null when `idsKnown` is false. The new integration test locks that result for
a null matched count and empty recorded and supplied rows. Five We Work
Remotely publishes are followed by a same-length foreign still-public id. The
reloaded pair has `idsKnown` false. The loaded family status of that pair, a
null matched count, and empty rows is null, not `UNKNOWN`. Direct
`sameSourcePairManilaFamilyStatus(null, [], [], [])` stays `UNKNOWN`. The same
loaded call with matched count 0 stays null. A later known empty id row, with
`idsKnown` true and both arrays empty, scores `UNKNOWN` through the loaded
reader when the matched count is null. The rejected pair still scores null
after that later row exists. `sameSourcePairManilaDayFlowCount` of OPEN and of
CLOSED with that null status and a null matched count stays null.
Caller-supplied 100 and 150 stay absent. The publication writer does not call
these readers. No migration was added. No new clock, source, parameter,
provider, or cadence. This does not claim MATH-08 and does not record
`CLOSED`.

## What stays unchanged

- Unknown dates and null workplace stay on their existing holds.
- A lost ledger acknowledgement still returns `POST_PERSISTENCE_FAILURE` with
  exposure `UNKNOWN` and is not rolled back.
- Unlimited exact-six publication does not use the canary reservation.
- A missing reservation table still fails closed for capped writers. Do not
  deploy the reservation gateway before migration 0057.
- A rejected pair scored with matched count 0 stays null, not `UNKNOWN`.
- A known empty id row still reports 0.
- The stored snapshot state remains OPEN. No CLOSED row is written.

## Evidence

Native bun:sqlite. The quoted filter isolated one test. The shipped reader
already returned null for the rejected pair and `UNKNOWN` for the known empty
pair, so this slice adds the lock and does not change reader code. No live D1,
provider, or browser proof. Production SQL is unchanged.

| Check | Result |
| --- | --- |
| Quoted targeted lock | 1 pass / 0 fail / 17 expect() / 290 filtered / 1 file / 404.00ms |
| `bun x tsc --noEmit -p apps/web/tsconfig.json` | empty stdout and stderr, exit 0 |
| Full regression suite | 4101 pass / 0 fail / 328353 expect() / 255 files / 184.51s |

## Backup

Behavior commit `ec18b93fe351c879d6ccea37941ddddec422ae38`. Parent
`3573b7b37014c0d9221a06276e0e6c1e54827eb2`. The push target is Secure Source
Manager `origin`, branch `codex/verified-flow-directory-checkpoint`. GitLab
was not pushed. `main` was not pushed. GitHub was not probed. Cloud Run,
Scheduler, Artifact Registry, Turso, D1, and Cloudflare were unchanged.

## Still open

Accepted MATH remains 0/13. Certified fresh flow remains UNKNOWN. A missing
snapshot pair, as distinct from a rejected pair, is not yet proven absent from
the empty-book status. Directory packets 234 and 237 stay proposals. 236 stays
parked. No directory SQL. Migrations 0056 through 0068 were not applied. The
next gap is PUBLICATION_MANILA_DAY_MISSING_SNAPSHOT_PAIR_IS_NOT_AN_EMPTY_BOOK.
`loadedSameSourcePairManilaFamilyStatus(null, null, [], [])` is null, not
`UNKNOWN`. The same call with matched count 0 is null. Direct
`sameSourcePairManilaFamilyStatus(null, [], [], [])` stays `UNKNOWN`. Do not
certify a production daily flow.
