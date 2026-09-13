# Accelerated Promotion Analysis: Shadow Philippine VA Agencies to Production

**Document Date**: 2026-09-13  
**Status**: PROPOSAL & STRATEGIC REFLECTION  
**Author**: Antigravity Assistant & Founder Insight Reflection  
**Target Invariant**: Prime Directive (100–150 qualified net-new remote Filipino jobs/day)

---

## 1. The Owner Strategic Insight

On 2026-09-13, the project founder/owner articulated a clear, pragmatically grounded directive and query:

> *"How about we instantly promote to production all these shadows as they have historically proved they are hiring filipinos anyway i dont see the prolonging here, document my insight as well. discuss possibilities"*

### Core Rationale:
1. **Authentic Business Reality**:
   - The 13 shadow sources admitted across Workable and Breezy are not random global scrapers. They are established, verified Philippine-focused virtual assistant and outsourcing agencies:
     - **Workable (7)**: `pearltalent` (235 active roles), `hunt-st` (153 active roles), `crewbloom` (97 active roles), `coconutva` (41 active roles), `hello-rache` (3 active roles), `pineapple-staffing` (3 active roles), `rocketams` (1 active role). Total: **530+ active Philippine roles**.
     - **Breezy (6)**: `20four7va` (96 active roles), `sourcefit` (71 active roles), `time-etc` (1 active role), `remote-craft`, `value-virtual-assistants`, `yokly`. Total: **170+ active Philippine roles**.
   - These companies exist specifically to recruit and place Filipino virtual assistants, writers, engineers, and support professionals. Their eligibility for Filipino job seekers is not speculative—it is their core operational identity.
2. **The Supply Gap vs. The Prolonged Clock**:
   - Currently, the exact-six allowed feeds (`we-work-remotely`, `remotive`, `real-work-from-anywhere`, `remote-ok`, `jobicy-admin-support-apac`, `jobicy-supporting-apac`) yield only **12.29 jobs/day** (86 jobs over 7 days).
   - The Prime Directive demands **100–150 qualified jobs/day**.
   - Over **700+ verified remote Philippine roles** are sitting idle in `source_shadow_observations` with zero public exposure (`published = 0`).
   - Requiring a 7- to 8-day observation clock for sources whose human trustworthiness is already 100% verified feels like artificial delay when Filipino job seekers need immediate discovery access.

---

## 2. Technical & Constitutional Realities

Why was the 8-day / 7-span observation clock implemented in the first place? And what technical mechanisms govern promotion in this codebase?

### A. Database-Level Triggers (D1 SQLite Constraints)
The production database (`remoteph-jobs-db`) has active SQLite triggers installed in Migration 0040, 0041, and 0042:

1. **`source_registry_state_requires_transition_event`**:
   - Blocks any update to `operational_state` on `source_registry` unless an identical matching event row exists in `source_transition_events` with matching `decision_hash`.
2. **`source_transition_events_validate_insert`**:
   - Strictly enforces the state lifecycle graph:
     - `shadow` **cannot** jump directly to `active`.
     - The trigger enforces: `(from = 'shadow' AND to = 'canary') OR (from = 'canary' AND to = 'active')`.
   - For `shadow -> canary`, the trigger strictly asserts:
     - `canary_max_new_items_per_tick` > 0
     - `COUNT(*) FROM source_shadow_observations` >= `requiredShadowCount`
3. **`transition-plane.ts` & `admission-evidence.ts`**:
   - `ADMISSION_POLICY.minimumDays = 8`
   - `ADMISSION_POLICY.minimumSpanMs = 7 * 86_400_000` (7 full calendar days)
   - `request.requiredShadowCount !== 8 || context.qualifyingObservationIds.length < 8`

### B. Ingestion Infrastructure & Rate Limits (Why Uncontrolled Instant Promotion Crashes)
Even if the database allowed an instant SQL update to `active`:
1. **Workable API Rate Limits (`HTTP 429`)**:
   - Workable's widget API (`apply.workable.com/api/v1/widget/accounts/{token}`) has strict per-IP rate limits.
   - Polling 7 Workable agencies on every 10-minute Cloudflare Worker tick triggers immediate `HTTP 429 Too Many Requests`. This is why `scrape.ts` (lines 2069–2077) enforces **staggered polling**: selecting only the 2 oldest/unscraped Workable agencies per tick with a 60-minute cadence floor.
2. **Cloudflare Worker Free Limits**:
   - Cloudflare Workers Free allows **50 external subrequests per invocation** and **128 MB RAM**.
   - If 21 sources were scraped and triaged at once, subrequest limits and AI triage timeouts (10–30s) would terminate the worker.
3. **AI Triage & D1 Batch Floods**:
   - Triaging 700+ jobs in a single tick would blow past Groq and Gemini free-tier TPM (tokens per minute) and RPM limits.
   - The canary throttle (`canary_max_new_items_per_tick: 1` or `5`) was created specifically so that newly admitted sources publish their backlog in smooth, bounded batches over hours rather than an explosive single tick.

---

## 3. Four Actionable Pathways

To reconcile the founder's pragmatic insight with system stability and constitutional integrity, we analyze four distinct paths:

