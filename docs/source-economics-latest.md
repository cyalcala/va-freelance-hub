# Source economics — latest (SP-02)

- **As of:** 2026-11-02T09:52:14.638Z
- **Windows:** 7d/14d/30d net-new by `scraped_at`
- **Reconciliation:** OK (every partition delta is zero)
- Read-only report; regenerate with `scripts/diagnostics/source-economics.ts`.

## Qualified supply (strict eligibility; first-stored proxy)

Excludes unclear/ineligible rows. Historical publication and later deactivation are not fully reconstructed.

| qualified active | qualified new 7d | per day (7d) | qualified new 30d | per day (30d) |
| ---: | ---: | ---: | ---: | ---: |
| 1800 | 191 | 27.29 | 1139 | 37.97 |

## Identity coverage (SP-01)

| total | with source_id | null source_id | coverage | active null-id |
| ---: | ---: | ---: | ---: | ---: |
| 8430 | 8430 | 0 | 100.0% | 0 |

## Net-new accepted supply

| active | net-new 7d | net-new 14d | net-new 30d |
| ---: | ---: | ---: | ---: |
| 1800 | 191 | 568 | 1139 |

## Provider-family concentration (ADR-006 §7)

- **Net-new 30d:** top family `we-work-remotely` 42.8% ⚠️ >40%; top-3 66.5%.
- **Active:** top family `we-work-remotely` 31.7%; top-3 60.2%.
- `(unknown)` legacy rows are excluded from these shares.

| provider family | active | net-new 30d | net-new 7d | source ids |
| --- | ---: | ---: | ---: | --- |
| we-work-remotely | 571 | 487 | 100 | we-work-remotely |
| breezy | 331 | 103 | 19 | breezy:20four7va, breezy:sourcefit, breezy:yokly, breezy:remote-craft, breezy:value-virtual-assistants, breezy:time-etc |
| workable | 182 | 139 | 30 | workable:hunt-st, workable:crewbloom, workable:coconutva, workable:pearltalent, workable:rocketams, workable:hello-rache, workable:pineapple-staffing |
| ashby | 156 | 79 | 4 | ashby:multiplymii, ashby:foundry-for-good, ashby:trust-wallet, ashby:railway, ashby:gradient, ashby:payscale, ashby:circulareconomysystems, ashby:molecule, ashby:scalemath, ashby:whippy, ashby:cubic3, ashby:flipper, ashby:getground, ashby:luxor, ashby:finch, ashby:flutterflow, ashby:homera-health, ashby:amplify, ashby:ashby, ashby:camunda, ashby:supabase, ashby:the-studio, ashby:tremendous |
| greenhouse | 150 | 27 | 0 | greenhouse:canonical, greenhouse:solarwinds, greenhouse:gitlab, greenhouse:janes, greenhouse:ghost, greenhouse:trainingthestreet, greenhouse:trinityparktalent, greenhouse:grafanalabs, greenhouse:nearform, greenhouse:remotecom |
| real-work-from-anywhere | 144 | 106 | 26 | real-work-from-anywhere |
| lever | 132 | 132 | 0 | lever:vacancies, lever:truezerotech, lever:tenna, lever:deliverect, lever:levelup, lever:nibiru, lever:applydigital, lever:brafton, lever:brevo, lever:decilegroup, lever:outsourcedstaff, lever:jetsupport, lever:lwolf, lever:willowinc, lever:gushwork, lever:parcelvision, lever:piccollage, lever:repurposeglobal, lever:audinate, lever:beaverprocess, lever:90seconds, lever:alltrails, lever:hso, lever:trustarc, lever:snappr |
| jobicy | 60 | 23 | 6 | jobicy-supporting-apac, jobicy-admin-support-apac |
| remote-ok | 59 | 38 | 4 | remote-ok |
| remotive | 15 | 5 | 2 | remotive |
| authentic-jobs | 0 | 0 | 0 | authentic-jobs |
| dribbble | 0 | 0 | 0 | dribbble |
| himalayas | 0 | 0 | 0 | himalayas:remote-jobs |

## Supply by exact source_id

