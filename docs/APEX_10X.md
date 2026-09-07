# APEX 10X — Autonomous Opportunity Discovery & Replenishment Architecture

## 0. Prime Directive & Mission

> **Increase the sustainable flow of high-quality, fresh, relevant, Philippines-eligible remote opportunities by an order of magnitude while reducing marginal ingestion cost, AI dependence, source fragility, and operational burden.**

The target optimization function is:

$$\text{qualified\_yield} = \text{fresh} \times \text{Philippines-eligible} \times \text{role-relevant} \times \text{legitimate} \times \text{applyable} \times \text{non-duplicate} \times \text{discoverable}$$

This is an **evolutionary architecture program**. It does not discard working systems, does not perform greenfield rewrites, and absorbs all prior initiatives ([`SP-00`..`SP-23`](./plans/SOURCE_PERPETUITY_IMPLEMENTATION_PLAN.md), [`EX-01`..`EX-13`](./gauntlet/EXPANSION_LOOP.md)) with explicit traceability.

---

## 1. Verified Production Baseline (2026-09-07)

Measured from Cloudflare D1, GitHub Actions logs, and git tree:

| Metric Dimension | Current Production Baseline | APEX 10X Target |
| :--- | :--- | :--- |
| **Active Opportunities** | 1,278 total (1,267 legacy null-id + 11 attributed) | 2,500+ active curated listings |
| **Net-New Qualified Inflow** | 7–10 jobs / day (exact-six allowed feeds) | 50–100+ qualified jobs / day |
| **Live Allowed Sources** | 6 feeds (`we-work-remotely`, `remotive`, `real-work-from-anywhere`, `remote-ok`, `jobicy-supporting-apac`, `jobicy-admin-support-apac`) | 50+ diverse healthy sources |
| **Shadowed Sources** | 3 identities (`greenhouse:grafanalabs`, `recruitee:myjewellery`, `teamtailor:career.teamtailor.com`) | 100+ shadowed employer boards |
| **Primary Clock** | Cloudflare Worker (`workers/freshness-cron`) beating every 10 min | Dual self-healing clock with unhandled-error heartbeat diagnostics |
| **Secondary Clock** | Hunter GHA (`gha-hunter-pulse.yml`) every 15 min with failover standby | Standby failover with sub-30m takeover guarantee |
| **AI Ingestion Cost** | Workers AI Llama-3.1-8b/70b ladder + Gemini Flash-Lite fallback | 70%+ deterministic rejection/pass; AI reserved for extraction/ambiguity |
| **Search Engine** | SQLite FTS5 table (`opportunities_fts`) with structured column filters | FTS5 + precomputed taxonomy tags + shift/timezone overlays |

---

## 2. Target Architectural Topology

```text
                     ┌────────────────────────────┐
                     │ SOURCE DISCOVERY /          │
                     │ PROSPECTOR 2.0             │
                     └────────────┬───────────────┘
                                  │
                                  ▼
                     ┌────────────────────────────┐
                     │ COMPANY + SOURCE REGISTRY  │
                     │ capability / risk / health │
                     └────────────┬───────────────┘
                                  │
                                  ▼
                     ┌────────────────────────────┐
                     │ POLLING ECONOMICS          │
                     │ adaptive scheduling        │
                     └────────────┬───────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────┐
│ HARVEST                                                  │
│ ATS / RSS / JSON / allowed HTML                          │
└─────────────────────────────┬────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────┐
│ STAGE 0 — SOURCE + STRUCTURED METADATA                   │
│ geo / workplace / location / office / source policy      │
│ (0 LLM calls)                                            │
└─────────────────────────────┬────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────┐
│ STAGE 1 — DETERMINISTIC POLICY + TAXONOMY                │
│ obvious geo exclusions, positive role families           │
│ negative authorization constraints (0 LLM calls)         │
└─────────────────────────────┬────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────┐
│ STAGE 2 — CONFIDENCE / HEURISTIC GATE                    │
│ high-confidence bypass vs ambiguous band                 │
└─────────────────────────────┬────────────────────────────┘
                              │
                   ┌──────────┴───────────┐
                   │                      │
             HIGH CONFIDENCE         AMBIGUOUS
                   │                      │
                   │                      ▼
                   │          ┌────────────────────────┐
                   │          │ STAGE 3 — LLM          │
                   │          │ ambiguity + extraction │
                   │          └───────────┬────────────┘
                   │                      │
                   └──────────┬───────────┘
                              ▼
┌──────────────────────────────────────────────────────────┐
│ NORMALIZATION                                            │
│ schema validation, role taxonomy, timezone/shift, pay    │
└─────────────────────────────┬────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────┐
│ DEDUP & IDEMPOTENT PERSISTENCE (Cloudflare D1)           │
└─────────────────────────────┬────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────┐
│ DISCOVERY SURFACE (Astro + D1 FTS5 + Structured Filters) │
└──────────────────────────────────────────────────────────┘
```

