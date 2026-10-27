# Source economics — latest (SP-02)

- **As of:** 2026-10-27T08:18:08.315Z
- **Windows:** 7d/14d/30d net-new by `scraped_at`
- **Reconciliation:** OK (every partition delta is zero)
- Read-only report; regenerate with `scripts/diagnostics/source-economics.ts`.

## Qualified supply (strict eligibility; first-stored proxy)

Excludes unclear/ineligible rows. Historical publication and later deactivation are not fully reconstructed.

| qualified active | qualified new 7d | per day (7d) | qualified new 30d | per day (30d) |
| ---: | ---: | ---: | ---: | ---: |
| 1823 | 355 | 50.71 | 1192 | 39.73 |

## Identity coverage (SP-01)

| total | with source_id | null source_id | coverage | active null-id |
| ---: | ---: | ---: | ---: | ---: |
| 8171 | 8171 | 0 | 100.0% | 0 |

## Net-new accepted supply

| active | net-new 7d | net-new 14d | net-new 30d |
| ---: | ---: | ---: | ---: |
| 1823 | 355 | 656 | 1192 |

## Provider-family concentration (ADR-006 §7)

- **Net-new 30d:** top family `we-work-remotely` 41.0% ⚠️ >40%; top-3 64.9%.
- **Active:** top family `we-work-remotely` 31.3%; top-3 58.5%.
- `(unknown)` legacy rows are excluded from these shares.

| provider family | active | net-new 30d | net-new 7d | source ids |
| --- | ---: | ---: | ---: | --- |
| we-work-remotely | 571 | 489 | 112 | we-work-remotely |
| breezy | 326 | 112 | 40 | breezy:20four7va, breezy:sourcefit, breezy:yokly, breezy:remote-craft, breezy:value-virtual-assistants, breezy:time-etc |
| workable | 169 | 140 | 67 | workable:hunt-st, workable:coconutva, workable:crewbloom, workable:pearltalent, workable:rocketams, workable:hello-rache, workable:pineapple-staffing |
| ashby | 164 | 111 | 34 | ashby:multiplymii, ashby:foundry-for-good, ashby:trust-wallet, ashby:railway, ashby:gradient, ashby:payscale, ashby:circulareconomysystems, ashby:molecule, ashby:scalemath, ashby:the-studio, ashby:whippy, ashby:cubic3, ashby:flipper, ashby:getground, ashby:luxor, ashby:finch, ashby:flutterflow, ashby:homera-health, ashby:amplify, ashby:ashby, ashby:camunda, ashby:supabase, ashby:tremendous |
| greenhouse | 164 | 28 | 17 | greenhouse:canonical, greenhouse:solarwinds, greenhouse:remotecom, greenhouse:gitlab, greenhouse:janes, greenhouse:ghost, greenhouse:trainingthestreet, greenhouse:trinityparktalent, greenhouse:grafanalabs, greenhouse:nearform |
| real-work-from-anywhere | 148 | 107 | 31 | real-work-from-anywhere |
| lever | 145 | 145 | 35 | lever:vacancies, lever:truezerotech, lever:snappr, lever:tenna, lever:deliverect, lever:levelup, lever:nibiru, lever:applydigital, lever:brafton, lever:brevo, lever:decilegroup, lever:outsourcedstaff, lever:jetsupport, lever:lwolf, lever:willowinc, lever:gushwork, lever:parcelvision, lever:piccollage, lever:repurposeglobal, lever:audinate, lever:beaverprocess, lever:90seconds, lever:alltrails, lever:hso, lever:trustarc |
| jobicy | 63 | 19 | 8 | jobicy-supporting-apac, jobicy-admin-support-apac |
| remote-ok | 58 | 36 | 9 | remote-ok |
| remotive | 15 | 5 | 2 | remotive |
| authentic-jobs | 0 | 0 | 0 | authentic-jobs |
| dribbble | 0 | 0 | 0 | dribbble |
| himalayas | 0 | 0 | 0 | himalayas:remote-jobs |

## Supply by exact source_id

