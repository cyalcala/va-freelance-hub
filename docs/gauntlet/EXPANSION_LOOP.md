# Apex Expansion Gauntlet Loop

**Status:** Proposed. Planning only. G1–G9 from
`docs/gauntlet/IMPLEMENTATION_UNITS.md` remain binding. This file is the
repeatable expansion queue after SP-23C. It does not activate a source by
existing.

**Design:** `docs/superpowers/specs/2026-09-06-apex-source-expansion-design.md`

## Loop contract

Every expansion tick is one unit. The unit may DISCOVER, QUALIFY, PROBE,
INTEGRATE, OBSERVE, REPAIR, REPLACE, or EXPAND — never all of those as one
commit. After the unit: G3 locally, G5 on GitHub, G6 savepoint, G9 decision.

```text
forever:
  measure supply (read-only D1)
  pick the highest-priority unfinished EX unit that is unblocked
  execute that unit only
  record evidence + savepoint
  if G8 stop condition → stop and hand off
  else continue
```

Stop conditions (G8): robots/terms contradiction, classifier-blocked registry
write without owner confirmation, new paid service, schedule that fetches a
third party before a shadow row exists, or any attempt to fetch a Band 4 host.

## Priority order

Repair live yield before opening new hosts. Shadow several mechanisms before
capped canary. Canary one identity at a time. Discovery never publishes.

| ID | Phase | Unit | Unblocks daily jobs by |
| --- | --- | --- | --- |
| EX-01 | REPAIR | Exact-six accepted-yield diagnosis (Remotive, Jobicy admin, Remote OK rejects, RWFA 24h) | Getting more of the jobs we already fetch onto the board |
| EX-02 | INTEGRATE | First shadow row: `greenhouse:grafanalabs` through SP-23B gateway | First non-exact-six identity in the registry |
| EX-03 | OBSERVE | Wire `shadow-dispatch` to a real schedule once EX-02 is live | Recurring observation, still non-publishing |
| EX-04 | INTEGRATE | Recruitee `myjewellery` shadow | Second mechanism in shadow |
| EX-05 | INTEGRATE | Teamtailor `career.teamtailor.com` shadow | Third mechanism in shadow |
| EX-06 | QUALIFY | Retarget Lever to a currently-hiring public board; re-probe | Lever mechanism usable |
| EX-07 | EXPAND | First capped canary (Grafana Labs if EX-03 observations pass `sp23-shadow-7d-v1`) | First new public jobs beyond exact-six |
| EX-08 | INTEGRATE | Remaining known Greenhouse boards one identity at a time | More employer boards on a proven mechanism |
| EX-09 | INTEGRATE | Workable hourly GHA preprocessor + shadow (`workable:global-feed`) | Largest official remote/PH XML net |
| EX-10 | DISCOVER | Prospector candidate drain into QUALIFY/PROBE (no publish) | Continuous new exact identities |
| EX-11 | DISCOVER | Employer intake + partner-permission packets as candidate input | Opt-in widening |
| EX-12 | QUALIFY | Additional documented Jobicy categories under the existing cadence group | More APAC VA/support rows without a new origin |
| EX-13 | REPAIR | Concentration/failover: if top-two share >80% of 7d, promote next shadow | Diversification |
| EX-LOOP | all | Repeat measure → pick → execute | Perpetuity |

EX-07 is the first unit that may publish jobs from a new source. It uses the
0041 ledger and a positive per-tick cap. Rollback is `rollback-to-shadow`.

## Per-unit card (copy into the savepoint)

```text
UNIT ID:
PHASE: DISCOVER | QUALIFY | PROBE | INTEGRATE | OBSERVE | REPAIR | REPLACE | EXPAND
STATUS: PLANNED | IN_PROGRESS | VERIFYING | TERMINAL
G9: KEEP | REVISE | REVERT | BLOCKED | ESCALATE | PAUSED
IDENTITY: (canonical source_id or none)
FILES:
COMMANDS / RESULTS:
EVIDENCE:
ROLLBACK:
NEXT EXACT ACTION:
```

## Skills routing for executors

| Phase | Skills to invoke before tools |
| --- | --- |
| All | `using-superpowers`, `task-observer`, project `AGENTS.md` |
| Design/change of approach | `brainstorming` then `writing-plans` |
| Code | `test-driven-development`, `incremental-implementation`, `verification-before-completion` |
| GitHub | `git-workflow-and-versioning`, `astro-pr-writer` |
| Production watch | `long-running-background-tasks` |
| Security/compliance | `security-and-hardening`; stop on robots/terms doubt |
| Parallel independent probes | `dispatching-parallel-agents` (read-only) |
| Recurring agent loop | project workflow `expansion-score` once registered — scores next EX unit, does not write registry |

## What a loop tick must never do

- Fetch Band 4 hosts
- Treat a one-shot probe as a seven-day shadow
- Count hidden pending/rejected rows as public jobs
- Promote on HTTP 200 alone
- Apply historical pending registry SQL as a batch
- Enable canary fetch in the legacy scrape loop