| source_id | platform | active | net-new 7d | net-new 30d | inactive |
| --- | --- | ---: | ---: | ---: | ---: |
| we-work-remotely | WeWorkRemotely | 571 | 100 | 487 | 1548 |
| breezy:20four7va | 20Four7VA | 161 | 14 | 46 | 139 |
| real-work-from-anywhere | RealWorkFromAnywhere | 144 | 26 | 106 | 585 |
| workable:hunt-st | Hunt St | 139 | 20 | 108 | 132 |
| breezy:sourcefit | Breezy/sourcefit | 130 | 4 | 51 | 158 |
| greenhouse:canonical | Canonical | 123 | 0 | 2 | 197 |
| ashby:multiplymii | Ashby/multiplymii | 78 | 4 | 28 | 8 |
| remote-ok | RemoteOK | 59 | 4 | 38 | 1230 |
| jobicy-supporting-apac | Jobicy | 54 | 5 | 20 | 138 |
| ashby:foundry-for-good | Ashby/foundry-for-good | 27 | 0 | 0 | 0 |
| lever:vacancies | Lever/vacancies | 20 | 0 | 20 | 0 |
| workable:crewbloom | CrewBloom | 18 | 7 | 12 | 70 |
| lever:truezerotech | Lever/truezerotech | 17 | 0 | 17 | 0 |
| breezy:yokly | Yokly | 16 | 1 | 5 | 1 |
| greenhouse:solarwinds | Greenhouse/solarwinds | 16 | 0 | 16 | 0 |
| workable:coconutva | Coconut VA | 16 | 1 | 11 | 57 |
| remotive | Remotive | 15 | 2 | 5 | 93 |
| breezy:remote-craft | Remote Craft | 14 | 0 | 0 | 1 |
| ashby:trust-wallet | Ashby/trust-wallet | 13 | 0 | 13 | 0 |
| lever:tenna | Lever/tenna | 11 | 0 | 11 | 0 |
| breezy:value-virtual-assistants | VALUE Virtual Assistants | 10 | 0 | 1 | 1 |
| lever:deliverect | Lever/deliverect | 9 | 0 | 9 | 0 |
| lever:levelup | Lever/levelup | 9 | 0 | 9 | 0 |
| lever:nibiru | Lever/nibiru | 8 | 0 | 8 | 0 |
| workable:pearltalent | Pearl Talent | 8 | 2 | 7 | 59 |
| ashby:railway | Ashby/railway | 6 | 0 | 6 | 0 |
| greenhouse:gitlab | GitLab | 6 | 0 | 5 | 602 |
| jobicy-admin-support-apac | Jobicy | 6 | 1 | 3 | 9 |
| lever:applydigital | Lever/applydigital | 6 | 0 | 6 | 0 |
| ashby:gradient | Ashby/gradient | 5 | 0 | 5 | 0 |
| lever:brafton | Lever/brafton | 5 | 0 | 5 | 0 |
| lever:brevo | Lever/brevo | 5 | 0 | 5 | 0 |
| lever:decilegroup | Lever/decilegroup | 5 | 0 | 5 | 0 |
| lever:outsourcedstaff | Lever/outsourcedstaff | 5 | 0 | 5 | 0 |
| ashby:payscale | Ashby/payscale | 4 | 0 | 4 | 0 |
| lever:jetsupport | Lever/jetsupport | 4 | 0 | 4 | 0 |
| lever:lwolf | Lever/lwolf | 4 | 0 | 4 | 0 |
| lever:willowinc | Lever/willowinc | 4 | 0 | 4 | 0 |
| ashby:circulareconomysystems | Ashby/circulareconomysystems | 3 | 0 | 3 | 0 |
| ashby:molecule | Ashby/molecule | 3 | 0 | 3 | 0 |
| ashby:scalemath | Ashby/scalemath | 3 | 0 | 3 | 0 |
| ashby:whippy | Ashby/whippy | 3 | 0 | 3 | 0 |
| lever:gushwork | Lever/gushwork | 3 | 0 | 3 | 0 |
| lever:parcelvision | Lever/parcelvision | 3 | 0 | 3 | 0 |
| lever:piccollage | Lever/piccollage | 3 | 0 | 3 | 0 |
| lever:repurposeglobal | Lever/repurposeglobal | 3 | 0 | 3 | 0 |
| ashby:cubic3 | Ashby/cubic3 | 2 | 0 | 2 | 0 |
| ashby:flipper | Ashby/flipper | 2 | 0 | 2 | 0 |
| ashby:getground | Ashby/getground | 2 | 0 | 2 | 0 |
| ashby:luxor | Ashby/luxor | 2 | 0 | 2 | 0 |
| greenhouse:janes | Greenhouse/janes | 2 | 0 | 2 | 0 |
| lever:audinate | Lever/audinate | 2 | 0 | 2 | 0 |
| lever:beaverprocess | Lever/beaverprocess | 2 | 0 | 2 | 0 |
| ashby:finch | Ashby/finch | 1 | 0 | 1 | 0 |
| ashby:flutterflow | Ashby/flutterflow | 1 | 0 | 1 | 0 |
| ashby:homera-health | Ashby/homera-health | 1 | 0 | 1 | 0 |
| greenhouse:ghost | Ghost | 1 | 0 | 0 | 11 |
| greenhouse:trainingthestreet | Greenhouse/trainingthestreet | 1 | 0 | 1 | 0 |
| greenhouse:trinityparktalent | Greenhouse/trinityparktalent | 1 | 0 | 1 | 0 |
| lever:90seconds | Lever/90seconds | 1 | 0 | 1 | 0 |
| lever:alltrails | Lever/alltrails | 1 | 0 | 1 | 0 |
| lever:hso | Lever/hso | 1 | 0 | 1 | 0 |
| lever:trustarc | Lever/trustarc | 1 | 0 | 1 | 0 |
| workable:rocketams | RocketAMS | 1 | 0 | 1 | 9 |
| ashby:amplify | Amplify | 0 | 0 | 0 | 87 |
| ashby:ashby | Ashby | 0 | 0 | 0 | 92 |
| ashby:camunda | Camunda | 0 | 0 | 0 | 67 |
| ashby:supabase | Supabase | 0 | 0 | 0 | 84 |
| ashby:the-studio | Ashby/the-studio | 0 | 0 | 0 | 3 |
| ashby:tremendous | Tremendous | 0 | 0 | 0 | 31 |
| authentic-jobs | AuthenticJobs | 0 | 0 | 0 | 10 |
| breezy:time-etc | Time Etc | 0 | 0 | 0 | 2 |
| dribbble | Dribbble | 0 | 0 | 0 | 113 |
| greenhouse:grafanalabs | Grafana Labs | 0 | 0 | 0 | 392 |
| greenhouse:nearform | Nearform | 0 | 0 | 0 | 57 |
| greenhouse:remotecom | Remote.com | 0 | 0 | 0 | 622 |
| himalayas:remote-jobs | Himalayas | 0 | 0 | 0 | 2 |
| lever:snappr | Lever/snappr | 0 | 0 | 0 | 13 |
| workable:hello-rache | Hello Rache | 0 | 0 | 0 | 4 |
| workable:pineapple-staffing | Pineapple Staffing | 0 | 0 | 0 | 3 |

