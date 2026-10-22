# Source economics — latest (SP-02)

- **As of:** 2026-10-22T07:53:34.832Z
- **Windows:** 7d/14d/30d net-new by `scraped_at`
- **Reconciliation:** OK (every partition delta is zero)
- Read-only report; regenerate with `scripts/diagnostics/source-economics.ts`.

## Qualified supply (strict eligibility; first-stored proxy)

Excludes unclear/ineligible rows. Historical publication and later deactivation are not fully reconstructed.

| qualified active | qualified new 7d | per day (7d) | qualified new 30d | per day (30d) |
| ---: | ---: | ---: | ---: | ---: |
| 1899 | 366 | 52.29 | 1596 | 53.20 |

## Identity coverage (SP-01)

| total | with source_id | null source_id | coverage | active null-id |
| ---: | ---: | ---: | ---: | ---: |
| 7867 | 7867 | 0 | 100.0% | 0 |

## Net-new accepted supply

| active | net-new 7d | net-new 14d | net-new 30d |
| ---: | ---: | ---: | ---: |
| 1899 | 366 | 568 | 1596 |

## Provider-family concentration (ADR-006 §7)

- **Net-new 30d:** top family `we-work-remotely` 28.0%; top-3 63.7%.
- **Active:** top family `we-work-remotely` 28.1%; top-3 63.0%.
- `(unknown)` legacy rows are excluded from these shares.

| provider family | active | net-new 30d | net-new 7d | source ids |
| --- | ---: | ---: | ---: | --- |
| we-work-remotely | 533 | 447 | 130 | we-work-remotely |
| workable | 352 | 352 | 75 | workable:hunt-st, workable:coconutva, workable:crewbloom, workable:pearltalent, workable:rocketams, workable:hello-rache, workable:pineapple-staffing |
| breezy | 312 | 218 | 30 | breezy:20four7va, breezy:sourcefit, breezy:yokly, breezy:remote-craft, breezy:value-virtual-assistants, breezy:time-etc |
| greenhouse | 165 | 158 | 20 | greenhouse:canonical, greenhouse:solarwinds, greenhouse:remotecom, greenhouse:gitlab, greenhouse:janes, greenhouse:ghost, greenhouse:trainingthestreet, greenhouse:trinityparktalent, greenhouse:grafanalabs, greenhouse:nearform |
| real-work-from-anywhere | 150 | 111 | 26 | real-work-from-anywhere |
| ashby | 132 | 132 | 10 | ashby:multiplymii, ashby:foundry-for-good, ashby:gradient, ashby:payscale, ashby:circulareconomysystems, ashby:molecule, ashby:the-studio, ashby:getground, ashby:luxor, ashby:finch, ashby:homera-health, ashby:amplify, ashby:ashby, ashby:camunda, ashby:supabase, ashby:tremendous |
| lever | 113 | 113 | 52 | lever:vacancies, lever:truezerotech, lever:snappr, lever:tenna, lever:deliverect, lever:applydigital, lever:brafton, lever:decilegroup, lever:outsourcedstaff, lever:lwolf, lever:willowinc, lever:gushwork, lever:parcelvision, lever:repurposeglobal, lever:beaverprocess, lever:90seconds, lever:hso, lever:trustarc |
| remote-ok | 65 | 42 | 12 | remote-ok |
| jobicy | 61 | 18 | 10 | jobicy-supporting-apac, jobicy-admin-support-apac |
| remotive | 14 | 3 | 1 | remotive |
| himalayas | 2 | 2 | 0 | himalayas:remote-jobs |
| authentic-jobs | 0 | 0 | 0 | authentic-jobs |
| dribbble | 0 | 0 | 0 | dribbble |

## Supply by exact source_id

