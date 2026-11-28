# Source economics — latest (SP-02)

- **As of:** 2026-11-28T10:46:34.667Z
- **Windows:** 7d/14d/30d net-new by `scraped_at`
- **Reconciliation:** OK (every partition delta is zero)
- Read-only report; regenerate with `scripts/diagnostics/source-economics.ts`.

## Qualified supply (strict eligibility; first-stored proxy)

Excludes unclear/ineligible rows. Historical publication and later deactivation are not fully reconstructed.

| qualified active | qualified new 7d | per day (7d) | qualified new 30d | per day (30d) |
| ---: | ---: | ---: | ---: | ---: |
| 2112 | 635 | 90.71 | 1360 | 45.33 |

## Identity coverage (SP-01)

| total | with source_id | null source_id | coverage | active null-id |
| ---: | ---: | ---: | ---: | ---: |
| 10943 | 10943 | 0 | 100.0% | 0 |

## Net-new accepted supply

| active | net-new 7d | net-new 14d | net-new 30d |
| ---: | ---: | ---: | ---: |
| 2112 | 635 | 987 | 1360 |

## Provider-family concentration (ADR-006 §7)

- **Net-new 30d:** top family `we-work-remotely` 68.3% ⚠️ >40%; top-3 85.4% ⚠️ >70%.
- **Active:** top family `we-work-remotely` 48.7% ⚠️ >40%; top-3 76.6% ⚠️ >70%.
- `(unknown)` legacy rows are excluded from these shares.

| provider family | active | net-new 30d | net-new 7d | source ids |
| --- | ---: | ---: | ---: | --- |
| we-work-remotely | 1029 | 929 | 543 | we-work-remotely |
| breezy | 348 | 96 | 24 | breezy:20four7va, breezy:sourcefit, breezy:remote-craft, breezy:yokly, breezy:value-virtual-assistants, breezy:time-etc |
| workable | 241 | 124 | 27 | workable:hunt-st, workable:crewbloom, workable:coconutva, workable:pearltalent, workable:rocketams, workable:hello-rache, workable:pineapple-staffing |
| real-work-from-anywhere | 148 | 108 | 21 | real-work-from-anywhere |
| greenhouse | 131 | 3 | 1 | greenhouse:canonical, greenhouse:gitlab, greenhouse:ghost, greenhouse:grafanalabs, greenhouse:janes, greenhouse:nearform, greenhouse:remotecom, greenhouse:solarwinds, greenhouse:trainingthestreet, greenhouse:trinityparktalent |
| remote-ok | 74 | 52 | 11 | remote-ok |
| ashby | 66 | 19 | 2 | ashby:multiplymii, ashby:amplify, ashby:ashby, ashby:camunda, ashby:circulareconomysystems, ashby:cubic3, ashby:finch, ashby:flipper, ashby:flutterflow, ashby:foundry-for-good, ashby:getground, ashby:gradient, ashby:homera-health, ashby:luxor, ashby:molecule, ashby:payscale, ashby:railway, ashby:scalemath, ashby:supabase, ashby:the-studio, ashby:tremendous, ashby:trust-wallet, ashby:whippy |
| jobicy | 63 | 26 | 6 | jobicy-supporting-apac, jobicy-admin-support-apac |
| remotive | 12 | 3 | 0 | remotive |
| authentic-jobs | 0 | 0 | 0 | authentic-jobs |
| dribbble | 0 | 0 | 0 | dribbble |
| himalayas | 0 | 0 | 0 | himalayas:remote-jobs |
| lever | 0 | 0 | 0 | lever:90seconds, lever:alltrails, lever:applydigital, lever:audinate, lever:beaverprocess, lever:brafton, lever:brevo, lever:decilegroup, lever:deliverect, lever:gushwork, lever:hso, lever:jetsupport, lever:levelup, lever:lwolf, lever:nibiru, lever:outsourcedstaff, lever:parcelvision, lever:piccollage, lever:repurposeglobal, lever:snappr, lever:tenna, lever:truezerotech, lever:trustarc, lever:vacancies, lever:willowinc |

## Supply by exact source_id

