# VA FREELANCE HUB — ARCHITECTURE EVOLUTION PHASES (0–11)
## Runtime Bounds, Explicit Gated Exit Criteria, and Abandonment Rules

```yaml
document_metadata:
  document_type: ARCHITECTURAL_SPECIFICATION
  document_status: ACTIVE_OPERATIONAL
  version: "5.2.0"
  effective_at: "2026-09-26T11:49:00+08:00"
  last_verified_at: "2026-09-26T11:49:00+08:00"
  verified_by: "agent-antigravity"
  applies_to_commit: "72709b153b3ada5916a7e6fefd40c3a8ec0f6bbd"
  authority_tier: 2
```

> **The architectural roadmap for evolving VA Freelance Hub without destabilizing the production Cloudflare/Astro/D1 stack.**
>
> Architecture evolution is strictly subsidiary to operational supply. Every phase is gated by empirical verification, explicit numeric criteria, and automatic rollback triggers.

---

## 1. CLOUDFLARE RUNTIME & WASM BOUNDS (IMMUTABLE LIMITS)

Before introducing any native, compiled, or external candidate, it MUST be evaluated against Cloudflare Workers / Pages runtime limits:

| Runtime Parameter | Immutable Constraint | Architectural Impact |
|---|---|---|
| **V8 Isolate Memory Limit** | **128 MB** RAM | Ingestion and HTML parsers must stream or chunk payloads; zero in-memory full DOM tree retention for large files. |
| **Compiled WASM Size** | $\le 1\text{ MB}$ uncompressed | Rust candidates must compile with `lto = true`, `opt-level = "z"`, and strip all debug symbols. |
| **Instantiation Latency** | $\le 15\text{ ms}$ cold start | WASM modules must instantiate synchronously without disk or network fetches. |
| **Syscall Envelope** | Zero native OS syscalls | No filesystem I/O, no raw sockets, no thread spawning (`std::thread` is prohibited). |
| **Concurrency Model** | Single-threaded event loop | Architecture evolution must not assume background daemon processes or native multithreading. |

---

## 2. GATED PHASE SPECIFICATIONS (PHASES 0–11)

### Phase 0 — Reconnaissance, Runtime Bounds & Empirical Baseline [COMPLETED]
- **Deliverable:** `docs/architecture/CURRENT_STATE.md` mapping the 17 core production paths, and `docs/architecture/BASELINE.md` recording CPU time per tick, memory consumption, ingestion latency, parser failure rates, and build times.
- **Numeric Exit Criteria:** 100% of the 17 production paths documented with commit SHAs; baseline CPU time and memory mapped across at least 100 historical runs; 0 production mutations.
- **Evidence Artifact:** `docs/architecture/BASELINE.md` and `docs/architecture/CURRENT_STATE.md` (SHA-anchored to `b9dc5e6`).
- **Status:** **COMPLETED** (17/17 paths mapped, 500-run sample from 56,426 fetch events, 2,647 shadow observations, zero production mutations).
- **Rollback Step:** Delete documentation files; zero code risk.
- **Abandonment Trigger:** Stalled for $> 14\text{ days}$ without baseline telemetry.
- **Owner Authorization Required:** **NO** (Read-only diagnostic).

---

### Phase 1 — Architecture Constitution & Interface Contracts [COMPLETED]
- **Deliverable:** Formal ADRs defining cross-plane boundaries (`ADR-007`, `ADR-008`, `CONSTITUTION.md`).
- **Numeric Exit Criteria:** 100% of component boundaries (TypeScript, Rust, Python, Jev, Turso, D1) signed off; zero circular dependencies in package graph.
- **Evidence Artifact:** Accepted ADR files in `docs/decisions/`.
- **Status:** **COMPLETED** (`ADR-007`, `ADR-008`, and `CONSTITUTION.md` v5.2 active; zero circular package dependencies; signed off under Operating Constitution v5.2 Suite).
- **Rollback Step:** Revert ADR commits to status `PROPOSED`.
- **Abandonment Trigger:** Unresolvable governance contradiction between planes.
- **Owner Authorization Required:** **YES**.

---

