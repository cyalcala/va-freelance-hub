# Source economics — latest (SP-02)

- **As of:** 2026-11-11T09:46:20.135Z
- **Windows:** 7d/14d/30d net-new by `scraped_at`
- **Reconciliation:** OK (every partition delta is zero)
- Read-only report; regenerate with `scripts/diagnostics/source-economics.ts`.

## Qualified supply (strict eligibility; first-stored proxy)

Excludes unclear/ineligible rows. Historical publication and later deactivation are not fully reconstructed.

| qualified active | qualified new 7d | per day (7d) | qualified new 30d | per day (30d) |
| ---: | ---: | ---: | ---: | ---: |
| 1694 | 160 | 22.86 | 1042 | 34.73 |

## Identity coverage (SP-01)

| total | with source_id | null source_id | coverage | active null-id |
| ---: | ---: | ---: | ---: | ---: |
| 8899 | 8899 | 0 | 100.0% | 0 |

## Net-new accepted supply

| active | net-new 7d | net-new 14d | net-new 30d |
| ---: | ---: | ---: | ---: |
| 1694 | 160 | 318 | 1042 |

## Provider-family concentration (ADR-006 §7)

- **Net-new 30d:** top family `we-work-remotely` 38.2%; top-3 66.0%.
- **Active:** top family `we-work-remotely` 28.5%; top-3 61.7%.
- `(unknown)` legacy rows are excluded from these shares.

| provider family | active | net-new 30d | net-new 7d | source ids |
| --- | ---: | ---: | ---: | --- |
| we-work-remotely | 483 | 398 | 38 | we-work-remotely |
| breezy | 345 | 126 | 27 | breezy:20four7va, breezy:sourcefit, breezy:yokly, breezy:remote-craft, breezy:value-virtual-assistants, breezy:time-etc |
| workable | 218 | 164 | 37 | workable:hunt-st, workable:crewbloom, workable:coconutva, workable:pearltalent, workable:rocketams, workable:hello-rache, workable:pineapple-staffing |
| real-work-from-anywhere | 153 | 113 | 29 | real-work-from-anywhere |
| greenhouse | 147 | 20 | 0 | greenhouse:canonical, greenhouse:solarwinds, greenhouse:gitlab, greenhouse:ghost, greenhouse:trinityparktalent, greenhouse:grafanalabs, greenhouse:janes, greenhouse:nearform, greenhouse:remotecom, greenhouse:trainingthestreet |
| ashby | 109 | 53 | 4 | ashby:multiplymii, ashby:trust-wallet, ashby:railway, ashby:scalemath, ashby:whippy, ashby:cubic3, ashby:flipper, ashby:luxor, ashby:finch, ashby:flutterflow, ashby:amplify, ashby:ashby, ashby:camunda, ashby:circulareconomysystems, ashby:foundry-for-good, ashby:getground, ashby:gradient, ashby:homera-health, ashby:molecule, ashby:payscale, ashby:supabase, ashby:the-studio, ashby:tremendous |
| lever | 84 | 84 | 0 | lever:vacancies, lever:tenna, lever:levelup, lever:nibiru, lever:applydigital, lever:brevo, lever:outsourcedstaff, lever:jetsupport, lever:willowinc, lever:gushwork, lever:parcelvision, lever:piccollage, lever:audinate, lever:alltrails, lever:90seconds, lever:beaverprocess, lever:brafton, lever:decilegroup, lever:deliverect, lever:hso, lever:lwolf, lever:repurposeglobal, lever:snappr, lever:truezerotech, lever:trustarc |
| remote-ok | 71 | 47 | 16 | remote-ok |
| jobicy | 68 | 32 | 8 | jobicy-supporting-apac, jobicy-admin-support-apac |
| remotive | 16 | 5 | 1 | remotive |
| authentic-jobs | 0 | 0 | 0 | authentic-jobs |
| dribbble | 0 | 0 | 0 | dribbble |
| himalayas | 0 | 0 | 0 | himalayas:remote-jobs |

## Supply by exact source_id

