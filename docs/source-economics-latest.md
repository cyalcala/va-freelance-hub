# Source economics — latest (SP-02)

- **As of:** 2026-11-26T11:23:54.243Z
- **Windows:** 7d/14d/30d net-new by `scraped_at`
- **Reconciliation:** OK (every partition delta is zero)
- Read-only report; regenerate with `scripts/diagnostics/source-economics.ts`.

## Qualified supply (strict eligibility; first-stored proxy)

Excludes unclear/ineligible rows. Historical publication and later deactivation are not fully reconstructed.

| qualified active | qualified new 7d | per day (7d) | qualified new 30d | per day (30d) |
| ---: | ---: | ---: | ---: | ---: |
| 2012 | 697 | 99.57 | 1263 | 42.10 |

## Identity coverage (SP-01)

| total | with source_id | null source_id | coverage | active null-id |
| ---: | ---: | ---: | ---: | ---: |
| 10596 | 10596 | 0 | 100.0% | 0 |

## Net-new accepted supply

| active | net-new 7d | net-new 14d | net-new 30d |
| ---: | ---: | ---: | ---: |
| 2012 | 697 | 875 | 1263 |

## Provider-family concentration (ADR-006 §7)

- **Net-new 30d:** top family `we-work-remotely` 65.0% ⚠️ >40%; top-3 84.0% ⚠️ >70%.
- **Active:** top family `we-work-remotely` 45.8% ⚠️ >40%; top-3 75.2% ⚠️ >70%.
- `(unknown)` legacy rows are excluded from these shares.

| provider family | active | net-new 30d | net-new 7d | source ids |
| --- | ---: | ---: | ---: | --- |
| we-work-remotely | 921 | 821 | 575 | we-work-remotely |
| breezy | 350 | 104 | 33 | breezy:20four7va, breezy:sourcefit, breezy:remote-craft, breezy:yokly, breezy:value-virtual-assistants, breezy:time-etc |
| workable | 243 | 133 | 33 | workable:hunt-st, workable:crewbloom, workable:coconutva, workable:pearltalent, workable:rocketams, workable:hello-rache, workable:pineapple-staffing |
| real-work-from-anywhere | 148 | 107 | 26 | real-work-from-anywhere |
| greenhouse | 130 | 2 | 0 | greenhouse:canonical, greenhouse:gitlab, greenhouse:ghost, greenhouse:grafanalabs, greenhouse:janes, greenhouse:nearform, greenhouse:remotecom, greenhouse:solarwinds, greenhouse:trainingthestreet, greenhouse:trinityparktalent |
| remote-ok | 74 | 51 | 24 | remote-ok |
| ashby | 72 | 19 | 2 | ashby:multiplymii, ashby:amplify, ashby:ashby, ashby:camunda, ashby:circulareconomysystems, ashby:cubic3, ashby:finch, ashby:flipper, ashby:flutterflow, ashby:foundry-for-good, ashby:getground, ashby:gradient, ashby:homera-health, ashby:luxor, ashby:molecule, ashby:payscale, ashby:railway, ashby:scalemath, ashby:supabase, ashby:the-studio, ashby:tremendous, ashby:trust-wallet, ashby:whippy |
| jobicy | 62 | 23 | 4 | jobicy-supporting-apac, jobicy-admin-support-apac |
| remotive | 12 | 3 | 0 | remotive |
| authentic-jobs | 0 | 0 | 0 | authentic-jobs |
| dribbble | 0 | 0 | 0 | dribbble |
| himalayas | 0 | 0 | 0 | himalayas:remote-jobs |
| lever | 0 | 0 | 0 | lever:90seconds, lever:alltrails, lever:applydigital, lever:audinate, lever:beaverprocess, lever:brafton, lever:brevo, lever:decilegroup, lever:deliverect, lever:gushwork, lever:hso, lever:jetsupport, lever:levelup, lever:lwolf, lever:nibiru, lever:outsourcedstaff, lever:parcelvision, lever:piccollage, lever:repurposeglobal, lever:snappr, lever:tenna, lever:truezerotech, lever:trustarc, lever:vacancies, lever:willowinc |

## Supply by exact source_id

