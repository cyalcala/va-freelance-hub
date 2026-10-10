# Rejected snapshot id row is not a measured zero — 2026-10-10

Local slice of PUBLICATION_MANILA_DAY_REJECTED_SNAPSHOT_IDS_ARE_NOT_A_ZERO_COUNT.
This is not production acceptance, a MATH card, a certified daily flow, or
directory enrichment.

## What changed

No reader changed. The shipped agreement readers already return null when
`idsKnown` is false, including when the caller supplies 0. The new integration
test locks that result on the real unlimited publish path. Five We Work
Remotely publishes are followed by a same-length foreign still-public id. The
reloaded pair has `idsKnown` false. `agreedManilaStillPublicCount(0, rejected)`
is null, not 0. `agreedManilaSnapshotIdCount(0, rejected)` is null, not 0.
`reportableManilaSnapshotIdCount` of that pair stays null. A later known empty
id row, with `idsKnown` true and both arrays empty, still reports 0 through
`reportableManilaSnapshotIdCount`, `agreedManilaSnapshotIdCount(0, knownEmpty)`,
and `agreedManilaStillPublicCount(0, knownEmpty)`. The rejected pair still
agrees with 0 as null after that later row exists.
`completedManilaDayFlowCount` of OPEN and of CLOSED with 0 stays null. The
publication writer does not call these readers. No migration was added. No new
clock, source, parameter, provider, or cadence. This does not claim MATH-08
and does not record `CLOSED`.

## What stays unchanged

- Unknown dates and null workplace stay on their existing holds.
- A lost ledger acknowledgement still returns `POST_PERSISTENCE_FAILURE` with
  exposure `UNKNOWN` and is not rolled back.
- Unlimited exact-six publication does not use the canary reservation.
- A missing reservation table still fails closed for capped writers. Do not
  deploy the reservation gateway before migration 0057.
- A rejected pair's reportable count stays null, not the stored 5 and not 0.
- Direct `sameSourcePairManilaFamilyStatus(null, [], [], [])` stays `UNKNOWN`.
- The stored snapshot state remains OPEN. No CLOSED row is written.

## Evidence

Native bun:sqlite. The quoted filter isolated one test. The shipped readers
already returned null for the rejected pair and 0 for the known empty row, so
this slice adds the lock and does not change reader code. No live D1,
provider, or browser proof. Production SQL is unchanged.

| Check | Result |
| --- | --- |
| Quoted targeted lock | 1 pass / 0 fail / 21 expect() / 288 filtered / 1 file / 908.00ms |
| `bun x tsc --noEmit -p apps/web/tsconfig.json` | empty stdout and stderr, exit 0 |
| Full regression suite | 4099 pass / 0 fail / 328322 expect() / 255 files / 168.94s |

## Backup

Behavior commit `38744979303a4add2f1ad2c43bd45adc19729ad6`. Parent
`b6d5edbdbfe6a9908ef5ccad7e0cf751542d1392`. The push target is Secure Source
Manager `origin`, branch `codex/verified-flow-directory-checkpoint`. GitLab
was not pushed. `main` was not pushed. GitHub was not probed. Cloud Run,
Scheduler, Artifact Registry, Turso, D1, and Cloudflare were unchanged.

## Still open

Accepted MATH remains 0/13. Certified fresh flow remains UNKNOWN. Scoring the
rejected pair as a same-source family with matched count 0 and empty rows is
not yet proven. A missing `idsKnown` check would turn that call into the empty
book `UNKNOWN`. Directory packets 234 and 237 stay proposals. 236 stays parked.
No directory SQL. Migrations 0056 through 0068 were not applied. The next gap
is PUBLICATION_MANILA_DAY_REJECTED_SNAPSHOT_ZERO_IS_NOT_AN_EMPTY_BOOK.
`loadedSameSourcePairManilaFamilyStatus(rejected, 0, [], [])` is null, not
`UNKNOWN`. The same call on the known empty pair is `UNKNOWN`. Direct
`sameSourcePairManilaFamilyStatus(0, [], [], [])` stays `UNKNOWN`. Do not
certify a production daily flow.
