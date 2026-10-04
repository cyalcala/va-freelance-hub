# Source economics — latest (SP-02)

- **As of:** 2026-10-04T08:43:19.245Z
- **Windows:** 7d/14d/30d net-new by `scraped_at`
- **Reconciliation:** OK (every partition delta is zero)
- Read-only report; regenerate with `scripts/diagnostics/source-economics.ts`.

## Qualified supply (strict eligibility; first-stored proxy)

Excludes unclear/ineligible rows. Historical publication and later deactivation are not fully reconstructed.

| qualified active | qualified new 7d | per day (7d) | qualified new 30d | per day (30d) |
| ---: | ---: | ---: | ---: | ---: |
| 1397 | 232 | 33.14 | 1107 | 36.90 |

## Identity coverage (SP-01)

| total | with source_id | null source_id | coverage | active null-id |
| ---: | ---: | ---: | ---: | ---: |
| 6667 | 6667 | 0 | 100.0% | 0 |

## Net-new accepted supply

| active | net-new 7d | net-new 14d | net-new 30d |
| ---: | ---: | ---: | ---: |
| 1397 | 232 | 889 | 1107 |

## Provider-family concentration (ADR-006 §7)

- **Net-new 30d:** top family `we-work-remotely` 26.5%; top-3 63.8%.
- **Active:** top family `we-work-remotely` 27.3%; top-3 63.5%.
- `(unknown)` legacy rows are excluded from these shares.

| provider family | active | net-new 30d | net-new 7d | source ids |
| --- | ---: | ---: | ---: | --- |
| we-work-remotely | 381 | 293 | 106 | we-work-remotely |
| workable | 260 | 260 | 22 | workable:hunt-st, workable:coconutva, workable:crewbloom, workable:pearltalent, workable:rocketams, workable:hello-rache, workable:pineapple-staffing |
| breezy | 246 | 153 | 26 | breezy:20four7va, breezy:sourcefit, breezy:remote-craft, breezy:yokly, breezy:value-virtual-assistants, breezy:time-etc |
| real-work-from-anywhere | 149 | 110 | 19 | real-work-from-anywhere |
| greenhouse | 138 | 131 | 1 | greenhouse:canonical, greenhouse:remotecom, greenhouse:ghost, greenhouse:gitlab, greenhouse:grafanalabs, greenhouse:nearform |
| ashby | 93 | 93 | 40 | ashby:multiplymii, ashby:foundry-for-good, ashby:gradient, ashby:the-studio, ashby:amplify, ashby:ashby, ashby:camunda, ashby:supabase, ashby:tremendous |
| jobicy | 52 | 12 | 1 | jobicy-supporting-apac, jobicy-admin-support-apac |
| remote-ok | 50 | 35 | 3 | remote-ok |
| lever | 13 | 13 | 13 | lever:snappr |
| remotive | 13 | 5 | 1 | remotive |
| himalayas | 2 | 2 | 0 | himalayas:remote-jobs |
| authentic-jobs | 0 | 0 | 0 | authentic-jobs |
| dribbble | 0 | 0 | 0 | dribbble |

## Supply by exact source_id

