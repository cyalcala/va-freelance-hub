# Apply-matched count is not a completed flow — 2026-10-10

Local slice of PUBLICATION_MANILA_DAY_APPLY_MATCHED_IS_NOT_A_COMPLETED_FLOW.
This is not production acceptance, a MATH card, a certified daily flow, or
directory enrichment.

## What changed

No reader changed. An intact snapshot pair whose still-public IDs have resolvable
outbound apply URLs is not a completed Manila-day flow.
`applyMatchedManilaStillPublicCount` returns 5 when all 5 IDs have valid apply URLs,
and null when any ID is missing an apply URL. `applyMatchedManilaDayFlowCount` returns
null for OPEN and for caller-supplied CLOSED states, and caller-supplied 100 and 150
floor counts stay absent. The new integration test locks that result for a known
populated snapshot pair.

The reloaded pair for today has `idsKnown` true with 5 known IDs `[1, 2, 3, 4, 5]`.
- `applyMatchedManilaStillPublicCount(5, paired, freshIds, applyIds)` returns 5.
- `applyMatchedManilaDayFlowCount("OPEN", matched)` is null, not `matched` and not 0.
- `applyMatchedManilaDayFlowCount("CLOSED", matched)` is null.
- `applyMatchedManilaDayFlowCount("OPEN", 100)` is null.
- `applyMatchedManilaDayFlowCount("OPEN", 150)` is null.
- `applyMatchedManilaDayFlowCount("OPEN", null)` is null.
- If one ID lacks an apply URL (4 of 5), `applyMatchedManilaStillPublicCount` returns null.
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
- Behavior commit `30a77752` is on branch `codex/verified-flow-directory-checkpoint`.

## Evidence

Native bun:sqlite. The quoted filter isolated one file. The shipped reader already
returned null for flow counts of an open day, so this slice adds the lock and does
not change reader code.

| Check | Result |
| --- | --- |
| Quoted targeted lock | 1 pass / 0 fail / 13 expect() / 297 filtered / 1 file / 1.97s |
| Full publication gateway integration suite | 298 pass / 0 fail / 2886 expect() / 1 file / 87.60s |
| `bun run typecheck` (`tsc`) | exit 0, zero errors |
| Guardrail audits | 4/4 audit scripts passed, exit 0 |

## Backup

Behavior commit `30a77752`. Parent `86a47c3a`. The push target is Secure Source
Manager `origin`, branch `codex/verified-flow-directory-checkpoint`. Network git push
was verified locally with `BACKUP_PENDING` recorded for external authentication.
Cloud Run, Scheduler, Artifact Registry, Turso, D1, and Cloudflare were unchanged.

## Still open

Accepted MATH remains 0/13. Certified fresh flow remains UNKNOWN. Directory packets
234 and 237 stay proposals. 236 stays parked. No directory SQL. Migrations 0056 through
0068 were not applied. The next gap is PUBLICATION_MANILA_DAY_PH_MATCHED_IS_NOT_A_COMPLETED_FLOW.
A PH-matched still-public count is not a completed Manila-day flow.
`phMatchedManilaDayFlowCount("OPEN", count)` is null, not `count` and not 0.
`phMatchedManilaDayFlowCount("CLOSED", count)` is null.
Caller-supplied 100 and 150 stay absent. Do not certify a production daily flow.
