# Source economics — latest (SP-02)

- **As of:** 2026-09-21T08:10:30.708Z
- **Windows:** 7d/14d/30d net-new by `scraped_at`
- **Reconciliation:** OK (every partition delta is zero)
- Read-only report; regenerate with `scripts/diagnostics/source-economics.ts`.

## Qualified supply (strict eligibility; first-stored proxy)

Excludes unclear/ineligible rows. Historical publication and later deactivation are not fully reconstructed.

| qualified active | qualified new 7d | per day (7d) | qualified new 30d | per day (30d) |
| ---: | ---: | ---: | ---: | ---: |
| 818 | 99 | 14.14 | 427 | 14.23 |

## Identity coverage (SP-01)

| total | with source_id | null source_id | coverage | active null-id |
| ---: | ---: | ---: | ---: | ---: |
| 5487 | 5487 | 0 | 100.0% | 0 |

## Net-new accepted supply

| active | net-new 7d | net-new 14d | net-new 30d |
| ---: | ---: | ---: | ---: |
| 987 | 100 | 183 | 428 |

## Provider-family concentration (ADR-006 §7)

- **Net-new 30d:** top family `we-work-remotely` 51.6% ⚠️ >40%; top-3 88.6% ⚠️ >70%.
- **Active:** top family `we-work-remotely` 32.1%; top-3 63.7%.
- `(unknown)` legacy rows are excluded from these shares.

| provider family | active | net-new 30d | net-new 7d | source ids |
| --- | ---: | ---: | ---: | --- |
| we-work-remotely | 317 | 221 | 62 | we-work-remotely |
| real-work-from-anywhere | 159 | 118 | 23 | real-work-from-anywhere |
| breezy | 153 | 10 | 0 | breezy:20four7va, breezy:sourcefit, breezy:time-etc |
| ashby | 129 | 7 | 0 | ashby:supabase, ashby:ashby, ashby:camunda, ashby:amplify, ashby:tremendous |
| greenhouse | 118 | 7 | 0 | greenhouse:gitlab, greenhouse:remotecom, greenhouse:grafanalabs, greenhouse:nearform, greenhouse:ghost |
| remote-ok | 51 | 40 | 7 | remote-ok |
| jobicy | 47 | 19 | 4 | jobicy-supporting-apac, jobicy-admin-support-apac |
| remotive | 13 | 6 | 4 | remotive |
| authentic-jobs | 0 | 0 | 0 | authentic-jobs |
| dribbble | 0 | 0 | 0 | dribbble |
| workable | 0 | 0 | 0 | workable:coconutva, workable:crewbloom, workable:hello-rache, workable:pearltalent, workable:pineapple-staffing |

## Supply by exact source_id

