# Gemini Masterplan Handoff - 2026-06-13

## Purpose

This is the current takeover plan for Gemini or any other AI agent. The project
is already healthy at the latest verified checkpoint, so the next work should
improve durability, source coverage, indexing, and data quality without
reopening solved problems or adding a large platform.

The goal is Goldilocks execution:

- Not too strict: keep useful public-source indexing where the source posture is
  reasonable and the project links users back to the original job.
- Not too loose: do not bypass logins, paywalls, CAPTCHAs, robots rules, rate
  limits, or explicit anti-automation terms.
- Not overbuilt: prefer small source-state, source-history, and query-plan
  improvements over dashboards, accounts, payments, or a new ingestion system.

## Current Verified Baseline

Date: 2026-06-13

Active production path:

- Bun workspaces
- Astro in `apps/web`
- React islands only where needed
- Cloudflare Pages
- Cloudflare D1
- GitHub Actions pulse workflows
- Scraper packages in `packages/scraper`

Current public site:

- `https://remotejobs-ph.pages.dev`

Current code checkpoint before this handoff document:

- `e719a2c` - `ci: run unit tests in guardrail`
- Branch: `main`
- Local branch was clean and aligned with `origin/main` before docs-only
  handoff edits.

Recent accepted implementation and QA evidence:

- `8d499df` - Gemini slimmed homepage and directory DB projections and added
  Remote OK scraper tests.
- `3036a53` - Gemini updated implementation and savepoint docs with F-09
  details.
- `e719a2c` - Codex added `bun test` to the CI guardrail so the new Remote OK
  tests are enforced on every push and PR.
- CI guardrail `27461079903` passed for `e719a2c`.
- Cloudflare Pages production deployment for `e719a2c`:
  `2bbecd9c-1247-4805-b017-70574afa6e37`.
- Local QA before this handoff:
  - `bun test packages/scraper/json.test.ts`: 54 passed.
  - `bun test`: 54 passed.
  - `bun run --cwd apps/web build`: passed.
  - `git diff --check`: passed with only normal Windows line-ending warnings.
- Production smoke before this handoff:
  - `/`: 200, about 132 KB.
  - `/directory`: 200, about 204 KB.
  - `/opportunities`: 200, about 96 KB.
  - `/categories/tech`: 200, about 94 KB.
- Read-only D1 snapshot before this handoff:
  - 878 active opportunities.
  - 38 active RemoteOK rows.
  - 4 inactive RemoteOK cleanup rows.
  - 0 active RemoteOK physical/logistics outliers.
  - `source_fetch_state.remote-ok` last count 26 and no last error.
- Source-health evidence:
  - Rollup `27450540244` reported 0 failed sources, 0 failed insert batches,
    and 0 insert errors.
  - Later scheduled Hunter `27457196402` also passed.

## Current Source Posture

Allowed and active configured public feeds/APIs:

- We Work Remotely RSS
- Remotive RSS
- Real Work From Anywhere RSS
- Jobicy Admin Support APAC RSS
- Remote OK public JSON API

Current guarded ATS posture:

- Workable is paused after repeated HTTP 429s and no reviewed
  source-supported access path.
- Lever and Greenhouse are paused by default because no current production rows
  use them and future rows need source-specific review first.
- Current Breezy tokens remain enabled as `needs_review`:
  - `breezy:20four7va`
  - `breezy:sourcefit`
  - `breezy:vaaphilippines-recruitment`
- Unknown future Breezy tokens default to paused until reviewed.

Paused RSS/HTML sources should stay paused unless new evidence changes the
decision:

- ProBlogger
- Remote.co RSS
- Authentic Jobs
- Dribbble Jobs
- OnlineJobs.ph public HTML
- Jobspresso

## Non-Negotiable Guardrails

Follow the recovery loop:

1. Make the smallest useful slice.
2. Run the narrowest meaningful verification.
3. Commit and push.
4. Watch GitHub Actions for the pushed commit.
5. Record the checkpoint with commit hash, run ID, verification, and next task.

For sources:

- Prefer official APIs, RSS feeds, documented JSON endpoints, and
  source-supported public access paths.
