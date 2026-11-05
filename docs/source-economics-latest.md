# Source economics — latest (SP-02)

- **As of:** 2026-11-05T09:46:21.571Z
- **Windows:** 7d/14d/30d net-new by `scraped_at`
- **Reconciliation:** OK (every partition delta is zero)
- Read-only report; regenerate with `scripts/diagnostics/source-economics.ts`.

## Qualified supply (strict eligibility; first-stored proxy)

Excludes unclear/ineligible rows. Historical publication and later deactivation are not fully reconstructed.

| qualified active | qualified new 7d | per day (7d) | qualified new 30d | per day (30d) |
| ---: | ---: | ---: | ---: | ---: |
| 1714 | 153 | 21.86 | 1063 | 35.43 |

## Identity coverage (SP-01)

| total | with source_id | null source_id | coverage | active null-id |
| ---: | ---: | ---: | ---: | ---: |
| 8573 | 8573 | 0 | 100.0% | 0 |

## Net-new accepted supply

| active | net-new 7d | net-new 14d | net-new 30d |
| ---: | ---: | ---: | ---: |
| 1714 | 153 | 422 | 1063 |

## Provider-family concentration (ADR-006 §7)

- **Net-new 30d:** top family `we-work-remotely` 42.5% ⚠️ >40%; top-3 67.0%.
- **Active:** top family `we-work-remotely` 31.6%; top-3 62.8%.
- `(unknown)` legacy rows are excluded from these shares.

| provider family | active | net-new 30d | net-new 7d | source ids |
| --- | ---: | ---: | ---: | --- |
| we-work-remotely | 541 | 452 | 68 | we-work-remotely |
| breezy | 344 | 114 | 25 | breezy:20four7va, breezy:sourcefit, breezy:yokly, breezy:remote-craft, breezy:value-virtual-assistants, breezy:time-etc |
| workable | 191 | 146 | 18 | workable:hunt-st, workable:crewbloom, workable:coconutva, workable:pearltalent, workable:rocketams, workable:hello-rache, workable:pineapple-staffing |
| greenhouse | 149 | 26 | 0 | greenhouse:canonical, greenhouse:solarwinds, greenhouse:gitlab, greenhouse:janes, greenhouse:ghost, greenhouse:trinityparktalent, greenhouse:grafanalabs, greenhouse:nearform, greenhouse:remotecom, greenhouse:trainingthestreet |
| real-work-from-anywhere | 148 | 110 | 21 | real-work-from-anywhere |
| ashby | 118 | 63 | 6 | ashby:multiplymii, ashby:trust-wallet, ashby:railway, ashby:molecule, ashby:scalemath, ashby:whippy, ashby:cubic3, ashby:flipper, ashby:getground, ashby:luxor, ashby:finch, ashby:flutterflow, ashby:amplify, ashby:ashby, ashby:camunda, ashby:circulareconomysystems, ashby:foundry-for-good, ashby:gradient, ashby:homera-health, ashby:payscale, ashby:supabase, ashby:the-studio, ashby:tremendous |
| lever | 84 | 84 | 0 | lever:vacancies, lever:tenna, lever:levelup, lever:nibiru, lever:applydigital, lever:brevo, lever:outsourcedstaff, lever:jetsupport, lever:willowinc, lever:gushwork, lever:parcelvision, lever:piccollage, lever:audinate, lever:alltrails, lever:90seconds, lever:beaverprocess, lever:brafton, lever:decilegroup, lever:deliverect, lever:hso, lever:lwolf, lever:repurposeglobal, lever:snappr, lever:truezerotech, lever:trustarc |
| jobicy | 62 | 25 | 6 | jobicy-supporting-apac, jobicy-admin-support-apac |
| remote-ok | 62 | 39 | 8 | remote-ok |
| remotive | 15 | 4 | 1 | remotive |
| authentic-jobs | 0 | 0 | 0 | authentic-jobs |
| dribbble | 0 | 0 | 0 | dribbble |
| himalayas | 0 | 0 | 0 | himalayas:remote-jobs |

## Supply by exact source_id

