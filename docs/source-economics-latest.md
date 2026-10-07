# Source economics — latest (SP-02)

- **As of:** 2026-10-07T09:10:53.180Z
- **Windows:** 7d/14d/30d net-new by `scraped_at`
- **Reconciliation:** OK (every partition delta is zero)
- Read-only report; regenerate with `scripts/diagnostics/source-economics.ts`.

## Qualified supply (strict eligibility; first-stored proxy)

Excludes unclear/ineligible rows. Historical publication and later deactivation are not fully reconstructed.

| qualified active | qualified new 7d | per day (7d) | qualified new 30d | per day (30d) |
| ---: | ---: | ---: | ---: | ---: |
| 1518 | 321 | 45.86 | 1217 | 40.57 |

## Identity coverage (SP-01)

| total | with source_id | null source_id | coverage | active null-id |
| ---: | ---: | ---: | ---: | ---: |
| 7037 | 7037 | 0 | 100.0% | 0 |

## Net-new accepted supply

| active | net-new 7d | net-new 14d | net-new 30d |
| ---: | ---: | ---: | ---: |
| 1518 | 321 | 1019 | 1217 |

## Provider-family concentration (ADR-006 §7)

- **Net-new 30d:** top family `we-work-remotely` 26.4%; top-3 61.8%.
- **Active:** top family `we-work-remotely` 27.0%; top-3 61.5%.
- `(unknown)` legacy rows are excluded from these shares.

| provider family | active | net-new 30d | net-new 7d | source ids |
| --- | ---: | ---: | ---: | --- |
| we-work-remotely | 410 | 321 | 116 | we-work-remotely |
| workable | 270 | 270 | 32 | workable:hunt-st, workable:coconutva, workable:crewbloom, workable:pearltalent, workable:rocketams, workable:hello-rache, workable:pineapple-staffing |
| breezy | 254 | 161 | 23 | breezy:20four7va, breezy:sourcefit, breezy:remote-craft, breezy:yokly, breezy:value-virtual-assistants, breezy:time-etc |
| real-work-from-anywhere | 150 | 104 | 20 | real-work-from-anywhere |
| greenhouse | 142 | 135 | 4 | greenhouse:canonical, greenhouse:remotecom, greenhouse:gitlab, greenhouse:ghost, greenhouse:trainingthestreet, greenhouse:grafanalabs, greenhouse:nearform |
| ashby | 113 | 113 | 57 | ashby:multiplymii, ashby:foundry-for-good, ashby:gradient, ashby:payscale, ashby:circulareconomysystems, ashby:molecule, ashby:the-studio, ashby:getground, ashby:homera-health, ashby:amplify, ashby:ashby, ashby:camunda, ashby:supabase, ashby:tremendous |
| lever | 61 | 61 | 61 | lever:truezerotech, lever:snappr, lever:deliverect, lever:brafton, lever:decilegroup, lever:lwolf, lever:repurposeglobal, lever:beaverprocess, lever:90seconds, lever:hso, lever:trustarc |
| jobicy | 51 | 9 | 1 | jobicy-supporting-apac, jobicy-admin-support-apac |
| remote-ok | 51 | 35 | 5 | remote-ok |
| remotive | 14 | 6 | 2 | remotive |
| himalayas | 2 | 2 | 0 | himalayas:remote-jobs |
| authentic-jobs | 0 | 0 | 0 | authentic-jobs |
| dribbble | 0 | 0 | 0 | dribbble |

## Supply by exact source_id

