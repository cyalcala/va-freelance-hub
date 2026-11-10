# Source economics — latest (SP-02)

- **As of:** 2026-11-10T10:17:09.787Z
- **Windows:** 7d/14d/30d net-new by `scraped_at`
- **Reconciliation:** OK (every partition delta is zero)
- Read-only report; regenerate with `scripts/diagnostics/source-economics.ts`.

## Qualified supply (strict eligibility; first-stored proxy)

Excludes unclear/ineligible rows. Historical publication and later deactivation are not fully reconstructed.

| qualified active | qualified new 7d | per day (7d) | qualified new 30d | per day (30d) |
| ---: | ---: | ---: | ---: | ---: |
| 1682 | 148 | 21.14 | 1028 | 34.27 |

## Identity coverage (SP-01)

| total | with source_id | null source_id | coverage | active null-id |
| ---: | ---: | ---: | ---: | ---: |
| 8844 | 8844 | 0 | 100.0% | 0 |

## Net-new accepted supply

| active | net-new 7d | net-new 14d | net-new 30d |
| ---: | ---: | ---: | ---: |
| 1682 | 148 | 316 | 1028 |

## Provider-family concentration (ADR-006 §7)

- **Net-new 30d:** top family `we-work-remotely` 39.6%; top-3 66.8%.
- **Active:** top family `we-work-remotely` 29.3%; top-3 62.2%.
- `(unknown)` legacy rows are excluded from these shares.

| provider family | active | net-new 30d | net-new 7d | source ids |
| --- | ---: | ---: | ---: | --- |
| we-work-remotely | 493 | 407 | 36 | we-work-remotely |
| breezy | 345 | 126 | 30 | breezy:20four7va, breezy:sourcefit, breezy:yokly, breezy:remote-craft, breezy:value-virtual-assistants, breezy:time-etc |
| workable | 208 | 154 | 31 | workable:hunt-st, workable:crewbloom, workable:coconutva, workable:pearltalent, workable:rocketams, workable:hello-rache, workable:pineapple-staffing |
| real-work-from-anywhere | 150 | 110 | 28 | real-work-from-anywhere |
| greenhouse | 147 | 20 | 0 | greenhouse:canonical, greenhouse:solarwinds, greenhouse:gitlab, greenhouse:ghost, greenhouse:trinityparktalent, greenhouse:grafanalabs, greenhouse:janes, greenhouse:nearform, greenhouse:remotecom, greenhouse:trainingthestreet |
| ashby | 109 | 51 | 3 | ashby:multiplymii, ashby:trust-wallet, ashby:railway, ashby:scalemath, ashby:whippy, ashby:cubic3, ashby:flipper, ashby:luxor, ashby:finch, ashby:flutterflow, ashby:amplify, ashby:ashby, ashby:camunda, ashby:circulareconomysystems, ashby:foundry-for-good, ashby:getground, ashby:gradient, ashby:homera-health, ashby:molecule, ashby:payscale, ashby:supabase, ashby:the-studio, ashby:tremendous |
| lever | 84 | 84 | 0 | lever:vacancies, lever:tenna, lever:levelup, lever:nibiru, lever:applydigital, lever:brevo, lever:outsourcedstaff, lever:jetsupport, lever:willowinc, lever:gushwork, lever:parcelvision, lever:piccollage, lever:audinate, lever:alltrails, lever:90seconds, lever:beaverprocess, lever:brafton, lever:decilegroup, lever:deliverect, lever:hso, lever:lwolf, lever:repurposeglobal, lever:snappr, lever:truezerotech, lever:trustarc |
| remote-ok | 67 | 44 | 14 | remote-ok |
| jobicy | 64 | 28 | 6 | jobicy-supporting-apac, jobicy-admin-support-apac |
| remotive | 15 | 4 | 0 | remotive |
| authentic-jobs | 0 | 0 | 0 | authentic-jobs |
| dribbble | 0 | 0 | 0 | dribbble |
| himalayas | 0 | 0 | 0 | himalayas:remote-jobs |

## Supply by exact source_id

