# Manila-day latest open snapshot — 2026-10-10

Local slice of PUBLICATION_MANILA_DAY_SNAPSHOT_LATEST. This is not production
acceptance, a MATH card, a certified daily flow, or directory enrichment.

## What changed

`latestManilaOpenSnapshot` reads the newest OPEN row for one Manila date. Equal
instants use the higher id. Rows for that date are not summed, and a later
row for another date does not replace this date. The publication writer is
unchanged and does not block. No migration was added. Migration 0063 stays
unapplied. An open snapshot is not a closed day and must not be compared with
the 100 floor as a completed day.

## What stays unchanged

- Unknown dates and null workplace stay on their existing holds.
- A lost ledger acknowledgement still returns `POST_PERSISTENCE_FAILURE` with
  exposure `UNKNOWN` and is not rolled back.
- Unlimited exact-six publication does not use the canary reservation.
- A missing reservation table still fails closed for capped writers. Do not
  deploy the reservation gateway before migration 0057.
- A withdrawn id stays in the receipt count and leaves the still-public count.
- The stored day state remains OPEN. The writer still cannot record CLOSED.

## Evidence

Native bun:sqlite. Three exact-six publishes stay unlimited. The same Manila
date has snapshot receipt counts 1, 2, and 3. Their sum is 6. After the first
two jobs are withdrawn, the still-public counts are 1, 2, and 1. Their sum is
4 and their maximum is 2. The latest row's receipt count is 3, matching an
independent ledger walk, and its still-public count is 1. A later snapshot for
another Manila date, with both counts at 9, is not selected. No live D1,
provider, or browser proof.

Before the reader existed, that test failed to load: 0 pass / 1 fail / 1
error, missing export `latestManilaOpenSnapshot`.

| Check | Result |
| --- | --- |
| Targeted latest-snapshot test | 1 pass / 0 fail / 20 expect() / 218 filtered / 335ms |
| `bun run typecheck` | exit 0 |
| Full suite | 4029 pass / 0 fail / 327174 expect() / 255 files / 153.39s |

The suite gained one test and 20 expects from the prior 4028 / 327154 run.
The typecheck log wraps `bunx tsc --noEmit -p apps/web/tsconfig.json` and
contains no TypeScript error.

## Backup

Behavior commit `c2aa5031f5d0bdd63c4afc5abb85ea5dc1aa4230`. Parent
`cb5a523c140fa62e80d4650d8a2f6451c9c99e8a`. The push target is Secure Source
Manager `origin`, branch `codex/verified-flow-directory-checkpoint`. `ls-remote`
returned that same SHA. GitLab was not pushed. `main` was not pushed. GitHub
was not probed. Cloud Run, Scheduler, Artifact Registry, Turso, D1, and
Cloudflare were unchanged.

## Still open

Accepted MATH remains 0/13. Certified fresh flow remains UNKNOWN. Status
agreement does not prove the ledger book total equals the serving book total.
Directory packets 234 and 237 stay proposals. 236 stays parked. No directory
SQL. Migrations 0056 through 0063 were not applied. The next gap is
PUBLICATION_PORTFOLIO_BOOK_TOTAL_DIVERGENCE. Record the two book totals and
whether they differ. Do not treat status agreement as equal totals, and do
not certify a production daily flow.
