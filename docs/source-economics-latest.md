# Source economics — latest (SP-02)

- **As of:** 2026-10-26T08:03:23.378Z
- **Windows:** 7d/14d/30d net-new by `scraped_at`
- **Reconciliation:** OK (every partition delta is zero)
- Read-only report; regenerate with `scripts/diagnostics/source-economics.ts`.

## Qualified supply (strict eligibility; first-stored proxy)

Excludes unclear/ineligible rows. Historical publication and later deactivation are not fully reconstructed.

| qualified active | qualified new 7d | per day (7d) | qualified new 30d | per day (30d) |
| ---: | ---: | ---: | ---: | ---: |
| 2017 | 388 | 55.43 | 1576 | 52.53 |

## Identity coverage (SP-01)

| total | with source_id | null source_id | coverage | active null-id |
| ---: | ---: | ---: | ---: | ---: |
| 8118 | 8118 | 0 | 100.0% | 0 |

## Net-new accepted supply

| active | net-new 7d | net-new 14d | net-new 30d |
| ---: | ---: | ---: | ---: |
| 2017 | 388 | 660 | 1576 |

## Provider-family concentration (ADR-006 §7)

- **Net-new 30d:** top family `we-work-remotely` 30.0%; top-3 63.8%.
- **Active:** top family `we-work-remotely` 28.5%; top-3 62.9%.
- `(unknown)` legacy rows are excluded from these shares.

| provider family | active | net-new 30d | net-new 7d | source ids |
| --- | ---: | ---: | ---: | --- |
| we-work-remotely | 575 | 473 | 126 | we-work-remotely |
| workable | 370 | 370 | 63 | workable:hunt-st, workable:coconutva, workable:crewbloom, workable:pearltalent, workable:rocketams, workable:hello-rache, workable:pineapple-staffing |
| breezy | 324 | 110 | 40 | breezy:20four7va, breezy:sourcefit, breezy:yokly, breezy:remote-craft, breezy:value-virtual-assistants, breezy:time-etc |
| greenhouse | 165 | 158 | 17 | greenhouse:canonical, greenhouse:solarwinds, greenhouse:remotecom, greenhouse:gitlab, greenhouse:janes, greenhouse:ghost, greenhouse:trainingthestreet, greenhouse:trinityparktalent, greenhouse:grafanalabs, greenhouse:nearform |
| ashby | 163 | 163 | 35 | ashby:multiplymii, ashby:foundry-for-good, ashby:trust-wallet, ashby:railway, ashby:gradient, ashby:payscale, ashby:circulareconomysystems, ashby:molecule, ashby:scalemath, ashby:the-studio, ashby:whippy, ashby:cubic3, ashby:flipper, ashby:getground, ashby:luxor, ashby:finch, ashby:flutterflow, ashby:homera-health, ashby:amplify, ashby:ashby, ashby:camunda, ashby:supabase, ashby:tremendous |
| lever | 145 | 145 | 59 | lever:vacancies, lever:truezerotech, lever:snappr, lever:tenna, lever:deliverect, lever:levelup, lever:nibiru, lever:applydigital, lever:brafton, lever:brevo, lever:decilegroup, lever:outsourcedstaff, lever:jetsupport, lever:lwolf, lever:willowinc, lever:gushwork, lever:parcelvision, lever:piccollage, lever:repurposeglobal, lever:audinate, lever:beaverprocess, lever:90seconds, lever:alltrails, lever:hso, lever:trustarc |
| real-work-from-anywhere | 140 | 99 | 27 | real-work-from-anywhere |
| jobicy | 62 | 18 | 9 | jobicy-supporting-apac, jobicy-admin-support-apac |
| remote-ok | 59 | 36 | 11 | remote-ok |
| remotive | 14 | 4 | 1 | remotive |
| authentic-jobs | 0 | 0 | 0 | authentic-jobs |
| dribbble | 0 | 0 | 0 | dribbble |
| himalayas | 0 | 0 | 0 | himalayas:remote-jobs |

## Supply by exact source_id

