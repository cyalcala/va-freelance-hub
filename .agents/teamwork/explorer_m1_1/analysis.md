# Behavioral Bloat & Ingestion Pipeline Audit (M1)

**Audit Target**: Ingestion & Intake Pipeline (`apps/web/src/pages/api/cron/scrape.ts`, `packages/scraper/sources.ts`, `packages/scraper/adapters/` (`ats.ts`, `rss.ts`, `json.ts`, `html.ts`, `workable.ts`), `apps/web/src/lib/conditional-state.ts`, `apps/web/src/lib/workable-rotation.ts`).
**Auditor**: `explorer_m1_1`
**Methodology**: Ponytail Quality Audit (`.agents/skills/ponytail-upstream`) & Code Simplification (`.agents/skills/code-simplification`).
**Execution Rule**: Read-only investigation. No production code modified.

---

## 1. Executive Summary

This audit conducted an end-to-end trace of the data intake funnel—from source configuration, cadence calculation, and network fetching, through URL normalization, deduplication, batch allocation, geographic and freshness gating, AI triage, to D1 database insertion and publication.

Key high-level findings:
1. **The 5 removals in `BEHAVIORAL_BLOAT_LEDGER_2026-10-14.md` are 100% verified present and correctly tested in the codebase.**
2. **Critical Bug / 100% Data Loss Found**: `clientTimezone` is returned by AI triage (`triageJob`), but completely omitted in `triagedItems.push` (`scrape.ts:3017-3043`) and in `snapshotPublicationUpdate` (`scrape.ts:513-531`), resulting in total loss of timezone data in D1 (`client_timezone` always `NULL`).
3. **Missing Intra-Batch Dedup**: URL deduplication against D1 (`omitKnownSourceUrls`) checks existing DB rows, but does not deduplicate across items in the incoming batch itself. Duplicate items in the same scrape batch cause redundant AI triage invocations before D1 `onConflictDoNothing()` silently drops the second write.
4. **ATS Deferred Starvation Phenomenon**: When an ATS source with a large backlog (e.g. Hunt St, 135 jobs) has items deferred by `selectIntakeBatch` (cap 50), its `lastAttemptAt` has already been updated to `observedAt`. Consequently, the ATS source enters a 60-minute cooldown in `selectWorkableRotation`/`atsFetchCadenceSkip`. Because deferred ATS items are kept in memory only and not staged in D1, they are not processed on subsequent 15-minute cron ticks until the full 60-minute cooldown expires.
5. **Over-restrictive Heuristic in `json.ts`**: The regex `PHYSICAL_OR_LOGISTICS_ROLE_REGEX` matches `\bdelivery\b`, which prematurely drops valid remote tech/VA roles (e.g., "Service Delivery Manager", "Continuous Delivery Engineer") from RemoteOK before `geoGate` or AI triage can evaluate them.
6. **Multiple Quadruple Policy Checks**: In the ATS loop, `atsPlatformPolicy` is called repeatedly for the same agencies across multiple filter passes.

---

## 2. Verification of the 5 Bloat Ledger Removals

We verified all 5 items documented in `docs/operations/BEHAVIORAL_BLOAT_LEDGER_2026-10-14.md`:

| # | Bloat Removal | Target File & Lines | Implementation Verification | Test Suite Verification | Status |
|---|---|---|---|---|---|
| 1 | **RSS-first `newItems.slice(0, limit)`** | `apps/web/src/pages/api/cron/scrape.ts:2726`, `apps/web/src/lib/conditional-state.ts:66-99` | Replaced array slicing with multi-source round-robin `selectIntakeBatch(newItems, limit)`. Guarantees ATS sources (e.g. Hunt St, Coconut VA) receive intake slots even behind a 50+ item RSS head. | `apps/web/tests/intake-fairness.test.ts:14-39` (passes) | **VERIFIED REMOVED** |
| 2 | **Second Workable 60m clock in ATS loop** | `apps/web/src/pages/api/cron/scrape.ts:1785`, `apps/web/src/lib/workable-rotation.ts:102-105` | `atsFetchCadenceSkip` returns `null` if `platform === "workable"`. Cooldown is exclusively managed by `selectWorkableRotation`. | `apps/web/tests/rotation-vs-intake.test.ts:78`, `intake-fairness.test.ts:147-165` (passes) | **VERIFIED REMOVED** |
| 3 | **ATS URLs missing from `sourceIdsByUrl`** | `apps/web/src/pages/api/cron/scrape.ts:2523`, `apps/web/src/lib/conditional-state.ts:48-58` | `mergeSourceIdsByUrl(sourceIdsByUrl, buildSourceIdsByUrl(atsResults))` ensures ATS URLs are mapped to their `platform:token` source identity. | `apps/web/tests/intake-fairness.test.ts:67-76` (passes) | **VERIFIED REMOVED** |
| 4 | **Model eligibility veto on structured geo pass** | `packages/scraper/triage-decision.ts:84-121` | When `gate.geoScope` is structured (`ph_only`, `apac_incl_ph`, `worldwide`), model vote cannot override it to ineligible and missing AI cannot fail closed, provided no deterministic keyword rejection matches. | `packages/scraper/triage-decision.test.ts:104-118` (passes) | **VERIFIED REMOVED** |
| 5 | **Title token `APAC` overriding structured country pin** | `packages/scraper/geoGate.ts:301-304` | Title token `APAC` only matches if `!structuredLocationPin(locationRaw)`. A job with location "Australia" is `country_locked` even if the title says "APAC". | `packages/scraper/geoGate.test.ts:100-128` (passes) | **VERIFIED REMOVED** |

