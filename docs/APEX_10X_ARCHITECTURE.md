# APEX-10X Architecture Specification

Comprehensive system architecture for the autonomous, high-yield opportunity engine powering VA Freelance Hub.

---

## 1. System Topology Overview

```text
               ┌──────────────────────────────────────────────┐
               │         Dual Autonomous Ingestion Clocks     │
               │                                              │
               │  Cloudflare Worker Cron (every 10m, primary) │
               │  GitHub Actions Hunter (every 15m, failover) │
               └──────────────────────┬───────────────────────┘
                                      │
                                      ▼
               ┌──────────────────────────────────────────────┐
               │    Astro Ingestion API (/api/cron/scrape)    │
               │    - Authenticated via PROXY_SECRET          │
               │    - Shared subrequest budget tracker        │
               │    - Heartbeat stamp (__ingest_diag__)       │
               └──────────────────────┬───────────────────────┘
                                      │
                 ┌────────────────────┴────────────────────┐
                 │                                         │
                 ▼                                         ▼
   ┌──────────────────────────┐              ┌──────────────────────────┐
   │ Exact-Six Allowed Feeds  │              │ Non-Publishing Shadows   │
   │ (WWR, Remotive, RWFA,    │              │ (Greenhouse, Recruitee,  │
   │  RemoteOK, Jobicy x2)    │              │  Teamtailor, Ashby, etc) │
   └─────────────┬────────────┘              └─────────────┬────────────┘
                 │                                         │
                 ▼                                         ▼
   ┌────────────────────────────────────────────────────────────────────┐
   │                  Source Capability Adapters                        │
   │   - Normalized JSON extraction & schema validation                 │
   │   - Minimal metadata preservation (no copyrighted description copy)│
   └─────────────────────────────────┬──────────────────────────────────┘
                                     │
                                     ▼
   ┌────────────────────────────────────────────────────────────────────┐
   │                  Zero-Waste Multi-Stage Filter                     │
   │   Stage 0: Content-hash and source_id dedup                        │
   │   Stage 1: Structured location / US state codes / office metadata  │
   │   Stage 2: Deterministic regex geo-gate (geoGate.ts)               │
   │   Stage 3: Obvious non-English & local scheme filter               │
   │   Stage 4: LLM Ambiguity Resolution (Workers AI / Gemini / Groq)   │
   └─────────────────────────────────┬──────────────────────────────────┘
                                     │
                                     ▼
   ┌────────────────────────────────────────────────────────────────────┐
   │              Idempotent Persistence (Cloudflare D1)                │
   │   - Table: opportunities (is_active, source_id, content_hash)      │
   │   - Table: source_fetch_events (telemetry, error taxonomy)         │
   │   - Table: shadow_observations (7-day evaluation ledger)           │
   │   - Table: opportunities_fts (SQLite FTS5 full-text index)         │
   └─────────────────────────────────┬──────────────────────────────────┘
                                     │
                                     ▼
   ┌────────────────────────────────────────────────────────────────────┐
   │                   Astro Server-Rendered UI                         │
   │   - Pages: /, /opportunities, /directory, /categories/[slug]       │
   │   - Fast faceted FTS5 search with instant server responses         │
   │   - Attribution linkback to original employer careers site         │
   └────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Architectural Pillars

### Pillar A: Reusable Source Capabilities
Rather than writing bespoke scrapers for every company, the system standardizes on reusable platform capabilities implementing a common contract:
- `canHandle(source: SourceCandidate): boolean`
- `probe(source: SourceCandidate): Promise<ProbeResult>`
- `fetch(source: SourceCandidate): Promise<NormalizedOpportunity[]>`
- `diagnostics(): SourceDiagnostics`

Supported Capabilities:
- **Greenhouse Postings API**: `api.greenhouse.io/v1/boards/{board_token}/jobs?content=false`
- **Lever Postings API**: `api.lever.co/v0/postings/{site}`
- **Ashby Job Board API**: `api.ashbyhq.com/posting-api/job-board/{board_name}`
- **Workable Public Feed**: Documented XML feed / `jobs.workable.com`
- **Recruitee Job Feed**: `api.recruitee.com/c/{company}/careers/offers`
- **Teamtailor Careers API**: Direct public carrier JSON feeds
- **Standard Feeds**: RSS 2.0 / Atom / JSON Feeds

### Pillar B: Unified Source Registry
Backed by Cloudflare D1 migration `0036_registry_foundation.sql` and `packages/scraper/sources.ts`:
- Separation of **capability** (`greenhouse`, `lever`) from **identity** (`gitlab`, `remotecom`).
- Decouples admission and evaluation from hard-coded configuration.
- Supports risk classification, lease expiration, consecutive failure tracking, and adaptive polling classes.

### Pillar C: Two-Speed Source Governance (ADR-008)
- **Tier A (Fast-Track)**: Direct employer official ATS endpoints with machine-readable schemas. Fast 3-day shadow observation, up to 10 items/tick canary ceiling.
- **Tier B (Guarded Standard)**: Variable partner APIs or multi-employer feeds. Standard 7-day shadow observation, 5 items/tick ceiling.
- **Tier C (High-Risk/Scraped)**: HTML extraction or undocumented interfaces. Strict 14-day shadow, 2 items/tick ceiling.
- **Prohibited**: Login gates, CAPTCHAs, authenticated endpoints, anti-automation terms.

### Pillar D: Source Prospector
- Discovers employer ATS tokens from ingested postings, directory submissions, and tech-hubs.
- Runs autonomous schema and robots probes.
- Generates candidate proposals into `docs/prospector-latest.md`.

### Pillar E: Source Economics & Diagnostics
- Tracks yield per fetch: $\text{yield} = \frac{\text{newly inserted jobs}}{\text{successful fetches}}$.
- Computes waste ratio: $\text{waste} = \frac{\text{rejected or duplicate items}}{\text{total items seen}}$.
- Powers adaptive backoff for zero-yield or dormant sources.

### Pillar F: Zero-Waste Multi-Stage Ingestion
- Pre-filters $>80\%$ of incoming aggregator volume with sub-millisecond deterministic regex.
- LLMs act as **ambiguity resolvers and structured extractors**, not universal eligibility judges.

---

## 3. FinOps & Operational Constraints

1. **Cloudflare Workers Free Tier**:
   - Limit: 100,000 requests/day.
   - Limit: Max 50 subrequests per invocation (monitored via `chargeAiSubrequest()`).
2. **Cloudflare D1 Free Tier**:
   - Limit: 5,000,000 read rows/day, 100,000 write rows/day.
   - Batching: Writes batched via `maxRowsPerD1Batch` to minimize transactional overhead.
3. **Workers AI Free Tier**:
   - Limit: 10,000 Neurons/day.
   - Primary model: `@cf/meta/llama-3.3-70b-instruct-fp8-fast`.
   - Secondary failover: Gemini 2.5 Flash-Lite (1,500 RPM free tier).
