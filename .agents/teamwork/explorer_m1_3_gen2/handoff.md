# Handoff Report: Native Integration Test Suite & Git Status Investigation

**Agent**: `explorer_m1_3_gen2`  
**Working Directory**: `c:\Users\admin\Desktop\va-freelance-hub\.agents\teamwork\explorer_m1_3_gen2`  
**Date**: 2026-10-10  
**Recipient**: Parent Orchestrator (`5b172f40-7fdc-4682-884c-258bc6e35539`)  
**Type**: Hard Handoff (Investigation Complete)  

---

## 1. Observation

### Exact File Paths, Line Numbers, Verbatim Code, and Tool Commands

#### 1. Test Suite Execution & Output
- **Command**:
  ```sh
  bun test --no-env-file --preload ./scripts/ci/test-environment.ts apps/web/tests/native-fresh-scrape-posting-date.test.ts
  ```
- **Execution Result**:
  ```text
  38 pass
  0 fail
  590 expect() calls
  Ran 38 tests across 1 file. [90.86s]
  ```

#### 2. Test Architecture: Harness & Fixture
- **Test File**: `apps/web/tests/native-fresh-scrape-posting-date.test.ts`
- **Fixture Runner**: `apps/web/tests/fixtures/native-fresh-scrape-posting-date.ts`
- **Execution Mechanism** (`native-fresh-scrape-posting-date.test.ts:27-38`):
  Each test invokes `Bun.spawn` in an isolated child process:
  ```ts
  const child = Bun.spawn([process.execPath, "run", "--no-env-file", "--preload",
    "./scripts/ci/test-environment.ts", "./apps/web/tests/fixtures/native-fresh-scrape-posting-date.ts", JSON.stringify(scenario)],
  { cwd: fileURLToPath(new URL("../../..", import.meta.url)), stdout: "pipe", stderr: "pipe" });
  ```
- **Child Fixture Environment** (`native-fresh-scrape-posting-date.ts:72-103`):
  1. Sets test reference clock `REFERENCE = "2026-10-10T12:00:00.000Z"` via `setSystemTime(new Date(REFERENCE))`.
  2. Creates a clean in-memory SQLite database (`new Database(":memory:")`) and executes all 59 production migrations (`packages/db/migrations/0000_*.sql` through `0058_*.sql`).
  3. Projects `source_publication_ledger` trigger clock: substitutes `julianday('now')` with `julianday('2026-10-10T12:00:00.000Z')` in trigger SQL and asserts that exactly 1 replacement occurs and the replacement is reversibly identical.
  4. Truncates test tables: `DELETE FROM source_registry; DELETE FROM source_opt_outs; DELETE FROM va_directory; DELETE FROM opportunities;`.
  5. Sets up synthetic HTTP transport (`fetch`) that permits only robots.txt for allowed origins and returns controlled RSS or JSON bodies.
  6. Mocks `AI.run` to return eligible classification (`eligibleForFilipinos: true, eligible: true`).
  7. Invokes the real endpoint handler `createScrapeHandler()` from `apps/web/src/pages/api/cron/scrape.ts`.
  8. Emits structured JSON via `NATIVE_POSTING_DATE_RESULT <json>` containing database rows, `visible` public query results, ledger records, FTS counts, and API response body.

#### 3. Verification of Zero Public Rows and Zero Ledger Rows
In `apps/web/tests/native-fresh-scrape-posting-date.test.ts:47-59`, `expectNoPublication` is asserted for all bad date tests:
```ts
function expectNoPublication(result: NativeResult, count: number) {
  expectClock(result);
  expect(result.status).toBe(200);
  expect(result.rows).toHaveLength(count);
  expect(result.rows.every(row => row.active === 0 && row.reason !== null
    && /^posting-freshness-/.test(row.reason))).toBe(true);
  expect(result.visible).toEqual([]);
  expect(result.ledger).toEqual([]);
  expect(result.ownershipReads).toBe(0);
  expect(result.aiCalls).toBe(0);
  expect(result.ftsCount).toBe(count);
  expect(result.body).toMatchObject({ inserted: 0, actualChanges: 0 });
}
```
Where:
- **`result.visible`** is obtained via the canonical serving filter in `native-fresh-scrape-posting-date.ts:163`:
  ```ts
  const visible = await db.select({ id: opportunities.id }).from(opportunities).where(publicOpportunityFilters());
  ```
  Defined in `apps/web/src/lib/public-opportunities.ts:11-16`:
  ```ts
  export function publicOpportunityFilters(): SQL {
    return and(
      eq(opportunities.isActive, true),
      inArray(opportunities.phEligibility, [...PUBLIC_PH_ELIGIBILITIES]),
    )!;
  }
  ```
  `expect(result.visible).toEqual([])` verifies **zero public-selectable rows**.
