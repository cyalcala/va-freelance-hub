# Source economics — latest (SP-02)

- **As of:** 2026-09-24T07:47:16.064Z
- **Windows:** 7d/14d/30d net-new by `scraped_at`
- **Reconciliation:** OK (every partition delta is zero)
- Read-only report; regenerate with `scripts/diagnostics/source-economics.ts`.

## Qualified supply (strict eligibility; first-stored proxy)

Excludes unclear/ineligible rows. Historical publication and later deactivation are not fully reconstructed.

| qualified active | qualified new 7d | per day (7d) | qualified new 30d | per day (30d) |
| ---: | ---: | ---: | ---: | ---: |
| 853 | 110 | 15.71 | 469 | 15.63 |

## Identity coverage (SP-01)

| total | with source_id | null source_id | coverage | active null-id |
| ---: | ---: | ---: | ---: | ---: |
| 5661 | 5661 | 0 | 100.0% | 0 |

## Net-new accepted supply

| active | net-new 7d | net-new 14d | net-new 30d |
| ---: | ---: | ---: | ---: |
| 1093 | 203 | 294 | 562 |

## Provider-family concentration (ADR-006 §7)

- **Net-new 30d:** top family `we-work-remotely` 40.4% ⚠️ >40%; top-3 87.2% ⚠️ >70%.
- **Active:** top family `we-work-remotely` 28.8%; top-3 68.5%.
- `(unknown)` legacy rows are excluded from these shares.

| provider family | active | net-new 30d | net-new 7d | source ids |
| --- | ---: | ---: | ---: | --- |
| we-work-remotely | 315 | 227 | 45 | we-work-remotely |
| breezy | 270 | 130 | 120 | breezy:20four7va, breezy:sourcefit, breezy:remote-craft, breezy:yokly, breezy:value-virtual-assistants, breezy:time-etc |
| real-work-from-anywhere | 164 | 133 | 26 | real-work-from-anywhere |
| ashby | 122 | 4 | 0 | ashby:supabase, ashby:ashby, ashby:camunda, ashby:amplify, ashby:tremendous |
| greenhouse | 112 | 7 | 0 | greenhouse:remotecom, greenhouse:gitlab, greenhouse:grafanalabs, greenhouse:nearform, greenhouse:ghost |
| remote-ok | 51 | 36 | 7 | remote-ok |
| jobicy | 46 | 19 | 2 | jobicy-supporting-apac, jobicy-admin-support-apac |
| remotive | 13 | 6 | 3 | remotive |
| authentic-jobs | 0 | 0 | 0 | authentic-jobs |
| dribbble | 0 | 0 | 0 | dribbble |
| workable | 0 | 0 | 0 | workable:coconutva, workable:crewbloom, workable:hello-rache, workable:pearltalent, workable:pineapple-staffing |

## Supply by exact source_id

