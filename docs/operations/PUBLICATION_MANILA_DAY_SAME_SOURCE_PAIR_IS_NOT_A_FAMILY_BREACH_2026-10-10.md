# Same-source pair is not a family breach — 2026-10-10

Local slice of PUBLICATION_MANILA_DAY_SAME_SOURCE_PAIR_IS_NOT_A_FAMILY_BREACH.
This is not production acceptance, a MATH card, a certified daily flow, or
directory enrichment.

## What changed

`sameSourcePairManilaFamilyStatus` computes the source status and the family
status from the same recorded opportunity rows. Two of five still-public ids
with the same source sit at source share 0.4, a source breach, and family
share 0.4, which stays `OK`. The reader returns the family status, not the
source status. Three distinct sources in one family stay a family `BREACH`
even when each source share is `OK`. A supplied book that does not match the
recorded sources stays absent. The publication writer does not call this
reader. No migration was added. No new clock, source, parameter, provider,
or cadence. This does not claim MATH-08, does not record `CLOSED`, and does
not return a flow number.

## What stays unchanged

- Unknown dates and null workplace stay on their existing holds.
- A lost ledger acknowledgement still returns `POST_PERSISTENCE_FAILURE` with
  exposure `UNKNOWN` and is not rolled back.
- Unlimited exact-six publication does not use the canary reservation.
- A missing reservation table still fails closed for capped writers. Do not
  deploy the reservation gateway before migration 0057.
- An exact family-ceiling `OK` on an OPEN snapshot stays out of a completed
  flow.
- The stored snapshot state remains OPEN. No CLOSED row is written.

## Evidence

Native bun:sqlite. Five We Work Remotely publishes stay unlimited. The open
snapshot state is `OPEN`, its still-public count is 5, and its still-public
ids are those five ids. The table contains no CLOSED row. Two opportunity
sources are `jobicy:admin`, and the other three are `remotive`, `remote-ok`,
and `real-work-from-anywhere`. The source share is 0.4 and
`remoteMatchedManilaPortfolioStatus` is `BREACH`. The family share is 0.4
and `recordedOpportunityManilaFamilyStatus` is `OK`.
`sameSourcePairManilaFamilyStatus` of those same rows is `OK`, not `BREACH`,
and it is not the source status. After the five sources become
`jobicy:admin`, `jobicy:support`, `jobicy:design`, `remotive`, and
`remote-ok`, the source status is `OK` and the paired family status is
`BREACH`. The earlier recorded rows with the folded book stay null. No live
D1, provider, or browser proof.

Before the reader existed, the five publishes were already unlimited, the
day state was already `OPEN`, the still-public count was already 5, the
CLOSED count was already 0, the snapshot ids were already those five ids,
the source status was already `BREACH`, the family status was already `OK`,
and `sameSourcePairManilaFamilyStatus` was undefined: 0 pass / 1 fail / 19
expect(). The failing assertion was
`expect(typeof sameSourcePairManilaFamilyStatus).toBe("function")` at
`packages/scraper/publication-gateway.integration.test.ts:4298`.

| Check | Result |
| --- | --- |
| Targeted same-source pair | 1 pass / 0 fail / 26 expect() / 271 filtered / 128.29ms |
| `bun x tsc --noEmit -p apps/web/tsconfig.json` | empty stdout and stderr, exit 0 |
| Full suite | 4082 pass / 0 fail / 328001 expect() / 255 files / 160.62s, exit 0 |

The suite gained one test and 26 expects from the prior 4081 / 327975 run.
The typecheck output contains no TypeScript error.

## Backup

Behavior commit `2c0cfa23a9f4e9d0e47c08195b90fead1832290e`. Parent
`1d84d49702d581c7585b7f427a334d4f762ebc8d`. The push target is Secure Source
Manager `origin`, branch `codex/verified-flow-directory-checkpoint`. `ls-remote`
returned that same SHA. GitLab was not pushed. `main` was not pushed. GitHub
was not probed. Cloud Run, Scheduler, Artifact Registry, Turso, D1, and
Cloudflare were unchanged.

## Still open

Accepted MATH remains 0/13. Certified fresh flow remains UNKNOWN. A
same-source-pair family `OK` is not yet proven absent from a completed
Manila-day flow. Directory packets 234 and 237 stay proposals. 236 stays
parked. No directory SQL. Migrations 0056 through 0068 were not applied. The
next gap is PUBLICATION_MANILA_DAY_SAME_SOURCE_PAIR_IS_NOT_A_FLOW. An OPEN
snapshot whose same-source pair stays `OK` is not a completed flow.
Caller-supplied `CLOSED`, 100, and 150 stay absent. Do not certify a
production daily flow.
