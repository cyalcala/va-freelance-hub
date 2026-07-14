# Handoff

### Current State

Date: 2026-07-14 (later)
Status: IMPLEMENTED the autonomous Prospector (checkpoint F-29) — the Hunter
upgrade that auto-discovers and adds new Filipino-hiring companies from
already-ingested eligible jobs, ending the manual spreadsheet-import loop.
`packages/scraper/prospector.ts` (two gates: name-quality + source-trust,
+16 tests), `apps/web/src/pages/api/cron/prospect.ts` (idempotent auto-add,
mass-add guard, fail-closed ATS), `.github/workflows/gha-prospector-pulse.yml`
(4x/day, git digest backup, human-gated ATS-enable proposals). 113/113 tests,
build green. Enabling scraping of a discovered ATS token stays a human code
edit (Phase 3). Details + remaining phases: `docs/company-hunter-strategy.md`.
Post-deploy: watch the first Prospector run add trusted companies (LawnStarter,
Airalo, Proxify, etc.) and file ats-proposal issues; confirm garbage/spam
excluded.

### Earlier same day

Status: (1) Fixed the "lost customer-service island" bug — the homepage
"Fresh opportunities by category" sourced a flat latest-60-overall pool, so
tech-heavy ingestion hid whole categories (customer-service: 177 jobs,
design: 98) that had zero rows in the latest 60. Root-cause fix: source the
preview PER CATEGORY via a window query, and pass true per-category totals so
each card's "See all N" is accurate. Files: apps/web/src/pages/index.astro,
apps/web/src/components/OpportunitySearch.tsx.
(2) NEW STRATEGY DOC FOR THE NEXT AI: `docs/company-hunter-strategy.md` — a
full plan to upgrade the Hunter to autonomously discover and auto-add new
companies that hire Filipino talent (the "Prospector"), removing the manual
spreadsheet-import loop. Key idea: mine the already-ingested, already-eligible
jobs for companies/ATS tokens not yet in va_directory; auto-add directory rows
(paused for scraping by default = fail-closed); keep scraping-enable
human/PR-gated per the compliance policy. Phased rollout, cadence design
(~48/day extraction, batched verification), schema + workflow changes, and
guardrails are all specified there. NOT YET BUILT — it is the recommended
next major workstream.

### Previous State

Date: 2026-07-12
Status: RemoteWork3.8 import + Ashby ATS expansion (checkpoint F-27,
`docs/remotework38-import-2026-07-12.md`). Added a NEW Ashby ATS adapter
(supabase/camunda/tremendous/amplify/ashby, all probed live) plus 2 Greenhouse
tokens (grafanalabs, nearform), and 14 new directory companies via idempotent
migration 0019 (CI applies it — local Wrangler OAuth was expired with error
7403, so delivery is migration-based). 97/97 tests, build passed. Post-deploy:
confirm deploy-migrations green for 0019 and the 7 new ATS tokens appear in the
next Hunter run's source_fetch_events. Prior work: comprehensive audit complete
(F-24 to F-26).

### Previous State

Date: 2026-07-11
Status: Comprehensive audit COMPLETE — all 8 dimensions swept across Parts
1-3 (checkpoint F-26, `docs/comprehensive-audit-report-2026-07.md`). Part 3
(perf, frontend, workflows, data-integrity, code-quality) done by static
analysis + live EXPLAIN plans. Fixed: schema.ts drift on the 0018 expression
index (drop-trap), and a Hunter/Verifier total-outage watermelon (now fail
on any non-2xx). Verified-clean: no rejected-row UI leak, category pages
index-served, pagination guarded, ISO timestamps everywhere. 91/91 tests,
build passed. STILL PENDING OWNER ACTION from Part 2: rotate the leaked
Turso / Trigger.dev / ISR secrets at their providers (git history purge is a
separate consented step). Remaining work is the roadmap in the report
(events retention, va_directory unique index, dead-code removal, scrape.ts
modularization) — no known correctness/security defects remain unaddressed.

### Previous State

Date: 2026-07-10
Status: Comprehensive audit Part 2 complete (checkpoint F-25,
`docs/comprehensive-audit-report-2026-07.md`). CRITICAL: leaked legacy
secrets in tracked build artifacts were untracked (`f85eed9`) — **OWNER MUST
ROTATE** the Turso, Trigger.dev, and ISR secrets at their providers (they
remain in git history until a consented purge). Also fixed: verify-links
D1-param wedge (chunked), /api/ingest mass-assignment (allow-list +
sanitize), ci-guardrail/deploy-migrations concurrency, bot push rebase-retry,
Sentinel branch re-entrancy, /api/click rate limit, atomic verify increment,
constant-time auth on prune/verify-links. 91/91 tests. Five audit dimensions
(performance, frontend, workflows-CI, data-integrity, code-quality) remain
queued — they errored on agent capacity, not findings.

