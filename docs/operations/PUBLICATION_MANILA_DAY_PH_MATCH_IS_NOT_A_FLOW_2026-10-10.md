# PH-matched count is not a completed flow — 2026-10-10

Local slice of PUBLICATION_MANILA_DAY_PH_MATCH_IS_NOT_A_FLOW. This is not
production acceptance, a MATH card, a certified daily flow, or directory
enrichment.

## What changed

`phMatchedManilaDayFlowCount` returns null for an OPEN snapshot whose
PH-matched still-public count is already positive. A caller-supplied CLOSED
state returns null. Caller-supplied 100 and 150 on OPEN return null. The
reader does not return the matched count and does not return 0. The
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
- An onsite serving match stays absent.
- A stale or unknown original posting stays absent.
- An unresolvable outbound apply URL stays absent.
- An ineligible row stays absent from the PH-matched count.
- A positive ledger-matched count on an OPEN snapshot is still not a
  completed flow.
- A positive serving-matched count on an OPEN snapshot is still not a
  completed flow.
- The stored snapshot state remains OPEN. No CLOSED row is written.

## Evidence

Native bun:sqlite. One We Work Remotely publish stays unlimited. The row is
in the accepted PH pair. The PH-matched still-public count is already 1 and
equals the PH id length. The snapshot `day_state` is OPEN. The table contains
no CLOSED row. `phMatchedManilaDayFlowCount` of that OPEN state and matched
count is null, not 1 and not 0. The same matched count with a caller-supplied
CLOSED state is null. Caller-supplied 100 and 150 on OPEN are null. No live
D1, provider, or browser proof.

Before the reader existed, the PH-matched count was already 1, the snapshot
was OPEN, the CLOSED count was already 0, and
`phMatchedManilaDayFlowCount` was undefined: 0 pass / 1 fail / 13 expect().
The failing assertion was
`expect(typeof phMatchedManilaDayFlowCount).toBe("function")` at
`packages/scraper/publication-gateway.integration.test.ts:3325`.

| Check | Result |
| --- | --- |
| Targeted PH-match flow fence | 1 pass / 0 fail / 19 expect() / 251 filtered / 320.00ms |
| `bun x tsc --noEmit -p apps/web/tsconfig.json` | empty stdout and stderr, exit 0 |
| Full suite | 4062 pass / 0 fail / 327620 expect() / 255 files / 140.19s, exit 0 |

The suite gained one test and 19 expects from the prior 4061 / 327601 run.
The typecheck output contains no TypeScript error.

## Backup

Behavior commit `734c0d477761cae703de5454a97436a3e01f41ee`. Parent
`1e4075c35c67803bdc5353e07caaacd879d8028e`. The push target is Secure Source
Manager `origin`, branch `codex/verified-flow-directory-checkpoint`. `ls-remote`
returned that same SHA. GitLab was not pushed. `main` was not pushed. GitHub
was not probed. Cloud Run, Scheduler, Artifact Registry, Turso, D1, and
Cloudflare were unchanged.

## Still open

Accepted MATH remains 0/13. Certified fresh flow remains UNKNOWN. Two
PH-matched still-public ids can still canonicalize to one source URL. The
case-sensitive `source_url` uniqueness does not fold the host.
`canonicalizeSourceUrl` is the shipped identity function and fails open when
it cannot parse. Directory packets 234 and 237 stay proposals. 236 stays
parked. No directory SQL. Migrations 0056 through 0068 were not applied. The
next gap is
PUBLICATION_MANILA_DAY_STILL_PUBLIC_IDS_MUST_HAVE_DISTINCT_CANONICAL_URLS.
When two still-public ids share one canonical source URL, the count stays
absent. Do not prefer the raw id length, do not collapse the pair to 1, and
do not certify a production daily flow.