| source_id | platform | active | net-new 7d | net-new 30d | inactive |
| --- | --- | ---: | ---: | ---: | ---: |
| we-work-remotely | WeWorkRemotely | 571 | 112 | 489 | 1425 |
| breezy:20four7va | 20Four7VA | 158 | 11 | 52 | 129 |
| real-work-from-anywhere | RealWorkFromAnywhere | 148 | 31 | 107 | 563 |
| breezy:sourcefit | Breezy/sourcefit | 128 | 25 | 54 | 153 |
| workable:hunt-st | Hunt St | 126 | 45 | 104 | 129 |
| greenhouse:canonical | Canonical | 123 | 0 | 2 | 197 |
| ashby:multiplymii | Ashby/multiplymii | 83 | 4 | 30 | 0 |
| jobicy-supporting-apac | Jobicy | 58 | 8 | 17 | 108 |
| remote-ok | RemoteOK | 58 | 9 | 36 | 1220 |
| ashby:foundry-for-good | Ashby/foundry-for-good | 27 | 0 | 27 | 0 |
| lever:vacancies | Lever/vacancies | 20 | 0 | 20 | 0 |
| workable:coconutva | Coconut VA | 18 | 10 | 14 | 54 |
| workable:crewbloom | CrewBloom | 18 | 7 | 16 | 67 |
| lever:truezerotech | Lever/truezerotech | 17 | 0 | 17 | 0 |
| breezy:yokly | Yokly | 16 | 4 | 5 | 0 |
| greenhouse:solarwinds | Greenhouse/solarwinds | 16 | 16 | 16 | 0 |
| remotive | Remotive | 15 | 2 | 5 | 91 |
| breezy:remote-craft | Remote Craft | 14 | 0 | 0 | 1 |
| greenhouse:remotecom | Remote.com | 14 | 0 | 0 | 608 |
| ashby:trust-wallet | Ashby/trust-wallet | 13 | 13 | 13 | 0 |
| lever:snappr | Lever/snappr | 13 | 0 | 13 | 0 |
| lever:tenna | Lever/tenna | 11 | 0 | 11 | 0 |
| breezy:value-virtual-assistants | VALUE Virtual Assistants | 10 | 0 | 1 | 1 |
| lever:deliverect | Lever/deliverect | 9 | 0 | 9 | 0 |
| lever:levelup | Lever/levelup | 9 | 9 | 9 | 0 |
| lever:nibiru | Lever/nibiru | 8 | 8 | 8 | 0 |
| ashby:railway | Ashby/railway | 6 | 6 | 6 | 0 |
| greenhouse:gitlab | GitLab | 6 | 0 | 6 | 580 |
| lever:applydigital | Lever/applydigital | 6 | 0 | 6 | 0 |
| workable:pearltalent | Pearl Talent | 6 | 5 | 5 | 58 |
| ashby:gradient | Ashby/gradient | 5 | 0 | 5 | 0 |
| jobicy-admin-support-apac | Jobicy | 5 | 0 | 2 | 9 |
| lever:brafton | Lever/brafton | 5 | 0 | 5 | 0 |
| lever:brevo | Lever/brevo | 5 | 5 | 5 | 0 |
| lever:decilegroup | Lever/decilegroup | 5 | 0 | 5 | 0 |
| lever:outsourcedstaff | Lever/outsourcedstaff | 5 | 0 | 5 | 0 |
| ashby:payscale | Ashby/payscale | 4 | 0 | 4 | 0 |
| lever:jetsupport | Lever/jetsupport | 4 | 4 | 4 | 0 |
| lever:lwolf | Lever/lwolf | 4 | 0 | 4 | 0 |
| lever:willowinc | Lever/willowinc | 4 | 0 | 4 | 0 |
| ashby:circulareconomysystems | Ashby/circulareconomysystems | 3 | 0 | 3 | 0 |
| ashby:molecule | Ashby/molecule | 3 | 0 | 3 | 0 |
| ashby:scalemath | Ashby/scalemath | 3 | 3 | 3 | 0 |
| ashby:the-studio | Ashby/the-studio | 3 | 0 | 3 | 0 |
| ashby:whippy | Ashby/whippy | 3 | 3 | 3 | 0 |
| lever:gushwork | Lever/gushwork | 3 | 0 | 3 | 0 |
| lever:parcelvision | Lever/parcelvision | 3 | 3 | 3 | 0 |
| lever:piccollage | Lever/piccollage | 3 | 3 | 3 | 0 |
| lever:repurposeglobal | Lever/repurposeglobal | 3 | 0 | 3 | 0 |
| ashby:cubic3 | Ashby/cubic3 | 2 | 2 | 2 | 0 |
| ashby:flipper | Ashby/flipper | 2 | 2 | 2 | 0 |
| ashby:getground | Ashby/getground | 2 | 0 | 2 | 0 |
| ashby:luxor | Ashby/luxor | 2 | 0 | 2 | 0 |
| greenhouse:janes | Greenhouse/janes | 2 | 0 | 2 | 0 |
| lever:audinate | Lever/audinate | 2 | 2 | 2 | 0 |
| lever:beaverprocess | Lever/beaverprocess | 2 | 0 | 2 | 0 |
| ashby:finch | Ashby/finch | 1 | 0 | 1 | 0 |
| ashby:flutterflow | Ashby/flutterflow | 1 | 1 | 1 | 0 |
| ashby:homera-health | Ashby/homera-health | 1 | 0 | 1 | 0 |
| greenhouse:ghost | Ghost | 1 | 0 | 0 | 10 |
| greenhouse:trainingthestreet | Greenhouse/trainingthestreet | 1 | 0 | 1 | 0 |
| greenhouse:trinityparktalent | Greenhouse/trinityparktalent | 1 | 1 | 1 | 0 |
| lever:90seconds | Lever/90seconds | 1 | 0 | 1 | 0 |
| lever:alltrails | Lever/alltrails | 1 | 1 | 1 | 0 |
| lever:hso | Lever/hso | 1 | 0 | 1 | 0 |
| lever:trustarc | Lever/trustarc | 1 | 0 | 1 | 0 |
| workable:rocketams | RocketAMS | 1 | 0 | 1 | 9 |
| ashby:amplify | Amplify | 0 | 0 | 0 | 87 |
| ashby:ashby | Ashby | 0 | 0 | 0 | 92 |
| ashby:camunda | Camunda | 0 | 0 | 0 | 67 |
| ashby:supabase | Supabase | 0 | 0 | 0 | 84 |
| ashby:tremendous | Tremendous | 0 | 0 | 0 | 31 |
| authentic-jobs | AuthenticJobs | 0 | 0 | 0 | 10 |
| breezy:time-etc | Time Etc | 0 | 0 | 0 | 2 |
| dribbble | Dribbble | 0 | 0 | 0 | 113 |
| greenhouse:grafanalabs | Grafana Labs | 0 | 0 | 0 | 384 |
| greenhouse:nearform | Nearform | 0 | 0 | 0 | 57 |
| himalayas:remote-jobs | Himalayas | 0 | 0 | 0 | 2 |
| workable:hello-rache | Hello Rache | 0 | 0 | 0 | 4 |
| workable:pineapple-staffing | Pineapple Staffing | 0 | 0 | 0 | 3 |

