# Comprehensive Audit Report - July 2026 (Part 1)

## Executive Summary

This audit executed the masterplan in
`docs/comprehensive-audit-masterplan-2026-07-07.md` with a multi-agent
sweep plus targeted manual verification. The ingestion-correctness
dimension received a full agent sweep (8 findings, every one re-verified
by hand against the code before action); the remaining dimensions received
targeted manual checks of their highest-risk suspects (agent capacity for
the full parallel sweep was exhausted mid-run; the remaining sweeps stay
queued under the masterplan). **Every confirmed finding was fixed in this
pass — no fix was deferred.**

Headline: the pipeline had four real correctness/robustness defects
(fail-open triage, unvalidated LLM URLs, feed-killing entity decode,
infinite re-triage of rejected items), one production-confirmed
performance regression (temp B-tree sort on every board render), and a
set of consistency/observability gaps. All are fixed, tested (91/91),
and the remaining risks are explicitly listed.

## System Health Score (evidence-based, this pass)

| Dimension | Score | Basis |
| --- | ---: | --- |
| Reliability | 8/10 | Fail-open paths closed; per-item feed guards added; bot fleet green 3+ days; deferred: full concurrency sweep |
| Correctness | 8/10 | Funnel now closed-form; enum/URL validation added; deferred: full frontend sweep |
| Security | 7/10 | No HTML-injection sinks (verified by grep); LLM URL output now sanitized; auth uniform; deferred: timing-safe compares, full workflow-injection sweep |
| Performance | 8/10 | Confirmed temp-B-tree regression fixed with expression index; deferred: /directory payload, events retention |
| Observability | 9/10 | Every new failure mode reports a counter + Hunter annotation; bot fleet files issues |
| Resilience | 8/10 | Hostile-input guards, fail-closed AI, graceful degradation everywhere added since 07-04 |
| Extensibility | 6/10 | Shared modules extracted (hash/text/urls/pause), but scrape.ts remains ~900 lines; dead code pending sign-off |
| **Overall (weighted)** | **7.8/10** | Weights: rel 25, corr 20, sec 20, perf 10, obs 10, res 10, ext 5 |

## Production Baseline (2026-07-08, read-only)

- Active 1,909 / total 2,232; companies 297; events 2,066 (35 sources)
- Never-verified backlog: **80** (456 on 07-04 -> 178 -> 80: draining as designed)
- Exact-duplicate company groups: 1 (down from earlier estimates; W7 item)
- All pulse workflows green; zero degradation issues filed (correctly silent)

## Confirmed Findings And Fixes (this pass)

### A-1 (high) Triage failed open during AI outages
`triage.ts` returned `eligibleForFilipinos: true, category: "other"` when
the AI binding was missing or every model failed — an outage would silently
fill the board with unfiltered listings. **Fix:** fallback results now carry
`aiUnavailable: true`; the scrape route fails closed (skips them; their
URLs are not inserted, so they naturally retry next run), reports
`triageAiUnavailable`, and Hunter warns on it.

### A-2 (high) Unvalidated LLM-extracted applicationUrl overrode verified URLs
`applicationUrl: triage.applicationUrl || item.applicationUrl || sourceUrl`
let a raw model string (extracted from attacker-controlled description
text, checked only with `typeof === "string"`) win precedence — hallucinated
fragments, bare emails, or `javascript:` values could be stored. Not
currently rendered anywhere (verified), so data-corruption not live-XSS.
**Fix:** new shared `sanitizeApplyUrl()` (http/https/mailto only, real
hostname, emails upgraded to `mailto:`, 2 KB cap) gates every candidate;
verified URLs win when the model string fails validation. 8 tests.

### A-3 (medium) One hostile numeric entity zeroed an entire feed per run
`decodeHtmlEntities` called `String.fromCodePoint` unguarded (duplicated in
rss.ts and json.ts); `&#1114112;` in any single item threw RangeError inside
the item map, rejecting the whole fetch — every valid job in that source was
discarded, recurring until the item rotated out. **Fix:** shared
`text.ts` with `safeFromCodePoint` (range + surrogate guards, never throws),
plus a per-item try/catch in the RSS mapper so one malformed item can never
sink its feed. Regression tests included.