| source_id | platform | active | net-new 7d | net-new 30d | inactive |
| --- | --- | ---: | ---: | ---: | ---: |
| we-work-remotely | WeWorkRemotely | 541 | 68 | 452 | 1614 |
| breezy:20four7va | 20Four7VA | 168 | 17 | 55 | 143 |
| real-work-from-anywhere | RealWorkFromAnywhere | 148 | 21 | 110 | 589 |
| workable:hunt-st | Hunt St | 142 | 9 | 109 | 136 |
| breezy:sourcefit | Breezy/sourcefit | 136 | 7 | 53 | 163 |
| greenhouse:canonical | Canonical | 123 | 0 | 2 | 199 |
| ashby:multiplymii | Ashby/multiplymii | 80 | 6 | 27 | 9 |
| remote-ok | RemoteOK | 62 | 8 | 39 | 1237 |
| jobicy-supporting-apac | Jobicy | 56 | 5 | 22 | 142 |
| lever:vacancies | Lever/vacancies | 20 | 0 | 20 | 0 |
| workable:crewbloom | CrewBloom | 20 | 4 | 14 | 71 |
| workable:coconutva | Coconut VA | 19 | 4 | 14 | 57 |
| breezy:yokly | Yokly | 16 | 1 | 5 | 1 |
| greenhouse:solarwinds | Greenhouse/solarwinds | 16 | 0 | 16 | 0 |
| remotive | Remotive | 15 | 1 | 4 | 94 |
| breezy:remote-craft | Remote Craft | 14 | 0 | 0 | 1 |
| ashby:trust-wallet | Ashby/trust-wallet | 13 | 0 | 13 | 0 |
| lever:tenna | Lever/tenna | 11 | 0 | 11 | 0 |
| breezy:value-virtual-assistants | VALUE Virtual Assistants | 10 | 0 | 1 | 1 |
| lever:levelup | Lever/levelup | 9 | 0 | 9 | 0 |
| workable:pearltalent | Pearl Talent | 9 | 1 | 8 | 60 |
| lever:nibiru | Lever/nibiru | 8 | 0 | 8 | 0 |
| ashby:railway | Ashby/railway | 6 | 0 | 6 | 0 |
| greenhouse:gitlab | GitLab | 6 | 0 | 5 | 623 |
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
| ashby:getground | Ashby/getground | 2 | 0 | 0 | 0 |
| ashby:luxor | Ashby/luxor | 2 | 0 | 2 | 0 |
| greenhouse:janes | Greenhouse/janes | 2 | 0 | 2 | 0 |
| lever:audinate | Lever/audinate | 2 | 0 | 2 | 0 |
| ashby:finch | Ashby/finch | 1 | 0 | 1 | 0 |
| ashby:flutterflow | Ashby/flutterflow | 1 | 0 | 1 | 0 |
| greenhouse:ghost | Ghost | 1 | 0 | 0 | 11 |
| greenhouse:trinityparktalent | Greenhouse/trinityparktalent | 1 | 0 | 1 | 0 |
| lever:alltrails | Lever/alltrails | 1 | 0 | 1 | 0 |
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
| greenhouse:grafanalabs | Grafana Labs | 0 | 0 | 0 | 408 |
| greenhouse:nearform | Nearform | 0 | 0 | 0 | 60 |
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
| remotive | 168 | 824 | 0 | 0 | 0 | 2011 |
| breezy:20four7va | 153 | 0 | 1831 | 0 | 0 | 18710 |
| greenhouse:ghost | 153 | 0 | 839 | 0 | 0 | 765 |
| greenhouse:gitlab | 153 | 0 | 839 | 0 | 0 | 36337 |
| greenhouse:grafanalabs | 153 | 0 | 839 | 0 | 0 | 18939 |
| greenhouse:nearform | 153 | 0 | 839 | 0 | 0 | 3716 |
| greenhouse:remotecom | 153 | 0 | 839 | 0 | 153 | 0 |
| ashby:multiplymii | 152 | 0 | 840 | 0 | 0 | 7069 |
| breezy:remote-craft | 152 | 0 | 840 | 0 | 0 | 2280 |
| breezy:sourcefit | 152 | 0 | 840 | 0 | 0 | 16371 |
| breezy:time-etc | 152 | 0 | 840 | 0 | 0 | 152 |
| breezy:value-virtual-assistants | 152 | 0 | 840 | 0 | 0 | 1520 |
| breezy:yokly | 152 | 0 | 840 | 0 | 0 | 608 |
| greenhouse:canonical | 152 | 0 | 840 | 0 | 0 | 47764 |
| we-work-remotely | 151 | 834 | 0 | 7 | 0 | 14946 |
| real-work-from-anywhere | 150 | 0 | 839 | 3 | 0 | 7500 |
| workable:hello-rache | 122 | 0 | 841 | 29 | 0 | 366 |
| workable:pearltalent | 122 | 0 | 841 | 29 | 0 | 36126 |
| workable:hunt-st | 120 | 0 | 841 | 31 | 0 | 16676 |
| workable:rocketams | 119 | 0 | 841 | 32 | 0 | 1177 |
| workable:coconutva | 118 | 0 | 840 | 34 | 0 | 3555 |
| workable:crewbloom | 118 | 0 | 840 | 34 | 0 | 11866 |
| remote-ok | 45 | 107 | 839 | 1 | 0 | 2015 |
| jobicy-supporting-apac | 23 | 127 | 840 | 2 | 0 | 920 |
| jobicy-admin-support-apac | 2 | 151 | 839 | 0 | 0 | 9 |
| ashby:amplify | 0 | 0 | 992 | 0 | 0 | 0 |
| ashby:ashby | 0 | 0 | 992 | 0 | 0 | 0 |
| ashby:camunda | 0 | 0 | 992 | 0 | 0 | 0 |
| ashby:circulareconomysystems | 0 | 0 | 992 | 0 | 0 | 0 |
| ashby:cubic3 | 0 | 0 | 992 | 0 | 0 | 0 |
| ashby:flipper | 0 | 0 | 992 | 0 | 0 | 0 |
| ashby:foundry-for-good | 0 | 0 | 992 | 0 | 0 | 0 |
| ashby:getground | 0 | 0 | 992 | 0 | 0 | 0 |
| ashby:gradient | 0 | 0 | 992 | 0 | 0 | 0 |
| ashby:luxor | 0 | 0 | 992 | 0 | 0 | 0 |
| ashby:molecule | 0 | 0 | 992 | 0 | 0 | 0 |
| ashby:payscale | 0 | 0 | 992 | 0 | 0 | 0 |
| ashby:railway | 0 | 0 | 992 | 0 | 0 | 0 |
| ashby:scalemath | 0 | 0 | 992 | 0 | 0 | 0 |
| ashby:supabase | 0 | 0 | 992 | 0 | 0 | 0 |
| ashby:the-studio | 0 | 0 | 992 | 0 | 0 | 0 |
| ashby:tremendous | 0 | 0 | 992 | 0 | 0 | 0 |
| ashby:trust-wallet | 0 | 0 | 992 | 0 | 0 | 0 |
| ashby:whippy | 0 | 0 | 992 | 0 | 0 | 0 |
| authentic-jobs | 0 | 0 | 992 | 0 | 0 | 0 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 992 | 0 | 0 | 0 |
| dribbble | 0 | 0 | 992 | 0 | 0 | 0 |
| jobspresso | 0 | 0 | 992 | 0 | 0 | 0 |
| lever:applydigital | 0 | 0 | 992 | 0 | 0 | 0 |
| lever:audinate | 0 | 0 | 992 | 0 | 0 | 0 |
| lever:beaverprocess | 0 | 0 | 992 | 0 | 0 | 0 |
| lever:brafton | 0 | 0 | 992 | 0 | 0 | 0 |
| lever:brevo | 0 | 0 | 992 | 0 | 0 | 0 |
| lever:decilegroup | 0 | 0 | 992 | 0 | 0 | 0 |
| lever:deliverect | 0 | 0 | 992 | 0 | 0 | 0 |
| lever:gushwork | 0 | 0 | 992 | 0 | 0 | 0 |
| lever:jetsupport | 0 | 0 | 992 | 0 | 0 | 0 |
| lever:lwolf | 0 | 0 | 992 | 0 | 0 | 0 |
| lever:nibiru | 0 | 0 | 992 | 0 | 0 | 0 |
| lever:outsourcedstaff | 0 | 0 | 992 | 0 | 0 | 0 |
| lever:parcelvision | 0 | 0 | 992 | 0 | 0 | 0 |
| lever:piccollage | 0 | 0 | 992 | 0 | 0 | 0 |
| lever:repurposeglobal | 0 | 0 | 992 | 0 | 0 | 0 |
| lever:snappr | 0 | 0 | 992 | 0 | 0 | 0 |
| lever:tenna | 0 | 0 | 992 | 0 | 0 | 0 |
| lever:truezerotech | 0 | 0 | 992 | 0 | 0 | 0 |
| lever:vacancies | 0 | 0 | 992 | 0 | 0 | 0 |
| lever:vaultoutsourcing | 0 | 0 | 992 | 0 | 0 | 0 |
| lever:willowinc | 0 | 0 | 992 | 0 | 0 | 0 |
| onlinejobs-ph | 0 | 0 | 992 | 0 | 0 | 0 |
| problogger | 0 | 0 | 992 | 0 | 0 | 0 |
| remote-co | 0 | 0 | 992 | 0 | 0 | 0 |
| workable:connectos | 0 | 0 | 992 | 0 | 0 | 0 |
| workable:global-strategic | 0 | 0 | 992 | 0 | 0 | 0 |
| workable:myoutdesk | 0 | 0 | 992 | 0 | 0 | 0 |
| workable:outsource-access | 0 | 0 | 992 | 0 | 0 | 0 |
| workable:pineapple-staffing | 0 | 0 | 992 | 0 | 0 | 0 |
| workable:staff-domain-inc | 0 | 0 | 992 | 0 | 0 | 0 |
| workable:superstaff | 0 | 0 | 992 | 0 | 0 | 0 |
| workable:virtualstaff365 | 0 | 0 | 992 | 0 | 0 | 0 |