| source_id | platform | active | net-new 7d | net-new 30d | inactive |
| --- | --- | ---: | ---: | ---: | ---: |
| we-work-remotely | WeWorkRemotely | 493 | 36 | 407 | 1779 |
| breezy:20four7va | 20Four7VA | 173 | 22 | 66 | 154 |
| workable:hunt-st | Hunt St | 151 | 17 | 109 | 141 |
| real-work-from-anywhere | RealWorkFromAnywhere | 150 | 28 | 110 | 615 |
| breezy:sourcefit | Breezy/sourcefit | 132 | 8 | 55 | 178 |
| greenhouse:canonical | Canonical | 123 | 0 | 0 | 199 |
| ashby:multiplymii | Ashby/multiplymii | 76 | 3 | 18 | 13 |
| remote-ok | RemoteOK | 67 | 14 | 44 | 1247 |
| jobicy-supporting-apac | Jobicy | 57 | 5 | 24 | 153 |
| workable:crewbloom | CrewBloom | 23 | 5 | 17 | 71 |
| workable:coconutva | Coconut VA | 22 | 6 | 17 | 57 |
| lever:vacancies | Lever/vacancies | 20 | 0 | 20 | 0 |
| breezy:yokly | Yokly | 16 | 0 | 5 | 1 |
| greenhouse:solarwinds | Greenhouse/solarwinds | 16 | 0 | 16 | 0 |
| remotive | Remotive | 15 | 0 | 4 | 95 |
| breezy:remote-craft | Remote Craft | 14 | 0 | 0 | 1 |
| ashby:trust-wallet | Ashby/trust-wallet | 13 | 0 | 13 | 0 |
| lever:tenna | Lever/tenna | 11 | 0 | 11 | 0 |
| workable:pearltalent | Pearl Talent | 11 | 3 | 10 | 62 |
| breezy:value-virtual-assistants | VALUE Virtual Assistants | 10 | 0 | 0 | 1 |
| lever:levelup | Lever/levelup | 9 | 0 | 9 | 0 |
| lever:nibiru | Lever/nibiru | 8 | 0 | 8 | 0 |
| jobicy-admin-support-apac | Jobicy | 7 | 1 | 4 | 9 |
| ashby:railway | Ashby/railway | 6 | 0 | 6 | 0 |
| greenhouse:gitlab | GitLab | 6 | 0 | 3 | 646 |
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
| greenhouse:grafanalabs | Grafana Labs | 0 | 0 | 0 | 427 |
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
| remotive | 165 | 797 | 0 | 0 | 0 | 2046 |
| ashby:multiplymii | 149 | 0 | 813 | 0 | 0 | 6742 |
| breezy:20four7va | 149 | 0 | 1775 | 0 | 0 | 18289 |
| breezy:remote-craft | 149 | 0 | 813 | 0 | 0 | 2235 |
| breezy:sourcefit | 149 | 0 | 813 | 0 | 0 | 17084 |
| breezy:time-etc | 149 | 0 | 813 | 0 | 0 | 149 |
| breezy:value-virtual-assistants | 149 | 0 | 813 | 0 | 0 | 1490 |
| breezy:yokly | 149 | 0 | 813 | 0 | 0 | 596 |
| greenhouse:gitlab | 149 | 0 | 813 | 0 | 0 | 36629 |
| greenhouse:grafanalabs | 149 | 0 | 813 | 0 | 0 | 19476 |
| greenhouse:nearform | 149 | 0 | 813 | 0 | 0 | 4050 |
| greenhouse:remotecom | 149 | 0 | 813 | 0 | 149 | 0 |
| greenhouse:canonical | 148 | 0 | 813 | 1 | 0 | 46716 |
| greenhouse:ghost | 148 | 0 | 813 | 1 | 0 | 740 |
| real-work-from-anywhere | 147 | 0 | 813 | 2 | 0 | 7350 |
| workable:hello-rache | 111 | 0 | 815 | 36 | 0 | 333 |
| workable:hunt-st | 111 | 0 | 815 | 36 | 0 | 14247 |
| workable:pearltalent | 111 | 0 | 815 | 36 | 0 | 31961 |
| workable:rocketams | 111 | 0 | 815 | 36 | 0 | 1087 |
| workable:coconutva | 106 | 0 | 815 | 41 | 0 | 3386 |
| workable:crewbloom | 106 | 0 | 815 | 41 | 0 | 10418 |
| we-work-remotely | 93 | 856 | 0 | 13 | 0 | 9300 |
| remote-ok | 63 | 85 | 813 | 1 | 0 | 2748 |
| jobicy-supporting-apac | 25 | 125 | 812 | 0 | 0 | 1000 |
| jobicy-admin-support-apac | 2 | 146 | 814 | 0 | 0 | 9 |
| ashby:amplify | 0 | 0 | 962 | 0 | 0 | 0 |
| ashby:ashby | 0 | 0 | 962 | 0 | 0 | 0 |
| ashby:camunda | 0 | 0 | 962 | 0 | 0 | 0 |
| ashby:circulareconomysystems | 0 | 0 | 962 | 0 | 0 | 0 |
| ashby:cubic3 | 0 | 0 | 962 | 0 | 0 | 0 |
| ashby:flipper | 0 | 0 | 962 | 0 | 0 | 0 |
| ashby:foundry-for-good | 0 | 0 | 962 | 0 | 0 | 0 |
| ashby:getground | 0 | 0 | 962 | 0 | 0 | 0 |
| ashby:gradient | 0 | 0 | 962 | 0 | 0 | 0 |
| ashby:luxor | 0 | 0 | 962 | 0 | 0 | 0 |
| ashby:molecule | 0 | 0 | 962 | 0 | 0 | 0 |
| ashby:payscale | 0 | 0 | 962 | 0 | 0 | 0 |
| ashby:railway | 0 | 0 | 962 | 0 | 0 | 0 |
| ashby:scalemath | 0 | 0 | 962 | 0 | 0 | 0 |
| ashby:supabase | 0 | 0 | 962 | 0 | 0 | 0 |
| ashby:the-studio | 0 | 0 | 962 | 0 | 0 | 0 |
| ashby:tremendous | 0 | 0 | 962 | 0 | 0 | 0 |
| ashby:trust-wallet | 0 | 0 | 962 | 0 | 0 | 0 |
| ashby:whippy | 0 | 0 | 962 | 0 | 0 | 0 |
| authentic-jobs | 0 | 0 | 962 | 0 | 0 | 0 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 962 | 0 | 0 | 0 |
| dribbble | 0 | 0 | 962 | 0 | 0 | 0 |
| jobspresso | 0 | 0 | 962 | 0 | 0 | 0 |
| lever:applydigital | 0 | 0 | 962 | 0 | 0 | 0 |
| lever:audinate | 0 | 0 | 962 | 0 | 0 | 0 |
| lever:beaverprocess | 0 | 0 | 962 | 0 | 0 | 0 |
| lever:brafton | 0 | 0 | 962 | 0 | 0 | 0 |
| lever:brevo | 0 | 0 | 962 | 0 | 0 | 0 |
| lever:decilegroup | 0 | 0 | 962 | 0 | 0 | 0 |
| lever:deliverect | 0 | 0 | 962 | 0 | 0 | 0 |
| lever:gushwork | 0 | 0 | 962 | 0 | 0 | 0 |
| lever:jetsupport | 0 | 0 | 962 | 0 | 0 | 0 |
| lever:lwolf | 0 | 0 | 962 | 0 | 0 | 0 |
| lever:nibiru | 0 | 0 | 962 | 0 | 0 | 0 |
| lever:outsourcedstaff | 0 | 0 | 962 | 0 | 0 | 0 |
| lever:parcelvision | 0 | 0 | 962 | 0 | 0 | 0 |
| lever:piccollage | 0 | 0 | 962 | 0 | 0 | 0 |
| lever:repurposeglobal | 0 | 0 | 962 | 0 | 0 | 0 |
| lever:snappr | 0 | 0 | 962 | 0 | 0 | 0 |
| lever:tenna | 0 | 0 | 962 | 0 | 0 | 0 |
| lever:truezerotech | 0 | 0 | 962 | 0 | 0 | 0 |
| lever:vacancies | 0 | 0 | 962 | 0 | 0 | 0 |
| lever:vaultoutsourcing | 0 | 0 | 962 | 0 | 0 | 0 |
| lever:willowinc | 0 | 0 | 962 | 0 | 0 | 0 |
| onlinejobs-ph | 0 | 0 | 962 | 0 | 0 | 0 |
| problogger | 0 | 0 | 962 | 0 | 0 | 0 |
| remote-co | 0 | 0 | 962 | 0 | 0 | 0 |
| workable:connectos | 0 | 0 | 962 | 0 | 0 | 0 |
| workable:global-strategic | 0 | 0 | 962 | 0 | 0 | 0 |
| workable:myoutdesk | 0 | 0 | 962 | 0 | 0 | 0 |
| workable:outsource-access | 0 | 0 | 962 | 0 | 0 | 0 |
| workable:pineapple-staffing | 0 | 0 | 962 | 0 | 0 | 0 |
| workable:staff-domain-inc | 0 | 0 | 962 | 0 | 0 | 0 |
| workable:superstaff | 0 | 0 | 962 | 0 | 0 | 0 |
| workable:virtualstaff365 | 0 | 0 | 962 | 0 | 0 | 0 |

