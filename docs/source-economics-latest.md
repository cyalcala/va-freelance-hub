# Source economics — latest (SP-02)

- **As of:** 2026-09-25T08:08:19.610Z
- **Windows:** 7d/14d/30d net-new by `scraped_at`
- **Reconciliation:** OK (every partition delta is zero)
- Read-only report; regenerate with `scripts/diagnostics/source-economics.ts`.

## Qualified supply (strict eligibility; first-stored proxy)

Excludes unclear/ineligible rows. Historical publication and later deactivation are not fully reconstructed.

| qualified active | qualified new 7d | per day (7d) | qualified new 30d | per day (30d) |
| ---: | ---: | ---: | ---: | ---: |
| 867 | 120 | 17.14 | 460 | 15.33 |

## Identity coverage (SP-01)

| total | with source_id | null source_id | coverage | active null-id |
| ---: | ---: | ---: | ---: | ---: |
| 5690 | 5690 | 0 | 100.0% | 0 |

## Net-new accepted supply

| active | net-new 7d | net-new 14d | net-new 30d |
| ---: | ---: | ---: | ---: |
| 1108 | 216 | 304 | 556 |

## Provider-family concentration (ADR-006 §7)

- **Net-new 30d:** top family `we-work-remotely` 41.9% ⚠️ >40%; top-3 87.6% ⚠️ >70%.
- **Active:** top family `we-work-remotely` 29.4%; top-3 69.1%.
- `(unknown)` legacy rows are excluded from these shares.

| provider family | active | net-new 30d | net-new 7d | source ids |
| --- | ---: | ---: | ---: | --- |
| we-work-remotely | 326 | 233 | 48 | we-work-remotely |
| breezy | 269 | 129 | 124 | breezy:20four7va, breezy:sourcefit, breezy:remote-craft, breezy:yokly, breezy:value-virtual-assistants, breezy:time-etc |
| real-work-from-anywhere | 171 | 125 | 33 | real-work-from-anywhere |
| ashby | 121 | 1 | 0 | ashby:supabase, ashby:ashby, ashby:camunda, ashby:amplify, ashby:tremendous |
| greenhouse | 111 | 6 | 0 | greenhouse:remotecom, greenhouse:gitlab, greenhouse:grafanalabs, greenhouse:nearform, greenhouse:ghost |
| remote-ok | 51 | 37 | 6 | remote-ok |
| jobicy | 46 | 20 | 3 | jobicy-supporting-apac, jobicy-admin-support-apac |
| remotive | 13 | 5 | 2 | remotive |
| authentic-jobs | 0 | 0 | 0 | authentic-jobs |
| dribbble | 0 | 0 | 0 | dribbble |
| workable | 0 | 0 | 0 | workable:coconutva, workable:crewbloom, workable:hello-rache, workable:pearltalent, workable:pineapple-staffing |

## Supply by exact source_id

