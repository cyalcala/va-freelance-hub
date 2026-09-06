# Apex Expansion EX-01 / EX-02 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans
> to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.
> Later EX-03..EX-13 units are **not** in this file; they start only after
> EX-02 is in production shadow. Do not dump historical SP-10..SP-15 SQL.

**Goal:** Measure exact-six accepted yield honestly, then admit one
Greenhouse board (`greenhouse:grafanalabs`) to non-publishing `shadow`
through the SP-23B gateway using **current** probe evidence.

**Architecture:** EX-01 is a tested classifier plus an exact-six zero-fill in
the read-only production verify SQL so silent zeros cannot disappear from
CI. EX-02 is a tested admission orchestrator plus an authenticated admit
route that re-probes live, writes provider+candidate, persists 0040
evidence, and applies `candidate→shadow`. Shadow never publishes.

**Tech Stack:** Bun, TypeScript, Cloudflare D1, existing
`@va-hub/scraper` admission/transition/shadow-probe modules.

## Global Constraints

- Exact-six stays uncapped; do not loosen `geoGate` or triage to inflate count.
- Band 4 hosts stay unfetched (SmartRecruiters, OnlineJobs.ph, Dribbble, Authentic Jobs).
- Canary fetch stays disabled in the legacy scrape loop.
- SP-12 day-1 probe (2026-08-29) is stale; EX-02 must re-probe.
- Registry insert operational state must be `candidate` (0039 dormant trigger).
- One unit per behavioral PR. Evidence/docs commit may follow.
- `ATS_TOKEN_POLICIES` Greenhouse pause remains the rollback adapter; only the registry overlay admits one board.

---

### Task 1: EX-01 exact-six yield classifier

**Files:**
- Create: `scripts/diagnostics/exact-six-yield.ts`
- Create: `scripts/diagnostics/exact-six-yield.test.ts`
- Create: `docs/gauntlet/evidence/EX-01-exact-six-yield-2026-09-06.md`

**Interfaces:**
- Consumes: production verify JSON `per_source_supply_json` and `first_storage_outcomes_7d_json`
- Produces: `classifyExactSixYield(input) → { asOf, sources: ExactSixSourceYield[] }`
  where each source has `sourceId`, `eligibleFirstStorage1d`, `eligibleFirstStorage7d`,
  `rejected7d`, `class`, `repairable`

- [ ] **Step 1: Write the failing test** using the Run 48 artifact numbers

