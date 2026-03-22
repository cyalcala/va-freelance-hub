# VA.INDEX System Snapshot & Best Practices
## Version: 4.0 — Titanium Snapshot
## Date: 2026-03-22T10:37:30Z

This document preserves the "Genuinely Healthy" state of VA.INDEX after the Quality Delivery Audit v4.0. It serves as institutional knowledge for all future AI agents.

---

## 1. Ground Truth State (Last Audit)
| Metric | Value | Interpretation |
|---|---|---|
| **Total Population** | 314 | Balanced dataset across 3 functional tiers. |
| **Active Supply** | 149 | Truly fresh, non-zombie listings. |
| **Late Arrivals (14d+)** | 0 | **CRITICAL**: Temporal inversion has been eliminated. |
| **Ingestion Latency** | 0.01h | Health API now reflects true INGESTION_TIME. |
| **Fingerprint Space** | Clean | Purged 781 stale Tier 4 records to reclaim space. |

---

## 2. Institutional Best Practices (WARDEN PROTOCOL)

### A. The Four Timestamp Axes
1.  **EVENT_TIME (`posted_at`)**: Ground truth. Immutable. Use for feed ordering.
2.  **INGESTION_TIME (`created_at`)**: Correction for throughput measurement. **MUST** be used in `api/health` staleness calculations.
3.  **PROCESSING_TIME (`scraped_at`)**: Heartbeat only. Conflating this with freshness is a "Pulse Deception" failure.
4.  **QUERY_TIME**: Current epoch for relative measurement.

### B. Fingerprint Saturation
The pipeline uses a `(title, company)` deduplication logic.
- **Threshold**: When `total_active` approaches `total_records`, the pipeline is saturated.
- **Remediation**: Daily purge of `is_active = 0` and `tier = 4` records > 7 days old.

### C. The Error Budget
- **SLI-1 (Ingestion)**: `new_15min > 0`. If 0, check saturation first.
- **SLI-3 (Event Horizon)**: 95% of active set must be < 14 days old.
- **SLI-4 (Cache Coherence)**: Zero tolerance for `X-Vercel-Cache: HIT` on `/api/` routes.

---

## 3. Persistent Solutions
- **Health Fix**: `api/health.ts` was modified to use `orderBy(desc(opportunities.createdAt))`. Do not revert to `scrapedAt`.
- **Zombie Deactivation**: Any record with `posted_at < 21 days ago` is considered dead signal and should be deactivated (`is_active = 0`).

---

## 4. Immediate Tasks for Next Session
1. Check `/api/health` for `dailyGrowthRate > 0`.
2. Monitor `saturation` ratio via `scripts/audit-saturationv4.ts`.
3. If staleness exceeds 6h, verify source availability (Reddit, Himalayas).

```
============================================
SNAPSHOT CERTIFIED — GENUINELY HEALTHY
============================================
```
