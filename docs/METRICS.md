# VA FREELANCE HUB — METRICS & TELEMETRY CONTRACTS
## Mathematical Cohort Separation, Production SQL Queries, and Ground-Truth SLA Specifications

```yaml
document_metadata:
  document_type: METRICS_SPECIFICATION
  document_status: ACTIVE_OPERATIONAL
  version: "6.0.0"
  effective_at: "2026-09-26T21:15:00+08:00"
  last_verified_at: "2026-09-26T21:15:00+08:00"
  verified_by: "agent-antigravity"
  governed_by: "docs/MASTER_OPERATING_CONSTITUTION.md"
  authority_tier: 2 # Operational implementation of Master Operating Constitution v3.0
  parameters_source: "docs/ACCEPTED_PARAMETERS.yaml"
```

> **The canonical contract for measuring all system performance, quality rates, supply funnels, and SLA compliance.**
>
> All metrics MUST be measured using the explicit mathematical definitions, mutually exclusive cohort partitions, and SQL queries codified below. Informal approximations, proxy gaming, circular ground-truth validations, or blending historical cohorts into fresh daily flow is **constitutionally prohibited** under Master Operating Constitution v3.0 (Parts VIII, IX, and X).

---

## 1. MATHEMATICAL COHORT SEPARATION (MOC v3.0 Part VIII)

### 1.1 The Mutually Exclusive Cohort Model
To prevent historical imports, replay recoveries, or reactivations from masquerading as fresh market supply, and to eliminate the risk of accidental double subtraction from overlapping subtractive categories ($A - B - C - D$), every publication event belongs to **exactly one mutually exclusive creation cohort**:

$$\text{Cohort}(x) \in \{\text{FRESH\_DISCOVERY}, \text{BACKLOG\_IMPORT}, \text{REACTIVATION}, \text{REPLAY\_RECOVERY}, \text{OTHER\_NON\_FRESH}\}$$

Where:
1. **$\text{REACTIVATION}$ (Highest Priority):** Listings previously inactive or expired ($o.\text{is\_active} = 0$) that were re-marked active, or published opportunities whose original creation date $o.\text{created\_at}$ precedes the beginning of the measured publication day window.
2. **$\text{REPLAY\_RECOVERY}$:** Previously rejected or ambiguous (`unclear_held`) listings re-evaluated to qualified through historical rule/heuristic re-execution or offline model replay. Replay recoveries are **qualification events**, NOT creation events.
3. **$\text{BACKLOG\_IMPORT}$:** Listings discovered or published for the first time whose originating posting date $o.\text{source\_posted\_at}$ is older than 7 calendar days prior to observation ($\text{julianday}(o.\text{created\_at}) - \text{julianday}(o.\text{source\_posted\_at}) > 7.0$), or listings introduced through historical directory bulk backfills.
4. **$\text{FRESH\_DISCOVERY}$:** Genuine, net-new opportunities discovered within 7 days of posting ($o.\text{source\_posted\_at} \text{ within 7 days}$ or NULL with fresh harvest verification) and published for the first time during the measured Asia/Manila calendar day.
5. **$\text{OTHER\_NON\_FRESH}$:** Any record failing the fresh discovery criteria not classified in cohorts 1–4.

### 1.2 The True Daily Flow Formula
The true recurring daily flow accessible to freelancers in the Philippines is the cardinality of the $\text{FRESH\_DISCOVERY}$ partition:

$$\text{Daily Flow}(D) = \sum_{x \in \mathcal{P}(D)} \mathbf{1}_{\{\text{Cohort}(x) = \text{FRESH\_DISCOVERY}\}}$$

Where $\mathcal{P}(D)$ is the set of all qualified, unique, authorized opportunities whose publication receipt in `source_publication_ledger` occurred during complete Asia/Manila calendar day $D$.

By construction:
$$\text{Total Published}(D) = |\mathcal{P}(D)| = \text{Daily Flow}(D) + \sum_{x \in \mathcal{P}(D)} \mathbf{1}_{\{\text{Cohort}(x) \neq \text{FRESH\_DISCOVERY}\}}$$

This guarantees:
- Zero double counting;
- Zero double subtraction;
- Strict preservation of the 100/day floor boundary.

### 1.3 Lifecycle Stage Funnel
Telemetry tracks and reports nine sequential pipeline stages:
$$\text{harvested} \longrightarrow \text{raw\_stored} \longrightarrow \text{normalized} \longrightarrow \text{qualified} \longrightarrow \text{authorized} \longrightarrow \text{first\_published} \longrightarrow \text{active\_stock}$$
with branch cohorts:
$$\text{backlog\_unlocked} \quad \text{reactivated} \quad \text{withdrawn/expired}$$

---

