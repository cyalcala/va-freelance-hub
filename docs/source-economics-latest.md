# Source economics — latest (SP-02)

- **As of:** 2026-11-13T09:54:09.041Z
- **Windows:** 7d/14d/30d net-new by `scraped_at`
- **Reconciliation:** OK (every partition delta is zero)
- Read-only report; regenerate with `scripts/diagnostics/source-economics.ts`.

## Qualified supply (strict eligibility; first-stored proxy)

Excludes unclear/ineligible rows. Historical publication and later deactivation are not fully reconstructed.

| qualified active | qualified new 7d | per day (7d) | qualified new 30d | per day (30d) |
| ---: | ---: | ---: | ---: | ---: |
| 1706 | 158 | 22.57 | 1026 | 34.20 |

## Identity coverage (SP-01)

| total | with source_id | null source_id | coverage | active null-id |
| ---: | ---: | ---: | ---: | ---: |
| 9029 | 9029 | 0 | 100.0% | 0 |

## Net-new accepted supply

| active | net-new 7d | net-new 14d | net-new 30d |
| ---: | ---: | ---: | ---: |
| 1706 | 158 | 314 | 1026 |

## Provider-family concentration (ADR-006 §7)

- **Net-new 30d:** top family `we-work-remotely` 36.5%; top-3 65.0%.
- **Active:** top family `we-work-remotely` 27.9%; top-3 61.5%.
- `(unknown)` legacy rows are excluded from these shares.

| provider family | active | net-new 30d | net-new 7d | source ids |
| --- | ---: | ---: | ---: | --- |
| we-work-remotely | 476 | 374 | 38 | we-work-remotely |
| breezy | 348 | 121 | 27 | breezy:20four7va, breezy:sourcefit, breezy:yokly, breezy:remote-craft, breezy:value-virtual-assistants, breezy:time-etc |
| workable | 226 | 172 | 31 | workable:hunt-st, workable:crewbloom, workable:coconutva, workable:pearltalent, workable:rocketams, workable:hello-rache, workable:pineapple-staffing |
| real-work-from-anywhere | 159 | 119 | 30 | real-work-from-anywhere |
| greenhouse | 147 | 20 | 0 | greenhouse:canonical, greenhouse:solarwinds, greenhouse:gitlab, greenhouse:ghost, greenhouse:trinityparktalent, greenhouse:grafanalabs, greenhouse:janes, greenhouse:nearform, greenhouse:remotecom, greenhouse:trainingthestreet |
| ashby | 114 | 57 | 9 | ashby:multiplymii, ashby:trust-wallet, ashby:railway, ashby:scalemath, ashby:whippy, ashby:cubic3, ashby:flipper, ashby:luxor, ashby:finch, ashby:flutterflow, ashby:amplify, ashby:ashby, ashby:camunda, ashby:circulareconomysystems, ashby:foundry-for-good, ashby:getground, ashby:gradient, ashby:homera-health, ashby:molecule, ashby:payscale, ashby:supabase, ashby:the-studio, ashby:tremendous |
| lever | 84 | 84 | 0 | lever:vacancies, lever:tenna, lever:levelup, lever:nibiru, lever:applydigital, lever:brevo, lever:outsourcedstaff, lever:jetsupport, lever:willowinc, lever:gushwork, lever:parcelvision, lever:piccollage, lever:audinate, lever:alltrails, lever:90seconds, lever:beaverprocess, lever:brafton, lever:decilegroup, lever:deliverect, lever:hso, lever:lwolf, lever:repurposeglobal, lever:snappr, lever:truezerotech, lever:trustarc |
| remote-ok | 70 | 44 | 14 | remote-ok |
| jobicy | 66 | 29 | 7 | jobicy-supporting-apac, jobicy-admin-support-apac |
| remotive | 16 | 6 | 2 | remotive |
| authentic-jobs | 0 | 0 | 0 | authentic-jobs |
| dribbble | 0 | 0 | 0 | dribbble |
| himalayas | 0 | 0 | 0 | himalayas:remote-jobs |

## Supply by exact source_id

