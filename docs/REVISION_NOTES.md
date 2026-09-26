# VA FREELANCE HUB — REVISION NOTES & MIGRATION PLAN
## Modernization of the Operating Constitution (v5.1 Monolith → v5.2 Modular Suite)

```yaml
document_metadata:
  document_type: REVISION_NOTES
  document_status: ACTIVE_OPERATIONAL
  version: "5.2.0"
  effective_at: "2026-09-26T11:49:00+08:00"
  last_verified_at: "2026-09-26T11:49:00+08:00"
  verified_by: "agent-antigravity"
  applies_to_commit: "72709b153b3ada5916a7e6fefd40c3a8ec0f6bbd"
  authority_tier: 2
```

---

## 1. EXECUTIVE SUMMARY

The monolithic Operating Constitution v5.1 has been completely deconstructed and modernized into a modular, production-grade governance suite implementing the embedded correction set (**C1–C15**) and the surgical architecture addendum (**C16–C20**).

The new suite consists of:
1. `CONSTITUTION.md`: Stable, immutable normative core (< 15 pages).
2. `OPERATIONS.md`: Daily maintainer runbook and incident playbooks.
3. `docs/ACCEPTED_PARAMETERS.yaml`: Machine-readable single source of truth for all system parameters.
4. `docs/generated/PARAMETERS.md`: Generated human-readable parameter mirror.
5. `docs/METRICS.md`: Mathematical cohort separation formulas and production SQL queries.
6. `docs/ARCHITECTURE_PHASES.md`: Rigorous phase gates (Phases 0–11) and Cloudflare V8/WASM runtime limits.
7. `docs/ENFORCEMENT.md`: Matrix mapping every normative policy to concrete technical enforcement or paper risk tag.
8. `docs/REVISION_NOTES.md`: This document.

---

## 2. CONTRADICTIONS RESOLVED

| Item | Problem in v5.1 Monolith | Resolution in v5.2 Modular Suite | Governing Section |
|---|---|---|---|
| **C4: Autonomy Sovereignty at L1** | §IV.10 claimed AI decisions are "authoritative and binding", while §0.1/§IV.2 admitted active production operates at **L1 ADVISE** (direct contradiction). | Redefined sovereignty contract: At L1 (current truth), AI is strictly **advisory**; deterministic code and human approvals retain 100% mutation authority. Autonomy is authoritative ONLY for classes formally promoted to L2+. Outside envelope, AI must abstain or escalate. | `CONSTITUTION.md §2.2` |
| **C1 & C3: Paper System Policies** | Policies forbade bypasses or fabricated timestamps in prose without specifying technical mechanisms. | Every policy mapped in `ENFORCEMENT.md` to a concrete DB constraint, trigger, CI check, or runtime hook. Missing checks are tagged `UNENFORCED — PAPER RISK`. | `docs/ENFORCEMENT.md` |
| **C2: Parameter Drift** | Operational thresholds were duplicated across markdown text, YAML, and code constants. | Codified `docs/ACCEPTED_PARAMETERS.yaml` as sole canonical truth; markdown prose mirrors YAML; CI parity audit specified. | `docs/ACCEPTED_PARAMETERS.yaml` |
| **C5: Promotion Evidence at L1** | Promotion required 30 days of low FP/FN rates, impossible to attribute since L1 makes no autonomous decisions. | Two-stage model: Stage 1 measures recommendation quality at L1 offline against shadow cohorts; Stage 2 monitors decision quality at L2+. | `CONSTITUTION.md §7.2` |
| **C6: Unranked Escalations** | All escalations were equal markdown files without SLAs or fail-closed rules when owner is away. | Four-tier matrix (SEV-1 through SEV-4) with strict SLAs (1h, 4h, 24h, 72h) and owner-unavailable fail-closed/quarantine protocols. | `CONSTITUTION.md §9.2`, `OPERATIONS.md §13` |
| **C7: Multi-Agent Concurrency** | Agents told to "coordinate through savepoint" without a mutual exclusion lock, causing race conditions. | Embedded atomic lease lock in `SYSTEM_SAVEPOINT.md` with max 2-hour TTL and `STOP — DIRTY OVERLAP` on file collisions. | `OPERATIONS.md §2` |
| **C8: Blended Daily Flow Metrics** | Backlog unlocks, imports, and replay recoveries were counted toward the 100/day fresh supply floor. | Strict mathematical cohort separation: $\text{Daily Flow} = \text{First Published Today} - \text{Backlog Imports} - \text{Reactivations} - \text{Replay Recoveries}$. Explicit production SQL query provided. | `docs/METRICS.md §1` |
| **C9: Incomplete Architecture Phase Gates** | Phases 1–3 and 6–11 lacked exit criteria; Cloudflare V8/WASM constraints were omitted. | Every phase (0–11) codified with deliverable, numeric exit criteria, evidence artifact, rollback step, and abandonment trigger; Cloudflare isolate bounds codified. | `docs/ARCHITECTURE_PHASES.md` |
| **C10: Unenforced ADR-008 Risk Tiers** | ADR-008 established 3 tiers, but D1 had no schema columns or gateway logic to enforce them. | Codified risk tier policies in `policy-resolver.ts`; defined required D1 schema migration (`0048`) and tagged as paper risk pending migration. | `OPERATIONS.md §7`, `docs/ENFORCEMENT.md §4` |
| **C11: Reactive Security** | Security was an after-the-fact checklist rather than automated engineering. | Mandated CI secret scanning, 24-hour automated opt-out purge pipeline, and 30-day rehearsal restore drills. | `OPERATIONS.md §11` |
| **C12: Unenforced Time Budget** | The 70% operational session rule had no ledger or audit mechanism. | Embedded structured `session_ledger` entry in savepoints with rolling 14-session audit query. | `OPERATIONS.md §12` |
| **C13: Unexplained Prohibitions** | Absolute bans on Band 4 sources (SmartRecruiters, OnlineJobs.ph) lacked documented context. | Codified Prohibitions Register with reason classes, evidence references, and review cadences. | `CONSTITUTION.md §6.1` |
| **C14: Untracked Owner Overrides** | Overrides permitted at boundaries without permanent audit tracking. | Mandated Owner Override Ledger in `docs/overrides/` with max 30-day auto-expiration. | `CONSTITUTION.md §9.4` |
| **C15: Stale Documentation Authority** | Outdated markdown documents claimed authority over fresh runtime evidence. | Mandated front-matter verification metadata; unverified docs $> 30\text{ days}$ auto-downgraded to `HISTORICAL`. | `CONSTITUTION.md §10.2` |
| **C16: Ingestion Orchestrator Coupling** | Adding a new source required modifying central orchestration logic (`scrape.ts`). | Convention-over-configuration contract: ordinary sources added via capability declaration, fixtures, and contract tests without central edits. | `CONSTITUTION.md §8.1`, `OPERATIONS.md §8` |
| **C17: Vendor-Name Routing** | Scrapers routed on vendor names (`greenhouse`, `lever`) rather than processing requirements. | Capability-based dispatch matrix ($C \times P \times S \times G \rightarrow \text{Processor}$) with full route telemetry. | `CONSTITUTION.md §8.2`, `OPERATIONS.md §9` |
| **C18: Overwritten Decision History** | Re-evaluation of listings overwrote prior assertions without lineage. | Datomic temporal model: prior decisions remain immutable; new decisions reference `supersedes_decision_id`. | `CONSTITUTION.md §8.3`, `OPERATIONS.md §10` |
| **C19: Imagined Code Anchors** | Prior text referenced `geo-gate.ts`, `publication-ledger.ts`, and `publication_ledger`. | Live code anchors verified: `packages/scraper/geoGate.ts`, `packages/scraper/publication-gateway.ts`, table `source_publication_ledger`. Missing anchors tagged `UNENFORCED — PAPER RISK`. | `docs/ENFORCEMENT.md`, `OPERATIONS.md §3` |
| **C20: Mixed Side Effects in Pipelines** | Ingestion functions mixed parsing, D1 writes, AI calls, and publication in single functions. | Explicit stage separation: deterministic transformations remain pure; side effects restricted to named gateway boundaries. | `CONSTITUTION.md §8.5` |