| source_id | platform | active | net-new 7d | net-new 30d | inactive |
| --- | --- | ---: | ---: | ---: | ---: |
| we-work-remotely | WeWorkRemotely | 381 | 106 | 293 | 1161 |
| workable:hunt-st | Hunt St | 158 | 12 | 158 | 3 |
| real-work-from-anywhere | RealWorkFromAnywhere | 149 | 19 | 110 | 461 |
| breezy:20four7va | 20Four7VA | 126 | 18 | 64 | 128 |
| greenhouse:canonical | Greenhouse/canonical | 122 | 0 | 122 | 0 |
| breezy:sourcefit | Sourcefit | 85 | 7 | 54 | 147 |
| ashby:multiplymii | Ashby/multiplymii | 58 | 5 | 58 | 0 |
| remote-ok | RemoteOK | 50 | 3 | 35 | 1173 |
| jobicy-supporting-apac | Jobicy | 47 | 1 | 12 | 83 |
| workable:coconutva | Coconut VA | 41 | 4 | 41 | 21 |
| workable:crewbloom | CrewBloom | 35 | 6 | 35 | 13 |
| ashby:foundry-for-good | Ashby/foundry-for-good | 27 | 27 | 27 | 0 |
| workable:pearltalent | Pearl Talent | 18 | 0 | 18 | 26 |
| breezy:remote-craft | Remote Craft | 14 | 0 | 14 | 1 |
| greenhouse:remotecom | Remote.com | 14 | 0 | 8 | 608 |
| lever:snappr | Lever/snappr | 13 | 13 | 13 | 0 |
| remotive | Remotive | 13 | 1 | 5 | 89 |
| breezy:yokly | Yokly | 12 | 1 | 12 | 0 |
| breezy:value-virtual-assistants | VALUE Virtual Assistants | 9 | 0 | 9 | 0 |
| workable:rocketams | RocketAMS | 7 | 0 | 7 | 2 |
| ashby:gradient | Ashby/gradient | 5 | 5 | 5 | 0 |
| jobicy-admin-support-apac | Jobicy | 5 | 0 | 0 | 7 |
| ashby:the-studio | Ashby/the-studio | 3 | 3 | 3 | 0 |
| himalayas:remote-jobs | Himalayas | 2 | 0 | 2 | 0 |
| greenhouse:ghost | Ghost | 1 | 0 | 0 | 10 |
| greenhouse:gitlab | GitLab | 1 | 1 | 1 | 483 |
| workable:hello-rache | Hello Rache | 1 | 0 | 1 | 3 |
| ashby:amplify | Amplify | 0 | 0 | 0 | 87 |
| ashby:ashby | Ashby | 0 | 0 | 0 | 92 |
| ashby:camunda | Camunda | 0 | 0 | 0 | 67 |
| ashby:supabase | Supabase | 0 | 0 | 0 | 84 |
| ashby:tremendous | Tremendous | 0 | 0 | 0 | 31 |
| authentic-jobs | AuthenticJobs | 0 | 0 | 0 | 10 |
| breezy:time-etc | Time Etc | 0 | 0 | 0 | 2 |
| dribbble | Dribbble | 0 | 0 | 0 | 113 |
| greenhouse:grafanalabs | Grafana Labs | 0 | 0 | 0 | 307 |
| greenhouse:nearform | Nearform | 0 | 0 | 0 | 55 |
| workable:pineapple-staffing | Pineapple Staffing | 0 | 0 | 0 | 3 |

## Fetch outcomes (last 7 days)

Separates real (changed) fetches from unchanged 304 polls, intentional skips, failures, and true zero-yield. `items` counts only changed fetches, so carried-forward unchanged counts never read as new supply.

