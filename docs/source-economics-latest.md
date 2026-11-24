# Source economics — latest (SP-02)

- **As of:** 2026-11-24T12:51:42.007Z
- **Windows:** 7d/14d/30d net-new by `scraped_at`
- **Reconciliation:** OK (every partition delta is zero)
- Read-only report; regenerate with `scripts/diagnostics/source-economics.ts`.

## Qualified supply (strict eligibility; first-stored proxy)

Excludes unclear/ineligible rows. Historical publication and later deactivation are not fully reconstructed.

| qualified active | qualified new 7d | per day (7d) | qualified new 30d | per day (30d) |
| ---: | ---: | ---: | ---: | ---: |
| 1880 | 594 | 84.86 | 1134 | 37.80 |

## Identity coverage (SP-01)

| total | with source_id | null source_id | coverage | active null-id |
| ---: | ---: | ---: | ---: | ---: |
| 10284 | 10284 | 0 | 100.0% | 0 |

## Net-new accepted supply

| active | net-new 7d | net-new 14d | net-new 30d |
| ---: | ---: | ---: | ---: |
| 1880 | 594 | 752 | 1134 |

## Provider-family concentration (ADR-006 §7)

- **Net-new 30d:** top family `we-work-remotely` 60.4% ⚠️ >40%; top-3 81.9% ⚠️ >70%.
- **Active:** top family `we-work-remotely` 41.4% ⚠️ >40%; top-3 72.8% ⚠️ >70%.
- `(unknown)` legacy rows are excluded from these shares.

| provider family | active | net-new 30d | net-new 7d | source ids |
| --- | ---: | ---: | ---: | --- |
| we-work-remotely | 779 | 685 | 472 | we-work-remotely |
| breezy | 348 | 104 | 28 | breezy:20four7va, breezy:sourcefit, breezy:remote-craft, breezy:value-virtual-assistants, breezy:yokly, breezy:time-etc |
| workable | 242 | 138 | 34 | workable:hunt-st, workable:crewbloom, workable:coconutva, workable:pearltalent, workable:rocketams, workable:hello-rache, workable:pineapple-staffing |
| real-work-from-anywhere | 150 | 106 | 28 | real-work-from-anywhere |
| greenhouse | 130 | 2 | 1 | greenhouse:canonical, greenhouse:gitlab, greenhouse:ghost, greenhouse:grafanalabs, greenhouse:janes, greenhouse:nearform, greenhouse:remotecom, greenhouse:solarwinds, greenhouse:trainingthestreet, greenhouse:trinityparktalent |
| ashby | 77 | 20 | 3 | ashby:multiplymii, ashby:flutterflow, ashby:amplify, ashby:ashby, ashby:camunda, ashby:circulareconomysystems, ashby:cubic3, ashby:finch, ashby:flipper, ashby:foundry-for-good, ashby:getground, ashby:gradient, ashby:homera-health, ashby:luxor, ashby:molecule, ashby:payscale, ashby:railway, ashby:scalemath, ashby:supabase, ashby:the-studio, ashby:tremendous, ashby:trust-wallet, ashby:whippy |
| remote-ok | 74 | 47 | 21 | remote-ok |
| jobicy | 65 | 25 | 7 | jobicy-supporting-apac, jobicy-admin-support-apac |
| remotive | 12 | 4 | 0 | remotive |
| lever | 3 | 3 | 0 | lever:piccollage, lever:90seconds, lever:alltrails, lever:applydigital, lever:audinate, lever:beaverprocess, lever:brafton, lever:brevo, lever:decilegroup, lever:deliverect, lever:gushwork, lever:hso, lever:jetsupport, lever:levelup, lever:lwolf, lever:nibiru, lever:outsourcedstaff, lever:parcelvision, lever:repurposeglobal, lever:snappr, lever:tenna, lever:truezerotech, lever:trustarc, lever:vacancies, lever:willowinc |
| authentic-jobs | 0 | 0 | 0 | authentic-jobs |
| dribbble | 0 | 0 | 0 | dribbble |
| himalayas | 0 | 0 | 0 | himalayas:remote-jobs |

## Supply by exact source_id

