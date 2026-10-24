# Source economics — latest (SP-02)

- **As of:** 2026-10-24T07:33:23.781Z
- **Windows:** 7d/14d/30d net-new by `scraped_at`
- **Reconciliation:** OK (every partition delta is zero)
- Read-only report; regenerate with `scripts/diagnostics/source-economics.ts`.

## Qualified supply (strict eligibility; first-stored proxy)

Excludes unclear/ineligible rows. Historical publication and later deactivation are not fully reconstructed.

| qualified active | qualified new 7d | per day (7d) | qualified new 30d | per day (30d) |
| ---: | ---: | ---: | ---: | ---: |
| 1950 | 344 | 49.14 | 1530 | 51.00 |

## Identity coverage (SP-01)

| total | with source_id | null source_id | coverage | active null-id |
| ---: | ---: | ---: | ---: | ---: |
| 7999 | 7999 | 0 | 100.0% | 0 |

## Net-new accepted supply

| active | net-new 7d | net-new 14d | net-new 30d |
| ---: | ---: | ---: | ---: |
| 1950 | 344 | 587 | 1530 |

## Provider-family concentration (ADR-006 §7)

- **Net-new 30d:** top family `we-work-remotely` 30.7%; top-3 64.7%.
- **Active:** top family `we-work-remotely` 28.4%; top-3 63.6%.
- `(unknown)` legacy rows are excluded from these shares.

| provider family | active | net-new 30d | net-new 7d | source ids |
| --- | ---: | ---: | ---: | --- |
| we-work-remotely | 554 | 469 | 133 | we-work-remotely |
| workable | 363 | 363 | 61 | workable:hunt-st, workable:coconutva, workable:crewbloom, workable:pearltalent, workable:rocketams, workable:hello-rache, workable:pineapple-staffing |
| breezy | 324 | 113 | 37 | breezy:20four7va, breezy:sourcefit, breezy:yokly, breezy:remote-craft, breezy:value-virtual-assistants, breezy:time-etc |
| greenhouse | 165 | 158 | 17 | greenhouse:canonical, greenhouse:solarwinds, greenhouse:remotecom, greenhouse:gitlab, greenhouse:janes, greenhouse:ghost, greenhouse:trainingthestreet, greenhouse:trinityparktalent, greenhouse:grafanalabs, greenhouse:nearform |
| real-work-from-anywhere | 142 | 104 | 24 | real-work-from-anywhere |
| ashby | 141 | 141 | 13 | ashby:multiplymii, ashby:foundry-for-good, ashby:railway, ashby:gradient, ashby:payscale, ashby:circulareconomysystems, ashby:molecule, ashby:the-studio, ashby:flipper, ashby:getground, ashby:luxor, ashby:finch, ashby:homera-health, ashby:amplify, ashby:ashby, ashby:camunda, ashby:supabase, ashby:tremendous |
| lever | 113 | 113 | 35 | lever:vacancies, lever:truezerotech, lever:snappr, lever:tenna, lever:deliverect, lever:applydigital, lever:brafton, lever:decilegroup, lever:outsourcedstaff, lever:lwolf, lever:willowinc, lever:gushwork, lever:parcelvision, lever:repurposeglobal, lever:beaverprocess, lever:90seconds, lever:hso, lever:trustarc |
| remote-ok | 68 | 43 | 11 | remote-ok |
| jobicy | 63 | 20 | 11 | jobicy-supporting-apac, jobicy-admin-support-apac |
| remotive | 15 | 4 | 2 | remotive |
| himalayas | 2 | 2 | 0 | himalayas:remote-jobs |
| authentic-jobs | 0 | 0 | 0 | authentic-jobs |
| dribbble | 0 | 0 | 0 | dribbble |

## Supply by exact source_id