| source_id | platform | active | net-new 7d | net-new 30d | inactive |
| --- | --- | ---: | ---: | ---: | ---: |
| we-work-remotely | WeWorkRemotely | 476 | 38 | 374 | 1870 |
| breezy:20four7va | 20Four7VA | 178 | 21 | 65 | 157 |
| workable:hunt-st | Hunt St | 160 | 17 | 118 | 141 |
| real-work-from-anywhere | RealWorkFromAnywhere | 159 | 30 | 119 | 628 |
| breezy:sourcefit | Breezy/sourcefit | 130 | 6 | 51 | 185 |
| greenhouse:canonical | Canonical | 123 | 0 | 0 | 199 |
| ashby:multiplymii | Ashby/multiplymii | 81 | 9 | 24 | 17 |
| remote-ok | RemoteOK | 70 | 14 | 44 | 1252 |
| jobicy-supporting-apac | Jobicy | 59 | 6 | 25 | 155 |
| workable:crewbloom | CrewBloom | 29 | 8 | 23 | 74 |
| workable:coconutva | Coconut VA | 24 | 4 | 19 | 57 |
| lever:vacancies | Lever/vacancies | 20 | 0 | 20 | 0 |
| breezy:yokly | Yokly | 16 | 0 | 5 | 1 |
| greenhouse:solarwinds | Greenhouse/solarwinds | 16 | 0 | 16 | 0 |
| remotive | Remotive | 16 | 2 | 6 | 97 |
| breezy:remote-craft | Remote Craft | 14 | 0 | 0 | 1 |
| ashby:trust-wallet | Ashby/trust-wallet | 13 | 0 | 13 | 0 |
| workable:pearltalent | Pearl Talent | 12 | 2 | 11 | 64 |
| lever:tenna | Lever/tenna | 11 | 0 | 11 | 0 |
| breezy:value-virtual-assistants | VALUE Virtual Assistants | 10 | 0 | 0 | 1 |
| lever:levelup | Lever/levelup | 9 | 0 | 9 | 0 |
| lever:nibiru | Lever/nibiru | 8 | 0 | 8 | 0 |
| jobicy-admin-support-apac | Jobicy | 7 | 1 | 4 | 9 |
| ashby:railway | Ashby/railway | 6 | 0 | 6 | 0 |
| greenhouse:gitlab | GitLab | 6 | 0 | 3 | 657 |
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
| greenhouse:grafanalabs | Grafana Labs | 0 | 0 | 0 | 444 |
| greenhouse:janes | Greenhouse/janes | 0 | 0 | 0 | 2 |
| greenhouse:nearform | Nearform | 0 | 0 | 0 | 64 |
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
| remotive | 166 | 788 | 0 | 0 | 0 | 2316 |
| ashby:multiplymii | 147 | 0 | 807 | 0 | 0 | 6640 |
| breezy:20four7va | 147 | 0 | 1761 | 0 | 0 | 18111 |
| breezy:remote-craft | 147 | 0 | 807 | 0 | 0 | 2205 |
| breezy:sourcefit | 147 | 0 | 807 | 0 | 0 | 16372 |
| breezy:time-etc | 147 | 0 | 807 | 0 | 0 | 147 |
| breezy:value-virtual-assistants | 147 | 0 | 807 | 0 | 0 | 1470 |
| breezy:yokly | 147 | 0 | 807 | 0 | 0 | 588 |
| greenhouse:gitlab | 147 | 0 | 807 | 0 | 0 | 36983 |
| greenhouse:grafanalabs | 147 | 0 | 807 | 0 | 0 | 20485 |
| greenhouse:nearform | 147 | 0 | 807 | 0 | 0 | 3991 |
| greenhouse:remotecom | 147 | 0 | 807 | 0 | 147 | 0 |
| real-work-from-anywhere | 147 | 0 | 807 | 0 | 0 | 7350 |
| greenhouse:canonical | 146 | 0 | 807 | 1 | 0 | 46136 |
| greenhouse:ghost | 146 | 0 | 807 | 1 | 0 | 730 |
| workable:hunt-st | 105 | 0 | 809 | 40 | 0 | 13121 |
| workable:rocketams | 105 | 0 | 809 | 40 | 0 | 1030 |
| workable:coconutva | 103 | 0 | 809 | 42 | 0 | 3364 |
| workable:crewbloom | 103 | 0 | 809 | 42 | 0 | 9260 |
| workable:hello-rache | 103 | 0 | 810 | 41 | 0 | 309 |
| workable:pearltalent | 103 | 0 | 810 | 41 | 0 | 29420 |
| we-work-remotely | 83 | 859 | 0 | 12 | 0 | 8300 |
| remote-ok | 46 | 101 | 807 | 0 | 0 | 1933 |
| jobicy-supporting-apac | 25 | 121 | 808 | 0 | 0 | 1000 |
| jobicy-admin-support-apac | 2 | 144 | 808 | 0 | 0 | 9 |
| ashby:amplify | 0 | 0 | 954 | 0 | 0 | 0 |
| ashby:ashby | 0 | 0 | 954 | 0 | 0 | 0 |
| ashby:camunda | 0 | 0 | 954 | 0 | 0 | 0 |
| ashby:circulareconomysystems | 0 | 0 | 954 | 0 | 0 | 0 |
| ashby:cubic3 | 0 | 0 | 954 | 0 | 0 | 0 |
| ashby:flipper | 0 | 0 | 954 | 0 | 0 | 0 |
| ashby:foundry-for-good | 0 | 0 | 954 | 0 | 0 | 0 |
| ashby:getground | 0 | 0 | 954 | 0 | 0 | 0 |
| ashby:gradient | 0 | 0 | 954 | 0 | 0 | 0 |
| ashby:luxor | 0 | 0 | 954 | 0 | 0 | 0 |
| ashby:molecule | 0 | 0 | 954 | 0 | 0 | 0 |
| ashby:payscale | 0 | 0 | 954 | 0 | 0 | 0 |
| ashby:railway | 0 | 0 | 954 | 0 | 0 | 0 |
| ashby:scalemath | 0 | 0 | 954 | 0 | 0 | 0 |
| ashby:supabase | 0 | 0 | 954 | 0 | 0 | 0 |
| ashby:the-studio | 0 | 0 | 954 | 0 | 0 | 0 |
| ashby:tremendous | 0 | 0 | 954 | 0 | 0 | 0 |
| ashby:trust-wallet | 0 | 0 | 954 | 0 | 0 | 0 |
| ashby:whippy | 0 | 0 | 954 | 0 | 0 | 0 |
| authentic-jobs | 0 | 0 | 954 | 0 | 0 | 0 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 954 | 0 | 0 | 0 |
| dribbble | 0 | 0 | 954 | 0 | 0 | 0 |
| jobspresso | 0 | 0 | 954 | 0 | 0 | 0 |
| lever:applydigital | 0 | 0 | 954 | 0 | 0 | 0 |
| lever:audinate | 0 | 0 | 954 | 0 | 0 | 0 |
| lever:beaverprocess | 0 | 0 | 954 | 0 | 0 | 0 |
| lever:brafton | 0 | 0 | 954 | 0 | 0 | 0 |
| lever:brevo | 0 | 0 | 954 | 0 | 0 | 0 |
| lever:decilegroup | 0 | 0 | 954 | 0 | 0 | 0 |
| lever:deliverect | 0 | 0 | 954 | 0 | 0 | 0 |
| lever:gushwork | 0 | 0 | 954 | 0 | 0 | 0 |
| lever:jetsupport | 0 | 0 | 954 | 0 | 0 | 0 |
| lever:lwolf | 0 | 0 | 954 | 0 | 0 | 0 |
| lever:nibiru | 0 | 0 | 954 | 0 | 0 | 0 |
| lever:outsourcedstaff | 0 | 0 | 954 | 0 | 0 | 0 |
| lever:parcelvision | 0 | 0 | 954 | 0 | 0 | 0 |
| lever:piccollage | 0 | 0 | 954 | 0 | 0 | 0 |
| lever:repurposeglobal | 0 | 0 | 954 | 0 | 0 | 0 |
| lever:snappr | 0 | 0 | 954 | 0 | 0 | 0 |
| lever:tenna | 0 | 0 | 954 | 0 | 0 | 0 |
| lever:truezerotech | 0 | 0 | 954 | 0 | 0 | 0 |
| lever:vacancies | 0 | 0 | 954 | 0 | 0 | 0 |
| lever:vaultoutsourcing | 0 | 0 | 954 | 0 | 0 | 0 |
| lever:willowinc | 0 | 0 | 954 | 0 | 0 | 0 |
| onlinejobs-ph | 0 | 0 | 954 | 0 | 0 | 0 |
| problogger | 0 | 0 | 954 | 0 | 0 | 0 |
| remote-co | 0 | 0 | 954 | 0 | 0 | 0 |
| workable:connectos | 0 | 0 | 954 | 0 | 0 | 0 |
| workable:global-strategic | 0 | 0 | 954 | 0 | 0 | 0 |
| workable:myoutdesk | 0 | 0 | 954 | 0 | 0 | 0 |
| workable:outsource-access | 0 | 0 | 954 | 0 | 0 | 0 |
| workable:pineapple-staffing | 0 | 0 | 954 | 0 | 0 | 0 |
| workable:staff-domain-inc | 0 | 0 | 954 | 0 | 0 | 0 |
| workable:superstaff | 0 | 0 | 954 | 0 | 0 | 0 |
| workable:virtualstaff365 | 0 | 0 | 954 | 0 | 0 | 0 |

