# Source economics — latest (SP-02)

- **As of:** 2026-11-25T11:38:27.923Z
- **Windows:** 7d/14d/30d net-new by `scraped_at`
- **Reconciliation:** OK (every partition delta is zero)
- Read-only report; regenerate with `scripts/diagnostics/source-economics.ts`.

## Qualified supply (strict eligibility; first-stored proxy)

Excludes unclear/ineligible rows. Historical publication and later deactivation are not fully reconstructed.

| qualified active | qualified new 7d | per day (7d) | qualified new 30d | per day (30d) |
| ---: | ---: | ---: | ---: | ---: |
| 1964 | 671 | 95.86 | 1202 | 40.07 |

## Identity coverage (SP-01)

| total | with source_id | null source_id | coverage | active null-id |
| ---: | ---: | ---: | ---: | ---: |
| 10428 | 10428 | 0 | 100.0% | 0 |

## Net-new accepted supply

| active | net-new 7d | net-new 14d | net-new 30d |
| ---: | ---: | ---: | ---: |
| 1964 | 671 | 827 | 1202 |

## Provider-family concentration (ADR-006 §7)

- **Net-new 30d:** top family `we-work-remotely` 62.7% ⚠️ >40%; top-3 83.2% ⚠️ >70%.
- **Active:** top family `we-work-remotely` 43.8% ⚠️ >40%; top-3 73.9% ⚠️ >70%.
- `(unknown)` legacy rows are excluded from these shares.

| provider family | active | net-new 30d | net-new 7d | source ids |
| --- | ---: | ---: | ---: | --- |
| we-work-remotely | 860 | 754 | 549 | we-work-remotely |
| breezy | 349 | 102 | 31 | breezy:20four7va, breezy:sourcefit, breezy:remote-craft, breezy:yokly, breezy:value-virtual-assistants, breezy:time-etc |
| workable | 242 | 136 | 30 | workable:hunt-st, workable:crewbloom, workable:coconutva, workable:pearltalent, workable:rocketams, workable:hello-rache, workable:pineapple-staffing |
| real-work-from-anywhere | 154 | 110 | 29 | real-work-from-anywhere |
| greenhouse | 130 | 2 | 0 | greenhouse:canonical, greenhouse:gitlab, greenhouse:ghost, greenhouse:grafanalabs, greenhouse:janes, greenhouse:nearform, greenhouse:remotecom, greenhouse:solarwinds, greenhouse:trainingthestreet, greenhouse:trinityparktalent |
| ashby | 76 | 20 | 2 | ashby:multiplymii, ashby:amplify, ashby:ashby, ashby:camunda, ashby:circulareconomysystems, ashby:cubic3, ashby:finch, ashby:flipper, ashby:flutterflow, ashby:foundry-for-good, ashby:getground, ashby:gradient, ashby:homera-health, ashby:luxor, ashby:molecule, ashby:payscale, ashby:railway, ashby:scalemath, ashby:supabase, ashby:the-studio, ashby:tremendous, ashby:trust-wallet, ashby:whippy |
| remote-ok | 76 | 51 | 24 | remote-ok |
| jobicy | 65 | 23 | 6 | jobicy-supporting-apac, jobicy-admin-support-apac |
| remotive | 12 | 4 | 0 | remotive |
| authentic-jobs | 0 | 0 | 0 | authentic-jobs |
| dribbble | 0 | 0 | 0 | dribbble |
| himalayas | 0 | 0 | 0 | himalayas:remote-jobs |
| lever | 0 | 0 | 0 | lever:90seconds, lever:alltrails, lever:applydigital, lever:audinate, lever:beaverprocess, lever:brafton, lever:brevo, lever:decilegroup, lever:deliverect, lever:gushwork, lever:hso, lever:jetsupport, lever:levelup, lever:lwolf, lever:nibiru, lever:outsourcedstaff, lever:parcelvision, lever:piccollage, lever:repurposeglobal, lever:snappr, lever:tenna, lever:truezerotech, lever:trustarc, lever:vacancies, lever:willowinc |

## Supply by exact source_id

