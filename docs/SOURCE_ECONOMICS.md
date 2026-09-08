# Source Economics & Adaptive Harvesting (Pillar E)

Economic and telemetry framework for autonomous source portfolio management.

---

## 1. The Core Economic Question

Every source in the VA Freelance Hub registry must empirically answer:
> **"Is this source worth the compute, bandwidth, and subrequest quota required to poll it?"**

A high-volume feed that yields zero qualified Philippine-accessible listings wastes valuable Worker subrequests and DB read/write quotas. Source Economics transforms source harvesting from indiscriminate scraping into a self-optimizing portfolio.

---

## 2. Mathematical Metrics & Formulations

### 2.1 Primary Economic Metrics

$$\text{Eligible Yield} = \frac{\text{eligible\_jobs}}{\text{successful\_fetches}}$$

$$\text{Productive Yield} = \frac{\text{newly\_inserted\_jobs}}{\text{successful\_fetches}}$$

$$\text{Waste Ratio} = \frac{\text{rejected\_jobs} + \text{duplicate\_jobs}}{\text{raw\_jobs\_seen}}$$

$$\text{AI Unit Cost} = \frac{\text{total\_ai\_calls}}{\text{newly\_inserted\_jobs}}$$

### 2.2 Thresholds & Benchmarks

| Metric | Healthy Benchmark | Warning Band | Action Trigger |
| :--- | :--- | :--- | :--- |
| **Productive Yield** | $> 0.05$ (1 new job per 20 fetches) | $0.01 - 0.05$ | Downgrade polling class |
| **Waste Ratio** | $< 0.90$ | $0.90 - 0.98$ | Tighten Stage 0/1 pre-filters |
| **AI Unit Cost** | $\le 2.0$ AI calls / insert | $2.0 - 5.0$ | Flag for prompt/gate review |
| **Consecutive Failures** | $0$ | $1 - 3$ | Exponential backoff |
| **Failure Rate (7d)** | $< 1\%$ | $1\% - 5\%$ | Source Doctor quarantine |

---

## 3. Adaptive Polling Classes

Sources are categorized dynamically into polling cadences based on change frequency and yield:

1. **Class 1 (High Freshness / Active Velocity)**:
   - Cadence: Polled every 10–15 minutes (aligned with Worker clock).
   - Qualification: Generates $\ge 2$ net-new eligible jobs per day with $< 50\%$ unchanged fetches.
2. **Class 2 (Standard Daily Velocity)**:
   - Cadence: Polled every 1–2 hours.
   - Qualification: Generates $\ge 1$ net-new job every 2–3 days.
3. **Class 3 (Dormant / Low-Cadence)**:
   - Cadence: Polled every 6–12 hours.
   - Qualification: Direct employer career boards with small teams and infrequent openings.
4. **Quarantine / Backoff**:
   - Triggers: 3 consecutive HTTP errors, rate-limiting, or schema drift.
   - Backoff: $15\text{m} \to 30\text{m} \to 1\text{h} \to 4\text{h} \to 24\text{h}$.

---

## 4. Concentration SLOs (ADR-006 §7)

To ensure the job board does not collapse if an aggregator alters its feed or blocks collection:
- **Top 1 Provider Family Concentration**: Must not exceed **$40\%$** of net-new 30-day opportunities.
- **Top 3 Provider Family Concentration**: Must not exceed **$70\%$** of net-new 30-day opportunities.

---

## 5. Telemetry & Reporting

- Telemetry script: `scripts/diagnostics/source-economics.ts`
- Automated report: `docs/source-economics-latest.md`
- Database table: `source_fetch_events` (migration 0016)