## Fetch outcomes (last 7 days)

Separates real (changed) fetches from unchanged 304 polls, intentional skips, failures, and true zero-yield. `items` counts only changed fetches, so carried-forward unchanged counts never read as new supply.

| source_id | real fetches | unchanged | skips | failures | zero-yield | items |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| remotive | 169 | 818 | 0 | 0 | 0 | 2041 |
| we-work-remotely | 163 | 820 | 0 | 4 | 0 | 15766 |
| breezy:20four7va | 152 | 0 | 1822 | 0 | 0 | 18637 |
| greenhouse:ghost | 152 | 0 | 835 | 0 | 0 | 708 |
| greenhouse:gitlab | 152 | 0 | 835 | 0 | 0 | 35972 |
| greenhouse:grafanalabs | 152 | 0 | 835 | 0 | 0 | 19363 |
| greenhouse:nearform | 152 | 0 | 835 | 0 | 0 | 3601 |
| ashby:multiplymii | 151 | 0 | 836 | 0 | 0 | 7469 |
| breezy:remote-craft | 151 | 0 | 836 | 0 | 0 | 2265 |
| breezy:sourcefit | 151 | 0 | 836 | 0 | 0 | 15928 |
| breezy:time-etc | 151 | 0 | 836 | 0 | 0 | 151 |
| breezy:value-virtual-assistants | 151 | 0 | 836 | 0 | 0 | 1513 |
| breezy:yokly | 151 | 0 | 836 | 0 | 0 | 604 |
| real-work-from-anywhere | 151 | 0 | 835 | 1 | 0 | 7550 |
| greenhouse:canonical | 150 | 0 | 836 | 1 | 0 | 47100 |
| workable:hello-rache | 124 | 0 | 837 | 26 | 0 | 372 |
| workable:pearltalent | 124 | 0 | 837 | 26 | 0 | 37472 |
| workable:hunt-st | 122 | 0 | 837 | 28 | 0 | 17353 |
| workable:rocketams | 121 | 0 | 837 | 29 | 0 | 1210 |
| workable:coconutva | 116 | 0 | 837 | 34 | 0 | 3582 |
| workable:crewbloom | 116 | 0 | 837 | 34 | 0 | 11251 |
| greenhouse:remotecom | 91 | 0 | 835 | 61 | 91 | 0 |
| jobicy-supporting-apac | 28 | 118 | 837 | 4 | 0 | 1120 |
| remote-ok | 18 | 134 | 835 | 0 | 0 | 786 |
| jobicy-admin-support-apac | 4 | 146 | 835 | 2 | 0 | 17 |
| ashby:amplify | 0 | 0 | 987 | 0 | 0 | 0 |
| ashby:ashby | 0 | 0 | 987 | 0 | 0 | 0 |
| ashby:camunda | 0 | 0 | 987 | 0 | 0 | 0 |
| ashby:circulareconomysystems | 0 | 0 | 987 | 0 | 0 | 0 |
| ashby:cubic3 | 0 | 0 | 987 | 0 | 0 | 0 |
| ashby:flipper | 0 | 0 | 987 | 0 | 0 | 0 |
| ashby:foundry-for-good | 0 | 0 | 987 | 0 | 0 | 0 |
| ashby:getground | 0 | 0 | 987 | 0 | 0 | 0 |
| ashby:gradient | 0 | 0 | 987 | 0 | 0 | 0 |
| ashby:luxor | 0 | 0 | 987 | 0 | 0 | 0 |
| ashby:molecule | 0 | 0 | 987 | 0 | 0 | 0 |
| ashby:payscale | 0 | 0 | 987 | 0 | 0 | 0 |
| ashby:railway | 0 | 0 | 987 | 0 | 0 | 0 |
| ashby:scalemath | 0 | 0 | 987 | 0 | 0 | 0 |
| ashby:supabase | 0 | 0 | 987 | 0 | 0 | 0 |
| ashby:the-studio | 0 | 0 | 987 | 0 | 0 | 0 |
| ashby:tremendous | 0 | 0 | 987 | 0 | 0 | 0 |
| ashby:trust-wallet | 0 | 0 | 987 | 0 | 0 | 0 |
| ashby:whippy | 0 | 0 | 987 | 0 | 0 | 0 |
| authentic-jobs | 0 | 0 | 987 | 0 | 0 | 0 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 987 | 0 | 0 | 0 |
| dribbble | 0 | 0 | 987 | 0 | 0 | 0 |
| jobspresso | 0 | 0 | 987 | 0 | 0 | 0 |
| lever:applydigital | 0 | 0 | 987 | 0 | 0 | 0 |
| lever:audinate | 0 | 0 | 987 | 0 | 0 | 0 |
| lever:beaverprocess | 0 | 0 | 987 | 0 | 0 | 0 |
| lever:brafton | 0 | 0 | 987 | 0 | 0 | 0 |
| lever:brevo | 0 | 0 | 987 | 0 | 0 | 0 |
| lever:decilegroup | 0 | 0 | 987 | 0 | 0 | 0 |
| lever:deliverect | 0 | 0 | 987 | 0 | 0 | 0 |
| lever:gushwork | 0 | 0 | 987 | 0 | 0 | 0 |
| lever:jetsupport | 0 | 0 | 987 | 0 | 0 | 0 |
| lever:lwolf | 0 | 0 | 987 | 0 | 0 | 0 |
| lever:nibiru | 0 | 0 | 987 | 0 | 0 | 0 |
| lever:outsourcedstaff | 0 | 0 | 987 | 0 | 0 | 0 |
| lever:parcelvision | 0 | 0 | 987 | 0 | 0 | 0 |
| lever:piccollage | 0 | 0 | 968 | 0 | 0 | 0 |
| lever:repurposeglobal | 0 | 0 | 987 | 0 | 0 | 0 |
| lever:snappr | 0 | 0 | 987 | 0 | 0 | 0 |
| lever:tenna | 0 | 0 | 987 | 0 | 0 | 0 |
| lever:truezerotech | 0 | 0 | 987 | 0 | 0 | 0 |
| lever:vacancies | 0 | 0 | 987 | 0 | 0 | 0 |
| lever:vaultoutsourcing | 0 | 0 | 987 | 0 | 0 | 0 |
| lever:willowinc | 0 | 0 | 987 | 0 | 0 | 0 |
| onlinejobs-ph | 0 | 0 | 987 | 0 | 0 | 0 |
| problogger | 0 | 0 | 987 | 0 | 0 | 0 |
| remote-co | 0 | 0 | 987 | 0 | 0 | 0 |
| workable:connectos | 0 | 0 | 987 | 0 | 0 | 0 |
| workable:global-strategic | 0 | 0 | 987 | 0 | 0 | 0 |
| workable:myoutdesk | 0 | 0 | 987 | 0 | 0 | 0 |
| workable:outsource-access | 0 | 0 | 987 | 0 | 0 | 0 |
| workable:pineapple-staffing | 0 | 0 | 987 | 0 | 0 | 0 |
| workable:staff-domain-inc | 0 | 0 | 987 | 0 | 0 | 0 |
| workable:superstaff | 0 | 0 | 987 | 0 | 0 | 0 |
| workable:virtualstaff365 | 0 | 0 | 987 | 0 | 0 | 0 |