| source_id | platform | active | net-new 7d | net-new 30d | inactive |
| --- | --- | ---: | ---: | ---: | ---: |
| we-work-remotely | WeWorkRemotely | 779 | 472 | 685 | 2390 |
| breezy:20four7va | 20Four7VA | 186 | 13 | 63 | 164 |
| workable:hunt-st | Hunt St | 170 | 23 | 92 | 171 |
| real-work-from-anywhere | RealWorkFromAnywhere | 150 | 28 | 106 | 687 |
| breezy:sourcefit | Breezy/sourcefit | 128 | 12 | 37 | 205 |
| greenhouse:canonical | Canonical | 122 | 0 | 1 | 204 |
| ashby:multiplymii | Ashby/multiplymii | 76 | 3 | 20 | 26 |
| remote-ok | RemoteOK | 74 | 21 | 47 | 1413 |
| jobicy-supporting-apac | Jobicy | 59 | 7 | 23 | 177 |
| workable:crewbloom | CrewBloom | 28 | 3 | 22 | 82 |
| workable:coconutva | Coconut VA | 27 | 5 | 14 | 59 |
| workable:pearltalent | Pearl Talent | 16 | 3 | 10 | 78 |
| breezy:remote-craft | Remote Craft | 14 | 0 | 0 | 1 |
| remotive | Remotive | 12 | 0 | 4 | 105 |
| breezy:value-virtual-assistants | VALUE Virtual Assistants | 10 | 0 | 0 | 1 |
| breezy:yokly | Yokly | 10 | 3 | 4 | 10 |
| greenhouse:gitlab | GitLab | 7 | 1 | 1 | 707 |
| jobicy-admin-support-apac | Jobicy | 6 | 0 | 2 | 10 |
| lever:piccollage | Lever/piccollage | 3 | 0 | 3 | 0 |
| ashby:flutterflow | Ashby/flutterflow | 1 | 0 | 0 | 0 |
| greenhouse:ghost | Ghost | 1 | 0 | 0 | 11 |
| workable:rocketams | RocketAMS | 1 | 0 | 0 | 10 |
| ashby:amplify | Amplify | 0 | 0 | 0 | 87 |
| ashby:ashby | Ashby | 0 | 0 | 0 | 92 |
| ashby:camunda | Camunda | 0 | 0 | 0 | 67 |
| ashby:circulareconomysystems | Ashby/circulareconomysystems | 0 | 0 | 0 | 3 |
| ashby:cubic3 | Ashby/cubic3 | 0 | 0 | 0 | 2 |
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
| ashby:scalemath | Ashby/scalemath | 0 | 0 | 0 | 3 |
| ashby:supabase | Supabase | 0 | 0 | 0 | 84 |
| ashby:the-studio | Ashby/the-studio | 0 | 0 | 0 | 3 |
| ashby:tremendous | Tremendous | 0 | 0 | 0 | 31 |
| ashby:trust-wallet | Ashby/trust-wallet | 0 | 0 | 0 | 13 |
| ashby:whippy | Ashby/whippy | 0 | 0 | 0 | 3 |
| authentic-jobs | AuthenticJobs | 0 | 0 | 0 | 10 |
| breezy:time-etc | Time Etc | 0 | 0 | 0 | 2 |
| dribbble | Dribbble | 0 | 0 | 0 | 113 |
| greenhouse:grafanalabs | Grafana Labs | 0 | 0 | 0 | 468 |
| greenhouse:janes | Greenhouse/janes | 0 | 0 | 0 | 2 |
| greenhouse:nearform | Nearform | 0 | 0 | 0 | 66 |
| greenhouse:remotecom | Remote.com | 0 | 0 | 0 | 622 |
| greenhouse:solarwinds | Greenhouse/solarwinds | 0 | 0 | 0 | 16 |
| greenhouse:trainingthestreet | Greenhouse/trainingthestreet | 0 | 0 | 0 | 1 |
| greenhouse:trinityparktalent | Greenhouse/trinityparktalent | 0 | 0 | 0 | 1 |
| himalayas:remote-jobs | Himalayas | 0 | 0 | 0 | 2 |
| lever:90seconds | Lever/90seconds | 0 | 0 | 0 | 1 |
| lever:alltrails | Lever/alltrails | 0 | 0 | 0 | 1 |
| lever:applydigital | Lever/applydigital | 0 | 0 | 0 | 6 |
| lever:audinate | Lever/audinate | 0 | 0 | 0 | 2 |
| lever:beaverprocess | Lever/beaverprocess | 0 | 0 | 0 | 2 |
| lever:brafton | Lever/brafton | 0 | 0 | 0 | 5 |
| lever:brevo | Lever/brevo | 0 | 0 | 0 | 5 |
| lever:decilegroup | Lever/decilegroup | 0 | 0 | 0 | 5 |
| lever:deliverect | Lever/deliverect | 0 | 0 | 0 | 9 |
| lever:gushwork | Lever/gushwork | 0 | 0 | 0 | 3 |
| lever:hso | Lever/hso | 0 | 0 | 0 | 1 |
| lever:jetsupport | Lever/jetsupport | 0 | 0 | 0 | 4 |
| lever:levelup | Lever/levelup | 0 | 0 | 0 | 9 |
| lever:lwolf | Lever/lwolf | 0 | 0 | 0 | 4 |
| lever:nibiru | Lever/nibiru | 0 | 0 | 0 | 8 |
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
| we-work-remotely | 255 | 615 | 0 | 16 | 0 | 24928 |
| remotive | 155 | 731 | 0 | 0 | 0 | 2442 |
| real-work-from-anywhere | 139 | 0 | 747 | 0 | 0 | 6950 |
| ashby:multiplymii | 138 | 0 | 748 | 0 | 0 | 5988 |
| breezy:20four7va | 138 | 0 | 1634 | 0 | 0 | 16502 |
| breezy:remote-craft | 138 | 0 | 748 | 0 | 0 | 2070 |
| breezy:sourcefit | 138 | 0 | 748 | 0 | 0 | 14118 |
| breezy:time-etc | 138 | 0 | 748 | 0 | 0 | 138 |
| breezy:value-virtual-assistants | 138 | 0 | 748 | 0 | 0 | 1380 |
| breezy:yokly | 138 | 0 | 748 | 0 | 0 | 818 |
| greenhouse:canonical | 138 | 0 | 748 | 0 | 0 | 43789 |
| greenhouse:ghost | 138 | 0 | 748 | 0 | 0 | 690 |
| greenhouse:gitlab | 138 | 0 | 748 | 0 | 0 | 34238 |
| greenhouse:grafanalabs | 138 | 0 | 748 | 0 | 0 | 19059 |
| greenhouse:nearform | 138 | 0 | 748 | 0 | 0 | 3180 |
| greenhouse:remotecom | 138 | 0 | 748 | 0 | 138 | 0 |
| workable:coconutva | 83 | 0 | 750 | 53 | 0 | 2710 |
| workable:crewbloom | 83 | 0 | 750 | 53 | 0 | 6982 |
| workable:pearltalent | 83 | 0 | 751 | 52 | 0 | 25225 |
| workable:hello-rache | 82 | 0 | 751 | 53 | 0 | 246 |
| workable:hunt-st | 78 | 0 | 750 | 58 | 0 | 9660 |
| workable:rocketams | 78 | 0 | 750 | 58 | 0 | 624 |
| remote-ok | 71 | 67 | 747 | 1 | 0 | 3158 |
| jobicy-supporting-apac | 29 | 106 | 749 | 2 | 0 | 1160 |
| jobicy-admin-support-apac | 3 | 131 | 749 | 3 | 0 | 15 |
| ashby:amplify | 0 | 0 | 886 | 0 | 0 | 0 |
| ashby:ashby | 0 | 0 | 886 | 0 | 0 | 0 |
| ashby:camunda | 0 | 0 | 886 | 0 | 0 | 0 |
| ashby:circulareconomysystems | 0 | 0 | 886 | 0 | 0 | 0 |
| ashby:cubic3 | 0 | 0 | 886 | 0 | 0 | 0 |
| ashby:flipper | 0 | 0 | 886 | 0 | 0 | 0 |
| ashby:foundry-for-good | 0 | 0 | 886 | 0 | 0 | 0 |
| ashby:getground | 0 | 0 | 886 | 0 | 0 | 0 |
| ashby:gradient | 0 | 0 | 886 | 0 | 0 | 0 |
| ashby:luxor | 0 | 0 | 886 | 0 | 0 | 0 |
| ashby:molecule | 0 | 0 | 886 | 0 | 0 | 0 |
| ashby:payscale | 0 | 0 | 886 | 0 | 0 | 0 |
| ashby:railway | 0 | 0 | 886 | 0 | 0 | 0 |
| ashby:scalemath | 0 | 0 | 886 | 0 | 0 | 0 |
| ashby:supabase | 0 | 0 | 886 | 0 | 0 | 0 |
| ashby:the-studio | 0 | 0 | 886 | 0 | 0 | 0 |
| ashby:tremendous | 0 | 0 | 886 | 0 | 0 | 0 |
| ashby:trust-wallet | 0 | 0 | 886 | 0 | 0 | 0 |
| ashby:whippy | 0 | 0 | 886 | 0 | 0 | 0 |
| authentic-jobs | 0 | 0 | 886 | 0 | 0 | 0 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 886 | 0 | 0 | 0 |
| dribbble | 0 | 0 | 886 | 0 | 0 | 0 |
| jobspresso | 0 | 0 | 886 | 0 | 0 | 0 |
| lever:applydigital | 0 | 0 | 886 | 0 | 0 | 0 |
| lever:audinate | 0 | 0 | 886 | 0 | 0 | 0 |
| lever:beaverprocess | 0 | 0 | 886 | 0 | 0 | 0 |
| lever:brafton | 0 | 0 | 886 | 0 | 0 | 0 |
| lever:brevo | 0 | 0 | 886 | 0 | 0 | 0 |
| lever:decilegroup | 0 | 0 | 886 | 0 | 0 | 0 |
| lever:deliverect | 0 | 0 | 886 | 0 | 0 | 0 |
| lever:gushwork | 0 | 0 | 886 | 0 | 0 | 0 |
| lever:jetsupport | 0 | 0 | 886 | 0 | 0 | 0 |
| lever:lwolf | 0 | 0 | 886 | 0 | 0 | 0 |
| lever:nibiru | 0 | 0 | 886 | 0 | 0 | 0 |
| lever:outsourcedstaff | 0 | 0 | 886 | 0 | 0 | 0 |
| lever:parcelvision | 0 | 0 | 886 | 0 | 0 | 0 |
| lever:piccollage | 0 | 0 | 886 | 0 | 0 | 0 |
| lever:repurposeglobal | 0 | 0 | 886 | 0 | 0 | 0 |
| lever:snappr | 0 | 0 | 886 | 0 | 0 | 0 |
| lever:tenna | 0 | 0 | 886 | 0 | 0 | 0 |
| lever:truezerotech | 0 | 0 | 886 | 0 | 0 | 0 |
| lever:vacancies | 0 | 0 | 886 | 0 | 0 | 0 |
| lever:vaultoutsourcing | 0 | 0 | 886 | 0 | 0 | 0 |
| lever:willowinc | 0 | 0 | 886 | 0 | 0 | 0 |
| onlinejobs-ph | 0 | 0 | 886 | 0 | 0 | 0 |
| problogger | 0 | 0 | 886 | 0 | 0 | 0 |
| remote-co | 0 | 0 | 886 | 0 | 0 | 0 |
| workable:connectos | 0 | 0 | 886 | 0 | 0 | 0 |
| workable:global-strategic | 0 | 0 | 886 | 0 | 0 | 0 |
| workable:myoutdesk | 0 | 0 | 886 | 0 | 0 | 0 |
| workable:outsource-access | 0 | 0 | 886 | 0 | 0 | 0 |
| workable:pineapple-staffing | 0 | 0 | 886 | 0 | 0 | 0 |
| workable:staff-domain-inc | 0 | 0 | 886 | 0 | 0 | 0 |
| workable:superstaff | 0 | 0 | 886 | 0 | 0 | 0 |
| workable:virtualstaff365 | 0 | 0 | 886 | 0 | 0 | 0 |

