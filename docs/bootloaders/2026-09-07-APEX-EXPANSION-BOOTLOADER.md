# Apex Expansion — Session Bootloader (2026-09-07)

Use this file to resume `cyalcala/va-freelance-hub` after EX-01..EX-05 landed
and the standing Source Perpetuity template went stale against git.

The reusable policy prompt is still
[`SOURCE_PERPETUITY_BOOTLOADER.md`](./SOURCE_PERPETUITY_BOOTLOADER.md).
Paste that first. Then paste the compact state and first-action block below.
Chat history is never authoritative.

`docs/SYSTEM_SAVEPOINT.md` Run 51 and the top of `docs/HANDOFF.md` are
**HISTORICAL relative to origin/main**. They still say EX-02 is waiting to
deploy. Git and GitHub Actions already contain EX-01 through EX-05. Do not
re-implement those units. Prepend a new savepoint run after this session's
first verified measurement.

## What already continued (do not redo)

Verified from `origin/main` commit history on 2026-09-07. Exact-SHA CI/deploy
IDs below the merge commits must be re-checked before calling any of these
KEEP in a new session.

| ID | Phase | Merge commit | PR | What it did | What it did not do |
| --- | --- | --- | ---: | --- | --- |
| EX-01 | REPAIR | `360ece99dd0dd19ea74a85aef27ca5689354db90` | 115 | Classified exact-six yield; verify SQL emits silent zeros | Did not loosen geo-gate |
| EX-01 follow | REPAIR | `1aac624e4aa8bd3b3ab9e9b072555321f13d5281` | 117 | Avoided D1 compound SELECT limit in exact-six verify SQL | No source change |
| EX-02 | INTEGRATE | `4b7e5158350d05f41ad100b0d38377dd1d4f7e53` | 116 | Admit `greenhouse:grafanalabs` to non-publishing shadow | No public jobs |
| EX-02 follow | REPAIR | `cc5a1f1a6bf51f0a215009e2c359455d45828972` | 118 | Admit route returns failure reasons instead of HTTP 500 | No publish |
| EX-02 follow | REPAIR | `aa29dd7d8ec33eec63c29e05599390afc92d0a8e` | 119 | Dropped D1-illegal 92-byte ISO GLOB so admit can insert | No publish |
| EX-03 | OBSERVE | `32b8760ec2c59406fa6cb72b6e3e724241759364` | 120 | Hourly `gha-shadow-dispatch.yml` for existing shadow rows | Does not scrape or admit |
| EX-04 | INTEGRATE | `6f8605549162ffa6c7273ca8af61878ac05f3626` | 121 | Admit Recruitee `myjewellery` to non-publishing shadow | No publish |
| EX-05 | INTEGRATE | `c1b903ce481f33832d0b7201ec940f3ded098b4d` | 122 | Admit Teamtailor `career.teamtailor.com` to non-publishing shadow | No publish |

Manual `gha-source-admit.yml` was dispatched five times by the owner after
those merges. Treat live registry row counts as UNKNOWN until a fresh
read-only D1 query. The static ATS scrape list still marks those identities
`paused`; that is expected. Shadow observation is the registry + dispatcher
path, not the exact-six scrape loop.

Latest default-branch SHA at bootloader authoring:
`b7ca611251f7178b0e50dc729fad982ecf957bc4` (docs-only enrichment digest).
Automated digest commits continue to move `origin/main`. Re-fetch.

## What must continue next

Queue authority: [`docs/gauntlet/EXPANSION_LOOP.md`](../gauntlet/EXPANSION_LOOP.md).
Repair live yield before opening new hosts. Shadow several mechanisms before
the first capped canary. One unit per session.