| source_id | platform | active | net-new 7d | net-new 30d | inactive |
| --- | --- | ---: | ---: | ---: | ---: |
| we-work-remotely | WeWorkRemotely | 554 | 133 | 469 | 1385 |
| workable:hunt-st | Hunt St | 239 | 41 | 239 | 5 |
| breezy:20four7va | 20Four7VA | 158 | 11 | 55 | 128 |
| real-work-from-anywhere | RealWorkFromAnywhere | 142 | 24 | 104 | 551 |
| breezy:sourcefit | Breezy/sourcefit | 127 | 23 | 53 | 149 |
| greenhouse:canonical | Canonical | 124 | 0 | 124 | 196 |
| ashby:multiplymii | Ashby/multiplymii | 82 | 5 | 82 | 0 |
| remote-ok | RemoteOK | 68 | 11 | 43 | 1202 |
| jobicy-supporting-apac | Jobicy | 58 | 10 | 18 | 102 |
| workable:coconutva | Coconut VA | 51 | 10 | 51 | 21 |
| workable:crewbloom | CrewBloom | 41 | 4 | 41 | 38 |
| ashby:foundry-for-good | Ashby/foundry-for-good | 27 | 0 | 27 | 0 |
| workable:pearltalent | Pearl Talent | 23 | 5 | 23 | 41 |
| lever:vacancies | Lever/vacancies | 20 | 20 | 20 | 0 |
| lever:truezerotech | Lever/truezerotech | 17 | 0 | 17 | 0 |
| greenhouse:solarwinds | Greenhouse/solarwinds | 16 | 16 | 16 | 0 |
| breezy:yokly | Yokly | 15 | 3 | 4 | 0 |
| remotive | Remotive | 15 | 2 | 4 | 90 |
| breezy:remote-craft | Remote Craft | 14 | 0 | 0 | 1 |
| greenhouse:remotecom | Remote.com | 14 | 0 | 8 | 608 |
| lever:snappr | Lever/snappr | 13 | 0 | 13 | 0 |
| lever:tenna | Lever/tenna | 11 | 0 | 11 | 0 |
| breezy:value-virtual-assistants | VALUE Virtual Assistants | 10 | 0 | 1 | 1 |
| lever:deliverect | Lever/deliverect | 9 | 0 | 9 | 0 |
| workable:rocketams | RocketAMS | 8 | 1 | 8 | 2 |
| ashby:railway | Ashby/railway | 6 | 6 | 6 | 0 |
| greenhouse:gitlab | GitLab | 6 | 0 | 6 | 578 |
| lever:applydigital | Lever/applydigital | 6 | 0 | 6 | 0 |
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
| ashby:luxor | Ashby/luxor | 2 | 0 | 2 | 0 |
| greenhouse:janes | Greenhouse/janes | 2 | 0 | 2 | 0 |
| himalayas:remote-jobs | Himalayas | 2 | 0 | 2 | 0 |
| lever:beaverprocess | Lever/beaverprocess | 2 | 0 | 2 | 0 |
| ashby:finch | Ashby/finch | 1 | 0 | 1 | 0 |
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
| greenhouse:grafanalabs | Grafana Labs | 0 | 0 | 0 | 383 |
| greenhouse:nearform | Nearform | 0 | 0 | 0 | 57 |
| workable:pineapple-staffing | Pineapple Staffing | 0 | 0 | 0 | 3 |

## Fetch outcomes (last 7 days)

Separates real (changed) fetches from unchanged 304 polls, intentional skips, failures, and true zero-yield. `items` counts only changed fetches, so carried-forward unchanged counts never read as new supply.

