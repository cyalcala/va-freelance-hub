# High-Confidence Trusted PH Employer Evidence & Dayshift Coverage Analysis

**Author**: teamwork_preview_explorer (Explorer 2)  
**Assigned Directory**: `c:\Users\admin\Desktop\va-freelance-hub\.agents\teamwork\explorer_gen8_2`  
**Parent Orchestrator**: `c26c4203-90a4-409b-bdac-08147628927d`  
**Milestone**: Gen8 Architecture & Evidence-Backed Expansion Design  
**Date**: 2026-10-14  

---

## 1. Executive Summary & Objective Boundary

This investigation formalizes a principled, verifiable **Employer-Level Evidence Model** and an evidence-backed **Dayshift & Working-Hour Classification Model** for VA Freelance Hub. The overarching goal is to safely scale toward **100–150+ newly published verified Philippines-eligible remote jobs per day** by ensuring that legitimate remote employers verifiably hiring Filipinos (especially vetted VA companies and dayshift employers) consistently surface their openings.

### Core Architectural Mandates
1. **Separation of Concerns**:
   $$\text{Employer PH Confidence} \neq \text{Job Validity} \neq \text{PH Eligibility} \neq \text{Role Relevance}$$
   Under no circumstances may an employer-level label bypass vacancy-level geographic gates (`geoGate`), workplace-type verification (`isRemote`), or temporal freshness (`assessPostingFreshness` within $\le 30$ days).
2. **No Reckless Global Allowlist**:
   Employer trust represents evidence that an *organization* recruits Filipino professionals. It does not certify that any individual vacancy is open, active, remote, or open to Philippine residents.
3. **No Fabricated Schedule Claims**:
   Dayshift status must be grounded in explicit, auditable evidence (explicit phrasing, verified time ranges, or structured APAC/AU/NZ timezone business hours). Ambiguous or unstated schedules must remain `unknown`.
4. **Boundary Validation**:
   Design adheres to `.agents/skills/api-and-interface-design/SKILL.md`: contract-first typing, discriminated unions for state variants, validation at system boundaries, and additive, backward-compatible schemas.

---

## 2. Codebase Audit: Existing Employer Handling & Triage

A forensic audit of the repository reveals the current architectural touchpoints, strengths, and bottlenecks:

### 2.1 The Company Directory (`va_directory` Table)
In `packages/db/schema.ts` (lines 96–136):
- **Current Columns**:
  - `company_name`: Text, indexed (`companyNameIdx`).
  - `website`: Text, with link health tracking (`linkStatus`, `linkCheckedAt`, `linkFailCount`) and provenance (`websiteSource`, `websiteEvidence`).
  - `hires_filipinos`: Boolean flag, defaults to `true`.
  - `niche`: Enum (`'australian-dayshift'`, `'global-va'`, `'bpo'`, `'job-boards'`, `'ecommerce'`, `'tech'`).
  - `is_dayshift`: Boolean flag, defaults to `false`.
  - `is_verified`: Boolean flag, defaults to `false`.
  - `is_remote`: Boolean flag, defaults to `true`.
  - `ats_platform` & `ats_token`: Lever, Greenhouse, Workable, Breezy, Ashby.
- **Architectural Gaps Identified**:
  - The flags `is_dayshift`, `is_verified`, and `hires_filipinos` are coarse booleans without structured, machine-verifiable evidence chains (e.g. SEC registration, verified local entity, verified careers URL, specific past verified postings).
  - The directory is isolated from the `opportunities` table: there is no foreign key or structured join. Jobs reference employers only via loose string `company` or composite `source_id` (e.g. `workable:hunt-st`).
  - Directory verification timestamp (`verifiedAt`) was historically overloaded as an ingestion clock. (Fixed in recent commits, but proves the risk of semantic coupling).

### 2.2 Scraper Ingestion & Triage Pipeline (`scrape.ts`)
In `apps/web/src/pages/api/cron/scrape.ts`:
- **ATS Ingestion**:
  - `atsAgencies` are loaded from `va_directory` (bounded by `ATS_AGENCIES_MAX = 200`) and merged with graduated production ATS sources via `mergeRegistryAtsSources`.
  - Workable rotation selects 2 tenants per run with a 60-minute cooldown via `selectWorkableRotation`.
  - Scraped vacancies are normalized, URL-deduped via `omitKnownSourceUrls`, and bounded by `selectIntakeBatch` (cap 50–100).
