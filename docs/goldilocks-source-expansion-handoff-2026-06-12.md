# Goldilocks Source Expansion Handoff - 2026-06-12

This is the current takeover note for the post-audit source, ingestion,
performance, and compliance work. Read this after `AGENTS.md` and before
continuing optional source expansion.

## Current Repo State

- Active production path remains Bun + Astro in `apps/web` + Cloudflare Pages +
  D1 + GitHub Actions Hunter/Verifier workflows.
- Latest accepted product commit before this handoff:
  - `6304ea4` - `fix: require token review for breezy ats`
- Latest accepted documentation/evidence commit before this handoff:
  - `7fdf94a` - `docs: record breezy ats token review`
- Latest generated source-health rollup:
  - `14db966` - `docs: update daily source health`
  - Hunter run `27373196600`
  - 0 failed sources, 0 failed insert batches, 0 insert errors
- Current source-health rollup reports 18 skipped sources, mostly paused
  Workable ATS rows and previously paused RSS/HTML sources.

## Goldilocks Compliance Position

The user clarified that compliance should be reasonable rather than so strict
that no useful public indexing remains. Use this posture:

- Treat the project as a public job index, not unrestricted scraping.
- Prefer official RSS feeds, APIs, public ATS JSON endpoints, and other
  source-supported access paths.
- Public visibility is a positive signal, but not blanket permission by itself.
- Do not bypass logins, paywalls, CAPTCHAs, robots restrictions, rate limits,
  or explicit hostile automation terms.
- Store minimal factual metadata needed for discovery.
- Keep descriptions short or summarized unless the source clearly allows more.
- Always route users back to the original source or ATS-hosted apply URL.
- Use `needs_review` for useful public sources where terms are mixed or not
  source-specific, and pause on objection or clarified hostile terms.
- Do not submit indexed jobs to Google Jobs, LinkedIn Jobs, Jooble, or similar
  external job platforms when source terms prohibit that.

## Completed 2026-06-12 Audit/Repair Work

- Restored local direct D1 audits by upgrading Wrangler to v4.
  - Commit `ad03990`
  - Report `docs/wrangler-d1-audit-2026-06-12.md`
- Paused unreviewed/noisy ATS platforms by default.
  - Commit `aa670ee`
  - Workable is paused after repeated HTTP 429s.
  - Lever and Greenhouse are paused until source-specific review is needed.
- Required token-specific review before fetching future Breezy ATS tokens.
  - Commit `6304ea4`
  - Current Breezy tokens remain enabled as `needs_review`.
  - Unknown future Breezy tokens default to paused.
- Verified Hunter health after ATS changes.
  - Retry Hunter run `27373090226`: 0 failed sources, 0 failed insert batches,
    0 insert errors.
  - Rollup Hunter run `27373196600`: passed and refreshed
    `docs/source-health-latest.md`.

## Current Unfinished Intent

The interrupted work began source expansion, but no new source adapter should be
considered accepted until implemented and verified. The safe next plan is below.

Important cleanup already done in this handoff:

- Do not leave `Remote OK`, `Jobicy`, or `Real Work From Anywhere` enabled in
  `packages/scraper/sources.ts` until cadence/caps/adapter work is actually
  implemented.
- Do not add `SourceType = "json"` without wiring a JSON fetcher and including
  JSON source results in `/api/cron/scrape`.

## Source Evidence Collected

### Current Breezy ATS Tokens

Reviewed tokens:

- `breezy:20four7va`
- `breezy:sourcefit`
- `breezy:vaaphilippines-recruitment`

Evidence:

- Public career pages and `/json` endpoints were reachable.
- Direct probes returned HTTP 200 after one transient Hunter timeout.
- Breezy subdomain robots files allowed the `/json` path for general
  user-agents and only disallowed static asset paths.
- Career endpoints were CORS-readable.
- Company-level terms for 20Four7VA, Sourcefit, and VAA Philippines include
  some restrictive website-content language, but those terms are not clearly
  source-specific to the Breezy ATS JSON endpoint.

Decision:

- Keep current tokens `needs_review`, not `allowed`.
- Collect minimal factual metadata only.
- Link back to ATS-hosted URLs.
- Pause on objection, source-specific hostile terms, or repeated failures.

### Jobicy Candidate Source

Useful path:

- RSS: `https://jobicy.com/feed/job_feed?job_categories=admin-support&job_types=full-time&search_region=apac`

Evidence:

- Jobicy documents public API/RSS/XML feeds for integrating remote job listings.
- The feed page says API/RSS access is intended for wider distribution.
- The feed legal notice says a few checks daily are sufficient and excessive
  querying may be restricted.
- The feed advertises hourly update cadence.
- Live RSS probe returned HTTP 200 and a valid RSS document.
- `robots.txt` disallows `/api/`, so prefer the documented `/feed/job_feed`
  RSS path over the JSON API unless robots/terms change.

Implementation requirement:

- Add source-level cadence before enabling because Hunter currently runs every
  30 minutes and Jobicy asks for no more than hourly checks.

### Real Work From Anywhere Candidate Source

Useful path:

- RSS: `https://www.realworkfromanywhere.com/rss.xml`

