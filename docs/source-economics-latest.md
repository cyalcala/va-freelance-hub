# Source economics — latest (SP-02)

- **As of:** 2026-11-01T09:36:31.612Z
- **Windows:** 7d/14d/30d net-new by `scraped_at`
- **Reconciliation:** OK (every partition delta is zero)
- Read-only report; regenerate with `scripts/diagnostics/source-economics.ts`.

## Qualified supply (strict eligibility; first-stored proxy)

Excludes unclear/ineligible rows. Historical publication and later deactivation are not fully reconstructed.

| qualified active | qualified new 7d | per day (7d) | qualified new 30d | per day (30d) |
| ---: | ---: | ---: | ---: | ---: |
| 1806 | 204 | 29.14 | 1164 | 38.80 |

## Identity coverage (SP-01)

| total | with source_id | null source_id | coverage | active null-id |
| ---: | ---: | ---: | ---: | ---: |
| 8397 | 8397 | 0 | 100.0% | 0 |

## Net-new accepted supply

| active | net-new 7d | net-new 14d | net-new 30d |
| ---: | ---: | ---: | ---: |
| 1806 | 204 | 591 | 1164 |

## Provider-family concentration (ADR-006 §7)

- **Net-new 30d:** top family `we-work-remotely` 41.3% ⚠️ >40%; top-3 64.6%.
- **Active:** top family `we-work-remotely` 31.8%; top-3 60.1%.
- `(unknown)` legacy rows are excluded from these shares.

| provider family | active | net-new 30d | net-new 7d | source ids |
| --- | ---: | ---: | ---: | --- |
| we-work-remotely | 574 | 481 | 105 | we-work-remotely |
| breezy | 331 | 105 | 24 | breezy:20four7va, breezy:sourcefit, breezy:yokly, breezy:remote-craft, breezy:value-virtual-assistants, breezy:time-etc |
| workable | 181 | 139 | 35 | workable:hunt-st, workable:crewbloom, workable:coconutva, workable:pearltalent, workable:rocketams, workable:hello-rache, workable:pineapple-staffing |
| ashby | 155 | 106 | 4 | ashby:multiplymii, ashby:foundry-for-good, ashby:trust-wallet, ashby:railway, ashby:gradient, ashby:payscale, ashby:circulareconomysystems, ashby:molecule, ashby:scalemath, ashby:whippy, ashby:cubic3, ashby:flipper, ashby:getground, ashby:luxor, ashby:finch, ashby:flutterflow, ashby:homera-health, ashby:amplify, ashby:ashby, ashby:camunda, ashby:supabase, ashby:the-studio, ashby:tremendous |
| greenhouse | 150 | 27 | 0 | greenhouse:canonical, greenhouse:solarwinds, greenhouse:gitlab, greenhouse:janes, greenhouse:ghost, greenhouse:trainingthestreet, greenhouse:trinityparktalent, greenhouse:grafanalabs, greenhouse:nearform, greenhouse:remotecom |
| real-work-from-anywhere | 148 | 109 | 22 | real-work-from-anywhere |
| lever | 132 | 132 | 3 | lever:vacancies, lever:truezerotech, lever:tenna, lever:deliverect, lever:levelup, lever:nibiru, lever:applydigital, lever:brafton, lever:brevo, lever:decilegroup, lever:outsourcedstaff, lever:jetsupport, lever:lwolf, lever:willowinc, lever:gushwork, lever:parcelvision, lever:piccollage, lever:repurposeglobal, lever:audinate, lever:beaverprocess, lever:90seconds, lever:alltrails, lever:hso, lever:trustarc, lever:snappr |
| jobicy | 60 | 22 | 6 | jobicy-supporting-apac, jobicy-admin-support-apac |
| remote-ok | 60 | 37 | 3 | remote-ok |
| remotive | 15 | 6 | 2 | remotive |
| authentic-jobs | 0 | 0 | 0 | authentic-jobs |
| dribbble | 0 | 0 | 0 | dribbble |
| himalayas | 0 | 0 | 0 | himalayas:remote-jobs |