| Pathway | Mechanism | Time to Production | Safety & Stability | Regulatory / Invariant Impact |
| --- | --- | --- | --- | --- |
| **Path 1: Standard Autonomy Clock** | Wait for 8-day / 7-span observation maturity under existing policy. | 2 days (Top tier: 2026-09-15; PH agencies: 2026-09-18) | 100% verified, 0 code risk | Completely preserves exact-six and ADR-007 baseline without modification. |
| **Path 2: Codify ADR-008 Tier A Fast-Track** | Implement the 3-day observation rule already proposed in `policy-resolver.ts` for direct structured ATS feeds. | 1 day (Tomorrow: 2026-09-14) | High. Staggered polling and canary caps remain active. | Reconciles trigger and `transition-plane.ts` to recognize `minShadowDays: 3` for Tier A agencies. |
| **Path 3: Owner Executive Exemption to Canary** | Owner authorizes a dedicated migration/transition promoting reviewed PH agencies directly from `shadow` to `canary`. | Immediate (Hours) | High, provided `canary_max_new_items_per_tick` is 1 to 5 per tick. | Preserves the canary governor; jobs begin publishing immediately in rate-safe increments. |
| **Path 4: Curated Static Boundary Expansion** | Move the 13 agencies into the static allowed ingestion list in `scrape.ts` alongside the Exact-Six. | Immediate | Medium. Bypasses the autonomous state machine in favor of static code definition. | Changes production definition from "Exact-Six" to "Exact-Six + 13 Curated PH Agencies". |

---

## 4. Deep Dive into the Preferred Pragmatic Solutions

### Option A: Path 3 (Owner Executive Exemption to Canary Mode)
This directly fulfills the owner's intent without risking system collapse:
1. **Why Canary instead of Full Active?**
   - In `canary` mode, `publication-gateway.ts` allows public exposure (`isPublishable` is `true` for `conditional x canary`).
   - However, it enforces `canary_max_new_items_per_tick` (e.g. 2 to 5 items per tick).
   - This means the 700+ Philippine roles start hitting the public board **immediately**, in steady waves of ~10–20 net-new jobs every 10 minutes.
   - Within 12 to 24 hours, the entire backlog of 700+ jobs is published, indexed, deduplicated, and geo-verified without a single HTTP 429 error or Cloudflare subrequest crash.
2. **How to Execute Cleanly**:
   - Create a dedicated transition script/endpoint that records `cause = 'requested_promotion'`, `from_operational = 'shadow'`, `to_operational = 'canary'`.
   - Update `requiredShadowCount` in `transition-plane.ts` to accept owner-adjudicated executive reviews for Tier A fast-track sources.

### Option B: Path 2 (Codify ADR-008 Tier A 3-Day Threshold)
- In `packages/scraper/policy-resolver.ts` lines 95–102, Tier A is already defined as:
  ```typescript
  tier_a: {
    tier: "tier_a",
    description: "Direct structured public ATS / RSS feeds with low fragility and explicit public endpoints",
    minShadowDays: 3,
    requiresRobotsCheck: true,
    canaryMaxLimit: 10,
    fastTrackEligible: true,
  }
  ```
- The 13 Workable and Breezy agencies were admitted on **2026-09-11**.
- 3 full days of shadow observation elapses on **2026-09-14** (tomorrow!).
- Aligning `transition-plane.ts` and the trigger to enforce `minShadowDays = 3` for Tier A agencies allows them to qualify organically within 24 hours under a documented, principled rule rather than an arbitrary exception.

---

## 5. Conclusion & Action Items

The founder's insight is **100% accurate regarding the business reality and mission priority**: these agencies are genuine Filipino employers, and sitting on 700+ qualified jobs when our daily yield is only 12.3 jobs is an enormous missed opportunity for the community.

However, **instant unthrottled promotion (`shadow -> active` in one second)** would trigger API rate limits, worker memory timeouts, and D1 trigger aborts.

**The optimal engineering resolution** is:
1. Preserve the **canary governor** (`canary_max_new_items_per_tick: 2-5`) so jobs flow to the public board immediately without infrastructure disruption.
2. Formally adopt **ADR-008 Tier A Fast-Track** (reducing the required observation period from 8 days to 3 days for verified direct ATS agencies), which matures the earliest Philippine agencies starting **2026-09-14**.
3. Or dispatch an **Owner Executive Exemption** promoting the 13 reviewed agencies to `canary` mode immediately.

---

## 6. Executive Resolution & Ratification (2026-09-13)

**Decided by Founder/Owner**: **Pathway 1 (The S-Tier Patience & Constitutional Gauntlet)**.

### Rationale & Strategic Commitment:
1. **Uncompromised System Narrative**:
   - The founder explicitly chose to avoid shortcuts, emergency manual overrides, or premature trigger bypasses.
   - The platform will allow the autonomous observation clock to run its full 7-day empirical span (`604,800,000 ms`) and 8 distinct UTC days across all shadow identities.
2. **Execution Roadmap**:
   - **Phase 1 (2026-09-14 to 2026-09-15)**: Top mature shadow cohort (`greenhouse:grafanalabs`, `teamtailor:career.teamtailor.com`, `recruitee:myjewellery`, `greenhouse:gitlab`, `greenhouse:remotecom`) completes Day 8 qualification and triggers the formal **Autonomy Cutover Predicate** audit.
   - **Phase 2 (2026-09-15 to 2026-09-18)**: The 13 Workable & Breezy Philippine agency identities complete their 7-day observation cycle under the hourly rotating shadow dispatcher (`gha-shadow-dispatch.yml`).
   - **Phase 3 (2026-09-18 onwards)**: Seamless, autonomous graduation into `canary` mode with `canary_max_new_items_per_tick = 2`, unlocking over 700+ remote Philippine roles to the public board under 100% verified constitutional governance.
