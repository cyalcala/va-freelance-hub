# Source economics — latest (SP-02)

- **As of:** 2026-11-09T10:10:42.069Z
- **Windows:** 7d/14d/30d net-new by `scraped_at`
- **Reconciliation:** OK (every partition delta is zero)
- Read-only report; regenerate with `scripts/diagnostics/source-economics.ts`.

## Qualified supply (strict eligibility; first-stored proxy)

Excludes unclear/ineligible rows. Historical publication and later deactivation are not fully reconstructed.

| qualified active | qualified new 7d | per day (7d) | qualified new 30d | per day (30d) |
| ---: | ---: | ---: | ---: | ---: |
| 1682 | 136 | 19.43 | 1021 | 34.03 |

## Identity coverage (SP-01)

| total | with source_id | null source_id | coverage | active null-id |
| ---: | ---: | ---: | ---: | ---: |
| 8795 | 8795 | 0 | 100.0% | 0 |

## Net-new accepted supply

| active | net-new 7d | net-new 14d | net-new 30d |
| ---: | ---: | ---: | ---: |
| 1682 | 136 | 320 | 1021 |

## Provider-family concentration (ADR-006 §7)

- **Net-new 30d:** top family `we-work-remotely` 40.8% ⚠️ >40%; top-3 66.6%.
- **Active:** top family `we-work-remotely` 30.7%; top-3 62.6%.
- `(unknown)` legacy rows are excluded from these shares.

| provider family | active | net-new 30d | net-new 7d | source ids |
| --- | ---: | ---: | ---: | --- |
| we-work-remotely | 516 | 417 | 40 | we-work-remotely |
| breezy | 338 | 118 | 31 | breezy:20four7va, breezy:sourcefit, breezy:yokly, breezy:remote-craft, breezy:value-virtual-assistants, breezy:time-etc |
| workable | 199 | 145 | 23 | workable:hunt-st, workable:crewbloom, workable:coconutva, workable:pearltalent, workable:rocketams, workable:hello-rache, workable:pineapple-staffing |
| greenhouse | 147 | 20 | 0 | greenhouse:canonical, greenhouse:solarwinds, greenhouse:gitlab, greenhouse:ghost, greenhouse:trinityparktalent, greenhouse:grafanalabs, greenhouse:janes, greenhouse:nearform, greenhouse:remotecom, greenhouse:trainingthestreet |
| real-work-from-anywhere | 144 | 109 | 22 | real-work-from-anywhere |
| ashby | 109 | 51 | 3 | ashby:multiplymii, ashby:trust-wallet, ashby:railway, ashby:scalemath, ashby:whippy, ashby:cubic3, ashby:flipper, ashby:luxor, ashby:finch, ashby:flutterflow, ashby:amplify, ashby:ashby, ashby:camunda, ashby:circulareconomysystems, ashby:foundry-for-good, ashby:getground, ashby:gradient, ashby:homera-health, ashby:molecule, ashby:payscale, ashby:supabase, ashby:the-studio, ashby:tremendous |
| lever | 84 | 84 | 0 | lever:vacancies, lever:tenna, lever:levelup, lever:nibiru, lever:applydigital, lever:brevo, lever:outsourcedstaff, lever:jetsupport, lever:willowinc, lever:gushwork, lever:parcelvision, lever:piccollage, lever:audinate, lever:alltrails, lever:90seconds, lever:beaverprocess, lever:brafton, lever:decilegroup, lever:deliverect, lever:hso, lever:lwolf, lever:repurposeglobal, lever:snappr, lever:truezerotech, lever:trustarc |
| remote-ok | 68 | 48 | 14 | remote-ok |
| jobicy | 62 | 25 | 3 | jobicy-supporting-apac, jobicy-admin-support-apac |
| remotive | 15 | 4 | 0 | remotive |
| authentic-jobs | 0 | 0 | 0 | authentic-jobs |
| dribbble | 0 | 0 | 0 | dribbble |
| himalayas | 0 | 0 | 0 | himalayas:remote-jobs |

## Supply by exact source_id