| source_id | platform | active | net-new 7d | net-new 30d | inactive |
| --- | --- | ---: | ---: | ---: | ---: |
| we-work-remotely | WeWorkRemotely | 533 | 130 | 447 | 1367 |
| workable:hunt-st | Hunt St | 231 | 56 | 231 | 5 |
| breezy:20four7va | 20Four7VA | 151 | 6 | 89 | 128 |
| real-work-from-anywhere | RealWorkFromAnywhere | 150 | 26 | 111 | 533 |
| greenhouse:canonical | Canonical | 124 | 0 | 124 | 189 |
| breezy:sourcefit | Breezy/sourcefit | 122 | 21 | 90 | 148 |
| ashby:multiplymii | Ashby/multiplymii | 81 | 7 | 81 | 0 |
| remote-ok | RemoteOK | 65 | 12 | 42 | 1199 |
| jobicy-supporting-apac | Jobicy | 56 | 8 | 16 | 101 |
| workable:coconutva | Coconut VA | 51 | 10 | 51 | 21 |
| workable:crewbloom | CrewBloom | 38 | 3 | 38 | 37 |
| ashby:foundry-for-good | Ashby/foundry-for-good | 27 | 0 | 27 | 0 |
| workable:pearltalent | Pearl Talent | 23 | 5 | 23 | 41 |
| lever:vacancies | Lever/vacancies | 20 | 20 | 20 | 0 |
| lever:truezerotech | Lever/truezerotech | 17 | 0 | 17 | 0 |
| greenhouse:solarwinds | Greenhouse/solarwinds | 16 | 16 | 16 | 0 |
| breezy:yokly | Yokly | 15 | 3 | 15 | 0 |
| breezy:remote-craft | Remote Craft | 14 | 0 | 14 | 1 |
| greenhouse:remotecom | Remote.com | 14 | 0 | 8 | 608 |
| remotive | Remotive | 14 | 1 | 3 | 90 |
| lever:snappr | Lever/snappr | 13 | 0 | 13 | 0 |
| lever:tenna | Lever/tenna | 11 | 11 | 11 | 0 |
| breezy:value-virtual-assistants | VALUE Virtual Assistants | 10 | 0 | 10 | 1 |
| lever:deliverect | Lever/deliverect | 9 | 0 | 9 | 0 |
| workable:rocketams | RocketAMS | 8 | 1 | 8 | 2 |
| greenhouse:gitlab | GitLab | 6 | 3 | 6 | 562 |
| lever:applydigital | Lever/applydigital | 6 | 6 | 6 | 0 |
| ashby:gradient | Ashby/gradient | 5 | 0 | 5 | 0 |
| jobicy-admin-support-apac | Jobicy | 5 | 2 | 2 | 9 |
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
| lever:parcelvision | Lever/parcelvision | 3 | 3 | 3 | 0 |
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
| greenhouse:trinityparktalent | Greenhouse/trinityparktalent | 1 | 1 | 1 | 0 |
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
| greenhouse:grafanalabs | Grafana Labs | 0 | 0 | 0 | 369 |
| greenhouse:nearform | Nearform | 0 | 0 | 0 | 55 |
| workable:pineapple-staffing | Pineapple Staffing | 0 | 0 | 0 | 3 |

## Fetch outcomes (last 7 days)

Separates real (changed) fetches from unchanged 304 polls, intentional skips, failures, and true zero-yield. `items` counts only changed fetches, so carried-forward unchanged counts never read as new supply.

