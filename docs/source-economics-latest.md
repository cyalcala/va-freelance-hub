# Source economics — latest (SP-02)

- **As of:** 2026-10-23T07:52:21.387Z
- **Windows:** 7d/14d/30d net-new by `scraped_at`
- **Reconciliation:** OK (every partition delta is zero)
- Read-only report; regenerate with `scripts/diagnostics/source-economics.ts`.

## Qualified supply (strict eligibility; first-stored proxy)

Excludes unclear/ineligible rows. Historical publication and later deactivation are not fully reconstructed.

| qualified active | qualified new 7d | per day (7d) | qualified new 30d | per day (30d) |
| ---: | ---: | ---: | ---: | ---: |
| 1936 | 385 | 55.00 | 1644 | 54.80 |

## Identity coverage (SP-01)

| total | with source_id | null source_id | coverage | active null-id |
| ---: | ---: | ---: | ---: | ---: |
| 7938 | 7938 | 0 | 100.0% | 0 |

## Net-new accepted supply

| active | net-new 7d | net-new 14d | net-new 30d |
| ---: | ---: | ---: | ---: |
| 1936 | 385 | 578 | 1644 |

## Provider-family concentration (ADR-006 §7)

- **Net-new 30d:** top family `we-work-remotely` 28.0%; top-3 63.7%.
- **Active:** top family `we-work-remotely` 27.9%; top-3 63.1%.
- `(unknown)` legacy rows are excluded from these shares.

| provider family | active | net-new 30d | net-new 7d | source ids |
| --- | ---: | ---: | ---: | --- |
| we-work-remotely | 541 | 461 | 122 | we-work-remotely |
| workable | 361 | 361 | 84 | workable:hunt-st, workable:coconutva, workable:crewbloom, workable:pearltalent, workable:rocketams, workable:hello-rache, workable:pineapple-staffing |
| breezy | 320 | 226 | 35 | breezy:20four7va, breezy:sourcefit, breezy:yokly, breezy:remote-craft, breezy:value-virtual-assistants, breezy:time-etc |
| greenhouse | 165 | 158 | 19 | greenhouse:canonical, greenhouse:solarwinds, greenhouse:remotecom, greenhouse:gitlab, greenhouse:janes, greenhouse:ghost, greenhouse:trainingthestreet, greenhouse:trinityparktalent, greenhouse:grafanalabs, greenhouse:nearform |
| real-work-from-anywhere | 149 | 116 | 32 | real-work-from-anywhere |
| ashby | 141 | 141 | 16 | ashby:multiplymii, ashby:foundry-for-good, ashby:railway, ashby:gradient, ashby:payscale, ashby:circulareconomysystems, ashby:molecule, ashby:the-studio, ashby:flipper, ashby:getground, ashby:luxor, ashby:finch, ashby:homera-health, ashby:amplify, ashby:ashby, ashby:camunda, ashby:supabase, ashby:tremendous |
| lever | 113 | 113 | 52 | lever:vacancies, lever:truezerotech, lever:snappr, lever:tenna, lever:deliverect, lever:applydigital, lever:brafton, lever:decilegroup, lever:outsourcedstaff, lever:lwolf, lever:willowinc, lever:gushwork, lever:parcelvision, lever:repurposeglobal, lever:beaverprocess, lever:90seconds, lever:hso, lever:trustarc |
| remote-ok | 66 | 42 | 12 | remote-ok |
| jobicy | 63 | 20 | 11 | jobicy-supporting-apac, jobicy-admin-support-apac |
| remotive | 15 | 4 | 2 | remotive |
| himalayas | 2 | 2 | 0 | himalayas:remote-jobs |
| authentic-jobs | 0 | 0 | 0 | authentic-jobs |
| dribbble | 0 | 0 | 0 | dribbble |

## Supply by exact source_id