| source_id | platform | active | net-new 7d | net-new 30d | inactive |
| --- | --- | ---: | ---: | ---: | ---: |
| we-work-remotely | WeWorkRemotely | 516 | 40 | 417 | 1753 |
| breezy:20four7va | 20Four7VA | 166 | 20 | 59 | 154 |
| workable:hunt-st | Hunt St | 145 | 12 | 103 | 141 |
| real-work-from-anywhere | RealWorkFromAnywhere | 144 | 22 | 109 | 614 |
| breezy:sourcefit | Breezy/sourcefit | 132 | 11 | 54 | 177 |
| greenhouse:canonical | Canonical | 123 | 0 | 0 | 199 |
| ashby:multiplymii | Ashby/multiplymii | 76 | 3 | 18 | 13 |
| remote-ok | RemoteOK | 68 | 14 | 48 | 1243 |
| jobicy-supporting-apac | Jobicy | 56 | 3 | 22 | 150 |
| workable:crewbloom | CrewBloom | 22 | 4 | 16 | 71 |
| workable:coconutva | Coconut VA | 21 | 5 | 16 | 57 |
| lever:vacancies | Lever/vacancies | 20 | 0 | 20 | 0 |
| breezy:yokly | Yokly | 16 | 0 | 5 | 1 |
| greenhouse:solarwinds | Greenhouse/solarwinds | 16 | 0 | 16 | 0 |
| remotive | Remotive | 15 | 0 | 4 | 95 |
| breezy:remote-craft | Remote Craft | 14 | 0 | 0 | 1 |
| ashby:trust-wallet | Ashby/trust-wallet | 13 | 0 | 13 | 0 |
| lever:tenna | Lever/tenna | 11 | 0 | 11 | 0 |
| breezy:value-virtual-assistants | VALUE Virtual Assistants | 10 | 0 | 0 | 1 |
| workable:pearltalent | Pearl Talent | 10 | 2 | 9 | 61 |
| lever:levelup | Lever/levelup | 9 | 0 | 9 | 0 |
| lever:nibiru | Lever/nibiru | 8 | 0 | 8 | 0 |
| ashby:railway | Ashby/railway | 6 | 0 | 6 | 0 |
| greenhouse:gitlab | GitLab | 6 | 0 | 3 | 640 |
| jobicy-admin-support-apac | Jobicy | 6 | 0 | 3 | 9 |
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
| greenhouse:grafanalabs | Grafana Labs | 0 | 0 | 0 | 420 |
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
| remotive | 165 | 801 | 0 | 0 | 0 | 2002 |
| ashby:multiplymii | 149 | 0 | 817 | 0 | 0 | 6802 |
| breezy:20four7va | 149 | 0 | 1783 | 0 | 0 | 18187 |
| breezy:remote-craft | 149 | 0 | 817 | 0 | 0 | 2235 |
| breezy:sourcefit | 149 | 0 | 817 | 0 | 0 | 16995 |
| breezy:time-etc | 149 | 0 | 817 | 0 | 0 | 149 |
| breezy:value-virtual-assistants | 149 | 0 | 817 | 0 | 0 | 1490 |
| breezy:yokly | 149 | 0 | 817 | 0 | 0 | 596 |
| greenhouse:canonical | 149 | 0 | 817 | 0 | 0 | 46988 |
| greenhouse:ghost | 149 | 0 | 817 | 0 | 0 | 745 |
| greenhouse:gitlab | 149 | 0 | 817 | 0 | 0 | 36283 |
| greenhouse:grafanalabs | 149 | 0 | 817 | 0 | 0 | 19199 |
| greenhouse:nearform | 149 | 0 | 817 | 0 | 0 | 3980 |
| greenhouse:remotecom | 149 | 0 | 817 | 0 | 149 | 0 |
| real-work-from-anywhere | 147 | 0 | 817 | 2 | 0 | 7350 |
| we-work-remotely | 122 | 833 | 0 | 11 | 0 | 12200 |
| workable:hunt-st | 111 | 0 | 819 | 36 | 0 | 14510 |
| workable:rocketams | 111 | 0 | 819 | 36 | 0 | 1087 |
| workable:coconutva | 108 | 0 | 819 | 39 | 0 | 3403 |
| workable:crewbloom | 108 | 0 | 819 | 39 | 0 | 10787 |
| workable:hello-rache | 108 | 0 | 819 | 39 | 0 | 324 |
| workable:pearltalent | 108 | 0 | 819 | 39 | 0 | 31202 |
| remote-ok | 62 | 86 | 817 | 1 | 0 | 2721 |
| jobicy-supporting-apac | 22 | 128 | 816 | 0 | 0 | 880 |
| jobicy-admin-support-apac | 1 | 147 | 818 | 0 | 0 | 4 |
| ashby:amplify | 0 | 0 | 966 | 0 | 0 | 0 |
| ashby:ashby | 0 | 0 | 966 | 0 | 0 | 0 |
| ashby:camunda | 0 | 0 | 966 | 0 | 0 | 0 |
| ashby:circulareconomysystems | 0 | 0 | 966 | 0 | 0 | 0 |
| ashby:cubic3 | 0 | 0 | 966 | 0 | 0 | 0 |
| ashby:flipper | 0 | 0 | 966 | 0 | 0 | 0 |
| ashby:foundry-for-good | 0 | 0 | 966 | 0 | 0 | 0 |
| ashby:getground | 0 | 0 | 966 | 0 | 0 | 0 |
| ashby:gradient | 0 | 0 | 966 | 0 | 0 | 0 |
| ashby:luxor | 0 | 0 | 966 | 0 | 0 | 0 |
| ashby:molecule | 0 | 0 | 966 | 0 | 0 | 0 |
| ashby:payscale | 0 | 0 | 966 | 0 | 0 | 0 |
| ashby:railway | 0 | 0 | 966 | 0 | 0 | 0 |
| ashby:scalemath | 0 | 0 | 966 | 0 | 0 | 0 |
| ashby:supabase | 0 | 0 | 966 | 0 | 0 | 0 |
| ashby:the-studio | 0 | 0 | 966 | 0 | 0 | 0 |
| ashby:tremendous | 0 | 0 | 966 | 0 | 0 | 0 |
| ashby:trust-wallet | 0 | 0 | 966 | 0 | 0 | 0 |
| ashby:whippy | 0 | 0 | 966 | 0 | 0 | 0 |
| authentic-jobs | 0 | 0 | 966 | 0 | 0 | 0 |
| breezy:vaaphilippines-recruitment | 0 | 0 | 966 | 0 | 0 | 0 |
| dribbble | 0 | 0 | 966 | 0 | 0 | 0 |
| jobspresso | 0 | 0 | 966 | 0 | 0 | 0 |
| lever:applydigital | 0 | 0 | 966 | 0 | 0 | 0 |
| lever:audinate | 0 | 0 | 966 | 0 | 0 | 0 |
| lever:beaverprocess | 0 | 0 | 966 | 0 | 0 | 0 |
| lever:brafton | 0 | 0 | 966 | 0 | 0 | 0 |
| lever:brevo | 0 | 0 | 966 | 0 | 0 | 0 |
| lever:decilegroup | 0 | 0 | 966 | 0 | 0 | 0 |
| lever:deliverect | 0 | 0 | 966 | 0 | 0 | 0 |
| lever:gushwork | 0 | 0 | 966 | 0 | 0 | 0 |
| lever:jetsupport | 0 | 0 | 966 | 0 | 0 | 0 |
| lever:lwolf | 0 | 0 | 966 | 0 | 0 | 0 |
| lever:nibiru | 0 | 0 | 966 | 0 | 0 | 0 |
| lever:outsourcedstaff | 0 | 0 | 966 | 0 | 0 | 0 |
| lever:parcelvision | 0 | 0 | 966 | 0 | 0 | 0 |
| lever:piccollage | 0 | 0 | 966 | 0 | 0 | 0 |
| lever:repurposeglobal | 0 | 0 | 966 | 0 | 0 | 0 |
| lever:snappr | 0 | 0 | 966 | 0 | 0 | 0 |
| lever:tenna | 0 | 0 | 966 | 0 | 0 | 0 |
| lever:truezerotech | 0 | 0 | 966 | 0 | 0 | 0 |
| lever:vacancies | 0 | 0 | 966 | 0 | 0 | 0 |
| lever:vaultoutsourcing | 0 | 0 | 966 | 0 | 0 | 0 |
| lever:willowinc | 0 | 0 | 966 | 0 | 0 | 0 |
| onlinejobs-ph | 0 | 0 | 966 | 0 | 0 | 0 |
| problogger | 0 | 0 | 966 | 0 | 0 | 0 |
| remote-co | 0 | 0 | 966 | 0 | 0 | 0 |
| workable:connectos | 0 | 0 | 966 | 0 | 0 | 0 |
| workable:global-strategic | 0 | 0 | 966 | 0 | 0 | 0 |
| workable:myoutdesk | 0 | 0 | 966 | 0 | 0 | 0 |
| workable:outsource-access | 0 | 0 | 966 | 0 | 0 | 0 |
| workable:pineapple-staffing | 0 | 0 | 966 | 0 | 0 | 0 |
| workable:staff-domain-inc | 0 | 0 | 966 | 0 | 0 | 0 |
| workable:superstaff | 0 | 0 | 966 | 0 | 0 | 0 |
| workable:virtualstaff365 | 0 | 0 | 966 | 0 | 0 | 0 |

