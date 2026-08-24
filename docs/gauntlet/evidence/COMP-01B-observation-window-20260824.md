# COMP-01B Observation Window — Complete Evidence Review (2026-08-24)

Unit: **COMP-01B — Gate robots enforcement on reviewed observation evidence**
Contract: `docs/gauntlet/IMPLEMENTATION_UNITS.md` (COMP-01B)
Window basis: COMP-01A production deploy `32573525387` completed 2026-08-22T12:38Z.
Review executed: 2026-08-24T14:27–14:45Z. Executor: autonomous Gauntlet run 8
(Sol Ultra planner + executor role).

## VERDICT

**BLOCKED / NO FLIP** — the contract's pre-defined safe outcome for failed evidence.
No enforcement config change was made; no canary or rollback drill was applicable
(nothing flipped). No source pause is recommended: the failure is an internal gate
defect, not source policy. Re-review is gated on a new fix unit (**REL-12**) plus a
fresh complete observe window.

## Why the window failed

Every robots decision recorded during the complete window is `unknown`. Flipping
`ROBOTS_MODE` to `"enforce"` today would block **100% of ingestion** (fail-closed on
`unknown`). The cause of the universal `unknown` is a deterministic runtime defect in
the gate itself (`packages/scraper/robotsGate.ts`), not source robots policy:

- `robotsGate.ts:255` — default `fetchImpl: deps.fetchImpl ?? fetch` captures the bare
  global `fetch`.
- `robotsGate.ts:186` — invokes it detached (`deps.fetchImpl(url, …)`).
- Cloudflare workerd requires native `fetch` to be invoked with its proper receiver;
  a detached call throws
  `Illegal invocation: function called with incorrect 'this' reference`
  (workers error class: illegal-invocation).
- Node/bun (local tests) permit detached `fetch`, so all local suites stayed green —
  a watermelon divergence between test runtime and production runtime.
- The thrown error is caught inside `fetchRobots`, cached per origin as an errored
  entry, and surfaces via `decideFromEntry` as
  `robots.txt fetch failed: Illegal invocation…` → verdict `unknown`,
  `wouldBlock = true`.

## Window facts (read-only D1 evidence)

All queries via
`bunx wrangler d1 execute DB --remote --env production --json --command "…"`
from `apps/web`; every query returned `changed_db=false`.

| Metric | Value |
| --- | --- |
| Window span | 2026-08-22T12:40:39Z → 2026-08-24T14:30:13Z (~49.8h ≥ 48h minimum) |
| Source identities with events | 41 |
| Identities with real fetch attempts (`skipped=0`) | 20 |
| Paused/skip-only identities (0 fetches → unknown class by definition) | 21 |
| Real fetch attempts in window | 681 |
| Verdict `allowed` | **0** |
| Verdict `unknown` (`would_block=1`) | 657 (all from one evidence string, below) |
| Robots fields NULL on real fetches | 24 (~3.5%, see coverage gap) |
| `robots_cache` rows | 11 origins attempted, **0 successful, 0 bodies stored** |

Sole unknown-verdict evidence string (n=657):

```
robots.txt fetch failed: Illegal invocation: function called with incorrect `this`
reference. See https://developers.cloudflare.com/workers/observability/errors/#illegal-invocation-errors for details.
```

Per-source rollup (top of table; full query reproducible from contract SQL):
remotive 137/140 would-block, we-work-remotely 137/140, all ATS boards ~21–22/23,
both jobicy feeds 20–21/22 — i.e., uniformly defective, no per-source signal.

## Endpoint classification (contract step 2)

| Class | Endpoints |
| --- | --- |
| `pass` | none |
| `block/pause` | none (no disallowed verdict exists yet — never successfully evaluated) |
| `unknown` | **every active endpoint** (20 fetching identities); plus 21 paused identities with zero fetch attempts |

Coverage gap (minor, separate from the blocking defect): 24 real-fetch events across
19 identities carry NULL robots fields despite `skipped=0`. VERIFIED benign:
all 24 timestamps fall within 2026-08-22T12:40:39Z–13:00:40Z — the first two clock
cycles after the COMP-01A deploy (12:38Z) before new code fully propagated. A
deployment-transition artifact, not an ongoing provenance hole (code inspection:
both static and ATS paths attach last-known gate decisions even on failed fetches;
`fetchSourceWithStatus` failures receive provenance from callers post-return).
No hardening action required.

## Compliance posture during the window (honest record)

In observe mode the gate proceeds on `unknown`; therefore ingestion ran for ~50h
without a single successful robots.txt consultation. This is not bypass: consultation
was attempted on every fetch, failure was technical, mode is fail-open by explicit
design pending exactly this review. It does raise fix urgency: until REL-12 ships,
neither enforcement nor meaningful consent evidence can exist.

## Test-gap finding (process defect)

Every existing `checkRobots` test injects `fetchImpl` (`robotsGate.test.ts`),
so the production default path had zero coverage. REL-12 must add a default-path
regression test that fails under the detached-receiver pattern (e.g., asserting the
default resolves through an explicit bound/wrapper invocation rather than the bare
identifier), plus keep all injected-path tests unchanged.

## Re-review conditions (what reopens COMP-01B)

1. REL-12 implemented, tested, deployed (CI/deploy green incl. Pages).
2. Fresh observe window ≥48h post-deploy with durable verdicts that are actually
   decidable (>0 combined `allowed`/`disallowed`, `unknown` near zero, explained
   residual).
3. Re-run this classification over every active endpoint; then proceed with the
   original contract steps: reviewer sign-off → reversible typed config → canary →
   full cadence monitoring → expand only after acceptance.

## Queries used (reproducibility)

```sql
-- window summary
SELECT COUNT(*), COUNT(DISTINCT source_id), MIN(timestamp), MAX(timestamp)
FROM source_fetch_events WHERE timestamp >= '2026-08-22T12:38:00Z';

-- per-source rollup
SELECT source_id, MAX(source_name), MAX(source_type), MAX(collection_method),
       COUNT(*), SUM(skipped=0), SUM(robots_would_block=1),
       SUM(robots_verdict IS NULL),
       GROUP_CONCAT(DISTINCT COALESCE(robots_verdict,'(null)')),
       MIN(timestamp), MAX(timestamp)
FROM source_fetch_events WHERE timestamp >= '2026-08-22T12:38:00Z'
GROUP BY source_id ORDER BY would_block DESC, fetch_attempts DESC;

-- verdict distribution on real fetches
SELECT COALESCE(robots_verdict,'(null)'), CAST(robots_would_block AS TEXT), COUNT(*)
FROM source_fetch_events WHERE timestamp >= '2026-08-22T12:38:00Z' AND skipped=0
GROUP BY 1,2 ORDER BY 3 DESC;

-- unknown evidence strings
SELECT robots_evidence, COUNT(*) FROM source_fetch_events
WHERE timestamp >= '2026-08-22T12:38:00Z' AND skipped=0 AND robots_verdict='unknown'
GROUP BY robots_evidence ORDER BY 2 DESC LIMIT 15;

-- cache health
SELECT COUNT(*), SUM(error IS NULL), SUM(body IS NOT NULL), MIN(fetched_at), MAX(fetched_at)
FROM robots_cache;
```

## Coordination compliance

Zero live HTTP requests were made to any source during this review (D1-only);
the SRC-4D Jobicy freeze (until its post-rollup, due ≥2026-08-24T19:00Z) remains
intact. Any future Doctor sweep for endpoint probes stays deferred until after that
rollup is recorded.