| source_id | platform | active | net-new 7d | net-new 30d | inactive |
| --- | --- | ---: | ---: | ---: | ---: |
| we-work-remotely | WeWorkRemotely | 575 | 126 | 473 | 1401 |
| workable:hunt-st | Hunt St | 246 | 44 | 246 | 5 |
| breezy:20four7va | 20Four7VA | 157 | 11 | 51 | 129 |
| real-work-from-anywhere | RealWorkFromAnywhere | 140 | 27 | 99 | 561 |
| breezy:sourcefit | Breezy/sourcefit | 127 | 25 | 53 | 153 |
| greenhouse:canonical | Canonical | 124 | 0 | 124 | 196 |
| ashby:multiplymii | Ashby/multiplymii | 82 | 5 | 82 | 0 |
| remote-ok | RemoteOK | 59 | 11 | 36 | 1216 |
| jobicy-supporting-apac | Jobicy | 57 | 9 | 16 | 105 |
| workable:coconutva | Coconut VA | 51 | 10 | 51 | 21 |
| workable:crewbloom | CrewBloom | 41 | 4 | 41 | 38 |
| ashby:foundry-for-good | Ashby/foundry-for-good | 27 | 0 | 27 | 0 |
| workable:pearltalent | Pearl Talent | 23 | 5 | 23 | 41 |
| lever:vacancies | Lever/vacancies | 20 | 20 | 20 | 0 |
| lever:truezerotech | Lever/truezerotech | 17 | 0 | 17 | 0 |
| breezy:yokly | Yokly | 16 | 4 | 5 | 0 |
| greenhouse:solarwinds | Greenhouse/solarwinds | 16 | 16 | 16 | 0 |
| breezy:remote-craft | Remote Craft | 14 | 0 | 0 | 1 |
| greenhouse:remotecom | Remote.com | 14 | 0 | 8 | 608 |
| remotive | Remotive | 14 | 1 | 4 | 91 |
| ashby:trust-wallet | Ashby/trust-wallet | 13 | 13 | 13 | 0 |
| lever:snappr | Lever/snappr | 13 | 0 | 13 | 0 |
| lever:tenna | Lever/tenna | 11 | 0 | 11 | 0 |
| breezy:value-virtual-assistants | VALUE Virtual Assistants | 10 | 0 | 1 | 1 |
| lever:deliverect | Lever/deliverect | 9 | 0 | 9 | 0 |
| lever:levelup | Lever/levelup | 9 | 9 | 9 | 0 |
| lever:nibiru | Lever/nibiru | 8 | 8 | 8 | 0 |
| workable:rocketams | RocketAMS | 8 | 0 | 8 | 2 |
| ashby:railway | Ashby/railway | 6 | 6 | 6 | 0 |
| greenhouse:gitlab | GitLab | 6 | 0 | 6 | 578 |
| lever:applydigital | Lever/applydigital | 6 | 0 | 6 | 0 |
| ashby:gradient | Ashby/gradient | 5 | 0 | 5 | 0 |
| jobicy-admin-support-apac | Jobicy | 5 | 0 | 2 | 9 |
| lever:brafton | Lever/brafton | 5 | 0 | 5 | 0 |
| lever:brevo | Lever/brevo | 5 | 5 | 5 | 0 |
| lever:decilegroup | Lever/decilegroup | 5 | 0 | 5 | 0 |
| lever:outsourcedstaff | Lever/outsourcedstaff | 5 | 0 | 5 | 0 |
| ashby:payscale | Ashby/payscale | 4 | 0 | 4 | 0 |
| lever:jetsupport | Lever/jetsupport | 4 | 4 | 4 | 0 |
| lever:lwolf | Lever/lwolf | 4 | 0 | 4 | 0 |
| lever:willowinc | Lever/willowinc | 4 | 4 | 4 | 0 |
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
| workable:hello-rache | Hello Rache | 1 | 0 | 1 | 3 |
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
| workable:pineapple-staffing | Pineapple Staffing | 0 | 0 | 0 | 3 |

## Fetch outcomes (last 7 days)

Separates real (changed) fetches from unchanged 304 polls, intentional skips, failures, and true zero-yield. `items` counts only changed fetches, so carried-forward unchanged counts never read as new supply.

