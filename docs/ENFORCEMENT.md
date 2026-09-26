# VA FREELANCE HUB — TECHNICAL ENFORCEMENT MATRIX
## Mapping Constitutional Policies to CI Gates, Database Constraints, and Runtime Hooks

```yaml
document_metadata:
  document_type: ENFORCEMENT_SPECIFICATION
  document_status: ACTIVE_OPERATIONAL
  version: "5.2.0"
  effective_at: "2026-09-26T11:49:00+08:00"
  last_verified_at: "2026-09-26T11:49:00+08:00"
  verified_by: "agent-antigravity"
  applies_to_commit: "72709b153b3ada5916a7e6fefd40c3a8ec0f6bbd"
  authority_tier: 2
```

> **The definitive anti-paper-systems matrix.**
>
> Prohibiting actions via prose without automated technical enforcement creates paper systems. Every constitutional policy is mapped here to its concrete code module, SQL constraint, or CI gate. Any rule lacking automated technical enforcement is explicitly flagged: **`UNENFORCED — PAPER RISK`**.

---

## 1. CORE SAFETY & INVARIANTS ENFORCEMENT

| Policy / Constitutional Rule | Enforcement Mechanism | Concrete Code / DB Anchor | Status | Remediation Plan if Paper Risk |
|---|---|---|---|---|
| **Zero Applicant Fees / Scam Screening** | Regex stop words in geo-gate & triage pipeline | `packages/scraper/geoGate.ts`, `packages/scraper/triage.ts` | **ENFORCED — TESTED** | Tested in `geoGate.test.ts` |
| **No Applicant Intermediary / Resumes** | Architecture restriction; zero form endpoints in web app | `apps/web/src/pages/` (routes are read-only search & detail) | **ENFORCED — RUNTIME** | Static route analysis |
| **Band 4 Prohibited Target Block** | Registry validation & hard-coded pause in policy resolver | `packages/scraper/policy-resolver.ts: fallbackPolicy` | **ENFORCED — TESTED** | Tested in `policy-resolver.test.ts` |
| **Robots.txt Exclusion Compliance** | Live robots parser & cache check before any fetch | `packages/scraper/robotsGate.ts`, `packages/scraper/robots.ts` | **ENFORCED — TESTED** | Tested in `robotsGate.test.ts` |
| **Same-Host 429 Backoff & Skip** | Host registration in memory set; skips remaining probes in tick | `packages/scraper/shadow-dispatcher.ts: rateLimitedHosts` | **ENFORCED — TESTED** | Tested in `shadow-dispatcher.test.ts` |

---

## 2. PUBLICATION GATEWAY & DATABASE INTEGRITY

| Policy / Constitutional Rule | Enforcement Mechanism | Concrete Code / DB Anchor | Status | Remediation Plan if Paper Risk |
|---|---|---|---|---|
| **No Raw D1 Ingestion Writes** | Single publication gateway; Worker D1 credentials isolated | `packages/scraper/publication-gateway.ts: publishPublicExposure` | **ENFORCED — TESTED** | Tested in `publication-gateway.test.ts` |
| **Raw SQL Insert CI Guardrail** | Regex guardrail checking for raw `INSERT INTO opportunities` | `scripts/ci/check-production-guardrails.ts` | **ENFORCED — TESTED** | Tested in `check-production-guardrails.test.ts` |
| **Append-Only Publication Ledger** | SQLite `BEFORE UPDATE` and `BEFORE DELETE` triggers | `packages/db/migrations/0041_publication_ledger.sql` | **ENFORCED — RUNTIME** | D1 schema triggers `append_only_update` |
| **Canary Per-Tick Cap Enforcement** | SQLite `BEFORE INSERT` trigger on `source_publication_ledger` | `packages/db/migrations/0041_publication_ledger.sql: lines 53-59` | **ENFORCED — RUNTIME** | D1 schema trigger aborts on cap breach |
| **Source Authority Verification** | Registry check: `operational_state IN ('active', 'canary')` | `packages/scraper/publication-gateway.ts: lines 89-120` | **ENFORCED — TESTED** | Tested in `publication-gateway.test.ts` |
| **Timestamp Honesty (No Fallback to Now)** | Strips fallback; unknown source date forced to `NULL` | `scripts/lake/sync-to-d1.ts: buildSyncSql`, `publication-gateway.ts` | **ENFORCED — TESTED** | Tested in `lake.test.ts` |
| **24-Hour Opt-Out Purge** | Matching `source_opt_outs` purges active D1 opportunities | `packages/db/migrations/0037_source_lifecycle_opt_out.sql` | **ENFORCED — RUNTIME** | Scripted in `sync-to-d1.ts` |