| source_id | platform | active | net-new 7d | net-new 30d | inactive |
| --- | --- | ---: | ---: | ---: | ---: |
| we-work-remotely | WeWorkRemotely | 410 | 116 | 321 | 1193 |
| workable:hunt-st | Hunt St | 168 | 22 | 168 | 3 |
| real-work-from-anywhere | RealWorkFromAnywhere | 150 | 20 | 104 | 469 |
| breezy:20four7va | 20Four7VA | 129 | 14 | 67 | 128 |
| greenhouse:canonical | Canonical | 124 | 2 | 124 | 188 |
| breezy:sourcefit | Breezy/sourcefit | 90 | 8 | 59 | 148 |
| ashby:multiplymii | Ashby/multiplymii | 65 | 9 | 65 | 0 |
| remote-ok | RemoteOK | 51 | 5 | 35 | 1175 |
| jobicy-supporting-apac | Jobicy | 46 | 1 | 9 | 86 |
| workable:coconutva | Coconut VA | 41 | 4 | 41 | 21 |
| workable:crewbloom | CrewBloom | 35 | 6 | 35 | 13 |
| ashby:foundry-for-good | Ashby/foundry-for-good | 27 | 27 | 27 | 0 |
| workable:pearltalent | Pearl Talent | 18 | 0 | 18 | 26 |
| lever:truezerotech | Lever/truezerotech | 17 | 17 | 17 | 0 |
| breezy:remote-craft | Remote Craft | 14 | 0 | 14 | 1 |
| greenhouse:remotecom | Remote.com | 14 | 0 | 8 | 608 |
| remotive | Remotive | 14 | 2 | 6 | 89 |
| lever:snappr | Lever/snappr | 13 | 13 | 13 | 0 |
| breezy:yokly | Yokly | 12 | 1 | 12 | 0 |
| breezy:value-virtual-assistants | VALUE Virtual Assistants | 9 | 0 | 9 | 1 |
| lever:deliverect | Lever/deliverect | 9 | 9 | 9 | 0 |
| workable:rocketams | RocketAMS | 7 | 0 | 7 | 2 |
| ashby:gradient | Ashby/gradient | 5 | 5 | 5 | 0 |
| jobicy-admin-support-apac | Jobicy | 5 | 0 | 0 | 7 |
| lever:brafton | Lever/brafton | 5 | 5 | 5 | 0 |
| lever:decilegroup | Lever/decilegroup | 5 | 5 | 5 | 0 |
| ashby:payscale | Ashby/payscale | 4 | 4 | 4 | 0 |
| lever:lwolf | Lever/lwolf | 4 | 4 | 4 | 0 |
| ashby:circulareconomysystems | Ashby/circulareconomysystems | 3 | 3 | 3 | 0 |
| ashby:molecule | Ashby/molecule | 3 | 3 | 3 | 0 |
| ashby:the-studio | Ashby/the-studio | 3 | 3 | 3 | 0 |
| lever:repurposeglobal | Lever/repurposeglobal | 3 | 3 | 3 | 0 |
| ashby:getground | Ashby/getground | 2 | 2 | 2 | 0 |
| greenhouse:gitlab | GitLab | 2 | 1 | 2 | 490 |
| himalayas:remote-jobs | Himalayas | 2 | 0 | 2 | 0 |
| lever:beaverprocess | Lever/beaverprocess | 2 | 2 | 2 | 0 |
| ashby:homera-health | Ashby/homera-health | 1 | 1 | 1 | 0 |
| greenhouse:ghost | Ghost | 1 | 0 | 0 | 10 |
| greenhouse:trainingthestreet | Greenhouse/trainingthestreet | 1 | 1 | 1 | 0 |
| lever:90seconds | Lever/90seconds | 1 | 1 | 1 | 0 |
| lever:hso | Lever/hso | 1 | 1 | 1 | 0 |
| lever:trustarc | Lever/trustarc | 1 | 1 | 1 | 0 |
| workable:hello-rache | Hello Rache | 1 | 0 | 1 | 3 |
| ashby:amplify | Amplify | 0 | 0 | 0 | 87 |
| ashby:ashby | Ashby | 0 | 0 | 0 | 92 |
| ashby:camunda | Camunda | 0 | 0 | 0 | 67 |
| ashby:supabase | Supabase | 0 | 0 | 0 | 84 |
| ashby:tremendous | Tremendous | 0 | 0 | 0 | 31 |
| authentic-jobs | AuthenticJobs | 0 | 0 | 0 | 10 |
| breezy:time-etc | Time Etc | 0 | 0 | 0 | 2 |
| dribbble | Dribbble | 0 | 0 | 0 | 113 |
| greenhouse:grafanalabs | Grafana Labs | 0 | 0 | 0 | 314 |
| greenhouse:nearform | Nearform | 0 | 0 | 0 | 55 |
| workable:pineapple-staffing | Pineapple Staffing | 0 | 0 | 0 | 3 |

## Fetch outcomes (last 7 days)

Separates real (changed) fetches from unchanged 304 polls, intentional skips, failures, and true zero-yield. `items` counts only changed fetches, so carried-forward unchanged counts never read as new supply.

