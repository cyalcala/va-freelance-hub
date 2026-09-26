# VA FREELANCE HUB — PRODUCTION EMPIRICAL BASELINE
## Resource Consumption, Ingestion Latency, Error Rates, and Build Telemetry

```yaml
document_metadata:
  document_type: BASELINE_TELEMETRY
  document_status: ACTIVE_OPERATIONAL
  version: "1.0.0"
  effective_at: "2026-09-26T12:57:00+08:00"
  applies_to_commit: "b9dc5e6c1341c2c0199be06fa713919e1b21235b"
  authority_tier: 2
  phase: "Phase 0 (Reconnaissance, Runtime Bounds & Empirical Baseline)"
  sample_size_fetch_events: 500
  sample_size_shadow_obs: 2647
```

> **The empirical performance baseline of VA Freelance Hub.**
>
> Establishes the quantitative benchmarks against which any future architectural evolution (including Phase 4–6 WASM candidates, capability dispatch, or DSL abstractions) must be evaluated.

---

## 1. RUNTIME BOUNDARIES & PLATFORM LIMITS

| Runtime Subsystem | Metric / Limit | Empirical Production Value | Safety Headroom |
|---|---|---|---|
| **Cloudflare Workers AI/Worker RAM** | 128 MB RAM max | ~32–48 MB average isolate consumption | $\ge 60\%$ headroom |
| **Worker Subrequest Budget** | 50 external fetches / tick | Scrape clamps to 15; verifier clamps to 20 | $\ge 60\%$ headroom |
| **Ingestion Execution Timeout** | 15 minutes freshness target | Scrape completes in $< 45\text{ seconds}$ | $> 90\%$ headroom |
| **D1 Daily Row Writes** | 100,000 writes / day | ~2,000–5,000 writes / day (normal cadence) | $> 95\%$ headroom |
| **D1 Total Database Size** | 500 MB quota | **63.98 MB** | $87.2\%$ headroom |

---

## 2. INGESTION & PARSER TELEMETRY (LIVE D1 RUNS)

Empirical telemetry measured directly from production `source_fetch_events` across **500 recent consecutive runs** (sample window: `2026-09-24` to `2026-09-26`):

```sql
SELECT 
  COUNT(*) as total_events, 
  ROUND(AVG(duration_ms), 1) as avg_duration_ms, 
  MIN(duration_ms) as min_duration_ms, 
  MAX(duration_ms) as max_duration_ms, 
  SUM(CASE WHEN ok = 1 THEN 1 ELSE 0 END) as ok_events, 
  SUM(CASE WHEN ok = 0 THEN 1 ELSE 0 END) as failed_events, 
  SUM(CASE WHEN skipped = 1 THEN 1 ELSE 0 END) as skipped_events, 
  SUM(CASE WHEN not_modified = 1 THEN 1 ELSE 0 END) as not_modified_events 
FROM (SELECT * FROM source_fetch_events ORDER BY id DESC LIMIT 500);
```

| Metric | Measured Production Baseline | Notes |
|---|---|---|
| **Total Ingestion Events Sampled** | **500** runs | Part of 56,426 lifetime fetch events |
| **Ingestion Success Rate (`ok = 1`)** | **100.0%** (500 / 500) | Zero unhandled crashes or unlogged exceptions |
| **Parser / Fetch Failure Rate (`ok = 0`)** | **0.00%** (0 / 500) | Zero fatal network failures in sample |
| **Average Run Latency** | **54.2 ms** | Lightweight edge execution |
| **Minimum Latency** | **0 ms** | Rate limit skip or local cache hit |
| **Maximum Latency** | **3,498 ms** | Full multi-item parse and triage batch |
| **Cadence / Rate-Limit Skips** | **458 events** (91.6%) | Staggered 60-minute cadence protection active |
| **Conditional 304 Not Modified** | **24 events** (4.8%) | Unchanged feeds bypass parsing & D1 writes |

---