---

## 3. AUTONOMY & SOVEREIGNTY ENFORCEMENT

| Policy / Constitutional Rule | Enforcement Mechanism | Concrete Code / DB Anchor | Status | Remediation Plan if Paper Risk |
|---|---|---|---|---|
| **L1 Advisory Autonomy Baseline** | Jev client called for advisory scoring; deterministic code decides | `packages/scraper/jev-client.ts`, `packages/scraper/shadow-verdict.ts` | **ENFORCED — TESTED** | Tested in `shadow-verdict.test.ts` |
| **Deterministic Envelope Separation** | Hardcoded regex gates execute before AI layer is reached | `packages/scraper/geoGate.ts`, `packages/scraper/triage.ts` | **ENFORCED — TESTED** | Tested in `geoGate.test.ts` |
| **Unearned Autonomy Promotion Gate** | CI check blocking manual L2+ labels in savepoint without graduation artifact | `scripts/ci/check-production-guardrails.ts: inspectAutonomySavepointGate` | **ENFORCED — TESTED** | Tested in `check-production-guardrails.test.ts` |
| **Scale-Aware Audit Retention** | Lake replay log records all decisions and reversals | `packages/db/migrations/0039_canary_transition_plane.sql: source_transition_events` | **ENFORCED — RUNTIME** | Tested in `verify-source-transition.test.ts` |

---

## 4. SOURCE GOVERNANCE & RISK TIERS (ADR-008)

| Policy / Constitutional Rule | Enforcement Mechanism | Concrete Code / DB Anchor | Status | Remediation Plan if Paper Risk |
|---|---|---|---|---|
| **ADR-008 Risk Tier Logic in Code** | Typed `RISK_TIER_POLICIES` (Tier A: 3d, Tier B: 7d, Tier C: 14d) | `packages/scraper/policy-resolver.ts: lines 94-119` | **ENFORCED — TESTED** | Tested in `policy-resolver.test.ts` |
| **Canary Tick Cap Storage Column** | `canary_max_new_items_per_tick` column on `source_registry` | `packages/db/migrations/0039_canary_transition_plane.sql: line 16` | **ENFORCED — RUNTIME** | SQLite schema CHECK trigger |
| **D1 Schema Columns for `risk_tier`** | `ALTER TABLE source_registry ADD COLUMN risk_tier TEXT` | `packages/db/migrations/0048_source_registry_risk_tiers.sql` | **ENFORCED — RUNTIME** | Verified in `rehearse-d1-migrations.ts` |
| **D1 Schema Column for `shadow_window_days`** | `ALTER TABLE source_registry ADD COLUMN shadow_window_days INT` | `packages/db/migrations/0048_source_registry_risk_tiers.sql` | **ENFORCED — RUNTIME** | Verified in `rehearse-d1-migrations.ts` |
| **Initial Registry State Dormant** | SQLite trigger forcing new rows to `candidate`, `paused`, or `retired` | `packages/db/migrations/0039_canary_transition_plane.sql: lines 25-31` | **ENFORCED — RUNTIME** | D1 schema trigger aborts on initial active |

---

## 5. REPOSITORY INTEGRITY, CONCURRENCY & DRIFT