Evidence:

- Official RSS page says feeds are free, accountless, and category feeds are
  available.
- `robots.txt` allows all.
- Live RSS probe returned HTTP 200 with `Cache-Control: public, max-age=3600`
  and feed `ttl` of 60.

Implementation requirement:

- Add source-level cadence before enabling because feed metadata points to an
  hourly cadence.

### Remote OK Candidate Source

Useful path:

- JSON API: `https://remoteok.com/api`

Evidence:

- Remote OK homepage links to API/RSS/JSON feed surfaces.
- Live JSON probe returned HTTP 200.
- JSON response includes API terms requiring a source mention and a follow
  linkback to the Remote OK job URL.
- `robots.txt` allows `/api` for general user-agents and includes crawl-delay 1.

Implementation requirement:

- Add a JSON adapter before enabling.
- Do not store full descriptions from the JSON response; use minimal snippet
  text and route users back to `url` or `apply_url`.
- Add `maxItems` because the API payload can be large.
- Use hourly or slower cadence.

### Existing Allowed Sources

- We Work Remotely remains allowed because its public RSS page says anyone can
  use the feed with attribution and linkback.
- Remotive remains allowed because its public RSS page says anyone can use the
  feed with source mention and linkback, while avoiding submission to third
  party job platforms.

## Recommended Next Implementation Plan

Make this a small verified slice, not a giant source spree.

1. Baseline:
   - Run `git status --short`.
   - Run `bun run --cwd apps/web build`.
   - Confirm current Hunter source-health rollup is still green.

2. Add bounded source metadata:
   - Add optional `maxItems?: number` to `Source`.
   - Add optional `minFetchIntervalMinutes?: number` only if the route can
     actually enforce it.
   - RSS/HTML fetchers should slice parsed items before mapping.

3. Add durable cadence enforcement:
   - Preferred: add a tiny D1 source fetch state table keyed by source id.
   - Track `last_attempt_at`, `last_success_at`, `last_count`, and `last_error`.
   - If a source is inside its cadence window, return a healthy skipped
     `sourceResults` record with a clear skip reason.
   - Do not rely only on GitHub schedule comments; cadence must survive manual
     Hunter runs too.

4. Add RSS sources first:
   - Enable Real Work From Anywhere RSS with `maxItems: 50` and hourly cadence.
   - Enable Jobicy APAC admin-support RSS with `maxItems: 40` and hourly cadence.
   - Keep both `allowed` only if the code enforces cadence and linkback.

5. Add Remote OK second:
   - Add `fetchJSONSource` in `packages/scraper/json.ts`.
   - Export it from `packages/scraper/index.ts`.
   - Add `jsonSources` and include JSON results in `/api/cron/scrape`.
   - Map Remote OK fields:
     - title: `position`
     - company: `company`
     - source URL: `url`
     - application URL: `apply_url || url`
     - posted date: `date`
     - tags: source tags + response tags, capped
     - description: stripped and sliced to a short snippet
   - Ignore the first legal metadata object in the API array.

6. Verify locally:
   - Run direct fetch probes with Bun for every newly enabled source.
   - Run `bun run --cwd apps/web build`.
   - Run `git diff --check`.

7. Verify production:
   - Commit and push the source slice.
   - Wait for CI/deploy.
   - Trigger manual Hunter without rollup.
   - Confirm `failedSources: []`, `insertFailedBatches: 0`, and
     `insertErrors: []`.
   - Trigger rollup Hunter only after the manual Hunter is healthy.
   - Pull the generated rollup commit and update status docs.

## Performance And Indexing Plan

Current known good indexes:

- Homepage latest jobs use `active_posted_idx`.
- Category pages use `category_active_posted_idx`.
- Verifier uses `active_last_verified_idx`.

Next measured indexing checks:

- Run `EXPLAIN QUERY PLAN` for `/opportunities` with `type`, `platform`, and
  keyword search filters.
- Add `(source_platform, is_active, posted_at)` only if platform-filter query
  plans show temp sorting or full scans.
- Add `(type, is_active, posted_at)` only if type-filter query plans show the
  same issue.
- Do not add full-text search until measured need exists. Keyword search uses
  `%term%` `LIKE`, so normal indexes will not help much. If active rows grow
  into the thousands and search becomes slow, verify D1 FTS5 support first or
  add a small normalized token table.

## Commands For Next Agent

Local build:

```bash
bun run --cwd apps/web build
```

Read-only D1 query shape:

```bash
bunx wrangler d1 execute remoteph-jobs-db --remote --command "SELECT COUNT(*) FROM opportunities WHERE is_active = 1;"
```

Hunter run:

```bash
gh workflow run "🏹 Sovereign Hunter Pulse" -f write_rollup=false
gh run watch <run-id> --exit-status
```

Rollup Hunter run after the manual run is healthy:

```bash
gh workflow run "🏹 Sovereign Hunter Pulse" -f write_rollup=true
gh run watch <run-id> --exit-status
git pull --ff-only
```

## Stop Rule

If a source is useful but unclear, keep it `needs_review` with monitored minimal
collection. If a source is clearly hostile, rate-limited, login-gated, or noisy,
pause it and record why.