- **Triage and Qualification Sequence**:
  1. `geoGate`: Evaluates title, description, and structured `locationRaw`. Disqualifies explicit non-remote workplace types, country locks, and residence restrictions.
  2. `assessPostingFreshness`: Enforces strict $\le 30$-day calendar window from observed run instant.
  3. `decideTriage`: AI model ladder with consensus skeptic for `unknown` gates.
- **Critical Ingestion Omission Found**:
  - While `packages/scraper/triage.ts` explicitly extracts `clientTimezone: string | null` (line 7, line 194, line 471), **`scrape.ts` omits `clientTimezone` when constructing `triagedItems.push` (line 3018–3043) and in `snapshotPublicationUpdate` (line 513–531)!**
  - As a result, the `client_timezone` column in D1 `opportunities` is virtually 100% `NULL` in production, starving downstream shift classification of structured timezone hints.

### 2.3 Shift Classification (`packages/scraper/shiftClassifier.ts`)
In `packages/scraper/shiftClassifier.ts` (lines 18–35):
- Evaluates `title`, `description`, and `clientTimezone`.
- Current regex markers:
  - `day_shift`: `/\b(day[- ]?shift|australian (?:business )?hours|philippine (?:business )?hours)\b/i`
  - `mid_shift`: `/\b(mid[- ]?shift|uk (?:business )?hours|european (?:business )?hours)\b/i`
  - `night_shift`: `/\b(night[- ]?shift|graveyard(?: shift)?|us (?:eastern |pacific )?(?:business )?hours)\b/i`
  - `flexible`: `/\b(async(?:hronous)?|work whenever|flexible (?:hours|schedule|working hours)|any timezone|set your own hours|work on your own time)\b/i`
- Returns: `category`, `clientTimezone`, `phWorkingHours: null`, `isAsyncOrFlexible`, and `evidence`.
- **Strengths**: Strict against false positives (e.g. `clientTimezone: "AEST"` alone without schedule context returns `unknown`; "PST" deadline returns `unknown`).
- **Gaps**:
  - Fails to recognize explicit Philippine business hour spans (e.g., `"8am - 5pm PHT"`, `"7:00 AM - 4:00 PM Manila"`).
  - Fails to recognize common APAC schedule terms (e.g., `"AU business hours"`, `"NZST hours"`, `"AEST daytime"`, `"APAC daytime"`).
  - Does not support job-board level filtering (no shift filter on `/opportunities`).

### 2.4 Presentation Layer & Ad-Hoc Heuristics
In `apps/web/src/lib/public-board.ts` (lines 98–104) and `homepage-data.ts` (line 86):
- `isFeaturedAgencyJob(job: PublicJob)` hardcodes six strings in `FEATURED_PLATFORMS`:
  `{"20Four7VA", "Sourcefit", "Yokly", "VALUE Virtual Assistants", "Remote Craft", "MultiplyMii"}`
  plus any `sourceId` starting with `breezy:`, `workable:`, or `ashby:`.
- **Architectural Flaw**:
  - A generic Workable or Breezy source that is NOT a Filipino-focused agency (e.g. Pineapple Staffing or an overseas SaaS firm) is indiscriminately categorized as a "featured agency".
  - A legitimate, vetted Philippine employer fetched via static RSS (such as `hammerjack`) is excluded because its `sourceId` is `"hammerjack"` and its platform is `"Teamtailor"`.
  - There is currently no unified, evidence-based mechanism to determine whether an employer is a trusted PH employer.

---

## 3. Strict 4-Way Separation of Concerns

To guarantee that pipeline optimizations never regress into a reckless allowlist, all qualification decisions must be modeled as a Cartesian evaluation across four independent dimensions:

```
+---------------------------------------------------------------------------------------------------+
|                                 VACANCY EVALUATION MATRIX                                         |
+--------------------------+-----------------------+-----------------------+------------------------+
| 1. Employer PH           | 2. Job Validity       | 3. PH Eligibility     | 4. Role Relevance      |
|    Confidence            |                       |    (geoGate)          |                        |
+--------------------------+-----------------------+-----------------------+------------------------+
| Does the company         | Is the posting alive, | Is THIS SPECIFIC      | Is the position        |
| systematically recruit   | authentic, fresh      | opening fully remote  | suited for freelancers |
| Filipino talent?         | (<=30d), and non-     | and open to workers   | and VAs (admin, tech,  |
|                          | duplicate?            | in the Philippines?   | creative, support)?    |
|                          |                       |                       |                        |
| Evidence: SEC filing,    | Evidence: HTTP 200,   | Evidence: geoScope in | Evidence: Title, tags, |
| local entity, ATS PH     | posting date within   | {ph_only,             | category, description  |
| presets, hiring history  | window, valid URL     |  apac_incl_ph,        | tasks                  |
|                          |                       |  worldwide},          |                        |
|                          |                       | locationType="remote" |                        |
+--------------------------+-----------------------+-----------------------+------------------------+
```

### 3.1 The Production Counterexamples

The necessity of this 4-way separation is demonstrated by five concrete production counterexamples:

1. **Pineapple Staffing** (`workable:pineapple-staffing`):
   - *Employer PH Confidence*: High (Filipino VA staffing firm).
   - *Role Relevance*: High (Virtual Assistant).
   - *Job Validity*: **FAILED** (Postings from 2020–2022; stale by >2 years).
   - *PH Eligibility*: **FAILED** (Direct job location is United States telecommuting only).
   - *Result*: **Zero published**. An employer allowlist would erroneously publish stale US jobs.
2. **Affordable Staff** (`exp:affordablestaff` / Directory ID 242):
   - *Employer PH Confidence*: High (Longstanding PH VA provider for Australian clients).
   - *Job Validity*: Active openings exist on Pathcutters portal.
   - *PH Eligibility*: **FAILED for Remote** (Company FAQ explicitly mandates working from the Bacolod physical office; zero work-from-home permitted).
   - *Result*: **Ineligible for Remote Job Board**. Company-level `is_remote=true` cannot override vacancy workplace constraints.
3. **Hammerjack** (Directory ID 431 / static source `hammerjack`):
   - *Employer PH Confidence*: High (BPO/staffing entity in Clark and Manila).
   - *Mixed Workplace Reality*: Feeds contain fully remote, hybrid, and onsite accounting roles.
   - *Result*: Vacancies with `remoteStatus: fully` pass `geoGate`; vacancies with `hybrid` or `onsite` are strictly filtered out.
4. **RocketAMS** (`workable:rocketams`):
   - *Openings Comparison*:
     - "Performance Marketer, Japan": Stated location Japan. `geoGate` returns `country_locked` (`ineligible`).
     - "Day Shift, Remote (PH)": Stated location Philippines. `geoGate` returns `ph_only` (`eligible_verified`).
   - *Result*: Selective qualification per vacancy, never at employer level.
5. **Coconut VA** (`workable:coconutva`):
   - "International Talent Pool" has scalar country `United States` with hidden secondary location `Philippines`.
   - *Result*: Fails closed on scalar country lock. Hidden secondary locations do not override primary location locks.

---

## 4. Principled Employer Evidence Model Specification

Rather than a binary boolean (`hires_filipinos = 1`), employer trust must be structured as an auditable evidence chain.

### 4.1 Evidence Hierarchy (Levels 1 to 5)

| Tier / Level | Category | Verification Source | Weight | Failure / Invalidation Condition |
| :--- | :--- | :--- | :---: | :--- |
| **Level 1** | **PH Legal Entity & Local Operations** | SEC registration, PEZA accreditation, physical registered office in PH (e.g. BGC, Ortigas, Cebu, Bacolod, Clark). | $\mathbf{1.0}$ | Entity dissolution, unresolved labour sanctions, domain expiration. |
| **Level 2** | **Explicit PH Hiring Mandate** | Official careers portal / FAQ states explicit mission to hire Filipino talent; `.ph` corporate domain; dedicated PH onboarding flow. | $\mathbf{0.85}$ | Revision of terms, migration to local overseas hiring only. |
| **Level 3** | **Structured ATS Infrastructure** | Verified ATS tenant (Workable, Ashby, Breezy, Greenhouse, Lever) featuring permanent `"Philippines"` or `"Remote - Philippines"` location presets. | $\mathbf{0.75}$ | Tenant deletion, token reassignment, transition to US-only requisitions. |
| **Level 4** | **Empirical Ingestion History** | $\ge 5$ distinct, verified Philippines-eligible vacancies passing strict `geoGate` and published across $\ge 30$ days. | $\mathbf{0.60}$ | Influx of country-locked foreign roles, 3 consecutive scraping cycles with zero valid PH roles. |
| **Level 5** | **Curated Directory Provenance** | Manually audited entry in `va_directory` with `website_source` in `('curated', 'manual')`, active hiring page URL, and `link_status = 'ok'`. | $\mathbf{0.50}$ | 3 consecutive HTTP failures (`link_fail_count >= 3`). |
| **Disqualified** | **Office-Only / Excluded** | Explicit non-remote policy (e.g. Affordable Staff Bacolod), anti-automation robots block, or recruiter spam. | $\mathbf{0.0}$ | Direct rejection at source/qualification layer. |

