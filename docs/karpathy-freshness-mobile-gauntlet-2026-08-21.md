# Karpathy-First Freshness and Mobile Gauntlet — 2026-08-21

## Outcome

The production ingestion clock now runs every 10 minutes, leaving five minutes
of processing headroom inside the 15-minute freshness objective. AI-deferred
candidates are persisted as hidden `pending-triage` rows and can be retried on
the next tick. The worker rejects degraded API responses instead of recording a
false-success schedule. The Agencies navigation now has one mobile/tablet mode
below 768 px and one desktop mode at and above 768 px.

Implementation commits:

- `123aed2` — `fix: make ingestion retries durable within freshness SLO`
- `a631c2f` — `fix: separate mobile and desktop agency navigation`
- `a44972e` — `fix: remove brittle directory favicon requests`

Deployment evidence:

- Freshness Worker run `32471235256`: success; deployed Worker version
  `8841635a-dfff-4090-b2ea-df72b3b98066` at `2026-08-21T10:08:45Z`.
- Sovereign CI run `32471235312`: success; validation, D1 migration/FTS check,
  and Cloudflare Pages deployment all completed.
- Sovereign CI run `32472691564`: success; deployed the console-clean directory
  follow-up after repeating tests, build, types, guardrails, and D1 checks.

## Baseline and root causes

Production D1 showed that the clock itself was firing. At `09:30:59Z`, however,
the diagnostic row reported `triageAiUnavailable=7, triageBudgetDeferred=34`.
Those 41 ATS candidates were not durable: ATS sources had already recorded a
successful fetch and were then held behind their 60-minute source cadence, while
the deferred candidates existed only in memory. The next clean heartbeat hid the
loss.

Four defects formed the failure chain:

1. A `*/15` clock had no processing margin for a 15-minute source-to-visible SLO.
2. AI-deferred ATS candidates were not inserted into the pending queue.
3. The Worker accepted positive deferred/failure counters and nested failed
   batches as a successful schedule.
4. Cascade diagnostics retained only the final Cloudflare error, obscuring the
   preceding Gemini and Groq failures.

The source-health tables were current, so a stale rollup was falsified as the
primary cause.

## Changes

- Changed the Cloudflare Worker cron from `*/15` to `*/10`; per-source cadence
  guards still prevent unnecessary upstream fetches.
- Added a single builder for durable `pending-triage` rows. Budget exhaustion,
  provider exhaustion, and thrown triage calls now persist retryable candidates.
- Automatically enables inline pending draining when Gemini or Groq is bound;
  explicit `DRAIN_PENDING_TRIAGE=1` remains the Cloudflare-only override, and
  explicitly enabled Inngest continues to own its queue.
- Counts missing D1 batch metadata as a failed write for active, rejected, and
  pending inserts.
- Makes the Worker fail closed on deferred work, insert failures, state-write
  failures, failed sources, and nested fetch-event batch failures.
- Preserves bounded, sanitized failure signatures from every attempted AI
  provider in the durable ingest diagnostic row.
- Uses `hidden md:flex` for the desktop header navigation while retaining
  `md:hidden` for bottom navigation, eliminating the duplicate 640–767 px mode.
- Replaces third-party Google favicon requests on directory cards with local
  monograms, eliminating four external 404 console errors and one runtime
  dependency from the Agencies surface.

## Verification

Local acceptance on the core implementation tree:

- `bun run test`: 446 passed, 0 failed, 1,167 assertions across 55 files.
- `bun run typecheck`: passed.
- `bun run audit:guardrails`: passed.
- `bun run build`: passed.
- `wrangler deploy --dry-run`: passed with the expected `SCRAPE_URL` binding.
- `git diff --check`: passed (only the repository's expected CRLF notices).

After the favicon follow-up, its two focused tests, typecheck, and production
build passed locally; final CI then ran the complete tree with 447 passing tests,
0 failures, and 1,169 assertions.

New regression coverage includes the exact 10-minute cron contract, every
degraded response field, nested failed batches, durable AI deferral, drain
routing, multi-provider failure history, malformed output, Gemini 429, Groq 429,
and the shared 768 px navigation breakpoint.

Responsive browser checks on the final bundle covered 320, 390, 700, and 1280
px widths. Before the fix, 700 px rendered both header and bottom navigation.
After the fix, 320/390/700 render only the bottom navigation, 1280 renders only
the header navigation, and no horizontal overflow was observed. A final deployed
700 px check reported one bottom navigation, zero header navigations, zero
overflow, zero remote favicon images, and zero console errors or warnings.

Production `/directory` returned HTTP 200 after deployment. CSP and HSTS remain
present. An unauthenticated scrape POST remains rejected with HTTP 403.

The first post-deploy 10-minute cycle completed at `2026-08-21T10:20:39.440Z`.
The `__ingest_diag__` row recorded the same attempt and success time with
`last_error=NULL`; the prior heartbeat was `10:00:59.955Z`, proving the new
schedule fired at the next `*/10` boundary after the `10:08:45Z` deployment.
The pending queue was empty. No source published a new accepted listing during
that cycle, so active inventory correctly remained 1,337 rather than fabricating
freshness evidence from synthetic data.

## Security and dependency review

No secret values were added to source or logs. `bun audit` reports 10 transitive
advisories (2 high, 4 moderate, 4 low). The two high Astro advisories are not
reachable here: one explicitly excludes `@astrojs/cloudflare`; the other needs a
user-controlled dynamic slot name, while this project uses static slots. A major
Astro 6 migration was therefore not mixed into this surgical reliability fix.

## Residual risk

- Free-provider quotas can still defer classification, but candidates now remain
  durable and visible to diagnostics instead of disappearing.
- Source publication cadence is external. The 10-minute scheduler guarantees at
  most ten minutes of clock wait, not that every source publishes new work each
  cycle.
- The existing Inngest `node:async_hooks` build warning remains non-blocking.
- GitHub currently warns that `actions/checkout@v4` targets deprecated Node 20;
  GitHub forces Node 24 today. This is workflow maintenance, not a failed deploy.

## Confidence

High for scheduler cadence, durable retry semantics, degraded-response
propagation, and responsive navigation because each has direct regression tests
plus deployed workflow evidence. The post-deploy D1 heartbeat and console-clean
responsive browser result complete the live acceptance evidence.