---

## 3. In-Depth Pipeline Stage Trace & Identified Bloat

We traced every stage of execution from request start to completion:

### Stage 1: Route Entry, Auth, Governance, and Locking
- **Source**: `scrape.ts:2102-2200`
- **Rate limiting & Auth**: `API_RATE_LIMITER` (IP check) + `isAuthorized` (`PROXY_SECRET` / `CRON_SECRET`).
- **Governance**: `loadRegistryPolicies(db)`. Fails closed (HTTP 503) if database is unreachable.
- **Run Lock**: `acquireRunLock(db, observedAt)` claims atomic conditional update on D1, with 5-minute timeout.
- **Finding**: Clean, resilient, and non-blocking. Fences concurrent execution between CF Worker cron and GitHub workflows.

### Stage 2: Feed Ingestion & ATS Selection
- **Source**: `scrape.ts:2201-2540`
- **Cadence & Turns**:
  - `planCadenceGroupTurns` coordinates Jobicy feeds (`cadenceGroup: "jobicy.com"`) to alternate turns and back off on 429s.
  - `fetchConfiguredSourceWithStatus` checks `sourceCadenceSkipReason` and `robotsCheckForSource`.
  - `selectWorkableRotation` limits Workable to 2 slots/hour based on durable `lastAttemptAt`.
- **Identified Bloat / Waste**:
  - `vaDirectory.verifiedAt` write (`scrape.ts:2481-2490`): After a successful Workable fetch, `verifiedAt` is updated in `vaDirectory`. As acknowledged in `astra777.txt`, this is never read by `selectWorkableRotation` or any collection clock. It generates extra write queries without operational effect on ingestion.
  - Quadruple `atsPlatformPolicy` evaluation: `atsPlatformPolicy` is called:
    1. Inside `selectWorkableRotation` callback (`line 2341`)
    2. Inside the agency filter loop (`line 2353`)
    3. Inside the cadence check loop (`line 2409`)
    4. Inside `fetchOneAts` (`line 2421`)
    All 4 calls use the same input parameters and `registryPolicies` map.

### Stage 3: Normalization & Deduplication
- **Source**: `scrape.ts:2550-2718`
- **URL Sanitization**: `normalizeScrapedItems(rawItems)` sanitizes `sourceUrl` and `applicationUrl`.
- **Database Dedup Query**: Chunks all scraped URLs into batches of 50 and queries `opportunities` table for existing URLs.
- **Debounced `lastSeenInFeedAt`**: Updates rows with a 12-hour debounce window (`lt(opportunities.lastSeenInFeedAt, staleThreshold)`).
- **Reactivation**: Feed-confirmed jobs previously archived for staleness/link health are revived via `reactivateFeedConfirmedJobs`.
- **`omitKnownSourceUrls`**: Drops URLs present in `existingUrls`.
- **Identified Bloat / Flaw**:
  - **No Intra-Batch URL Dedup**: If multiple items within the current batch share the same `sourceUrl` (either duplicate rows in a feed or the same URL scraped by multiple sources), `existingUrls` contains neither. `omitKnownSourceUrls` lets both duplicates pass into `newItems`.

### Stage 4: Batch Intake Slicing (`selectIntakeBatch`)
- **Source**: `scrape.ts:2720-2738`, `conditional-state.ts:66-99`
- `requestedLimit` clamped between 1 and 100 (default 50).
- `selectIntakeBatch` distributes slots fairly among sources using round-robin.
- **Identified Bloat / Starvation Interaction**:
  - `retrySourceIds`: Computed from deferred item URLs. Used in `recordConditionalSourceStates` at line 3160 to clear HTTP validators (`etag`, `lastModified`, `bodyHash`) for RSS/JSON feeds.
  - **ATS Starvation**: For ATS sources (which do not use HTTP conditional headers), `lastAttemptAt` is written immediately at fetch time (line 2495). If `selectIntakeBatch` defers 50% of an ATS source's items, those items are dropped from memory, and the ATS source is locked out by cooldown for 60 minutes.

