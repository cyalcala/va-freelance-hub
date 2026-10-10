# Still-public ids must stay PH-eligible — 2026-10-10

Local slice of PUBLICATION_MANILA_DAY_STILL_PUBLIC_IDS_MUST_STAY_PH_ELIGIBLE.
This is not production acceptance, a MATH card, a certified daily flow, or
directory enrichment.

## What changed

`phMatchedManilaStillPublicCount` returns the shared number only when the
apply-matched still-public ids remain in the accepted PH eligibility pair
(`eligible_verified`, `eligible_likely`). An `ineligible` row returns null.
The reader does not prefer the apply-matched length. The publication writer
does not call this reader. No migration was added. No new clock, source,
parameter, provider, or cadence. This does not claim MATH-08.

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
- A positive ledger-matched count on an OPEN snapshot is still not a
  completed flow.
- A positive serving-matched count on an OPEN snapshot is still not a
  completed flow.
- The stored snapshot state remains OPEN. No CLOSED row is written.

## Evidence

Native bun:sqlite. One We Work Remotely publish stays unlimited. The row is
in the accepted PH pair, the still-public id list is that id, and the
apply-matched still-public count is 1. `ph_eligibility` is then set to
`ineligible`. `isPublicPhEligibility` is false and the still-public id list
is empty. The apply-matched count of the pre-change id list remains 1. The
PH id list is empty. The PH-matched count is null, not 1 and not 0. The same
snapshot with that id in the PH list still returns 1. The table contains no
CLOSED row. No live D1, provider, or browser proof.

Before the reader existed, the row was already ineligible, the still-public
id list was already empty, the apply-matched count was already 1, the CLOSED
count was already 0, and `phMatchedManilaStillPublicCount` was undefined:
0 pass / 1 fail / 14 expect(). The failing assertion was
`expect(typeof phMatchedManilaStillPublicCount).toBe("function")` at
`packages/scraper/publication-gateway.integration.test.ts:3285`.

| Check | Result |
| --- | --- |
| Targeted PH still-public test | 1 pass / 0 fail / 18 expect() / 250 filtered / 334.00ms |
| `bun x tsc --noEmit -p apps/web/tsconfig.json` | empty stdout and stderr, exit 0 |
| Full suite, run alone | 4061 pass / 0 fail / 327601 expect() / 255 files / 137.29s |

The suite gained one test and 18 expects from the prior 4060 / 327583 run.
An earlier suite started while typecheck was still running reported 4060 pass
/ 1 fail / 327601 expect() / 255 files / 157.67s. The only failure was
`scripts/lake/held-tenant-readjudication-wiring.test.ts` timing out at 5000ms.
That test alone then passed: 1 pass / 0 fail / 7 expect() / 13 filtered /
1113.69ms. The suite above was rerun without a concurrent typecheck. The
wrapper did not capture that rerun's process exit code; the bun summary
reports 0 fail. The typecheck output contains no TypeScript error.

## Backup

Behavior commit `6681d321ead296c118501a1c18ab19b06d7c58ca`. Parent
`32f7018bee0dfdc0bf170a8ff3871dd618907d70`. The push target is Secure Source
Manager `origin`, branch `codex/verified-flow-directory-checkpoint`. `ls-remote`
returned that same SHA. GitLab was not pushed. `main` was not pushed. GitHub
was not probed. Cloud Run, Scheduler, Artifact Registry, Turso, D1, and
Cloudflare were unchanged.

## Still open

Accepted MATH remains 0/13. Certified fresh flow remains UNKNOWN. A positive
PH-matched still-public count on an OPEN snapshot is not a completed flow.
Directory packets 234 and 237 stay proposals. 236 stays parked. No directory
SQL. Migrations 0056 through 0068 were not applied. The next gap is
PUBLICATION_MANILA_DAY_PH_MATCH_IS_NOT_A_FLOW. A caller-supplied CLOSED state
does not create a flow, and caller-supplied 100 and 150 stay absent. Do not
record CLOSED, and do not certify a production daily flow.