| source_id | real fetches | unchanged | skips | failures | zero-yield | items |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| remotive | 103 | 413 | 0 | 0 | 0 | 1811 |
| ashby:multiplymii | 89 | 0 | 427 | 0 | 0 | 4449 |
| breezy:20four7va | 89 | 0 | 943 | 0 | 0 | 9998 |
| breezy:remote-craft | 89 | 0 | 427 | 0 | 0 | 1335 |
| breezy:sourcefit | 89 | 0 | 427 | 0 | 0 | 7696 |
| breezy:time-etc | 89 | 0 | 427 | 0 | 0 | 89 |
| breezy:value-virtual-assistants | 89 | 0 | 427 | 0 | 0 | 818 |
| breezy:yokly | 89 | 0 | 427 | 0 | 0 | 968 |
| greenhouse:gitlab | 89 | 0 | 427 | 0 | 0 | 18432 |
| greenhouse:nearform | 89 | 0 | 427 | 0 | 0 | 2062 |
| greenhouse:remotecom | 89 | 0 | 427 | 0 | 69 | 1067 |
| real-work-from-anywhere | 89 | 0 | 427 | 0 | 0 | 4450 |
| greenhouse:ghost | 88 | 0 | 427 | 1 | 0 | 528 |
| greenhouse:grafanalabs | 88 | 0 | 427 | 1 | 0 | 10794 |
| we-work-remotely | 87 | 428 | 0 | 1 | 0 | 7745 |
| jobicy-supporting-apac | 19 | 67 | 430 | 0 | 0 | 760 |
| remote-ok | 16 | 73 | 427 | 0 | 0 | 671 |
| greenhouse:canonical | 6 | 0 | 27 | 0 | 0 | 1866 |
| jobicy-admin-support-apac | 2 | 85 | 429 | 0 | 0 | 5 |
| ashby:amplify | 0 | 0 | 516 | 0 | 0 | 0 |
| ashby:ashby | 0 | 0 | 516 | 0 | 0 | 0 |
| ashby:camunda | 0 | 0 | 516 | 0 | 0 | 0 |
| ashby:circulareconomysystems | 0 | 0 | 95 | 0 | 0 | 0 |
| ashby:foundry-for-good | 0 | 0 | 215 | 0 | 0 | 0 |
| ashby:getground | 0 | 0 | 17 | 0 | 0 | 0 |
| ashby:gradient | 0 | 0 | 203 | 0 | 0 | 0 |
| ashby:molecule | 0 | 0 | 17 | 0 | 0 | 0 |
| ashby:payscale | 0 | 0 | 95 | 0 | 0 | 0 |
| ashby:supabase | 0 | 0 | 516 | 0 | 0 | 0 |
| ashby:the-studio | 0 | 0 | 357 | 0 | 0 | 0 |
| ashby:tremendous | 0 | 0 | 516 | 0 | 0 | 0 |
| authentic-jobs | 0 | 0 | 516 | 0 | 0 | 0 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 516 | 0 | 0 | 0 |
| dribbble | 0 | 0 | 516 | 0 | 0 | 0 |
| jobspresso | 0 | 0 | 516 | 0 | 0 | 0 |
| lever:beaverprocess | 0 | 0 | 95 | 0 | 0 | 0 |
| lever:brafton | 0 | 0 | 95 | 0 | 0 | 0 |
| lever:decilegroup | 0 | 0 | 95 | 0 | 0 | 0 |
| lever:deliverect | 0 | 0 | 95 | 0 | 0 | 0 |
| lever:lwolf | 0 | 0 | 95 | 0 | 0 | 0 |
| lever:repurposeglobal | 0 | 0 | 95 | 0 | 0 | 0 |
| lever:snappr | 0 | 0 | 357 | 0 | 0 | 0 |
| lever:truezerotech | 0 | 0 | 95 | 0 | 0 | 0 |
| lever:vaultoutsourcing | 0 | 0 | 516 | 0 | 0 | 0 |
| onlinejobs-ph | 0 | 0 | 516 | 0 | 0 | 0 |
| problogger | 0 | 0 | 516 | 0 | 0 | 0 |
| remote-co | 0 | 0 | 516 | 0 | 0 | 0 |
| workable:coconutva | 0 | 0 | 516 | 0 | 0 | 0 |
| workable:connectos | 0 | 0 | 516 | 0 | 0 | 0 |
| workable:crewbloom | 0 | 0 | 516 | 0 | 0 | 0 |
| workable:global-strategic | 0 | 0 | 516 | 0 | 0 | 0 |
| workable:hello-rache | 0 | 0 | 516 | 0 | 0 | 0 |
| workable:hunt-st | 0 | 0 | 516 | 0 | 0 | 0 |
| workable:myoutdesk | 0 | 0 | 516 | 0 | 0 | 0 |
| workable:outsource-access | 0 | 0 | 516 | 0 | 0 | 0 |
| workable:pearltalent | 0 | 0 | 516 | 0 | 0 | 0 |
| workable:pineapple-staffing | 0 | 0 | 516 | 0 | 0 | 0 |
| workable:rocketams | 0 | 0 | 516 | 0 | 0 | 0 |
| workable:staff-domain-inc | 0 | 0 | 516 | 0 | 0 | 0 |
| workable:superstaff | 0 | 0 | 516 | 0 | 0 | 0 |
| workable:virtualstaff365 | 0 | 0 | 516 | 0 | 0 | 0 |