- Store minimal factual metadata needed for discovery.
- Link users back to the original source to apply.
- Keep source caps and cadence. Add `maxItems` and
  `minFetchIntervalMinutes` for new sources.
- Do not copy full descriptions unless the source clearly allows it.
- Do not use source logos unless permission is clear.
- Mark useful-but-unclear sources as `needs_review`, not automatically
  `allowed`.
- Pause hostile, rate-limited, restricted, or repeatedly failing sources.

For engineering:

- Keep the active Astro/Cloudflare/D1 path.
- Do not revive Next/Vercel/Turso/Trigger/Zig backup paths unless the strategy
  explicitly changes.
- Do not add auth, payments, subscriptions, resumes, user accounts, auto-apply,
  or a large dashboard.
- Add indexes only after query-plan evidence shows they help.
- Add source history only in compact operational tables or artifacts. Avoid a
  dashboard unless there is a proven reporting need.

## Masterplan Overview

Work in this order unless fresh QA evidence points elsewhere:

| Order | Workstream | Why Now | Output |
| ---: | --- | --- | --- |
| 1 | Source-health history | Green CI can still hide source drift over time. | Compact historical source-health evidence. |
| 2 | Breezy source review | Current Breezy tokens are useful but still `needs_review`. | Keep/allow/pause decision per token with evidence. |
| 3 | Data-quality and stale policy refresh | The active table has grown after source expansion. | Fresh snapshot plus reversible stale/paused-source action plan. |
| 4 | Query and indexing audit | Payload was reduced, but query plans should be rechecked after growth. | Confirm existing indexes or add one targeted migration. |
| 5 | Bounded source expansion | More sources are valuable only after monitoring and policy guardrails are clear. | One new source per slice, with source proof and Hunter evidence. |
| 6 | Portfolio polish | The site is a public portfolio; make the evidence legible. | README/docs/status reflect current source and health story. |

## Workstream 1 - Source-Health History

Problem:

- `source_fetch_state` stores current state.
- `docs/source-health-latest.md` stores the latest repo-readable rollup.
- Per-run artifacts exist in GitHub, but long-term source trend analysis is
  still awkward.

Recommended slice:

1. Add a compact D1 table such as `source_health_events` or
   `source_fetch_events`.
2. Record one row per source per Hunter run, or one row per source attempt,
   including:
   - run timestamp
   - source id/name/type
   - compliance status
   - ok/skipped flag
   - count
   - duration
   - short error or skip reason
3. Keep the current `source_fetch_state` table as the current-state table.
4. Do not build a dashboard yet.
5. Add a read-only SQL query snippet or small docs section showing how to audit
   recent source trends.

Acceptance criteria:

- Migration applies cleanly.
- Scrape response behavior remains backward compatible.
- Hunter run still reports 0 failed insert batches and 0 insert errors.
- Read-only D1 query can show last N source events.
- Docs explain the new table and the exact audit query.

Likely files:

- `packages/db/schema.ts`
- `packages/db/migrations/00XX_source_health_events.sql`
- `apps/web/src/pages/api/cron/scrape.ts`
- `docs/source-health-*.md` or a new report doc
- `docs/HANDOFF.md`
- `docs/SYSTEM_SAVEPOINT.md`

Verification:

- `bun test`
- `bun run --cwd apps/web build`
- `git diff --check`
- D1 migration workflow
- Manual Hunter run
- Read-only D1 query proving rows were written and `changed_db: false` for the
  audit query

## Workstream 2 - Breezy Source Review

Problem:

- Current Breezy ATS tokens are intentionally `needs_review`.
- They are useful and public JSON endpoints have worked, but terms/source
  posture should be reviewed per token before calling them fully allowed.

Recommended slice:

1. Re-probe current Breezy endpoints:
   - `https://20four7va.breezy.hr/json`
   - `https://sourcefit.breezy.hr/json`
   - `https://vaaphilippines-recruitment.breezy.hr/json`
2. Review available source pages, robots files where relevant, and terms or
   policy pages.
3. Decide per token:
   - stay `needs_review` with monitored minimal indexing;
   - become `allowed`; or
   - become `paused`.