## Geo & eligibility triage outcomes (last 7 days)

Breakdown of stored opportunities by Philippines eligibility verdict.

| source_id | eligible | unclear | ineligible | policy_rejected | total | qualified_rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 472 | 0 | 251 | 251 | 723 | 65.3% |
| remote-ok | 21 | 5 | 134 | 139 | 160 | 13.1% |
| real-work-from-anywhere | 30 | 4 | 1 | 5 | 35 | 85.7% |
| greenhouse:gitlab | 1 | 1 | 30 | 31 | 32 | 3.1% |
| workable:hunt-st | 23 | 0 | 0 | 0 | 23 | 100.0% |
| greenhouse:grafanalabs | 0 | 0 | 19 | 19 | 19 | 0.0% |
| jobicy-supporting-apac | 7 | 0 | 11 | 11 | 18 | 38.9% |
| breezy:sourcefit | 12 | 0 | 5 | 5 | 17 | 70.6% |
| workable:pearltalent | 3 | 0 | 13 | 13 | 16 | 18.8% |
| breezy:20four7va | 13 | 0 | 0 | 0 | 13 | 100.0% |
| workable:coconutva | 5 | 0 | 0 | 0 | 5 | 100.0% |
| ashby:multiplymii | 3 | 0 | 0 | 0 | 3 | 100.0% |
| breezy:yokly | 3 | 0 | 0 | 0 | 3 | 100.0% |
| greenhouse:canonical | 0 | 0 | 3 | 3 | 3 | 0.0% |
| remotive | 0 | 0 | 3 | 3 | 3 | 0.0% |
| workable:crewbloom | 3 | 0 | 0 | 0 | 3 | 100.0% |
| greenhouse:nearform | 0 | 0 | 2 | 2 | 2 | 0.0% |

