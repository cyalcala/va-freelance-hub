# Python Analytical Tooling (Pillar I)

Governance and architecture specification for Python analytics, labor market intelligence, and offline evaluation.

---

## 1. Operating Philosophy & Production Separation

> **The production runtime is TypeScript on Cloudflare Workers / Pages / D1. Python will not replace or migrate the production edge runtime.**

Python is used exclusively as a **read-only analytical and offline modeling layer**. It operates on exported datasets, D1 read replicas, and evaluation fixtures.

---

## 2. Core Python Responsibilities

Python tools and notebooks in the repository are bounded to these specific domains:

### 2.1 Anomaly Detection & Statistical Quality Control
- **Rolling MAD (Median Absolute Deviation)**: Detects sudden volume collapses, abnormal-empty responses, or spikes in geo-rejection rates without assuming normal distribution.
- **IQR (Interquartile Range) Filtering**: Identifies outlier compensation figures or suspicious listing timestamps.

### 2.2 Yield & Source Economics Modeling
- Evaluates rolling 30-day yield curves across source identities.
- Simulates adaptive polling cadences to predict subrequest savings.
- Calculates provider family concentration indexes (Herfindahl-Hirschman Index / HHI).

### 2.3 Labor Market Intelligence & Compensation Distributions
- Analyzes salary disclosures to generate empirical Philippine Peso (PHP) compensation benchmarks across role families.
- Analyzes timezone and shift requirement distributions (Day vs Mid vs Night shifts).

### 2.4 Offline Eval Suite Execution
- Benchmarks precision, recall, and false-positive rates across candidate prompt changes and heuristic regexes against frozen corpora.

---

## 3. Environment & Execution Guidelines

- **Package Management**: Use `uv` or standard virtual environments (`py -m venv .venv`).
- **Data Access**: Strictly read-only JSON, CSV, or SQLite read replicas. Never write or mutate production Cloudflare D1 directly from Python scripts.
- **Location**: Scripts reside under `scripts/analytics/` or `research/`.
