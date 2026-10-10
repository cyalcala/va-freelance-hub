# Same-source breach is a family breach — 2026-10-10

Local slice of PUBLICATION_MANILA_DAY_SAME_SOURCE_BREACH_IS_A_FAMILY_BREACH.
This is not production acceptance, a MATH card, a certified daily flow, or
directory enrichment.

## What changed

`sameSourcePairManilaFamilyStatus` returns `BREACH` when three of five
still-public opportunity ids have the same source. At count 3 of 5, the top
source share is 0.6, above the 25% source ceiling, and the provider-family
share is 0.6, above the 40% provider-family ceiling. The paired reader returns
the family status, which matches the source breach status. A mismatched book
whose counts do not sum to the matched count stays absent. The publication
writer does not call this reader. No migration was added. No new clock,
source, parameter, provider, or cadence. This does not claim MATH-08 and does
not record `CLOSED`.

## What stays unchanged

- Unknown dates and null workplace stay on their existing holds.
- A lost ledger acknowledgement still returns `POST_PERSISTENCE_FAILURE` with
  exposure `UNKNOWN` and is not rolled back.
- Unlimited exact-six publication does not use the canary reservation.
- A missing reservation table still fails closed for capped writers. Do not
  deploy the reservation gateway before migration 0057.
- Two of five still-public ids with the same source sit at share 0.4, a source
  breach, and family share 0.4, which stays `OK`.
- The stored snapshot state remains OPEN. No CLOSED row is written.

## Evidence

Native bun:sqlite. Five We Work Remotely publishes stay unlimited. The open
snapshot state is `OPEN`, its still-public count is 5, and its still-public
ids are those five ids. The table contains no CLOSED row. Three opportunity
sources are `jobicy:admin`, and the other two are `remotive` and `remote-ok`.
The top source share is 0.6 and `remoteMatchedManilaPortfolioStatus` is
`BREACH`. The top family share is 0.6 and `concentrationReport` returns
`BREACH`. `sameSourcePairManilaFamilyStatus` of that recorded book is `BREACH`,
not `OK`, and it equals the source breach status. A supplied book that does
not match the count returns null. No live D1, provider, or browser proof.

| Check | Result |
| --- | --- |
| Targeted same-source breach | 1 pass / 0 fail / 19 expect() / 273 filtered / 140.25ms |
| Full publication gateway integration suite | 274 pass / 0 fail / 2467 expect() / 21.77s |
| `bun x tsc --noEmit -p apps/web/tsconfig.json` | empty stdout and stderr, exit 0 |

## Backup

Behavior commit `4dcfc13ffea85f34177b96e492068997c6ce2bfb`. Parent
`a96152981f2162f27a69bc9e5c4d3bcdd3f2824a`. The push target is Secure Source
Manager `origin`, branch `codex/verified-flow-directory-checkpoint`. GitLab
was not pushed. `main` was not pushed. GitHub was not probed. Cloud Run,
Scheduler, Artifact Registry, Turso, D1, and Cloudflare were unchanged.

## Still open

Accepted MATH remains 0/13. Certified fresh flow remains UNKNOWN. An OPEN
snapshot whose same-source pair is a family breach is not yet proven absent
from a completed Manila-day flow. Directory packets 234 and 237 stay
proposals. 236 stays parked. No directory SQL. Migrations 0056 through 0068
were not applied. The next gap is
PUBLICATION_MANILA_DAY_SAME_SOURCE_BREACH_IS_NOT_A_FLOW. An OPEN snapshot
whose same-source pair is a family breach stays out of a completed flow.
Caller-supplied `CLOSED`, 100, and 150 stay absent. Do not certify a
production daily flow.