| source_id | platform | active | net-new 7d | net-new 30d | inactive |
| --- | --- | ---: | ---: | ---: | ---: |
| we-work-remotely | WeWorkRemotely | 921 | 575 | 821 | 2478 |
| breezy:20four7va | 20Four7VA | 189 | 17 | 67 | 167 |
| workable:hunt-st | Hunt St | 166 | 19 | 85 | 179 |
| real-work-from-anywhere | RealWorkFromAnywhere | 148 | 26 | 107 | 697 |
| breezy:sourcefit | Breezy/sourcefit | 127 | 12 | 32 | 209 |
| greenhouse:canonical | Canonical | 122 | 0 | 1 | 205 |
| remote-ok | RemoteOK | 74 | 24 | 51 | 1455 |
| ashby:multiplymii | Ashby/multiplymii | 72 | 2 | 19 | 30 |
| jobicy-supporting-apac | Jobicy | 56 | 4 | 21 | 180 |
| workable:crewbloom | CrewBloom | 31 | 5 | 21 | 84 |
| workable:coconutva | Coconut VA | 27 | 4 | 14 | 59 |
| workable:pearltalent | Pearl Talent | 18 | 5 | 13 | 81 |
| breezy:remote-craft | Remote Craft | 14 | 0 | 0 | 1 |
| remotive | Remotive | 12 | 0 | 3 | 106 |
| breezy:yokly | Yokly | 11 | 4 | 5 | 10 |
| breezy:value-virtual-assistants | VALUE Virtual Assistants | 9 | 0 | 0 | 2 |
| greenhouse:gitlab | GitLab | 7 | 0 | 1 | 712 |
| jobicy-admin-support-apac | Jobicy | 6 | 0 | 2 | 10 |
| greenhouse:ghost | Ghost | 1 | 0 | 0 | 11 |
| workable:rocketams | RocketAMS | 1 | 0 | 0 | 10 |
| ashby:amplify | Amplify | 0 | 0 | 0 | 87 |
| ashby:ashby | Ashby | 0 | 0 | 0 | 92 |
| ashby:camunda | Camunda | 0 | 0 | 0 | 67 |
| ashby:circulareconomysystems | Ashby/circulareconomysystems | 0 | 0 | 0 | 3 |
| ashby:cubic3 | Ashby/cubic3 | 0 | 0 | 0 | 2 |
| ashby:finch | Ashby/finch | 0 | 0 | 0 | 1 |
| ashby:flipper | Ashby/flipper | 0 | 0 | 0 | 2 |
| ashby:flutterflow | Ashby/flutterflow | 0 | 0 | 0 | 1 |
| ashby:foundry-for-good | Ashby/foundry-for-good | 0 | 0 | 0 | 27 |
| ashby:getground | Ashby/getground | 0 | 0 | 0 | 2 |
| ashby:gradient | Ashby/gradient | 0 | 0 | 0 | 5 |
| ashby:homera-health | Ashby/homera-health | 0 | 0 | 0 | 1 |
| ashby:luxor | Ashby/luxor | 0 | 0 | 0 | 2 |
| ashby:molecule | Ashby/molecule | 0 | 0 | 0 | 3 |
| ashby:payscale | Ashby/payscale | 0 | 0 | 0 | 4 |
| ashby:railway | Ashby/railway | 0 | 0 | 0 | 6 |
| ashby:scalemath | Ashby/scalemath | 0 | 0 | 0 | 3 |
| ashby:supabase | Supabase | 0 | 0 | 0 | 84 |
| ashby:the-studio | Ashby/the-studio | 0 | 0 | 0 | 3 |
| ashby:tremendous | Tremendous | 0 | 0 | 0 | 31 |
| ashby:trust-wallet | Ashby/trust-wallet | 0 | 0 | 0 | 13 |
| ashby:whippy | Ashby/whippy | 0 | 0 | 0 | 3 |
| authentic-jobs | AuthenticJobs | 0 | 0 | 0 | 10 |
| breezy:time-etc | Time Etc | 0 | 0 | 0 | 2 |
| dribbble | Dribbble | 0 | 0 | 0 | 113 |
| greenhouse:grafanalabs | Grafana Labs | 0 | 0 | 0 | 469 |
| greenhouse:janes | Greenhouse/janes | 0 | 0 | 0 | 2 |
| greenhouse:nearform | Nearform | 0 | 0 | 0 | 66 |
| greenhouse:remotecom | Remote.com | 0 | 0 | 0 | 622 |
| greenhouse:solarwinds | Greenhouse/solarwinds | 0 | 0 | 0 | 16 |
| greenhouse:trainingthestreet | Greenhouse/trainingthestreet | 0 | 0 | 0 | 1 |
| greenhouse:trinityparktalent | Greenhouse/trinityparktalent | 0 | 0 | 0 | 1 |
| himalayas:remote-jobs | Himalayas | 0 | 0 | 0 | 2 |
| lever:90seconds | Lever/90seconds | 0 | 0 | 0 | 1 |
| lever:alltrails | Lever/alltrails | 0 | 0 | 0 | 1 |
| lever:applydigital | Lever/applydigital | 0 | 0 | 0 | 6 |
| lever:audinate | Lever/audinate | 0 | 0 | 0 | 2 |
| lever:beaverprocess | Lever/beaverprocess | 0 | 0 | 0 | 2 |
| lever:brafton | Lever/brafton | 0 | 0 | 0 | 5 |
| lever:brevo | Lever/brevo | 0 | 0 | 0 | 5 |
| lever:decilegroup | Lever/decilegroup | 0 | 0 | 0 | 5 |
| lever:deliverect | Lever/deliverect | 0 | 0 | 0 | 9 |
| lever:gushwork | Lever/gushwork | 0 | 0 | 0 | 3 |
| lever:hso | Lever/hso | 0 | 0 | 0 | 1 |
| lever:jetsupport | Lever/jetsupport | 0 | 0 | 0 | 4 |
| lever:levelup | Lever/levelup | 0 | 0 | 0 | 9 |
| lever:lwolf | Lever/lwolf | 0 | 0 | 0 | 4 |
| lever:nibiru | Lever/nibiru | 0 | 0 | 0 | 8 |
| lever:outsourcedstaff | Lever/outsourcedstaff | 0 | 0 | 0 | 5 |
| lever:parcelvision | Lever/parcelvision | 0 | 0 | 0 | 3 |
| lever:piccollage | Lever/piccollage | 0 | 0 | 0 | 3 |
| lever:repurposeglobal | Lever/repurposeglobal | 0 | 0 | 0 | 3 |
| lever:snappr | Lever/snappr | 0 | 0 | 0 | 13 |
| lever:tenna | Lever/tenna | 0 | 0 | 0 | 11 |
| lever:truezerotech | Lever/truezerotech | 0 | 0 | 0 | 17 |
| lever:trustarc | Lever/trustarc | 0 | 0 | 0 | 1 |
| lever:vacancies | Lever/vacancies | 0 | 0 | 0 | 20 |
| lever:willowinc | Lever/willowinc | 0 | 0 | 0 | 4 |
| workable:hello-rache | Hello Rache | 0 | 0 | 0 | 4 |
| workable:pineapple-staffing | Pineapple Staffing | 0 | 0 | 0 | 3 |

