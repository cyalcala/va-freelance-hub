# Source economics — latest (SP-02)

- **As of:** 2026-09-20T07:55:04.221Z
- **Windows:** 7d/14d/30d net-new by `scraped_at`
- **Reconciliation:** OK (every partition delta is zero)
- Read-only report; regenerate with `scripts/diagnostics/source-economics.ts`.

## Qualified supply (strict eligibility; first-stored proxy)

Excludes unclear/ineligible rows. Historical publication and later deactivation are not fully reconstructed.

| qualified active | qualified new 7d | per day (7d) | qualified new 30d | per day (30d) |
| ---: | ---: | ---: | ---: | ---: |
| 831 | 95 | 13.57 | 452 | 15.07 |

## Identity coverage (SP-01)

| total | with source_id | null source_id | coverage | active null-id |
| ---: | ---: | ---: | ---: | ---: |
| 5473 | 5473 | 0 | 100.0% | 0 |

## Net-new accepted supply

| active | net-new 7d | net-new 14d | net-new 30d |
| ---: | ---: | ---: | ---: |
| 1005 | 95 | 180 | 470 |

## Provider-family concentration (ADR-006 §7)

- **Net-new 30d:** top family `we-work-remotely` 46.4% ⚠️ >40%; top-3 84.3% ⚠️ >70%.
- **Active:** top family `we-work-remotely` 32.4%; top-3 63.6%.
- `(unknown)` legacy rows are excluded from these shares.

| provider family | active | net-new 30d | net-new 7d | source ids |
| --- | ---: | ---: | ---: | --- |
| we-work-remotely | 326 | 218 | 58 | we-work-remotely |
| real-work-from-anywhere | 160 | 134 | 23 | real-work-from-anywhere |
| breezy | 153 | 21 | 0 | breezy:20four7va, breezy:sourcefit, breezy:time-etc |
| ashby | 130 | 12 | 0 | ashby:supabase, ashby:ashby, ashby:camunda, ashby:amplify, ashby:tremendous |
| greenhouse | 124 | 13 | 0 | greenhouse:gitlab, greenhouse:remotecom, greenhouse:grafanalabs, greenhouse:nearform, greenhouse:ghost |
| remote-ok | 52 | 44 | 6 | remote-ok |
| jobicy | 47 | 22 | 4 | jobicy-supporting-apac, jobicy-admin-support-apac |
| remotive | 13 | 6 | 4 | remotive |
| authentic-jobs | 0 | 0 | 0 | authentic-jobs |
| dribbble | 0 | 0 | 0 | dribbble |
| workable | 0 | 0 | 0 | workable:coconutva, workable:crewbloom, workable:hello-rache, workable:pearltalent, workable:pineapple-staffing |

## Supply by exact source_id