## Fetch outcomes (last 7 days)

Separates real (changed) fetches from unchanged 304 polls, intentional skips, failures, and true zero-yield. `items` counts only changed fetches, so carried-forward unchanged counts never read as new supply.

| source_id | real fetches | unchanged | skips | failures | zero-yield | items |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 176 | 835 | 0 | 4 | 0 | 16601 |
| remotive | 169 | 846 | 0 | 0 | 0 | 1704 |
| ashby:multiplymii | 153 | 0 | 862 | 0 | 0 | 8692 |
| breezy:20four7va | 153 | 0 | 1877 | 0 | 0 | 18151 |
| breezy:remote-craft | 153 | 0 | 862 | 0 | 0 | 2295 |
| breezy:sourcefit | 153 | 0 | 862 | 0 | 0 | 14845 |
| breezy:time-etc | 153 | 0 | 862 | 0 | 0 | 153 |
| breezy:value-virtual-assistants | 153 | 0 | 862 | 0 | 0 | 1666 |
| breezy:yokly | 153 | 0 | 862 | 0 | 31 | 434 |
| greenhouse:canonical | 153 | 0 | 862 | 0 | 0 | 47787 |
| greenhouse:ghost | 153 | 0 | 862 | 0 | 0 | 682 |
| greenhouse:gitlab | 153 | 0 | 862 | 0 | 0 | 35968 |
| greenhouse:grafanalabs | 153 | 0 | 862 | 0 | 0 | 21509 |
| greenhouse:nearform | 153 | 0 | 862 | 0 | 0 | 3455 |
| real-work-from-anywhere | 153 | 0 | 862 | 0 | 0 | 7650 |
| workable:hello-rache | 106 | 0 | 867 | 42 | 0 | 318 |
| workable:pearltalent | 106 | 0 | 867 | 42 | 0 | 31082 |
| workable:hunt-st | 104 | 0 | 867 | 44 | 0 | 14724 |
| workable:rocketams | 104 | 0 | 867 | 44 | 0 | 1040 |
| workable:coconutva | 103 | 0 | 866 | 46 | 0 | 3305 |
| workable:crewbloom | 103 | 0 | 866 | 46 | 0 | 11411 |
| remote-ok | 27 | 126 | 862 | 0 | 0 | 1165 |
| jobicy-supporting-apac | 24 | 99 | 862 | 30 | 0 | 960 |
| jobicy-admin-support-apac | 3 | 118 | 863 | 31 | 0 | 15 |
| ashby:amplify | 0 | 0 | 1015 | 0 | 0 | 0 |
| ashby:ashby | 0 | 0 | 1015 | 0 | 0 | 0 |
| ashby:camunda | 0 | 0 | 1015 | 0 | 0 | 0 |
| ashby:circulareconomysystems | 0 | 0 | 1015 | 0 | 0 | 0 |
| ashby:cubic3 | 0 | 0 | 386 | 0 | 0 | 0 |
| ashby:flipper | 0 | 0 | 643 | 0 | 0 | 0 |
| ashby:foundry-for-good | 0 | 0 | 1015 | 0 | 0 | 0 |
| ashby:getground | 0 | 0 | 1015 | 0 | 0 | 0 |
| ashby:gradient | 0 | 0 | 1015 | 0 | 0 | 0 |
| ashby:luxor | 0 | 0 | 1015 | 0 | 0 | 0 |
| ashby:molecule | 0 | 0 | 1015 | 0 | 0 | 0 |
| ashby:payscale | 0 | 0 | 1015 | 0 | 0 | 0 |
| ashby:railway | 0 | 0 | 670 | 0 | 0 | 0 |
| ashby:scalemath | 0 | 0 | 268 | 0 | 0 | 0 |
| ashby:supabase | 0 | 0 | 1015 | 0 | 0 | 0 |
| ashby:the-studio | 0 | 0 | 1015 | 0 | 0 | 0 |
| ashby:tremendous | 0 | 0 | 1015 | 0 | 0 | 0 |
| ashby:trust-wallet | 0 | 0 | 309 | 0 | 0 | 0 |
| ashby:whippy | 0 | 0 | 268 | 0 | 0 | 0 |
| authentic-jobs | 0 | 0 | 1015 | 0 | 0 | 0 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 1015 | 0 | 0 | 0 |
| dribbble | 0 | 0 | 1015 | 0 | 0 | 0 |
| greenhouse:remotecom | 0 | 0 | 862 | 153 | 0 | 0 |
| jobspresso | 0 | 0 | 1015 | 0 | 0 | 0 |
| lever:applydigital | 0 | 0 | 1015 | 0 | 0 | 0 |
| lever:audinate | 0 | 0 | 386 | 0 | 0 | 0 |
| lever:beaverprocess | 0 | 0 | 1015 | 0 | 0 | 0 |
| lever:brafton | 0 | 0 | 1015 | 0 | 0 | 0 |
| lever:brevo | 0 | 0 | 357 | 0 | 0 | 0 |
| lever:decilegroup | 0 | 0 | 1015 | 0 | 0 | 0 |
| lever:deliverect | 0 | 0 | 1015 | 0 | 0 | 0 |
| lever:gushwork | 0 | 0 | 1015 | 0 | 0 | 0 |
| lever:jetsupport | 0 | 0 | 268 | 0 | 0 | 0 |
| lever:lwolf | 0 | 0 | 1015 | 0 | 0 | 0 |
| lever:nibiru | 0 | 0 | 309 | 0 | 0 | 0 |
| lever:outsourcedstaff | 0 | 0 | 1015 | 0 | 0 | 0 |
| lever:parcelvision | 0 | 0 | 703 | 0 | 0 | 0 |
| lever:piccollage | 0 | 0 | 109 | 0 | 0 | 0 |
| lever:repurposeglobal | 0 | 0 | 1015 | 0 | 0 | 0 |
| lever:snappr | 0 | 0 | 1015 | 0 | 0 | 0 |
| lever:tenna | 0 | 0 | 1015 | 0 | 0 | 0 |
| lever:truezerotech | 0 | 0 | 1015 | 0 | 0 | 0 |
| lever:vacancies | 0 | 0 | 1015 | 0 | 0 | 0 |
| lever:vaultoutsourcing | 0 | 0 | 1015 | 0 | 0 | 0 |
| lever:willowinc | 0 | 0 | 1015 | 0 | 0 | 0 |
| onlinejobs-ph | 0 | 0 | 1015 | 0 | 0 | 0 |
| problogger | 0 | 0 | 1015 | 0 | 0 | 0 |
| remote-co | 0 | 0 | 1015 | 0 | 0 | 0 |
| workable:connectos | 0 | 0 | 1015 | 0 | 0 | 0 |
| workable:global-strategic | 0 | 0 | 1015 | 0 | 0 | 0 |
| workable:myoutdesk | 0 | 0 | 1015 | 0 | 0 | 0 |
| workable:outsource-access | 0 | 0 | 1015 | 0 | 0 | 0 |
| workable:pineapple-staffing | 0 | 0 | 1015 | 0 | 0 | 0 |
| workable:staff-domain-inc | 0 | 0 | 1015 | 0 | 0 | 0 |
| workable:superstaff | 0 | 0 | 1015 | 0 | 0 | 0 |
| workable:virtualstaff365 | 0 | 0 | 1015 | 0 | 0 | 0 |

