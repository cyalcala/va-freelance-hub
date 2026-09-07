# APEX-10X Baseline & Bottleneck Proof (2026-09-07)

Empirical measurement of production baseline metrics, yield economics, and limiting constraints across VA Freelance Hub.

---

## 1. Measured Production Baseline Snapshot

Measured against Cloudflare D1 (`opportunities`, `source_fetch_events`, `shadow_observations`), GitHub Actions operational reports (`source-health-latest.md`, `source-economics-latest.md`), and runtime logs:

| Metric Dimension | Rolling 7-Day / 24-Hour Value | Rolling 30-Day Value | Status / Notes |
| :--- | :--- | :--- | :--- |
| **Raw Jobs Discovered / Day** | 11,410 items/day | ~340,000 items/month | 6 exact-six feeds polled every 10 min |
| **Unique Jobs Discovered / Day** | ~1,200 unique listings/day | ~35,000 unique listings | Evaluated after content-hash & URL dedup |
| **Eligible Jobs Accepted / Day** | 7–10 qualified jobs/day | ~220 qualified jobs | **$B_0 = 8.5$ eligible new jobs/day** |
| **Actual Newly Stored Eligible Jobs / Day** | 7–10 net-new jobs/day | ~220 net-new jobs | Strictly stored with is_active = 1 |
| **Productive Source Identities** | 6 active public feeds | 6 active public feeds | WWR, Remotive, RWFA, RemoteOK, Jobicy (x2) |
| **Shadowed Source Identities** | 7 employer boards | 7 employer boards | Grafana, MyJewellery, Teamtailor, GitLab, Remote.com, Nearform, Ghost |
| **Source Concentration (Top 1)** | **70.98%** (We Work Remotely: 8,099/11,410) | ~72% | Extreme dependence on a single RSS feed |
| **Source Concentration (Top 2)** | **85.02%** (WWR + Remotive: 9,701/11,410) | ~86% | Top 2 aggregators supply 85%+ of volume |
| **Geo Rejection Rate** | **98.2%** of raw listings | ~98.0% | US-only, Canada-only, EMEA, state-locked |
| **Role Rejection Rate** | ~1.1% of geo-passed listings | ~1.2% | Non-VA/non-remote/pure onsite roles |
| **Duplicate Rate** | ~89.5% across polling cycles | ~90% | Repeatedly seen unchanged RSS/JSON entries |
| **Stale Listing Rate** | ~1.5% pruned per week | ~6% monthly | Pruned by automated 3-strike link verifier |
| **Source Failure Rate** | **0.0%** in last 24h (41 monitored, 0 failures) | <0.5% | Source Doctor classifies transient network errors |
| **Abnormal-Empty Rate** | 0.0% on allowed feeds | 0.0% | Monitored via `source_fetch_events` |
| **LLM Calls / Day** | ~40–80 calls/day | ~1,800 calls/month | Bound by subrequest budget and deterministic gates |
| **LLM Calls / Accepted Job** | ~6.2 calls per accepted job | ~6.5 calls | Includes initial triage ladder + skeptic consensus |
| **AI Failure / Fallback Rate** | <1.0% | <1.2% | Workers AI -> Gemini Flash-Lite -> Groq cascade |
| **Ingestion Latency** | Median ~10 minutes | Median ~10 minutes | Cloudflare Worker cron running every 10 min |
| **Discovery-to-Publication Latency** | 10–25 minutes | 10–25 minutes | End-to-end scrape, gate, triage, D1 commit |
| **Direct ATS vs Aggregator Share** | **0% Direct ATS / 100% Aggregator** | 0% ATS / 100% Aggregator | All ATS sources currently held in shadow mode |
| **Cloudflare D1 Storage & Rows** | 5,090 total rows (1,278 active, 3,812 inactive) | 5,090 rows | Within 5M read / 100k write daily free limits |
| **External Request Usage** | ~45 subrequests / worker tick | ~6,500 subrequests/day | Strictly respects 50 subrequests/tick limit |
| **Monthly Infrastructure Cost** | **$0.00 / month** | **$0.00 / month** | 100% Cloudflare Free + Gemini Free + GitHub Actions |

---

## 2. Defining the 10x North Star Target

$$B_0 = 8.5\text{ net newly published eligible jobs / day (baseline range 7–10)}$$

$$\text{APEX\_10X\_TARGET} = 10 \times B_0 = 85\text{ net newly published eligible jobs / day (target range: 50–100+)}$$

- **Primary KPI**: Net newly published eligible jobs per day.
- **Secondary KPI**: Diversified source portfolio (no single source contributing >25% of net yield).
- **Efficiency Constraint**: Marginal LLM cost per accepted job $\le 2.0$ calls, preserving the \$0.00 infrastructure envelope.

---

## 3. Top Three Limiting Constraints

### Constraint 1: Aggregator Supply Funnel Loss (The 98% Rejection Wall)
Over 85% of incoming listings originate from two legacy aggregator RSS feeds (We Work Remotely and Remotive). Because these platforms cater predominantly to the North American tech market, **98.2% of their listings are geographically locked** to the US, Canada, or Europe, or require US work authorization / W2 tax status. The system expends enormous bandwidth parsing 11,410 items daily to extract a meager 7–10 jobs.

### Constraint 2: Direct ATS Sources Fenced in Non-Publishing Shadow Mode
The project has built and verified high-yield direct ATS capabilities (Greenhouse, Lever, Ashby, Workable, Recruitee, Teamtailor) representing global remote-first companies (GitLab, Remote.com, Nearform, Ghost Foundation, Grafana Labs) that natively hire in the Philippines and APAC. However, under the conservative governance provisions of SP-23 and ADR-008, all direct ATS sources are strictly fenced in non-publishing shadow mode awaiting observation windows. As long as Direct ATS contribution to the public board remains **0%**, 10x yield cannot be achieved.

### Constraint 3: Ingestion Compute & Subrequest Bottleneck on Unfiltered Data
Cloudflare Workers Free limits execution to 50 external subrequests per invocation and 10,000 Neurons/day for Workers AI. When batches of candidate jobs from new sources arrive, evaluating them with AI without aggressive deterministic Stage 0/Stage 1 pre-filtering risks subrequest exhaustion or AI quota depletion. Inverting this bottleneck requires zero-waste triage where 80%+ of ineligible listings are rejected in <1 millisecond with zero LLM calls.
