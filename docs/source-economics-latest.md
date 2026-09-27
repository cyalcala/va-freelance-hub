# Source economics — latest (SP-02)

- **As of:** 2026-09-27T08:31:14.478Z
- **Windows:** 7d/14d/30d net-new by `scraped_at`
- **Reconciliation:** OK (every partition delta is zero)
- Read-only report; regenerate with `scripts/diagnostics/source-economics.ts`.

## Qualified supply (strict eligibility; first-stored proxy)

Excludes unclear/ineligible rows. Historical publication and later deactivation are not fully reconstructed.

| qualified active | qualified new 7d | per day (7d) | qualified new 30d | per day (30d) |
| ---: | ---: | ---: | ---: | ---: |
| 1257 | 659 | 94.14 | 965 | 32.17 |

## Identity coverage (SP-01)

| total | with source_id | null source_id | coverage | active null-id |
| ---: | ---: | ---: | ---: | ---: |
| 6358 | 6358 | 0 | 100.0% | 0 |

## Net-new accepted supply

| active | net-new 7d | net-new 14d | net-new 30d |
| ---: | ---: | ---: | ---: |
| 1257 | 659 | 756 | 965 |

## Provider-family concentration (ADR-006 §7)

- **Net-new 30d:** top family `we-work-remotely` 25.0%; top-3 63.2%.
- **Active:** top family `we-work-remotely` 26.2%; top-3 62.6%.
- `(unknown)` legacy rows are excluded from these shares.

| provider family | active | net-new 30d | net-new 7d | source ids |
| --- | ---: | ---: | ---: | --- |
| we-work-remotely | 329 | 241 | 57 | we-work-remotely |
| workable | 238 | 238 | 238 | workable:hunt-st, workable:coconutva, workable:crewbloom, workable:pearltalent, workable:rocketams, workable:hello-rache, workable:pineapple-staffing |
| breezy | 220 | 128 | 128 | breezy:20four7va, breezy:sourcefit, breezy:remote-craft, breezy:yokly, breezy:value-virtual-assistants, breezy:time-etc |
| real-work-from-anywhere | 158 | 111 | 32 | real-work-from-anywhere |
| greenhouse | 138 | 131 | 131 | greenhouse:canonical, greenhouse:remotecom, greenhouse:ghost, greenhouse:gitlab, greenhouse:grafanalabs, greenhouse:nearform |
| jobicy | 54 | 16 | 3 | jobicy-supporting-apac, jobicy-admin-support-apac |
| ashby | 53 | 53 | 53 | ashby:multiplymii, ashby:amplify, ashby:ashby, ashby:camunda, ashby:supabase, ashby:tremendous |
| remote-ok | 53 | 41 | 15 | remote-ok |
| remotive | 12 | 4 | 0 | remotive |
| himalayas | 2 | 2 | 2 | himalayas:remote-jobs |
| authentic-jobs | 0 | 0 | 0 | authentic-jobs |
| dribbble | 0 | 0 | 0 | dribbble |

## Supply by exact source_id

| source_id | platform | active | net-new 7d | net-new 30d | inactive |
| --- | --- | ---: | ---: | ---: | ---: |
| we-work-remotely | WeWorkRemotely | 329 | 57 | 241 | 1091 |
| real-work-from-anywhere | RealWorkFromAnywhere | 158 | 32 | 111 | 424 |
| workable:hunt-st | Workable/hunt-st | 146 | 146 | 146 | 0 |
| greenhouse:canonical | Greenhouse/canonical | 122 | 122 | 122 | 0 |
| breezy:20four7va | 20Four7VA | 107 | 46 | 46 | 129 |
| breezy:sourcefit | Sourcefit | 79 | 48 | 48 | 146 |
| ashby:multiplymii | Ashby/multiplymii | 53 | 53 | 53 | 0 |
| remote-ok | RemoteOK | 53 | 15 | 41 | 1166 |
| jobicy-supporting-apac | Jobicy | 49 | 3 | 16 | 80 |
| workable:coconutva | Coconut VA | 37 | 37 | 37 | 21 |
| workable:crewbloom | CrewBloom | 29 | 29 | 29 | 13 |
| workable:pearltalent | Pearl Talent | 18 | 18 | 18 | 26 |
| greenhouse:remotecom | Remote.com | 15 | 9 | 9 | 605 |
| breezy:remote-craft | Remote Craft | 14 | 14 | 14 | 1 |
| remotive | Remotive | 12 | 0 | 4 | 88 |
| breezy:yokly | Yokly | 11 | 11 | 11 | 0 |
| breezy:value-virtual-assistants | VALUE Virtual Assistants | 9 | 9 | 9 | 0 |
| workable:rocketams | Workable/rocketams | 7 | 7 | 7 | 0 |
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
| greenhouse:gitlab | GitLab | 0 | 0 | 0 | 450 |
| greenhouse:grafanalabs | Grafana Labs | 0 | 0 | 0 | 298 |
| greenhouse:nearform | Nearform | 0 | 0 | 0 | 54 |
| workable:pineapple-staffing | Pineapple Staffing | 0 | 0 | 0 | 3 |