## Geo & eligibility triage outcomes (last 7 days)

Breakdown of stored opportunities by Philippines eligibility verdict.

| source_id | eligible | unclear | ineligible | policy_rejected | total | qualified_rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 112 | 1 | 21 | 22 | 134 | 83.6% |
| workable:hunt-st | 45 | 1 | 1 | 1 | 47 | 95.7% |
| real-work-from-anywhere | 31 | 4 | 2 | 6 | 37 | 83.8% |
| workable:crewbloom | 7 | 0 | 27 | 27 | 34 | 20.6% |
| greenhouse:gitlab | 0 | 0 | 27 | 27 | 27 | 0.0% |
| breezy:sourcefit | 25 | 0 | 1 | 2 | 26 | 96.2% |
| greenhouse:grafanalabs | 0 | 0 | 25 | 25 | 25 | 0.0% |
| workable:pearltalent | 5 | 0 | 15 | 15 | 20 | 25.0% |
| jobicy-supporting-apac | 8 | 0 | 10 | 10 | 18 | 44.4% |
| greenhouse:solarwinds | 16 | 0 | 0 | 0 | 16 | 100.0% |
| remote-ok | 9 | 5 | 2 | 6 | 16 | 56.3% |
| ashby:trust-wallet | 13 | 0 | 0 | 0 | 13 | 100.0% |
| breezy:20four7va | 11 | 0 | 0 | 0 | 11 | 100.0% |
| workable:coconutva | 10 | 0 | 0 | 0 | 10 | 100.0% |
| lever:levelup | 9 | 0 | 0 | 0 | 9 | 100.0% |
| greenhouse:canonical | 0 | 0 | 8 | 8 | 8 | 0.0% |
| lever:nibiru | 8 | 0 | 0 | 0 | 8 | 100.0% |
| ashby:railway | 6 | 0 | 0 | 0 | 6 | 100.0% |
| lever:brevo | 5 | 0 | 0 | 0 | 5 | 100.0% |
| ashby:multiplymii | 4 | 0 | 0 | 0 | 4 | 100.0% |
| breezy:yokly | 4 | 0 | 0 | 0 | 4 | 100.0% |
| lever:jetsupport | 4 | 0 | 0 | 0 | 4 | 100.0% |
| ashby:scalemath | 3 | 0 | 0 | 0 | 3 | 100.0% |
| ashby:whippy | 3 | 0 | 0 | 0 | 3 | 100.0% |
| lever:parcelvision | 3 | 0 | 0 | 0 | 3 | 100.0% |
| lever:piccollage | 3 | 0 | 0 | 0 | 3 | 100.0% |
| ashby:cubic3 | 2 | 0 | 0 | 0 | 2 | 100.0% |
| ashby:flipper | 2 | 0 | 0 | 0 | 2 | 100.0% |
| greenhouse:nearform | 0 | 0 | 2 | 2 | 2 | 0.0% |
| lever:audinate | 2 | 0 | 0 | 0 | 2 | 100.0% |
| remotive | 2 | 0 | 0 | 0 | 2 | 100.0% |
| ashby:flutterflow | 1 | 0 | 0 | 0 | 1 | 100.0% |
| greenhouse:trinityparktalent | 1 | 0 | 0 | 0 | 1 | 100.0% |
| lever:alltrails | 1 | 0 | 0 | 0 | 1 | 100.0% |

