# Exact family ceiling stays OK — 2026-10-10

Local slice of PUBLICATION_MANILA_DAY_EXACT_FAMILY_CEILING_IS_OK.
This is not production acceptance, a MATH card, a certified daily flow, or
directory enrichment.

## What changed

`recordedOpportunityManilaFamilyStatus` returns null when a caller-supplied
source list is not the source recorded on each still-public opportunity.
When those sources match, two of five ids in one colon-prefixed family sit
on the 40% ceiling and stay `OK`. Three of five stay `BREACH`. The ceiling
is strictly greater than the share. A swapped claim of the two family
sources stays absent. An empty book stays `UNKNOWN`. The publication writer
does not call this reader. No migration was added. No new clock, source,
parameter, provider, or cadence. This does not claim MATH-08, does not
record `CLOSED`, and does not return a flow number.

## What stays unchanged

- Unknown dates and null workplace stay on their existing holds.
- A lost ledger acknowledgement still returns `POST_PERSISTENCE_FAILURE` with
  exposure `UNKNOWN` and is not rolled back.
- Unlimited exact-six publication does not use the canary reservation.
- A missing reservation table still fails closed for capped writers. Do not
  deploy the reservation gateway before migration 0057.
- A stored-source family breach on an OPEN snapshot stays out of a completed
  flow.
- The stored snapshot state remains OPEN. No CLOSED row is written.
- `snapshotSourcedManilaFamilyStatus` still accepts a caller-supplied book
  whose ids match the snapshot. That older reader is not this fence.

## Evidence

Native bun:sqlite. Five We Work Remotely publishes stay unlimited. The
snapshot source is `we-work-remotely`. The open snapshot state is `OPEN`,
its still-public count is 5, and its still-public ids are those five ids.
The table contains no CLOSED row. Every opportunity source is still
`we-work-remotely`, and that recorded book is `BREACH`. A caller-supplied
book of `jobicy:admin`, `jobicy:support`, `remotive`, `remote-ok`, and
`real-work-from-anywhere` has family share 0.4 and is `OK` on the older
snapshot-sourced reader. The recorded-source reader returns null for that
claim. After those five sources are written onto the opportunity rows, the
recorded-source reader returns `OK`, not `BREACH`. After the third id
becomes `jobicy:design`, family share is 0.6 and the reader returns
`BREACH`, not `OK`. Swapping the two Jobicy claims stays null. Empty ids
with a null count stay `UNKNOWN`. No live D1, provider, or browser proof.

Before the reader existed, the five publishes were already unlimited, the
snapshot source was already `we-work-remotely`, the day state was already
`OPEN`, the still-public count was already 5, the CLOSED count was already
0, the snapshot ids were already those five ids, the recorded book was
already `BREACH`, the caller-supplied 0.4 book was already `OK`, and
`recordedOpportunityManilaFamilyStatus` was undefined: 0 pass / 1 fail / 19
expect(). The failing assertion was
`expect(typeof recordedOpportunityManilaFamilyStatus).toBe("function")` at
`packages/scraper/publication-gateway.integration.test.ts:4138`.

| Check | Result |
| --- | --- |
| Targeted exact family ceiling | 1 pass / 0 fail / 32 expect() / 269 filtered / 91.00ms |
| `bun x tsc --noEmit -p apps/web/tsconfig.json` | empty stdout and stderr, exit 0 |
| Full suite | 4080 pass / 0 fail / 327956 expect() / 255 files / 146.07s, exit 0 |

The suite gained one test and 32 expects from the prior 4079 / 327924 run.
The typecheck output contains no TypeScript error.

## Backup

Behavior commit `7ee06c7e0ea02326c0cbb6558a644891ad0dd82d`. Parent
`0428d8dbca4b9b742c6e75ed323033c0f2a89b6e`. The push target is Secure Source
Manager `origin`, branch `codex/verified-flow-directory-checkpoint`. `ls-remote`
returned that same SHA. GitLab was not pushed. `main` was not pushed. GitHub
was not probed. Cloud Run, Scheduler, Artifact Registry, Turso, D1, and
Cloudflare were unchanged.

## Still open

Accepted MATH remains 0/13. Certified fresh flow remains UNKNOWN. An exact
family-ceiling `OK` is not yet proven absent from a completed Manila-day
flow. Directory packets 234 and 237 stay proposals. 236 stays parked. No
directory SQL. Migrations 0056 through 0068 were not applied. The next gap is
PUBLICATION_MANILA_DAY_EXACT_FAMILY_CEILING_IS_NOT_A_FLOW. An OPEN snapshot
whose recorded family share is exactly 0.4 stays out of a completed flow.
Caller-supplied `CLOSED`, 100, and 150 stay absent. Do not certify a
production daily flow.
