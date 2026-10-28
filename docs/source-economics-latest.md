# Source economics — latest (SP-02)

- **As of:** 2026-10-28T08:55:03.585Z
- **Windows:** 7d/14d/30d net-new by `scraped_at`
- **Reconciliation:** OK (every partition delta is zero)
- Read-only report; regenerate with `scripts/diagnostics/source-economics.ts`.

## Qualified supply (strict eligibility; first-stored proxy)

Excludes unclear/ineligible rows. Historical publication and later deactivation are not fully reconstructed.

| qualified active | qualified new 7d | per day (7d) | qualified new 30d | per day (30d) |
| ---: | ---: | ---: | ---: | ---: |
| 1837 | 316 | 45.14 | 1209 | 40.30 |

## Identity coverage (SP-01)

| total | with source_id | null source_id | coverage | active null-id |
| ---: | ---: | ---: | ---: | ---: |
| 8216 | 8216 | 0 | 100.0% | 0 |

## Net-new accepted supply

| active | net-new 7d | net-new 14d | net-new 30d |
| ---: | ---: | ---: | ---: |
| 1837 | 316 | 645 | 1209 |

## Provider-family concentration (ADR-006 §7)

- **Net-new 30d:** top family `we-work-remotely` 41.0% ⚠️ >40%; top-3 65.1%.
- **Active:** top family `we-work-remotely` 31.4%; top-3 58.8%.
- `(unknown)` legacy rows are excluded from these shares.

| provider family | active | net-new 30d | net-new 7d | source ids |
| --- | ---: | ---: | ---: | --- |
| we-work-remotely | 576 | 496 | 109 | we-work-remotely |
| breezy | 330 | 116 | 42 | breezy:20four7va, breezy:sourcefit, breezy:yokly, breezy:remote-craft, breezy:value-virtual-assistants, breezy:time-etc |
| workable | 175 | 146 | 35 | workable:hunt-st, workable:coconutva, workable:crewbloom, workable:pearltalent, workable:rocketams, workable:hello-rache, workable:pineapple-staffing |
| greenhouse | 164 | 28 | 17 | greenhouse:canonical, greenhouse:solarwinds, greenhouse:remotecom, greenhouse:gitlab, greenhouse:janes, greenhouse:ghost, greenhouse:trainingthestreet, greenhouse:trinityparktalent, greenhouse:grafanalabs, greenhouse:nearform |
| ashby | 163 | 109 | 34 | ashby:multiplymii, ashby:foundry-for-good, ashby:trust-wallet, ashby:railway, ashby:gradient, ashby:payscale, ashby:circulareconomysystems, ashby:molecule, ashby:scalemath, ashby:the-studio, ashby:whippy, ashby:cubic3, ashby:flipper, ashby:getground, ashby:luxor, ashby:finch, ashby:flutterflow, ashby:homera-health, ashby:amplify, ashby:ashby, ashby:camunda, ashby:supabase, ashby:tremendous |
| real-work-from-anywhere | 149 | 109 | 27 | real-work-from-anywhere |
| lever | 145 | 145 | 35 | lever:vacancies, lever:truezerotech, lever:snappr, lever:tenna, lever:deliverect, lever:levelup, lever:nibiru, lever:applydigital, lever:brafton, lever:brevo, lever:decilegroup, lever:outsourcedstaff, lever:jetsupport, lever:lwolf, lever:willowinc, lever:gushwork, lever:parcelvision, lever:piccollage, lever:repurposeglobal, lever:audinate, lever:beaverprocess, lever:90seconds, lever:alltrails, lever:hso, lever:trustarc |
| jobicy | 63 | 19 | 8 | jobicy-supporting-apac, jobicy-admin-support-apac |
| remote-ok | 58 | 36 | 7 | remote-ok |
| remotive | 14 | 5 | 2 | remotive |
| authentic-jobs | 0 | 0 | 0 | authentic-jobs |
| dribbble | 0 | 0 | 0 | dribbble |
| himalayas | 0 | 0 | 0 | himalayas:remote-jobs |

## Supply by exact source_id

