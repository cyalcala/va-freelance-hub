# VA FREELANCE HUB — METRICS & TELEMETRY CONTRACTS
## Mathematical Cohort Separation, Production SQL Queries, and SLA Formulas

```yaml
document_metadata:
  document_type: METRICS_SPECIFICATION
  document_status: ACTIVE_OPERATIONAL
  version: "5.2.0"
  effective_at: "2026-09-26T11:49:00+08:00"
  last_verified_at: "2026-09-26T11:49:00+08:00"
  verified_by: "agent-antigravity"
  applies_to_commit: "72709b153b3ada5916a7e6fefd40c3a8ec0f6bbd"
  authority_tier: 2
```

> **The canonical contract for measuring all system performance, quality rates, supply funnels, and SLA compliance.**
>
> All metrics MUST be measured using the explicit mathematical definitions and SQL queries codified below. Informal approximations, proxy gaming, or blending historical cohorts into fresh daily flow is **constitutionally prohibited**.

---

## 1. MATHEMATICAL COHORT SEPARATION (C8)

### 1.1 The Daily Flow Formula
To prevent historical imports or replay recoveries from masquerading as fresh market supply, the recurring daily flow is defined strictly as:

$$\text{Daily Flow} = \text{First Published Today} - \text{Backlog Imports} - \text{Reactivations} - \text{Replay Recoveries}$$

Where:
- **First Published Today:** Opportunities whose initial publication receipt in `source_publication_ledger` occurred within the measured Asia/Manila calendar day.
- **Backlog Imports:** Listings whose `source_posted_at` is older than 7 days prior to initial observation, or which entered through historical directory seed migrations.
- **Reactivations:** Listings previously inactive/expired that were re-marked active.
- **Replay Recoveries:** Previously rejected or unclear listings re-evaluated to eligible via historical rule re-execution.

### 1.2 Funnel Cohorts
Telemetry MUST track and report these nine cohorts independently:
$$\text{harvested} \mid \text{raw\_stored} \mid \text{normalized} \mid \text{qualified} \mid \text{first\_published} \mid \text{backlog\_unlocked} \mid \text{reactivated} \mid \text{withdrawn} \mid \text{active\_stock}$$

- `first observed today` $\neq$ `posted today`.
- `backlog unlocked` $\neq$ `fresh daily flow`.
- `unclear listing re-evaluated to eligible` = **qualification event**, NOT a creation event.

---

## 2. PRODUCTION SQL QUERIES

### Query 1: `qualified_first_publications_manila_day`
Measures the genuine, recurring net-new qualified flow accessible to workers in the Philippines for each Asia/Manila calendar day:

```sql
-- Qualified Net-New First Publications per Manila Calendar Day
-- Joining source_publication_ledger, opportunities, and source_registry.
-- Manila time conversion: datetime(timestamp, '+8 hours')

WITH manila_publications AS (
  SELECT 
    spl.id AS ledger_id,
    spl.source_id,
    spl.decided_at,
    strftime('%Y-%m-%d', datetime(spl.decided_at, '+8 hours')) AS manila_date,
    json_each.value AS opportunity_id
  FROM source_publication_ledger spl,
       json_each(spl.published_ids_json)
  WHERE spl.mode IN ('unlimited', 'capped')
    AND spl.published_count > 0
),
qualified_details AS (
  SELECT 
    mp.ledger_id,
    mp.source_id,
    mp.manila_date,
    mp.decided_at,
    o.id AS opportunity_id,
    o.title,
    o.company,
    o.source_posted_at,
    o.created_at AS first_public_at,
    o.ph_eligibility,
    o.is_active,
    sr.operational_state,
    sr.compliance_state,
    -- Cohort classifications
    CASE 
      WHEN o.source_posted_at IS NOT NULL 
       AND julianday(o.created_at) - julianday(o.source_posted_at) > 7.0 
      THEN 1 ELSE 0 
    END AS is_backlog_import,
    CASE 
      WHEN o.created_at < strftime('%Y-%m-%dT00:00:00Z', datetime(mp.manila_date || ' 00:00:00', '-8 hours'))
      THEN 1 ELSE 0
    END AS is_reactivation_or_replay
  FROM manila_publications mp
  JOIN opportunities o 
    ON o.id = CAST(mp.opportunity_id AS INTEGER)
  JOIN source_registry sr 
    ON sr.source_id = mp.source_id
  WHERE o.ph_eligibility = 'eligible_verified'
    AND sr.operational_state IN ('active', 'canary')
    AND sr.compliance_state IN ('allowed', 'conditional')
)
SELECT 
  manila_date,
  COUNT(DISTINCT opportunity_id) AS total_published_today,
  SUM(is_backlog_import) AS backlog_imports_cohort,
  SUM(is_reactivation_or_replay) AS reactivations_replay_cohort,
  -- True recurring daily flow:
  COUNT(DISTINCT opportunity_id) - SUM(is_backlog_import) - SUM(is_reactivation_or_replay) AS qualified_net_new_recurring_flow
FROM qualified_details
GROUP BY manila_date
ORDER BY manila_date DESC;
```

---

