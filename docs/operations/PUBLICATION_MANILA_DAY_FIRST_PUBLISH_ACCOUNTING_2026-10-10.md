# Manila-day first-publish accounting — 2026-10-10

Local slice of PUBLICATION_MANILA_DAY_FIRST_PUBLISH_ACCOUNTING. This is not
production acceptance, a MATH card, a certified daily flow, or directory
enrichment.

## What changed

After a positive ledger receipt, the gateway counts distinct opportunity ids
whose earliest positive unlimited or capped receipt falls on the Manila
calendar date of that decision. Manila is UTC+8. The count is every source in
the ledger, not one source. Empty id lists do not count. A later receipt of
the same id does not count. A receipt from the previous Manila day does not
count. Replay does not add a second row.

The row is `source_publication_manila_day`. A missing table fails open: the
publication and the exposure rows stand. This does not block a writer. It is
not the live public serving set. An id that is later withdrawn remains in
this count.

Migration 0061 adds no `julianday('now')`. It was not applied to production
D1. No new clock, source, parameter, provider, or cadence.

## What stays unchanged

- Unknown dates and null workplace stay on their existing holds.
- A lost ledger acknowledgement still returns `POST_PERSISTENCE_FAILURE` with
  exposure `UNKNOWN` and is not rolled back.
- Unlimited exact-six publication does not use the canary reservation.
- A missing reservation table still fails closed for capped writers. Do not
  deploy the reservation gateway before migration 0057.
- Ledger share, serving share, and status disagreement stay measurements.
- Status agreement does not prove equal book totals.

## Evidence

Native bun:sqlite. A historical receipt with published count 96 and an empty
id list does not inflate the day. One new exact-six id makes the independent
distinct count 1, and the stored count matches it. The write stays unlimited.
Replay leaves one row. A second receipt of that same id stays at 1. An id
whose receipt is 24 hours earlier stays out of today's count. A remotive id
and a We Work Remotely id on the same Manila day count as 2. Dropping the
table still publishes and still writes the exposure rows. No live D1,
provider, or browser proof.

Before the gateway change, the empty-count assertion received a null row
after the unlimited publish and an independent distinct count of 1: 0 pass /
1 fail / the failure was `expect(measured).not.toBeNull()`.

| Check | Result |
| --- | --- |
| Targeted Manila-day tests | 5 pass / 0 fail / 26 expect() / 6.18s |
| `bun run typecheck` | exit 0 |
| Full suite | 4024 pass / 0 fail / 327128 expect() / 255 files / 136.54s |

## Backup

Behavior commit `e0ea80ae21f5ff2613efe74904d50ed7d9dc11f3`. Parent
`7a2b1d47ac710ea69a09d1a51b468182d8fd466b`. The push target is Secure Source
Manager `origin`, branch `codex/verified-flow-directory-checkpoint`. `ls-remote`
returned that same SHA. GitLab was not pushed. `main` was not pushed. GitHub
was not probed. Cloud Run, Scheduler, Artifact Registry, Turso, D1, and
Cloudflare were unchanged.

## Still open

Accepted MATH remains 0/13. Certified fresh flow remains UNKNOWN. This count
is receipt identity, not the number of those ids still public. Status
agreement does not prove equal book totals. Directory packets 234 and 237
stay proposals. 236 stays parked. No directory SQL. Migrations 0056 through
0061 were not applied. The next gap is PUBLICATION_MANILA_DAY_STILL_PUBLIC.
Record how many of the day's first-publish ids are still active and
Philippines-eligible. Do not treat the receipt count as the live board, and
do not certify a production daily flow.
