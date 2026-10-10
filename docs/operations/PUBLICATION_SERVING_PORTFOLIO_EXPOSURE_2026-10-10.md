# Serving portfolio exposure — 2026-10-10

Local slice of PUBLICATION_SERVING_PORTFOLIO_EXPOSURE. This is not production
acceptance, a MATH card, a certified daily flow, or directory enrichment.
The 25% source and 40% provider-family figures stay measurements.

## What changed

After a ledger receipt with a positive published count, the gateway still
records the ledger book, then reads the live public serving book and appends
one `source_publication_serving_measurement` row. The serving book is active
rows whose Philippines eligibility is `eligible_verified` or `eligible_likely`
and whose source id is non-empty text. Null workplace stays in that book.
The row stores the constitution source share and provider-family share.
Family is the text before the first colon. An empty serving book is not
recorded as a false zero.

A share above 25% or 40% does not change the publication result. A withdrawn
row stays in the ledger book and leaves the serving book. Replay returns
before either measurement, so it does not add a second row. A missing serving
table fails open: the publication and the ledger measurement stand. This is
not a per-write block.

Migration 0059 adds no `julianday('now')`. It was not applied to production
D1. No new clock, source, parameter, provider, or cadence.

## What stays unchanged

- Unknown dates and null workplace stay on their existing holds.
- A lost ledger acknowledgement still returns `POST_PERSISTENCE_FAILURE` with
  exposure `UNKNOWN` and is not rolled back.
- Unlimited exact-six publication does not use the canary reservation.
- A missing reservation table still fails closed for capped writers. Do not
  deploy the reservation gateway before migration 0057.
- A missing ledger measurement table still fails open.
- The serving book is current public stock. It is not a Manila-day flow.

## Evidence

Native bun:sqlite. Historical ledger receipts put `we-work-remotely` at 96.
One inactive `we-work-remotely` row and public rows for `greenhouse:a`,
`greenhouse:b`, and four other exact-six sources are already present. A new
exact-six publish stays unlimited. The ledger measurement is source BREACH.
The serving measurement matches an independent count of active
Philippines-eligible rows: both shares are OK, the top source id is
`greenhouse:a`, and the top family id is `greenhouse`. Dropping the serving
table still publishes and still writes the ledger measurement. No live D1,
provider, or browser proof.

Before the gateway change, that withdrawn-job assertion received a null
serving row after the unlimited publish and the ledger BREACH: 0 pass / 1
fail / 16 expect() calls.

| Check | Result |
| --- | --- |
| Targeted serving tests | 2 pass / 0 fail / 29 expect() / 5.79s |
| `bun run typecheck` | exit 0 |
| Full suite | 4016 pass / 0 fail / 327060 expect() / 255 files / 137.77s |

## Backup

Behavior commit `3dcb8efcca8c9b20851cf8be234a4ff12c707175`. Parent
`90eae314eb0e9649569af228a0e5e3edc009a81e`. The push target is Secure Source
Manager `origin`, branch `codex/verified-flow-directory-checkpoint`. `ls-remote`
returned that same SHA. GitLab was not pushed. `main` was not pushed. GitHub
was not probed. Cloud Run, Scheduler, Artifact Registry, Turso, D1, and
Cloudflare were unchanged.

## Still open

Accepted MATH remains 0/13. MATH-08 is not accepted: recording a breach is not
an integrated limit. Certified fresh flow remains UNKNOWN. The same publish
can record ledger BREACH and serving OK, and nothing persists that
disagreement. Directory packets 234 and 237 stay proposals. 236 stays parked.
No directory SQL. Migrations 0056, 0057, 0058, and 0059 were not applied. The
next gap is PUBLICATION_PORTFOLIO_BOOK_DIVERGENCE. Persist that disagreement.
Do not turn 25% or 40% into a per-write block.
