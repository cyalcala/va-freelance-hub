# Lost acknowledgement record — 2026-10-10

Local slice of PUBLICATION_LOST_ACKNOWLEDGEMENT_RECORD. This is not production
acceptance, a MATH card, a certified daily flow, or directory enrichment.

## What changed

A valid owned publication whose ledger insert fails still returns the existing
`POST_PERSISTENCE_FAILURE` result with exposure `UNKNOWN`. The physical row is
not rolled back. The gateway now also tries to append one
`publication_outcome_uncertainty` row naming that source, tick, retry key, and
the written ids. The reason is fixed as `ledger-acknowledgement-unconfirmed`.
A duplicate or failed marker insert is swallowed, and the returned result is
unchanged.

`withdrawUnreceiptedAcknowledgements` runs on the existing verify-links cron
after workplace and date drift withdrawal. It deactivates only an id named by
a marker when that source has no success `unlimited` or `capped` ledger receipt
containing the id. The inactive reason is `publication-unreceipted`, which is
not feed-recoverable. A second call withdraws nothing. A success receipt wins
over a marker for the same id. If the new table is absent, the pass returns no
withdrawals, so an undeployed migration does not fail the verifier.

Migration 0056 creates the append-only table. It contains no `julianday('now')`.
It was not applied to production D1. No new clock, source, parameter, provider,
or cadence was added.

## What stays public

- An invalid acknowledgement or an ownership failure returns before any marker.
- A zero-proposal tick still writes an empty ledger and no uncertainty row.
- A public row with no uncertainty marker. Ledger-less history is not treated
  as a lost acknowledgement.
- Unknown original dates and null workplace. Those holds are not this unit.
- Unclear and ineligible rows. This pass does not upgrade them.

## Serving bound

Apply still uses the existing public predicate. Deactivating the named
unreceipted row removes it from that predicate. `validateSnapshotCandidate`
is unchanged, so ADR-010 still rejects a collapsed replacement board and keeps
the previous board. This slice does not add remote or date checks to Apply.

## Evidence

Native integration fixture: in-memory bun:sqlite, the gateway migration subset
plus 0028 and 0056, the real gateway, and the real reconciler. The writer names
only the unreceipted id. A historical neighbor with no marker stays public. A
receipted id that also has a marker stays public. No live D1, provider, or
browser proof. The full native migration chain still projects exactly one
ledger `julianday('now')`, with the same four trigger hashes as the prior
clock projection.

| Check | Result |
| --- | --- |
| Native lost-acknowledgement test | pass |
| Gateway integration file and inactive-reason test | 197 pass / 0 fail / 1394 expect() / 8.79s |
| Native clock fixtures | 41 pass; `replacementCount` 1 |
| `bun run typecheck` | exit 0 |
| `bun run build` | exit 0; Astro server built in 35.21s; command 46.60s |
| Full suite | 4001 pass / 0 fail / 326950 expect() / 255 files / 157.79s |

## Backup

Behavior commit `e56ea9bbe5b25885d4559e1216d313ab771a59bd`. This checkpoint is
local. The earlier GitLab push of this review branch was
denied HTTP Basic authentication. That push was not retried. BACKUP_PENDING
until GitLab authentication succeeds. `main` was not pushed. GitHub was not
probed.

## Still open

Accepted MATH remains 0/13. Certified fresh flow remains UNKNOWN. Directory
packets 234 and 237 stay proposals. 236 stays parked. No directory SQL. No
production publication or company enrichment. The next unit is the source-policy
epoch: stale authority must not publish or oversubscribe. Unknown dates and
null workplace remain held. Runtime provenance stays gated.
