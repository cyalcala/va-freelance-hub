# Source economics — latest (SP-02)

- **As of:** 2026-11-22T10:09:29.389Z
- **Windows:** 7d/14d/30d net-new by `scraped_at`
- **Reconciliation:** OK (every partition delta is zero)
- Read-only report; regenerate with `scripts/diagnostics/source-economics.ts`.

## Qualified supply (strict eligibility; first-stored proxy)

Excludes unclear/ineligible rows. Historical publication and later deactivation are not fully reconstructed.

| qualified active | qualified new 7d | per day (7d) | qualified new 30d | per day (30d) |
| ---: | ---: | ---: | ---: | ---: |
| 1817 | 446 | 63.71 | 1045 | 34.83 |

## Identity coverage (SP-01)

| total | with source_id | null source_id | coverage | active null-id |
| ---: | ---: | ---: | ---: | ---: |
| 9978 | 9978 | 0 | 100.0% | 0 |

## Net-new accepted supply

| active | net-new 7d | net-new 14d | net-new 30d |
| ---: | ---: | ---: | ---: |
| 1817 | 446 | 606 | 1045 |

## Provider-family concentration (ADR-006 §7)

- **Net-new 30d:** top family `we-work-remotely` 53.9% ⚠️ >40%; top-3 76.3% ⚠️ >70%.
- **Active:** top family `we-work-remotely` 37.6%; top-3 68.9%.
- `(unknown)` legacy rows are excluded from these shares.

| provider family | active | net-new 30d | net-new 7d | source ids |
| --- | ---: | ---: | ---: | --- |
| we-work-remotely | 683 | 563 | 341 | we-work-remotely |
| breezy | 332 | 94 | 13 | breezy:20four7va, breezy:sourcefit, breezy:remote-craft, breezy:value-virtual-assistants, breezy:yokly, breezy:time-etc |
| workable | 237 | 127 | 37 | workable:hunt-st, workable:crewbloom, workable:coconutva, workable:pearltalent, workable:rocketams, workable:hello-rache, workable:pineapple-staffing |
| real-work-from-anywhere | 153 | 107 | 25 | real-work-from-anywhere |
| greenhouse | 130 | 2 | 2 | greenhouse:canonical, greenhouse:gitlab, greenhouse:ghost, greenhouse:grafanalabs, greenhouse:janes, greenhouse:nearform, greenhouse:remotecom, greenhouse:solarwinds, greenhouse:trainingthestreet, greenhouse:trinityparktalent |
| ashby | 96 | 40 | 1 | ashby:multiplymii, ashby:trust-wallet, ashby:scalemath, ashby:whippy, ashby:cubic3, ashby:flutterflow, ashby:amplify, ashby:ashby, ashby:camunda, ashby:circulareconomysystems, ashby:finch, ashby:flipper, ashby:foundry-for-good, ashby:getground, ashby:gradient, ashby:homera-health, ashby:luxor, ashby:molecule, ashby:payscale, ashby:railway, ashby:supabase, ashby:the-studio, ashby:tremendous |
| remote-ok | 76 | 51 | 20 | remote-ok |
| jobicy | 66 | 25 | 7 | jobicy-supporting-apac, jobicy-admin-support-apac |
| lever | 32 | 32 | 0 | lever:levelup, lever:nibiru, lever:brevo, lever:jetsupport, lever:piccollage, lever:audinate, lever:alltrails, lever:90seconds, lever:applydigital, lever:beaverprocess, lever:brafton, lever:decilegroup, lever:deliverect, lever:gushwork, lever:hso, lever:lwolf, lever:outsourcedstaff, lever:parcelvision, lever:repurposeglobal, lever:snappr, lever:tenna, lever:truezerotech, lever:trustarc, lever:vacancies, lever:willowinc |
| remotive | 12 | 4 | 0 | remotive |
| authentic-jobs | 0 | 0 | 0 | authentic-jobs |
| dribbble | 0 | 0 | 0 | dribbble |
| himalayas | 0 | 0 | 0 | himalayas:remote-jobs |

## Supply by exact source_id

