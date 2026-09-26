# VA FREELANCE HUB — OPERATIONS MANUAL & MAINTAINER RUNBOOK
## Concrete Protocols, State Machines, Verification Rings, and Incident Playbooks

```yaml
document_metadata:
  document_type: OPERATIONAL_RUNBOOK
  document_status: ACTIVE_OPERATIONAL
  version: "5.2.0"
  effective_at: "2026-09-26T11:49:00+08:00"
  last_verified_at: "2026-09-26T11:49:00+08:00"
  verified_by: "agent-antigravity"
  applies_to_commit: "72709b153b3ada5916a7e6fefd40c3a8ec0f6bbd"
  authority_tier: 2 # Operational implementation of CONSTITUTION.md
  parameters_source: "docs/ACCEPTED_PARAMETERS.yaml"
```

> **The definitive day-to-day maintainer runbook for VA Freelance Hub.**
>
> All operational procedures, session workflows, safety gates, verification rings, and incident playbooks are codified here. Every maintainer (human or autonomous) MUST follow these protocols verbatim.

---

## 1. RECOVERY-DRIVEN SESSION LOOP

Every maintainer session MUST follow this exact 7-step cycle:

```text
┌─────────────────────────────────────────────────────────────┐
│ 1. RECOVER: Check active lease; reconstruct state from      │
│    SYSTEM_SAVEPOINT.md and git status; disclose Bun mismatch│
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. MEASURE: Measure live supply, Manila-day flow, active D1 │
│    stock, and source registry health via read-only queries  │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. IDENTIFY BOTTLENECK: Find the single largest empirical   │
│    constraint blocking sustainable, qualified 100/day flow  │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. SELECT UNIT & ACQUIRE LEASE: Formulate Unit Contract for │
│    ONE dependency-ready unit; acquire atomic lease in savepoint│
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. IMPLEMENT & VERIFY LOCALLY: Smallest reversible slice;   │
│    execute expanding verification rings (tests, typecheck)  │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. DEPLOY & OBSERVE: Commit to main, push to origin, monitor│
│    GitHub Actions CI and Cloudflare Pages deploy; verify live│
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. CHECKPOINT & RELEASE LEASE: Record session ledger entry, │
│    handoff state, and next action in SYSTEM_SAVEPOINT.md     │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. MULTI-AGENT CONCURRENCY & LEASE PROTOCOL (C7)

### 2.1 Concurrency Rule
No maintainer or agent may perform a state-changing commit or production write without acquiring an unexpired atomic lease in `docs/SYSTEM_SAVEPOINT.md`.

### 2.2 Lease Structure
The lease block MUST be placed at the top of `docs/SYSTEM_SAVEPOINT.md`:
```yaml
active_lease:
  agent_id: "agent-antigravity"
  acquired_at: "2026-09-26T11:49:00+08:00"
  expires_at: "2026-09-26T13:49:00+08:00" # Exactly 2 hours maximum
  unit_ref: "SP-XX"
  category: "OPERATIONAL" # OPERATIONAL | ARCHITECTURE
  files_owned:
    - "packages/scraper/shadow-dispatcher.ts"
    - "packages/scraper/shadow-dispatcher.test.ts"
