# Source economics — latest (SP-02)

- **As of:** 2026-09-25T10:31:33.313Z
- **Windows:** 7d/14d/30d net-new by `scraped_at`
- **Reconciliation:** OK (every partition delta is zero)
- Read-only report; regenerate with `scripts/diagnostics/source-economics.ts`.

## Qualified supply (strict eligibility; first-stored proxy)

Excludes unclear/ineligible rows. Historical publication and later deactivation are not fully reconstructed.

| qualified active | qualified new 7d | per day (7d) | qualified new 30d | per day (30d) |
| ---: | ---: | ---: | ---: | ---: |
| 854 | 202 | 28.86 | 530 | 17.67 |

## Identity coverage (SP-01)

| total | with source_id | null source_id | coverage | active null-id |
| ---: | ---: | ---: | ---: | ---: |
| 5703 | 5703 | 0 | 100.0% | 0 |

## Net-new accepted supply

| active | net-new 7d | net-new 14d | net-new 30d |
| ---: | ---: | ---: | ---: |
| 854 | 202 | 291 | 530 |

## Provider-family concentration (ADR-006 §7)

- **Net-new 30d:** top family `we-work-remotely` 43.8% ⚠️ >40%; top-3 88.5% ⚠️ >70%.
- **Active:** top family `we-work-remotely` 38.5%; top-3 87.2% ⚠️ >70%.
- `(unknown)` legacy rows are excluded from these shares.

| provider family | active | net-new 30d | net-new 7d | source ids |
| --- | ---: | ---: | ---: | --- |
| we-work-remotely | 329 | 232 | 52 | we-work-remotely |
| breezy | 245 | 112 | 107 | breezy:20four7va, breezy:sourcefit, breezy:remote-craft, breezy:yokly, breezy:value-virtual-assistants, breezy:time-etc |
| real-work-from-anywhere | 171 | 125 | 33 | real-work-from-anywhere |
| remote-ok | 51 | 36 | 6 | remote-ok |
| jobicy | 45 | 20 | 2 | jobicy-supporting-apac, jobicy-admin-support-apac |
| remotive | 12 | 5 | 2 | remotive |
| greenhouse | 1 | 0 | 0 | greenhouse:ghost, greenhouse:gitlab, greenhouse:grafanalabs, greenhouse:nearform, greenhouse:remotecom |
| ashby | 0 | 0 | 0 | ashby:amplify, ashby:ashby, ashby:camunda, ashby:supabase, ashby:tremendous |
| authentic-jobs | 0 | 0 | 0 | authentic-jobs |
| dribbble | 0 | 0 | 0 | dribbble |
| workable | 0 | 0 | 0 | workable:coconutva, workable:crewbloom, workable:hello-rache, workable:pearltalent, workable:pineapple-staffing |

## Supply by exact source_id

