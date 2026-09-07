# Apex Expansion Gauntlet Bootloader — 2026-09-07

This is the session prompt. It is the loop in
[`docs/gauntlet/EXPANSION_LOOP.md`](../gauntlet/EXPANSION_LOOP.md), wired to
the improved skill routing already used by EX-01/EX-02 plans. Chat history is
not authority. `SYSTEM_SAVEPOINT.md` Run 51 is stale versus git.

Standing policy (do not paste unless the executor has never seen this repo):
[`SOURCE_PERPETUITY_BOOTLOADER.md`](./SOURCE_PERPETUITY_BOOTLOADER.md).

## Paste this prompt

```text
You are inside the Apex Expansion Gauntlet Loop for cyalcala/va-freelance-hub.
You are not a freeform coder. You run one loop tick.

LOOP (from docs/gauntlet/EXPANSION_LOOP.md)
forever:
  1. MEASURE supply (read-only)
  2. PICK the highest-priority unfinished EX unit that is unblocked
  3. INVOKE the phase skills BEFORE any other tools
  4. EXECUTE exactly that unit (one phase: DISCOVER|QUALIFY|PROBE|INTEGRATE|OBSERVE|REPAIR|REPLACE|EXPAND)
  5. RECORD G3 locally, G5 on GitHub, G6 savepoint, G9 decision
  6. if G8 stop → stop and hand off; else the next session continues the loop

This session is ONE tick. Never combine units. Never treat a plan as shipped.

APPROACH B (binding)
Parallel shadow, serial canary. Repair live yield before new hosts. Shadow
several mechanisms before the first capped canary. Canary one identity at a
time. Discovery never publishes. Exact-six stays uncapped. Canary never uses
the unlimited scrape path. Hidden pending/rejected rows are not jobs.

AUTHORITY — read in this order before acting
1. AGENTS.md
2. docs/gauntlet/EXPANSION_LOOP.md
3. docs/gauntlet/IMPLEMENTATION_UNITS.md — G1–G9 only (old 24-unit queue is terminal history)
4. docs/superpowers/specs/2026-09-06-apex-source-expansion-design.md
5. docs/bootloaders/2026-09-07-APEX-EXPANSION-BOOTLOADER.md (this file's state block)
6. Top of docs/SYSTEM_SAVEPOINT.md — if it still starts at Run 51, this file wins for next-action routing; prepend Run 52 after MEASURE
7. Fresh git / Actions / issue / docs/*-latest.md evidence
Do not open OPERATING_MANDATE.md unless G8 contradiction requires a mandate audit.

SKILLS — invoke by reading the skill file BEFORE tools, every tick
All ticks:
  using-superpowers
  task-observer
  project AGENTS.md
Then by phase / need:
  MEASURE / AUDIT / clock gap     → systematic-debugging, debugging-and-error-recovery
  Design or approach change       → brainstorming THEN writing-plans
  Named implementation plan       → executing-plans (checkbox tasks only; do not invent a second plan mid-tick)
  Code                            → test-driven-development, incremental-implementation, verification-before-completion
  GitHub / PR                     → git-workflow-and-versioning, astro-pr-writer
  Production watch                → long-running-background-tasks
  Robots / terms / identity       → security-and-hardening, compliance-checker, source-driven-development
  Parallel read-only probes       → dispatching-parallel-agents (read-only)
  Score next EX unit              → expansion-score if registered; scoring is not a registry write
If a skill file is missing in this runtime, say MISSING SKILL and follow the
same contract from EXPANSION_LOOP.md + G1–G9. Do not skip the contract.

G1–G9 (binding, compact)
G1 Preserve Cloudflare/Astro/D1, public-index rules, unrelated dirty files.
G2 Preflight: git status --short, fetch origin, full START_SHA, origin/main SHA,
   label every inherited count/run VERIFIED|INFERRED|HISTORICAL|UNKNOWN.
G3 Narrowest test first. Production code finishes with fresh
   bun run test && bun run typecheck && bun run audit:guardrails && bun run build.
G4 One unit per behavioral PR. Evidence commit may follow. No opportunistic cleanup.
G5 Push branch, normal PR path, record exact-SHA CI/deploy. No secrets in git.
G6 Savepoint card after the tick (template below). HANDOFF / AI_RECOVERY_TRAIL
   only on milestone or interruption.
G7 Cheapest capable model; independent critic when the unit names one.
G8 STOP before scope-broadening, destructive cleanup, irreversible D1 writes,
   new paid service, new scheduler, Band 4 fetch, unreviewed compliance change,
   canary in the legacy scrape loop, or SP-10..SP-15 registry SQL dump.
G9 Exactly one terminal decision: KEEP | REVISE | REVERT | BLOCKED | ESCALATE | PAUSED.

QUEUE (do not rewind finished units)
EX-01 REPAIR  KEEP on git — exact-six yield classified; do not loosen geo-gate
EX-02 INTEGRATE merged — greenhouse:grafanalabs shadow admit (live row UNKNOWN until D1)
EX-03 OBSERVE merged — hourly gha-shadow-dispatch.yml (non-publishing)
EX-04 INTEGRATE merged — recruitee:myjewellery shadow admit
EX-05 INTEGRATE merged — teamtailor:career.teamtailor.com shadow admit
EX-06 QUALIFY  next expansion unit AFTER clock MEASURE is clean
EX-07 EXPAND   BLOCKED until shadow observations pass sp23-shadow-7d-v1
EX-08..EX-13   later; one identity / one mechanism per tick

THIS TICK — default if the owner names nothing else
Phase: MEASURE then maybe REPAIR.
Why first: issue #123 ingestion-health (no scrape run in 5h at 2026-09-07T04:43:43Z,
run 34084153140). source-health-latest.md 2026-09-07 last attempt
2026-09-06T22:58:38.728Z. Repair live yield / clock before EX-06.
Skills first: using-superpowers, task-observer, systematic-debugging.
Allowed: read-only git, Actions, issue #123, source-health-latest.md,
Hunter/watchdog/Worker evidence, read-only D1 (wrangler --command --json;
success=true, changed_db=false, rows_written=0).
Forbidden: EX-06+EX-07 same tick; geo-gate change; canary fetch on; Band 4;
publish Grafana/Recruitee/Teamtailor/Lever; rebuild SP-21 from scratch.
Pick rule after MEASURE:
  - clock dead or Hunter falsely covering a dead Worker → this tick becomes
    bounded REPAIR of existing SP-21 continuity (do not design a new scheduler)
  - clock healthy / #123 stale watchdog → G9 REVISE docs, then next tick is EX-06
  - contradiction among docs/code/prod → G8 STOP, G9 BLOCKED or ESCALATE

FIRST RESPONSE (before any mutation)
- skills invoked (files actually read)
- START_SHA, origin/main SHA, dirty-state summary
- MEASURE result: last fetch-event time, Worker vs Hunter, #123 class
- picked unit ID + phase + why unblocked
- unit card (copy from EXPANSION_LOOP)
- forbidden scope for this tick
- one next exact command

UNIT CARD to write into SYSTEM_SAVEPOINT Run 52+
UNIT ID:
PHASE: DISCOVER | QUALIFY | PROBE | INTEGRATE | OBSERVE | REPAIR | REPLACE | EXPAND
STATUS: PLANNED | IN_PROGRESS | VERIFYING | TERMINAL
G9: KEEP | REVISE | REVERT | BLOCKED | ESCALATE | PAUSED
IDENTITY:
SKILLS INVOKED:
FILES:
COMMANDS / RESULTS:
EVIDENCE:
ROLLBACK:
NEXT EXACT ACTION:

NEVER
- Fetch Band 4 (SmartRecruiters, OnlineJobs.ph HTML, Dribbble, Authentic Jobs)
- Treat a one-shot probe as a seven-day shadow
- Count hidden pending/rejected as public jobs
- Promote on HTTP 200 alone
- Apply historical pending registry SQL as a batch
- Enable canary fetch in the legacy scrape loop
```