| source_id | platform | active | net-new 7d | net-new 30d | inactive |
| --- | --- | ---: | ---: | ---: | ---: |
| we-work-remotely | WeWorkRemotely | 576 | 109 | 496 | 1437 |
| breezy:20four7va | 20Four7VA | 162 | 14 | 55 | 129 |
| real-work-from-anywhere | RealWorkFromAnywhere | 149 | 27 | 109 | 564 |
| workable:hunt-st | Hunt St | 131 | 26 | 109 | 130 |
| breezy:sourcefit | Breezy/sourcefit | 128 | 24 | 55 | 154 |
| greenhouse:canonical | Canonical | 123 | 0 | 2 | 197 |
| ashby:multiplymii | Ashby/multiplymii | 82 | 4 | 28 | 1 |
| jobicy-supporting-apac | Jobicy | 58 | 8 | 17 | 112 |
| remote-ok | RemoteOK | 58 | 7 | 36 | 1220 |
| ashby:foundry-for-good | Ashby/foundry-for-good | 27 | 0 | 27 | 0 |
| lever:vacancies | Lever/vacancies | 20 | 0 | 20 | 0 |
| workable:coconutva | Coconut VA | 18 | 0 | 14 | 54 |
| workable:crewbloom | CrewBloom | 18 | 7 | 16 | 68 |
| lever:truezerotech | Lever/truezerotech | 17 | 0 | 17 | 0 |
| breezy:yokly | Yokly | 16 | 4 | 5 | 0 |
| greenhouse:solarwinds | Greenhouse/solarwinds | 16 | 16 | 16 | 0 |
| breezy:remote-craft | Remote Craft | 14 | 0 | 0 | 1 |
| greenhouse:remotecom | Remote.com | 14 | 0 | 0 | 608 |
| remotive | Remotive | 14 | 2 | 5 | 93 |
| ashby:trust-wallet | Ashby/trust-wallet | 13 | 13 | 13 | 0 |
| lever:snappr | Lever/snappr | 13 | 0 | 13 | 0 |
| lever:tenna | Lever/tenna | 11 | 0 | 11 | 0 |
| breezy:value-virtual-assistants | VALUE Virtual Assistants | 10 | 0 | 1 | 1 |
| lever:deliverect | Lever/deliverect | 9 | 0 | 9 | 0 |
| lever:levelup | Lever/levelup | 9 | 9 | 9 | 0 |
| lever:nibiru | Lever/nibiru | 8 | 8 | 8 | 0 |
| workable:pearltalent | Pearl Talent | 7 | 2 | 6 | 59 |
| ashby:railway | Ashby/railway | 6 | 6 | 6 | 0 |
| greenhouse:gitlab | GitLab | 6 | 0 | 6 | 586 |
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
| greenhouse:grafanalabs | Grafana Labs | 0 | 0 | 0 | 385 |
| greenhouse:nearform | Nearform | 0 | 0 | 0 | 57 |
| himalayas:remote-jobs | Himalayas | 0 | 0 | 0 | 2 |
| workable:hello-rache | Hello Rache | 0 | 0 | 0 | 4 |
| workable:pineapple-staffing | Pineapple Staffing | 0 | 0 | 0 | 3 |

## Fetch outcomes (last 7 days)

Separates real (changed) fetches from unchanged 304 polls, intentional skips, failures, and true zero-yield. `items` counts only changed fetches, so carried-forward unchanged counts never read as new supply.

