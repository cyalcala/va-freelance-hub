# Source economics — latest (SP-02)

- **As of:** 2026-09-19T07:30:55.437Z
- **Windows:** 7d/14d/30d net-new by `scraped_at`
- **Reconciliation:** OK (every partition delta is zero)
- Read-only report; regenerate with `scripts/diagnostics/source-economics.ts`.

## Qualified supply (strict eligibility; first-stored proxy)

Excludes unclear/ineligible rows. Historical publication and later deactivation are not fully reconstructed.

| qualified active | qualified new 7d | per day (7d) | qualified new 30d | per day (30d) |
| ---: | ---: | ---: | ---: | ---: |
| 849 | 89 | 12.71 | 460 | 15.33 |

## Identity coverage (SP-01)

| total | with source_id | null source_id | coverage | active null-id |
| ---: | ---: | ---: | ---: | ---: |
| 5462 | 5462 | 0 | 100.0% | 0 |

## Net-new accepted supply

| active | net-new 7d | net-new 14d | net-new 30d |
| ---: | ---: | ---: | ---: |
| 1025 | 90 | 178 | 479 |

## Provider-family concentration (ADR-006 §7)

- **Net-new 30d:** top family `we-work-remotely` 47.4% ⚠️ >40%; top-3 84.8% ⚠️ >70%.
- **Active:** top family `we-work-remotely` 32.3%; top-3 64.2%.
- `(unknown)` legacy rows are excluded from these shares.

| provider family | active | net-new 30d | net-new 7d | source ids |
| --- | ---: | ---: | ---: | --- |
| we-work-remotely | 331 | 227 | 54 | we-work-remotely |
| real-work-from-anywhere | 167 | 136 | 24 | real-work-from-anywhere |
| breezy | 160 | 21 | 0 | breezy:20four7va, breezy:sourcefit, breezy:time-etc |
| ashby | 130 | 12 | 0 | ashby:supabase, ashby:ashby, ashby:camunda, ashby:amplify, ashby:tremendous |
| greenhouse | 124 | 13 | 0 | greenhouse:gitlab, greenhouse:remotecom, greenhouse:grafanalabs, greenhouse:nearform, greenhouse:ghost |
| remote-ok | 54 | 43 | 5 | remote-ok |
| jobicy | 46 | 21 | 3 | jobicy-supporting-apac, jobicy-admin-support-apac |
| remotive | 13 | 6 | 4 | remotive |
| authentic-jobs | 0 | 0 | 0 | authentic-jobs |
| dribbble | 0 | 0 | 0 | dribbble |
| workable | 0 | 0 | 0 | workable:coconutva, workable:crewbloom, workable:hello-rache, workable:pearltalent, workable:pineapple-staffing |

## Supply by exact source_id

| source_id | platform | active | net-new 7d | net-new 30d | inactive |
| --- | --- | ---: | ---: | ---: | ---: |
| we-work-remotely | WeWorkRemotely | 331 | 54 | 227 | 1013 |
| real-work-from-anywhere | RealWorkFromAnywhere | 167 | 24 | 136 | 378 |
| breezy:20four7va | 20Four7VA | 92 | 0 | 16 | 98 |
| breezy:sourcefit | Sourcefit | 67 | 0 | 5 | 106 |
| remote-ok | RemoteOK | 54 | 5 | 43 | 1141 |
| ashby:supabase | Supabase | 52 | 0 | 7 | 32 |
| greenhouse:gitlab | GitLab | 42 | 0 | 1 | 323 |
| jobicy-supporting-apac | Jobicy | 42 | 3 | 20 | 82 |
| greenhouse:remotecom | Remote.com | 41 | 0 | 12 | 532 |
| greenhouse:grafanalabs | Grafana Labs | 31 | 0 | 0 | 201 |
| ashby:ashby | Ashby | 30 | 0 | 2 | 62 |
| ashby:camunda | Camunda | 21 | 0 | 3 | 46 |
| ashby:amplify | Amplify | 16 | 0 | 0 | 71 |
| remotive | Remotive | 13 | 4 | 6 | 86 |
| ashby:tremendous | Tremendous | 11 | 0 | 0 | 20 |
| greenhouse:nearform | Nearform | 9 | 0 | 0 | 43 |
| jobicy-admin-support-apac | Jobicy | 4 | 0 | 1 | 8 |
| breezy:time-etc | Time Etc | 1 | 0 | 0 | 0 |
| greenhouse:ghost | Ghost | 1 | 0 | 0 | 6 |
| authentic-jobs | AuthenticJobs | 0 | 0 | 0 | 10 |
| dribbble | Dribbble | 0 | 0 | 0 | 113 |
| workable:coconutva | Coconut VA | 0 | 0 | 0 | 21 |
| workable:crewbloom | CrewBloom | 0 | 0 | 0 | 13 |
| workable:hello-rache | Hello Rache | 0 | 0 | 0 | 3 |
| workable:pearltalent | Pearl Talent | 0 | 0 | 0 | 26 |
| workable:pineapple-staffing | Pineapple Staffing | 0 | 0 | 0 | 3 |

## Fetch outcomes (last 7 days)

