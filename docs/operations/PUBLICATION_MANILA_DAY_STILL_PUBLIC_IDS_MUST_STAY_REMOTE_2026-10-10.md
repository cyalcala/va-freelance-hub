# Still-public ids must stay remote — 2026-10-10

Local slice of PUBLICATION_MANILA_DAY_STILL_PUBLIC_IDS_MUST_STAY_REMOTE. This
is not production acceptance, a MATH card, a certified daily flow, or
directory enrichment.

## What changed

`remoteMatchedManilaStillPublicCount` returns the shared number only when
the still-public ids match the active PH serving rows and those same ids are
remote. A serving match that remains after `location_type` becomes onsite
returns null. The reader does not prefer the active PH length. The
publication writer does not call this reader. No migration was added. No new
clock, source, parameter, provider, or cadence. This does not claim MATH-08.

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
- Still-public ids that differ from the serving rows stay absent.
- A positive ledger-matched count on an OPEN snapshot is still not a
  completed flow.
- A positive serving-matched count on an OPEN snapshot is still not a
  completed flow.
- The stored snapshot state remains OPEN. No CLOSED row is written.

## Evidence

Native bun:sqlite. One We Work Remotely publish stays unlimited. The row is
`location_type` remote, and the serving-matched still-public count is 1. The
row is then updated to onsite. The active PH serving ids are still that job,
so the serving-matched count remains 1. The remote id list is empty. The
remote-matched count is null, not 1 and not 0. The same snapshot with the
remote id list captured before that update still returns the shared length.
The table contains no CLOSED row. No live D1, provider, or browser proof.
Hybrid was not executed in this test.

Before the reader existed, the job was already onsite, the active PH serving
match was already 1, the remote id list was already empty, the CLOSED count
was already 0, and `remoteMatchedManilaStillPublicCount` was undefined: 0
pass / 1 fail / 14 expect(). The failing assertion was
`expect(typeof remoteMatchedManilaStillPublicCount).toBe("function")` at
`packages/scraper/publication-gateway.integration.test.ts:3148`.

| Check | Result |
| --- | --- |
| Targeted remote still-public test | 1 pass / 0 fail / 18 expect() / 247 filtered / 292.00ms |
| `bun x tsc --noEmit -p apps/web/tsconfig.json` | empty stdout and stderr, exit 0 |
| Full suite | 4058 pass / 0 fail / 327541 expect() / 255 files / 153.09s, exit 0 |

The suite gained one test and 18 expects from the prior 4057 / 327523 run.
The typecheck output contains no TypeScript error.

## Backup

Behavior commit `f610369ddd0058d4b905feaa60e3ff342195a52b`. Parent
`31b2161ae5f9ca3d07b464cdd587536d92595d0f`. The push target is Secure Source
Manager `origin`, branch `codex/verified-flow-directory-checkpoint`. `ls-remote`
returned that same SHA. GitLab was not pushed. `main` was not pushed. GitHub
was not probed. Cloud Run, Scheduler, Artifact Registry, Turso, D1, and
Cloudflare were unchanged.

## Still open

Accepted MATH remains 0/13. Certified fresh flow remains UNKNOWN. A remote
serving-matched id can sit outside the inclusive 30-day original posting
window. Directory packets 234 and 237 stay proposals. 236 stays parked. No
directory SQL. Migrations 0056 through 0068 were not applied. The next gap is
PUBLICATION_MANILA_DAY_STILL_PUBLIC_IDS_MUST_STAY_FRESH. When a remote
serving-matched id is outside that window, or its original posting time is
unknown, the still-public count stays absent. Do not prefer the remote
length, and do not certify a production daily flow.