| source_id | real fetches | unchanged | skips | failures | zero-yield | items |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 197 | 807 | 0 | 4 | 0 | 18679 |
| remotive | 169 | 839 | 0 | 0 | 0 | 1749 |
| ashby:multiplymii | 152 | 0 | 856 | 0 | 0 | 8506 |
| breezy:20four7va | 152 | 0 | 1864 | 0 | 0 | 18156 |
| breezy:remote-craft | 152 | 0 | 856 | 0 | 0 | 2280 |
| breezy:sourcefit | 152 | 0 | 856 | 0 | 0 | 15125 |
| breezy:time-etc | 152 | 0 | 856 | 0 | 0 | 152 |
| breezy:value-virtual-assistants | 152 | 0 | 856 | 0 | 0 | 1633 |
| breezy:yokly | 152 | 0 | 856 | 0 | 8 | 522 |
| greenhouse:ghost | 152 | 0 | 856 | 0 | 0 | 632 |
| greenhouse:gitlab | 152 | 0 | 856 | 0 | 0 | 35862 |
| greenhouse:grafanalabs | 152 | 0 | 856 | 0 | 0 | 21376 |
| greenhouse:nearform | 152 | 0 | 856 | 0 | 0 | 3449 |
| real-work-from-anywhere | 152 | 0 | 856 | 0 | 0 | 7600 |
| greenhouse:canonical | 151 | 0 | 856 | 1 | 0 | 47257 |
| workable:hunt-st | 106 | 0 | 857 | 45 | 0 | 14970 |
| workable:rocketams | 106 | 0 | 857 | 45 | 0 | 1060 |
| workable:hello-rache | 105 | 0 | 857 | 46 | 0 | 315 |
| workable:pearltalent | 105 | 0 | 857 | 46 | 0 | 31027 |
| workable:coconutva | 104 | 0 | 857 | 47 | 0 | 3336 |
| workable:crewbloom | 104 | 0 | 857 | 47 | 0 | 10718 |
| jobicy-supporting-apac | 24 | 96 | 856 | 32 | 0 | 960 |
| remote-ok | 24 | 128 | 856 | 0 | 0 | 1036 |
| jobicy-admin-support-apac | 4 | 117 | 856 | 31 | 0 | 19 |
| ashby:amplify | 0 | 0 | 1008 | 0 | 0 | 0 |
| ashby:ashby | 0 | 0 | 1008 | 0 | 0 | 0 |
| ashby:camunda | 0 | 0 | 1008 | 0 | 0 | 0 |
| ashby:circulareconomysystems | 0 | 0 | 1008 | 0 | 0 | 0 |
| ashby:cubic3 | 0 | 0 | 530 | 0 | 0 | 0 |
| ashby:flipper | 0 | 0 | 787 | 0 | 0 | 0 |
| ashby:foundry-for-good | 0 | 0 | 1008 | 0 | 0 | 0 |
| ashby:getground | 0 | 0 | 1008 | 0 | 0 | 0 |
| ashby:gradient | 0 | 0 | 1008 | 0 | 0 | 0 |
| ashby:luxor | 0 | 0 | 1008 | 0 | 0 | 0 |
| ashby:molecule | 0 | 0 | 1008 | 0 | 0 | 0 |
| ashby:payscale | 0 | 0 | 1008 | 0 | 0 | 0 |
| ashby:railway | 0 | 0 | 814 | 0 | 0 | 0 |
| ashby:scalemath | 0 | 0 | 412 | 0 | 0 | 0 |
| ashby:supabase | 0 | 0 | 1008 | 0 | 0 | 0 |
| ashby:the-studio | 0 | 0 | 1008 | 0 | 0 | 0 |
| ashby:tremendous | 0 | 0 | 1008 | 0 | 0 | 0 |
| ashby:trust-wallet | 0 | 0 | 453 | 0 | 0 | 0 |
| ashby:whippy | 0 | 0 | 412 | 0 | 0 | 0 |
| authentic-jobs | 0 | 0 | 1008 | 0 | 0 | 0 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 1008 | 0 | 0 | 0 |
| dribbble | 0 | 0 | 1008 | 0 | 0 | 0 |
| greenhouse:remotecom | 0 | 0 | 856 | 152 | 0 | 0 |
| jobspresso | 0 | 0 | 1008 | 0 | 0 | 0 |
| lever:applydigital | 0 | 0 | 1008 | 0 | 0 | 0 |
| lever:audinate | 0 | 0 | 530 | 0 | 0 | 0 |
| lever:beaverprocess | 0 | 0 | 1008 | 0 | 0 | 0 |
| lever:brafton | 0 | 0 | 1008 | 0 | 0 | 0 |
| lever:brevo | 0 | 0 | 501 | 0 | 0 | 0 |
| lever:decilegroup | 0 | 0 | 1008 | 0 | 0 | 0 |
| lever:deliverect | 0 | 0 | 1008 | 0 | 0 | 0 |
| lever:gushwork | 0 | 0 | 1008 | 0 | 0 | 0 |
| lever:jetsupport | 0 | 0 | 412 | 0 | 0 | 0 |
| lever:lwolf | 0 | 0 | 1008 | 0 | 0 | 0 |
| lever:nibiru | 0 | 0 | 453 | 0 | 0 | 0 |
| lever:outsourcedstaff | 0 | 0 | 1008 | 0 | 0 | 0 |
| lever:parcelvision | 0 | 0 | 847 | 0 | 0 | 0 |
| lever:piccollage | 0 | 0 | 253 | 0 | 0 | 0 |
| lever:repurposeglobal | 0 | 0 | 1008 | 0 | 0 | 0 |
| lever:snappr | 0 | 0 | 1008 | 0 | 0 | 0 |
| lever:tenna | 0 | 0 | 1008 | 0 | 0 | 0 |
| lever:truezerotech | 0 | 0 | 1008 | 0 | 0 | 0 |
| lever:vacancies | 0 | 0 | 1008 | 0 | 0 | 0 |
| lever:vaultoutsourcing | 0 | 0 | 1008 | 0 | 0 | 0 |
| lever:willowinc | 0 | 0 | 1008 | 0 | 0 | 0 |
| onlinejobs-ph | 0 | 0 | 1008 | 0 | 0 | 0 |
| problogger | 0 | 0 | 1008 | 0 | 0 | 0 |
| remote-co | 0 | 0 | 1008 | 0 | 0 | 0 |
| workable:connectos | 0 | 0 | 1008 | 0 | 0 | 0 |
| workable:global-strategic | 0 | 0 | 1008 | 0 | 0 | 0 |
| workable:myoutdesk | 0 | 0 | 1008 | 0 | 0 | 0 |
| workable:outsource-access | 0 | 0 | 1008 | 0 | 0 | 0 |
| workable:pineapple-staffing | 0 | 0 | 1008 | 0 | 0 | 0 |
| workable:staff-domain-inc | 0 | 0 | 1008 | 0 | 0 | 0 |
| workable:superstaff | 0 | 0 | 1008 | 0 | 0 | 0 |
| workable:virtualstaff365 | 0 | 0 | 1008 | 0 | 0 | 0 |