### 4.2 TypeScript Interface Contract (`packages/db` / `packages/scraper`)

Following `api-and-interface-design` principles:

```typescript
export type EmployerEvidenceLevel =
  | "ph_legal_entity"
  | "explicit_ph_mandate"
  | "ats_ph_infrastructure"
  | "empirical_hiring_history"
  | "curated_directory_provenance";

export type EmployerTrustTier =
  | "tier_a_verified"    // Level 1 or Level 2, or Level 3 with empirical history
  | "tier_b_established" // Level 4 or Level 5
  | "tier_c_casual"      // Occasional worldwide poster
  | "disqualified";      // Office-only, anti-automation, or revoked

export interface EmployerEvidenceRecord {
  level: EmployerEvidenceLevel;
  sourceUrl: string;
  evidenceSnippet: string;
  verifiedAt: string;     // ISO UTC
  expiresAt: string;      // ISO UTC (evidence lease)
  verifier: string;       // e.g. "manual:admin", "prospector:v2", "sec:ph"
}

export interface EmployerTrustProfile {
  companyName: string;
  normalizedName: string; // NFKC normalized, lowercase
  canonicalDomain: string | null;
  trustTier: EmployerTrustTier;
  confidenceScore: number; // 0.0 to 1.0
  evidence: EmployerEvidenceRecord[];
  isDayshiftSpecialist: boolean; // Proven Australian/APAC daytime focus
  officeLocations: string[];     // e.g. ["Bacolod", "Manila", "Clark"]
  workplacePolicy: "remote_only" | "remote_first" | "hybrid" | "office_only";
  notes: string | null;
  updatedAt: string;
}
```

### 4.3 Database Schema Migration (`packages/db/schema.ts`)

To implement this without breaking existing migrations or D1 bindings, add an additive table `employer_evidence_ledger` and enrich `va_directory`:

```typescript
export const employerEvidenceLedger = sqliteTable("employer_evidence_ledger", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  directoryId: integer("directory_id").references(() => vaDirectory.id),
  companyName: text("company_name").notNull(),
  normalizedName: text("normalized_name").notNull(),
  evidenceLevel: text("evidence_level", {
    enum: [
      "ph_legal_entity",
      "explicit_ph_mandate",
      "ats_ph_infrastructure",
      "empirical_hiring_history",
      "curated_directory_provenance",
    ],
  }).notNull(),
  sourceUrl: text("source_url").notNull(),
  evidenceSnippet: text("evidence_snippet").notNull(),
  confidenceScore: integer("confidence_score").notNull().default(50), // 0-100
  trustTier: text("trust_tier", {
    enum: ["tier_a_verified", "tier_b_established", "tier_c_casual", "disqualified"],
  }).notNull().default("tier_c_casual"),
  isDayshiftBiased: integer("is_dayshift_biased", { mode: "boolean" }).notNull().default(false),
  workplacePolicy: text("workplace_policy", {
    enum: ["remote_only", "remote_first", "hybrid", "office_only"],
  }).notNull().default("remote_first"),
  recordedAt: text("recorded_at").notNull().default(sql`(datetime('now'))`),
  leaseExpiresAt: text("lease_expires_at"),
}, (table) => ({
  normalizedIdx: index("employer_evidence_normalized_idx").on(table.normalizedName),
  tierIdx: index("employer_evidence_tier_idx").on(table.trustTier),
}));
```

---

## 5. Dayshift & Working-Hour Classification Model

Filipino freelancers heavily value Australian and Asian business hours because working during local daylight (7:00 AM – 5:00 PM PHT) avoids the physical and psychological toll of nighttime graveyard shifts (US Eastern/Pacific hours).