## 2. PRODUCTION SQL QUERIES

### Query 1: `qualified_first_publications_manila_day`
Measures the genuine, recurring net-new qualified flow accessible to workers in the Philippines for each Asia/Manila calendar day using the mutually exclusive cohort model:

```sql
-- Qualified Net-New First Publications per Manila Calendar Day
-- Executable classifier: scripts/ci/constitution-metrics.ts
-- SQL can see created_at and source_posted_at only. previouslyInactive and
-- replayRecovery are caller-supplied flags and are not columns. Unknown dates
-- are OTHER_NON_FRESH. They are not FRESH_DISCOVERY.
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
cohort_partitioned AS (
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
    -- Inferable partition only. Replay and prior-inactive flags are not columns.
    CASE
      WHEN o.created_at < strftime('%Y-%m-%dT00:00:00Z', datetime(mp.manila_date || ' 00:00:00', '-8 hours'))
      THEN 'REACTIVATION'
      WHEN o.source_posted_at IS NOT NULL
       AND (julianday(o.created_at) - julianday(o.source_posted_at)) > 7.0
      THEN 'BACKLOG_IMPORT'
      WHEN o.source_posted_at IS NOT NULL
       AND (julianday(o.created_at) - julianday(o.source_posted_at)) >= 0
       AND (julianday(o.created_at) - julianday(o.source_posted_at)) <= 7.0
      THEN 'FRESH_DISCOVERY'
      ELSE 'OTHER_NON_FRESH'
    END AS creation_cohort
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
  COUNT(DISTINCT CASE WHEN creation_cohort = 'FRESH_DISCOVERY' THEN opportunity_id END) AS fresh_discovery_daily_flow,
  COUNT(DISTINCT CASE WHEN creation_cohort = 'BACKLOG_IMPORT' THEN opportunity_id END) AS backlog_imports_cohort,
  COUNT(DISTINCT CASE WHEN creation_cohort = 'REACTIVATION' THEN opportunity_id END) AS reactivations_cohort,
  COUNT(DISTINCT CASE WHEN creation_cohort = 'OTHER_NON_FRESH' THEN opportunity_id END) AS other_non_fresh_cohort
FROM cohort_partitioned
GROUP BY manila_date
ORDER BY manila_date DESC;
```

---

### Query 2: Daily Funnel Analysis (Intake to Serving Mart)
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

### Query 3A: Internal Mechanical Quality Consistency
Measures mechanical integrity within active D1 opportunities:

```sql
-- Internal Mechanical Integrity & Triage Divergence
WITH active_opportunities AS (
  SELECT 
    COUNT(*) AS total_active,
    SUM(CASE WHEN location_type <> 'remote' THEN 1 ELSE 0 END) AS non_remote_active,
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
  ROUND(CAST(non_remote_active AS REAL) / total_active * 100.0, 3) AS mechanical_non_remote_pct, -- Must be 0.0%
  ROUND(CAST(broken_urls AS REAL) / total_active * 100.0, 3) AS broken_url_rate_pct,             -- Ceiling: <= 1.0%
  ROUND(CAST(d.duplicate_count AS REAL) / total_active * 100.0, 3) AS duplicate_rate_pct        -- Ceiling: <= 0.5%
FROM active_opportunities, duplicates d;
```

---

### Query 3B: Ground-Truth Adjudication Quality Rates (MOC v3.0 Part X)
Measures true classification error rates against independent human/employer adjudication samples, avoiding circular model-on-model validation:

```sql
-- Independent Ground-Truth Adjudication Quality Rates
-- Empty sample => measurement_status UNKNOWN. Do not read NULL rates as 0%.
-- Executable rule: scripts/ci/constitution-metrics.ts measureGroundTruth
SELECT
  COUNT(*) AS audited_sample_size,
  CASE
    WHEN COUNT(*) = 0 THEN 'UNKNOWN'
    WHEN COUNT(*) < 50 THEN 'INSUFFICIENT_SAMPLE'
    ELSE 'MEASURED'
  END AS measurement_status,
  SUM(CASE WHEN system_prediction = 'eligible' AND ground_truth_verdict = 'ineligible' THEN 1 ELSE 0 END) AS false_ph_count,
  CASE
    WHEN COUNT(*) = 0 THEN NULL
    ELSE ROUND(CAST(SUM(CASE WHEN system_prediction = 'eligible' AND ground_truth_verdict = 'ineligible' THEN 1 ELSE 0 END) AS REAL) / COUNT(*) * 100.0, 3)
  END AS false_ph_rate_pct, -- Ceiling: <= 1.0% only when measurement_status = MEASURED
  SUM(CASE WHEN system_prediction = 'remote' AND ground_truth_verdict = 'non_remote' THEN 1 ELSE 0 END) AS false_remote_count,
  CASE
    WHEN COUNT(*) = 0 THEN NULL
    ELSE ROUND(CAST(SUM(CASE WHEN system_prediction = 'remote' AND ground_truth_verdict = 'non_remote' THEN 1 ELSE 0 END) AS REAL) / COUNT(*) * 100.0, 3)
  END AS false_remote_rate_pct -- Ceiling: <= 0.5% only when measurement_status = MEASURED
FROM adjudication_audit_samples
WHERE sample_window_days <= 30;
```

