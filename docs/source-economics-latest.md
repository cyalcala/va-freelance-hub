# Source economics — latest (SP-02)

- **As of:** 2026-10-21T07:57:01.757Z
- **Windows:** 7d/14d/30d net-new by `scraped_at`
- **Reconciliation:** OK (every partition delta is zero)
- Read-only report; regenerate with `scripts/diagnostics/source-economics.ts`.

## Qualified supply (strict eligibility; first-stored proxy)

Excludes unclear/ineligible rows. Historical publication and later deactivation are not fully reconstructed.

| qualified active | qualified new 7d | per day (7d) | qualified new 30d | per day (30d) |
| ---: | ---: | ---: | ---: | ---: |
| 1834 | 326 | 46.57 | 1535 | 51.17 |

## Identity coverage (SP-01)

| total | with source_id | null source_id | coverage | active null-id |
| ---: | ---: | ---: | ---: | ---: |
| 7772 | 7772 | 0 | 100.0% | 0 |

## Net-new accepted supply

| active | net-new 7d | net-new 14d | net-new 30d |
| ---: | ---: | ---: | ---: |
| 1834 | 326 | 502 | 1535 |

## Provider-family concentration (ADR-006 §7)

- **Net-new 30d:** top family `we-work-remotely` 28.4%; top-3 64.0%.
- **Active:** top family `we-work-remotely` 28.1%; top-3 63.0%.
- `(unknown)` legacy rows are excluded from these shares.

| provider family | active | net-new 30d | net-new 7d | source ids |
| --- | ---: | ---: | ---: | --- |
| we-work-remotely | 516 | 436 | 120 | we-work-remotely |
| workable | 347 | 347 | 70 | workable:hunt-st, workable:coconutva, workable:crewbloom, workable:pearltalent, workable:rocketams, workable:hello-rache, workable:pineapple-staffing |
| breezy | 293 | 200 | 16 | breezy:20four7va, breezy:sourcefit, breezy:remote-craft, breezy:yokly, breezy:value-virtual-assistants, breezy:time-etc |
| real-work-from-anywhere | 151 | 111 | 40 | real-work-from-anywhere |
| greenhouse | 148 | 141 | 3 | greenhouse:canonical, greenhouse:remotecom, greenhouse:gitlab, greenhouse:janes, greenhouse:ghost, greenhouse:trainingthestreet, greenhouse:grafanalabs, greenhouse:nearform |
| ashby | 130 | 130 | 9 | ashby:multiplymii, ashby:foundry-for-good, ashby:gradient, ashby:payscale, ashby:circulareconomysystems, ashby:molecule, ashby:the-studio, ashby:getground, ashby:luxor, ashby:finch, ashby:homera-health, ashby:amplify, ashby:ashby, ashby:camunda, ashby:supabase, ashby:tremendous |
| lever | 110 | 110 | 49 | lever:vacancies, lever:truezerotech, lever:snappr, lever:tenna, lever:deliverect, lever:applydigital, lever:brafton, lever:decilegroup, lever:outsourcedstaff, lever:lwolf, lever:willowinc, lever:gushwork, lever:repurposeglobal, lever:beaverprocess, lever:90seconds, lever:hso, lever:trustarc |
| remote-ok | 65 | 41 | 12 | remote-ok |
| jobicy | 58 | 14 | 6 | jobicy-supporting-apac, jobicy-admin-support-apac |
| remotive | 14 | 3 | 1 | remotive |
| himalayas | 2 | 2 | 0 | himalayas:remote-jobs |
| authentic-jobs | 0 | 0 | 0 | authentic-jobs |
| dribbble | 0 | 0 | 0 | dribbble |

## Supply by exact source_id

| source_id | platform | active | net-new 7d | net-new 30d | inactive |
| --- | --- | ---: | ---: | ---: | ---: |
| we-work-remotely | WeWorkRemotely | 516 | 120 | 436 | 1362 |
| workable:hunt-st | Hunt St | 227 | 52 | 227 | 4 |
| real-work-from-anywhere | RealWorkFromAnywhere | 151 | 40 | 111 | 529 |
| breezy:20four7va | 20Four7VA | 149 | 8 | 87 | 128 |
| greenhouse:canonical | Canonical | 124 | 0 | 124 | 189 |
| breezy:sourcefit | Breezy/sourcefit | 108 | 8 | 77 | 149 |
| ashby:multiplymii | Ashby/multiplymii | 79 | 6 | 79 | 0 |
| remote-ok | RemoteOK | 65 | 12 | 41 | 1198 |
| jobicy-supporting-apac | Jobicy | 52 | 4 | 12 | 97 |
| workable:coconutva | Coconut VA | 51 | 10 | 51 | 21 |
| workable:crewbloom | CrewBloom | 38 | 3 | 38 | 36 |
| ashby:foundry-for-good | Ashby/foundry-for-good | 27 | 0 | 27 | 0 |
| workable:pearltalent | Pearl Talent | 22 | 4 | 22 | 40 |
| lever:vacancies | Lever/vacancies | 20 | 20 | 20 | 0 |
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
| greenhouse:gitlab | GitLab | 6 | 3 | 6 | 557 |
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
| greenhouse:grafanalabs | Grafana Labs | 0 | 0 | 0 | 361 |
| greenhouse:nearform | Nearform | 0 | 0 | 0 | 55 |
| workable:pineapple-staffing | Pineapple Staffing | 0 | 0 | 0 | 3 |

