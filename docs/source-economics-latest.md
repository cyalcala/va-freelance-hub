# Source economics — latest (SP-02)

- **As of:** 2026-11-07T09:08:23.221Z
- **Windows:** 7d/14d/30d net-new by `scraped_at`
- **Reconciliation:** OK (every partition delta is zero)
- Read-only report; regenerate with `scripts/diagnostics/source-economics.ts`.

## Qualified supply (strict eligibility; first-stored proxy)

Excludes unclear/ineligible rows. Historical publication and later deactivation are not fully reconstructed.

| qualified active | qualified new 7d | per day (7d) | qualified new 30d | per day (30d) |
| ---: | ---: | ---: | ---: | ---: |
| 1721 | 153 | 21.86 | 1052 | 35.07 |

## Identity coverage (SP-01)

| total | with source_id | null source_id | coverage | active null-id |
| ---: | ---: | ---: | ---: | ---: |
| 8724 | 8724 | 0 | 100.0% | 0 |

## Net-new accepted supply

| active | net-new 7d | net-new 14d | net-new 30d |
| ---: | ---: | ---: | ---: |
| 1721 | 153 | 411 | 1052 |

## Provider-family concentration (ADR-006 §7)

- **Net-new 30d:** top family `we-work-remotely` 41.5% ⚠️ >40%; top-3 67.3%.
- **Active:** top family `we-work-remotely` 31.6%; top-3 63.2%.
- `(unknown)` legacy rows are excluded from these shares.

| provider family | active | net-new 30d | net-new 7d | source ids |
| --- | ---: | ---: | ---: | --- |
| we-work-remotely | 543 | 437 | 59 | we-work-remotely |
| breezy | 346 | 121 | 30 | breezy:20four7va, breezy:sourcefit, breezy:yokly, breezy:remote-craft, breezy:value-virtual-assistants, breezy:time-etc |
| workable | 199 | 150 | 22 | workable:hunt-st, workable:crewbloom, workable:coconutva, workable:pearltalent, workable:rocketams, workable:hello-rache, workable:pineapple-staffing |
| greenhouse | 149 | 22 | 0 | greenhouse:canonical, greenhouse:solarwinds, greenhouse:gitlab, greenhouse:janes, greenhouse:ghost, greenhouse:trinityparktalent, greenhouse:grafanalabs, greenhouse:nearform, greenhouse:remotecom, greenhouse:trainingthestreet |
| real-work-from-anywhere | 145 | 108 | 21 | real-work-from-anywhere |
| ashby | 110 | 55 | 4 | ashby:multiplymii, ashby:trust-wallet, ashby:railway, ashby:scalemath, ashby:whippy, ashby:cubic3, ashby:flipper, ashby:luxor, ashby:finch, ashby:flutterflow, ashby:amplify, ashby:ashby, ashby:camunda, ashby:circulareconomysystems, ashby:foundry-for-good, ashby:getground, ashby:gradient, ashby:homera-health, ashby:molecule, ashby:payscale, ashby:supabase, ashby:the-studio, ashby:tremendous |
| lever | 84 | 84 | 0 | lever:vacancies, lever:tenna, lever:levelup, lever:nibiru, lever:applydigital, lever:brevo, lever:outsourcedstaff, lever:jetsupport, lever:willowinc, lever:gushwork, lever:parcelvision, lever:piccollage, lever:audinate, lever:alltrails, lever:90seconds, lever:beaverprocess, lever:brafton, lever:decilegroup, lever:deliverect, lever:hso, lever:lwolf, lever:repurposeglobal, lever:snappr, lever:truezerotech, lever:trustarc |
| remote-ok | 68 | 45 | 13 | remote-ok |
| jobicy | 62 | 26 | 4 | jobicy-supporting-apac, jobicy-admin-support-apac |
| remotive | 15 | 4 | 0 | remotive |
| authentic-jobs | 0 | 0 | 0 | authentic-jobs |
| dribbble | 0 | 0 | 0 | dribbble |
| himalayas | 0 | 0 | 0 | himalayas:remote-jobs |

## Supply by exact source_id