| source_id | platform | active | net-new 7d | net-new 30d | inactive |
| --- | --- | ---: | ---: | ---: | ---: |
| we-work-remotely | WeWorkRemotely | 860 | 549 | 754 | 2415 |
| breezy:20four7va | 20Four7VA | 189 | 16 | 66 | 165 |
| workable:hunt-st | Hunt St | 168 | 19 | 88 | 175 |
| real-work-from-anywhere | RealWorkFromAnywhere | 154 | 29 | 110 | 687 |
| breezy:sourcefit | Breezy/sourcefit | 127 | 12 | 32 | 208 |
| greenhouse:canonical | Canonical | 122 | 0 | 1 | 205 |
| ashby:multiplymii | Ashby/multiplymii | 76 | 2 | 20 | 26 |
| remote-ok | RemoteOK | 76 | 24 | 51 | 1425 |
| jobicy-supporting-apac | Jobicy | 59 | 6 | 21 | 177 |
| workable:crewbloom | CrewBloom | 30 | 4 | 24 | 84 |
| workable:coconutva | Coconut VA | 27 | 4 | 14 | 59 |
| workable:pearltalent | Pearl Talent | 16 | 3 | 10 | 80 |
| breezy:remote-craft | Remote Craft | 14 | 0 | 0 | 1 |
| remotive | Remotive | 12 | 0 | 4 | 105 |
| breezy:yokly | Yokly | 10 | 3 | 4 | 10 |
| breezy:value-virtual-assistants | VALUE Virtual Assistants | 9 | 0 | 0 | 2 |
| greenhouse:gitlab | GitLab | 7 | 0 | 1 | 712 |
| jobicy-admin-support-apac | Jobicy | 6 | 0 | 2 | 10 |
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
| we-work-remotely | 263 | 590 | 0 | 13 | 0 | 25749 |
| remotive | 150 | 716 | 0 | 0 | 0 | 2363 |
| ashby:multiplymii | 134 | 0 | 732 | 0 | 0 | 5702 |
| breezy:20four7va | 134 | 0 | 1598 | 0 | 0 | 16067 |
| breezy:remote-craft | 134 | 0 | 732 | 0 | 0 | 2010 |
| breezy:sourcefit | 134 | 0 | 732 | 0 | 0 | 13681 |
| breezy:time-etc | 134 | 0 | 732 | 0 | 0 | 134 |
| breezy:value-virtual-assistants | 134 | 0 | 732 | 0 | 0 | 1340 |
| breezy:yokly | 134 | 0 | 732 | 0 | 0 | 870 |
| greenhouse:canonical | 134 | 0 | 732 | 0 | 0 | 42540 |
| greenhouse:ghost | 134 | 0 | 732 | 0 | 0 | 670 |
| greenhouse:gitlab | 134 | 0 | 732 | 0 | 0 | 33183 |
| greenhouse:grafanalabs | 134 | 0 | 732 | 0 | 0 | 18536 |
| greenhouse:nearform | 134 | 0 | 732 | 0 | 0 | 3080 |
| greenhouse:remotecom | 134 | 0 | 732 | 0 | 134 | 0 |
| real-work-from-anywhere | 134 | 0 | 732 | 0 | 0 | 6700 |
| workable:coconutva | 83 | 0 | 733 | 50 | 0 | 2713 |
| workable:crewbloom | 83 | 0 | 733 | 50 | 0 | 6921 |
| workable:pearltalent | 78 | 0 | 734 | 54 | 0 | 24326 |
| workable:hello-rache | 77 | 0 | 734 | 55 | 0 | 231 |
| remote-ok | 74 | 59 | 732 | 1 | 0 | 3297 |
| workable:hunt-st | 74 | 0 | 734 | 58 | 0 | 9050 |
| workable:rocketams | 74 | 0 | 734 | 58 | 0 | 592 |
| jobicy-supporting-apac | 25 | 106 | 733 | 2 | 0 | 1000 |
| jobicy-admin-support-apac | 3 | 127 | 733 | 3 | 0 | 15 |
| ashby:amplify | 0 | 0 | 866 | 0 | 0 | 0 |
| ashby:ashby | 0 | 0 | 866 | 0 | 0 | 0 |
| ashby:camunda | 0 | 0 | 866 | 0 | 0 | 0 |
| ashby:circulareconomysystems | 0 | 0 | 866 | 0 | 0 | 0 |
| ashby:cubic3 | 0 | 0 | 866 | 0 | 0 | 0 |
| ashby:flipper | 0 | 0 | 866 | 0 | 0 | 0 |
| ashby:foundry-for-good | 0 | 0 | 866 | 0 | 0 | 0 |
| ashby:getground | 0 | 0 | 866 | 0 | 0 | 0 |
| ashby:gradient | 0 | 0 | 866 | 0 | 0 | 0 |
| ashby:luxor | 0 | 0 | 866 | 0 | 0 | 0 |
| ashby:molecule | 0 | 0 | 866 | 0 | 0 | 0 |
| ashby:payscale | 0 | 0 | 866 | 0 | 0 | 0 |
| ashby:railway | 0 | 0 | 866 | 0 | 0 | 0 |
| ashby:scalemath | 0 | 0 | 866 | 0 | 0 | 0 |
| ashby:supabase | 0 | 0 | 866 | 0 | 0 | 0 |
| ashby:the-studio | 0 | 0 | 866 | 0 | 0 | 0 |
| ashby:tremendous | 0 | 0 | 866 | 0 | 0 | 0 |
| ashby:trust-wallet | 0 | 0 | 866 | 0 | 0 | 0 |
| ashby:whippy | 0 | 0 | 866 | 0 | 0 | 0 |
| authentic-jobs | 0 | 0 | 866 | 0 | 0 | 0 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 866 | 0 | 0 | 0 |
| dribbble | 0 | 0 | 866 | 0 | 0 | 0 |
| jobspresso | 0 | 0 | 866 | 0 | 0 | 0 |
| lever:applydigital | 0 | 0 | 866 | 0 | 0 | 0 |
| lever:audinate | 0 | 0 | 866 | 0 | 0 | 0 |
| lever:beaverprocess | 0 | 0 | 866 | 0 | 0 | 0 |
| lever:brafton | 0 | 0 | 866 | 0 | 0 | 0 |
| lever:brevo | 0 | 0 | 866 | 0 | 0 | 0 |
| lever:decilegroup | 0 | 0 | 866 | 0 | 0 | 0 |
| lever:deliverect | 0 | 0 | 866 | 0 | 0 | 0 |
| lever:gushwork | 0 | 0 | 866 | 0 | 0 | 0 |
| lever:jetsupport | 0 | 0 | 866 | 0 | 0 | 0 |
| lever:lwolf | 0 | 0 | 866 | 0 | 0 | 0 |
| lever:nibiru | 0 | 0 | 866 | 0 | 0 | 0 |
| lever:outsourcedstaff | 0 | 0 | 866 | 0 | 0 | 0 |
| lever:parcelvision | 0 | 0 | 866 | 0 | 0 | 0 |
| lever:piccollage | 0 | 0 | 866 | 0 | 0 | 0 |
| lever:repurposeglobal | 0 | 0 | 866 | 0 | 0 | 0 |
| lever:snappr | 0 | 0 | 866 | 0 | 0 | 0 |
| lever:tenna | 0 | 0 | 866 | 0 | 0 | 0 |
| lever:truezerotech | 0 | 0 | 866 | 0 | 0 | 0 |
| lever:vacancies | 0 | 0 | 866 | 0 | 0 | 0 |
| lever:vaultoutsourcing | 0 | 0 | 866 | 0 | 0 | 0 |
| lever:willowinc | 0 | 0 | 866 | 0 | 0 | 0 |
| onlinejobs-ph | 0 | 0 | 866 | 0 | 0 | 0 |
| problogger | 0 | 0 | 866 | 0 | 0 | 0 |
| remote-co | 0 | 0 | 866 | 0 | 0 | 0 |
| workable:connectos | 0 | 0 | 866 | 0 | 0 | 0 |
| workable:global-strategic | 0 | 0 | 866 | 0 | 0 | 0 |
| workable:myoutdesk | 0 | 0 | 866 | 0 | 0 | 0 |
| workable:outsource-access | 0 | 0 | 866 | 0 | 0 | 0 |
| workable:pineapple-staffing | 0 | 0 | 866 | 0 | 0 | 0 |
| workable:staff-domain-inc | 0 | 0 | 866 | 0 | 0 | 0 |
| workable:superstaff | 0 | 0 | 866 | 0 | 0 | 0 |
| workable:virtualstaff365 | 0 | 0 | 866 | 0 | 0 | 0 |

