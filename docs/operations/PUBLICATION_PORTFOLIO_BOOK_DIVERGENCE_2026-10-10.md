# Portfolio book divergence — 2026-10-10

Local slice of PUBLICATION_PORTFOLIO_BOOK_DIVERGENCE. This is not production
acceptance, a MATH card, a certified daily flow, or directory enrichment.
The 25% source and 40% provider-family figures stay measurements.

## What changed

After a positive publish has recorded both the ledger book and the live
serving book, the gateway appends one
`source_publication_portfolio_divergence` row. The row stores the two source
statuses, the two provider-family statuses, and whether each pair matches.
`source_status_agrees` is 1 only when those source statuses are equal. It does
not mean the books contain the same rows or the same totals.

A ledger BREACH beside a serving OK still publishes. A pair of BREACH statuses
is agreement. Replay returns before the measurements, so it does not add a
second row. A missing divergence table fails open: the publication and both
exposure measurements stand. This is not a per-write block.

Migration 0060 adds no `julianday('now')`. It was not applied to production
D1. No new clock, source, parameter, provider, or cadence.

## What stays unchanged

- Unknown dates and null workplace stay on their existing holds.
- A lost ledger acknowledgement still returns `POST_PERSISTENCE_FAILURE` with
  exposure `UNKNOWN` and is not rolled back.
- Unlimited exact-six publication does not use the canary reservation.
- A missing reservation table still fails closed for capped writers. Do not
  deploy the reservation gateway before migration 0057.
- A missing ledger or serving measurement table still fails open.
- Status agreement does not prove equal book totals. Neither book is a
  Manila-day flow.

## Evidence

Native bun:sqlite. Historical ledger receipts put `we-work-remotely` at 96.
One inactive `we-work-remotely` row and a diversified public book are already
present. A new exact-six publish stays unlimited. The ledger source status is
BREACH and the serving source status is OK. The divergence row stores that
pair and `source_status_agrees` 0. One exact-six job that is the whole of
both books records BREACH for both and `source_status_agrees` 1. Replaying
that retry leaves a single divergence row. Dropping the divergence table
still publishes and still writes both measurements. No live D1, provider, or
browser proof.

Before the gateway change, the disagreement assertion received a null
divergence row after the unlimited publish, the ledger BREACH, and the
serving OK: 0 pass / 1 fail / 14 expect() calls.

| Check | Result |
| --- | --- |
| Targeted divergence tests | 3 pass / 0 fail / 42 expect() / 6.14s |
| `bun run typecheck` | exit 0 |
| Full suite | 4019 pass / 0 fail / 327102 expect() / 255 files / 136.62s |

## Backup

Behavior commit `b118eae1ca49e5c678830693c92a321de4473506`. Parent
`24e903616ed6f7e393189f287baa6b6027c83393`. The push target is Secure Source
Manager `origin`, branch `codex/verified-flow-directory-checkpoint`. `ls-remote`
returned that same SHA. GitLab was not pushed. `main` was not pushed. GitHub
was not probed. Cloud Run, Scheduler, Artifact Registry, Turso, D1, and
Cloudflare were unchanged.

## Still open

Accepted MATH remains 0/13. MATH-08 is not accepted: recording a breach, or
recording that two statuses differ, is not an integrated limit. Certified
fresh flow remains UNKNOWN. Status agreement does not prove the ledger total
equals the serving total. Directory packets 234 and 237 stay proposals. 236
stays parked. No directory SQL. Migrations 0056, 0057, 0058, 0059, and 0060
were not applied. The next gap is PUBLICATION_MANILA_DAY_FIRST_PUBLISH_ACCOUNTING.
Count distinct opportunity ids whose first positive receipt falls on one
Manila day. A replay or a second receipt of the same id does not increment
that count. Do not certify a production daily flow, and do not turn 25% or
40% into a per-write block.