## Yield efficiency (last 7 days)

Stored eligibility per real (changed) fetch and per 100 items seen; not marginal verified first-publication yield.
UNKNOWN means a count is missing/invalid or its denominator is zero. Fetch and stored cohorts may differ across intake paths; these descriptive ratios do not establish source productivity or causal yield.

| source_id | real fetches | items seen | eligible stored | yield / fetch | yield / 100 items |
| --- | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 176 | 16601 | 112 | 0.64 | 0.67 |
| remotive | 169 | 1704 | 2 | 0.01 | 0.12 |
| ashby:multiplymii | 153 | 8692 | 4 | 0.03 | 0.05 |
| breezy:20four7va | 153 | 18151 | 11 | 0.07 | 0.06 |
| breezy:remote-craft | 153 | 2295 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:sourcefit | 153 | 14845 | 25 | 0.16 | 0.17 |
| breezy:time-etc | 153 | 153 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:value-virtual-assistants | 153 | 1666 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:yokly | 153 | 434 | 4 | 0.03 | 0.92 |
| greenhouse:canonical | 153 | 47787 | 0 | 0.00 | 0.00 |
| greenhouse:ghost | 153 | 682 | UNKNOWN | UNKNOWN | UNKNOWN |
| greenhouse:gitlab | 153 | 35968 | 0 | 0.00 | 0.00 |
| greenhouse:grafanalabs | 153 | 21509 | 0 | 0.00 | 0.00 |
| greenhouse:nearform | 153 | 3455 | 0 | 0.00 | 0.00 |
| real-work-from-anywhere | 153 | 7650 | 31 | 0.20 | 0.41 |
| workable:hello-rache | 106 | 318 | UNKNOWN | UNKNOWN | UNKNOWN |
| workable:pearltalent | 106 | 31082 | 5 | 0.05 | 0.02 |
| workable:hunt-st | 104 | 14724 | 45 | 0.43 | 0.31 |
| workable:rocketams | 104 | 1040 | UNKNOWN | UNKNOWN | UNKNOWN |
| workable:coconutva | 103 | 3305 | 10 | 0.10 | 0.30 |
| workable:crewbloom | 103 | 11411 | 7 | 0.07 | 0.06 |
| remote-ok | 27 | 1165 | 9 | 0.33 | 0.77 |
| jobicy-supporting-apac | 24 | 960 | 8 | 0.33 | 0.83 |
| jobicy-admin-support-apac | 3 | 15 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:amplify | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:ashby | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:camunda | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:circulareconomysystems | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:cubic3 | 0 | 0 | 2 | UNKNOWN | UNKNOWN |
| ashby:flipper | 0 | 0 | 2 | UNKNOWN | UNKNOWN |
| ashby:foundry-for-good | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:getground | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:gradient | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:luxor | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:molecule | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:payscale | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:railway | 0 | 0 | 6 | UNKNOWN | UNKNOWN |
| ashby:scalemath | 0 | 0 | 3 | UNKNOWN | UNKNOWN |
| ashby:supabase | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:the-studio | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:tremendous | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:trust-wallet | 0 | 0 | 13 | UNKNOWN | UNKNOWN |
| ashby:whippy | 0 | 0 | 3 | UNKNOWN | UNKNOWN |
| authentic-jobs | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:vaaphilippines-recruitment | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| dribbble | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| greenhouse:remotecom | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| jobspresso | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:applydigital | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:audinate | 0 | 0 | 2 | UNKNOWN | UNKNOWN |
| lever:beaverprocess | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:brafton | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:brevo | 0 | 0 | 5 | UNKNOWN | UNKNOWN |
| lever:decilegroup | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:deliverect | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:gushwork | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:jetsupport | 0 | 0 | 4 | UNKNOWN | UNKNOWN |
| lever:lwolf | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:nibiru | 0 | 0 | 8 | UNKNOWN | UNKNOWN |
| lever:outsourcedstaff | 0 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| lever:parcelvision | 0 | 0 | 3 | UNKNOWN | UNKNOWN |
| lever:piccollage | 0 | 0 | 3 | UNKNOWN | UNKNOWN |
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
| greenhouse:solarwinds | UNKNOWN | UNKNOWN | 16 | UNKNOWN | UNKNOWN |
| lever:levelup | UNKNOWN | UNKNOWN | 9 | UNKNOWN | UNKNOWN |
| ashby:flutterflow | UNKNOWN | UNKNOWN | 1 | UNKNOWN | UNKNOWN |
| greenhouse:trinityparktalent | UNKNOWN | UNKNOWN | 1 | UNKNOWN | UNKNOWN |
| lever:alltrails | UNKNOWN | UNKNOWN | 1 | UNKNOWN | UNKNOWN |
