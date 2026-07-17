# Error Catalog

A compact map of the failure modes this system can hit, how they surface, and
how to recover. Complements `AGENTS.md` (architecture) and the recovery-doc
trail. Written for a future AI or maintainer to diagnose fast.

Everything here is **fail-safe by design**: failures surface as counters in the
scrape response + GitHub Action annotations/issues, never silent.

## Source fetch failures

**A source returns non-2xx / times out**
- Surfaces: `sourceResults[].ok = false` with the error; Hunter emits a
  `Partial scrape failure` warning; the source's `source_fetch_events` row
  records the error.
- Recover: transient → the next 15-min run retries automatically. Persistent
  (4 consecutive fails) → the Sentinel files an `Auto-pause recommended` (or,
  with the PAT, auto-pauses) issue with an AI diagnosis. Pause the source in
  `packages/scraper/sources.ts` or `ATS_TOKEN_POLICIES` if terms/availability
  changed.

**A source returns HTTP 429 (rate limited)**
- Surfaces: same as above; historically Workable tokens.
- Recover: the platform default is already `enabled: false` (fail-closed).
  Respect the source's cadence; do not lower `minFetchIntervalMinutes`.

**A hostile/malformed feed item**
- Surfaces: `[rss] skipped one malformed item` warning; the item is dropped,
  the rest of the feed still processes (per-item isolation, 2026-07 audit).
- Recover: none needed; if a whole class of items is malformed, inspect the
  fetcher's normalization.

## Freshness / scheduling

**Jobs appear slowly (> 1h)**
- Cause: GitHub Actions free cron drift (1.5–3h) OR the Cron Worker secret is
  unset.
- Recover: confirm the `freshness-cron` Worker is deployed and
  `PROXY_SECRET` is set (`wrangler secret put PROXY_SECRET`); `wrangler tail`
  it. See `workers/freshness-cron/README.md`.

**`sourcesUnchanged` is 0 every run**
- Cause: conditional-fetch validators not persisting (migration 0020 not
  applied, or the feed sends no ETag and the body genuinely changes each poll).
- Recover: verify `source_fetch_state` has `etag`/`last_body_hash` columns
  (migration 0020) and non-null values after a run.

**Overlapping runs / double triage cost**
- Surfaces: `skipped: true, reason: "run-lock-held"` in a scrape response.
- Expected: the run-lock deduped concurrent Worker + Hunter triggers. Not an
  error.

## Data / D1

**"too many SQL variables"**
- Cause: an unchunked multi-row insert exceeding D1's 100 bound-parameter cap.
- Recover: all batch inserts must go through `chunkArray` +
  `maxRowsPerD1Batch` (2026-07 audit rule). If a new insert path 500s, chunk it.

**`source_fetch_events` growing unbounded**
- Cause: no retention yet (~thousands/week).
- Recover: a retention prune (delete telemetry > 90 days) is a documented
  follow-up; telemetry deletion is the one acceptable exception to the
  no-hard-delete rule.

## Triage / AI

**Board fills with unfiltered / miscategorized jobs**
- Cause: Workers AI outage. Triage fails **closed** (`aiUnavailable`), so jobs
  are deferred, not force-published.
- Surfaces: `triageAiUnavailable` counter + Hunter warning.
- Recover: transient; jobs re-triage next run. If sustained, check the
  `env.AI` binding and the model chain in `packages/scraper/triage.ts`.

## Prospector / discovery

**A garbage or spam company nearly got added**
- Expected: the two gates (name-quality + source-trust) reject it; RemoteOK-
  sourced candidates go to review, never auto-add.
- Surfaces: `rejectedForQuality` / `reviewOnly` in the prospect response +
  `docs/prospector-latest.md`.

**Prospector mass-add guard tripped**
- Surfaces: a `source-health` issue; `massAddGuardTripped: true`.
- Meaning: > 120 eligible in one run (anomaly). Review the run before raising
  the ceiling. Normal backlogs drain 15/run without tripping it.

## CI / deploy

**New code deployed before its migration applied**
- Cause: `ci-guardrail` (Pages deploy) and `deploy-migrations` run in parallel
  on the same push.
- Recover: usually self-heals — `loadSourceFetchStates` catches a missing-column
  read and degrades to a lock-free, non-conditional run for one cycle, then the
  migration lands. For risky column reads, split the migration to an earlier
  push.
