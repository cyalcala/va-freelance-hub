# Source economics — latest (SP-02)

- **As of:** 2026-11-15T09:48:19.170Z
- **Windows:** 7d/14d/30d net-new by `scraped_at`
- **Reconciliation:** OK (every partition delta is zero)
- Read-only report; regenerate with `scripts/diagnostics/source-economics.ts`.

## Qualified supply (strict eligibility; first-stored proxy)

Excludes unclear/ineligible rows. Historical publication and later deactivation are not fully reconstructed.

| qualified active | qualified new 7d | per day (7d) | qualified new 30d | per day (30d) |
| ---: | ---: | ---: | ---: | ---: |
| 1668 | 160 | 22.86 | 946 | 31.53 |

## Identity coverage (SP-01)

| total | with source_id | null source_id | coverage | active null-id |
| ---: | ---: | ---: | ---: | ---: |
| 9122 | 9122 | 0 | 100.0% | 0 |

## Net-new accepted supply

| active | net-new 7d | net-new 14d | net-new 30d |
| ---: | ---: | ---: | ---: |
| 1668 | 160 | 303 | 946 |

## Provider-family concentration (ADR-006 §7)

- **Net-new 30d:** top family `we-work-remotely` 37.4%; top-3 65.2%.
- **Active:** top family `we-work-remotely` 26.9%; top-3 61.3%.
- `(unknown)` legacy rows are excluded from these shares.

| provider family | active | net-new 30d | net-new 7d | source ids |
| --- | ---: | ---: | ---: | --- |
| we-work-remotely | 449 | 354 | 46 | we-work-remotely |
| breezy | 345 | 114 | 21 | breezy:20four7va, breezy:sourcefit, breezy:yokly, breezy:remote-craft, breezy:value-virtual-assistants, breezy:time-etc |
| workable | 228 | 149 | 31 | workable:hunt-st, workable:crewbloom, workable:coconutva, workable:pearltalent, workable:rocketams, workable:hello-rache, workable:pineapple-staffing |
| real-work-from-anywhere | 154 | 111 | 33 | real-work-from-anywhere |
| greenhouse | 147 | 19 | 0 | greenhouse:canonical, greenhouse:solarwinds, greenhouse:gitlab, greenhouse:ghost, greenhouse:trinityparktalent, greenhouse:grafanalabs, greenhouse:janes, greenhouse:nearform, greenhouse:remotecom, greenhouse:trainingthestreet |
| ashby | 114 | 55 | 10 | ashby:multiplymii, ashby:trust-wallet, ashby:railway, ashby:scalemath, ashby:whippy, ashby:cubic3, ashby:flipper, ashby:luxor, ashby:finch, ashby:flutterflow, ashby:amplify, ashby:ashby, ashby:camunda, ashby:circulareconomysystems, ashby:foundry-for-good, ashby:getground, ashby:gradient, ashby:homera-health, ashby:molecule, ashby:payscale, ashby:supabase, ashby:the-studio, ashby:tremendous |
| lever | 84 | 67 | 0 | lever:vacancies, lever:tenna, lever:levelup, lever:nibiru, lever:applydigital, lever:brevo, lever:outsourcedstaff, lever:jetsupport, lever:willowinc, lever:gushwork, lever:parcelvision, lever:piccollage, lever:audinate, lever:alltrails, lever:90seconds, lever:beaverprocess, lever:brafton, lever:decilegroup, lever:deliverect, lever:hso, lever:lwolf, lever:repurposeglobal, lever:snappr, lever:truezerotech, lever:trustarc |
| remote-ok | 66 | 42 | 9 | remote-ok |
| jobicy | 65 | 29 | 8 | jobicy-supporting-apac, jobicy-admin-support-apac |
| remotive | 16 | 6 | 2 | remotive |
| authentic-jobs | 0 | 0 | 0 | authentic-jobs |
| dribbble | 0 | 0 | 0 | dribbble |
| himalayas | 0 | 0 | 0 | himalayas:remote-jobs |

## Supply by exact source_id