## Supply by exact source_id

| source_id | platform | active | net-new 7d | net-new 30d | inactive |
| --- | --- | ---: | ---: | ---: | ---: |
| we-work-remotely | WeWorkRemotely | 574 | 105 | 481 | 1527 |
| breezy:20four7va | 20Four7VA | 161 | 14 | 48 | 139 |
| real-work-from-anywhere | RealWorkFromAnywhere | 148 | 22 | 109 | 577 |
| workable:hunt-st | Hunt St | 139 | 26 | 108 | 132 |
| breezy:sourcefit | Breezy/sourcefit | 130 | 9 | 51 | 158 |
| greenhouse:canonical | Canonical | 123 | 0 | 2 | 197 |
| ashby:multiplymii | Ashby/multiplymii | 77 | 3 | 28 | 8 |
| remote-ok | RemoteOK | 60 | 3 | 37 | 1226 |
| jobicy-supporting-apac | Jobicy | 54 | 5 | 19 | 133 |
| ashby:foundry-for-good | Ashby/foundry-for-good | 27 | 0 | 27 | 0 |
| lever:vacancies | Lever/vacancies | 20 | 0 | 20 | 0 |
| workable:crewbloom | CrewBloom | 18 | 7 | 13 | 70 |
| lever:truezerotech | Lever/truezerotech | 17 | 0 | 17 | 0 |
| breezy:yokly | Yokly | 16 | 1 | 5 | 1 |
| greenhouse:solarwinds | Greenhouse/solarwinds | 16 | 0 | 16 | 0 |
| remotive | Remotive | 15 | 2 | 6 | 93 |
| workable:coconutva | Coconut VA | 15 | 0 | 10 | 57 |
| breezy:remote-craft | Remote Craft | 14 | 0 | 0 | 1 |
| ashby:trust-wallet | Ashby/trust-wallet | 13 | 0 | 13 | 0 |
| lever:tenna | Lever/tenna | 11 | 0 | 11 | 0 |
| breezy:value-virtual-assistants | VALUE Virtual Assistants | 10 | 0 | 1 | 1 |
| lever:deliverect | Lever/deliverect | 9 | 0 | 9 | 0 |
| lever:levelup | Lever/levelup | 9 | 0 | 9 | 0 |
| lever:nibiru | Lever/nibiru | 8 | 0 | 8 | 0 |
| workable:pearltalent | Pearl Talent | 8 | 2 | 7 | 59 |
| ashby:railway | Ashby/railway | 6 | 0 | 6 | 0 |
| greenhouse:gitlab | GitLab | 6 | 0 | 5 | 601 |
| jobicy-admin-support-apac | Jobicy | 6 | 1 | 3 | 9 |
| lever:applydigital | Lever/applydigital | 6 | 0 | 6 | 0 |
| ashby:gradient | Ashby/gradient | 5 | 0 | 5 | 0 |
| lever:brafton | Lever/brafton | 5 | 0 | 5 | 0 |
| lever:brevo | Lever/brevo | 5 | 0 | 5 | 0 |
| lever:decilegroup | Lever/decilegroup | 5 | 0 | 5 | 0 |
| lever:outsourcedstaff | Lever/outsourcedstaff | 5 | 0 | 5 | 0 |
| ashby:payscale | Ashby/payscale | 4 | 0 | 4 | 0 |
| lever:jetsupport | Lever/jetsupport | 4 | 0 | 4 | 0 |
| lever:lwolf | Lever/lwolf | 4 | 0 | 4 | 0 |
| lever:willowinc | Lever/willowinc | 4 | 0 | 4 | 0 |
| ashby:circulareconomysystems | Ashby/circulareconomysystems | 3 | 0 | 3 | 0 |
| ashby:molecule | Ashby/molecule | 3 | 0 | 3 | 0 |
| ashby:scalemath | Ashby/scalemath | 3 | 0 | 3 | 0 |
| ashby:whippy | Ashby/whippy | 3 | 0 | 3 | 0 |
| lever:gushwork | Lever/gushwork | 3 | 0 | 3 | 0 |
| lever:parcelvision | Lever/parcelvision | 3 | 0 | 3 | 0 |
| lever:piccollage | Lever/piccollage | 3 | 3 | 3 | 0 |
| lever:repurposeglobal | Lever/repurposeglobal | 3 | 0 | 3 | 0 |
| ashby:cubic3 | Ashby/cubic3 | 2 | 0 | 2 | 0 |
| ashby:flipper | Ashby/flipper | 2 | 0 | 2 | 0 |
| ashby:getground | Ashby/getground | 2 | 0 | 2 | 0 |
| ashby:luxor | Ashby/luxor | 2 | 0 | 2 | 0 |
| greenhouse:janes | Greenhouse/janes | 2 | 0 | 2 | 0 |
| lever:audinate | Lever/audinate | 2 | 0 | 2 | 0 |
| lever:beaverprocess | Lever/beaverprocess | 2 | 0 | 2 | 0 |
| ashby:finch | Ashby/finch | 1 | 0 | 1 | 0 |
| ashby:flutterflow | Ashby/flutterflow | 1 | 1 | 1 | 0 |
| ashby:homera-health | Ashby/homera-health | 1 | 0 | 1 | 0 |
| greenhouse:ghost | Ghost | 1 | 0 | 0 | 11 |
| greenhouse:trainingthestreet | Greenhouse/trainingthestreet | 1 | 0 | 1 | 0 |
| greenhouse:trinityparktalent | Greenhouse/trinityparktalent | 1 | 0 | 1 | 0 |
| lever:90seconds | Lever/90seconds | 1 | 0 | 1 | 0 |
| lever:alltrails | Lever/alltrails | 1 | 0 | 1 | 0 |
| lever:hso | Lever/hso | 1 | 0 | 1 | 0 |
| lever:trustarc | Lever/trustarc | 1 | 0 | 1 | 0 |
| workable:rocketams | RocketAMS | 1 | 0 | 1 | 9 |
| ashby:amplify | Amplify | 0 | 0 | 0 | 87 |
| ashby:ashby | Ashby | 0 | 0 | 0 | 92 |
| ashby:camunda | Camunda | 0 | 0 | 0 | 67 |
| ashby:supabase | Supabase | 0 | 0 | 0 | 84 |
| ashby:the-studio | Ashby/the-studio | 0 | 0 | 0 | 3 |
| ashby:tremendous | Tremendous | 0 | 0 | 0 | 31 |
| authentic-jobs | AuthenticJobs | 0 | 0 | 0 | 10 |
| breezy:time-etc | Time Etc | 0 | 0 | 0 | 2 |
| dribbble | Dribbble | 0 | 0 | 0 | 113 |
| greenhouse:grafanalabs | Grafana Labs | 0 | 0 | 0 | 392 |
| greenhouse:nearform | Nearform | 0 | 0 | 0 | 57 |
| greenhouse:remotecom | Remote.com | 0 | 0 | 0 | 622 |
| himalayas:remote-jobs | Himalayas | 0 | 0 | 0 | 2 |
| lever:snappr | Lever/snappr | 0 | 0 | 0 | 13 |
| workable:hello-rache | Hello Rache | 0 | 0 | 0 | 4 |
| workable:pineapple-staffing | Pineapple Staffing | 0 | 0 | 0 | 3 |

