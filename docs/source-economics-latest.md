# Source economics — latest (SP-02)

- **As of:** 2026-10-03T08:31:15.021Z
- **Windows:** 7d/14d/30d net-new by `scraped_at`
- **Reconciliation:** OK (every partition delta is zero)
- Read-only report; regenerate with `scripts/diagnostics/source-economics.ts`.

## Qualified supply (strict eligibility; first-stored proxy)

Excludes unclear/ineligible rows. Historical publication and later deactivation are not fully reconstructed.

| qualified active | qualified new 7d | per day (7d) | qualified new 30d | per day (30d) |
| ---: | ---: | ---: | ---: | ---: |
| 1385 | 629 | 89.86 | 1083 | 36.10 |

## Identity coverage (SP-01)

| total | with source_id | null source_id | coverage | active null-id |
| ---: | ---: | ---: | ---: | ---: |
| 6631 | 6631 | 0 | 100.0% | 0 |

## Net-new accepted supply

| active | net-new 7d | net-new 14d | net-new 30d |
| ---: | ---: | ---: | ---: |
| 1385 | 629 | 869 | 1083 |

## Provider-family concentration (ADR-006 §7)

- **Net-new 30d:** top family `we-work-remotely` 25.1%; top-3 63.3%.
- **Active:** top family `we-work-remotely` 26.4%; top-3 62.9%.
- `(unknown)` legacy rows are excluded from these shares.

| provider family | active | net-new 30d | net-new 7d | source ids |
| --- | ---: | ---: | ---: | --- |
| we-work-remotely | 365 | 272 | 87 | we-work-remotely |
| workable | 260 | 260 | 260 | workable:hunt-st, workable:coconutva, workable:crewbloom, workable:pearltalent, workable:rocketams, workable:hello-rache, workable:pineapple-staffing |
| breezy | 246 | 153 | 27 | breezy:20four7va, breezy:sourcefit, breezy:remote-craft, breezy:yokly, breezy:value-virtual-assistants, breezy:time-etc |
| real-work-from-anywhere | 156 | 110 | 19 | real-work-from-anywhere |
| greenhouse | 138 | 131 | 131 | greenhouse:canonical, greenhouse:remotecom, greenhouse:ghost, greenhouse:gitlab, greenhouse:grafanalabs, greenhouse:nearform |
| ashby | 88 | 88 | 88 | ashby:multiplymii, ashby:foundry-for-good, ashby:the-studio, ashby:amplify, ashby:ashby, ashby:camunda, ashby:supabase, ashby:tremendous |
| jobicy | 53 | 14 | 1 | jobicy-supporting-apac, jobicy-admin-support-apac |
| remote-ok | 51 | 35 | 2 | remote-ok |
| lever | 13 | 13 | 13 | lever:snappr |
| remotive | 13 | 5 | 1 | remotive |
| himalayas | 2 | 2 | 0 | himalayas:remote-jobs |
| authentic-jobs | 0 | 0 | 0 | authentic-jobs |
| dribbble | 0 | 0 | 0 | dribbble |

## Supply by exact source_id