| source_id | platform | active | net-new 7d | net-new 30d | inactive |
| --- | --- | ---: | ---: | ---: | ---: |
| we-work-remotely | WeWorkRemotely | 329 | 52 | 232 | 1071 |
| real-work-from-anywhere | RealWorkFromAnywhere | 171 | 33 | 125 | 405 |
| breezy:20four7va | 20Four7VA | 126 | 43 | 47 | 107 |
| breezy:sourcefit | Sourcefit | 84 | 30 | 31 | 141 |
| remote-ok | RemoteOK | 51 | 6 | 36 | 1157 |
| jobicy-supporting-apac | Jobicy | 41 | 2 | 19 | 86 |
| breezy:remote-craft | Remote Craft | 14 | 14 | 14 | 1 |
| remotive | Remotive | 12 | 2 | 5 | 88 |
| breezy:yokly | Yokly | 11 | 11 | 11 | 0 |
| breezy:value-virtual-assistants | VALUE Virtual Assistants | 9 | 9 | 9 | 0 |
| jobicy-admin-support-apac | Jobicy | 4 | 0 | 1 | 8 |
| breezy:time-etc | Time Etc | 1 | 0 | 0 | 1 |
| greenhouse:ghost | Ghost | 1 | 0 | 0 | 10 |
| ashby:amplify | Amplify | 0 | 0 | 0 | 87 |
| ashby:ashby | Ashby | 0 | 0 | 0 | 92 |
| ashby:camunda | Camunda | 0 | 0 | 0 | 67 |
| ashby:supabase | Supabase | 0 | 0 | 0 | 84 |
| ashby:tremendous | Tremendous | 0 | 0 | 0 | 31 |
| authentic-jobs | AuthenticJobs | 0 | 0 | 0 | 10 |
| dribbble | Dribbble | 0 | 0 | 0 | 113 |
| greenhouse:gitlab | GitLab | 0 | 0 | 0 | 365 |
| greenhouse:grafanalabs | Grafana Labs | 0 | 0 | 0 | 232 |
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
| remotive | 128 | 537 | 0 | 0 | 0 | 2486 |
| real-work-from-anywhere | 108 | 0 | 557 | 0 | 0 | 5400 |
| we-work-remotely | 63 | 601 | 0 | 1 | 0 | 5258 |
| breezy:20four7va | 28 | 0 | 1302 | 0 | 0 | 2886 |
| breezy:sourcefit | 28 | 0 | 637 | 0 | 0 | 2350 |
| breezy:remote-craft | 27 | 0 | 143 | 0 | 0 | 405 |
| breezy:value-virtual-assistants | 27 | 0 | 143 | 0 | 0 | 243 |
| breezy:yokly | 27 | 0 | 143 | 0 | 0 | 297 |
| remote-ok | 25 | 83 | 557 | 0 | 0 | 1068 |
| jobicy-supporting-apac | 17 | 87 | 560 | 1 | 0 | 680 |
| jobicy-admin-support-apac | 3 | 102 | 559 | 1 | 0 | 10 |
| breezy:time-etc | 1 | 0 | 664 | 0 | 0 | 1 |
| greenhouse:ghost | 1 | 0 | 664 | 0 | 0 | 6 |
| greenhouse:nearform | 1 | 0 | 664 | 0 | 0 | 24 |
| ashby:amplify | 0 | 0 | 665 | 0 | 0 | 0 |
| ashby:ashby | 0 | 0 | 665 | 0 | 0 | 0 |
| ashby:camunda | 0 | 0 | 665 | 0 | 0 | 0 |
| ashby:supabase | 0 | 0 | 665 | 0 | 0 | 0 |
| ashby:tremendous | 0 | 0 | 665 | 0 | 0 | 0 |
| authentic-jobs | 0 | 0 | 665 | 0 | 0 | 0 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 665 | 0 | 0 | 0 |
| dribbble | 0 | 0 | 665 | 0 | 0 | 0 |
| greenhouse:gitlab | 0 | 0 | 665 | 0 | 0 | 0 |
| greenhouse:grafanalabs | 0 | 0 | 665 | 0 | 0 | 0 |
| greenhouse:remotecom | 0 | 0 | 665 | 0 | 0 | 0 |
| jobspresso | 0 | 0 | 665 | 0 | 0 | 0 |
| lever:vaultoutsourcing | 0 | 0 | 665 | 0 | 0 | 0 |
| onlinejobs-ph | 0 | 0 | 665 | 0 | 0 | 0 |
| problogger | 0 | 0 | 665 | 0 | 0 | 0 |
| remote-co | 0 | 0 | 665 | 0 | 0 | 0 |
| workable:coconutva | 0 | 0 | 665 | 0 | 0 | 0 |
| workable:connectos | 0 | 0 | 665 | 0 | 0 | 0 |
| workable:crewbloom | 0 | 0 | 665 | 0 | 0 | 0 |
| workable:global-strategic | 0 | 0 | 665 | 0 | 0 | 0 |
| workable:hello-rache | 0 | 0 | 665 | 0 | 0 | 0 |
| workable:hunt-st | 0 | 0 | 665 | 0 | 0 | 0 |
| workable:myoutdesk | 0 | 0 | 665 | 0 | 0 | 0 |
| workable:outsource-access | 0 | 0 | 665 | 0 | 0 | 0 |
| workable:pearltalent | 0 | 0 | 665 | 0 | 0 | 0 |
| workable:pineapple-staffing | 0 | 0 | 665 | 0 | 0 | 0 |
| workable:rocketams | 0 | 0 | 665 | 0 | 0 | 0 |
| workable:staff-domain-inc | 0 | 0 | 665 | 0 | 0 | 0 |
| workable:superstaff | 0 | 0 | 665 | 0 | 0 | 0 |
| workable:virtualstaff365 | 0 | 0 | 665 | 0 | 0 | 0 |

