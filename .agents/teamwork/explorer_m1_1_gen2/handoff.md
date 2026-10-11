# Investigation Report: Date Parsing, Calendar Validation, and Freshness Evaluation

## 1. Observation

### 1.1 Codebase Inspection

#### A. `packages/scraper/source-posting-date.ts`
- **Lines 3–9**: Regular expressions and constants:
  ```ts
  const ISO_POSTING_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/i;
  const RSS_POSTING_DATE = /^(?:(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),\s*)?(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?\s+(UT|UTC|GMT|EST|EDT|CST|CDT|MST|MDT|PST|PDT|[+-]\d{2}:?\d{2})$/i;
  const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const RSS_ZONE_MINUTES: Readonly<Record<string, number>> = {
    UT: 0, UTC: 0, GMT: 0, EST: -300, EDT: -240, CST: -360,
    CDT: -300, MST: -420, MDT: -360, PST: -480, PDT: -420,
  };
  ```
- **Lines 16–26**: ISO 8601 parsing branch:
  ```ts
  export function normalizeSourcePostingDate(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const raw = value.trim();
    if (ISO_POSTING_DATE.test(raw)) {
      const original = raw.replace("t", "T").replace(/z$/, "Z");
      if (!isAdmissionInstant(`${original.slice(0, 19)}.000Z`)) return null;
      const millis = Date.parse(original);
      if (!Number.isFinite(millis)) return null;
      const precision = (original.match(/\.(\d+)/)?.[1] ?? "").length;
      return precision > 3 ? original : new Date(millis).toISOString();
    }
  ```
- **Lines 27–46**: RFC 5322 (RSS) parsing branch:
  ```ts
    const fields = raw.match(RSS_POSTING_DATE);
    if (!fields) return null;
    const [, day, month, year, hour, minute, second = "00", zone] = fields;
    const monthNumber = String(MONTHS.indexOf(month.toLowerCase()) + 1).padStart(2, "0");
    const wall = `${year}-${monthNumber}-${day.padStart(2, "0")}T${hour}:${minute}:${second}.000Z`;
    if (!isAdmissionInstant(wall)) return null;
    let offset = RSS_ZONE_MINUTES[zone.toUpperCase()];
    if (offset === undefined) {
      const compact = zone.replace(":", "");
      const hours = Number(compact.slice(1, 3));
      const minutes = Number(compact.slice(3, 5));
      if (hours > 23 || minutes > 59) return null;
      offset = (compact[0] === "+" ? 1 : -1) * (hours * 60 + minutes);
    }
    const millis = Date.parse(raw);
    if (!Number.isFinite(millis) || millis + offset * 60_000 !== Date.parse(wall)) return null;
    return new Date(millis).toISOString();
  }
  ```

#### B. `packages/scraper/admission-evidence.ts`
- **Lines 140–144**: `isAdmissionInstant` definition:
  ```ts
  export function isAdmissionInstant(value: unknown): value is string {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return false;
    const date = new Date(value);
    return Number.isFinite(date.getTime()) && date.toISOString() === value;
  }
  ```

#### C. `packages/scraper/publication-freshness.ts`
- **Lines 10–11**: Constants:
  ```ts
  const MAX_POSTING_AGE_MS = 30 * 86_400_000;
  const ORIGINAL_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/;
  ```
