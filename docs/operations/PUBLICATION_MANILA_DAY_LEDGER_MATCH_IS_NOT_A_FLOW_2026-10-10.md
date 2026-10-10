# Ledger-matched count is not a completed flow — 2026-10-10

Local slice of PUBLICATION_MANILA_DAY_LEDGER_MATCH_IS_NOT_A_FLOW. This is
not production acceptance, a MATH card, a certified daily flow, or directory
enrichment.

## What changed

`ledgerMatchedManilaDayFlowCount` returns null for an OPEN snapshot whose
ledger-matched count is already positive. A caller-supplied CLOSED state
returns null. Caller-supplied 100 and 150 on OPEN return null. The reader
does not return the matched count and does not return 0. The publication
writer does not call this reader. No migration was added. No new clock,
source, parameter, provider, or cadence. This does not claim MATH-08.

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
- The stored snapshot state remains OPEN. No CLOSED row is written.

## Evidence

Native bun:sqlite. One We Work Remotely publish stays unlimited. The
ledger-matched count is already 1 and equals the ledger length. The snapshot
`day_state` is OPEN. The table contains no CLOSED row.
`ledgerMatchedManilaDayFlowCount` of that OPEN state and matched count is
null, not 1 and not 0. The same matched count with a caller-supplied CLOSED
state is null. Caller-supplied 100 and 150 on OPEN are null. No live D1,
provider, or browser proof.

Before the reader existed, the ledger-matched count was already 1, the
snapshot was OPEN, the CLOSED count was already 0, and
`ledgerMatchedManilaDayFlowCount` was undefined: 0 pass / 1 fail / 10
expect(). The failing assertion was
`expect(typeof ledgerMatchedManilaDayFlowCount).toBe("function")` at
`packages/scraper/publication-gateway.integration.test.ts:3006`.

| Check | Result |
| --- | --- |
| Targeted ledger-match flow fence | 1 pass / 0 fail / 16 expect() / 244 filtered / 347.00ms |
| `bun x tsc --noEmit -p apps/web/tsconfig.json` | empty stdout and stderr |
| Full suite | 4055 pass / 0 fail / 327482 expect() / 255 files / 146.93s |

The suite gained one test and 16 expects from the prior 4054 / 327466 run.
The typecheck output contains no TypeScript error. The typecheck and suite
process exit codes were not captured from the redirected process handles; the
empty typecheck output and the runner summary are the recorded results.

## Backup

Behavior commit `8beef02744b49fc9c3926a5d2d322823d8efbc76`. Parent
`6f23a4b860d56b5685029467fe1d174f82b3db7b`. The push target is Secure Source
Manager `origin`, branch `codex/verified-flow-directory-checkpoint`. `ls-remote`
returned that same SHA. GitLab was not pushed. `main` was not pushed. GitHub
was not probed. Cloud Run, Scheduler, Artifact Registry, Turso, D1, and
Cloudflare were unchanged.

## Still open

Accepted MATH remains 0/13. Certified fresh flow remains UNKNOWN. A
still-public count can agree with its known id length while those ids are
not the serving rows that remain public. Directory packets 234 and 237 stay
proposals. 236 stays parked. No directory SQL. Migrations 0056 through 0068
were not applied. The next gap is
PUBLICATION_MANILA_DAY_STILL_PUBLIC_IDS_MUST_MATCH_SERVING. When the known
still-public ids are not the serving rows that remain public, the
still-public count stays absent. Do not prefer the snapshot length or the
serving length, and do not certify a production daily flow.
