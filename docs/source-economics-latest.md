# Source economics — latest (SP-02)

- **As of:** 2026-10-20T12:30:11.630Z
- **Windows:** 7d/14d/30d net-new by `scraped_at`
- **Reconciliation:** OK (every partition delta is zero)
- Read-only report; regenerate with `scripts/diagnostics/source-economics.ts`.

## Qualified supply (strict eligibility; first-stored proxy)

Excludes unclear/ineligible rows. Historical publication and later deactivation are not fully reconstructed.

| qualified active | qualified new 7d | per day (7d) | qualified new 30d | per day (30d) |
| ---: | ---: | ---: | ---: | ---: |
| 1794 | 305 | 43.57 | 1491 | 49.70 |

## Identity coverage (SP-01)

| total | with source_id | null source_id | coverage | active null-id |
| ---: | ---: | ---: | ---: | ---: |
| 7713 | 7713 | 0 | 100.0% | 0 |

## Net-new accepted supply

| active | net-new 7d | net-new 14d | net-new 30d |
| ---: | ---: | ---: | ---: |
| 1794 | 305 | 501 | 1491 |

## Provider-family concentration (ADR-006 §7)

- **Net-new 30d:** top family `we-work-remotely` 28.8%; top-3 63.3%.
- **Active:** top family `we-work-remotely` 28.8%; top-3 62.6%.
- `(unknown)` legacy rows are excluded from these shares.