## Geo & eligibility triage outcomes (last 7 days)

Breakdown of stored opportunities by Philippines eligibility verdict.

| source_id | eligible | unclear | ineligible | policy_rejected | total | qualified_rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 68 | 1 | 48 | 49 | 117 | 58.1% |
| greenhouse:gitlab | 0 | 0 | 35 | 35 | 35 | 0.0% |
| greenhouse:grafanalabs | 0 | 0 | 22 | 22 | 22 | 0.0% |
| real-work-from-anywhere | 21 | 0 | 0 | 0 | 21 | 100.0% |
| remote-ok | 8 | 4 | 9 | 13 | 21 | 38.1% |
| jobicy-supporting-apac | 5 | 0 | 15 | 15 | 20 | 25.0% |
| breezy:20four7va | 17 | 0 | 0 | 0 | 17 | 100.0% |
| breezy:sourcefit | 7 | 0 | 5 | 5 | 12 | 58.3% |
| workable:hunt-st | 9 | 3 | 0 | 0 | 12 | 75.0% |
| ashby:multiplymii | 6 | 0 | 0 | 0 | 6 | 100.0% |
| workable:crewbloom | 4 | 0 | 1 | 1 | 5 | 80.0% |
| workable:coconutva | 4 | 0 | 0 | 0 | 4 | 100.0% |
| greenhouse:nearform | 0 | 0 | 3 | 3 | 3 | 0.0% |
| greenhouse:canonical | 0 | 0 | 2 | 2 | 2 | 0.0% |
| remotive | 1 | 0 | 1 | 1 | 2 | 50.0% |
| workable:pearltalent | 1 | 0 | 1 | 1 | 2 | 50.0% |
| breezy:yokly | 1 | 0 | 0 | 0 | 1 | 100.0% |
| jobicy-admin-support-apac | 1 | 0 | 0 | 0 | 1 | 100.0% |

