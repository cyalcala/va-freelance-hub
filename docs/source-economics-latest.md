# Source economics — latest (SP-02)

- **As of:** 2026-09-26T07:58:27.728Z
- **Windows:** 7d/14d/30d net-new by `scraped_at`
- **Reconciliation:** OK (every partition delta is zero)
- Read-only report; regenerate with `scripts/diagnostics/source-economics.ts`.

## Qualified supply (strict eligibility; first-stored proxy)

Excludes unclear/ineligible rows. Historical publication and later deactivation are not fully reconstructed.

| qualified active | qualified new 7d | per day (7d) | qualified new 30d | per day (30d) |
| ---: | ---: | ---: | ---: | ---: |
| 895 | 234 | 33.43 | 563 | 18.77 |

## Identity coverage (SP-01)

| total | with source_id | null source_id | coverage | active null-id |
| ---: | ---: | ---: | ---: | ---: |
| 5876 | 5876 | 0 | 100.0% | 0 |

## Net-new accepted supply

| active | net-new 7d | net-new 14d | net-new 30d |
| ---: | ---: | ---: | ---: |
| 895 | 234 | 323 | 563 |

## Provider-family concentration (ADR-006 §7)

- **Net-new 30d:** top family `we-work-remotely` 41.2% ⚠️ >40%; top-3 86.7% ⚠️ >70%.
- **Active:** top family `we-work-remotely` 36.2%; top-3 85.9% ⚠️ >70%.
- `(unknown)` legacy rows are excluded from these shares.

| provider family | active | net-new 30d | net-new 7d | source ids |
| --- | ---: | ---: | ---: | --- |
| we-work-remotely | 324 | 232 | 51 | we-work-remotely |
| breezy | 275 | 133 | 127 | breezy:20four7va, breezy:sourcefit, breezy:remote-craft, breezy:yokly, breezy:value-virtual-assistants, breezy:time-etc |
| real-work-from-anywhere | 170 | 123 | 34 | real-work-from-anywhere |
| remote-ok | 56 | 46 | 16 | remote-ok |
| jobicy | 55 | 22 | 4 | jobicy-supporting-apac, jobicy-admin-support-apac |
| remotive | 12 | 5 | 0 | remotive |
| himalayas | 2 | 2 | 2 | himalayas:remote-jobs |
| greenhouse | 1 | 0 | 0 | greenhouse:ghost, greenhouse:gitlab, greenhouse:grafanalabs, greenhouse:nearform, greenhouse:remotecom |
| ashby | 0 | 0 | 0 | ashby:amplify, ashby:ashby, ashby:camunda, ashby:supabase, ashby:tremendous |
| authentic-jobs | 0 | 0 | 0 | authentic-jobs |
| dribbble | 0 | 0 | 0 | dribbble |
| workable | 0 | 0 | 0 | workable:coconutva, workable:crewbloom, workable:hello-rache, workable:pearltalent, workable:pineapple-staffing |

## Supply by exact source_id

| source_id | platform | active | net-new 7d | net-new 30d | inactive |
| --- | --- | ---: | ---: | ---: | ---: |
| we-work-remotely | WeWorkRemotely | 324 | 51 | 232 | 1076 |
| real-work-from-anywhere | RealWorkFromAnywhere | 170 | 34 | 123 | 412 |
| breezy:20four7va | 20Four7VA | 131 | 45 | 50 | 104 |
| breezy:sourcefit | Sourcefit | 109 | 48 | 49 | 116 |
| remote-ok | RemoteOK | 56 | 16 | 46 | 1163 |
| jobicy-supporting-apac | Jobicy | 49 | 4 | 21 | 80 |
| breezy:remote-craft | Remote Craft | 14 | 14 | 14 | 1 |
| remotive | Remotive | 12 | 0 | 5 | 88 |
| breezy:yokly | Yokly | 11 | 11 | 11 | 0 |
| breezy:value-virtual-assistants | VALUE Virtual Assistants | 9 | 9 | 9 | 0 |
| jobicy-admin-support-apac | Jobicy | 6 | 0 | 1 | 6 |
| himalayas:remote-jobs | Himalayas | 2 | 2 | 2 | 0 |
| breezy:time-etc | Time Etc | 1 | 0 | 0 | 1 |
| greenhouse:ghost | Ghost | 1 | 0 | 0 | 10 |
| ashby:amplify | Amplify | 0 | 0 | 0 | 87 |
| ashby:ashby | Ashby | 0 | 0 | 0 | 92 |
| ashby:camunda | Camunda | 0 | 0 | 0 | 67 |
| ashby:supabase | Supabase | 0 | 0 | 0 | 84 |
| ashby:tremendous | Tremendous | 0 | 0 | 0 | 31 |
| authentic-jobs | AuthenticJobs | 0 | 0 | 0 | 10 |
| dribbble | Dribbble | 0 | 0 | 0 | 113 |
| greenhouse:gitlab | GitLab | 0 | 0 | 0 | 449 |
| greenhouse:grafanalabs | Grafana Labs | 0 | 0 | 0 | 298 |
| greenhouse:nearform | Nearform | 0 | 0 | 0 | 54 |
| greenhouse:remotecom | Remote.com | 0 | 0 | 0 | 573 |
| workable:coconutva | Coconut VA | 0 | 0 | 0 | 21 |
| workable:crewbloom | CrewBloom | 0 | 0 | 0 | 13 |
| workable:hello-rache | Hello Rache | 0 | 0 | 0 | 3 |
| workable:pearltalent | Pearl Talent | 0 | 0 | 0 | 26 |
| workable:pineapple-staffing | Pineapple Staffing | 0 | 0 | 0 | 3 |