| source_id | platform | active | net-new 7d | net-new 30d | inactive |
| --- | --- | ---: | ---: | ---: | ---: |
| we-work-remotely | WeWorkRemotely | 1029 | 543 | 929 | 2614 |
| breezy:20four7va | 20Four7VA | 184 | 10 | 60 | 172 |
| workable:hunt-st | Hunt St | 164 | 18 | 78 | 184 |
| real-work-from-anywhere | RealWorkFromAnywhere | 148 | 21 | 108 | 702 |
| breezy:sourcefit | Breezy/sourcefit | 130 | 12 | 31 | 207 |
| greenhouse:canonical | Canonical | 123 | 1 | 2 | 205 |
| remote-ok | RemoteOK | 74 | 11 | 52 | 1536 |
| ashby:multiplymii | Ashby/multiplymii | 66 | 2 | 19 | 36 |
| jobicy-supporting-apac | Jobicy | 56 | 5 | 23 | 187 |
| workable:crewbloom | CrewBloom | 30 | 4 | 20 | 85 |
| workable:coconutva | Coconut VA | 27 | 0 | 14 | 59 |
| workable:pearltalent | Pearl Talent | 19 | 5 | 12 | 82 |
| breezy:remote-craft | Remote Craft | 14 | 0 | 0 | 1 |
| remotive | Remotive | 12 | 0 | 3 | 106 |
| breezy:yokly | Yokly | 11 | 2 | 5 | 10 |
| breezy:value-virtual-assistants | VALUE Virtual Assistants | 9 | 0 | 0 | 2 |
| greenhouse:gitlab | GitLab | 7 | 0 | 1 | 714 |
| jobicy-admin-support-apac | Jobicy | 7 | 1 | 3 | 10 |
| greenhouse:ghost | Ghost | 1 | 0 | 0 | 11 |
| workable:rocketams | RocketAMS | 1 | 0 | 0 | 10 |
| ashby:amplify | Amplify | 0 | 0 | 0 | 87 |
| ashby:ashby | Ashby | 0 | 0 | 0 | 92 |
| ashby:camunda | Camunda | 0 | 0 | 0 | 67 |
| ashby:circulareconomysystems | Ashby/circulareconomysystems | 0 | 0 | 0 | 3 |
| ashby:cubic3 | Ashby/cubic3 | 0 | 0 | 0 | 2 |
| ashby:finch | Ashby/finch | 0 | 0 | 0 | 1 |
| ashby:flipper | Ashby/flipper | 0 | 0 | 0 | 2 |
| ashby:flutterflow | Ashby/flutterflow | 0 | 0 | 0 | 1 |
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
| greenhouse:grafanalabs | Grafana Labs | 0 | 0 | 0 | 469 |
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
| lever:piccollage | Lever/piccollage | 0 | 0 | 0 | 3 |
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
| we-work-remotely | 314 | 473 | 0 | 25 | 0 | 31379 |
| remotive | 140 | 672 | 0 | 0 | 0 | 2245 |
| ashby:multiplymii | 126 | 0 | 686 | 0 | 0 | 5240 |
| breezy:20four7va | 126 | 0 | 1498 | 0 | 0 | 15107 |
| breezy:remote-craft | 126 | 0 | 686 | 0 | 0 | 1890 |
| breezy:sourcefit | 126 | 0 | 686 | 0 | 0 | 12711 |
| breezy:time-etc | 126 | 0 | 686 | 0 | 0 | 126 |
| breezy:value-virtual-assistants | 126 | 0 | 686 | 0 | 0 | 1260 |
| breezy:yokly | 126 | 0 | 686 | 0 | 0 | 725 |
| greenhouse:canonical | 126 | 0 | 686 | 0 | 0 | 40074 |
| greenhouse:ghost | 126 | 0 | 686 | 0 | 0 | 630 |
| greenhouse:gitlab | 126 | 0 | 686 | 0 | 0 | 30999 |
| greenhouse:grafanalabs | 126 | 0 | 686 | 0 | 0 | 17406 |
| greenhouse:nearform | 126 | 0 | 686 | 0 | 0 | 2896 |
| greenhouse:remotecom | 126 | 0 | 686 | 0 | 126 | 0 |
| real-work-from-anywhere | 126 | 0 | 686 | 0 | 0 | 6300 |
| workable:coconutva | 93 | 0 | 688 | 31 | 0 | 2961 |
| workable:crewbloom | 93 | 0 | 688 | 31 | 0 | 7775 |
| workable:hunt-st | 92 | 0 | 688 | 32 | 0 | 10129 |
| workable:rocketams | 92 | 0 | 688 | 32 | 0 | 660 |
| workable:hello-rache | 90 | 0 | 688 | 34 | 0 | 270 |
| workable:pearltalent | 90 | 0 | 688 | 34 | 0 | 29642 |
| remote-ok | 77 | 48 | 686 | 1 | 0 | 3409 |
| jobicy-supporting-apac | 23 | 101 | 687 | 1 | 0 | 920 |
| jobicy-admin-support-apac | 4 | 118 | 688 | 2 | 0 | 21 |
| ashby:amplify | 0 | 0 | 812 | 0 | 0 | 0 |
| ashby:ashby | 0 | 0 | 812 | 0 | 0 | 0 |
| ashby:camunda | 0 | 0 | 812 | 0 | 0 | 0 |
| ashby:circulareconomysystems | 0 | 0 | 812 | 0 | 0 | 0 |
| ashby:cubic3 | 0 | 0 | 812 | 0 | 0 | 0 |
| ashby:flipper | 0 | 0 | 812 | 0 | 0 | 0 |
| ashby:foundry-for-good | 0 | 0 | 812 | 0 | 0 | 0 |
| ashby:getground | 0 | 0 | 812 | 0 | 0 | 0 |
| ashby:gradient | 0 | 0 | 812 | 0 | 0 | 0 |
| ashby:luxor | 0 | 0 | 812 | 0 | 0 | 0 |
| ashby:molecule | 0 | 0 | 812 | 0 | 0 | 0 |
| ashby:payscale | 0 | 0 | 812 | 0 | 0 | 0 |
| ashby:railway | 0 | 0 | 812 | 0 | 0 | 0 |
| ashby:scalemath | 0 | 0 | 812 | 0 | 0 | 0 |
| ashby:supabase | 0 | 0 | 812 | 0 | 0 | 0 |
| ashby:the-studio | 0 | 0 | 812 | 0 | 0 | 0 |
| ashby:tremendous | 0 | 0 | 812 | 0 | 0 | 0 |
| ashby:trust-wallet | 0 | 0 | 812 | 0 | 0 | 0 |
| ashby:whippy | 0 | 0 | 812 | 0 | 0 | 0 |
| authentic-jobs | 0 | 0 | 812 | 0 | 0 | 0 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 812 | 0 | 0 | 0 |
| dribbble | 0 | 0 | 812 | 0 | 0 | 0 |
| jobspresso | 0 | 0 | 812 | 0 | 0 | 0 |
| lever:applydigital | 0 | 0 | 812 | 0 | 0 | 0 |
| lever:audinate | 0 | 0 | 812 | 0 | 0 | 0 |
| lever:beaverprocess | 0 | 0 | 812 | 0 | 0 | 0 |
| lever:brafton | 0 | 0 | 812 | 0 | 0 | 0 |
| lever:brevo | 0 | 0 | 812 | 0 | 0 | 0 |
| lever:decilegroup | 0 | 0 | 812 | 0 | 0 | 0 |
| lever:deliverect | 0 | 0 | 812 | 0 | 0 | 0 |
| lever:gushwork | 0 | 0 | 812 | 0 | 0 | 0 |
| lever:jetsupport | 0 | 0 | 812 | 0 | 0 | 0 |
| lever:lwolf | 0 | 0 | 812 | 0 | 0 | 0 |
| lever:nibiru | 0 | 0 | 812 | 0 | 0 | 0 |
| lever:outsourcedstaff | 0 | 0 | 812 | 0 | 0 | 0 |
| lever:parcelvision | 0 | 0 | 812 | 0 | 0 | 0 |
| lever:piccollage | 0 | 0 | 812 | 0 | 0 | 0 |
| lever:repurposeglobal | 0 | 0 | 812 | 0 | 0 | 0 |
| lever:snappr | 0 | 0 | 812 | 0 | 0 | 0 |
| lever:tenna | 0 | 0 | 812 | 0 | 0 | 0 |
| lever:truezerotech | 0 | 0 | 812 | 0 | 0 | 0 |
| lever:vacancies | 0 | 0 | 812 | 0 | 0 | 0 |
| lever:vaultoutsourcing | 0 | 0 | 812 | 0 | 0 | 0 |
| lever:willowinc | 0 | 0 | 812 | 0 | 0 | 0 |
| onlinejobs-ph | 0 | 0 | 812 | 0 | 0 | 0 |
| problogger | 0 | 0 | 812 | 0 | 0 | 0 |
| remote-co | 0 | 0 | 812 | 0 | 0 | 0 |
| workable:connectos | 0 | 0 | 812 | 0 | 0 | 0 |
| workable:global-strategic | 0 | 0 | 812 | 0 | 0 | 0 |
| workable:myoutdesk | 0 | 0 | 812 | 0 | 0 | 0 |
| workable:outsource-access | 0 | 0 | 812 | 0 | 0 | 0 |
| workable:pineapple-staffing | 0 | 0 | 812 | 0 | 0 | 0 |
| workable:staff-domain-inc | 0 | 0 | 812 | 0 | 0 | 0 |
| workable:superstaff | 0 | 0 | 812 | 0 | 0 | 0 |
| workable:virtualstaff365 | 0 | 0 | 812 | 0 | 0 | 0 |

