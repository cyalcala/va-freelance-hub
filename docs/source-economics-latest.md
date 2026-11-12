# Source economics — latest (SP-02)

- **As of:** 2026-11-12T10:09:18.999Z
- **Windows:** 7d/14d/30d net-new by `scraped_at`
- **Reconciliation:** OK (every partition delta is zero)
- Read-only report; regenerate with `scripts/diagnostics/source-economics.ts`.

## Qualified supply (strict eligibility; first-stored proxy)

Excludes unclear/ineligible rows. Historical publication and later deactivation are not fully reconstructed.

| qualified active | qualified new 7d | per day (7d) | qualified new 30d | per day (30d) |
| ---: | ---: | ---: | ---: | ---: |
| 1723 | 176 | 25.14 | 1042 | 34.73 |

## Identity coverage (SP-01)

| total | with source_id | null source_id | coverage | active null-id |
| ---: | ---: | ---: | ---: | ---: |
| 8970 | 8970 | 0 | 100.0% | 0 |

## Net-new accepted supply

| active | net-new 7d | net-new 14d | net-new 30d |
| ---: | ---: | ---: | ---: |
| 1723 | 176 | 330 | 1042 |

## Provider-family concentration (ADR-006 §7)

- **Net-new 30d:** top family `we-work-remotely` 37.2%; top-3 65.3%.
- **Active:** top family `we-work-remotely` 28.8%; top-3 61.9%.
- `(unknown)` legacy rows are excluded from these shares.

| provider family | active | net-new 30d | net-new 7d | source ids |
| --- | ---: | ---: | ---: | --- |
| we-work-remotely | 497 | 388 | 49 | we-work-remotely |
| breezy | 346 | 119 | 27 | breezy:20four7va, breezy:sourcefit, breezy:yokly, breezy:remote-craft, breezy:value-virtual-assistants, breezy:time-etc |
| workable | 223 | 169 | 35 | workable:hunt-st, workable:crewbloom, workable:coconutva, workable:pearltalent, workable:rocketams, workable:hello-rache, workable:pineapple-staffing |
| real-work-from-anywhere | 158 | 123 | 33 | real-work-from-anywhere |
| greenhouse | 147 | 20 | 0 | greenhouse:canonical, greenhouse:solarwinds, greenhouse:gitlab, greenhouse:ghost, greenhouse:trinityparktalent, greenhouse:grafanalabs, greenhouse:janes, greenhouse:nearform, greenhouse:remotecom, greenhouse:trainingthestreet |
| ashby | 112 | 57 | 6 | ashby:multiplymii, ashby:trust-wallet, ashby:railway, ashby:scalemath, ashby:whippy, ashby:cubic3, ashby:flipper, ashby:luxor, ashby:finch, ashby:flutterflow, ashby:amplify, ashby:ashby, ashby:camunda, ashby:circulareconomysystems, ashby:foundry-for-good, ashby:getground, ashby:gradient, ashby:homera-health, ashby:molecule, ashby:payscale, ashby:supabase, ashby:the-studio, ashby:tremendous |
| lever | 84 | 84 | 0 | lever:vacancies, lever:tenna, lever:levelup, lever:nibiru, lever:applydigital, lever:brevo, lever:outsourcedstaff, lever:jetsupport, lever:willowinc, lever:gushwork, lever:parcelvision, lever:piccollage, lever:audinate, lever:alltrails, lever:90seconds, lever:beaverprocess, lever:brafton, lever:decilegroup, lever:deliverect, lever:hso, lever:lwolf, lever:repurposeglobal, lever:snappr, lever:truezerotech, lever:trustarc |
| remote-ok | 73 | 47 | 16 | remote-ok |
| jobicy | 66 | 29 | 8 | jobicy-supporting-apac, jobicy-admin-support-apac |
| remotive | 17 | 6 | 2 | remotive |
| authentic-jobs | 0 | 0 | 0 | authentic-jobs |
| dribbble | 0 | 0 | 0 | dribbble |
| himalayas | 0 | 0 | 0 | himalayas:remote-jobs |