## Geo & eligibility triage outcomes (last 7 days)

Breakdown of stored opportunities by Philippines eligibility verdict.

| source_id | eligible | unclear | ineligible | policy_rejected | total | qualified_rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 36 | 2 | 103 | 105 | 141 | 25.5% |
| greenhouse:gitlab | 0 | 2 | 38 | 40 | 40 | 0.0% |
| real-work-from-anywhere | 28 | 3 | 5 | 8 | 36 | 77.8% |
| greenhouse:grafanalabs | 0 | 0 | 30 | 30 | 30 | 0.0% |
| remote-ok | 14 | 3 | 6 | 9 | 23 | 60.9% |
| breezy:20four7va | 22 | 0 | 0 | 0 | 22 | 100.0% |
| workable:hunt-st | 17 | 1 | 2 | 2 | 20 | 85.0% |
| breezy:sourcefit | 8 | 0 | 10 | 10 | 18 | 44.4% |
| jobicy-supporting-apac | 5 | 0 | 11 | 11 | 16 | 31.3% |
| workable:coconutva | 6 | 0 | 0 | 0 | 6 | 100.0% |
| workable:pearltalent | 3 | 0 | 3 | 3 | 6 | 50.0% |
| greenhouse:nearform | 0 | 0 | 5 | 5 | 5 | 0.0% |
| workable:crewbloom | 5 | 0 | 0 | 0 | 5 | 100.0% |
| ashby:multiplymii | 3 | 0 | 0 | 0 | 3 | 100.0% |
| greenhouse:canonical | 0 | 0 | 2 | 2 | 2 | 0.0% |
| remotive | 0 | 0 | 2 | 2 | 2 | 0.0% |
| jobicy-admin-support-apac | 1 | 0 | 0 | 0 | 1 | 100.0% |
| workable:rocketams | 0 | 0 | 1 | 1 | 1 | 0.0% |