- **`result.ledger`** is obtained via `native-fresh-scrape-posting-date.ts:172`:
  ```ts
  ledger: sqlite.query("SELECT source_id AS source, published_count AS n, published_ids_json AS ids FROM source_publication_ledger ORDER BY id").all()
  ```
  `expect(result.ledger).toEqual([])` verifies **zero publication ledger rows**.
- **`row.active === 0`** and **`row.reason !== null && /^posting-freshness-/.test(row.reason)`**:
  Verifies that invalid items are withheld prior to public staging with reasons such as `posting-freshness-unknown`, `posting-freshness-invalid`, `posting-freshness-future`, `posting-freshness-stale`.
- **`expect(result.ownershipReads).toBe(0)`** and **`expect(result.aiCalls).toBe(0)`**:
  Verifies that items fail before the gateway ownership check and before consuming AI quota.

#### 4. The 38 Tests Structure
The 38 test cases in `apps/web/tests/native-fresh-scrape-posting-date.test.ts` are organized into 5 clear logical groups:

| Group | Lines | Count | Description |
|---|---|---:|---|
| **Group 1: Bad Dates Matrix** | 62–83 | 18 | 9 bad date cases × 2 sources (`remotive` [RSS] & `remote-ok` [JSON]) |
| **Group 2: Nonrecoverable Holds** | 84–90 | 2 | Invalid hour 24 (`remotive`) and ambiguous date-only string (`remote-ok`) |
| **Group 3: Valid Dates Preservation** | 92–116 | 10 | Fresh ISO, RSS RFC forms (GMT, +0000, +0200), ISO timezones, exact 30-day boundary, boundary + 1ns |
| **Group 4: Feed & Dedup Lifecycle** | 118–157 | 6 | Mixed batches (valid + bad) × 2, empty feed × 2, and identity dedup collisions × 2 |
| **Group 5: Concurrency & Invariant Drift** | 158–187 | 2 | Post-write date drift stays `UNKNOWN` (no compensation); prefix drift stops subsequent writers |
| **Total** | | **38** | **All 38 pass with zero failures** |

#### 5. Direct Mapping to astra777.txt Audit Failure Cases
In `astra777.txt:7-8, 157-164`, the audit identified:
- **8 controlled raw-response failure cases**: 4 date failure modes (missing, unparseable, stale >30d, future dates) across 2 adapters (`remotive` RSS and `remote-ok` JSON).
- **2 impossible-calendar cases**: `"2026-09-31T12:00:00.000Z"` across the 2 adapters.

Mapping table:

| # | `astra777.txt` Case | Adapter | Input Date Tested | Test Line | Test Name in Harness | Result |
|---|---|---|---|---:|---|---|
| 1 | Missing date | Remotive (RSS) | `null` | 74 | `remotive: missing stays physically hidden...` | PASS (0 public, 0 ledger) |
| 2 | Missing date | RemoteOK (JSON) | `null` | 74 | `remote-ok: missing stays physically hidden...` | PASS (0 public, 0 ledger) |
| 3 | Unparseable date | Remotive (RSS) | `"not-a-date"` | 74 | `remotive: unparseable stays physically hidden...` | PASS (0 public, 0 ledger) |
| 4 | Unparseable date | RemoteOK (JSON) | `"not-a-date"` | 74 | `remote-ok: unparseable stays physically hidden...` | PASS (0 public, 0 ledger) |
| 5 | Stale > 30d | Remotive (RSS) | `"2026-09-09T12:00:00.000Z"` (31d stale) | 74 | `remotive: 31 days stale stays physically hidden...` | PASS (0 public, 0 ledger) |
| 6 | Stale > 30d | RemoteOK (JSON) | `"2026-09-09T12:00:00.000Z"` (31d stale) | 74 | `remote-ok: 31 days stale stays physically hidden...` | PASS (0 public, 0 ledger) |
| 7 | Future date | Remotive (RSS) | `"2026-10-10T12:00:00.001Z"` (+1ms) | 74 | `remotive: future by 1ms stays physically hidden...` | PASS (0 public, 0 ledger) |
| 8 | Future date | RemoteOK (JSON) | `"2026-10-10T12:00:00.001Z"` (+1ms) | 74 | `remote-ok: future by 1ms stays physically hidden...` | PASS (0 public, 0 ledger) |
| 9 | Impossible calendar | Remotive (RSS) | `"2026-09-31T12:00:00.000Z"` | 74 | `remotive: impossible September 31 stays physically hidden...` | PASS (0 public, 0 ledger) |
| 10 | Impossible calendar | RemoteOK (JSON) | `"2026-09-31T12:00:00.000Z"` | 74 | `remote-ok: impossible September 31 stays physically hidden...` | PASS (0 public, 0 ledger) |

