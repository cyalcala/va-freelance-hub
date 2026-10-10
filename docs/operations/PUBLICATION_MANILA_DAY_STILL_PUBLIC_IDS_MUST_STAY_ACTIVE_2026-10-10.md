# Inactive still-public id stays absent — 2026-10-10

Local slice of PUBLICATION_MANILA_DAY_STILL_PUBLIC_IDS_MUST_STAY_ACTIVE. This
is not production acceptance, a MATH card, a certified daily flow, or
directory enrichment.

## What changed

`activeMatchedManilaStillPublicCount` returns null when the live active id
list is empty after a source-matched id leaves `is_active = 1`. The
source-matched count of the original owned rows stays 1. The active-matched
reader does not return that 1 and does not return 0. Restoring
`is_active = 1` and passing the live still-public list returns the
source-matched number. The publication writer does not call this reader. No
migration was added. No new clock, source, parameter, provider, or cadence.
This does not claim MATH-08.

## What stays unchanged

- Unknown dates and null workplace stay on their existing holds.
- A lost ledger acknowledgement still returns `POST_PERSISTENCE_FAILURE` with
  exposure `UNKNOWN` and is not rolled back.
- Unlimited exact-six publication does not use the canary reservation.
- A missing reservation table still fails closed for capped writers. Do not
  deploy the reservation gateway before migration 0057.
- An unknown id pair still reports null, not zero.
- A disagreement between the first-publish count and the id length still
  stays absent.
- A repeated first-publish id still stays absent.
- A distinct foreign first-publish list still stays absent.
- A still-public count that disagrees with its known id length still stays
  absent.
- Still-public ids that differ from the serving rows stay absent.
- An onsite serving match stays absent.
- A stale or unknown original posting stays absent.
- An unresolvable outbound apply URL stays absent.
- An ineligible row stays absent from the PH-matched count.
- A host-case pair stays absent from the canonical-URL count and is not
  collapsed to one survivor.
- An id that leaves the publishing source stays absent.
- A positive source-matched count on an OPEN snapshot is still not a
  completed flow.
- A positive canonical-URL count on an OPEN snapshot is still not a completed
  flow.
- A positive PH-matched count on an OPEN snapshot is still not a completed
  flow.
- A positive ledger-matched count on an OPEN snapshot is still not a
  completed flow.
- A positive serving-matched count on an OPEN snapshot is still not a
  completed flow.
- The stored snapshot state remains OPEN. No CLOSED row is written.

## Evidence

Native bun:sqlite. One We Work Remotely publish stays unlimited. The
source-matched still-public count is 1 and `source_id` is
`we-work-remotely`. `stillPublicFirstPublishIds` is that id. Setting
`is_active` to 0 makes the live still-public list empty. The source-matched
count of the original owned rows stays 1. The table contains no CLOSED row.
`activeMatchedManilaStillPublicCount` of the empty live list is null, not 1
and not 0. Restoring `is_active = 1` and passing the live still-public list
returns 1. No live D1, provider, or browser proof.

Before the reader existed, `is_active` was already 0, the live still-public
list was already empty, the source-matched count was already 1, the CLOSED
count was already 0, and `activeMatchedManilaStillPublicCount` was undefined:
0 pass / 1 fail / 11 expect(). The failing assertion was
`expect(typeof activeMatchedManilaStillPublicCount).toBe("function")` at
`packages/scraper/publication-gateway.integration.test.ts:3552`.

| Check | Result |
| --- | --- |
| Targeted inactive still-public fence | 1 pass / 0 fail / 15 expect() / 256 filtered / 344.00ms |
| `bun x tsc --noEmit -p apps/web/tsconfig.json` | empty stdout and stderr, exit 0 |
| Full suite | 4067 pass / 0 fail / 327709 expect() / 255 files / 139.65s, exit 0 |

The suite gained one test and 15 expects from the prior 4066 / 327694 run.
The typecheck output contains no TypeScript error.

## Backup

Behavior commit `d0ab0a6894374f253f61969706a734bad34f56d8`. Parent
`14e44dd8553dc50bf2858094f97d11bde8fae780`. The push target is Secure Source
Manager `origin`, branch `codex/verified-flow-directory-checkpoint`. `ls-remote`
returned that same SHA. GitLab was not pushed. `main` was not pushed. GitHub
was not probed. Cloud Run, Scheduler, Artifact Registry, Turso, D1, and
Cloudflare were unchanged.

## Still open

Accepted MATH remains 0/13. Certified fresh flow remains UNKNOWN. A positive
active-matched count on an OPEN snapshot is not yet fenced out of a completed
flow. Directory packets 234 and 237 stay proposals. 236 stays parked. No
directory SQL. Migrations 0056 through 0068 were not applied. The next gap is
PUBLICATION_MANILA_DAY_ACTIVE_MATCH_IS_NOT_A_FLOW. A positive active-matched
count on an OPEN snapshot stays absent from a completed flow. Do not return
that count or 0, and do not certify a production daily flow.