```

### 2.3 Lease Acquisition & Contention Rules
1. **Acquisition:** Read `docs/SYSTEM_SAVEPOINT.md`. If `active_lease` is absent or `expires_at < CURRENT_TIME`, overwrite with your lease block, commit, and push.
2. **Overlap Detection:** If an active lease exists and its `files_owned` overlaps with your proposed work, **HALT IMMEDIATELY**: `STOP — DIRTY OVERLAP`.
3. **Lease Expiration:** Leases auto-expire after **2 hours** (120 minutes). If a session requires more time, the maintainer must issue a lease refresh commit before expiry.
4. **Lease Release:** At session close, set `active_lease: null` in the final checkpoint commit.

---

## 3. PREFLIGHT & LIVE CODE ANCHOR VERIFICATION (C19)

### 3.1 Preflight Command Sequence
Execute portable git and runtime commands:
```bash
git status -sb
git branch --show-current
git rev-parse HEAD
git fetch origin
git rev-parse origin/main
git log -5 --oneline
bun --version
```

### 3.2 Standing Disclosures
- **Runtime Version Disclosure:** Disclose local Bun version vs. repo pin (e.g., Local Bun `1.4.2` vs. Repo Pin `1.3.14` in `package.json`).
- **Worktree Cleanliness:** Confirm worktree is clean. Foreign dirty files MUST NOT be wiped (`git reset --hard` and `git clean -fd` are prohibited).

### 3.3 Live Code Anchor Reality Check
Before citing or modifying any enforcement anchor, verify its reality rung:

| Documented Anchor | Verified Live Path | Status | Reality Rung |
|---|---|---|---|
| Publication Gateway | `packages/scraper/publication-gateway.ts` (`publishPublicExposure`) | VERIFIED CODE | IMPLEMENTED |
| Publication Ledger Table | `source_publication_ledger` (migration `0041`) | VERIFIED CODE | DEPLOYED |
| Geo-Gate Module | `packages/scraper/geoGate.ts` (`checkGeoEligibility`) | VERIFIED CODE | IMPLEMENTED |
| Policy Resolver | `packages/scraper/policy-resolver.ts` (`resolvePolicy`) | VERIFIED CODE | IMPLEMENTED |
| Shadow Dispatcher | `packages/scraper/shadow-dispatcher.ts` (`dispatchShadowRun`) | VERIFIED CODE | IMPLEMENTED |
| Jev 1.13 Client | `packages/scraper/jev-client.ts` (`judgeViaJev`) | VERIFIED CODE | IMPLEMENTED |
| Source Registry Schema | `packages/db/migrations/0036_registry_foundation.sql` | VERIFIED CODE | DEPLOYED |
| Canary Transition Plane | `packages/db/migrations/0039_canary_transition_plane.sql` | VERIFIED CODE | DEPLOYED |
| Opt-Out Table | `source_opt_outs` (migration `0037`) | VERIFIED CODE | DEPLOYED |
| Lake Sync Bridge | `scripts/lake/sync-to-d1.ts` (`syncToD1`) | VERIFIED CODE | IMPLEMENTED |
| Production Guardrails CI | `scripts/ci/check-production-guardrails.ts` | VERIFIED CODE | IMPLEMENTED |
| Parameter Drift Audit CI | `scripts/ci/audit-parameters.ts` | MISSING | UNENFORCED — PAPER RISK |
| Automated Secret Scanning | `gitleaks` in CI | MISSING | UNENFORCED — PAPER RISK |

---

## 4. UNIT CONTRACT PROTOCOL

Before modifying code or configuration, construct a **Unit Contract**:
```text
================================================================================
                       VA FREELANCE HUB — UNIT CONTRACT
================================================================================
Unit Reference:        <e.g. SP-24 or EX-SHADOW-PACING>
Mode:                  RECOVER | AUDIT | PLAN | EXECUTE
Category:              OPERATIONAL | ARCHITECTURE (Enforces 70/30 time budget)
Authorization:         <Savepoint NEXT action or Owner Directive>
Start SHA:             <full local sha> (Must match origin/main)
Remote SHA:            <full origin/main sha>

1. PROBLEM & HYPOTHESIS
Problem Statement:     <Empirical defect or bottleneck>
Expected Outcome:      <Measurable supply gain, risk reduction, or verified parity>
Target Metric Delta:   <e.g. +10 qualified daily flow or 0 rate-limit skips>

2. SCOPE & BOUNDARIES
Owned Files:           <Explicit list of files to edit>
Explicit Exclusions:   <Paths strictly forbidden from mutation>
Affected Source IDs:   <Exact source identities involved>
Ownership Boundary:    TypeScript Control Plane | Lake Scripts | Scraper Core

