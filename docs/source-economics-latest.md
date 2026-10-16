# Source economics — latest (SP-02)

- **As of:** 2026-10-16T07:28:31.582Z
- **Windows:** 7d/14d/30d net-new by `scraped_at`
- **Reconciliation:** OK (every partition delta is zero)
- Read-only report; regenerate with `scripts/diagnostics/source-economics.ts`.

## Qualified supply (strict eligibility; first-stored proxy)

Excludes unclear/ineligible rows. Historical publication and later deactivation are not fully reconstructed.

| qualified active | qualified new 7d | per day (7d) | qualified new 30d | per day (30d) |
| ---: | ---: | ---: | ---: | ---: |
| 1743 | 180 | 25.71 | 1327 | 44.23 |

## Identity coverage (SP-01)

| total | with source_id | null source_id | coverage | active null-id |
| ---: | ---: | ---: | ---: | ---: |
| 7380 | 7380 | 0 | 100.0% | 0 |

## Net-new accepted supply

| active | net-new 7d | net-new 14d | net-new 30d |
| ---: | ---: | ---: | ---: |
| 1743 | 180 | 463 | 1327 |

## Provider-family concentration (ADR-006 §7)

- **Net-new 30d:** top family `we-work-remotely` 28.5%; top-3 63.5%.
- **Active:** top family `we-work-remotely` 30.7%; top-3 62.7%.
- `(unknown)` legacy rows are excluded from these shares.

| provider family | active | net-new 30d | net-new 7d | source ids |
| --- | ---: | ---: | ---: | --- |
| we-work-remotely | 535 | 378 | 108 | we-work-remotely |
| breezy | 280 | 187 | 22 | breezy:20four7va, breezy:sourcefit, breezy:remote-craft, breezy:yokly, breezy:value-virtual-assistants, breezy:time-etc |
| workable | 277 | 277 | 0 | workable:hunt-st, workable:coconutva, workable:crewbloom, workable:pearltalent, workable:rocketams, workable:hello-rache, workable:pineapple-staffing |
| real-work-from-anywhere | 184 | 105 | 24 | real-work-from-anywhere |
| greenhouse | 146 | 139 | 1 | greenhouse:canonical, greenhouse:remotecom, greenhouse:gitlab, greenhouse:janes, greenhouse:ghost, greenhouse:trainingthestreet, greenhouse:grafanalabs, greenhouse:nearform |
| ashby | 125 | 125 | 9 | ashby:multiplymii, ashby:foundry-for-good, ashby:gradient, ashby:payscale, ashby:circulareconomysystems, ashby:molecule, ashby:the-studio, ashby:getground, ashby:homera-health, ashby:amplify, ashby:ashby, ashby:camunda, ashby:supabase, ashby:tremendous |
| remote-ok | 64 | 36 | 12 | remote-ok |
| lever | 61 | 61 | 0 | lever:truezerotech, lever:snappr, lever:deliverect, lever:brafton, lever:decilegroup, lever:lwolf, lever:repurposeglobal, lever:beaverprocess, lever:90seconds, lever:hso, lever:trustarc |
| jobicy | 55 | 11 | 4 | jobicy-supporting-apac, jobicy-admin-support-apac |
| remotive | 14 | 6 | 0 | remotive |
| himalayas | 2 | 2 | 0 | himalayas:remote-jobs |
| authentic-jobs | 0 | 0 | 0 | authentic-jobs |
| dribbble | 0 | 0 | 0 | dribbble |

## Supply by exact source_id

