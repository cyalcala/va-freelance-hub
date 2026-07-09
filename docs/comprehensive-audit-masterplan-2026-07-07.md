# Comprehensive Audit Masterplan - 2026-07-07

## Purpose And How To Use This Document

The user requested a full production-grade, end-to-end architecture and
codebase audit (reliability, extensibility, performance, correctness,
observability, resilience, security, code quality) with fixes, a second-pass
regression audit, and a final report. This document is the **execution plan**
for that audit, prepared by the 2026-07-07 session for the next AI to run.

Rules for the executing AI:

1. Read `AGENTS.md`, `docs/DOCS_INDEX.md`, `docs/major-audit-2026-07-04.md`,
   and `docs/maintenance-bot-2026-07-04.md` before touching anything.
2. Work in slices per the recovery methodology: one workstream slice ->
   verify -> commit -> push -> record evidence in
   `docs/IMPLEMENTATION_STATUS.md`. Never batch unrelated fixes in one commit.
3. Honor the five durability rules from the 2026-07-04 audit: no silent
   catches in write paths; all D1 batch inserts via `maxRowsPerD1Batch`; no
   destructive SQL in cron paths; workflows assert on response fields;
   backlog metrics get reported.
4. Audit phase is READ-ONLY (Read/Grep + read-only `wrangler d1 execute
   --remote`). Production mutations only via reviewed migration files.
5. Every claimed fix needs evidence: `bun test` (baseline 70/70), `bun run
   --cwd apps/web build`, CI guardrail green, and for data changes a
   read-only D1 before/after count.
6. Stop conditions: if a fix requires a paid service, a new secret you cannot
   create, hard-deleting data, or enabling a new scraping source — stop and
   ask the user.

## Verified Baseline (2026-07-07, read-only production evidence)

| Metric | Value | Trend / note |
| --- | ---: | --- |
| Active opportunities | 1,841 | total 2,134; total rising while active falls = soft-archive prune working |
| Directory companies | 297 | +32 gold777 import on 2026-07-04 |
| Never link-verified (active) | 178 | down from 456 on 2026-07-04 — verifier fix draining as designed |
| `source_fetch_events` rows | 1,296 across 35 sources | was 1 stuck test row before the S-1 fix |
| Open `source-health` bot issues | 0 | healthy; alerts correctly silent |
| Pulse workflows (Hunter/Verifier/Prune/Sentinel/Medic) | all green | Medic's first digest committed 2026-07-05 (`docs/health-digest-latest.md`) |
| Page payloads (2026-07-04 measure) | `/` ~141 KB, `/opportunities` ~95 KB, `/directory` ~232 KB, `/categories/tech` ~93 KB | `/directory` is the outlier — see W4 |
| Tests | 70/70 pass | `bun test`; no tests exist for verify-links or prune logic |
| Active-count growth explained | yes | gold777 ATS feeds are high-volume (7-day items seen: greenhouse:remotecom 3,731; greenhouse:gitlab 1,849; we-work-remotely 1,300) — growth is legitimate ingestion, not churn |

Recent checkpoints: F-19 gold777 import, F-20 silent-error audit fixes,
F-21 Tier-1 maintenance bot, F-22 Tier-2 AI diagnosis. All pushed; CI green.

## Audit Architecture (how the previous session structured it)

An 8-dimension parallel audit with adversarial verification was designed and
launched but interrupted by session end before results returned. The
dimension prompts below are the distilled versions; execute them serially or
via subagents. **Every finding must survive an adversarial re-check against
the actual code before it becomes a fix** — default to refuted when the code
already handles the case. Cap: report the top findings per dimension ranked
by severity (critical = data loss/security/outage; high = wrong data or
silent-failure class; medium = bounded degradation; low = hygiene).

---

## Workstream W0 - Baseline Snapshot (read-only, ~15 min)

Record in the final report before changing anything:

```bash
git status --short --branch && git log --oneline -5
bun test                                  # expect 70/70
bun run --cwd apps/web build              # expect success
cd apps/web && npx wrangler d1 execute remoteph-jobs-db --remote --json --command \
  "SELECT (SELECT COUNT(*) FROM opportunities WHERE is_active=1) AS active, (SELECT COUNT(*) FROM opportunities) AS total, (SELECT COUNT(*) FROM va_directory) AS companies, (SELECT COUNT(*) FROM source_fetch_events) AS events;"
curl -s -o /dev/null -w "%{http_code} %{size_download}\n" https://remotejobs-ph.pages.dev/{,opportunities,directory,categories/tech}
```