| source_id | platform | active | net-new 7d | net-new 30d | inactive |
| --- | --- | ---: | ---: | ---: | ---: |
| we-work-remotely | WeWorkRemotely | 326 | 58 | 218 | 1025 |
| real-work-from-anywhere | RealWorkFromAnywhere | 160 | 23 | 134 | 385 |
| breezy:20four7va | 20Four7VA | 86 | 0 | 16 | 104 |
| breezy:sourcefit | Sourcefit | 66 | 0 | 5 | 107 |
| ashby:supabase | Supabase | 52 | 0 | 7 | 32 |
| remote-ok | RemoteOK | 52 | 6 | 44 | 1146 |
| jobicy-supporting-apac | Jobicy | 43 | 4 | 21 | 82 |
| greenhouse:gitlab | GitLab | 42 | 0 | 1 | 323 |
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
| remotive | 128 | 484 | 0 | 0 | 0 | 2237 |
| real-work-from-anywhere | 104 | 0 | 508 | 0 | 0 | 5200 |
| we-work-remotely | 73 | 538 | 0 | 1 | 0 | 6293 |
| remote-ok | 27 | 77 | 508 | 0 | 0 | 1145 |
| jobicy-supporting-apac | 14 | 84 | 514 | 0 | 0 | 560 |
| jobicy-admin-support-apac | 6 | 95 | 511 | 0 | 0 | 30 |
| ashby:amplify | 0 | 0 | 612 | 0 | 0 | 0 |
| ashby:ashby | 0 | 0 | 612 | 0 | 0 | 0 |
| ashby:camunda | 0 | 0 | 612 | 0 | 0 | 0 |
| ashby:supabase | 0 | 0 | 612 | 0 | 0 | 0 |
| ashby:tremendous | 0 | 0 | 612 | 0 | 0 | 0 |
| authentic-jobs | 0 | 0 | 612 | 0 | 0 | 0 |
| breezy:20four7va | 0 | 0 | 1224 | 0 | 0 | 0 |
| breezy:sourcefit | 0 | 0 | 612 | 0 | 0 | 0 |
| breezy:time-etc | 0 | 0 | 612 | 0 | 0 | 0 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 612 | 0 | 0 | 0 |
| dribbble | 0 | 0 | 612 | 0 | 0 | 0 |
| greenhouse:ghost | 0 | 0 | 612 | 0 | 0 | 0 |
| greenhouse:gitlab | 0 | 0 | 612 | 0 | 0 | 0 |
| greenhouse:grafanalabs | 0 | 0 | 612 | 0 | 0 | 0 |
| greenhouse:nearform | 0 | 0 | 612 | 0 | 0 | 0 |
| greenhouse:remotecom | 0 | 0 | 612 | 0 | 0 | 0 |
| jobspresso | 0 | 0 | 612 | 0 | 0 | 0 |
| lever:vaultoutsourcing | 0 | 0 | 612 | 0 | 0 | 0 |
| onlinejobs-ph | 0 | 0 | 612 | 0 | 0 | 0 |
| problogger | 0 | 0 | 612 | 0 | 0 | 0 |
| remote-co | 0 | 0 | 612 | 0 | 0 | 0 |
| workable:coconutva | 0 | 0 | 612 | 0 | 0 | 0 |
| workable:connectos | 0 | 0 | 612 | 0 | 0 | 0 |
| workable:crewbloom | 0 | 0 | 612 | 0 | 0 | 0 |
| workable:global-strategic | 0 | 0 | 612 | 0 | 0 | 0 |
| workable:hello-rache | 0 | 0 | 612 | 0 | 0 | 0 |
| workable:hunt-st | 0 | 0 | 612 | 0 | 0 | 0 |
| workable:myoutdesk | 0 | 0 | 612 | 0 | 0 | 0 |
| workable:outsource-access | 0 | 0 | 611 | 0 | 0 | 0 |
| workable:pearltalent | 0 | 0 | 611 | 0 | 0 | 0 |
| workable:pineapple-staffing | 0 | 0 | 611 | 0 | 0 | 0 |
| workable:rocketams | 0 | 0 | 611 | 0 | 0 | 0 |
| workable:staff-domain-inc | 0 | 0 | 611 | 0 | 0 | 0 |
| workable:superstaff | 0 | 0 | 611 | 0 | 0 | 0 |
| workable:virtualstaff365 | 0 | 0 | 611 | 0 | 0 | 0 |

## Geo & eligibility triage outcomes (last 7 days)

Breakdown of stored opportunities by Philippines eligibility verdict.

| source_id | eligible | unclear | ineligible | policy_rejected | total | qualified_rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 58 | 1 | 12 | 13 | 71 | 81.7% |
| real-work-from-anywhere | 23 | 4 | 1 | 5 | 28 | 82.1% |
| remote-ok | 6 | 2 | 3 | 5 | 11 | 54.5% |
| jobicy-supporting-apac | 4 | 0 | 2 | 2 | 6 | 66.7% |
| remotive | 4 | 0 | 2 | 2 | 6 | 66.7% |

## Yield efficiency (last 7 days)

Yield per real (changed) fetch and per 100 items seen.

| source_id | real fetches | items seen | eligible stored | yield / fetch | yield / 100 items |
| --- | ---: | ---: | ---: | ---: | ---: |
| remotive | 128 | 2237 | 4 | 0.03 | 0.18 |
| real-work-from-anywhere | 104 | 5200 | 23 | 0.22 | 0.44 |
| we-work-remotely | 73 | 6293 | 58 | 0.79 | 0.92 |
| remote-ok | 27 | 1145 | 6 | 0.22 | 0.52 |
| jobicy-supporting-apac | 14 | 560 | 4 | 0.29 | 0.71 |
| jobicy-admin-support-apac | 6 | 30 | 0 | 0.00 | 0.00 |
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