### Stage 5: Gating (GeoGate & Posting Freshness)
- **Source**: `scrape.ts:2793-2863`
- `geoGate`: Pure deterministic rule engine (`locationType`, locationRaw regex, title regex, language detection).
- `assessPostingFreshness`: Strict 30-day window on ISO timestamp.
- Ineligible items are immediately routed to `rejectedItems` with inactive reason so they are recorded in D1 and prevented from re-entering triage on future runs.
- **Finding**: Highly effective. Prevents unnecessary AI subrequests. Invariant strictly preserved.

### Stage 6: AI Triage (`decideTriage`)
- **Source**: `scrape.ts:2864-3047`
- Enforces `AI_SUBREQUEST_BUDGET_PER_RUN = 15` per invocation to avoid Cloudflare 50-subrequest crash.
- Calls `decideTriage`:
  - Structured geo cannot be overturned by AI unless explicit keyword exclusions trigger.
  - `unknown` geo requires model agreement + skeptic consensus check.
- **Identified Critical Bug**:
  - `clientTimezone` is returned by `triageJob` (`triage.clientTimezone`).
  - In `scrape.ts:3017-3043`:
    ```ts
    triagedItems.push({
      ...item,
      geoScope: gate.geoScope,
      phEligibility: gate.phEligibility === "unclear" ? "eligible_likely" : gate.phEligibility,
      geoEvidence: gate.geoScope === "unknown" ? `AI triage passed: ${(triage.reason || "eligible").slice(0, 200)}` : gate.evidence,
      geoCheckedAt: observedAt,
      applicationUrl: sanitizeApplyUrlForSource(triage.applicationUrl, item.sourceUrl)
        || sanitizeApplyUrlForSource(item.applicationUrl, item.sourceUrl)
        || item.sourceUrl,
      tags: mergedTags,
      payRange: triage.payRange,
      category: mapTriageCategoryToUiCategory(triage.category),
      experienceLevel: triage.experienceLevel,
      type: triage.employmentType === "contract" ? "freelance" : (triage.employmentType || "freelance"),
      descriptionHash,
      postedAt: normalizeUtcIso(item.postedAt),
      scrapedAt: observedAt,
      lastSeenInFeedAt: observedAt,
      updatedAt: observedAt,
      // MISSING: clientTimezone!
    });
    ```
  - Result: `clientTimezone` is completely omitted from the insert object. D1 column `client_timezone` is never populated for newly triaged jobs.

### Stage 7: Database Insertion & Publication
- **Source**: `scrape.ts:3053-3155`
- Batch inserts in chunks of `D1_INSERT_BATCH_SIZE = 10` using `onConflictDoNothing()`.
- Persists rejected items (`rejectedItems`) and deferred items (`pendingItems`) as inactive rows to seal dedup loop.
- **Finding**: Preserves D1 parameter limits (max 100 bound parameters per query).

---

## 4. Concrete Before/After Behavioral Traces

### Trace 1: The `clientTimezone` Pipeline Omission
- **Current Behavior (Before)**:
  1. Remote opening with title "AU Bookkeeper - Australian Day Shift (AEST)" passes `geoGate` (`ph_only`).
  2. Workers AI executes `triageJob` and successfully extracts `clientTimezone: "AEST"`.
  3. `scrape.ts:3017-3043` builds `triagedItems` row without `clientTimezone`.
  4. Row is inserted into D1 `opportunities` with `client_timezone = NULL`.
  5. Downstream dayshift filter on `/opportunities` reads `client_timezone`, finds `NULL`, and fails to identify the listing as AU/APAC dayshift.
- **Consolidated Behavior (After)**:
  1. `scrape.ts:3017-3043` sets:
     `clientTimezone: triage.clientTimezone ?? (item as any).clientTimezone ?? null`.
  2. Row is inserted into D1 with `client_timezone = "AEST"`.
  3. UI and search filters accurately expose the vacancy under Australian/Dayshift filters.

### Trace 2: Intra-Batch Duplicate Triage Waste
- **Current Behavior (Before)**:
  1. Source A and Source B both yield an identical job posting with `sourceUrl: "https://example.com/job/123"`.
  2. Neither exists in D1 yet.
  3. `omitKnownSourceUrls` checks `existingUrls` (from D1); both items remain in `newItems`.
  4. `selectIntakeBatch` selects both items into `itemsToProcess`.
  5. Both items pass through `geoGate` and trigger separate calls to `decideTriage`.
  6. AI subrequests are consumed twice (wasting 2–4 subrequests against the 15-subrequest per-run budget).
  7. D1 insert executes `onConflictDoNothing()`, discarding the second row.