| source_id | platform | active | net-new 7d | net-new 30d | inactive |
| --- | --- | ---: | ---: | ---: | ---: |
| we-work-remotely | WeWorkRemotely | 483 | 38 | 398 | 1802 |
| breezy:20four7va | 20Four7VA | 174 | 19 | 67 | 154 |
| workable:hunt-st | Hunt St | 155 | 19 | 113 | 141 |
| real-work-from-anywhere | RealWorkFromAnywhere | 153 | 29 | 113 | 617 |
| breezy:sourcefit | Breezy/sourcefit | 131 | 8 | 54 | 179 |
| greenhouse:canonical | Canonical | 123 | 0 | 0 | 199 |
| ashby:multiplymii | Ashby/multiplymii | 76 | 4 | 20 | 15 |
| remote-ok | RemoteOK | 71 | 16 | 47 | 1249 |
| jobicy-supporting-apac | Jobicy | 61 | 7 | 28 | 153 |
| workable:crewbloom | CrewBloom | 26 | 7 | 20 | 73 |
| workable:coconutva | Coconut VA | 24 | 7 | 19 | 57 |
| lever:vacancies | Lever/vacancies | 20 | 0 | 20 | 0 |
| breezy:yokly | Yokly | 16 | 0 | 5 | 1 |
| greenhouse:solarwinds | Greenhouse/solarwinds | 16 | 0 | 16 | 0 |
| remotive | Remotive | 16 | 1 | 5 | 96 |
| breezy:remote-craft | Remote Craft | 14 | 0 | 0 | 1 |
| ashby:trust-wallet | Ashby/trust-wallet | 13 | 0 | 13 | 0 |
| workable:pearltalent | Pearl Talent | 12 | 4 | 11 | 63 |
| lever:tenna | Lever/tenna | 11 | 0 | 11 | 0 |
| breezy:value-virtual-assistants | VALUE Virtual Assistants | 10 | 0 | 0 | 1 |
| lever:levelup | Lever/levelup | 9 | 0 | 9 | 0 |
| lever:nibiru | Lever/nibiru | 8 | 0 | 8 | 0 |
| jobicy-admin-support-apac | Jobicy | 7 | 1 | 4 | 9 |
| ashby:railway | Ashby/railway | 6 | 0 | 6 | 0 |
| greenhouse:gitlab | GitLab | 6 | 0 | 3 | 649 |
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
| remotive | 165 | 791 | 0 | 0 | 0 | 2114 |
| ashby:multiplymii | 148 | 0 | 808 | 0 | 0 | 6690 |
| breezy:20four7va | 148 | 0 | 1764 | 0 | 0 | 18197 |
| breezy:remote-craft | 148 | 0 | 808 | 0 | 0 | 2220 |
| breezy:sourcefit | 148 | 0 | 808 | 0 | 0 | 16916 |
| breezy:time-etc | 148 | 0 | 808 | 0 | 0 | 148 |
| breezy:value-virtual-assistants | 148 | 0 | 808 | 0 | 0 | 1480 |
| breezy:yokly | 148 | 0 | 808 | 0 | 0 | 592 |
| greenhouse:gitlab | 148 | 0 | 808 | 0 | 0 | 36679 |
| greenhouse:grafanalabs | 148 | 0 | 808 | 0 | 0 | 19691 |
| greenhouse:nearform | 148 | 0 | 808 | 0 | 0 | 4065 |
| greenhouse:remotecom | 148 | 0 | 808 | 0 | 148 | 0 |
| greenhouse:canonical | 147 | 0 | 808 | 1 | 0 | 46442 |
| greenhouse:ghost | 147 | 0 | 808 | 1 | 0 | 735 |
| real-work-from-anywhere | 146 | 0 | 808 | 2 | 0 | 7300 |
| workable:hello-rache | 106 | 0 | 810 | 40 | 0 | 318 |
| workable:pearltalent | 106 | 0 | 810 | 40 | 0 | 30529 |
| workable:hunt-st | 104 | 0 | 810 | 42 | 0 | 13196 |
| workable:rocketams | 104 | 0 | 810 | 42 | 0 | 1017 |
| workable:coconutva | 103 | 0 | 811 | 42 | 0 | 3339 |
| workable:crewbloom | 103 | 0 | 811 | 42 | 0 | 9831 |
| we-work-remotely | 92 | 851 | 0 | 13 | 0 | 9200 |
| remote-ok | 57 | 90 | 808 | 1 | 0 | 2446 |
| jobicy-supporting-apac | 27 | 122 | 807 | 0 | 0 | 1080 |
| jobicy-admin-support-apac | 2 | 145 | 809 | 0 | 0 | 9 |
| ashby:amplify | 0 | 0 | 956 | 0 | 0 | 0 |
| ashby:ashby | 0 | 0 | 956 | 0 | 0 | 0 |
| ashby:camunda | 0 | 0 | 956 | 0 | 0 | 0 |
| ashby:circulareconomysystems | 0 | 0 | 956 | 0 | 0 | 0 |
| ashby:cubic3 | 0 | 0 | 956 | 0 | 0 | 0 |
| ashby:flipper | 0 | 0 | 956 | 0 | 0 | 0 |
| ashby:foundry-for-good | 0 | 0 | 956 | 0 | 0 | 0 |
| ashby:getground | 0 | 0 | 956 | 0 | 0 | 0 |
| ashby:gradient | 0 | 0 | 956 | 0 | 0 | 0 |
| ashby:luxor | 0 | 0 | 956 | 0 | 0 | 0 |
| ashby:molecule | 0 | 0 | 956 | 0 | 0 | 0 |
| ashby:payscale | 0 | 0 | 956 | 0 | 0 | 0 |
| ashby:railway | 0 | 0 | 956 | 0 | 0 | 0 |
| ashby:scalemath | 0 | 0 | 956 | 0 | 0 | 0 |
| ashby:supabase | 0 | 0 | 956 | 0 | 0 | 0 |
| ashby:the-studio | 0 | 0 | 956 | 0 | 0 | 0 |
| ashby:tremendous | 0 | 0 | 956 | 0 | 0 | 0 |
| ashby:trust-wallet | 0 | 0 | 956 | 0 | 0 | 0 |
| ashby:whippy | 0 | 0 | 956 | 0 | 0 | 0 |
| authentic-jobs | 0 | 0 | 956 | 0 | 0 | 0 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 956 | 0 | 0 | 0 |
| dribbble | 0 | 0 | 956 | 0 | 0 | 0 |
| jobspresso | 0 | 0 | 956 | 0 | 0 | 0 |
| lever:applydigital | 0 | 0 | 956 | 0 | 0 | 0 |
| lever:audinate | 0 | 0 | 956 | 0 | 0 | 0 |
| lever:beaverprocess | 0 | 0 | 956 | 0 | 0 | 0 |
| lever:brafton | 0 | 0 | 956 | 0 | 0 | 0 |
| lever:brevo | 0 | 0 | 956 | 0 | 0 | 0 |
| lever:decilegroup | 0 | 0 | 956 | 0 | 0 | 0 |
| lever:deliverect | 0 | 0 | 956 | 0 | 0 | 0 |
| lever:gushwork | 0 | 0 | 956 | 0 | 0 | 0 |
| lever:jetsupport | 0 | 0 | 956 | 0 | 0 | 0 |
| lever:lwolf | 0 | 0 | 956 | 0 | 0 | 0 |
| lever:nibiru | 0 | 0 | 956 | 0 | 0 | 0 |
| lever:outsourcedstaff | 0 | 0 | 956 | 0 | 0 | 0 |
| lever:parcelvision | 0 | 0 | 956 | 0 | 0 | 0 |
| lever:piccollage | 0 | 0 | 956 | 0 | 0 | 0 |
| lever:repurposeglobal | 0 | 0 | 956 | 0 | 0 | 0 |
| lever:snappr | 0 | 0 | 956 | 0 | 0 | 0 |
| lever:tenna | 0 | 0 | 956 | 0 | 0 | 0 |
| lever:truezerotech | 0 | 0 | 956 | 0 | 0 | 0 |
| lever:vacancies | 0 | 0 | 956 | 0 | 0 | 0 |
| lever:vaultoutsourcing | 0 | 0 | 956 | 0 | 0 | 0 |
| lever:willowinc | 0 | 0 | 956 | 0 | 0 | 0 |
| onlinejobs-ph | 0 | 0 | 956 | 0 | 0 | 0 |
| problogger | 0 | 0 | 956 | 0 | 0 | 0 |
| remote-co | 0 | 0 | 956 | 0 | 0 | 0 |
| workable:connectos | 0 | 0 | 956 | 0 | 0 | 0 |
| workable:global-strategic | 0 | 0 | 956 | 0 | 0 | 0 |
| workable:myoutdesk | 0 | 0 | 956 | 0 | 0 | 0 |
| workable:outsource-access | 0 | 0 | 956 | 0 | 0 | 0 |
| workable:pineapple-staffing | 0 | 0 | 956 | 0 | 0 | 0 |
| workable:staff-domain-inc | 0 | 0 | 956 | 0 | 0 | 0 |
| workable:superstaff | 0 | 0 | 956 | 0 | 0 | 0 |
| workable:virtualstaff365 | 0 | 0 | 956 | 0 | 0 | 0 |