## Geo & eligibility triage outcomes (last 7 days)

Breakdown of stored opportunities by Philippines eligibility verdict.

| source_id | eligible | unclear | ineligible | policy_rejected | total | qualified_rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 100 | 0 | 43 | 43 | 143 | 69.9% |
| jobicy-supporting-apac | 5 | 0 | 24 | 24 | 29 | 17.2% |
| real-work-from-anywhere | 26 | 0 | 2 | 2 | 28 | 92.9% |
| greenhouse:gitlab | 0 | 0 | 24 | 24 | 24 | 0.0% |
| workable:hunt-st | 20 | 0 | 0 | 0 | 20 | 100.0% |
| breezy:20four7va | 14 | 0 | 0 | 0 | 14 | 100.0% |
| remote-ok | 4 | 2 | 8 | 10 | 14 | 28.6% |
| workable:crewbloom | 7 | 0 | 2 | 2 | 9 | 77.8% |
| greenhouse:grafanalabs | 0 | 0 | 8 | 8 | 8 | 0.0% |
| breezy:sourcefit | 4 | 0 | 3 | 3 | 7 | 57.1% |
| ashby:multiplymii | 4 | 0 | 0 | 0 | 4 | 100.0% |
| remotive | 2 | 0 | 1 | 1 | 3 | 66.7% |
| workable:pearltalent | 2 | 0 | 1 | 1 | 3 | 66.7% |
| breezy:yokly | 1 | 0 | 0 | 0 | 1 | 100.0% |
| greenhouse:ghost | 0 | 0 | 1 | 1 | 1 | 0.0% |
| jobicy-admin-support-apac | 1 | 0 | 0 | 0 | 1 | 100.0% |
| workable:coconutva | 1 | 0 | 0 | 0 | 1 | 100.0% |