- **Lines 13–34**: `assessPostingFreshness`:
  ```ts
  export function assessPostingFreshness(originalPostedAt: unknown, observedAt: string): PostingFreshnessAssessment {
    if (!isAdmissionInstant(observedAt)) return { state: "INVALID", postedAt: null };
    if (originalPostedAt == null || (typeof originalPostedAt === "string" && originalPostedAt.trim() === "")) {
      return { state: "UNKNOWN", postedAt: null };
    }
    if (typeof originalPostedAt !== "string" || !ORIGINAL_INSTANT.test(originalPostedAt)) {
      return { state: "INVALID", postedAt: null };
    }
    const wallClock = `${originalPostedAt.slice(0, 19)}.000Z`;
    if (!isAdmissionInstant(wallClock)) return { state: "INVALID", postedAt: null };
    const postedMs = Date.parse(originalPostedAt);
    if (!Number.isFinite(postedMs)) return { state: "INVALID", postedAt: null };
    const postedAt = new Date(postedMs).toISOString();
    const fraction = originalPostedAt.match(/\.(\d{1,9})/)?.[1] ?? "";
    const subMillisecondNs = BigInt(fraction.padEnd(9, "0").slice(3));
    const ageNs = BigInt(Date.parse(observedAt) - postedMs) * 1_000_000n - subMillisecondNs;
    return { state: ageNs < 0n ? "FUTURE" : ageNs > BigInt(MAX_POSTING_AGE_MS) * 1_000_000n ? "STALE" : "WITHIN_WINDOW", postedAt };
  }
  ```

#### D. Ingestion Pre-Persistence Gating in `apps/web/src/pages/api/cron/scrape.ts`
- **Lines 2795–2820**:
  ```ts
  const freshness = assessPostingFreshness(item.postedAt, observedAt);
  if (freshness.state !== "WITHIN_WINDOW") {
    postingFreshnessWithheld += 1;
    const cleanDesc = (item.description || "").slice(0, 1500);
    rejectedItems.push({
      ...item,
      isActive: false,
      inactiveReason: `posting-freshness-${freshness.state.toLowerCase()}`,
      category: "other",
      geoScope: gate.geoScope,
      phEligibility: gate.phEligibility,
      geoEvidence: gate.evidence,
      geoCheckedAt: observedAt,
      descriptionHash: await sha256Hex(item.title + cleanDesc),
      applicationUrl: sanitizeApplyUrlForSource(item.applicationUrl, item.sourceUrl) || item.sourceUrl,
      postedAt: freshness.postedAt,
      scrapedAt: observedAt,
      lastSeenInFeedAt: observedAt,
      updatedAt: observedAt,
    });
    continue;
  }
  gatePassedItems.push({ item, gate });
  ```

#### E. Post-Persistence Ownership in `packages/scraper/publication-gateway.ts`
- **Lines 419–420**:
  ```ts
  || typeof id !== "number" || !remaining.delete(id)
  || assessPostingFreshness(postedAt, now).state !== "WITHIN_WINDOW"
  ```

### 1.2 Automated Test Execution Results

1. `bun test packages/scraper/publication-freshness.test.ts packages/scraper/admission-evidence.test.ts apps/web/tests/native-fresh-scrape-posting-date.test.ts`
   - Result: **94 pass, 0 fail, 655 expect() calls, 3 files (84.04s)**
2. `bun test packages/scraper/publication-gateway.test.ts`
   - Result: **82 pass, 0 fail, 358 expect() calls, 1 file (795ms)**
3. `bun test packages/scraper/publication-gateway.integration.test.ts`
   - Result: **286 pass, 0 fail, 2676 expect() calls, 1 file (67.37s)**

---

## 2. Logic Chain

### 2.1 ISO 8601 vs RFC 5322 Parsing
1. **Observation**: In `source-posting-date.ts`, inputs are matched against `ISO_POSTING_DATE` or `RSS_POSTING_DATE`.
2. **Inference**:
   - **ISO 8601**: Standardizes lowercase delimiters (`replace("t", "T").replace(/z$/, "Z")`). Validates the unshifted wall-clock instant (`${original.slice(0, 19)}.000Z`) against `isAdmissionInstant`. Computes `millis = Date.parse(original)`. If precision exceeds 3 fractional digits (`precision > 3`), returns `original` directly to protect sub-millisecond precision. If precision $\le 3$, returns `new Date(millis).toISOString()`.
   - **RFC 5322**: Matches day, 3-letter month, 4-digit year, hour:minute:second, and zone (named or numeric `[+-]\d{2}:?\d{2}`). Maps named zones via `RSS_ZONE_MINUTES` and parses numeric offsets into minutes. Constructs local wall clock `wall = YYYY-MM-DDTHH:mm:ss.000Z` and verifies it with `isAdmissionInstant(wall)`. Finally checks the invariant `millis + offset * 60_000 === Date.parse(wall)`. If any check fails, returns `null`.

