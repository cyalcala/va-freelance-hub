# An open count is not a completed flow — 2026-10-10

Local slice of PUBLICATION_MANILA_DAY_OPEN_COUNT_IS_NOT_A_FLOW. This is not
production acceptance, a MATH card, a certified daily flow, or directory
enrichment.

## What changed

`completedManilaDayFlowCount` returns null for an OPEN snapshot even when the
reportable id count is a positive number. It also returns null for a
caller-supplied CLOSED state. This reader has no closed-day evidence, so a
forged state does not create a completed flow. The publication writer does
not call this reader. No migration was added. No new clock, source,
parameter, provider, or cadence. This does not claim MATH-08.

## What stays unchanged

- Unknown dates and null workplace stay on their existing holds.
- A lost ledger acknowledgement still returns `POST_PERSISTENCE_FAILURE` with
  exposure `UNKNOWN` and is not rolled back.
- Unlimited exact-six publication does not use the canary reservation.
- A missing reservation table still fails closed for capped writers. Do not
  deploy the reservation gateway before migration 0057.
- An unknown id pair still reports null, not zero.
- A known open pair still reports its first-publish id length.
- The stored snapshot state remains OPEN. No CLOSED row is written.

## Evidence

Native bun:sqlite. One We Work Remotely publish stays unlimited. The latest
pair is known and the reportable id count is 1. The snapshot day state is
OPEN, and the table contains no CLOSED row. The completed-day count is null,
not 1 and not 0. Passing CLOSED with that same count is also null. No live
D1, provider, or browser proof.

Before the reader existed, the reportable count was already 1 and the
snapshot was already OPEN, and `completedManilaDayFlowCount` was undefined:
0 pass / 1 fail / 6 expect(). The failing assertion was
`expect(typeof completedManilaDayFlowCount).toBe("function")` at
`packages/scraper/publication-gateway.integration.test.ts:2742`.

| Check | Result |
| --- | --- |
| Targeted open-flow test | 1 pass / 0 fail / 10 expect() / 239 filtered / 437.00ms |
| `bun run typecheck` | exit 0 |
| Full suite | 4050 pass / 0 fail / 327367 expect() / 255 files / 137.34s |

The suite gained one test and 10 expects from the prior 4049 / 327357 run.
The typecheck log wraps `bunx tsc --noEmit -p apps/web/tsconfig.json` and
contains no TypeScript error.

## Backup

Behavior commit `4f07235841bc10e9df0bf02b7c8ceda726b5d7b5`. Parent
`4d82e1649ff39c9bd869d2cc0abe3e8355dcf888`. The push target is Secure Source
Manager `origin`, branch `codex/verified-flow-directory-checkpoint`. `ls-remote`
returned that same SHA. GitLab was not pushed. `main` was not pushed. GitHub
was not probed. Cloud Run, Scheduler, Artifact Registry, Turso, D1, and
Cloudflare were unchanged.

## Still open

Accepted MATH remains 0/13. Certified fresh flow remains UNKNOWN. A known id
list can still disagree with the snapshot's first-publish count. Directory
packets 234 and 237 stay proposals. 236 stays parked. No directory SQL.
Migrations 0056 through 0068 were not applied. The next gap is
PUBLICATION_MANILA_DAY_COUNT_ID_AGREEMENT. When the latest snapshot's
first-publish count disagrees with the known id length, the reportable count
stays absent. Do not prefer either number, and do not certify a production
daily flow.