### 5.1 Astronomical & Timezone Truth Matrix
Philippine Standard Time is fixed at **UTC+8** (no daylight saving time).

$$\begin{array}{|l|c|c|c|c|}
\hline
\textbf{Target Region} & \textbf{Timezone} & \textbf{Standard Local Hours} & \textbf{Equivalent Manila (PHT) Hours} & \textbf{Shift Classification} \\
\hline
\text{Philippines (Domestic)} & \text{PHT (UTC+8)} & \text{08:00 – 17:00} & \text{08:00 – 17:00} & \textbf{Day Shift (100\% daylight)} \\
\text{Western Australia} & \text{AWST (UTC+8)} & \text{09:00 – 17:00} & \text{09:00 – 17:00} & \textbf{Day Shift (Identical)} \\
\text{Eastern Australia (Std)} & \text{AEST (UTC+10)} & \text{09:00 – 17:00} & \text{07:00 – 15:00} & \textbf{Day Shift (Morning daylight)} \\
\text{Eastern Australia (DST)} & \text{AEDT (UTC+11)} & \text{09:00 – 17:00} & \text{06:00 – 14:00} & \textbf{Day Shift (Early morning)} \\
\text{New Zealand} & \text{NZST (UTC+12)} & \text{09:00 – 17:00} & \text{05:00 – 13:00} & \textbf{Day Shift (Early morning)} \\
\text{Singapore / HK / Malaysia} & \text{SGT/HKT (UTC+8)} & \text{09:00 – 18:00} & \text{09:00 – 18:00} & \textbf{Day Shift (Identical)} \\
\text{Japan / Korea} & \text{JST/KST (UTC+9)} & \text{09:00 – 18:00} & \text{08:00 – 17:00} & \textbf{Day Shift (Identical)} \\
\hline
\text{United Kingdom} & \text{GMT/BST (UTC+0/+1)} & \text{09:00 – 17:00} & \text{17:00 – 01:00} & \textbf{Mid Shift (Twilight / Evening)} \\
\text{Central Europe} & \text{CET/CEST (UTC+1/+2)} & \text{09:00 – 17:00} & \text{16:00 – 00:00} & \textbf{Mid Shift (Afternoon / Evening)} \\
\hline
\text{US Eastern} & \text{EST/EDT (UTC-5/-4)} & \text{09:00 – 17:00} & \text{22:00 – 06:00} & \textbf{Night Shift (Graveyard)} \\
\text{US Pacific} & \text{PST/PDT (UTC-8/-7)} & \text{09:00 – 17:00} & \text{01:00 – 09:00} & \textbf{Night Shift (Graveyard)} \\
\hline
\end{array}$$

### 5.2 Reliable Evidence Taxonomy

To prevent fabricating schedule claims, we define four explicit certainty levels:

1. **`explicit_day_shift` (Certainty: High)**:
   - Explicit phrase in Title or Description: `"day shift"`, `"dayshift"`, `"day-shift"`, `"morning shift"`.
   - Explicit region/business hour alignment: `"Australian business hours"`, `"AU business hours"`, `"AEST hours"`, `"AEDT hours"`, `"Philippine business hours"`, `"Manila business hours"`, `"PHT daytime"`, `"APAC hours"`.
   - Explicit PHT time spans: e.g. `"7:00 AM - 4:00 PM PHT"`, `"8am to 5pm Manila"`, `"9am - 6pm GMT+8"`.
2. **`apac_timezone_aligned` (Certainty: Structured)**:
   - `clientTimezone` is explicitly present in the source metadata as an APAC/AU/NZ timezone:
     `{"AEST", "AEDT", "AWST", "ACST", "ACDT", "NZST", "NZDT", "GMT+8", "GMT+9", "GMT+10", "GMT+11", "GMT+12", "UTC+8", "UTC+9", "UTC+10", "UTC+11", "UTC+12", "PHT", "SGT", "JST", "KST"}`
     AND text indicates regular business hours (without claiming a night shift).
3. **`flexible_async` (Certainty: High)**:
   - Text explicitly indicates: `"flexible schedule"`, `"flexible working hours"`, `"work whenever you want"`, `"asynchronous"`, `"async team"`, `"any timezone"`, `"set your own hours"`.