## Workstream W1 - Ingestion Correctness (scrape pipeline)

Files: `apps/web/src/pages/api/cron/scrape.ts` (~800 lines, read fully),
`packages/scraper/{rss,json,html,ats,triage,sources,batch}.ts`,
`packages/db/schema.ts`.

Investigate specifically:

- **Hash inconsistency (high-priority suspect):** `ats.ts` `toContentHash`
  is a custom 2x32-bit hash truncated to 16 hex chars, while other paths use
  SHA-256. `content_hash_idx` is UNIQUE and inserts use
  `onConflictDoNothing` — a collision silently drops a legitimate job with
  zero accounting. Assess collision probability at current volume and unify
  on sha256-slice. CAUTION: changing the algorithm re-keys dedup — plan a
  transition that does not resurrect previously deduped rows (e.g. keep old
  hashes on existing rows, apply new algorithm only to new inserts; document
  the cutover date).
- Enum drift: values written for `type`, `experienceLevel`, `locationType`
  vs the schema enums; `triage.employmentType` mapping in scrape.ts.
- `mapTriageCategoryToUiCategory` coverage vs `apps/web/src/lib/categories.ts`
  slugs — any triage category that maps to a slug with no UI page.
- Date handling: `safeNormalizeDate`/`normalizeUtcIso` fed malformed ATS
  dates; items dropped without accounting anywhere in the funnel (raw ->
  dedup -> limit -> triage -> insert should sum exactly; verify the response
  fields make the funnel closed-form).
- `applicationUrl` precedence (triage > scraper > sourceUrl) correctness.

## Workstream W2 - Concurrency, Races, Idempotency

Files: all `apps/web/src/pages/api/**` routes, `packages/db/schema.ts`
unique indexes, all `.github/workflows/*.yml` concurrency stanzas.

Investigate specifically:

- Overlapping scrape runs (scheduled + manual Hunter): verify every insert
  path (scrape.ts AND ingest.ts) is idempotent via unique(source_url) +
  unique(content_hash) + `onConflictDoNothing`. Check ingest.ts actually has
  the same guards.
- Click route `click/[id].ts`: if clickCount increment is read-modify-write
  in JS, concurrent clicks lose counts — should be a single SQL
  `SET click_count = click_count + 1`. Verify and fix if needed.
- Mid-run kill (Cloudflare Pages duration limit): scrape.ts performs
  fetch -> lastSeenInFeedAt updates -> triage -> inserts sequentially.
  Enumerate which partial states a killed run can leave and confirm each is
  self-healing on the next run (they should be, given idempotent writes —
  document the argument explicitly in the report).
- Workflow-level: rollup (Hunter), Medic, and human pushes can race on
  `git push origin HEAD:main`. Add a bounded retry with
  `git pull --rebase` to both bot-commit jobs.
- Confirm every pulse workflow has a `concurrency` group; with
  `cancel-in-progress: false` queued runs pile up after long delays —
  assess whether queuing is correct per workflow or should be
  `cancel-in-progress: true` for idempotent pulses.

## Workstream W3 - Security

Files: every route under `apps/web/src/pages/api/`, all Astro/TSX rendering
scraped content, all workflow YAML, `wrangler.toml`, repo tracked files.

Investigate specifically:

- **XSS surface (highest priority):** scraped titles/companies/descriptions/
  payRange are attacker-controlled. Grep for `set:html` and
  `dangerouslySetInnerHTML` across `apps/web/src`; verify every render of
  scraped fields relies on framework auto-escaping. Verify URL fields
  (`sourceUrl`, `applicationUrl`, website) rendered into `href` cannot be
  `javascript:` URLs — add scheme validation on the write path (allow only
  http/https) and defensively on render.
- Auth on each POST route: scrape, verify-links, prune, ingest,
  ingest-digest — confirm uniform secret check; note the comparison is not
  timing-safe (low practical risk; fix opportunistically with a
  constant-time compare).
- `click/[id].ts`: 302 redirect to stored `source_url` — combined with the
  scheme validation above this is not an open redirect, but verify the id is
  parsed as integer and non-numeric input 404s cleanly.