## Geo & eligibility triage outcomes (last 7 days)

Breakdown of stored opportunities by Philippines eligibility verdict.

| source_id | eligible | unclear | ineligible | policy_rejected | total | qualified_rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 543 | 0 | 291 | 291 | 834 | 65.1% |
| remote-ok | 11 | 2 | 172 | 174 | 185 | 5.9% |
| real-work-from-anywhere | 21 | 1 | 0 | 1 | 22 | 95.5% |
| workable:hunt-st | 18 | 0 | 0 | 0 | 18 | 100.0% |
| breezy:sourcefit | 12 | 0 | 5 | 5 | 17 | 70.6% |
| jobicy-supporting-apac | 5 | 0 | 12 | 12 | 17 | 29.4% |
| greenhouse:gitlab | 0 | 1 | 14 | 15 | 15 | 0.0% |
| workable:pearltalent | 5 | 0 | 7 | 7 | 12 | 41.7% |
| breezy:20four7va | 10 | 0 | 1 | 1 | 11 | 90.9% |
| workable:crewbloom | 4 | 0 | 2 | 2 | 6 | 66.7% |
| remotive | 0 | 0 | 3 | 3 | 3 | 0.0% |
| ashby:multiplymii | 2 | 0 | 0 | 0 | 2 | 100.0% |
| breezy:yokly | 2 | 0 | 0 | 0 | 2 | 100.0% |
| greenhouse:canonical | 1 | 0 | 1 | 1 | 2 | 50.0% |
| greenhouse:nearform | 0 | 0 | 2 | 2 | 2 | 0.0% |
| greenhouse:grafanalabs | 0 | 0 | 1 | 1 | 1 | 0.0% |
| jobicy-admin-support-apac | 1 | 0 | 0 | 0 | 1 | 100.0% |

