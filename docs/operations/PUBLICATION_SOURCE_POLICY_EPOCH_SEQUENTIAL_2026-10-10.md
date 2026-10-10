# Source-policy epoch, sequential re-read — 2026-10-10

Local slice of PUBLICATION_SOURCE_POLICY_EPOCH. This is not production
acceptance, a MATH card, a certified daily flow, or directory enrichment.
The shared-reservation remainder of the unit stays open.

## What changed

`persistAndRecord` loads publication policy again before `request.persist()`.
The check is sequential for one writer. It is not a lock or a transaction.

On the capped path, a fresh `rollback_to_shadow` decision uses the existing
typed transition and writes a `rolled_back` ledger row. Opt-out, or any fresh
decision that is not an eligible capped allow, writes `blocked` and does not
persist. The canary tick sum is read again. If the published count plus the
proposal exceeds the fresh cap, the write is blocked.

On the unlimited path, opt-out, a missing or expired lease, compliance other
than allowed or conditional, or an operational state other than active writes
`blocked` and does not persist. An unregistered exact-six source still resolves
as the legacy fallback, so the second read does not remove that path.

A source that is still canary on the second read publishes under its cap. That
capped path does not require operational state `active`.

No migration was added. No new `julianday('now')`. Migration 0056 was not
applied to production D1. No new clock, source, parameter, provider, or cadence.

## What stays unchanged

- Concurrent connections can still both observe remaining cap and both publish.
- The 25% source and 40% provider-family figures stay portfolio measurements.
  They are not a per-write gate, and exact-six publication is unchanged.
- Unknown dates and null workplace stay on their existing holds.
- A lost ledger acknowledgement still returns `POST_PERSISTENCE_FAILURE` with
  exposure `UNKNOWN` and is not rolled back by this re-read.

## Evidence

Native integration fixture: in-memory bun:sqlite and the real gateway. An
exact-six opt-out inserted after the first `source_opt_outs` read publishes no
opportunity and writes one `blocked` ledger row. No live D1, provider, or
browser proof.

| Check | Result |
| --- | --- |
| Caller fixture files | 214 pass / 0 fail / 1192 expect() / 9.43s |
| `bun run typecheck` | exit 0 |
| Full suite | 4007 pass / 0 fail / 326964 expect() / 255 files / 134.97s |

## Backup

Behavior commit `c59a65575c7fe77d059bc8b724df3e5855b5d6e6`. Parent
`141608db8b33b97871d74fbd186af8137f09f9cc`. The push target is Secure Source
Manager `origin`, branch `codex/verified-flow-directory-checkpoint`. GitLab
remains the secondary mirror. This commit was not pushed to GitLab, and that
denied basic-auth push was not retried. `main` was not pushed. GitHub was not
probed. Cloud Run, Scheduler, Artifact Registry, Turso, D1, and Cloudflare
were unchanged.

## Still open

Accepted MATH remains 0/13. Certified fresh flow remains UNKNOWN. Directory
packets 234 and 237 stay proposals. 236 stays parked. No directory SQL. No
production publication or company enrichment. The next gap is
PUBLICATION_SHARED_RESERVATION: competing channels must not oversubscribe a
cap. Do not turn the portfolio share figures into a per-write block.
