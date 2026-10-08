# Source economics — latest (SP-02)

- **As of:** 2026-10-08T09:24:51.293Z
- **Windows:** 7d/14d/30d net-new by `scraped_at`
- **Reconciliation:** OK (every partition delta is zero)
- Read-only report; regenerate with `scripts/diagnostics/source-economics.ts`.

## Qualified supply (strict eligibility; first-stored proxy)

Excludes unclear/ineligible rows. Historical publication and later deactivation are not fully reconstructed.

| qualified active | qualified new 7d | per day (7d) | qualified new 30d | per day (30d) |
| ---: | ---: | ---: | ---: | ---: |
| 1538 | 309 | 44.14 | 1232 | 41.07 |

## Identity coverage (SP-01)

| total | with source_id | null source_id | coverage | active null-id |
| ---: | ---: | ---: | ---: | ---: |
| 7080 | 7080 | 0 | 100.0% | 0 |

## Net-new accepted supply

| active | net-new 7d | net-new 14d | net-new 30d |
| ---: | ---: | ---: | ---: |
| 1538 | 309 | 898 | 1232 |

## Provider-family concentration (ADR-006 §7)

- **Net-new 30d:** top family `we-work-remotely` 26.2%; top-3 61.5%.
- **Active:** top family `we-work-remotely` 27.0%; top-3 61.4%.
- `(unknown)` legacy rows are excluded from these shares.

| provider family | active | net-new 30d | net-new 7d | source ids |
| --- | ---: | ---: | ---: | --- |
| we-work-remotely | 416 | 323 | 100 | we-work-remotely |
| workable | 270 | 270 | 32 | workable:hunt-st, workable:coconutva, workable:crewbloom, workable:pearltalent, workable:rocketams, workable:hello-rache, workable:pineapple-staffing |
| breezy | 258 | 165 | 21 | breezy:20four7va, breezy:sourcefit, breezy:remote-craft, breezy:yokly, breezy:value-virtual-assistants, breezy:time-etc |
| real-work-from-anywhere | 157 | 111 | 24 | real-work-from-anywhere |
| greenhouse | 143 | 136 | 5 | greenhouse:canonical, greenhouse:remotecom, greenhouse:gitlab, greenhouse:ghost, greenhouse:trainingthestreet, greenhouse:grafanalabs, greenhouse:nearform |
| ashby | 115 | 115 | 58 | ashby:multiplymii, ashby:foundry-for-good, ashby:gradient, ashby:payscale, ashby:circulareconomysystems, ashby:molecule, ashby:the-studio, ashby:getground, ashby:homera-health, ashby:amplify, ashby:ashby, ashby:camunda, ashby:supabase, ashby:tremendous |
| lever | 61 | 61 | 61 | lever:truezerotech, lever:snappr, lever:deliverect, lever:brafton, lever:decilegroup, lever:lwolf, lever:repurposeglobal, lever:beaverprocess, lever:90seconds, lever:hso, lever:trustarc |
| remote-ok | 52 | 34 | 6 | remote-ok |
| jobicy | 50 | 9 | 0 | jobicy-supporting-apac, jobicy-admin-support-apac |
| remotive | 14 | 6 | 2 | remotive |
| himalayas | 2 | 2 | 0 | himalayas:remote-jobs |
| authentic-jobs | 0 | 0 | 0 | authentic-jobs |
| dribbble | 0 | 0 | 0 | dribbble |

## Supply by exact source_id