## Geo & eligibility triage outcomes (last 7 days)

Breakdown of stored opportunities by Philippines eligibility verdict.

| source_id | eligible | unclear | ineligible | policy_rejected | total | qualified_rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| we-work-remotely | 40 | 2 | 108 | 110 | 150 | 26.7% |
| greenhouse:gitlab | 0 | 1 | 37 | 38 | 38 | 0.0% |
| real-work-from-anywhere | 22 | 2 | 5 | 7 | 29 | 75.9% |
| greenhouse:grafanalabs | 0 | 0 | 28 | 28 | 28 | 0.0% |
| remote-ok | 14 | 3 | 5 | 8 | 22 | 63.6% |
| breezy:sourcefit | 11 | 0 | 10 | 10 | 21 | 52.4% |
| breezy:20four7va | 20 | 0 | 0 | 0 | 20 | 100.0% |
| workable:hunt-st | 12 | 1 | 2 | 2 | 15 | 80.0% |
| jobicy-supporting-apac | 3 | 0 | 11 | 11 | 14 | 21.4% |
| greenhouse:nearform | 0 | 0 | 6 | 6 | 6 | 0.0% |
| workable:coconutva | 5 | 0 | 0 | 0 | 5 | 100.0% |
| workable:crewbloom | 4 | 0 | 0 | 0 | 4 | 100.0% |
| workable:pearltalent | 2 | 0 | 2 | 2 | 4 | 50.0% |
| ashby:multiplymii | 3 | 0 | 0 | 0 | 3 | 100.0% |
| greenhouse:canonical | 0 | 0 | 2 | 2 | 2 | 0.0% |
| remotive | 0 | 0 | 2 | 2 | 2 | 0.0% |
| workable:rocketams | 0 | 0 | 1 | 1 | 1 | 0.0% |