## Supply by exact source_id

| source_id | platform | active | net-new 7d | net-new 30d | inactive |
| --- | --- | ---: | ---: | ---: | ---: |
| we-work-remotely | WeWorkRemotely | 497 | 49 | 388 | 1824 |
| breezy:20four7va | 20Four7VA | 176 | 19 | 64 | 154 |
| workable:hunt-st | Hunt St | 159 | 20 | 117 | 141 |
| real-work-from-anywhere | RealWorkFromAnywhere | 158 | 33 | 123 | 624 |
| breezy:sourcefit | Breezy/sourcefit | 130 | 8 | 50 | 184 |
| greenhouse:canonical | Canonical | 123 | 0 | 0 | 199 |
| ashby:multiplymii | Ashby/multiplymii | 79 | 6 | 24 | 16 |
| remote-ok | RemoteOK | 73 | 16 | 47 | 1249 |
| jobicy-supporting-apac | Jobicy | 59 | 7 | 25 | 155 |
| workable:crewbloom | CrewBloom | 27 | 7 | 21 | 74 |
| workable:coconutva | Coconut VA | 24 | 5 | 19 | 57 |
| lever:vacancies | Lever/vacancies | 20 | 0 | 20 | 0 |
| remotive | Remotive | 17 | 2 | 6 | 96 |
| breezy:yokly | Yokly | 16 | 0 | 5 | 1 |
| greenhouse:solarwinds | Greenhouse/solarwinds | 16 | 0 | 16 | 0 |
| breezy:remote-craft | Remote Craft | 14 | 0 | 0 | 1 |
| ashby:trust-wallet | Ashby/trust-wallet | 13 | 0 | 13 | 0 |
| workable:pearltalent | Pearl Talent | 12 | 3 | 11 | 63 |
| lever:tenna | Lever/tenna | 11 | 0 | 11 | 0 |
| breezy:value-virtual-assistants | VALUE Virtual Assistants | 10 | 0 | 0 | 1 |
| lever:levelup | Lever/levelup | 9 | 0 | 9 | 0 |
| lever:nibiru | Lever/nibiru | 8 | 0 | 8 | 0 |
| jobicy-admin-support-apac | Jobicy | 7 | 1 | 4 | 9 |
| ashby:railway | Ashby/railway | 6 | 0 | 6 | 0 |
| greenhouse:gitlab | GitLab | 6 | 0 | 3 | 653 |
| lever:applydigital | Lever/applydigital | 6 | 0 | 6 | 0 |
| lever:brevo | Lever/brevo | 5 | 0 | 5 | 0 |
| lever:outsourcedstaff | Lever/outsourcedstaff | 5 | 0 | 5 | 0 |
| lever:jetsupport | Lever/jetsupport | 4 | 0 | 4 | 0 |
| lever:willowinc | Lever/willowinc | 4 | 0 | 4 | 0 |
| ashby:scalemath | Ashby/scalemath | 3 | 0 | 3 | 0 |
| ashby:whippy | Ashby/whippy | 3 | 0 | 3 | 0 |
| lever:gushwork | Lever/gushwork | 3 | 0 | 3 | 0 |
| lever:parcelvision | Lever/parcelvision | 3 | 0 | 3 | 0 |
| lever:piccollage | Lever/piccollage | 3 | 0 | 3 | 0 |
| ashby:cubic3 | Ashby/cubic3 | 2 | 0 | 2 | 0 |
| ashby:flipper | Ashby/flipper | 2 | 0 | 2 | 0 |
| ashby:luxor | Ashby/luxor | 2 | 0 | 2 | 0 |
| lever:audinate | Lever/audinate | 2 | 0 | 2 | 0 |
| ashby:finch | Ashby/finch | 1 | 0 | 1 | 0 |
| ashby:flutterflow | Ashby/flutterflow | 1 | 0 | 1 | 0 |
| greenhouse:ghost | Ghost | 1 | 0 | 0 | 11 |
| greenhouse:trinityparktalent | Greenhouse/trinityparktalent | 1 | 0 | 1 | 0 |
| lever:alltrails | Lever/alltrails | 1 | 0 | 1 | 0 |
| workable:rocketams | RocketAMS | 1 | 0 | 1 | 10 |
| ashby:amplify | Amplify | 0 | 0 | 0 | 87 |
| ashby:ashby | Ashby | 0 | 0 | 0 | 92 |
| ashby:camunda | Camunda | 0 | 0 | 0 | 67 |
| ashby:circulareconomysystems | Ashby/circulareconomysystems | 0 | 0 | 0 | 3 |
| ashby:foundry-for-good | Ashby/foundry-for-good | 0 | 0 | 0 | 27 |
| ashby:getground | Ashby/getground | 0 | 0 | 0 | 2 |
| ashby:gradient | Ashby/gradient | 0 | 0 | 0 | 5 |
| ashby:homera-health | Ashby/homera-health | 0 | 0 | 0 | 1 |
| ashby:molecule | Ashby/molecule | 0 | 0 | 0 | 3 |
| ashby:payscale | Ashby/payscale | 0 | 0 | 0 | 4 |
| ashby:supabase | Supabase | 0 | 0 | 0 | 84 |
| ashby:the-studio | Ashby/the-studio | 0 | 0 | 0 | 3 |
| ashby:tremendous | Tremendous | 0 | 0 | 0 | 31 |
| authentic-jobs | AuthenticJobs | 0 | 0 | 0 | 10 |
| breezy:time-etc | Time Etc | 0 | 0 | 0 | 2 |
| dribbble | Dribbble | 0 | 0 | 0 | 113 |
| greenhouse:grafanalabs | Grafana Labs | 0 | 0 | 0 | 433 |
| greenhouse:janes | Greenhouse/janes | 0 | 0 | 0 | 2 |
| greenhouse:nearform | Nearform | 0 | 0 | 0 | 63 |
| greenhouse:remotecom | Remote.com | 0 | 0 | 0 | 622 |
| greenhouse:trainingthestreet | Greenhouse/trainingthestreet | 0 | 0 | 0 | 1 |
| himalayas:remote-jobs | Himalayas | 0 | 0 | 0 | 2 |
| lever:90seconds | Lever/90seconds | 0 | 0 | 0 | 1 |
| lever:beaverprocess | Lever/beaverprocess | 0 | 0 | 0 | 2 |
| lever:brafton | Lever/brafton | 0 | 0 | 0 | 5 |
| lever:decilegroup | Lever/decilegroup | 0 | 0 | 0 | 5 |
| lever:deliverect | Lever/deliverect | 0 | 0 | 0 | 9 |
| lever:hso | Lever/hso | 0 | 0 | 0 | 1 |
| lever:lwolf | Lever/lwolf | 0 | 0 | 0 | 4 |
| lever:repurposeglobal | Lever/repurposeglobal | 0 | 0 | 0 | 3 |
| lever:snappr | Lever/snappr | 0 | 0 | 0 | 13 |
| lever:truezerotech | Lever/truezerotech | 0 | 0 | 0 | 17 |
| lever:trustarc | Lever/trustarc | 0 | 0 | 0 | 1 |
| workable:hello-rache | Hello Rache | 0 | 0 | 0 | 4 |
| workable:pineapple-staffing | Pineapple Staffing | 0 | 0 | 0 | 3 |

