# Source economics — latest (SP-02)

- **As of:** 2026-09-09T07:33:07.039Z
- **Windows:** 7d/14d/30d net-new by `scraped_at`
- **Reconciliation:** OK (every partition delta is zero)
- Read-only report; regenerate with `scripts/diagnostics/source-economics.ts`.

## Qualified supply (strict eligibility; first-stored proxy)

Excludes unclear/ineligible rows. Historical publication and later deactivation are not fully reconstructed.

| qualified active | qualified new 7d | per day (7d) | qualified new 30d | per day (30d) |
| ---: | ---: | ---: | ---: | ---: |
| 834 | 90 | 12.86 | 496 | 16.53 |

## Identity coverage (SP-01)

| total | with source_id | null source_id | coverage | active null-id |
| ---: | ---: | ---: | ---: | ---: |
| 5268 | 193 | 5075 | 3.7% | 991 |

## Net-new accepted supply

| active | net-new 7d | net-new 14d | net-new 30d |
| ---: | ---: | ---: | ---: |
| 1127 | 93 | 214 | 549 |

## Provider-family concentration (ADR-006 §7)

> ⚠️ **Provisional:** only 12.1% of active rows carry an exact source_id (SP-01 does not backfill legacy rows). The shares below reflect that small attributed base, not a real concentration incident; they stabilize as coverage grows.

- **Net-new 30d:** top family `we-work-remotely` 56.6% ⚠️ >40%; top-3 94.1% ⚠️ >70%.
- **Active:** top family `we-work-remotely` 56.6% ⚠️ >40%; top-3 94.1% ⚠️ >70%.
- `(unknown)` legacy rows are excluded from these shares.

| provider family | active | net-new 30d | net-new 7d | source ids |
| --- | ---: | ---: | ---: | --- |
| (unknown) | 991 | 413 | 0 | (unknown) |
| we-work-remotely | 77 | 77 | 55 | we-work-remotely |
| real-work-from-anywhere | 40 | 40 | 26 | real-work-from-anywhere |
| remote-ok | 11 | 11 | 7 | remote-ok |
| jobicy | 8 | 8 | 5 | jobicy-supporting-apac |
| remotive | 0 | 0 | 0 | remotive |

## Supply by exact source_id

| source_id | platform | active | net-new 7d | net-new 30d | inactive |
| --- | --- | ---: | ---: | ---: | ---: |
| (unknown) | 20Four7VA | 991 | 0 | 413 | 4084 |
| we-work-remotely | WeWorkRemotely | 77 | 55 | 77 | 13 |
| real-work-from-anywhere | RealWorkFromAnywhere | 40 | 26 | 40 | 4 |
| remote-ok | RemoteOK | 11 | 7 | 11 | 31 |
| jobicy-supporting-apac | Jobicy | 8 | 5 | 8 | 2 |
| remotive | Remotive | 0 | 0 | 0 | 7 |

## Fetch outcomes (last 7 days)

Separates real (changed) fetches from unchanged 304 polls, intentional skips, failures, and true zero-yield. `items` counts only changed fetches, so carried-forward unchanged counts never read as new supply.

| source_id | real fetches | unchanged | skips | failures | zero-yield | items |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| remotive | 123 | 546 | 0 | 0 | 0 | 2214 |
| real-work-from-anywhere | 110 | 0 | 557 | 2 | 0 | 5500 |
| we-work-remotely | 51 | 615 | 0 | 3 | 0 | 4650 |
| remote-ok | 41 | 70 | 557 | 1 | 0 | 814 |
| jobicy-supporting-apac | 20 | 86 | 563 | 0 | 0 | 800 |
| jobicy-admin-support-apac | 4 | 104 | 561 | 0 | 0 | 22 |
| ashby:amplify | 0 | 0 | 669 | 0 | 0 | 0 |
| ashby:ashby | 0 | 0 | 669 | 0 | 0 | 0 |
| ashby:camunda | 0 | 0 | 669 | 0 | 0 | 0 |
| ashby:supabase | 0 | 0 | 669 | 0 | 0 | 0 |
| ashby:tremendous | 0 | 0 | 669 | 0 | 0 | 0 |
| authentic-jobs | 0 | 0 | 669 | 0 | 0 | 0 |
| breezy:20four7va | 0 | 0 | 1338 | 0 | 0 | 0 |
| breezy:sourcefit | 0 | 0 | 669 | 0 | 0 | 0 |
| breezy:time-etc | 0 | 0 | 669 | 0 | 0 | 0 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 669 | 0 | 0 | 0 |
| dribbble | 0 | 0 | 669 | 0 | 0 | 0 |
| greenhouse:ghost | 0 | 0 | 669 | 0 | 0 | 0 |
| greenhouse:gitlab | 0 | 0 | 669 | 0 | 0 | 0 |
| greenhouse:grafanalabs | 0 | 0 | 669 | 0 | 0 | 0 |
| greenhouse:nearform | 0 | 0 | 669 | 0 | 0 | 0 |
| greenhouse:remotecom | 0 | 0 | 669 | 0 | 0 | 0 |
| jobspresso | 0 | 0 | 669 | 0 | 0 | 0 |
| lever:vaultoutsourcing | 0 | 0 | 669 | 0 | 0 | 0 |
| onlinejobs-ph | 0 | 0 | 669 | 0 | 0 | 0 |
| problogger | 0 | 0 | 669 | 0 | 0 | 0 |
| remote-co | 0 | 0 | 669 | 0 | 0 | 0 |
| workable:coconutva | 0 | 0 | 669 | 0 | 0 | 0 |
| workable:connectos | 0 | 0 | 669 | 0 | 0 | 0 |
| workable:crewbloom | 0 | 0 | 668 | 0 | 0 | 0 |
| workable:global-strategic | 0 | 0 | 668 | 0 | 0 | 0 |
| workable:hello-rache | 0 | 0 | 668 | 0 | 0 | 0 |
| workable:hunt-st | 0 | 0 | 668 | 0 | 0 | 0 |
| workable:myoutdesk | 0 | 0 | 668 | 0 | 0 | 0 |
| workable:outsource-access | 0 | 0 | 668 | 0 | 0 | 0 |
| workable:pearltalent | 0 | 0 | 668 | 0 | 0 | 0 |
| workable:pineapple-staffing | 0 | 0 | 668 | 0 | 0 | 0 |
| workable:rocketams | 0 | 0 | 668 | 0 | 0 | 0 |
| workable:staff-domain-inc | 0 | 0 | 668 | 0 | 0 | 0 |
| workable:superstaff | 0 | 0 | 667 | 0 | 0 | 0 |
| workable:virtualstaff365 | 0 | 0 | 667 | 0 | 0 | 0 |