### Previous State

Date: 2026-07-08
Status: Comprehensive audit Part 1 complete (checkpoint F-24,
`docs/comprehensive-audit-report-2026-07.md`). Fixed: triage fail-open
during AI outages (now fail-closed + counted), unvalidated LLM apply-URLs
(sanitized precedence), hostile-entity feed kills (guarded decode +
per-item isolation), infinite re-triage of rejected items (persisted as
inactive rows), production-confirmed temp-B-tree board sort (expression
index migration 0018), plus consistency/observability fixes (shared
contentHash/text/urls modules, funnel counters, unmatched-pause
reconciliation, new Hunter annotations). 91/91 tests. Remaining dimension
sweeps (W2-W8) stay queued in the masterplan. Post-deploy acceptance:
confirm production EXPLAIN plan uses `active_effective_posted_idx`, and
watch the next Hunter run for the new response fields.

### Previous State

Date: 2026-07-08
Status: Tier-3 autonomous auto-pause implemented (checkpoint F-23). Sentinel
now detects flapping sources and — when the `SENTINEL_BOT_PAT` secret exists —
appends them to `packages/scraper/paused-sources.json` on a branch, validates
with full guardrail parity in-runner, opens an evidence PR, squash-merges, and
the resulting CI deploy activates the pause. Mass-failure guard (>3 flapping =
infrastructure issue, zero pauses), one PR/day cap, append-only JSON, un-pause
human-only. Without the PAT it files recommendation issues as before. User
setup steps: `docs/maintenance-bot-2026-07-04.md`. Next planned work:
`docs/comprehensive-audit-masterplan-2026-07-07.md` (W0-W9).

### Previous State

Date: 2026-07-04
Status: Tier-1 maintenance bot implemented (`docs/maintenance-bot-2026-07-04.md`):
Hunter now files deduped alert issues on internal degradation, the daily
Sentinel pulse detects flapping sources from real fetch-event history and files
pause recommendations (never edits code), and the weekly Medic pulse commits an
automated data-quality digest to `docs/health-digest-latest.md`. All free
(public-repo Actions, read-only D1, built-in token). First scheduled runs:
alerts on next Hunter tick, Sentinel daily 01:30 UTC, Medic Sunday 02:00 UTC.

Earlier same day: Major audit complete (`docs/major-audit-2026-07-04.md`). Fixed the
silent fetch-event logging failure (D1 100-bound-parameter limit, broken since
2026-06-13), rewrote the hard-deleting prune endpoint to policy-compliant
soft-archive, surfaced triage failures / cadence-guard state / verification
backlog in cron responses and workflow annotations, and adopted five standing
durability rules. 70/70 tests pass. Post-deploy acceptance checklist is in the
audit doc: fetch events must accumulate past the single test row, prune must
report soft-archive mode with no row-count decrease, and the never-verified
backlog (456) must shrink.

Earlier same day: Gold777 directory import complete. 32 new va_directory
companies added (265 -> 297) and 4 confirmed Greenhouse/Breezy ATS tokens
wired for GitLab, Ghost, Remote.com, and Time Etc. See
`docs/gold777-directory-import-2026-07-04.md`.
Active branch: `main`

Previous state:

Date: 2026-06-13
Status: All 6 workstreams of the Gemini Masterplan completed successfully.
Overall accepted completion: 100% of Masterplan.

Latest stop-point handoffs:

- `docs/source-expansion-2026-06-13.md` (Commit: `70ff8cf`)
  - Purpose: records the completed Workstream 5 (Bounded Source Expansion), adding the `jobicy-supporting-apac` RSS feed with appropriate caps and cadence.
- `docs/query-indexing-audit-2026-06-13.md` (Commit: `80f2075`)
  - Purpose: records the completed Workstream 4 (Query and Indexing Audit), adding the `company_name_idx` index to `va_directory` to eliminate sorting overhead.
- `docs/stale-policy-report-2026-06-13.md` & `docs/data-quality-snapshot-2026-06-13.md` (Commit: `fe57510`)
  - Purpose: records the completed Workstream 3 (Data Quality & Stale Policy), archiving 12 stale/duplicate opportunities in D1.
- `docs/breezy-source-review-2026-06-13.md` (Commit: `020ba7d`)
  - Purpose: records the completed Workstream 2 (Breezy Source Review), auditing robots.txt and compliance notes.
- `docs/source-health-audit.md` (Commit: `2b91c68`)
  - Purpose: records the completed Workstream 1 (Source-Health History), logging scraper attempts to `source_fetch_events`.

Previous stop-point handoff:

- `docs/gemini-masterplan-handoff-2026-06-13.md`
  - Purpose: records the current verified baseline after Gemini's payload/test
    work and Codex's CI guardrail QA, then gives Gemini an ordered masterplan for
    source-health history, Breezy review, data-quality refresh, query/index
    audit, bounded source expansion, and portfolio polish.

Previous stop-point handoff:

- `docs/remote-ok-json-source-handoff-2026-06-13.md`
- Purpose: records the accepted Remote OK JSON ingestion slice, source evidence,
  direct-link compliance posture, quality filter, cleanup migration, workflow
  evidence, production D1 snapshot, and next safe work.
- Important state: Remote OK is enabled as a capped, cadence-guarded JSON
  source. Physical/logistics outliers from the first run were archived by D1
  migration `0015_remote_ok_quality_filter.sql`.

Previous implementation checkpoint:

- `docs/source-expansion-2026-06-12.md`
- Purpose: records the accepted bounded RSS source expansion, source fetch
  caps, durable cadence tracking, source-state D1 evidence, deployment recovery,
  Hunter evidence, and next safe source work.
- Important state: Real Work From Anywhere and Jobicy Admin Support APAC are now
  enabled as capped, cadence-guarded `allowed` RSS sources. Remote OK remains
  deferred until a JSON adapter exists.

Previous takeover note:

- `docs/goldilocks-source-expansion-handoff-2026-06-12.md`
- Purpose: captures the balanced source-compliance posture, source candidates,
  source evidence gathered so far, ingestion/cadence safeguards, performance
  indexing plan, and the next safe implementation sequence.
- Important state: this plan has now been partially executed. Jobicy and Real
  Work From Anywhere are enabled with caps and cadence. Remote OK still requires
  a JSON adapter before enabling.

Current Goldilocks policy wording:

- Current reviewed Breezy tokens remain enabled as `needs_review`.
- Notes now say these are public, robots-allowed, CORS-readable Breezy career
  endpoints where the project should collect minimal factual metadata, link
  back to ATS-hosted URLs, and pause on objection or clarified hostile terms.

Latest health audit and repair checkpoint:

- Gemini/Codex QA checkpoint:
  - `8d499df` - reduced homepage and directory DB projections and added 54
    Remote OK scraper tests.
  - `3036a53` - updated implementation/savepoint docs for F-09.
  - `e719a2c` - added `bun test` to CI guardrail.
- Verification:
  - `bun test packages/scraper/json.test.ts` passed.
  - `bun test` passed.
  - `bun run --cwd apps/web build` passed.
  - `git diff --check` passed.
  - CI guardrail `27461079903` passed.
  - Production deployment
    `2bbecd9c-1247-4805-b017-70574afa6e37` completed for `e719a2c`.
  - Production smoke returned 200 for `/`, `/directory`, `/opportunities`, and
    `/categories/tech`.
  - Read-only D1 snapshot remained healthy: 878 active opportunities, 38 active
    RemoteOK rows, 4 inactive RemoteOK cleanup rows, and 0 active RemoteOK
    physical/logistics outliers.

- Remote OK handoff: `docs/remote-ok-json-source-handoff-2026-06-13.md`
- Product commits:
  - `92ca443` - added Remote OK JSON source support.
  - `4c2374b` - tightened Remote OK physical/logistics filtering and added the
    cleanup migration.
- Generated rollup commit:
  - `562355e` - refreshed `docs/source-health-latest.md`.
- Verification:
  - `bun run --cwd apps/web build` passed.
  - `git diff --check` passed.
  - CI guardrail `27435140046` passed for `92ca443`.
  - Production deployment `b8b04c38-2b56-42e6-89df-2b980c6a6266` deployed
    `92ca443`.
  - Manual Hunter `27435248150` passed with Remote OK JSON count 33 in the
    first loop, 25 accepted/attempted inserts total, 0 failed sources, 0 failed
    insert batches, and 0 insert errors.
  - CI guardrail `27435636180` passed for `4c2374b`.
  - D1 migration workflow `27435636177` passed for
    `0015_remote_ok_quality_filter.sql`.
  - Source-health rollup `27450540244` passed with 8 accepted/attempted inserts,
    0 failed sources, 0 failed insert batches, and 0 insert errors.
  - Later scheduled Hunter `27457196402` passed on rollup commit `562355e`.
  - Read-only D1 snapshot: 878 active opportunities, 38 active RemoteOK rows, 4
    inactive RemoteOK cleanup rows, and 0 active RemoteOK physical/logistics
    outliers.

Previous health audit and repair checkpoint:

- Source expansion report: `docs/source-expansion-2026-06-12.md`
- Product commits:
  - `686e312` - added capped/cadence-guarded RSS sources and D1 source fetch
    state.
  - `b948828` - fixed paused-source skip reasons after discovering array-index
    leakage in disabled source reporting.