## Fetch outcomes (last 7 days)

Separates real (changed) fetches from unchanged 304 polls, intentional skips, failures, and true zero-yield. `items` counts only changed fetches, so carried-forward unchanged counts never read as new supply.

| source_id | real fetches | unchanged | skips | failures | zero-yield | items |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| remotive | 124 | 529 | 0 | 0 | 0 | 2311 |
| real-work-from-anywhere | 107 | 0 | 546 | 0 | 0 | 5350 |
| breezy:20four7va | 63 | 0 | 1243 | 0 | 0 | 6561 |
| breezy:sourcefit | 63 | 0 | 590 | 0 | 0 | 5258 |
| breezy:remote-craft | 62 | 0 | 316 | 0 | 0 | 930 |
| breezy:value-virtual-assistants | 62 | 0 | 316 | 0 | 0 | 558 |
| breezy:yokly | 62 | 0 | 316 | 0 | 0 | 682 |
| we-work-remotely | 55 | 596 | 0 | 2 | 0 | 4514 |
| breezy:time-etc | 37 | 0 | 616 | 0 | 0 | 37 |
| greenhouse:ghost | 37 | 0 | 616 | 0 | 0 | 222 |
| greenhouse:nearform | 37 | 0 | 616 | 0 | 0 | 888 |
| greenhouse:gitlab | 35 | 0 | 618 | 0 | 0 | 6947 |
| greenhouse:grafanalabs | 34 | 0 | 618 | 1 | 0 | 5020 |
| jobicy-supporting-apac | 20 | 81 | 548 | 4 | 0 | 800 |
| remote-ok | 20 | 87 | 546 | 0 | 0 | 852 |
| greenhouse:remotecom | 5 | 0 | 648 | 0 | 0 | 825 |
| jobicy-admin-support-apac | 5 | 96 | 549 | 3 | 0 | 16 |
| ashby:amplify | 0 | 0 | 653 | 0 | 0 | 0 |
| ashby:ashby | 0 | 0 | 653 | 0 | 0 | 0 |
| ashby:camunda | 0 | 0 | 653 | 0 | 0 | 0 |
| ashby:supabase | 0 | 0 | 653 | 0 | 0 | 0 |
| ashby:tremendous | 0 | 0 | 653 | 0 | 0 | 0 |
| authentic-jobs | 0 | 0 | 653 | 0 | 0 | 0 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 653 | 0 | 0 | 0 |
| dribbble | 0 | 0 | 653 | 0 | 0 | 0 |
| jobspresso | 0 | 0 | 653 | 0 | 0 | 0 |
| lever:vaultoutsourcing | 0 | 0 | 653 | 0 | 0 | 0 |
| onlinejobs-ph | 0 | 0 | 653 | 0 | 0 | 0 |
| problogger | 0 | 0 | 653 | 0 | 0 | 0 |
| remote-co | 0 | 0 | 653 | 0 | 0 | 0 |
| workable:coconutva | 0 | 0 | 653 | 0 | 0 | 0 |
| workable:connectos | 0 | 0 | 653 | 0 | 0 | 0 |
| workable:crewbloom | 0 | 0 | 653 | 0 | 0 | 0 |
| workable:global-strategic | 0 | 0 | 653 | 0 | 0 | 0 |
| workable:hello-rache | 0 | 0 | 653 | 0 | 0 | 0 |
| workable:hunt-st | 0 | 0 | 653 | 0 | 0 | 0 |
| workable:myoutdesk | 0 | 0 | 653 | 0 | 0 | 0 |
| workable:outsource-access | 0 | 0 | 653 | 0 | 0 | 0 |
| workable:pearltalent | 0 | 0 | 653 | 0 | 0 | 0 |
| workable:pineapple-staffing | 0 | 0 | 653 | 0 | 0 | 0 |
| workable:rocketams | 0 | 0 | 653 | 0 | 0 | 0 |
| workable:staff-domain-inc | 0 | 0 | 653 | 0 | 0 | 0 |
| workable:superstaff | 0 | 0 | 653 | 0 | 0 | 0 |
| workable:virtualstaff365 | 0 | 0 | 653 | 0 | 0 | 0 |

## Geo & eligibility triage outcomes (last 7 days)

Breakdown of stored opportunities by Philippines eligibility verdict.

