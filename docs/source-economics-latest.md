# Source economics — latest (SP-02)

- **As of:** 2026-11-04T09:44:41.997Z
- **Windows:** 7d/14d/30d net-new by `scraped_at`
- **Reconciliation:** OK (every partition delta is zero)
- Read-only report; regenerate with `scripts/diagnostics/source-economics.ts`.

## Qualified supply (strict eligibility; first-stored proxy)

Excludes unclear/ineligible rows. Historical publication and later deactivation are not fully reconstructed.

| qualified active | qualified new 7d | per day (7d) | qualified new 30d | per day (30d) |
| ---: | ---: | ---: | ---: | ---: |
| 1710 | 160 | 22.86 | 1081 | 36.03 |

## Identity coverage (SP-01)

| total | with source_id | null source_id | coverage | active null-id |
| ---: | ---: | ---: | ---: | ---: |
| 8509 | 8509 | 0 | 100.0% | 0 |

## Net-new accepted supply

| active | net-new 7d | net-new 14d | net-new 30d |
| ---: | ---: | ---: | ---: |
| 1710 | 160 | 477 | 1081 |

## Provider-family concentration (ADR-006 §7)

- **Net-new 30d:** top family `we-work-remotely` 43.4% ⚠️ >40%; top-3 67.3%.
- **Active:** top family `we-work-remotely` 32.0%; top-3 62.9%.
- `(unknown)` legacy rows are excluded from these shares.

| provider family | active | net-new 30d | net-new 7d | source ids |
| --- | ---: | ---: | ---: | --- |
| we-work-remotely | 548 | 469 | 79 | we-work-remotely |
| breezy | 341 | 115 | 26 | breezy:20four7va, breezy:sourcefit, breezy:yokly, breezy:remote-craft, breezy:value-virtual-assistants, breezy:time-etc |
| workable | 187 | 144 | 19 | workable:hunt-st, workable:crewbloom, workable:coconutva, workable:pearltalent, workable:rocketams, workable:hello-rache, workable:pineapple-staffing |
| greenhouse | 149 | 26 | 0 | greenhouse:canonical, greenhouse:solarwinds, greenhouse:gitlab, greenhouse:janes, greenhouse:ghost, greenhouse:trinityparktalent, greenhouse:grafanalabs, greenhouse:nearform, greenhouse:remotecom, greenhouse:trainingthestreet |
| real-work-from-anywhere | 146 | 108 | 18 | real-work-from-anywhere |
| ashby | 117 | 67 | 4 | ashby:multiplymii, ashby:trust-wallet, ashby:railway, ashby:molecule, ashby:scalemath, ashby:whippy, ashby:cubic3, ashby:flipper, ashby:getground, ashby:luxor, ashby:finch, ashby:flutterflow, ashby:amplify, ashby:ashby, ashby:camunda, ashby:circulareconomysystems, ashby:foundry-for-good, ashby:gradient, ashby:homera-health, ashby:payscale, ashby:supabase, ashby:the-studio, ashby:tremendous |
| lever | 85 | 85 | 0 | lever:vacancies, lever:tenna, lever:levelup, lever:nibiru, lever:applydigital, lever:brevo, lever:outsourcedstaff, lever:jetsupport, lever:willowinc, lever:gushwork, lever:parcelvision, lever:piccollage, lever:audinate, lever:alltrails, lever:trustarc, lever:90seconds, lever:beaverprocess, lever:brafton, lever:decilegroup, lever:deliverect, lever:hso, lever:lwolf, lever:repurposeglobal, lever:snappr, lever:truezerotech |
| jobicy | 62 | 25 | 7 | jobicy-supporting-apac, jobicy-admin-support-apac |
| remote-ok | 60 | 38 | 6 | remote-ok |
| remotive | 15 | 4 | 1 | remotive |
| authentic-jobs | 0 | 0 | 0 | authentic-jobs |
| dribbble | 0 | 0 | 0 | dribbble |
| himalayas | 0 | 0 | 0 | himalayas:remote-jobs |

## Supply by exact source_id