## Fetch outcomes (last 7 days)

Separates real (changed) fetches from unchanged 304 polls, intentional skips, failures, and true zero-yield. `items` counts only changed fetches, so carried-forward unchanged counts never read as new supply.

| source_id | real fetches | unchanged | skips | failures | zero-yield | items |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| remotive | 166 | 789 | 0 | 0 | 0 | 2221 |
| real-work-from-anywhere | 148 | 0 | 807 | 0 | 0 | 7400 |
| ashby:multiplymii | 147 | 0 | 808 | 0 | 0 | 6655 |
| breezy:20four7va | 147 | 0 | 1763 | 0 | 0 | 18058 |
| breezy:remote-craft | 147 | 0 | 808 | 0 | 0 | 2205 |
| breezy:sourcefit | 147 | 0 | 808 | 0 | 0 | 16657 |
| breezy:time-etc | 147 | 0 | 808 | 0 | 0 | 147 |
| breezy:value-virtual-assistants | 147 | 0 | 808 | 0 | 0 | 1470 |
| breezy:yokly | 147 | 0 | 808 | 0 | 0 | 588 |
| greenhouse:gitlab | 147 | 0 | 808 | 0 | 0 | 36782 |
| greenhouse:grafanalabs | 147 | 0 | 808 | 0 | 0 | 19916 |
| greenhouse:nearform | 147 | 0 | 808 | 0 | 0 | 4026 |
| greenhouse:remotecom | 147 | 0 | 808 | 0 | 147 | 0 |
| greenhouse:canonical | 146 | 0 | 808 | 1 | 0 | 46136 |
| greenhouse:ghost | 146 | 0 | 808 | 1 | 0 | 730 |
| workable:hunt-st | 104 | 0 | 810 | 41 | 0 | 13053 |
| workable:rocketams | 104 | 0 | 810 | 41 | 0 | 1026 |
| workable:coconutva | 103 | 0 | 810 | 42 | 0 | 3356 |
| workable:crewbloom | 103 | 0 | 810 | 42 | 0 | 9526 |
| workable:hello-rache | 103 | 0 | 811 | 41 | 0 | 309 |
| workable:pearltalent | 103 | 0 | 811 | 41 | 0 | 29508 |
| we-work-remotely | 102 | 839 | 0 | 14 | 0 | 10200 |
| remote-ok | 49 | 99 | 807 | 0 | 0 | 2071 |
| jobicy-supporting-apac | 25 | 121 | 809 | 0 | 0 | 1000 |
| jobicy-admin-support-apac | 2 | 145 | 808 | 0 | 0 | 9 |
| ashby:amplify | 0 | 0 | 955 | 0 | 0 | 0 |
| ashby:ashby | 0 | 0 | 955 | 0 | 0 | 0 |
| ashby:camunda | 0 | 0 | 955 | 0 | 0 | 0 |
| ashby:circulareconomysystems | 0 | 0 | 955 | 0 | 0 | 0 |
| ashby:cubic3 | 0 | 0 | 955 | 0 | 0 | 0 |
| ashby:flipper | 0 | 0 | 955 | 0 | 0 | 0 |
| ashby:foundry-for-good | 0 | 0 | 955 | 0 | 0 | 0 |
| ashby:getground | 0 | 0 | 955 | 0 | 0 | 0 |
| ashby:gradient | 0 | 0 | 955 | 0 | 0 | 0 |
| ashby:luxor | 0 | 0 | 955 | 0 | 0 | 0 |
| ashby:molecule | 0 | 0 | 955 | 0 | 0 | 0 |
| ashby:payscale | 0 | 0 | 955 | 0 | 0 | 0 |
| ashby:railway | 0 | 0 | 955 | 0 | 0 | 0 |
| ashby:scalemath | 0 | 0 | 955 | 0 | 0 | 0 |
| ashby:supabase | 0 | 0 | 955 | 0 | 0 | 0 |
| ashby:the-studio | 0 | 0 | 955 | 0 | 0 | 0 |
| ashby:tremendous | 0 | 0 | 955 | 0 | 0 | 0 |
| ashby:trust-wallet | 0 | 0 | 955 | 0 | 0 | 0 |
| ashby:whippy | 0 | 0 | 955 | 0 | 0 | 0 |
| authentic-jobs | 0 | 0 | 955 | 0 | 0 | 0 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 955 | 0 | 0 | 0 |
| dribbble | 0 | 0 | 955 | 0 | 0 | 0 |
| jobspresso | 0 | 0 | 955 | 0 | 0 | 0 |
| lever:applydigital | 0 | 0 | 955 | 0 | 0 | 0 |
| lever:audinate | 0 | 0 | 955 | 0 | 0 | 0 |
| lever:beaverprocess | 0 | 0 | 955 | 0 | 0 | 0 |
| lever:brafton | 0 | 0 | 955 | 0 | 0 | 0 |
| lever:brevo | 0 | 0 | 955 | 0 | 0 | 0 |
| lever:decilegroup | 0 | 0 | 955 | 0 | 0 | 0 |
| lever:deliverect | 0 | 0 | 955 | 0 | 0 | 0 |
| lever:gushwork | 0 | 0 | 955 | 0 | 0 | 0 |
| lever:jetsupport | 0 | 0 | 955 | 0 | 0 | 0 |
| lever:lwolf | 0 | 0 | 955 | 0 | 0 | 0 |
| lever:nibiru | 0 | 0 | 955 | 0 | 0 | 0 |
| lever:outsourcedstaff | 0 | 0 | 955 | 0 | 0 | 0 |
| lever:parcelvision | 0 | 0 | 955 | 0 | 0 | 0 |
| lever:piccollage | 0 | 0 | 955 | 0 | 0 | 0 |
| lever:repurposeglobal | 0 | 0 | 955 | 0 | 0 | 0 |
| lever:snappr | 0 | 0 | 955 | 0 | 0 | 0 |
| lever:tenna | 0 | 0 | 955 | 0 | 0 | 0 |
| lever:truezerotech | 0 | 0 | 955 | 0 | 0 | 0 |
| lever:vacancies | 0 | 0 | 955 | 0 | 0 | 0 |
| lever:vaultoutsourcing | 0 | 0 | 955 | 0 | 0 | 0 |
| lever:willowinc | 0 | 0 | 955 | 0 | 0 | 0 |
| onlinejobs-ph | 0 | 0 | 955 | 0 | 0 | 0 |
| problogger | 0 | 0 | 955 | 0 | 0 | 0 |
| remote-co | 0 | 0 | 955 | 0 | 0 | 0 |
| workable:connectos | 0 | 0 | 955 | 0 | 0 | 0 |
| workable:global-strategic | 0 | 0 | 955 | 0 | 0 | 0 |
| workable:myoutdesk | 0 | 0 | 955 | 0 | 0 | 0 |
| workable:outsource-access | 0 | 0 | 955 | 0 | 0 | 0 |
| workable:pineapple-staffing | 0 | 0 | 955 | 0 | 0 | 0 |
| workable:staff-domain-inc | 0 | 0 | 955 | 0 | 0 | 0 |
| workable:superstaff | 0 | 0 | 955 | 0 | 0 | 0 |
| workable:virtualstaff365 | 0 | 0 | 955 | 0 | 0 | 0 |