---

## 3. Workstreams Catalog (A through T)

- **[Workstream A — Company & Source Registry](./SOURCE_PERPETUITY_STRATEGY.md)**: Decouple capability (`greenhouse`, `lever`, `ashby`, `workable`, `breezy`, `recruitee`, `teamtailor`) from identity (`acme`, `grafanalabs`). Declarative registry via D1 migration 0036.
- **[Workstream B — Two-Speed Source Governance](./decisions/ADR-007-autonomous-constitutional-source-governance.md)**: Risk-proportional admission: Tier A (Direct structured ATS / RSS), Tier B (Variable APIs), Tier C (HTML / brittle interfaces).
- **[Workstream C — Prospector 2.0](./prospector-latest.md)**: Discover employer career tokens from ingested opportunities and directory entries, feed durable candidate queue (`prospect-candidate.ts`).
- **[Workstream D — Source Economics](./source-economics-latest.md)**: Persistent tracking of yield per fetch, AI escalations per qualified job, duplicate ratios, and freshness latency.
- **[Workstream E — Zero-Waste Triage](./gauntlet/evidence/DATA-06-taxonomy-convergence.md)**: Hierarchical filtering: Stage 0 structured location, Stage 1 deterministic regex (`geoGate.ts`), Stage 2 confidence scoring, Stage 3 LLM ambiguity resolution.
- **[Workstream F — Event-Driven Processing & Isolation](./incident-2026-08-20-inngest-divert-freeze.md)**: Resilient batching, subrequest budget containment, idempotency keys, and crash-resilient isolation.
- **[Workstream G — Role-Family Expansion](./gauntlet/evidence/TAX-02-ai-writing-categories.md)**: Preserve and expand coverage for VA / Remote Operations, Customer Support, AI Operations, Technical Writing, and Knowledge Management.
- **[Workstream H — Philippine / APAC Source Expansion](./goldilocks-source-expansion-handoff-2026-06-12.md)**: Curate direct PH remote employers, agencies, and APAC-friendly global remote companies.
- **[Workstream I — User Discovery & Search](./plans/2026-08-09-production-apex-hardening.md)**: Leverage D1 FTS5 (`opportunities_fts`) with structured faceted search before any heavy vector additions.
- **[Workstream J — Timezone & Shift Intelligence](#)**: Parse and project Philippine daylight, mid, night, and flexible shifts with explicit confidence annotations.
- **[Workstream K — Compensation Normalization](#)**: Preserve original employer salary disclosures while estimating transparent monthly/PHP equivalents.
- **[Workstream L — Source Trust & Scam Signals](#)**: Observable verification: direct employer domain matching, known ATS hosts, and anti-fraud filters.
- **[Workstream M — Source Doctor](./source-health-latest.md)**: Root-cause diagnostic engine distinguishing `NO_JOBS` from `NETWORK_FAILURE` from `ANOMALOUS_OUTPUT`.
- **[Workstream N — Freshness SLOs](./freshness-masterplan-2026-07.md)**: Enforce sub-15-minute pipeline heartbeat and detect silent board staleness.
- **[Workstream O — Anomaly Detection](#)**: Rolling window MAD / IQR detection for sudden volume collapses, duplicate spikes, or geo-rejection anomalies.
- **[Workstream P — Python Analytics Tooling](#)**: Offline diagnostic scripts under `scripts/` or `research/` for yield optimization and labor market trend modeling.
- **[Workstream Q — Continuous Evals](./gauntlet/evidence/DATA-06-taxonomy-convergence.md)**: Representative synthetic eval corpora (`fixtures/triage-eval.json`) measuring precision, recall, and escalation rates.
- **[Workstream R — Observability](#)**: Unified diagnostic rollups (`source-health-latest.md`, `health-digest-latest.md`, `__ingest_diag__`).
- **[Workstream S — FinOps & Free-Tier Governance](#)**: Strict $0/hobby-tier preservation across Cloudflare Workers, Cloudflare D1, and Gemini API free limits.
- **[Workstream T — Project Preservation & Continuity](./SYSTEM_SAVEPOINT.md)**: Complete traceability of all active and merged initiatives.

---

## 4. Master Execution Tracker

| ID | Workstream | Status | Dependency | Evidence / Merged Ref | Next Action |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ISSUE-123** | Ingest Heartbeat Catch-All | **VERIFIED** | — | `b33f8e1` (tested in `scrape-unhandled-error.test.ts`) | Open PR, merge to `main` |
| **EX-01** | Exact-Six Yield Diagnosis | **DONE** | — | PR #115, #117 (`360ece9`, `1aac624`) | Retain yield classes |
| **EX-02** | Greenhouse Grafana Shadow | **DONE** | EX-01 | PR #116, #118, #119 (`4b7e515`, `cc5a1f1`, `aa29dd7`) | Live row verification |
| **EX-03** | Hourly Shadow Dispatch | **DONE** | EX-02 | PR #120 (`32b8760`) | Observes admitted shadows |
| **EX-04** | Recruitee MyJewellery Shadow | **DONE** | EX-03 | PR #121 (`6f86055`) | Shadow row in D1 |
| **EX-05** | Teamtailor Career Shadow | **DONE** | EX-04 | PR #122 (`c1b903c`) | Shadow row in D1 |
| **EX-06** | Lever Postings Qualification | **QUALIFIED** | EX-05 | `b225b3e` (`EX-06-lever-qualification.md`) | Retarget candidate employer |
| **EX-07** | Grafana Capped Canary | **HARD BLOCKED** | `sp23-shadow-7d-v1` | ~1.2/7 days elapsed (earliest 2026-09-06T08:46Z) | Await 7 full days of shadow |
| **EX-08** | Remaining Greenhouse Boards | **PLANNED** | EX-06 | SP-12 / D1 directory tokens | Probe & admit GitLab, Remote.com |
| **EX-09** | Workable GHA Shadow | **PLANNED** | EX-08 | SP-10 | Hourly GHA feed preprocessor |
| **EX-10** | Prospector Candidate Drain | **PLANNED** | EX-09 | SP-06 | Drain into QUALIFY/PROBE |
| **APEX-W0** | Reality Reconciliation | **ACTIVE** | — | `docs/APEX_10X.md`, `CURRENT.md` | Commit & publish control plane |
| **APEX-W1** | Source Economics Telemetry | **PLANNED** | APEX-W0 | `source-economics.ts` | Real-time D1 metrics aggregation |
| **APEX-W2** | Two-Speed Source Governance | **PLANNED** | APEX-W1 | ADR-007 addendum | Structured admission fast-path |

---

## 5. Execution Waves

- **Wave 0: Reality Reconciliation (CURRENT)**: Align documentation, verify in-flight fixes (Issue #123, EX-06), publish authoritative APEX masterplan and bootloaders.
- **Wave 1: Source Economics & Measurement**: Implement automated daily metrics for yield per fetch, AI triage cost, and rejection classification.
- **Wave 2: Risk-Proportional Source Governance**: Codify fast-track admission for Tier A direct ATS feeds with automated schema validation.
- **Wave 3: Direct ATS Registry Expansion**: Scale employer boards across qualified mechanisms (Greenhouse EX-08, Ashby, Workable EX-09).
- **Wave 4: Zero-Waste Triage**: Expand deterministic geo/taxonomy filters to cut LLM escalation rates below 25% without sacrificing recall.
- **Wave 5: Execution Isolation & Resilience**: Harden background processing against Worker subrequest and execution timeouts.
- **Wave 6: Prospector 2.0 Automation**: Continuous mining of high-trust employers with automated candidate proposal generation.
- **Wave 7: Search & User Intelligence**: Expose FTS5 search enhancements, timezone/shift indicators, and salary estimates.
- **Wave 8: Self-Optimizing Source Portfolio**: Adaptive scheduling based on empirical yield and change frequency.

---

## 6. FinOps & Free-Tier Guardrails

All architectural choices must respect the $0/hobby envelope:
- **Cloudflare Workers**: $\le 100\text{k}$ requests/day, max 50 subrequests per invocation.
- **Cloudflare D1**: $\le 5\text{M}$ read rows/day, $\le 100\text{k}$ write rows/day.
- **Google Gemini Free Tier**: Flash-Lite ($\sim 1,500$ RPM quota) reserved for ambiguity resolution.
- **GitHub Actions**: Standard free minutes budget via serialized hourly/daily schedules.
