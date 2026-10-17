# Source economics — latest (SP-02)

- **As of:** 2026-10-17T07:09:15.237Z
- **Windows:** 7d/14d/30d net-new by `scraped_at`
- **Reconciliation:** OK (every partition delta is zero)
- Read-only report; regenerate with `scripts/diagnostics/source-economics.ts`.

## Qualified supply (strict eligibility; first-stored proxy)

Excludes unclear/ineligible rows. Historical publication and later deactivation are not fully reconstructed.

| qualified active | qualified new 7d | per day (7d) | qualified new 30d | per day (30d) |
| ---: | ---: | ---: | ---: | ---: |
| 1687 | 243 | 34.71 | 1389 | 46.30 |

## Identity coverage (SP-01)

| total | with source_id | null source_id | coverage | active null-id |
| ---: | ---: | ---: | ---: | ---: |
| 7476 | 7476 | 0 | 100.0% | 0 |

## Net-new accepted supply

| active | net-new 7d | net-new 14d | net-new 30d |
| ---: | ---: | ---: | ---: |
| 1687 | 243 | 522 | 1389 |

## Provider-family concentration (ADR-006 §7)

- **Net-new 30d:** top family `we-work-remotely` 27.7%; top-3 63.4%.
- **Active:** top family `we-work-remotely` 28.0%; top-3 62.9%.
- `(unknown)` legacy rows are excluded from these shares.

| provider family | active | net-new 30d | net-new 7d | source ids |
| --- | ---: | ---: | ---: | --- |
| we-work-remotely | 472 | 385 | 113 | we-work-remotely |
| workable | 302 | 302 | 25 | workable:hunt-st, workable:coconutva, workable:crewbloom, workable:pearltalent, workable:rocketams, workable:hello-rache, workable:pineapple-staffing |
| breezy | 287 | 194 | 25 | breezy:20four7va, breezy:sourcefit, breezy:remote-craft, breezy:yokly, breezy:value-virtual-assistants, breezy:time-etc |
| greenhouse | 148 | 141 | 3 | greenhouse:canonical, greenhouse:remotecom, greenhouse:gitlab, greenhouse:janes, greenhouse:ghost, greenhouse:trainingthestreet, greenhouse:grafanalabs, greenhouse:nearform |
| real-work-from-anywhere | 143 | 104 | 32 | real-work-from-anywhere |
| ashby | 128 | 128 | 9 | ashby:multiplymii, ashby:foundry-for-good, ashby:gradient, ashby:payscale, ashby:circulareconomysystems, ashby:molecule, ashby:the-studio, ashby:getground, ashby:luxor, ashby:finch, ashby:homera-health, ashby:amplify, ashby:ashby, ashby:camunda, ashby:supabase, ashby:tremendous |
| lever | 78 | 78 | 17 | lever:truezerotech, lever:snappr, lever:tenna, lever:deliverect, lever:applydigital, lever:brafton, lever:decilegroup, lever:lwolf, lever:repurposeglobal, lever:beaverprocess, lever:90seconds, lever:hso, lever:trustarc |
| remote-ok | 60 | 39 | 15 | remote-ok |
| jobicy | 53 | 11 | 4 | jobicy-supporting-apac, jobicy-admin-support-apac |
| remotive | 14 | 5 | 0 | remotive |
| himalayas | 2 | 2 | 0 | himalayas:remote-jobs |
| authentic-jobs | 0 | 0 | 0 | authentic-jobs |
| dribbble | 0 | 0 | 0 | dribbble |

## Supply by exact source_id