### A-4 (medium) Rejected items were re-triaged forever and could starve the queue
Ineligible jobs were dropped with no record; still present in feeds, they
re-entered `newItems` every run — paying Workers AI cost each time — and a
cluster at the head of a large feed could permanently block items behind
the per-run limit (head-of-line starvation). **Fix:** rejected items are now
persisted as `is_active = 0` rows tagged `triage-rejected`, so their URLs
join dedup; the all-rejected early-return was removed so this holds even
when a whole batch is ineligible. Response reports `rejectedPersisted`.

### A-5 (medium, production-confirmed) Board sort used a temp B-tree every render
`EXPLAIN QUERY PLAN` on production showed `USE TEMP B-TREE FOR ORDER BY`
for the freshness sort (`coalesce(posted_at, scraped_at) DESC`) — the F-17
freshness fix had silently broken the P2 index alignment; every board render
sorted all ~1.9k active rows. **Fix:** migration
`0018_effective_posted_idx.sql` adds an expression index
`(is_active, coalesce(posted_at, scraped_at) DESC)`. Verified on local D1:
plan now uses `active_effective_posted_idx` with no temp B-tree. Applied to
production via the standard `deploy-migrations.yml` pipeline on push.

### A-6 (low->fixed) RSS `<category>` objects stored as "[object Object]" tags
Attributed category elements stringified to junk tags. **Fix:** shared
`xmlNodeText`/`xmlTextList` unwrap `#text` nodes; also applied to
title/creator/description unwrapping. Tests included.

### A-7 (low->fixed) Scrape funnel was not closed-form
Items with empty `sourceUrl` vanished uncounted. **Fix:** `droppedNoUrl`
counter in the response; funnel now reconciles: raw = droppedNoUrl +
already-known + processed + deferred-backlog.

### A-8 (low->fixed) Unmatched auto-pause entries paused nothing, silently
A typo'd/drifted `sourceId` in paused-sources.json matched no source and was
ignored. **Fix:** the scrape route reconciles pause entries against the
actual source universe (static ids + live ATS `platform:token` keys) and
reports `unmatchedPauses`; Hunter warns when non-empty.

### A-9 (consistency) content_hash had four private copies and a false schema comment
Four scrapers each carried identical private hash functions while
`schema.ts` claimed the column was sha256 (only a dead legacy script,
`scripts/gha/harvest.ts`, ever wrote sha256 — it is referenced by no
workflow). **Fix:** single shared `contentHash.ts` with honest documentation
(64-bit; collision math ~1e-13 at current scale; primary dedup is UNIQUE
source_url), schema comment corrected. harvest.ts flagged as dead code for
the W8 cleanup (deletion needs user sign-off).

## Cross-Dimension Manual Checks (done this pass)

- **XSS sinks:** zero `set:html` / `dangerouslySetInnerHTML` in apps/web/src
  (grep-verified); framework auto-escaping stands between scraped content
  and the DOM.
- **applicationUrl exposure:** not rendered by any component (grep-verified);
  cards route through sourceUrl.
- **Dead-writer check:** scripts/gha/harvest.ts referenced by no workflow;
  chef.ts IS live (gha-chef-pulse).
- **Duplicate directory companies:** exactly 1 exact-lowercase group in
  production (W7 unique-index migration still recommended).

## Before / After (this pass)

| Metric | Before | After |
| --- | --- | --- |
| Board render sort | temp B-tree over ~1.9k rows | index-served (verified plan) |
| AI outage behavior | silently fills board unfiltered | fail-closed, counted, annotated |
| Hostile feed item | zeroes entire source per run | item skipped, feed survives |
| Rejected jobs | re-triaged every run forever | persisted inactive, never re-paid |
| applicationUrl | raw LLM string wins | sanitized precedence, tested |
| content_hash impl | 4 private copies + false docs | 1 shared module, honest docs |
| Funnel accounting | leaky (uncounted drops) | closed-form with counters |
| Tests | 79 | 91 (12 new regression tests) |