1. **Immediate — AUDIT the open clock gap, then only repair if a named unit
   exists.** Open issue
   [#123](https://github.com/cyalcala/va-freelance-hub/issues/123)
   `Ingestion health alert (2026-09-07)`: watchdog signal
   `no scrape run in 5h (clock may be stopped)` at `2026-09-07T04:43:43Z`,
   detection run `34084153140`. The 2026-09-07 source-health rollup
   (`docs/source-health-latest.md`, run `34091193473`) still shows last
   `source_fetch_events` attempt `2026-09-06T22:58:38.728Z` for every row.
   That is a continuity defect on the primary ten-minute Worker / Hunter
   standby path. Classify it before EX-06. Do not globally disable ingestion.
   Do not treat a skipped ATS identity as a dead clock.
2. **After the clock is classified healthy or fenced — EX-06 QUALIFY.**
   Retarget Lever to a currently-hiring public board and re-probe. Lever is
   still `lever:vaultoutsourcing` paused in the static list. EX-06 does not
   publish and does not enable canary fetch.
3. **Do not start EX-07.** First capped canary (`greenhouse:grafanalabs`)
   requires recurrent stored shadow observations that pass `sp23-shadow-7d-v1`.
   EX-03 only started 2026-09-06. A one-shot probe is not a seven-day shadow.
4. **Do not replay SP-10..SP-15 registry SQL.** Exact-six public fetch set is
   unchanged until a later EXPAND unit.
5. Optional later queue, still one at a time: EX-08 remaining Greenhouse
   boards, EX-09 Workable global XML preprocessor, EX-12 Jobicy categories,
   EX-13 concentration/failover if top-two still exceed 80% of 7d yield.

Exact-six accepted-yield classes from EX-01 (artifact as-of
`2026-09-06T07:21:23.158Z`; re-measure):

- `we-work-remotely` eligible_inflow
- `real-work-from-anywhere` eligible_quiet_24h
- `remote-ok` eligible_with_high_reject (PH filter working)
- `remotive` fetching_but_ineligible — do not loosen geo-gate
- `jobicy-supporting-apac` eligible_inflow
- `jobicy-admin-support-apac` silent_zero_storage — repairable later via
  `source_fetch_events`, not by adding a host

## Copy/paste first response contract

```text
You are resuming cyalcala/va-freelance-hub on 2026-09-07+ apex expansion.

Read SOURCE_PERPETUITY_BOOTLOADER.md standing rules first. Then obey this
session contract.

Requested mode if the owner did not name one: AUDIT (clock gap / issue #123),
then recommend exactly one next unit. Do not EXECUTE a production-changing
unit from this bootloader alone.

Preflight:
- git fetch origin && git status --short && git rev-parse HEAD && git rev-parse origin/main
- Preserve dirty/untracked files. Do not reset --hard or clean.
- Read AGENTS.md, this bootloader, docs/gauntlet/EXPANSION_LOOP.md, then the
  top of docs/SYSTEM_SAVEPOINT.md. If savepoint still starts at Run 51, treat
  this bootloader as the newer baton and say so.
- Re-read docs/source-health-latest.md, issue #123, latest watchdog and
  shadow-dispatch runs, and a read-only D1 snapshot if credentials exist.
- Label every material claim VERIFIED, INFERRED, HISTORICAL, or UNKNOWN.

Forbidden in this first tick:
- Loosen geo-gate
- Enable canary fetch in the legacy scrape loop
- Publish jobs from Grafana / Recruitee / Teamtailor / Lever
- Fetch Band 4 hosts (OnlineJobs.ph HTML, Dribbble, Authentic Jobs, SmartRecruiters)
- Replay historical SP-10..SP-15 registry SQL
- Combine EX-06 with EX-07
- Spend money, rotate secrets, or add a paid service

First named action after preflight:
1. Classify issue #123 and the last source_fetch_events timestamp.
2. If the primary clock is stopped, the unit is a bounded REPAIR of clock
   continuity / Hunter standby (SP-21 already exists; do not rebuild it).
   Measure whether Hunter scheduled standby is correctly skipping a healthy
   Worker or incorrectly covering a dead Worker.
3. If the clock is healthy and #123 is a stale or incomplete watchdog row,
   close-out is documentation + evidence, then EX-06 is the next expansion unit.
4. End AUDIT with one next exact command and one terminal decision:
   KEEP, REVISE, REVERT, BLOCKED, ESCALATE, or PAUSED.

Update docs/SYSTEM_SAVEPOINT.md as Run 52+ after the measurement, then
docs/IMPLEMENTATION_STATUS.md. Touch docs/HANDOFF.md and
docs/AI_RECOVERY_TRAIL.md only if this session is a milestone or interruption.
```

## Compact state block

```text
SOURCE PERPETUITY / APEX EXPANSION RESUME STATE
As-of time/timezone: 2026-09-07T17:31:00-07:00 (authoring; not a D1 as-of)
Requested mode (PLAN | EXECUTE | AUDIT | RECOVER): AUDIT
Requested unit ID or planning question: Classify #123 clock gap; do not start EX-06 until that returns
Last known branch/worktree: origin/main
Last known full HEAD/START SHA: b7ca611251f7178b0e50dc729fad982ecf957bc4 (digest; re-fetch)
Last known origin/main SHA: same as above at authoring; UNKNOWN after next digest
Last accepted behavior SHA: c1b903ce481f33832d0b7201ec940f3ded098b4d (EX-05 Teamtailor shadow admit)
Last evidence/docs SHA: HISTORICAL — savepoint Run 51 predates EX-02 deploy
Last exact-SHA CI/deploy run and URL: UNKNOWN (re-open PRs #115-#122 and their main deploy runs)
Last bounded production/D1 evidence window: HISTORICAL 2026-09-06T07:21:23.158Z (SP-23C ledger proof). Registry/shadow counts after EX-02..EX-05 are UNKNOWN until a fresh read-only query.
Known dirty or untracked files (do not overwrite): UNKNOWN in this remote session
Current unit status: EX-01 KEEP (diagnosis). EX-02..EX-05 merged to main; production row proof UNKNOWN. EX-06 PLANNED, blocked by clock audit. EX-07 blocked on 7-day shadow observations.
Current terminal decision, if any: none for this bootloader session
Current blockers/STOP conditions: open issue #123 ingestion heartbeat; stale savepoint/handoff vs git; no fresh D1 registry/shadow counts in this authoring session
Known external-authority decisions or constraints: Approach B (parallel shadow, serial canary) approved in EXPANSION_LOOP.md. Founder is not required for ordinary in-scope audit/docs. Autonomy Cutover Predicate still unmet. Canary publication still off.
Constitution/policy/schema versions: migrations 0039-0042 expected in production; confirm. Publication ledger 0041 live as of Run 48. D1 GLOB length repair 0042 shipped with EX-02 follow.
Observed versus merely labeled capabilities: shadow-admit route and hourly shadow-dispatch workflow exist on main. Static ATS scrape identities remain paused. Exact-six still the only public fetch set.
Real fetching sources (static allowed list): we-work-remotely, remotive, real-work-from-anywhere, remote-ok, jobicy-admin-support-apac, jobicy-supporting-apac
Registry/reserve counts: UNKNOWN after EX-02..EX-05 admits; were 0 at 2026-09-06T07:21:23Z
Shadow identities intended: greenhouse:grafanalabs, recruitee:myjewellery, teamtailor:career.teamtailor.com — VERIFY live before treating as operating shadows
Canary identities: none
Public job publication from new sources: none
Open ops issue: https://github.com/cyalcala/va-freelance-hub/issues/123
Latest source-health rollup: docs/source-health-latest.md date 2026-09-07, run 34091193473, last attempt 2026-09-06T22:58:38.728Z, 0 failed attempts, 11410 items seen, many rows are policy skips not fetches
Latest directory-health: docs/directory-health-latest.md date 2026-09-07, run 34085979704, 40 checked, 31 OK, 0 dead
Live site: https://remotejobs-ph.pages.dev
Next exact action: AUDIT #123 + last fetch-event time + Hunter standby vs Worker heartbeat. Then either bounded clock REPAIR or EX-06 Lever QUALIFY. Never EX-07 in the same tick.
```

## Read order for the next executor

1. `AGENTS.md`
2. This file
3. `docs/bootloaders/SOURCE_PERPETUITY_BOOTLOADER.md` (standing rules)
4. `docs/gauntlet/EXPANSION_LOOP.md`
5. `docs/superpowers/specs/2026-09-06-apex-source-expansion-design.md`
6. Top of `docs/SYSTEM_SAVEPOINT.md` (expect stale Run 51)
7. `docs/gauntlet/evidence/EX-01-exact-six-yield-2026-09-06.md`
8. `docs/source-health-latest.md` and issue #123
9. `docs/SOURCE_REPLENISHMENT_MASTERPLAN.md` and ADR-007 only if the unit
   would change governance or cutover

## Stop conditions inherited from the expansion loop

STOP before mutation when robots/terms contradict the classification, a
registry write is classifier-blocked without owner confirmation, a new paid
service appears, a schedule would fetch a third party before a shadow row
exists, or any Band 4 host is about to be fetched.