## Fetch outcomes (last 7 days)

Separates real (changed) fetches from unchanged 304 polls, intentional skips, failures, and true zero-yield. `items` counts only changed fetches, so carried-forward unchanged counts never read as new supply.

| source_id | real fetches | unchanged | skips | failures | zero-yield | items |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 259 | 575 | 0 | 16 | 0 | 25561 |
| remotive | 147 | 703 | 0 | 0 | 0 | 2333 |
| ashby:multiplymii | 132 | 0 | 718 | 0 | 0 | 5527 |
| breezy:20four7va | 132 | 0 | 1568 | 0 | 0 | 15878 |
| breezy:remote-craft | 132 | 0 | 718 | 0 | 0 | 1980 |
| breezy:sourcefit | 132 | 0 | 718 | 0 | 0 | 13425 |
| breezy:time-etc | 132 | 0 | 718 | 0 | 0 | 132 |
| breezy:value-virtual-assistants | 132 | 0 | 718 | 0 | 0 | 1320 |
| breezy:yokly | 132 | 0 | 718 | 0 | 0 | 865 |
| greenhouse:canonical | 132 | 0 | 718 | 0 | 0 | 41924 |
| greenhouse:ghost | 132 | 0 | 718 | 0 | 0 | 660 |
| greenhouse:gitlab | 132 | 0 | 718 | 0 | 0 | 32593 |
| greenhouse:grafanalabs | 132 | 0 | 718 | 0 | 0 | 18263 |
| greenhouse:nearform | 132 | 0 | 718 | 0 | 0 | 3034 |
| greenhouse:remotecom | 132 | 0 | 718 | 0 | 132 | 0 |
| real-work-from-anywhere | 132 | 0 | 718 | 0 | 0 | 6600 |
| remote-ok | 85 | 46 | 718 | 1 | 0 | 3785 |
| workable:coconutva | 83 | 0 | 720 | 47 | 0 | 2711 |
| workable:crewbloom | 83 | 0 | 720 | 47 | 0 | 6927 |
| workable:hunt-st | 75 | 0 | 720 | 55 | 0 | 8852 |
| workable:pearltalent | 75 | 0 | 719 | 56 | 0 | 24048 |
| workable:rocketams | 75 | 0 | 720 | 55 | 0 | 584 |
| workable:hello-rache | 74 | 0 | 719 | 57 | 0 | 222 |
| jobicy-supporting-apac | 26 | 101 | 720 | 3 | 0 | 1040 |
| jobicy-admin-support-apac | 3 | 125 | 719 | 3 | 0 | 15 |
| ashby:amplify | 0 | 0 | 850 | 0 | 0 | 0 |
| ashby:ashby | 0 | 0 | 850 | 0 | 0 | 0 |
| ashby:camunda | 0 | 0 | 850 | 0 | 0 | 0 |
| ashby:circulareconomysystems | 0 | 0 | 850 | 0 | 0 | 0 |
| ashby:cubic3 | 0 | 0 | 850 | 0 | 0 | 0 |
| ashby:flipper | 0 | 0 | 850 | 0 | 0 | 0 |
| ashby:foundry-for-good | 0 | 0 | 850 | 0 | 0 | 0 |
| ashby:getground | 0 | 0 | 850 | 0 | 0 | 0 |
| ashby:gradient | 0 | 0 | 850 | 0 | 0 | 0 |
| ashby:luxor | 0 | 0 | 850 | 0 | 0 | 0 |
| ashby:molecule | 0 | 0 | 850 | 0 | 0 | 0 |
| ashby:payscale | 0 | 0 | 850 | 0 | 0 | 0 |
| ashby:railway | 0 | 0 | 850 | 0 | 0 | 0 |
| ashby:scalemath | 0 | 0 | 850 | 0 | 0 | 0 |
| ashby:supabase | 0 | 0 | 850 | 0 | 0 | 0 |
| ashby:the-studio | 0 | 0 | 850 | 0 | 0 | 0 |
| ashby:tremendous | 0 | 0 | 850 | 0 | 0 | 0 |
| ashby:trust-wallet | 0 | 0 | 850 | 0 | 0 | 0 |
| ashby:whippy | 0 | 0 | 850 | 0 | 0 | 0 |
| authentic-jobs | 0 | 0 | 850 | 0 | 0 | 0 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 850 | 0 | 0 | 0 |
| dribbble | 0 | 0 | 850 | 0 | 0 | 0 |
| jobspresso | 0 | 0 | 850 | 0 | 0 | 0 |
| lever:applydigital | 0 | 0 | 850 | 0 | 0 | 0 |
| lever:audinate | 0 | 0 | 850 | 0 | 0 | 0 |
| lever:beaverprocess | 0 | 0 | 850 | 0 | 0 | 0 |
| lever:brafton | 0 | 0 | 850 | 0 | 0 | 0 |
| lever:brevo | 0 | 0 | 850 | 0 | 0 | 0 |
| lever:decilegroup | 0 | 0 | 850 | 0 | 0 | 0 |
| lever:deliverect | 0 | 0 | 850 | 0 | 0 | 0 |
| lever:gushwork | 0 | 0 | 850 | 0 | 0 | 0 |
| lever:jetsupport | 0 | 0 | 850 | 0 | 0 | 0 |
| lever:lwolf | 0 | 0 | 850 | 0 | 0 | 0 |
| lever:nibiru | 0 | 0 | 850 | 0 | 0 | 0 |
| lever:outsourcedstaff | 0 | 0 | 850 | 0 | 0 | 0 |
| lever:parcelvision | 0 | 0 | 850 | 0 | 0 | 0 |
| lever:piccollage | 0 | 0 | 850 | 0 | 0 | 0 |
| lever:repurposeglobal | 0 | 0 | 850 | 0 | 0 | 0 |
| lever:snappr | 0 | 0 | 850 | 0 | 0 | 0 |
| lever:tenna | 0 | 0 | 850 | 0 | 0 | 0 |
| lever:truezerotech | 0 | 0 | 850 | 0 | 0 | 0 |
| lever:vacancies | 0 | 0 | 850 | 0 | 0 | 0 |
| lever:vaultoutsourcing | 0 | 0 | 850 | 0 | 0 | 0 |
| lever:willowinc | 0 | 0 | 850 | 0 | 0 | 0 |
| onlinejobs-ph | 0 | 0 | 850 | 0 | 0 | 0 |
| problogger | 0 | 0 | 850 | 0 | 0 | 0 |
| remote-co | 0 | 0 | 850 | 0 | 0 | 0 |
| workable:connectos | 0 | 0 | 850 | 0 | 0 | 0 |
| workable:global-strategic | 0 | 0 | 850 | 0 | 0 | 0 |
| workable:myoutdesk | 0 | 0 | 850 | 0 | 0 | 0 |
| workable:outsource-access | 0 | 0 | 850 | 0 | 0 | 0 |
| workable:pineapple-staffing | 0 | 0 | 850 | 0 | 0 | 0 |
| workable:staff-domain-inc | 0 | 0 | 850 | 0 | 0 | 0 |
| workable:superstaff | 0 | 0 | 850 | 0 | 0 | 0 |
| workable:virtualstaff365 | 0 | 0 | 850 | 0 | 0 | 0 |