## Remaining Technical Debt / Deferred (tracked in masterplan)

1. Full agent sweeps of security/concurrency/performance/frontend/workflows/
   data-integrity/code-quality dimensions (W2-W8) — agent capacity exhausted;
   targeted manual checks of the top suspects were done instead this pass.
2. `/directory` ~232 KB payload; `source_fetch_events` retention (~4.6k
   rows/week); timing-safe secret compares; va_directory unique-index +
   merge migration; dead-path deletions (needs sign-off:
   apps/web-nextjs-backup, packages/zig-parser, .trigger, harvest.ts,
   list_models.ts, onlinejobs_test.html, root xlsx/db files, dual lockfiles);
   scrape.ts modularization (~900 lines); 3 search components unification.

## Part 2 - Concurrency & Security Sweep (2026-07-10)

The concurrency-idempotency and security dimensions completed their agent
sweep (the other five errored on session capacity and remain queued). 14
findings; the verifier agents could not run (same capacity limit), so every
finding was re-verified manually against the code before action. All
confirmed items were fixed this pass.

### B-0 (CRITICAL, confirmed) Live legacy secrets in committed build artifacts
`git ls-files` showed 63 tracked files under
`apps/web-nextjs-backup/.wrangler/`; the `worker.js` dev bundles hardcoded a
Turso rw JWT, a Trigger.dev `tr_dev_` key, and `ISR_SECRET`. `.wrangler/` was
gitignored later (F-03) but never untracked these pre-existing copies. The
active app has zero tracked `.wrangler` files. **Fix:** `git rm --cached` the
whole tree (commit `f85eed9`). **Owner action still required:** rotate all
three secrets at their providers — the values survive in git history until a
separate history purge (filter-repo/BFG + force-push) is run with consent.
These are legacy-stack credentials (Turso/Trigger.dev are deprecated, not the
D1 production path), which bounds but does not eliminate the exposure.

### B-1 (HIGH, confirmed) verify-links stale-archive could wedge on the D1 param limit
`db.update(...).where(inArray(id, stale.map(...)))` binds 2 + N parameters;
batch-bumped `lastSeenInFeedAt` makes 100+ rows from a dead/paused source
cross the 30-day cutoff together, so N > 98 threw "too many SQL variables"
and — being the first operation — killed the whole verifier run (stale-archive
AND link verification). Same class as the 2026-07-04 S-1 fix. **Fix:** chunk
the archive UPDATE via `chunkArray(..., 90)`.

### B-2 (HIGH, confirmed) /api/ingest mass-assignment + unsanitized apply URL
The live endpoint (advertised as `INGEST_API_URL` in Hunter) spread `...item`
into the row, letting any secret-holder set `isActive`, `clickCount`, `id`,
`contentHash`, and store an unsanitized `applicationUrl` — the exact bypass
A-2 closed in the scrape route. **Fix:** explicit allow-list mapping;
`sanitizeApplyUrl` on the apply URL; server-computed `contentHash`
(shared module) and `descriptionHash`; forced `isActive=true`,
`clickCount=0`; enum validation for type/locationType/experienceLevel; rows
without an http(s) `sourceUrl` are rejected and counted (`rejectedForUrl`);
switched to bare `onConflictDoNothing()` so a content_hash collision is
absorbed rather than thrown.

### B-3 (HIGH, confirmed) ci-guardrail had no concurrency group -> out-of-order deploys
Two close pushes to main (a realistic daily pattern: Sentinel PAT merge +
Hunter rollup) ran ci-guardrail in parallel; the older commit's
`wrangler pages deploy` could finish last and overwrite the newer production
deployment, both green. **Fix:** `concurrency: ci-guardrail-${{ github.ref }}`
with `cancel-in-progress: false` serializes deploys in push order.

### B-4 (MEDIUM, confirmed) ingest-digest single un-chunked insert
`items.length <= 200` was validated but a single `insert(values(all))` over
~9-column rows 500s past ~11 items. Latent (Chef posts 1) but a false
promise. **Fix:** chunk via `maxRowsPerD1Batch(9)`.