| provider family | active | net-new 30d | net-new 7d | source ids |
| --- | ---: | ---: | ---: | --- |
| we-work-remotely | 516 | 430 | 130 | we-work-remotely |
| workable | 316 | 316 | 39 | workable:hunt-st, workable:coconutva, workable:crewbloom, workable:pearltalent, workable:rocketams, workable:hello-rache, workable:pineapple-staffing |
| breezy | 291 | 198 | 17 | breezy:20four7va, breezy:sourcefit, breezy:remote-craft, breezy:yokly, breezy:value-virtual-assistants, breezy:time-etc |
| greenhouse | 148 | 141 | 3 | greenhouse:canonical, greenhouse:remotecom, greenhouse:gitlab, greenhouse:janes, greenhouse:ghost, greenhouse:trainingthestreet, greenhouse:grafanalabs, greenhouse:nearform |
| real-work-from-anywhere | 146 | 105 | 35 | real-work-from-anywhere |
| ashby | 130 | 130 | 11 | ashby:multiplymii, ashby:foundry-for-good, ashby:gradient, ashby:payscale, ashby:circulareconomysystems, ashby:molecule, ashby:the-studio, ashby:getground, ashby:luxor, ashby:finch, ashby:homera-health, ashby:amplify, ashby:ashby, ashby:camunda, ashby:supabase, ashby:tremendous |
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
| we-work-remotely | WeWorkRemotely | 516 | 130 | 430 | 1347 |
| workable:hunt-st | Hunt St | 207 | 32 | 207 | 15 |
| breezy:20four7va | 20Four7VA | 148 | 10 | 86 | 128 |
| real-work-from-anywhere | RealWorkFromAnywhere | 146 | 35 | 105 | 528 |
| greenhouse:canonical | Canonical | 124 | 0 | 124 | 188 |
| breezy:sourcefit | Breezy/sourcefit | 107 | 7 | 76 | 148 |
| ashby:multiplymii | Ashby/multiplymii | 79 | 8 | 79 | 0 |
| remote-ok | RemoteOK | 64 | 14 | 42 | 1198 |
| jobicy-supporting-apac | Jobicy | 51 | 4 | 12 | 97 |
| workable:coconutva | Coconut VA | 43 | 2 | 43 | 24 |
| workable:crewbloom | CrewBloom | 38 | 3 | 38 | 32 |
| ashby:foundry-for-good | Ashby/foundry-for-good | 27 | 0 | 27 | 0 |
| lever:vacancies | Lever/vacancies | 20 | 20 | 20 | 0 |
| workable:pearltalent | Pearl Talent | 19 | 1 | 19 | 35 |
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
| remotive | 162 | 783 | 0 | 0 | 0 | 2166 |
| ashby:multiplymii | 147 | 0 | 798 | 0 | 0 | 8539 |
| breezy:20four7va | 147 | 0 | 1743 | 0 | 0 | 17036 |
| breezy:remote-craft | 147 | 0 | 798 | 0 | 0 | 2205 |
| breezy:sourcefit | 147 | 0 | 798 | 0 | 0 | 12988 |
| breezy:time-etc | 147 | 0 | 798 | 0 | 0 | 147 |
| breezy:value-virtual-assistants | 147 | 0 | 798 | 0 | 0 | 1617 |
| breezy:yokly | 147 | 0 | 798 | 0 | 19 | 1408 |
| greenhouse:canonical | 147 | 0 | 798 | 0 | 0 | 45504 |
| greenhouse:ghost | 147 | 0 | 798 | 0 | 0 | 882 |
| greenhouse:gitlab | 147 | 0 | 798 | 0 | 0 | 33033 |
| greenhouse:grafanalabs | 147 | 0 | 798 | 0 | 0 | 16675 |
| greenhouse:nearform | 147 | 0 | 797 | 0 | 0 | 3237 |
| real-work-from-anywhere | 146 | 0 | 798 | 1 | 0 | 7300 |
| we-work-remotely | 125 | 811 | 0 | 9 | 0 | 11022 |
| remote-ok | 40 | 106 | 798 | 1 | 0 | 1662 |
| greenhouse:remotecom | 35 | 0 | 797 | 112 | 35 | 0 |
| jobicy-supporting-apac | 20 | 123 | 800 | 2 | 0 | 800 |
| jobicy-admin-support-apac | 6 | 139 | 800 | 0 | 0 | 21 |
| workable:coconutva | 1 | 0 | 944 | 0 | 0 | 32 |
| workable:crewbloom | 1 | 0 | 944 | 0 | 0 | 152 |
| workable:hello-rache | 1 | 0 | 944 | 0 | 0 | 3 |
| workable:hunt-st | 1 | 0 | 944 | 0 | 0 | 143 |
| workable:pearltalent | 1 | 0 | 944 | 0 | 0 | 286 |
| workable:rocketams | 1 | 0 | 944 | 0 | 0 | 10 |
| ashby:amplify | 0 | 0 | 945 | 0 | 0 | 0 |
| ashby:ashby | 0 | 0 | 945 | 0 | 0 | 0 |
| ashby:camunda | 0 | 0 | 945 | 0 | 0 | 0 |
| ashby:circulareconomysystems | 0 | 0 | 945 | 0 | 0 | 0 |
| ashby:foundry-for-good | 0 | 0 | 945 | 0 | 0 | 0 |
| ashby:getground | 0 | 0 | 945 | 0 | 0 | 0 |
| ashby:gradient | 0 | 0 | 945 | 0 | 0 | 0 |
| ashby:luxor | 0 | 0 | 473 | 0 | 0 | 0 |
| ashby:molecule | 0 | 0 | 945 | 0 | 0 | 0 |
| ashby:payscale | 0 | 0 | 945 | 0 | 0 | 0 |
| ashby:supabase | 0 | 0 | 945 | 0 | 0 | 0 |
| ashby:the-studio | 0 | 0 | 945 | 0 | 0 | 0 |
| ashby:tremendous | 0 | 0 | 945 | 0 | 0 | 0 |
| authentic-jobs | 0 | 0 | 945 | 0 | 0 | 0 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 945 | 0 | 0 | 0 |
| dribbble | 0 | 0 | 945 | 0 | 0 | 0 |
| jobspresso | 0 | 0 | 945 | 0 | 0 | 0 |
| lever:applydigital | 0 | 0 | 575 | 0 | 0 | 0 |
| lever:beaverprocess | 0 | 0 | 945 | 0 | 0 | 0 |
| lever:brafton | 0 | 0 | 945 | 0 | 0 | 0 |
| lever:decilegroup | 0 | 0 | 945 | 0 | 0 | 0 |
| lever:deliverect | 0 | 0 | 945 | 0 | 0 | 0 |
| lever:gushwork | 0 | 0 | 193 | 0 | 0 | 0 |
| lever:lwolf | 0 | 0 | 945 | 0 | 0 | 0 |
| lever:outsourcedstaff | 0 | 0 | 270 | 0 | 0 | 0 |
| lever:repurposeglobal | 0 | 0 | 945 | 0 | 0 | 0 |
| lever:snappr | 0 | 0 | 945 | 0 | 0 | 0 |
| lever:tenna | 0 | 0 | 575 | 0 | 0 | 0 |
| lever:truezerotech | 0 | 0 | 945 | 0 | 0 | 0 |
| lever:vacancies | 0 | 0 | 87 | 0 | 0 | 0 |
| lever:vaultoutsourcing | 0 | 0 | 945 | 0 | 0 | 0 |
| lever:willowinc | 0 | 0 | 87 | 0 | 0 | 0 |
| onlinejobs-ph | 0 | 0 | 945 | 0 | 0 | 0 |
| problogger | 0 | 0 | 945 | 0 | 0 | 0 |
| remote-co | 0 | 0 | 945 | 0 | 0 | 0 |
| workable:connectos | 0 | 0 | 945 | 0 | 0 | 0 |
| workable:global-strategic | 0 | 0 | 945 | 0 | 0 | 0 |
| workable:myoutdesk | 0 | 0 | 945 | 0 | 0 | 0 |
| workable:outsource-access | 0 | 0 | 945 | 0 | 0 | 0 |
| workable:pineapple-staffing | 0 | 0 | 945 | 0 | 0 | 0 |
| workable:staff-domain-inc | 0 | 0 | 945 | 0 | 0 | 0 |
| workable:superstaff | 0 | 0 | 945 | 0 | 0 | 0 |
| workable:virtualstaff365 | 0 | 0 | 945 | 0 | 0 | 0 |

