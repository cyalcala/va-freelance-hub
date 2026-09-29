# Source economics — latest (SP-02)

- **As of:** 2026-09-29T08:58:39.483Z
- **Windows:** 7d/14d/30d net-new by `scraped_at`
- **Reconciliation:** OK (every partition delta is zero)
- Read-only report; regenerate with `scripts/diagnostics/source-economics.ts`.

## Qualified supply (strict eligibility; first-stored proxy)

Excludes unclear/ineligible rows. Historical publication and later deactivation are not fully reconstructed.

| qualified active | qualified new 7d | per day (7d) | qualified new 30d | per day (30d) |
| ---: | ---: | ---: | ---: | ---: |
| 1276 | 679 | 97.00 | 969 | 32.30 |

## Identity coverage (SP-01)

| total | with source_id | null source_id | coverage | active null-id |
| ---: | ---: | ---: | ---: | ---: |
| 6413 | 6413 | 0 | 100.0% | 0 |

## Net-new accepted supply

| active | net-new 7d | net-new 14d | net-new 30d |
| ---: | ---: | ---: | ---: |
| 1276 | 679 | 775 | 969 |

## Provider-family concentration (ADR-006 §7)

- **Net-new 30d:** top family `we-work-remotely` 25.4%; top-3 63.7%.
- **Active:** top family `we-work-remotely` 26.9%; top-3 63.2%.
- `(unknown)` legacy rows are excluded from these shares.

| provider family | active | net-new 30d | net-new 7d | source ids |
| --- | ---: | ---: | ---: | --- |
| we-work-remotely | 343 | 246 | 73 | we-work-remotely |
| workable | 238 | 238 | 238 | workable:hunt-st, workable:coconutva, workable:crewbloom, workable:pearltalent, workable:rocketams, workable:hello-rache, workable:pineapple-staffing |
| breezy | 225 | 133 | 133 | breezy:20four7va, breezy:sourcefit, breezy:remote-craft, breezy:yokly, breezy:value-virtual-assistants, breezy:time-etc |
| real-work-from-anywhere | 156 | 106 | 30 | real-work-from-anywhere |
| greenhouse | 138 | 131 | 131 | greenhouse:canonical, greenhouse:remotecom, greenhouse:ghost, greenhouse:gitlab, greenhouse:grafanalabs, greenhouse:nearform |
| ashby | 56 | 56 | 56 | ashby:multiplymii, ashby:amplify, ashby:ashby, ashby:camunda, ashby:supabase, ashby:tremendous |
| jobicy | 54 | 16 | 3 | jobicy-supporting-apac, jobicy-admin-support-apac |
| remote-ok | 52 | 37 | 13 | remote-ok |
| remotive | 12 | 4 | 0 | remotive |
| himalayas | 2 | 2 | 2 | himalayas:remote-jobs |
| authentic-jobs | 0 | 0 | 0 | authentic-jobs |
| dribbble | 0 | 0 | 0 | dribbble |

## Supply by exact source_id

| source_id | platform | active | net-new 7d | net-new 30d | inactive |
| --- | --- | ---: | ---: | ---: | ---: |
| we-work-remotely | WeWorkRemotely | 343 | 73 | 246 | 1107 |
| real-work-from-anywhere | RealWorkFromAnywhere | 156 | 30 | 106 | 429 |
| workable:hunt-st | Hunt St | 146 | 146 | 146 | 3 |
| greenhouse:canonical | Greenhouse/canonical | 122 | 122 | 122 | 0 |
| breezy:20four7va | 20Four7VA | 111 | 50 | 50 | 129 |
| breezy:sourcefit | Sourcefit | 80 | 49 | 49 | 146 |
| ashby:multiplymii | Ashby/multiplymii | 56 | 56 | 56 | 0 |
| remote-ok | RemoteOK | 52 | 13 | 37 | 1168 |
| jobicy-supporting-apac | Jobicy | 49 | 3 | 16 | 80 |
| workable:coconutva | Coconut VA | 37 | 37 | 37 | 21 |
| workable:crewbloom | CrewBloom | 29 | 29 | 29 | 13 |
| workable:pearltalent | Pearl Talent | 18 | 18 | 18 | 26 |
| breezy:remote-craft | Remote Craft | 14 | 14 | 14 | 1 |
| greenhouse:remotecom | Remote.com | 14 | 8 | 8 | 608 |
| remotive | Remotive | 12 | 0 | 4 | 88 |
| breezy:yokly | Yokly | 11 | 11 | 11 | 0 |
| breezy:value-virtual-assistants | VALUE Virtual Assistants | 9 | 9 | 9 | 0 |
| workable:rocketams | RocketAMS | 7 | 7 | 7 | 2 |
| jobicy-admin-support-apac | Jobicy | 5 | 0 | 0 | 7 |
| himalayas:remote-jobs | Himalayas | 2 | 2 | 2 | 0 |
| greenhouse:ghost | Ghost | 1 | 0 | 0 | 10 |
| greenhouse:gitlab | GitLab | 1 | 1 | 1 | 451 |
| workable:hello-rache | Hello Rache | 1 | 1 | 1 | 3 |
| ashby:amplify | Amplify | 0 | 0 | 0 | 87 |
| ashby:ashby | Ashby | 0 | 0 | 0 | 92 |
| ashby:camunda | Camunda | 0 | 0 | 0 | 67 |
| ashby:supabase | Supabase | 0 | 0 | 0 | 84 |
| ashby:tremendous | Tremendous | 0 | 0 | 0 | 31 |
| authentic-jobs | AuthenticJobs | 0 | 0 | 0 | 10 |
| breezy:time-etc | Time Etc | 0 | 0 | 0 | 2 |
| dribbble | Dribbble | 0 | 0 | 0 | 113 |
| greenhouse:grafanalabs | Grafana Labs | 0 | 0 | 0 | 302 |
| greenhouse:nearform | Nearform | 0 | 0 | 0 | 54 |
| workable:pineapple-staffing | Pineapple Staffing | 0 | 0 | 0 | 3 |