## Geo & eligibility triage outcomes (last 7 days)

Breakdown of stored opportunities by Philippines eligibility verdict.

| source_id | eligible | unclear | ineligible | policy_rejected | total | qualified_rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 109 | 0 | 23 | 23 | 132 | 82.6% |
| real-work-from-anywhere | 27 | 4 | 2 | 6 | 33 | 81.8% |
| greenhouse:gitlab | 0 | 0 | 29 | 29 | 29 | 0.0% |
| workable:hunt-st | 26 | 1 | 0 | 0 | 27 | 96.3% |
| breezy:sourcefit | 24 | 0 | 0 | 1 | 24 | 100.0% |
| greenhouse:grafanalabs | 0 | 0 | 24 | 24 | 24 | 0.0% |
| jobicy-supporting-apac | 8 | 0 | 13 | 13 | 21 | 38.1% |
| greenhouse:solarwinds | 16 | 0 | 0 | 0 | 16 | 100.0% |
| breezy:20four7va | 14 | 0 | 0 | 0 | 14 | 100.0% |
| remote-ok | 7 | 4 | 3 | 7 | 14 | 50.0% |
| ashby:trust-wallet | 13 | 0 | 0 | 0 | 13 | 100.0% |
| workable:crewbloom | 8 | 0 | 4 | 4 | 12 | 66.7% |
| lever:levelup | 9 | 0 | 0 | 0 | 9 | 100.0% |
| lever:nibiru | 8 | 0 | 0 | 0 | 8 | 100.0% |
| greenhouse:canonical | 0 | 0 | 7 | 7 | 7 | 0.0% |
| ashby:railway | 6 | 0 | 0 | 0 | 6 | 100.0% |
| lever:brevo | 5 | 0 | 0 | 0 | 5 | 100.0% |
| ashby:multiplymii | 4 | 0 | 0 | 0 | 4 | 100.0% |
| breezy:yokly | 4 | 0 | 0 | 0 | 4 | 100.0% |
| lever:jetsupport | 4 | 0 | 0 | 0 | 4 | 100.0% |
| workable:pearltalent | 2 | 0 | 2 | 2 | 4 | 50.0% |
| ashby:scalemath | 3 | 0 | 0 | 0 | 3 | 100.0% |
| ashby:whippy | 3 | 0 | 0 | 0 | 3 | 100.0% |
| lever:parcelvision | 3 | 0 | 0 | 0 | 3 | 100.0% |
| lever:piccollage | 3 | 0 | 0 | 0 | 3 | 100.0% |
| remotive | 2 | 0 | 1 | 1 | 3 | 66.7% |
| ashby:cubic3 | 2 | 0 | 0 | 0 | 2 | 100.0% |
| ashby:flipper | 2 | 0 | 0 | 0 | 2 | 100.0% |
| greenhouse:nearform | 0 | 0 | 2 | 2 | 2 | 0.0% |
| lever:audinate | 2 | 0 | 0 | 0 | 2 | 100.0% |
| ashby:flutterflow | 1 | 0 | 0 | 0 | 1 | 100.0% |
| greenhouse:trinityparktalent | 1 | 0 | 0 | 0 | 1 | 100.0% |
| lever:alltrails | 1 | 0 | 0 | 0 | 1 | 100.0% |

