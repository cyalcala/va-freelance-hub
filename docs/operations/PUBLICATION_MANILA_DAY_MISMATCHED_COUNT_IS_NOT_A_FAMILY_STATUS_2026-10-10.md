# Mismatched matched count is not a family status — 2026-10-10

Local slice of PUBLICATION_MANILA_DAY_MISMATCHED_COUNT_IS_NOT_A_FAMILY_STATUS.
This is not production acceptance, a MATH card, a certified daily flow, or
directory enrichment.

## What changed

No reader changed. `remoteMatchedManilaPortfolioStatus`, `remoteMatchedManilaFamilyStatus`,
and `sameSourcePairManilaFamilyStatus` already return null when the supplied book total
disagrees with the caller's matched count (`total + 1` or `total - 1`). The new integration test locks
that result for a known populated snapshot pair.

The reloaded pair for today has `idsKnown` true with 5 known IDs `[1, 2, 3, 4, 5]`.
A supplied book with 2 rows of `jobicy:admin` (count 2) and 3 rows across other sources
has total 5.
- `remoteMatchedManilaPortfolioStatus(total + 1, book)` is null, not `OK` or `BREACH`.
- `remoteMatchedManilaPortfolioStatus(total - 1, book)` is null.
- `remoteMatchedManilaFamilyStatus(total + 1, book)` is null, not `OK` or `BREACH`.
- `remoteMatchedManilaFamilyStatus(total - 1, book)` is null.
- `sameSourcePairManilaFamilyStatus(total + 1, stillPublicIds, recordedSources, book)` is null.
- `sameSourcePairManilaFamilyStatus(total - 1, stillPublicIds, recordedSources, book)` is null.
- Direct matching count `total` (5) still returns the status: `remoteMatchedManilaPortfolioStatus` returns `BREACH`, `remoteMatchedManilaFamilyStatus` returns `OK`, and `sameSourcePairManilaFamilyStatus` returns `OK`.
- The publication ledger stays empty, so the writer was not called.
- `sameSourcePairManilaDayFlowCount` of OPEN and of CLOSED with that mismatched status stays
  null for `total + 1`, for 100, and for 150. No migration was added. No new clock, source,
  parameter, provider, or cadence. This does not claim MATH-08 and does not record `CLOSED`.

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
- Behavior commit `476e44eb` is on Secure Source Manager branch
  `codex/verified-flow-directory-checkpoint`.

## Evidence

Native bun:sqlite. The quoted filter isolated one file. The shipped reader already
returned null for a mismatched count and the correct status for an equal count, so this
slice adds the lock and does not change reader code.

| Check | Result |
| --- | --- |
| Quoted targeted lock | 1 pass / 0 fail / 15 expect() / 293 filtered / 1 file / 0.72s |
| Full publication gateway integration suite | 294 pass / 0 fail / 2838 expect() / 1 file / 28.38s |
| `bun run typecheck` (`tsc`) | exit 0, zero errors |
| Guardrail audits | 4/4 audit scripts passed, exit 0 |

## Backup

Behavior commit `476e44eb`. Parent `2376e511`. The push target is Secure Source
Manager `origin`, branch `codex/verified-flow-directory-checkpoint`. Network git push
was verified locally with `BACKUP_PENDING` recorded for external authentication.
Cloud Run, Scheduler, Artifact Registry, Turso, D1, and Cloudflare were unchanged.

## Still open

Accepted MATH remains 0/13. Certified fresh flow remains UNKNOWN. Directory packets
234 and 237 stay proposals. 236 stays parked. No directory SQL. Migrations 0056 through
0068 were not applied. The next gap is PUBLICATION_MANILA_DAY_FAMILY_OK_IS_NOT_A_COMPLETED_FLOW.
An intact snapshot pair whose same-source family status is `OK` is not a completed
Manila-day flow. `sameSourcePairManilaDayFlowCount("OPEN", "OK", total)` is null,
not `total` and not 0. `sameSourcePairManilaDayFlowCount("CLOSED", "OK", total)` is null.
Caller-supplied 100 and 150 stay absent. Do not certify a production daily flow.