## Fetch outcomes (last 7 days)

Separates real (changed) fetches from unchanged 304 polls, intentional skips, failures, and true zero-yield. `items` counts only changed fetches, so carried-forward unchanged counts never read as new supply.

| source_id | real fetches | unchanged | skips | failures | zero-yield | items |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| remotive | 164 | 799 | 0 | 0 | 0 | 2078 |
| ashby:multiplymii | 149 | 0 | 814 | 0 | 0 | 8704 |
| breezy:20four7va | 149 | 0 | 1777 | 0 | 0 | 17336 |
| breezy:remote-craft | 149 | 0 | 814 | 0 | 0 | 2235 |
| breezy:sourcefit | 149 | 0 | 814 | 0 | 0 | 13119 |
| breezy:time-etc | 149 | 0 | 814 | 0 | 0 | 149 |
| breezy:value-virtual-assistants | 149 | 0 | 814 | 0 | 0 | 1639 |
| breezy:yokly | 149 | 0 | 814 | 0 | 37 | 1232 |
| greenhouse:canonical | 149 | 0 | 814 | 0 | 0 | 46106 |
| greenhouse:ghost | 149 | 0 | 814 | 0 | 0 | 894 |
| greenhouse:gitlab | 149 | 0 | 814 | 0 | 0 | 33719 |
| greenhouse:grafanalabs | 149 | 0 | 814 | 0 | 0 | 17326 |
| greenhouse:nearform | 149 | 0 | 814 | 0 | 0 | 3315 |
| real-work-from-anywhere | 148 | 0 | 814 | 1 | 0 | 7400 |
| we-work-remotely | 127 | 828 | 0 | 8 | 0 | 11238 |
| remote-ok | 31 | 117 | 814 | 1 | 0 | 1288 |
| jobicy-supporting-apac | 23 | 122 | 816 | 2 | 0 | 920 |
| greenhouse:remotecom | 19 | 0 | 814 | 130 | 19 | 0 |
| workable:hello-rache | 17 | 0 | 944 | 2 | 0 | 51 |
| workable:hunt-st | 17 | 0 | 945 | 1 | 0 | 2427 |
| workable:pearltalent | 17 | 0 | 944 | 2 | 0 | 4918 |
| workable:rocketams | 17 | 0 | 945 | 1 | 0 | 170 |
| workable:coconutva | 16 | 0 | 944 | 3 | 0 | 512 |
| workable:crewbloom | 16 | 0 | 944 | 3 | 0 | 2300 |
| jobicy-admin-support-apac | 4 | 143 | 816 | 0 | 0 | 16 |
| ashby:amplify | 0 | 0 | 963 | 0 | 0 | 0 |
| ashby:ashby | 0 | 0 | 963 | 0 | 0 | 0 |
| ashby:camunda | 0 | 0 | 963 | 0 | 0 | 0 |
| ashby:circulareconomysystems | 0 | 0 | 963 | 0 | 0 | 0 |
| ashby:foundry-for-good | 0 | 0 | 963 | 0 | 0 | 0 |
| ashby:getground | 0 | 0 | 963 | 0 | 0 | 0 |
| ashby:gradient | 0 | 0 | 963 | 0 | 0 | 0 |
| ashby:luxor | 0 | 0 | 591 | 0 | 0 | 0 |
| ashby:molecule | 0 | 0 | 963 | 0 | 0 | 0 |
| ashby:payscale | 0 | 0 | 963 | 0 | 0 | 0 |
| ashby:supabase | 0 | 0 | 963 | 0 | 0 | 0 |
| ashby:the-studio | 0 | 0 | 963 | 0 | 0 | 0 |
| ashby:tremendous | 0 | 0 | 963 | 0 | 0 | 0 |
| authentic-jobs | 0 | 0 | 963 | 0 | 0 | 0 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 963 | 0 | 0 | 0 |
| dribbble | 0 | 0 | 963 | 0 | 0 | 0 |
| jobspresso | 0 | 0 | 963 | 0 | 0 | 0 |
| lever:applydigital | 0 | 0 | 693 | 0 | 0 | 0 |
| lever:beaverprocess | 0 | 0 | 963 | 0 | 0 | 0 |
| lever:brafton | 0 | 0 | 963 | 0 | 0 | 0 |
| lever:decilegroup | 0 | 0 | 963 | 0 | 0 | 0 |
| lever:deliverect | 0 | 0 | 963 | 0 | 0 | 0 |
| lever:gushwork | 0 | 0 | 311 | 0 | 0 | 0 |
| lever:lwolf | 0 | 0 | 963 | 0 | 0 | 0 |
| lever:outsourcedstaff | 0 | 0 | 388 | 0 | 0 | 0 |
| lever:repurposeglobal | 0 | 0 | 963 | 0 | 0 | 0 |
| lever:snappr | 0 | 0 | 963 | 0 | 0 | 0 |
| lever:tenna | 0 | 0 | 693 | 0 | 0 | 0 |
| lever:truezerotech | 0 | 0 | 963 | 0 | 0 | 0 |
| lever:vacancies | 0 | 0 | 205 | 0 | 0 | 0 |
| lever:vaultoutsourcing | 0 | 0 | 963 | 0 | 0 | 0 |
| lever:willowinc | 0 | 0 | 205 | 0 | 0 | 0 |
| onlinejobs-ph | 0 | 0 | 963 | 0 | 0 | 0 |
| problogger | 0 | 0 | 963 | 0 | 0 | 0 |
| remote-co | 0 | 0 | 963 | 0 | 0 | 0 |
| workable:connectos | 0 | 0 | 963 | 0 | 0 | 0 |
| workable:global-strategic | 0 | 0 | 963 | 0 | 0 | 0 |
| workable:myoutdesk | 0 | 0 | 963 | 0 | 0 | 0 |
| workable:outsource-access | 0 | 0 | 963 | 0 | 0 | 0 |
| workable:pineapple-staffing | 0 | 0 | 963 | 0 | 0 | 0 |
| workable:staff-domain-inc | 0 | 0 | 963 | 0 | 0 | 0 |
| workable:superstaff | 0 | 0 | 963 | 0 | 0 | 0 |
| workable:virtualstaff365 | 0 | 0 | 963 | 0 | 0 | 0 |