| source_id | platform | active | net-new 7d | net-new 30d | inactive |
| --- | --- | ---: | ---: | ---: | ---: |
| we-work-remotely | WeWorkRemotely | 317 | 62 | 221 | 1044 |
| real-work-from-anywhere | RealWorkFromAnywhere | 159 | 23 | 118 | 386 |
| breezy:20four7va | 20Four7VA | 86 | 0 | 8 | 104 |
| breezy:sourcefit | Sourcefit | 66 | 0 | 2 | 107 |
| ashby:supabase | Supabase | 52 | 0 | 3 | 32 |
| remote-ok | RemoteOK | 51 | 7 | 40 | 1150 |
| jobicy-supporting-apac | Jobicy | 43 | 4 | 18 | 83 |
| greenhouse:gitlab | GitLab | 40 | 0 | 1 | 325 |
| greenhouse:remotecom | Remote.com | 40 | 0 | 6 | 533 |
| ashby:ashby | Ashby | 30 | 0 | 1 | 62 |
| greenhouse:grafanalabs | Grafana Labs | 29 | 0 | 0 | 203 |
| ashby:camunda | Camunda | 20 | 0 | 3 | 47 |
| ashby:amplify | Amplify | 16 | 0 | 0 | 71 |
| remotive | Remotive | 13 | 4 | 6 | 86 |
| ashby:tremendous | Tremendous | 11 | 0 | 0 | 20 |
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
| remotive | 134 | 513 | 0 | 0 | 0 | 2388 |
| real-work-from-anywhere | 108 | 0 | 539 | 0 | 0 | 5400 |
| we-work-remotely | 78 | 568 | 0 | 1 | 0 | 6693 |
| remote-ok | 28 | 80 | 539 | 0 | 0 | 1189 |
| jobicy-supporting-apac | 17 | 87 | 543 | 0 | 0 | 680 |
| jobicy-admin-support-apac | 4 | 102 | 541 | 0 | 0 | 19 |
| ashby:amplify | 0 | 0 | 647 | 0 | 0 | 0 |
| ashby:ashby | 0 | 0 | 647 | 0 | 0 | 0 |
| ashby:camunda | 0 | 0 | 647 | 0 | 0 | 0 |
| ashby:supabase | 0 | 0 | 647 | 0 | 0 | 0 |
| ashby:tremendous | 0 | 0 | 647 | 0 | 0 | 0 |
| authentic-jobs | 0 | 0 | 647 | 0 | 0 | 0 |
| breezy:20four7va | 0 | 0 | 1294 | 0 | 0 | 0 |
| breezy:sourcefit | 0 | 0 | 647 | 0 | 0 | 0 |
| breezy:time-etc | 0 | 0 | 647 | 0 | 0 | 0 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 647 | 0 | 0 | 0 |
| dribbble | 0 | 0 | 647 | 0 | 0 | 0 |
| greenhouse:ghost | 0 | 0 | 647 | 0 | 0 | 0 |
| greenhouse:gitlab | 0 | 0 | 647 | 0 | 0 | 0 |
| greenhouse:grafanalabs | 0 | 0 | 647 | 0 | 0 | 0 |
| greenhouse:nearform | 0 | 0 | 647 | 0 | 0 | 0 |
| greenhouse:remotecom | 0 | 0 | 647 | 0 | 0 | 0 |
| jobspresso | 0 | 0 | 647 | 0 | 0 | 0 |
| lever:vaultoutsourcing | 0 | 0 | 647 | 0 | 0 | 0 |
| onlinejobs-ph | 0 | 0 | 647 | 0 | 0 | 0 |
| problogger | 0 | 0 | 647 | 0 | 0 | 0 |
| remote-co | 0 | 0 | 647 | 0 | 0 | 0 |
| workable:coconutva | 0 | 0 | 647 | 0 | 0 | 0 |
| workable:connectos | 0 | 0 | 647 | 0 | 0 | 0 |
| workable:crewbloom | 0 | 0 | 647 | 0 | 0 | 0 |
| workable:global-strategic | 0 | 0 | 647 | 0 | 0 | 0 |
| workable:hello-rache | 0 | 0 | 647 | 0 | 0 | 0 |
| workable:hunt-st | 0 | 0 | 647 | 0 | 0 | 0 |
| workable:myoutdesk | 0 | 0 | 647 | 0 | 0 | 0 |
| workable:outsource-access | 0 | 0 | 646 | 0 | 0 | 0 |
| workable:pearltalent | 0 | 0 | 646 | 0 | 0 | 0 |
| workable:pineapple-staffing | 0 | 0 | 646 | 0 | 0 | 0 |
| workable:rocketams | 0 | 0 | 646 | 0 | 0 | 0 |
| workable:staff-domain-inc | 0 | 0 | 646 | 0 | 0 | 0 |
| workable:superstaff | 0 | 0 | 646 | 0 | 0 | 0 |
| workable:virtualstaff365 | 0 | 0 | 646 | 0 | 0 | 0 |

## Geo & eligibility triage outcomes (last 7 days)

Breakdown of stored opportunities by Philippines eligibility verdict.

| source_id | eligible | unclear | ineligible | policy_rejected | total | qualified_rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 61 | 3 | 13 | 15 | 77 | 79.2% |
| real-work-from-anywhere | 23 | 4 | 1 | 5 | 28 | 82.1% |
| remote-ok | 7 | 2 | 3 | 5 | 12 | 58.3% |
| jobicy-supporting-apac | 4 | 0 | 3 | 3 | 7 | 57.1% |
| remotive | 4 | 0 | 2 | 2 | 6 | 66.7% |

## Yield efficiency (last 7 days)

Yield per real (changed) fetch and per 100 items seen.

| source_id | real fetches | items seen | eligible stored | yield / fetch | yield / 100 items |
| --- | ---: | ---: | ---: | ---: | ---: |
| remotive | 134 | 2388 | 4 | 0.03 | 0.17 |
| real-work-from-anywhere | 108 | 5400 | 23 | 0.21 | 0.43 |
| we-work-remotely | 78 | 6693 | 61 | 0.78 | 0.91 |
| remote-ok | 28 | 1189 | 7 | 0.25 | 0.59 |
| jobicy-supporting-apac | 17 | 680 | 4 | 0.24 | 0.59 |
| jobicy-admin-support-apac | 4 | 19 | 0 | 0.00 | 0.00 |
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