---

## 3. OPEN QUESTIONS REGISTER (`<UNSET>` PARAMETERS)

The following parameters could not be grounded in existing repository code or accepted ADRs and have been registered as `<UNSET>`:
1. `automated_opt_out_cron_interval_hours`: Frequency for running automated opt-out purging cron. (Proposed: 6 hours; needs owner authorization).
2. `database_backup_retention_days`: Cloudflare D1 automated backup retention window. (Needs owner configuration check).
3. `monthly_hard_cost_cap_usd`: Total infrastructure hard spending ceiling across Cloudflare, Turso, and OpenRouter. (Proposed: $25.00/month; needs owner authorization).

---

## 4. NEW LEDGERS & DIRECTORIES ESTABLISHED

To support the technical governance suite, the following operational directories and ledgers are codified:
- `docs/graduations/`: Formal graduation packages for promoting autonomy levels or runtime kernels.
- `docs/overrides/`: Owner override artifacts documenting bypassed rules with 30-day expiration.
- `docs/escalations/`: Standardized escalation artifacts across SEV-1 to SEV-4.
- `docs/exceptions/`: Technical documentation for extraordinary sources requiring central orchestrator edits.
- `session_ledger`: Embedded in `docs/SYSTEM_SAVEPOINT.md` to track operational vs. architectural session ratios.
- `active_lease`: Embedded in `docs/SYSTEM_SAVEPOINT.md` to prevent multi-agent concurrency collisions.

---

## 5. STEP-BY-STEP ROLLOUT & MIGRATION PLAN

```text
Step 1: Commit Governance Suite
  - Commit CONSTITUTION.md, OPERATIONS.md, docs/ACCEPTED_PARAMETERS.yaml,
    docs/generated/PARAMETERS.md, docs/METRICS.md, docs/ARCHITECTURE_PHASES.md,
    docs/ENFORCEMENT.md, and docs/REVISION_NOTES.md.

Step 2: Run Verification Rings
  - Verify zero regressions:
    bun run test
    bun run typecheck
    bun run audit:guardrails
    bun run build

Step 3: Push to origin/main & Corroborate Deployment
  - Push commit; observe GitHub Actions Sovereign CI Guardrail run.
  - Verify Cloudflare Pages deployment completes successfully.

Step 4: Execute Remediations for Paper Risks (Scheduled Next Units)
  - Unit 1 (CI-AUDIT-PARAMETERS-SCRIPT): Implement scripts/ci/audit-parameters.ts
    to enforce YAML-to-code parity in CI.
  - Unit 2 (D1-MIGRATION-0048-RISK-TIERS): Apply additive migration adding
    risk_tier and shadow_window_days to source_registry.
  - Unit 3 (CI-GITLEAKS-INTEGRATION): Add automated secret scanning to ci-guardrail.yml.
```