### B-5 (MEDIUM, confirmed) deploy-migrations concurrency + ordering
No concurrency group (concurrent applies could race wrangler's tracking
table). **Fix:** `concurrency: d1-migrations`. Code-before-migration ordering
across the two independent workflows is noted as a follow-up (documented
below) since it needs a larger restructure.

### B-6 (MEDIUM, confirmed) bot git pushes had no rebase-retry
Hunter rollup and Medic did `git push origin HEAD:main` with no retry; a
concurrent push in the window failed the job — costing Medic a whole week's
digest. **Fix:** bounded 5-attempt `push || pull --rebase` loop in both
(each bot owns its own file, so rebases are conflict-free).

### B-7 (MEDIUM, confirmed) Sentinel same-day branch collision
If a run pushed `bot/auto-pause-DATE` then died before `gh pr create`, the
next same-day run failed non-fast-forward and the pause never shipped.
**Fix:** `git push --force-with-lease` makes the branch push re-entrant
(safe — the open-PR guard already returned zero open PRs for that head).

### B-8 (MEDIUM, confirmed) /api/click unthrottled public DB write
A crawler/attacker looping `GET /api/click/<id>?url=<valid>` drove unbounded
D1 writes (clickCount inflation + write-quota exhaustion that could throttle
ingest). The redirect target was already validated (not an open redirect) and
the increment already atomic. **Fix:** `API_RATE_LIMITER` gate (60/60s per IP)
placed AFTER redirect-target validation so the rate-limited path still only
redirects to a validated URL, and over-limit still redirects — it just skips
the write.

### B-9 (LOW, confirmed) fixes bundled in
- verify-links `failedVerificationCount` now increments via atomic SQL
  (`col + 1`) instead of JS read-modify-write from the run snapshot.
- Shared `src/lib/auth.ts` with a constant-time secret compare; applied to
  prune and verify-links (which also gained rate limiting). scrape/ingest/
  ingest-digest keep their working inline checks — adopting `isAuthorized`
  there is a documented consistency follow-up (timing channel is theoretical).

### Part 2 refuted / deferred as latent
- **Workable rotation liveness** (verifiedAt only advances on success ->
  starvation): real but LATENT — Workable is disabled
  (`ATS_PLATFORM_POLICIES.workable.enabled = false`) and Sentinel would pause
  the flapping tokens. Documented as a must-fix-before-re-enabling-Workable
  item rather than changed now.
- **Cadence-guard TOCTOU** (concurrent scrape double-fetch): LOW — GitHub's
  per-workflow concurrency group serializes the only real caller; data stays
  correct (idempotent writes). Documented; the atomic-claim rewrite is a
  follow-up.

## Before / After (Part 2)

| Metric | Before | After |
| --- | --- | --- |
| Secrets in tracked files | 3 live legacy secrets in 63 artifacts | 0 tracked (rotation pending owner) |
| verify-links on 100+ stale rows | throws, wedges whole verifier | chunked, survives |
| /api/ingest column control | client sets any column | server-owned allow-list |
| /api/ingest apply URL | unsanitized | sanitizeApplyUrl |
| ingest-digest > 11 items | 500 | chunked |
| Close pushes to main | parallel, deploy race | serialized in order |
| Bot push vs concurrent push | job fails, digest lost | rebase-retry (x5) |
| /api/click flood | unbounded DB writes | 60/60s per IP |
| Secret compare | short-circuit (timing) | constant-time (prune, verify-links) |

## Part 3 - Performance, Frontend, Workflows, Data-Integrity, Code-Quality (2026-07-11)

The agent fleet was capacity-blocked for this pass, so all five remaining
dimensions were audited by direct static analysis (read-only tools need no
classifier) plus live production `EXPLAIN QUERY PLAN` probes. Confirmed items
were fixed; suspected items that the code/plan disproved are recorded as
verified-clean so a future pass need not re-investigate them.

