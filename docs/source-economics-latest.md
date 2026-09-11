# Source economics ΓÇö latest (SP-02)

- **As of:** 2026-09-11T13:55:46.555Z
- **Windows:** 7d/14d/30d net-new by `scraped_at`
- **Reconciliation:** OK (every partition delta is zero)
- Read-only report; regenerate with `scripts/diagnostics/source-economics.ts`.

## Qualified supply (strict eligibility; first-stored proxy)

Excludes unclear/ineligible rows. Historical publication and later deactivation are not fully reconstructed.

| qualified active | qualified new 7d | per day (7d) | qualified new 30d | per day (30d) |
| ---: | ---: | ---: | ---: | ---: |
| 848 | 88 | 12.57 | 536 | 17.87 |

## Identity coverage (SP-01)

| total | with source_id | null source_id | coverage | active null-id |
| ---: | ---: | ---: | ---: | ---: |
| 5331 | 5331 | 0 | 100.0% | 0 |

## Net-new accepted supply

| active | net-new 7d | net-new 14d | net-new 30d |
| ---: | ---: | ---: | ---: |
| 1119 | 91 | 192 | 589 |

## Provider-family concentration (ADR-006 ┬º7)

- **Net-new 30d:** top family `we-work-remotely` 48.9% ΓÜá∩╕Å >40%; top-3 81.2% ΓÜá∩╕Å >70%.
- **Active:** top family `we-work-remotely` 30.8%; top-3 61.8%.
- `(unknown)` legacy rows are excluded from these shares.

| provider family | active | net-new 30d | net-new 7d | source ids |
| --- | ---: | ---: | ---: | --- |
| we-work-remotely | 345 | 288 | 53 | we-work-remotely |
| ashby | 176 | 13 | 0 | ashby:supabase, ashby:ashby, ashby:camunda, ashby:amplify, ashby:tremendous |
| breezy | 171 | 52 | 0 | breezy:20four7va, breezy:sourcefit, breezy:time-etc |
| real-work-from-anywhere | 165 | 138 | 25 | real-work-from-anywhere |
| greenhouse | 154 | 19 | 0 | greenhouse:gitlab, greenhouse:grafanalabs, greenhouse:remotecom, greenhouse:nearform, greenhouse:ghost |
| remote-ok | 49 | 49 | 9 | remote-ok |
| jobicy | 48 | 27 | 4 | jobicy-supporting-apac, jobicy-admin-support-apac |
| remotive | 11 | 3 | 0 | remotive |
| authentic-jobs | 0 | 0 | 0 | authentic-jobs |
| dribbble | 0 | 0 | 0 | dribbble |
| workable | 0 | 0 | 0 | workable:coconutva, workable:crewbloom, workable:hello-rache, workable:pearltalent, workable:pineapple-staffing |

## Supply by exact source_id