| source_id | platform | active | net-new 7d | net-new 30d | inactive |
| --- | --- | ---: | ---: | ---: | ---: |
| we-work-remotely | WeWorkRemotely | 416 | 100 | 323 | 1201 |
| workable:hunt-st | Hunt St | 168 | 22 | 168 | 3 |
| real-work-from-anywhere | RealWorkFromAnywhere | 157 | 24 | 111 | 469 |
| breezy:20four7va | 20Four7VA | 130 | 13 | 68 | 128 |
| greenhouse:canonical | Canonical | 124 | 2 | 124 | 188 |
| breezy:sourcefit | Breezy/sourcefit | 92 | 7 | 61 | 148 |
| ashby:multiplymii | Ashby/multiplymii | 67 | 10 | 67 | 0 |
| remote-ok | RemoteOK | 52 | 6 | 34 | 1175 |
| jobicy-supporting-apac | Jobicy | 45 | 0 | 9 | 87 |
| workable:coconutva | Coconut VA | 41 | 4 | 41 | 21 |
| workable:crewbloom | CrewBloom | 35 | 6 | 35 | 13 |
| ashby:foundry-for-good | Ashby/foundry-for-good | 27 | 27 | 27 | 0 |
| workable:pearltalent | Pearl Talent | 18 | 0 | 18 | 26 |
| lever:truezerotech | Lever/truezerotech | 17 | 17 | 17 | 0 |
| breezy:remote-craft | Remote Craft | 14 | 0 | 14 | 1 |
| greenhouse:remotecom | Remote.com | 14 | 0 | 8 | 608 |
| remotive | Remotive | 14 | 2 | 6 | 89 |
| lever:snappr | Lever/snappr | 13 | 13 | 13 | 0 |
| breezy:yokly | Yokly | 12 | 0 | 12 | 0 |
| breezy:value-virtual-assistants | VALUE Virtual Assistants | 10 | 1 | 10 | 1 |
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
| greenhouse:gitlab | GitLab | 3 | 2 | 3 | 502 |
| lever:repurposeglobal | Lever/repurposeglobal | 3 | 3 | 3 | 0 |
| ashby:getground | Ashby/getground | 2 | 2 | 2 | 0 |
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
| greenhouse:grafanalabs | Grafana Labs | 0 | 0 | 0 | 316 |
| greenhouse:nearform | Nearform | 0 | 0 | 0 | 55 |
| workable:pineapple-staffing | Pineapple Staffing | 0 | 0 | 0 | 3 |

## Fetch outcomes (last 7 days)

Separates real (changed) fetches from unchanged 304 polls, intentional skips, failures, and true zero-yield. `items` counts only changed fetches, so carried-forward unchanged counts never read as new supply.

