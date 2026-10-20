# Source economics — latest (SP-02)

- **As of:** 2026-10-20T07:53:07.801Z
- **Windows:** 7d/14d/30d net-new by `scraped_at`
- **Reconciliation:** OK (every partition delta is zero)
- Read-only report; regenerate with `scripts/diagnostics/source-economics.ts`.

## Qualified supply (strict eligibility; first-stored proxy)

Excludes unclear/ineligible rows. Historical publication and later deactivation are not fully reconstructed.

| qualified active | qualified new 7d | per day (7d) | qualified new 30d | per day (30d) |
| ---: | ---: | ---: | ---: | ---: |
| 1772 | 289 | 41.29 | 1473 | 49.10 |

## Identity coverage (SP-01)

| total | with source_id | null source_id | coverage | active null-id |
| ---: | ---: | ---: | ---: | ---: |
| 7659 | 7659 | 0 | 100.0% | 0 |

## Net-new accepted supply

| active | net-new 7d | net-new 14d | net-new 30d |
| ---: | ---: | ---: | ---: |
| 1772 | 289 | 493 | 1473 |

## Provider-family concentration (ADR-006 §7)

- **Net-new 30d:** top family `we-work-remotely` 28.6%; top-3 63.2%.
- **Active:** top family `we-work-remotely` 28.4%; top-3 62.4%.
- `(unknown)` legacy rows are excluded from these shares.

| provider family | active | net-new 30d | net-new 7d | source ids |
| --- | ---: | ---: | ---: | --- |
| we-work-remotely | 504 | 422 | 123 | we-work-remotely |
| workable | 311 | 311 | 34 | workable:hunt-st, workable:coconutva, workable:crewbloom, workable:pearltalent, workable:rocketams, workable:hello-rache, workable:pineapple-staffing |
| breezy | 291 | 198 | 17 | breezy:20four7va, breezy:sourcefit, breezy:remote-craft, breezy:yokly, breezy:value-virtual-assistants, breezy:time-etc |
| greenhouse | 148 | 141 | 3 | greenhouse:canonical, greenhouse:remotecom, greenhouse:gitlab, greenhouse:janes, greenhouse:ghost, greenhouse:trainingthestreet, greenhouse:grafanalabs, greenhouse:nearform |
| real-work-from-anywhere | 142 | 101 | 32 | real-work-from-anywhere |
| ashby | 129 | 129 | 10 | ashby:multiplymii, ashby:foundry-for-good, ashby:gradient, ashby:payscale, ashby:circulareconomysystems, ashby:molecule, ashby:the-studio, ashby:getground, ashby:luxor, ashby:finch, ashby:homera-health, ashby:amplify, ashby:ashby, ashby:camunda, ashby:supabase, ashby:tremendous |
| lever | 110 | 110 | 49 | lever:vacancies, lever:truezerotech, lever:snappr, lever:tenna, lever:deliverect, lever:applydigital, lever:brafton, lever:decilegroup, lever:outsourcedstaff, lever:lwolf, lever:willowinc, lever:gushwork, lever:repurposeglobal, lever:beaverprocess, lever:90seconds, lever:hso, lever:trustarc |
| remote-ok | 64 | 42 | 14 | remote-ok |
| jobicy | 57 | 14 | 6 | jobicy-supporting-apac, jobicy-admin-support-apac |
| remotive | 14 | 3 | 1 | remotive |
| himalayas | 2 | 2 | 0 | himalayas:remote-jobs |
| authentic-jobs | 0 | 0 | 0 | authentic-jobs |
| dribbble | 0 | 0 | 0 | dribbble |

## Supply by exact source_id