- Generated rollup commit:
  - `79e46f8` - refreshed `docs/source-health-latest.md`.
- Verification:
  - `bun run --cwd apps/web build` passed.
  - `git diff --check` passed.
  - CI/deploy run `27422527473` passed.
  - D1 migration workflow `27422527574` passed.
  - CI run `27422888691` passed for the skip-reason fix.
  - Manual Cloudflare Pages deployment `8863383f-2f01-4c64-8110-51b8e8d5f222`
    recovered production after an async Pages deployment failure for `b948828`.
  - Hunter run `27422685577` passed with 25 accepted/attempted inserts, 0
    failed source records, 0 failed insert batches, and 0 insert errors.
  - Hunter run `27423455086` passed with new hourly sources skipped by cadence
    and paused sources reporting readable skip reasons.
  - Rollup-writing Hunter run `27423574670` passed and updated
    `docs/source-health-latest.md`.
  - Production D1 reports 797 active opportunities and four healthy
    `source_fetch_state` rows.

Previous health audit and repair checkpoint:

- ATS follow-up report: `docs/ats-policy-follow-up-2026-06-12.md`
- Latest product commit:
  - `6304ea4` - requires token-specific review for Breezy ATS sources.
- Latest generated rollup commit:
  - `14db966` - refreshed `docs/source-health-latest.md`.
- Verification:
  - `bun run --cwd apps/web build` passed.
  - CI/deploy run `27372929451` passed.
  - Direct probes for current Breezy JSON endpoints returned 200.
  - Hunter run `27372988265` had one transient `20Four7VA` timeout; retry run
    `27373090226` passed with 0 failed sources, 0 failed insert batches, and
    0 insert errors.
  - Rollup-writing Hunter run `27373196600` passed.
  - Future unknown Breezy tokens now default to `paused`.

Previous health audit and repair checkpoint:

- ATS follow-up report: `docs/ats-policy-follow-up-2026-06-12.md`
- Product commit:
  - `aa670ee` - paused unreviewed/noisy ATS platforms by default.
- Generated rollup commit:
  - `f635f3f` - refreshed `docs/source-health-latest.md`.
- Verification:
  - `bun run --cwd apps/web build` passed.
  - CI/deploy run `27372355271` passed.
  - Manual Hunter run `27372436554` passed with 0 failed sources, 0 failed
    insert batches, and 0 insert errors.
  - Rollup-writing Hunter run `27372521005` passed.
  - Latest source-health rollup reports Workable ATS rows as `paused`.

Previous health audit and repair checkpoint:

- Follow-up report: `docs/wrangler-d1-audit-2026-06-12.md`
- Commit:
  - `ad03990` - upgraded active Wrangler tooling to v4 and refreshed the Bun
    lockfile for the current Astro workspace graph.
- Verification:
  - `bun install --frozen-lockfile` passed.
  - `bun run --cwd apps/web build` passed.
  - CI/deploy run `27371741236` passed.
  - Local Wrangler reports `4.100.0`.
  - Local read-only D1 audit works and reported 748 active opportunities.
  - Query plans use `active_posted_idx` and `category_active_posted_idx`.
  - Production routes smoked green and unauthenticated scrape POST returned 401.

Previous health audit and repair checkpoint:

- Audit report: `docs/major-audit-2026-06-11.md`
- Fix commits:
  - `e861071` - reduced scrape insert batch size after D1
    `too many SQL variables` failures.
  - `45e2f2d` - paginated category pages server-side and removed the large
    hydrated category payload.
  - `ae72998` - stopped tracking local `.wrangler` runtime state.
- Generated rollup commit:
  - `6e76c67` - refreshed `docs/source-health-latest.md`.
- Verification:
  - CI/deploy runs `27353756293`, `27353939869`, and `27354017177` passed.
  - Manual Hunter run `27354089629` passed with 35 accepted/attempted inserts,
    0 failed insert batches, 0 insert errors, and 0 failed sources.
  - Rollup-writing Hunter run `27354219672` passed with 0 failed sources and
    0 insert errors.
  - Production `/categories/tech` dropped from about 980 KB to about 94 KB.