```ts
import { describe, expect, test } from "bun:test";
import { classifyExactSixYield, EXACT_SIX_SOURCE_IDS } from "./exact-six-yield";

const PER_SOURCE = [
  { source_id: null, eligible_active: 719, first_storage_1d: 0, first_storage_7d: 0 },
  { source_id: "jobicy-supporting-apac", eligible_active: 7, first_storage_1d: 1, first_storage_7d: 7 },
  { source_id: "real-work-from-anywhere", eligible_active: 34, first_storage_1d: 0, first_storage_7d: 27 },
  { source_id: "remote-ok", eligible_active: 8, first_storage_1d: 1, first_storage_7d: 7 },
  { source_id: "we-work-remotely", eligible_active: 57, first_storage_1d: 5, first_storage_7d: 53 },
];
const OUTCOMES = [
  { source_id: "jobicy-supporting-apac", is_active: 0, ph_eligibility: "unclear", inactive_reason: "policy-rejected", row_count: 1 },
  { source_id: "jobicy-supporting-apac", is_active: 1, ph_eligibility: "eligible_likely", inactive_reason: null, row_count: 6 },
  { source_id: "jobicy-supporting-apac", is_active: 1, ph_eligibility: "eligible_verified", inactive_reason: null, row_count: 1 },
  { source_id: "real-work-from-anywhere", is_active: 0, ph_eligibility: "ineligible", inactive_reason: "policy-rejected", row_count: 1 },
  { source_id: "real-work-from-anywhere", is_active: 0, ph_eligibility: "unclear", inactive_reason: "policy-rejected", row_count: 2 },
  { source_id: "real-work-from-anywhere", is_active: 1, ph_eligibility: "eligible_likely", inactive_reason: null, row_count: 26 },
  { source_id: "real-work-from-anywhere", is_active: 1, ph_eligibility: "eligible_verified", inactive_reason: null, row_count: 1 },
  { source_id: "remote-ok", is_active: 0, ph_eligibility: "ineligible", inactive_reason: "policy-rejected", row_count: 17 },
  { source_id: "remote-ok", is_active: 0, ph_eligibility: "unclear", inactive_reason: "policy-rejected", row_count: 8 },
  { source_id: "remote-ok", is_active: 1, ph_eligibility: "eligible_likely", inactive_reason: null, row_count: 7 },
  { source_id: "remotive", is_active: 0, ph_eligibility: "ineligible", inactive_reason: "policy-rejected", row_count: 7 },
  { source_id: "we-work-remotely", is_active: 0, ph_eligibility: "ineligible", inactive_reason: "policy-rejected", row_count: 8 },
  { source_id: "we-work-remotely", is_active: 0, ph_eligibility: "unclear", inactive_reason: "policy-rejected", row_count: 1 },
  { source_id: "we-work-remotely", is_active: 1, ph_eligibility: "eligible_likely", inactive_reason: null, row_count: 53 },
];

describe("classifyExactSixYield", () => {
  test("names all six identities even when a source is absent from supply JSON", () => {
    const report = classifyExactSixYield({ perSourceSupply: PER_SOURCE, firstStorageOutcomes7d: OUTCOMES });
    expect(report.sources.map((s) => s.sourceId).sort()).toEqual([...EXACT_SIX_SOURCE_IDS].sort());
  });
  test("classifies Remotive as fetching-but-ineligible, not a silent fetch failure", () => {
    const remotive = classifyExactSixYield({ perSourceSupply: PER_SOURCE, firstStorageOutcomes7d: OUTCOMES })
      .sources.find((s) => s.sourceId === "remotive")!;
    expect(remotive.class).toBe("fetching_but_ineligible");
    expect(remotive.eligibleFirstStorage7d).toBe(0);
    expect(remotive.rejected7d).toBe(7);
    expect(remotive.repairable).toBe(false);
  });
  test("classifies Jobicy admin as silent zero storage", () => {
    const admin = classifyExactSixYield({ perSourceSupply: PER_SOURCE, firstStorageOutcomes7d: OUTCOMES })
      .sources.find((s) => s.sourceId === "jobicy-admin-support-apac")!;
    expect(admin.class).toBe("silent_zero_storage");
    expect(admin.repairable).toBe(true);
  });
  test("does not treat Remote OK rejects as a geo-gate bug", () => {
    const remoteOk = classifyExactSixYield({ perSourceSupply: PER_SOURCE, firstStorageOutcomes7d: OUTCOMES })
      .sources.find((s) => s.sourceId === "remote-ok")!;
    expect(remoteOk.class).toBe("eligible_with_high_reject");
    expect(remoteOk.repairable).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails** because the module is missing.

Run: `C:\Users\admin\AppData\Roaming\npm\bun.cmd test scripts/diagnostics/exact-six-yield.test.ts`
Expected: fail to resolve `./exact-six-yield`

- [ ] **Step 3: Implement the classifier**

Classes:
- `eligible_inflow` — 7d eligible first-storage > 0 and rejected7d ≤ eligible
- `eligible_with_high_reject` — 7d eligible > 0 and rejected7d > eligible
- `eligible_quiet_24h` — 7d eligible > 0 and 1d eligible = 0
- `fetching_but_ineligible` — 7d eligible = 0 and rejected7d > 0
- `silent_zero_storage` — 7d eligible = 0 and rejected7d = 0

`repairable` is true only for `silent_zero_storage`. Quiet 24h is not a bug.
High reject is the geo-gate working. Fetching-but-ineligible is honest PH miss.

- [ ] **Step 4: Re-run tests until green**

- [ ] **Step 5: Write EX-01 evidence markdown** from the classifier output and
  commit with the classifier. G9 for EX-01 diagnosis: KEEP the classification;
  do not change geo-gate.

---

### Task 2: EX-01 measurement repair — exact-six always present in verify SQL

**Files:**
- Modify: `scripts/ci/verify-source-transition.sql`
- Modify: `scripts/ci/verify-source-transition.test.ts`
- Modify: `.github/workflows/ci-guardrail.yml` jq block

**Interfaces:**
- Produces: `exact_six_supply_json` array of length 6, including zeros

- [ ] **Step 1: Extend the SQL test fixture** so a missing Jobicy admin still
  yields six identities.

Add to the SELECT list:

```sql
  (SELECT json_group_array(json_object(
      'source_id', exact_six.source_id,
      'eligible_active', COALESCE(source_supply.eligible_active, 0),
      'first_storage_1d', COALESCE(source_supply.first_storage_1d, 0),
      'first_storage_7d', COALESCE(source_supply.first_storage_7d, 0)
    ))
    FROM (
      SELECT 'we-work-remotely' AS source_id UNION ALL
      SELECT 'remotive' UNION ALL
      SELECT 'real-work-from-anywhere' UNION ALL
      SELECT 'remote-ok' UNION ALL
      SELECT 'jobicy-admin-support-apac' UNION ALL
      SELECT 'jobicy-supporting-apac'
    ) AS exact_six
    LEFT JOIN source_supply ON source_supply.source_id = exact_six.source_id
  ) AS exact_six_supply_json