## Geo & eligibility triage outcomes (last 7 days)

Breakdown of stored opportunities by Philippines eligibility verdict.

| source_id | eligible | unclear | ineligible | policy_rejected | total | qualified_rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 49 | 2 | 115 | 117 | 166 | 29.5% |
| real-work-from-anywhere | 33 | 6 | 6 | 12 | 45 | 73.3% |
| greenhouse:gitlab | 0 | 2 | 28 | 30 | 30 | 0.0% |
| greenhouse:grafanalabs | 0 | 0 | 25 | 25 | 25 | 0.0% |
| remote-ok | 16 | 1 | 6 | 7 | 23 | 69.6% |
| workable:hunt-st | 20 | 0 | 2 | 2 | 22 | 90.9% |
| breezy:20four7va | 19 | 0 | 0 | 0 | 19 | 100.0% |
| breezy:sourcefit | 8 | 0 | 7 | 7 | 15 | 53.3% |
| jobicy-supporting-apac | 7 | 0 | 5 | 5 | 12 | 58.3% |
| workable:crewbloom | 8 | 0 | 2 | 2 | 10 | 80.0% |
| ashby:multiplymii | 6 | 0 | 0 | 0 | 6 | 100.0% |
| workable:pearltalent | 3 | 0 | 3 | 3 | 6 | 50.0% |
| workable:coconutva | 5 | 0 | 0 | 0 | 5 | 100.0% |
| remotive | 2 | 0 | 2 | 2 | 4 | 50.0% |
| greenhouse:nearform | 0 | 0 | 3 | 3 | 3 | 0.0% |
| jobicy-admin-support-apac | 1 | 0 | 0 | 0 | 1 | 100.0% |
| workable:rocketams | 0 | 0 | 1 | 1 | 1 | 0.0% |