| source_id | platform | active | net-new 7d | net-new 30d | inactive |
| --- | --- | ---: | ---: | ---: | ---: |
| we-work-remotely | WeWorkRemotely | 683 | 341 | 563 | 2263 |
| breezy:20four7va | 20Four7VA | 181 | 9 | 63 | 164 |
| workable:hunt-st | Hunt St | 166 | 28 | 83 | 164 |
| real-work-from-anywhere | RealWorkFromAnywhere | 153 | 25 | 107 | 675 |
| greenhouse:canonical | Canonical | 122 | 1 | 1 | 204 |
| breezy:sourcefit | Breezy/sourcefit | 118 | 2 | 27 | 202 |
| remote-ok | RemoteOK | 76 | 20 | 51 | 1389 |
| ashby:multiplymii | Ashby/multiplymii | 74 | 1 | 18 | 26 |
| jobicy-supporting-apac | Jobicy | 59 | 7 | 23 | 175 |
| workable:crewbloom | CrewBloom | 28 | 2 | 21 | 81 |
| workable:coconutva | Coconut VA | 27 | 5 | 14 | 59 |
| workable:pearltalent | Pearl Talent | 15 | 2 | 9 | 74 |
| breezy:remote-craft | Remote Craft | 14 | 0 | 0 | 1 |
| ashby:trust-wallet | Ashby/trust-wallet | 13 | 0 | 13 | 0 |
| remotive | Remotive | 12 | 0 | 4 | 103 |
| breezy:value-virtual-assistants | VALUE Virtual Assistants | 10 | 0 | 0 | 1 |
| breezy:yokly | Yokly | 9 | 2 | 4 | 10 |
| lever:levelup | Lever/levelup | 9 | 0 | 9 | 0 |
| lever:nibiru | Lever/nibiru | 8 | 0 | 8 | 0 |
| greenhouse:gitlab | GitLab | 7 | 1 | 1 | 699 |
| jobicy-admin-support-apac | Jobicy | 7 | 0 | 2 | 9 |
| lever:brevo | Lever/brevo | 5 | 0 | 5 | 0 |
| lever:jetsupport | Lever/jetsupport | 4 | 0 | 4 | 0 |
| ashby:scalemath | Ashby/scalemath | 3 | 0 | 3 | 0 |
| ashby:whippy | Ashby/whippy | 3 | 0 | 3 | 0 |
| lever:piccollage | Lever/piccollage | 3 | 0 | 3 | 0 |
| ashby:cubic3 | Ashby/cubic3 | 2 | 0 | 2 | 0 |
| lever:audinate | Lever/audinate | 2 | 0 | 2 | 0 |
| ashby:flutterflow | Ashby/flutterflow | 1 | 0 | 1 | 0 |
| greenhouse:ghost | Ghost | 1 | 0 | 0 | 11 |
| lever:alltrails | Lever/alltrails | 1 | 0 | 1 | 0 |
| workable:rocketams | RocketAMS | 1 | 0 | 0 | 10 |
| ashby:amplify | Amplify | 0 | 0 | 0 | 87 |
| ashby:ashby | Ashby | 0 | 0 | 0 | 92 |
| ashby:camunda | Camunda | 0 | 0 | 0 | 67 |
| ashby:circulareconomysystems | Ashby/circulareconomysystems | 0 | 0 | 0 | 3 |
| ashby:finch | Ashby/finch | 0 | 0 | 0 | 1 |
| ashby:flipper | Ashby/flipper | 0 | 0 | 0 | 2 |
| ashby:foundry-for-good | Ashby/foundry-for-good | 0 | 0 | 0 | 27 |
| ashby:getground | Ashby/getground | 0 | 0 | 0 | 2 |
| ashby:gradient | Ashby/gradient | 0 | 0 | 0 | 5 |
| ashby:homera-health | Ashby/homera-health | 0 | 0 | 0 | 1 |
| ashby:luxor | Ashby/luxor | 0 | 0 | 0 | 2 |
| ashby:molecule | Ashby/molecule | 0 | 0 | 0 | 3 |
| ashby:payscale | Ashby/payscale | 0 | 0 | 0 | 4 |
| ashby:railway | Ashby/railway | 0 | 0 | 0 | 6 |
| ashby:supabase | Supabase | 0 | 0 | 0 | 84 |
| ashby:the-studio | Ashby/the-studio | 0 | 0 | 0 | 3 |
| ashby:tremendous | Tremendous | 0 | 0 | 0 | 31 |
| authentic-jobs | AuthenticJobs | 0 | 0 | 0 | 10 |
| breezy:time-etc | Time Etc | 0 | 0 | 0 | 2 |
| dribbble | Dribbble | 0 | 0 | 0 | 113 |
| greenhouse:grafanalabs | Grafana Labs | 0 | 0 | 0 | 468 |
| greenhouse:janes | Greenhouse/janes | 0 | 0 | 0 | 2 |
| greenhouse:nearform | Nearform | 0 | 0 | 0 | 64 |
| greenhouse:remotecom | Remote.com | 0 | 0 | 0 | 622 |
| greenhouse:solarwinds | Greenhouse/solarwinds | 0 | 0 | 0 | 16 |
| greenhouse:trainingthestreet | Greenhouse/trainingthestreet | 0 | 0 | 0 | 1 |
| greenhouse:trinityparktalent | Greenhouse/trinityparktalent | 0 | 0 | 0 | 1 |
| himalayas:remote-jobs | Himalayas | 0 | 0 | 0 | 2 |
| lever:90seconds | Lever/90seconds | 0 | 0 | 0 | 1 |
| lever:applydigital | Lever/applydigital | 0 | 0 | 0 | 6 |
| lever:beaverprocess | Lever/beaverprocess | 0 | 0 | 0 | 2 |
| lever:brafton | Lever/brafton | 0 | 0 | 0 | 5 |
| lever:decilegroup | Lever/decilegroup | 0 | 0 | 0 | 5 |
| lever:deliverect | Lever/deliverect | 0 | 0 | 0 | 9 |
| lever:gushwork | Lever/gushwork | 0 | 0 | 0 | 3 |
| lever:hso | Lever/hso | 0 | 0 | 0 | 1 |
| lever:lwolf | Lever/lwolf | 0 | 0 | 0 | 4 |
| lever:outsourcedstaff | Lever/outsourcedstaff | 0 | 0 | 0 | 5 |
| lever:parcelvision | Lever/parcelvision | 0 | 0 | 0 | 3 |
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
| we-work-remotely | 214 | 686 | 0 | 16 | 0 | 20827 |
| remotive | 160 | 756 | 0 | 0 | 0 | 2596 |
| real-work-from-anywhere | 144 | 0 | 772 | 0 | 0 | 7200 |
| breezy:20four7va | 142 | 0 | 1690 | 0 | 0 | 17070 |
| breezy:remote-craft | 142 | 0 | 774 | 0 | 0 | 2130 |
| breezy:sourcefit | 142 | 0 | 774 | 0 | 0 | 14533 |
| breezy:time-etc | 142 | 0 | 774 | 0 | 0 | 142 |
| breezy:value-virtual-assistants | 142 | 0 | 774 | 0 | 0 | 1420 |
| breezy:yokly | 142 | 0 | 774 | 0 | 0 | 708 |
| greenhouse:canonical | 142 | 0 | 774 | 0 | 0 | 44985 |
| greenhouse:ghost | 142 | 0 | 774 | 0 | 0 | 710 |
| greenhouse:gitlab | 142 | 0 | 774 | 0 | 0 | 35483 |
| greenhouse:grafanalabs | 142 | 0 | 774 | 0 | 0 | 19553 |
| greenhouse:nearform | 142 | 0 | 774 | 0 | 0 | 3405 |
| greenhouse:remotecom | 142 | 0 | 774 | 0 | 142 | 0 |
| ashby:multiplymii | 141 | 0 | 774 | 1 | 0 | 6383 |
| workable:pearltalent | 84 | 0 | 777 | 55 | 0 | 24884 |
| workable:hello-rache | 83 | 0 | 777 | 56 | 0 | 249 |
| workable:coconutva | 78 | 0 | 776 | 62 | 0 | 2523 |
| workable:crewbloom | 78 | 0 | 776 | 62 | 0 | 6657 |
| workable:hunt-st | 76 | 0 | 777 | 63 | 0 | 9447 |
| workable:rocketams | 76 | 0 | 777 | 63 | 0 | 612 |
| remote-ok | 64 | 80 | 772 | 0 | 0 | 2840 |
| jobicy-supporting-apac | 33 | 105 | 775 | 3 | 0 | 1320 |
| jobicy-admin-support-apac | 3 | 136 | 775 | 2 | 0 | 14 |
| ashby:amplify | 0 | 0 | 916 | 0 | 0 | 0 |
| ashby:ashby | 0 | 0 | 916 | 0 | 0 | 0 |
| ashby:camunda | 0 | 0 | 916 | 0 | 0 | 0 |
| ashby:circulareconomysystems | 0 | 0 | 916 | 0 | 0 | 0 |
| ashby:cubic3 | 0 | 0 | 916 | 0 | 0 | 0 |
| ashby:flipper | 0 | 0 | 916 | 0 | 0 | 0 |
| ashby:foundry-for-good | 0 | 0 | 916 | 0 | 0 | 0 |
| ashby:getground | 0 | 0 | 916 | 0 | 0 | 0 |
| ashby:gradient | 0 | 0 | 916 | 0 | 0 | 0 |
| ashby:luxor | 0 | 0 | 916 | 0 | 0 | 0 |
| ashby:molecule | 0 | 0 | 916 | 0 | 0 | 0 |
| ashby:payscale | 0 | 0 | 916 | 0 | 0 | 0 |
| ashby:railway | 0 | 0 | 916 | 0 | 0 | 0 |
| ashby:scalemath | 0 | 0 | 916 | 0 | 0 | 0 |
| ashby:supabase | 0 | 0 | 916 | 0 | 0 | 0 |
| ashby:the-studio | 0 | 0 | 916 | 0 | 0 | 0 |
| ashby:tremendous | 0 | 0 | 916 | 0 | 0 | 0 |
| ashby:trust-wallet | 0 | 0 | 916 | 0 | 0 | 0 |
| ashby:whippy | 0 | 0 | 916 | 0 | 0 | 0 |
| authentic-jobs | 0 | 0 | 916 | 0 | 0 | 0 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 916 | 0 | 0 | 0 |
| dribbble | 0 | 0 | 916 | 0 | 0 | 0 |
| jobspresso | 0 | 0 | 916 | 0 | 0 | 0 |
| lever:applydigital | 0 | 0 | 916 | 0 | 0 | 0 |
| lever:audinate | 0 | 0 | 916 | 0 | 0 | 0 |
| lever:beaverprocess | 0 | 0 | 916 | 0 | 0 | 0 |
| lever:brafton | 0 | 0 | 916 | 0 | 0 | 0 |
| lever:brevo | 0 | 0 | 916 | 0 | 0 | 0 |
| lever:decilegroup | 0 | 0 | 916 | 0 | 0 | 0 |
| lever:deliverect | 0 | 0 | 916 | 0 | 0 | 0 |
| lever:gushwork | 0 | 0 | 916 | 0 | 0 | 0 |
| lever:jetsupport | 0 | 0 | 916 | 0 | 0 | 0 |
| lever:lwolf | 0 | 0 | 916 | 0 | 0 | 0 |
| lever:nibiru | 0 | 0 | 916 | 0 | 0 | 0 |
| lever:outsourcedstaff | 0 | 0 | 916 | 0 | 0 | 0 |
| lever:parcelvision | 0 | 0 | 916 | 0 | 0 | 0 |
| lever:piccollage | 0 | 0 | 916 | 0 | 0 | 0 |
| lever:repurposeglobal | 0 | 0 | 916 | 0 | 0 | 0 |
| lever:snappr | 0 | 0 | 916 | 0 | 0 | 0 |
| lever:tenna | 0 | 0 | 916 | 0 | 0 | 0 |
| lever:truezerotech | 0 | 0 | 916 | 0 | 0 | 0 |
| lever:vacancies | 0 | 0 | 916 | 0 | 0 | 0 |
| lever:vaultoutsourcing | 0 | 0 | 916 | 0 | 0 | 0 |
| lever:willowinc | 0 | 0 | 916 | 0 | 0 | 0 |
| onlinejobs-ph | 0 | 0 | 916 | 0 | 0 | 0 |
| problogger | 0 | 0 | 916 | 0 | 0 | 0 |
| remote-co | 0 | 0 | 916 | 0 | 0 | 0 |
| workable:connectos | 0 | 0 | 916 | 0 | 0 | 0 |
| workable:global-strategic | 0 | 0 | 916 | 0 | 0 | 0 |
| workable:myoutdesk | 0 | 0 | 916 | 0 | 0 | 0 |
| workable:outsource-access | 0 | 0 | 916 | 0 | 0 | 0 |
| workable:pineapple-staffing | 0 | 0 | 916 | 0 | 0 | 0 |
| workable:staff-domain-inc | 0 | 0 | 916 | 0 | 0 | 0 |
| workable:superstaff | 0 | 0 | 916 | 0 | 0 | 0 |
| workable:virtualstaff365 | 0 | 0 | 916 | 0 | 0 | 0 |

