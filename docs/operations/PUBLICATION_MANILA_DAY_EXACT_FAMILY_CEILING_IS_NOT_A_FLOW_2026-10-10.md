# Exact family ceiling is not a flow — 2026-10-10

Local slice of PUBLICATION_MANILA_DAY_EXACT_FAMILY_CEILING_IS_NOT_A_FLOW.
This is not production acceptance, a MATH card, a certified daily flow, or
directory enrichment.

## What changed

`recordedOpportunityManilaDayFlowCount` returns null for an OPEN snapshot
whose recorded family share is exactly 0.4. A caller-supplied `CLOSED` state
does not create a flow. Caller-supplied 100 and 150 stay absent. The result
is not the matched count and not 0. A later three-of-five family breach on
the same ids is also null. The five unlimited We Work Remotely publishes
already succeeded, and the recorded family status was already `OK`, before
that reader is called. The publication writer does not call this reader. No
migration was added. No new clock, source, parameter, provider, or cadence.
This does not claim MATH-08 and does not record `CLOSED`.

## What stays unchanged

- Unknown dates and null workplace stay on their existing holds.
- A lost ledger acknowledgement still returns `POST_PERSISTENCE_FAILURE` with
  exposure `UNKNOWN` and is not rolled back.
- Unlimited exact-six publication does not use the canary reservation.
- A missing reservation table still fails closed for capped writers. Do not
  deploy the reservation gateway before migration 0057.
- A caller-supplied family book that does not match the recorded opportunity
  sources stays absent.
- Two of five distinct sources in one family stay `OK`. Three of five stay
  `BREACH`.
- The stored snapshot state remains OPEN. No CLOSED row is written.

## Evidence

Native bun:sqlite. Five We Work Remotely publishes stay unlimited. The open
snapshot state is `OPEN`, its still-public count is 5, and its still-public
ids are those five ids. The table contains no CLOSED row. The opportunity
sources are `jobicy:admin`, `jobicy:support`, `remotive`, `remote-ok`, and
`real-work-from-anywhere`. `recordedOpportunityManilaFamilyStatus` of that
recorded book is `OK`, not `BREACH`.
`recordedOpportunityManilaDayFlowCount` of that OPEN state, that `OK`
status, and matched count 5 is null, not 5 and not 0. The same call with
`CLOSED`, and the OPEN calls with 100 and 150, are null. After the third id
becomes `jobicy:design`, the family status is `BREACH` and the OPEN flow
count is null. No live D1, provider, or browser proof.

Before the reader existed, the five publishes were already unlimited, the
day state was already `OPEN`, the still-public count was already 5, the
CLOSED count was already 0, the snapshot ids were already those five ids,
the recorded family status was already `OK`, and
`recordedOpportunityManilaDayFlowCount` was undefined: 0 pass / 1 fail / 11
expect(). The failing assertion was
`expect(typeof recordedOpportunityManilaDayFlowCount).toBe("function")` at
`packages/scraper/publication-gateway.integration.test.ts:4214`.

| Check | Result |
| --- | --- |
| Targeted exact-ceiling flow fence | 1 pass / 0 fail / 19 expect() / 270 filtered / 105.14ms |
| `bun x tsc --noEmit -p apps/web/tsconfig.json` | empty stdout and stderr, exit 0 |
| Full suite | 4081 pass / 0 fail / 327975 expect() / 255 files / 144.90s, exit 0 |

The suite gained one test and 19 expects from the prior 4080 / 327956 run.
The typecheck output contains no TypeScript error.

## Backup

Behavior commit `6286e53eaf153b198544fa738d506b9babfb9d78`. Parent
`fde64cec45d9225a9a2b830f0cafa09c24e0ab0a`. The push target is Secure Source
Manager `origin`, branch `codex/verified-flow-directory-checkpoint`. `ls-remote`
returned that same SHA. GitLab was not pushed. `main` was not pushed. GitHub
was not probed. Cloud Run, Scheduler, Artifact Registry, Turso, D1, and
Cloudflare were unchanged.

## Still open

Accepted MATH remains 0/13. Certified fresh flow remains UNKNOWN. Two
recorded ids that share one source are not yet proven to stay a family `OK`
when their source share is a breach. Directory packets 234 and 237 stay
proposals. 236 stays parked. No directory SQL. Migrations 0056 through 0068
were not applied. The next gap is
PUBLICATION_MANILA_DAY_SAME_SOURCE_PAIR_IS_NOT_A_FAMILY_BREACH. Two of five
still-public ids with the same source sit at source share 0.4, a source
breach, and family share 0.4, which stays `OK`. Do not copy the source
breach onto the family status, and do not certify a production daily flow.