| source_id | platform | active | net-new 7d | net-new 30d | inactive |
| --- | --- | ---: | ---: | ---: | ---: |
| we-work-remotely | WeWorkRemotely | 472 | 113 | 385 | 1307 |
| workable:hunt-st | Hunt St | 198 | 23 | 198 | 3 |
| breezy:20four7va | 20Four7VA | 147 | 14 | 85 | 128 |
| real-work-from-anywhere | RealWorkFromAnywhere | 143 | 32 | 104 | 520 |
| greenhouse:canonical | Canonical | 124 | 0 | 124 | 188 |
| breezy:sourcefit | Breezy/sourcefit | 104 | 11 | 73 | 148 |
| ashby:multiplymii | Ashby/multiplymii | 77 | 6 | 77 | 0 |
| remote-ok | RemoteOK | 60 | 15 | 39 | 1193 |
| jobicy-supporting-apac | Jobicy | 48 | 3 | 10 | 95 |
| workable:coconutva | Coconut VA | 41 | 0 | 41 | 21 |
| workable:crewbloom | CrewBloom | 37 | 2 | 37 | 13 |
| ashby:foundry-for-good | Ashby/foundry-for-good | 27 | 0 | 27 | 0 |
| workable:pearltalent | Pearl Talent | 18 | 0 | 18 | 26 |
| lever:truezerotech | Lever/truezerotech | 17 | 0 | 17 | 0 |
| breezy:remote-craft | Remote Craft | 14 | 0 | 14 | 1 |
| greenhouse:remotecom | Remote.com | 14 | 0 | 8 | 608 |
| remotive | Remotive | 14 | 0 | 5 | 89 |
| lever:snappr | Lever/snappr | 13 | 0 | 13 | 0 |
| breezy:yokly | Yokly | 12 | 0 | 12 | 0 |
| lever:tenna | Lever/tenna | 11 | 11 | 11 | 0 |
| breezy:value-virtual-assistants | VALUE Virtual Assistants | 10 | 0 | 10 | 1 |
| lever:deliverect | Lever/deliverect | 9 | 0 | 9 | 0 |
| workable:rocketams | RocketAMS | 7 | 0 | 7 | 2 |
| greenhouse:gitlab | GitLab | 6 | 3 | 6 | 548 |
| lever:applydigital | Lever/applydigital | 6 | 6 | 6 | 0 |
| ashby:gradient | Ashby/gradient | 5 | 0 | 5 | 0 |
| jobicy-admin-support-apac | Jobicy | 5 | 1 | 1 | 8 |
| lever:brafton | Lever/brafton | 5 | 0 | 5 | 0 |
| lever:decilegroup | Lever/decilegroup | 5 | 0 | 5 | 0 |
| ashby:payscale | Ashby/payscale | 4 | 0 | 4 | 0 |
| lever:lwolf | Lever/lwolf | 4 | 0 | 4 | 0 |
| ashby:circulareconomysystems | Ashby/circulareconomysystems | 3 | 0 | 3 | 0 |
| ashby:molecule | Ashby/molecule | 3 | 0 | 3 | 0 |
| ashby:the-studio | Ashby/the-studio | 3 | 0 | 3 | 0 |
| lever:repurposeglobal | Lever/repurposeglobal | 3 | 0 | 3 | 0 |
| ashby:getground | Ashby/getground | 2 | 0 | 2 | 0 |
| ashby:luxor | Ashby/luxor | 2 | 2 | 2 | 0 |
| greenhouse:janes | Greenhouse/janes | 2 | 0 | 2 | 0 |
| himalayas:remote-jobs | Himalayas | 2 | 0 | 2 | 0 |
| lever:beaverprocess | Lever/beaverprocess | 2 | 0 | 2 | 0 |
| ashby:finch | Ashby/finch | 1 | 1 | 1 | 0 |
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
| we-work-remotely | 133 | 567 | 0 | 9 | 0 | 11746 |
| remotive | 130 | 579 | 0 | 0 | 0 | 2006 |
| ashby:multiplymii | 113 | 0 | 596 | 0 | 0 | 6479 |
| breezy:20four7va | 113 | 0 | 1304 | 0 | 0 | 12767 |
| breezy:remote-craft | 113 | 0 | 596 | 0 | 0 | 1695 |
| breezy:sourcefit | 112 | 0 | 596 | 0 | 0 | 9891 |
| breezy:time-etc | 112 | 0 | 596 | 0 | 0 | 112 |
| breezy:value-virtual-assistants | 112 | 0 | 596 | 0 | 0 | 1232 |
| breezy:yokly | 112 | 0 | 595 | 0 | 0 | 1232 |
| greenhouse:canonical | 112 | 0 | 595 | 0 | 0 | 34759 |
| greenhouse:ghost | 112 | 0 | 595 | 0 | 0 | 672 |
| greenhouse:gitlab | 112 | 0 | 595 | 0 | 0 | 24625 |
| greenhouse:grafanalabs | 112 | 0 | 595 | 0 | 0 | 12050 |
| greenhouse:nearform | 112 | 0 | 594 | 0 | 0 | 2413 |
| real-work-from-anywhere | 112 | 0 | 596 | 1 | 0 | 5600 |
| greenhouse:remotecom | 70 | 0 | 594 | 42 | 70 | 0 |
| remote-ok | 38 | 74 | 596 | 1 | 0 | 1569 |
| jobicy-supporting-apac | 16 | 94 | 598 | 1 | 0 | 640 |
| jobicy-admin-support-apac | 5 | 107 | 597 | 0 | 0 | 16 |
| ashby:amplify | 0 | 0 | 708 | 0 | 0 | 0 |
| ashby:ashby | 0 | 0 | 708 | 0 | 0 | 0 |
| ashby:camunda | 0 | 0 | 708 | 0 | 0 | 0 |
| ashby:circulareconomysystems | 0 | 0 | 708 | 0 | 0 | 0 |
| ashby:foundry-for-good | 0 | 0 | 708 | 0 | 0 | 0 |
| ashby:getground | 0 | 0 | 708 | 0 | 0 | 0 |
| ashby:gradient | 0 | 0 | 708 | 0 | 0 | 0 |
| ashby:luxor | 0 | 0 | 17 | 0 | 0 | 0 |
| ashby:molecule | 0 | 0 | 708 | 0 | 0 | 0 |
| ashby:payscale | 0 | 0 | 708 | 0 | 0 | 0 |
| ashby:supabase | 0 | 0 | 708 | 0 | 0 | 0 |
| ashby:the-studio | 0 | 0 | 708 | 0 | 0 | 0 |
| ashby:tremendous | 0 | 0 | 708 | 0 | 0 | 0 |
| authentic-jobs | 0 | 0 | 709 | 0 | 0 | 0 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 708 | 0 | 0 | 0 |
| dribbble | 0 | 0 | 709 | 0 | 0 | 0 |
| jobspresso | 0 | 0 | 709 | 0 | 0 | 0 |
| lever:applydigital | 0 | 0 | 119 | 0 | 0 | 0 |
| lever:beaverprocess | 0 | 0 | 708 | 0 | 0 | 0 |
| lever:brafton | 0 | 0 | 708 | 0 | 0 | 0 |
| lever:decilegroup | 0 | 0 | 708 | 0 | 0 | 0 |
| lever:deliverect | 0 | 0 | 708 | 0 | 0 | 0 |
| lever:lwolf | 0 | 0 | 708 | 0 | 0 | 0 |
| lever:repurposeglobal | 0 | 0 | 708 | 0 | 0 | 0 |
| lever:snappr | 0 | 0 | 708 | 0 | 0 | 0 |
| lever:tenna | 0 | 0 | 119 | 0 | 0 | 0 |
| lever:truezerotech | 0 | 0 | 708 | 0 | 0 | 0 |
| lever:vaultoutsourcing | 0 | 0 | 708 | 0 | 0 | 0 |
| onlinejobs-ph | 0 | 0 | 709 | 0 | 0 | 0 |
| problogger | 0 | 0 | 709 | 0 | 0 | 0 |
| remote-co | 0 | 0 | 709 | 0 | 0 | 0 |
| workable:coconutva | 0 | 0 | 708 | 0 | 0 | 0 |
| workable:connectos | 0 | 0 | 708 | 0 | 0 | 0 |
| workable:crewbloom | 0 | 0 | 708 | 0 | 0 | 0 |
| workable:global-strategic | 0 | 0 | 708 | 0 | 0 | 0 |
| workable:hello-rache | 0 | 0 | 708 | 0 | 0 | 0 |
| workable:hunt-st | 0 | 0 | 708 | 0 | 0 | 0 |
| workable:myoutdesk | 0 | 0 | 708 | 0 | 0 | 0 |
| workable:outsource-access | 0 | 0 | 708 | 0 | 0 | 0 |
| workable:pearltalent | 0 | 0 | 708 | 0 | 0 | 0 |
| workable:pineapple-staffing | 0 | 0 | 708 | 0 | 0 | 0 |
| workable:rocketams | 0 | 0 | 708 | 0 | 0 | 0 |
| workable:staff-domain-inc | 0 | 0 | 708 | 0 | 0 | 0 |
| workable:superstaff | 0 | 0 | 708 | 0 | 0 | 0 |
| workable:virtualstaff365 | 0 | 0 | 708 | 0 | 0 | 0 |

