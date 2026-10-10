# Source-share OK is not a family pass — 2026-10-10

Local slice of PUBLICATION_MANILA_DAY_SOURCE_OK_IS_NOT_A_FAMILY_PASS. This
is not production acceptance, a MATH card, a certified daily flow, or
directory enrichment.

## What changed

`remoteMatchedManilaFamilyStatus` returns `BREACH` when two colon-prefixed
ids in one provider family each sit at the 25% source ceiling. The same
counts on the two unprefixed Jobicy feeds stay `OK`, because those ids do
not fold into one family. An empty book with no positive matched count stays
`UNKNOWN`. The unlimited We Work Remotely publish already succeeded before
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
- A one-source remote-matched count remains a source-share breach, not a
  portfolio pass.
- A positive remote-matched count on an OPEN snapshot is still not a
  completed flow.
- The stored snapshot state remains OPEN. No CLOSED row is written.

## Evidence

Native bun:sqlite. One We Work Remotely publish stays unlimited. Four equal
counts on `jobicy:admin`, `jobicy:support`, `we-work-remotely`, and
`remotive` have source status `OK` and top share 0.25. Their family status
is `BREACH`, top id `jobicy`, top share 0.5, not `OK`. The same shape with
`jobicy-admin-support-apac` and `jobicy-supporting-apac` has family status
`OK`, and the top family id is not `jobicy`. The table contains no CLOSED
row. `remoteMatchedManilaFamilyStatus` of the folded book is `BREACH`, not
`OK`. The unprefixed book is `OK`. A null matched count with an empty row
list is `UNKNOWN`. No live D1, provider, or browser proof.

Before the reader existed, the publish was already unlimited, the folded
source report was already `OK`, the folded family report was already
`BREACH`, the unprefixed family report was already `OK`, the CLOSED count
was already 0, and `remoteMatchedManilaFamilyStatus` was undefined: 0 pass /
1 fail / 11 expect(). The failing assertion was
`expect(typeof remoteMatchedManilaFamilyStatus).toBe("function")` at
`packages/scraper/publication-gateway.integration.test.ts:3824`.

| Check | Result |
| --- | --- |
| Targeted family-share fence | 1 pass / 0 fail / 15 expect() / 262 filtered / 371.00ms |
| `bun x tsc --noEmit -p apps/web/tsconfig.json` | empty stdout and stderr, exit 0 |
| Full suite | 4073 pass / 0 fail / 327816 expect() / 255 files / 159.95s, exit 0 |

The suite gained one test and 15 expects from the prior 4072 / 327801 run.
The typecheck output contains no TypeScript error.

## Backup

Behavior commit `df01e2ee7c2ec23e2d0f7da24bd8e0ea6cb1a66d`. Parent
`3054ae57d39beabf4d78699c4e088fc1effb1209`. The push target is Secure Source
Manager `origin`, branch `codex/verified-flow-directory-checkpoint`. `ls-remote`
returned that same SHA. GitLab was not pushed. `main` was not pushed. GitHub
was not probed. Cloud Run, Scheduler, Artifact Registry, Turso, D1, and
Cloudflare were unchanged.

## Still open

Accepted MATH remains 0/13. Certified fresh flow remains UNKNOWN. A family
breach on an OPEN snapshot is not yet fenced out of a completed flow.
Directory packets 234 and 237 stay proposals. 236 stays parked. No directory
SQL. Migrations 0056 through 0068 were not applied. The next gap is
PUBLICATION_MANILA_DAY_FAMILY_BREACH_IS_NOT_A_FLOW. A family breach stays
absent from a completed flow. Do not return that status as a daily count, and
do not certify a production daily flow.
