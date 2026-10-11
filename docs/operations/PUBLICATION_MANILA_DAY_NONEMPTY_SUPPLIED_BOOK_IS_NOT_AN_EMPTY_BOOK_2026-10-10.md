# Nonempty supplied book is not an empty book — 2026-10-10

Local slice of PUBLICATION_MANILA_DAY_NONEMPTY_SUPPLIED_BOOK_IS_NOT_AN_EMPTY_BOOK.
This is not production acceptance, a MATH card, a certified daily flow, or
directory enrichment.

## What changed

No reader changed. `remoteMatchedManilaPortfolioStatus`, `remoteMatchedManilaFamilyStatus`,
and `sameSourcePairManilaFamilyStatus` already return null when the supplied book has
a positive row total but the matched count is null or 0. The new integration test locks
that result for a known empty snapshot pair.

The reloaded pair for today has `idsKnown` true with empty `firstPublishIds` and empty
`stillPublicIds`. A supplied book with one row of count 1 has row total 1 > 0.
`remoteMatchedManilaPortfolioStatus(null, book)` is null, not `UNKNOWN`.
`remoteMatchedManilaPortfolioStatus(0, book)` is null.
`remoteMatchedManilaFamilyStatus(null, book)` is null, not `UNKNOWN`.
`remoteMatchedManilaFamilyStatus(0, book)` is null.
`sameSourcePairManilaFamilyStatus(null, [], [], book)` is null, not `UNKNOWN`.
`sameSourcePairManilaFamilyStatus(0, [], [], book)` is null.
Direct `sameSourcePairManilaFamilyStatus(null, [], [], [])` stays `UNKNOWN`.
`loadedSameSourcePairManilaFamilyStatus(knownEmpty, null, [], book)` is null.
`loadedSameSourcePairManilaFamilyStatus(knownEmpty, 0, [], book)` is null.
`loadedSameSourcePairManilaFamilyStatus(knownEmpty, null, [], [])` stays `UNKNOWN`.
`loadedSameSourcePairManilaFamilyStatus(null, null, [], book)` is null.
The publication ledger stays empty, so the writer was not called.
`sameSourcePairManilaDayFlowCount` of OPEN and of CLOSED with that null status stays
null for a null matched count, for 100, and for 150. No migration was added. No new
clock, source, parameter, provider, or cadence. This does not claim MATH-08 and does
not record `CLOSED`.

## What stays unchanged

- Unknown dates and null workplace stay on their existing holds.
- A lost ledger acknowledgement still returns `POST_PERSISTENCE_FAILURE` with
  exposure `UNKNOWN` and is not rolled back.
- Unlimited exact-six publication does not use the canary reservation.
- A missing reservation table still fails closed for capped writers. Do not
  deploy the reservation gateway before migration 0057.
- A rejected pair scored with a null matched count stays null, not `UNKNOWN`.
- A missing snapshot pair stays null for a null or zero matched count.
- A known empty id row still reports `UNKNOWN` for an empty supplied book.
- The stored snapshot state remains OPEN. No CLOSED row is written.
- Behavior commit `8ae3903f6f1c4ee408d6c770c0ba42c16c6802e8` is on Secure Source
  Manager branch `codex/verified-flow-directory-checkpoint`.

## Evidence

Native bun:sqlite. The quoted filter isolated one file. The shipped reader already
returned null for a nonempty book with null/0 matched count and `UNKNOWN` for an empty
book, so this slice adds the lock and does not change reader code.

| Check | Result |
| --- | --- |
| Quoted targeted lock | 1 pass / 0 fail / 22 expect() / 292 filtered / 1 file / 2.25s |
| `bun x tsc --noEmit -p apps/web/tsconfig.json` | empty stdout and stderr, exit 0 |
| `bun run build` | Astro build completed in 92.90s, exit 0 |
| Guardrail audits | 4/4 audit scripts passed, exit 0 |

## Backup

Behavior commit `8ae3903f6f1c4ee408d6c770c0ba42c16c6802e8`. Parent
`ca3a4038e4d243813c8602162ec170f313f3a1a6`. The push target is Secure Source
Manager `origin`, branch `codex/verified-flow-directory-checkpoint`. GitLab
was not pushed. `main` was not pushed. GitHub was not probed. Cloud Run,
Scheduler, Artifact Registry, Turso, D1, and Cloudflare were unchanged.

## Still open

Accepted MATH remains 0/13. Certified fresh flow remains UNKNOWN. A positive matched
count that disagrees with the supplied book total is not yet proven absent from the
family status. Directory packets 234 and 237 stay proposals. 236 stays parked. No
directory SQL. Migrations 0056 through 0068 were not applied. The next gap is
PUBLICATION_MANILA_DAY_MISMATCHED_COUNT_IS_NOT_A_FAMILY_STATUS.
`remoteMatchedManilaPortfolioStatus(total + 1, book)` is null, not `OK` or `BREACH`.
The same call with `total - 1` is null.
`remoteMatchedManilaFamilyStatus` of both calls is null.
`sameSourcePairManilaFamilyStatus(total + 1, stillPublicIds, recordedSources, book)` is null.
Do not certify a production daily flow.