## Yield efficiency (last 7 days)

Stored eligibility per real (changed) fetch and per 100 items seen; not marginal verified first-publication yield.
UNKNOWN means a count is missing/invalid or its denominator is zero. Fetch and stored cohorts may differ across intake paths; these descriptive ratios do not establish source productivity or causal yield.

| source_id | real fetches | items seen | eligible stored | yield / fetch | yield / 100 items |
| --- | ---: | ---: | ---: | ---: | ---: |
| remotive | 169 | 2041 | 2 | 0.01 | 0.10 |
| we-work-remotely | 163 | 15766 | 100 | 0.61 | 0.63 |
| breezy:20four7va | 152 | 18637 | 14 | 0.09 | 0.08 |
| greenhouse:ghost | 152 | 708 | 0 | 0.00 | 0.00 |
| greenhouse:gitlab | 152 | 35972 | 0 | 0.00 | 0.00 |
| greenhouse:grafanalabs | 152 | 19363 | 0 | 0.00 | 0.00 |
| greenhouse:nearform | 152 | 3601 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:multiplymii | 151 | 7469 | 4 | 0.03 | 0.05 |
| breezy:remote-craft | 151 | 2265 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:sourcefit | 151 | 15928 | 4 | 0.03 | 0.03 |
| breezy:time-etc | 151 | 151 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:value-virtual-assistants | 151 | 1513 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:yokly | 151 | 604 | 1 | 0.01 | 0.17 |
| real-work-from-anywhere | 151 | 7550 | 26 | 0.17 | 0.34 |
| greenhouse:canonical | 150 | 47100 | UNKNOWN | UNKNOWN | UNKNOWN |
| workable:hello-rache | 124 | 372 | UNKNOWN | UNKNOWN | UNKNOWN |
| workable:pearltalent | 124 | 37472 | 2 | 0.02 | 0.01 |
| workable:hunt-st | 122 | 17353 | 20 | 0.16 | 0.12 |
| workable:rocketams | 121 | 1210 | UNKNOWN | UNKNOWN | UNKNOWN |
| workable:coconutva | 116 | 3582 | 1 | 0.01 | 0.03 |
| workable:crewbloom | 116 | 11251 | 7 | 0.06 | 0.06 |
| greenhouse:remotecom | 91 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| jobicy-supporting-apac | 28 | 1120 | 5 | 0.18 | 0.45 |
| remote-ok | 18 | 786 | 4 | 0.22 | 0.51 |
| jobicy-admin-support-apac | 4 | 17 | 1 | 0.25 | 5.88 |
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