| source_id | eligible | unclear | ineligible | policy_rejected | total | qualified_rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| workable:hunt-st | 146 | 0 | 0 | 0 | 146 | 100.0% |
| greenhouse:canonical | 122 | 0 | 0 | 0 | 122 | 100.0% |
| greenhouse:gitlab | 0 | 1 | 84 | 85 | 85 | 0.0% |
| greenhouse:grafanalabs | 0 | 0 | 66 | 66 | 66 | 0.0% |
| we-work-remotely | 57 | 1 | 6 | 9 | 64 | 89.1% |
| ashby:multiplymii | 53 | 0 | 0 | 0 | 53 | 100.0% |
| breezy:sourcefit | 48 | 1 | 3 | 22 | 52 | 92.3% |
| greenhouse:remotecom | 9 | 3 | 35 | 38 | 47 | 19.1% |
| breezy:20four7va | 46 | 0 | 0 | 0 | 46 | 100.0% |
| real-work-from-anywhere | 34 | 1 | 2 | 3 | 37 | 91.9% |
| workable:coconutva | 37 | 0 | 0 | 0 | 37 | 100.0% |
| workable:crewbloom | 29 | 0 | 0 | 0 | 29 | 100.0% |
| remote-ok | 15 | 2 | 4 | 6 | 21 | 71.4% |
| workable:pearltalent | 18 | 0 | 0 | 0 | 18 | 100.0% |
| breezy:remote-craft | 14 | 0 | 1 | 0 | 15 | 93.3% |
| breezy:yokly | 11 | 0 | 0 | 0 | 11 | 100.0% |
| breezy:value-virtual-assistants | 9 | 0 | 0 | 0 | 9 | 100.0% |
| workable:rocketams | 7 | 0 | 0 | 0 | 7 | 100.0% |
| greenhouse:ghost | 0 | 0 | 4 | 4 | 4 | 0.0% |
| jobicy-supporting-apac | 3 | 0 | 1 | 1 | 4 | 75.0% |
| greenhouse:nearform | 0 | 0 | 2 | 2 | 2 | 0.0% |
| himalayas:remote-jobs | 2 | 0 | 0 | 0 | 2 | 100.0% |
| breezy:time-etc | 0 | 0 | 1 | 1 | 1 | 0.0% |
| remotive | 0 | 0 | 1 | 1 | 1 | 0.0% |
| workable:hello-rache | 1 | 0 | 0 | 0 | 1 | 100.0% |

## Yield efficiency (last 7 days)

Yield per real (changed) fetch and per 100 items seen.

| source_id | real fetches | items seen | eligible stored | yield / fetch | yield / 100 items |
| --- | ---: | ---: | ---: | ---: | ---: |
| remotive | 124 | 2311 | 0 | 0.00 | 0.00 |
| real-work-from-anywhere | 107 | 5350 | 34 | 0.32 | 0.64 |
| breezy:20four7va | 63 | 6561 | 46 | 0.73 | 0.70 |
| breezy:sourcefit | 63 | 5258 | 48 | 0.76 | 0.91 |
| breezy:remote-craft | 62 | 930 | 14 | 0.23 | 1.51 |
| breezy:value-virtual-assistants | 62 | 558 | 9 | 0.15 | 1.61 |
| breezy:yokly | 62 | 682 | 11 | 0.18 | 1.61 |
| we-work-remotely | 55 | 4514 | 57 | 1.04 | 1.26 |
| breezy:time-etc | 37 | 37 | 0 | 0.00 | 0.00 |
| greenhouse:ghost | 37 | 222 | 0 | 0.00 | 0.00 |
| greenhouse:nearform | 37 | 888 | 0 | 0.00 | 0.00 |
| greenhouse:gitlab | 35 | 6947 | 0 | 0.00 | 0.00 |
| greenhouse:grafanalabs | 34 | 5020 | 0 | 0.00 | 0.00 |
| jobicy-supporting-apac | 20 | 800 | 3 | 0.15 | 0.38 |
| remote-ok | 20 | 852 | 15 | 0.75 | 1.76 |
| greenhouse:remotecom | 5 | 825 | 9 | 1.80 | 1.09 |
| jobicy-admin-support-apac | 5 | 16 | 0 | 0.00 | 0.00 |
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
| workable:hunt-st | 0 | 0 | 146 | 0.00 | 0.00 |
| workable:myoutdesk | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:outsource-access | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:pearltalent | 0 | 0 | 18 | 0.00 | 0.00 |
| workable:pineapple-staffing | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:rocketams | 0 | 0 | 7 | 0.00 | 0.00 |
| workable:staff-domain-inc | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:superstaff | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:virtualstaff365 | 0 | 0 | 0 | 0.00 | 0.00 |