| source_id | platform | active | net-new 7d | net-new 30d | inactive |
| --- | --- | ---: | ---: | ---: | ---: |
| we-work-remotely | WeWorkRemotely | 541 | 122 | 461 | 1380 |
| workable:hunt-st | Hunt St | 238 | 63 | 238 | 5 |
| breezy:20four7va | 20Four7VA | 153 | 7 | 91 | 128 |
| real-work-from-anywhere | RealWorkFromAnywhere | 149 | 32 | 116 | 542 |
| breezy:sourcefit | Breezy/sourcefit | 128 | 25 | 96 | 148 |
| greenhouse:canonical | Canonical | 124 | 0 | 124 | 192 |
| ashby:multiplymii | Ashby/multiplymii | 82 | 5 | 82 | 0 |
| remote-ok | RemoteOK | 66 | 12 | 42 | 1201 |
| jobicy-supporting-apac | Jobicy | 58 | 10 | 18 | 101 |
| workable:coconutva | Coconut VA | 51 | 10 | 51 | 21 |
| workable:crewbloom | CrewBloom | 40 | 5 | 40 | 38 |
| ashby:foundry-for-good | Ashby/foundry-for-good | 27 | 0 | 27 | 0 |
| workable:pearltalent | Pearl Talent | 23 | 5 | 23 | 41 |
| lever:vacancies | Lever/vacancies | 20 | 20 | 20 | 0 |
| lever:truezerotech | Lever/truezerotech | 17 | 0 | 17 | 0 |
| greenhouse:solarwinds | Greenhouse/solarwinds | 16 | 16 | 16 | 0 |
| breezy:yokly | Yokly | 15 | 3 | 15 | 0 |
| remotive | Remotive | 15 | 2 | 4 | 90 |
| breezy:remote-craft | Remote Craft | 14 | 0 | 14 | 1 |
| greenhouse:remotecom | Remote.com | 14 | 0 | 8 | 608 |
| lever:snappr | Lever/snappr | 13 | 0 | 13 | 0 |
| lever:tenna | Lever/tenna | 11 | 11 | 11 | 0 |
| breezy:value-virtual-assistants | VALUE Virtual Assistants | 10 | 0 | 10 | 1 |
| lever:deliverect | Lever/deliverect | 9 | 0 | 9 | 0 |
| workable:rocketams | RocketAMS | 8 | 1 | 8 | 2 |
| ashby:railway | Ashby/railway | 6 | 6 | 6 | 0 |
| greenhouse:gitlab | GitLab | 6 | 2 | 6 | 567 |
| lever:applydigital | Lever/applydigital | 6 | 6 | 6 | 0 |
| ashby:gradient | Ashby/gradient | 5 | 0 | 5 | 0 |
| jobicy-admin-support-apac | Jobicy | 5 | 1 | 2 | 9 |
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
| ashby:flipper | Ashby/flipper | 2 | 2 | 2 | 0 |
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
| greenhouse:grafanalabs | Grafana Labs | 0 | 0 | 0 | 370 |
| greenhouse:nearform | Nearform | 0 | 0 | 0 | 55 |
| workable:pineapple-staffing | Pineapple Staffing | 0 | 0 | 0 | 3 |

## Fetch outcomes (last 7 days)

Separates real (changed) fetches from unchanged 304 polls, intentional skips, failures, and true zero-yield. `items` counts only changed fetches, so carried-forward unchanged counts never read as new supply.