## Geo & eligibility triage outcomes (last 7 days)

Breakdown of stored opportunities by Philippines eligibility verdict.

| source_id | eligible | unclear | ineligible | policy_rejected | total | qualified_rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 113 | 0 | 21 | 21 | 134 | 84.3% |
| greenhouse:gitlab | 3 | 0 | 30 | 30 | 33 | 9.1% |
| real-work-from-anywhere | 32 | 1 | 0 | 1 | 33 | 97.0% |
| remote-ok | 15 | 5 | 6 | 11 | 26 | 57.7% |
| workable:hunt-st | 23 | 0 | 0 | 0 | 23 | 100.0% |
| breezy:20four7va | 14 | 0 | 0 | 0 | 14 | 100.0% |
| greenhouse:grafanalabs | 0 | 0 | 13 | 13 | 13 | 0.0% |
| breezy:sourcefit | 11 | 0 | 0 | 4 | 11 | 100.0% |
| lever:tenna | 11 | 0 | 0 | 0 | 11 | 100.0% |
| jobicy-supporting-apac | 3 | 0 | 5 | 5 | 8 | 37.5% |
| ashby:multiplymii | 6 | 0 | 0 | 0 | 6 | 100.0% |
| lever:applydigital | 6 | 0 | 0 | 0 | 6 | 100.0% |
| ashby:luxor | 2 | 0 | 0 | 0 | 2 | 100.0% |
| workable:crewbloom | 2 | 0 | 0 | 0 | 2 | 100.0% |
| ashby:finch | 1 | 0 | 0 | 0 | 1 | 100.0% |
| jobicy-admin-support-apac | 1 | 0 | 0 | 0 | 1 | 100.0% |

