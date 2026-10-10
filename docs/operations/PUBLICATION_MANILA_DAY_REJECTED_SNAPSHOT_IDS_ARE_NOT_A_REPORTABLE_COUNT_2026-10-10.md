# Rejected snapshot id row is not a reportable count — 2026-10-10

Local slice of PUBLICATION_MANILA_DAY_REJECTED_SNAPSHOT_IDS_ARE_NOT_A_REPORTABLE_COUNT.
This is not production acceptance, a MATH card, a certified daily flow, or
directory enrichment.

## What changed

No reader changed. The shipped count readers already return null when
`idsKnown` is false. The new integration test locks that result on the real
unlimited publish path. Five We Work Remotely publishes leave an OPEN snapshot
whose `first_publish_count` and `still_public_count` are both 5. Replacing the
fifth still-public id with a same-length foreign id makes the reloaded pair
`idsKnown` false and both id arrays empty. The open count row still stores 5.
`reportableManilaSnapshotIdCount` of that pair is null, not 5 and not 0.
`agreedManilaSnapshotIdCount(5, rejected)` is null.
`agreedManilaStillPublicCount(5, rejected)` is null. The intact pair captured
before the mutation still reports 5. `completedManilaDayFlowCount` of the OPEN
state and the stored count 5 is null, not 5 and not 0. Caller-supplied CLOSED,
100, and 150 stay absent. The publication writer does not call these readers.
No migration was added. No new clock, source, parameter, provider, or cadence.
This does not claim MATH-08 and does not record `CLOSED`.

## What stays unchanged

- Unknown dates and null workplace stay on their existing holds.
- A lost ledger acknowledgement still returns `POST_PERSISTENCE_FAILURE` with
  exposure `UNKNOWN` and is not rolled back.
- Unlimited exact-six publication does not use the canary reservation.
- A missing reservation table still fails closed for capped writers. Do not
  deploy the reservation gateway before migration 0057.
- A loaded pair with `idsKnown` false stays null from
  `loadedSameSourcePairManilaFamilyStatus`, not `UNKNOWN`.
- Direct `sameSourcePairManilaFamilyStatus(null, [], [], [])` stays `UNKNOWN`.
- The stored snapshot state remains OPEN. No CLOSED row is written.

## Evidence

Native bun:sqlite. The first broad command split the test-name filter on
spaces, so it was not the targeted scan. Inside that run the named test passed
in 49.49ms. An unrelated `readjudicateHeldTenants` query test then hit bun's
5000ms timeout. That timeout is not this fence. The quoted rerun is the
targeted result. The full suite after that rerun is the regression result.
No live D1, provider, or browser proof. Production SQL is unchanged.

| Check | Result |
| --- | --- |
| Quoted targeted lock | 1 pass / 0 fail / 32 expect() / 287 filtered / 1 file / 958.00ms |
| `bun x tsc --noEmit -p apps/web/tsconfig.json` | empty stdout and stderr, exit 0 |
| Full regression suite | 4098 pass / 0 fail / 328301 expect() / 255 files / 206.12s |

## Backup

Behavior commit `f79dbbc3acb1bbadcb47df274136271e64acba73`. Parent
`43e6eb5f1c98900ee862ca1e822875cb96ac043d`. The push target is Secure Source
Manager `origin`, branch `codex/verified-flow-directory-checkpoint`. GitLab
was not pushed. `main` was not pushed. GitHub was not probed. Cloud Run,
Scheduler, Artifact Registry, Turso, D1, and Cloudflare were unchanged.

## Still open

Accepted MATH remains 0/13. Certified fresh flow remains UNKNOWN. Agreement
of this rejected pair with a caller-supplied 0 is not yet proven. A length
check alone would still refuse 5, because the rejected arrays are empty, and
would accept 0. Directory packets 234 and 237 stay proposals. 236 stays
parked. No directory SQL. Migrations 0056 through 0068 were not applied. The
next gap is PUBLICATION_MANILA_DAY_REJECTED_SNAPSHOT_IDS_ARE_NOT_A_ZERO_COUNT.
`agreedManilaStillPublicCount(0, rejected)` is null, not 0.
`agreedManilaSnapshotIdCount(0, rejected)` is null, not 0. A known empty id
row, with `idsKnown` true and both arrays empty, still reports 0. Do not
certify a production daily flow.
