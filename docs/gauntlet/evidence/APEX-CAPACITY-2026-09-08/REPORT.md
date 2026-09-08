# APEX source capacity — 2026-09-08

Status: DEPLOYED; further execution PAUSED by owner. Start main dda9c168d6ac39a53ec85b3ac0bd45cb1a541774.
Branch codex/apex-source-capacity. User authorized continuing all work.
Only new main change since ca29be0 was prospector digest dda9c16, workflow
34220309711 successful. No replay of terminal units or fresh evidence renewal.

## Measured limits and design

Cloudflare D1 documents 50 queries per invocation on Free; Workers documents
50 external requests on Free. Count every SQL statement in an atomic batch
conservatively rather than assuming the batch costs one query.
Sources: https://developers.cloudflare.com/d1/platform/limits/ and
https://developers.cloudflare.com/workers/platform/limits/ (read September 8).
These are design ceilings, not a claim about a measured billing tier or cost.

The prior renewal path made four current-evidence reads per source per phase.
Six sources would conservatively require 82 SQL statements. The joined snapshot
loads source, durable opt-out, provider and latest immutable packet in one SELECT,
then runs the same digest/revision/authority/lease validators. No cross-phase
cache is introduced; atomic batch guards and post-write readback remain.

Renewal route/core now share a six-source ceiling and cap the union of primary
references at sixteen BEFORE document fetching. Real migrated SQLite integration
with HTTP fixtures measures seven D1 queries for six-source preview and twenty-
eight statements for full renewal, counting all eight batch statements. Worst
case sixteen document requests plus twelve probe requests totals twenty-eight.
Seventh source or more than sixteen primary references fails closed. These tests
do not reset live observation windows or constitute live provider renewal.

Dispatcher window is at most twelve current shadow identities, rotated by UTC
hour over sorted registry source IDs. Count invalid/cadence-held authority reads
against the bound as well as actual dispatches. Fresh authority is checked before
any probe; durable insertion still rejects intervening opt-outs/revisions.
One enumeration + twelve*(one evidence+one cadence+one insert) =37 SQL statements;
at most24 external probe requests. Structured registryWindow identifies that
summary counts describe the bounded enumerated window, not the whole registry.
Hourly rotation keeps invalid early identities from permanently starving later
sources; membership changes can shift windows and require cadence observation.

## Production clock evidence before change

start-observations.json records Teamtailor evidence8 observation at
2026-09-08T11:20:21.807Z. No corresponding GHA shadow run exists after10:56;
the deployed independent Worker clock is configured at minute20. This supports
scheduled Worker execution; attribution is inferred from the two records rather
than a new dispatch-origin database field. Other sources remain cadence-held
from10:56. Prospector11:22 success is separate evidence.

Next: complete independent review/full CI; deploy; preview the current group;
admit only the three previously reviewed healthy Greenhouse candidates in a
bounded batch; read back D1 and dispatch. No source promotion, epoch reset, or
public job publication. Canonical and Workable remain withheld at measured bounds.

## Pre-release verification

Independent review found no blocker in the joined snapshot or bounded/fair SQL
window; countScope now explicitly labels window cardinality. Real Drizzle D1
adapter integration measured due12=37 SQL/24 external, invalid12=13 SQL/0 external,
cadence-held12=25 SQL/0 external, and next-hour rotation beyond invalid identities.
Current-epoch test ignores old admission evidence for cadence and uses one SELECT.
All SQL migration guards remain enabled in tests. Fairness tests advance only the
enumeration clock so observation inserts still use wall-clock-valid timestamps.

Full Bun suite:1,264 pass/0 fail across126 files; typecheck/guardrails pass.
An initial full run exposed three gateway fixtures tied to the old four-query
loader; updated those mocks to joined snapshots and reran the full suite green.
Focused integration tests count executed SQL, not manually asserted formulas.
CI will repeat using pinned Bun1.3.14 and perform build/Worker verification.


## Deployment-only closeout and pause

PR141 merged as c3f5951ae387ad0a6f9023d4bbe48dc618678841; PR CI34222288113 passed.
The owner paused work. Production34222392137 attempt1 was cancelled before any
migrations/deployment. The owner then explicitly authorized completing ONLY that
deployment and documenting progress. Attempt2 succeeded at12:31:44Z September8:
https://280f2e6b.remotejobs-ph.pages.dev. Validation, build, D1 migrations/checks,
full-text verification and Pages deployment completed. See both saved attempt
records; the earlier cancelled state is historical, not the final outcome.

Read-only smoke at12:32:52Z returned200 for Greenhouse renewal preview (revision3,
evidence4/6/7, published0), homepage and opportunities. No source admission,
provider renewal or source promotion was run during closeout. Five shadows remain
last verified; Nearform/Ghost/Wikimedia remain unadmitted. Task automation remains
PAUSED; existing production clocks continue. Follow PAUSE_HANDOFF.md, not the
historical pre-release next actions above. No further deployment is pending.
