# Source economics — latest (SP-02)

- **As of:** 2026-09-08T09:59:29.962Z
- **Windows:** 7d/14d/30d net-new by `scraped_at`
- **Reconciliation:** OK (every partition delta is zero)
- Read-only report; regenerate with `scripts/diagnostics/source-economics.ts`.

## Qualified supply (strict eligibility; first-stored proxy)

Excludes unclear/ineligible rows. Historical publication and later deactivation are not fully reconstructed.

| qualified active | qualified new 7d | per day (7d) | qualified new 30d | per day (30d) |
| ---: | ---: | ---: | ---: | ---: |
| 832 | 89 | 12.71 | 487 | 16.23 |

## Identity coverage (SP-01)

| total | with source_id | null source_id | coverage | active null-id |
| ---: | ---: | ---: | ---: | ---: |
| 5254 | 179 | 5075 | 3.4% | 1001 |

## Net-new accepted supply

| active | net-new 7d | net-new 14d | net-new 30d |
| ---: | ---: | ---: | ---: |
| 1126 | 90 | 217 | 538 |

## Provider-family concentration (ADR-006 §7)

> ⚠️ **Provisional:** only 11.1% of active rows carry an exact source_id (SP-01 does not backfill legacy rows). The shares below reflect that small attributed base, not a real concentration incident; they stabilize as coverage grows.

- **Net-new 30d:** top family `we-work-remotely` 58.4% ⚠️ >40%; top-3 93.6% ⚠️ >70%.
- **Active:** top family `we-work-remotely` 58.4% ⚠️ >40%; top-3 93.6% ⚠️ >70%.
- `(unknown)` legacy rows are excluded from these shares.

| provider family | active | net-new 30d | net-new 7d | source ids |
| --- | ---: | ---: | ---: | --- |
| (unknown) | 1001 | 413 | 0 | (unknown) |
| we-work-remotely | 73 | 73 | 53 | we-work-remotely |
| real-work-from-anywhere | 34 | 34 | 26 | real-work-from-anywhere |
| remote-ok | 10 | 10 | 6 | remote-ok |
| jobicy | 8 | 8 | 5 | jobicy-supporting-apac |
| remotive | 0 | 0 | 0 | remotive |

## Supply by exact source_id

| source_id | platform | active | net-new 7d | net-new 30d | inactive |
| --- | --- | ---: | ---: | ---: | ---: |
| (unknown) | 20Four7VA | 1001 | 0 | 413 | 4074 |
| we-work-remotely | WeWorkRemotely | 73 | 53 | 73 | 12 |
| real-work-from-anywhere | RealWorkFromAnywhere | 34 | 26 | 34 | 3 |
| remote-ok | RemoteOK | 10 | 6 | 10 | 31 |
| jobicy-supporting-apac | Jobicy | 8 | 5 | 8 | 1 |
| remotive | Remotive | 0 | 0 | 0 | 7 |

## Fetch outcomes (last 7 days)

Separates real (changed) fetches from unchanged 304 polls, intentional skips, failures, and true zero-yield. `items` counts only changed fetches, so carried-forward unchanged counts never read as new supply.