| source_id | real fetches | unchanged | skips | failures | zero-yield | items |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 173 | 844 | 0 | 4 | 0 | 16173 |
| remotive | 169 | 852 | 0 | 0 | 0 | 1701 |
| ashby:multiplymii | 153 | 0 | 868 | 0 | 0 | 8736 |
| breezy:20four7va | 153 | 0 | 1889 | 0 | 0 | 18067 |
| breezy:remote-craft | 153 | 0 | 868 | 0 | 0 | 2295 |
| breezy:sourcefit | 153 | 0 | 868 | 0 | 0 | 14534 |
| breezy:time-etc | 153 | 0 | 868 | 0 | 0 | 153 |
| breezy:value-virtual-assistants | 153 | 0 | 868 | 0 | 0 | 1683 |
| breezy:yokly | 153 | 0 | 868 | 0 | 46 | 423 |
| greenhouse:canonical | 153 | 0 | 868 | 0 | 0 | 47677 |
| greenhouse:ghost | 153 | 0 | 868 | 0 | 0 | 726 |
| greenhouse:gitlab | 153 | 0 | 868 | 0 | 0 | 35747 |
| greenhouse:grafanalabs | 153 | 0 | 868 | 0 | 0 | 21356 |
| greenhouse:nearform | 153 | 0 | 868 | 0 | 0 | 3426 |
| real-work-from-anywhere | 153 | 0 | 868 | 0 | 0 | 7650 |
| workable:hello-rache | 86 | 0 | 894 | 41 | 0 | 258 |
| workable:pearltalent | 86 | 0 | 894 | 41 | 0 | 25162 |
| workable:coconutva | 85 | 0 | 893 | 43 | 0 | 2729 |
| workable:crewbloom | 85 | 0 | 893 | 43 | 0 | 9729 |
| workable:hunt-st | 85 | 0 | 894 | 42 | 0 | 12083 |
| workable:rocketams | 85 | 0 | 894 | 42 | 0 | 850 |
| remote-ok | 29 | 124 | 868 | 0 | 0 | 1246 |
| jobicy-supporting-apac | 25 | 96 | 869 | 31 | 0 | 1000 |
| jobicy-admin-support-apac | 3 | 119 | 868 | 31 | 0 | 15 |
| ashby:amplify | 0 | 0 | 1021 | 0 | 0 | 0 |
| ashby:ashby | 0 | 0 | 1021 | 0 | 0 | 0 |
| ashby:camunda | 0 | 0 | 1021 | 0 | 0 | 0 |
| ashby:circulareconomysystems | 0 | 0 | 1021 | 0 | 0 | 0 |
| ashby:cubic3 | 0 | 0 | 247 | 0 | 0 | 0 |
| ashby:flipper | 0 | 0 | 504 | 0 | 0 | 0 |
| ashby:foundry-for-good | 0 | 0 | 1021 | 0 | 0 | 0 |
| ashby:getground | 0 | 0 | 1021 | 0 | 0 | 0 |
| ashby:gradient | 0 | 0 | 1021 | 0 | 0 | 0 |
| ashby:luxor | 0 | 0 | 1021 | 0 | 0 | 0 |
| ashby:molecule | 0 | 0 | 1021 | 0 | 0 | 0 |
| ashby:payscale | 0 | 0 | 1021 | 0 | 0 | 0 |
| ashby:railway | 0 | 0 | 531 | 0 | 0 | 0 |
| ashby:scalemath | 0 | 0 | 129 | 0 | 0 | 0 |
| ashby:supabase | 0 | 0 | 1021 | 0 | 0 | 0 |
| ashby:the-studio | 0 | 0 | 1021 | 0 | 0 | 0 |
| ashby:tremendous | 0 | 0 | 1021 | 0 | 0 | 0 |
| ashby:trust-wallet | 0 | 0 | 170 | 0 | 0 | 0 |
| ashby:whippy | 0 | 0 | 129 | 0 | 0 | 0 |
| authentic-jobs | 0 | 0 | 1021 | 0 | 0 | 0 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 1021 | 0 | 0 | 0 |
| dribbble | 0 | 0 | 1021 | 0 | 0 | 0 |
| greenhouse:remotecom | 0 | 0 | 868 | 153 | 0 | 0 |
| jobspresso | 0 | 0 | 1021 | 0 | 0 | 0 |
| lever:applydigital | 0 | 0 | 1021 | 0 | 0 | 0 |
| lever:audinate | 0 | 0 | 247 | 0 | 0 | 0 |
| lever:beaverprocess | 0 | 0 | 1021 | 0 | 0 | 0 |
| lever:brafton | 0 | 0 | 1021 | 0 | 0 | 0 |
| lever:brevo | 0 | 0 | 218 | 0 | 0 | 0 |
| lever:decilegroup | 0 | 0 | 1021 | 0 | 0 | 0 |
| lever:deliverect | 0 | 0 | 1021 | 0 | 0 | 0 |
| lever:gushwork | 0 | 0 | 1021 | 0 | 0 | 0 |
| lever:jetsupport | 0 | 0 | 129 | 0 | 0 | 0 |
| lever:lwolf | 0 | 0 | 1021 | 0 | 0 | 0 |
| lever:nibiru | 0 | 0 | 170 | 0 | 0 | 0 |
| lever:outsourcedstaff | 0 | 0 | 1021 | 0 | 0 | 0 |
| lever:parcelvision | 0 | 0 | 564 | 0 | 0 | 0 |
| lever:repurposeglobal | 0 | 0 | 1021 | 0 | 0 | 0 |
| lever:snappr | 0 | 0 | 1021 | 0 | 0 | 0 |
| lever:tenna | 0 | 0 | 1021 | 0 | 0 | 0 |
| lever:truezerotech | 0 | 0 | 1021 | 0 | 0 | 0 |
| lever:vacancies | 0 | 0 | 936 | 0 | 0 | 0 |
| lever:vaultoutsourcing | 0 | 0 | 1021 | 0 | 0 | 0 |
| lever:willowinc | 0 | 0 | 936 | 0 | 0 | 0 |
| onlinejobs-ph | 0 | 0 | 1021 | 0 | 0 | 0 |
| problogger | 0 | 0 | 1021 | 0 | 0 | 0 |
| remote-co | 0 | 0 | 1021 | 0 | 0 | 0 |
| workable:connectos | 0 | 0 | 1021 | 0 | 0 | 0 |
| workable:global-strategic | 0 | 0 | 1021 | 0 | 0 | 0 |
| workable:myoutdesk | 0 | 0 | 1021 | 0 | 0 | 0 |
| workable:outsource-access | 0 | 0 | 1021 | 0 | 0 | 0 |
| workable:pineapple-staffing | 0 | 0 | 1021 | 0 | 0 | 0 |
| workable:staff-domain-inc | 0 | 0 | 1021 | 0 | 0 | 0 |
| workable:superstaff | 0 | 0 | 1021 | 0 | 0 | 0 |
| workable:virtualstaff365 | 0 | 0 | 1021 | 0 | 0 | 0 |

