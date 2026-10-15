# Forensic Analysis: Filtering, GeoGate, and Triage Gate Consolidation (Milestone 1)

**Author**: explorer_m1_2  
**Date**: 2026-10-15  
**Target Files**:
- `packages/scraper/geoGate.ts`
- `packages/scraper/triage.ts`
- `packages/scraper/triage-decision.ts`
- `packages/scraper/policy-resolver.ts`
- `packages/scraper/shiftClassifier.ts`
- `apps/web/src/pages/api/cron/scrape.ts` (pipeline integration)

---

## 1. Executive Summary & Problem Boundary

In pursuit of scaling VA Freelance Hub toward 100–150+ newly published, verified Philippines-eligible remote jobs per day, the ingestion and filtering pipeline has accumulated redundant decision layers, obsolete defensive heuristics, and overlapping checks across `geoGate.ts`, `triage.ts`, and `triage-decision.ts`.

By applying the **Ponytail Audit** and **Code Simplification** methodologies, this audit identifies **8 concrete bloat and redundancy items (B1–B8)**. Crucially, resolving these redundancies eliminates false negatives (such as US-hours VA roles falsely rejected by timezone checks, and EU-localized roles unnecessarily consuming AI budget), while **strictly preserving all core safety invariants**:
1. **Strict per-vacancy geoGate**: United States, onsite, hybrid, and country-locked vacancies remain 100% rejected.
2. **30-day freshness window**: Original posting dates outside the inclusive 30-day window remain 100% withheld.
3. **Zero employer allowlist bypass**: No employer identity or trust tier can override `geoGate`, `assessPostingFreshness`, or workplace location types (verified by Pineapple Staffing remaining 0 public).

---

## 2. Forensic Code Inventory & Call Chains

### 2.1 The Ingestion Execution Pipeline
The data flow for every candidate vacancy follows this deterministic sequence:
```text
Authoritative Feed / ATS / Scraper
             │
             ▼
[1] Parse & Normalize URL/Title/Location
             │
             ▼
[2] URL Dedup (omitKnownSourceUrls)
             │
             ▼
[3] geoGate(input) ───[Ineligible]───► Persist Inactive ("policy-rejected", "geo-gate-rejected")
             │
             ▼ [Eligible Verified / Likely / Unclear]
[4] assessPostingFreshness(postedAt, observedAt) ───[Stale/Invalid/Future]───► Persist Inactive ("posting-freshness-*")
             │
             ▼ [WITHIN_WINDOW]
[5] Triage Gate Routing (Inline decideTriage OR Inngest durable drain)
             │
             ├──► decideTriage(input, { geoScope }, aiEnv)
             │         │
             │         ├──► triageJob(title, description, env, context)
             │         │         │
             │         │         ├── [Step 1] Obvious Geo / Language Regex Filters
             │         │         ├── [Step 2] AI Provider Cascade (Gemini -> Groq -> Cloudflare)
             │         │         └── [Step 3] validateTriageResult()
             │         │
             │         ├──► Structured Geo Scope Override Check (ph_only, apac_incl_ph, worldwide)
             │         └──► Skeptic Review (adversarial 2nd vote, ONLY if gate.geoScope === "unknown")
             │
             ▼
[6] Persist Triaged Item to D1 (`triagedItems.push` / `snapshotPublicationUpdate`)
```

---

## 3. Ranked Bloat & Redundancy Findings (B1 – B8)

### B1. AI Provider Bypass Dead Branch in `triageJob`
- **Location**: `packages/scraper/triage.ts:374-436` vs lines 496-589.
- **What this is**: An early exit check `if (!env || !env.AI)` intended for local offline mock testing.
- **Problem**: In `triageJob`, line 374 checks `if (!env || !env.AI)` *before* initializing or checking `env?.GEMINI_API_KEY` or `env?.GROQ_API_KEY` (lines 496-505). If the worker runs in an environment where Cloudflare Workers AI (`env.AI`) is not bound (or in tests/local runs) but free API keys (`GEMINI_API_KEY`, `GROQ_API_KEY`) *are* supplied, `triageJob` immediately exits at line 423 with mock classification and `aiUnavailable: true`! Gemini and Groq are never invoked. In contrast, `skepticEligibilityCheck` (lines 633-635) correctly checks `if (!env?.AI && !geminiKey && !groqKey)`.
- **Fix**: Move the fallback to the end of the provider cascade, or guard the early return with `if (!env?.AI && !geminiKey && !groqKey)`.
- **If skipped**: Any runtime relying on Gemini/Groq as primary without a CF AI binding silently fails closed, preventing triage.