## Geo & eligibility triage outcomes (last 7 days)

Breakdown of stored opportunities by Philippines eligibility verdict.

| source_id | eligible | unclear | ineligible | policy_rejected | total | qualified_rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 549 | 0 | 241 | 241 | 790 | 69.5% |
| remote-ok | 24 | 4 | 143 | 147 | 171 | 14.0% |
| real-work-from-anywhere | 30 | 3 | 0 | 3 | 33 | 90.9% |
| greenhouse:gitlab | 0 | 1 | 30 | 31 | 31 | 0.0% |
| breezy:sourcefit | 12 | 0 | 7 | 7 | 19 | 63.2% |
| workable:hunt-st | 19 | 0 | 0 | 0 | 19 | 100.0% |
| workable:pearltalent | 3 | 0 | 15 | 15 | 18 | 16.7% |
| breezy:20four7va | 16 | 0 | 1 | 1 | 17 | 94.1% |
| greenhouse:grafanalabs | 0 | 0 | 17 | 17 | 17 | 0.0% |
| jobicy-supporting-apac | 6 | 0 | 11 | 11 | 17 | 35.3% |
| workable:crewbloom | 4 | 0 | 2 | 2 | 6 | 66.7% |
| workable:coconutva | 4 | 0 | 0 | 0 | 4 | 100.0% |
| breezy:yokly | 3 | 0 | 0 | 0 | 3 | 100.0% |
| remotive | 0 | 0 | 3 | 3 | 3 | 0.0% |
| ashby:multiplymii | 2 | 0 | 0 | 0 | 2 | 100.0% |
| greenhouse:canonical | 0 | 0 | 2 | 2 | 2 | 0.0% |
| greenhouse:nearform | 0 | 0 | 2 | 2 | 2 | 0.0% |