## Fetch outcomes (last 7 days)

Separates real (changed) fetches from unchanged 304 polls, intentional skips, failures, and true zero-yield. `items` counts only changed fetches, so carried-forward unchanged counts never read as new supply.

| source_id | real fetches | unchanged | skips | failures | zero-yield | items |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 175 | 823 | 0 | 3 | 0 | 16841 |
| remotive | 169 | 832 | 0 | 0 | 0 | 1993 |
| real-work-from-anywhere | 153 | 0 | 848 | 0 | 0 | 7650 |
| ashby:multiplymii | 152 | 0 | 849 | 0 | 0 | 7712 |
| breezy:20four7va | 152 | 0 | 1850 | 0 | 0 | 18593 |
| breezy:remote-craft | 152 | 0 | 849 | 0 | 0 | 2280 |
| breezy:sourcefit | 152 | 0 | 849 | 0 | 0 | 15871 |
| breezy:time-etc | 152 | 0 | 849 | 0 | 0 | 152 |
| breezy:value-virtual-assistants | 152 | 0 | 849 | 0 | 0 | 1545 |
| breezy:yokly | 152 | 0 | 849 | 0 | 0 | 608 |
| greenhouse:ghost | 152 | 0 | 849 | 0 | 0 | 686 |
| greenhouse:gitlab | 152 | 0 | 849 | 0 | 0 | 35996 |
| greenhouse:grafanalabs | 152 | 0 | 849 | 0 | 0 | 19930 |
| greenhouse:nearform | 152 | 0 | 849 | 0 | 0 | 3601 |
| greenhouse:canonical | 151 | 0 | 849 | 1 | 0 | 47414 |
| workable:hunt-st | 124 | 0 | 849 | 28 | 0 | 17591 |
| workable:rocketams | 124 | 0 | 849 | 28 | 0 | 1240 |
| workable:hello-rache | 122 | 0 | 850 | 29 | 0 | 366 |
| workable:pearltalent | 122 | 0 | 850 | 29 | 0 | 36767 |
| workable:coconutva | 116 | 0 | 850 | 35 | 0 | 3610 |
| workable:crewbloom | 116 | 0 | 850 | 35 | 0 | 11125 |
| greenhouse:remotecom | 69 | 0 | 849 | 83 | 69 | 0 |
| jobicy-supporting-apac | 27 | 120 | 850 | 4 | 0 | 1080 |
| remote-ok | 19 | 134 | 848 | 0 | 0 | 825 |
| jobicy-admin-support-apac | 4 | 147 | 848 | 2 | 0 | 17 |
| ashby:amplify | 0 | 0 | 1001 | 0 | 0 | 0 |
| ashby:ashby | 0 | 0 | 1001 | 0 | 0 | 0 |
| ashby:camunda | 0 | 0 | 1001 | 0 | 0 | 0 |
| ashby:circulareconomysystems | 0 | 0 | 1001 | 0 | 0 | 0 |
| ashby:cubic3 | 0 | 0 | 1001 | 0 | 0 | 0 |
| ashby:flipper | 0 | 0 | 1001 | 0 | 0 | 0 |
| ashby:foundry-for-good | 0 | 0 | 1001 | 0 | 0 | 0 |
| ashby:getground | 0 | 0 | 1001 | 0 | 0 | 0 |
| ashby:gradient | 0 | 0 | 1001 | 0 | 0 | 0 |
| ashby:luxor | 0 | 0 | 1001 | 0 | 0 | 0 |
| ashby:molecule | 0 | 0 | 1001 | 0 | 0 | 0 |
| ashby:payscale | 0 | 0 | 1001 | 0 | 0 | 0 |
| ashby:railway | 0 | 0 | 1001 | 0 | 0 | 0 |
| ashby:scalemath | 0 | 0 | 991 | 0 | 0 | 0 |
| ashby:supabase | 0 | 0 | 1001 | 0 | 0 | 0 |
| ashby:the-studio | 0 | 0 | 1001 | 0 | 0 | 0 |
| ashby:tremendous | 0 | 0 | 1001 | 0 | 0 | 0 |
| ashby:trust-wallet | 0 | 0 | 1001 | 0 | 0 | 0 |
| ashby:whippy | 0 | 0 | 991 | 0 | 0 | 0 |
| authentic-jobs | 0 | 0 | 1001 | 0 | 0 | 0 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 1001 | 0 | 0 | 0 |
| dribbble | 0 | 0 | 1001 | 0 | 0 | 0 |
| jobspresso | 0 | 0 | 1001 | 0 | 0 | 0 |
| lever:applydigital | 0 | 0 | 1001 | 0 | 0 | 0 |
| lever:audinate | 0 | 0 | 1001 | 0 | 0 | 0 |
| lever:beaverprocess | 0 | 0 | 1001 | 0 | 0 | 0 |
| lever:brafton | 0 | 0 | 1001 | 0 | 0 | 0 |
| lever:brevo | 0 | 0 | 1001 | 0 | 0 | 0 |
| lever:decilegroup | 0 | 0 | 1001 | 0 | 0 | 0 |
| lever:deliverect | 0 | 0 | 1001 | 0 | 0 | 0 |
| lever:gushwork | 0 | 0 | 1001 | 0 | 0 | 0 |
| lever:jetsupport | 0 | 0 | 991 | 0 | 0 | 0 |
| lever:lwolf | 0 | 0 | 1001 | 0 | 0 | 0 |
| lever:nibiru | 0 | 0 | 1001 | 0 | 0 | 0 |
| lever:outsourcedstaff | 0 | 0 | 1001 | 0 | 0 | 0 |
| lever:parcelvision | 0 | 0 | 1001 | 0 | 0 | 0 |
| lever:piccollage | 0 | 0 | 832 | 0 | 0 | 0 |
| lever:repurposeglobal | 0 | 0 | 1001 | 0 | 0 | 0 |
| lever:snappr | 0 | 0 | 1001 | 0 | 0 | 0 |
| lever:tenna | 0 | 0 | 1001 | 0 | 0 | 0 |
| lever:truezerotech | 0 | 0 | 1001 | 0 | 0 | 0 |
| lever:vacancies | 0 | 0 | 1001 | 0 | 0 | 0 |
| lever:vaultoutsourcing | 0 | 0 | 1001 | 0 | 0 | 0 |
| lever:willowinc | 0 | 0 | 1001 | 0 | 0 | 0 |
| onlinejobs-ph | 0 | 0 | 1001 | 0 | 0 | 0 |
| problogger | 0 | 0 | 1001 | 0 | 0 | 0 |
| remote-co | 0 | 0 | 1001 | 0 | 0 | 0 |
| workable:connectos | 0 | 0 | 1001 | 0 | 0 | 0 |
| workable:global-strategic | 0 | 0 | 1001 | 0 | 0 | 0 |
| workable:myoutdesk | 0 | 0 | 1001 | 0 | 0 | 0 |
| workable:outsource-access | 0 | 0 | 1001 | 0 | 0 | 0 |
| workable:pineapple-staffing | 0 | 0 | 1001 | 0 | 0 | 0 |
| workable:staff-domain-inc | 0 | 0 | 1001 | 0 | 0 | 0 |
| workable:superstaff | 0 | 0 | 1001 | 0 | 0 | 0 |
| workable:virtualstaff365 | 0 | 0 | 1001 | 0 | 0 | 0 |