| source_id | platform | active | net-new 7d | net-new 30d | inactive |
| --- | --- | ---: | ---: | ---: | ---: |
| we-work-remotely | WeWorkRemotely | 315 | 45 | 227 | 1068 |
| real-work-from-anywhere | RealWorkFromAnywhere | 164 | 26 | 133 | 402 |
| breezy:20four7va | 20Four7VA | 126 | 41 | 49 | 105 |
| breezy:sourcefit | Sourcefit | 109 | 45 | 47 | 112 |
| ashby:supabase | Supabase | 51 | 0 | 1 | 33 |
| remote-ok | RemoteOK | 51 | 7 | 36 | 1156 |
| jobicy-supporting-apac | Jobicy | 42 | 2 | 18 | 84 |
| greenhouse:remotecom | Remote.com | 40 | 0 | 6 | 533 |
| greenhouse:gitlab | GitLab | 34 | 0 | 1 | 331 |
| greenhouse:grafanalabs | Grafana Labs | 29 | 0 | 0 | 203 |
| ashby:ashby | Ashby | 28 | 0 | 1 | 64 |
| ashby:camunda | Camunda | 19 | 0 | 2 | 48 |
| ashby:amplify | Amplify | 14 | 0 | 0 | 73 |
| breezy:remote-craft | Remote Craft | 14 | 14 | 14 | 1 |
| remotive | Remotive | 13 | 3 | 6 | 87 |
| breezy:yokly | Yokly | 11 | 11 | 11 | 0 |
| ashby:tremendous | Tremendous | 10 | 0 | 0 | 21 |
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
| remotive | 130 | 529 | 0 | 0 | 0 | 2470 |
| real-work-from-anywhere | 107 | 0 | 552 | 0 | 0 | 5350 |
| we-work-remotely | 61 | 596 | 0 | 2 | 0 | 5114 |
| remote-ok | 26 | 81 | 552 | 0 | 0 | 1110 |
| jobicy-supporting-apac | 14 | 91 | 554 | 0 | 0 | 560 |
| breezy:20four7va | 6 | 0 | 1312 | 0 | 0 | 612 |
| breezy:sourcefit | 6 | 0 | 653 | 0 | 0 | 494 |
| breezy:remote-craft | 5 | 0 | 27 | 0 | 0 | 75 |
| breezy:value-virtual-assistants | 5 | 0 | 27 | 0 | 0 | 45 |
| breezy:yokly | 5 | 0 | 27 | 0 | 0 | 55 |
| jobicy-admin-support-apac | 2 | 103 | 554 | 0 | 0 | 7 |
| ashby:amplify | 0 | 0 | 659 | 0 | 0 | 0 |
| ashby:ashby | 0 | 0 | 659 | 0 | 0 | 0 |
| ashby:camunda | 0 | 0 | 659 | 0 | 0 | 0 |
| ashby:supabase | 0 | 0 | 659 | 0 | 0 | 0 |
| ashby:tremendous | 0 | 0 | 659 | 0 | 0 | 0 |
| authentic-jobs | 0 | 0 | 659 | 0 | 0 | 0 |
| breezy:time-etc | 0 | 0 | 659 | 0 | 0 | 0 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 659 | 0 | 0 | 0 |
| dribbble | 0 | 0 | 659 | 0 | 0 | 0 |
| greenhouse:ghost | 0 | 0 | 659 | 0 | 0 | 0 |
| greenhouse:gitlab | 0 | 0 | 659 | 0 | 0 | 0 |
| greenhouse:grafanalabs | 0 | 0 | 659 | 0 | 0 | 0 |
| greenhouse:nearform | 0 | 0 | 659 | 0 | 0 | 0 |
| greenhouse:remotecom | 0 | 0 | 659 | 0 | 0 | 0 |
| jobspresso | 0 | 0 | 659 | 0 | 0 | 0 |
| lever:vaultoutsourcing | 0 | 0 | 659 | 0 | 0 | 0 |
| onlinejobs-ph | 0 | 0 | 659 | 0 | 0 | 0 |
| problogger | 0 | 0 | 659 | 0 | 0 | 0 |
| remote-co | 0 | 0 | 659 | 0 | 0 | 0 |
| workable:coconutva | 0 | 0 | 659 | 0 | 0 | 0 |
| workable:connectos | 0 | 0 | 659 | 0 | 0 | 0 |
| workable:crewbloom | 0 | 0 | 659 | 0 | 0 | 0 |
| workable:global-strategic | 0 | 0 | 659 | 0 | 0 | 0 |
| workable:hello-rache | 0 | 0 | 659 | 0 | 0 | 0 |
| workable:hunt-st | 0 | 0 | 659 | 0 | 0 | 0 |
| workable:myoutdesk | 0 | 0 | 659 | 0 | 0 | 0 |
| workable:outsource-access | 0 | 0 | 659 | 0 | 0 | 0 |
| workable:pearltalent | 0 | 0 | 659 | 0 | 0 | 0 |
| workable:pineapple-staffing | 0 | 0 | 659 | 0 | 0 | 0 |
| workable:rocketams | 0 | 0 | 659 | 0 | 0 | 0 |
| workable:staff-domain-inc | 0 | 0 | 659 | 0 | 0 | 0 |
| workable:superstaff | 0 | 0 | 659 | 0 | 0 | 0 |
| workable:virtualstaff365 | 0 | 0 | 659 | 0 | 0 | 0 |

## Geo & eligibility triage outcomes (last 7 days)

Breakdown of stored opportunities by Philippines eligibility verdict.

| source_id | eligible | unclear | ineligible | policy_rejected | total | qualified_rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 44 | 3 | 9 | 11 | 56 | 78.6% |
| breezy:sourcefit | 0 | 46 | 2 | 3 | 48 | 0.0% |
| breezy:20four7va | 2 | 39 | 0 | 0 | 41 | 4.9% |
| real-work-from-anywhere | 23 | 4 | 1 | 2 | 28 | 82.1% |
| breezy:remote-craft | 14 | 0 | 1 | 0 | 15 | 93.3% |
| remote-ok | 7 | 2 | 5 | 7 | 14 | 50.0% |
| breezy:yokly | 6 | 5 | 0 | 0 | 11 | 54.5% |
| breezy:value-virtual-assistants | 9 | 0 | 0 | 0 | 9 | 100.0% |
| remotive | 3 | 0 | 3 | 3 | 6 | 50.0% |
| jobicy-supporting-apac | 2 | 0 | 1 | 1 | 3 | 66.7% |

## Yield efficiency (last 7 days)

Yield per real (changed) fetch and per 100 items seen.

| source_id | real fetches | items seen | eligible stored | yield / fetch | yield / 100 items |
| --- | ---: | ---: | ---: | ---: | ---: |
| remotive | 130 | 2470 | 3 | 0.02 | 0.12 |
| real-work-from-anywhere | 107 | 5350 | 23 | 0.21 | 0.43 |
| we-work-remotely | 61 | 5114 | 44 | 0.72 | 0.86 |
| remote-ok | 26 | 1110 | 7 | 0.27 | 0.63 |
| jobicy-supporting-apac | 14 | 560 | 2 | 0.14 | 0.36 |
| breezy:20four7va | 6 | 612 | 2 | 0.33 | 0.33 |
| breezy:sourcefit | 6 | 494 | 0 | 0.00 | 0.00 |
| breezy:remote-craft | 5 | 75 | 14 | 2.80 | 18.67 |
| breezy:value-virtual-assistants | 5 | 45 | 9 | 1.80 | 20.00 |
| breezy:yokly | 5 | 55 | 6 | 1.20 | 10.91 |
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
