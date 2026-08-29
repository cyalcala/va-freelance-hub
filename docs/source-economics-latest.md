# Source economics — latest (SP-02)

- **As of:** 2026-08-29T07:58:06.207Z
- **Windows:** 7d/14d/30d net-new by `scraped_at`
- **Reconciliation:** OK (every partition delta is zero)
- Read-only report; regenerate with `scripts/diagnostics/source-economics.ts`.

## Identity coverage (SP-01)

| total | with source_id | null source_id | coverage | active null-id |
| ---: | ---: | ---: | ---: | ---: |
| 5090 | 15 | 5075 | 0.3% | 1267 |

## Net-new accepted supply

| active | net-new 7d | net-new 14d | net-new 30d |
| ---: | ---: | ---: | ---: |
| 1278 | 150 | 430 | 579 |

## Provider-family concentration (ADR-006 §7)

> ⚠️ **Provisional:** only 0.9% of active rows carry an exact source_id (SP-01 does not backfill legacy rows). The shares below reflect that small attributed base, not a real concentration incident; they stabilize as coverage grows.

- **Net-new 30d:** top family `real-work-from-anywhere` 63.6% ⚠️ >40%; top-3 100.0% ⚠️ >70%.
- **Active:** top family `real-work-from-anywhere` 63.6% ⚠️ >40%; top-3 100.0% ⚠️ >70%.
- `(unknown)` legacy rows are excluded from these shares.

| provider family | active | net-new 30d | net-new 7d | source ids |
| --- | ---: | ---: | ---: | --- |
| (unknown) | 1267 | 568 | 139 | (unknown) |
| real-work-from-anywhere | 7 | 7 | 7 | real-work-from-anywhere |
| we-work-remotely | 4 | 4 | 4 | we-work-remotely |
| remote-ok | 0 | 0 | 0 | remote-ok |

## Supply by exact source_id

| source_id | platform | active | net-new 7d | net-new 30d | inactive |
| --- | --- | ---: | ---: | ---: | ---: |
| (unknown) | 20Four7VA | 1267 | 139 | 568 | 3808 |
| real-work-from-anywhere | RealWorkFromAnywhere | 7 | 7 | 7 | 0 |
| we-work-remotely | WeWorkRemotely | 4 | 4 | 4 | 1 |
| remote-ok | RemoteOK | 0 | 0 | 0 | 3 |

## Fetch outcomes (last 7 days)

Separates real fetches from intentional skips, failures, and zero-yield.

| source_id | real fetches | skips | failures | zero-yield | items |
| --- | ---: | ---: | ---: | ---: | ---: |
| remotive | 492 | 0 | 0 | 0 | 9467 |
| we-work-remotely | 492 | 0 | 0 | 0 | 44485 |
| real-work-from-anywhere | 83 | 409 | 0 | 0 | 4150 |
| remote-ok | 83 | 409 | 0 | 0 | 2429 |
| breezy:vaaphilippines-recruitment | 73 | 417 | 0 | 73 | 0 |
| greenhouse:gitlab | 73 | 417 | 0 | 0 | 15364 |
| greenhouse:grafanalabs | 73 | 417 | 0 | 0 | 10820 |
| greenhouse:nearform | 73 | 417 | 0 | 0 | 1985 |
| breezy:20four7va | 72 | 908 | 0 | 0 | 5906 |
| breezy:sourcefit | 72 | 418 | 0 | 0 | 5412 |
| breezy:time-etc | 72 | 418 | 0 | 0 | 72 |
| greenhouse:remotecom | 72 | 418 | 0 | 0 | 15522 |
| jobicy-supporting-apac | 72 | 411 | 9 | 0 | 2880 |
| ashby:amplify | 71 | 419 | 0 | 0 | 2719 |
| ashby:ashby | 71 | 419 | 0 | 0 | 4433 |
| ashby:camunda | 71 | 419 | 0 | 0 | 2318 |
| ashby:supabase | 71 | 419 | 0 | 0 | 4101 |
| ashby:tremendous | 71 | 419 | 0 | 0 | 1761 |
| greenhouse:ghost | 71 | 418 | 1 | 0 | 318 |
| jobicy-admin-support-apac | 69 | 415 | 8 | 0 | 429 |
| authentic-jobs | 0 | 492 | 0 | 0 | 0 |
| dribbble | 0 | 492 | 0 | 0 | 0 |
| jobspresso | 0 | 492 | 0 | 0 | 0 |
| lever:vaultoutsourcing | 0 | 492 | 0 | 0 | 0 |
| onlinejobs-ph | 0 | 492 | 0 | 0 | 0 |
| problogger | 0 | 492 | 0 | 0 | 0 |
| remote-co | 0 | 492 | 0 | 0 | 0 |
| workable:coconutva | 0 | 492 | 0 | 0 | 0 |
| workable:connectos | 0 | 492 | 0 | 0 | 0 |
| workable:crewbloom | 0 | 492 | 0 | 0 | 0 |
| workable:global-strategic | 0 | 492 | 0 | 0 | 0 |
| workable:hello-rache | 0 | 492 | 0 | 0 | 0 |
| workable:hunt-st | 0 | 492 | 0 | 0 | 0 |
| workable:myoutdesk | 0 | 492 | 0 | 0 | 0 |
| workable:outsource-access | 0 | 491 | 0 | 0 | 0 |
| workable:pearltalent | 0 | 491 | 0 | 0 | 0 |
| workable:pineapple-staffing | 0 | 491 | 0 | 0 | 0 |
| workable:rocketams | 0 | 491 | 0 | 0 | 0 |
| workable:staff-domain-inc | 0 | 491 | 0 | 0 | 0 |
| workable:superstaff | 0 | 490 | 0 | 0 | 0 |
| workable:virtualstaff365 | 0 | 490 | 0 | 0 | 0 |

## Notes

- 1267 active rows still have no source_id (legacy, pre-migration 0034). They are attributed to '(unknown)' and excluded from provider concentration; a separately reviewed read-only-first backfill may resolve them.