### B2. Obsolete Timezone Keywords in `GEOGRAPHIC_EXCLUSION_REGEX`
- **Location**: `packages/scraper/triage.ts:50-54`.
- **What this is**: Regex tokens `"us timezone only"`, `"est only"`, `"pst only"`, `"mst only"`, `"cst only"` embedded in `GEOGRAPHIC_EXCLUSION_REGEX`.
- **Problem**: In remote freelance VA work, Filipino virtual assistants routinely work overnight supporting US clients in US business hours (EST/PST). `geoGate.ts:12-13` and Golden Fixture #7 explicitly define that timezone overlap requirements are normal VA reality and must stay eligible. However, if a job description states "Work schedule: EST only (9am - 5pm EST)", `isObviousGeoRestriction` matches `"est only"` and rejects the listing. Worse, in `triage-decision.ts:88-91`, `deterministicReject` becomes `true`, causing `decideTriage` to reject the job *even when `geoGate` already verified it as `ph_only`*!
- **Fix**: Delete `"us timezone only"`, `"est only"`, `"pst only"`, `"mst only"`, `"cst only"` from `GEOGRAPHIC_EXCLUSION_REGEX`. Real geographic exclusions (`"us only"`, `"us citizens? only"`, `"w-?2 only"`, `"authorized to work in the us"`) remain intact.
- **If skipped**: Legitimate US-shift remote VA positions advertised for Filipinos are falsely dropped as ineligible.

### B3. Redundant Model Eligibility Veto on Structured Geo Scopes
- **Location**: `packages/scraper/triage-decision.ts:84-121` and `packages/scraper/triage.ts:440-476`.
- **What this is**: Dual decision on geo-eligibility between deterministic `geoGate` and LLM prompt.
- **Problem**: When a listing passes `geoGate` with a structured scope (`ph_only`, `apac_incl_ph`, `worldwide`), `geoGate` has already verified geographic eligibility from verified location strings, tags, and text pins. Yet `decideTriage` passes the job to `triageJob`, which prompts the model to judge `eligibleForFilipinos` using 5 lengthy rules. Then, in `decideTriage:108-119`, if the model votes `eligibleForFilipinos: false` or if AI is unavailable, `decideTriage` *overrides the model vote anyway* (`Structured ${gate.geoScope} stands over model`). The model is asked a question whose answer is discarded.
- **Fix**: Consolidate the interface: for listings where `gate.geoScope !== "unknown"`, the eligibility decision is already final (`eligibleForFilipinos = true`). The model's role is strictly metadata extraction (`category`, `tags`, `payRange`, `clientTimezone`, `experienceLevel`, `employmentType`). If AI is unavailable for a structured geo scope, it is published immediately with deterministic fallback category.
- **If skipped**: Wastes LLM prompt tokens, causes unnecessary latency, and risks false negatives if error handling misreconciles.

### B4. Fragmented Heuristics: `LOCAL_OR_NON_ENGLISH_REGEX` Running Late in Triage
- **Location**: `packages/scraper/triage.ts:64-87` vs `packages/scraper/geoGate.ts:198-229`.
- **What this is**: Regex matching German/French localized work markers (`m/w/d`, `werkstudent`, `alternance`, `cdi`, `cdd`, `praktikum`, `stellenangebot`).
- **Problem**: In `geoGate.ts`, language detection is based purely on stopword frequency (`detectDominantLanguage`). German/French domestic postings written with short text or mixed English headings often fail safe as `"en"`, passing `geoGate` as `unknown`. They then proceed to `triageJob`, where `isObviousNonEnglishOrLocalOnly` catches them and rejects them. This is stage inversion: deterministic regex filtering belongs in `geoGate` (Stage 3), not in `triageJob` (Stage 5).
- **Fix**: Move `LOCAL_OR_NON_ENGLISH_REGEX` into `packages/scraper/geoGate.ts` as Step 2b. If matched, `geoGate` immediately returns `{ geoScope: "country_locked", phEligibility: "ineligible", evidence: "Domestic market marker: ..." }`.
- **If skipped**: Domestic European postings unnecessarily consume Workers AI subrequest budget and queue latency before being rejected.

