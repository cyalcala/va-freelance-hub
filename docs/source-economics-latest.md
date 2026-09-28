# Source economics — latest (SP-02)

- **As of:** 2026-09-28T08:55:41.483Z
- **Windows:** 7d/14d/30d net-new by `scraped_at`
- **Reconciliation:** OK (every partition delta is zero)
- Read-only report; regenerate with `scripts/diagnostics/source-economics.ts`.

## Qualified supply (strict eligibility; first-stored proxy)

Excludes unclear/ineligible rows. Historical publication and later deactivation are not fully reconstructed.

| qualified active | qualified new 7d | per day (7d) | qualified new 30d | per day (30d) |
| ---: | ---: | ---: | ---: | ---: |
| 1246 | 654 | 93.43 | 939 | 31.30 |

## Identity coverage (SP-01)

| total | with source_id | null source_id | coverage | active null-id |
| ---: | ---: | ---: | ---: | ---: |
| 6369 | 6369 | 0 | 100.0% | 0 |

## Net-new accepted supply

| active | net-new 7d | net-new 14d | net-new 30d |
| ---: | ---: | ---: | ---: |
| 1246 | 654 | 756 | 939 |

## Provider-family concentration (ADR-006 §7)

- **Net-new 30d:** top family `workable` 25.3%; top-3 63.0%.
- **Active:** top family `we-work-remotely` 25.8%; top-3 62.6%.
- `(unknown)` legacy rows are excluded from these shares.

| provider family | active | net-new 30d | net-new 7d | source ids |
| --- | ---: | ---: | ---: | --- |
| we-work-remotely | 322 | 224 | 53 | we-work-remotely |
| workable | 238 | 238 | 238 | workable:hunt-st, workable:coconutva, workable:crewbloom, workable:pearltalent, workable:rocketams, workable:hello-rache, workable:pineapple-staffing |
| breezy | 220 | 128 | 128 | breezy:20four7va, breezy:sourcefit, breezy:remote-craft, breezy:yokly, breezy:value-virtual-assistants, breezy:time-etc |
| real-work-from-anywhere | 154 | 104 | 32 | real-work-from-anywhere |
| greenhouse | 137 | 130 | 130 | greenhouse:canonical, greenhouse:remotecom, greenhouse:ghost, greenhouse:gitlab, greenhouse:grafanalabs, greenhouse:nearform |
| ashby | 55 | 55 | 55 | ashby:multiplymii, ashby:amplify, ashby:ashby, ashby:camunda, ashby:supabase, ashby:tremendous |
| jobicy | 54 | 16 | 3 | jobicy-supporting-apac, jobicy-admin-support-apac |
| remote-ok | 52 | 38 | 13 | remote-ok |
| remotive | 12 | 4 | 0 | remotive |
| himalayas | 2 | 2 | 2 | himalayas:remote-jobs |
| authentic-jobs | 0 | 0 | 0 | authentic-jobs |
| dribbble | 0 | 0 | 0 | dribbble |

## Supply by exact source_id

| source_id | platform | active | net-new 7d | net-new 30d | inactive |
| --- | --- | ---: | ---: | ---: | ---: |
| we-work-remotely | WeWorkRemotely | 322 | 53 | 224 | 1099 |
| real-work-from-anywhere | RealWorkFromAnywhere | 154 | 32 | 104 | 429 |
| workable:hunt-st | Hunt St | 146 | 146 | 146 | 3 |
| greenhouse:canonical | Greenhouse/canonical | 122 | 122 | 122 | 0 |
| breezy:20four7va | 20Four7VA | 107 | 46 | 46 | 129 |
| breezy:sourcefit | Sourcefit | 79 | 48 | 48 | 146 |
| ashby:multiplymii | Ashby/multiplymii | 55 | 55 | 55 | 0 |
| remote-ok | RemoteOK | 52 | 13 | 38 | 1168 |
| jobicy-supporting-apac | Jobicy | 49 | 3 | 16 | 80 |
| workable:coconutva | Coconut VA | 37 | 37 | 37 | 21 |
| workable:crewbloom | CrewBloom | 29 | 29 | 29 | 13 |
| workable:pearltalent | Pearl Talent | 18 | 18 | 18 | 26 |
| breezy:remote-craft | Remote Craft | 14 | 14 | 14 | 1 |
| greenhouse:remotecom | Remote.com | 14 | 8 | 8 | 606 |
| remotive | Remotive | 12 | 0 | 4 | 88 |
| breezy:yokly | Yokly | 11 | 11 | 11 | 0 |
| breezy:value-virtual-assistants | VALUE Virtual Assistants | 9 | 9 | 9 | 0 |
| workable:rocketams | RocketAMS | 7 | 7 | 7 | 2 |
| jobicy-admin-support-apac | Jobicy | 5 | 0 | 0 | 7 |
| himalayas:remote-jobs | Himalayas | 2 | 2 | 2 | 0 |
| greenhouse:ghost | Ghost | 1 | 0 | 0 | 10 |
| workable:hello-rache | Hello Rache | 1 | 1 | 1 | 3 |
| ashby:amplify | Amplify | 0 | 0 | 0 | 87 |
| ashby:ashby | Ashby | 0 | 0 | 0 | 92 |
| ashby:camunda | Camunda | 0 | 0 | 0 | 67 |
| ashby:supabase | Supabase | 0 | 0 | 0 | 84 |
| ashby:tremendous | Tremendous | 0 | 0 | 0 | 31 |
| authentic-jobs | AuthenticJobs | 0 | 0 | 0 | 10 |
| breezy:time-etc | Time Etc | 0 | 0 | 0 | 2 |
| dribbble | Dribbble | 0 | 0 | 0 | 113 |
| greenhouse:gitlab | GitLab | 0 | 0 | 0 | 451 |
| greenhouse:grafanalabs | Grafana Labs | 0 | 0 | 0 | 298 |
| greenhouse:nearform | Nearform | 0 | 0 | 0 | 54 |
| workable:pineapple-staffing | Pineapple Staffing | 0 | 0 | 0 | 3 |

