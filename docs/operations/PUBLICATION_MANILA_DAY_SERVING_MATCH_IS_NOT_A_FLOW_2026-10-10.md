# Serving-matched count is not a completed flow — 2026-10-10

Local slice of PUBLICATION_MANILA_DAY_SERVING_MATCH_IS_NOT_A_FLOW. This is
not production acceptance, a MATH card, a certified daily flow, or directory
enrichment.

## What changed

`servingMatchedManilaDayFlowCount` returns null for an OPEN snapshot whose
serving-matched still-public count is already positive. A caller-supplied
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
- A positive ledger-matched count on an OPEN snapshot is still not a
  completed flow.
- The stored snapshot state remains OPEN. No CLOSED row is written.

## Evidence

Native bun:sqlite. One We Work Remotely publish stays unlimited. The
serving-matched still-public count is already 1 and equals the serving
length. The snapshot `day_state` is OPEN. The table contains no CLOSED row.
`servingMatchedManilaDayFlowCount` of that OPEN state and matched count is
null, not 1 and not 0. The same matched count with a caller-supplied CLOSED
state is null. Caller-supplied 100 and 150 on OPEN are null. No live D1,
provider, or browser proof.

Before the reader existed, the serving-matched count was already 1, the
snapshot was OPEN, the CLOSED count was already 0, and
`servingMatchedManilaDayFlowCount` was undefined: 0 pass / 1 fail / 12
expect(). The failing assertion was
`expect(typeof servingMatchedManilaDayFlowCount).toBe("function")` at
`packages/scraper/publication-gateway.integration.test.ts:3102`.

| Check | Result |
| --- | --- |
| Targeted serving-match flow fence | 1 pass / 0 fail / 18 expect() / 246 filtered / 331.00ms |
| `bun x tsc --noEmit -p apps/web/tsconfig.json` | empty stdout and stderr, exit 0 |
| Full suite | 4057 pass / 0 fail / 327523 expect() / 255 files / 154.66s, exit 0 |

The suite gained one test and 18 expects from the prior 4056 / 327505 run.
The typecheck output contains no TypeScript error.

## Backup

Behavior commit `6957245bb835eeca46ebc3193deb8cc336327982`. Parent
`cad9264900f30236c8d218f6d89ca4f8bd6ae8e5`. The push target is Secure Source
Manager `origin`, branch `codex/verified-flow-directory-checkpoint`. `ls-remote`
returned that same SHA. GitLab was not pushed. `main` was not pushed. GitHub
was not probed. Cloud Run, Scheduler, Artifact Registry, Turso, D1, and
Cloudflare were unchanged.

## Still open

Accepted MATH remains 0/13. Certified fresh flow remains UNKNOWN. A
serving-matched still-public id can remain in the active PH set after its
`location_type` is no longer remote. Directory packets 234 and 237 stay
proposals. 236 stays parked. No directory SQL. Migrations 0056 through 0068
were not applied. The next gap is
PUBLICATION_MANILA_DAY_STILL_PUBLIC_IDS_MUST_STAY_REMOTE. When a
serving-matched id is no longer remote, the still-public count stays absent.
Do not prefer the active PH length, and do not certify a production daily
flow.