| source_id | real fetches | unchanged | skips | failures | zero-yield | items |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| remotive | 167 | 835 | 0 | 0 | 0 | 1878 |
| ashby:multiplymii | 152 | 0 | 850 | 0 | 0 | 8875 |
| breezy:20four7va | 152 | 0 | 1852 | 0 | 0 | 17716 |
| breezy:remote-craft | 152 | 0 | 850 | 0 | 0 | 2280 |
| breezy:sourcefit | 152 | 0 | 850 | 0 | 0 | 13706 |
| breezy:time-etc | 152 | 0 | 850 | 0 | 0 | 152 |
| breezy:value-virtual-assistants | 152 | 0 | 850 | 0 | 0 | 1672 |
| breezy:yokly | 152 | 0 | 850 | 0 | 46 | 894 |
| greenhouse:canonical | 152 | 0 | 850 | 0 | 0 | 47057 |
| greenhouse:ghost | 152 | 0 | 850 | 0 | 0 | 852 |
| greenhouse:gitlab | 152 | 0 | 850 | 0 | 0 | 35008 |
| greenhouse:grafanalabs | 152 | 0 | 850 | 0 | 0 | 19024 |
| greenhouse:nearform | 152 | 0 | 850 | 0 | 0 | 3301 |
| real-work-from-anywhere | 151 | 0 | 850 | 1 | 0 | 7550 |
| we-work-remotely | 140 | 860 | 0 | 2 | 0 | 12608 |
| workable:hello-rache | 48 | 0 | 940 | 14 | 0 | 144 |
| workable:pearltalent | 48 | 0 | 940 | 14 | 0 | 14028 |
| workable:hunt-st | 47 | 0 | 941 | 14 | 0 | 6717 |
| workable:rocketams | 47 | 0 | 941 | 14 | 0 | 470 |
| workable:coconutva | 46 | 0 | 940 | 16 | 0 | 1481 |
| workable:crewbloom | 46 | 0 | 940 | 16 | 0 | 6198 |
| remote-ok | 29 | 123 | 850 | 0 | 0 | 1230 |
| jobicy-supporting-apac | 24 | 126 | 851 | 1 | 0 | 960 |
| jobicy-admin-support-apac | 2 | 148 | 851 | 1 | 0 | 10 |
| ashby:amplify | 0 | 0 | 1002 | 0 | 0 | 0 |
| ashby:ashby | 0 | 0 | 1002 | 0 | 0 | 0 |
| ashby:camunda | 0 | 0 | 1002 | 0 | 0 | 0 |
| ashby:circulareconomysystems | 0 | 0 | 1002 | 0 | 0 | 0 |
| ashby:flipper | 0 | 0 | 62 | 0 | 0 | 0 |
| ashby:foundry-for-good | 0 | 0 | 1002 | 0 | 0 | 0 |
| ashby:getground | 0 | 0 | 1002 | 0 | 0 | 0 |
| ashby:gradient | 0 | 0 | 1002 | 0 | 0 | 0 |
| ashby:luxor | 0 | 0 | 880 | 0 | 0 | 0 |
| ashby:molecule | 0 | 0 | 1002 | 0 | 0 | 0 |
| ashby:payscale | 0 | 0 | 1002 | 0 | 0 | 0 |
| ashby:railway | 0 | 0 | 89 | 0 | 0 | 0 |
| ashby:supabase | 0 | 0 | 1002 | 0 | 0 | 0 |
| ashby:the-studio | 0 | 0 | 1002 | 0 | 0 | 0 |
| ashby:tremendous | 0 | 0 | 1002 | 0 | 0 | 0 |
| authentic-jobs | 0 | 0 | 1002 | 0 | 0 | 0 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 1002 | 0 | 0 | 0 |
| dribbble | 0 | 0 | 1002 | 0 | 0 | 0 |
| greenhouse:remotecom | 0 | 0 | 850 | 152 | 0 | 0 |
| jobspresso | 0 | 0 | 1002 | 0 | 0 | 0 |
| lever:applydigital | 0 | 0 | 982 | 0 | 0 | 0 |
| lever:beaverprocess | 0 | 0 | 1002 | 0 | 0 | 0 |
| lever:brafton | 0 | 0 | 1002 | 0 | 0 | 0 |
| lever:decilegroup | 0 | 0 | 1002 | 0 | 0 | 0 |
| lever:deliverect | 0 | 0 | 1002 | 0 | 0 | 0 |
| lever:gushwork | 0 | 0 | 600 | 0 | 0 | 0 |
| lever:lwolf | 0 | 0 | 1002 | 0 | 0 | 0 |
| lever:outsourcedstaff | 0 | 0 | 677 | 0 | 0 | 0 |
| lever:parcelvision | 0 | 0 | 122 | 0 | 0 | 0 |
| lever:repurposeglobal | 0 | 0 | 1002 | 0 | 0 | 0 |
| lever:snappr | 0 | 0 | 1002 | 0 | 0 | 0 |
| lever:tenna | 0 | 0 | 982 | 0 | 0 | 0 |
| lever:truezerotech | 0 | 0 | 1002 | 0 | 0 | 0 |
| lever:vacancies | 0 | 0 | 494 | 0 | 0 | 0 |
| lever:vaultoutsourcing | 0 | 0 | 1002 | 0 | 0 | 0 |
| lever:willowinc | 0 | 0 | 494 | 0 | 0 | 0 |
| onlinejobs-ph | 0 | 0 | 1002 | 0 | 0 | 0 |
| problogger | 0 | 0 | 1002 | 0 | 0 | 0 |
| remote-co | 0 | 0 | 1002 | 0 | 0 | 0 |
| workable:connectos | 0 | 0 | 1002 | 0 | 0 | 0 |
| workable:global-strategic | 0 | 0 | 1002 | 0 | 0 | 0 |
| workable:myoutdesk | 0 | 0 | 1002 | 0 | 0 | 0 |
| workable:outsource-access | 0 | 0 | 1002 | 0 | 0 | 0 |
| workable:pineapple-staffing | 0 | 0 | 1002 | 0 | 0 | 0 |
| workable:staff-domain-inc | 0 | 0 | 1002 | 0 | 0 | 0 |
| workable:superstaff | 0 | 0 | 1002 | 0 | 0 | 0 |
| workable:virtualstaff365 | 0 | 0 | 1002 | 0 | 0 | 0 |