In addition to the 10 audited cases, the harness includes **28 additional tests** providing rigorous boundary and lifecycle hardening:
- **Calendar edge**: Non-leap year February 29 (`"2026-02-29T12:00:00.000Z"`) for both Remotive and RemoteOK.
- **Sub-millisecond future edge**: Future by 1ns (`"2026-10-10T12:00:00.000000001Z"`) for both adapters.
- **Boundary stale edges**: 30 days + 1ms (`"2026-09-10T11:59:59.999Z"`) and 30 days + 1ns (`"2026-09-10T11:59:59.999999999Z"`) for both adapters.
- **Malformed components**: Invalid hour (`"2026-10-09T24:01:00.000Z"`) and date-only (`"2026-10-09"`).
- **Valid preservation**: 10 tests confirming that legitimate ISO and RFC 5322 dates (GMT, +0000, +0200, timezone offsets, exact 30-day boundary) correctly produce 1 visible row and 1 ledger entry with intact timestamps.
- **Mixed batches**: 2 tests showing that a feed containing `[null, FRESH, "2026-09-31T12:00:00.000Z"]` publishes *only* the single fresh item and withholds the other two.
- **Empty feed & dedup**: 4 tests confirming zero writes on empty feeds and zero fresh ledger receipts on dedup collisions.
- **Drift controls**: 2 tests exploring post-persistence mutation and prefix multi-source drift stopping subsequent writers.

#### 6. Git Status and Commit History
- **Command**: `git status`
  ```text
  On branch codex/verified-flow-directory-checkpoint
  Your branch is ahead of 'origin/codex/verified-flow-directory-checkpoint' by 27 commits.
    (use "git push" to publish your local commits)

  Untracked files:
    (use "git add <file>..." to include in what will be committed)
  	.agents/skills/
  	.agents/teamwork/
  	astra777.txt
  	docs/audits/evidence/2026-10-10-ponytail/
  	docs/bootloaders/REDESIGN_REVIEW_BOOTLOADER.md
  	docs/bootloaders/REDESIGN_REVIEW_MASTER_PROMPT.md
  	lucky777.md
  	test-date.ts

  nothing added to commit but untracked files present (use "git add" to track)
  ```
- **Command**: `git diff` and `git diff --cached`
  Both returned empty output (zero tracked modifications).
- **Command**: `git log -n 5`
  ```text
  commit 0525bb1fcb54f5c68b17d972868af324a8d7d6ef
  Author: cyalcala <cyalcala@users.noreply.github.com>
  Date:   Sat Oct 10 21:30:49 2026 +0800

      Keep foreign still-public id in same-source breach out of completed flow

  commit 532e353f8d177b4ff048cd369192aedb70cc0ea9
  Author: cyalcala <cyalcala@users.noreply.github.com>
  Date:   Sat Oct 10 21:27:31 2026 +0800

      Record that foreign still-public id in same-source pair is not a flow

  commit c4b7d18791cfe5ac2dd8740130454da0228f621e
  Author: cyalcala <cyalcala@users.noreply.github.com>
  Date:   Sat Oct 10 21:24:24 2026 +0800

      Keep foreign still-public id in same-source pair out of completed flow

  commit caa742c824013323e0ae569b79c4ed77995a3c70
  Author: cyalcala <cyalcala@users.noreply.github.com>
  Date:   Sat Oct 10 21:21:05 2026 +0800

      Record that foreign still-public id in same-source breach stays absent

  commit e743ad5d8ff2d975ec2db78e349b26f3afc13a84
  Author: cyalcala <cyalcala@users.noreply.github.com>
  Date:   Sat Oct 10 21:19:39 2026 +0800

      Keep foreign still-public id in same-source breach out of family status
  ```