## Fetch outcomes (last 7 days)

Separates real (changed) fetches from unchanged 304 polls, intentional skips, failures, and true zero-yield. `items` counts only changed fetches, so carried-forward unchanged counts never read as new supply.

| source_id | real fetches | unchanged | skips | failures | zero-yield | items |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| remotive | 128 | 532 | 0 | 0 | 0 | 2267 |
| real-work-from-anywhere | 108 | 0 | 552 | 0 | 0 | 5400 |
| breezy:20four7va | 96 | 0 | 1222 | 0 | 0 | 10075 |
| breezy:sourcefit | 96 | 0 | 563 | 0 | 0 | 7965 |
| breezy:remote-craft | 95 | 0 | 484 | 0 | 0 | 1425 |
| breezy:value-virtual-assistants | 95 | 0 | 484 | 0 | 0 | 855 |
| breezy:yokly | 95 | 0 | 484 | 0 | 0 | 1045 |
| breezy:time-etc | 70 | 0 | 589 | 0 | 0 | 70 |
| greenhouse:ghost | 70 | 0 | 589 | 0 | 0 | 420 |
| greenhouse:nearform | 70 | 0 | 589 | 0 | 0 | 1680 |
| greenhouse:gitlab | 68 | 0 | 591 | 0 | 0 | 13507 |
| greenhouse:grafanalabs | 66 | 0 | 591 | 2 | 0 | 9555 |
| we-work-remotely | 63 | 595 | 0 | 2 | 0 | 5150 |
| greenhouse:remotecom | 39 | 0 | 619 | 0 | 0 | 6460 |
| ashby:multiplymii | 32 | 0 | 154 | 0 | 0 | 1703 |
| jobicy-supporting-apac | 22 | 79 | 554 | 5 | 0 | 880 |
| remote-ok | 16 | 92 | 552 | 0 | 0 | 681 |
| jobicy-admin-support-apac | 3 | 100 | 554 | 3 | 0 | 9 |
| workable:hunt-st | 1 | 0 | 659 | 0 | 0 | 146 |
| workable:rocketams | 1 | 0 | 659 | 0 | 0 | 9 |
| ashby:amplify | 0 | 0 | 660 | 0 | 0 | 0 |
| ashby:ashby | 0 | 0 | 660 | 0 | 0 | 0 |
| ashby:camunda | 0 | 0 | 660 | 0 | 0 | 0 |
| ashby:supabase | 0 | 0 | 660 | 0 | 0 | 0 |
| ashby:tremendous | 0 | 0 | 660 | 0 | 0 | 0 |
| authentic-jobs | 0 | 0 | 660 | 0 | 0 | 0 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 660 | 0 | 0 | 0 |
| dribbble | 0 | 0 | 660 | 0 | 0 | 0 |
| jobspresso | 0 | 0 | 660 | 0 | 0 | 0 |
| lever:vaultoutsourcing | 0 | 0 | 660 | 0 | 0 | 0 |
| onlinejobs-ph | 0 | 0 | 660 | 0 | 0 | 0 |
| problogger | 0 | 0 | 660 | 0 | 0 | 0 |
| remote-co | 0 | 0 | 660 | 0 | 0 | 0 |
| workable:coconutva | 0 | 0 | 660 | 0 | 0 | 0 |
| workable:connectos | 0 | 0 | 660 | 0 | 0 | 0 |
| workable:crewbloom | 0 | 0 | 660 | 0 | 0 | 0 |
| workable:global-strategic | 0 | 0 | 660 | 0 | 0 | 0 |
| workable:hello-rache | 0 | 0 | 660 | 0 | 0 | 0 |
| workable:myoutdesk | 0 | 0 | 660 | 0 | 0 | 0 |
| workable:outsource-access | 0 | 0 | 660 | 0 | 0 | 0 |
| workable:pearltalent | 0 | 0 | 660 | 0 | 0 | 0 |
| workable:pineapple-staffing | 0 | 0 | 660 | 0 | 0 | 0 |
| workable:staff-domain-inc | 0 | 0 | 659 | 0 | 0 | 0 |
| workable:superstaff | 0 | 0 | 659 | 0 | 0 | 0 |
| workable:virtualstaff365 | 0 | 0 | 659 | 0 | 0 | 0 |