| source_id | real fetches | unchanged | skips | failures | zero-yield | items |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| remotive | 165 | 814 | 0 | 0 | 0 | 1973 |
| ashby:multiplymii | 149 | 0 | 830 | 0 | 0 | 8743 |
| breezy:20four7va | 149 | 0 | 1809 | 0 | 0 | 17367 |
| breezy:remote-craft | 149 | 0 | 830 | 0 | 0 | 2235 |
| breezy:sourcefit | 149 | 0 | 830 | 0 | 0 | 13246 |
| breezy:time-etc | 149 | 0 | 830 | 0 | 0 | 149 |
| breezy:value-virtual-assistants | 149 | 0 | 830 | 0 | 0 | 1639 |
| breezy:yokly | 149 | 0 | 830 | 0 | 46 | 1037 |
| greenhouse:canonical | 149 | 0 | 830 | 0 | 0 | 46100 |
| greenhouse:ghost | 149 | 0 | 830 | 0 | 0 | 878 |
| greenhouse:gitlab | 149 | 0 | 830 | 0 | 0 | 34038 |
| greenhouse:grafanalabs | 149 | 0 | 830 | 0 | 0 | 17951 |
| greenhouse:nearform | 149 | 0 | 830 | 0 | 0 | 3280 |
| real-work-from-anywhere | 148 | 0 | 830 | 1 | 0 | 7400 |
| we-work-remotely | 142 | 833 | 0 | 4 | 0 | 12704 |
| workable:hello-rache | 36 | 0 | 939 | 4 | 0 | 108 |
| workable:pearltalent | 36 | 0 | 939 | 4 | 0 | 10526 |
| workable:coconutva | 34 | 0 | 939 | 6 | 0 | 1097 |
| workable:crewbloom | 34 | 0 | 939 | 6 | 0 | 4769 |
| workable:hunt-st | 32 | 0 | 939 | 8 | 0 | 4567 |
| workable:rocketams | 32 | 0 | 939 | 8 | 0 | 320 |
| remote-ok | 29 | 119 | 830 | 1 | 0 | 1219 |
| jobicy-supporting-apac | 22 | 125 | 831 | 1 | 0 | 880 |
| jobicy-admin-support-apac | 5 | 143 | 830 | 1 | 0 | 21 |
| ashby:amplify | 0 | 0 | 979 | 0 | 0 | 0 |
| ashby:ashby | 0 | 0 | 979 | 0 | 0 | 0 |
| ashby:camunda | 0 | 0 | 979 | 0 | 0 | 0 |
| ashby:circulareconomysystems | 0 | 0 | 979 | 0 | 0 | 0 |
| ashby:foundry-for-good | 0 | 0 | 979 | 0 | 0 | 0 |
| ashby:getground | 0 | 0 | 979 | 0 | 0 | 0 |
| ashby:gradient | 0 | 0 | 979 | 0 | 0 | 0 |
| ashby:luxor | 0 | 0 | 735 | 0 | 0 | 0 |
| ashby:molecule | 0 | 0 | 979 | 0 | 0 | 0 |
| ashby:payscale | 0 | 0 | 979 | 0 | 0 | 0 |
| ashby:supabase | 0 | 0 | 979 | 0 | 0 | 0 |
| ashby:the-studio | 0 | 0 | 979 | 0 | 0 | 0 |
| ashby:tremendous | 0 | 0 | 979 | 0 | 0 | 0 |
| authentic-jobs | 0 | 0 | 979 | 0 | 0 | 0 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 979 | 0 | 0 | 0 |
| dribbble | 0 | 0 | 979 | 0 | 0 | 0 |
| greenhouse:remotecom | 0 | 0 | 830 | 149 | 0 | 0 |
| jobspresso | 0 | 0 | 979 | 0 | 0 | 0 |
| lever:applydigital | 0 | 0 | 837 | 0 | 0 | 0 |
| lever:beaverprocess | 0 | 0 | 979 | 0 | 0 | 0 |
| lever:brafton | 0 | 0 | 979 | 0 | 0 | 0 |
| lever:decilegroup | 0 | 0 | 979 | 0 | 0 | 0 |
| lever:deliverect | 0 | 0 | 979 | 0 | 0 | 0 |
| lever:gushwork | 0 | 0 | 455 | 0 | 0 | 0 |
| lever:lwolf | 0 | 0 | 979 | 0 | 0 | 0 |
| lever:outsourcedstaff | 0 | 0 | 532 | 0 | 0 | 0 |
| lever:repurposeglobal | 0 | 0 | 979 | 0 | 0 | 0 |
| lever:snappr | 0 | 0 | 979 | 0 | 0 | 0 |
| lever:tenna | 0 | 0 | 837 | 0 | 0 | 0 |
| lever:truezerotech | 0 | 0 | 979 | 0 | 0 | 0 |
| lever:vacancies | 0 | 0 | 349 | 0 | 0 | 0 |
| lever:vaultoutsourcing | 0 | 0 | 979 | 0 | 0 | 0 |
| lever:willowinc | 0 | 0 | 349 | 0 | 0 | 0 |
| onlinejobs-ph | 0 | 0 | 979 | 0 | 0 | 0 |
| problogger | 0 | 0 | 979 | 0 | 0 | 0 |
| remote-co | 0 | 0 | 979 | 0 | 0 | 0 |
| workable:connectos | 0 | 0 | 979 | 0 | 0 | 0 |
| workable:global-strategic | 0 | 0 | 979 | 0 | 0 | 0 |
| workable:myoutdesk | 0 | 0 | 979 | 0 | 0 | 0 |
| workable:outsource-access | 0 | 0 | 979 | 0 | 0 | 0 |
| workable:pineapple-staffing | 0 | 0 | 979 | 0 | 0 | 0 |
| workable:staff-domain-inc | 0 | 0 | 979 | 0 | 0 | 0 |
| workable:superstaff | 0 | 0 | 979 | 0 | 0 | 0 |
| workable:virtualstaff365 | 0 | 0 | 979 | 0 | 0 | 0 |

## Geo & eligibility triage outcomes (last 7 days)

Breakdown of stored opportunities by Philippines eligibility verdict.