| source_id | real fetches | unchanged | skips | failures | zero-yield | items |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| remotive | 110 | 448 | 0 | 0 | 0 | 1972 |
| ashby:multiplymii | 95 | 0 | 462 | 0 | 0 | 4912 |
| breezy:20four7va | 95 | 0 | 1019 | 0 | 0 | 10675 |
| breezy:remote-craft | 95 | 0 | 462 | 0 | 0 | 1425 |
| breezy:sourcefit | 95 | 0 | 462 | 0 | 0 | 8309 |
| breezy:value-virtual-assistants | 95 | 0 | 462 | 0 | 0 | 907 |
| breezy:yokly | 95 | 0 | 462 | 0 | 0 | 1045 |
| greenhouse:gitlab | 95 | 0 | 462 | 0 | 0 | 19885 |
| greenhouse:nearform | 95 | 0 | 462 | 0 | 0 | 2156 |
| greenhouse:remotecom | 95 | 0 | 462 | 0 | 89 | 133 |
| real-work-from-anywhere | 95 | 0 | 463 | 0 | 0 | 4750 |
| breezy:time-etc | 94 | 0 | 462 | 1 | 0 | 94 |
| greenhouse:ghost | 94 | 0 | 462 | 1 | 0 | 564 |
| greenhouse:grafanalabs | 94 | 0 | 462 | 1 | 0 | 11557 |
| we-work-remotely | 89 | 468 | 0 | 1 | 0 | 7923 |
| greenhouse:canonical | 26 | 0 | 129 | 0 | 0 | 8086 |
| jobicy-supporting-apac | 22 | 70 | 466 | 0 | 0 | 880 |
| remote-ok | 16 | 79 | 463 | 0 | 0 | 671 |
| jobicy-admin-support-apac | 2 | 90 | 466 | 0 | 0 | 5 |
| ashby:amplify | 0 | 0 | 558 | 0 | 0 | 0 |
| ashby:ashby | 0 | 0 | 558 | 0 | 0 | 0 |
| ashby:camunda | 0 | 0 | 558 | 0 | 0 | 0 |
| ashby:circulareconomysystems | 0 | 0 | 218 | 0 | 0 | 0 |
| ashby:foundry-for-good | 0 | 0 | 338 | 0 | 0 | 0 |
| ashby:getground | 0 | 0 | 140 | 0 | 0 | 0 |
| ashby:gradient | 0 | 0 | 326 | 0 | 0 | 0 |
| ashby:molecule | 0 | 0 | 140 | 0 | 0 | 0 |
| ashby:payscale | 0 | 0 | 217 | 0 | 0 | 0 |
| ashby:supabase | 0 | 0 | 557 | 0 | 0 | 0 |
| ashby:the-studio | 0 | 0 | 479 | 0 | 0 | 0 |
| ashby:tremendous | 0 | 0 | 557 | 0 | 0 | 0 |
| authentic-jobs | 0 | 0 | 558 | 0 | 0 | 0 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 557 | 0 | 0 | 0 |
| dribbble | 0 | 0 | 558 | 0 | 0 | 0 |
| jobspresso | 0 | 0 | 558 | 0 | 0 | 0 |
| lever:beaverprocess | 0 | 0 | 217 | 0 | 0 | 0 |
| lever:brafton | 0 | 0 | 217 | 0 | 0 | 0 |
| lever:decilegroup | 0 | 0 | 217 | 0 | 0 | 0 |
| lever:deliverect | 0 | 0 | 217 | 0 | 0 | 0 |
| lever:lwolf | 0 | 0 | 217 | 0 | 0 | 0 |
| lever:repurposeglobal | 0 | 0 | 217 | 0 | 0 | 0 |
| lever:snappr | 0 | 0 | 479 | 0 | 0 | 0 |
| lever:truezerotech | 0 | 0 | 217 | 0 | 0 | 0 |
| lever:vaultoutsourcing | 0 | 0 | 557 | 0 | 0 | 0 |
| onlinejobs-ph | 0 | 0 | 558 | 0 | 0 | 0 |
| problogger | 0 | 0 | 558 | 0 | 0 | 0 |
| remote-co | 0 | 0 | 558 | 0 | 0 | 0 |
| workable:coconutva | 0 | 0 | 557 | 0 | 0 | 0 |
| workable:connectos | 0 | 0 | 557 | 0 | 0 | 0 |
| workable:crewbloom | 0 | 0 | 557 | 0 | 0 | 0 |
| workable:global-strategic | 0 | 0 | 557 | 0 | 0 | 0 |
| workable:hello-rache | 0 | 0 | 557 | 0 | 0 | 0 |
| workable:hunt-st | 0 | 0 | 557 | 0 | 0 | 0 |
| workable:myoutdesk | 0 | 0 | 557 | 0 | 0 | 0 |
| workable:outsource-access | 0 | 0 | 557 | 0 | 0 | 0 |
| workable:pearltalent | 0 | 0 | 557 | 0 | 0 | 0 |
| workable:pineapple-staffing | 0 | 0 | 557 | 0 | 0 | 0 |
| workable:rocketams | 0 | 0 | 557 | 0 | 0 | 0 |
| workable:staff-domain-inc | 0 | 0 | 557 | 0 | 0 | 0 |
| workable:superstaff | 0 | 0 | 557 | 0 | 0 | 0 |
| workable:virtualstaff365 | 0 | 0 | 557 | 0 | 0 | 0 |

## Geo & eligibility triage outcomes (last 7 days)

Breakdown of stored opportunities by Philippines eligibility verdict.

