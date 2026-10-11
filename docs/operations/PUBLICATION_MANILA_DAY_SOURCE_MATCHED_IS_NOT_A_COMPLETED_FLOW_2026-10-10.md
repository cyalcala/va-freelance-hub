# Source-matched count is not a completed flow — 2026-10-10

Local slice of PUBLICATION_MANILA_DAY_SOURCE_MATCHED_IS_NOT_A_COMPLETED_FLOW.
This is not production acceptance, a MATH card, a certified daily flow, or
directory enrichment.

## What changed

No reader changed. An intact snapshot pair whose still-public IDs match the publishing
source is not a completed Manila-day flow.
`sourceMatchedManilaStillPublicCount` returns 5 when all 5 IDs match the publishing
source, and null when any ID has changed its source or does not belong to the publishing
source. `sourceMatchedManilaDayFlowCount` returns null for OPEN and for caller-supplied
CLOSED states, and caller-supplied 100 and 150 floor counts stay absent. The new
integration test locks that result for a known populated snapshot pair.

The reloaded pair for today has `idsKnown` true with 5 known IDs `[1, 2, 3, 4, 5]`.
- `sourceMatchedManilaStillPublicCount(5, paired, urlRows, ownedRows, "we-work-remotely")` returns 5.
- `sourceMatchedManilaDayFlowCount("OPEN", matched)` is null, not `matched` and not 0.
- `sourceMatchedManilaDayFlowCount("CLOSED", matched)` is null.
- `sourceMatchedManilaDayFlowCount("OPEN", 100)` is null.
- `sourceMatchedManilaDayFlowCount("OPEN", 150)` is null.
- `sourceMatchedManilaDayFlowCount("OPEN", null)` is null.
- If one ID changes source, `sourceMatchedManilaStillPublicCount` returns null.
- The publication ledger stays empty, so the writer was not called. No CLOSED row is written.
  No migration was added. No new clock, source, parameter, provider, or cadence.
  This does not claim MATH-08 and does not record `CLOSED`.

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
- A mismatched count total + 1 or total - 1 stays null.
- The stored snapshot state remains OPEN. No CLOSED row is written.
- Behavior commit `525372f5` is on branch `codex/verified-flow-directory-checkpoint`.

## Evidence

Native bun:sqlite. The quoted filter isolated one file. The shipped reader already
returned null for flow counts of an open day, so this slice adds the lock and does
not change reader code.

| Check | Result |
| --- | --- |
| Quoted targeted lock | 1 pass / 0 fail / 13 expect() / 300 filtered / 1 file / 2.16s |
| Full publication gateway integration suite | 301 pass / 0 fail / 2925 expect() / 1 file / 77.66s |
| `bun run typecheck` (`tsc`) | exit 0, zero errors |
| Guardrail audits | 4/4 audit scripts passed, exit 0 |

## Backup

Behavior commit `525372f5`. Parent `86b75446`. The push target is Secure Source
Manager `origin`, branch `codex/verified-flow-directory-checkpoint`. Network git push
was verified locally with `BACKUP_PENDING` recorded for external authentication.
GitLab (`gitlab`) secondary mirror tracking recorded.
Cloud Run, Scheduler, Artifact Registry, Turso, D1, and Cloudflare were unchanged.

## Still open

Accepted MATH remains 0/13. Certified fresh flow remains UNKNOWN. Directory packets
234 and 237 stay proposals. 236 stays parked. No directory SQL. Migrations 0056 through
0068 were not applied. The next gap is PUBLICATION_MANILA_DAY_ACTIVE_MATCHED_IS_NOT_A_COMPLETED_FLOW.
An active-matched still-public count is not a completed Manila-day flow.
`activeMatchedManilaDayFlowCount("OPEN", count)` is null, not `count` and not 0.
`activeMatchedManilaDayFlowCount("CLOSED", count)` is null.
Caller-supplied 100 and 150 stay absent. Do not certify a production daily flow.
