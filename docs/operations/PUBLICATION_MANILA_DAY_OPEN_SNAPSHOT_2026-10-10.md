# Manila-day open snapshot — 2026-10-10

Local slice of PUBLICATION_MANILA_DAY_OPEN_SNAPSHOT. This is not production
acceptance, a MATH card, a certified daily flow, or directory enrichment.

## What changed

After the receipt count and the still-public count, the gateway stores one
`source_publication_manila_open_snapshot` row. Its day state is the literal
OPEN. The table rejects every other state, so this writer cannot record a
closed Manila day. The row copies the receipt count and the still-public
count. A missing table fails open: the publication and both counts stand.

Migration 0063 adds no `julianday('now')`. It was not applied to production
D1. No new clock, source, parameter, provider, or cadence. An open snapshot
is not a completed day and must not be compared with the 100 floor as one.

## What stays unchanged

- Unknown dates and null workplace stay on their existing holds.
- A lost ledger acknowledgement still returns `POST_PERSISTENCE_FAILURE` with
  exposure `UNKNOWN` and is not rolled back.
- Unlimited exact-six publication does not use the canary reservation.
- A missing reservation table still fails closed for capped writers. Do not
  deploy the reservation gateway before migration 0057.
- A withdrawn id stays in the receipt count and leaves the still-public count.
- Empty id lists, replays, repeated ids, and the previous Manila day stay out
  of the receipt count.

## Evidence

Native bun:sqlite. One exact-six publish stays unlimited. The receipt count
and the still-public count are both 1, and the snapshot state is OPEN. No
row has state CLOSED. Dropping the snapshot table still publishes and still
writes both counts. No live D1, provider, or browser proof.

Before the gateway change, that assertion had both counts and a null snapshot
row: 0 pass / 1 fail.

| Check | Result |
| --- | --- |
| Targeted open-snapshot tests | 2 pass / 0 fail / 12 expect() / 6.31s |
| `bun run typecheck` | exit 0 |
| Full suite | 4028 pass / 0 fail / 327154 expect() / 255 files / 137.90s |

## Backup

Behavior commit `18ec13dc9c1ef35d4e86030547c607ca89cee8e7`. Parent
`7a869de0795382aa0f78faf9947dbc3a92aa74de`. The push target is Secure Source
Manager `origin`, branch `codex/verified-flow-directory-checkpoint`. `ls-remote`
returned that same SHA. GitLab was not pushed. `main` was not pushed. GitHub
was not probed. Cloud Run, Scheduler, Artifact Registry, Turso, D1, and
Cloudflare were unchanged.

## Still open

Accepted MATH remains 0/13. Certified fresh flow remains UNKNOWN. Two open
snapshots for the same Manila date must not be summed: the later row replaces
the earlier count. Status agreement does not prove equal book totals.
Directory packets 234 and 237 stay proposals. 236 stays parked. No directory
SQL. Migrations 0056 through 0063 were not applied. The next gap is
PUBLICATION_MANILA_DAY_SNAPSHOT_LATEST. Read the latest open snapshot for a
Manila date. Do not sum the rows, and do not certify a production daily flow.