| source_id | real fetches | unchanged | skips | failures | zero-yield | items |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| remotive | 131 | 530 | 0 | 0 | 0 | 2207 |
| greenhouse:remotecom | 114 | 0 | 545 | 0 | 44 | 9095 |
| breezy:20four7va | 113 | 0 | 1207 | 0 | 0 | 12398 |
| breezy:remote-craft | 113 | 0 | 547 | 0 | 0 | 1695 |
| breezy:sourcefit | 113 | 0 | 547 | 0 | 0 | 9478 |
| breezy:time-etc | 113 | 0 | 547 | 0 | 0 | 113 |
| breezy:value-virtual-assistants | 113 | 0 | 547 | 0 | 0 | 1017 |
| breezy:yokly | 113 | 0 | 547 | 0 | 0 | 1229 |
| greenhouse:gitlab | 113 | 0 | 547 | 0 | 0 | 22913 |
| greenhouse:nearform | 113 | 0 | 547 | 0 | 0 | 2677 |
| real-work-from-anywhere | 113 | 0 | 548 | 0 | 0 | 5650 |
| ashby:multiplymii | 112 | 0 | 534 | 0 | 0 | 5674 |
| greenhouse:ghost | 112 | 0 | 547 | 1 | 0 | 672 |
| greenhouse:grafanalabs | 111 | 0 | 547 | 2 | 0 | 14081 |
| we-work-remotely | 59 | 601 | 0 | 1 | 0 | 5073 |
| jobicy-supporting-apac | 24 | 85 | 551 | 1 | 0 | 960 |
| remote-ok | 12 | 101 | 548 | 0 | 0 | 503 |
| workable:hunt-st | 1 | 0 | 660 | 0 | 0 | 146 |
| workable:rocketams | 1 | 0 | 660 | 0 | 0 | 9 |
| ashby:amplify | 0 | 0 | 661 | 0 | 0 | 0 |
| ashby:ashby | 0 | 0 | 661 | 0 | 0 | 0 |
| ashby:camunda | 0 | 0 | 661 | 0 | 0 | 0 |
| ashby:foundry-for-good | 0 | 0 | 75 | 0 | 0 | 0 |
| ashby:gradient | 0 | 0 | 63 | 0 | 0 | 0 |
| ashby:supabase | 0 | 0 | 661 | 0 | 0 | 0 |
| ashby:the-studio | 0 | 0 | 217 | 0 | 0 | 0 |
| ashby:tremendous | 0 | 0 | 661 | 0 | 0 | 0 |
| authentic-jobs | 0 | 0 | 661 | 0 | 0 | 0 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 661 | 0 | 0 | 0 |
| dribbble | 0 | 0 | 661 | 0 | 0 | 0 |
| jobicy-admin-support-apac | 0 | 110 | 551 | 0 | 0 | 0 |
| jobspresso | 0 | 0 | 661 | 0 | 0 | 0 |
| lever:snappr | 0 | 0 | 217 | 0 | 0 | 0 |
| lever:vaultoutsourcing | 0 | 0 | 661 | 0 | 0 | 0 |
| onlinejobs-ph | 0 | 0 | 661 | 0 | 0 | 0 |
| problogger | 0 | 0 | 661 | 0 | 0 | 0 |
| remote-co | 0 | 0 | 661 | 0 | 0 | 0 |
| workable:coconutva | 0 | 0 | 661 | 0 | 0 | 0 |
| workable:connectos | 0 | 0 | 661 | 0 | 0 | 0 |
| workable:crewbloom | 0 | 0 | 661 | 0 | 0 | 0 |
| workable:global-strategic | 0 | 0 | 661 | 0 | 0 | 0 |
| workable:hello-rache | 0 | 0 | 661 | 0 | 0 | 0 |
| workable:myoutdesk | 0 | 0 | 661 | 0 | 0 | 0 |
| workable:outsource-access | 0 | 0 | 661 | 0 | 0 | 0 |
| workable:pearltalent | 0 | 0 | 661 | 0 | 0 | 0 |
| workable:pineapple-staffing | 0 | 0 | 661 | 0 | 0 | 0 |
| workable:staff-domain-inc | 0 | 0 | 660 | 0 | 0 | 0 |
| workable:superstaff | 0 | 0 | 660 | 0 | 0 | 0 |
| workable:virtualstaff365 | 0 | 0 | 660 | 0 | 0 | 0 |

## Geo & eligibility triage outcomes (last 7 days)

Breakdown of stored opportunities by Philippines eligibility verdict.

| source_id | eligible | unclear | ineligible | policy_rejected | total | qualified_rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 107 | 1 | 14 | 15 | 122 | 87.7% |
| greenhouse:gitlab | 1 | 1 | 32 | 33 | 34 | 2.9% |
| real-work-from-anywhere | 19 | 2 | 7 | 9 | 28 | 67.9% |
| ashby:foundry-for-good | 27 | 0 | 0 | 0 | 27 | 100.0% |
| breezy:20four7va | 18 | 0 | 0 | 0 | 18 | 100.0% |
| workable:hunt-st | 12 | 0 | 3 | 3 | 15 | 80.0% |
| lever:snappr | 13 | 0 | 0 | 0 | 13 | 100.0% |
| greenhouse:grafanalabs | 0 | 0 | 9 | 9 | 9 | 0.0% |
| breezy:sourcefit | 7 | 0 | 0 | 1 | 7 | 100.0% |
| workable:crewbloom | 6 | 0 | 0 | 0 | 6 | 100.0% |
| ashby:gradient | 5 | 0 | 0 | 0 | 5 | 100.0% |
| ashby:multiplymii | 5 | 0 | 0 | 0 | 5 | 100.0% |
| remote-ok | 3 | 1 | 0 | 1 | 4 | 75.0% |
| workable:coconutva | 4 | 0 | 0 | 0 | 4 | 100.0% |
| ashby:the-studio | 3 | 0 | 0 | 0 | 3 | 100.0% |
| greenhouse:remotecom | 0 | 0 | 2 | 2 | 2 | 0.0% |
| remotive | 1 | 0 | 1 | 1 | 2 | 50.0% |
| workable:rocketams | 0 | 0 | 2 | 2 | 2 | 0.0% |
| breezy:yokly | 1 | 0 | 0 | 0 | 1 | 100.0% |
| greenhouse:nearform | 0 | 0 | 1 | 1 | 1 | 0.0% |
| jobicy-supporting-apac | 1 | 0 | 0 | 0 | 1 | 100.0% |