## Fetch outcomes (last 7 days)

Separates real (changed) fetches from unchanged 304 polls, intentional skips, failures, and true zero-yield. `items` counts only changed fetches, so carried-forward unchanged counts never read as new supply.

| source_id | real fetches | unchanged | skips | failures | zero-yield | items |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| remotive | 128 | 546 | 0 | 0 | 0 | 2445 |
| real-work-from-anywhere | 109 | 0 | 565 | 0 | 0 | 5450 |
| we-work-remotely | 61 | 611 | 0 | 2 | 0 | 5058 |
| breezy:20four7va | 47 | 0 | 1301 | 0 | 0 | 4880 |
| breezy:sourcefit | 47 | 0 | 627 | 0 | 0 | 3930 |
| breezy:remote-craft | 46 | 0 | 247 | 0 | 0 | 690 |
| breezy:value-virtual-assistants | 46 | 0 | 247 | 0 | 0 | 414 |
| breezy:yokly | 46 | 0 | 247 | 0 | 0 | 506 |
| remote-ok | 24 | 85 | 565 | 0 | 0 | 1025 |
| jobicy-supporting-apac | 22 | 81 | 567 | 4 | 0 | 880 |
| breezy:time-etc | 21 | 0 | 653 | 0 | 0 | 21 |
| greenhouse:ghost | 21 | 0 | 653 | 0 | 0 | 126 |
| greenhouse:nearform | 21 | 0 | 653 | 0 | 0 | 504 |
| greenhouse:gitlab | 19 | 0 | 655 | 0 | 0 | 3765 |
| greenhouse:grafanalabs | 18 | 0 | 655 | 1 | 0 | 2652 |
| jobicy-admin-support-apac | 5 | 99 | 567 | 3 | 0 | 16 |
| ashby:amplify | 0 | 0 | 674 | 0 | 0 | 0 |
| ashby:ashby | 0 | 0 | 674 | 0 | 0 | 0 |
| ashby:camunda | 0 | 0 | 674 | 0 | 0 | 0 |
| ashby:supabase | 0 | 0 | 674 | 0 | 0 | 0 |
| ashby:tremendous | 0 | 0 | 674 | 0 | 0 | 0 |
| authentic-jobs | 0 | 0 | 674 | 0 | 0 | 0 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 674 | 0 | 0 | 0 |
| dribbble | 0 | 0 | 674 | 0 | 0 | 0 |
| greenhouse:remotecom | 0 | 0 | 674 | 0 | 0 | 0 |
| jobspresso | 0 | 0 | 674 | 0 | 0 | 0 |
| lever:vaultoutsourcing | 0 | 0 | 674 | 0 | 0 | 0 |
| onlinejobs-ph | 0 | 0 | 674 | 0 | 0 | 0 |
| problogger | 0 | 0 | 674 | 0 | 0 | 0 |
| remote-co | 0 | 0 | 674 | 0 | 0 | 0 |
| workable:coconutva | 0 | 0 | 674 | 0 | 0 | 0 |
| workable:connectos | 0 | 0 | 674 | 0 | 0 | 0 |
| workable:crewbloom | 0 | 0 | 674 | 0 | 0 | 0 |
| workable:global-strategic | 0 | 0 | 674 | 0 | 0 | 0 |
| workable:hello-rache | 0 | 0 | 674 | 0 | 0 | 0 |
| workable:hunt-st | 0 | 0 | 674 | 0 | 0 | 0 |
| workable:myoutdesk | 0 | 0 | 674 | 0 | 0 | 0 |
| workable:outsource-access | 0 | 0 | 674 | 0 | 0 | 0 |
| workable:pearltalent | 0 | 0 | 674 | 0 | 0 | 0 |
| workable:pineapple-staffing | 0 | 0 | 674 | 0 | 0 | 0 |
| workable:rocketams | 0 | 0 | 674 | 0 | 0 | 0 |
| workable:staff-domain-inc | 0 | 0 | 674 | 0 | 0 | 0 |
| workable:superstaff | 0 | 0 | 674 | 0 | 0 | 0 |
| workable:virtualstaff365 | 0 | 0 | 674 | 0 | 0 | 0 |

