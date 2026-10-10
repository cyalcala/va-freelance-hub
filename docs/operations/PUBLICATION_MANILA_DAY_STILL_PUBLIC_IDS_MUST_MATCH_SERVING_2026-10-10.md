# Still-public ids must match serving — 2026-10-10

Local slice of PUBLICATION_MANILA_DAY_STILL_PUBLIC_IDS_MUST_MATCH_SERVING.
This is not production acceptance, a MATH card, a certified daily flow, or
directory enrichment.

## What changed

`servingMatchedManilaStillPublicCount` returns the shared number only when
the still-public count agrees with the known still-public id length and those
ids are the serving rows that remain public. A list that agrees internally
and differs from serving returns null. The reader does not prefer the
snapshot length or the serving length. The publication writer does not call
this reader. No migration was added. No new clock, source, parameter,
provider, or cadence. This does not claim MATH-08.

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
- A positive ledger-matched count on an OPEN snapshot is still not a
  completed flow.
- The stored snapshot state remains OPEN. No CLOSED row is written.

## Evidence

Native bun:sqlite. One We Work Remotely publish stays unlimited. The serving
rows that remain public are the published job. That snapshot's still-public
ids equal those serving rows, and the agreed still-public count is that
shared length. A later OPEN snapshot records `still_public_count` 0 with an
empty still-public id list. Those two numbers agree, so the agreed
still-public count is 0. The published job is still public, so the serving
length is 1. The serving-matched count for the later snapshot is null, not 0
and not 1. The earlier snapshot that names the serving rows still returns
that shared length. The table contains no CLOSED row. No live D1, provider,
or browser proof.

Before the reader existed, the still-public count was already 0, that count
already equalled the known id length, that count already differed from the
serving length, the CLOSED count was already 0, and
`servingMatchedManilaStillPublicCount` was undefined: 0 pass / 1 fail / 19
expect(). The failing assertion was
`expect(typeof servingMatchedManilaStillPublicCount).toBe("function")` at
`packages/scraper/publication-gateway.integration.test.ts:3063`.

| Check | Result |
| --- | --- |
| Targeted still-public serving match | 1 pass / 0 fail / 23 expect() / 245 filtered / 349.00ms |
| `bun x tsc --noEmit -p apps/web/tsconfig.json` | empty stdout and stderr, exit 0 |
| Full suite | 4056 pass / 0 fail / 327505 expect() / 255 files / 155.15s, exit 0 |

The suite gained one test and 23 expects from the prior 4055 / 327482 run.
The typecheck output contains no TypeScript error.

## Backup

Behavior commit `f339aae8f1017d228a26bac9ee0496db2fcf4d43`. Parent
`57aab3ae17d4d1e333e677fe181f809d4f5eafe3`. The push target is Secure Source
Manager `origin`, branch `codex/verified-flow-directory-checkpoint`. `ls-remote`
returned that same SHA. GitLab was not pushed. `main` was not pushed. GitHub
was not probed. Cloud Run, Scheduler, Artifact Registry, Turso, D1, and
Cloudflare were unchanged.

## Still open

Accepted MATH remains 0/13. Certified fresh flow remains UNKNOWN. A
serving-matched still-public count is still an open measurement. Directory
packets 234 and 237 stay proposals. 236 stays parked. No directory SQL.
Migrations 0056 through 0068 were not applied. The next gap is
PUBLICATION_MANILA_DAY_SERVING_MATCH_IS_NOT_A_FLOW. A serving-matched
still-public count is not a completed Manila-day flow while the snapshot is
OPEN. A caller-supplied CLOSED state does not create one. Do not compare
that count with the 100 floor, and do not certify a production daily flow.
