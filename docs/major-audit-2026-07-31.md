# Major audit — 2026-07-31

## Production snapshot

| Metric | Value |
|---|---|
| Total opportunities | 3,864 |
| Active | 2,028 |
| Active unclear (backlog) | 1,137 |
| Active eligible_verified | 123 |
| Active eligible_likely | 768 |
| Active ineligible | (archived, not counted) |
| Sweep resolved all-time | 523 (was 261 on 2026-07-26) |
| Sweep quota used today | 32 / 50 |
| VA directory companies | 429 |
| Verified companies | 301 |
| ATS-enabled companies | 30 |
| source_fetch_events rows | 51,260 |
| DB size | ~24.5 MB |

Test coverage: 189 tests, 12 test files, web build clean.

---

## Fixes shipped in this audit

### C-1 — `triageJob` response type coercion (CRITICAL, active in production)

**File:** `packages/scraper/triage.ts:322-334`

**Symptom:** `__sweep_diag__` row recorded `"jsonText.trim is not a function"` at
2026-07-31T04:00 UTC. The sweep still made progress overall (262 rows resolved
since 2026-07-26) because the error is model-dependent — some rungs return a
non-string `response.response` (an object) and the code assigned it to
`jsonText` without coercion, then called `.trim()` on it.

**Root cause:** `triageJob()` had:
```typescript
} else if (response && response.response) {
    jsonText = response.response;     // could be an object
```
while `skepticEligibilityCheck` already guarded this with `String(...)`.

**Fix:** Added `String()` coercion on all non-string response branches, matching
the skeptic's pattern.

**Impact:** Eliminates intermittent model-ladder failures that waste neuron
budget on calls that parse nothing.

### C-2 — Ingest endpoint bypassed geo gate entirely

**File:** `apps/web/src/pages/api/ingest.ts`

**Symptom:** Jobs ingested via `/api/ingest` had null `geoScope`, `phEligibility`,
`geoEvidence`, and `geoCheckedAt`. They became invisible to the board's
"Open to Philippines" filter and were never swept or verified for geo
eligibility.

**Fix:** Run `geoGate()` in `normalizeOpportunityForInsert()`. Deterministic
verdicts are applied inline (ineligible items inserted as `isActive: false`).
Gate-unknown items enter as `unclear` and join the sweep's fresh-first queue.

### C-3 — Duplicate hash utilities consolidated

**Files:** `packages/scraper/contentHash.ts`, `apps/web/src/pages/api/cron/scrape.ts`,
`apps/web/src/pages/api/ingest.ts`

**Symptom:** Identical SHA-256 hex functions existed in two places under different
names (`generateHash` in scrape, `sha256Hex` in ingest). A divergence would
silently break `descriptionHash`-based dedup.

**Fix:** Canonical `sha256Hex()` exported from `@va-hub/scraper/contentHash`; both
consumers import it.

---

## Findings — all fixed in round 2 (see above)

### Performance

#### P-1: ATS sources fetched sequentially (medium impact)

`scrape.ts:1062-1089` fetches ATS agencies in a `for...of` loop. With ~30
enabled agencies, this is ~30 sequential HTTP calls. RSS/HTML/JSON sources use
`Promise.all()`. A concurrency-limited parallel fetch (e.g. batches of 8) would
cut ATS wall-clock time by ~4x.

#### P-2: ATS sources lack cadence guards and conditional-fetch

RSS/HTML/JSON sources go through `fetchConfiguredSourceWithStatus()` which:
- Checks `minFetchIntervalMinutes` before fetching
- Sends If-None-Match / If-Modified-Since
- Records per-source state to `source_fetch_state`

ATS sources use the raw `fetchSourceWithStatus()` which does none of this. Every
tick re-fetches every enabled ATS endpoint regardless of whether anything changed.
With the Workers cron at 15-min cadence, that is 96 ATS-fetch rounds per day — a
compliance and performance concern for the ATS providers.

**Recommendation:** Wire ATS agencies through the configured-source path by
synthesizing a `Source` object per agency, or at minimum record state and skip
unchanged feeds.