4. Keep direct ATS/source linkback.
5. Keep duplicate-token skip behavior for `24/7 Virtual Assistant`.

Acceptance criteria:

- A new or updated review doc records evidence per token.
- `apps/web/src/pages/api/cron/scrape.ts` policy map matches the decision.
- Hunter run passes with 0 failed sources or clearly expected skipped sources.
- No new ATS platform is enabled without source-specific review.

Verification:

- `bun test`
- `bun run --cwd apps/web build`
- `git diff --check`
- direct endpoint probes
- manual Hunter run and source-health rollup evidence

## Workstream 3 - Data Quality And Stale Policy Refresh

Problem:

- The previous data-quality snapshot is from 2026-06-09.
- Active opportunities have grown after source expansion and Remote OK.
- Historical rows from paused sources still need periodic review.

Recommended slice:

1. Run a fresh read-only D1 snapshot:
   - active opportunities
   - active rows by platform
   - stale rows by `posted_at` and `last_seen_in_feed_at`
   - missing `application_url`
   - missing or weak `company`
   - category distribution
   - duplicate `source_url`, `content_hash`, and non-empty `description_hash`
2. Compare to `docs/data-quality-snapshot-2026-06-09.md` and
   `docs/stale-policy-dry-run-2026-06-09.md`.
3. If cleanup is needed, implement only a reversible, policy-backed slice:
   - archive stale rows from paused sources only after grace-window criteria;
   - keep allowed/needs-review sources active if recently seen;
   - document before/after counts.

Acceptance criteria:

- Snapshot doc has current D1 counts and changed_db false for audit queries.
- Any mutation is done through a migration or clearly bounded script, not an
  ad hoc shell write.
- No broad delete or archive happens without a dry-run table first.

Verification:

- Read-only D1 queries first.
- Migration workflow only if mutation is accepted.
- Production smoke after any mutation.

## Workstream 4 - Query And Indexing Audit

Problem:

- Existing hot indexes fixed the original temp B-tree issues.
- `/` and `/directory` payloads were slimmed.
- `/opportunities` now does server-side filtering and pagination, including
  optional `LIKE` search and platform/type/category filters.

Recommended slice:

1. Re-run query plans for:
   - homepage latest active jobs
   - `/opportunities` default page
   - `/opportunities?category=tech`
   - `/opportunities?type=VA`
   - `/opportunities?platform=RemoteOK`
   - common search query shape using `LIKE`
   - directory page query
2. Add an index only if evidence shows a hot path doing avoidable scans or temp
   sort work.
3. Consider these only if query evidence supports them:
   - `(type, is_active, posted_at DESC)`
   - `(source_platform, is_active, posted_at DESC)`
   - directory grouping/order index if the directory query scans awkwardly
4. Do not add SQLite FTS until the active opportunity count or search latency
   makes `LIKE` search a real problem.

Acceptance criteria:

- Query-plan doc shows before/after for any new index.
- Migration is additive and safe.
- Production route sizes and statuses remain healthy.

Verification:

- `bun run --cwd apps/web build`
- D1 query-plan before/after
- migration workflow if index added
- production smoke for `/`, `/opportunities`, `/directory`, and
  `/categories/tech`

## Workstream 5 - Bounded Source Expansion

Problem:

- The user wants the best reasonable public sources.
- Source expansion is valuable, but each added source increases compliance,
  quality, cadence, and performance risk.

Rule:

- Add at most one new source per implementation slice.
- Do not add a source until the current source-health state is green.
- Prefer sources with official RSS/API/docs and obvious linkback posture.

Candidate process:

1. Search for a source-supported feed/API/documented JSON endpoint.
2. Check robots and terms/current source documentation.
3. Probe with a small cap.
4. Add compliance notes in `packages/scraper/sources.ts`.
5. Add `maxItems` and `minFetchIntervalMinutes`.
6. Add parser tests if the source needs custom parsing or filtering.
7. Run local build/tests.
8. Push, wait for CI, deploy, run Hunter, and document evidence.

Good candidate families to review, not blindly enable:

- More Jobicy RSS category/region feeds that match VA, admin, customer support,
  marketing, writing, finance, or APAC remote work.
