# Stored-source family breach is not a flow — 2026-10-10

Local slice of PUBLICATION_MANILA_DAY_STORED_FAMILY_BREACH_IS_NOT_A_FLOW.
This is not production acceptance, a MATH card, a certified daily flow, or
directory enrichment.

## What changed

`storedPublishingSourceManilaDayFlowCount` returns null for an OPEN snapshot
whose stored publishing source is a family breach. A caller-supplied `CLOSED`
state does not create a flow. Caller-supplied 100 and 150 stay absent. The
result is not the matched count and not 0. The unlimited We Work Remotely
publish already succeeded, and the stored-source family status was already
`BREACH`, before that reader is called. The publication writer does not call
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
- A claimed publishing source that is not the snapshot's stored source stays
  absent.
- The stored snapshot state remains OPEN. No CLOSED row is written.

## Evidence

Native bun:sqlite. One We Work Remotely publish stays unlimited. The snapshot
source is `we-work-remotely`. The open snapshot state is `OPEN`, its
still-public count is 1, and its still-public ids are that one id. The table
contains no CLOSED row. `storedPublishingSourceManilaFamilyStatus` of that
stored source is `BREACH`, not `OK`. `storedPublishingSourceManilaDayFlowCount`
of that OPEN state, that `BREACH` status, and matched count 1 is null, not 1
and not 0. The same call with `CLOSED`, and the OPEN calls with 100 and 150,
are null. No live D1, provider, or browser proof.

Before the reader existed, the publish was already unlimited, the snapshot
source was already `we-work-remotely`, the day state was already `OPEN`, the
still-public count was already 1, the CLOSED count was already 0, the
snapshot ids were already that one id, the stored-source family status was
already `BREACH`, and `storedPublishingSourceManilaDayFlowCount` was
undefined: 0 pass / 1 fail / 12 expect(). The failing assertion was
`expect(typeof storedPublishingSourceManilaDayFlowCount).toBe("function")` at
`packages/scraper/publication-gateway.integration.test.ts:4082`.

| Check | Result |
| --- | --- |
| Targeted stored-source flow fence | 1 pass / 0 fail / 18 expect() / 268 filtered / 349.00ms |
| `bun x tsc --noEmit -p apps/web/tsconfig.json` | empty stdout and stderr, exit 0 |
| Full suite | 4079 pass / 0 fail / 327924 expect() / 255 files / 138.91s, exit 0 |

The suite gained one test and 18 expects from the prior 4078 / 327906 run.
The typecheck output contains no TypeScript error.

## Backup

Behavior commit `42f61413933dfeb8c10f66c40af2695c69d958b4`. Parent
`f5664ac323f926c8ff36ce9d0d8de4f18d652762`. The push target is Secure Source
Manager `origin`, branch `codex/verified-flow-directory-checkpoint`. `ls-remote`
returned that same SHA. GitLab was not pushed. `main` was not pushed. GitHub
was not probed. Cloud Run, Scheduler, Artifact Registry, Turso, D1, and
Cloudflare were unchanged.

## Still open

Accepted MATH remains 0/13. Certified fresh flow remains UNKNOWN. A
snapshot-sourced family share of exactly 0.4 is not yet proven OK on this
reader. Directory packets 234 and 237 stay proposals. 236 stays parked. No
directory SQL. Migrations 0056 through 0068 were not applied. The next gap is
PUBLICATION_MANILA_DAY_EXACT_FAMILY_CEILING_IS_OK. Two of five still-public
ids in one family sit on the 40% ceiling and stay `OK`. Three of five stay
`BREACH`. Do not treat the ceiling as a breach, and do not certify a
production daily flow.