## Geo & eligibility triage outcomes (last 7 days)

Breakdown of stored opportunities by Philippines eligibility verdict.

| source_id | eligible | unclear | ineligible | policy_rejected | total | qualified_rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 341 | 2 | 202 | 204 | 545 | 62.6% |
| remote-ok | 20 | 5 | 113 | 118 | 138 | 14.5% |
| greenhouse:gitlab | 1 | 0 | 35 | 35 | 36 | 2.8% |
| real-work-from-anywhere | 26 | 3 | 1 | 4 | 30 | 86.7% |
| workable:hunt-st | 28 | 0 | 1 | 1 | 29 | 96.6% |
| greenhouse:grafanalabs | 0 | 0 | 21 | 21 | 21 | 0.0% |
| jobicy-supporting-apac | 7 | 0 | 10 | 10 | 17 | 41.2% |
| workable:pearltalent | 2 | 0 | 10 | 10 | 12 | 16.7% |
| breezy:20four7va | 9 | 0 | 0 | 0 | 9 | 100.0% |
| workable:coconutva | 5 | 0 | 0 | 0 | 5 | 100.0% |
| breezy:sourcefit | 2 | 0 | 2 | 2 | 4 | 50.0% |
| greenhouse:canonical | 1 | 0 | 3 | 3 | 4 | 25.0% |
| breezy:yokly | 2 | 0 | 0 | 0 | 2 | 100.0% |
| workable:crewbloom | 2 | 0 | 0 | 0 | 2 | 100.0% |
| ashby:multiplymii | 1 | 0 | 0 | 0 | 1 | 100.0% |
| remotive | 0 | 0 | 1 | 1 | 1 | 0.0% |