| source_id | platform | active | net-new 7d | net-new 30d | inactive |
| --- | --- | ---: | ---: | ---: | ---: |
| we-work-remotely | WeWorkRemotely | 535 | 108 | 378 | 1226 |
| real-work-from-anywhere | RealWorkFromAnywhere | 184 | 24 | 105 | 471 |
| workable:hunt-st | Hunt St | 175 | 0 | 175 | 3 |
| breezy:20four7va | 20Four7VA | 146 | 16 | 84 | 128 |
| greenhouse:canonical | Canonical | 124 | 0 | 124 | 188 |
| breezy:sourcefit | Breezy/sourcefit | 98 | 6 | 67 | 152 |
| ashby:multiplymii | Ashby/multiplymii | 77 | 9 | 77 | 0 |
| remote-ok | RemoteOK | 64 | 12 | 36 | 1182 |
| jobicy-supporting-apac | Jobicy | 49 | 3 | 10 | 94 |
| workable:coconutva | Coconut VA | 41 | 0 | 41 | 21 |
| workable:crewbloom | CrewBloom | 35 | 0 | 35 | 13 |
| ashby:foundry-for-good | Ashby/foundry-for-good | 27 | 0 | 27 | 0 |
| workable:pearltalent | Pearl Talent | 18 | 0 | 18 | 26 |
| lever:truezerotech | Lever/truezerotech | 17 | 0 | 17 | 0 |
| breezy:remote-craft | Remote Craft | 14 | 0 | 14 | 1 |
| greenhouse:remotecom | Remote.com | 14 | 0 | 8 | 608 |
| remotive | Remotive | 14 | 0 | 6 | 89 |
| lever:snappr | Lever/snappr | 13 | 0 | 13 | 0 |
| breezy:yokly | Yokly | 12 | 0 | 12 | 0 |
| breezy:value-virtual-assistants | VALUE Virtual Assistants | 10 | 0 | 10 | 1 |
| lever:deliverect | Lever/deliverect | 9 | 0 | 9 | 0 |
| workable:rocketams | RocketAMS | 7 | 0 | 7 | 2 |
| jobicy-admin-support-apac | Jobicy | 6 | 1 | 1 | 7 |
| ashby:gradient | Ashby/gradient | 5 | 0 | 5 | 0 |
| lever:brafton | Lever/brafton | 5 | 0 | 5 | 0 |
| lever:decilegroup | Lever/decilegroup | 5 | 0 | 5 | 0 |
| ashby:payscale | Ashby/payscale | 4 | 0 | 4 | 0 |
| greenhouse:gitlab | GitLab | 4 | 1 | 4 | 535 |
| lever:lwolf | Lever/lwolf | 4 | 0 | 4 | 0 |
| ashby:circulareconomysystems | Ashby/circulareconomysystems | 3 | 0 | 3 | 0 |
| ashby:molecule | Ashby/molecule | 3 | 0 | 3 | 0 |
| ashby:the-studio | Ashby/the-studio | 3 | 0 | 3 | 0 |
| lever:repurposeglobal | Lever/repurposeglobal | 3 | 0 | 3 | 0 |
| ashby:getground | Ashby/getground | 2 | 0 | 2 | 0 |
| greenhouse:janes | Greenhouse/janes | 2 | 0 | 2 | 0 |
| himalayas:remote-jobs | Himalayas | 2 | 0 | 2 | 0 |
| lever:beaverprocess | Lever/beaverprocess | 2 | 0 | 2 | 0 |
| ashby:homera-health | Ashby/homera-health | 1 | 0 | 1 | 0 |
| greenhouse:ghost | Ghost | 1 | 0 | 0 | 10 |
| greenhouse:trainingthestreet | Greenhouse/trainingthestreet | 1 | 0 | 1 | 0 |
| lever:90seconds | Lever/90seconds | 1 | 0 | 1 | 0 |
| lever:hso | Lever/hso | 1 | 0 | 1 | 0 |
| lever:trustarc | Lever/trustarc | 1 | 0 | 1 | 0 |
| workable:hello-rache | Hello Rache | 1 | 0 | 1 | 3 |
| ashby:amplify | Amplify | 0 | 0 | 0 | 87 |
| ashby:ashby | Ashby | 0 | 0 | 0 | 92 |
| ashby:camunda | Camunda | 0 | 0 | 0 | 67 |
| ashby:supabase | Supabase | 0 | 0 | 0 | 84 |
| ashby:tremendous | Tremendous | 0 | 0 | 0 | 31 |
| authentic-jobs | AuthenticJobs | 0 | 0 | 0 | 10 |
| breezy:time-etc | Time Etc | 0 | 0 | 0 | 2 |
| dribbble | Dribbble | 0 | 0 | 0 | 113 |
| greenhouse:grafanalabs | Grafana Labs | 0 | 0 | 0 | 333 |
| greenhouse:nearform | Nearform | 0 | 0 | 0 | 55 |
| workable:pineapple-staffing | Pineapple Staffing | 0 | 0 | 0 | 3 |

## Fetch outcomes (last 7 days)

Separates real (changed) fetches from unchanged 304 polls, intentional skips, failures, and true zero-yield. `items` counts only changed fetches, so carried-forward unchanged counts never read as new supply.