4. **`unknown` (Default / Fail Safe)**:
   - If the description merely mentions an overseas client or city without specifying working hours (e.g., `"Australian client seeking bookkeeper"`, `"Sydney headquarters"`, `"PST deadline"`), the classification **must strictly remain `unknown`**.

### 5.3 Enhanced `classifyShift` Algorithm

Refactoring `packages/scraper/shiftClassifier.ts`:

```typescript
export type ShiftCategory =
  | "day_shift"
  | "mid_shift"
  | "night_shift"
  | "flexible"
  | "unknown";

export type ScheduleCertainty = "explicit" | "inferred_timezone" | "unstated";

export interface EnhancedShiftInfo {
  category: ShiftCategory;
  certainty: ScheduleCertainty;
  clientTimezone: string | null;
  phWorkingHours: string | null;
  isAsyncOrFlexible: boolean;
  evidence: string;
}

// 1. Explicit Schedule Phrases
const EXPLICIT_DAY_SHIFT =
  /\b(?:day[- ]?shift|australian (?:business )?hours|philippine (?:business )?hours|ph (?:business )?hours|pht (?:business )?hours|manila (?:business )?hours|au(?:stralian)? (?:shift|hours)|nz(?:st)? (?:business )?hours|morning shift|apac (?:business )?hours|asia[- ]pacific hours)\b/i;

const EXPLICIT_MID_SHIFT =
  /\b(?:mid[- ]?shift|uk (?:business )?hours|european (?:business )?hours|london hours|cet hours|bst hours)\b/i;

const EXPLICIT_NIGHT_SHIFT =
  /\b(?:night[- ]?shift|graveyard(?: shift)?|us (?:eastern |pacific |central )?(?:business )?hours|est hours|pst hours|cst hours)\b/i;

const FLEXIBLE_SCHEDULE =
  /\b(?:async(?:hronous)?|work whenever|flexible (?:hours|schedule|working hours)|any timezone|set your own hours|work on your own time)\b/i;

// 2. Explicit PHT / Manila daytime hour spans
const PHT_DAYTIME_SPAN =
  /\b(?:0?[6-9]|10)(?::[0-5][0-9])?\s*(?:am)?\s*[-–—to]+\s*(?:0?[2-6]|14|15|16|17|18)(?::[0-5][0-9])?\s*(?:pm)?\s*(?:pht|ph time|manila time|gmt\+8|utc\+8)\b/i;

// 3. Structured APAC / AU / NZ Timezones
const APAC_AU_NZ_TIMEZONES = new Set([
  "AEST", "AEDT", "AWST", "ACST", "ACDT",
  "NZST", "NZDT", "PHT", "SGT", "JST", "KST",
  "GMT+8", "GMT+9", "GMT+10", "GMT+11", "GMT+12",
  "UTC+8", "UTC+9", "UTC+10", "UTC+11", "UTC+12",
  "AUSTRALIA/SYDNEY", "AUSTRALIA/MELBOURNE", "AUSTRALIA/PERTH", "AUSTRALIA/BRISBANE",
]);

export function classifyShift(input: ShiftClassifierInput): EnhancedShiftInfo {
  const timezone = input.clientTimezone?.trim().toUpperCase() || null;
  const title = input.title || "";
  const desc = input.description || "";
  const text = `${title}. ${desc}`;

  // Negation check: e.g. "no night shift", "without fixed hours"
  const negated = /\b(?:no|not|without)\b[^.!?\n]{0,40}\b(?:shift|hours|async|flexible)\b/i.test(text);

  // Check for conflicting indicators
  const hasDay = EXPLICIT_DAY_SHIFT.test(text) || PHT_DAYTIME_SPAN.test(text);
  const hasMid = EXPLICIT_MID_SHIFT.test(text);
  const hasNight = EXPLICIT_NIGHT_SHIFT.test(text);
  const isFlexible = !negated && FLEXIBLE_SCHEDULE.test(text);

  const matchedCount = (hasDay ? 1 : 0) + (hasMid ? 1 : 0) + (hasNight ? 1 : 0);

  if (negated || matchedCount > 1) {
    return {
      category: isFlexible ? "flexible" : "unknown",
      certainty: isFlexible ? "explicit" : "unstated",
      clientTimezone: timezone,
      phWorkingHours: null,
      isAsyncOrFlexible: isFlexible,
      evidence: "Schedule is unstated, negated, or conflicting",
    };
  }

  if (hasDay) {
    const timeSpanMatch = text.match(PHT_DAYTIME_SPAN);
    return {
      category: "day_shift",
      certainty: "explicit",
      clientTimezone: timezone,
      phWorkingHours: timeSpanMatch ? timeSpanMatch[0] : null,
      isAsyncOrFlexible: false,
      evidence: "Source states explicit day shift / daytime working hours",
    };
  }

  if (hasMid) {
    return {
      category: "mid_shift",
      certainty: "explicit",
      clientTimezone: timezone,
      phWorkingHours: null,
      isAsyncOrFlexible: false,
      evidence: "Source states UK/European mid-shift hours",
    };
  }

  if (hasNight) {
    return {
      category: "night_shift",
      certainty: "explicit",
      clientTimezone: timezone,
      phWorkingHours: null,
      isAsyncOrFlexible: false,
      evidence: "Source states US graveyard / night-shift hours",
    };
  }

  if (isFlexible) {
    return {
      category: "flexible",
      certainty: "explicit",
      clientTimezone: timezone,
      phWorkingHours: null,
      isAsyncOrFlexible: true,
      evidence: "Source states flexible or asynchronous schedule",
    };
  }

  // Structured timezone fallback (without fabricating explicit shift)
  if (timezone && APAC_AU_NZ_TIMEZONES.has(timezone)) {
    return {
      category: "day_shift",
      certainty: "inferred_timezone",
      clientTimezone: timezone,
      phWorkingHours: null,
      isAsyncOrFlexible: false,
      evidence: `Client timezone is ${timezone} (APAC/AU/NZ daylight alignment)`,
    };
  }

  return {
    category: "unknown",
    certainty: "unstated",
    clientTimezone: timezone,
    phWorkingHours: null,
    isAsyncOrFlexible: false,
    evidence: "Working schedule is unstated",
  };
}
```

