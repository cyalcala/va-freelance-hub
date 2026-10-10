# Remote-matched count is not a completed flow — 2026-10-10

Local slice of PUBLICATION_MANILA_DAY_REMOTE_MATCH_IS_NOT_A_FLOW. This is
not production acceptance, a MATH card, a certified daily flow, or directory
enrichment.

## What changed

`remoteMatchedManilaDayFlowCount` returns null for an OPEN snapshot whose
remote-matched still-public count is already positive. A caller-supplied
CLOSED state returns null. Caller-supplied 100 and 150 on OPEN return null.
The reader does not return the matched count and does not return 0. The
publication writer does not call this reader. No migration was added. No new
clock, source, parameter, provider, or cadence. This does not claim MATH-08.

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
- An id that leaves `is_active = 1` stays absent from the active-matched
  count.
- A positive fresh-matched count on an OPEN snapshot is still not a completed
  flow.
- A positive apply-matched count on an OPEN snapshot is still not a completed
  flow.
- A positive active-matched count on an OPEN snapshot is still not a
  completed flow.
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

Native bun:sqlite. One We Work Remotely publish stays unlimited.
`location_type` is `remote`. The remote-matched still-public count is 1. The
snapshot `day_state` is OPEN. The table contains no CLOSED row.
`remoteMatchedManilaDayFlowCount` of that OPEN state and matched count is
null, not 1 and not 0. The same matched count with a caller-supplied CLOSED
state is null. Caller-supplied 100 and 150 on OPEN are null. No live D1,
provider, or browser proof.

Before the reader existed, the remote-matched count was already 1, the
snapshot was OPEN, the CLOSED count was already 0, and
`remoteMatchedManilaDayFlowCount` was undefined: 0 pass / 1 fail / 12
expect(). The failing assertion was
`expect(typeof remoteMatchedManilaDayFlowCount).toBe("function")` at
`packages/scraper/publication-gateway.integration.test.ts:3727`.

| Check | Result |
| --- | --- |
| Targeted remote-match flow fence | 1 pass / 0 fail / 18 expect() / 260 filtered / 370.00ms |
| `bun x tsc --noEmit -p apps/web/tsconfig.json` | empty stdout and stderr, exit 0 |
| Full suite | 4071 pass / 0 fail / 327782 expect() / 255 files / 138.64s, exit 0 |

The suite gained one test and 18 expects from the prior 4070 / 327764 run.
The typecheck output contains no TypeScript error.

## Backup

Behavior commit `a8ec2f439684c44e49283e9ab2853f1863e3aa7f`. Parent
`1cae9c297f0e659cb0d9775d85d347d4687c21d0`. The push target is Secure Source
Manager `origin`, branch `codex/verified-flow-directory-checkpoint`. `ls-remote`
returned that same SHA. GitLab was not pushed. `main` was not pushed. GitHub
was not probed. Cloud Run, Scheduler, Artifact Registry, Turso, D1, and
Cloudflare were unchanged.

## Still open

Accepted MATH remains 0/13. Certified fresh flow remains UNKNOWN. A one-source
remote-matched count is not yet fenced out of a portfolio pass. Directory
packets 234 and 237 stay proposals. 236 stays parked. No directory SQL.
Migrations 0056 through 0068 were not applied. The next gap is
PUBLICATION_MANILA_DAY_REMOTE_MATCH_IS_NOT_A_PORTFOLIO_PASS. One publishing
source at the whole remote-matched count is a source-share breach. That
breach does not block the writer, does not become OK, and does not certify a
production daily flow.