## Yield efficiency (last 7 days)

Stored eligibility per real (changed) fetch and per 100 items seen; not marginal verified first-publication yield.
UNKNOWN means a count is missing/invalid or its denominator is zero. Fetch and stored cohorts may differ across intake paths; these descriptive ratios do not establish source productivity or causal yield.

| source_id | real fetches | items seen | eligible stored | yield / fetch | yield / 100 items |
| --- | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 314 | 31379 | 543 | 1.73 | 1.73 |
| remotive | 140 | 2245 | 0 | 0.00 | 0.00 |
| ashby:multiplymii | 126 | 5240 | 2 | 0.02 | 0.04 |
| breezy:20four7va | 126 | 15107 | 10 | 0.08 | 0.07 |
| breezy:remote-craft | 126 | 1890 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:sourcefit | 126 | 12711 | 12 | 0.10 | 0.09 |
| breezy:time-etc | 126 | 126 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:value-virtual-assistants | 126 | 1260 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:yokly | 126 | 725 | 2 | 0.02 | 0.28 |
| greenhouse:canonical | 126 | 40074 | 1 | 0.01 | 0.00 |
| greenhouse:ghost | 126 | 630 | UNKNOWN | UNKNOWN | UNKNOWN |
| greenhouse:gitlab | 126 | 30999 | 0 | 0.00 | 0.00 |
| greenhouse:grafanalabs | 126 | 17406 | 0 | 0.00 | 0.00 |
| greenhouse:nearform | 126 | 2896 | 0 | 0.00 | 0.00 |
| greenhouse:remotecom | 126 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| real-work-from-anywhere | 126 | 6300 | 21 | 0.17 | 0.33 |
| workable:coconutva | 93 | 2961 | UNKNOWN | UNKNOWN | UNKNOWN |
| workable:crewbloom | 93 | 7775 | 4 | 0.04 | 0.05 |
| workable:hunt-st | 92 | 10129 | 18 | 0.20 | 0.18 |
| workable:rocketams | 92 | 660 | UNKNOWN | UNKNOWN | UNKNOWN |
| workable:hello-rache | 90 | 270 | UNKNOWN | UNKNOWN | UNKNOWN |
| workable:pearltalent | 90 | 29642 | 5 | 0.06 | 0.02 |
| remote-ok | 77 | 3409 | 11 | 0.14 | 0.32 |
| jobicy-supporting-apac | 23 | 920 | 5 | 0.22 | 0.54 |
| jobicy-admin-support-apac | 4 | 21 | 1 | 0.25 | 4.76 |
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
