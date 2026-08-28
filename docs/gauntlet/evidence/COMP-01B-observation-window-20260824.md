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

---

## REL-12 interim production probe — 2026-08-24T21:06Z (FAVORABLE, NOT acceptance)

Executor: autonomous Gauntlet run 9 (fresh-session cold resume per the
continuity protocol). All queries read-only (`changed_db=false`,
`rows_written=0`); zero live source requests. Final acceptance remains
time-gated to ≥2026-08-25T11:30Z UTC while pre-fix cache entries age out.

| Metric | Value |
| --- | --- |
| `robots_cache` rows | 11 |
| Rows with non-null body / null error | **2** (first ever successful fetches) |
| Successful origins | `https://jobicy.com`, `https://www.realworkfromanywhere.com` — both fetched 2026-08-24T16:30:14Z under the fixed gate, status 200, bodies 1,850 / 125 bytes |
| Post-deploy real fetches (since 14:49:30Z) | 153 total: verdict `unknown` 142, **verdict `allowed` 11** |
| `allowed` sources | jobicy-supporting-apac ×4, real-work-from-anywhere ×4, jobicy-admin-support-apac ×3 (last ticked 20:50:09Z) |
| Residual unknown explanation | 9 origins still hold pre-fix Illegal-invocation entries inside their 24h TTL (`fetched_at` 05:50–11:20Z Aug 24 → expire ≤11:20Z Aug 25) |

Interpretation: the exact origin-by-origin taper predicted in the contract is
observed — only origins whose pre-fix entry had already expired at fetch time
received fresh fixed-path consultations, and every such consultation produced a
decidable `allowed` verdict. No new failure class appeared. This confirms the
deploy works in production; it does not yet satisfy the COMP-01B re-review
condition of a fresh complete ≥48h window dominated by decidable verdicts.

Jobicy HTTP 403 watch item (SRC-4F candidate): **unchanged** — all six 403s and
all five 429s remain clustered within 2026-08-23T00:00–06:30Z; both feeds have
been failure-free since (14 and 15 consecutive successes, last ticks 20:00Z /
20:50Z Aug 24). No escalation warranted today.

Queries: same shapes as the reproducibility block above, with
`timestamp >= '2026-08-24T14:49:30Z'` for the post-deploy event window, plus a
per-origin `robots_cache` detail SELECT (`origin, fetched_at, status,
LENGTH(body), error`).

---

## REL-12 final acceptance + COMP-01B re-review — 2026-08-28T01:50Z

Executor: autonomous Gauntlet run 10. The session started from a clean
synchronized `main` at `a8a8e10` after a safe fast-forward over 23 generated
report commits. All production queries were read-only (`changed_db=false`,
`changes=0`, `rows_written=0`); no live source requests or D1 mutations were
made.

### REL-12 verdict: TERMINAL — KEEP

The mature post-TTL window starts at `2026-08-25T11:30:00Z`; its first event is
`2026-08-25T17:10:09.537Z` and its latest event is
`2026-08-28T01:50:09.140Z` (about 56 hours 40 minutes of observed events,
exceeding the required 48 hours). It contains 8,299 events across all 41 source
identities and 1,023 real fetches across 20 fetching identities.

| Mature-window result | Value |
| --- | ---: |
| Decidable `allowed` real fetches | **848 (82.9%)** |
| `disallowed` real fetches | 0 |
| Residual `unknown` real fetches | **175 (17.1%)** |
| Real fetches with null robots verdict | 0 |
| Identities with only `allowed` verdicts | 15 |
| Identities with residual `unknown` verdicts | 5 (all Ashby) |

The REL-12 failure signature is absent from the mature window. Its final event
was `2026-08-25T10:00:12.970Z`, before the acceptance cutoff. Every current
`robots_cache` row has an explicit HTTP status and `error IS NULL`; ten of the
eleven origins are HTTP 200 with stored bodies. The eleventh is the shared
Ashby origin `https://api.ashbyhq.com`, which returns HTTP 401 with no body.
Therefore the deployed binding fix eliminated the universal workerd failure
and restored real robots decisions without changing injected-fetch behavior,
cache semantics, source cadence, or observe mode.

### COMP-01B re-review verdict: BLOCKED / NO FLIP

The complete mature endpoint classification is:

| Class | Fetching identities | Evidence |
| --- | ---: | --- |
| `pass` | **15** | 848 allowed, 0 unknown/null across Breezy, Greenhouse, Jobicy, Real Work From Anywhere, Remote OK, Remotive, and We Work Remotely |
| `block/pause` | 0 | No `disallowed` verdict observed |
| `unknown` | **5** | Amplify, Ashby, Camunda, Supabase, and Tremendous: 35/35 real fetches each report `robots.txt unreachable (HTTP 401); operator intent unknown` |
| skip-only | 21 | Existing paused identities; no real fetch to classify |

COMP-01B cannot proceed to a typed enforcement config or canary because its
explicit stop condition fires when any active endpoint lacks evidence or has
ambiguous robots intent. A global flip would fail closed on every Ashby fetch;
selective enforcement is also premature until the Ashby access/robots posture
receives a bounded source-specific review and approval. Observe mode remains
unchanged, no source was enabled or paused by this evidence-only run, and
source expansion remains frozen.

Pause recommendation (not executed; source-policy mutation remains separately
approval-gated): pause the five Ashby identities pending a bounded,
human-reviewed robots/access-path resolution. That follow-up must determine
from authoritative, source-supported evidence whether the correct robots
origin/path or permitted public ATS access interpretation differs. If it cannot
resolve the ambiguity, keep the identities paused. Do not bypass the HTTP 401
or treat it as allow.

Fresh independent critic: **REL-12 SHIP / KEEP; COMP-01B BLOCKED / NO FLIP**.
The critic independently reproduced the read-only D1 results and confirmed
that five active ambiguous endpoints directly fire the contract stop
condition. It also flagged that all enabled ATS identities still carry
`needs_review`; their compliance statuses must be reconciled during any future
reviewer sign-off rather than inferred from a technically allowed robots
verdict. No builder self-certification is used for these terminal decisions.

### Reproducibility cutoff

The mature-window queries reuse the SQL shapes above with
`timestamp >= '2026-08-25T11:30:00Z'`, plus the full per-origin cache detail
query. Query metadata reported `changed_db=false` and `rows_written=0` for
every result.

GitHub backup: evidence/state commit `f8fa76b` is present on `origin/main`.
Exact-sha Sovereign CI Guardrail run `33137293829` completed successfully:
production guardrails, unit tests, app build, strict typecheck, and Freshness
Worker validation passed; production migration/deploy was correctly skipped
for the documentation-only change.