3. IMPLEMENTATION PLAN
Smallest Slice:        <Minimal coherent reversible change>
Rollback Point:        git revert <commit> OR explicit database migration reversal

4. VERIFICATION PLAN
Narrow Test:           bun test <specific_test_file>
Full Verification:     Expanding Rings 1 through 7 (Section 5)

5. BUDGETS & STOP CONDITIONS
Request Budget:        <= <N> external probes
AI / Token Budget:     <= <N> Jev consultations
Database Writes:       D1 rows written = 0 (for read-only) OR <= <N>
Stop Conditions:       STOP — SAFETY, STOP — ENVELOPE, STOP — DIRTY OVERLAP
================================================================================
```

---

## 5. EXPANDING VERIFICATION RINGS

Every code or configuration change MUST pass the expanding verification rings:

```text
Ring 1: Narrow Unit Test
  bun test <targeted_test_file> (e.g. bun test packages/scraper/shadow-dispatcher.test.ts)

Ring 2: Lake Subsystem Test (if lake touched)
  bun test scripts/lake

Ring 3: Full Repository Test Suite
  bun run test (1,464+ assertions across 143+ test files; zero failures permitted)

Ring 4: Strict Typecheck
  bun run typecheck (bunx tsc --noEmit -p apps/web/tsconfig.json; 0 errors permitted)

Ring 5: Production Guardrails Audit
  bun run audit:guardrails (scripts/ci/check-production-guardrails.ts)

Ring 6: Python Analytics Test Suite
  python3 -m unittest discover -s scripts/analytics -p 'test_*.py'

Ring 7: Production Build Verification
  bun run build (Compiles Astro server and client assets cleanly)

Ring 8: Live Lake & Production Verification (Staged/Dry-run)
  Lake State:    bun run lake:state
  Sync Safety:   bun run lake:sync -- --dry-run
  Public HTTP:   Verify HTTP 200 on / and /opportunities?fresh=today
```

---

## 6. GOVERNED PUBLICATION GATEWAY PROTOCOL

### 6.1 Architecture & Gateway Contract
Any opportunity entering Cloudflare D1 MUST pass through `publishPublicExposure` in `packages/scraper/publication-gateway.ts`. Direct raw `INSERT INTO opportunities` outside this gateway is a **critical governance breach**.

```text
Incoming Candidate Opportunity
             │
             ▼
┌────────────────────────────────────────────────────────┐
│            PUBLICATION GATEWAY VALIDATION              │
│ 1. Source registered in source_registry?               │
│ 2. operational_state IN ('active', 'canary')?          │
│ 3. Evidence lease unexpired (policy_expiry)?           │
│ 4. Proposed count <= canary_max_new_items_per_tick?    │
│ 5. Employer/URL not in source_opt_outs?                │
│ 6. ph_eligibility == 'eligible_verified'?              │
│ 7. source_posted_at is authentic ISO or NULL?          │
└────────────────────────────────────────────────────────┘
             │
             ├───────────────────────┐
             │ (Pass All 7)          │ (Fail Any)
             ▼                       ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│  CLOUDFLARE D1 WRITE     │  │     REJECT / QUARANTINE    │
