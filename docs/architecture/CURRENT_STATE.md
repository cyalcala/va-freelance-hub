# VA FREELANCE HUB — CURRENT ARCHITECTURAL STATE
## Complete Mapping of the 17 Core Production Paths

```yaml
document_metadata:
  document_type: ARCHITECTURAL_ANALYSIS
  document_status: ACTIVE_OPERATIONAL
  version: "1.0.0"
  effective_at: "2026-09-26T12:57:00+08:00"
  applies_to_commit: "b9dc5e6c1341c2c0199be06fa713919e1b21235b"
  authority_tier: 2
  phase: "Phase 0 (Reconnaissance, Runtime Bounds & Empirical Baseline)"
```

> **The authoritative topological map of VA Freelance Hub.**
>
> Maps every production execution path, entry point, processing stage, and governance boundary across the system as verified on live production infrastructure.

---

## 1. ARCHITECTURAL TOPOLOGY OVERVIEW

```text
┌────────────────────────────────────────────────────────────────────────────────┐
│                       SOVEREIGN GOVERNANCE & RELEASE PLANE                     │
│  CONSTITUTION.md v5.2 │ OPERATIONS.md │ ENFORCEMENT.md │ Sovereign CI Guardrail│
└──────────────────────────────────────┬─────────────────────────────────────────┘
                                       │ Enforces Invariants, Secret Scan & Gates
┌──────────────────────────────────────▼─────────────────────────────────────────┐
│                     EDGE EXECUTION & INGESTION CLOCK                           │
│  Cloudflare Freshness Worker (every 10m) ──> POST /api/cron/scrape             │
│                                          ──> POST /api/cron/shadow-dispatch    │
└───────────────────┬───────────────────────────────────┬────────────────────────┘
                    │                                   │
                    ▼                                   ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────────────┐
│       CENTRAL ORCHESTRATION          │  │       SHADOW OBSERVATION ENGINE      │
│  packages/scraper/policy-resolver.ts │  │  packages/scraper/shadow-dispatcher │
│  packages/scraper/geoGate.ts         │  │  packages/scraper/candidate-shadow   │
│  packages/scraper/triage.ts          │  │  source_shadow_observations          │
└───────────────────┬──────────────────┘  └──────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│                  PUBLICATION GATEWAY & D1 STORAGE LEDGER                       │
│  packages/scraper/publication-gateway.ts ──> source_publication_ledger         │
│  packages/db (Cloudflare D1 SQLite)      ──> opportunities, va_directory       │
└──────────────────────────────────────┬─────────────────────────────────────────┘
                                       │ Serves Read-Only Queries
┌──────────────────────────────────────▼─────────────────────────────────────────┐
│                         PUBLIC SERVING MART (ASTRO)                            │
│  GET / │ GET /opportunities │ GET /jobs/[id] │ GET /directory │ GET /categories│
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. THE 17 CORE PRODUCTION PATHS

### Path 1: Public Serving Mart — Homepage & Current Board
- **Entry Point:** `apps/web/src/pages/index.astro`
- **Cadence / Trigger:** On demand via HTTP `GET /`
- **Runtime Environment:** Cloudflare Pages (SSR server entrypoint `dist/_astro/`)
- **Boundaries & Dependencies:** Read-only D1 query selecting active opportunities with recency sorting.
- **Safety / Compliance Gate:** Filter `is_active = 1 AND is_ph_eligible = 1`.
- **Commit Anchor:** `b9dc5e6`

### Path 2: Public Serving Mart — Filterable Opportunities Index & Search
- **Entry Point:** `apps/web/src/pages/opportunities/index.astro` and `apps/web/src/pages/api/opportunities.ts`
- **Cadence / Trigger:** On demand via HTTP `GET /opportunities` and search queries
- **Runtime Environment:** Cloudflare Pages with React island hydration (`OpportunitySearch.CmJmrpMH.js`)
- **Boundaries & Dependencies:** D1 SQLite Full-Text Search (`opportunities_fts` virtual table).
- **Safety / Compliance Gate:** FTS query sanitized; fresh filters (`fresh=today`, `fresh=24h`); cross-company apply hosts quarantined.
- **Commit Anchor:** `b9dc5e6`

### Path 3: Public Serving Mart — Eligible Opportunity Detail
- **Entry Point:** `apps/web/src/pages/jobs/[id].astro`
- **Cadence / Trigger:** On demand via HTTP `GET /jobs/[id]`
- **Runtime Environment:** Cloudflare Pages (SSR)
- **Boundaries & Dependencies:** D1 query by integer opportunity `id`.
- **Safety / Compliance Gate:** Inactive opportunities redirect or render non-indexable status; JSON-LD structured data serialized safely without script breakout.
- **Commit Anchor:** `b9dc5e6`

### Path 4: Public Serving Mart — Category-Specific Job Pages
- **Entry Point:** `apps/web/src/pages/categories/[slug].astro`
- **Cadence / Trigger:** On demand via HTTP `GET /categories/[slug]`
- **Runtime Environment:** Cloudflare Pages (SSR)
- **Boundaries & Dependencies:** 9 public slugs mapped via `mapTriageCategoryToUiCategory`.
- **Safety / Compliance Gate:** Validates slug against canonical taxonomy; prevents unmapped category leakage.
- **Commit Anchor:** `b9dc5e6`

### Path 5: Public Serving Mart — VA Company Directory
- **Entry Point:** `apps/web/src/pages/directory/index.astro`
- **Cadence / Trigger:** On demand via HTTP `GET /directory`
- **Runtime Environment:** Cloudflare Pages (SSR)
- **Boundaries & Dependencies:** Queries `va_directory` table for verified Philippine VA agencies.
- **Safety / Compliance Gate:** Soft-hide for dead links (`link_fail_count >= 3`); preserves `bot_wall` entries without false-negative deactivations.
- **Commit Anchor:** `b9dc5e6`

### Path 6: Public Serving Mart — Outbound Application Link Redirection
- **Entry Point:** `apps/web/src/pages/api/outbound/[id].ts`
- **Cadence / Trigger:** On demand via HTTP `GET /api/outbound/[id]`
- **Runtime Environment:** Cloudflare Pages (Astro API route)
- **Boundaries & Dependencies:** D1 lookup of `application_url` and `source_url`.
- **Safety / Compliance Gate:** Strict URL allowlist; forbids javascript/data schemes; falls back safely to source listing on cross-host anomalies.
- **Commit Anchor:** `b9dc5e6`

### Path 7: Public Serving Mart — Sitemap & Search Engine Metadata
- **Entry Point:** `apps/web/src/pages/sitemap.xml.ts` and `apps/web/public/robots.txt`
- **Cadence / Trigger:** On demand via HTTP `GET /sitemap.xml`
- **Runtime Environment:** Static and dynamic XML generation
- **Boundaries & Dependencies:** Queries active jobs and directory slugs.
- **Safety / Compliance Gate:** Only includes active, Philippine-eligible vacancies.
- **Commit Anchor:** `b9dc5e6`

### Path 8: Public Serving Mart — Policy & Privacy Surfaces
- **Entry Point:** `apps/web/src/pages/data-policy.astro` and `apps/web/src/pages/privacy.astro`
- **Cadence / Trigger:** On demand via HTTP `GET /data-policy`
- **Runtime Environment:** Static pre-rendered pages
- **Boundaries & Dependencies:** Static content reflecting Operating Constitution v5.2 data principles and opt-out instructions.
- **Safety / Compliance Gate:** Provides contact mechanism for 24-hour source opt-out requests.
- **Commit Anchor:** `b9dc5e6`

### Path 9: Primary Ingestion Clock — Cloudflare Freshness Worker
- **Entry Point:** `workers/freshness-cron/src/index.ts`
- **Cadence / Trigger:** Scheduled Cloudflare Cron Trigger (every 10 minutes)
- **Runtime Environment:** Cloudflare Workers (V8 isolate, 128 MB RAM limit)
- **Boundaries & Dependencies:** Calls authenticated endpoints using `PROXY_SECRET`.
- **Safety / Compliance Gate:** Verifies `PROXY_SECRET` presence; enforces processing timeouts within 15-minute window; records heartbeat telemetry.
- **Commit Anchor:** `b9dc5e6`

### Path 10: Central Ingestion Orchestrator — Authenticated Scrape Route
- **Entry Point:** `apps/web/src/pages/api/cron/scrape.ts`
- **Cadence / Trigger:** HTTP `POST /api/cron/scrape` (triggered by Path 9)
- **Runtime Environment:** Cloudflare Pages Functions
- **Boundaries & Dependencies:** Consumes feeds via `packages/scraper`; updates `source_fetch_state`, `source_fetch_events`.
- **Safety / Compliance Gate:** Protected by Bearer token; acquires atomic run lock (`acquireRunLock`); enforces `ROBOTS_ENFORCE_SOURCE_IDS`; protected by C16 orchestrator modification CI gate.
- **Commit Anchor:** `b9dc5e6`

### Path 11: Publication Gateway & Ledger — Capped Ingestion
- **Entry Point:** `packages/scraper/publication-gateway.ts: publishPublicExposure`
- **Cadence / Trigger:** Called by Path 10 during opportunity ingestion
- **Runtime Environment:** Edge runtime executing against Cloudflare D1
- **Boundaries & Dependencies:** Sole authorized writer to public `opportunities` mart.
- **Safety / Compliance Gate:** Verifies `source_registry.operational_state IN ('active', 'canary')`; enforces per-tick canary cap via D1 trigger `source_publication_ledger_canary_tick_cap`; immutable append-only ledger receipts.
- **Commit Anchor:** `b9dc5e6`

### Path 12: Shadow Observation Engine — Candidate Probes
- **Entry Point:** `packages/scraper/shadow-dispatcher.ts` and `candidate-shadow.ts`
- **Cadence / Trigger:** Scheduled hourly tick via Freshness Worker (`POST /api/cron/shadow-dispatch`)
- **Runtime Environment:** Cloudflare Pages Functions
- **Boundaries & Dependencies:** Probes candidate sources; writes records to `source_shadow_observations`.
- **Safety / Compliance Gate:** **Strictly zero D1 publication authority**; skips same-host targets on HTTP 429; checks robots.txt before fetch; requires full observation window (Tier A: 3d, Tier B: 7d, Tier C: 14d).
- **Commit Anchor:** `b9dc5e6`

### Path 13: Unclear Sweep & Backlog Triage Engine
- **Entry Point:** `apps/web/src/pages/api/cron/scrape.ts: sweepUnclearBacklog`
- **Cadence / Trigger:** Invoked during idle scrape ticks
- **Runtime Environment:** Cloudflare Pages Functions
- **Boundaries & Dependencies:** Re-evaluates jobs flagged `category = 'other'` or unclassified eligibility using multi-provider AI cascade (Gemini $\rightarrow$ Groq $\rightarrow$ Cloudflare Workers AI).
- **Safety / Compliance Gate:** Hard subrequest budget (15 calls max per tick); halts after two consecutive AI failures; durable write-first confirmation before updating status.
- **Commit Anchor:** `b9dc5e6`

### Path 14: Outbound Link Health Verifier & Rotator
- **Entry Point:** `apps/web/src/pages/api/cron/verify-links.ts`
- **Cadence / Trigger:** Periodic maintenance run
- **Runtime Environment:** Cloudflare Pages Functions
- **Boundaries & Dependencies:** Probes outbound employer application URLs; updates `link_status` and `link_fail_count`.
- **Safety / Compliance Gate:** Clamps external subrequests below Free tier limit (max 20 per run); rotates cohorts to prevent starvation; follows at most 1 redirect.
- **Commit Anchor:** `b9dc5e6`

### Path 15: Scheduled Maintenance Pulses — GitHub Actions
- **Entry Point:** `.github/workflows/gha-*.yml` (Directory, Hunter, Medic, Prospector, Sentinel)
- **Cadence / Trigger:** Scheduled cron triggers on GitHub Actions runners
- **Runtime Environment:** Ubuntu runners with Bun 1.3.14
- **Boundaries & Dependencies:** Generates operational digests, rolls up source health metrics, validates FTS search integrity.
- **Safety / Compliance Gate:** Guardrailed by `check-production-guardrails.ts`; digest retry failures propagate; non-main runs cannot push to main.
- **Commit Anchor:** `b9dc5e6`

### Path 16: Lake Refinery & Replay Loop
- **Entry Point:** `scripts/lake/replay-refinery.ts` and `scripts/lake/sync-to-d1.ts`
- **Cadence / Trigger:** Scheduled batch execution via maintainer CLI
- **Runtime Environment:** Local / CI Node/Bun process connecting to Turso Lake
- **Boundaries & Dependencies:** Replays historical raw observations through pure transformation pipeline into D1 SQLite.
- **Safety / Compliance Gate:** Zero raw ungrounded writes; strips fallback timestamps (no fake "now" timestamps); honors source opt-outs automatically.
- **Commit Anchor:** `b9dc5e6`

### Path 17: Sovereign CI Guardrail & Release Gate
- **Entry Point:** `.github/workflows/ci-guardrail.yml`
- **Cadence / Trigger:** Push or Pull Request against `main`
- **Runtime Environment:** GitHub Actions runner
- **Boundaries & Dependencies:** Pinned Bun 1.3.14, Wrangler 4.120.0, Gitleaks, D1 migration runner, Cloudflare Pages deployer.
- **Safety / Compliance Gate:** Full 7-stage verification (Gitleaks, guardrails, parameter parity audit, orchestrator modification guard, unit tests, analytics tests, build, typecheck, dry-run, D1 migration rehearsal, FTS integrity verification).
- **Commit Anchor:** `b9dc5e6`
