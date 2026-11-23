# Source economics — latest (SP-02)

- **As of:** 2026-11-23T11:06:47.973Z
- **Windows:** 7d/14d/30d net-new by `scraped_at`
- **Reconciliation:** OK (every partition delta is zero)
- Read-only report; regenerate with `scripts/diagnostics/source-economics.ts`.

## Qualified supply (strict eligibility; first-stored proxy)

Excludes unclear/ineligible rows. Historical publication and later deactivation are not fully reconstructed.

| qualified active | qualified new 7d | per day (7d) | qualified new 30d | per day (30d) |
| ---: | ---: | ---: | ---: | ---: |
| 1853 | 521 | 74.43 | 1104 | 36.80 |

## Identity coverage (SP-01)

| total | with source_id | null source_id | coverage | active null-id |
| ---: | ---: | ---: | ---: | ---: |
| 10120 | 10120 | 0 | 100.0% | 0 |

## Net-new accepted supply

| active | net-new 7d | net-new 14d | net-new 30d |
| ---: | ---: | ---: | ---: |
| 1853 | 521 | 681 | 1104 |

## Provider-family concentration (ADR-006 §7)

- **Net-new 30d:** top family `we-work-remotely` 56.8% ⚠️ >40%; top-3 77.6% ⚠️ >70%.
- **Active:** top family `we-work-remotely` 39.2%; top-3 70.0%.
- `(unknown)` legacy rows are excluded from these shares.

| provider family | active | net-new 30d | net-new 7d | source ids |
| --- | ---: | ---: | ---: | --- |
| we-work-remotely | 726 | 627 | 410 | we-work-remotely |
| breezy | 338 | 94 | 19 | breezy:20four7va, breezy:sourcefit, breezy:remote-craft, breezy:value-virtual-assistants, breezy:yokly, breezy:time-etc |
| workable | 233 | 128 | 36 | workable:hunt-st, workable:coconutva, workable:crewbloom, workable:pearltalent, workable:rocketams, workable:hello-rache, workable:pineapple-staffing |
| real-work-from-anywhere | 146 | 102 | 25 | real-work-from-anywhere |
| greenhouse | 130 | 2 | 2 | greenhouse:canonical, greenhouse:gitlab, greenhouse:ghost, greenhouse:grafanalabs, greenhouse:janes, greenhouse:nearform, greenhouse:remotecom, greenhouse:solarwinds, greenhouse:trainingthestreet, greenhouse:trinityparktalent |
| ashby | 96 | 40 | 1 | ashby:multiplymii, ashby:trust-wallet, ashby:scalemath, ashby:whippy, ashby:cubic3, ashby:flutterflow, ashby:amplify, ashby:ashby, ashby:camunda, ashby:circulareconomysystems, ashby:finch, ashby:flipper, ashby:foundry-for-good, ashby:getground, ashby:gradient, ashby:homera-health, ashby:luxor, ashby:molecule, ashby:payscale, ashby:railway, ashby:supabase, ashby:the-studio, ashby:tremendous |
| remote-ok | 74 | 50 | 21 | remote-ok |
| jobicy | 66 | 25 | 7 | jobicy-supporting-apac, jobicy-admin-support-apac |
| lever | 32 | 32 | 0 | lever:levelup, lever:nibiru, lever:brevo, lever:jetsupport, lever:piccollage, lever:audinate, lever:alltrails, lever:90seconds, lever:applydigital, lever:beaverprocess, lever:brafton, lever:decilegroup, lever:deliverect, lever:gushwork, lever:hso, lever:lwolf, lever:outsourcedstaff, lever:parcelvision, lever:repurposeglobal, lever:snappr, lever:tenna, lever:truezerotech, lever:trustarc, lever:vacancies, lever:willowinc |
| remotive | 12 | 4 | 0 | remotive |
| authentic-jobs | 0 | 0 | 0 | authentic-jobs |
| dribbble | 0 | 0 | 0 | dribbble |
| himalayas | 0 | 0 | 0 | himalayas:remote-jobs |

## Supply by exact source_id

