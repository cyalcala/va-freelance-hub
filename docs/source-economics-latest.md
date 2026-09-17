# Source economics — latest (SP-02)

- **As of:** 2026-09-17T07:57:28.839Z
- **Windows:** 7d/14d/30d net-new by `scraped_at`
- **Reconciliation:** OK (every partition delta is zero)
- Read-only report; regenerate with `scripts/diagnostics/source-economics.ts`.

## Qualified supply (strict eligibility; first-stored proxy)

Excludes unclear/ineligible rows. Historical publication and later deactivation are not fully reconstructed.

| qualified active | qualified new 7d | per day (7d) | qualified new 30d | per day (30d) |
| ---: | ---: | ---: | ---: | ---: |
| 876 | 95 | 13.57 | 490 | 16.33 |

## Identity coverage (SP-01)

| total | with source_id | null source_id | coverage | active null-id |
| ---: | ---: | ---: | ---: | ---: |
| 5435 | 5435 | 0 | 100.0% | 0 |

## Net-new accepted supply

| active | net-new 7d | net-new 14d | net-new 30d |
| ---: | ---: | ---: | ---: |
| 1083 | 95 | 191 | 540 |

## Provider-family concentration (ADR-006 §7)

- **Net-new 30d:** top family `we-work-remotely` 49.1% ⚠️ >40%; top-3 84.1% ⚠️ >70%.
- **Active:** top family `we-work-remotely` 33.1%; top-3 64.0%.
- `(unknown)` legacy rows are excluded from these shares.

| provider family | active | net-new 30d | net-new 7d | source ids |
| --- | ---: | ---: | ---: | --- |
| we-work-remotely | 359 | 265 | 57 | we-work-remotely |
| real-work-from-anywhere | 171 | 138 | 29 | real-work-from-anywhere |
| breezy | 163 | 30 | 0 | breezy:20four7va, breezy:sourcefit, breezy:time-etc |
| ashby | 144 | 13 | 0 | ashby:supabase, ashby:ashby, ashby:camunda, ashby:amplify, ashby:tremendous |
| greenhouse | 137 | 16 | 0 | greenhouse:gitlab, greenhouse:remotecom, greenhouse:grafanalabs, greenhouse:nearform, greenhouse:ghost |
| remote-ok | 54 | 51 | 6 | remote-ok |
| jobicy | 45 | 23 | 2 | jobicy-supporting-apac, jobicy-admin-support-apac |
| remotive | 10 | 4 | 1 | remotive |
| authentic-jobs | 0 | 0 | 0 | authentic-jobs |
| dribbble | 0 | 0 | 0 | dribbble |
| workable | 0 | 0 | 0 | workable:coconutva, workable:crewbloom, workable:hello-rache, workable:pearltalent, workable:pineapple-staffing |

## Supply by exact source_id