| source_id | real fetches | unchanged | skips | failures | zero-yield | items |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| remotive | 168 | 837 | 0 | 0 | 0 | 1812 |
| ashby:multiplymii | 152 | 0 | 853 | 0 | 0 | 8809 |
| breezy:20four7va | 152 | 0 | 1858 | 0 | 0 | 17774 |
| breezy:remote-craft | 152 | 0 | 853 | 0 | 0 | 2280 |
| breezy:sourcefit | 152 | 0 | 853 | 0 | 0 | 13948 |
| breezy:time-etc | 152 | 0 | 853 | 0 | 0 | 152 |
| breezy:value-virtual-assistants | 152 | 0 | 853 | 0 | 0 | 1672 |
| breezy:yokly | 152 | 0 | 853 | 0 | 46 | 720 |
| greenhouse:canonical | 152 | 0 | 853 | 0 | 0 | 47148 |
| greenhouse:ghost | 152 | 0 | 853 | 0 | 0 | 808 |
| greenhouse:gitlab | 152 | 0 | 853 | 0 | 0 | 35202 |
| greenhouse:grafanalabs | 152 | 0 | 853 | 0 | 0 | 19746 |
| greenhouse:nearform | 152 | 0 | 853 | 0 | 0 | 3316 |
| real-work-from-anywhere | 152 | 0 | 853 | 0 | 0 | 7600 |
| we-work-remotely | 129 | 873 | 0 | 3 | 0 | 11763 |
| workable:hello-rache | 61 | 0 | 922 | 22 | 0 | 183 |
| workable:hunt-st | 61 | 0 | 922 | 22 | 0 | 8725 |
| workable:pearltalent | 61 | 0 | 922 | 22 | 0 | 17837 |
| workable:rocketams | 61 | 0 | 922 | 22 | 0 | 610 |
| workable:coconutva | 60 | 0 | 921 | 24 | 0 | 1929 |
| workable:crewbloom | 60 | 0 | 921 | 24 | 0 | 7504 |
| remote-ok | 28 | 124 | 853 | 0 | 0 | 1190 |
| jobicy-supporting-apac | 23 | 114 | 854 | 14 | 0 | 920 |
| jobicy-admin-support-apac | 2 | 134 | 855 | 14 | 0 | 10 |
| ashby:amplify | 0 | 0 | 1005 | 0 | 0 | 0 |
| ashby:ashby | 0 | 0 | 1005 | 0 | 0 | 0 |
| ashby:camunda | 0 | 0 | 1005 | 0 | 0 | 0 |
| ashby:circulareconomysystems | 0 | 0 | 1005 | 0 | 0 | 0 |
| ashby:flipper | 0 | 0 | 207 | 0 | 0 | 0 |
| ashby:foundry-for-good | 0 | 0 | 1005 | 0 | 0 | 0 |
| ashby:getground | 0 | 0 | 1005 | 0 | 0 | 0 |
| ashby:gradient | 0 | 0 | 1005 | 0 | 0 | 0 |
| ashby:luxor | 0 | 0 | 1005 | 0 | 0 | 0 |
| ashby:molecule | 0 | 0 | 1005 | 0 | 0 | 0 |
| ashby:payscale | 0 | 0 | 1005 | 0 | 0 | 0 |
| ashby:railway | 0 | 0 | 234 | 0 | 0 | 0 |
| ashby:supabase | 0 | 0 | 1005 | 0 | 0 | 0 |
| ashby:the-studio | 0 | 0 | 1005 | 0 | 0 | 0 |
| ashby:tremendous | 0 | 0 | 1005 | 0 | 0 | 0 |
| authentic-jobs | 0 | 0 | 1005 | 0 | 0 | 0 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 1005 | 0 | 0 | 0 |
| dribbble | 0 | 0 | 1005 | 0 | 0 | 0 |
| greenhouse:remotecom | 0 | 0 | 853 | 152 | 0 | 0 |
| jobspresso | 0 | 0 | 1005 | 0 | 0 | 0 |
| lever:applydigital | 0 | 0 | 1005 | 0 | 0 | 0 |
| lever:beaverprocess | 0 | 0 | 1005 | 0 | 0 | 0 |
| lever:brafton | 0 | 0 | 1005 | 0 | 0 | 0 |
| lever:decilegroup | 0 | 0 | 1005 | 0 | 0 | 0 |
| lever:deliverect | 0 | 0 | 1005 | 0 | 0 | 0 |
| lever:gushwork | 0 | 0 | 745 | 0 | 0 | 0 |
| lever:lwolf | 0 | 0 | 1005 | 0 | 0 | 0 |
| lever:outsourcedstaff | 0 | 0 | 822 | 0 | 0 | 0 |
| lever:parcelvision | 0 | 0 | 267 | 0 | 0 | 0 |
| lever:repurposeglobal | 0 | 0 | 1005 | 0 | 0 | 0 |
| lever:snappr | 0 | 0 | 1005 | 0 | 0 | 0 |
| lever:tenna | 0 | 0 | 1005 | 0 | 0 | 0 |
| lever:truezerotech | 0 | 0 | 1005 | 0 | 0 | 0 |
| lever:vacancies | 0 | 0 | 639 | 0 | 0 | 0 |
| lever:vaultoutsourcing | 0 | 0 | 1005 | 0 | 0 | 0 |
| lever:willowinc | 0 | 0 | 639 | 0 | 0 | 0 |
| onlinejobs-ph | 0 | 0 | 1005 | 0 | 0 | 0 |
| problogger | 0 | 0 | 1005 | 0 | 0 | 0 |
| remote-co | 0 | 0 | 1005 | 0 | 0 | 0 |
| workable:connectos | 0 | 0 | 1005 | 0 | 0 | 0 |
| workable:global-strategic | 0 | 0 | 1005 | 0 | 0 | 0 |
| workable:myoutdesk | 0 | 0 | 1005 | 0 | 0 | 0 |
| workable:outsource-access | 0 | 0 | 1005 | 0 | 0 | 0 |
| workable:pineapple-staffing | 0 | 0 | 1005 | 0 | 0 | 0 |
| workable:staff-domain-inc | 0 | 0 | 1005 | 0 | 0 | 0 |
| workable:superstaff | 0 | 0 | 1005 | 0 | 0 | 0 |
| workable:virtualstaff365 | 0 | 0 | 1005 | 0 | 0 | 0 |

