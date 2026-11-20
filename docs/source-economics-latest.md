# Source economics — latest (SP-02)

- **As of:** 2026-11-20T10:21:46.962Z
- **Windows:** 7d/14d/30d net-new by `scraped_at`
- **Reconciliation:** OK (every partition delta is zero)
- Read-only report; regenerate with `scripts/diagnostics/source-economics.ts`.

## Qualified supply (strict eligibility; first-stored proxy)

Excludes unclear/ineligible rows. Historical publication and later deactivation are not fully reconstructed.

| qualified active | qualified new 7d | per day (7d) | qualified new 30d | per day (30d) |
| ---: | ---: | ---: | ---: | ---: |
| 1714 | 270 | 38.57 | 964 | 32.13 |

## Identity coverage (SP-01)

| total | with source_id | null source_id | coverage | active null-id |
| ---: | ---: | ---: | ---: | ---: |
| 9555 | 9555 | 0 | 100.0% | 0 |

## Net-new accepted supply

| active | net-new 7d | net-new 14d | net-new 30d |
| ---: | ---: | ---: | ---: |
| 1714 | 270 | 428 | 964 |

## Provider-family concentration (ADR-006 §7)

- **Net-new 30d:** top family `we-work-remotely` 44.7% ⚠️ >40%; top-3 70.1% ⚠️ >70%.
- **Active:** top family `we-work-remotely` 31.4%; top-3 65.4%.
- `(unknown)` legacy rows are excluded from these shares.

| provider family | active | net-new 30d | net-new 7d | source ids |
| --- | ---: | ---: | ---: | --- |
| we-work-remotely | 539 | 431 | 180 | we-work-remotely |
| breezy | 334 | 113 | 12 | breezy:20four7va, breezy:sourcefit, breezy:remote-craft, breezy:value-virtual-assistants, breezy:yokly, breezy:time-etc |
| workable | 248 | 132 | 32 | workable:hunt-st, workable:crewbloom, workable:coconutva, workable:pearltalent, workable:rocketams, workable:hello-rache, workable:pineapple-staffing |
| real-work-from-anywhere | 159 | 112 | 30 | real-work-from-anywhere |
| greenhouse | 147 | 19 | 2 | greenhouse:canonical, greenhouse:solarwinds, greenhouse:gitlab, greenhouse:ghost, greenhouse:trinityparktalent, greenhouse:grafanalabs, greenhouse:janes, greenhouse:nearform, greenhouse:remotecom, greenhouse:trainingthestreet |
| ashby | 110 | 51 | 2 | ashby:multiplymii, ashby:trust-wallet, ashby:railway, ashby:scalemath, ashby:whippy, ashby:cubic3, ashby:flipper, ashby:flutterflow, ashby:amplify, ashby:ashby, ashby:camunda, ashby:circulareconomysystems, ashby:finch, ashby:foundry-for-good, ashby:getground, ashby:gradient, ashby:homera-health, ashby:luxor, ashby:molecule, ashby:payscale, ashby:supabase, ashby:the-studio, ashby:tremendous |
| jobicy | 65 | 28 | 5 | jobicy-supporting-apac, jobicy-admin-support-apac |
| remote-ok | 65 | 38 | 7 | remote-ok |
| lever | 35 | 35 | 0 | lever:levelup, lever:nibiru, lever:brevo, lever:jetsupport, lever:parcelvision, lever:piccollage, lever:audinate, lever:alltrails, lever:90seconds, lever:applydigital, lever:beaverprocess, lever:brafton, lever:decilegroup, lever:deliverect, lever:gushwork, lever:hso, lever:lwolf, lever:outsourcedstaff, lever:repurposeglobal, lever:snappr, lever:tenna, lever:truezerotech, lever:trustarc, lever:vacancies, lever:willowinc |
| remotive | 12 | 5 | 0 | remotive |
| authentic-jobs | 0 | 0 | 0 | authentic-jobs |
| dribbble | 0 | 0 | 0 | dribbble |
| himalayas | 0 | 0 | 0 | himalayas:remote-jobs |

## Supply by exact source_id