The user resumed the original roadmap and approved continuing slice by slice.
P1 was implemented, pushed, passed CI, manually deployed, and smoked in
production. P2 indexes were implemented, pushed, migrated, and verified against
production query plans. P2 timestamp normalization was implemented, pushed,
deployed, and verified against production route smoke plus read-only D1 parsing
evidence. P3 Slice 1 added structured source results to the scrape route,
deployed it, and verified it through a manual Hunter workflow run. P3 Slice 2
made `inserted` reflect actual D1 changes and exposed failed insert batches and
insert errors in the scrape response. P3 Slice 3 added Hunter workflow warnings
and summary metrics for partial source failures, zero-count sources, and insert
accounting. P4 Slice 1 added conservative source compliance metadata and updated
the public data policy language. P4 Slice 2 reviewed RSS/HTML source evidence,
paused risky or unproductive sources, and kept paused sources visible as skipped
records in live scrape results. P4 Slice 3 de-duplicated ATS source fetches,
paused Workable-backed ATS rows after repeated HTTP 429s, and verified the live
Hunter workflow with no failed sources. P5 Slice 1 captured a read-only
production data-quality snapshot and made no production row mutations. P5 Slice
2 defined a no-mutation stale/source dry-run policy and found no immediate
archive action. P5 Slice 3 backfilled `application_url` from `source_url`,
updated future ingest/scrape writes to populate it, deployed the write path, and
proved the next Hunter insertion kept `application_url` populated. P6 Slice 1
removed Hunter's per-run alert commit/push path and now stores per-run
`harvest.log` plus `source-health-summary.md` artifacts. P6 Slice 2 added a
guarded daily/manual repo-readable rollup at `docs/source-health-latest.md`.
P7 completed the final acceptance audit and updated the README to match the
current production architecture and public-source policy.

## What Was Completed

- Major audit was documented in `docs/major-audit-2026-06-06.md`.
- Recovery-driven methodology was adopted.
- Active architecture was corrected in `AGENTS.md`.
- Roadmap, status, recovery trail, savepoint, and ADR were added.
- P0 is accepted at 5%.
- P1 is accepted at 20% overall.
- P2 is accepted at 35% overall.
- P3 Slice 1 is accepted at 40% overall.
- P3 Slice 2 is accepted at 45% overall.
- P3 is accepted at 55% overall.
- P4 Slice 1 is accepted at 60% overall.
- P4 Slice 2 is accepted at 65% overall.
- P4 is accepted at 70% overall.
- P5 Slice 1 is accepted at 75% overall.
- P5 Slice 2 is accepted at 80% overall.
- P5 Slice 3 is accepted at 85% overall.
- P6 Slice 1 is accepted at 90% overall.
- P6 Slice 2 is accepted at 95% overall.
- P7 is accepted at 100% overall.

Accepted P0 evidence:

- Commit: `9657c4a`
- CI run: `27040684807`
- Acceptance docs commit: `a6fcf70`
- CI run: `27040764996`

Accepted pause handoff evidence:

- Commit: `431ab60`
- CI run: `27041163556`
- Scope: docs-only recovery trail; no implementation files changed.

## What Was Completed In P1

- Added `apps/web/src/pages/opportunities.astro`.
- Reused existing opportunity cards and visual styling.
- Added server-side search/filtering and pagination to `/opportunities`.
- Changed homepage query limit from 500 to 60.
- Made the homepage a preview rather than the full search surface.
- Moved the global "Find a Job Now" CTA to `/opportunities`.
- Build passed with `npm.cmd run build --workspace apps/web`.
- Local route smoke passed for `/`, `/opportunities`, paginated/filter URLs,
  and `/directory`.
- Pushed commit `2475103`.
- GitHub Actions run `27141658140` passed.
- Deployed with Wrangler to `https://68b1259d.remotejobs-ph.pages.dev`.
- Public alias `https://remotejobs-ph.pages.dev/opportunities` returned 200.

## P1 Exploration Notes

Files read during P1 exploration:

- `apps/web/src/pages/index.astro`
- `apps/web/src/components/OpportunitySearch.tsx`
- `apps/web/src/pages/categories/[category].astro`
- `apps/web/src/components/CategoryOpportunitySearch.tsx`
- `apps/web/src/components/opportunity-card.tsx`
- `apps/web/src/lib/categories.ts`
- `apps/web/src/layouts/Layout.astro`
- `apps/web/src/components/nav.tsx`
- `apps/web/src/components/footer.tsx`
- `apps/web/astro.config.mjs`
- `packages/db/schema.ts`

Observed P1 facts:

- Homepage currently selects up to 500 active opportunities and hydrates them
  into `OpportunitySearch`.
- `/opportunities` is linked in navigation but has no active Astro page.
- Category pages already have a search/list pattern that can be reused.
- The simplest next slice is to add an Astro `/opportunities` page and reduce
  homepage data volume to a smaller latest-jobs preview.

## Next Safe Resume Task

No required recovery-roadmap work remains. The user explicitly asked for a
Gemini-ready masterplan and handoff. Start from
`docs/gemini-masterplan-handoff-2026-06-13.md`.

Recommended next slice:

1. Run `git status --short --branch`.
2. Read `docs/gemini-masterplan-handoff-2026-06-13.md`.
3. Prefer Workstream 1: compact source-health history, unless fresh CI/source
   evidence shows a more urgent issue.
4. Continue source-specific Breezy review and decide whether each current token
   remains `needs_review`, becomes `allowed`, or is paused.