| source_id | platform | active | net-new 7d | net-new 30d | inactive |
| --- | --- | ---: | ---: | ---: | ---: |
| we-work-remotely | WeWorkRemotely | 726 | 410 | 627 | 2330 |
| breezy:20four7va | 20Four7VA | 181 | 9 | 58 | 164 |
| workable:hunt-st | Hunt St | 163 | 27 | 84 | 174 |
| real-work-from-anywhere | RealWorkFromAnywhere | 146 | 25 | 102 | 683 |
| breezy:sourcefit | Breezy/sourcefit | 124 | 8 | 33 | 203 |
| greenhouse:canonical | Canonical | 122 | 1 | 1 | 204 |
| ashby:multiplymii | Ashby/multiplymii | 74 | 1 | 18 | 26 |
| remote-ok | RemoteOK | 74 | 21 | 50 | 1408 |
| jobicy-supporting-apac | Jobicy | 59 | 7 | 23 | 175 |
| workable:coconutva | Coconut VA | 27 | 5 | 14 | 59 |
| workable:crewbloom | CrewBloom | 27 | 2 | 21 | 82 |
| workable:pearltalent | Pearl Talent | 15 | 2 | 9 | 74 |
| breezy:remote-craft | Remote Craft | 14 | 0 | 0 | 1 |
| ashby:trust-wallet | Ashby/trust-wallet | 13 | 0 | 13 | 0 |
| remotive | Remotive | 12 | 0 | 4 | 103 |
| breezy:value-virtual-assistants | VALUE Virtual Assistants | 10 | 0 | 0 | 1 |
| breezy:yokly | Yokly | 9 | 2 | 3 | 10 |
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
| we-work-remotely | 258 | 630 | 0 | 17 | 0 | 25227 |
| remotive | 158 | 747 | 0 | 0 | 0 | 2529 |
| real-work-from-anywhere | 143 | 0 | 762 | 0 | 0 | 7150 |
| ashby:multiplymii | 141 | 0 | 764 | 0 | 0 | 6245 |
| breezy:20four7va | 141 | 0 | 1669 | 0 | 0 | 16948 |
| breezy:remote-craft | 141 | 0 | 764 | 0 | 0 | 2115 |
| breezy:sourcefit | 141 | 0 | 764 | 0 | 0 | 14397 |
| breezy:time-etc | 141 | 0 | 764 | 0 | 0 | 141 |
| breezy:value-virtual-assistants | 141 | 0 | 764 | 0 | 0 | 1410 |
| breezy:yokly | 141 | 0 | 764 | 0 | 0 | 761 |
| greenhouse:canonical | 141 | 0 | 764 | 0 | 0 | 44707 |
| greenhouse:ghost | 141 | 0 | 764 | 0 | 0 | 705 |
| greenhouse:gitlab | 141 | 0 | 764 | 0 | 0 | 35062 |
| greenhouse:grafanalabs | 141 | 0 | 764 | 0 | 0 | 19404 |
| greenhouse:nearform | 141 | 0 | 764 | 0 | 0 | 3300 |
| greenhouse:remotecom | 141 | 0 | 764 | 0 | 141 | 0 |
| workable:pearltalent | 85 | 0 | 767 | 53 | 0 | 25348 |
| workable:hello-rache | 84 | 0 | 767 | 54 | 0 | 252 |
| workable:coconutva | 83 | 0 | 766 | 56 | 0 | 2694 |
| workable:crewbloom | 83 | 0 | 766 | 56 | 0 | 7054 |
| workable:hunt-st | 81 | 0 | 766 | 58 | 0 | 10067 |
| workable:rocketams | 81 | 0 | 766 | 58 | 0 | 648 |
| remote-ok | 68 | 74 | 762 | 1 | 0 | 3013 |
| jobicy-supporting-apac | 31 | 108 | 764 | 2 | 0 | 1240 |
| jobicy-admin-support-apac | 5 | 132 | 765 | 3 | 0 | 24 |
| ashby:amplify | 0 | 0 | 905 | 0 | 0 | 0 |
| ashby:ashby | 0 | 0 | 905 | 0 | 0 | 0 |
| ashby:camunda | 0 | 0 | 905 | 0 | 0 | 0 |
| ashby:circulareconomysystems | 0 | 0 | 905 | 0 | 0 | 0 |
| ashby:cubic3 | 0 | 0 | 905 | 0 | 0 | 0 |
| ashby:flipper | 0 | 0 | 905 | 0 | 0 | 0 |
| ashby:foundry-for-good | 0 | 0 | 905 | 0 | 0 | 0 |
| ashby:getground | 0 | 0 | 905 | 0 | 0 | 0 |
| ashby:gradient | 0 | 0 | 905 | 0 | 0 | 0 |
| ashby:luxor | 0 | 0 | 905 | 0 | 0 | 0 |
| ashby:molecule | 0 | 0 | 905 | 0 | 0 | 0 |
| ashby:payscale | 0 | 0 | 905 | 0 | 0 | 0 |
| ashby:railway | 0 | 0 | 905 | 0 | 0 | 0 |
| ashby:scalemath | 0 | 0 | 905 | 0 | 0 | 0 |
| ashby:supabase | 0 | 0 | 905 | 0 | 0 | 0 |
| ashby:the-studio | 0 | 0 | 905 | 0 | 0 | 0 |
| ashby:tremendous | 0 | 0 | 905 | 0 | 0 | 0 |
| ashby:trust-wallet | 0 | 0 | 905 | 0 | 0 | 0 |
| ashby:whippy | 0 | 0 | 905 | 0 | 0 | 0 |
| authentic-jobs | 0 | 0 | 905 | 0 | 0 | 0 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 905 | 0 | 0 | 0 |
| dribbble | 0 | 0 | 905 | 0 | 0 | 0 |
| jobspresso | 0 | 0 | 905 | 0 | 0 | 0 |
| lever:applydigital | 0 | 0 | 905 | 0 | 0 | 0 |
| lever:audinate | 0 | 0 | 905 | 0 | 0 | 0 |
| lever:beaverprocess | 0 | 0 | 905 | 0 | 0 | 0 |
| lever:brafton | 0 | 0 | 905 | 0 | 0 | 0 |
| lever:brevo | 0 | 0 | 905 | 0 | 0 | 0 |
| lever:decilegroup | 0 | 0 | 905 | 0 | 0 | 0 |
| lever:deliverect | 0 | 0 | 905 | 0 | 0 | 0 |
| lever:gushwork | 0 | 0 | 905 | 0 | 0 | 0 |
| lever:jetsupport | 0 | 0 | 905 | 0 | 0 | 0 |
| lever:lwolf | 0 | 0 | 905 | 0 | 0 | 0 |
| lever:nibiru | 0 | 0 | 905 | 0 | 0 | 0 |
| lever:outsourcedstaff | 0 | 0 | 905 | 0 | 0 | 0 |
| lever:parcelvision | 0 | 0 | 905 | 0 | 0 | 0 |
| lever:piccollage | 0 | 0 | 905 | 0 | 0 | 0 |
| lever:repurposeglobal | 0 | 0 | 905 | 0 | 0 | 0 |
| lever:snappr | 0 | 0 | 905 | 0 | 0 | 0 |
| lever:tenna | 0 | 0 | 905 | 0 | 0 | 0 |
| lever:truezerotech | 0 | 0 | 905 | 0 | 0 | 0 |
| lever:vacancies | 0 | 0 | 905 | 0 | 0 | 0 |
| lever:vaultoutsourcing | 0 | 0 | 905 | 0 | 0 | 0 |
| lever:willowinc | 0 | 0 | 905 | 0 | 0 | 0 |
| onlinejobs-ph | 0 | 0 | 905 | 0 | 0 | 0 |
| problogger | 0 | 0 | 905 | 0 | 0 | 0 |
| remote-co | 0 | 0 | 905 | 0 | 0 | 0 |
| workable:connectos | 0 | 0 | 905 | 0 | 0 | 0 |
| workable:global-strategic | 0 | 0 | 905 | 0 | 0 | 0 |
| workable:myoutdesk | 0 | 0 | 905 | 0 | 0 | 0 |
| workable:outsource-access | 0 | 0 | 905 | 0 | 0 | 0 |
| workable:pineapple-staffing | 0 | 0 | 905 | 0 | 0 | 0 |
| workable:staff-domain-inc | 0 | 0 | 905 | 0 | 0 | 0 |
| workable:superstaff | 0 | 0 | 905 | 0 | 0 | 0 |
| workable:virtualstaff365 | 0 | 0 | 905 | 0 | 0 | 0 |