## Fetch outcomes (last 7 days)

Separates real (changed) fetches from unchanged 304 polls, intentional skips, failures, and true zero-yield. `items` counts only changed fetches, so carried-forward unchanged counts never read as new supply.

| source_id | real fetches | unchanged | skips | failures | zero-yield | items |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| remotive | 126 | 536 | 0 | 0 | 0 | 2295 |
| real-work-from-anywhere | 107 | 0 | 555 | 0 | 0 | 5350 |
| breezy:20four7va | 77 | 0 | 1247 | 0 | 0 | 8045 |
| breezy:sourcefit | 77 | 0 | 585 | 0 | 0 | 6420 |
| breezy:remote-craft | 76 | 0 | 394 | 0 | 0 | 1140 |
| breezy:value-virtual-assistants | 76 | 0 | 394 | 0 | 0 | 684 |
| breezy:yokly | 76 | 0 | 394 | 0 | 0 | 836 |
| we-work-remotely | 57 | 603 | 0 | 2 | 0 | 4650 |
| breezy:time-etc | 51 | 0 | 611 | 0 | 0 | 51 |
| greenhouse:ghost | 51 | 0 | 611 | 0 | 0 | 306 |
| greenhouse:nearform | 51 | 0 | 611 | 0 | 0 | 1224 |
| greenhouse:gitlab | 49 | 0 | 613 | 0 | 0 | 9736 |
| greenhouse:grafanalabs | 48 | 0 | 613 | 1 | 0 | 7092 |
| jobicy-supporting-apac | 21 | 79 | 557 | 5 | 0 | 840 |
| greenhouse:remotecom | 20 | 0 | 642 | 0 | 0 | 3300 |
| remote-ok | 18 | 89 | 555 | 0 | 0 | 766 |
| ashby:multiplymii | 13 | 0 | 64 | 0 | 0 | 702 |
| jobicy-admin-support-apac | 5 | 97 | 557 | 3 | 0 | 16 |
| workable:hunt-st | 1 | 0 | 661 | 0 | 0 | 146 |
| workable:rocketams | 1 | 0 | 661 | 0 | 0 | 9 |
| ashby:amplify | 0 | 0 | 662 | 0 | 0 | 0 |
| ashby:ashby | 0 | 0 | 662 | 0 | 0 | 0 |
| ashby:camunda | 0 | 0 | 662 | 0 | 0 | 0 |
| ashby:supabase | 0 | 0 | 662 | 0 | 0 | 0 |
| ashby:tremendous | 0 | 0 | 662 | 0 | 0 | 0 |
| authentic-jobs | 0 | 0 | 662 | 0 | 0 | 0 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 662 | 0 | 0 | 0 |
| dribbble | 0 | 0 | 662 | 0 | 0 | 0 |
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
| workable:myoutdesk | 0 | 0 | 662 | 0 | 0 | 0 |
| workable:outsource-access | 0 | 0 | 662 | 0 | 0 | 0 |
| workable:pearltalent | 0 | 0 | 662 | 0 | 0 | 0 |
| workable:pineapple-staffing | 0 | 0 | 662 | 0 | 0 | 0 |
| workable:staff-domain-inc | 0 | 0 | 662 | 0 | 0 | 0 |
| workable:superstaff | 0 | 0 | 662 | 0 | 0 | 0 |
| workable:virtualstaff365 | 0 | 0 | 662 | 0 | 0 | 0 |

## Geo & eligibility triage outcomes (last 7 days)

Breakdown of stored opportunities by Philippines eligibility verdict.