5. Re-run query/index audits before adding indexes or enabling more sources.
6. Add at most one new source per slice, only after source-health evidence is
   green and the source has documented caps, cadence, and linkback posture.

Known follow-up: local direct D1 audits now work with Wrangler v4. Use
`bunx wrangler d1 info remoteph-jobs-db` for remote metadata and
`bunx wrangler d1 execute remoteph-jobs-db --remote --command "..."` for
read-only SQL probes. Continue ATS/source policy review for current Breezy
sources that remain `needs_review`; unknown future Breezy tokens now pause by
default.

P7 evidence:

- Final audit report: `docs/final-acceptance-audit-2026-06-09.md`
- Build: `npm.cmd run build --workspace apps/web` passed.
- Production smoke:
  - `/`, `/opportunities`, `/directory`, `/data-policy`, `/privacy`, and
    `/categories/tech` returned 200;
  - unauthenticated POST to `/api/cron/scrape` returned 401.
- D1 snapshot:
  - 688 active opportunities;
  - 0 missing `application_url`;
  - 0 unparseable freshness dates.
- Query plans:
  - homepage query uses `active_posted_idx`;
  - category query uses `category_active_posted_idx`.
- Source health:
  - `docs/source-health-latest.md` reports 0 failed sources for run
    `27204417574`.
- README:
  - replaced stale Next/old-source/pnpm language with current Bun,
    Astro/Cloudflare/D1, public-source indexing, and recovery-doc language.

P6 Slice 2 evidence:

- Workflow commit: `0ba92d2`
- CI run: `27204381138`
- Manual Hunter run: `27204417574` with `write_rollup=true`
- Hunter result: success.
- Artifact:
  - name: `hunter-health-27204417574`;
  - ID: `7506838648`.
- Generated rollup commit:
  - `d4b33a7` - `docs: update daily source health`;
  - created `docs/source-health-latest.md`.
- Live response:
  - HTTP 200;
  - `failedSources: []`;
  - `inserted: 0`;
  - `actualChanges: 0`;
  - `acceptedForInsert: 0`;
  - `attemptedInsert: 0`;
  - `insertFailedBatches: 0`;
  - `insertErrors: []`.
- Repo-readable rollup:
  - date: 2026-06-09;
  - run: `https://github.com/cyalcala/va-freelance-hub/actions/runs/27204417574`;
  - 0 failed sources;
  - 1 zero-count successful source;
  - 18 skipped sources.

P6 Slice 1 evidence:

- Commit: `f8fadfb`
- CI run: `27204009191`
- Manual Hunter run: `27204051068`
- Hunter result: success.
- Artifact:
  - name: `hunter-health-27204051068`;
  - ID: `7506687492`;
  - files: `harvest.log` and `source-health-summary.md`.
- Verification:
  - `git diff --check` passed with only normal CRLF warnings;
  - `rg` confirmed Hunter no longer contains `contents: write`, `git commit`,
    `git push`, or `scraper-alerts` references;
  - downloaded artifact summary reported 0 failed sources, 1 zero-count
    successful source, and 18 skipped sources;
  - after fetching `origin/main`, branch status was `## main...origin/main`,
    confirming no bot alert commit was created.
- Live response:
  - HTTP 200;
  - `failedSources: []`;
  - `inserted: 0`;
  - `actualChanges: 0`;
  - `acceptedForInsert: 0`;
  - `attemptedInsert: 0`;
  - `insertFailedBatches: 0`;
  - `insertErrors: []`.

P5 Slice 3 evidence:

- Commit: `2754740`
- CI run: `27203416725`
- Migration workflow: `27203416643`
- Build: `npm.cmd run build --workspace apps/web` passed.
- Deploy: `https://936f10a7.remotejobs-ph.pages.dev`
- Manual Hunter run: `27203556963`
- Hunter result: success.
- D1 evidence:
  - after migration: 687 active rows and 0 missing `application_url`;
  - after Hunter: 688 active rows and 0 missing `application_url`;
  - newest Hunter row `2138` preserved a distinct application URL from triage.
- Live response:
  - HTTP 200;
  - `failedSources: []`;
  - `inserted: 1`;
  - `actualChanges: 1`;
  - `acceptedForInsert: 1`;
  - `attemptedInsert: 1`;
  - `insertFailedBatches: 0`;
  - `insertErrors: []`.
- Public smoke:
  - `/`, `/opportunities`, and `/directory` returned 200;
  - `/api/cron/scrape` returned 401 without credentials;
  - `/api/click/2135` with the validated source URL returned 302.

P2 Slice 1 evidence:

- Commit: `be3d646`
- Migration workflow: `27155847940`
- CI run: `27155847992`
- Before: hot queries used temp B-trees.
- After: hot queries use `active_posted_idx`,
  `category_active_posted_idx`, and `active_last_verified_idx`.