| source_id | platform | active | net-new 7d | net-new 30d | inactive |
| --- | --- | ---: | ---: | ---: | ---: |
| we-work-remotely | WeWorkRemotely | 543 | 59 | 437 | 1673 |
| breezy:20four7va | 20Four7VA | 169 | 20 | 62 | 151 |
| real-work-from-anywhere | RealWorkFromAnywhere | 145 | 21 | 108 | 608 |
| workable:hunt-st | Hunt St | 145 | 10 | 108 | 139 |
| breezy:sourcefit | Breezy/sourcefit | 137 | 10 | 54 | 169 |
| greenhouse:canonical | Canonical | 123 | 0 | 0 | 199 |
| ashby:multiplymii | Ashby/multiplymii | 77 | 4 | 22 | 12 |
| remote-ok | RemoteOK | 68 | 13 | 45 | 1240 |
| jobicy-supporting-apac | Jobicy | 56 | 4 | 23 | 148 |
| workable:crewbloom | CrewBloom | 22 | 4 | 16 | 71 |
| workable:coconutva | Coconut VA | 21 | 6 | 16 | 57 |
| lever:vacancies | Lever/vacancies | 20 | 0 | 20 | 0 |
| breezy:yokly | Yokly | 16 | 0 | 5 | 1 |
| greenhouse:solarwinds | Greenhouse/solarwinds | 16 | 0 | 16 | 0 |
| remotive | Remotive | 15 | 0 | 4 | 95 |
| breezy:remote-craft | Remote Craft | 14 | 0 | 0 | 1 |
| ashby:trust-wallet | Ashby/trust-wallet | 13 | 0 | 13 | 0 |
| lever:tenna | Lever/tenna | 11 | 0 | 11 | 0 |
| breezy:value-virtual-assistants | VALUE Virtual Assistants | 10 | 0 | 0 | 1 |
| workable:pearltalent | Pearl Talent | 10 | 2 | 9 | 61 |
| lever:levelup | Lever/levelup | 9 | 0 | 9 | 0 |
| lever:nibiru | Lever/nibiru | 8 | 0 | 8 | 0 |
| ashby:railway | Ashby/railway | 6 | 0 | 6 | 0 |
| greenhouse:gitlab | GitLab | 6 | 0 | 3 | 637 |
| jobicy-admin-support-apac | Jobicy | 6 | 0 | 3 | 9 |
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
| greenhouse:janes | Greenhouse/janes | 2 | 0 | 2 | 0 |
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
| greenhouse:grafanalabs | Grafana Labs | 0 | 0 | 0 | 420 |
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
| remotive | 167 | 813 | 0 | 0 | 0 | 1984 |
| breezy:20four7va | 152 | 0 | 1808 | 0 | 0 | 18515 |
| greenhouse:ghost | 152 | 0 | 828 | 0 | 0 | 760 |
| greenhouse:gitlab | 152 | 0 | 828 | 0 | 0 | 36575 |
| greenhouse:grafanalabs | 152 | 0 | 828 | 0 | 0 | 18987 |
| greenhouse:nearform | 152 | 0 | 828 | 0 | 0 | 3888 |
| greenhouse:remotecom | 152 | 0 | 828 | 0 | 152 | 0 |
| ashby:multiplymii | 151 | 0 | 829 | 0 | 0 | 6980 |
| breezy:remote-craft | 151 | 0 | 829 | 0 | 0 | 2265 |
| breezy:sourcefit | 151 | 0 | 829 | 0 | 0 | 16745 |
| breezy:time-etc | 151 | 0 | 829 | 0 | 0 | 151 |
| breezy:value-virtual-assistants | 151 | 0 | 829 | 0 | 0 | 1510 |
| breezy:yokly | 151 | 0 | 829 | 0 | 0 | 604 |
| greenhouse:canonical | 151 | 0 | 829 | 0 | 0 | 47534 |
| real-work-from-anywhere | 150 | 0 | 827 | 3 | 0 | 7500 |
| we-work-remotely | 142 | 829 | 0 | 9 | 0 | 14190 |
| workable:hunt-st | 114 | 0 | 830 | 36 | 0 | 15357 |
| workable:hello-rache | 113 | 0 | 830 | 37 | 0 | 339 |
| workable:pearltalent | 113 | 0 | 830 | 37 | 0 | 33001 |
| workable:rocketams | 113 | 0 | 830 | 37 | 0 | 1107 |
| workable:coconutva | 111 | 0 | 830 | 39 | 0 | 3424 |
| workable:crewbloom | 111 | 0 | 830 | 39 | 0 | 11176 |
| remote-ok | 52 | 100 | 827 | 1 | 0 | 2327 |
| jobicy-supporting-apac | 21 | 131 | 828 | 0 | 0 | 840 |
| jobicy-admin-support-apac | 1 | 152 | 827 | 0 | 0 | 4 |
| ashby:amplify | 0 | 0 | 980 | 0 | 0 | 0 |
| ashby:ashby | 0 | 0 | 980 | 0 | 0 | 0 |
| ashby:camunda | 0 | 0 | 980 | 0 | 0 | 0 |
| ashby:circulareconomysystems | 0 | 0 | 980 | 0 | 0 | 0 |
| ashby:cubic3 | 0 | 0 | 980 | 0 | 0 | 0 |
| ashby:flipper | 0 | 0 | 980 | 0 | 0 | 0 |
| ashby:foundry-for-good | 0 | 0 | 980 | 0 | 0 | 0 |
| ashby:getground | 0 | 0 | 980 | 0 | 0 | 0 |
| ashby:gradient | 0 | 0 | 980 | 0 | 0 | 0 |
| ashby:luxor | 0 | 0 | 980 | 0 | 0 | 0 |
| ashby:molecule | 0 | 0 | 980 | 0 | 0 | 0 |
| ashby:payscale | 0 | 0 | 980 | 0 | 0 | 0 |
| ashby:railway | 0 | 0 | 980 | 0 | 0 | 0 |
| ashby:scalemath | 0 | 0 | 980 | 0 | 0 | 0 |
| ashby:supabase | 0 | 0 | 980 | 0 | 0 | 0 |
| ashby:the-studio | 0 | 0 | 980 | 0 | 0 | 0 |
| ashby:tremendous | 0 | 0 | 980 | 0 | 0 | 0 |
| ashby:trust-wallet | 0 | 0 | 980 | 0 | 0 | 0 |
| ashby:whippy | 0 | 0 | 980 | 0 | 0 | 0 |
| authentic-jobs | 0 | 0 | 980 | 0 | 0 | 0 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 980 | 0 | 0 | 0 |
| dribbble | 0 | 0 | 980 | 0 | 0 | 0 |
| jobspresso | 0 | 0 | 980 | 0 | 0 | 0 |
| lever:applydigital | 0 | 0 | 980 | 0 | 0 | 0 |
| lever:audinate | 0 | 0 | 980 | 0 | 0 | 0 |
| lever:beaverprocess | 0 | 0 | 980 | 0 | 0 | 0 |
| lever:brafton | 0 | 0 | 980 | 0 | 0 | 0 |
| lever:brevo | 0 | 0 | 980 | 0 | 0 | 0 |
| lever:decilegroup | 0 | 0 | 980 | 0 | 0 | 0 |
| lever:deliverect | 0 | 0 | 980 | 0 | 0 | 0 |
| lever:gushwork | 0 | 0 | 980 | 0 | 0 | 0 |
| lever:jetsupport | 0 | 0 | 980 | 0 | 0 | 0 |
| lever:lwolf | 0 | 0 | 980 | 0 | 0 | 0 |
| lever:nibiru | 0 | 0 | 980 | 0 | 0 | 0 |
| lever:outsourcedstaff | 0 | 0 | 980 | 0 | 0 | 0 |
| lever:parcelvision | 0 | 0 | 980 | 0 | 0 | 0 |
| lever:piccollage | 0 | 0 | 980 | 0 | 0 | 0 |
| lever:repurposeglobal | 0 | 0 | 980 | 0 | 0 | 0 |
| lever:snappr | 0 | 0 | 980 | 0 | 0 | 0 |
| lever:tenna | 0 | 0 | 980 | 0 | 0 | 0 |
| lever:truezerotech | 0 | 0 | 980 | 0 | 0 | 0 |
| lever:vacancies | 0 | 0 | 980 | 0 | 0 | 0 |
| lever:vaultoutsourcing | 0 | 0 | 980 | 0 | 0 | 0 |
| lever:willowinc | 0 | 0 | 980 | 0 | 0 | 0 |
| onlinejobs-ph | 0 | 0 | 980 | 0 | 0 | 0 |
| problogger | 0 | 0 | 980 | 0 | 0 | 0 |
| remote-co | 0 | 0 | 980 | 0 | 0 | 0 |
| workable:connectos | 0 | 0 | 980 | 0 | 0 | 0 |
| workable:global-strategic | 0 | 0 | 980 | 0 | 0 | 0 |
| workable:myoutdesk | 0 | 0 | 980 | 0 | 0 | 0 |
| workable:outsource-access | 0 | 0 | 980 | 0 | 0 | 0 |
| workable:pineapple-staffing | 0 | 0 | 980 | 0 | 0 | 0 |
| workable:staff-domain-inc | 0 | 0 | 980 | 0 | 0 | 0 |
| workable:superstaff | 0 | 0 | 980 | 0 | 0 | 0 |
| workable:virtualstaff365 | 0 | 0 | 980 | 0 | 0 | 0 |