| source_id | platform | active | net-new 7d | net-new 30d | inactive |
| --- | --- | ---: | ---: | ---: | ---: |
| we-work-remotely | WeWorkRemotely | 548 | 79 | 469 | 1591 |
| breezy:20four7va | 20Four7VA | 166 | 18 | 55 | 143 |
| real-work-from-anywhere | RealWorkFromAnywhere | 146 | 18 | 108 | 585 |
| workable:hunt-st | Hunt St | 142 | 13 | 111 | 132 |
| breezy:sourcefit | Breezy/sourcefit | 135 | 7 | 54 | 157 |
| greenhouse:canonical | Canonical | 123 | 0 | 2 | 197 |
| ashby:multiplymii | Ashby/multiplymii | 79 | 4 | 29 | 8 |
| remote-ok | RemoteOK | 60 | 6 | 38 | 1235 |
| jobicy-supporting-apac | Jobicy | 56 | 6 | 22 | 141 |
| lever:vacancies | Lever/vacancies | 20 | 0 | 20 | 0 |
| workable:crewbloom | CrewBloom | 19 | 3 | 13 | 71 |
| workable:coconutva | Coconut VA | 17 | 2 | 12 | 57 |
| breezy:yokly | Yokly | 16 | 1 | 5 | 1 |
| greenhouse:solarwinds | Greenhouse/solarwinds | 16 | 0 | 16 | 0 |
| remotive | Remotive | 15 | 1 | 4 | 93 |
| breezy:remote-craft | Remote Craft | 14 | 0 | 0 | 1 |
| ashby:trust-wallet | Ashby/trust-wallet | 13 | 0 | 13 | 0 |
| lever:tenna | Lever/tenna | 11 | 0 | 11 | 0 |
| breezy:value-virtual-assistants | VALUE Virtual Assistants | 10 | 0 | 1 | 1 |
| lever:levelup | Lever/levelup | 9 | 0 | 9 | 0 |
| lever:nibiru | Lever/nibiru | 8 | 0 | 8 | 0 |
| workable:pearltalent | Pearl Talent | 8 | 1 | 7 | 60 |
| ashby:railway | Ashby/railway | 6 | 0 | 6 | 0 |
| greenhouse:gitlab | GitLab | 6 | 0 | 5 | 614 |
| jobicy-admin-support-apac | Jobicy | 6 | 1 | 3 | 9 |
| lever:applydigital | Lever/applydigital | 6 | 0 | 6 | 0 |
| lever:brevo | Lever/brevo | 5 | 0 | 5 | 0 |
| lever:outsourcedstaff | Lever/outsourcedstaff | 5 | 0 | 5 | 0 |
| lever:jetsupport | Lever/jetsupport | 4 | 0 | 4 | 0 |
| lever:willowinc | Lever/willowinc | 4 | 0 | 4 | 0 |
| ashby:molecule | Ashby/molecule | 3 | 0 | 3 | 0 |
| ashby:scalemath | Ashby/scalemath | 3 | 0 | 3 | 0 |
| ashby:whippy | Ashby/whippy | 3 | 0 | 3 | 0 |
| lever:gushwork | Lever/gushwork | 3 | 0 | 3 | 0 |
| lever:parcelvision | Lever/parcelvision | 3 | 0 | 3 | 0 |
| lever:piccollage | Lever/piccollage | 3 | 0 | 3 | 0 |
| ashby:cubic3 | Ashby/cubic3 | 2 | 0 | 2 | 0 |
| ashby:flipper | Ashby/flipper | 2 | 0 | 2 | 0 |
| ashby:getground | Ashby/getground | 2 | 0 | 2 | 0 |
| ashby:luxor | Ashby/luxor | 2 | 0 | 2 | 0 |
| greenhouse:janes | Greenhouse/janes | 2 | 0 | 2 | 0 |
| lever:audinate | Lever/audinate | 2 | 0 | 2 | 0 |
| ashby:finch | Ashby/finch | 1 | 0 | 1 | 0 |
| ashby:flutterflow | Ashby/flutterflow | 1 | 0 | 1 | 0 |
| greenhouse:ghost | Ghost | 1 | 0 | 0 | 11 |
| greenhouse:trinityparktalent | Greenhouse/trinityparktalent | 1 | 0 | 1 | 0 |
| lever:alltrails | Lever/alltrails | 1 | 0 | 1 | 0 |
| lever:trustarc | Lever/trustarc | 1 | 0 | 1 | 0 |
| workable:rocketams | RocketAMS | 1 | 0 | 1 | 9 |
| ashby:amplify | Amplify | 0 | 0 | 0 | 87 |
| ashby:ashby | Ashby | 0 | 0 | 0 | 92 |
| ashby:camunda | Camunda | 0 | 0 | 0 | 67 |
| ashby:circulareconomysystems | Ashby/circulareconomysystems | 0 | 0 | 0 | 3 |
| ashby:foundry-for-good | Ashby/foundry-for-good | 0 | 0 | 0 | 27 |
| ashby:gradient | Ashby/gradient | 0 | 0 | 0 | 5 |
| ashby:homera-health | Ashby/homera-health | 0 | 0 | 0 | 1 |
| ashby:payscale | Ashby/payscale | 0 | 0 | 0 | 4 |
| ashby:supabase | Supabase | 0 | 0 | 0 | 84 |
| ashby:the-studio | Ashby/the-studio | 0 | 0 | 0 | 3 |
| ashby:tremendous | Tremendous | 0 | 0 | 0 | 31 |
| authentic-jobs | AuthenticJobs | 0 | 0 | 0 | 10 |
| breezy:time-etc | Time Etc | 0 | 0 | 0 | 2 |
| dribbble | Dribbble | 0 | 0 | 0 | 113 |
| greenhouse:grafanalabs | Grafana Labs | 0 | 0 | 0 | 403 |
| greenhouse:nearform | Nearform | 0 | 0 | 0 | 59 |
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
| workable:hello-rache | Hello Rache | 0 | 0 | 0 | 4 |
| workable:pineapple-staffing | Pineapple Staffing | 0 | 0 | 0 | 3 |