---

## 6. Pipeline Integration Architecture

How the employer evidence model and dayshift classification plug cleanly into every stage of the ingestion and serving pipeline:

```
[ Authoritative ATS / Feeds ]
           |
           v
[ 1. Discovery & Fetch ] --------> Populate sourceId ("workable:hunt-st")
           |                       Retain original clientTimezone
           v
[ 2. Normalization & Dedup ] ----> Normalize URLs & omitKnownSourceUrls
           |
           v
[ 3. Vacancy geoGate (L1) ] -----> STRICT & INDEPENDENT: Evaluates workplace type,
           |                       title pins, structured locationRaw.
           |                       *Employer Trust CANNOT override geoGate*
           v
[ 4. Freshness Gate (L2) ] ------> STRICT & INDEPENDENT: assessPostingFreshness (<= 30d)
           |                       *Employer Trust CANNOT override freshness*
           v
[ 5. Triage / Ambiguity (L3) ] --> IF geoGate == "unknown":
           |                       Tier A Employer Evidence informs positive resolution
           |                       IF geoGate is country_locked: FAILS CLOSED regardless
           v
[ 6. D1 Persistence ] -----------> Write opportunities with:
           |                       - clientTimezone: triage.clientTimezone (FIX OMISSION)
           |                       - shiftCategory: classifyShift().category
           v
[ 7. Public Snapshot & Board ] --> PublicJob includes:
           |                       - shiftCategory, isDayshift, employerTrustTier
           v
[ 8. UI / Search & Filtering ] --> - /opportunities?shift=day_shift
                                   - /opportunities?employerTrust=verified
                                   - Visual badges: "☀️ Day Shift", "✓ Vetted PH Employer"
```

### 6.1 Ingestion Fix: Preserving `clientTimezone`
In `apps/web/src/pages/api/cron/scrape.ts`:
- Modify `triagedItems.push` (lines 3018–3043) to include:
  ```typescript
  clientTimezone: triage.clientTimezone ?? (item as any).clientTimezone ?? null,
  ```
- Modify `snapshotPublicationUpdate` (lines 513–531) to include:
  ```typescript
  clientTimezone: triage.clientTimezone ?? item.clientTimezone ?? null,
  ```
This immediately rectifies the 100% missing `client_timezone` data loss.

