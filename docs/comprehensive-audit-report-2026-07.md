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

## Prioritized Roadmap

- **Next 30 days:** finish W2 (concurrency) + W3 (security) sweeps; events
  retention migration; va_directory unique index.
- **Next quarter:** scrape.ts modularization with extracted pure functions +
  tests; /directory pagination; dead-code removal batch.
- **Opportunistic:** search-component unification; Tier-3 PAT activation for
  autonomous pauses (setup steps in docs/maintenance-bot-2026-07-04.md).