| source_id | platform | active | net-new 7d | net-new 30d | inactive |
| --- | --- | ---: | ---: | ---: | ---: |
| we-work-remotely | WeWorkRemotely | 504 | 123 | 422 | 1353 |
| workable:hunt-st | Hunt St | 205 | 30 | 205 | 3 |
| breezy:20four7va | 20Four7VA | 148 | 10 | 86 | 128 |
| real-work-from-anywhere | RealWorkFromAnywhere | 142 | 32 | 101 | 532 |
| greenhouse:canonical | Canonical | 124 | 0 | 124 | 188 |
| breezy:sourcefit | Breezy/sourcefit | 107 | 7 | 76 | 148 |
| ashby:multiplymii | Ashby/multiplymii | 78 | 7 | 78 | 1 |
| remote-ok | RemoteOK | 64 | 14 | 42 | 1198 |
| jobicy-supporting-apac | Jobicy | 51 | 4 | 12 | 97 |
| workable:coconutva | Coconut VA | 41 | 0 | 41 | 21 |
| workable:crewbloom | CrewBloom | 38 | 3 | 38 | 13 |
| ashby:foundry-for-good | Ashby/foundry-for-good | 27 | 0 | 27 | 0 |
| lever:vacancies | Lever/vacancies | 20 | 20 | 20 | 0 |
| workable:pearltalent | Pearl Talent | 18 | 0 | 18 | 26 |
| lever:truezerotech | Lever/truezerotech | 17 | 0 | 17 | 0 |
| breezy:remote-craft | Remote Craft | 14 | 0 | 14 | 1 |
| greenhouse:remotecom | Remote.com | 14 | 0 | 8 | 608 |
| remotive | Remotive | 14 | 1 | 3 | 90 |
| lever:snappr | Lever/snappr | 13 | 0 | 13 | 0 |
| breezy:yokly | Yokly | 12 | 0 | 12 | 0 |
| lever:tenna | Lever/tenna | 11 | 11 | 11 | 0 |
| breezy:value-virtual-assistants | VALUE Virtual Assistants | 10 | 0 | 10 | 1 |
| lever:deliverect | Lever/deliverect | 9 | 0 | 9 | 0 |
| workable:rocketams | RocketAMS | 8 | 1 | 8 | 2 |
| greenhouse:gitlab | GitLab | 6 | 3 | 6 | 553 |
| jobicy-admin-support-apac | Jobicy | 6 | 2 | 2 | 8 |
| lever:applydigital | Lever/applydigital | 6 | 6 | 6 | 0 |
| ashby:gradient | Ashby/gradient | 5 | 0 | 5 | 0 |
| lever:brafton | Lever/brafton | 5 | 0 | 5 | 0 |
| lever:decilegroup | Lever/decilegroup | 5 | 0 | 5 | 0 |
| lever:outsourcedstaff | Lever/outsourcedstaff | 5 | 5 | 5 | 0 |
| ashby:payscale | Ashby/payscale | 4 | 0 | 4 | 0 |
| lever:lwolf | Lever/lwolf | 4 | 0 | 4 | 0 |
| lever:willowinc | Lever/willowinc | 4 | 4 | 4 | 0 |
| ashby:circulareconomysystems | Ashby/circulareconomysystems | 3 | 0 | 3 | 0 |
| ashby:molecule | Ashby/molecule | 3 | 0 | 3 | 0 |
| ashby:the-studio | Ashby/the-studio | 3 | 0 | 3 | 0 |
| lever:gushwork | Lever/gushwork | 3 | 3 | 3 | 0 |
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
| greenhouse:grafanalabs | Grafana Labs | 0 | 0 | 0 | 359 |
| greenhouse:nearform | Nearform | 0 | 0 | 0 | 55 |
| workable:pineapple-staffing | Pineapple Staffing | 0 | 0 | 0 | 3 |

## Fetch outcomes (last 7 days)

Separates real (changed) fetches from unchanged 304 polls, intentional skips, failures, and true zero-yield. `items` counts only changed fetches, so carried-forward unchanged counts never read as new supply.

