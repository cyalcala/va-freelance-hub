# Portfolio exposure accounting — 2026-10-10

Local slice of PUBLICATION_PORTFOLIO_EXPOSURE_ACCOUNTING. This is not production
acceptance, a MATH card, a certified daily flow, or directory enrichment.
The 25% source and 40% provider-family figures stay measurements.

## What changed

After a ledger receipt with a positive published count, the gateway reads the
unlimited and capped ledger book and appends one
`source_publication_portfolio_measurement` row. The row stores the constitution
source share and provider-family share for that book. Family is the text before
the first colon. An empty book is not recorded as a false zero.

A share above 25% or 40% does not change the publication result. A concentrated
exact-six write stays unlimited. A concentrated canary write stays capped.
Replay does not add a second row. A missing measurement table fails open and
the ledger receipt stands. This is not a per-write block.

Migration 0058 adds no `julianday('now')`. It was not applied to production
D1. No new clock, source, parameter, provider, or cadence.

## What stays unchanged

- Unknown dates and null workplace stay on their existing holds.
- A lost ledger acknowledgement still returns `POST_PERSISTENCE_FAILURE` with
  exposure `UNKNOWN` and is not rolled back.
- Unlimited exact-six publication does not use the canary reservation.
- A missing reservation table still fails closed for capped writers. Do not
  deploy the reservation gateway before migration 0057.
- The ledger book counts receipts. It is not the live public serving set and
  not a Manila-day flow.

## Evidence

Native bun:sqlite. One exact-six job is the whole book: the write stays
unlimited and the measurement is source BREACH and family BREACH, both share
1. A greenhouse family above 40% is BREACH while the top source stays OK, and
the write stays unlimited. Four diversified sources at 24 plus a 4-job
exact-six write stay OK and unlimited. A canary publish of 2 stays capped and
records BREACH. Dropping the measurement table still publishes the exact-six
job. No live D1, provider, or browser proof.

Before the gateway change, the same concentrated exact-six assertion received
a null measurement after an unlimited publish: 0 pass / 1 fail.

| Check | Result |
| --- | --- |
| Targeted portfolio tests | 5 pass / 0 fail / 57 expect() |
| `bun run typecheck` | exit 0 |
| Full suite | 4014 pass / 0 fail / 327031 expect() / 255 files / 170.73s |

## Backup

Behavior commit `ff031f7dc5322cebe8bed6420f36609fade09109`. Parent
`819dc75ec3524bb6ae051e544c66709c3383842b`. The push target is Secure Source
Manager `origin`, branch `codex/verified-flow-directory-checkpoint`. GitLab
was not pushed. `main` was not pushed. GitHub was not probed. Cloud Run,
Scheduler, Artifact Registry, Turso, D1, and Cloudflare were unchanged.

## Still open

Accepted MATH remains 0/13. MATH-08 is not accepted: recording a breach is not
an integrated limit. Certified fresh flow remains UNKNOWN. Directory packets
234 and 237 stay proposals. 236 stays parked. No directory SQL. Migrations
0056, 0057, and 0058 were not applied. The next gap is
PUBLICATION_SERVING_PORTFOLIO_EXPOSURE. Measure the live public serving book
with the same ceilings. Do not turn 25% or 40% into a per-write block.