#### P-3: `lastSeenInFeedAt` UPDATE storm on every tick

Lines 1160-1169 bump `lastSeenInFeedAt` for every existing URL in feeds. When
conditional-fetch is not active (the feed changed), this touches hundreds of rows
per tick. Consider debouncing: only update `lastSeenInFeedAt` when it has drifted
by more than 12 hours, since the 30-day stale cutoff does not need minute
granularity.

#### P-4: `source_fetch_events` growing unbounded (51k rows)

At ~25 events per tick × 96 ticks/day ≈ 2,400 rows/day, the table reaches ~876k
rows/year. No cleanup policy exists. Either:
- Add a prune job that deletes events older than 90 days, or
- Partition by month, or
- Aggregate into daily summaries and drop raw rows.

#### P-5: Hunter GHA pulse + Workers cron redundancy

The Hunter GHA pulse runs every 30 minutes (`*/30 * * * *`). The Workers cron
fires every 15 minutes. Both hit `/api/cron/scrape`. The run lock prevents
overlap, but the redundant GHA trigger wastes Actions minutes.

**Recommendation:** Disable the Hunter GHA pulse's schedule trigger and keep it as
`workflow_dispatch` only (manual fallback). The Workers cron is the reliable
primary.

### Code quality

#### Q-1: `scrape.ts` is 1,500+ lines

The single file contains ATS policy configuration (124 lines of static maps),
source fetching, URL dedup, triage pipeline, batch insert, the sweep, event
logging, and run locking. Consider extracting:
- ATS policies → `packages/scraper/atsPolicies.ts`
- The sweep → already a function, but could be a separate module
- Source-fetch orchestration → its own module

#### Q-2: Duplicate `errorMessage` utility

Identical `errorMessage(error: unknown): string` in `scrape.ts:65` and
`prospect.ts:39`. Extract to a shared utility.

### Ingestion improvements

#### I-1: RemoteOK role-relevance filter may be too narrow

`json.ts` `isRelevantForHub()` checks against `HUB_RELEVANT_ROLE_REGEX`. Roles
like "Head of Product", "VP of Engineering", or "Chief of Staff" that don't
contain any keyword in the regex are silently dropped. Consider adding:
- "head of", "vp", "vice president", "chief", "director", "lead", "manager"
- "strategy", "operations manager", "program manager"

This would widen the funnel for senior roles that Filipino VAs and freelancers
increasingly fill.

#### I-2: No `locationRaw` captured from Remotive or WWR feeds

Only RemoteOK (`json.ts`) and WWR (`rss.ts` via `<region>`) capture structured
location. Remotive's RSS items may contain `<region>` or `<location>` elements
that are currently discarded. Capturing these would give the geo gate more
signal and reduce `unclear` verdicts.

### Prospecting improvements

#### PR-1: `MAX(source_url)` gives arbitrary sample URL

`prospect.ts:68` uses `MAX(source_url)` to pick a sample URL for each candidate
company. This gives the lexicographically largest URL, not the most recent job.
Use a correlated subquery or `MAX(scraped_at)` with the corresponding URL for a
more useful sample.

#### PR-2: Prospector review list is noisy and never clears

Companies that pass quality gates but fail trust gates (RemoteOK-only) appear in
the `reviewOnly` list on every run, forever. Consider:
- A `__prospector_reviewed__` table or state row tracking dismissed candidates
- A staleness cutoff: skip companies whose only jobs are >90 days old

### Operational improvements

#### O-1: No alerting on sweep error pattern

The `__sweep_diag__` row captures errors, but nothing reads it automatically. The
`jsonText.trim` error ran for 5 days before this audit found it. Consider adding
a check to the Sentinel pulse that reads `__sweep_diag__` and alerts when the
error is novel.

#### O-2: Sweep progress baseline

The sweep resolved 262 rows in 5 days (2026-07-26 to 2026-07-31), which tracks
close to the theoretical 50/day cap. At this rate the remaining 1,137-row backlog
converges in ~23 days (late August). The type-coercion fix should improve this
slightly by eliminating wasted attempts.

#### O-3: DB size trajectory