### 2.2 Rejection of Impossible Calendars Without Silent Rollover
1. **Observation**: Standard JavaScript `Date` parsing permissively rolls over invalid calendar days (`new Date("2026-09-31T12:00:00.000Z")` becomes `2026-10-01T12:00:00.000Z`; non-leap `2026-02-29` becomes `2026-03-01`; `24:01:00` becomes `00:01:00` next day).
2. **Inference**:
   - The round-trip check in `isAdmissionInstant` (`date.toISOString() === value`) defeats silent rollover: because `Date` rolls over the date, the output string differs from the input string, causing `isAdmissionInstant` to return `false`.
   - In `source-posting-date.ts`, the wall clock is extracted *prior* to timezone shifting and tested via `isAdmissionInstant`. Therefore, timezones cannot mask impossible dates (e.g., `2026-09-31T12:00:00+08:00` has wall clock `2026-09-31T12:00:00.000Z`, which fails `isAdmissionInstant` and returns `null`).
   - In `publication-freshness.ts`, `assessPostingFreshness` independently performs the exact same wall-clock slice and `isAdmissionInstant` check on `originalPostedAt`, establishing multi-layered defense-in-depth.

### 2.3 Handling of Sub-Millisecond Precision and Fractional Seconds
1. **Observation**: `ISO_POSTING_DATE` and `ORIGINAL_INSTANT` match fractional seconds up to 9 digits (`\.\d{1,9}`).
2. **Inference**:
   - `normalizeSourcePostingDate` detects `precision > 3` and preserves `original` verbatim rather than truncating it through `Date.prototype.toISOString()`.
   - `assessPostingFreshness` calculates `fraction = originalPostedAt.match(/\.(\d{1,9})/)?.[1] ?? ""`, pads to 9 digits, and extracts `subMillisecondNs = BigInt(fraction.padEnd(9, "0").slice(3))`.
   - The age is computed as:
     $$\text{ageNs} = \text{BigInt}(\text{Date.parse}(\text{observedAt}) - \text{postedMs}) \times 1,000,000\text{n} - \text{subMillisecondNs}$$
   - If a posting timestamp is 1 nanosecond in the future (`observedAt = 12:00:00.000Z`, `postedAt = 12:00:00.000000001Z`), `Date.parse(observedAt) - postedMs = 0`, but `subMillisecondNs = 1n`. Thus $\text{ageNs} = -1\text{n} < 0\text{n}$, correctly flagging `state: "FUTURE"`.

### 2.4 Inclusive 30-Day Window and Future Rejection
1. **Observation**: `MAX_POSTING_AGE_MS = 30 * 86_400_000` (2,592,000,000 ms).
2. **Inference**:
   - Line 33 of `publication-freshness.ts` evaluates:
     `ageNs < 0n ? "FUTURE" : ageNs > BigInt(MAX_POSTING_AGE_MS) * 1_000_000n ? "STALE" : "WITHIN_WINDOW"`
   - If $\text{ageNs} < 0\text{n}$, posting is after observed time $\rightarrow$ `"FUTURE"`.
   - If $\text{ageNs} \equiv \text{MAX\_POSTING\_AGE\_NS}$, the strict inequality `>` is false $\rightarrow$ evaluates to `"WITHIN_WINDOW"` (inclusive boundary).
   - If $\text{ageNs} > \text{MAX\_POSTING\_AGE\_NS}$ by even 1 ns $\rightarrow$ evaluates to `"STALE"`.
   - Missing / empty inputs return `state: "UNKNOWN"` with `postedAt: null`.
   - Malformed inputs, impossible calendars, or invalid `observedAt` return `state: "INVALID"` with `postedAt: null`.