| source_id | platform | active | net-new 7d | net-new 30d | inactive |
| --- | --- | ---: | ---: | ---: | ---: |
| we-work-remotely | WeWorkRemotely | 326 | 48 | 233 | 1070 |
| real-work-from-anywhere | RealWorkFromAnywhere | 171 | 33 | 125 | 405 |
| breezy:20four7va | 20Four7VA | 127 | 43 | 47 | 106 |
| breezy:sourcefit | Sourcefit | 107 | 47 | 48 | 116 |
| ashby:supabase | Supabase | 51 | 0 | 1 | 33 |
| remote-ok | RemoteOK | 51 | 6 | 37 | 1157 |
| jobicy-supporting-apac | Jobicy | 42 | 3 | 19 | 85 |
| greenhouse:remotecom | Remote.com | 40 | 0 | 6 | 533 |
| greenhouse:gitlab | GitLab | 33 | 0 | 0 | 332 |
| greenhouse:grafanalabs | Grafana Labs | 29 | 0 | 0 | 203 |
| ashby:ashby | Ashby | 28 | 0 | 0 | 64 |
| ashby:camunda | Camunda | 19 | 0 | 0 | 48 |
| ashby:amplify | Amplify | 14 | 0 | 0 | 73 |
| breezy:remote-craft | Remote Craft | 14 | 14 | 14 | 1 |
| remotive | Remotive | 13 | 2 | 5 | 87 |
| breezy:yokly | Yokly | 11 | 11 | 11 | 0 |
| ashby:tremendous | Tremendous | 9 | 0 | 0 | 22 |
| breezy:value-virtual-assistants | VALUE Virtual Assistants | 9 | 9 | 9 | 0 |
| greenhouse:nearform | Nearform | 8 | 0 | 0 | 44 |
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
| remotive | 129 | 533 | 0 | 0 | 0 | 2499 |
| real-work-from-anywhere | 107 | 0 | 555 | 0 | 0 | 5350 |
| we-work-remotely | 61 | 600 | 0 | 1 | 0 | 5092 |
| breezy:20four7va | 25 | 0 | 1299 | 0 | 0 | 2574 |
| breezy:sourcefit | 25 | 0 | 637 | 0 | 0 | 2099 |
| remote-ok | 25 | 82 | 555 | 0 | 0 | 1068 |
| breezy:remote-craft | 24 | 0 | 131 | 0 | 0 | 360 |
| breezy:value-virtual-assistants | 24 | 0 | 131 | 0 | 0 | 216 |
| breezy:yokly | 24 | 0 | 131 | 0 | 0 | 264 |
| jobicy-supporting-apac | 19 | 85 | 557 | 1 | 0 | 760 |
| jobicy-admin-support-apac | 2 | 103 | 557 | 0 | 0 | 7 |
| ashby:amplify | 0 | 0 | 662 | 0 | 0 | 0 |
| ashby:ashby | 0 | 0 | 662 | 0 | 0 | 0 |
| ashby:camunda | 0 | 0 | 662 | 0 | 0 | 0 |
| ashby:supabase | 0 | 0 | 662 | 0 | 0 | 0 |
| ashby:tremendous | 0 | 0 | 662 | 0 | 0 | 0 |
| authentic-jobs | 0 | 0 | 662 | 0 | 0 | 0 |
| breezy:time-etc | 0 | 0 | 662 | 0 | 0 | 0 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 662 | 0 | 0 | 0 |
| dribbble | 0 | 0 | 662 | 0 | 0 | 0 |
| greenhouse:ghost | 0 | 0 | 662 | 0 | 0 | 0 |
| greenhouse:gitlab | 0 | 0 | 662 | 0 | 0 | 0 |
| greenhouse:grafanalabs | 0 | 0 | 662 | 0 | 0 | 0 |
| greenhouse:nearform | 0 | 0 | 662 | 0 | 0 | 0 |
| greenhouse:remotecom | 0 | 0 | 662 | 0 | 0 | 0 |
| jobspresso | 0 | 0 | 662 | 0 | 0 | 0 |
| lever:vaultoutsourcing | 0 | 0 | 662 | 0 | 0 | 0 |
| onlinejobs-ph | 0 | 0 | 662 | 0 | 0 | 0 |
| problogger | 0 | 0 | 662 | 0 | 0 | 0 |
| remote-co | 0 | 0 | 662 | 0 | 0 | 0 |
| workable:coconutva | 0 | 0 | 662 | 0 | 0 | 0 |
| workable:connectos | 0 | 0 | 662 | 0 | 0 | 0 |
| workable:crewbloom | 0 | 0 | 662 | 0 | 0 | 0 |
| workable:global-strategic | 0 | 0 | 662 | 0 | 0 | 0 |
| workable:hello-rache | 0 | 0 | 662 | 0 | 0 | 0 |
| workable:hunt-st | 0 | 0 | 662 | 0 | 0 | 0 |
| workable:myoutdesk | 0 | 0 | 662 | 0 | 0 | 0 |
| workable:outsource-access | 0 | 0 | 662 | 0 | 0 | 0 |
| workable:pearltalent | 0 | 0 | 662 | 0 | 0 | 0 |
| workable:pineapple-staffing | 0 | 0 | 662 | 0 | 0 | 0 |
| workable:rocketams | 0 | 0 | 662 | 0 | 0 | 0 |
| workable:staff-domain-inc | 0 | 0 | 662 | 0 | 0 | 0 |
| workable:superstaff | 0 | 0 | 662 | 0 | 0 | 0 |
| workable:virtualstaff365 | 0 | 0 | 662 | 0 | 0 | 0 |

## Geo & eligibility triage outcomes (last 7 days)

Breakdown of stored opportunities by Philippines eligibility verdict.

| source_id | eligible | unclear | ineligible | policy_rejected | total | qualified_rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 44 | 6 | 6 | 8 | 56 | 78.6% |
| breezy:sourcefit | 1 | 47 | 2 | 3 | 50 | 2.0% |
| breezy:20four7va | 6 | 37 | 0 | 0 | 43 | 14.0% |
| real-work-from-anywhere | 30 | 4 | 2 | 3 | 36 | 83.3% |
| breezy:remote-craft | 14 | 0 | 1 | 0 | 15 | 93.3% |
| remote-ok | 5 | 3 | 5 | 7 | 13 | 38.5% |
| breezy:yokly | 6 | 5 | 0 | 0 | 11 | 54.5% |
| breezy:value-virtual-assistants | 9 | 0 | 0 | 0 | 9 | 100.0% |
| remotive | 2 | 0 | 3 | 3 | 5 | 40.0% |
| jobicy-supporting-apac | 3 | 0 | 1 | 1 | 4 | 75.0% |

## Yield efficiency (last 7 days)

Yield per real (changed) fetch and per 100 items seen.

| source_id | real fetches | items seen | eligible stored | yield / fetch | yield / 100 items |
| --- | ---: | ---: | ---: | ---: | ---: |
| remotive | 129 | 2499 | 2 | 0.02 | 0.08 |
| real-work-from-anywhere | 107 | 5350 | 30 | 0.28 | 0.56 |
| we-work-remotely | 61 | 5092 | 44 | 0.72 | 0.86 |
| breezy:20four7va | 25 | 2574 | 6 | 0.24 | 0.23 |
| breezy:sourcefit | 25 | 2099 | 1 | 0.04 | 0.05 |
| remote-ok | 25 | 1068 | 5 | 0.20 | 0.47 |
| breezy:remote-craft | 24 | 360 | 14 | 0.58 | 3.89 |
| breezy:value-virtual-assistants | 24 | 216 | 9 | 0.38 | 4.17 |
| breezy:yokly | 24 | 264 | 6 | 0.25 | 2.27 |
| jobicy-supporting-apac | 19 | 760 | 3 | 0.16 | 0.39 |
| jobicy-admin-support-apac | 2 | 7 | 0 | 0.00 | 0.00 |
| ashby:amplify | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:ashby | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:camunda | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:supabase | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:tremendous | 0 | 0 | 0 | 0.00 | 0.00 |
| authentic-jobs | 0 | 0 | 0 | 0.00 | 0.00 |
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