### Phase 2 — Additive D1 Evidence & Decision History Schema [COMPLETED]
- **Deliverable:** Additive D1 migrations creating typed decision history and lease tracking without mutating live serving tables (`0036`–`0041`).
- **Numeric Exit Criteria:** 100% migration rehearsal success (`bun run scripts/ci/rehearse-d1-migrations.ts`); zero columns dropped or modified on existing tables; `changed_db=false` for live data.
- **Evidence Artifact:** Migration SQL files and rehearsal test logs.
- **Status:** **COMPLETED** (Additive migrations 0036–0049 deployed to production D1; 107/107 schema assertions pass on fresh and legacy databases; zero columns dropped or altered; `changed_db=false` on serving mart).
- **Rollback Step:** Down migrations dropping additive tables; live serving untouched.
- **Abandonment Trigger:** Migration causes table locks $> 100\text{ ms}$ on live D1 serving mart.
- **Owner Authorization Required:** **YES**.

---

### Phase 3 — Python Analytics over Preserved Historical Cohorts [COMPLETED]
- **Deliverable:** Read-only Python evaluation harness in `scripts/analytics/` analyzing yield and detecting anomalies over preserved Turso lake cohorts.
- **Numeric Exit Criteria:** 100% pass rate on `python3 -m unittest discover -s scripts/analytics`; strictly zero D1 or Worker write permissions granted to Python scripts.
- **Evidence Artifact:** Test run output in CI (`ci-guardrail.yml`).
- **Status:** **COMPLETED** (15/15 unit tests pass in `scripts/analytics/`; read-only permission envelope verified; executed in CI guardrail).
- **Rollback Step:** Remove scripts from `scripts/analytics/`.
- **Abandonment Trigger:** Python analysis yields no actionable supply recommendations within 30 days.
- **Owner Authorization Required:** **NO** (Read-only analytical plane).

---

### Phase 4 — Rust / WASM Candidate Kernel
- **Deliverable:** Memory-bounded string/HTML extraction kernel compiled to WASM (`packages/wasm-projector/`).
- **Numeric Exit Criteria:** Input bounded $\le 2\text{ MB}$; WASM bundle size $< 1\text{ MB}$; zero network or filesystem syscalls; 100% offline fixture tests passing.
- **Evidence Artifact:** `packages/wasm-projector/pkg/projector.wasm` and test suite.
- **Rollback Step:** Delete candidate crate directory.
- **Status:** **PENDING_OWNER_AUTHORIZATION** (Requires Rust toolchain installation [`rustup`, `wasm-pack`] and explicit owner authorization).
- **Abandonment Trigger:** WASM binary exceeds 1 MiB or cold start exceeds 15ms.
- **Owner Authorization Required:** **YES**.

---

### Phase 5 — Rust vs. TypeScript Shadow Parity & Benchmark
- **Deliverable:** Shadow comparator executing Rust WASM and TypeScript parsers side-by-side on identical live feeds.
- **Numeric Exit Criteria:** $\ge 99.99\%$ character-level parity over at least 5,000 real-world vacancy payloads; Rust parser exhibits $\ge 2\times$ memory reduction; strictly 0 D1 writes from Rust.
- **Evidence Artifact:** `docs/benchmarks/RUST_TS_PARITY_LATEST.md`.
- **Rollback Step:** Disable shadow comparator flag; traffic stays 100% TypeScript.
- **Abandonment Trigger:** Parity falls below 99.9% after 3 revision attempts.
- **Owner Authorization Required:** **NO** (Shadow execution has zero publication authority).

---

### Phase 6 — Systems Specialization Bake-Off
- **Deliverable:** Controlled benchmark comparing Rust WASM candidate against historical Zig parser assets (`packages/zig-parser/`) on standardized test fixtures.
- **Numeric Exit Criteria:** Benchmark executed across 1,000 malformed, truncated, and edge-case feeds; memory bounds, cold-start latency, and recovery behavior quantified.
- **Evidence Artifact:** `docs/benchmarks/SYSTEMS_BAKEOFF_REPORT.md`.
- **Rollback Step:** Retain winner in shadow; archive loser.
- **Abandonment Trigger:** Neither compiled parser demonstrates meaningful advantage over TypeScript.
- **Owner Authorization Required:** **NO** (Offline fixture evaluation).

---

### Phase 7 — Capability Registry & Conventional Source Adapters (C16 & C17)
- **Deliverable:** Declarative Capability Registry decoupling source definitions from central orchestration.
- **Numeric Exit Criteria:**
  1. Common capabilities defined (`ats_json`, `rss_xml`, `structured_xml`, `public_json_api`, `static_html`);
  2. Zero duplicate or conflicting capability names;
  3. New conventional sources route via registry-driven capability dispatch;
  4. Central orchestrator (`apps/web/src/pages/api/cron/scrape.ts`) modification **no longer required** for adding at least one representative ordinary source class.