## Geo & eligibility triage outcomes (last 7 days)

Breakdown of stored opportunities by Philippines eligibility verdict.

| source_id | eligible | unclear | ineligible | policy_rejected | total | qualified_rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 59 | 2 | 75 | 77 | 136 | 43.4% |
| greenhouse:gitlab | 0 | 1 | 35 | 36 | 36 | 0.0% |
| greenhouse:grafanalabs | 0 | 0 | 28 | 28 | 28 | 0.0% |
| real-work-from-anywhere | 21 | 2 | 5 | 7 | 28 | 75.0% |
| remote-ok | 13 | 3 | 8 | 11 | 24 | 54.2% |
| breezy:20four7va | 20 | 0 | 0 | 0 | 20 | 100.0% |
| breezy:sourcefit | 10 | 0 | 8 | 8 | 18 | 55.6% |
| jobicy-supporting-apac | 4 | 0 | 14 | 14 | 18 | 22.2% |
| workable:hunt-st | 10 | 1 | 2 | 2 | 13 | 76.9% |
| greenhouse:nearform | 0 | 0 | 6 | 6 | 6 | 0.0% |
| workable:coconutva | 6 | 0 | 0 | 0 | 6 | 100.0% |
| workable:crewbloom | 4 | 0 | 1 | 1 | 5 | 80.0% |
| ashby:multiplymii | 4 | 0 | 0 | 0 | 4 | 100.0% |
| workable:pearltalent | 2 | 0 | 2 | 2 | 4 | 50.0% |
| greenhouse:canonical | 0 | 0 | 2 | 2 | 2 | 0.0% |
| remotive | 0 | 0 | 2 | 2 | 2 | 0.0% |
| workable:rocketams | 0 | 0 | 1 | 1 | 1 | 0.0% |