- Workflow shell injection: alert/sentinel jobs interpolate scraped error
  strings into bash via `jq -r` -> `"$VAR"` -> markdown files. Verify no
  path passes untrusted text unquoted, through `eval`, or into
  `$GITHUB_ENV`/`$GITHUB_OUTPUT` where a newline could inject variables
  (ISSUE_URL is bot-generated, but error strings written to GITHUB_ENV
  anywhere would be injectable — grep all workflows for `>> "$GITHUB_ENV"`).
- Secrets: confirm `.env` files are gitignored and untracked
  (`git ls-files | grep -i env`), scan tracked files for token patterns.
  Note: `.env.example` lists legacy Turso/Trigger keys — verify no real
  values ever committed (`git log -p -- .env.example` spot check).
- Rate limiting: public endpoints (`/api/click/*`) and the auth-gated ones
  under brute force — check `wrangler.toml` ratelimits config actually
  applies, document posture.

## Workstream W4 - Performance

Files: the four page `.astro` files, scrape.ts, verify-links.ts, schema
indexes, `docs/query-indexing-audit-2026-06-13.md` for prior art.

Investigate specifically:

- **Index misalignment (verified suspect):** pages now sort by
  `coalesce(posted_at, scraped_at) DESC` (F-17 freshness fix) but
  `active_posted_idx` indexes `(is_active, posted_at)` — the coalesce
  expression likely forces a temp B-tree again. Run
  `EXPLAIN QUERY PLAN` read-only to confirm; if confirmed, add an expression
  index `ON opportunities (is_active, coalesce(posted_at, scraped_at) DESC)`
  via migration (SQLite supports expression indexes; verify D1 accepts it,
  else add a computed `effective_posted_at` column backfilled by migration
  and maintained on write).
- `/directory` ~232 KB: check whether all 297 companies hydrate into the
  client island; server-paginate or slim the projection further.
- Scrape route worst-case runtime: sequential ATS fetches with 1s sleeps
  between Workable + triage at concurrency 3 over up to 50 items. Compute
  from `source_fetch_events.duration_ms` (real data — query it) and assess
  against Pages Functions limits; if p95 total approaches the limit, split
  ATS polling into its own cron endpoint.
- `source_fetch_events` unbounded growth (~4,600 rows/week at current
  cadence): add a retention migration (archive or delete events older than
  90 days — deletion here is acceptable as it is telemetry, not job data;
  document the exception to the no-delete rule explicitly).

## Workstream W5 - Frontend, Search, Filtering

Files: `apps/web/src/pages/*.astro`, `categories/[category].astro`, all
components in `apps/web/src/components`, `lib/categories.ts`.

Investigate: null company/payRange in filter predicates (crash or silent
mismatch), case-insensitive search behavior, pagination edge cases
(`?page=0`, negative, NaN, beyond last — each should clamp, not 500),
category slug set equality between triage outputs and UI pages, fields the
card renders vs the slimmed DB projection (undefined leaks render as
"undefined"?), mixed-format timestamp display, empty states, and a quick
keyboard/aria pass on the search islands.

## Workstream W6 - Workflows / CI Robustness

Files: all eight `.github/workflows/*.yml`.

Investigate specifically:

- `jq` on non-JSON: Cloudflare 5xx returns an HTML error page; steps doing
  `jq -r '.field' harvest.log` after a failed curl — verify every parse has
  a fallback (`|| echo 0`) AND that curl failures fail the step visibly
  rather than producing all-zero metrics that look healthy (the watermelon
  pattern in miniature).
- Bot-commit push races (see W2) — add retry loops.
- Alerts dedup: `gh issue list --search "in:title \"$TITLE\""` — verify
  substring semantics can't false-positive on a different day's issue.
- `gha-chef-pulse.yml`: purpose unknown to the recovery docs — read it,
  document it in DOCS_INDEX, or propose removal if dead.
- `deploy-migrations.yml`: verify trigger conditions (does it run on any
  migration file change? manual only?) and that a failed migration blocks
  dependent deploys.
- Curl timeout coverage: every curl in workflows should have `--max-time`.

## Workstream W7 - Data Integrity And Schema

Files: `packages/db/schema.ts`, `packages/db/migrations/*` (list all, read
latest), write paths in scrape.ts/ingest.ts.