### C-1 (MEDIUM, confirmed) Drizzle schema drift on the 0018 expression index
`schema.ts` declares all opportunities indexes EXCEPT
`active_effective_posted_idx` (added by migration 0018 to fix the board-sort
temp B-tree). Because the schema is the ORM source of truth, a future
`drizzle-kit generate` would diff the schema against the DB and emit a
migration DROPPING the index — silently regressing the A-5 performance fix.
Blast radius is bounded today (deploy uses `wrangler d1 migrations apply`,
not drizzle push; `migrate.ts`/`push.ts` target the dead Turso path), so it
is a latent trap, not an active regression. **Fix:** declared the expression
index in `schema.ts` via `index(...).on(table.isActive, sql\`coalesce(...)
DESC\`)` so schema and DB agree and no drop can be generated.

### C-2 (LOW, confirmed) Hunter/Verifier passed a total-outage curl as a warning
The scrape/verify calls failed the step on `HTTP_CODE -ge 400`, but a curl
CONNECTION failure returns code `000`, and `000 -ge 400` is false — so a full
Cloudflare/network outage produced all-zero metrics and only a soft warning
(a mild watermelon; Prune already used the stricter `!= "200"`). **Fix:**
both now fail on any non-2xx (`< 200 || >= 300`), catching `000`, 1xx, and
3xx.

### Part 3 verified-CLEAN (suspected, disproved by reading the code / live plan)
- **Rejected-row leak (highest-stakes correctness):** every user-facing
  opportunities query in index/opportunities/[category].astro filters
  `is_active = 1` (count, list, and facet queries alike), so the new inactive
  `triage-rejected` rows can never surface on any page, search, or filter.
- **Category-page temp B-tree:** live production `EXPLAIN QUERY PLAN` for the
  `WHERE is_active AND category=? ORDER BY coalesce(posted_at, scraped_at)
  DESC` query shows `USING INDEX active_effective_posted_idx` with NO temp
  B-tree — the 0018 index serves category pages too (SQLite applies category
  as a residual filter rather than sorting).
- **Pagination edge cases:** `?page=0`, negative, and non-numeric all clamp to
  page 1 via `Number.isFinite(p) && p > 0 ? p : 1` in both paginated pages;
  beyond-last shows an empty page, no 500.
- **Mixed timestamp formats:** every insert path (scrape, ingest,
  rejected-items) writes an ISO `scrapedAt`, so the `datetime('now')` table
  default never fires — no format drift introduced.

### Part 3 advisory (LOW, not changed)
- The Workers AI model list is duplicated between `triage.ts` and the two
  workflow `ai_diagnose` bash helpers; a model deprecation needs three edits.
  Low impact (the diagnosis path degrades gracefully), noted for a future
  config-extraction pass.

## Before / After (Part 3)

| Item | Before | After |
| --- | --- | --- |
| schema.ts vs DB indexes | 0018 index undeclared (drop trap) | declared, schema == DB |
| Hunter/Verifier on total outage | all-zero metrics + warning | hard failure on any non-2xx |
| Rejected rows on UI | (verified) never surface | (verified) never surface |
| Category page sort | (verified) index-served | (verified) index-served |

## Prioritized Roadmap (updated)

- **Owner, immediate:** rotate the Turso / Trigger.dev / ISR secrets; decide
  whether to purge git history (destructive, needs consent).
- **Next 30 days:** finish the 5 queued dimension sweeps (performance,
  frontend, workflows-CI, data-integrity, code-quality); events retention
  migration; va_directory unique index; adopt `isAuthorized` in the remaining
  three routes.
- **Next quarter:** code-before-migration ordering (merge migrate step into
  ci-guardrail before deploy); Workable rotation liveness (attempt-based
  cursor) before re-enabling Workable; scrape.ts modularization; /directory
  pagination; dead-code removal (incl. deleting apps/web-nextjs-backup after
  secret rotation).
- **Opportunistic:** search-component unification; cadence-guard atomic claim;
  Tier-3 PAT activation (setup in docs/maintenance-bot-2026-07-04.md).
