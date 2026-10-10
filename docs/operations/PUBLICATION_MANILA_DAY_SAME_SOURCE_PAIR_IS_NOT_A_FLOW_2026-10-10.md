# Same-source pair is not a flow — 2026-10-10

Local slice of PUBLICATION_MANILA_DAY_SAME_SOURCE_PAIR_IS_NOT_A_FLOW.
This is not production acceptance, a MATH card, a certified daily flow, or
directory enrichment.

## What changed

`sameSourcePairManilaDayFlowCount` returns null for an OPEN snapshot whose
same-source pair stays OK. A caller-supplied `CLOSED` state does not create a
flow. Caller-supplied 100 and 150 stay absent. The result is not the matched
count and not 0. A later three-of-five family breach on the same ids is also
null. The five unlimited We Work Remotely publishes already succeeded, and the
same-source pair family status was already `OK`, before that reader is
called. The publication writer does not call this reader. No migration was
added. No new clock, source, parameter, provider, or cadence. This does not
claim MATH-08 and does not record `CLOSED`.

## What stays unchanged

- Unknown dates and null workplace stay on their existing holds.
- A lost ledger acknowledgement still returns `POST_PERSISTENCE_FAILURE` with
  exposure `UNKNOWN` and is not rolled back.
- Unlimited exact-six publication does not use the canary reservation.
- A missing reservation table still fails closed for capped writers. Do not
  deploy the reservation gateway before migration 0057.
- A caller-supplied family book that does not match the recorded opportunity
  sources stays absent.
- Two of five still-public ids with the same source sit at source share 0.4,
  a source breach, and family share 0.4, which stays `OK`. Three of five
  distinct sources in one family stay `BREACH`.
- The stored snapshot state remains OPEN. No CLOSED row is written.

## Evidence

Native bun:sqlite. Five We Work Remotely publishes stay unlimited. The open
snapshot state is `OPEN`, its still-public count is 5, and its still-public
ids are those five ids. The table contains no CLOSED row. Two opportunity
sources are `jobicy:admin`, and the other three are `remotive`, `remote-ok`,
and `real-work-from-anywhere`. `sameSourcePairManilaFamilyStatus` of that
recorded book is `OK`, not `BREACH`.
`sameSourcePairManilaDayFlowCount` of that OPEN state, that `OK` status,
and matched count 5 is null, not 5 and not 0. The same call with `CLOSED`,
and the OPEN calls with 100 and 150, are null. After three of five sources
become `jobicy:admin`, `jobicy:support`, and `jobicy:design`, the family
status is `BREACH` and the OPEN flow count is null. No live D1, provider,
or browser proof.

Before the reader existed, the five publishes were already unlimited, the
day state was already `OPEN`, the still-public count was already 5, the
CLOSED count was already 0, the snapshot ids were already those five ids,
the same-source pair status was already `OK`, and
`sameSourcePairManilaDayFlowCount` was undefined: 0 pass / 1 fail / 19
expect(). The failing assertion was
`expect(typeof sameSourcePairManilaDayFlowCount).toBe("function")` at
`packages/scraper/publication-gateway.integration.test.ts:4362`.

| Check | Result |
| --- | --- |
| Targeted same-source flow fence | 1 pass / 0 fail / 19 expect() / 272 filtered / 143.62ms |
| `bun x tsc --noEmit -p apps/web/tsconfig.json` | empty stdout and stderr, exit 0 |
| Four audits (guardrails, parameters, orchestrator, constitution) | passed cleanly, exit 0 |
| `astro build` | Complete, server built in 36.09s, exit 0 |

## Backup

Behavior commit `0807746fc3f1e91244e82485fa6ca84ddb3c8aa4`. Parent
`d547b36fb5f3eb727ba3e979039f11373d067397`. The push target is Secure Source
Manager `origin`, branch `codex/verified-flow-directory-checkpoint`. GitLab
was not pushed. `main` was not pushed. GitHub was not probed. Cloud Run,
Scheduler, Artifact Registry, Turso, D1, and Cloudflare were unchanged.

## Still open

Accepted MATH remains 0/13. Certified fresh flow remains UNKNOWN. Three of five
still-public ids with the same source or family are not yet proven to return a
family `BREACH` in `sameSourcePairManilaFamilyStatus`. Directory packets 234 and
237 stay proposals. 236 stays parked. No directory SQL. Migrations 0056 through
0068 were not applied. The next gap is
PUBLICATION_MANILA_DAY_SAME_SOURCE_BREACH_IS_A_FAMILY_BREACH. Three of five
still-public ids with the same provider family sit at share 0.6, a source and
family breach. Do not certify a production daily flow.