## Geo & eligibility triage outcomes (last 7 days)

Breakdown of stored opportunities by Philippines eligibility verdict.

| source_id | eligible | unclear | ineligible | policy_rejected | total | qualified_rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 120 | 7 | 22 | 23 | 149 | 80.5% |
| workable:hunt-st | 52 | 0 | 1 | 1 | 53 | 98.1% |
| real-work-from-anywhere | 40 | 1 | 1 | 2 | 42 | 95.2% |
| greenhouse:gitlab | 3 | 0 | 33 | 33 | 36 | 8.3% |
| greenhouse:grafanalabs | 0 | 0 | 35 | 35 | 35 | 0.0% |
| workable:crewbloom | 3 | 0 | 23 | 23 | 26 | 11.5% |
| remote-ok | 12 | 6 | 6 | 12 | 24 | 50.0% |
| lever:vacancies | 20 | 0 | 0 | 0 | 20 | 100.0% |
| workable:pearltalent | 4 | 0 | 14 | 14 | 18 | 22.2% |
| lever:tenna | 11 | 0 | 0 | 0 | 11 | 100.0% |
| workable:coconutva | 10 | 0 | 0 | 0 | 10 | 100.0% |
| breezy:sourcefit | 8 | 0 | 1 | 4 | 9 | 88.9% |
| breezy:20four7va | 8 | 0 | 0 | 0 | 8 | 100.0% |
| jobicy-supporting-apac | 4 | 0 | 3 | 3 | 7 | 57.1% |
| ashby:multiplymii | 6 | 0 | 0 | 0 | 6 | 100.0% |
| lever:applydigital | 6 | 0 | 0 | 0 | 6 | 100.0% |
| lever:outsourcedstaff | 5 | 0 | 0 | 0 | 5 | 100.0% |
| lever:willowinc | 4 | 0 | 0 | 0 | 4 | 100.0% |
| lever:gushwork | 3 | 0 | 0 | 0 | 3 | 100.0% |
| ashby:luxor | 2 | 0 | 0 | 0 | 2 | 100.0% |
| jobicy-admin-support-apac | 2 | 0 | 0 | 0 | 2 | 100.0% |
| ashby:finch | 1 | 0 | 0 | 0 | 1 | 100.0% |
| greenhouse:canonical | 0 | 0 | 1 | 1 | 1 | 0.0% |
| remotive | 1 | 0 | 0 | 0 | 1 | 100.0% |
| workable:rocketams | 1 | 0 | 0 | 0 | 1 | 100.0% |