## Yield efficiency (last 7 days)

Stored eligibility per real (changed) fetch and per 100 items seen; not marginal verified first-publication yield.
UNKNOWN means a count is missing/invalid or its denominator is zero. Fetch and stored cohorts may differ across intake paths; these descriptive ratios do not establish source productivity or causal yield.

| source_id | real fetches | items seen | eligible stored | yield / fetch | yield / 100 items |
| --- | ---: | ---: | ---: | ---: | ---: |
| remotive | 165 | 2002 | 0 | 0.00 | 0.00 |
| ashby:multiplymii | 149 | 6802 | 3 | 0.02 | 0.04 |
| breezy:20four7va | 149 | 18187 | 20 | 0.13 | 0.11 |
| breezy:remote-craft | 149 | 2235 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:sourcefit | 149 | 16995 | 11 | 0.07 | 0.06 |
| breezy:time-etc | 149 | 149 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:value-virtual-assistants | 149 | 1490 | UNKNOWN | UNKNOWN | UNKNOWN |
| breezy:yokly | 149 | 596 | UNKNOWN | UNKNOWN | UNKNOWN |
| greenhouse:canonical | 149 | 46988 | 0 | 0.00 | 0.00 |
| greenhouse:ghost | 149 | 745 | UNKNOWN | UNKNOWN | UNKNOWN |
| greenhouse:gitlab | 149 | 36283 | 0 | 0.00 | 0.00 |
| greenhouse:grafanalabs | 149 | 19199 | 0 | 0.00 | 0.00 |
| greenhouse:nearform | 149 | 3980 | 0 | 0.00 | 0.00 |
| greenhouse:remotecom | 149 | 0 | UNKNOWN | UNKNOWN | UNKNOWN |
| real-work-from-anywhere | 147 | 7350 | 22 | 0.15 | 0.30 |
| we-work-remotely | 122 | 12200 | 40 | 0.33 | 0.33 |
| workable:hunt-st | 111 | 14510 | 12 | 0.11 | 0.08 |
| workable:rocketams | 111 | 1087 | 0 | 0.00 | 0.00 |
| workable:coconutva | 108 | 3403 | 5 | 0.05 | 0.15 |
| workable:crewbloom | 108 | 10787 | 4 | 0.04 | 0.04 |
| workable:hello-rache | 108 | 324 | UNKNOWN | UNKNOWN | UNKNOWN |
| workable:pearltalent | 108 | 31202 | 2 | 0.02 | 0.01 |
| remote-ok | 62 | 2721 | 14 | 0.23 | 0.51 |
| jobicy-supporting-apac | 22 | 880 | 3 | 0.14 | 0.34 |
| jobicy-admin-support-apac | 1 | 4 | UNKNOWN | UNKNOWN | UNKNOWN |
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