| source_id | real fetches | unchanged | skips | failures | zero-yield | items |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| remotive | 163 | 780 | 0 | 0 | 0 | 2206 |
| ashby:multiplymii | 147 | 0 | 796 | 0 | 0 | 8525 |
| breezy:20four7va | 147 | 0 | 1739 | 0 | 0 | 17016 |
| breezy:remote-craft | 147 | 0 | 796 | 0 | 0 | 2205 |
| breezy:sourcefit | 147 | 0 | 796 | 0 | 0 | 13000 |
| breezy:time-etc | 147 | 0 | 796 | 0 | 0 | 147 |
| breezy:value-virtual-assistants | 147 | 0 | 796 | 0 | 0 | 1617 |
| breezy:yokly | 147 | 0 | 796 | 0 | 15 | 1452 |
| greenhouse:canonical | 147 | 0 | 796 | 0 | 0 | 45512 |
| greenhouse:ghost | 147 | 0 | 796 | 0 | 0 | 882 |
| greenhouse:gitlab | 147 | 0 | 796 | 0 | 0 | 33002 |
| greenhouse:grafanalabs | 147 | 0 | 796 | 0 | 0 | 16563 |
| greenhouse:nearform | 147 | 0 | 795 | 0 | 0 | 3229 |
| real-work-from-anywhere | 146 | 0 | 796 | 1 | 0 | 7300 |
| we-work-remotely | 125 | 809 | 0 | 9 | 0 | 11017 |
| remote-ok | 40 | 106 | 796 | 1 | 0 | 1661 |
| greenhouse:remotecom | 39 | 0 | 795 | 108 | 39 | 0 |
| jobicy-supporting-apac | 20 | 123 | 798 | 2 | 0 | 800 |
| jobicy-admin-support-apac | 6 | 139 | 798 | 0 | 0 | 21 |
| ashby:amplify | 0 | 0 | 943 | 0 | 0 | 0 |
| ashby:ashby | 0 | 0 | 943 | 0 | 0 | 0 |
| ashby:camunda | 0 | 0 | 943 | 0 | 0 | 0 |
| ashby:circulareconomysystems | 0 | 0 | 943 | 0 | 0 | 0 |
| ashby:foundry-for-good | 0 | 0 | 943 | 0 | 0 | 0 |
| ashby:getground | 0 | 0 | 943 | 0 | 0 | 0 |
| ashby:gradient | 0 | 0 | 943 | 0 | 0 | 0 |
| ashby:luxor | 0 | 0 | 444 | 0 | 0 | 0 |
| ashby:molecule | 0 | 0 | 943 | 0 | 0 | 0 |
| ashby:payscale | 0 | 0 | 943 | 0 | 0 | 0 |
| ashby:supabase | 0 | 0 | 943 | 0 | 0 | 0 |
| ashby:the-studio | 0 | 0 | 943 | 0 | 0 | 0 |
| ashby:tremendous | 0 | 0 | 943 | 0 | 0 | 0 |
| authentic-jobs | 0 | 0 | 943 | 0 | 0 | 0 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 943 | 0 | 0 | 0 |
| dribbble | 0 | 0 | 943 | 0 | 0 | 0 |
| jobspresso | 0 | 0 | 943 | 0 | 0 | 0 |
| lever:applydigital | 0 | 0 | 546 | 0 | 0 | 0 |
| lever:beaverprocess | 0 | 0 | 943 | 0 | 0 | 0 |
| lever:brafton | 0 | 0 | 943 | 0 | 0 | 0 |
| lever:decilegroup | 0 | 0 | 943 | 0 | 0 | 0 |
| lever:deliverect | 0 | 0 | 943 | 0 | 0 | 0 |
| lever:gushwork | 0 | 0 | 164 | 0 | 0 | 0 |
| lever:lwolf | 0 | 0 | 943 | 0 | 0 | 0 |
| lever:outsourcedstaff | 0 | 0 | 241 | 0 | 0 | 0 |
| lever:repurposeglobal | 0 | 0 | 943 | 0 | 0 | 0 |
| lever:snappr | 0 | 0 | 943 | 0 | 0 | 0 |
| lever:tenna | 0 | 0 | 546 | 0 | 0 | 0 |
| lever:truezerotech | 0 | 0 | 943 | 0 | 0 | 0 |
| lever:vacancies | 0 | 0 | 58 | 0 | 0 | 0 |
| lever:vaultoutsourcing | 0 | 0 | 943 | 0 | 0 | 0 |
| lever:willowinc | 0 | 0 | 58 | 0 | 0 | 0 |
| onlinejobs-ph | 0 | 0 | 943 | 0 | 0 | 0 |
| problogger | 0 | 0 | 943 | 0 | 0 | 0 |
| remote-co | 0 | 0 | 943 | 0 | 0 | 0 |
| workable:coconutva | 0 | 0 | 943 | 0 | 0 | 0 |
| workable:connectos | 0 | 0 | 943 | 0 | 0 | 0 |
| workable:crewbloom | 0 | 0 | 943 | 0 | 0 | 0 |
| workable:global-strategic | 0 | 0 | 943 | 0 | 0 | 0 |
| workable:hello-rache | 0 | 0 | 943 | 0 | 0 | 0 |
| workable:hunt-st | 0 | 0 | 943 | 0 | 0 | 0 |
| workable:myoutdesk | 0 | 0 | 943 | 0 | 0 | 0 |
| workable:outsource-access | 0 | 0 | 943 | 0 | 0 | 0 |
| workable:pearltalent | 0 | 0 | 943 | 0 | 0 | 0 |
| workable:pineapple-staffing | 0 | 0 | 943 | 0 | 0 | 0 |
| workable:rocketams | 0 | 0 | 943 | 0 | 0 | 0 |
| workable:staff-domain-inc | 0 | 0 | 943 | 0 | 0 | 0 |
| workable:superstaff | 0 | 0 | 943 | 0 | 0 | 0 |
| workable:virtualstaff365 | 0 | 0 | 943 | 0 | 0 | 0 |

