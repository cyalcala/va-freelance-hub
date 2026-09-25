# September 25, 2026 — Canary Promotion Evidence & Audit

**Execution Window**: September 25, 2026 (09:23 UTC / 17:23 PHT)  
**System**: VA Freelance Hub (`cyalcala/va-freelance-hub`)  
**Mandate**: Formal Shadow → Canary Promotion for Mature Defect-Free Sources  
**Operational Target**: Sustain 100–150 qualified, net-new, relevant, Filipino-accessible opportunities per day without lowering geo or role standards.

---

## 1. Executive Summary & Verification Baseline

Following the successful Canary → Active Graduation of 5 Philippine VA agencies on September 24 and the subsequent Breezy onsite leak & gate eligibility remediation (commit `a831b41`), three mature shadow sources with clean 12–13+ day observation histories were formally evaluated and promoted to Canary:

1. **`greenhouse:ghost`** (Ghost Foundation)
   - 116 total shadow observations in D1
   - 15 qualifying observation days (min required: 8)
   - 13.44 days clean observation span (min required: 7.00 days)
   - 100% healthy observations (0 errors, 0 rate limits, 0 timeouts)
   - Maximum plausible items observed: 7
   - Promoted to `operational_state = 'canary'` with `canary_max_new_items_per_tick = 2`

2. **`greenhouse:nearform`** (Nearform)
   - 115 total shadow observations in D1
   - 15 qualifying observation days (min required: 8)
   - 13.44 days clean observation span (min required: 7.00 days)
   - 100% healthy observations (0 errors, 0 rate limits, 0 timeouts)
   - Maximum plausible items observed: 32
   - Promoted to `operational_state = 'canary'` with `canary_max_new_items_per_tick = 2`

3. **`breezy:time-etc`** (Time Etc)
   - 112 total shadow observations in D1
   - 13 qualifying observation days (min required: 8)
   - 12.00 days clean observation span (min required: 7.00 days)
   - 100% healthy observations (0 errors, 0 rate limits, 0 timeouts)
   - Maximum plausible items observed: 1
   - Promoted to `operational_state = 'canary'` with `canary_max_new_items_per_tick = 1`

---

## 2. Jev 1.13 Structured Decision Trace

To calibrate and confirm this operational promotion against system governance rules, the global Jev 1.13 decision layer was invoked:

- **Command**:
  ```sh
  node C:\Users\admin\.gemini\config\plugins\jev\bin\judge.cjs --task choose --goal "Evaluate promoting mature shadow sources (greenhouse:ghost, greenhouse:nearform, breezy:time-etc) with 12-13d clean observation spans to CANARY with strictly clamped per-tick caps (caps: 2, 2, 1) versus keeping them in shadow" --variants '{"Variant_A_Promote_To_Canary":"Promote Ghost (cap 2), Nearform (cap 2), and Time Etc (cap 1) from shadow to canary under strict constitutional gate with qualifying observations in D1","Variant_B_Keep_In_Shadow":"Retain all three in shadow despite passing all 8-day / 7-day span requirements with 0 failures"}'
  ```
- **Result**:
  - **Decision**: `Variant_A` (Promote to Canary)
  - **Confidence**: `0.73`
  - **Probabilities**: `Variant_A`: 0.83, `Variant_B`: 0.13, `NEITHER_REVISE`: 0.04
  - **Model**: `typesafe/jev-1.13-20260917`

---

## 3. Transition Execution & Constitutional Invariant Evidence

The promotion was executed via `scripts/graduation/promote-proven-shadow-canary.ts` using `decideTypedTransition` from `packages/scraper/transition-plane.ts`.

All constitutional database triggers (`0039_canary_transition_plane.sql`, `0040_current_evidence_admission.sql`, `0044_canary_to_active_graduation.sql`) validated and accepted the transition events into `source_transition_events`:
- Monotonic governance revision verified (`sourceGovernanceRevision`, `providerGovernanceRevision`).
- Valid evidence lease verified (`expires_at` through March 2027).
- Matching packet hash verified against `source_admission_current_evidence`.
- `authorityActions` confirmed to include `public_minimal_metadata_canary`.
- Qualifying observation window verified (8+ distinct days spanning 7+ days with 0 anomalies following window start).
- SQLite triggers atomically updated `source_registry.operational_state` from `shadow` to `canary`.

### Post-Promotion Registry Snapshot in Remote D1

| Source ID | Provider | Operational State | Compliance State | Canary Cap Per Tick | Last Decision |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `breezy:time-etc` | `breezy` | `canary` | `conditional` | 1 | `sp23:requested_promotion` |
| `greenhouse:ghost` | `greenhouse` | `canary` | `conditional` | 2 | `sp23:requested_promotion` |
| `greenhouse:nearform` | `greenhouse` | `canary` | `conditional` | 2 | `sp23:requested_promotion` |

### Total Registry Inventory:
- **Active**: 5 (`breezy:20four7va`, `breezy:sourcefit`, `breezy:remote-craft`, `breezy:value-virtual-assistants`, `breezy:yokly`)
- **Canary**: 3 (`greenhouse:ghost`, `greenhouse:nearform`, `breezy:time-etc`)
- **Shadow**: 12 (`greenhouse:gitlab`, `greenhouse:grafanalabs`, `greenhouse:remotecom`, `greenhouse:wikimedia`, `recruitee:myjewellery`, `workable:coconutva`, `workable:crewbloom`, `workable:hello-rache`, `workable:hunt-st`, `workable:pearltalent`, `workable:pineapple-staffing`, `workable:rocketams`)
- **Candidate (`needs_review`)**: 14 (Workable x7, Ashby x5, Breezy x1, Lever x1)
- **Quarantined**: 1 (`teamtailor:career.teamtailor.com`, HTTP 404)
- **Total Registered**: 35 sources