## Fetch outcomes (last 7 days)

Separates real (changed) fetches from unchanged 304 polls, intentional skips, failures, and true zero-yield. `items` counts only changed fetches, so carried-forward unchanged counts never read as new supply.

| source_id | real fetches | unchanged | skips | failures | zero-yield | items |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| remotive | 169 | 826 | 0 | 0 | 0 | 2027 |
| breezy:20four7va | 152 | 0 | 1838 | 0 | 0 | 18646 |
| greenhouse:ghost | 152 | 0 | 843 | 0 | 0 | 751 |
| greenhouse:gitlab | 152 | 0 | 843 | 0 | 0 | 35924 |
| greenhouse:grafanalabs | 152 | 0 | 843 | 0 | 0 | 18888 |
| greenhouse:nearform | 152 | 0 | 843 | 0 | 0 | 3628 |
| real-work-from-anywhere | 152 | 0 | 842 | 1 | 0 | 7600 |
| ashby:multiplymii | 151 | 0 | 844 | 0 | 0 | 7112 |
| breezy:remote-craft | 151 | 0 | 844 | 0 | 0 | 2265 |
| breezy:sourcefit | 151 | 0 | 844 | 0 | 0 | 16116 |
| breezy:time-etc | 151 | 0 | 844 | 0 | 0 | 151 |
| breezy:value-virtual-assistants | 151 | 0 | 844 | 0 | 0 | 1510 |
| breezy:yokly | 151 | 0 | 844 | 0 | 0 | 604 |
| greenhouse:canonical | 151 | 0 | 844 | 0 | 0 | 47414 |
| we-work-remotely | 148 | 842 | 0 | 5 | 0 | 14533 |
| greenhouse:remotecom | 134 | 0 | 843 | 18 | 134 | 0 |
| workable:hello-rache | 124 | 0 | 844 | 27 | 0 | 372 |
| workable:hunt-st | 124 | 0 | 844 | 27 | 0 | 17470 |
| workable:pearltalent | 124 | 0 | 844 | 27 | 0 | 37089 |
| workable:rocketams | 123 | 0 | 844 | 28 | 0 | 1230 |
| workable:coconutva | 120 | 0 | 843 | 32 | 0 | 3614 |
| workable:crewbloom | 120 | 0 | 843 | 32 | 0 | 11917 |
| remote-ok | 35 | 118 | 842 | 0 | 0 | 1561 |
| jobicy-supporting-apac | 26 | 123 | 844 | 2 | 0 | 1040 |
| jobicy-admin-support-apac | 3 | 148 | 842 | 2 | 0 | 13 |
| ashby:amplify | 0 | 0 | 995 | 0 | 0 | 0 |
| ashby:ashby | 0 | 0 | 995 | 0 | 0 | 0 |
| ashby:camunda | 0 | 0 | 995 | 0 | 0 | 0 |
| ashby:circulareconomysystems | 0 | 0 | 995 | 0 | 0 | 0 |
| ashby:cubic3 | 0 | 0 | 995 | 0 | 0 | 0 |
| ashby:flipper | 0 | 0 | 995 | 0 | 0 | 0 |
| ashby:foundry-for-good | 0 | 0 | 995 | 0 | 0 | 0 |
| ashby:getground | 0 | 0 | 995 | 0 | 0 | 0 |
| ashby:gradient | 0 | 0 | 995 | 0 | 0 | 0 |
| ashby:luxor | 0 | 0 | 995 | 0 | 0 | 0 |
| ashby:molecule | 0 | 0 | 995 | 0 | 0 | 0 |
| ashby:payscale | 0 | 0 | 995 | 0 | 0 | 0 |
| ashby:railway | 0 | 0 | 995 | 0 | 0 | 0 |
| ashby:scalemath | 0 | 0 | 995 | 0 | 0 | 0 |
| ashby:supabase | 0 | 0 | 995 | 0 | 0 | 0 |
| ashby:the-studio | 0 | 0 | 995 | 0 | 0 | 0 |
| ashby:tremendous | 0 | 0 | 995 | 0 | 0 | 0 |
| ashby:trust-wallet | 0 | 0 | 995 | 0 | 0 | 0 |
| ashby:whippy | 0 | 0 | 995 | 0 | 0 | 0 |
| authentic-jobs | 0 | 0 | 995 | 0 | 0 | 0 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 995 | 0 | 0 | 0 |
| dribbble | 0 | 0 | 995 | 0 | 0 | 0 |
| jobspresso | 0 | 0 | 995 | 0 | 0 | 0 |
| lever:applydigital | 0 | 0 | 995 | 0 | 0 | 0 |
| lever:audinate | 0 | 0 | 995 | 0 | 0 | 0 |
| lever:beaverprocess | 0 | 0 | 995 | 0 | 0 | 0 |
| lever:brafton | 0 | 0 | 995 | 0 | 0 | 0 |
| lever:brevo | 0 | 0 | 995 | 0 | 0 | 0 |
| lever:decilegroup | 0 | 0 | 995 | 0 | 0 | 0 |
| lever:deliverect | 0 | 0 | 995 | 0 | 0 | 0 |
| lever:gushwork | 0 | 0 | 995 | 0 | 0 | 0 |
| lever:jetsupport | 0 | 0 | 995 | 0 | 0 | 0 |
| lever:lwolf | 0 | 0 | 995 | 0 | 0 | 0 |
| lever:nibiru | 0 | 0 | 995 | 0 | 0 | 0 |
| lever:outsourcedstaff | 0 | 0 | 995 | 0 | 0 | 0 |
| lever:parcelvision | 0 | 0 | 995 | 0 | 0 | 0 |
| lever:piccollage | 0 | 0 | 995 | 0 | 0 | 0 |
| lever:repurposeglobal | 0 | 0 | 995 | 0 | 0 | 0 |
| lever:snappr | 0 | 0 | 995 | 0 | 0 | 0 |
| lever:tenna | 0 | 0 | 995 | 0 | 0 | 0 |
| lever:truezerotech | 0 | 0 | 995 | 0 | 0 | 0 |
| lever:vacancies | 0 | 0 | 995 | 0 | 0 | 0 |
| lever:vaultoutsourcing | 0 | 0 | 995 | 0 | 0 | 0 |
| lever:willowinc | 0 | 0 | 995 | 0 | 0 | 0 |
| onlinejobs-ph | 0 | 0 | 995 | 0 | 0 | 0 |
| problogger | 0 | 0 | 995 | 0 | 0 | 0 |
| remote-co | 0 | 0 | 995 | 0 | 0 | 0 |
| workable:connectos | 0 | 0 | 995 | 0 | 0 | 0 |
| workable:global-strategic | 0 | 0 | 995 | 0 | 0 | 0 |
| workable:myoutdesk | 0 | 0 | 995 | 0 | 0 | 0 |
| workable:outsource-access | 0 | 0 | 995 | 0 | 0 | 0 |
| workable:pineapple-staffing | 0 | 0 | 995 | 0 | 0 | 0 |
| workable:staff-domain-inc | 0 | 0 | 995 | 0 | 0 | 0 |
| workable:superstaff | 0 | 0 | 995 | 0 | 0 | 0 |
| workable:virtualstaff365 | 0 | 0 | 995 | 0 | 0 | 0 |