## Geo & eligibility triage outcomes (last 7 days)

Breakdown of stored opportunities by Philippines eligibility verdict.

| source_id | eligible | unclear | ineligible | policy_rejected | total | qualified_rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 126 | 3 | 28 | 29 | 157 | 80.3% |
| workable:hunt-st | 44 | 1 | 1 | 1 | 46 | 95.7% |
| greenhouse:grafanalabs | 0 | 0 | 42 | 42 | 42 | 0.0% |
| real-work-from-anywhere | 27 | 5 | 1 | 6 | 33 | 81.8% |
| greenhouse:gitlab | 0 | 0 | 29 | 29 | 29 | 0.0% |
| workable:crewbloom | 4 | 0 | 25 | 25 | 29 | 13.8% |
| breezy:sourcefit | 25 | 0 | 1 | 3 | 26 | 96.2% |
| lever:vacancies | 20 | 0 | 0 | 0 | 20 | 100.0% |
| workable:pearltalent | 5 | 0 | 15 | 15 | 20 | 25.0% |
| greenhouse:solarwinds | 16 | 0 | 0 | 0 | 16 | 100.0% |
| jobicy-supporting-apac | 9 | 0 | 7 | 7 | 16 | 56.3% |
| remote-ok | 11 | 3 | 1 | 4 | 15 | 73.3% |
| ashby:trust-wallet | 13 | 0 | 0 | 0 | 13 | 100.0% |
| breezy:20four7va | 11 | 0 | 0 | 0 | 11 | 100.0% |
| workable:coconutva | 10 | 0 | 0 | 0 | 10 | 100.0% |
| lever:levelup | 9 | 0 | 0 | 0 | 9 | 100.0% |
| greenhouse:canonical | 0 | 0 | 8 | 8 | 8 | 0.0% |
| lever:nibiru | 8 | 0 | 0 | 0 | 8 | 100.0% |
| ashby:railway | 6 | 0 | 0 | 0 | 6 | 100.0% |
| ashby:multiplymii | 5 | 0 | 0 | 0 | 5 | 100.0% |
| lever:brevo | 5 | 0 | 0 | 0 | 5 | 100.0% |
| breezy:yokly | 4 | 0 | 0 | 0 | 4 | 100.0% |
| lever:jetsupport | 4 | 0 | 0 | 0 | 4 | 100.0% |
| lever:willowinc | 4 | 0 | 0 | 0 | 4 | 100.0% |
| ashby:scalemath | 3 | 0 | 0 | 0 | 3 | 100.0% |
| ashby:whippy | 3 | 0 | 0 | 0 | 3 | 100.0% |
| lever:parcelvision | 3 | 0 | 0 | 0 | 3 | 100.0% |
| lever:piccollage | 3 | 0 | 0 | 0 | 3 | 100.0% |
| ashby:cubic3 | 2 | 0 | 0 | 0 | 2 | 100.0% |
| ashby:flipper | 2 | 0 | 0 | 0 | 2 | 100.0% |
| greenhouse:nearform | 0 | 0 | 2 | 2 | 2 | 0.0% |
| lever:audinate | 2 | 0 | 0 | 0 | 2 | 100.0% |
| ashby:flutterflow | 1 | 0 | 0 | 0 | 1 | 100.0% |
| greenhouse:trinityparktalent | 1 | 0 | 0 | 0 | 1 | 100.0% |
| lever:alltrails | 1 | 0 | 0 | 0 | 1 | 100.0% |
| remotive | 1 | 0 | 0 | 0 | 1 | 100.0% |