│  - INSERT INTO           │  │  - Zero D1 public write   │
│    opportunities         │  │  - Append rollback receipt│
│  - Append-only receipt to│  │    to publication ledger  │
│    source_publication_   │  └──────────────────────────┘
│    ledger                │
└──────────────────────────┘
```

### 6.2 Gateway Enforcement Steps
1. **Source Authority Verification:** Query `source_registry`. Reject if source does not exist or operational state is `candidate`, `shadow`, `paused`, `quarantined`, or `retired`.
2. **Lease Validation:** Assert `datetime('now') <= policy_expiry`. If expired, halt publication and mark source `review_due`.
3. **Canary Tick Cap Enforcement:** If state is `canary`, clamp proposal to `canary_max_new_items_per_tick`. Sum `published_count` from `source_publication_ledger` for the current `tick_key`. If proposal exceeds cap, automatically roll back tick to shadow (`canary_cap_breach`).
4. **Opt-Out Check:** Check employer domain and apply URL against `source_opt_outs`. If matched, suppress listing immediately.
5. **Eligibility Verification:** Assert `ph_eligibility = 'eligible_verified'`. Reject `unclear`, `ineligible`, or `unknown`.
6. **Date Honesty:** If source did not declare an authentic posting timestamp, `source_posted_at` MUST be stored as `NULL`. Falling back to `now()` or `CURRENT_TIMESTAMP` is **strictly prohibited**.
7. **Ledger Receipt:** Record an append-only transaction in `source_publication_ledger` containing `source_id`, `tick_key`, `mode`, `proposed_count`, `published_count`, `published_ids_json`, and `decided_at`.

---

## 7. ADR-008 SOURCE LIFECYCLE STATE MACHINE (C10)

### 7.1 Risk-Proportional Tiers
All sources follow ADR-008 risk-proportional governance:

| Tier | Scope | Characteristics | Min Shadow Window | Canary Tick Cap | Fast-Track Eligible |
|---|---|---|---|---|---|
| **Tier A** | Official public ATS APIs (`greenhouse`, `lever`, `ashby`, `breezy`, `workable:global`) & RSS feeds | Stable JSON/XML schema, public endpoints, low fragility | **3 days** | **10 / tick** | **YES** |
| **Tier B** | Variable & partner APIs (`jobicy`, syndicated feeds) | Fluctuating schemas, unstandardized locations | **7 days** | **5 / tick** | **NO** |
| **Tier C** | HTML / DOM scraping surfaces | High fragility, DOM layout changes, bot-wall risks | **14 days** | **2 / tick** | **NO** |

### 7.2 Source State Machine
```text
[discovery] ──> candidate ──> shadow ──> canary ──> active
                  │              │          │          │
                  ▼              ▼          ▼          ▼
              quarantined    quarantined quarantined degraded ──> paused ──> retired
```

1. **Candidate:** Registered in `source_registry` with `compliance_state = 'needs_review'`. Zero fetch authority.
2. **Shadow:** Authorized for automated offline observation via `shadow-dispatcher.ts`. Writes to `source_shadow_observations` and lake only. Zero publication authority.
3. **Canary:** Authorized for strictly clamped publication (`publishPublicExposure`) under per-tick caps. Must sustain zero schema errors and low FP/FN rates.
4. **Active:** Full production publication authority. Requires formal graduation package signed off by owner.
5. **Degraded / Quarantined:** Triggered automatically upon consecutive probe failures, schema drift, or rate-limit penalties.

---

## 8. CONVENTIONAL SOURCE INTEGRATION RUNBOOK (C16)

### 8.1 The Conventional Path
Adding an ordinary source MUST NOT require editing `apps/web/src/pages/api/cron/scrape.ts` or central orchestrators. Follow this 8-step workflow:

```text
Step 1: Discover & Verify
  - Identify source URL, endpoint, robots.txt directives, and terms of service.
  - Verify auth is unauthenticated (none) or partner-supported.

Step 2: Declare Capability
  - Select capability from accepted vocabulary: ats_json | rss_xml | structured_xml | public_json_api | static_html.

Step 3: Map Source Fields
  - Define field mapping: title, employer, description, location_raw, apply_url, source_posted_at.

Step 4: Provide Representative Fixtures
  - Save clean, anonymized fixture in tests directory (e.g. packages/scraper/fixtures/<source_id>.json).

Step 5: Run Capability Contract Tests
  - Execute contract tests against fixture; verify parser output matches canonical opportunity shape.