## Yield efficiency (last 7 days)

Stored eligibility per real (changed) fetch and per 100 items seen; not marginal verified first-publication yield.
UNKNOWN means a count is missing/invalid or its denominator is zero. Fetch and stored cohorts may differ across intake paths; these descriptive ratios do not establish source productivity or causal yield.

| source_id | real fetches | items seen | eligible stored | yield / fetch | yield / 100 items |
| --- | ---: | ---: | ---: | ---: | ---: |
| remotive | 166 | 2221 | 2 | 0.01 | 0.09 |
| real-work-from-anywhere | 148 | 7400 | 33 | 0.22 | 0.45 |
| ashby:multiplymii | 147 | 6655 | 6 | 0.04 | 0.09 |
| breezy:20four7va | 147 | 18058 | 19 | 0.13 | 0.11 |
| breezy:remote-craft | 147 | 2205 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:sourcefit | 147 | 16657 | 8 | 0.05 | 0.05 |
| breezy:time-etc | 147 | 147 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:value-virtual-assistants | 147 | 1470 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:yokly | 147 | 588 | UNKNOWN | UNKNOWN | UNKNOWN |
| greenhouse:gitlab | 147 | 36782 | 0 | 0.00 | 0.00 |
| greenhouse:grafanalabs | 147 | 19916 | 0 | 0.00 | 0.00 |
| greenhouse:nearform | 147 | 4026 | 0 | 0.00 | 0.00 |
| greenhouse:remotecom | 147 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| greenhouse:canonical | 146 | 46136 | UNKNOWN | UNKNOWN | UNKNOWN |
| greenhouse:ghost | 146 | 730 | UNKNOWN | UNKNOWN | UNKNOWN |
| workable:hunt-st | 104 | 13053 | 20 | 0.19 | 0.15 |
| workable:rocketams | 104 | 1026 | 0 | 0.00 | 0.00 |
| workable:coconutva | 103 | 3356 | 5 | 0.05 | 0.15 |
| workable:crewbloom | 103 | 9526 | 8 | 0.08 | 0.08 |
| workable:hello-rache | 103 | 309 | UNKNOWN | UNKNOWN | UNKNOWN |
| workable:pearltalent | 103 | 29508 | 3 | 0.03 | 0.01 |
| we-work-remotely | 102 | 10200 | 49 | 0.48 | 0.48 |
| remote-ok | 49 | 2071 | 16 | 0.33 | 0.77 |
| jobicy-supporting-apac | 25 | 1000 | 7 | 0.28 | 0.70 |
| jobicy-admin-support-apac | 2 | 9 | 1 | 0.50 | 11.11 |
| ashby:amplify | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:ashby | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:camunda | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:circulareconomysystems | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:cubic3 | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:flipper | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:foundry-for-good | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:getground | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:gradient | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:luxor | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:molecule | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:payscale | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:railway | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:scalemath | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:supabase | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:the-studio | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:tremendous | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:trust-wallet | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:whippy | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| authentic-jobs | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:vaaphilippines-recruitment | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| dribbble | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| jobspresso | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:applydigital | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:audinate | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:beaverprocess | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:brafton | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:brevo | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:decilegroup | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:deliverect | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:gushwork | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:jetsupport | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:lwolf | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:nibiru | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:outsourcedstaff | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:parcelvision | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:piccollage | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:repurposeglobal | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:snappr | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:tenna | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:truezerotech | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:vacancies | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:vaultoutsourcing | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:willowinc | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
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