## Geo & eligibility triage outcomes (last 7 days)

Breakdown of stored opportunities by Philippines eligibility verdict.

| source_id | eligible | unclear | ineligible | policy_rejected | total | qualified_rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 105 | 0 | 35 | 35 | 140 | 75.0% |
| jobicy-supporting-apac | 5 | 0 | 22 | 22 | 27 | 18.5% |
| workable:hunt-st | 26 | 0 | 0 | 0 | 26 | 100.0% |
| real-work-from-anywhere | 22 | 0 | 2 | 2 | 24 | 91.7% |
| greenhouse:gitlab | 0 | 0 | 23 | 23 | 23 | 0.0% |
| breezy:20four7va | 14 | 0 | 0 | 0 | 14 | 100.0% |
| breezy:sourcefit | 9 | 0 | 3 | 3 | 12 | 75.0% |
| remote-ok | 3 | 2 | 6 | 8 | 11 | 27.3% |
| greenhouse:grafanalabs | 0 | 0 | 9 | 9 | 9 | 0.0% |
| workable:crewbloom | 7 | 0 | 2 | 2 | 9 | 77.8% |
| ashby:multiplymii | 3 | 0 | 0 | 0 | 3 | 100.0% |
| lever:piccollage | 3 | 0 | 0 | 0 | 3 | 100.0% |
| remotive | 2 | 0 | 1 | 1 | 3 | 66.7% |
| workable:pearltalent | 2 | 0 | 1 | 1 | 3 | 66.7% |
| ashby:flutterflow | 1 | 0 | 0 | 0 | 1 | 100.0% |
| breezy:yokly | 1 | 0 | 0 | 0 | 1 | 100.0% |
| greenhouse:ghost | 0 | 0 | 1 | 1 | 1 | 0.0% |
| jobicy-admin-support-apac | 1 | 0 | 0 | 0 | 1 | 100.0% |