```

jq adds: `(.[0].results[0].exact_six_supply_json | fromjson | length == 6)`

- [ ] **Step 2: Run** `bun test scripts/ci/verify-source-transition.test.ts`
  Expected after implementation: pass, including Jobicy admin first_storage_7d=0

- [ ] **Step 3: Commit** `fix(EX-01): report exact-six zeros in production verify SQL`

---

### Task 3: EX-02 admission orchestrator (no network, no production write)

**Files:**
- Create: `packages/scraper/source-admission.ts`
- Create: `packages/scraper/source-admission.test.ts`
- Modify: `packages/scraper/index.ts` exports

**Interfaces:**
- Consumes: `persistAdmissionEvidence`, `applyTypedTransition`, `buildGreenhouseProviderProfile`, `buildGreenhouseCandidateRow`
- Produces: `admitReviewedSourceToShadow(db, input) → { ok: true, sourceId } | { ok: false, reason }`

`AdmitReviewedSourceInput`:
```ts
{
  now: string;
  provider: AdmissionProviderSnapshot;
  source: AdmissionSourceSnapshot; // operationalState must be candidate
  probe: CandidateShadowResult;
  primaryEvidence: PrimaryAdmissionEvidence[];
  adjudicationRef: string;
  insertProvider: (provider) => Promise<void>;
  insertCandidate: (source) => Promise<void>;
}
```

The orchestrator:
1. Rejects if `source.operationalState !== "candidate"`
2. Rejects if probe fails `validateAdmissionProbe`
3. Calls `insertProvider` then `insertCandidate`
4. `buildAdmissionEvidence` + `persistAdmissionEvidence`
5. `applyTypedTransition` to `{ compliance: source.complianceState, operational: "shadow" }` with cause `requested_shadow_entry`
6. Returns failure if `persisted !== true`

- [ ] **Step 1: Failing tests** for happy path, stale/unhealthy probe, and
  transition rejection without leaving a canary/active row.

- [ ] **Step 2: Minimal implementation**

- [ ] **Step 3: Green tests** using the existing bun:sqlite gateway harness
  pattern from `transition-gateway.integration.test.ts` (include 0041 if the
  gateway database type requires it; admission does not write the ledger).

- [ ] **Step 4: Commit** `feat(EX-02): admit a reviewed candidate to shadow through current evidence`

---

### Task 4: EX-02 authenticated admit route + allowlist

**Files:**
- Create: `apps/web/src/pages/api/cron/source-admit.ts`
- Create: `apps/web/tests/source-admit-route.test.ts`
- Create: `.github/workflows/gha-source-admit.yml`

Allowlist for this unit: only `greenhouse:grafanalabs`.

The route:
1. `isAuthorized` with `PROXY_SECRET` / `CRON_SECRET`
2. Parse JSON `{ sourceId }`
3. Reject unknown ids
4. Live `defaultRunProbe` (2-request budget, zero opportunity writes)
5. Build Greenhouse profile/candidate for `grafanalabs` / `Grafana Labs`
6. Hash Greenhouse docs URL content locally from the already-known evidence URL
   SHA if fetch of docs is a third request — **do not** spend the shadow probe
   budget on docs. Use `sha256Hex` of the provider `evidenceUrl` string plus
   capturedAt=now for primaryEvidence content hash only if a live docs GET
   would exceed SP-07's 2-request budget. Prefer hashing the documented
   evidence URL bytes already stored in SP-12 notes? SP-23B requires
   `primaryEvidence.contentSha256` matching `provider.evidenceHash`.
   Set provider.evidenceHash = sha256 of the evidenceUrl + capturedAt so
   probe/provider projections match without a third fetch. Document that
   choice in the evidence file: identity binding, not a full docs mirror.

7. Call `admitReviewedSourceToShadow`
8. Return JSON; never insert opportunities

GHA: `workflow_dispatch` only (no `schedule`). POST to
`https://remotejobs-ph.pages.dev/api/cron/source-admit` with the proxy secret,
same pattern as hunter/intake. Record the JSON in the step summary.

- [ ] **Step 1: Route tests** unauthorized 401, unknown source 400, happy path
  with injected probe/db.

- [ ] **Step 2: Implement route + workflow**

- [ ] **Step 3: Full G3** (`bun test`, typecheck, guardrails, build)

- [ ] **Step 4: PR / merge / deploy, then dispatch admit, then read-only D1
  proof that registry_count=1, operational_state=shadow, shadow never
  published jobs.**

---

### After EX-02 KEEP

EX-03 (schedule shadow-dispatch) is a **new scheduler** and is the next unit,
not this plan. Do not enable it in the EX-02 PR.