## Geo & eligibility triage outcomes (last 7 days)

Breakdown of stored opportunities by Philippines eligibility verdict.

| source_id | eligible | unclear | ineligible | policy_rejected | total | qualified_rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 38 | 2 | 106 | 108 | 146 | 26.0% |
| real-work-from-anywhere | 29 | 5 | 5 | 10 | 39 | 74.4% |
| greenhouse:gitlab | 0 | 2 | 33 | 35 | 35 | 0.0% |
| greenhouse:grafanalabs | 0 | 0 | 30 | 30 | 30 | 0.0% |
| remote-ok | 16 | 2 | 7 | 9 | 25 | 64.0% |
| workable:hunt-st | 19 | 1 | 2 | 2 | 22 | 86.4% |
| breezy:20four7va | 19 | 0 | 0 | 0 | 19 | 100.0% |
| breezy:sourcefit | 8 | 0 | 10 | 10 | 18 | 44.4% |
| jobicy-supporting-apac | 7 | 0 | 10 | 10 | 17 | 41.2% |
| workable:crewbloom | 8 | 0 | 1 | 1 | 9 | 88.9% |
| workable:coconutva | 7 | 0 | 0 | 0 | 7 | 100.0% |
| workable:pearltalent | 4 | 0 | 3 | 3 | 7 | 57.1% |
| ashby:multiplymii | 4 | 0 | 0 | 0 | 4 | 100.0% |
| greenhouse:nearform | 0 | 0 | 4 | 4 | 4 | 0.0% |
| remotive | 1 | 0 | 3 | 3 | 4 | 25.0% |
| greenhouse:canonical | 0 | 0 | 2 | 2 | 2 | 0.0% |
| jobicy-admin-support-apac | 1 | 0 | 0 | 0 | 1 | 100.0% |
| workable:rocketams | 0 | 0 | 1 | 1 | 1 | 0.0% |