Separates real (changed) fetches from unchanged 304 polls, intentional skips, failures, and true zero-yield. `items` counts only changed fetches, so carried-forward unchanged counts never read as new supply.

| source_id | real fetches | unchanged | skips | failures | zero-yield | items |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| remotive | 131 | 504 | 0 | 0 | 0 | 2222 |
| real-work-from-anywhere | 107 | 0 | 528 | 0 | 0 | 5350 |
| we-work-remotely | 66 | 568 | 0 | 1 | 0 | 5730 |
| remote-ok | 26 | 81 | 528 | 0 | 0 | 1094 |
| jobicy-supporting-apac | 11 | 90 | 534 | 0 | 0 | 440 |
| jobicy-admin-support-apac | 7 | 97 | 531 | 0 | 0 | 35 |
| ashby:amplify | 0 | 0 | 635 | 0 | 0 | 0 |
| ashby:ashby | 0 | 0 | 635 | 0 | 0 | 0 |
| ashby:camunda | 0 | 0 | 635 | 0 | 0 | 0 |
| ashby:supabase | 0 | 0 | 635 | 0 | 0 | 0 |
| ashby:tremendous | 0 | 0 | 635 | 0 | 0 | 0 |
| authentic-jobs | 0 | 0 | 635 | 0 | 0 | 0 |
| breezy:20four7va | 0 | 0 | 1270 | 0 | 0 | 0 |
| breezy:sourcefit | 0 | 0 | 635 | 0 | 0 | 0 |
| breezy:time-etc | 0 | 0 | 635 | 0 | 0 | 0 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 635 | 0 | 0 | 0 |
| dribbble | 0 | 0 | 635 | 0 | 0 | 0 |
| greenhouse:ghost | 0 | 0 | 635 | 0 | 0 | 0 |
| greenhouse:gitlab | 0 | 0 | 635 | 0 | 0 | 0 |
| greenhouse:grafanalabs | 0 | 0 | 635 | 0 | 0 | 0 |
| greenhouse:nearform | 0 | 0 | 635 | 0 | 0 | 0 |
| greenhouse:remotecom | 0 | 0 | 635 | 0 | 0 | 0 |
| jobspresso | 0 | 0 | 635 | 0 | 0 | 0 |
| lever:vaultoutsourcing | 0 | 0 | 635 | 0 | 0 | 0 |
| onlinejobs-ph | 0 | 0 | 635 | 0 | 0 | 0 |
| problogger | 0 | 0 | 635 | 0 | 0 | 0 |
| remote-co | 0 | 0 | 635 | 0 | 0 | 0 |
| workable:coconutva | 0 | 0 | 635 | 0 | 0 | 0 |
| workable:connectos | 0 | 0 | 635 | 0 | 0 | 0 |
| workable:crewbloom | 0 | 0 | 635 | 0 | 0 | 0 |
| workable:global-strategic | 0 | 0 | 635 | 0 | 0 | 0 |
| workable:hello-rache | 0 | 0 | 635 | 0 | 0 | 0 |
| workable:hunt-st | 0 | 0 | 635 | 0 | 0 | 0 |
| workable:myoutdesk | 0 | 0 | 635 | 0 | 0 | 0 |
| workable:outsource-access | 0 | 0 | 634 | 0 | 0 | 0 |
| workable:pearltalent | 0 | 0 | 634 | 0 | 0 | 0 |
| workable:pineapple-staffing | 0 | 0 | 634 | 0 | 0 | 0 |
| workable:rocketams | 0 | 0 | 634 | 0 | 0 | 0 |
| workable:staff-domain-inc | 0 | 0 | 634 | 0 | 0 | 0 |
| workable:superstaff | 0 | 0 | 634 | 0 | 0 | 0 |
| workable:virtualstaff365 | 0 | 0 | 634 | 0 | 0 | 0 |

## Geo & eligibility triage outcomes (last 7 days)

Breakdown of stored opportunities by Philippines eligibility verdict.

| source_id | eligible | unclear | ineligible | policy_rejected | total | qualified_rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 54 | 1 | 15 | 16 | 70 | 77.1% |
| real-work-from-anywhere | 23 | 5 | 1 | 5 | 29 | 79.3% |
| remote-ok | 5 | 3 | 2 | 5 | 10 | 50.0% |
| remotive | 4 | 0 | 2 | 2 | 6 | 66.7% |
| jobicy-supporting-apac | 3 | 0 | 2 | 2 | 5 | 60.0% |

## Yield efficiency (last 7 days)

Yield per real (changed) fetch and per 100 items seen.

| source_id | real fetches | items seen | eligible stored | yield / fetch | yield / 100 items |
| --- | ---: | ---: | ---: | ---: | ---: |
| remotive | 131 | 2222 | 4 | 0.03 | 0.18 |
| real-work-from-anywhere | 107 | 5350 | 23 | 0.21 | 0.43 |
| we-work-remotely | 66 | 5730 | 54 | 0.82 | 0.94 |
| remote-ok | 26 | 1094 | 5 | 0.19 | 0.46 |
| jobicy-supporting-apac | 11 | 440 | 3 | 0.27 | 0.68 |
| jobicy-admin-support-apac | 7 | 35 | 0 | 0.00 | 0.00 |
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