## Geo & eligibility triage outcomes (last 7 days)

Breakdown of stored opportunities by Philippines eligibility verdict.

| source_id | eligible | unclear | ineligible | policy_rejected | total | qualified_rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 575 | 0 | 254 | 254 | 829 | 69.4% |
| remote-ok | 24 | 4 | 171 | 175 | 199 | 12.1% |
| real-work-from-anywhere | 26 | 3 | 0 | 3 | 29 | 89.7% |
| greenhouse:gitlab | 0 | 1 | 25 | 26 | 26 | 0.0% |
| workable:hunt-st | 19 | 0 | 0 | 0 | 19 | 100.0% |
| breezy:20four7va | 17 | 0 | 1 | 1 | 18 | 94.4% |
| breezy:sourcefit | 12 | 0 | 5 | 5 | 17 | 70.6% |
| greenhouse:grafanalabs | 0 | 0 | 16 | 16 | 16 | 0.0% |
| jobicy-supporting-apac | 4 | 0 | 10 | 10 | 14 | 28.6% |
| workable:pearltalent | 5 | 0 | 8 | 8 | 13 | 38.5% |
| workable:crewbloom | 5 | 0 | 2 | 2 | 7 | 71.4% |
| breezy:yokly | 4 | 0 | 0 | 0 | 4 | 100.0% |
| remotive | 0 | 0 | 4 | 4 | 4 | 0.0% |
| workable:coconutva | 4 | 0 | 0 | 0 | 4 | 100.0% |
| ashby:multiplymii | 2 | 0 | 0 | 0 | 2 | 100.0% |
| greenhouse:canonical | 0 | 0 | 2 | 2 | 2 | 0.0% |
| greenhouse:nearform | 0 | 0 | 2 | 2 | 2 | 0.0% |

