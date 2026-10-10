# Rejected snapshot id row is not an empty book — 2026-10-10

Local slice of PUBLICATION_MANILA_DAY_REJECTED_SNAPSHOT_IDS_ARE_NOT_AN_EMPTY_BOOK.
This is not production acceptance, a MATH card, a certified daily flow, or
directory enrichment.

## What changed

`loadedSameSourcePairManilaFamilyStatus` returns null when the loaded pair is
missing or `idsKnown` is not true. Empty arrays left behind by a rejected id
row are not scored as an empty same-source book. A genuinely empty supplied
book still reports `UNKNOWN` through `sameSourcePairManilaFamilyStatus`. An
intact five-id breach book stays `BREACH` through the same function. The
publication writer does not call this reader. No migration was added. No new
clock, source, parameter, provider, or cadence. This does not claim MATH-08
and does not record `CLOSED`.

## What stays unchanged

- Unknown dates and null workplace stay on their existing holds.
- A lost ledger acknowledgement still returns `POST_PERSISTENCE_FAILURE` with
  exposure `UNKNOWN` and is not rolled back.
- Unlimited exact-six publication does not use the canary reservation.
- A missing reservation table still fails closed for capped writers. Do not
  deploy the reservation gateway before migration 0057.
- Direct `sameSourcePairManilaFamilyStatus(null, [], [], [])` stays `UNKNOWN`.
- Feeding those empty arrays from a rejected pair into the direct reader still
  returns `UNKNOWN`. The loaded reader is what refuses that misreport.
- The stored snapshot state remains OPEN. No CLOSED row is written.

## Evidence

Native bun:sqlite. Five We Work Remotely publishes stay unlimited. The breach
book is three `jobicy:admin` rows plus `remotive` and `remote-ok`. The intact
pair has `idsKnown` true and `sameSourcePairManilaFamilyStatus` of that book
is `BREACH`. The fixture then drops only the test database's append-only
update trigger and replaces the fifth still-public id with a same-length
foreign id. The reloaded pair is not null, `idsKnown` is false, and both id
arrays are empty. `loadedSameSourcePairManilaFamilyStatus` of that pair, the
recorded breach rows, and matched count 5 is null, not `UNKNOWN` and not
`BREACH`. The same function on the intact pair is `BREACH`.
`sameSourcePairManilaDayFlowCount` of the OPEN state, that null status, and
matched count 5 is null. The CLOSED call is null. The writer is not called
with the reader. Production SQL is unchanged. No live D1, provider, or
browser proof.

The first targeted run failed because the export did not exist yet.
`expect(typeof loadedStatus).toBe("function")` received `undefined` after the
publish, intact `BREACH`, mutation, `idsKnown` false, and empty-book
`UNKNOWN` facts had passed. The function was added after that red result.

| Check | Result |
| --- | --- |
| Targeted red run, before the export existed | 1581 pass / 1 fail / 12288 expect() / 87 files / 51.33s |
| Targeted green run after the reader existed | 1582 pass / 0 fail / 12294 expect() / 87 files / 49.91s |
| `bun x tsc --noEmit -p apps/web/tsconfig.json` | empty stdout and stderr, exit 0 |
| Full regression suite on this behavior tree | 4097 pass / 0 fail / 328269 expect() / 255 files / 172.59s |

The 87-file rows are the filtered publication-gateway scan, not the full
suite. The full suite is the 255-file row.

## Backup

Behavior commit `a61d1abb1cf4f8a34fbb5fc1ed2951f7234930fb`. Parent
`b94ce6919171211929aa57248c6c6476c5f6e331`. The push target is Secure Source
Manager `origin`, branch `codex/verified-flow-directory-checkpoint`. GitLab
was not pushed. `main` was not pushed. GitHub was not probed. Cloud Run,
Scheduler, Artifact Registry, Turso, D1, and Cloudflare were unchanged.

## Still open

Accepted MATH remains 0/13. Certified fresh flow remains UNKNOWN. The open
count row still stores `first_publish_count` 5 and `still_public_count` 5
after the id row is rejected. Those stored counts are not yet proven absent
from a reportable id count. Directory packets 234 and 237 stay proposals.
236 stays parked. No directory SQL. Migrations 0056 through 0068 were not
applied. The next gap is
PUBLICATION_MANILA_DAY_REJECTED_SNAPSHOT_IDS_ARE_NOT_A_REPORTABLE_COUNT.
`reportableManilaSnapshotIdCount` of the rejected pair is null, not 5 and
not 0. `agreedManilaSnapshotIdCount(5, rejected)` is null.
`agreedManilaStillPublicCount(5, rejected)` is null. The intact pair still
reports 5. This is not the already-proven missing-id-row case whose newer
count is 0. Do not certify a production daily flow.