## Yield efficiency (last 7 days)

Stored eligibility per real (changed) fetch and per 100 items seen; not marginal verified first-publication yield.
UNKNOWN means a count is missing/invalid or its denominator is zero. Fetch and stored cohorts may differ across intake paths; these descriptive ratios do not establish source productivity or causal yield.

| source_id | real fetches | items seen | eligible stored | yield / fetch | yield / 100 items |
| --- | ---: | ---: | ---: | ---: | ---: |
| remotive | 165 | 2114 | 1 | 0.01 | 0.05 |
| ashby:multiplymii | 148 | 6690 | 4 | 0.03 | 0.06 |
| breezy:20four7va | 148 | 18197 | 19 | 0.13 | 0.10 |
| breezy:remote-craft | 148 | 2220 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:sourcefit | 148 | 16916 | 8 | 0.05 | 0.05 |
| breezy:time-etc | 148 | 148 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:value-virtual-assistants | 148 | 1480 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:yokly | 148 | 592 | UNKNOWN | UNKNOWN | UNKNOWN |
| greenhouse:gitlab | 148 | 36679 | 0 | 0.00 | 0.00 |
| greenhouse:grafanalabs | 148 | 19691 | 0 | 0.00 | 0.00 |
| greenhouse:nearform | 148 | 4065 | 0 | 0.00 | 0.00 |
| greenhouse:remotecom | 148 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| greenhouse:canonical | 147 | 46442 | 0 | 0.00 | 0.00 |
| greenhouse:ghost | 147 | 735 | UNKNOWN | UNKNOWN | UNKNOWN |
| real-work-from-anywhere | 146 | 7300 | 29 | 0.20 | 0.40 |
| workable:hello-rache | 106 | 318 | UNKNOWN | UNKNOWN | UNKNOWN |
| workable:pearltalent | 106 | 30529 | 4 | 0.04 | 0.01 |
| workable:hunt-st | 104 | 13196 | 19 | 0.18 | 0.14 |
| workable:rocketams | 104 | 1017 | 0 | 0.00 | 0.00 |
| workable:coconutva | 103 | 3339 | 7 | 0.07 | 0.21 |
| workable:crewbloom | 103 | 9831 | 8 | 0.08 | 0.08 |
| we-work-remotely | 92 | 9200 | 38 | 0.41 | 0.41 |
| remote-ok | 57 | 2446 | 16 | 0.28 | 0.65 |
| jobicy-supporting-apac | 27 | 1080 | 7 | 0.26 | 0.65 |
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