## Geo & eligibility triage outcomes (last 7 days)

Breakdown of stored opportunities by Philippines eligibility verdict.

| source_id | eligible | unclear | ineligible | policy_rejected | total | qualified_rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 130 | 0 | 21 | 21 | 151 | 86.1% |
| workable:hunt-st | 32 | 11 | 1 | 1 | 44 | 72.7% |
| greenhouse:gitlab | 3 | 0 | 34 | 34 | 37 | 8.1% |
| real-work-from-anywhere | 35 | 1 | 1 | 2 | 37 | 94.6% |
| greenhouse:grafanalabs | 0 | 0 | 35 | 35 | 35 | 0.0% |
| remote-ok | 14 | 6 | 6 | 12 | 26 | 53.8% |
| workable:crewbloom | 3 | 0 | 19 | 19 | 22 | 13.6% |
| lever:vacancies | 20 | 0 | 0 | 0 | 20 | 100.0% |
| lever:tenna | 11 | 0 | 0 | 0 | 11 | 100.0% |
| breezy:20four7va | 10 | 0 | 0 | 0 | 10 | 100.0% |
| workable:pearltalent | 1 | 0 | 9 | 9 | 10 | 10.0% |
| ashby:multiplymii | 8 | 0 | 0 | 0 | 8 | 100.0% |
| jobicy-supporting-apac | 4 | 0 | 4 | 4 | 8 | 50.0% |
| breezy:sourcefit | 7 | 0 | 0 | 3 | 7 | 100.0% |
| lever:applydigital | 6 | 0 | 0 | 0 | 6 | 100.0% |
| lever:outsourcedstaff | 5 | 0 | 0 | 0 | 5 | 100.0% |
| workable:coconutva | 2 | 3 | 0 | 0 | 5 | 40.0% |
| lever:willowinc | 4 | 0 | 0 | 0 | 4 | 100.0% |
| lever:gushwork | 3 | 0 | 0 | 0 | 3 | 100.0% |
| ashby:luxor | 2 | 0 | 0 | 0 | 2 | 100.0% |
| jobicy-admin-support-apac | 2 | 0 | 0 | 0 | 2 | 100.0% |
| ashby:finch | 1 | 0 | 0 | 0 | 1 | 100.0% |
| remotive | 1 | 0 | 0 | 0 | 1 | 100.0% |
| workable:rocketams | 1 | 0 | 0 | 0 | 1 | 100.0% |

## Yield efficiency (last 7 days)

Stored eligibility per real (changed) fetch and per 100 items seen; not marginal verified first-publication yield.
UNKNOWN means a count is missing/invalid or its denominator is zero. Fetch and stored cohorts may differ across intake paths; these descriptive ratios do not establish source productivity or causal yield.

| source_id | real fetches | items seen | eligible stored | yield / fetch | yield / 100 items |
| --- | ---: | ---: | ---: | ---: | ---: |
| remotive | 162 | 2166 | 1 | 0.01 | 0.05 |
| ashby:multiplymii | 147 | 8539 | 8 | 0.05 | 0.09 |
| breezy:20four7va | 147 | 17036 | 10 | 0.07 | 0.06 |
| breezy:remote-craft | 147 | 2205 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:sourcefit | 147 | 12988 | 7 | 0.05 | 0.05 |
| breezy:time-etc | 147 | 147 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:value-virtual-assistants | 147 | 1617 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:yokly | 147 | 1408 | UNKNOWN | UNKNOWN | UNKNOWN |
| greenhouse:canonical | 147 | 45504 | UNKNOWN | UNKNOWN | UNKNOWN |
| greenhouse:ghost | 147 | 882 | UNKNOWN | UNKNOWN | UNKNOWN |
| greenhouse:gitlab | 147 | 33033 | 3 | 0.02 | 0.01 |
| greenhouse:grafanalabs | 147 | 16675 | 0 | 0.00 | 0.00 |
| greenhouse:nearform | 147 | 3237 | UNKNOWN | UNKNOWN | UNKNOWN |
| real-work-from-anywhere | 146 | 7300 | 35 | 0.24 | 0.48 |
| we-work-remotely | 125 | 11022 | 130 | 1.04 | 1.18 |
| remote-ok | 40 | 1662 | 14 | 0.35 | 0.84 |
| greenhouse:remotecom | 35 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| jobicy-supporting-apac | 20 | 800 | 4 | 0.20 | 0.50 |
| jobicy-admin-support-apac | 6 | 21 | 2 | 0.33 | 9.52 |
| workable:coconutva | 1 | 32 | 2 | 2.00 | 6.25 |
| workable:crewbloom | 1 | 152 | 3 | 3.00 | 1.97 |
| workable:hello-rache | 1 | 3 | UNKNOWN | UNKNOWN | UNKNOWN |
| workable:hunt-st | 1 | 143 | 32 | 32.00 | 22.38 |
| workable:pearltalent | 1 | 286 | 1 | 1.00 | 0.35 |
| workable:rocketams | 1 | 10 | 1 | 1.00 | 10.00 |
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