## Geo & eligibility triage outcomes (last 7 days)

Breakdown of stored opportunities by Philippines eligibility verdict.

| source_id | eligible | unclear | ineligible | policy_rejected | total | qualified_rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 79 | 1 | 46 | 47 | 126 | 62.7% |
| greenhouse:gitlab | 0 | 0 | 28 | 28 | 28 | 0.0% |
| jobicy-supporting-apac | 6 | 0 | 21 | 21 | 27 | 22.2% |
| breezy:20four7va | 18 | 0 | 0 | 0 | 18 | 100.0% |
| greenhouse:grafanalabs | 0 | 0 | 18 | 18 | 18 | 0.0% |
| real-work-from-anywhere | 18 | 0 | 0 | 0 | 18 | 100.0% |
| remote-ok | 6 | 3 | 8 | 11 | 17 | 35.3% |
| workable:hunt-st | 13 | 0 | 0 | 0 | 13 | 100.0% |
| breezy:sourcefit | 7 | 0 | 3 | 3 | 10 | 70.0% |
| ashby:multiplymii | 4 | 0 | 0 | 0 | 4 | 100.0% |
| workable:crewbloom | 3 | 0 | 1 | 1 | 4 | 75.0% |
| greenhouse:nearform | 0 | 0 | 2 | 2 | 2 | 0.0% |
| workable:coconutva | 2 | 0 | 0 | 0 | 2 | 100.0% |
| workable:pearltalent | 1 | 0 | 1 | 1 | 2 | 50.0% |
| breezy:yokly | 1 | 0 | 0 | 0 | 1 | 100.0% |
| greenhouse:ghost | 0 | 0 | 1 | 1 | 1 | 0.0% |
| jobicy-admin-support-apac | 1 | 0 | 0 | 0 | 1 | 100.0% |
| remotive | 1 | 0 | 0 | 0 | 1 | 100.0% |