---

### Query 4: Provider & Source Concentration (MOC v3.0 Parts XI & XVIII)
Assesses portfolio resilience and verifies compliance with concentration ceilings:

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
    THEN 'BREACH — EXCEEDS 25% SOURCE CEILING' 
    ELSE 'OK' 
  END AS source_concentration_status
FROM source_counts sc, total t
ORDER BY sc.job_count DESC;
```

---

### Query 5: Operational Reliability & Ingestion Lag
Checks for ingestion latency and stalled synchronization:

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
  - Missing data is `UNKNOWN`, never zero, never assumed success.

---

## 4. METRIC VALIDITY SPECIFICATIONS (MOC v3.0 Part IX)

Under Master Operating Constitution v3.0 Part IX, no metric may exist only as a name. Below are the canonical semantic specifications for the core operational metrics:

### 4.1 Metric: `FreshUniqueQualifiedPHJobs_DailyFlow`
- **Semantic Definition:** Count of distinct, net-new opportunities discovered within 7 days of posting, qualified as 100% remote and accessible from the Philippines, authorized under valid source lease, and published to the public product for the first time during a single Asia/Manila calendar day.
- **Unit:** Distinct opportunities / Manila calendar day
- **Numerator:** $\sum_{x \in \mathcal{P}(D)} \mathbf{1}_{\{\text{Cohort}(x) = \text{FRESH\_DISCOVERY}\}}$
- **Denominator:** N/A (integer count)
- **Cohort:** `FRESH_DISCOVERY` (strictly excludes backlog imports, reactivations, and replay recoveries)
- **Time Window:** 00:00:00 to 23:59:59 Asia/Manila (`UTC+8`)
- **Timezone:** Asia/Manila (`UTC+8`)
- **Source of Truth:** `source_publication_ledger` joined with `opportunities` and `source_registry` in Cloudflare D1
- **Ground-Truth Method:** Deterministic gate audit + independent random sampling
- **Query / Reproducible Method:** Query 1 (`qualified_first_publications_manila_day`)
- **Missing Data Behavior:** Labeled `UNKNOWN`; halts 28-day floor counter; cannot be defaulted to 0 or estimated without explicit missingness flags.
- **Known Biases:** Survivorship bias if opportunities are pruned before daily aggregation; weekend posting cadence dips.
- **Minimum Sample Requirements:** 28 consecutive days for floor certification; 7 consecutive days for directional trend.

### 4.2 Metric: `FalsePHRate`
- **Semantic Definition:** Proportion of published opportunities predicted as Philippine-eligible by the system that are empirically determined to be ineligible for workers physically residing in the Philippines.
- **Unit:** Percentage (%)
- **Numerator:** Audited published opportunities where $\text{System} = \text{Eligible} \land \text{GroundTruth} = \text{Ineligible}$
- **Denominator:** Total audited sample of published opportunities
- **Cohort:** Published active opportunities within a 30-day window
- **Time Window:** Rolling 30 calendar days
- **Timezone:** UTC
- **Source of Truth:** Independent human or verified employer ground-truth adjudication audit ledger
- **Ground-Truth Method:** Direct employer posting review, ATS country whitelist check, or verified manual application test
- **Query / Reproducible Method:** Query 3B (`Ground-Truth Adjudication Quality Rates`)
- **Missing Data Behavior:** If sample $n < 50$, reported as `INSUFFICIENT_SAMPLE (n/50)`
- **Known Biases:** Ambiguous country clauses ("Global" without PH explicit confirmation); geographic restrictions revealed only during application form submission.
- **Minimum Sample Requirements:** $n \ge 100$ randomly selected published opportunities per monthly audit cycle; Wilson 95% confidence interval reported.

### 4.3 Metric: `FalseRemoteRate`
- **Semantic Definition:** Proportion of published opportunities classified as 100% remote that actually require onsite presence, hybrid attendance, or local jurisdiction residency.
- **Unit:** Percentage (%)
- **Numerator:** Audited opportunities where $\text{System} = \text{Remote} \land \text{GroundTruth} = \text{Hybrid/Onsite}$
- **Denominator:** Total audited sample of published opportunities
- **Cohort:** Published active opportunities
- **Time Window:** Rolling 30 calendar days
- **Timezone:** UTC
- **Source of Truth:** Independent ground-truth adjudication sample
- **Ground-Truth Method:** Full job description inspection and employer application portal review
- **Query / Reproducible Method:** Query 3B
- **Missing Data Behavior:** Labeled `UNKNOWN` if audit sample is missing
- **Known Biases:** "Remote within US" listings labeled as generic "Remote" by upstream aggregators.
- **Minimum Sample Requirements:** $n \ge 100$ audited listings; hard ceiling $\le 0.5\%$.

### 4.4 Metric: `BrokenApplyUrlRate`
- **Semantic Definition:** Proportion of published opportunities whose application URL fails to resolve, returns HTTP 4xx/5xx, routes to an unrelated generic homepage, or contains malicious schemes (`javascript:`).
- **Unit:** Percentage (%)
- **Numerator:** Active opportunities with non-resolving or corrupted application URLs
- **Denominator:** Total active opportunities in D1
- **Cohort:** All opportunities where `is_active = 1`
- **Time Window:** Daily link verification pulse (last 24 hours)
- **Timezone:** UTC
- **Source of Truth:** `opportunities.application_url` validated via GHA link-verifier HTTP probe
- **Ground-Truth Method:** Automated HEAD/GET HTTP status check with redirect following
- **Query / Reproducible Method:** Query 3A (`Internal Mechanical Quality Consistency`)
- **Missing Data Behavior:** Assumed failing if URL is NULL or empty
- **Known Biases:** Temporary target server downtime or Cloudflare bot challenge on employer ATS.
- **Minimum Sample Requirements:** Census of 100% active inventory; hard ceiling $\le 1.0\%$.

### 4.5 Metric: `DuplicatePublicRate`
- **Semantic Definition:** Proportion of active public opportunities that represent the same canonical opening already published on the product surface.
- **Unit:** Percentage (%)
- **Numerator:** Active opportunities sharing an identical `fingerprint_hash` or canonical ATS requisition tuple
- **Denominator:** Total active opportunities in D1
- **Cohort:** All opportunities where `is_active = 1`
- **Time Window:** Instantaneous snapshot
- **Timezone:** UTC
- **Source of Truth:** D1 `opportunities` table
- **Ground-Truth Method:** Deterministic SHA-256 fingerprint deduplication check
- **Query / Reproducible Method:** Query 3A (`duplicates` CTE)
- **Missing Data Behavior:** 0 if `fingerprint_hash` unique index holds
- **Known Biases:** Cross-posting across multiple aggregators with slight title variations.
- **Minimum Sample Requirements:** Census of 100% active inventory; hard ceiling $\le 0.5\%$.

### 4.6 Metric: `TopProviderFamilyShare`
- **Semantic Definition:** Proportion of active opportunities originating from the single largest provider family (e.g. `we-work-remotely`, `breezy`, `greenhouse`).
- **Unit:** Percentage (%)
- **Numerator:** Count of active opportunities from the top provider family
- **Denominator:** Total active opportunities with known provider family
- **Cohort:** Active stock (`is_active = 1`) and 30-day net-new inflow
- **Time Window:** Rolling 30 calendar days
- **Timezone:** UTC
- **Source of Truth:** `source_registry` joined with `opportunities`
- **Ground-Truth Method:** Deterministic aggregation by `provider_id` / family mapping
- **Query / Reproducible Method:** Query 4 (`source_counts` folded into provider families)
- **Missing Data Behavior:** Unknown providers counted in denominator; hard ceiling $\le 40\%$.
- **Known Biases:** Multi-tenant ATS providers (e.g. Breezy, Greenhouse) aggregate diverse independent employers.
- **Minimum Sample Requirements:** Total active stock; breach trigger $> 40\%$.

---

## 5. QUEUE INSTRUMENTATION (MOC v3.0 Parts XXVI–XXVII)

Executable definitions live in `scripts/ci/queue-metrics.ts`. They are measurements, not a second scheduler.

- **Depth evolution:** `Q_next = max(0, Q_current + arrivals - completions)`.
- **Residence:** p50, p95, p99, and oldest age. An empty or invalid sample is `UNKNOWN`.
- **Stability:** stable only when service rate is strictly greater than arrival rate. Equal rates are `UNSTABLE`. Both rates zero is `UNKNOWN`.
- **Little's law:** `L = lambda * W` only when the interarrival coefficient of variation is known and `<= 1`. That bound is provisional (`LITTLE_LAW_CV_MAX`). It is not an accepted governance parameter. Unknown or bursty variation abstains.
- **Live rows:** these functions do not yet read D1 or Turso. A later session must pass measured arrivals, completions, and residence times into them. A formula without those inputs is not a queue measurement.