## Yield efficiency (last 7 days)

Yield per real (changed) fetch and per 100 items seen.

| source_id | real fetches | items seen | eligible stored | yield / fetch | yield / 100 items |
| --- | ---: | ---: | ---: | ---: | ---: |
| remotive | 131 | 2207 | 1 | 0.01 | 0.05 |
| greenhouse:remotecom | 114 | 9095 | 0 | 0.00 | 0.00 |
| breezy:20four7va | 113 | 12398 | 18 | 0.16 | 0.15 |
| breezy:remote-craft | 113 | 1695 | 0 | 0.00 | 0.00 |
| breezy:sourcefit | 113 | 9478 | 7 | 0.06 | 0.07 |
| breezy:time-etc | 113 | 113 | 0 | 0.00 | 0.00 |
| breezy:value-virtual-assistants | 113 | 1017 | 0 | 0.00 | 0.00 |
| breezy:yokly | 113 | 1229 | 1 | 0.01 | 0.08 |
| greenhouse:gitlab | 113 | 22913 | 1 | 0.01 | 0.00 |
| greenhouse:nearform | 113 | 2677 | 0 | 0.00 | 0.00 |
| real-work-from-anywhere | 113 | 5650 | 19 | 0.17 | 0.34 |
| ashby:multiplymii | 112 | 5674 | 5 | 0.04 | 0.09 |
| greenhouse:ghost | 112 | 672 | 0 | 0.00 | 0.00 |
| greenhouse:grafanalabs | 111 | 14081 | 0 | 0.00 | 0.00 |
| we-work-remotely | 59 | 5073 | 107 | 1.81 | 2.11 |
| jobicy-supporting-apac | 24 | 960 | 1 | 0.04 | 0.10 |
| remote-ok | 12 | 503 | 3 | 0.25 | 0.60 |
| workable:hunt-st | 1 | 146 | 12 | 12.00 | 8.22 |
| workable:rocketams | 1 | 9 | 0 | 0.00 | 0.00 |
| ashby:amplify | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:ashby | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:camunda | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:foundry-for-good | 0 | 0 | 27 | 0.00 | 0.00 |
| ashby:gradient | 0 | 0 | 5 | 0.00 | 0.00 |
| ashby:supabase | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:the-studio | 0 | 0 | 3 | 0.00 | 0.00 |
| ashby:tremendous | 0 | 0 | 0 | 0.00 | 0.00 |
| authentic-jobs | 0 | 0 | 0 | 0.00 | 0.00 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 0 | 0.00 | 0.00 |
| dribbble | 0 | 0 | 0 | 0.00 | 0.00 |
| jobicy-admin-support-apac | 0 | 0 | 0 | 0.00 | 0.00 |
| jobspresso | 0 | 0 | 0 | 0.00 | 0.00 |
| lever:snappr | 0 | 0 | 13 | 0.00 | 0.00 |
| lever:vaultoutsourcing | 0 | 0 | 0 | 0.00 | 0.00 |
| onlinejobs-ph | 0 | 0 | 0 | 0.00 | 0.00 |
| problogger | 0 | 0 | 0 | 0.00 | 0.00 |
| remote-co | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:coconutva | 0 | 0 | 4 | 0.00 | 0.00 |
| workable:connectos | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:crewbloom | 0 | 0 | 6 | 0.00 | 0.00 |
| workable:global-strategic | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:hello-rache | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:myoutdesk | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:outsource-access | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:pearltalent | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:pineapple-staffing | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:staff-domain-inc | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:superstaff | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:virtualstaff365 | 0 | 0 | 0 | 0.00 | 0.00 |
