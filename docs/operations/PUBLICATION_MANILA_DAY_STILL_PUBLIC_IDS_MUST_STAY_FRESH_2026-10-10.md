# Still-public ids must stay fresh — 2026-10-10

Local slice of PUBLICATION_MANILA_DAY_STILL_PUBLIC_IDS_MUST_STAY_FRESH. This
is not production acceptance, a MATH card, a certified daily flow, or
directory enrichment.

## What changed

`freshMatchedManilaStillPublicCount` returns the shared number only when the
remote-matched still-public ids are inside the inclusive 30-day original
posting window. A stale posting returns null. An unknown posting returns
null. The reader does not prefer the remote length. The publication writer
does not call this reader. No migration was added. No new clock, source,
parameter, provider, or cadence. This does not claim MATH-08.

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
- An onsite serving match stays absent.
- A positive ledger-matched count on an OPEN snapshot is still not a
  completed flow.
- A positive serving-matched count on an OPEN snapshot is still not a
  completed flow.
- The stored snapshot state remains OPEN. No CLOSED row is written.

## Evidence

Native bun:sqlite. One We Work Remotely publish stays unlimited. The original
posting is inside the window, and the remote-matched still-public count is 1.
The posting is then set 31 days before the observation instant.
`assessPostingFreshness` reports STALE, the remote id list is still that job,
and the remote-matched count remains 1. The fresh id list is empty. The
posting is then set to null. `assessPostingFreshness` reports UNKNOWN, the
remote-matched count remains 1, and the fresh id list is empty. Both
fresh-matched counts are null, not 1 and not 0. The same snapshot with the
fresh id list from before those updates still returns 1. The table contains
no CLOSED row. No live D1, provider, or browser proof.

Before the reader existed, the posting was already unknown, the remote-matched
count was already 1, the fresh id list was already empty, the CLOSED count
was already 0, and `freshMatchedManilaStillPublicCount` was undefined: 0 pass
/ 1 fail / 18 expect(). The failing assertion was
`expect(typeof freshMatchedManilaStillPublicCount).toBe("function")` at
`packages/scraper/publication-gateway.integration.test.ts:3197`.

| Check | Result |
| --- | --- |
| Targeted freshness still-public test | 1 pass / 0 fail / 24 expect() / 248 filtered / 371.00ms |
| `bun x tsc --noEmit -p apps/web/tsconfig.json` | empty stdout and stderr, exit 0 |
| Full suite | 4059 pass / 0 fail / 327565 expect() / 255 files / 150.07s, exit 0 |

The suite gained one test and 24 expects from the prior 4058 / 327541 run.
The typecheck output contains no TypeScript error.

## Backup

Behavior commit `7b0549195a17c0435d6316aa9be4a31716406e1e`. Parent
`c4ec73b444a022c504d41a5c4e20edcced07983a`. The push target is Secure Source
Manager `origin`, branch `codex/verified-flow-directory-checkpoint`. `ls-remote`
returned that same SHA. GitLab was not pushed. `main` was not pushed. GitHub
was not probed. Cloud Run, Scheduler, Artifact Registry, Turso, D1, and
Cloudflare were unchanged.

## Still open

Accepted MATH remains 0/13. Certified fresh flow remains UNKNOWN. A fresh
remote id can remain in the still-public set when its outbound apply URL does
not resolve. Directory packets 234 and 237 stay proposals. 236 stays parked.
No directory SQL. Migrations 0056 through 0068 were not applied. The next gap
is PUBLICATION_MANILA_DAY_STILL_PUBLIC_IDS_MUST_RESOLVE_APPLY_URL. When a
fresh remote id has no resolvable outbound apply URL, the still-public count
stays absent. Do not prefer the fresh length, and do not certify a production
daily flow.
