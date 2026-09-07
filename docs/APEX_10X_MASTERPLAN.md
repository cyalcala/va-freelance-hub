# APEX-10X Master Strategy & Autonomous Governance Masterplan

## 0. Executive Mission & Prime Directive

Transform VA Freelance Hub into a high-yield, high-reliability, Philippines-centered remote job discovery engine capable of delivering approximately **10x qualified opportunity inflow** while preserving its founding principles:
1. **Conservative Source Governance**: No unauthorized scraping, no CAPTCHA/paywall bypass, no terms violations.
2. **Cloudflare-First Zero-Cost Architecture**: Maintain 100% operation within free-tier limits ($0/month).
3. **GitHub-Backed Durability & Recovery**: Every accepted slice is verified, committed, pushed, and observable in CI.
4. **Deterministic Pre-Filtering**: Zero-waste multi-stage ingestion rejecting disqualifiers before invoking AI.
5. **Exact Attribution & Linkback**: Direct users to the original employer or posting page; store minimal discovery metadata.

This is an **architectural expansion and bottleneck inversion**, not a rewrite. All existing workstreams ([`SP-00`..`SP-23`](./plans/SOURCE_PERPETUITY_IMPLEMENTATION_PLAN.md), [`EX-01`..`EX-13`](./gauntlet/EXPANSION_LOOP.md), and APEX Waves 0–8) remain active and respected as recorded in [`docs/APEX_10X_WORKSTREAM_LEDGER.md`](./APEX_10X_WORKSTREAM_LEDGER.md).

---

## 1. Authority Order

When resolving ambiguities or contradictions, adhere strictly to this precedence order:
1. **Explicit User Instructions**.
2. **Observable current state of `cyalcala/va-freelance-hub` on GitHub**.
3. **Current production behavior and deployed evidence**.
4. **Accepted ADRs and active governance rules in the repository** (ADR-001 through ADR-008).
5. **`cyalcala/agent-governance-kernel` (AGK)** control plane.
6. **`cyalcala/ai-skills`** routing and capabilities.
7. **Current recovery/savepoint documentation** (`docs/SYSTEM_SAVEPOINT.md`, `docs/HANDOFF.md`, `docs/bootloaders/CURRENT.md`).
8. **Historical documentation**.
9. **External architectural recommendations**.
10. **Agent assumptions**.

> **Methodical Doubt Rule**: Never treat documentation as truth if repository code, D1 schema, or deployed workflows contradict it. If code contains a feature that docs list as pending, update the documentation; do not redo completed work.

---

## 2. The 10x North Star & Autonomy Cutover Predicate

### 2.1 Empirical KPI Baseline ($B_0$) vs Target
- **Baseline ($B_0$)**: $8.5$ eligible new jobs/day (range 7–10 jobs/day across exact-six feeds).
- **Target ($\text{APEX\_10X\_TARGET}$)**: $10 \times B_0 = 85$ net newly published eligible jobs/day (range 50–100+ qualified jobs/day).
- **Diversification Target**: Top-1 source share $\le 25\%$ (down from $70.98\%$).
- **Efficiency Target**: $\le 2.0$ LLM calls per accepted job.

### 2.2 Autonomy Cutover Predicate
Exact-six source behavior (`we-work-remotely`, `remotive`, `real-work-from-anywhere`, `remote-ok`, `jobicy-supporting-apac`, `jobicy-admin-support-apac`) is the **accepted production boundary**.
No automated autonomous addition may graduate from shadow to live public publishing until all conditions of the **Autonomy Cutover Predicate** are satisfied:
1. Candidate source runs $\ge 7$ full days in non-publishing shadow mode without error rate $> 5\%$.
2. Source capability probe validates schema, robots.txt allowance, and rate limits.
3. Geo qualification yields $\ge 1$ genuine Philippines-eligible listing per 100 items seen.
4. Two-speed risk tiering (ADR-008) assigns a formal admission ceiling and canary schedule.
5. Capped canary phase completes at $\le 10$ items/tick with zero data quality alerts.
6. Rollback SQL and automated fail-safe triggers are verified in D1.

---

## 3. The APEX-10X Flywheel Architecture

```text
SOURCE DISCOVERY
       ↓
EMPLOYER / SOURCE CANDIDATE (Prospector 2.0)
       ↓
ATS / FEED FINGERPRINT (Greenhouse, Lever, Ashby, Workable, RSS, JSON)
       ↓
SOURCE POLICY & ROBOTS CHECK (Two-Speed Governance / ADR-008)
       ↓
CAPABILITY PROBE (Endpoint Schema Validation)
       ↓
SOURCE REGISTRY (D1 Registry / Migration 0036)
       ↓
ADAPTIVE HARVESTING (Source Economics / Backoff)
       ↓
CONTENT HASH & SOURCE-ID DEDUP (Stage 0)
       ↓
STRUCTURED METADATA GATE (Stage 1 - Office, Country, State Codes)
       ↓
DETERMINISTIC GEO & POLICY GATE (Stage 2 - geoGate.ts)
       ↓
DETERMINISTIC ROLE-FAMILY GATE (Stage 3 - Job Taxonomy)
       ↓
AMBIGUITY RESOLUTION?
   ├── NO  → Fast Pass / Deterministic Reject (0 LLM calls)
   └── YES → STAGE 4: LLM ESCALATION (Workers AI / Gemini Flash-Lite)
       ↓
SCHEMA VALIDATION & CANONICAL NORMALIZATION
       ↓
CROSS-SOURCE DEDUP & OPPORTUNITY SCORING
       ↓
D1 PERSISTENCE (Idempotent Upsert)
       ↓
FTS5 SEARCH & STRUCTURED PRODUCT DISCOVERY
       ↓
SOURCE ECONOMICS & HEALTH MEMORY FEEDBACK ↺
```

---

## 4. The Nine-Phase Gauntlet (G1–G9)

All major work units execute through this structured verification cycle:

- **G1 — Orient & Reconcile**: Inspect repository truth, git logs, migrations, tests, PRs, and reconcile documentation.
- **G2 — Baseline & Bottleneck Proof**: Measure production metrics and prove limiting constraints with evidence.
- **G3 — Architecture Contract**: Define minimal, additive architectural specifications, schemas, and ADRs.
- **G4 — Source Portfolio Expansion**: Add verified direct employer identities through reusable ATS capabilities.
- **G5 — Zero-Waste Triage**: Optimize the multi-stage filter to maximize deterministic rejection and minimize AI calls.
- **G6 — Durable Execution**: Isolate batch workloads, enforce subrequest limits, and guarantee crash resilience.
- **G7 — Discovery Value**: Elevate product utility with FTS5 search, timezone/shift tags, and salary estimates.
- **G8 — Adversarial Review**: Subject all changes to an independent critic testing failure modes, counterexamples, and regressions.
- **G9 — Deploy, Measure, Savepoint & Loop**: Verify CI, observe deployment, record metrics, update `docs/SYSTEM_SAVEPOINT.md`, and advance.

---

## 5. Non-Regression Budget

An expansion that damages data quality or system reliability is considered a failure. The system must maintain:
- **Zero Paid Infrastructure**: 100% \$0/month hobby tier.
- **Subrequest Cap**: Max 50 subrequests per Cloudflare Worker invocation.
- **Freshness Invariant**: Primary clock beats every 10 min; secondary watchdog alerts at 15 min.
- **Zero Leakage**: Non-publishing shadows must NEVER publish to live active listings.
- **Deterministic Truth**: Never fabricate timestamps, salary figures, or shift details. Return `null` when unstated.