| source_id | real fetches | unchanged | skips | failures | zero-yield | items |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 130 | 516 | 0 | 8 | 0 | 11531 |
| remotive | 124 | 530 | 0 | 0 | 0 | 2012 |
| ashby:multiplymii | 107 | 0 | 547 | 0 | 0 | 6110 |
| breezy:20four7va | 107 | 0 | 1200 | 0 | 0 | 11923 |
| breezy:remote-craft | 107 | 0 | 547 | 0 | 0 | 1605 |
| real-work-from-anywhere | 107 | 0 | 547 | 0 | 0 | 5350 |
| breezy:sourcefit | 106 | 0 | 547 | 0 | 0 | 9328 |
| breezy:time-etc | 106 | 0 | 547 | 0 | 0 | 106 |
| breezy:value-virtual-assistants | 106 | 0 | 547 | 0 | 0 | 1166 |
| breezy:yokly | 106 | 0 | 546 | 0 | 0 | 1166 |
| greenhouse:canonical | 106 | 0 | 546 | 0 | 0 | 32932 |
| greenhouse:ghost | 106 | 0 | 546 | 0 | 0 | 636 |
| greenhouse:gitlab | 106 | 0 | 546 | 0 | 0 | 23159 |
| greenhouse:grafanalabs | 106 | 0 | 546 | 0 | 0 | 11414 |
| greenhouse:nearform | 106 | 0 | 544 | 0 | 0 | 2266 |
| greenhouse:remotecom | 85 | 0 | 544 | 21 | 85 | 0 |
| remote-ok | 36 | 70 | 547 | 1 | 0 | 1483 |
| jobicy-supporting-apac | 14 | 89 | 550 | 1 | 0 | 560 |
| jobicy-admin-support-apac | 5 | 101 | 548 | 0 | 0 | 16 |
| ashby:amplify | 0 | 0 | 653 | 0 | 0 | 0 |
| ashby:ashby | 0 | 0 | 653 | 0 | 0 | 0 |
| ashby:camunda | 0 | 0 | 653 | 0 | 0 | 0 |
| ashby:circulareconomysystems | 0 | 0 | 653 | 0 | 0 | 0 |
| ashby:foundry-for-good | 0 | 0 | 653 | 0 | 0 | 0 |
| ashby:getground | 0 | 0 | 653 | 0 | 0 | 0 |
| ashby:gradient | 0 | 0 | 653 | 0 | 0 | 0 |
| ashby:molecule | 0 | 0 | 653 | 0 | 0 | 0 |
| ashby:payscale | 0 | 0 | 653 | 0 | 0 | 0 |
| ashby:supabase | 0 | 0 | 653 | 0 | 0 | 0 |
| ashby:the-studio | 0 | 0 | 653 | 0 | 0 | 0 |
| ashby:tremendous | 0 | 0 | 653 | 0 | 0 | 0 |
| authentic-jobs | 0 | 0 | 654 | 0 | 0 | 0 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 653 | 0 | 0 | 0 |
| dribbble | 0 | 0 | 654 | 0 | 0 | 0 |
| jobspresso | 0 | 0 | 654 | 0 | 0 | 0 |
| lever:beaverprocess | 0 | 0 | 653 | 0 | 0 | 0 |
| lever:brafton | 0 | 0 | 653 | 0 | 0 | 0 |
| lever:decilegroup | 0 | 0 | 653 | 0 | 0 | 0 |
| lever:deliverect | 0 | 0 | 653 | 0 | 0 | 0 |
| lever:lwolf | 0 | 0 | 653 | 0 | 0 | 0 |
| lever:repurposeglobal | 0 | 0 | 653 | 0 | 0 | 0 |
| lever:snappr | 0 | 0 | 653 | 0 | 0 | 0 |
| lever:truezerotech | 0 | 0 | 653 | 0 | 0 | 0 |
| lever:vaultoutsourcing | 0 | 0 | 653 | 0 | 0 | 0 |
| onlinejobs-ph | 0 | 0 | 654 | 0 | 0 | 0 |
| problogger | 0 | 0 | 654 | 0 | 0 | 0 |
| remote-co | 0 | 0 | 654 | 0 | 0 | 0 |
| workable:coconutva | 0 | 0 | 653 | 0 | 0 | 0 |
| workable:connectos | 0 | 0 | 653 | 0 | 0 | 0 |
| workable:crewbloom | 0 | 0 | 653 | 0 | 0 | 0 |
| workable:global-strategic | 0 | 0 | 653 | 0 | 0 | 0 |
| workable:hello-rache | 0 | 0 | 653 | 0 | 0 | 0 |
| workable:hunt-st | 0 | 0 | 653 | 0 | 0 | 0 |
| workable:myoutdesk | 0 | 0 | 653 | 0 | 0 | 0 |
| workable:outsource-access | 0 | 0 | 653 | 0 | 0 | 0 |
| workable:pearltalent | 0 | 0 | 653 | 0 | 0 | 0 |
| workable:pineapple-staffing | 0 | 0 | 653 | 0 | 0 | 0 |
| workable:rocketams | 0 | 0 | 653 | 0 | 0 | 0 |
| workable:staff-domain-inc | 0 | 0 | 653 | 0 | 0 | 0 |
| workable:superstaff | 0 | 0 | 653 | 0 | 0 | 0 |
| workable:virtualstaff365 | 0 | 0 | 653 | 0 | 0 | 0 |

