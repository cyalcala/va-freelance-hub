# Source economics — latest (SP-02)

- **As of:** 2026-11-17T11:01:35.068Z
- **Windows:** 7d/14d/30d net-new by `scraped_at`
- **Reconciliation:** OK (every partition delta is zero)
- Read-only report; regenerate with `scripts/diagnostics/source-economics.ts`.

## Qualified supply (strict eligibility; first-stored proxy)

Excludes unclear/ineligible rows. Historical publication and later deactivation are not fully reconstructed.

| qualified active | qualified new 7d | per day (7d) | qualified new 30d | per day (30d) |
| ---: | ---: | ---: | ---: | ---: |
| 1645 | 163 | 23.29 | 928 | 30.93 |

## Identity coverage (SP-01)

| total | with source_id | null source_id | coverage | active null-id |
| ---: | ---: | ---: | ---: | ---: |
| 9206 | 9206 | 0 | 100.0% | 0 |

## Net-new accepted supply

| active | net-new 7d | net-new 14d | net-new 30d |
| ---: | ---: | ---: | ---: |
| 1645 | 163 | 311 | 928 |

## Provider-family concentration (ADR-006 §7)

- **Net-new 30d:** top family `we-work-remotely` 36.5%; top-3 66.5%.
- **Active:** top family `we-work-remotely` 26.6%; top-3 62.4%.
- `(unknown)` legacy rows are excluded from these shares.

| provider family | active | net-new 30d | net-new 7d | source ids |
| --- | ---: | ---: | ---: | --- |
| we-work-remotely | 437 | 339 | 61 | we-work-remotely |
| breezy | 347 | 114 | 13 | breezy:20four7va, breezy:sourcefit, breezy:yokly, breezy:remote-craft, breezy:value-virtual-assistants, breezy:time-etc |
| workable | 243 | 164 | 36 | workable:hunt-st, workable:crewbloom, workable:coconutva, workable:pearltalent, workable:rocketams, workable:hello-rache, workable:pineapple-staffing |
| real-work-from-anywhere | 153 | 105 | 27 | real-work-from-anywhere |
| greenhouse | 146 | 18 | 1 | greenhouse:canonical, greenhouse:solarwinds, greenhouse:gitlab, greenhouse:ghost, greenhouse:trinityparktalent, greenhouse:grafanalabs, greenhouse:janes, greenhouse:nearform, greenhouse:remotecom, greenhouse:trainingthestreet |
| ashby | 111 | 52 | 10 | ashby:multiplymii, ashby:trust-wallet, ashby:railway, ashby:scalemath, ashby:whippy, ashby:cubic3, ashby:flipper, ashby:flutterflow, ashby:amplify, ashby:ashby, ashby:camunda, ashby:circulareconomysystems, ashby:finch, ashby:foundry-for-good, ashby:getground, ashby:gradient, ashby:homera-health, ashby:luxor, ashby:molecule, ashby:payscale, ashby:supabase, ashby:the-studio, ashby:tremendous |
| lever | 67 | 67 | 0 | lever:vacancies, lever:levelup, lever:nibiru, lever:brevo, lever:outsourcedstaff, lever:jetsupport, lever:willowinc, lever:gushwork, lever:parcelvision, lever:piccollage, lever:audinate, lever:alltrails, lever:90seconds, lever:applydigital, lever:beaverprocess, lever:brafton, lever:decilegroup, lever:deliverect, lever:hso, lever:lwolf, lever:repurposeglobal, lever:snappr, lever:tenna, lever:truezerotech, lever:trustarc |
| jobicy | 65 | 27 | 5 | jobicy-supporting-apac, jobicy-admin-support-apac |
| remote-ok | 61 | 37 | 8 | remote-ok |
| remotive | 15 | 5 | 2 | remotive |
| authentic-jobs | 0 | 0 | 0 | authentic-jobs |
| dribbble | 0 | 0 | 0 | dribbble |
| himalayas | 0 | 0 | 0 | himalayas:remote-jobs |

## Supply by exact source_id