### Query 2: Daily Funnel Analysis (Lake to Serving Mart)
Tracks progression from raw intake through deterministic and Jev gates to publication:

```sql
-- Comprehensive 24-Hour Funnel Analysis
-- Evaluates pipeline conversion efficiency across all stages
SELECT 
  date(o.created_at) AS date_utc,
  COUNT(o.id) AS total_stock_active,
  SUM(CASE WHEN o.ph_eligibility = 'eligible_verified' THEN 1 ELSE 0 END) AS ph_verified,
  SUM(CASE WHEN o.ph_eligibility = 'eligible_likely' THEN 1 ELSE 0 END) AS ph_likely,
  SUM(CASE WHEN o.ph_eligibility = 'unclear' THEN 1 ELSE 0 END) AS ph_unclear,
  SUM(CASE WHEN o.ph_eligibility = 'ineligible' THEN 1 ELSE 0 END) AS ph_ineligible
FROM opportunities o
WHERE o.is_active = 1
GROUP BY date(o.created_at)
ORDER BY date_utc DESC
LIMIT 14;
```

---

### Query 3: Quality Rate Metrics & Ceilings
Measures quality compliance against accepted SLAs:

```sql
-- Quality Metrics & Error Rates
WITH active_opportunities AS (
  SELECT 
    COUNT(*) AS total_active,
    SUM(CASE WHEN ph_eligibility = 'ineligible' THEN 1 ELSE 0 END) AS false_ph_positives,
    SUM(CASE WHEN location_type <> 'remote' THEN 1 ELSE 0 END) AS false_remote_classifications,
    SUM(CASE WHEN application_url IS NULL OR application_url = '' OR application_url GLOB '*javascript:*' THEN 1 ELSE 0 END) AS broken_urls
  FROM opportunities
  WHERE is_active = 1
),
duplicates AS (
  SELECT 
    COUNT(*) - COUNT(DISTINCT fingerprint_hash) AS duplicate_count
  FROM opportunities
  WHERE is_active = 1
)
SELECT 
  total_active,
  ROUND(CAST(false_ph_positives AS REAL) / total_active * 100.0, 3) AS false_ph_rate_pct,       -- Ceiling: <= 1.0%
  ROUND(CAST(false_remote_classifications AS REAL) / total_active * 100.0, 3) AS false_remote_rate_pct, -- Ceiling: <= 0.5%
  ROUND(CAST(broken_urls AS REAL) / total_active * 100.0, 3) AS broken_url_rate_pct,             -- Ceiling: <= 1.0%
  ROUND(CAST(d.duplicate_count AS REAL) / total_active * 100.0, 3) AS duplicate_rate_pct        -- Ceiling: <= 0.5%
FROM active_opportunities, duplicates d;
```

---

### Query 4: Provider & Source Concentration
Assesses portfolio resilience against single-source failure:

```sql
-- Source and Provider Family Concentration
WITH source_counts AS (
  SELECT 
    source_id,
    COUNT(*) AS job_count
  FROM opportunities
  WHERE is_active = 1
  GROUP BY source_id
),
total AS (
  SELECT SUM(job_count) AS overall_total FROM source_counts
)
SELECT 
  sc.source_id,
  sc.job_count,
  ROUND(CAST(sc.job_count AS REAL) / t.overall_total * 100.0, 2) AS share_pct,
  CASE 
    WHEN CAST(sc.job_count AS REAL) / t.overall_total > 0.25 
    THEN 'BREACH — EXCEEDS 25%' 
    ELSE 'OK' 
  END AS concentration_status
FROM source_counts sc, total t
ORDER BY sc.job_count DESC;
```

---

### Query 5: Operational Reliability & System Lag
Checks for ingestion latency and stuck batches:

```sql
-- System Sync Backlog and Ingestion Lag
SELECT 
  'Cloudflare D1 Opportunities' AS store,
  MAX(created_at) AS newest_created_at,
  ROUND((julianday('now') - julianday(MAX(created_at))) * 24.0, 2) AS lag_hours,
  CASE 
    WHEN (julianday('now') - julianday(MAX(created_at))) * 24.0 > 2.0 
    THEN 'BREACH — LAG EXCEEDS 2 HOURS' 
    ELSE 'HEALTHY' 
  END AS lag_status
FROM opportunities
WHERE is_active = 1;
```

---

## 3. REPORTING CONTRACTS & DEAD-BAND RULE

### 3.1 Sustained 100/Day Floor Evaluation
- **Evaluation Window:** 28 consecutive complete Asia/Manila calendar days.
- **Pass Predicate:** Each individual day $D_i$ ($i \in [1, 28]$) must record:
  $$\text{Daily Flow}(D_i) \ge 100$$
- **Dead-Band Rule:**
  - If $\frac{1}{28}\sum_{i=1}^{28}\text{Daily Flow}(D_i) \ge 100$ but $\exists D_k$ such that $\text{Daily Flow}(D_k) < 100$: Report as `AVERAGE ACHIEVED, FLOOR NOT ACHIEVED`.
  - If more than 2 days in the window have missing telemetry: Report as `INSUFFICIENT EVIDENCE`.
  - Missing data is `UNKNOWN`, never zero, never success.
