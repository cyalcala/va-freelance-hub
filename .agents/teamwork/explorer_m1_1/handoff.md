# Handoff Report — Ingestion & Scrape Pipeline Bloat Audit (M1)

**Agent**: `explorer_m1_1`
**Milestone**: M1 (Behavioral Bloat & Redundant Complexity Elimination)
**Working Directory**: `c:\Users\admin\Desktop\va-freelance-hub\.agents\teamwork\explorer_m1_1`
**Date**: 2026-10-15

---

## 1. Observation

Direct observations from the codebase:

### Bloat Ledger 2026-10-14 Removals
1. **Item 1 (RSS-first `newItems.slice(0, limit)`)**:
   - `apps/web/src/pages/api/cron/scrape.ts:2726`:
     ```typescript
     const intake = selectIntakeBatch(newItems, limit);
     const itemsToProcess = intake.selected;
     ```
   - Replaced by `selectIntakeBatch(newItems, limit)` in `apps/web/src/lib/conditional-state.ts:66-99`.
   - Verified passing: `apps/web/tests/intake-fairness.test.ts:14-39`.

2. **Item 2 (Second Workable 60m clock in ATS loop)**:
   - `apps/web/src/pages/api/cron/scrape.ts:1785`:
     ```typescript
     export function atsFetchCadenceSkip(
       platform: string | null,
       lastAttemptAt: string | null | undefined,
       observedAt: string,
       minIntervalMs: number,
     ): string | null {
       if (platform === "workable" || !lastAttemptAt) return null;
     ```
   - Workable cooldown is managed solely by `selectWorkableRotation` in `apps/web/src/lib/workable-rotation.ts:102-105`.
   - Verified passing: `apps/web/tests/rotation-vs-intake.test.ts:78` and `intake-fairness.test.ts:147-165`.

3. **Item 3 (ATS URLs missing from `sourceIdsByUrl`)**:
   - `apps/web/src/pages/api/cron/scrape.ts:2523`:
     ```typescript
     mergeSourceIdsByUrl(sourceIdsByUrl, buildSourceIdsByUrl(atsResults));
     const atsItems = attachSourceIdentity(atsResults);
     ```
   - Implemented in `apps/web/src/lib/conditional-state.ts:48-58`.
   - Verified passing: `apps/web/tests/intake-fairness.test.ts:67-76`.

4. **Item 4 (Model eligibility veto on a structured geo pass)**:
   - `packages/scraper/triage-decision.ts:84-121`:
     ```typescript
     const structuredGeo =
       gate.geoScope === "ph_only" ||
       gate.geoScope === "apac_incl_ph" ||
       gate.geoScope === "worldwide";
     const deterministicReject =
       isObviousGeoRestriction(input.title, input.description || "") ||
       isObviousNonEnglishOrLocalOnly(input.title, input.description || "");

     if (triage.aiUnavailable) {
       if (structuredGeo && !deterministicReject) {
         return {
           kind: "eligible",
           triage: {
             ...triage,
             eligibleForFilipinos: true,
             aiUnavailable: false,
             reason: `Structured ${gate.geoScope} stands; AI unavailable`,
           },
           skeptic: null,
         };
       }
       return { kind: "ai-unavailable", triage };
     }

     if (!triage.eligibleForFilipinos) {
       if (structuredGeo && !deterministicReject) {
         return {
           kind: "eligible",
           triage: {
             ...triage,
             eligibleForFilipinos: true,
             reason: `Structured ${gate.geoScope} stands over model: ${(triage.reason || "ineligible").slice(0, 300)}`,
           },
           skeptic: null,
         };
       }
       return { kind: "ineligible", reason: triage.reason || "ineligible", triage };
     }
     ```
   - Verified passing: `packages/scraper/triage-decision.test.ts:104-118`.

5. **Item 5 (Title token `APAC` overriding structured country pin)**:
   - `packages/scraper/geoGate.ts:301-304`:
     ```typescript
     const apacInTitle = firstMatch(APAC_POSITIVE_REGEX, title);
     if (apacInTitle && !structuredLocationPin(locationRaw)) {
       return verdict("apac_incl_ph", "eligible_verified", `APAC region named: "${apacInTitle}"`);
     }
     ```
   - Verified passing: `packages/scraper/geoGate.test.ts:100-128`.

### Additional Direct Code Observations (Defects & Bloat)
6. **Data Loss on `clientTimezone` in `scrape.ts`**:
   - `apps/web/src/pages/api/cron/scrape.ts:3017-3043`:
     ```typescript
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
     });
     ```
     `triageJob` returns `clientTimezone` (`packages/scraper/triage.ts:194`), but `clientTimezone` is not added to the object pushed to `triagedItems`.
     Similarly, `apps/web/src/pages/api/cron/scrape.ts:513-531` (`drainPendingTriageInline`) passes `update` to `snapshotPublicationUpdate` without `clientTimezone`.
     D1 table `opportunities` has `clientTimezone: text("client_timezone")` (`packages/db/schema.ts:32`), which remains `NULL` for 100% of newly ingested jobs.

7. **Missing Intra-Batch Deduplication**:
   - `apps/web/src/pages/api/cron/scrape.ts:2611-2669`:
     ```typescript
     const allScrapedUrls = allItems.map(item => item.sourceUrl).filter(Boolean);
     // Queries D1 in batches of 50...
     const newItems = omitKnownSourceUrls(allItems, existingUrls);
     ```
     Neither `normalizeScrapedItems` nor `omitKnownSourceUrls` checks for duplicate `sourceUrl`s within `allItems`.
     If two feeds or items have the same URL, both enter `newItems` and can both be selected by `selectIntakeBatch`, causing duplicate AI subrequests before D1 `onConflictDoNothing()` drops one.

