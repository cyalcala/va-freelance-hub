# Still-public count and id agreement — 2026-10-10

Local slice of PUBLICATION_MANILA_DAY_STILL_PUBLIC_COUNT_ID_AGREEMENT. This
is not production acceptance, a MATH card, a certified daily flow, or
directory enrichment.

## What changed

`agreedManilaStillPublicCount` returns the shared number only when the
snapshot still-public count and the known still-public id length are the same
safe integer. A disagreement returns null. An unknown pair returns null. A
repeated still-public id returns null. The reader does not prefer either
number. The publication writer does not call this reader. No migration was
added. No new clock, source, parameter, provider, or cadence. This does not
claim MATH-08.

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
- An open count is still not a completed Manila-day flow.
- The stored snapshot state remains OPEN. No CLOSED row is written.

## Evidence

Native bun:sqlite. One We Work Remotely publish stays unlimited. That
snapshot's still-public count equals its known still-public id length, and
the agreed still-public count is that shared number. A later OPEN snapshot
records `still_public_count` 0 with still-public ids naming the published
job. Those two numbers disagree. The agreed still-public count is null, not
0 and not the id length. The earlier agreeing snapshot still returns its
shared number. The table contains no CLOSED row. No live D1, provider, or
browser proof.

Before the reader existed, the still-public count was already 0 and the
known still-public id length was already different, and
`agreedManilaStillPublicCount` was undefined: 0 pass / 1 fail / 17 expect().
The failing assertion was
`expect(typeof agreedManilaStillPublicCount).toBe("function")` at
`packages/scraper/publication-gateway.integration.test.ts:2970`.

| Check | Result |
| --- | --- |
| Targeted still-public agreement test | 1 pass / 0 fail / 21 expect() / 243 filtered / 430.00ms |
| `bun x tsc --noEmit -p apps/web/tsconfig.json` | empty stdout and stderr |
| Full suite | 4054 pass / 0 fail / 327466 expect() / 255 files / 147.75s |

The suite gained one test and 21 expects from the prior 4053 / 327445 run.
The typecheck output contains no TypeScript error. The typecheck and suite
process exit codes were not captured from the redirected process handles; the
empty typecheck output and the runner summary are the recorded results.

## Backup

Behavior commit `eb49e6d60d0757b69ceddf38615de44ab78432ba`. Parent
`fa7c0bfc93a999d2ea9308e9bd076d05b2f72c41`. The push target is Secure Source
Manager `origin`, branch `codex/verified-flow-directory-checkpoint`. `ls-remote`
returned that same SHA. GitLab was not pushed. `main` was not pushed. GitHub
was not probed. Cloud Run, Scheduler, Artifact Registry, Turso, D1, and
Cloudflare were unchanged.

## Still open

Accepted MATH remains 0/13. Certified fresh flow remains UNKNOWN. A positive
ledger-matched count is still an open snapshot. Directory packets 234 and 237
stay proposals. 236 stays parked. No directory SQL. Migrations 0056 through
0068 were not applied. The next gap is
PUBLICATION_MANILA_DAY_LEDGER_MATCH_IS_NOT_A_FLOW. A ledger-matched count is
not a completed Manila-day flow while the snapshot is OPEN. A caller-supplied
CLOSED state does not create one. Do not compare that count with the 100
floor, and do not certify a production daily flow.
