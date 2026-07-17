# Freshness Masterplan — Disposition & Implementation - 2026-07

A DeepSeek-authored "sub-1-hour freshness on $0" masterplan was reviewed and
implemented **selectively**. This records what was adopted, adapted, rejected,
and deferred — with the engineering reasons — so a future AI does not
re-litigate settled calls or implement pieces that conflict with this system's
constraints (true $0, and a compliance-first source policy).

## Disposition table

| Proposal | Verdict | Reason |
| --- | --- | --- |
| Cloudflare **Queues** + producer/consumer + retry/dead-letter queues | ❌ Rejected | Queues requires the **Workers Paid plan** — violates the hard $0 constraint. Also over-engineered for ~35 sources/run: per-source failure isolation and idempotent re-runs already exist. |
| Dead-letter queue + alerts + GitHub issue on permanent failure | ✅ Already built | The Sentinel pulse (auto-pause after 4 consecutive fails) + AI-diagnosed `source-health` GitHub issues **are** the dead-letter flow, without a paid queue. |
| `scrape_audit_log` table (every attempt with outcome) | ✅ Already built | `source_fetch_events` (thousands of rows; feeds the weekly Medic digest). |
| Discovery layer + `company_candidates` table + confidence scoring | ✅ Already built (better) | The Prospector shipped **stateless** — it recomputes candidates from live jobs each run, so no accumulation table is needed. Two quality gates already implemented. |
| Retries with exponential backoff | 🔄 Adapted | The next scheduled run **is** the macro-retry (all writes are idempotent). An in-run retry loop was intentionally NOT added — it doubles latency on a bad source for marginal gain when a retry lands 15 min later anyway. |
| **Conditional requests (ETag / If-Modified-Since) + body-hash diff** | ✅ **Implemented** | The real Phase-2 gem. Unchanged feeds now skip parse+triage entirely — less compute **and** less load on third parties (compliance-positive). See below. |
| Sitemap pre-fetch; 5-minute polling | ❌ Rejected | ATS boards don't expose useful sitemaps; RSS **is** the change feed. 5-min polling would violate source terms this project honors (e.g. Jobicy asks for only a few checks/day). The per-source cadence guards stay authoritative. |
| **Sub-1-hour freshness** | ✅ **Implemented — correct mechanism** | The actual bottleneck is **GitHub Actions free-cron lag** (observed 1.5–3h). Fix: a tiny **Cloudflare Cron Trigger Worker** (free plan) pinging the scrape endpoint every 15 min. No queues needed. See `workers/freshness-cron/`. |
| Zod schemas everywhere + admin schema-recovery UI + field mapper | ❌ Rejected (for now) | Scrapers already have defensive per-item parsing and per-item isolation (one bad item can't sink a feed — 2026-07 audit). An authenticated admin UI is new attack surface for marginal value at ~2k jobs. Revisit only if schema breakage becomes frequent. |
| AI-CONTEXT.md / error catalog / decision logs (Phase 3) | 🔄 Compact version | `AGENTS.md` + the recovery-doc trail already serve AI onboarding. Added a concise `docs/error-catalog.md`; did not build the full decision-log apparatus. |
| **D1 FTS5 full-text search** (Phase 6) | 🕐 Deferred (documented) | Genuinely good and free. But it is a real migration + trigger + API + UI slice — the right *next* headline feature, not a same-session add. Scoped below. |

## What was implemented this pass

### 1. Conditional requests + body-hash diff (compute + compliance win)

- `packages/scraper/conditional.ts`: `conditionalFetchText()` sends
  `If-None-Match` / `If-Modified-Since` from stored validators and hashes the
  body so an identical 200 also counts as "not modified". 7 unit tests.
- RSS / JSON / HTML fetchers now return `SourceFetchOutput` (items + validators
  + `notModified`); an unchanged feed returns early and skips parse.
- Migration `0020_conditional_fetch_state.sql` adds `etag`, `last_modified`,
  `last_body_hash` to `source_fetch_state`; scrape.ts persists and re-sends
  them, and reports `sourcesUnchanged` in the response.
- ATS feeds (Greenhouse/Ashby) were left on unconditional fetch this pass —
  a documented follow-up (their per-token state is a separate path).

### 2. Cloudflare Cron Trigger Worker (the freshness fix)

- `workers/freshness-cron/` — a ~40-line Worker whose cron fires every 15 min
  and POSTs the scrape endpoint with `PROXY_SECRET`. Deployed by
  `.github/workflows/gha-deploy-cron-worker.yml`. **One manual step:**
  `wrangler secret put PROXY_SECRET` (see the worker README). Free plan.
- The GitHub Hunter remains as a fallback + the health rollup/alert owner.

### 3. Run-level lock (concurrency, closes an audit item)

- With two triggers now hitting the scrape endpoint, overlapping runs became a
  real risk. `acquireRunLock()` claims a reserved `source_fetch_state` row with
  an atomic conditional UPDATE (TTL 8 min, crash-safe auto-expiry). This also
  closes the cadence-guard TOCTOU the 2026-07 audit deferred.

## Success criteria (post-deploy)

- Migration `0020` applied green; scrape response includes `sourcesUnchanged`.
- Once the Worker secret is set: `source_fetch_events` timestamps land ~15 min
  apart (not GitHub's laggy 1.5–3h gaps) → job-to-site latency < 60 min.
- On a quiet run, `sourcesUnchanged > 0` (feeds correctly skipped).
- No double-processing when Worker + Hunter overlap (run-lock).

## Deferred, scoped for a future session

- **D1 FTS5 search** (Phase 6): create an FTS5 virtual table over active
  opportunities (title/company weighted, description low), keep it in sync with
  triggers on insert/update/deactivate, add a `/api/search` (BM25) + a
  debounced typeahead UI. Free, ~1 focused session. Highest-value next feature.
- **ATS conditional fetch**: extend the ETag/hash diff to the per-token ATS
  path.
- Optional: promote trusted-platform ATS-enable proposals to auto-merge via the
  Sentinel PAT (already designed in the maintenance-bot doc).