8. **Over-restrictive `delivery` keyword in `packages/scraper/json.ts:74`**:
   - `PHYSICAL_OR_LOGISTICS_ROLE_REGEX` matches `\bdelivery\b` in title or first 500 chars of description, dropping non-logistics tech roles such as "Service Delivery Manager" or "Continuous Delivery Engineer".

9. **Quadruple `atsPlatformPolicy` evaluations**:
   - `scrape.ts:2341`, `scrape.ts:2353`, `scrape.ts:2409`, `scrape.ts:2421` all re-evaluate `atsPlatformPolicy(agency, registryPolicies)` for the same agency.

---

## 2. Logic Chain

1. **Verification of Existing Bloat Removals**:
   - Observations 1 through 5 establish that each of the 5 removals cited in `BEHAVIORAL_BLOAT_LEDGER_2026-10-14.md` exists in code exactly as described and has direct passing regression tests.
   - Therefore, the baseline bloat removals are verified intact and operational.

2. **D1 `clientTimezone` Bug**:
   - Observation 6 shows `triage.clientTimezone` is returned by `decideTriage`.
   - `triagedItems.push` specifies explicit field mappings but omits `clientTimezone`.
   - `snapshotPublicationUpdate` specifies explicit field mappings but omits `clientTimezone`.
   - D1 schema expects `client_timezone`.
   - Therefore, no scraped job ever stores its timezone in D1, causing 100% data loss for dayshift/APAC schedule classification.

3. **Intra-Batch Dedup & AI Budget Waste**:
   - Observation 7 shows `omitKnownSourceUrls` only checks against URLs already in D1.
   - If two identical URLs are scraped in the same run, both survive into `newItems`.
   - `selectIntakeBatch` distributes both into `itemsToProcess`.
   - Both items invoke `decideTriage` and call Workers AI (consuming 2 to 8 subrequests from the 15-call per-tick budget).
   - Only at D1 `insert` does `onConflictDoNothing()` discard the duplicate.
   - Therefore, deduplicating `newItems` in-memory by `sourceUrl` before `selectIntakeBatch` prevents wasted AI budget.

4. **RemoteOK Logistics Heuristic**:
   - Observation 8 shows `\bdelivery\b` is matched without context.
   - In modern remote listings, "delivery" is common in software and project management titles.
   - Narrowing the match to `\b(delivery driver|food delivery|parcel delivery)\b` prevents false-negative drop-offs while continuing to filter couriers.

---

## 3. Caveats

- **No live Cloudflare Workers AI execution during audit**: Observations were made via static analysis, code tracing, and Bun unit/integration test runs.
- **Directory `verifiedAt` write**: Left untouched because public directory pages (`/directory`) may read it for UI timestamps even though ingestion collection clocks do not.
- **Canary publication rate limits**: Publication gateway limits (canary clamps) were audited and found working as intended; no bloat identified there.

---

## 4. Conclusion

The ingestion pipeline is architecturally sound and fair after the 2026-10-14 bloat removals, but contains one critical data loss bug (`clientTimezone` omission), one redundant AI cost leak (missing intra-batch URL dedup), and one false-negative keyword heuristic (RemoteOK `delivery`).

### Concrete Recommendations for the Worker:
1. **Fix `clientTimezone` Data Loss**:
   - In `apps/web/src/pages/api/cron/scrape.ts:3017-3043`, add:
     `clientTimezone: triage.clientTimezone ?? (item as any).clientTimezone ?? null,`
   - In `apps/web/src/pages/api/cron/scrape.ts:513-531`, add:
     `clientTimezone: triage.clientTimezone ?? (item as any).clientTimezone ?? null,`
2. **Add In-Memory Dedup to `newItems`**:
   - In `apps/web/src/pages/api/cron/scrape.ts` before `selectIntakeBatch`, deduplicate `newItems` by `sourceUrl` to prevent duplicate AI triage calls.
3. **Narrow RemoteOK Regex**:
   - In `packages/scraper/json.ts:74`, replace `delivery` with `delivery driver|food delivery|parcel delivery`.
4. **Cache `atsPlatformPolicy`**:
   - In `apps/web/src/pages/api/cron/scrape.ts:2352-2415`, avoid calling `atsPlatformPolicy` 4 times per agency.

---

## 5. Verification Method

To independently verify these findings:
1. **Run Targeted Tests**:
   ```sh
   bun test apps/web/tests/intake-fairness.test.ts apps/web/tests/rotation-vs-intake.test.ts packages/scraper/triage-decision.test.ts packages/scraper/geoGate.test.ts
   ```
2. **Inspect Code Locations**:
   - Check `scrape.ts:3017-3043` for missing `clientTimezone`.
   - Check `scrape.ts:513-531` for missing `clientTimezone`.
   - Check `json.ts:74` for `\bdelivery\b`.
   - Check `scrape.ts:2669-2726` for lack of intra-batch dedup between `omitKnownSourceUrls` and `selectIntakeBatch`.
3. **Invalidation Conditions**:
   - If `triagedItems.push` is proven to already populate `client_timezone` in D1 through another unobserved path, Finding 6 is invalidated.
   - If `omitKnownSourceUrls` is proven to deduplicate identical items within its input array, Finding 7 is invalidated.