## Geo & eligibility triage outcomes (last 7 days)

Breakdown of stored opportunities by Philippines eligibility verdict.

| source_id | eligible | unclear | ineligible | policy_rejected | total | qualified_rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| workable:hunt-st | 146 | 0 | 3 | 3 | 149 | 98.0% |
| greenhouse:canonical | 122 | 0 | 0 | 0 | 122 | 100.0% |
| greenhouse:gitlab | 1 | 1 | 85 | 86 | 87 | 1.1% |
| we-work-remotely | 74 | 1 | 7 | 10 | 82 | 90.2% |
| greenhouse:grafanalabs | 0 | 0 | 70 | 70 | 70 | 0.0% |
| ashby:multiplymii | 56 | 0 | 0 | 0 | 56 | 100.0% |
| breezy:sourcefit | 49 | 1 | 3 | 22 | 53 | 92.5% |
| breezy:20four7va | 50 | 0 | 0 | 0 | 50 | 100.0% |
| greenhouse:remotecom | 9 | 3 | 37 | 40 | 49 | 18.4% |
| workable:coconutva | 37 | 0 | 0 | 0 | 37 | 100.0% |
| real-work-from-anywhere | 30 | 2 | 2 | 4 | 34 | 88.2% |
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
| workable:hello-rache | 1 | 0 | 0 | 0 | 1 | 100.0% |

## Yield efficiency (last 7 days)

Yield per real (changed) fetch and per 100 items seen.

| source_id | real fetches | items seen | eligible stored | yield / fetch | yield / 100 items |
| --- | ---: | ---: | ---: | ---: | ---: |
| remotive | 128 | 2267 | 0 | 0.00 | 0.00 |
| real-work-from-anywhere | 108 | 5400 | 30 | 0.28 | 0.56 |
| breezy:20four7va | 96 | 10075 | 50 | 0.52 | 0.50 |
| breezy:sourcefit | 96 | 7965 | 49 | 0.51 | 0.62 |
| breezy:remote-craft | 95 | 1425 | 14 | 0.15 | 0.98 |
| breezy:value-virtual-assistants | 95 | 855 | 9 | 0.09 | 1.05 |
| breezy:yokly | 95 | 1045 | 11 | 0.12 | 1.05 |
| breezy:time-etc | 70 | 70 | 0 | 0.00 | 0.00 |
| greenhouse:ghost | 70 | 420 | 0 | 0.00 | 0.00 |
| greenhouse:nearform | 70 | 1680 | 0 | 0.00 | 0.00 |
| greenhouse:gitlab | 68 | 13507 | 1 | 0.01 | 0.01 |
| greenhouse:grafanalabs | 66 | 9555 | 0 | 0.00 | 0.00 |
| we-work-remotely | 63 | 5150 | 74 | 1.17 | 1.44 |
| greenhouse:remotecom | 39 | 6460 | 9 | 0.23 | 0.14 |
| ashby:multiplymii | 32 | 1703 | 56 | 1.75 | 3.29 |
| jobicy-supporting-apac | 22 | 880 | 3 | 0.14 | 0.34 |
| remote-ok | 16 | 681 | 13 | 0.81 | 1.91 |
| jobicy-admin-support-apac | 3 | 9 | 0 | 0.00 | 0.00 |
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