## Geo & eligibility triage outcomes (last 7 days)

Breakdown of stored opportunities by Philippines eligibility verdict.

| source_id | eligible | unclear | ineligible | policy_rejected | total | qualified_rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 123 | 7 | 20 | 20 | 150 | 82.0% |
| greenhouse:grafanalabs | 0 | 0 | 39 | 39 | 39 | 0.0% |
| greenhouse:gitlab | 3 | 0 | 35 | 35 | 38 | 7.9% |
| real-work-from-anywhere | 32 | 5 | 1 | 2 | 38 | 84.2% |
| workable:hunt-st | 30 | 0 | 0 | 0 | 30 | 100.0% |
| remote-ok | 14 | 6 | 6 | 12 | 26 | 53.8% |
| lever:vacancies | 20 | 0 | 0 | 0 | 20 | 100.0% |
| lever:tenna | 11 | 0 | 0 | 0 | 11 | 100.0% |
| breezy:20four7va | 10 | 0 | 0 | 0 | 10 | 100.0% |
| ashby:multiplymii | 7 | 1 | 0 | 0 | 8 | 87.5% |
| jobicy-supporting-apac | 4 | 0 | 4 | 4 | 8 | 50.0% |
| breezy:sourcefit | 7 | 0 | 0 | 3 | 7 | 100.0% |
| lever:applydigital | 6 | 0 | 0 | 0 | 6 | 100.0% |
| lever:outsourcedstaff | 5 | 0 | 0 | 0 | 5 | 100.0% |
| lever:willowinc | 4 | 0 | 0 | 0 | 4 | 100.0% |
| lever:gushwork | 3 | 0 | 0 | 0 | 3 | 100.0% |
| workable:crewbloom | 3 | 0 | 0 | 0 | 3 | 100.0% |
| ashby:luxor | 2 | 0 | 0 | 0 | 2 | 100.0% |
| jobicy-admin-support-apac | 2 | 0 | 0 | 0 | 2 | 100.0% |
| ashby:finch | 1 | 0 | 0 | 0 | 1 | 100.0% |
| remotive | 1 | 0 | 0 | 0 | 1 | 100.0% |
| workable:rocketams | 1 | 0 | 0 | 0 | 1 | 100.0% |