## Geo & eligibility triage outcomes (last 7 days)

Breakdown of stored opportunities by Philippines eligibility verdict.

| source_id | eligible | unclear | ineligible | policy_rejected | total | qualified_rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 133 | 1 | 25 | 26 | 159 | 83.6% |
| greenhouse:grafanalabs | 0 | 0 | 50 | 50 | 50 | 0.0% |
| workable:hunt-st | 41 | 1 | 1 | 1 | 43 | 95.3% |
| greenhouse:gitlab | 0 | 0 | 30 | 30 | 30 | 0.0% |
| real-work-from-anywhere | 24 | 5 | 1 | 6 | 30 | 80.0% |
| workable:crewbloom | 4 | 0 | 25 | 25 | 29 | 13.8% |
| breezy:sourcefit | 23 | 0 | 1 | 3 | 24 | 95.8% |
| lever:vacancies | 20 | 0 | 0 | 0 | 20 | 100.0% |
| workable:pearltalent | 5 | 0 | 15 | 15 | 20 | 25.0% |
| jobicy-supporting-apac | 10 | 0 | 7 | 7 | 17 | 58.8% |
| remote-ok | 11 | 3 | 3 | 6 | 17 | 64.7% |
| greenhouse:solarwinds | 16 | 0 | 0 | 0 | 16 | 100.0% |
| breezy:20four7va | 11 | 0 | 0 | 0 | 11 | 100.0% |
| workable:coconutva | 10 | 0 | 0 | 0 | 10 | 100.0% |
| greenhouse:canonical | 0 | 0 | 8 | 8 | 8 | 0.0% |
| ashby:railway | 6 | 0 | 0 | 0 | 6 | 100.0% |
| ashby:multiplymii | 5 | 0 | 0 | 0 | 5 | 100.0% |
| lever:outsourcedstaff | 5 | 0 | 0 | 0 | 5 | 100.0% |
| lever:willowinc | 4 | 0 | 0 | 0 | 4 | 100.0% |
| breezy:yokly | 3 | 0 | 0 | 0 | 3 | 100.0% |
| lever:gushwork | 3 | 0 | 0 | 0 | 3 | 100.0% |
| lever:parcelvision | 3 | 0 | 0 | 0 | 3 | 100.0% |
| ashby:flipper | 2 | 0 | 0 | 0 | 2 | 100.0% |
| greenhouse:nearform | 0 | 0 | 2 | 2 | 2 | 0.0% |
| remotive | 2 | 0 | 0 | 0 | 2 | 100.0% |
| greenhouse:trinityparktalent | 1 | 0 | 0 | 0 | 1 | 100.0% |
| jobicy-admin-support-apac | 1 | 0 | 0 | 0 | 1 | 100.0% |
| workable:rocketams | 1 | 0 | 0 | 0 | 1 | 100.0% |