- Additional official/public Remotive or similar documented remote-job feeds if
  their reuse/linkback posture remains friendly.
- Company career pages only when they expose a supported public feed/API and
  source-specific review is recorded.

Avoid unless explicit permission or supported feed is found:

- Public HTML job searches that forbid automation or lack a source-supported
  access path.
- Sources with repeated HTTP 429 or bot-protection behavior.
- Sources that require login, CAPTCHA, or paywall access.
- Sources whose terms prohibit automated collection beyond search-engine
  indexing.

Acceptance criteria:

- New source has documented evidence, caps, cadence, and linkback behavior.
- Hunter evidence shows no failed source records, failed insert batches, or
  insert errors.
- D1 count and source-state checks are recorded.
- If quality outliers appear, add filters/tests before adding another source.

## Workstream 6 - Portfolio Polish And Handoff Hygiene

Problem:

- This project is both a useful public index and a portfolio artifact.
- The evidence story should stay easy for future agents, employers, and the
  owner to understand.

Recommended slice:

1. Keep `docs/DOCS_INDEX.md` current.
2. Update `docs/HANDOFF.md`, `docs/SYSTEM_SAVEPOINT.md`, and
   `docs/IMPLEMENTATION_STATUS.md` after every accepted slice.
3. Keep README aligned with the current architecture and compliance story.
4. Do not duplicate long histories in every file. Point to the newest handoff
   and the canonical evidence docs.

Acceptance criteria:

- New agent can start from `docs/DOCS_INDEX.md` and know exactly what to do.
- Latest commit, CI run, deployment, source-health status, and next task are
  discoverable within two documents.

## First Gemini Prompt

Suggested prompt to give Gemini:

```text
Read AGENTS.md, docs/DOCS_INDEX.md, docs/gemini-masterplan-handoff-2026-06-13.md,
docs/IMPLEMENTATION_STATUS.md, docs/HANDOFF.md, and docs/SYSTEM_SAVEPOINT.md.
Start with Workstream 1 unless current QA evidence shows a higher-priority
problem. Make one small vertical slice, verify locally, commit, push, wait for
GitHub Actions, and update the recovery docs with evidence. Keep the Goldilocks
source policy: public-source indexing with caps, linkback, and pause/review
states, but do not bypass restrictions or build a large dashboard.
```

## Commands For The Next Agent

Start:

```powershell
git status --short --branch
git log --oneline --decorate -12
gh run list --repo cyalcala/va-freelance-hub --limit 10
Get-Content docs\source-health-latest.md
```

Local verification:

```powershell
bun test
bun run --cwd apps/web build
git diff --check
```

Production smoke:

```powershell
$base = "https://remotejobs-ph.pages.dev"
foreach ($path in "/", "/opportunities", "/directory", "/categories/tech") {
  $res = Invoke-WebRequest "$base$path" -UseBasicParsing
  "$path $($res.StatusCode) $($res.RawContentLength)"
}
```

Read-only D1 examples:

```powershell
bunx wrangler d1 info remoteph-jobs-db
bunx wrangler d1 execute remoteph-jobs-db --remote --command "SELECT COUNT(*) AS active_jobs FROM opportunities WHERE is_active = 1;"
bunx wrangler d1 execute remoteph-jobs-db --remote --command "EXPLAIN QUERY PLAN SELECT id, title, company, type, source_url, source_platform, tags, category, experience_level, posted_at FROM opportunities WHERE is_active = 1 ORDER BY posted_at DESC LIMIT 60;"
```

## Stop Conditions

Stop and document before continuing if any of these happen:

- CI fails on `main`.
- Hunter reports failed insert batches or insert errors.
- A source starts returning bot-protection, 403/429, hostile terms evidence, or
  repeated timeouts.
- Query-plan evidence shows a broad performance regression.
- Production smoke returns non-200 for public routes.
- The repo becomes dirty with unrelated generated files.

## Codex QA Request At The End

When Gemini finishes a slice, ask Codex to QA with:

```text
Gemini completed the latest slice. Please review recent commits, run local
tests/build, inspect CI and source-health evidence, smoke production, and tell
me whether this is accepted or what must be fixed.
```