## Yield efficiency (last 7 days)

Stored eligibility per real (changed) fetch and per 100 items seen; not marginal verified first-publication yield.
UNKNOWN means a count is missing/invalid or its denominator is zero. Fetch and stored cohorts may differ across intake paths; these descriptive ratios do not establish source productivity or causal yield.

| source_id | real fetches | items seen | eligible stored | yield / fetch | yield / 100 items |
| --- | ---: | ---: | ---: | ---: | ---: |
| remotive | 169 | 2027 | 1 | 0.01 | 0.05 |
| breezy:20four7va | 152 | 18646 | 18 | 0.12 | 0.10 |
| greenhouse:ghost | 152 | 751 | 0 | 0.00 | 0.00 |
| greenhouse:gitlab | 152 | 35924 | 0 | 0.00 | 0.00 |
| greenhouse:grafanalabs | 152 | 18888 | 0 | 0.00 | 0.00 |
| greenhouse:nearform | 152 | 3628 | 0 | 0.00 | 0.00 |
| real-work-from-anywhere | 152 | 7600 | 18 | 0.12 | 0.24 |
| ashby:multiplymii | 151 | 7112 | 4 | 0.03 | 0.06 |
| breezy:remote-craft | 151 | 2265 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:sourcefit | 151 | 16116 | 7 | 0.05 | 0.04 |
| breezy:time-etc | 151 | 151 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:value-virtual-assistants | 151 | 1510 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:yokly | 151 | 604 | 1 | 0.01 | 0.17 |
| greenhouse:canonical | 151 | 47414 | UNKNOWN | UNKNOWN | UNKNOWN |
| we-work-remotely | 148 | 14533 | 79 | 0.53 | 0.54 |
| greenhouse:remotecom | 134 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| workable:hello-rache | 124 | 372 | UNKNOWN | UNKNOWN | UNKNOWN |
| workable:hunt-st | 124 | 17470 | 13 | 0.10 | 0.07 |
| workable:pearltalent | 124 | 37089 | 1 | 0.01 | 0.00 |
| workable:rocketams | 123 | 1230 | UNKNOWN | UNKNOWN | UNKNOWN |
| workable:coconutva | 120 | 3614 | 2 | 0.02 | 0.06 |
| workable:crewbloom | 120 | 11917 | 3 | 0.03 | 0.03 |
| remote-ok | 35 | 1561 | 6 | 0.17 | 0.38 |
| jobicy-supporting-apac | 26 | 1040 | 6 | 0.23 | 0.58 |
| jobicy-admin-support-apac | 3 | 13 | 1 | 0.33 | 7.69 |
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