## Yield efficiency (last 7 days)

Stored eligibility per real (changed) fetch and per 100 items seen; not marginal verified first-publication yield.
UNKNOWN means a count is missing/invalid or its denominator is zero. Fetch and stored cohorts may differ across intake paths; these descriptive ratios do not establish source productivity or causal yield.

| source_id | real fetches | items seen | eligible stored | yield / fetch | yield / 100 items |
| --- | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 175 | 16841 | 105 | 0.60 | 0.62 |
| remotive | 169 | 1993 | 2 | 0.01 | 0.10 |
| real-work-from-anywhere | 153 | 7650 | 22 | 0.14 | 0.29 |
| ashby:multiplymii | 152 | 7712 | 3 | 0.02 | 0.04 |
| breezy:20four7va | 152 | 18593 | 14 | 0.09 | 0.08 |
| breezy:remote-craft | 152 | 2280 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:sourcefit | 152 | 15871 | 9 | 0.06 | 0.06 |
| breezy:time-etc | 152 | 152 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:value-virtual-assistants | 152 | 1545 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:yokly | 152 | 608 | 1 | 0.01 | 0.16 |
| greenhouse:ghost | 152 | 686 | 0 | 0.00 | 0.00 |
| greenhouse:gitlab | 152 | 35996 | 0 | 0.00 | 0.00 |
| greenhouse:grafanalabs | 152 | 19930 | 0 | 0.00 | 0.00 |
| greenhouse:nearform | 152 | 3601 | UNKNOWN | UNKNOWN | UNKNOWN |
| greenhouse:canonical | 151 | 47414 | UNKNOWN | UNKNOWN | UNKNOWN |
| workable:hunt-st | 124 | 17591 | 26 | 0.21 | 0.15 |
| workable:rocketams | 124 | 1240 | UNKNOWN | UNKNOWN | UNKNOWN |
| workable:hello-rache | 122 | 366 | UNKNOWN | UNKNOWN | UNKNOWN |
| workable:pearltalent | 122 | 36767 | 2 | 0.02 | 0.01 |
| workable:coconutva | 116 | 3610 | UNKNOWN | UNKNOWN | UNKNOWN |
| workable:crewbloom | 116 | 11125 | 7 | 0.06 | 0.06 |
| greenhouse:remotecom | 69 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| jobicy-supporting-apac | 27 | 1080 | 5 | 0.19 | 0.46 |
| remote-ok | 19 | 825 | 3 | 0.16 | 0.36 |
| jobicy-admin-support-apac | 4 | 17 | 1 | 0.25 | 5.88 |
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
| ashby:flutterflow | UNKNOWN | UNKNOWN | 1 | UNKNOWN | UNKNOWN |