## Geo & eligibility triage outcomes (last 7 days)

Breakdown of stored opportunities by Philippines eligibility verdict.

| source_id | eligible | unclear | ineligible | policy_rejected | total | qualified_rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 55 | 3 | 8 | 11 | 66 | 83.3% |
| real-work-from-anywhere | 23 | 5 | 0 | 2 | 28 | 82.1% |
| remote-ok | 7 | 4 | 13 | 17 | 24 | 29.2% |
| jobicy-supporting-apac | 5 | 2 | 0 | 2 | 7 | 71.4% |

## Yield efficiency (last 7 days)

Yield per real (changed) fetch and per 100 items seen.

| source_id | real fetches | items seen | eligible stored | yield / fetch | yield / 100 items |
| --- | ---: | ---: | ---: | ---: | ---: |
| remotive | 123 | 2214 | 0 | 0.00 | 0.00 |
| real-work-from-anywhere | 110 | 5500 | 23 | 0.21 | 0.42 |
| we-work-remotely | 51 | 4650 | 55 | 1.08 | 1.18 |
| remote-ok | 41 | 814 | 7 | 0.17 | 0.86 |
| jobicy-supporting-apac | 20 | 800 | 5 | 0.25 | 0.63 |
| jobicy-admin-support-apac | 4 | 22 | 0 | 0.00 | 0.00 |
| ashby:amplify | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:ashby | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:camunda | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:supabase | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:tremendous | 0 | 0 | 0 | 0.00 | 0.00 |
| authentic-jobs | 0 | 0 | 0 | 0.00 | 0.00 |
| breezy:20four7va | 0 | 0 | 0 | 0.00 | 0.00 |
| breezy:sourcefit | 0 | 0 | 0 | 0.00 | 0.00 |
| breezy:time-etc | 0 | 0 | 0 | 0.00 | 0.00 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 0 | 0.00 | 0.00 |
| dribbble | 0 | 0 | 0 | 0.00 | 0.00 |
| greenhouse:ghost | 0 | 0 | 0 | 0.00 | 0.00 |
| greenhouse:gitlab | 0 | 0 | 0 | 0.00 | 0.00 |
| greenhouse:grafanalabs | 0 | 0 | 0 | 0.00 | 0.00 |
| greenhouse:nearform | 0 | 0 | 0 | 0.00 | 0.00 |
| greenhouse:remotecom | 0 | 0 | 0 | 0.00 | 0.00 |
| jobspresso | 0 | 0 | 0 | 0.00 | 0.00 |
| lever:vaultoutsourcing | 0 | 0 | 0 | 0.00 | 0.00 |
| onlinejobs-ph | 0 | 0 | 0 | 0.00 | 0.00 |
| problogger | 0 | 0 | 0 | 0.00 | 0.00 |
| remote-co | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:coconutva | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:connectos | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:crewbloom | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:global-strategic | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:hello-rache | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:hunt-st | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:myoutdesk | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:outsource-access | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:pearltalent | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:pineapple-staffing | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:rocketams | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:staff-domain-inc | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:superstaff | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:virtualstaff365 | 0 | 0 | 0 | 0.00 | 0.00 |

## Notes

- 991 active rows still have no source_id (legacy, pre-migration 0034). They are attributed to '(unknown)' and excluded from provider concentration; a separately reviewed read-only-first backfill may resolve them.