## Geo & eligibility triage outcomes (last 7 days)

Breakdown of stored opportunities by Philippines eligibility verdict.

| source_id | eligible | unclear | ineligible | policy_rejected | total | qualified_rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 38 | 1 | 100 | 101 | 139 | 27.3% |
| real-work-from-anywhere | 30 | 6 | 6 | 12 | 42 | 71.4% |
| greenhouse:grafanalabs | 0 | 0 | 34 | 34 | 34 | 0.0% |
| greenhouse:gitlab | 0 | 1 | 25 | 26 | 26 | 0.0% |
| breezy:20four7va | 21 | 0 | 1 | 1 | 22 | 95.5% |
| remote-ok | 14 | 1 | 5 | 6 | 20 | 70.0% |
| workable:hunt-st | 17 | 0 | 0 | 0 | 17 | 100.0% |
| workable:crewbloom | 9 | 0 | 2 | 2 | 11 | 81.8% |
| breezy:sourcefit | 6 | 0 | 4 | 4 | 10 | 60.0% |
| jobicy-supporting-apac | 6 | 0 | 4 | 4 | 10 | 60.0% |
| ashby:multiplymii | 9 | 0 | 0 | 0 | 9 | 100.0% |
| workable:pearltalent | 2 | 0 | 3 | 3 | 5 | 40.0% |
| workable:coconutva | 4 | 0 | 0 | 0 | 4 | 100.0% |
| remotive | 2 | 0 | 1 | 1 | 3 | 66.7% |
| greenhouse:nearform | 0 | 0 | 1 | 1 | 1 | 0.0% |
| jobicy-admin-support-apac | 1 | 0 | 0 | 0 | 1 | 100.0% |