## Yield efficiency (last 7 days)

Yield per real (changed) fetch and per 100 items seen.

| source_id | real fetches | items seen | eligible stored | yield / fetch | yield / 100 items |
| --- | ---: | ---: | ---: | ---: | ---: |
| remotive | 163 | 2206 | 1 | 0.01 | 0.05 |
| ashby:multiplymii | 147 | 8525 | 7 | 0.05 | 0.08 |
| breezy:20four7va | 147 | 17016 | 10 | 0.07 | 0.06 |
| breezy:remote-craft | 147 | 2205 | 0 | 0.00 | 0.00 |
| breezy:sourcefit | 147 | 13000 | 7 | 0.05 | 0.05 |
| breezy:time-etc | 147 | 147 | 0 | 0.00 | 0.00 |
| breezy:value-virtual-assistants | 147 | 1617 | 0 | 0.00 | 0.00 |
| breezy:yokly | 147 | 1452 | 0 | 0.00 | 0.00 |
| greenhouse:canonical | 147 | 45512 | 0 | 0.00 | 0.00 |
| greenhouse:ghost | 147 | 882 | 0 | 0.00 | 0.00 |
| greenhouse:gitlab | 147 | 33002 | 3 | 0.02 | 0.01 |
| greenhouse:grafanalabs | 147 | 16563 | 0 | 0.00 | 0.00 |
| greenhouse:nearform | 147 | 3229 | 0 | 0.00 | 0.00 |
| real-work-from-anywhere | 146 | 7300 | 32 | 0.22 | 0.44 |
| we-work-remotely | 125 | 11017 | 123 | 0.98 | 1.12 |
| remote-ok | 40 | 1661 | 14 | 0.35 | 0.84 |
| greenhouse:remotecom | 39 | 0 | 0 | 0.00 | 0.00 |
| jobicy-supporting-apac | 20 | 800 | 4 | 0.20 | 0.50 |
| jobicy-admin-support-apac | 6 | 21 | 2 | 0.33 | 9.52 |
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
| lever:gushwork | 0 | 0 | 3 | 0.00 | 0.00 |
| lever:lwolf | 0 | 0 | 0 | 0.00 | 0.00 |
| lever:outsourcedstaff | 0 | 0 | 5 | 0.00 | 0.00 |
| lever:repurposeglobal | 0 | 0 | 0 | 0.00 | 0.00 |
| lever:snappr | 0 | 0 | 0 | 0.00 | 0.00 |
| lever:tenna | 0 | 0 | 11 | 0.00 | 0.00 |
| lever:truezerotech | 0 | 0 | 0 | 0.00 | 0.00 |
| lever:vacancies | 0 | 0 | 20 | 0.00 | 0.00 |
| lever:vaultoutsourcing | 0 | 0 | 0 | 0.00 | 0.00 |
| lever:willowinc | 0 | 0 | 4 | 0.00 | 0.00 |
| onlinejobs-ph | 0 | 0 | 0 | 0.00 | 0.00 |
| problogger | 0 | 0 | 0 | 0.00 | 0.00 |
| remote-co | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:coconutva | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:connectos | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:crewbloom | 0 | 0 | 3 | 0.00 | 0.00 |
| workable:global-strategic | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:hello-rache | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:hunt-st | 0 | 0 | 30 | 0.00 | 0.00 |
| workable:myoutdesk | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:outsource-access | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:pearltalent | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:pineapple-staffing | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:rocketams | 0 | 0 | 1 | 0.00 | 0.00 |
| workable:staff-domain-inc | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:superstaff | 0 | 0 | 0 | 0.00 | 0.00 |
| workable:virtualstaff365 | 0 | 0 | 0 | 0.00 | 0.00 |