## Yield efficiency (last 7 days)

Stored eligibility per real (changed) fetch and per 100 items seen; not marginal verified first-publication yield.
UNKNOWN means a count is missing/invalid or its denominator is zero. Fetch and stored cohorts may differ across intake paths; these descriptive ratios do not establish source productivity or causal yield.

| source_id | real fetches | items seen | eligible stored | yield / fetch | yield / 100 items |
| --- | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 214 | 20827 | 341 | 1.59 | 1.64 |
| remotive | 160 | 2596 | 0 | 0.00 | 0.00 |
| real-work-from-anywhere | 144 | 7200 | 26 | 0.18 | 0.36 |
| breezy:20four7va | 142 | 17070 | 9 | 0.06 | 0.05 |
| breezy:remote-craft | 142 | 2130 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:sourcefit | 142 | 14533 | 2 | 0.01 | 0.01 |
| breezy:time-etc | 142 | 142 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:value-virtual-assistants | 142 | 1420 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:yokly | 142 | 708 | 2 | 0.01 | 0.28 |
| greenhouse:canonical | 142 | 44985 | 1 | 0.01 | 0.00 |
| greenhouse:ghost | 142 | 710 | UNKNOWN | UNKNOWN | UNKNOWN |
| greenhouse:gitlab | 142 | 35483 | 1 | 0.01 | 0.00 |
| greenhouse:grafanalabs | 142 | 19553 | 0 | 0.00 | 0.00 |
| greenhouse:nearform | 142 | 3405 | UNKNOWN | UNKNOWN | UNKNOWN |
| greenhouse:remotecom | 142 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:multiplymii | 141 | 6383 | 1 | 0.01 | 0.02 |
| workable:pearltalent | 84 | 24884 | 2 | 0.02 | 0.01 |
| workable:hello-rache | 83 | 249 | UNKNOWN | UNKNOWN | UNKNOWN |
| workable:coconutva | 78 | 2523 | 5 | 0.06 | 0.20 |
| workable:crewbloom | 78 | 6657 | 2 | 0.03 | 0.03 |
| workable:hunt-st | 76 | 9447 | 28 | 0.37 | 0.30 |
| workable:rocketams | 76 | 612 | UNKNOWN | UNKNOWN | UNKNOWN |
| remote-ok | 64 | 2840 | 20 | 0.31 | 0.70 |
| jobicy-supporting-apac | 33 | 1320 | 7 | 0.21 | 0.53 |
| jobicy-admin-support-apac | 3 | 14 | UNKNOWN | UNKNOWN | UNKNOWN |
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