## Geo & eligibility triage outcomes (last 7 days)

Breakdown of stored opportunities by Philippines eligibility verdict.

| source_id | eligible | unclear | ineligible | policy_rejected | total | qualified_rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| greenhouse:gitlab | 0 | 1 | 83 | 84 | 84 | 0.0% |
| greenhouse:grafanalabs | 0 | 0 | 66 | 66 | 66 | 0.0% |
| we-work-remotely | 51 | 2 | 3 | 7 | 56 | 91.1% |
| breezy:sourcefit | 48 | 1 | 3 | 22 | 52 | 92.3% |
| breezy:20four7va | 45 | 0 | 0 | 0 | 45 | 100.0% |
| real-work-from-anywhere | 34 | 1 | 2 | 3 | 37 | 91.9% |
| remote-ok | 16 | 3 | 5 | 8 | 24 | 66.7% |
| breezy:remote-craft | 14 | 0 | 1 | 0 | 15 | 93.3% |
| breezy:yokly | 11 | 0 | 0 | 0 | 11 | 100.0% |
| breezy:value-virtual-assistants | 9 | 0 | 0 | 0 | 9 | 100.0% |
| jobicy-supporting-apac | 4 | 0 | 1 | 1 | 5 | 80.0% |
| greenhouse:ghost | 0 | 0 | 4 | 4 | 4 | 0.0% |
| greenhouse:nearform | 0 | 0 | 2 | 2 | 2 | 0.0% |
| himalayas:remote-jobs | 2 | 0 | 0 | 0 | 2 | 100.0% |
| breezy:time-etc | 0 | 0 | 1 | 1 | 1 | 0.0% |
| remotive | 0 | 0 | 1 | 1 | 1 | 0.0% |

## Yield efficiency (last 7 days)

Yield per real (changed) fetch and per 100 items seen.

| source_id | real fetches | items seen | eligible stored | yield / fetch | yield / 100 items |
| --- | ---: | ---: | ---: | ---: | ---: |
| remotive | 128 | 2445 | 0 | 0.00 | 0.00 |
| real-work-from-anywhere | 109 | 5450 | 34 | 0.31 | 0.62 |
| we-work-remotely | 61 | 5058 | 51 | 0.84 | 1.01 |
| breezy:20four7va | 47 | 4880 | 45 | 0.96 | 0.92 |
| breezy:sourcefit | 47 | 3930 | 48 | 1.02 | 1.22 |
| breezy:remote-craft | 46 | 690 | 14 | 0.30 | 2.03 |
| breezy:value-virtual-assistants | 46 | 414 | 9 | 0.20 | 2.17 |
| breezy:yokly | 46 | 506 | 11 | 0.24 | 2.17 |
| remote-ok | 24 | 1025 | 16 | 0.67 | 1.56 |
| jobicy-supporting-apac | 22 | 880 | 4 | 0.18 | 0.45 |
| breezy:time-etc | 21 | 21 | 0 | 0.00 | 0.00 |
| greenhouse:ghost | 21 | 126 | 0 | 0.00 | 0.00 |
| greenhouse:nearform | 21 | 504 | 0 | 0.00 | 0.00 |
| greenhouse:gitlab | 19 | 3765 | 0 | 0.00 | 0.00 |
| greenhouse:grafanalabs | 18 | 2652 | 0 | 0.00 | 0.00 |
| jobicy-admin-support-apac | 5 | 16 | 0 | 0.00 | 0.00 |
| ashby:amplify | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:ashby | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:camunda | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:supabase | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:tremendous | 0 | 0 | 0 | 0.00 | 0.00 |
| authentic-jobs | 0 | 0 | 0 | 0.00 | 0.00 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 0 | 0.00 | 0.00 |
| dribbble | 0 | 0 | 0 | 0.00 | 0.00 |
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