- **Consolidated Behavior (After)**:
  1. An in-memory Set deduplicates `newItems` by `sourceUrl` before `selectIntakeBatch`.
  2. Only the primary item reaches `selectIntakeBatch` and `decideTriage`.
  3. Zero duplicate AI calls; subrequest budget is preserved for distinct job postings.

### Trace 3: RemoteOK Premature Keyword Rejection (`isRelevantForHub`)
- **Current Behavior (Before)**:
  1. RemoteOK API returns "Service Delivery Manager - APAC" or "Continuous Delivery Specialist".
  2. `json.ts:129` evaluates `isRelevantForHub(title, description)`.
  3. Regex `PHYSICAL_OR_LOGISTICS_ROLE_REGEX` matches the substring `"delivery"`.
  4. Item is rejected as `null` in the adapter before `geoGate` or AI triage ever inspects it.
- **Consolidated Behavior (After)**:
  1. Tighten `PHYSICAL_OR_LOGISTICS_ROLE_REGEX` from `\bdelivery\b` to `\b(delivery driver|food delivery|parcel delivery)\b` so remote software/service delivery roles are preserved.
  2. Legitimate tech/management delivery roles proceed to `geoGate` and qualification.

---

## 5. Exact Recommendations for the Worker

The following surgical modifications are recommended for implementation by the Worker:

### Recommendation 1: Fix `clientTimezone` Data Loss in `scrape.ts`
- **File**: `apps/web/src/pages/api/cron/scrape.ts`
- **Location 1**: Lines 3018–3043 (in `triagedItems.push`):
  ```typescript
  // Add clientTimezone to triagedItems:
  clientTimezone: triage.clientTimezone ?? (item as any).clientTimezone ?? null,
  ```
- **Location 2**: Lines 513–531 (in `snapshotPublicationUpdate` inside `drainPendingTriageInline`):
  ```typescript
  // Add clientTimezone to publication update patch:
  clientTimezone: triage.clientTimezone ?? (item as any).clientTimezone ?? null,
  ```

### Recommendation 2: Add In-Memory URL Deduplication Before Intake Slicing
- **File**: `apps/web/src/pages/api/cron/scrape.ts`
- **Location**: Around line 2670 (immediately after `omitKnownSourceUrls`):
  ```typescript
  // Ensure newItems contains only unique sourceUrls within the current batch:
  const seenNewUrls = new Set<string>();
  const uniqueNewItems: typeof newItems = [];
  for (const item of newItems) {
    if (item.sourceUrl && !seenNewUrls.has(item.sourceUrl)) {
      seenNewUrls.add(item.sourceUrl);
      uniqueNewItems.push(item);
    }
  }
  const intake = selectIntakeBatch(uniqueNewItems, limit);
  ```

### Recommendation 3: Narrow RemoteOK Logistics Regex in `json.ts`
- **File**: `packages/scraper/json.ts`
- **Location**: Line 74:
  - Replace:
    ```typescript
    export const PHYSICAL_OR_LOGISTICS_ROLE_REGEX =
      /\b(courier|mail carrier|driver|delivery|warehouse|forklift|photographer|civil engineer|logistics|fulfillment operations)\b/i;
    ```
  - With:
    ```typescript
    export const PHYSICAL_OR_LOGISTICS_ROLE_REGEX =
      /\b(courier|mail carrier|driver|delivery driver|food delivery|warehouse|forklift|photographer|civil engineer|logistics|fulfillment operations)\b/i;
    ```
  - Rationale: Prevents dropping software/service delivery titles while continuing to filter physical delivery drivers.

### Recommendation 4: Consolidate Redundant `atsPlatformPolicy` Invocations
- **File**: `apps/web/src/pages/api/cron/scrape.ts`
- **Location**: Lines 2352–2415
  - Attach the evaluated `policy` to the agency object in the first loop so subsequent loops (duplicate filtering, cadence checking, and `fetchOneAts`) reuse the precomputed policy object instead of calling `atsPlatformPolicy` 3–4 times.

---

## 6. Verification Plan

When the Worker implements the above changes:
1. **Targeted Tests**:
   - Run `bun test apps/web/tests/intake-fairness.test.ts`
   - Run `bun test apps/web/tests/rotation-vs-intake.test.ts`
   - Run `bun test packages/scraper/triage-decision.test.ts`
   - Run `bun test packages/scraper/geoGate.test.ts`
   - Run `bun test packages/scraper/json.test.ts`
2. **New Adversarial Tests**:
   - Add unit test proving `triagedItems` spread retains `clientTimezone`.
   - Add unit test proving intra-batch duplicate `sourceUrl`s in `newItems` are deduped to 1 before triage.
   - Add unit test proving "Service Delivery Lead" passes RemoteOK `isRelevantForHub`.
3. **Full Suite**:
   - Run `bun test` across the entire workspace (all 379+ tests must pass).