## Yield efficiency (last 7 days)

Stored eligibility per real (changed) fetch and per 100 items seen; not marginal verified first-publication yield.
UNKNOWN means a count is missing/invalid or its denominator is zero. Fetch and stored cohorts may differ across intake paths; these descriptive ratios do not establish source productivity or causal yield.

| source_id | real fetches | items seen | eligible stored | yield / fetch | yield / 100 items |
| --- | ---: | ---: | ---: | ---: | ---: |
| remotive | 167 | 1984 | 0 | 0.00 | 0.00 |
| breezy:20four7va | 152 | 18515 | 20 | 0.13 | 0.11 |
| greenhouse:ghost | 152 | 760 | UNKNOWN | UNKNOWN | UNKNOWN |
| greenhouse:gitlab | 152 | 36575 | 0 | 0.00 | 0.00 |
| greenhouse:grafanalabs | 152 | 18987 | 0 | 0.00 | 0.00 |
| greenhouse:nearform | 152 | 3888 | 0 | 0.00 | 0.00 |
| greenhouse:remotecom | 152 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:multiplymii | 151 | 6980 | 4 | 0.03 | 0.06 |
| breezy:remote-craft | 151 | 2265 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:sourcefit | 151 | 16745 | 10 | 0.07 | 0.06 |
| breezy:time-etc | 151 | 151 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:value-virtual-assistants | 151 | 1510 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:yokly | 151 | 604 | UNKNOWN | UNKNOWN | UNKNOWN |
| greenhouse:canonical | 151 | 47534 | 0 | 0.00 | 0.00 |
| real-work-from-anywhere | 150 | 7500 | 21 | 0.14 | 0.28 |
| we-work-remotely | 142 | 14190 | 59 | 0.42 | 0.42 |
| workable:hunt-st | 114 | 15357 | 10 | 0.09 | 0.07 |
| workable:hello-rache | 113 | 339 | UNKNOWN | UNKNOWN | UNKNOWN |
| workable:pearltalent | 113 | 33001 | 2 | 0.02 | 0.01 |
| workable:rocketams | 113 | 1107 | 0 | 0.00 | 0.00 |
| workable:coconutva | 111 | 3424 | 6 | 0.05 | 0.18 |
| workable:crewbloom | 111 | 11176 | 4 | 0.04 | 0.04 |
| remote-ok | 52 | 2327 | 13 | 0.25 | 0.56 |
| jobicy-supporting-apac | 21 | 840 | 4 | 0.19 | 0.48 |
| jobicy-admin-support-apac | 1 | 4 | UNKNOWN | UNKNOWN | UNKNOWN |
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