## Geo & eligibility triage outcomes (last 7 days)

Breakdown of stored opportunities by Philippines eligibility verdict.

| source_id | eligible | unclear | ineligible | policy_rejected | total | qualified_rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 122 | 3 | 24 | 25 | 149 | 81.9% |
| workable:hunt-st | 63 | 1 | 1 | 1 | 65 | 96.9% |
| greenhouse:grafanalabs | 0 | 0 | 37 | 37 | 37 | 0.0% |
| real-work-from-anywhere | 32 | 3 | 1 | 4 | 36 | 88.9% |
| greenhouse:gitlab | 2 | 0 | 32 | 32 | 34 | 5.9% |
| workable:crewbloom | 5 | 0 | 25 | 25 | 30 | 16.7% |
| breezy:sourcefit | 25 | 0 | 1 | 3 | 26 | 96.2% |
| remote-ok | 12 | 5 | 4 | 9 | 21 | 57.1% |
| lever:vacancies | 20 | 0 | 0 | 0 | 20 | 100.0% |
| workable:pearltalent | 5 | 0 | 15 | 15 | 20 | 25.0% |
| greenhouse:solarwinds | 16 | 0 | 0 | 0 | 16 | 100.0% |
| jobicy-supporting-apac | 10 | 0 | 6 | 6 | 16 | 62.5% |
| lever:tenna | 11 | 0 | 0 | 0 | 11 | 100.0% |
| workable:coconutva | 10 | 0 | 0 | 0 | 10 | 100.0% |
| breezy:20four7va | 7 | 0 | 0 | 0 | 7 | 100.0% |
| ashby:railway | 6 | 0 | 0 | 0 | 6 | 100.0% |
| lever:applydigital | 6 | 0 | 0 | 0 | 6 | 100.0% |
| ashby:multiplymii | 5 | 0 | 0 | 0 | 5 | 100.0% |
| lever:outsourcedstaff | 5 | 0 | 0 | 0 | 5 | 100.0% |
| greenhouse:canonical | 0 | 0 | 4 | 4 | 4 | 0.0% |
| lever:willowinc | 4 | 0 | 0 | 0 | 4 | 100.0% |
| breezy:yokly | 3 | 0 | 0 | 0 | 3 | 100.0% |
| lever:gushwork | 3 | 0 | 0 | 0 | 3 | 100.0% |
| lever:parcelvision | 3 | 0 | 0 | 0 | 3 | 100.0% |
| ashby:flipper | 2 | 0 | 0 | 0 | 2 | 100.0% |
| ashby:luxor | 2 | 0 | 0 | 0 | 2 | 100.0% |
| remotive | 2 | 0 | 0 | 0 | 2 | 100.0% |
| ashby:finch | 1 | 0 | 0 | 0 | 1 | 100.0% |
| greenhouse:trinityparktalent | 1 | 0 | 0 | 0 | 1 | 100.0% |
| jobicy-admin-support-apac | 1 | 0 | 0 | 0 | 1 | 100.0% |
| workable:rocketams | 1 | 0 | 0 | 0 | 1 | 100.0% |