| source_id | platform | active | net-new 7d | net-new 30d | inactive |
| --- | --- | ---: | ---: | ---: | ---: |
| we-work-remotely | WeWorkRemotely | 437 | 61 | 339 | 2009 |
| breezy:20four7va | 20Four7VA | 180 | 9 | 61 | 157 |
| workable:hunt-st | Hunt St | 175 | 25 | 110 | 143 |
| real-work-from-anywhere | RealWorkFromAnywhere | 153 | 27 | 105 | 649 |
| breezy:sourcefit | Breezy/sourcefit | 127 | 4 | 48 | 189 |
| greenhouse:canonical | Canonical | 122 | 1 | 1 | 201 |
| ashby:multiplymii | Ashby/multiplymii | 81 | 10 | 22 | 18 |
| remote-ok | RemoteOK | 61 | 8 | 37 | 1266 |
| jobicy-supporting-apac | Jobicy | 58 | 5 | 24 | 160 |
| workable:crewbloom | CrewBloom | 30 | 7 | 22 | 77 |
| workable:coconutva | Coconut VA | 24 | 2 | 19 | 57 |
| lever:vacancies | Lever/vacancies | 20 | 0 | 20 | 0 |
| breezy:yokly | Yokly | 16 | 0 | 5 | 1 |
| greenhouse:solarwinds | Greenhouse/solarwinds | 16 | 0 | 16 | 0 |
| remotive | Remotive | 15 | 2 | 5 | 99 |
| breezy:remote-craft | Remote Craft | 14 | 0 | 0 | 1 |
| ashby:trust-wallet | Ashby/trust-wallet | 13 | 0 | 13 | 0 |
| workable:pearltalent | Pearl Talent | 13 | 2 | 12 | 65 |
| breezy:value-virtual-assistants | VALUE Virtual Assistants | 10 | 0 | 0 | 1 |
| lever:levelup | Lever/levelup | 9 | 0 | 9 | 0 |
| lever:nibiru | Lever/nibiru | 8 | 0 | 8 | 0 |
| jobicy-admin-support-apac | Jobicy | 7 | 0 | 3 | 9 |
| ashby:railway | Ashby/railway | 6 | 0 | 6 | 0 |
| greenhouse:gitlab | GitLab | 6 | 0 | 0 | 676 |
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
| lever:audinate | Lever/audinate | 2 | 0 | 2 | 0 |
| ashby:flutterflow | Ashby/flutterflow | 1 | 0 | 1 | 0 |
| greenhouse:ghost | Ghost | 1 | 0 | 0 | 11 |
| greenhouse:trinityparktalent | Greenhouse/trinityparktalent | 1 | 0 | 1 | 0 |
| lever:alltrails | Lever/alltrails | 1 | 0 | 1 | 0 |
| workable:rocketams | RocketAMS | 1 | 0 | 1 | 10 |
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
| greenhouse:grafanalabs | Grafana Labs | 0 | 0 | 0 | 449 |
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
| lever:hso | Lever/hso | 0 | 0 | 0 | 1 |
| lever:lwolf | Lever/lwolf | 0 | 0 | 0 | 4 |
| lever:repurposeglobal | Lever/repurposeglobal | 0 | 0 | 0 | 3 |
| lever:snappr | Lever/snappr | 0 | 0 | 0 | 13 |
| lever:tenna | Lever/tenna | 0 | 0 | 0 | 11 |
| lever:truezerotech | Lever/truezerotech | 0 | 0 | 0 | 17 |
| lever:trustarc | Lever/trustarc | 0 | 0 | 0 | 1 |
| workable:hello-rache | Hello Rache | 0 | 0 | 0 | 4 |
| workable:pineapple-staffing | Pineapple Staffing | 0 | 0 | 0 | 3 |

## Fetch outcomes (last 7 days)

Separates real (changed) fetches from unchanged 304 polls, intentional skips, failures, and true zero-yield. `items` counts only changed fetches, so carried-forward unchanged counts never read as new supply.