| source_id | real fetches | unchanged | skips | failures | zero-yield | items |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| remotive | 127 | 565 | 0 | 0 | 0 | 2366 |
| real-work-from-anywhere | 112 | 0 | 578 | 2 | 0 | 5600 |
| remote-ok | 51 | 62 | 578 | 1 | 0 | 1004 |
| we-work-remotely | 46 | 645 | 0 | 1 | 0 | 4195 |
| jobicy-supporting-apac | 21 | 88 | 583 | 0 | 0 | 840 |
| jobicy-admin-support-apac | 3 | 107 | 582 | 0 | 0 | 17 |
| ashby:amplify | 0 | 0 | 692 | 0 | 0 | 0 |
| ashby:ashby | 0 | 0 | 692 | 0 | 0 | 0 |
| ashby:camunda | 0 | 0 | 692 | 0 | 0 | 0 |
| ashby:supabase | 0 | 0 | 692 | 0 | 0 | 0 |
| ashby:tremendous | 0 | 0 | 692 | 0 | 0 | 0 |
| authentic-jobs | 0 | 0 | 692 | 0 | 0 | 0 |
| breezy:20four7va | 0 | 0 | 1384 | 0 | 0 | 0 |
| breezy:sourcefit | 0 | 0 | 692 | 0 | 0 | 0 |
| breezy:time-etc | 0 | 0 | 692 | 0 | 0 | 0 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 692 | 0 | 0 | 0 |
| dribbble | 0 | 0 | 692 | 0 | 0 | 0 |
| greenhouse:ghost | 0 | 0 | 692 | 0 | 0 | 0 |
| greenhouse:gitlab | 0 | 0 | 692 | 0 | 0 | 0 |
| greenhouse:grafanalabs | 0 | 0 | 692 | 0 | 0 | 0 |
| greenhouse:nearform | 0 | 0 | 692 | 0 | 0 | 0 |
| greenhouse:remotecom | 0 | 0 | 692 | 0 | 0 | 0 |
| jobspresso | 0 | 0 | 692 | 0 | 0 | 0 |
| lever:vaultoutsourcing | 0 | 0 | 692 | 0 | 0 | 0 |
| onlinejobs-ph | 0 | 0 | 692 | 0 | 0 | 0 |
| problogger | 0 | 0 | 692 | 0 | 0 | 0 |
| remote-co | 0 | 0 | 692 | 0 | 0 | 0 |
| workable:coconutva | 0 | 0 | 692 | 0 | 0 | 0 |
| workable:connectos | 0 | 0 | 692 | 0 | 0 | 0 |
| workable:crewbloom | 0 | 0 | 691 | 0 | 0 | 0 |
| workable:global-strategic | 0 | 0 | 691 | 0 | 0 | 0 |
| workable:hello-rache | 0 | 0 | 691 | 0 | 0 | 0 |
| workable:hunt-st | 0 | 0 | 691 | 0 | 0 | 0 |
| workable:myoutdesk | 0 | 0 | 691 | 0 | 0 | 0 |
| workable:outsource-access | 0 | 0 | 691 | 0 | 0 | 0 |
| workable:pearltalent | 0 | 0 | 691 | 0 | 0 | 0 |
| workable:pineapple-staffing | 0 | 0 | 691 | 0 | 0 | 0 |
| workable:rocketams | 0 | 0 | 691 | 0 | 0 | 0 |
| workable:staff-domain-inc | 0 | 0 | 691 | 0 | 0 | 0 |
| workable:superstaff | 0 | 0 | 690 | 0 | 0 | 0 |
| workable:virtualstaff365 | 0 | 0 | 690 | 0 | 0 | 0 |

## Geo & eligibility triage outcomes (last 7 days)

Breakdown of stored opportunities by Philippines eligibility verdict.

| source_id | eligible | unclear | ineligible | policy_rejected | total | qualified_rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 52 | 3 | 8 | 10 | 63 | 82.5% |
| real-work-from-anywhere | 26 | 1 | 0 | 1 | 27 | 96.3% |
| remote-ok | 6 | 6 | 15 | 21 | 27 | 22.2% |
| jobicy-supporting-apac | 5 | 1 | 0 | 1 | 6 | 83.3% |
| remotive | 0 | 0 | 6 | 6 | 6 | 0.0% |

## Yield efficiency (last 7 days)

Yield per real (changed) fetch and per 100 items seen.

| source_id | real fetches | items seen | eligible stored | yield / fetch | yield / 100 items |
| --- | ---: | ---: | ---: | ---: | ---: |
| remotive | 127 | 2366 | 0 | 0.00 | 0.00 |
| real-work-from-anywhere | 112 | 5600 | 26 | 0.23 | 0.46 |
| remote-ok | 51 | 1004 | 6 | 0.12 | 0.60 |
| we-work-remotely | 46 | 4195 | 52 | 1.13 | 1.24 |
| jobicy-supporting-apac | 21 | 840 | 5 | 0.24 | 0.60 |
| jobicy-admin-support-apac | 3 | 17 | 0 | 0.00 | 0.00 |
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

- 1001 active rows still have no source_id (legacy, pre-migration 0034). They are attributed to '(unknown)' and excluded from provider concentration; a separately reviewed read-only-first backfill may resolve them.