| source_id | platform | active | net-new 7d | net-new 30d | inactive |
| --- | --- | ---: | ---: | ---: | ---: |
| we-work-remotely | WeWorkRemotely | 449 | 46 | 354 | 1952 |
| breezy:20four7va | 20Four7VA | 178 | 15 | 61 | 158 |
| workable:hunt-st | Hunt St | 160 | 17 | 95 | 141 |
| real-work-from-anywhere | RealWorkFromAnywhere | 154 | 33 | 111 | 644 |
| breezy:sourcefit | Breezy/sourcefit | 127 | 6 | 48 | 189 |
| greenhouse:canonical | Canonical | 123 | 0 | 0 | 199 |
| ashby:multiplymii | Ashby/multiplymii | 81 | 10 | 22 | 18 |
| remote-ok | RemoteOK | 66 | 9 | 42 | 1261 |
| jobicy-supporting-apac | Jobicy | 58 | 7 | 26 | 159 |
| workable:crewbloom | CrewBloom | 30 | 8 | 22 | 77 |
| workable:coconutva | Coconut VA | 24 | 3 | 19 | 57 |
| lever:vacancies | Lever/vacancies | 20 | 0 | 20 | 0 |
| breezy:yokly | Yokly | 16 | 0 | 5 | 1 |
| greenhouse:solarwinds | Greenhouse/solarwinds | 16 | 0 | 16 | 0 |
| remotive | Remotive | 16 | 2 | 6 | 98 |
| breezy:remote-craft | Remote Craft | 14 | 0 | 0 | 1 |
| ashby:trust-wallet | Ashby/trust-wallet | 13 | 0 | 13 | 0 |
| workable:pearltalent | Pearl Talent | 13 | 3 | 12 | 64 |
| lever:tenna | Lever/tenna | 11 | 0 | 0 | 0 |
| breezy:value-virtual-assistants | VALUE Virtual Assistants | 10 | 0 | 0 | 1 |
| lever:levelup | Lever/levelup | 9 | 0 | 9 | 0 |
| lever:nibiru | Lever/nibiru | 8 | 0 | 8 | 0 |
| jobicy-admin-support-apac | Jobicy | 7 | 1 | 3 | 9 |
| ashby:railway | Ashby/railway | 6 | 0 | 6 | 0 |
| greenhouse:gitlab | GitLab | 6 | 0 | 2 | 664 |
| lever:applydigital | Lever/applydigital | 6 | 0 | 0 | 0 |
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
| greenhouse:grafanalabs | Grafana Labs | 0 | 0 | 0 | 447 |
| greenhouse:janes | Greenhouse/janes | 0 | 0 | 0 | 2 |
| greenhouse:nearform | Nearform | 0 | 0 | 0 | 64 |
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
| remotive | 166 | 788 | 0 | 0 | 0 | 2496 |
| ashby:multiplymii | 147 | 0 | 807 | 0 | 0 | 6809 |
| breezy:20four7va | 147 | 0 | 1761 | 0 | 0 | 18074 |
| breezy:remote-craft | 147 | 0 | 807 | 0 | 0 | 2205 |
| breezy:sourcefit | 147 | 0 | 807 | 0 | 0 | 15738 |
| breezy:time-etc | 147 | 0 | 807 | 0 | 0 | 147 |
| breezy:value-virtual-assistants | 147 | 0 | 807 | 0 | 0 | 1470 |
| breezy:yokly | 147 | 0 | 807 | 0 | 0 | 588 |
| greenhouse:gitlab | 147 | 0 | 807 | 0 | 0 | 37132 |
| greenhouse:grafanalabs | 147 | 0 | 807 | 0 | 0 | 20857 |
| greenhouse:nearform | 147 | 0 | 807 | 0 | 0 | 3948 |
| greenhouse:remotecom | 147 | 0 | 807 | 0 | 147 | 0 |
| real-work-from-anywhere | 147 | 0 | 807 | 0 | 0 | 7350 |
| greenhouse:canonical | 146 | 0 | 807 | 1 | 0 | 46136 |
| greenhouse:ghost | 146 | 0 | 807 | 1 | 0 | 730 |
| we-work-remotely | 114 | 827 | 0 | 13 | 0 | 11400 |
| workable:coconutva | 102 | 0 | 809 | 43 | 0 | 3310 |
| workable:crewbloom | 102 | 0 | 809 | 43 | 0 | 8991 |
| workable:hello-rache | 98 | 0 | 810 | 46 | 0 | 294 |
| workable:pearltalent | 98 | 0 | 810 | 46 | 0 | 27971 |
| workable:hunt-st | 96 | 0 | 810 | 48 | 0 | 11917 |
| workable:rocketams | 96 | 0 | 810 | 48 | 0 | 919 |
| remote-ok | 36 | 111 | 807 | 0 | 0 | 1515 |
| jobicy-supporting-apac | 29 | 115 | 808 | 2 | 0 | 1160 |
| jobicy-admin-support-apac | 4 | 141 | 809 | 0 | 0 | 17 |
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
| we-work-remotely | 46 | 1 | 126 | 127 | 173 | 26.6% |
| real-work-from-anywhere | 33 | 8 | 3 | 11 | 44 | 75.0% |
| greenhouse:gitlab | 0 | 1 | 26 | 27 | 27 | 0.0% |
| greenhouse:grafanalabs | 0 | 0 | 27 | 27 | 27 | 0.0% |
| remote-ok | 9 | 1 | 7 | 8 | 17 | 52.9% |
| workable:hunt-st | 17 | 0 | 0 | 0 | 17 | 100.0% |
| breezy:20four7va | 15 | 0 | 1 | 1 | 16 | 93.8% |
| workable:crewbloom | 9 | 0 | 5 | 5 | 14 | 64.3% |
| jobicy-supporting-apac | 7 | 0 | 5 | 5 | 12 | 58.3% |
| ashby:multiplymii | 10 | 0 | 0 | 0 | 10 | 100.0% |
| breezy:sourcefit | 6 | 0 | 4 | 4 | 10 | 60.0% |
| workable:pearltalent | 3 | 0 | 3 | 3 | 6 | 50.0% |
| remotive | 2 | 0 | 2 | 2 | 4 | 50.0% |
| workable:coconutva | 3 | 0 | 0 | 0 | 3 | 100.0% |
| greenhouse:nearform | 0 | 0 | 1 | 1 | 1 | 0.0% |
| jobicy-admin-support-apac | 1 | 0 | 0 | 0 | 1 | 100.0% |