| source_id | eligible | unclear | ineligible | policy_rejected | total | qualified_rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| greenhouse:canonical | 2 | 0 | 188 | 188 | 190 | 1.1% |
| we-work-remotely | 100 | 0 | 19 | 19 | 119 | 84.0% |
| greenhouse:gitlab | 2 | 1 | 38 | 39 | 41 | 4.9% |
| real-work-from-anywhere | 24 | 2 | 3 | 5 | 29 | 82.8% |
| ashby:foundry-for-good | 27 | 0 | 0 | 0 | 27 | 100.0% |
| workable:hunt-st | 22 | 0 | 0 | 0 | 22 | 100.0% |
| lever:truezerotech | 17 | 0 | 0 | 0 | 17 | 100.0% |
| breezy:20four7va | 13 | 0 | 0 | 0 | 13 | 100.0% |
| lever:snappr | 13 | 0 | 0 | 0 | 13 | 100.0% |
| ashby:multiplymii | 10 | 0 | 0 | 0 | 10 | 100.0% |
| greenhouse:grafanalabs | 0 | 0 | 10 | 10 | 10 | 0.0% |
| lever:deliverect | 9 | 0 | 0 | 0 | 9 | 100.0% |
| breezy:sourcefit | 7 | 0 | 1 | 2 | 8 | 87.5% |
| remote-ok | 6 | 1 | 0 | 1 | 7 | 85.7% |
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
| lever:repurposeglobal | 3 | 0 | 0 | 0 | 3 | 100.0% |
| ashby:getground | 2 | 0 | 0 | 0 | 2 | 100.0% |
| breezy:value-virtual-assistants | 1 | 0 | 1 | 2 | 2 | 50.0% |
| jobicy-supporting-apac | 0 | 0 | 2 | 2 | 2 | 0.0% |
| lever:beaverprocess | 2 | 0 | 0 | 0 | 2 | 100.0% |
| remotive | 2 | 0 | 0 | 0 | 2 | 100.0% |
| ashby:homera-health | 1 | 0 | 0 | 0 | 1 | 100.0% |
| greenhouse:trainingthestreet | 1 | 0 | 0 | 0 | 1 | 100.0% |
| lever:90seconds | 1 | 0 | 0 | 0 | 1 | 100.0% |
| lever:hso | 1 | 0 | 0 | 0 | 1 | 100.0% |
| lever:trustarc | 1 | 0 | 0 | 0 | 1 | 100.0% |

## Yield efficiency (last 7 days)

Yield per real (changed) fetch and per 100 items seen.

| source_id | real fetches | items seen | eligible stored | yield / fetch | yield / 100 items |
| --- | ---: | ---: | ---: | ---: | ---: |
| remotive | 110 | 1972 | 2 | 0.02 | 0.10 |
| ashby:multiplymii | 95 | 4912 | 10 | 0.11 | 0.20 |
| breezy:20four7va | 95 | 10675 | 13 | 0.14 | 0.12 |
| breezy:remote-craft | 95 | 1425 | 0 | 0.00 | 0.00 |
| breezy:sourcefit | 95 | 8309 | 7 | 0.07 | 0.08 |
| breezy:value-virtual-assistants | 95 | 907 | 1 | 0.01 | 0.11 |
| breezy:yokly | 95 | 1045 | 0 | 0.00 | 0.00 |
| greenhouse:gitlab | 95 | 19885 | 2 | 0.02 | 0.01 |
| greenhouse:nearform | 95 | 2156 | 0 | 0.00 | 0.00 |
| greenhouse:remotecom | 95 | 133 | 0 | 0.00 | 0.00 |
| real-work-from-anywhere | 95 | 4750 | 24 | 0.25 | 0.51 |
| breezy:time-etc | 94 | 94 | 0 | 0.00 | 0.00 |
| greenhouse:ghost | 94 | 564 | 0 | 0.00 | 0.00 |
| greenhouse:grafanalabs | 94 | 11557 | 0 | 0.00 | 0.00 |
| we-work-remotely | 89 | 7923 | 100 | 1.12 | 1.26 |
| greenhouse:canonical | 26 | 8086 | 2 | 0.08 | 0.02 |
| jobicy-supporting-apac | 22 | 880 | 0 | 0.00 | 0.00 |
| remote-ok | 16 | 671 | 6 | 0.38 | 0.89 |
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