## Yield efficiency (last 7 days)

Stored eligibility per real (changed) fetch and per 100 items seen; not marginal verified first-publication yield.
UNKNOWN means a count is missing/invalid or its denominator is zero. Fetch and stored cohorts may differ across intake paths; these descriptive ratios do not establish source productivity or causal yield.

| source_id | real fetches | items seen | eligible stored | yield / fetch | yield / 100 items |
| --- | ---: | ---: | ---: | ---: | ---: |
| remotive | 167 | 1878 | 2 | 0.01 | 0.11 |
| ashby:multiplymii | 152 | 8875 | 5 | 0.03 | 0.06 |
| breezy:20four7va | 152 | 17716 | 7 | 0.05 | 0.04 |
| breezy:remote-craft | 152 | 2280 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:sourcefit | 152 | 13706 | 25 | 0.16 | 0.18 |
| breezy:time-etc | 152 | 152 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:value-virtual-assistants | 152 | 1672 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:yokly | 152 | 894 | 3 | 0.02 | 0.34 |
| greenhouse:canonical | 152 | 47057 | 0 | 0.00 | 0.00 |
| greenhouse:ghost | 152 | 852 | UNKNOWN | UNKNOWN | UNKNOWN |
| greenhouse:gitlab | 152 | 35008 | 2 | 0.01 | 0.01 |
| greenhouse:grafanalabs | 152 | 19024 | 0 | 0.00 | 0.00 |
| greenhouse:nearform | 152 | 3301 | UNKNOWN | UNKNOWN | UNKNOWN |
| real-work-from-anywhere | 151 | 7550 | 32 | 0.21 | 0.42 |
| we-work-remotely | 140 | 12608 | 122 | 0.87 | 0.97 |
| workable:hello-rache | 48 | 144 | UNKNOWN | UNKNOWN | UNKNOWN |
| workable:pearltalent | 48 | 14028 | 5 | 0.10 | 0.04 |
| workable:hunt-st | 47 | 6717 | 63 | 1.34 | 0.94 |
| workable:rocketams | 47 | 470 | 1 | 0.02 | 0.21 |
| workable:coconutva | 46 | 1481 | 10 | 0.22 | 0.68 |
| workable:crewbloom | 46 | 6198 | 5 | 0.11 | 0.08 |
| remote-ok | 29 | 1230 | 12 | 0.41 | 0.98 |
| jobicy-supporting-apac | 24 | 960 | 10 | 0.42 | 1.04 |
| jobicy-admin-support-apac | 2 | 10 | 1 | 0.50 | 10.00 |
| ashby:amplify | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:ashby | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:camunda | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:circulareconomysystems | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:flipper | 0 | 0 | 2 | UNKNOWN | UNKNOWN |
| ashby:foundry-for-good | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:getground | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:gradient | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:luxor | 0 | 0 | 2 | UNKNOWN | UNKNOWN |
| ashby:molecule | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:payscale | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:railway | 0 | 0 | 6 | UNKNOWN | UNKNOWN |
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
| lever:parcelvision | 0 | 0 | 3 | UNKNOWN | UNKNOWN |
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
| ashby:finch | UNKNOWN | UNKNOWN | 1 | UNKNOWN | UNKNOWN |
| greenhouse:trinityparktalent | UNKNOWN | UNKNOWN | 1 | UNKNOWN | UNKNOWN |