## Yield efficiency (last 7 days)

Stored eligibility per real (changed) fetch and per 100 items seen; not marginal verified first-publication yield.
UNKNOWN means a count is missing/invalid or its denominator is zero. Fetch and stored cohorts may differ across intake paths; these descriptive ratios do not establish source productivity or causal yield.

| source_id | real fetches | items seen | eligible stored | yield / fetch | yield / 100 items |
| --- | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 255 | 24928 | 472 | 1.85 | 1.89 |
| remotive | 155 | 2442 | 0 | 0.00 | 0.00 |
| real-work-from-anywhere | 139 | 6950 | 30 | 0.22 | 0.43 |
| ashby:multiplymii | 138 | 5988 | 3 | 0.02 | 0.05 |
| breezy:20four7va | 138 | 16502 | 13 | 0.09 | 0.08 |
| breezy:remote-craft | 138 | 2070 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:sourcefit | 138 | 14118 | 12 | 0.09 | 0.08 |
| breezy:time-etc | 138 | 138 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:value-virtual-assistants | 138 | 1380 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:yokly | 138 | 818 | 3 | 0.02 | 0.37 |
| greenhouse:canonical | 138 | 43789 | 0 | 0.00 | 0.00 |
| greenhouse:ghost | 138 | 690 | UNKNOWN | UNKNOWN | UNKNOWN |
| greenhouse:gitlab | 138 | 34238 | 1 | 0.01 | 0.00 |
| greenhouse:grafanalabs | 138 | 19059 | 0 | 0.00 | 0.00 |
| greenhouse:nearform | 138 | 3180 | 0 | 0.00 | 0.00 |
| greenhouse:remotecom | 138 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| workable:coconutva | 83 | 2710 | 5 | 0.06 | 0.18 |
| workable:crewbloom | 83 | 6982 | 3 | 0.04 | 0.04 |
| workable:pearltalent | 83 | 25225 | 3 | 0.04 | 0.01 |
| workable:hello-rache | 82 | 246 | UNKNOWN | UNKNOWN | UNKNOWN |
| workable:hunt-st | 78 | 9660 | 23 | 0.29 | 0.24 |
| workable:rocketams | 78 | 624 | UNKNOWN | UNKNOWN | UNKNOWN |
| remote-ok | 71 | 3158 | 21 | 0.30 | 0.66 |
| jobicy-supporting-apac | 29 | 1160 | 7 | 0.24 | 0.60 |
| jobicy-admin-support-apac | 3 | 15 | UNKNOWN | UNKNOWN | UNKNOWN |
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