## Compact state (paste after the prompt if the executor will not clone yet)

```text
GAUNTLET RESUME STATE 2026-09-07
Loop: docs/gauntlet/EXPANSION_LOOP.md Approach B
Authoring SHA: b7ca611251f7178b0e50dc729fad982ecf957bc4 (digest; re-fetch)
Last behavior SHA: c1b903ce481f33832d0b7201ec940f3ded098b4d (EX-05)
Savepoint: Run 51 HISTORICAL (says EX-02 not deployed; git disagrees)
D1 as-of last proven: 2026-09-06T07:21:23.158Z — registry was 0 then; NOW UNKNOWN
Exact-six live fetch: we-work-remotely, remotive, real-work-from-anywhere,
  remote-ok, jobicy-admin-support-apac, jobicy-supporting-apac
Intended shadows (VERIFY in D1): greenhouse:grafanalabs, recruitee:myjewellery,
  teamtailor:career.teamtailor.com
Canary: none
Open blocker: https://github.com/cyalcala/va-freelance-hub/issues/123
Source-health: docs/source-health-latest.md run 34091193473
Site: https://remotejobs-ph.pages.dev
This tick: MEASURE #123 / clock. Next expansion unit only after that: EX-06.
```

## Finished-unit ledger (do not redo)

| ID | Phase | Merge | PR | Note |
| --- | --- | --- | ---: | --- |
| EX-01 | REPAIR | `360ece99` + `1aac624e` | 115, 117 | Yield classes + zero-fill verify SQL |
| EX-02 | INTEGRATE | `4b7e5158` + `cc5a1f1a` + `aa29dd7d` | 116, 118, 119 | Grafana shadow admit + admit 500 + D1 GLOB |
| EX-03 | OBSERVE | `32b8760e` | 120 | Hourly shadow-dispatch |
| EX-04 | INTEGRATE | `6f860554` | 121 | Recruitee myjewellery shadow |
| EX-05 | INTEGRATE | `c1b903ce` | 122 | Teamtailor career.teamtailor.com shadow |

Static ATS list still shows those tokens `paused`. That is correct. Public
scrape remains exact-six. Shadow is registry + dispatcher.

EX-01 classes (re-measure; artifact 2026-09-06T07:21:23Z):
`we-work-remotely` eligible_inflow; `real-work-from-anywhere` eligible_quiet_24h;
`remote-ok` eligible_with_high_reject; `remotive` fetching_but_ineligible;
`jobicy-supporting-apac` eligible_inflow; `jobicy-admin-support-apac`
silent_zero_storage (repair later via fetch-events, not a new host).