### B5. Duplicate Keyword Categorizer in `triage.ts`
- **Location**: `packages/scraper/triage.ts:380-421` vs `packages/scraper/categorizer.ts:1-137`.
- **What this is**: 40 lines of ad-hoc regex/includes categorization in `triageJob` for the no-AI fallback.
- **Problem**: `triage.ts` implemented an ad-hoc keyword categorizer that checks for "ai engineer", "writer", "admin", "developer", etc. Meanwhile, `packages/scraper/categorizer.ts` contains `categorizeOpportunityTitle(title, description)`, a thoroughly tested, canonical 137-line taxonomy covering tech, finance, design, customer service, marketing, writing, admin, and general roles. The duplicate code in `triage.ts` is incomplete (e.g. misses "virtual assistant" or "bookkeeper" nuances).
- **Fix**: Replace lines 380-421 in `triage.ts` with a single call to `categorizeOpportunityTitle(title, cleanDescription)`.
- **If skipped**: Maintenance drift; category taxonomy improvements in `categorizer.ts` are never reflected in the triage fallback.

### B6. Missing Geo-Ineligible Check in `drainPendingTriageQueue`
- **Location**: `apps/web/src/pages/api/cron/scrape.ts:423-465`.
- **What this is**: Re-triaging pending items from D1.
- **Problem**: In `drainPendingTriageQueue`, line 423 runs `gate = geoGate(...)`. Line 433 checks `if (hasExplicitNonRemoteLocationType(item.locationType))` and rejects explicit onsite rows. However, if `gate.phEligibility === "ineligible"` due to country locks (e.g. `locationRaw: "United States"`, US state code, or title lock), `drainPendingTriageQueue` does *not* reject it! Instead, it falls through to line 461 and calls `decideTriage`, invoking `triageJob` and spending valuable AI subrequests on items that `geoGate` already marked ineligible.
- **Fix**: In `drainPendingTriageQueue`, check `if (gate.phEligibility === "ineligible")` and reject directly into D1 without invoking `decideTriage`, exactly matching the main scrape loop on line 2806.
- **If skipped**: Wasted AI subrequest quota on dead country-locked listings during queue drain ticks.

### B7. Duplicate Location Pin Regex Evaluations in `geoGate.ts`
- **Location**: `packages/scraper/geoGate.ts:244-254` (`structuredLocationPin`) vs `packages/scraper/geoGate.ts:319-338` (Step 4).
- **What this is**: Repeating 6 regex checks across `locationRaw`.
- **Problem**: `structuredLocationPin(locationRaw)` evaluates `REGION_EXCL_PH_REGEX`, `STRUCTURED_US_LOCATION_REGEX`, `US_STATE_CODE_LOCATION_REGEX`, `US_STATE_REGEX`, `COUNTRY_REGEX`, and `CITY_REGEX`. Then, Step 4 of `geoGate` executes the exact same 6 regex searches on `locationRaw` again. Furthermore, in Step 4, `US_STATE_CODE_LOCATION_REGEX` failed to check `AMBIGUOUS_STATE_WORDS`, creating a risk that "Remote - VA" (Virtual Assistant) or "Remote - IN" (India) would be falsely flagged as Virginia/Indiana.
- **Fix**: Unify location pin checking into a single helper `detectStructuredLocationPin(locationRaw)` that checks `AMBIGUOUS_STATE_WORDS` and returns the `GeoVerdict` or `null`. Reuse the result in Step 1b and Step 4.
- **If skipped**: CPU cycle waste in hot scraping loops; latent bug where "VA" in location string is misinterpreted as Virginia.

### B8. Dropped `clientTimezone` in Pipeline and Timezone Omission in `classifyShift`
- **Location**: `apps/web/src/pages/api/cron/scrape.ts:3018-3043` and `packages/scraper/shiftClassifier.ts:26-36`.
- **What this is**: Extraction and propagation of client timezone metadata.
- **Problem**: `triageJob` extracts `clientTimezone` (e.g. "AEST", "EST"), but `triagedItems.push` in `scrape.ts` omits `clientTimezone` in its spread, causing 100% data loss of timezone in D1. Furthermore, in `shiftClassifier.ts`, `input.clientTimezone` is parsed on line 26 but completely ignored when matching shift markers, always defaulting to `unknown` unless title/description contains explicit phrases.
- **Fix**: Ensure `scrape.ts:3018` includes `clientTimezone: triage.clientTimezone ?? (item as any).clientTimezone ?? null`. Update `classifyShift` to recognize structured APAC/AU/NZ timezones as dayshift evidence in Milestone 2.
- **If skipped**: 100% loss of timezone data for downstream dayshift filtering.

---

## 4. Before vs. After Behavioral Traces

### Trace 1: Remote VA Job with US Hours ("EST only")
- **Input**:
  - Title: `"Virtual Assistant - Executive Support"`
  - Description: `"Support our US leadership team. Shift schedule: EST only, 9:00 AM - 5:00 PM EST. Open to global freelancers."`
  - Location: `"Remote"`