## Yield efficiency (last 7 days)

Stored eligibility per real (changed) fetch and per 100 items seen; not marginal verified first-publication yield.
UNKNOWN means a count is missing/invalid or its denominator is zero. Fetch and stored cohorts may differ across intake paths; these descriptive ratios do not establish source productivity or causal yield.

| source_id | real fetches | items seen | eligible stored | yield / fetch | yield / 100 items |
| --- | ---: | ---: | ---: | ---: | ---: |
| remotive | 164 | 2078 | 1 | 0.01 | 0.05 |
| ashby:multiplymii | 149 | 8704 | 6 | 0.04 | 0.07 |
| breezy:20four7va | 149 | 17336 | 8 | 0.05 | 0.05 |
| breezy:remote-craft | 149 | 2235 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:sourcefit | 149 | 13119 | 8 | 0.05 | 0.06 |
| breezy:time-etc | 149 | 149 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:value-virtual-assistants | 149 | 1639 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:yokly | 149 | 1232 | UNKNOWN | UNKNOWN | UNKNOWN |
| greenhouse:canonical | 149 | 46106 | 0 | 0.00 | 0.00 |
| greenhouse:ghost | 149 | 894 | UNKNOWN | UNKNOWN | UNKNOWN |
| greenhouse:gitlab | 149 | 33719 | 3 | 0.02 | 0.01 |
| greenhouse:grafanalabs | 149 | 17326 | 0 | 0.00 | 0.00 |
| greenhouse:nearform | 149 | 3315 | UNKNOWN | UNKNOWN | UNKNOWN |
| real-work-from-anywhere | 148 | 7400 | 40 | 0.27 | 0.54 |
| we-work-remotely | 127 | 11238 | 120 | 0.94 | 1.07 |
| remote-ok | 31 | 1288 | 12 | 0.39 | 0.93 |
| jobicy-supporting-apac | 23 | 920 | 4 | 0.17 | 0.43 |
| greenhouse:remotecom | 19 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| workable:hello-rache | 17 | 51 | UNKNOWN | UNKNOWN | UNKNOWN |
| workable:hunt-st | 17 | 2427 | 52 | 3.06 | 2.14 |
| workable:pearltalent | 17 | 4918 | 4 | 0.24 | 0.08 |
| workable:rocketams | 17 | 170 | 1 | 0.06 | 0.59 |
| workable:coconutva | 16 | 512 | 10 | 0.63 | 1.95 |
| workable:crewbloom | 16 | 2300 | 3 | 0.19 | 0.13 |
| jobicy-admin-support-apac | 4 | 16 | 2 | 0.50 | 12.50 |
| ashby:amplify | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:ashby | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:camunda | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:circulareconomysystems | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:foundry-for-good | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:getground | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:gradient | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:luxor | 0 | 0 | 2 | UNKNOWN | UNKNOWN |
| ashby:molecule | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:payscale | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:supabase | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:the-studio | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:tremendous | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| authentic-jobs | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:vaaphilippines-recruitment | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| dribbble | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| jobspresso | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:applydigital | 0 | 0 | 6 | UNKNOWN | UNKNOWN |
| lever:beaverprocess | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:brafton | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:decilegroup | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:deliverect | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:gushwork | 0 | 0 | 3 | UNKNOWN | UNKNOWN |
| lever:lwolf | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:outsourcedstaff | 0 | 0 | 5 | UNKNOWN | UNKNOWN |
| lever:repurposeglobal | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:snappr | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:tenna | 0 | 0 | 11 | UNKNOWN | UNKNOWN |
| lever:truezerotech | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:vacancies | 0 | 0 | 20 | UNKNOWN | UNKNOWN |
| lever:vaultoutsourcing | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:willowinc | 0 | 0 | 4 | UNKNOWN | UNKNOWN |
| onlinejobs-ph | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| problogger | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| remote-co | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| workable:connectos | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| workable:global-strategic | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| workable:myoutdesk | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| workable:outsource-access | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| workable:pineapple-staffing | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| workable:staff-domain-inc | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| workable:superstaff | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| workable:virtualstaff365 | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:finch | UNKNOWN | UNKNOWN | 1 | UNKNOWN | UNKNOWN |