| source_id | real fetches | unchanged | skips | failures | zero-yield | items |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| remotive | 166 | 788 | 0 | 0 | 0 | 2677 |
| we-work-remotely | 153 | 786 | 0 | 15 | 0 | 15299 |
| real-work-from-anywhere | 148 | 0 | 806 | 0 | 0 | 7400 |
| breezy:20four7va | 147 | 0 | 1761 | 0 | 0 | 17959 |
| breezy:remote-craft | 147 | 0 | 807 | 0 | 0 | 2205 |
| breezy:sourcefit | 147 | 0 | 807 | 0 | 0 | 15287 |
| breezy:time-etc | 147 | 0 | 807 | 0 | 0 | 147 |
| breezy:value-virtual-assistants | 147 | 0 | 807 | 0 | 0 | 1470 |
| breezy:yokly | 147 | 0 | 807 | 0 | 0 | 588 |
| greenhouse:canonical | 147 | 0 | 807 | 0 | 0 | 46452 |
| greenhouse:ghost | 147 | 0 | 807 | 0 | 0 | 735 |
| greenhouse:gitlab | 147 | 0 | 807 | 0 | 0 | 37295 |
| greenhouse:grafanalabs | 147 | 0 | 807 | 0 | 0 | 20984 |
| greenhouse:nearform | 147 | 0 | 807 | 0 | 0 | 3884 |
| greenhouse:remotecom | 147 | 0 | 807 | 0 | 147 | 0 |
| ashby:multiplymii | 146 | 0 | 807 | 1 | 0 | 6894 |
| workable:coconutva | 93 | 0 | 810 | 51 | 0 | 3019 |
| workable:crewbloom | 93 | 0 | 810 | 51 | 0 | 8054 |
| workable:hunt-st | 91 | 0 | 809 | 54 | 0 | 11300 |
| workable:rocketams | 91 | 0 | 809 | 54 | 0 | 827 |
| workable:hello-rache | 85 | 0 | 810 | 59 | 0 | 255 |
| workable:pearltalent | 85 | 0 | 810 | 59 | 0 | 24338 |
| remote-ok | 31 | 117 | 806 | 0 | 0 | 1312 |
| jobicy-supporting-apac | 29 | 115 | 807 | 3 | 0 | 1160 |
| jobicy-admin-support-apac | 5 | 140 | 809 | 0 | 0 | 21 |
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
| we-work-remotely | 61 | 3 | 110 | 113 | 174 | 35.1% |
| real-work-from-anywhere | 27 | 7 | 3 | 10 | 37 | 73.0% |
| greenhouse:gitlab | 0 | 0 | 30 | 30 | 30 | 0.0% |
| workable:hunt-st | 25 | 0 | 1 | 1 | 26 | 96.2% |
| greenhouse:grafanalabs | 0 | 0 | 22 | 22 | 22 | 0.0% |
| remote-ok | 8 | 0 | 5 | 5 | 13 | 61.5% |
| workable:crewbloom | 8 | 0 | 5 | 5 | 13 | 61.5% |
| ashby:multiplymii | 10 | 0 | 0 | 0 | 10 | 100.0% |
| breezy:20four7va | 9 | 0 | 1 | 1 | 10 | 90.0% |
| jobicy-supporting-apac | 5 | 0 | 3 | 3 | 8 | 62.5% |
| breezy:sourcefit | 4 | 0 | 2 | 2 | 6 | 66.7% |
| workable:pearltalent | 2 | 0 | 3 | 3 | 5 | 40.0% |
| remotive | 2 | 0 | 2 | 2 | 4 | 50.0% |
| workable:coconutva | 2 | 0 | 0 | 0 | 2 | 100.0% |
| greenhouse:canonical | 1 | 0 | 0 | 0 | 1 | 100.0% |
| greenhouse:nearform | 0 | 0 | 1 | 1 | 1 | 0.0% |

## Yield efficiency (last 7 days)

Stored eligibility per real (changed) fetch and per 100 items seen; not marginal verified first-publication yield.
UNKNOWN means a count is missing/invalid or its denominator is zero. Fetch and stored cohorts may differ across intake paths; these descriptive ratios do not establish source productivity or causal yield.

| source_id | real fetches | items seen | eligible stored | yield / fetch | yield / 100 items |
| --- | ---: | ---: | ---: | ---: | ---: |
| remotive | 166 | 2677 | 2 | 0.01 | 0.07 |
| we-work-remotely | 153 | 15299 | 61 | 0.40 | 0.40 |
| real-work-from-anywhere | 148 | 7400 | 27 | 0.18 | 0.36 |
| breezy:20four7va | 147 | 17959 | 9 | 0.06 | 0.05 |
| breezy:remote-craft | 147 | 2205 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:sourcefit | 147 | 15287 | 4 | 0.03 | 0.03 |
| breezy:time-etc | 147 | 147 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:value-virtual-assistants | 147 | 1470 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:yokly | 147 | 588 | UNKNOWN | UNKNOWN | UNKNOWN |
| greenhouse:canonical | 147 | 46452 | 1 | 0.01 | 0.00 |
| greenhouse:ghost | 147 | 735 | UNKNOWN | UNKNOWN | UNKNOWN |
| greenhouse:gitlab | 147 | 37295 | 0 | 0.00 | 0.00 |
| greenhouse:grafanalabs | 147 | 20984 | 0 | 0.00 | 0.00 |
| greenhouse:nearform | 147 | 3884 | 0 | 0.00 | 0.00 |
| greenhouse:remotecom | 147 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| ashby:multiplymii | 146 | 6894 | 10 | 0.07 | 0.15 |
| workable:coconutva | 93 | 3019 | 2 | 0.02 | 0.07 |
| workable:crewbloom | 93 | 8054 | 8 | 0.09 | 0.10 |
| workable:hunt-st | 91 | 11300 | 25 | 0.27 | 0.22 |
| workable:rocketams | 91 | 827 | UNKNOWN | UNKNOWN | UNKNOWN |
| workable:hello-rache | 85 | 255 | UNKNOWN | UNKNOWN | UNKNOWN |
| workable:pearltalent | 85 | 24338 | 2 | 0.02 | 0.01 |
| remote-ok | 31 | 1312 | 8 | 0.26 | 0.61 |
| jobicy-supporting-apac | 29 | 1160 | 5 | 0.17 | 0.43 |
| jobicy-admin-support-apac | 5 | 21 | UNKNOWN | UNKNOWN | UNKNOWN |
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