### 6.2 Public Serving Snapshot Integration
In `apps/web/src/lib/public-serving-snapshot.ts`:
- The SQL query `opportunitySnapshotQuery()` already selects `client_timezone AS clientTimezone`.
- In `public-board.ts`, add to `PublicJob`:
  ```typescript
  shiftCategory: "day_shift" | "mid_shift" | "night_shift" | "flexible" | "unknown";
  isDayshift: boolean;
  isTrustedEmployer: boolean;
  ```
- When `loadPublicBoard` processes raw rows into `PublicJob`, derive:
  ```typescript
  const shift = classifyShift({ clientTimezone: row.clientTimezone, title: row.title, description: row.description });
  const isDayshift = shift.category === "day_shift";
  ```
- This enables instant in-memory filtering for the 1,700 cached jobs with zero latency penalty and zero D1 schema breakage.

### 6.3 UI & Search Filtering Surface
1. **`/opportunities` Filter Bar**:
   - Add a "Schedule" filter dropdown / pill:
     - `All Schedules`
     - `☀️ Day shift (AU / APAC / PH)` (`shift=day_shift`)
     - `⚡ Flexible / Async` (`shift=flexible`)
     - `🌙 Night shift (US hours)` (`shift=night_shift`)
   - Add "Employer Trust" filter pill:
     - `Vetted PH Employers Only` (`vetted=true`)
2. **`OpportunityCard` Visual Badging**:
   - For `isDayshift === true`: Display compact badge `☀️ Day shift`.
   - For `isTrustedEmployer === true`: Display badge `✓ Vetted Employer` next to company initials.

---

## 7. Testing & Verification Requirements

To ensure zero regression against verified invariants and `astra777.txt`:

### 7.1 Adversarial Test Suite Requirements
1. **Anti-Allowlist Proof**:
   - Test that `workable:pineapple-staffing` US roles remain strictly `ineligible` and `country_locked` despite company being in `va_directory`.
   - Test that `Affordable Staff` Bacolod office roles fail remote validation and stay unpublishable.
   - Test that `Hammerjack` hybrid and onsite vacancies stay unpublishable, while fully remote vacancies pass.
2. **Dayshift Precision Proof**:
   - Test `"AU Accountant/Bookkeeper - Day Shift (026-983)"` -> `category: "day_shift"`.
   - Test `"Customer Service - 8:00 AM to 5:00 PM Manila Time"` -> `category: "day_shift"`, `phWorkingHours: "8:00 AM to 5:00 PM Manila Time"`.
   - Test `clientTimezone: "AEST"` with generic description -> `category: "day_shift"`, `certainty: "inferred_timezone"`.
   - Test `"Australian client in Sydney"` with NO schedule text -> `category: "unknown"`.
   - Test `"Apply before 5:00 PM PST"` -> `category: "unknown"`.
   - Test `"CT Scan Specialist"` -> `category: "unknown"`.
   - Test `"Day shift or night shift depending on project"` -> `category: "unknown"`.
3. **Data Preservation Proof**:
   - Test that `triage.clientTimezone` is persisted into `opportunities.client_timezone`.
   - Test that snapshot generation correctly projects `clientTimezone` and `shiftCategory` into `PublicJob`.

---

## 8. Summary of Proposed Artifacts & Targets

| Target File | Scope of Proposed Change | Risk Tier |
| :--- | :--- | :---: |
| `packages/scraper/shiftClassifier.ts` | Expand regex for explicit PHT/AU/APAC hours; add `certainty` enum; support APAC timezones | Low (Pure function) |
| `packages/scraper/shiftClassifier.test.ts` | Add 15+ adversarial test cases covering PHT spans, AU/NZ hours, false triggers | Low (Test only) |
| `apps/web/src/pages/api/cron/scrape.ts` | Pass `clientTimezone` from triage into D1 insert and snapshot update | Low (Bug fix) |
| `apps/web/src/lib/public-board.ts` | Add `shiftCategory`, `isDayshift`, and `isTrustedEmployer` to `PublicJob`; update `slicePublicJobs` | Low (Additive) |
| `apps/web/src/pages/opportunities.astro` | Expose `shift` query filter; wire into `slicePublicJobs` | Medium (UI filter) |
| `apps/web/src/components/opportunity-card.tsx` | Render `☀️ Day shift` and `✓ Vetted Employer` badges | Low (Additive UI) |
| `packages/db/schema.ts` | Add `employerEvidenceLedger` table (additive, optional Phase 2) | Medium (Schema) |

---