## Yield efficiency (last 7 days)

Stored eligibility per real (changed) fetch and per 100 items seen; not marginal verified first-publication yield.
UNKNOWN means a count is missing/invalid or its denominator is zero. Fetch and stored cohorts may differ across intake paths; these descriptive ratios do not establish source productivity or causal yield.

| source_id | real fetches | items seen | eligible stored | yield / fetch | yield / 100 items |
| --- | ---: | ---: | ---: | ---: | ---: |
| remotive | 165 | 2046 | 0 | 0.00 | 0.00 |
| ashby:multiplymii | 149 | 6742 | 3 | 0.02 | 0.04 |
| breezy:20four7va | 149 | 18289 | 22 | 0.15 | 0.12 |
| breezy:remote-craft | 149 | 2235 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:sourcefit | 149 | 17084 | 8 | 0.05 | 0.05 |
| breezy:time-etc | 149 | 149 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:value-virtual-assistants | 149 | 1490 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:yokly | 149 | 596 | UNKNOWN | UNKNOWN | UNKNOWN |
| greenhouse:gitlab | 149 | 36629 | 0 | 0.00 | 0.00 |
| greenhouse:grafanalabs | 149 | 19476 | 0 | 0.00 | 0.00 |
| greenhouse:nearform | 149 | 4050 | 0 | 0.00 | 0.00 |
| greenhouse:remotecom | 149 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| greenhouse:canonical | 148 | 46716 | 0 | 0.00 | 0.00 |
| greenhouse:ghost | 148 | 740 | UNKNOWN | UNKNOWN | UNKNOWN |
| real-work-from-anywhere | 147 | 7350 | 28 | 0.19 | 0.38 |
| workable:hello-rache | 111 | 333 | UNKNOWN | UNKNOWN | UNKNOWN |
| workable:hunt-st | 111 | 14247 | 17 | 0.15 | 0.12 |
| workable:pearltalent | 111 | 31961 | 3 | 0.03 | 0.01 |
| workable:rocketams | 111 | 1087 | 0 | 0.00 | 0.00 |
| workable:coconutva | 106 | 3386 | 6 | 0.06 | 0.18 |
| workable:crewbloom | 106 | 10418 | 5 | 0.05 | 0.05 |
| we-work-remotely | 93 | 9300 | 36 | 0.39 | 0.39 |
| remote-ok | 63 | 2748 | 14 | 0.22 | 0.51 |
| jobicy-supporting-apac | 25 | 1000 | 5 | 0.20 | 0.50 |
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