## Geo & eligibility triage outcomes (last 7 days)

Breakdown of stored opportunities by Philippines eligibility verdict.

| source_id | eligible | unclear | ineligible | policy_rejected | total | qualified_rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 52 | 2 | 6 | 8 | 60 | 86.7% |
| breezy:sourcefit | 30 | 1 | 21 | 22 | 52 | 57.7% |
| breezy:20four7va | 43 | 0 | 0 | 0 | 43 | 100.0% |
| real-work-from-anywhere | 33 | 1 | 2 | 3 | 36 | 91.7% |
| breezy:remote-craft | 14 | 0 | 1 | 0 | 15 | 93.3% |
| remote-ok | 6 | 2 | 5 | 7 | 13 | 46.2% |
| breezy:yokly | 11 | 0 | 0 | 0 | 11 | 100.0% |
| breezy:value-virtual-assistants | 9 | 0 | 0 | 0 | 9 | 100.0% |
| remotive | 2 | 0 | 3 | 3 | 5 | 40.0% |
| greenhouse:ghost | 0 | 0 | 4 | 4 | 4 | 0.0% |
| jobicy-supporting-apac | 2 | 0 | 1 | 1 | 3 | 66.7% |
| greenhouse:nearform | 0 | 0 | 2 | 2 | 2 | 0.0% |
| breezy:time-etc | 0 | 0 | 1 | 1 | 1 | 0.0% |

## Yield efficiency (last 7 days)

Yield per real (changed) fetch and per 100 items seen.

| source_id | real fetches | items seen | eligible stored | yield / fetch | yield / 100 items |
| --- | ---: | ---: | ---: | ---: | ---: |
| remotive | 128 | 2486 | 2 | 0.02 | 0.08 |
| real-work-from-anywhere | 108 | 5400 | 33 | 0.31 | 0.61 |
| we-work-remotely | 63 | 5258 | 52 | 0.83 | 0.99 |
| breezy:20four7va | 28 | 2886 | 43 | 1.54 | 1.49 |
| breezy:sourcefit | 28 | 2350 | 30 | 1.07 | 1.28 |
| breezy:remote-craft | 27 | 405 | 14 | 0.52 | 3.46 |
| breezy:value-virtual-assistants | 27 | 243 | 9 | 0.33 | 3.70 |
| breezy:yokly | 27 | 297 | 11 | 0.41 | 3.70 |
| remote-ok | 25 | 1068 | 6 | 0.24 | 0.56 |
| jobicy-supporting-apac | 17 | 680 | 2 | 0.12 | 0.29 |
| jobicy-admin-support-apac | 3 | 10 | 0 | 0.00 | 0.00 |
| breezy:time-etc | 1 | 1 | 0 | 0.00 | 0.00 |
| greenhouse:ghost | 1 | 6 | 0 | 0.00 | 0.00 |
| greenhouse:nearform | 1 | 24 | 0 | 0.00 | 0.00 |
| ashby:amplify | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:ashby | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:camunda | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:supabase | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:tremendous | 0 | 0 | 0 | 0.00 | 0.00 |
| authentic-jobs | 0 | 0 | 0 | 0.00 | 0.00 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 0 | 0.00 | 0.00 |
| dribbble | 0 | 0 | 0 | 0.00 | 0.00 |
| greenhouse:gitlab | 0 | 0 | 0 | 0.00 | 0.00 |
| greenhouse:grafanalabs | 0 | 0 | 0 | 0.00 | 0.00 |
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