## Yield efficiency (last 7 days)

Yield per real (changed) fetch and per 100 items seen.

| source_id | real fetches | items seen | eligible stored | yield / fetch | yield / 100 items |
| --- | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 133 | 11746 | 113 | 0.85 | 0.96 |
| remotive | 130 | 2006 | 0 | 0.00 | 0.00 |
| ashby:multiplymii | 113 | 6479 | 6 | 0.05 | 0.09 |
| breezy:20four7va | 113 | 12767 | 14 | 0.12 | 0.11 |
| breezy:remote-craft | 113 | 1695 | 0 | 0.00 | 0.00 |
| breezy:sourcefit | 112 | 9891 | 11 | 0.10 | 0.11 |
| breezy:time-etc | 112 | 112 | 0 | 0.00 | 0.00 |
| breezy:value-virtual-assistants | 112 | 1232 | 0 | 0.00 | 0.00 |
| breezy:yokly | 112 | 1232 | 0 | 0.00 | 0.00 |
| greenhouse:canonical | 112 | 34759 | 0 | 0.00 | 0.00 |
| greenhouse:ghost | 112 | 672 | 0 | 0.00 | 0.00 |
| greenhouse:gitlab | 112 | 24625 | 3 | 0.03 | 0.01 |
| greenhouse:grafanalabs | 112 | 12050 | 0 | 0.00 | 0.00 |
| greenhouse:nearform | 112 | 2413 | 0 | 0.00 | 0.00 |
| real-work-from-anywhere | 112 | 5600 | 32 | 0.29 | 0.57 |
| greenhouse:remotecom | 70 | 0 | 0 | 0.00 | 0.00 |
| remote-ok | 38 | 1569 | 15 | 0.39 | 0.96 |
| jobicy-supporting-apac | 16 | 640 | 3 | 0.19 | 0.47 |
| jobicy-admin-support-apac | 5 | 16 | 1 | 0.20 | 6.25 |
| ashby:amplify | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:ashby | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:camunda | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:circulareconomysystems | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:foundry-for-good | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:getground | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:gradient | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:luxor | 0 | 0 | 2 | 0.00 | 0.00 |
| ashby:molecule | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:payscale | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:supabase | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:the-studio | 0 | 0 | 0 | 0.00 | 0.00 |
| ashby:tremendous | 0 | 0 | 0 | 0.00 | 0.00 |
| authentic-jobs | 0 | 0 | 0 | 0.00 | 0.00 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 0 | 0.00 | 0.00 |
| dribbble | 0 | 0 | 0 | 0.00 | 0.00 |
| jobspresso | 0 | 0 | 0 | 0.00 | 0.00 |
| lever:applydigital | 0 | 0 | 6 | 0.00 | 0.00 |
| lever:beaverprocess | 0 | 0 | 0 | 0.00 | 0.00 |
| lever:brafton | 0 | 0 | 0 | 0.00 | 0.00 |
| lever:decilegroup | 0 | 0 | 0 | 0.00 | 0.00 |
| lever:deliverect | 0 | 0 | 0 | 0.00 | 0.00 |
| lever:lwolf | 0 | 0 | 0 | 0.00 | 0.00 |
| lever:repurposeglobal | 0 | 0 | 0 | 0.00 | 0.00 |
| lever:snappr | 0 | 0 | 0 | 0.00 | 0.00 |
| lever:tenna | 0 | 0 | 11 | 0.00 | 0.00 |
| lever:truezerotech | 0 | 0 | 0 | 0.00 | 0.00 |
| lever:vaultoutsourcing | 0 | 0 | 0 | 0.00 | 0.00 |
| onlinejobs-ph | 0 | 0 | 0 | 0.00 | 0.00 |
| problogger | 0 | 0 | 0 | 0.00 | 0.00 |
| remote-co | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:coconutva | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:connectos | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:crewbloom | 0 | 0 | 2 | 0.00 | 0.00 |
| workable:global-strategic | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:hello-rache | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:hunt-st | 0 | 0 | 23 | 0.00 | 0.00 |
| workable:myoutdesk | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:outsource-access | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:pearltalent | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:pineapple-staffing | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:rocketams | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:staff-domain-inc | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:superstaff | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:virtualstaff365 | 0 | 0 | 0 | 0.00 | 0.00 |