## Yield efficiency (last 7 days)

Stored eligibility per real (changed) fetch and per 100 items seen; not marginal verified first-publication yield.
UNKNOWN means a count is missing/invalid or its denominator is zero. Fetch and stored cohorts may differ across intake paths; these descriptive ratios do not establish source productivity or causal yield.

| source_id | real fetches | items seen | eligible stored | yield / fetch | yield / 100 items |
| --- | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 263 | 25749 | 549 | 2.09 | 2.13 |
| remotive | 150 | 2363 | 0 | 0.00 | 0.00 |
| ashby:multiplymii | 134 | 5702 | 2 | 0.01 | 0.04 |
| breezy:20four7va | 134 | 16067 | 16 | 0.12 | 0.10 |
| breezy:remote-craft | 134 | 2010 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:sourcefit | 134 | 13681 | 12 | 0.09 | 0.09 |
| breezy:time-etc | 134 | 134 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:value-virtual-assistants | 134 | 1340 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:yokly | 134 | 870 | 3 | 0.02 | 0.34 |
| greenhouse:canonical | 134 | 42540 | 0 | 0.00 | 0.00 |
| greenhouse:ghost | 134 | 670 | UNKNOWN | UNKNOWN | UNKNOWN |
| greenhouse:gitlab | 134 | 33183 | 0 | 0.00 | 0.00 |
| greenhouse:grafanalabs | 134 | 18536 | 0 | 0.00 | 0.00 |
| greenhouse:nearform | 134 | 3080 | 0 | 0.00 | 0.00 |
| greenhouse:remotecom | 134 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| real-work-from-anywhere | 134 | 6700 | 30 | 0.22 | 0.45 |
| workable:coconutva | 83 | 2713 | 4 | 0.05 | 0.15 |
| workable:crewbloom | 83 | 6921 | 4 | 0.05 | 0.06 |
| workable:pearltalent | 78 | 24326 | 3 | 0.04 | 0.01 |
| workable:hello-rache | 77 | 231 | UNKNOWN | UNKNOWN | UNKNOWN |
| remote-ok | 74 | 3297 | 24 | 0.32 | 0.73 |
| workable:hunt-st | 74 | 9050 | 19 | 0.26 | 0.21 |
| workable:rocketams | 74 | 592 | UNKNOWN | UNKNOWN | UNKNOWN |
| jobicy-supporting-apac | 25 | 1000 | 6 | 0.24 | 0.60 |
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
