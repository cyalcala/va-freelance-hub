# Missing snapshot pair is not an empty book — 2026-10-10

Local slice of PUBLICATION_MANILA_DAY_MISSING_SNAPSHOT_PAIR_IS_NOT_AN_EMPTY_BOOK.
This is not production acceptance, a MATH card, a certified daily flow, or
directory enrichment.

## What changed

No reader changed. `loadedSameSourcePairManilaFamilyStatus` already returns
null when the pair is null. The new integration test locks that result for a
Manila day that has no snapshot pair. Another Manila day holds a known empty
id row. The reloaded pair for today is null. The loaded family status of that
null pair, a null matched count, and empty rows is null, not `UNKNOWN`. The
same call with matched count 0 is null. Direct
`sameSourcePairManilaFamilyStatus(null, [], [], [])` stays `UNKNOWN`. The
other day's known empty pair scores `UNKNOWN` through the loaded reader. The
publication ledger stays empty, so the writer was not called.
`sameSourcePairManilaDayFlowCount` of OPEN and of CLOSED with that null status
stays null for a null matched count, for 0, and for caller-supplied 100 and
150. No migration was added. No new clock, source, parameter, provider, or
cadence. This does not claim MATH-08 and does not record `CLOSED`.

## What stays unchanged

- Unknown dates and null workplace stay on their existing holds.
- A lost ledger acknowledgement still returns `POST_PERSISTENCE_FAILURE` with
  exposure `UNKNOWN` and is not rolled back.
- Unlimited exact-six publication does not use the canary reservation.
- A missing reservation table still fails closed for capped writers. Do not
  deploy the reservation gateway before migration 0057.
- A rejected pair scored with a null matched count stays null, not `UNKNOWN`.
- A known empty id row still reports `UNKNOWN` for an empty supplied book.
- The stored snapshot state remains OPEN. No CLOSED row is written.
- Parent docs commit `3025e032e0fc25e9054bb3ad3e0b9fd946b29386` is not this
  slice and does not accept a MATH card or a certified daily flow.

## Evidence

Native bun:sqlite. The quoted filter isolated one file. The shipped reader
already returned null for a missing pair and `UNKNOWN` for the other day's
empty book, so this slice adds the lock and does not change reader code. An
earlier full run on this test timed out one unrelated lake readjudication
test at 5000ms. That test was not changed. The proving suite below includes
this lock and has zero failures. No live D1, provider, or browser proof.
Production SQL is unchanged.

| Check | Result |
| --- | --- |
| Quoted targeted lock | 1 pass / 0 fail / 20 expect() / 291 filtered / 1 file / 2.31s |
| `bun x tsc --noEmit -p apps/web/tsconfig.json` | empty stdout and stderr, exit 0 |
| Full regression suite | 4102 pass / 0 fail / 328373 expect() / 255 files / 377.94s |

## Backup

Behavior commit `d90930c554c3d690eea4c2507203f816f8a81777`. Parent
`3025e032e0fc25e9054bb3ad3e0b9fd946b29386`. The push target is Secure Source
Manager `origin`, branch `codex/verified-flow-directory-checkpoint`. GitLab
was not pushed. `main` was not pushed. GitHub was not probed. Cloud Run,
Scheduler, Artifact Registry, Turso, D1, and Cloudflare were unchanged.

## Still open

Accepted MATH remains 0/13. Certified fresh flow remains UNKNOWN. A supplied
book with a positive row total is not yet proven absent from the empty-book
status when the matched count is null or 0. Directory packets 234 and 237
stay proposals. 236 stays parked. No directory SQL. Migrations 0056 through
0068 were not applied. The next gap is
PUBLICATION_MANILA_DAY_NONEMPTY_SUPPLIED_BOOK_IS_NOT_AN_EMPTY_BOOK.
`remoteMatchedManilaPortfolioStatus(null, one positive row)` is null, not
`UNKNOWN`. The same call with matched count 0 is null.
`remoteMatchedManilaFamilyStatus` of both calls is null, not `UNKNOWN`.
`sameSourcePairManilaFamilyStatus(null, [], [], one positive row)` is null,
not `UNKNOWN`. Direct `sameSourcePairManilaFamilyStatus(null, [], [], [])`
stays `UNKNOWN`. A known empty pair with empty rows stays `UNKNOWN`. Do not
certify a production daily flow.