## Geo & eligibility triage outcomes (last 7 days)

Breakdown of stored opportunities by Philippines eligibility verdict.

| source_id | eligible | unclear | ineligible | policy_rejected | total | qualified_rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| greenhouse:canonical | 2 | 0 | 188 | 188 | 190 | 1.1% |
| we-work-remotely | 116 | 0 | 17 | 17 | 133 | 87.2% |
| greenhouse:gitlab | 1 | 2 | 32 | 34 | 35 | 2.9% |
| real-work-from-anywhere | 20 | 2 | 7 | 9 | 29 | 69.0% |
| ashby:foundry-for-good | 27 | 0 | 0 | 0 | 27 | 100.0% |
| workable:hunt-st | 22 | 0 | 0 | 0 | 22 | 100.0% |
| lever:truezerotech | 17 | 0 | 0 | 0 | 17 | 100.0% |
| breezy:20four7va | 14 | 0 | 0 | 0 | 14 | 100.0% |
| lever:snappr | 13 | 0 | 0 | 0 | 13 | 100.0% |
| greenhouse:grafanalabs | 0 | 0 | 11 | 11 | 11 | 0.0% |
| ashby:multiplymii | 9 | 0 | 0 | 0 | 9 | 100.0% |
| breezy:sourcefit | 8 | 0 | 1 | 2 | 9 | 88.9% |
| lever:deliverect | 9 | 0 | 0 | 0 | 9 | 100.0% |
| remote-ok | 5 | 1 | 0 | 1 | 6 | 83.3% |
| workable:crewbloom | 6 | 0 | 0 | 0 | 6 | 100.0% |
| ashby:gradient | 5 | 0 | 0 | 0 | 5 | 100.0% |
| lever:brafton | 5 | 0 | 0 | 0 | 5 | 100.0% |
| lever:decilegroup | 5 | 0 | 0 | 0 | 5 | 100.0% |
| ashby:payscale | 4 | 0 | 0 | 0 | 4 | 100.0% |
| lever:lwolf | 4 | 0 | 0 | 0 | 4 | 100.0% |
| workable:coconutva | 4 | 0 | 0 | 0 | 4 | 100.0% |
| ashby:circulareconomysystems | 3 | 0 | 0 | 0 | 3 | 100.0% |
| ashby:molecule | 3 | 0 | 0 | 0 | 3 | 100.0% |
| ashby:the-studio | 3 | 0 | 0 | 0 | 3 | 100.0% |
| jobicy-supporting-apac | 1 | 0 | 2 | 2 | 3 | 33.3% |
| lever:repurposeglobal | 3 | 0 | 0 | 0 | 3 | 100.0% |
| remotive | 2 | 0 | 1 | 1 | 3 | 66.7% |
| ashby:getground | 2 | 0 | 0 | 0 | 2 | 100.0% |
| lever:beaverprocess | 2 | 0 | 0 | 0 | 2 | 100.0% |
| ashby:homera-health | 1 | 0 | 0 | 0 | 1 | 100.0% |
| breezy:value-virtual-assistants | 0 | 0 | 1 | 1 | 1 | 0.0% |
| breezy:yokly | 1 | 0 | 0 | 0 | 1 | 100.0% |
| greenhouse:trainingthestreet | 1 | 0 | 0 | 0 | 1 | 100.0% |
| lever:90seconds | 1 | 0 | 0 | 0 | 1 | 100.0% |
| lever:hso | 1 | 0 | 0 | 0 | 1 | 100.0% |
| lever:trustarc | 1 | 0 | 0 | 0 | 1 | 100.0% |

## Yield efficiency (last 7 days)

Yield per real (changed) fetch and per 100 items seen.

