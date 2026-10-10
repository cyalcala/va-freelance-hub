# Still-public ids must stay on the publishing source — 2026-10-10

Local slice of
PUBLICATION_MANILA_DAY_STILL_PUBLIC_IDS_MUST_STAY_ON_THE_PUBLISHING_SOURCE.
This is not production acceptance, a MATH card, a certified daily flow, or
directory enrichment.

## What changed

`sourceMatchedManilaStillPublicCount` returns the canonical-URL number only
when every still-public id still has the publishing `source_id`. A row moved
to another source returns null. An empty owned-id list returns null. An empty
publishing source returns null. The reader does not prefer the canonical-URL
length. The publication writer does not call this reader. No migration was
added. No new clock, source, parameter, provider, or cadence. This does not
grant a source and does not claim MATH-08.

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
- A positive canonical-URL count on an OPEN snapshot is still not a completed
  flow.
- A positive PH-matched count on an OPEN snapshot is still not a completed
  flow.
- A positive ledger-matched count on an OPEN snapshot is still not a
  completed flow.
- A positive serving-matched count on an OPEN snapshot is still not a
  completed flow.
- The stored snapshot state remains OPEN. No CLOSED row is written.
- `canonicalizeSourceUrl` still returns an unparseable value unchanged.

## Evidence

Native bun:sqlite. One We Work Remotely publish stays unlimited. The
canonical-URL still-public count is 1 and `source_id` is `we-work-remotely`.
`source_id` is then set to `remotive`. The canonical-URL count remains 1.
The source-matched count is null, not 1 and not 0. An empty owned-id list is
null. Restoring `source_id` to `we-work-remotely` makes the source-matched
count 1. An empty publishing source on that restored row is null. The table
contains no CLOSED row. No live D1, provider, or browser proof.

Before the reader existed, the row was already on `remotive`, the
canonical-URL count was already 1, the CLOSED count was already 0, and
`sourceMatchedManilaStillPublicCount` was undefined: 0 pass / 1 fail / 12
expect(). The failing assertion was
`expect(typeof sourceMatchedManilaStillPublicCount).toBe("function")` at
`packages/scraper/publication-gateway.integration.test.ts:3466`.

| Check | Result |
| --- | --- |
| Targeted publishing-source still-public test | 1 pass / 0 fail / 18 expect() / 254 filtered / 351.00ms |
| `bun x tsc --noEmit -p apps/web/tsconfig.json` | empty stdout and stderr, exit 0 |
| Full suite | 4065 pass / 0 fail / 327677 expect() / 255 files / 145.26s, exit 0 |

The suite gained one test and 18 expects from the prior 4064 / 327659 run.
The typecheck output contains no TypeScript error.

## Backup

Behavior commit `a31739d5582b7a85db503c2e8c50680da43a9962`. Parent
`6e890483a68d30b2d3a24d740678fe57aa56407d`. The push target is Secure Source
Manager `origin`, branch `codex/verified-flow-directory-checkpoint`. `ls-remote`
returned that same SHA. GitLab was not pushed. `main` was not pushed. GitHub
was not probed. Cloud Run, Scheduler, Artifact Registry, Turso, D1, and
Cloudflare were unchanged.

## Still open

Accepted MATH remains 0/13. Certified fresh flow remains UNKNOWN. A positive
source-matched still-public count on an OPEN snapshot is not a completed
flow. Directory packets 234 and 237 stay proposals. 236 stays parked. No
directory SQL. Migrations 0056 through 0068 were not applied. The next gap is
PUBLICATION_MANILA_DAY_SOURCE_MATCH_IS_NOT_A_FLOW. A caller-supplied CLOSED
state does not create a flow, and caller-supplied 100 and 150 stay absent.
Do not record CLOSED, and do not certify a production daily flow.
