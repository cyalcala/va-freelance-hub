# Source economics — latest (SP-02)

- **As of:** 2026-08-29T09:08:11.345Z
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

Separates real (changed) fetches from unchanged 304 polls, intentional skips, failures, and true zero-yield. `items` counts only changed fetches, so carried-forward unchanged counts never read as new supply.

| source_id | real fetches | unchanged | skips | failures | zero-yield | items |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| remotive | 489 | 3 | 0 | 0 | 0 | 9399 |
| we-work-remotely | 488 | 4 | 0 | 0 | 0 | 44104 |
| real-work-from-anywhere | 83 | 0 | 409 | 0 | 0 | 4150 |
| remote-ok | 82 | 1 | 409 | 0 | 0 | 2397 |
| breezy:vaaphilippines-recruitment | 72 | 0 | 418 | 0 | 72 | 0 |
| greenhouse:gitlab | 72 | 0 | 418 | 0 | 0 | 15160 |
| greenhouse:grafanalabs | 72 | 0 | 418 | 0 | 0 | 10674 |
| greenhouse:nearform | 72 | 0 | 418 | 0 | 0 | 1961 |
| jobicy-supporting-apac | 72 | 1 | 411 | 8 | 0 | 2880 |
| breezy:20four7va | 71 | 0 | 909 | 0 | 0 | 5824 |
| breezy:sourcefit | 71 | 0 | 419 | 0 | 0 | 5335 |
| breezy:time-etc | 71 | 0 | 419 | 0 | 0 | 71 |
| greenhouse:remotecom | 71 | 0 | 419 | 0 | 0 | 15299 |
| ashby:amplify | 70 | 0 | 420 | 0 | 0 | 2682 |
| ashby:ashby | 70 | 0 | 420 | 0 | 0 | 4370 |
| ashby:camunda | 70 | 0 | 420 | 0 | 0 | 2287 |
| ashby:supabase | 70 | 0 | 420 | 0 | 0 | 4043 |
| ashby:tremendous | 70 | 0 | 420 | 0 | 0 | 1737 |
| greenhouse:ghost | 70 | 0 | 419 | 1 | 0 | 314 |
| jobicy-admin-support-apac | 69 | 1 | 415 | 7 | 0 | 429 |
| authentic-jobs | 0 | 0 | 492 | 0 | 0 | 0 |
| dribbble | 0 | 0 | 492 | 0 | 0 | 0 |
| jobspresso | 0 | 0 | 492 | 0 | 0 | 0 |
| lever:vaultoutsourcing | 0 | 0 | 492 | 0 | 0 | 0 |
| onlinejobs-ph | 0 | 0 | 492 | 0 | 0 | 0 |
| problogger | 0 | 0 | 492 | 0 | 0 | 0 |
| remote-co | 0 | 0 | 492 | 0 | 0 | 0 |
| workable:coconutva | 0 | 0 | 492 | 0 | 0 | 0 |
| workable:connectos | 0 | 0 | 492 | 0 | 0 | 0 |
| workable:crewbloom | 0 | 0 | 492 | 0 | 0 | 0 |
| workable:global-strategic | 0 | 0 | 492 | 0 | 0 | 0 |
| workable:hello-rache | 0 | 0 | 492 | 0 | 0 | 0 |
| workable:hunt-st | 0 | 0 | 492 | 0 | 0 | 0 |
| workable:myoutdesk | 0 | 0 | 492 | 0 | 0 | 0 |
| workable:outsource-access | 0 | 0 | 491 | 0 | 0 | 0 |
| workable:pearltalent | 0 | 0 | 491 | 0 | 0 | 0 |
| workable:pineapple-staffing | 0 | 0 | 491 | 0 | 0 | 0 |
| workable:rocketams | 0 | 0 | 491 | 0 | 0 | 0 |
| workable:staff-domain-inc | 0 | 0 | 491 | 0 | 0 | 0 |
| workable:superstaff | 0 | 0 | 490 | 0 | 0 | 0 |
| workable:virtualstaff365 | 0 | 0 | 490 | 0 | 0 | 0 |

## Notes

- 1267 active rows still have no source_id (legacy, pre-migration 0034). They are attributed to '(unknown)' and excluded from provider concentration; a separately reviewed read-only-first backfill may resolve them.