## Geo & eligibility triage outcomes (last 7 days)

Breakdown of stored opportunities by Philippines eligibility verdict.

| source_id | eligible | unclear | ineligible | policy_rejected | total | qualified_rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 108 | 0 | 25 | 25 | 133 | 81.2% |
| greenhouse:gitlab | 1 | 0 | 27 | 27 | 28 | 3.6% |
| real-work-from-anywhere | 24 | 1 | 0 | 1 | 25 | 96.0% |
| remote-ok | 12 | 3 | 4 | 7 | 19 | 63.2% |
| breezy:20four7va | 16 | 0 | 0 | 0 | 16 | 100.0% |
| greenhouse:grafanalabs | 0 | 0 | 16 | 16 | 16 | 0.0% |
| breezy:sourcefit | 6 | 0 | 4 | 4 | 10 | 60.0% |
| ashby:multiplymii | 9 | 0 | 0 | 0 | 9 | 100.0% |
| jobicy-supporting-apac | 3 | 0 | 5 | 5 | 8 | 37.5% |
| jobicy-admin-support-apac | 1 | 0 | 0 | 0 | 1 | 100.0% |

## Yield efficiency (last 7 days)

Yield per real (changed) fetch and per 100 items seen.

| source_id | real fetches | items seen | eligible stored | yield / fetch | yield / 100 items |
| --- | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 130 | 11531 | 108 | 0.83 | 0.94 |
| remotive | 124 | 2012 | 0 | 0.00 | 0.00 |
| ashby:multiplymii | 107 | 6110 | 9 | 0.08 | 0.15 |
| breezy:20four7va | 107 | 11923 | 16 | 0.15 | 0.13 |
| breezy:remote-craft | 107 | 1605 | 0 | 0.00 | 0.00 |
| real-work-from-anywhere | 107 | 5350 | 24 | 0.22 | 0.45 |
| breezy:sourcefit | 106 | 9328 | 6 | 0.06 | 0.06 |
| breezy:time-etc | 106 | 106 | 0 | 0.00 | 0.00 |
| breezy:value-virtual-assistants | 106 | 1166 | 0 | 0.00 | 0.00 |
| breezy:yokly | 106 | 1166 | 0 | 0.00 | 0.00 |
| greenhouse:canonical | 106 | 32932 | 0 | 0.00 | 0.00 |
| greenhouse:ghost | 106 | 636 | 0 | 0.00 | 0.00 |
| greenhouse:gitlab | 106 | 23159 | 1 | 0.01 | 0.00 |
| greenhouse:grafanalabs | 106 | 11414 | 0 | 0.00 | 0.00 |
| greenhouse:nearform | 106 | 2266 | 0 | 0.00 | 0.00 |
| greenhouse:remotecom | 85 | 0 | 0 | 0.00 | 0.00 |
| remote-ok | 36 | 1483 | 12 | 0.33 | 0.81 |
| jobicy-supporting-apac | 14 | 560 | 3 | 0.21 | 0.54 |
| jobicy-admin-support-apac | 5 | 16 | 1 | 0.20 | 6.25 |
| ashby:amplify | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:ashby | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:camunda | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:circulareconomysystems | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:foundry-for-good | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:getground | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:gradient | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:molecule | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:payscale | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:supabase | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:the-studio | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:tremendous | 0 | 0 | 0 | 0.00 | 0.00 |
| authentic-jobs | 0 | 0 | 0 | 0.00 | 0.00 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 0 | 0.00 | 0.00 |
| dribbble | 0 | 0 | 0 | 0.00 | 0.00 |
| jobspresso | 0 | 0 | 0 | 0.00 | 0.00 |
| lever:beaverprocess | 0 | 0 | 0 | 0.00 | 0.00 |
| lever:brafton | 0 | 0 | 0 | 0.00 | 0.00 |
| lever:decilegroup | 0 | 0 | 0 | 0.00 | 0.00 |
| lever:deliverect | 0 | 0 | 0 | 0.00 | 0.00 |
| lever:lwolf | 0 | 0 | 0 | 0.00 | 0.00 |
| lever:repurposeglobal | 0 | 0 | 0 | 0.00 | 0.00 |
| lever:snappr | 0 | 0 | 0 | 0.00 | 0.00 |
| lever:truezerotech | 0 | 0 | 0 | 0.00 | 0.00 |
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
