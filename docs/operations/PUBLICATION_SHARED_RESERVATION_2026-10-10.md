# Shared canary reservation — 2026-10-10

Local slice of PUBLICATION_SHARED_RESERVATION. This is not production
acceptance, a MATH card, a certified daily flow, or directory enrichment.
Provider and global exposure limits stay portfolio measurements.

## What changed

A capped proposal inserts one `source_publication_reservation` row before
`request.persist()`. The insert trigger rejects the row when ledger receipts
plus outstanding reservations for that source and tick would exceed the live
canary cap. The second writer is blocked and does not persist.

The same retry key keeps its hold. A different retry is blocked while that
hold has no ledger receipt. After the ledger receipt exists, the reservation
is left in place and is no longer added on top of `published_count`.

Unlimited exact-six publication does not insert a reservation. The 25% source
and 40% provider-family figures are not a per-write gate.

Migration 0057 adds no `julianday('now')`. It was not applied to production
D1. A missing reservation table fails closed for capped writers, so this
gateway must not be deployed ahead of that migration. No new clock, source,
parameter, provider, or cadence.

## What stays unchanged

- Unknown dates and null workplace stay on their existing holds.
- A lost ledger acknowledgement still returns `POST_PERSISTENCE_FAILURE` with
  exposure `UNKNOWN` and is not rolled back.
- The fixture canary row is inserted after dropping only the initial-state
  trigger. That row is not an admission.

## Evidence

Native bun:sqlite, one database, statement interleaving. Two capped proposals
of 2 against cap 2: the overlapping writer persists nothing and the first
writer publishes 2. A persist failure keeps the reservation of 2 and blocks a
different retry. No live D1, provider, or browser proof.

| Check | Result |
| --- | --- |
| `bun run typecheck` | exit 0 |
| Full suite | 4009 pass / 0 fail / 326974 expect() / 255 files / 153.00s |

## Backup

Behavior commit `7732842eb032e88d8f6b2c8ed1d8b4ceb29ebc6b`. Parent
`568eaac8569eb4e99bc4262749ff68e22f2a4e4c`. The push target is Secure Source
Manager `origin`, branch `codex/verified-flow-directory-checkpoint`. GitLab
was not pushed. `main` was not pushed. GitHub was not probed. Cloud Run,
Scheduler, Artifact Registry, Turso, D1, and Cloudflare were unchanged.

## Still open

Accepted MATH remains 0/13. Certified fresh flow remains UNKNOWN. Directory
packets 234 and 237 stay proposals. 236 stays parked. No directory SQL. The
next gap is PUBLICATION_PORTFOLIO_EXPOSURE_ACCOUNTING. Keep the 25% and 40%
figures as measurements. Do not turn them into a per-write block.