## Yield efficiency (last 7 days)

Stored eligibility per real (changed) fetch and per 100 items seen; not marginal verified first-publication yield.
UNKNOWN means a count is missing/invalid or its denominator is zero. Fetch and stored cohorts may differ across intake paths; these descriptive ratios do not establish source productivity or causal yield.

| source_id | real fetches | items seen | eligible stored | yield / fetch | yield / 100 items |
| --- | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 173 | 16173 | 126 | 0.73 | 0.78 |
| remotive | 169 | 1701 | 1 | 0.01 | 0.06 |
| ashby:multiplymii | 153 | 8736 | 5 | 0.03 | 0.06 |
| breezy:20four7va | 153 | 18067 | 11 | 0.07 | 0.06 |
| breezy:remote-craft | 153 | 2295 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:sourcefit | 153 | 14534 | 25 | 0.16 | 0.17 |
| breezy:time-etc | 153 | 153 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:value-virtual-assistants | 153 | 1683 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:yokly | 153 | 423 | 4 | 0.03 | 0.95 |
| greenhouse:canonical | 153 | 47677 | 0 | 0.00 | 0.00 |
| greenhouse:ghost | 153 | 726 | UNKNOWN | UNKNOWN | UNKNOWN |
| greenhouse:gitlab | 153 | 35747 | 0 | 0.00 | 0.00 |
| greenhouse:grafanalabs | 153 | 21356 | 0 | 0.00 | 0.00 |
| greenhouse:nearform | 153 | 3426 | 0 | 0.00 | 0.00 |
| real-work-from-anywhere | 153 | 7650 | 27 | 0.18 | 0.35 |
| workable:hello-rache | 86 | 258 | UNKNOWN | UNKNOWN | UNKNOWN |
| workable:pearltalent | 86 | 25162 | 5 | 0.06 | 0.02 |
| workable:coconutva | 85 | 2729 | 10 | 0.12 | 0.37 |
| workable:crewbloom | 85 | 9729 | 4 | 0.05 | 0.04 |
| workable:hunt-st | 85 | 12083 | 44 | 0.52 | 0.36 |
| workable:rocketams | 85 | 850 | UNKNOWN | UNKNOWN | UNKNOWN |
| remote-ok | 29 | 1246 | 11 | 0.38 | 0.88 |
| jobicy-supporting-apac | 25 | 1000 | 9 | 0.36 | 0.90 |
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
| lever:levelup | UNKNOWN | UNKNOWN | 9 | UNKNOWN | UNKNOWN |
| lever:piccollage | UNKNOWN | UNKNOWN | 3 | UNKNOWN | UNKNOWN |
| ashby:flutterflow | UNKNOWN | UNKNOWN | 1 | UNKNOWN | UNKNOWN |
| greenhouse:trinityparktalent | UNKNOWN | UNKNOWN | 1 | UNKNOWN | UNKNOWN |
| lever:alltrails | UNKNOWN | UNKNOWN | 1 | UNKNOWN | UNKNOWN |