Step 6: Register Candidate
  - Insert row into source_registry and provider_profiles with compliance_state = 'allowed' and operational_state = 'candidate'.

Step 7: Shadow Maturation
  - Advance to operational_state = 'shadow'.
  - Accumulate healthy observation runs via shadow-dispatcher.ts for the mandatory window (Tier A: 3d, Tier B: 7d, Tier C: 14d).

Step 8: Canary Admission
  - Upon passing shadow window with 0 anomalies, submit Graduation Package to owner.
  - Advance to operational_state = 'canary' with risk-tiered tick cap.
```

### 8.2 Exceptional Source Template
If an extraordinary source requires modifying central orchestration logic, create `docs/exceptions/<source_id>.md`:
```markdown
# Source Exception: <source_id>
- source_id: "<provider>:<slug>"
- exception_reason: "<Why conventional adapter cannot represent this source>"
- missing_capability: "<Capability to be added to future registry>"
- blast_radius: "<Files touched outside source adapter>"
- tests_added: "<Unit test references>"
- fallback_path: "<Rollback procedure>"
- owner_or_ADR_reference: "<Commit or ADR>"
```

---

## 9. CAPABILITY-BASED DISPATCH RUNBOOK (C17)

### 9.1 Processing Selection Matrix
Dispatch routes by processing requirements rather than provider names:

| Declared Capability | Payload Kind | Size / Risk Class | Selected Processor |
|---|---|---|---|
| `ats_json` | JSON | Standard ($\le 512\text{ KiB}$) | TypeScript ATS Adapter |
| `rss_xml` | XML | Standard ($\le 512\text{ KiB}$) | TypeScript RSS Parser (`fast-xml-parser`) |
| `structured_xml` | XML | Large ($> 1\text{ MB}$, bounded) | Rust WASM Streaming Projector (Candidate) |
| `public_json_api` | JSON | Standard ($\le 512\text{ KiB}$) | TypeScript Feed Projector |
| `static_html` | HTML | Standard ($\le 256\text{ KiB}$) | TypeScript Cheerio/DOM Projector |
| `hostile_markup` | HTML | Untrusted / Malformed | Bounded WASM Parser (Fails Closed) |

### 9.2 Route Telemetry Schema
Every routed dispatch event records:
```json
{
  "source_id": "greenhouse:gitlab",
  "declared_capability": "ats_json",
  "payload_kind": "application/json",
  "payload_size_bytes": 142050,
  "router_version": "2.1.0",
  "selected_processor": "ts_ats_adapter",
  "processor_version": "1.4.0",
  "result": "SUCCESS",
  "warnings": []
}
```

---

## 10. DECISION LINEAGE & SUPERSESSION RUNBOOK (C18)

### 10.1 Datomic-Inspired Decision Lineage
When a newer decision replaces a prior consequential decision:
1. The **prior decision record remains immutable** in `lake_replay_events` / `source_decisions`.
2. The **newer decision record** references `supersedes_decision_id`.
3. Current state projections update to the newer outcome.

### 10.2 Decision Record Schema
```yaml
decision_id: "dec_2026-09-26T12:00:00Z_ph_9a12"
subject_id: "obs_himalayas_10482"
decision_type: "ph_eligibility"
outcome: "ineligible"
confidence: 0.98
decision_engine: "deterministic_geo_gate"
engine_version: "geoGate@1.4.0"
policy_version: "ADR-008"
created_at: "2026-09-26T12:00:00Z"
supersedes_decision_id: "dec_2026-09-20T08:14:02Z_ph_c8f2"
reversal_reason: "Employer added explicit US residency restriction in job description update."
```

### 10.3 Historical Replay Procedure
To evaluate rule refinements against preserved historical evidence:
```bash
bun run lake:replay -- --policy-version ADR-008 --dry-run
```
- Compares historical lake evidence against newer policy without mutating production D1.

---

## 11. DATA RETENTION, RESTORE DRILLS & OPT-OUT ENFORCEMENT (C11)

### 11.1 Retention Schedule & Pruning
- **Raw Payloads (`lake_raw_observations`):** Pruned after **14 days** TTL (`scripts/lake/prune-raw.ts`).
- **Normalized Staged Candidates (`lake_candidate_jobs`):** Pruned after **90 days** TTL if unsynced.
- **Decision History & Audit Trails:** **Durable permanent retention** in `source_decisions` and `source_publication_ledger`.

### 11.2 24-Hour Opt-Out Enforcement Protocol
When an employer or platform requests removal:
1. Immediately insert a row into `source_opt_outs`:
   ```sql
   INSERT INTO source_opt_outs (source_id, reason, requested_by, created_at)
   VALUES ('<source_id>', 'Employer direct opt-out request', '<contact_email>', datetime('now'));
   ```
2. Purge active listings from Cloudflare D1 within 24 hours:
   ```sql
   UPDATE opportunities SET is_active = 0, inactive_reason = 'source_opt_out'
   WHERE source_id = '<source_id>';
   ```
3. Set `source_registry.opt_out = 1` and `operational_state = 'retired'`.

### 11.3 30-Day Database Restore Verification Drill
Every 30 days, execute a rehearsal restore to a local test database:
```bash
bun run scripts/ci/rehearse-d1-migrations.ts
```
- Verify schema integrity, trigger firing, and table constraints. Record completion in `docs/SYSTEM_SAVEPOINT.md`.

---

## 12. MEASURABLE SESSION LEDGER (C12)

At session conclusion, the maintainer MUST append a structured entry to `docs/SYSTEM_SAVEPOINT.md`:
```yaml
session_ledger:
  session_id: "sess_2026-09-26_01"
  mode: "EXECUTE"
  unit_ref: "SP-XX"
  category: "OPERATIONAL" # OPERATIONAL | ARCHITECTURE
  start_sha: "72709b153b3ada5916a7e6fefd40c3a8ec0f6bbd"
  end_sha: "<commit_sha>"
  duration_minutes: 45