| source_id | platform | active | net-new 7d | net-new 30d | inactive |
| --- | --- | ---: | ---: | ---: | ---: |
| we-work-remotely | WeWorkRemotely | 539 | 180 | 431 | 2156 |
| breezy:20four7va | 20Four7VA | 182 | 8 | 65 | 161 |
| workable:hunt-st | Hunt St | 175 | 24 | 88 | 151 |
| real-work-from-anywhere | RealWorkFromAnywhere | 159 | 30 | 112 | 665 |
| greenhouse:canonical | Canonical | 122 | 1 | 1 | 203 |
| breezy:sourcefit | Breezy/sourcefit | 121 | 3 | 42 | 199 |
| ashby:multiplymii | Ashby/multiplymii | 80 | 2 | 21 | 20 |
| remote-ok | RemoteOK | 65 | 7 | 38 | 1270 |
| jobicy-supporting-apac | Jobicy | 58 | 5 | 26 | 167 |
| workable:crewbloom | CrewBloom | 30 | 2 | 22 | 78 |
| workable:coconutva | Coconut VA | 28 | 4 | 13 | 57 |
| greenhouse:solarwinds | Greenhouse/solarwinds | 16 | 0 | 16 | 0 |
| breezy:remote-craft | Remote Craft | 14 | 0 | 0 | 1 |
| workable:pearltalent | Pearl Talent | 14 | 2 | 9 | 72 |
| ashby:trust-wallet | Ashby/trust-wallet | 13 | 0 | 13 | 0 |
| remotive | Remotive | 12 | 0 | 5 | 103 |
| breezy:value-virtual-assistants | VALUE Virtual Assistants | 10 | 0 | 0 | 1 |
| lever:levelup | Lever/levelup | 9 | 0 | 9 | 0 |
| lever:nibiru | Lever/nibiru | 8 | 0 | 8 | 0 |
| breezy:yokly | Yokly | 7 | 1 | 6 | 11 |
| greenhouse:gitlab | GitLab | 7 | 1 | 1 | 693 |
| jobicy-admin-support-apac | Jobicy | 7 | 0 | 2 | 9 |
| ashby:railway | Ashby/railway | 6 | 0 | 6 | 0 |
| lever:brevo | Lever/brevo | 5 | 0 | 5 | 0 |
| lever:jetsupport | Lever/jetsupport | 4 | 0 | 4 | 0 |
| ashby:scalemath | Ashby/scalemath | 3 | 0 | 3 | 0 |
| ashby:whippy | Ashby/whippy | 3 | 0 | 3 | 0 |
| lever:parcelvision | Lever/parcelvision | 3 | 0 | 3 | 0 |
| lever:piccollage | Lever/piccollage | 3 | 0 | 3 | 0 |
| ashby:cubic3 | Ashby/cubic3 | 2 | 0 | 2 | 0 |
| ashby:flipper | Ashby/flipper | 2 | 0 | 2 | 0 |
| lever:audinate | Lever/audinate | 2 | 0 | 2 | 0 |
| ashby:flutterflow | Ashby/flutterflow | 1 | 0 | 1 | 0 |
| greenhouse:ghost | Ghost | 1 | 0 | 0 | 11 |
| greenhouse:trinityparktalent | Greenhouse/trinityparktalent | 1 | 0 | 1 | 0 |
| lever:alltrails | Lever/alltrails | 1 | 0 | 1 | 0 |
| workable:rocketams | RocketAMS | 1 | 0 | 0 | 10 |
| ashby:amplify | Amplify | 0 | 0 | 0 | 87 |
| ashby:ashby | Ashby | 0 | 0 | 0 | 92 |
| ashby:camunda | Camunda | 0 | 0 | 0 | 67 |
| ashby:circulareconomysystems | Ashby/circulareconomysystems | 0 | 0 | 0 | 3 |
| ashby:finch | Ashby/finch | 0 | 0 | 0 | 1 |
| ashby:foundry-for-good | Ashby/foundry-for-good | 0 | 0 | 0 | 27 |
| ashby:getground | Ashby/getground | 0 | 0 | 0 | 2 |
| ashby:gradient | Ashby/gradient | 0 | 0 | 0 | 5 |
| ashby:homera-health | Ashby/homera-health | 0 | 0 | 0 | 1 |
| ashby:luxor | Ashby/luxor | 0 | 0 | 0 | 2 |
| ashby:molecule | Ashby/molecule | 0 | 0 | 0 | 3 |
| ashby:payscale | Ashby/payscale | 0 | 0 | 0 | 4 |
| ashby:supabase | Supabase | 0 | 0 | 0 | 84 |
| ashby:the-studio | Ashby/the-studio | 0 | 0 | 0 | 3 |
| ashby:tremendous | Tremendous | 0 | 0 | 0 | 31 |
| authentic-jobs | AuthenticJobs | 0 | 0 | 0 | 10 |
| breezy:time-etc | Time Etc | 0 | 0 | 0 | 2 |
| dribbble | Dribbble | 0 | 0 | 0 | 113 |
| greenhouse:grafanalabs | Grafana Labs | 0 | 0 | 0 | 458 |
| greenhouse:janes | Greenhouse/janes | 0 | 0 | 0 | 2 |
| greenhouse:nearform | Nearform | 0 | 0 | 0 | 64 |
| greenhouse:remotecom | Remote.com | 0 | 0 | 0 | 622 |
| greenhouse:trainingthestreet | Greenhouse/trainingthestreet | 0 | 0 | 0 | 1 |
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
| we-work-remotely | 206 | 722 | 0 | 17 | 0 | 20124 |
| remotive | 165 | 780 | 0 | 0 | 0 | 2715 |
| real-work-from-anywhere | 148 | 0 | 797 | 0 | 0 | 7400 |
| breezy:20four7va | 146 | 0 | 1744 | 0 | 0 | 17576 |
| breezy:remote-craft | 146 | 0 | 799 | 0 | 0 | 2190 |
| breezy:sourcefit | 146 | 0 | 799 | 0 | 0 | 15063 |
| breezy:time-etc | 146 | 0 | 799 | 0 | 0 | 146 |
| breezy:value-virtual-assistants | 146 | 0 | 799 | 0 | 0 | 1460 |
| breezy:yokly | 146 | 0 | 799 | 0 | 0 | 623 |
| greenhouse:canonical | 146 | 0 | 799 | 0 | 0 | 46179 |
| greenhouse:ghost | 146 | 0 | 799 | 0 | 0 | 730 |
| greenhouse:gitlab | 146 | 0 | 799 | 0 | 0 | 36689 |
| greenhouse:grafanalabs | 146 | 0 | 799 | 0 | 0 | 20194 |
| greenhouse:nearform | 146 | 0 | 799 | 0 | 0 | 3665 |
| greenhouse:remotecom | 146 | 0 | 799 | 0 | 146 | 0 |
| ashby:multiplymii | 145 | 0 | 799 | 1 | 0 | 6878 |
| workable:pearltalent | 81 | 0 | 801 | 63 | 0 | 23462 |
| workable:coconutva | 80 | 0 | 801 | 64 | 0 | 2569 |
| workable:crewbloom | 80 | 0 | 801 | 64 | 0 | 6910 |
| workable:hello-rache | 80 | 0 | 801 | 64 | 0 | 240 |
| workable:hunt-st | 74 | 0 | 802 | 69 | 0 | 9184 |
| workable:rocketams | 74 | 0 | 802 | 69 | 0 | 616 |
| remote-ok | 44 | 104 | 797 | 0 | 0 | 1901 |
| jobicy-supporting-apac | 36 | 106 | 799 | 4 | 0 | 1440 |
| jobicy-admin-support-apac | 6 | 138 | 800 | 1 | 0 | 26 |
| ashby:amplify | 0 | 0 | 945 | 0 | 0 | 0 |
| ashby:ashby | 0 | 0 | 945 | 0 | 0 | 0 |
| ashby:camunda | 0 | 0 | 945 | 0 | 0 | 0 |
| ashby:circulareconomysystems | 0 | 0 | 945 | 0 | 0 | 0 |
| ashby:cubic3 | 0 | 0 | 945 | 0 | 0 | 0 |
| ashby:flipper | 0 | 0 | 945 | 0 | 0 | 0 |
| ashby:foundry-for-good | 0 | 0 | 945 | 0 | 0 | 0 |
| ashby:getground | 0 | 0 | 945 | 0 | 0 | 0 |
| ashby:gradient | 0 | 0 | 945 | 0 | 0 | 0 |
| ashby:luxor | 0 | 0 | 945 | 0 | 0 | 0 |
| ashby:molecule | 0 | 0 | 945 | 0 | 0 | 0 |
| ashby:payscale | 0 | 0 | 945 | 0 | 0 | 0 |
| ashby:railway | 0 | 0 | 945 | 0 | 0 | 0 |
| ashby:scalemath | 0 | 0 | 945 | 0 | 0 | 0 |
| ashby:supabase | 0 | 0 | 945 | 0 | 0 | 0 |
| ashby:the-studio | 0 | 0 | 945 | 0 | 0 | 0 |
| ashby:tremendous | 0 | 0 | 945 | 0 | 0 | 0 |
| ashby:trust-wallet | 0 | 0 | 945 | 0 | 0 | 0 |
| ashby:whippy | 0 | 0 | 945 | 0 | 0 | 0 |
| authentic-jobs | 0 | 0 | 945 | 0 | 0 | 0 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 945 | 0 | 0 | 0 |
| dribbble | 0 | 0 | 945 | 0 | 0 | 0 |
| jobspresso | 0 | 0 | 945 | 0 | 0 | 0 |
| lever:applydigital | 0 | 0 | 945 | 0 | 0 | 0 |
| lever:audinate | 0 | 0 | 945 | 0 | 0 | 0 |
| lever:beaverprocess | 0 | 0 | 945 | 0 | 0 | 0 |
| lever:brafton | 0 | 0 | 945 | 0 | 0 | 0 |
| lever:brevo | 0 | 0 | 945 | 0 | 0 | 0 |
| lever:decilegroup | 0 | 0 | 945 | 0 | 0 | 0 |
| lever:deliverect | 0 | 0 | 945 | 0 | 0 | 0 |
| lever:gushwork | 0 | 0 | 945 | 0 | 0 | 0 |
| lever:jetsupport | 0 | 0 | 945 | 0 | 0 | 0 |
| lever:lwolf | 0 | 0 | 945 | 0 | 0 | 0 |
| lever:nibiru | 0 | 0 | 945 | 0 | 0 | 0 |
| lever:outsourcedstaff | 0 | 0 | 945 | 0 | 0 | 0 |
| lever:parcelvision | 0 | 0 | 945 | 0 | 0 | 0 |
| lever:piccollage | 0 | 0 | 945 | 0 | 0 | 0 |
| lever:repurposeglobal | 0 | 0 | 945 | 0 | 0 | 0 |
| lever:snappr | 0 | 0 | 945 | 0 | 0 | 0 |
| lever:tenna | 0 | 0 | 945 | 0 | 0 | 0 |
| lever:truezerotech | 0 | 0 | 945 | 0 | 0 | 0 |
| lever:vacancies | 0 | 0 | 945 | 0 | 0 | 0 |
| lever:vaultoutsourcing | 0 | 0 | 945 | 0 | 0 | 0 |
| lever:willowinc | 0 | 0 | 945 | 0 | 0 | 0 |
| onlinejobs-ph | 0 | 0 | 945 | 0 | 0 | 0 |
| problogger | 0 | 0 | 945 | 0 | 0 | 0 |
| remote-co | 0 | 0 | 945 | 0 | 0 | 0 |
| workable:connectos | 0 | 0 | 945 | 0 | 0 | 0 |
| workable:global-strategic | 0 | 0 | 945 | 0 | 0 | 0 |
| workable:myoutdesk | 0 | 0 | 945 | 0 | 0 | 0 |
| workable:outsource-access | 0 | 0 | 945 | 0 | 0 | 0 |
| workable:pineapple-staffing | 0 | 0 | 945 | 0 | 0 | 0 |
| workable:staff-domain-inc | 0 | 0 | 945 | 0 | 0 | 0 |
| workable:superstaff | 0 | 0 | 945 | 0 | 0 | 0 |
| workable:virtualstaff365 | 0 | 0 | 945 | 0 | 0 | 0 |