---

## 2. Logic Chain

1. **From Observation 1 and 4**: The test suite `native-fresh-scrape-posting-date.test.ts` executes cleanly with 38 passing tests and 590 assertions.
2. **From Observation 2 and 3**:
   - The test fixture executes the complete real application scrape route (`createScrapeHandler`) and real parsers (`fetchRSSFeed`, `fetchJSONSource`), passing raw inputs through `normalizeSourcePostingDate` (`packages/scraper/source-posting-date.ts:16-46`) and `assessPostingFreshness` (`packages/scraper/publication-freshness.ts:13-34`).
   - In `apps/web/src/pages/api/cron/scrape.ts:2795-2818`, items that fail freshness (`freshness.state !== "WITHIN_WINDOW"`) are routed directly to `rejectedItems` with `isActive: false` and `inactiveReason: posting-freshness-${freshness.state.toLowerCase()}`.
   - These items bypass AI classification and are inserted with `is_active = 0`.
   - The test harness queries the database using `publicOpportunityFilters()`, which requires `isActive = true`. Because `isActive` is false, `result.visible` returns an empty array `[]`.
   - Furthermore, because items never enter `gatePassedItems`, they are never submitted to `publishPublicExposure()`, ensuring `source_publication_ledger` has zero rows (`result.ledger === []`).
3. **From Observation 5**:
   - All 8 failure cases from `astra777.txt` (missing, unparseable, stale >30d, future) and the 2 impossible-calendar cases (Sep 31) are directly and explicitly covered by tests 74–82 in the harness for both RSS (`remotive`) and JSON (`remote-ok`).
   - In `packages/scraper/source-posting-date.ts:20-22` and `publication-freshness.ts:23-24`, the wall clock is checked via `isAdmissionInstant(`${original.slice(0, 19)}.000Z`)`. Because JavaScript's `new Date("2026-09-31T...Z")` rolls over to `"2026-10-01"`, `date.toISOString() === value` evaluates to `false`. This prevents silent JavaScript Date rollover from turning impossible calendar dates into valid timestamps.
4. **From Observation 6**:
   - The Git repository working tree has zero tracked uncommitted modifications.
   - The branch `codex/verified-flow-directory-checkpoint` is 27 commits ahead of `origin`.
   - Untracked files include local audit logs (`astra777.txt`, `lucky777.md`), agent workspaces (`.agents/`), and local scratch files (`test-date.ts`).

---

## 3. Caveats

1. **Offline In-Memory SQLite Clock Projection**:
   Bun's in-memory SQLite executes all 59 production migrations, but SQLite triggers on `source_publication_ledger` use C-level `julianday('now')`, which ignores `setSystemTime()`. The fixture reversibly replaces `julianday('now')` with `julianday('2026-10-10T12:00:00.000Z')` in the trigger definition to achieve deterministic offline testing. This is acknowledged and documented in `result.scope.clock` as `CLOCK_PROJECTED_NATIVE_TRIGGERS_NOT_BYTE_IDENTICAL_RUNTIME_PROOF`.
2. **Inline vs. Inngest Triage Path**:
   The native test harness runs with `triageViaInngest: false` (the inline execution path). In `apps/web/src/pages/api/cron/scrape.ts:2795-2834`, the freshness check is performed *before* the `if (triageViaInngest)` branch, guaranteeing that non-fresh items are rejected identically in both modes. However, the downstream Inngest worker (`triage-drain.ts`) itself is not executed in this specific test harness.
3. **Post-Write Mutation Limitation (Test 37)**:
   As asserted in Test 37, if an opportunity row has its `posted_at` date changed to stale *after* physical persistence, `publicOpportunityFilters()` still returns the row because the public serving query only filters by `is_active = 1` and `ph_eligibility IN ('eligible', 'eligible_likely')`. It does not execute dynamic SQL date range checks on each read. This is an intentional architectural boundary noted in `astra777.txt` ("Receipt truth is stronger than public-row truth").