```
- Audit rolling 14 sessions: $\frac{\sum \text{OPERATIONAL}}{\text{Total}} \ge 0.70$.

---

## 13. INCIDENT PLAYBOOKS

### 13.1 SEV-1: Critical Safety / Legal / Security Breach
- **Trigger:** Fraudulent fee listing published, robots disallow violation, or secret token leaked.
- **Action:**
  1. Immediately halt all scrapers and cron Workers (`STOP — SAFETY`).
  2. For leaked secret: rotate token in Cloudflare / OpenRouter / Turso; verify old token returns 401.
  3. Generate `docs/escalations/<YYYY-MM-DD>-sev1-<slug>.md`.
  4. Notify human owner immediately. System fails closed until owner signs off.

### 13.2 SEV-2: Authority Bypass / Data Corruption
- **Trigger:** Unchecked raw insert to D1 or canary cap breach.
- **Action:**
  1. Halt affected pipeline script only (`STOP — AUTHORITY`).
  2. Revert corrupt D1 rows using `publication_ledger` batch IDs.
  3. Work on independent units continues. Owner SLA: 4 hours.

### 13.3 SEV-3: Supply Bottleneck / Quality Drift
- **Trigger:** FP rate exceeds 1.0% or 429 burst storm on provider host.
- **Action:**
  1. Switch affected source to `quarantined`.
  2. Normal ingestion of healthy sources continues. Owner SLA: 24 hours.

### 13.4 SEV-4: Architecture Over-Budget
- **Trigger:** Architecture session share exceeds 30% or phase stalled > 14 days.
- **Action:**
  1. Transition architectural unit to `PAUSED-BY-BUDGET`.
  2. Resume operational supply units immediately. Owner SLA: 72 hours.
