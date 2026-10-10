# One-source remote match is not a portfolio pass — 2026-10-10

Local slice of PUBLICATION_MANILA_DAY_REMOTE_MATCH_IS_NOT_A_PORTFOLIO_PASS.
This is not production acceptance, a MATH card, a certified daily flow, or
directory enrichment.

## What changed

`remoteMatchedManilaPortfolioStatus` returns `BREACH` when a positive
remote-matched count is held by one publishing source. It returns `UNKNOWN`
for an empty book with no positive matched count. A row total that disagrees
with the matched count returns null, not `OK` and not `BREACH`. Four equal
exact-six source counts at the 25% ceiling return `OK` from the existing
share math. The unlimited We Work Remotely publish already succeeded before
that status is read. The publication writer does not call this reader. No
migration was added. No new clock, source, parameter, provider, or cadence.
This does not claim MATH-08 and does not turn 25/40 into a per-write block.

## What stays unchanged

- Unknown dates and null workplace stay on their existing holds.
- A lost ledger acknowledgement still returns `POST_PERSISTENCE_FAILURE` with
  exposure `UNKNOWN` and is not rolled back.
- Unlimited exact-six publication does not use the canary reservation.
- A missing reservation table still fails closed for capped writers. Do not
  deploy the reservation gateway before migration 0057.
- An unknown id pair still reports null, not zero.
- A positive remote-matched count on an OPEN snapshot is still not a
  completed flow.
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
`location_type` is `remote`. The remote-matched still-public count is 1.
`concentrationReport` of that one source at `TOP_SOURCE_SHARE_MAX` is
`BREACH` with top share 1, not `OK`. An empty row list is `UNKNOWN`, not
`OK`. The table contains no CLOSED row.
`remoteMatchedManilaPortfolioStatus` of that matched count and the one
source row is `BREACH`, not `OK`. The same matched count with an empty row
list is null. A null matched count with an empty row list is `UNKNOWN`. Four
equal counts across We Work Remotely, Remotive, Real Work From Anywhere, and
Remote OK return `OK`. No live D1, provider, or browser proof.

Before the reader existed, the publish was already unlimited, the
remote-matched count was already 1, the one-source report was already
`BREACH`, the empty report was already `UNKNOWN`, the CLOSED count was
already 0, and `remoteMatchedManilaPortfolioStatus` was undefined: 0 pass /
1 fail / 14 expect(). The failing assertion was
`expect(typeof remoteMatchedManilaPortfolioStatus).toBe("function")` at
`packages/scraper/publication-gateway.integration.test.ts:3772`.

| Check | Result |
| --- | --- |
| Targeted one-source portfolio fence | 1 pass / 0 fail / 19 expect() / 261 filtered / 314.00ms |
| `bun x tsc --noEmit -p apps/web/tsconfig.json` | empty stdout and stderr, exit 0 |
| Full suite | 4072 pass / 0 fail / 327801 expect() / 255 files / 142.80s, exit 0 |

The suite gained one test and 19 expects from the prior 4071 / 327782 run.
The typecheck output contains no TypeScript error.

## Backup

Behavior commit `c7bd1a6839d3cd84b9db92dc8569db2a9bfca4f9`. Parent
`2340f680ba2298bb59fbe44ce6c5ef50c6a9c320`. The push target is Secure Source
Manager `origin`, branch `codex/verified-flow-directory-checkpoint`. `ls-remote`
returned that same SHA. GitLab was not pushed. `main` was not pushed. GitHub
was not probed. Cloud Run, Scheduler, Artifact Registry, Turso, D1, and
Cloudflare were unchanged.

## Still open

Accepted MATH remains 0/13. Certified fresh flow remains UNKNOWN. A
source-share `OK` book can still put one provider family over 40%. Directory
packets 234 and 237 stay proposals. 236 stays parked. No directory SQL.
Migrations 0056 through 0068 were not applied. The next gap is
PUBLICATION_MANILA_DAY_SOURCE_OK_IS_NOT_A_FAMILY_PASS. Two colon-prefixed
ids in one family can each sit at the 25% source ceiling and still breach
the 40% family ceiling. The unprefixed Jobicy feeds do not fold. Do not block
the writer, and do not certify a production daily flow.