- **Before**:
  1. `geoGate` returns `{ geoScope: "unknown", phEligibility: "unclear" }` (passes gate).
  2. `decideTriage` calls `triageJob`.
  3. `triageJob` runs `isObviousGeoRestriction` -> matches `"est only"`!
  4. `triageJob` returns `{ eligibleForFilipinos: false, reason: "Obvious geo-restriction detected..." }`.
  5. `decideTriage` evaluates `deterministicReject = true` -> returns `{ kind: "ineligible" }`.
  6. Pipeline persists job as `isActive: false`, `inactiveReason: "policy-rejected"`. **(FALSE NEGATIVE DROP)**.
- **After**:
  1. `geoGate` returns `{ geoScope: "unknown", phEligibility: "unclear" }`.
  2. `triageJob` runs updated `isObviousGeoRestriction` (no `"est only"` token).
  3. LLM classifies job: `eligibleForFilipinos: true, category: "admin", clientTimezone: "EST"`.
  4. Skeptic reviews and confirms timezone overlap is allowed.
  5. Job is approved and published as active admin VA role with `clientTimezone: "EST"`. **(QUALIFIED PUBLICATION)**.

---

### Trace 2: German Domestic Job with `m/w/d` Marker
- **Input**:
  - Title: `"Customer Success Manager (m/w/d)"`
  - Description: `"Join our Berlin remote team. Fluent English and German required."`
  - Location: `"Remote"`
- **Before**:
  1. `geoGate` runs `detectDominantLanguage` -> text has high English stopword ratio -> fails safe to `"en"`.
  2. `geoGate` returns `{ geoScope: "unknown", phEligibility: "unclear" }`.
  3. Job passes to `triageJob` (costs 1 LLM request).
  4. `triageJob` runs `isObviousNonEnglishOrLocalOnly` -> matches `"m/w/d"`.
  5. Returns `{ eligibleForFilipinos: false }` -> rejected.
- **After**:
  1. `geoGate` runs Step 2b (`LOCAL_OR_NON_ENGLISH_REGEX`) -> matches `"m/w/d"`.
  2. `geoGate` immediately returns `{ geoScope: "country_locked", phEligibility: "ineligible", evidence: "Domestic market marker: \"m/w/d\"" }`.
  3. Pipeline drops job immediately without spending any AI tokens or invocations. **(ZERO AI COST, REJECTED AT GATE)**.

---

### Trace 3: Structured Philippines Job during AI Provider Outage
- **Input**:
  - Title: `"Bookkeeper (025-1379)"` (Hunt St)
  - Description: `"Work for our Australian client. Must reside in the Philippines. HMO provided."`
  - Location: `"Philippines"`
- **Before**:
  1. `geoGate` returns `{ geoScope: "ph_only", phEligibility: "eligible_verified" }`.
  2. `decideTriage` calls `triageJob`.
  3. `triageJob` calls Workers AI, which fails (neuron quota exhausted or 4006).
  4. `triageJob` returns `{ aiUnavailable: true, eligibleForFilipinos: false }`.
  5. `decideTriage` overrides: `Structured ph_only stands; AI unavailable`.
  6. Emits console warning and records provider failure.
- **After**:
  1. `geoGate` returns `{ geoScope: "ph_only", phEligibility: "eligible_verified" }`.
  2. `decideTriage` recognizes structured geo scope. If AI is offline, immediately applies canonical `categorizeOpportunityTitle` ("finance") and publishes without spurious provider failure churn. **(ZERO DRIFT, IMMEDIATE PUBLICATION)**.

---

### Trace 4: Country-Locked Job in `drainPendingTriageQueue`
- **Input**:
  - Row in D1 with `inactiveReason: "pending-triage"`, `title: "Account Executive"`, `locationRaw: "Dallas, TX"`, `locationType: "remote"`.
- **Before**:
  1. `drainPendingTriageQueue` claims item.
  2. Runs `geoGate` -> returns `{ geoScope: "country_locked", phEligibility: "ineligible" }`.
  3. Checks `if (hasExplicitNonRemoteLocationType(item.locationType))` -> false (`locationType` is "remote").
  4. Proceeds to call `decideTriage(...)`!
  5. AI model runs, evaluates text, returns ineligible. **(WASTED 1 AI INVOCATION)**.