| source_id | real fetches | items seen | eligible stored | yield / fetch | yield / 100 items |
| --- | ---: | ---: | ---: | ---: | ---: |
| remotive | 103 | 1811 | 2 | 0.02 | 0.11 |
| ashby:multiplymii | 89 | 4449 | 9 | 0.10 | 0.20 |
| breezy:20four7va | 89 | 9998 | 14 | 0.16 | 0.14 |
| breezy:remote-craft | 89 | 1335 | 0 | 0.00 | 0.00 |
| breezy:sourcefit | 89 | 7696 | 8 | 0.09 | 0.10 |
| breezy:time-etc | 89 | 89 | 0 | 0.00 | 0.00 |
| breezy:value-virtual-assistants | 89 | 818 | 0 | 0.00 | 0.00 |
| breezy:yokly | 89 | 968 | 1 | 0.01 | 0.10 |
| greenhouse:gitlab | 89 | 18432 | 1 | 0.01 | 0.01 |
| greenhouse:nearform | 89 | 2062 | 0 | 0.00 | 0.00 |
| greenhouse:remotecom | 89 | 1067 | 0 | 0.00 | 0.00 |
| real-work-from-anywhere | 89 | 4450 | 20 | 0.22 | 0.45 |
| greenhouse:ghost | 88 | 528 | 0 | 0.00 | 0.00 |
| greenhouse:grafanalabs | 88 | 10794 | 0 | 0.00 | 0.00 |
| we-work-remotely | 87 | 7745 | 116 | 1.33 | 1.50 |
| jobicy-supporting-apac | 19 | 760 | 1 | 0.05 | 0.13 |
| remote-ok | 16 | 671 | 5 | 0.31 | 0.75 |
| greenhouse:canonical | 6 | 1866 | 2 | 0.33 | 0.11 |
| jobicy-admin-support-apac | 2 | 5 | 0 | 0.00 | 0.00 |
| ashby:amplify | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:ashby | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:camunda | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:circulareconomysystems | 0 | 0 | 3 | 0.00 | 0.00 |
| ashby:foundry-for-good | 0 | 0 | 27 | 0.00 | 0.00 |
| ashby:getground | 0 | 0 | 2 | 0.00 | 0.00 |
| ashby:gradient | 0 | 0 | 5 | 0.00 | 0.00 |
| ashby:molecule | 0 | 0 | 3 | 0.00 | 0.00 |
| ashby:payscale | 0 | 0 | 4 | 0.00 | 0.00 |
| ashby:supabase | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:the-studio | 0 | 0 | 3 | 0.00 | 0.00 |
| ashby:tremendous | 0 | 0 | 0 | 0.00 | 0.00 |
| authentic-jobs | 0 | 0 | 0 | 0.00 | 0.00 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 0 | 0.00 | 0.00 |
| dribbble | 0 | 0 | 0 | 0.00 | 0.00 |
| jobspresso | 0 | 0 | 0 | 0.00 | 0.00 |
| lever:beaverprocess | 0 | 0 | 2 | 0.00 | 0.00 |
| lever:brafton | 0 | 0 | 5 | 0.00 | 0.00 |
| lever:decilegroup | 0 | 0 | 5 | 0.00 | 0.00 |
| lever:deliverect | 0 | 0 | 9 | 0.00 | 0.00 |
| lever:lwolf | 0 | 0 | 4 | 0.00 | 0.00 |
| lever:repurposeglobal | 0 | 0 | 3 | 0.00 | 0.00 |
| lever:snappr | 0 | 0 | 13 | 0.00 | 0.00 |
| lever:truezerotech | 0 | 0 | 17 | 0.00 | 0.00 |
| lever:vaultoutsourcing | 0 | 0 | 0 | 0.00 | 0.00 |
| onlinejobs-ph | 0 | 0 | 0 | 0.00 | 0.00 |
| problogger | 0 | 0 | 0 | 0.00 | 0.00 |
| remote-co | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:coconutva | 0 | 0 | 4 | 0.00 | 0.00 |
| workable:connectos | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:crewbloom | 0 | 0 | 6 | 0.00 | 0.00 |
| workable:global-strategic | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:hello-rache | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:hunt-st | 0 | 0 | 22 | 0.00 | 0.00 |
| workable:myoutdesk | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:outsource-access | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:pearltalent | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:pineapple-staffing | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:rocketams | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:staff-domain-inc | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:superstaff | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:virtualstaff365 | 0 | 0 | 0 | 0.00 | 0.00 |