## Yield efficiency (last 7 days)

Stored eligibility per real (changed) fetch and per 100 items seen; not marginal verified first-publication yield.
UNKNOWN means a count is missing/invalid or its denominator is zero. Fetch and stored cohorts may differ across intake paths; these descriptive ratios do not establish source productivity or causal yield.

| source_id | real fetches | items seen | eligible stored | yield / fetch | yield / 100 items |
| --- | ---: | ---: | ---: | ---: | ---: |
| remotive | 168 | 2011 | 1 | 0.01 | 0.05 |
| breezy:20four7va | 153 | 18710 | 17 | 0.11 | 0.09 |
| greenhouse:ghost | 153 | 765 | UNKNOWN | UNKNOWN | UNKNOWN |
| greenhouse:gitlab | 153 | 36337 | 0 | 0.00 | 0.00 |
| greenhouse:grafanalabs | 153 | 18939 | 0 | 0.00 | 0.00 |
| greenhouse:nearform | 153 | 3716 | 0 | 0.00 | 0.00 |
| greenhouse:remotecom | 153 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:multiplymii | 152 | 7069 | 6 | 0.04 | 0.08 |
| breezy:remote-craft | 152 | 2280 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:sourcefit | 152 | 16371 | 7 | 0.05 | 0.04 |
| breezy:time-etc | 152 | 152 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:value-virtual-assistants | 152 | 1520 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:yokly | 152 | 608 | 1 | 0.01 | 0.16 |
| greenhouse:canonical | 152 | 47764 | 0 | 0.00 | 0.00 |
| we-work-remotely | 151 | 14946 | 68 | 0.45 | 0.45 |
| real-work-from-anywhere | 150 | 7500 | 21 | 0.14 | 0.28 |
| workable:hello-rache | 122 | 366 | UNKNOWN | UNKNOWN | UNKNOWN |
| workable:pearltalent | 122 | 36126 | 1 | 0.01 | 0.00 |
| workable:hunt-st | 120 | 16676 | 9 | 0.07 | 0.05 |
| workable:rocketams | 119 | 1177 | UNKNOWN | UNKNOWN | UNKNOWN |
| workable:coconutva | 118 | 3555 | 4 | 0.03 | 0.11 |
| workable:crewbloom | 118 | 11866 | 4 | 0.03 | 0.03 |
| remote-ok | 45 | 2015 | 8 | 0.18 | 0.40 |
| jobicy-supporting-apac | 23 | 920 | 5 | 0.22 | 0.54 |
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