| source_id | platform | active | net-new 7d | net-new 30d | inactive |
| --- | --- | ---: | ---: | ---: | ---: |
| we-work-remotely | WeWorkRemotely | 365 | 87 | 272 | 1147 |
| workable:hunt-st | Hunt St | 158 | 158 | 158 | 3 |
| real-work-from-anywhere | RealWorkFromAnywhere | 156 | 19 | 110 | 454 |
| breezy:20four7va | 20Four7VA | 126 | 19 | 64 | 128 |
| greenhouse:canonical | Greenhouse/canonical | 122 | 122 | 122 | 0 |
| breezy:sourcefit | Sourcefit | 85 | 7 | 54 | 147 |
| ashby:multiplymii | Ashby/multiplymii | 58 | 58 | 58 | 0 |
| remote-ok | RemoteOK | 51 | 2 | 35 | 1171 |
| jobicy-supporting-apac | Jobicy | 48 | 1 | 14 | 82 |
| workable:coconutva | Coconut VA | 41 | 41 | 41 | 21 |
| workable:crewbloom | CrewBloom | 35 | 35 | 35 | 13 |
| ashby:foundry-for-good | Ashby/foundry-for-good | 27 | 27 | 27 | 0 |
| workable:pearltalent | Pearl Talent | 18 | 18 | 18 | 26 |
| breezy:remote-craft | Remote Craft | 14 | 0 | 14 | 1 |
| greenhouse:remotecom | Remote.com | 14 | 8 | 8 | 608 |
| lever:snappr | Lever/snappr | 13 | 13 | 13 | 0 |
| remotive | Remotive | 13 | 1 | 5 | 89 |
| breezy:yokly | Yokly | 12 | 1 | 12 | 0 |
| breezy:value-virtual-assistants | VALUE Virtual Assistants | 9 | 0 | 9 | 0 |
| workable:rocketams | RocketAMS | 7 | 7 | 7 | 2 |
| jobicy-admin-support-apac | Jobicy | 5 | 0 | 0 | 7 |
| ashby:the-studio | Ashby/the-studio | 3 | 3 | 3 | 0 |
| himalayas:remote-jobs | Himalayas | 2 | 0 | 2 | 0 |
| greenhouse:ghost | Ghost | 1 | 0 | 0 | 10 |
| greenhouse:gitlab | GitLab | 1 | 1 | 1 | 483 |
| workable:hello-rache | Hello Rache | 1 | 1 | 1 | 3 |
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
| remotive | 133 | 535 | 0 | 0 | 0 | 2229 |
| breezy:20four7va | 116 | 0 | 1218 | 0 | 0 | 12584 |
| breezy:remote-craft | 116 | 0 | 551 | 0 | 0 | 1740 |
| breezy:sourcefit | 116 | 0 | 551 | 0 | 0 | 9688 |
| breezy:time-etc | 116 | 0 | 551 | 0 | 0 | 116 |
| breezy:value-virtual-assistants | 116 | 0 | 551 | 0 | 0 | 1044 |
| breezy:yokly | 116 | 0 | 551 | 0 | 0 | 1262 |
| greenhouse:gitlab | 116 | 0 | 551 | 0 | 0 | 23352 |
| greenhouse:nearform | 116 | 0 | 551 | 0 | 0 | 2762 |
| real-work-from-anywhere | 116 | 0 | 552 | 0 | 0 | 5800 |
| greenhouse:ghost | 115 | 0 | 551 | 1 | 0 | 690 |
| greenhouse:grafanalabs | 114 | 0 | 551 | 2 | 0 | 14873 |
| greenhouse:remotecom | 106 | 0 | 560 | 0 | 31 | 9920 |
| ashby:multiplymii | 99 | 0 | 472 | 0 | 0 | 5024 |
| we-work-remotely | 59 | 608 | 0 | 1 | 0 | 5000 |
| jobicy-supporting-apac | 24 | 86 | 557 | 1 | 0 | 960 |
| remote-ok | 12 | 104 | 552 | 0 | 0 | 504 |
| workable:hunt-st | 1 | 0 | 667 | 0 | 0 | 146 |
| workable:rocketams | 1 | 0 | 667 | 0 | 0 | 9 |
| ashby:amplify | 0 | 0 | 668 | 0 | 0 | 0 |
| ashby:ashby | 0 | 0 | 668 | 0 | 0 | 0 |
| ashby:camunda | 0 | 0 | 668 | 0 | 0 | 0 |
| ashby:supabase | 0 | 0 | 668 | 0 | 0 | 0 |
| ashby:the-studio | 0 | 0 | 142 | 0 | 0 | 0 |
| ashby:tremendous | 0 | 0 | 668 | 0 | 0 | 0 |
| authentic-jobs | 0 | 0 | 668 | 0 | 0 | 0 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 668 | 0 | 0 | 0 |
| dribbble | 0 | 0 | 668 | 0 | 0 | 0 |
| jobicy-admin-support-apac | 0 | 113 | 555 | 0 | 0 | 0 |
| jobspresso | 0 | 0 | 668 | 0 | 0 | 0 |
| lever:snappr | 0 | 0 | 142 | 0 | 0 | 0 |
| lever:vaultoutsourcing | 0 | 0 | 668 | 0 | 0 | 0 |
| onlinejobs-ph | 0 | 0 | 668 | 0 | 0 | 0 |
| problogger | 0 | 0 | 668 | 0 | 0 | 0 |
| remote-co | 0 | 0 | 668 | 0 | 0 | 0 |
| workable:coconutva | 0 | 0 | 668 | 0 | 0 | 0 |
| workable:connectos | 0 | 0 | 668 | 0 | 0 | 0 |
| workable:crewbloom | 0 | 0 | 668 | 0 | 0 | 0 |
| workable:global-strategic | 0 | 0 | 668 | 0 | 0 | 0 |
| workable:hello-rache | 0 | 0 | 668 | 0 | 0 | 0 |
| workable:myoutdesk | 0 | 0 | 668 | 0 | 0 | 0 |
| workable:outsource-access | 0 | 0 | 668 | 0 | 0 | 0 |
| workable:pearltalent | 0 | 0 | 668 | 0 | 0 | 0 |
| workable:pineapple-staffing | 0 | 0 | 668 | 0 | 0 | 0 |
| workable:staff-domain-inc | 0 | 0 | 667 | 0 | 0 | 0 |
| workable:superstaff | 0 | 0 | 667 | 0 | 0 | 0 |
| workable:virtualstaff365 | 0 | 0 | 667 | 0 | 0 | 0 |

## Geo & eligibility triage outcomes (last 7 days)

Breakdown of stored opportunities by Philippines eligibility verdict.