## Yield efficiency (last 7 days)

Stored eligibility per real (changed) fetch and per 100 items seen; not marginal verified first-publication yield.
UNKNOWN means a count is missing/invalid or its denominator is zero. Fetch and stored cohorts may differ across intake paths; these descriptive ratios do not establish source productivity or causal yield.

| source_id | real fetches | items seen | eligible stored | yield / fetch | yield / 100 items |
| --- | ---: | ---: | ---: | ---: | ---: |
| remotive | 166 | 2316 | 2 | 0.01 | 0.09 |
| ashby:multiplymii | 147 | 6640 | 9 | 0.06 | 0.14 |
| breezy:20four7va | 147 | 18111 | 21 | 0.14 | 0.12 |
| breezy:remote-craft | 147 | 2205 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:sourcefit | 147 | 16372 | 6 | 0.04 | 0.04 |
| breezy:time-etc | 147 | 147 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:value-virtual-assistants | 147 | 1470 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:yokly | 147 | 588 | UNKNOWN | UNKNOWN | UNKNOWN |
| greenhouse:gitlab | 147 | 36983 | 0 | 0.00 | 0.00 |
| greenhouse:grafanalabs | 147 | 20485 | 0 | 0.00 | 0.00 |
| greenhouse:nearform | 147 | 3991 | 0 | 0.00 | 0.00 |
| greenhouse:remotecom | 147 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| real-work-from-anywhere | 147 | 7350 | 30 | 0.20 | 0.41 |
| greenhouse:canonical | 146 | 46136 | UNKNOWN | UNKNOWN | UNKNOWN |
| greenhouse:ghost | 146 | 730 | UNKNOWN | UNKNOWN | UNKNOWN |
| workable:hunt-st | 105 | 13121 | 17 | 0.16 | 0.13 |
| workable:rocketams | 105 | 1030 | UNKNOWN | UNKNOWN | UNKNOWN |
| workable:coconutva | 103 | 3364 | 4 | 0.04 | 0.12 |
| workable:crewbloom | 103 | 9260 | 9 | 0.09 | 0.10 |
| workable:hello-rache | 103 | 309 | UNKNOWN | UNKNOWN | UNKNOWN |
| workable:pearltalent | 103 | 29420 | 2 | 0.02 | 0.01 |
| we-work-remotely | 83 | 8300 | 38 | 0.46 | 0.46 |
| remote-ok | 46 | 1933 | 14 | 0.30 | 0.72 |
| jobicy-supporting-apac | 25 | 1000 | 6 | 0.24 | 0.60 |
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