4. **Untracked Working Tree Files**:
   There are 8 untracked paths in the repository (`astra777.txt`, `lucky777.md`, `.agents/skills/`, `.agents/teamwork/`, `docs/audits/evidence/2026-10-10-ponytail/`, `docs/bootloaders/REDESIGN_REVIEW_BOOTLOADER.md`, `docs/bootloaders/REDESIGN_REVIEW_MASTER_PROMPT.md`, `test-date.ts`). They do not affect the clean status of tracked git files.

---

## 4. Conclusion

- **Harness Completeness**: The 38 tests in `native-fresh-scrape-posting-date.test.ts` provide a comprehensive, fully passing integration test harness that maps 1:1 against all 8 raw-response failure cases and 2 impossible-calendar cases identified in `astra777.txt`, while adding 28 additional boundary, preservation, mixed-batch, and lifecycle tests.
- **Invariant Enforcement**: The harness rigorously verifies the primary acceptance criteria:
  - Bad original dates yield **zero active public-selectable rows** via `publicOpportunityFilters()`.
  - Bad original dates yield **zero publication ledger rows** in `source_publication_ledger`.
  - Bad original dates bypass AI triage entirely (`aiCalls === 0`) and never trigger ownership reads (`ownershipReads === 0`).
  - Legitimate dates across supported ISO and RFC 5322 formats are preserved with original timestamps and actual publication receipts.
- **Git Hygiene**: Tracked files are 100% clean (no uncommitted diffs). Branch `codex/verified-flow-directory-checkpoint` is 27 commits ahead of `origin`.

### Potential Strengthenings / Edge Cases
While the test suite is exceptionally thorough, the following edge cases could be considered in future hardening:
1. **Explicit Leap Year Acceptance Test**:
   The suite tests non-leap year Feb 29 (`"2026-02-29T12:00:00.000Z"`) as invalid, but does not include a positive control test verifying that a valid leap year date (e.g. within an inclusive 30-day window during a leap year) is accepted.
2. **Additional Feed Providers**:
   The suite tests `remotive` (RSS) and `remote-ok` (JSON). Other active feeds (`we-work-remotely`, `jobicy-admin-support-apac`) share `fetchRSSFeed`, but could have source-specific date quirks (e.g. non-standard timezone notations or XML date fields) tested explicitly.
3. **Inngest Async Queue Integration**:
   A companion test running with `triageViaInngest: true` could explicitly verify that `pendingItems` also excludes non-fresh items when Inngest is enabled.

---

## 5. Verification Method

To independently reproduce and verify all findings:

1. **Run the 38 Native Posting Date Tests**:
   ```sh
   bun test --no-env-file --preload ./scripts/ci/test-environment.ts apps/web/tests/native-fresh-scrape-posting-date.test.ts
   ```
   *Expected Output*:
   `38 pass, 0 fail, 590 expect() calls`, runtime ~80–95s.

2. **Verify Git Status and Commits**:
   ```sh
   git status
   git log -n 5
   git diff
   git diff --cached
   ```
   *Expected Output*:
   On branch `codex/verified-flow-directory-checkpoint`, ahead by 27 commits, clean tracked tree, HEAD commit `0525bb1f`.

3. **Verify Date Validation Functions in Isolation**:
   ```sh
   bun -e '
   import { normalizeSourcePostingDate } from "./packages/scraper/source-posting-date";
   import { assessPostingFreshness } from "./packages/scraper/publication-freshness";
   console.log("Sep 31:", normalizeSourcePostingDate("2026-09-31T12:00:00.000Z"));
   console.log("Feb 29 (2026):", normalizeSourcePostingDate("2026-02-29T12:00:00.000Z"));
   console.log("Valid Oct 9:", normalizeSourcePostingDate("2026-10-09T12:00:00.000Z"));
   console.log("Freshness Sep 31:", assessPostingFreshness("2026-09-31T12:00:00.000Z", "2026-10-10T12:00:00.000Z"));
   '
   ```
   *Expected Output*:
   - `Sep 31: null`
   - `Feb 29 (2026): null`
   - `Valid Oct 9: 2026-10-09T12:00:00.000Z`
   - `Freshness Sep 31: { state: "INVALID", postedAt: null }`