- **After**:
  1. `drainPendingTriageQueue` claims item.
  2. Runs `geoGate` -> returns `{ geoScope: "country_locked", phEligibility: "ineligible" }`.
  3. Checks `if (gate.phEligibility === "ineligible")` -> TRUE!
  4. Immediately updates row to `inactiveReason: "policy-rejected"`, `phEligibility: "ineligible"`, `geoEvidence: gate.evidence`.
  5. Skips `decideTriage` completely. **(ZERO AI INVOCATIONS)**.

---

## 5. Invariant Preservation Proof

| Invariant | Protection Mechanism | Why Bloat Consolidation Cannot Regress It |
|---|---|---|
| **Per-Vacancy GeoGate** | Every vacancy must pass `geoGate(input)`. Hard non-remote types (`onsite`, `hybrid`), country pins (US, UK, CA, AU, etc.), US state codes/names, and foreign city pins yield `ineligible`. | Moving `LOCAL_OR_NON_ENGLISH_REGEX` into `geoGate` *tightens* the gate. Removing `"est only"` leaves all real geographic exclusion regexes (`us only`, `us citizens only`, `w2 only`) untouched. |
| **30-Day Freshness Window** | Every vacancy is evaluated by `assessPostingFreshness(postedAt, observedAt)`. Only `WITHIN_WINDOW` entries pass. | Neither `geoGate` nor `triage` modifications touch `assessPostingFreshness`. The 30-day cutoff remains absolute and unchanged. |
| **Zero Employer Allowlist Bypass** | No employer identity grants automatic publication. Pineapple Staffing: 3 open roles from 2020–2022 located in United States -> `country_locked` at `geoGate` Step 4 AND `STALE` at freshness -> public count stays strictly 0. | Employer confidence is decoupled from `geoGate`. Pineapple Staffing continues to produce 0 public rows because its location is US and its dates are stale. |

---

## 6. Consolidation Specifications for the Worker

The following actionable code specifications are formulated for the Worker agent to implement:

### Spec 1: Consolidate `packages/scraper/geoGate.ts`
1. **Import/Define `LOCAL_OR_NON_ENGLISH_REGEX`**:
   Add `LOCAL_OR_NON_ENGLISH_REGEX` to `geoGate.ts`.
2. **Insert Step 2b (Domestic market markers)**:
   Right after Step 2 (`detectDominantLanguage`), check:
   ```ts
   if (LOCAL_OR_NON_ENGLISH_REGEX.test(titleAndDesc)) {
     const marker = firstMatch(LOCAL_OR_NON_ENGLISH_REGEX, titleAndDesc);
     return verdict("country_locked", "ineligible", `Domestic market marker: "${marker}"`);
   }
   ```
3. **Unify Location Pin Inspection**:
   Extract `detectStructuredLocationPin(locationRaw: string): GeoVerdict | null`.
   Check `AMBIGUOUS_STATE_WORDS` on `US_STATE_CODE_LOCATION_REGEX` in `locationRaw`.
   Reuse in `structuredLocationPin(locationRaw)` and Step 4.

### Spec 2: Cleanse `packages/scraper/triage.ts`
1. **Remove Timezone Keywords from `GEOGRAPHIC_EXCLUSION_REGEX`**:
   Remove `"us timezone only"`, `"est only"`, `"pst only"`, `"mst only"`, `"cst only"`.
2. **Fix AI Provider Bypass**:
   Change line 374:
   ```ts
   const geminiKey = env?.GEMINI_API_KEY;
   const groqKey = env?.GROQ_API_KEY;
   if (!env?.AI && !geminiKey && !groqKey) { ... }
   ```
   Ensuring Gemini and Groq can execute even when `env.AI` is undefined.
3. **Consolidate Fallback Categorizer**:
   Replace lines 380-421 with:
   ```ts
   const category = categorizeOpportunityTitle(title, cleanDescription);
   ```

### Spec 3: Streamline `packages/scraper/triage-decision.ts`
1. Ensure `structuredGeo` items bypass model eligibility veto and use clean evidence strings.
2. Ensure `deterministicReject` only rejects on genuine residency/citizenship prohibitions, not timezone overlap.

### Spec 4: Optimize `apps/web/src/pages/api/cron/scrape.ts`
1. In `drainPendingTriageQueue`:
   Replace:
   ```ts
   if (hasExplicitNonRemoteLocationType(item.locationType)) { ... }
   ```
   with:
   ```ts
   if (gate.phEligibility === "ineligible") { ... }
   ```
2. In `triagedItems.push` (lines 3018-3043):
   Include:
   ```ts
   clientTimezone: triage.clientTimezone ?? (item as any).clientTimezone ?? null,
   ```

---
*Analysis concluded. Findings and specifications ready for handoff to Worker.*