## Geo & eligibility triage outcomes (last 7 days)

Breakdown of stored opportunities by Philippines eligibility verdict.

| source_id | eligible | unclear | ineligible | policy_rejected | total | qualified_rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 410 | 0 | 225 | 225 | 635 | 64.6% |
| remote-ok | 21 | 5 | 129 | 134 | 155 | 13.5% |
| greenhouse:gitlab | 1 | 0 | 31 | 31 | 32 | 3.1% |
| workable:hunt-st | 27 | 5 | 0 | 0 | 32 | 84.4% |
| real-work-from-anywhere | 27 | 3 | 1 | 4 | 31 | 87.1% |
| greenhouse:grafanalabs | 0 | 0 | 19 | 19 | 19 | 0.0% |
| jobicy-supporting-apac | 7 | 0 | 9 | 9 | 16 | 43.8% |
| workable:pearltalent | 2 | 0 | 10 | 10 | 12 | 16.7% |
| breezy:sourcefit | 8 | 0 | 3 | 3 | 11 | 72.7% |
| breezy:20four7va | 9 | 0 | 0 | 0 | 9 | 100.0% |
| workable:coconutva | 5 | 0 | 0 | 0 | 5 | 100.0% |
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
| we-work-remotely | 258 | 25227 | 410 | 1.59 | 1.63 |
| remotive | 158 | 2529 | 0 | 0.00 | 0.00 |
| real-work-from-anywhere | 143 | 7150 | 27 | 0.19 | 0.38 |
| ashby:multiplymii | 141 | 6245 | 1 | 0.01 | 0.02 |
| breezy:20four7va | 141 | 16948 | 9 | 0.06 | 0.05 |
| breezy:remote-craft | 141 | 2115 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:sourcefit | 141 | 14397 | 8 | 0.06 | 0.06 |
| breezy:time-etc | 141 | 141 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:value-virtual-assistants | 141 | 1410 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:yokly | 141 | 761 | 2 | 0.01 | 0.26 |
| greenhouse:canonical | 141 | 44707 | 1 | 0.01 | 0.00 |
| greenhouse:ghost | 141 | 705 | UNKNOWN | UNKNOWN | UNKNOWN |
| greenhouse:gitlab | 141 | 35062 | 1 | 0.01 | 0.00 |
| greenhouse:grafanalabs | 141 | 19404 | 0 | 0.00 | 0.00 |
| greenhouse:nearform | 141 | 3300 | UNKNOWN | UNKNOWN | UNKNOWN |
| greenhouse:remotecom | 141 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| workable:pearltalent | 85 | 25348 | 2 | 0.02 | 0.01 |
| workable:hello-rache | 84 | 252 | UNKNOWN | UNKNOWN | UNKNOWN |
| workable:coconutva | 83 | 2694 | 5 | 0.06 | 0.19 |
| workable:crewbloom | 83 | 7054 | 2 | 0.02 | 0.03 |
| workable:hunt-st | 81 | 10067 | 27 | 0.33 | 0.27 |
| workable:rocketams | 81 | 648 | UNKNOWN | UNKNOWN | UNKNOWN |
| remote-ok | 68 | 3013 | 21 | 0.31 | 0.70 |
| jobicy-supporting-apac | 31 | 1240 | 7 | 0.23 | 0.56 |
| jobicy-admin-support-apac | 5 | 24 | UNKNOWN | UNKNOWN | UNKNOWN |
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