## Yield efficiency (last 7 days)

Stored eligibility per real (changed) fetch and per 100 items seen; not marginal verified first-publication yield.
UNKNOWN means a count is missing/invalid or its denominator is zero. Fetch and stored cohorts may differ across intake paths; these descriptive ratios do not establish source productivity or causal yield.

| source_id | real fetches | items seen | eligible stored | yield / fetch | yield / 100 items |
| --- | ---: | ---: | ---: | ---: | ---: |
| remotive | 166 | 2496 | 2 | 0.01 | 0.08 |
| ashby:multiplymii | 147 | 6809 | 10 | 0.07 | 0.15 |
| breezy:20four7va | 147 | 18074 | 15 | 0.10 | 0.08 |
| breezy:remote-craft | 147 | 2205 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:sourcefit | 147 | 15738 | 6 | 0.04 | 0.04 |
| breezy:time-etc | 147 | 147 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:value-virtual-assistants | 147 | 1470 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:yokly | 147 | 588 | UNKNOWN | UNKNOWN | UNKNOWN |
| greenhouse:gitlab | 147 | 37132 | 0 | 0.00 | 0.00 |
| greenhouse:grafanalabs | 147 | 20857 | 0 | 0.00 | 0.00 |
| greenhouse:nearform | 147 | 3948 | 0 | 0.00 | 0.00 |
| greenhouse:remotecom | 147 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| real-work-from-anywhere | 147 | 7350 | 33 | 0.22 | 0.45 |
| greenhouse:canonical | 146 | 46136 | UNKNOWN | UNKNOWN | UNKNOWN |
| greenhouse:ghost | 146 | 730 | UNKNOWN | UNKNOWN | UNKNOWN |
| we-work-remotely | 114 | 11400 | 46 | 0.40 | 0.40 |
| workable:coconutva | 102 | 3310 | 3 | 0.03 | 0.09 |
| workable:crewbloom | 102 | 8991 | 9 | 0.09 | 0.10 |
| workable:hello-rache | 98 | 294 | UNKNOWN | UNKNOWN | UNKNOWN |
| workable:pearltalent | 98 | 27971 | 3 | 0.03 | 0.01 |
| workable:hunt-st | 96 | 11917 | 17 | 0.18 | 0.14 |
| workable:rocketams | 96 | 919 | UNKNOWN | UNKNOWN | UNKNOWN |
| remote-ok | 36 | 1515 | 9 | 0.25 | 0.59 |
| jobicy-supporting-apac | 29 | 1160 | 7 | 0.24 | 0.60 |
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