| source_id | eligible | unclear | ineligible | policy_rejected | total | qualified_rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 130 | 2 | 24 | 25 | 156 | 83.3% |
| workable:hunt-st | 56 | 1 | 1 | 1 | 58 | 96.6% |
| greenhouse:grafanalabs | 0 | 0 | 37 | 37 | 37 | 0.0% |
| greenhouse:gitlab | 3 | 0 | 33 | 33 | 36 | 8.3% |
| real-work-from-anywhere | 26 | 1 | 1 | 2 | 28 | 92.9% |
| workable:crewbloom | 3 | 0 | 24 | 24 | 27 | 11.1% |
| remote-ok | 12 | 5 | 6 | 11 | 23 | 52.2% |
| breezy:sourcefit | 21 | 0 | 1 | 5 | 22 | 95.5% |
| lever:vacancies | 20 | 0 | 0 | 0 | 20 | 100.0% |
| workable:pearltalent | 5 | 0 | 15 | 15 | 20 | 25.0% |
| greenhouse:solarwinds | 16 | 0 | 0 | 0 | 16 | 100.0% |
| jobicy-supporting-apac | 8 | 0 | 6 | 6 | 14 | 57.1% |
| lever:tenna | 11 | 0 | 0 | 0 | 11 | 100.0% |
| workable:coconutva | 10 | 0 | 0 | 0 | 10 | 100.0% |
| ashby:multiplymii | 7 | 0 | 0 | 0 | 7 | 100.0% |
| breezy:20four7va | 6 | 0 | 0 | 0 | 6 | 100.0% |
| lever:applydigital | 6 | 0 | 0 | 0 | 6 | 100.0% |
| lever:outsourcedstaff | 5 | 0 | 0 | 0 | 5 | 100.0% |
| lever:willowinc | 4 | 0 | 0 | 0 | 4 | 100.0% |
| breezy:yokly | 3 | 0 | 0 | 0 | 3 | 100.0% |
| lever:gushwork | 3 | 0 | 0 | 0 | 3 | 100.0% |
| lever:parcelvision | 3 | 0 | 0 | 0 | 3 | 100.0% |
| ashby:luxor | 2 | 0 | 0 | 0 | 2 | 100.0% |
| jobicy-admin-support-apac | 2 | 0 | 0 | 0 | 2 | 100.0% |
| ashby:finch | 1 | 0 | 0 | 0 | 1 | 100.0% |
| greenhouse:canonical | 0 | 0 | 1 | 1 | 1 | 0.0% |
| greenhouse:trinityparktalent | 1 | 0 | 0 | 0 | 1 | 100.0% |
| remotive | 1 | 0 | 0 | 0 | 1 | 100.0% |
| workable:rocketams | 1 | 0 | 0 | 0 | 1 | 100.0% |

## Yield efficiency (last 7 days)

Stored eligibility per real (changed) fetch and per 100 items seen; not marginal verified first-publication yield.
UNKNOWN means a count is missing/invalid or its denominator is zero. Fetch and stored cohorts may differ across intake paths; these descriptive ratios do not establish source productivity or causal yield.

| source_id | real fetches | items seen | eligible stored | yield / fetch | yield / 100 items |
| --- | ---: | ---: | ---: | ---: | ---: |
| remotive | 165 | 1973 | 1 | 0.01 | 0.05 |
| ashby:multiplymii | 149 | 8743 | 7 | 0.05 | 0.08 |
| breezy:20four7va | 149 | 17367 | 6 | 0.04 | 0.03 |
| breezy:remote-craft | 149 | 2235 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:sourcefit | 149 | 13246 | 21 | 0.14 | 0.16 |
| breezy:time-etc | 149 | 149 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:value-virtual-assistants | 149 | 1639 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:yokly | 149 | 1037 | 3 | 0.02 | 0.29 |
| greenhouse:canonical | 149 | 46100 | 0 | 0.00 | 0.00 |
| greenhouse:ghost | 149 | 878 | UNKNOWN | UNKNOWN | UNKNOWN |
| greenhouse:gitlab | 149 | 34038 | 3 | 0.02 | 0.01 |
| greenhouse:grafanalabs | 149 | 17951 | 0 | 0.00 | 0.00 |
| greenhouse:nearform | 149 | 3280 | UNKNOWN | UNKNOWN | UNKNOWN |
| real-work-from-anywhere | 148 | 7400 | 26 | 0.18 | 0.35 |
| we-work-remotely | 142 | 12704 | 130 | 0.92 | 1.02 |
| workable:hello-rache | 36 | 108 | UNKNOWN | UNKNOWN | UNKNOWN |
| workable:pearltalent | 36 | 10526 | 5 | 0.14 | 0.05 |
| workable:coconutva | 34 | 1097 | 10 | 0.29 | 0.91 |
| workable:crewbloom | 34 | 4769 | 3 | 0.09 | 0.06 |
| workable:hunt-st | 32 | 4567 | 56 | 1.75 | 1.23 |
| workable:rocketams | 32 | 320 | 1 | 0.03 | 0.31 |
| remote-ok | 29 | 1219 | 12 | 0.41 | 0.98 |
| jobicy-supporting-apac | 22 | 880 | 8 | 0.36 | 0.91 |
| jobicy-admin-support-apac | 5 | 21 | 2 | 0.40 | 9.52 |
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
| greenhouse:remotecom | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
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
| greenhouse:solarwinds | UNKNOWN | UNKNOWN | 16 | UNKNOWN | UNKNOWN |
| lever:parcelvision | UNKNOWN | UNKNOWN | 3 | UNKNOWN | UNKNOWN |
| ashby:finch | UNKNOWN | UNKNOWN | 1 | UNKNOWN | UNKNOWN |
| greenhouse:trinityparktalent | UNKNOWN | UNKNOWN | 1 | UNKNOWN | UNKNOWN |