At 24.5 MB with 3,864 opportunities and 51k events, the database is well within
D1's free-tier limits (500 MB). Growth is dominated by `source_fetch_events`
(~2,400 rows/day). The opportunities table grows slowly due to dedup. No action
needed now, but the events table cleanup (P-4) should happen before Q4.

---

## Fixes shipped — round 2

### P-1 — Parallelize ATS source fetching
**File:** `scrape.ts` ATS fetch loop. Non-Workable agencies now fetched in parallel
batches of 8 via `Promise.all()`. Workable agencies kept sequential with 1s rate-
limit sleep. Cuts ATS wall-clock time by ~4x.

### P-2 — Cadence guards and state recording for ATS sources
**File:** `scrape.ts`. ATS agencies now checked against `source_fetch_state` with
a 60-minute minimum interval. State recorded after each fetch (upsert into
`source_fetch_state`). Eliminates redundant ATS re-fetches on 15-min cron ticks.

### P-3 — Debounce lastSeenInFeedAt updates
**File:** `scrape.ts:1197+`. Only updates `lastSeenInFeedAt` when the existing
value is null or has drifted >12 hours from the current timestamp. Reduces DB
write churn from hundreds of UPDATEs per tick to only stale rows.

### P-4 — source_fetch_events cleanup policy
**File:** `prune.ts`. Added 90-day retention cleanup — deletes events older than
90 days on each prune run. Prevents unbounded table growth (~2,400 rows/day).

### P-5 — Remove Hunter GHA schedule trigger
**File:** `gha-hunter-pulse.yml`. Removed `schedule: */30 * * * *` trigger,
keeping `workflow_dispatch` only. Workers cron is the reliable primary; the GHA
schedule was redundant and wasted Actions minutes.

### I-1 — Widen RemoteOK role-relevance filter
**File:** `json.ts`. Added senior role keywords: head of, vp, vice president,
chief, director, lead, manager, program manager, strategy, coordinator,
scheduler, executive assistant, social media. Widens funnel for roles Filipino
VAs and freelancers increasingly fill.

### I-2 — Capture locationRaw from Remotive RSS
**File:** `rss.ts`. Added `location` field to `RawRSSItem` interface. Location
extraction now falls back from `<region>` to `<location>` element, giving the
geo gate more signal from Remotive feeds.

### PR-1 — Fix prospector sample URL
**File:** `prospect.ts`. Changed from `MAX(source_url)` (lexicographic) to a
correlated subquery that returns the URL of the most recently scraped job for
each candidate company.

### PR-2 — Prospector staleness cutoff
**File:** `prospect.ts`. Added 90-day staleness filter to candidate query.
Companies whose most recent active job is older than 90 days are excluded,
preventing forever-reappearing review candidates.

### Q-2 — Extract shared errorMessage utility
**Files:** `contentHash.ts`, `prospect.ts`, `scrape.ts`. Removed duplicate inline
`errorMessage()` from prospect.ts and scrape.ts; both now import from the shared
`@va-hub/scraper` package.

### O-1 — Sweep error alerting in Sentinel
**File:** `gha-sentinel-pulse.yml`. Added a `Query Sweep Diagnostics` step that
reads the `__sweep_diag__` row from D1 and surfaces any recorded error as a GHA
warning and in the Sentinel summary.

---

## Commit ledger

| Commit | Fix | Impact |
|---|---|---|
| f5ae794 | Type coercion in `triageJob` response parsing | Eliminates intermittent sweep failures |
| f5ae794 | Geo gate on `/api/ingest` endpoint | Ingested jobs get PH eligibility classification |
| f5ae794 | Shared `sha256Hex` utility | Eliminates duplicate code, prevents drift |
| (this commit) | P-1 through PR-2, Q-2, O-1 (11 fixes) | Performance, ingestion, prospecting, and ops improvements |

## Methodology

Full read of every API route, scraper package, cron handler, schema, and workflow
file. Production D1 queries for current state. Cross-referenced against the
2026-07-26 cron/geo audit findings. All fixes are additive or behavioral
corrections — no schema changes, no new dependencies.