| source_id | eligible | unclear | ineligible | policy_rejected | total | qualified_rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| workable:hunt-st | 146 | 0 | 3 | 3 | 149 | 98.0% |
| greenhouse:canonical | 122 | 0 | 0 | 0 | 122 | 100.0% |
| greenhouse:gitlab | 0 | 1 | 85 | 86 | 86 | 0.0% |
| greenhouse:grafanalabs | 0 | 0 | 66 | 66 | 66 | 0.0% |
| we-work-remotely | 53 | 1 | 6 | 9 | 60 | 88.3% |
| ashby:multiplymii | 55 | 0 | 0 | 0 | 55 | 100.0% |
| breezy:sourcefit | 48 | 1 | 3 | 22 | 52 | 92.3% |
| greenhouse:remotecom | 9 | 3 | 35 | 38 | 47 | 19.1% |
| breezy:20four7va | 46 | 0 | 0 | 0 | 46 | 100.0% |
| real-work-from-anywhere | 34 | 2 | 2 | 4 | 38 | 89.5% |
| workable:coconutva | 37 | 0 | 0 | 0 | 37 | 100.0% |
| workable:crewbloom | 29 | 0 | 0 | 0 | 29 | 100.0% |
| remote-ok | 13 | 3 | 3 | 6 | 19 | 68.4% |
| workable:pearltalent | 18 | 0 | 0 | 0 | 18 | 100.0% |
| breezy:remote-craft | 14 | 0 | 1 | 0 | 15 | 93.3% |
| breezy:yokly | 11 | 0 | 0 | 0 | 11 | 100.0% |
| breezy:value-virtual-assistants | 9 | 0 | 0 | 0 | 9 | 100.0% |
| workable:rocketams | 7 | 0 | 2 | 2 | 9 | 77.8% |
| greenhouse:ghost | 0 | 0 | 4 | 4 | 4 | 0.0% |
| jobicy-supporting-apac | 3 | 0 | 0 | 0 | 3 | 100.0% |
| greenhouse:nearform | 0 | 0 | 2 | 2 | 2 | 0.0% |
| himalayas:remote-jobs | 2 | 0 | 0 | 0 | 2 | 100.0% |
| breezy:time-etc | 0 | 0 | 1 | 1 | 1 | 0.0% |
| remotive | 0 | 0 | 1 | 1 | 1 | 0.0% |
| workable:hello-rache | 1 | 0 | 0 | 0 | 1 | 100.0% |

## Yield efficiency (last 7 days)

Yield per real (changed) fetch and per 100 items seen.

| source_id | real fetches | items seen | eligible stored | yield / fetch | yield / 100 items |
| --- | ---: | ---: | ---: | ---: | ---: |
| remotive | 126 | 2295 | 0 | 0.00 | 0.00 |
| real-work-from-anywhere | 107 | 5350 | 34 | 0.32 | 0.64 |
| breezy:20four7va | 77 | 8045 | 46 | 0.60 | 0.57 |
| breezy:sourcefit | 77 | 6420 | 48 | 0.62 | 0.75 |
| breezy:remote-craft | 76 | 1140 | 14 | 0.18 | 1.23 |
| breezy:value-virtual-assistants | 76 | 684 | 9 | 0.12 | 1.32 |
| breezy:yokly | 76 | 836 | 11 | 0.14 | 1.32 |
| we-work-remotely | 57 | 4650 | 53 | 0.93 | 1.14 |
| breezy:time-etc | 51 | 51 | 0 | 0.00 | 0.00 |
| greenhouse:ghost | 51 | 306 | 0 | 0.00 | 0.00 |
| greenhouse:nearform | 51 | 1224 | 0 | 0.00 | 0.00 |
| greenhouse:gitlab | 49 | 9736 | 0 | 0.00 | 0.00 |
| greenhouse:grafanalabs | 48 | 7092 | 0 | 0.00 | 0.00 |
| jobicy-supporting-apac | 21 | 840 | 3 | 0.14 | 0.36 |
| greenhouse:remotecom | 20 | 3300 | 9 | 0.45 | 0.27 |
| remote-ok | 18 | 766 | 13 | 0.72 | 1.70 |
| ashby:multiplymii | 13 | 702 | 55 | 4.23 | 7.83 |
| jobicy-admin-support-apac | 5 | 16 | 0 | 0.00 | 0.00 |
| workable:hunt-st | 1 | 146 | 146 | 146.00 | 100.00 |
| workable:rocketams | 1 | 9 | 7 | 7.00 | 77.78 |
| ashby:amplify | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:ashby | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:camunda | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:supabase | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:tremendous | 0 | 0 | 0 | 0.00 | 0.00 |
| authentic-jobs | 0 | 0 | 0 | 0.00 | 0.00 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 0 | 0.00 | 0.00 |
| dribbble | 0 | 0 | 0 | 0.00 | 0.00 |
| jobspresso | 0 | 0 | 0 | 0.00 | 0.00 |
| lever:vaultoutsourcing | 0 | 0 | 0 | 0.00 | 0.00 |
| onlinejobs-ph | 0 | 0 | 0 | 0.00 | 0.00 |
| problogger | 0 | 0 | 0 | 0.00 | 0.00 |
| remote-co | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:coconutva | 0 | 0 | 37 | 0.00 | 0.00 |
| workable:connectos | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:crewbloom | 0 | 0 | 29 | 0.00 | 0.00 |
| workable:global-strategic | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:hello-rache | 0 | 0 | 1 | 0.00 | 0.00 |
| workable:myoutdesk | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:outsource-access | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:pearltalent | 0 | 0 | 18 | 0.00 | 0.00 |
| workable:pineapple-staffing | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:staff-domain-inc | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:superstaff | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:virtualstaff365 | 0 | 0 | 0 | 0.00 | 0.00 |