## Yield efficiency (last 7 days)

Stored eligibility per real (changed) fetch and per 100 items seen; not marginal verified first-publication yield.
UNKNOWN means a count is missing/invalid or its denominator is zero. Fetch and stored cohorts may differ across intake paths; these descriptive ratios do not establish source productivity or causal yield.

| source_id | real fetches | items seen | eligible stored | yield / fetch | yield / 100 items |
| --- | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 197 | 18679 | 109 | 0.55 | 0.58 |
| remotive | 169 | 1749 | 2 | 0.01 | 0.11 |
| ashby:multiplymii | 152 | 8506 | 4 | 0.03 | 0.05 |
| breezy:20four7va | 152 | 18156 | 14 | 0.09 | 0.08 |
| breezy:remote-craft | 152 | 2280 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:sourcefit | 152 | 15125 | 24 | 0.16 | 0.16 |
| breezy:time-etc | 152 | 152 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:value-virtual-assistants | 152 | 1633 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:yokly | 152 | 522 | 4 | 0.03 | 0.77 |
| greenhouse:ghost | 152 | 632 | UNKNOWN | UNKNOWN | UNKNOWN |
| greenhouse:gitlab | 152 | 35862 | 0 | 0.00 | 0.00 |
| greenhouse:grafanalabs | 152 | 21376 | 0 | 0.00 | 0.00 |
| greenhouse:nearform | 152 | 3449 | 0 | 0.00 | 0.00 |
| real-work-from-anywhere | 152 | 7600 | 27 | 0.18 | 0.36 |
| greenhouse:canonical | 151 | 47257 | 0 | 0.00 | 0.00 |
| workable:hunt-st | 106 | 14970 | 26 | 0.25 | 0.17 |
| workable:rocketams | 106 | 1060 | UNKNOWN | UNKNOWN | UNKNOWN |
| workable:hello-rache | 105 | 315 | UNKNOWN | UNKNOWN | UNKNOWN |
| workable:pearltalent | 105 | 31027 | 2 | 0.02 | 0.01 |
| workable:coconutva | 104 | 3336 | UNKNOWN | UNKNOWN | UNKNOWN |
| workable:crewbloom | 104 | 10718 | 8 | 0.08 | 0.07 |
| jobicy-supporting-apac | 24 | 960 | 8 | 0.33 | 0.83 |
| remote-ok | 24 | 1036 | 7 | 0.29 | 0.68 |
| jobicy-admin-support-apac | 4 | 19 | UNKNOWN | UNKNOWN | UNKNOWN |
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