| source_id | eligible | unclear | ineligible | policy_rejected | total | qualified_rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| workable:hunt-st | 158 | 0 | 3 | 3 | 161 | 98.1% |
| greenhouse:canonical | 122 | 0 | 0 | 0 | 122 | 100.0% |
| we-work-remotely | 88 | 1 | 14 | 15 | 103 | 85.4% |
| ashby:multiplymii | 58 | 0 | 0 | 0 | 58 | 100.0% |
| greenhouse:remotecom | 9 | 3 | 37 | 40 | 49 | 18.4% |
| workable:coconutva | 41 | 0 | 0 | 0 | 41 | 100.0% |
| greenhouse:gitlab | 1 | 1 | 33 | 34 | 35 | 2.9% |
| workable:crewbloom | 35 | 0 | 0 | 0 | 35 | 100.0% |
| real-work-from-anywhere | 19 | 2 | 7 | 9 | 28 | 67.9% |
| ashby:foundry-for-good | 27 | 0 | 0 | 0 | 27 | 100.0% |
| breezy:20four7va | 19 | 0 | 0 | 0 | 19 | 100.0% |
| workable:pearltalent | 18 | 0 | 0 | 0 | 18 | 100.0% |
| lever:snappr | 13 | 0 | 0 | 0 | 13 | 100.0% |
| greenhouse:grafanalabs | 0 | 0 | 9 | 9 | 9 | 0.0% |
| workable:rocketams | 7 | 0 | 2 | 2 | 9 | 77.8% |
| breezy:sourcefit | 7 | 0 | 0 | 1 | 7 | 100.0% |
| ashby:the-studio | 3 | 0 | 0 | 0 | 3 | 100.0% |
| remote-ok | 2 | 1 | 0 | 1 | 3 | 66.7% |
| remotive | 1 | 0 | 1 | 1 | 2 | 50.0% |
| breezy:yokly | 1 | 0 | 0 | 0 | 1 | 100.0% |
| greenhouse:nearform | 0 | 0 | 1 | 1 | 1 | 0.0% |
| jobicy-supporting-apac | 1 | 0 | 0 | 0 | 1 | 100.0% |
| workable:hello-rache | 1 | 0 | 0 | 0 | 1 | 100.0% |

## Yield efficiency (last 7 days)

Yield per real (changed) fetch and per 100 items seen.

| source_id | real fetches | items seen | eligible stored | yield / fetch | yield / 100 items |
| --- | ---: | ---: | ---: | ---: | ---: |
| remotive | 133 | 2229 | 1 | 0.01 | 0.04 |
| breezy:20four7va | 116 | 12584 | 19 | 0.16 | 0.15 |
| breezy:remote-craft | 116 | 1740 | 0 | 0.00 | 0.00 |
| breezy:sourcefit | 116 | 9688 | 7 | 0.06 | 0.07 |
| breezy:time-etc | 116 | 116 | 0 | 0.00 | 0.00 |
| breezy:value-virtual-assistants | 116 | 1044 | 0 | 0.00 | 0.00 |
| breezy:yokly | 116 | 1262 | 1 | 0.01 | 0.08 |
| greenhouse:gitlab | 116 | 23352 | 1 | 0.01 | 0.00 |
| greenhouse:nearform | 116 | 2762 | 0 | 0.00 | 0.00 |
| real-work-from-anywhere | 116 | 5800 | 19 | 0.16 | 0.33 |
| greenhouse:ghost | 115 | 690 | 0 | 0.00 | 0.00 |
| greenhouse:grafanalabs | 114 | 14873 | 0 | 0.00 | 0.00 |
| greenhouse:remotecom | 106 | 9920 | 9 | 0.08 | 0.09 |
| ashby:multiplymii | 99 | 5024 | 58 | 0.59 | 1.15 |
| we-work-remotely | 59 | 5000 | 88 | 1.49 | 1.76 |
| jobicy-supporting-apac | 24 | 960 | 1 | 0.04 | 0.10 |
| remote-ok | 12 | 504 | 2 | 0.17 | 0.40 |
| workable:hunt-st | 1 | 146 | 158 | 158.00 | 108.22 |
| workable:rocketams | 1 | 9 | 7 | 7.00 | 77.78 |
| ashby:amplify | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:ashby | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:camunda | 0 | 0 | 0 | 0.00 | 0.00 |
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
| workable:coconutva | 0 | 0 | 41 | 0.00 | 0.00 |
| workable:connectos | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:crewbloom | 0 | 0 | 35 | 0.00 | 0.00 |
| workable:global-strategic | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:hello-rache | 0 | 0 | 1 | 0.00 | 0.00 |
| workable:myoutdesk | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:outsource-access | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:pearltalent | 0 | 0 | 18 | 0.00 | 0.00 |
| workable:pineapple-staffing | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:staff-domain-inc | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:superstaff | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:virtualstaff365 | 0 | 0 | 0 | 0.00 | 0.00 |