## Geo & eligibility triage outcomes (last 7 days)

Breakdown of stored opportunities by Philippines eligibility verdict.

| source_id | eligible | unclear | ineligible | policy_rejected | total | qualified_rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 180 | 2 | 167 | 169 | 349 | 51.6% |
| greenhouse:gitlab | 1 | 0 | 36 | 36 | 37 | 2.7% |
| real-work-from-anywhere | 31 | 5 | 1 | 6 | 37 | 83.8% |
| workable:hunt-st | 24 | 0 | 1 | 1 | 25 | 96.0% |
| greenhouse:grafanalabs | 0 | 0 | 13 | 13 | 13 | 0.0% |
| remote-ok | 7 | 2 | 4 | 6 | 13 | 53.8% |
| jobicy-supporting-apac | 5 | 0 | 6 | 6 | 11 | 45.5% |
| workable:pearltalent | 2 | 0 | 8 | 8 | 10 | 20.0% |
| breezy:20four7va | 8 | 0 | 0 | 0 | 8 | 100.0% |
| breezy:sourcefit | 3 | 0 | 2 | 2 | 5 | 60.0% |
| workable:crewbloom | 2 | 0 | 3 | 3 | 5 | 40.0% |
| workable:coconutva | 4 | 0 | 0 | 0 | 4 | 100.0% |
| greenhouse:canonical | 1 | 0 | 2 | 2 | 3 | 33.3% |
| ashby:multiplymii | 2 | 0 | 0 | 0 | 2 | 100.0% |
| remotive | 0 | 0 | 2 | 2 | 2 | 0.0% |
| breezy:yokly | 1 | 0 | 0 | 0 | 1 | 100.0% |