- **Evidence Artifact:** Capability contract tests in `packages/scraper/capability-registry.test.ts`.
- **Rollback Step:** Revert registry routing to static adapters in `sources.ts`.
- **Abandonment Trigger:** Conventional routing adds latency $> 50\text{ ms}$ per tick or fails contract tests.
- **Owner Authorization Required:** **YES**.

---

### Phase 8 — Typed TypeScript Configuration DSL
- **Deliverable:** Standardized declarative DSL for source field mapping and validation.
- **Numeric Exit Criteria:**
  1. Implemented for at least **3 repeated real-world provider families** (e.g. Greenhouse, Lever, Ashby);
  2. Reduces imperative boilerplate by $\ge 40\%$;
  3. Strictly zero custom parsers or compilers (pure typed TypeScript);
  4. Full replay and contract test support;
  5. Lower or equal maintenance complexity verified.
- **Evidence Artifact:** `packages/scraper/dsl/` with passing fixture tests.
- **Rollback Step:** Fallback to explicit procedural adapters.
- **Abandonment Trigger:** DSL creates excessive type complexity or degrades developer velocity.
- **Owner Authorization Required:** **YES**.

---

### Phase 9 — Rust / WASM Canary Deployment
- **Deliverable:** Bounded live canary where Rust WASM parses a single clamped source (max 2 items/tick) with instant TypeScript fallback.
- **Numeric Exit Criteria:** 14 consecutive days of live canary execution with 0 unhandled exceptions; instant fallback verified in staging; 100% ledger receipt auditability.
- **Evidence Artifact:** `docs/graduations/RUST_WASM_CANARY_PACKAGE.md`.
- **Rollback Step:** Set `ENABLE_WASM_PARSER=0` env flag; instant fallback to TypeScript.
- **Abandonment Trigger:** Any crash, memory leak, or V8 isolate breach in production.
- **Owner Authorization Required:** **YES** (Alters production execution path).

---

### Phase 10 — Progressive Authority Expansion
- **Deliverable:** Incremental rollout of graduated capability routing and WASM parser across Tier A sources.
- **Numeric Exit Criteria:** Rolled out source-by-source; each source observed for 7 days before next expansion; overall ingestion throughput improved by $\ge 20\%$; zero regression on D1–D9.
- **Evidence Artifact:** Per-source graduation packages in `docs/graduations/`.
- **Rollback Step:** Revert specific source configuration to TypeScript parser.
- **Abandonment Trigger:** Any source exhibits quality drift or schema degradation.
- **Owner Authorization Required:** **YES**.

---

### Phase 11 — Legacy Cleanup & Retirement
- **Deliverable:** Deletion of superseded fallback paths, obsolete quarantine shims, and legacy adapters.
- **Numeric Exit Criteria:** Minimum **30 consecutive days** of verified production stability under Phase 10; full repository test suite (`bun run test`) passes 100%; zero broken references.
- **Evidence Artifact:** Final Acceptance Audit Report (`docs/audits/PHASE_11_COMPLETION.md`).
- **Rollback Step:** Restore deleted code from git history.
- **Abandonment Trigger:** Test failure or edge-case regression discovered during pre-cleanup audit.
- **Owner Authorization Required:** **YES**.

---

## 3. TIME BUDGET & ABANDONMENT RULES

### 3.1 The 70/30 Time Budget Enforcement
- At every session close, check the rolling 14-session ledger:
  $$\frac{\sum \text{OPERATIONAL sessions}}{\text{Total sessions}} \ge 0.70$$
- If operational share drops below $70\%$, the active architectural phase is automatically transitioned to `PAUSED-BY-BUDGET`. No further architectural commits are permitted until operational sessions restore the balance.

### 3.2 14-Day Phase Abandonment Protocol
- If an architectural phase remains active for **14 consecutive calendar days** without producing measurable empirical progress toward its exit criteria:
  1. Immediately issue a Graduation Package with verdict: **REJECT**.
  2. Document the exact technical blocker in `docs/architecture/ABANDONMENT_REGISTER.md`.
  3. Revert or quarantine experimental branches and code.
  4. Update `docs/SYSTEM_SAVEPOINT.md` to reflect phase closure.