| source_id | platform | active | net-new 7d | net-new 30d | inactive |
| --- | --- | ---: | ---: | ---: | ---: |
| we-work-remotely | WeWorkRemotely | 345 | 53 | 288 | 926 |
| real-work-from-anywhere | RealWorkFromAnywhere | 165 | 25 | 138 | 346 |
| breezy:20four7va | 20Four7VA | 97 | 0 | 35 | 93 |
| breezy:sourcefit | Sourcefit | 73 | 0 | 17 | 100 |
| ashby:supabase | Supabase | 61 | 0 | 7 | 23 |
| remote-ok | RemoteOK | 49 | 9 | 49 | 1133 |
| ashby:ashby | Ashby | 48 | 0 | 2 | 44 |
| greenhouse:gitlab | GitLab | 47 | 0 | 1 | 318 |
| greenhouse:grafanalabs | Grafana Labs | 46 | 0 | 0 | 186 |
| greenhouse:remotecom | Remote.com | 46 | 0 | 18 | 527 |
| jobicy-supporting-apac | Jobicy | 44 | 4 | 24 | 75 |
| ashby:camunda | Camunda | 27 | 0 | 4 | 40 |
| ashby:amplify | Amplify | 22 | 0 | 0 | 65 |
| ashby:tremendous | Tremendous | 18 | 0 | 0 | 13 |
| greenhouse:nearform | Nearform | 14 | 0 | 0 | 38 |
| remotive | Remotive | 11 | 0 | 3 | 82 |
| jobicy-admin-support-apac | Jobicy | 4 | 0 | 3 | 8 |
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
| remotive | 127 | 533 | 0 | 0 | 0 | 2255 |
| real-work-from-anywhere | 114 | 0 | 546 | 0 | 0 | 5700 |
| we-work-remotely | 66 | 591 | 0 | 3 | 0 | 5972 |
| remote-ok | 33 | 80 | 546 | 1 | 0 | 919 |
| jobicy-supporting-apac | 16 | 91 | 553 | 0 | 0 | 640 |
| jobicy-admin-support-apac | 4 | 106 | 550 | 0 | 0 | 22 |
| ashby:amplify | 0 | 0 | 660 | 0 | 0 | 0 |
| ashby:ashby | 0 | 0 | 660 | 0 | 0 | 0 |
| ashby:camunda | 0 | 0 | 660 | 0 | 0 | 0 |
| ashby:supabase | 0 | 0 | 659 | 0 | 0 | 0 |
| ashby:tremendous | 0 | 0 | 659 | 0 | 0 | 0 |
| authentic-jobs | 0 | 0 | 660 | 0 | 0 | 0 |
| breezy:20four7va | 0 | 0 | 1318 | 0 | 0 | 0 |
| breezy:sourcefit | 0 | 0 | 659 | 0 | 0 | 0 |
| breezy:time-etc | 0 | 0 | 659 | 0 | 0 | 0 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 659 | 0 | 0 | 0 |
| dribbble | 0 | 0 | 660 | 0 | 0 | 0 |
| greenhouse:ghost | 0 | 0 | 659 | 0 | 0 | 0 |
| greenhouse:gitlab | 0 | 0 | 659 | 0 | 0 | 0 |
| greenhouse:grafanalabs | 0 | 0 | 659 | 0 | 0 | 0 |
| greenhouse:nearform | 0 | 0 | 658 | 0 | 0 | 0 |
| greenhouse:remotecom | 0 | 0 | 658 | 0 | 0 | 0 |
| jobspresso | 0 | 0 | 660 | 0 | 0 | 0 |
| lever:vaultoutsourcing | 0 | 0 | 658 | 0 | 0 | 0 |
| onlinejobs-ph | 0 | 0 | 660 | 0 | 0 | 0 |
| problogger | 0 | 0 | 660 | 0 | 0 | 0 |
| remote-co | 0 | 0 | 660 | 0 | 0 | 0 |
| workable:coconutva | 0 | 0 | 658 | 0 | 0 | 0 |
| workable:connectos | 0 | 0 | 658 | 0 | 0 | 0 |
| workable:crewbloom | 0 | 0 | 658 | 0 | 0 | 0 |
| workable:global-strategic | 0 | 0 | 658 | 0 | 0 | 0 |
| workable:hello-rache | 0 | 0 | 658 | 0 | 0 | 0 |
| workable:hunt-st | 0 | 0 | 658 | 0 | 0 | 0 |
| workable:myoutdesk | 0 | 0 | 658 | 0 | 0 | 0 |
| workable:outsource-access | 0 | 0 | 658 | 0 | 0 | 0 |
| workable:pearltalent | 0 | 0 | 658 | 0 | 0 | 0 |
| workable:pineapple-staffing | 0 | 0 | 658 | 0 | 0 | 0 |
| workable:rocketams | 0 | 0 | 658 | 0 | 0 | 0 |
| workable:staff-domain-inc | 0 | 0 | 658 | 0 | 0 | 0 |
| workable:superstaff | 0 | 0 | 657 | 0 | 0 | 0 |
| workable:virtualstaff365 | 0 | 0 | 657 | 0 | 0 | 0 |

## Geo & eligibility triage outcomes (last 7 days)

Breakdown of stored opportunities by Philippines eligibility verdict.

| source_id | eligible | unclear | ineligible | policy_rejected | total | qualified_rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 53 | 2 | 9 | 11 | 64 | 82.8% |
| real-work-from-anywhere | 22 | 6 | 0 | 3 | 28 | 78.6% |
| remote-ok | 9 | 9 | 6 | 15 | 24 | 37.5% |
| jobicy-supporting-apac | 4 | 1 | 0 | 1 | 5 | 80.0% |
| remotive | 0 | 0 | 1 | 1 | 1 | 0.0% |

## Yield efficiency (last 7 days)

Yield per real (changed) fetch and per 100 items seen.

| source_id | real fetches | items seen | eligible stored | yield / fetch | yield / 100 items |
| --- | ---: | ---: | ---: | ---: | ---: |
| remotive | 127 | 2255 | 0 | 0.00 | 0.00 |
| real-work-from-anywhere | 114 | 5700 | 22 | 0.19 | 0.39 |
| we-work-remotely | 66 | 5972 | 53 | 0.80 | 0.89 |
| remote-ok | 33 | 919 | 9 | 0.27 | 0.98 |
| jobicy-supporting-apac | 16 | 640 | 4 | 0.25 | 0.63 |
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