## Yield efficiency (last 7 days)

Stored eligibility per real (changed) fetch and per 100 items seen; not marginal verified first-publication yield.
UNKNOWN means a count is missing/invalid or its denominator is zero. Fetch and stored cohorts may differ across intake paths; these descriptive ratios do not establish source productivity or causal yield.

| source_id | real fetches | items seen | eligible stored | yield / fetch | yield / 100 items |
| --- | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 206 | 20124 | 180 | 0.87 | 0.89 |
| remotive | 165 | 2715 | 0 | 0.00 | 0.00 |
| real-work-from-anywhere | 148 | 7400 | 31 | 0.21 | 0.42 |
| breezy:20four7va | 146 | 17576 | 8 | 0.05 | 0.05 |
| breezy:remote-craft | 146 | 2190 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:sourcefit | 146 | 15063 | 3 | 0.02 | 0.02 |
| breezy:time-etc | 146 | 146 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:value-virtual-assistants | 146 | 1460 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:yokly | 146 | 623 | 1 | 0.01 | 0.16 |
| greenhouse:canonical | 146 | 46179 | 1 | 0.01 | 0.00 |
| greenhouse:ghost | 146 | 730 | UNKNOWN | UNKNOWN | UNKNOWN |
| greenhouse:gitlab | 146 | 36689 | 1 | 0.01 | 0.00 |
| greenhouse:grafanalabs | 146 | 20194 | 0 | 0.00 | 0.00 |
| greenhouse:nearform | 146 | 3665 | UNKNOWN | UNKNOWN | UNKNOWN |
| greenhouse:remotecom | 146 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:multiplymii | 145 | 6878 | 2 | 0.01 | 0.03 |
| workable:pearltalent | 81 | 23462 | 2 | 0.02 | 0.01 |
| workable:coconutva | 80 | 2569 | 4 | 0.05 | 0.16 |
| workable:crewbloom | 80 | 6910 | 2 | 0.03 | 0.03 |
| workable:hello-rache | 80 | 240 | UNKNOWN | UNKNOWN | UNKNOWN |
| workable:hunt-st | 74 | 9184 | 24 | 0.32 | 0.26 |
| workable:rocketams | 74 | 616 | UNKNOWN | UNKNOWN | UNKNOWN |
| remote-ok | 44 | 1901 | 7 | 0.16 | 0.37 |
| jobicy-supporting-apac | 36 | 1440 | 5 | 0.14 | 0.35 |
| jobicy-admin-support-apac | 6 | 26 | UNKNOWN | UNKNOWN | UNKNOWN |
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
