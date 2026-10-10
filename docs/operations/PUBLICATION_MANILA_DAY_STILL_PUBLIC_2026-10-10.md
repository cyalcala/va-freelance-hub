# Manila-day still-public count — 2026-10-10

Local slice of PUBLICATION_MANILA_DAY_STILL_PUBLIC. This is not production
acceptance, a MATH card, a certified daily flow, or directory enrichment.

## What changed

After the Manila-day receipt count, the gateway records how many of those ids
are still active and Philippines-eligible. The row is
`source_publication_manila_still_public`. A withdrawn id stays in the receipt
count and leaves the still-public count. Null workplace stays eligible for
this count, the same way it stays in the serving book. The still-public count
cannot exceed the receipt count.

A missing table fails open: the publication and the receipt-count row stand.
This does not block a writer. The snapshot is taken during an open Manila day.
It is not a closed-day total and not a certified production flow.

Migration 0062 adds no `julianday('now')`. It was not applied to production
D1. No new clock, source, parameter, provider, or cadence.

## What stays unchanged

- Unknown dates and null workplace stay on their existing holds.
- A lost ledger acknowledgement still returns `POST_PERSISTENCE_FAILURE` with
  exposure `UNKNOWN` and is not rolled back.
- Unlimited exact-six publication does not use the canary reservation.
- A missing reservation table still fails closed for capped writers. Do not
  deploy the reservation gateway before migration 0057.
- Empty id lists, replays, repeated ids, and the previous Manila day stay out
  of the receipt count.

## Evidence

Native bun:sqlite. One id is published and then deactivated. A second source
publishes a different id. The receipt count is 2. The still-public count is 1.
The second write stays unlimited. Two ids that both remain active have equal
receipt and still-public counts. Dropping the still-public table still
publishes and still writes the receipt count. No live D1, provider, or
browser proof.

Before the gateway change, the withdrawn-id assertion had receipt count 2 and
a null still-public row: 0 pass / 1 fail.

| Check | Result |
| --- | --- |
| Targeted still-public and Manila-day tests | 6 pass / 0 fail / 36 expect() / 6.35s |
| `bun run typecheck` | exit 0 |
| Full suite | 4026 pass / 0 fail / 327142 expect() / 255 files / 137.46s |

## Backup

Behavior commit `6920ac08d5e9cf7f5f18d1a2e6db8886dbf66a69`. Parent
`18025b7bbef0136de6b55923affe23e0e7e28a52`. The push target is Secure Source
Manager `origin`, branch `codex/verified-flow-directory-checkpoint`. `ls-remote`
returned that same SHA. GitLab was not pushed. `main` was not pushed. GitHub
was not probed. Cloud Run, Scheduler, Artifact Registry, Turso, D1, and
Cloudflare were unchanged.

## Still open

Accepted MATH remains 0/13. Certified fresh flow remains UNKNOWN. These counts
are open-day snapshots. They do not say the Manila day has closed, and they
must not be read as a completed day against the 100 floor. Status agreement
does not prove equal book totals. Directory packets 234 and 237 stay
proposals. 236 stays parked. No directory SQL. Migrations 0056 through 0062
were not applied. The next gap is PUBLICATION_MANILA_DAY_OPEN_SNAPSHOT.
Mark the stored counts as an open Manila day. Do not treat them as a closed
day, and do not certify a production daily flow.