P2 Slice 2 evidence:

- Commit: `e32e580`
- CI run: `27165936753`
- Build: `npm.cmd run build --workspace apps/web` passed.
- Deploy: `https://4bb0cf93.remotejobs-ph.pages.dev`
- Public smoke: `/`, `/opportunities`, `/opportunities?page=2`, and
  `/directory` returned 200.
- Protected API smoke: `/api/cron/scrape`, `/api/cron/verify-links`,
  `/api/ingest`, and `/api/ingest-digest` returned 401 without credentials.
- D1 read-only evidence: 672 active opportunities and 0 unparseable active
  values for `scraped_at`, `last_seen_in_feed_at`, and `last_verified_at` when
  parsed through SQLite `unixepoch`.
- ADR: `docs/decisions/ADR-002-canonical-utc-iso-timestamps.md`

P3 Slice 1 evidence:

- Commit: `27794d8`
- CI run: `27166648567`
- Build: `npm.cmd run build --workspace apps/web` passed.
- Deploy: `https://44501583.remotejobs-ph.pages.dev`
- Manual Hunter run: `27166770708`
- Hunter result: success.
- Live response:
  - HTTP 200;
  - inserted 11 jobs;
  - `actualChanges: 11`;
  - `backlogRemaining: 0`;
  - included `sourceResults` for RSS, HTML, and ATS sources;
  - preserved `failedSources`;
  - Remote.co was visible as `ok: false` with HTTP 520;
  - zero-count sources were visible as `ok: true`.
- Workflow follow-up: bot committed `ca1f06d` to
  `docs/scraper-alerts.md` for the Remote.co failure.
- D1 read-only evidence: active opportunities count was 683 after the manual
  Hunter run.

P3 Slice 2 evidence:

- Commit: `e86b854`
- CI run: `27167396371`
- Build: `npm.cmd run build --workspace apps/web` passed.
- Deploy: `https://cde106a3.remotejobs-ph.pages.dev`
- Manual Hunter run: `27198077806`
- Hunter result: success.
- Live response:
  - HTTP 200;
  - `inserted: 1`;
  - `actualChanges: 1`;
  - `acceptedForInsert: 1`;
  - `attemptedInsert: 1`;
  - `insertFailedBatches: 0`;
  - `insertErrors: []`;
  - Remote.co remained visible as a partial source failure.
- Workflow follow-up: bot committed `bc255c8` to
  `docs/scraper-alerts.md` for the Remote.co failure.
- D1 read-only evidence: active opportunities count was 686 after later
  scheduled/manual ingestion.

P3 Slice 3 evidence:

- Commit: `e0a32fb`
- CI run: `27198767290`
- Manual Hunter run: `27198807621`
- Hunter result: success.
- Annotation evidence: warning emitted with
  `1 source(s) failed. See sourceResults in harvest.log.`
- Live response:
  - HTTP 200;
  - `inserted: 1`;
  - `actualChanges: 1`;
  - `acceptedForInsert: 1`;
  - `attemptedInsert: 1`;
  - `insertFailedBatches: 0`;
  - `insertErrors: []`.
- Summary evidence: workflow wrote failed-source, zero-count source, failed
  insert batch, and insert error metrics to the GitHub step summary.
- Workflow follow-up: bot committed `baf2bd8` to
  `docs/scraper-alerts.md` for the Remote.co failure.
- D1 read-only evidence: active opportunities count was 687 after the latest
  manual Hunter run.

P4 Slice 1 evidence:

- Commit: `fa2d6eb`
- CI run: `27199810692`
- Build: `npm.cmd run build --workspace apps/web` passed.
- Deploy: `https://1896b637.remotejobs-ph.pages.dev`
- Manual Hunter run: `27199890298`
- Hunter result: success.
- Live response:
  - included `collectionMethod` and `complianceStatus` for RSS, HTML, and ATS
    source results;
  - all configured sources and ATS results are conservatively `needs_review`;
  - Remote.co remained visible as a partial source failure.
- Public smoke:
  - `/data-policy` returned 200;
  - page included the June 2026 update and public-visibility caution text;
  - `/api/cron/scrape` returned 401 without credentials.
- Workflow follow-up: bot committed `3174068` to
  `docs/scraper-alerts.md` for the Remote.co failure.
- D1 read-only evidence: active opportunities count was 687 after the latest
  manual Hunter run.

P4 Slice 2 evidence:

- Commit: `1143798`
- CI run: `27200812470`
- Build: `npm.cmd run build --workspace apps/web` passed.
- Deploy: `https://1a74a454.remotejobs-ph.pages.dev`
- Manual Hunter run: `27200899849`
- Hunter result: success.
- Source review doc: `docs/source-review-2026-06-09.md`
- Source decisions:
  - We Work Remotely and Remotive remain enabled as `allowed` RSS sources with
    attribution/linkback notes;
  - ProBlogger, Remote.co, Authentic Jobs, Dribbble Jobs, OnlineJobs.ph, and
    Jobspresso are paused.
- Live response:
  - HTTP 200;
  - `failedSources: []`;
  - We Work Remotely returned 100 RSS items;
  - Remotive returned 29 RSS items;
  - six paused sources returned `skipped: true` with pause reasons;
  - `inserted: 0`;
  - `actualChanges: 0`;
  - `insertFailedBatches: 0`;
  - `insertErrors: []`.
- Public smoke:
  - `/`, `/opportunities`, `/directory`, and `/data-policy` returned 200;
  - `/api/cron/scrape` returned 401 without credentials.
- D1 read-only evidence: active opportunities count was 687 after the latest
  manual Hunter run, with 0 row changes.

P4 Slice 3 evidence:

- Final commit: `95e6665`
- Supporting commits:
  - `e3714d8` - de-duplicated duplicate ATS token fetches.
  - `3256127` - throttled ATS polling after first Workable 429 proof.
- CI run: `27202145473`
- Build: `npm.cmd run build --workspace apps/web` passed.
- Deploy: `https://6b3bc9b2.remotejobs-ph.pages.dev`
- Manual Hunter run: `27202221523`
- Hunter result: success with no partial-failure annotation.
- ATS source review doc: `docs/ats-source-review-2026-06-09.md`
- Live response:
  - HTTP 200;
  - `failedSources: []`;
  - Breezy ATS fetched `20Four7VA` with 61 items, `Sourcefit` with 67 items,
    and `VAA Philippines` with 0 items;
  - 11 Workable-backed directory rows returned `skipped: true` with
    `complianceStatus: "paused"`;
  - `24/7 Virtual Assistant` returned `skipped: true` because the
    `breezy:20four7va` token was already fetched for `20Four7VA`;
  - `inserted: 0`;
  - `actualChanges: 0`;
  - `insertFailedBatches: 0`;
  - `insertErrors: []`.
- Public smoke:
  - `/`, `/opportunities`, and `/directory` returned 200;
  - `/api/cron/scrape` returned 401 without credentials.
- D1 read-only evidence: active opportunities count was 687 after the latest
  manual Hunter run, with 0 row changes.

P5 Slice 1 evidence:

- Snapshot doc: `docs/data-quality-snapshot-2026-06-09.md`
- D1 query mode: read-only; all sampled queries returned `changed_db: false`.
- Active opportunities: 687.
- Duplicate `source_url`, `content_hash`, and non-empty `description_hash`
  groups: 0 each.
- Missing fields:
  - `company`: 95;
  - `pay_range`: 524;
  - `client_timezone`: 687;
  - `application_url`: 687;
  - `experience_level`: 522;
  - `posted_at`: 62;
  - `description_hash`: 507;
  - `last_seen_in_feed_at`: 124.
- Freshness:
  - `posted_at` unparseable: 0;
  - posted older than 30 days: 247;
  - posted older than 60 days: 111;
  - posted older than 90 days: 81;
  - last seen in feed older than 30 days: 0.
- Category distribution:
  - `other`: 531;
  - `tech`: 86;
  - `admin`: 31;
  - `customer-service`: 20;
  - `design`: 18;
  - `marketing`: 1.
- Source policy split:
  - currently enabled source rows: 497;
  - now-paused source rows: 185;
  - unclassified source rows: 5 (`RemoteOK`).

P5 Slice 2 evidence:

- Dry-run report: `docs/stale-policy-dry-run-2026-06-09.md`
- D1 query mode: read-only; all sampled queries returned `changed_db: false`.
- Dry-run actions:
  - `keep_enabled_source`: 497 rows;
  - `hold_paused_recently_seen`: 175 rows;
  - `review_paused_missing_last_seen`: 10 rows;
  - `classify_source_before_action`: 5 rows.
- Candidate buckets:
  - paused-source rows missing `last_seen_in_feed_at`: 10;
  - unclassified `RemoteOK` rows: 5.
- Decision: no immediate production archival; hold recently seen paused-source
  rows through a grace window and classify `RemoteOK` first.

P5 Slice 3 suggested scope:

- Implement one reversible data-quality improvement.
- Good low-risk candidates:
  - derive `application_url` from `source_url` with before/after counts; or
  - add a repeatable stale-candidate script/endpoint; or
  - improve category triage for the highest-volume `other` source path.
- Do not archive production rows until the pause grace-window policy is
  reviewed.

## Stop Rule

If the user says stop, pause, or backup, stop implementation and only update
handoff/status docs plus GitHub backup evidence.
