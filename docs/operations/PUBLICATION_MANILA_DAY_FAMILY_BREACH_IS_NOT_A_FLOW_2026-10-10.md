# Family breach is not a completed flow — 2026-10-10

Local slice of PUBLICATION_MANILA_DAY_FAMILY_BREACH_IS_NOT_A_FLOW. This
is not production acceptance, a MATH card, a certified daily flow, or
directory enrichment.

## What changed

`remoteMatchedManilaFamilyDayFlowCount` returns null for an OPEN snapshot
whose family status is `BREACH`. A caller-supplied `CLOSED` state does not
create a flow. Caller-supplied 100 and 150 stay absent. The result is not
the matched count and not 0. The unlimited We Work Remotely publish already
succeeded before that reader is called. The publication writer does not call
this reader. No migration was added. No new clock, source, parameter,
provider, or cadence. This does not claim MATH-08 and does not record
`CLOSED`.

## What stays unchanged

- Unknown dates and null workplace stay on their existing holds.
- A lost ledger acknowledgement still returns `POST_PERSISTENCE_FAILURE` with
  exposure `UNKNOWN` and is not rolled back.
- Unlimited exact-six publication does not use the canary reservation.
- A missing reservation table still fails closed for capped writers. Do not
  deploy the reservation gateway before migration 0057.
- A source-share OK book can still be a family breach. Unprefixed Jobicy
  feeds still do not fold. An empty book stays `UNKNOWN`.
- A one-source remote-matched count remains a source-share breach, not a
  portfolio pass.
- The stored snapshot state remains OPEN. No CLOSED row is written.

## Evidence

Native bun:sqlite. One We Work Remotely publish stays unlimited. Four equal
counts on `jobicy:admin`, `jobicy:support`, `we-work-remotely`, and
`remotive` have source status `OK` and top share 0.25. Their family status
is `BREACH`, not `OK`. The open snapshot state is `OPEN`. The table contains
no CLOSED row. `remoteMatchedManilaFamilyDayFlowCount` of that OPEN state,
that `BREACH` status, and matched count 4 is null, not 4 and not 0. The same
call with `CLOSED`, and the OPEN calls with 100 and 150, are null. No live
D1, provider, or browser proof.

Before the reader existed, the publish was already unlimited, the source
report was already `OK` at 0.25, the family status was already `BREACH`, the
day state was already `OPEN`, the CLOSED count was already 0, and
`remoteMatchedManilaFamilyDayFlowCount` was undefined: 0 pass / 1 fail / 9
expect(). The failing assertion was
`expect(typeof remoteMatchedManilaFamilyDayFlowCount).toBe("function")` at
`packages/scraper/publication-gateway.integration.test.ts:3861`.

| Check | Result |
| --- | --- |
| Targeted family-breach flow fence | 1 pass / 0 fail / 15 expect() / 263 filtered / 589.00ms |
| `bun x tsc --noEmit -p apps/web/tsconfig.json` | empty stdout and stderr, exit 0 |
| Full suite | 4074 pass / 0 fail / 327831 expect() / 255 files / 143.83s, exit 0 |

The suite gained one test and 15 expects from the prior 4073 / 327816 run.
The typecheck output contains no TypeScript error.

## Backup

Behavior commit `1ce99c5f46444a79cea1e50d18a7d8a88104acc2`. Parent
`4eb6b35302e71c36fc96d29c2fd24d5ab3d4d985`. The push target is Secure Source
Manager `origin`, branch `codex/verified-flow-directory-checkpoint`. `ls-remote`
returned that same SHA. GitLab was not pushed. `main` was not pushed. GitHub
was not probed. Cloud Run, Scheduler, Artifact Registry, Turso, D1, and
Cloudflare were unchanged.

## Still open

Accepted MATH remains 0/13. Certified fresh flow remains UNKNOWN. A
caller-supplied source book is not yet fenced out of the day's family status.
Directory packets 234 and 237 stay proposals. 236 stays parked. No directory
SQL. Migrations 0056 through 0068 were not applied. The next gap is
PUBLICATION_MANILA_DAY_FOREIGN_BOOK_IS_NOT_A_FAMILY_STATUS. A book that is
not the published still-public source counts stays absent. Do not treat the
folded four-row breach as the one published job's family status, and do not
certify a production daily flow.
