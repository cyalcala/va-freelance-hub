# Still-public ids must resolve an apply URL — 2026-10-10

Local slice of PUBLICATION_MANILA_DAY_STILL_PUBLIC_IDS_MUST_RESOLVE_APPLY_URL.
This is not production acceptance, a MATH card, a certified daily flow, or
directory enrichment.

## What changed

`applyMatchedManilaStillPublicCount` returns the shared number only when the
fresh-matched still-public ids have a resolvable outbound apply URL. A source
and application URL that `resolvePublicationOutboundUrl` rejects returns null.
The reader does not prefer the fresh length. The publication writer does not
call this reader. No migration was added. No new clock, source, parameter,
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
- Still-public ids that differ from the serving rows stay absent.
- An onsite serving match stays absent.
- A stale or unknown original posting stays absent.
- A positive ledger-matched count on an OPEN snapshot is still not a
  completed flow.
- A positive serving-matched count on an OPEN snapshot is still not a
  completed flow.
- The stored snapshot state remains OPEN. No CLOSED row is written.

## Evidence

Native bun:sqlite. One We Work Remotely publish stays unlimited. The outbound
URL resolves, the original posting is inside the window, and the fresh-matched
still-public count is 1. Both `source_url` and `application_url` are then set
to `http://127.0.0.1/job`. `resolvePublicationOutboundUrl` returns null. The
posting stays inside the window, and the fresh-matched count remains 1. The
apply id list is empty. The apply-matched count is null, not 1 and not 0. The
same snapshot with that id in the apply list still returns 1. The table
contains no CLOSED row. No live D1, provider, or browser proof.

Before the reader existed, the outbound URL already failed to resolve, the
fresh-matched count was already 1, the apply id list was already empty, the
CLOSED count was already 0, and `applyMatchedManilaStillPublicCount` was
undefined: 0 pass / 1 fail / 14 expect(). The failing assertion was
`expect(typeof applyMatchedManilaStillPublicCount).toBe("function")` at
`packages/scraper/publication-gateway.integration.test.ts:3244`.

| Check | Result |
| --- | --- |
| Targeted apply-URL still-public test | 1 pass / 0 fail / 18 expect() / 249 filtered / 361.00ms |
| `bun x tsc --noEmit -p apps/web/tsconfig.json` | empty stdout and stderr, exit 0 |
| Full suite | 4060 pass / 0 fail / 327583 expect() / 255 files / 152.97s, exit 0 |

The suite gained one test and 18 expects from the prior 4059 / 327565 run.
The typecheck output contains no TypeScript error.

## Backup

Behavior commit `07033654531a8bf5655f82d61c0cebac1240a319`. Parent
`fd299bcec8a80de07db75a912a2cc4e3f42335d0`. The push target is Secure Source
Manager `origin`, branch `codex/verified-flow-directory-checkpoint`. `ls-remote`
returned that same SHA. GitLab was not pushed. `main` was not pushed. GitHub
was not probed. Cloud Run, Scheduler, Artifact Registry, Turso, D1, and
Cloudflare were unchanged.

## Still open

Accepted MATH remains 0/13. Certified fresh flow remains UNKNOWN. A fresh
remote id with a resolvable apply URL can leave the accepted PH eligibility
pair and remain in the still-public set. Directory packets 234 and 237 stay
proposals. 236 stays parked. No directory SQL. Migrations 0056 through 0068
were not applied. The next gap is
PUBLICATION_MANILA_DAY_STILL_PUBLIC_IDS_MUST_STAY_PH_ELIGIBLE. When that id
leaves the accepted PH pair, the still-public count stays absent. Do not
prefer the apply-matched length, and do not certify a production daily flow.