## Yield efficiency (last 7 days)

Stored eligibility per real (changed) fetch and per 100 items seen; not marginal verified first-publication yield.
UNKNOWN means a count is missing/invalid or its denominator is zero. Fetch and stored cohorts may differ across intake paths; these descriptive ratios do not establish source productivity or causal yield.

| source_id | real fetches | items seen | eligible stored | yield / fetch | yield / 100 items |
| --- | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 259 | 25561 | 575 | 2.22 | 2.25 |
| remotive | 147 | 2333 | 0 | 0.00 | 0.00 |
| ashby:multiplymii | 132 | 5527 | 2 | 0.02 | 0.04 |
| breezy:20four7va | 132 | 15878 | 17 | 0.13 | 0.11 |
| breezy:remote-craft | 132 | 1980 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:sourcefit | 132 | 13425 | 12 | 0.09 | 0.09 |
| breezy:time-etc | 132 | 132 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:value-virtual-assistants | 132 | 1320 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:yokly | 132 | 865 | 4 | 0.03 | 0.46 |
| greenhouse:canonical | 132 | 41924 | 0 | 0.00 | 0.00 |
| greenhouse:ghost | 132 | 660 | UNKNOWN | UNKNOWN | UNKNOWN |
| greenhouse:gitlab | 132 | 32593 | 0 | 0.00 | 0.00 |
| greenhouse:grafanalabs | 132 | 18263 | 0 | 0.00 | 0.00 |
| greenhouse:nearform | 132 | 3034 | 0 | 0.00 | 0.00 |
| greenhouse:remotecom | 132 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| real-work-from-anywhere | 132 | 6600 | 26 | 0.20 | 0.39 |
| remote-ok | 85 | 3785 | 24 | 0.28 | 0.63 |
| workable:coconutva | 83 | 2711 | 4 | 0.05 | 0.15 |
| workable:crewbloom | 83 | 6927 | 5 | 0.06 | 0.07 |
| workable:hunt-st | 75 | 8852 | 19 | 0.25 | 0.21 |
| workable:pearltalent | 75 | 24048 | 5 | 0.07 | 0.02 |
| workable:rocketams | 75 | 584 | UNKNOWN | UNKNOWN | UNKNOWN |
| workable:hello-rache | 74 | 222 | UNKNOWN | UNKNOWN | UNKNOWN |
| jobicy-supporting-apac | 26 | 1040 | 4 | 0.15 | 0.38 |
| jobicy-admin-support-apac | 3 | 15 | UNKNOWN | UNKNOWN | UNKNOWN |
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