## Yield efficiency (last 7 days)

Stored eligibility per real (changed) fetch and per 100 items seen; not marginal verified first-publication yield.
UNKNOWN means a count is missing/invalid or its denominator is zero. Fetch and stored cohorts may differ across intake paths; these descriptive ratios do not establish source productivity or causal yield.

| source_id | real fetches | items seen | eligible stored | yield / fetch | yield / 100 items |
| --- | ---: | ---: | ---: | ---: | ---: |
| remotive | 168 | 1812 | 2 | 0.01 | 0.11 |
| ashby:multiplymii | 152 | 8809 | 5 | 0.03 | 0.06 |
| breezy:20four7va | 152 | 17774 | 11 | 0.07 | 0.06 |
| breezy:remote-craft | 152 | 2280 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:sourcefit | 152 | 13948 | 23 | 0.15 | 0.16 |
| breezy:time-etc | 152 | 152 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:value-virtual-assistants | 152 | 1672 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:yokly | 152 | 720 | 3 | 0.02 | 0.42 |
| greenhouse:canonical | 152 | 47148 | 0 | 0.00 | 0.00 |
| greenhouse:ghost | 152 | 808 | UNKNOWN | UNKNOWN | UNKNOWN |
| greenhouse:gitlab | 152 | 35202 | 0 | 0.00 | 0.00 |
| greenhouse:grafanalabs | 152 | 19746 | 0 | 0.00 | 0.00 |
| greenhouse:nearform | 152 | 3316 | 0 | 0.00 | 0.00 |
| real-work-from-anywhere | 152 | 7600 | 24 | 0.16 | 0.32 |
| we-work-remotely | 129 | 11763 | 133 | 1.03 | 1.13 |
| workable:hello-rache | 61 | 183 | UNKNOWN | UNKNOWN | UNKNOWN |
| workable:hunt-st | 61 | 8725 | 41 | 0.67 | 0.47 |
| workable:pearltalent | 61 | 17837 | 5 | 0.08 | 0.03 |
| workable:rocketams | 61 | 610 | 1 | 0.02 | 0.16 |
| workable:coconutva | 60 | 1929 | 10 | 0.17 | 0.52 |
| workable:crewbloom | 60 | 7504 | 4 | 0.07 | 0.05 |
| remote-ok | 28 | 1190 | 11 | 0.39 | 0.92 |
| jobicy-supporting-apac | 23 | 920 | 10 | 0.43 | 1.09 |
| jobicy-admin-support-apac | 2 | 10 | 1 | 0.50 | 10.00 |
| ashby:amplify | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:ashby | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:camunda | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:circulareconomysystems | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:flipper | 0 | 0 | 2 | UNKNOWN | UNKNOWN |
| ashby:foundry-for-good | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:getground | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:gradient | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:luxor | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
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
| lever:applydigital | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
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
| lever:tenna | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
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
| greenhouse:trinityparktalent | UNKNOWN | UNKNOWN | 1 | UNKNOWN | UNKNOWN |