Investigate: Drizzle schema vs applied migrations drift (generate and diff);
table defaults still `datetime('now')` (known debt — decide fix or accept);
`va_directory` has NO unique index on `company_name` — duplicates already
exist ("Filipino Contractors" + "Filipinocontractors.com", "SmartBuyGlasses"
x2, "Pepper Virtual Assistants" near-dupes): propose a dedup + unique-index
migration with a merge strategy (keep row with ATS config/most fields);
`is_dayshift` boolean vs `niche='australian-dayshift'` consistency;
`content_hash` strategy unification (from W1).

## Workstream W8 - Code Quality, Dead Code, Extensibility

Investigate and act:

- Dead paths to archive or delete (get user sign-off before deleting
  directories): `apps/web-nextjs-backup/`, `packages/zig-parser/`,
  `.trigger/` + `trigger.config.ts`, `list_models.ts`,
  `onlinejobs_test.html`, `packages/scraper/test.ts` (superseded by real
  tests?), `work777.xlsx` at repo root, `local-test.db`.
- **Dual lockfiles:** both `bun.lock` and `pnpm-lock.yaml` exist (plus
  `pnpm-workspace.yaml`). Bun is the active toolchain. Verify nothing in CI
  or docs still uses pnpm, then remove the pnpm artifacts in a dedicated
  commit (easy rollback).
- `scrape.ts` is ~800 lines mixing auth, policy, fetching, cadence, triage,
  insert accounting, and event logging. Refactor into modules
  (`policy.ts`, `fetch-orchestrator.ts`, `triage-runner.ts`,
  `insert-accounting.ts`) with the route as thin composition — ONLY after
  W1/W2 fixes land, and extract pure functions with unit tests as you go.
- Unify the three near-identical search components after measuring actual
  divergence; add tests for verify-links stale logic and prune SQL by
  extracting them into testable pure functions.
- Stale GitHub issues #13-#25 (Warden/Vercel/watchdog era — predate the
  current architecture): produce a close-list with one-line justifications
  for the user to approve; do not close unilaterally.

## Workstream W9 - Second-Pass Audit And Final Report

After all fixes land: re-run W0 commands, re-run the W1-W8 checklists
against changed files only, confirm no regression (`bun test`, build, CI,
production smoke, read-only D1 counts), then write
`docs/comprehensive-audit-report-2026-07.md` containing:

1. Executive summary and system health score (score each dimension 1-10
   with one-line justification; overall = weighted mean, weights:
   reliability 25, correctness 20, security 20, performance 10,
   observability 10, resilience 10, extensibility 5).
2. Architecture assessment; reliability/performance/security/extensibility
   assessments; remaining technical debt; risks and recommendations.
3. All changes made with commit hashes; before/after metric table (use W0
   baseline vs final numbers).
4. Prioritized roadmap: next-30-days / next-quarter / opportunistic.

Update `docs/IMPLEMENTATION_STATUS.md`, `docs/HANDOFF.md`,
`docs/SYSTEM_SAVEPOINT.md`, `docs/DOCS_INDEX.md` at every checkpoint, and
push after every slice. The user's standing instruction is to document
everything and back up on GitHub.

## Known Non-Existent Stages (answer these honestly in the report)

The requested pipeline validation includes stages this system does not
have: queue processing (no queues — GitHub Actions cron + direct API calls),
notifications (none — bot issues are the nearest equivalent), and a separate
enrichment service (enrichment = Workers AI triage inline). The report
should state these as N/A-by-design with a one-line assessment of whether
adding each is warranted (current scale says no).

## Execution Order And Effort Estimate

| Order | Workstream | Risk | Est. effort |
| --- | --- | --- | --- |
| 1 | W0 baseline | none | 15 min |
| 2 | W3 security sweep (read-only) | none | 1-2 h |
| 3 | W1 + W7 correctness/integrity fixes | medium (migrations) | 2-4 h |
| 4 | W2 + W6 concurrency/workflow hardening | low | 1-2 h |
| 5 | W4 performance (expression index, directory payload, retention) | medium | 2-3 h |
| 6 | W5 frontend pass | low | 1-2 h |
| 7 | W8 cleanup/refactor (user sign-off for deletions) | low-medium | 2-4 h |
| 8 | W9 re-audit + report | none | 1-2 h |

Total: roughly 2-3 focused sessions. Prefer stopping at any slice boundary
over rushing a half-verified change — the recovery docs make resumption
cheap.