### 2.5 Unit and Integration Test Landscape
1. **Observation**:
   - `packages/scraper/publication-freshness.test.ts` directly verifies `assessPostingFreshness` across 14 boundary test cases (including 1ns future, exact 30d, 30d + 1ms, 2024 leap day, etc.).
   - `packages/scraper/admission-evidence.test.ts` validates `isAdmissionInstant`, packet binding, and lease validation.
   - `apps/web/tests/native-fresh-scrape-posting-date.test.ts` tests actual raw RSS & RemoteOK JSON parsing, D1 schema triggers, FTS5, and the scrape route end-to-end.
2. **Gap Identified**:
   - There is **no dedicated unit test file `packages/scraper/source-posting-date.test.ts`** directly in `packages/scraper/`. The functions are tested primarily through integration fixtures in `apps/web/tests/native-fresh-scrape-posting-date.test.ts`.

---

## 3. Caveats

1. **Weekday Validation in RFC 5322**: `source-posting-date.ts` matches weekdays in `RSS_POSTING_DATE` (`(?:(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),\s*)?`), but does not verify whether the stated weekday matches the calendar day (e.g., if a feed says "Mon, 09 Oct 2026" when Oct 9 was a Friday). This is explicitly documented in the code comment: `"weekday consistency is outside this repair."`
2. **Leap Second Support**: JavaScript `Date.parse` does not support leap seconds (`:60`), treating them as rollover or invalid. Both `isAdmissionInstant` and `assessPostingFreshness` reject `:60` as `"INVALID"`.
3. **No Direct Unit Test for `source-posting-date.ts` in `packages/scraper/`**: While coverage exists in `apps/web/tests/native-fresh-scrape-posting-date.test.ts`, creating `packages/scraper/source-posting-date.test.ts` is strongly recommended for isolated unit verification.

---

## 4. Conclusion

1. The date parsing and freshness normalization pipeline is mathematically sound and adheres to the strict contract:
   - **Pre-persistence gating**: `apps/web/src/pages/api/cron/scrape.ts` evaluates `assessPostingFreshness` before AI triage and DB staging. Items not `WITHIN_WINDOW` are saved with `isActive: false` and `inactiveReason: "posting-freshness-${state}"`, preventing public exposure in D1/SQLite queries.
   - **Post-persistence gateway defense**: `packages/scraper/publication-gateway.ts` verifies `assessPostingFreshness(postedAt, now).state === "WITHIN_WINDOW"` on all persisted rows in `hasCurrentOwnership`.
   - **Impossible calendar prevention**: Wall-clock extraction + `isAdmissionInstant` round-trip check completely stops JavaScript Date silent rollover for September 31, non-leap February 29, hour 24:01, etc.
   - **Sub-millisecond precision**: Preserved in ISO strings and evaluated using BigInt arithmetic in `publication-freshness.ts`.
   - **Inclusive 30-day window**: Enforced down to the nanosecond level.
2. **Recommendation**: Implement `packages/scraper/source-posting-date.test.ts` to provide targeted unit testing for `normalizeSourcePostingDate` covering ISO, RFC 5322, impossible calendars, fractional seconds, and boundary conditions.

---

## 5. Verification Method

To independently verify all findings in this report, execute:

```sh
# 1. Verify publication-freshness unit tests, admission-evidence unit tests, and native fresh scrape integration tests:
bun test packages/scraper/publication-freshness.test.ts packages/scraper/admission-evidence.test.ts apps/web/tests/native-fresh-scrape-posting-date.test.ts

# 2. Verify publication gateway unit tests:
bun test packages/scraper/publication-gateway.test.ts

# 3. Verify publication gateway integration tests:
bun test packages/scraper/publication-gateway.integration.test.ts
```

### Invalidation Conditions
- Any test failure in the commands above.
- Any change in `source-posting-date.ts` that removes the `isAdmissionInstant` wall-clock check or converts precision >3 to `new Date().toISOString()`.
- Any change in `publication-freshness.ts` that removes the BigInt sub-millisecond subtraction.
- Any change in `scrape.ts` that allows non-`WITHIN_WINDOW` items to pass to `gatePassedItems`.