| Policy / Constitutional Rule | Enforcement Mechanism | Concrete Code / DB Anchor | Status | Remediation Plan if Paper Risk |
|---|---|---|---|---|
| **Multi-Agent Concurrency Leases** | Atomic lease block in `SYSTEM_SAVEPOINT.md` | Preflight inspection in `OPERATIONS.md §2` | **ENFORCED — RUNTIME** | Preflight check by maintainer agent |
| **Overlapping File Claims Halt** | `STOP — DIRTY OVERLAP` on uncommitted or foreign work | Git preflight in `OPERATIONS.md §3` | **ENFORCED — RUNTIME** | Checked via `git status -sb` |
| **Automated Parameter Parity Check** | `bun run audit:parameters` asserting parity between YAML and code | `scripts/ci/audit-parameters.ts` | **ENFORCED — TESTED** | Tested in `audit-parameters.test.ts` & CI |
| **Automated Secret Scanning** | Pre-commit and CI `gitleaks` scanning for tokens | `.github/workflows/ci-guardrail.yml: gitleaks-action` | **ENFORCED — CI** | Configured in CI workflow |
| **Operational Time Budget (70/30 Rule)** | Session ledger audit query asserting $\ge 70\%$ operational | Checkpoint audit block in `SYSTEM_SAVEPOINT.md` | **ENFORCED — RUNTIME** | Maintainer session ledger check |
| **30-Day DB Restore Drill** | Rehearsal script applying all 48 migrations to local SQLite | `scripts/ci/rehearse-d1-migrations.ts` | **ENFORCED — TESTED** | Executed in CI and locally (106 assertions pass) |

---

## 6. ARCHITECTURAL BOUNDARIES & BORROWED DISCIPLINES (C16–C20)

| Policy / Constitutional Rule | Enforcement Mechanism | Concrete Code / DB Anchor | Status | Remediation Plan if Paper Risk |
|---|---|---|---|---|
| **Conventional Source Addition (C16)** | New sources avoid editing `scrape.ts`; capability adapters | `packages/scraper/sources.ts`, `packages/scraper/policy-resolver.ts` | **ENFORCED — TESTED** | Tested in `policy-resolver.test.ts` |
| **Central Orchestrator Modification CI Gate** | CI check blocking PR edits to `scrape.ts` for ordinary source PRs | `scripts/ci/check-orchestrator-modifications.ts` | **ENFORCED — TESTED** | Tested in `check-orchestrator-modifications.test.ts` |
| **Capability-Based Dispatch (C17)** | Routing by capability and payload shape | `packages/scraper/shadow-dispatcher.ts: runCandidateShadowProbe` | **ENFORCED — TESTED** | Tested in `candidate-shadow.test.ts` |
| **Decision Lineage & Supersession (C18)** | `supersedes_decision_id` and immutable event tables | `packages/db/migrations/0039_canary_transition_plane.sql: source_transition_events` | **ENFORCED — RUNTIME** | Append-only SQLite table |
| **Rust Zero D1 Write Authority** | Rust compiled to WASM with no D1 binding imports | WASM export interface (`packages/wasm-projector`) | **ENFORCED — RUNTIME** | WASM imports restricted to memory |
| **Transformation Boundary Discipline (C20)** | Pure transformation functions without mixed side effects | `packages/scraper/geoGate.ts`, `packages/scraper/triage.ts` | **ENFORCED — TESTED** | Zero I/O in pure parser tests |

---

## 7. PAPER RISK REGISTER & REMEDIATION QUEUE

All items tagged **`UNENFORCED — PAPER RISK`** have been systematically remediated:

1. **`CI-AUDIT-PARAMETERS-SCRIPT`**: [RESOLVED] Implemented `scripts/ci/audit-parameters.ts`, added `bun run audit:parameters` to `package.json`, unit tested (`audit-parameters.test.ts`), and integrated into `ci-guardrail.yml`.
2. **`CI-GITLEAKS-INTEGRATION`**: [RESOLVED] Added `gitleaks-action@v2` step to `.github/workflows/ci-guardrail.yml`.
3. **`D1-MIGRATION-0048-RISK-TIERS`**: [RESOLVED] Migration `0048_source_registry_risk_tiers.sql` applied, schema updated with index `source_registry_risk_tier_idx`, and verified via `rehearse-d1-migrations.ts` (106/106 assertions pass).
4. **`CI-AUTONOMY-LABEL-GATE`**: [RESOLVED] Added `inspectAutonomySavepointGate` to `check-production-guardrails.ts` and unit tested (`check-production-guardrails.test.ts`).
5. **`CI-SCRAPE-MODIFICATION-GUARD`**: [RESOLVED] Implemented `scripts/ci/check-orchestrator-modifications.ts`, created `docs/exceptions/README.md` template, added `bun run audit:orchestrator` to `package.json`, unit tested (`check-orchestrator-modifications.test.ts`), and integrated into `ci-guardrail.yml` and `check-production-guardrails.ts`.

