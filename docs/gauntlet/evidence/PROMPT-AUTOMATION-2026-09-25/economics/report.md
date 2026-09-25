# Source economics — latest (SP-02)

- **As of:** 2026-09-25T02:31:49.978Z
- **Windows:** 7d/14d/30d net-new by `scraped_at`
- **Reconciliation:** OK (every partition delta is zero)
- Read-only report; regenerate with `scripts/diagnostics/source-economics.ts`.

## Qualified supply (strict eligibility; first-stored proxy)

Excludes unclear/ineligible rows. Historical publication and later deactivation are not fully reconstructed.

| qualified active | qualified new 7d | per day (7d) | qualified new 30d | per day (30d) |
| ---: | ---: | ---: | ---: | ---: |
| 866 | 117 | 16.71 | 458 | 15.27 |

## Identity coverage (SP-01)

| total | with source_id | null source_id | coverage | active null-id |
| ---: | ---: | ---: | ---: | ---: |
| 5679 | 5679 | 0 | 100.0% | 0 |

## Net-new accepted supply

| active | net-new 7d | net-new 14d | net-new 30d |
| ---: | ---: | ---: | ---: |
| 1105 | 211 | 306 | 552 |

## Provider-family concentration (ADR-006 §7)

- **Net-new 30d:** top family `we-work-remotely` 42.2% ⚠️ >40%; top-3 87.5% ⚠️ >70%.
- **Active:** top family `we-work-remotely` 29.6%; top-3 69.0%.
- `(unknown)` legacy rows are excluded from these shares.

| provider family | active | net-new 30d | net-new 7d | source ids |
| --- | ---: | ---: | ---: | --- |
| we-work-remotely | 327 | 233 | 51 | we-work-remotely |
| breezy | 271 | 128 | 123 | breezy:20four7va, breezy:sourcefit, breezy:remote-craft, breezy:yokly, breezy:value-virtual-assistants, breezy:time-etc |
| real-work-from-anywhere | 164 | 122 | 26 | real-work-from-anywhere |
| ashby | 121 | 1 | 0 | ashby:supabase, ashby:ashby, ashby:camunda, ashby:amplify, ashby:tremendous |
| greenhouse | 111 | 6 | 0 | greenhouse:remotecom, greenhouse:gitlab, greenhouse:grafanalabs, greenhouse:nearform, greenhouse:ghost |
| remote-ok | 51 | 37 | 6 | remote-ok |
| jobicy | 47 | 20 | 3 | jobicy-supporting-apac, jobicy-admin-support-apac |
| remotive | 13 | 5 | 2 | remotive |
| authentic-jobs | 0 | 0 | 0 | authentic-jobs |
| dribbble | 0 | 0 | 0 | dribbble |
| workable | 0 | 0 | 0 | workable:coconutva, workable:crewbloom, workable:hello-rache, workable:pearltalent, workable:pineapple-staffing |

## Supply by exact source_id

| source_id | platform | active | net-new 7d | net-new 30d | inactive |
| --- | --- | ---: | ---: | ---: | ---: |
| we-work-remotely | WeWorkRemotely | 327 | 51 | 233 | 1069 |
| real-work-from-anywhere | RealWorkFromAnywhere | 164 | 26 | 122 | 402 |
| breezy:20four7va | 20Four7VA | 127 | 43 | 47 | 106 |
| breezy:sourcefit | Sourcefit | 109 | 46 | 47 | 113 |
| ashby:supabase | Supabase | 51 | 0 | 1 | 33 |
| remote-ok | RemoteOK | 51 | 6 | 37 | 1157 |
| jobicy-supporting-apac | Jobicy | 43 | 3 | 19 | 84 |
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
| remotive | 128 | 534 | 0 | 0 | 0 | 2472 |
| real-work-from-anywhere | 107 | 0 | 555 | 0 | 0 | 5350 |
| we-work-remotely | 61 | 600 | 0 | 1 | 0 | 5098 |
| remote-ok | 25 | 82 | 555 | 0 | 0 | 1068 |
| breezy:20four7va | 20 | 0 | 1304 | 0 | 0 | 2054 |
| breezy:sourcefit | 20 | 0 | 642 | 0 | 0 | 1680 |
| breezy:remote-craft | 19 | 0 | 103 | 0 | 0 | 285 |
| breezy:value-virtual-assistants | 19 | 0 | 103 | 0 | 0 | 171 |
| breezy:yokly | 19 | 0 | 103 | 0 | 0 | 209 |
| jobicy-supporting-apac | 18 | 87 | 557 | 0 | 0 | 720 |
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
| we-work-remotely | 47 | 6 | 8 | 10 | 61 | 77.0% |
| breezy:sourcefit | 1 | 46 | 2 | 3 | 49 | 2.0% |
| breezy:20four7va | 6 | 37 | 0 | 0 | 43 | 14.0% |
| real-work-from-anywhere | 24 | 3 | 1 | 2 | 28 | 85.7% |
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
| remotive | 128 | 2472 | 2 | 0.02 | 0.08 |
| real-work-from-anywhere | 107 | 5350 | 24 | 0.22 | 0.45 |
| we-work-remotely | 61 | 5098 | 47 | 0.77 | 0.92 |
| remote-ok | 25 | 1068 | 5 | 0.20 | 0.47 |
| breezy:20four7va | 20 | 2054 | 6 | 0.30 | 0.29 |
| breezy:sourcefit | 20 | 1680 | 1 | 0.05 | 0.06 |
| breezy:remote-craft | 19 | 285 | 14 | 0.74 | 4.91 |
| breezy:value-virtual-assistants | 19 | 171 | 9 | 0.47 | 5.26 |
| breezy:yokly | 19 | 209 | 6 | 0.32 | 2.87 |
| jobicy-supporting-apac | 18 | 720 | 3 | 0.17 | 0.42 |
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