## 3. SHADOW OBSERVATION TELEMETRY

Empirical distribution of **2,647 shadow observations** recorded in `source_shadow_observations` across 21 candidate sources:

```sql
SELECT outcome, count(*), count(distinct source_id) 
FROM source_shadow_observations 
GROUP BY outcome;
```

| Observation Outcome | Count | % of Total | Unique Sources | Architectural Behavior |
|---|---|---|---|---|
| **`HEALTHY_WITH_RESULTS`** | **2,038** | **77.0%** | 21 | Clean parse, valid schema, plausible jobs |
| **`RATE_LIMITED`** | **441** | **16.7%** | 7 | HTTP 429 safely caught; skips remaining same-host |
| **`DEGRADED_ANOMALOUS`** | **33** | **1.2%** | 1 | Isolated to partner XML feed drift |
| **`POLICY_BLOCKED`** | **4** | **0.15%** | 4 | Proactive pause due to term change |
| **`UNREACHABLE`** | **3** | **0.11%** | 2 | Transient upstream DNS/TCP reset |

---

## 4. BUILD & BUNDLE METRICS

Measured during production build (`bun run build` via Astro 5.18.2 & Vite 6.4.3):

| Build Stage | Measured Duration | Resource Bounds |
|---|---|---|
| **Content Collection Sync** | 266 ms | Memory cached |
| **Server Entrypoint Compilation** | 27.72 s | Node/V8 AST transform |
| **Vite Client Transformation** | 13.56 s | 1,808 modules transformed |
| **Static Route Pre-rendering** | 297 ms | Zero I/O overhead |
| **Total Build Time** | **42.92 s** | Bounded within GitHub Actions runner limits |

### Production Asset Bundle Sizes
- Client Entry (`dist/_astro/client.BlZe1zq3.js`): **186.62 kB** (gzip: 59.18 kB)
- Search Island (`dist/_astro/OpportunitySearch.CmJmrpMH.js`): **12.98 kB** (gzip: 4.63 kB)
- Home Island (`dist/_astro/index.qNTDzdXh.js`): **7.85 kB** (gzip: 3.06 kB)
- Freshness Cron Worker (`dist/worker.js`): **10.84 kB** (gzip: 3.25 kB)

---

## 5. D1 DATABASE PERFORMANCE METRICS

Telemetry captured from Cloudflare D1 production cluster (`SIN` colocation, Singapore primary):

| Query Class | Typical Execution Time | Rows Scanned |
|---|---|---|
| **Point Lookup by ID (`jobs/[id]`)** | **0.25 ms – 0.45 ms** | 1 row |
| **Index Range Scan (`opportunities?fresh=today`)** | **0.65 ms – 1.20 ms** | 50–200 rows |
| **Full-Text Match (`opportunities_fts MATCH 'virtual'`)** | **1.50 ms – 3.80 ms** | Virtual table index |
| **Full Table Aggregate (`COUNT(*) FROM source_fetch_events`)** | **29.58 ms** | 56,426 rows |
| **Source Registry Risk Tiers Scan** | **0.56 ms** | 35 rows |

---

## 6. PHASE 0 EXIT EVALUATION

| Exit Requirement | Mandatory Threshold | Empirical State | Status |
|---|---|---|---|
| **17 Production Paths Mapped** | 100% documented with SHAs | Documented in `CURRENT_STATE.md` (SHA `b9dc5e6`) | **PASSED** |
| **Historical Baseline Sample** | $\ge 100$ runs measured | 500 runs sampled (56,426 lifetime) | **PASSED** |
| **Zero Production Mutations** | 0 serving table mutations | Strictly read-only telemetry analysis | **PASSED** |
| **Documentation Complete** | `CURRENT_STATE.md` + `BASELINE.md` | Created in `docs/architecture/` | **PASSED** |

**Conclusion:** **Phase 0 (Reconnaissance, Runtime Bounds & Empirical Baseline) is 100% COMPLETE.**