| source_id | platform | active | net-new 7d | net-new 30d | inactive |
| --- | --- | ---: | ---: | ---: | ---: |
| we-work-remotely | WeWorkRemotely | 359 | 57 | 265 | 973 |
| real-work-from-anywhere | RealWorkFromAnywhere | 171 | 29 | 138 | 367 |
| breezy:20four7va | 20Four7VA | 93 | 0 | 23 | 97 |
| breezy:sourcefit | Sourcefit | 69 | 0 | 7 | 104 |
| remote-ok | RemoteOK | 54 | 6 | 51 | 1139 |
| ashby:supabase | Supabase | 53 | 0 | 7 | 31 |
| greenhouse:gitlab | GitLab | 43 | 0 | 1 | 322 |
| greenhouse:remotecom | Remote.com | 42 | 0 | 15 | 531 |
| greenhouse:grafanalabs | Grafana Labs | 41 | 0 | 0 | 191 |
| jobicy-supporting-apac | Jobicy | 41 | 2 | 21 | 82 |
| ashby:ashby | Ashby | 32 | 0 | 2 | 60 |
| ashby:camunda | Camunda | 22 | 0 | 4 | 45 |
| ashby:amplify | Amplify | 19 | 0 | 0 | 68 |
| ashby:tremendous | Tremendous | 18 | 0 | 0 | 13 |
| greenhouse:nearform | Nearform | 10 | 0 | 0 | 42 |
| remotive | Remotive | 10 | 1 | 4 | 84 |
| jobicy-admin-support-apac | Jobicy | 4 | 0 | 2 | 8 |
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
| remotive | 124 | 481 | 0 | 0 | 0 | 2029 |
| real-work-from-anywhere | 104 | 0 | 501 | 0 | 0 | 5200 |
| we-work-remotely | 70 | 535 | 0 | 0 | 0 | 6161 |
| remote-ok | 32 | 72 | 501 | 0 | 0 | 1325 |
| jobicy-supporting-apac | 11 | 85 | 508 | 1 | 0 | 440 |
| jobicy-admin-support-apac | 7 | 93 | 505 | 0 | 0 | 35 |
| ashby:amplify | 0 | 0 | 605 | 0 | 0 | 0 |
| ashby:ashby | 0 | 0 | 605 | 0 | 0 | 0 |
| ashby:camunda | 0 | 0 | 605 | 0 | 0 | 0 |
| ashby:supabase | 0 | 0 | 605 | 0 | 0 | 0 |
| ashby:tremendous | 0 | 0 | 605 | 0 | 0 | 0 |
| authentic-jobs | 0 | 0 | 605 | 0 | 0 | 0 |
| breezy:20four7va | 0 | 0 | 1210 | 0 | 0 | 0 |
| breezy:sourcefit | 0 | 0 | 605 | 0 | 0 | 0 |
| breezy:time-etc | 0 | 0 | 605 | 0 | 0 | 0 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 605 | 0 | 0 | 0 |
| dribbble | 0 | 0 | 605 | 0 | 0 | 0 |
| greenhouse:ghost | 0 | 0 | 605 | 0 | 0 | 0 |
| greenhouse:gitlab | 0 | 0 | 605 | 0 | 0 | 0 |
| greenhouse:grafanalabs | 0 | 0 | 605 | 0 | 0 | 0 |
| greenhouse:nearform | 0 | 0 | 605 | 0 | 0 | 0 |
| greenhouse:remotecom | 0 | 0 | 605 | 0 | 0 | 0 |
| jobspresso | 0 | 0 | 605 | 0 | 0 | 0 |
| lever:vaultoutsourcing | 0 | 0 | 605 | 0 | 0 | 0 |
| onlinejobs-ph | 0 | 0 | 605 | 0 | 0 | 0 |
| problogger | 0 | 0 | 605 | 0 | 0 | 0 |
| remote-co | 0 | 0 | 605 | 0 | 0 | 0 |
| workable:coconutva | 0 | 0 | 605 | 0 | 0 | 0 |
| workable:connectos | 0 | 0 | 605 | 0 | 0 | 0 |
| workable:crewbloom | 0 | 0 | 605 | 0 | 0 | 0 |
| workable:global-strategic | 0 | 0 | 605 | 0 | 0 | 0 |
| workable:hello-rache | 0 | 0 | 605 | 0 | 0 | 0 |
| workable:hunt-st | 0 | 0 | 605 | 0 | 0 | 0 |
| workable:myoutdesk | 0 | 0 | 605 | 0 | 0 | 0 |
| workable:outsource-access | 0 | 0 | 604 | 0 | 0 | 0 |
| workable:pearltalent | 0 | 0 | 604 | 0 | 0 | 0 |
| workable:pineapple-staffing | 0 | 0 | 604 | 0 | 0 | 0 |
| workable:rocketams | 0 | 0 | 604 | 0 | 0 | 0 |
| workable:staff-domain-inc | 0 | 0 | 604 | 0 | 0 | 0 |
| workable:superstaff | 0 | 0 | 604 | 0 | 0 | 0 |
| workable:virtualstaff365 | 0 | 0 | 604 | 0 | 0 | 0 |

## Geo & eligibility triage outcomes (last 7 days)

Breakdown of stored opportunities by Philippines eligibility verdict.

| source_id | eligible | unclear | ineligible | policy_rejected | total | qualified_rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 57 | 1 | 14 | 15 | 72 | 79.2% |
| real-work-from-anywhere | 29 | 5 | 1 | 6 | 35 | 82.9% |
| remote-ok | 6 | 4 | 3 | 7 | 13 | 46.2% |
| jobicy-supporting-apac | 2 | 0 | 2 | 2 | 4 | 50.0% |
| remotive | 1 | 0 | 1 | 1 | 2 | 50.0% |

## Yield efficiency (last 7 days)

Yield per real (changed) fetch and per 100 items seen.

| source_id | real fetches | items seen | eligible stored | yield / fetch | yield / 100 items |
| --- | ---: | ---: | ---: | ---: | ---: |
| remotive | 124 | 2029 | 1 | 0.01 | 0.05 |
| real-work-from-anywhere | 104 | 5200 | 29 | 0.28 | 0.56 |
| we-work-remotely | 70 | 6161 | 57 | 0.81 | 0.93 |
| remote-ok | 32 | 1325 | 6 | 0.19 | 0.45 |
| jobicy-supporting-apac | 11 | 440 | 2 | 0.18 | 0.45 |
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
