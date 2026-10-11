# Adversarial Challenge Report — M2 Publication Uncertain Effects & Withdrawal Contract

**Target Components**: `uncertainMatchedManilaStillPublicCount` and `uncertainMatchedManilaDayFlowCount` (with aliases `withdrawalSafeManilaStillPublicCount` and `withdrawalSafeManilaDayFlowCount`) in `packages/scraper/manila-day.ts`  
**Integration Test**: `packages/scraper/publication-gateway.integration.test.ts`  
**Verdict**: **`APPROVE`**  
**Overall Risk Assessment**: **LOW**

---

## 1. Executive Summary

An empirical adversarial review was conducted against the implementation of `PUBLICATION_UNCERTAIN_EFFECTS_WITHDRAWAL_CONTRACT`.
The review tested the reader functions across extreme boundary conditions, non-standard types, adversarial inputs, scale tests (100k items), and state permutations.

All 303 tests in `packages/scraper/publication-gateway.integration.test.ts` passed cleanly. Empirical stress probes confirmed that:
1. `uncertainMatchedManilaStillPublicCount` safely degrades to `null` whenever any candidate ID in `pair.stillPublicIds` intersects with `uncertainIds` or violates upstream invariants.
2. `uncertainMatchedManilaDayFlowCount` fails closed to `null` across all possible `dayState` strings (`"CLOSED"`, `"open"`, `"UNKNOWN"`, `""`, etc.) and across all caller-supplied counts (100, 150, 0, -1, NaN, Infinity).
3. Neither function produces side effects, unearned MATH claims, database mutations, or writer locks.

---

## 2. Empirical Adversarial Stress Test Results

### Suite A: `uncertainIds` Boundary & Stress Testing

| Scenario | Input `uncertainIds` | Expected Behavior | Actual Behavior | Result |
|---|---|---|---|:---:|
| Duplicate matching IDs | `[3, 3, 3]` (where 3 is in pair) | Return `null` (tainted) | `null` | **PASS** |
| Duplicate non-matching IDs | `[99, 99]` (unrelated IDs) | Return matched count (5) | `5` | **PASS** |
| Negative non-matching IDs | `[-1, -5]` | Return matched count (5) | `5` | **PASS** |
| Negative mixed with matching | `[-1, 3]` | Return `null` (tainted by 3) | `null` | **PASS** |
| Non-integer non-matching | `[1.5, 2.7]` | Return matched count (5) | `5` | **PASS** |
| Non-integer mixed with matching | `[1.5, 4]` | Return `null` (tainted by 4) | `null` | **PASS** |
| Special float values | `[NaN, Infinity]` | Return matched count (5) | `5` | **PASS** |
| Large non-matching array | 100,000 distinct IDs `[100..100099]` | Return matched count (5) in < 500ms | `5` (122.15 ms) | **PASS** |
| Large matching array | 100,000 distinct IDs `[5..100004]` | Return `null` (intersects ID 5) | `null` | **PASS** |

**Empirical Finding**: Because `uncertainMatchedManilaStillPublicCount` initializes a `new Set(uncertainIds)` and checks `pair.stillPublicIds.some((id) => uncertainSet.has(id))`, duplicate entries, non-integer numbers, and negative numbers do not cause exceptions, false negatives, or false positives. The lookup is O(N) over `stillPublicIds` with O(1) set lookups, completing 100,000 items in ~122 ms without memory issues.

---

### Suite B: `stillPublicCount` Boundary & Mismatch Conditions

| Scenario | Input `stillPublicCount` | Pair State | Expected Behavior | Actual Behavior | Result |
|---|---|---|---|---|:---:|
| Zero count with 5 IDs | `0` | Pair has 5 IDs | Disagreement: return `null` | `null` | **PASS** |
| Zero count with empty pair | `0` | Pair has 0 IDs | Agreement: return `0` | `0` | **PASS** |
| Negative count | `-1`, `-100` | Pair has 5 IDs | Invalidation: return `null` | `null` | **PASS** |
| Count mismatch (under) | `4` | Pair has 5 IDs | Invalidation: return `null` | `null` | **PASS** |
| Count mismatch (over) | `6` | Pair has 5 IDs | Invalidation: return `null` | `null` | **PASS** |
| Non-safe integer | `NaN`, `Infinity`, `3.5` | Pair has 5 IDs | Invalidation: return `null` | `null` | **PASS** |

**Empirical Finding**: Upstream contract `agreedManilaStillPublicCount` strictly verifies that `stillPublicCount` is a non-negative safe integer equal to `pair.stillPublicIds.length`. Mismatched, negative, or fractional counts immediately fail closed to `null`.

---

### Suite C: `dayState` Variations in `uncertainMatchedManilaDayFlowCount`

| Scenario | Input `dayState` | Input `matchedCount` | Expected Behavior | Actual Behavior | Result |
|---|---|---|---|---|:---:|
| Standard closed | `"CLOSED"` | 5 | Return `null` (no closed flow) | `null` | **PASS** |
| Lowercase open | `"open"` | 5 | Return `null` | `null` | **PASS** |
| Uppercase open | `"OPEN"` | 5 | Return `null` | `null` | **PASS** |
| Lowercase closed | `"closed"` | 5 | Return `null` | `null` | **PASS** |
| Unknown status | `"UNKNOWN"` | 5 | Return `null` | `null` | **PASS** |
| Arbitrary text | `"arbitrary text"` | 5 | Return `null` | `null` | **PASS** |
| Whitespace only | `"   "` | 5 | Return `null` | `null` | **PASS** |
| Empty string | `""` | 5 | Return `null` (early guard) | `null` | **PASS** |

**Empirical Finding**: `uncertainMatchedManilaDayFlowCount` rejects empty strings via early exit (`if (dayState.length === 0) return null`) and unconditionally returns `null` for all valid and invalid strings. Callers cannot manipulate `dayState` to fabricate a flow count.

---

### Suite D: Caller-Supplied Floor Counts in `uncertainMatchedManilaDayFlowCount`

| Scenario | Input `dayState` | Input `matchedCount` | Expected Behavior | Actual Behavior | Result |
|---|---|---|---|---|:---:|
| Floor 100 | `"OPEN"` | 100 | Return `null` (floor is not flow) | `null` | **PASS** |
| Floor 150 | `"OPEN"` | 150 | Return `null` | `null` | **PASS** |
| Zero count | `"OPEN"` | 0 | Return `null` | `null` | **PASS** |
| Negative count | `"OPEN"` | -1 | Return `null` | `null` | **PASS** |
| NaN count | `"OPEN"` | NaN | Return `null` | `null` | **PASS** |
| Infinity count | `"OPEN"` | Infinity | Return `null` | `null` | **PASS** |
| Negative Infinity | `"OPEN"` | -Infinity | Return `null` | `null` | **PASS** |
| Fractional count | `"OPEN"` | 3.14 | Return `null` | `null` | **PASS** |
| Null count | `"OPEN"` | null | Return `null` | `null` | **PASS** |
| Undefined count | `"OPEN"` | undefined | Return `null` | `null` | **PASS** |
| Floor 100 on CLOSED | `"CLOSED"` | 100 | Return `null` | `null` | **PASS** |
| Floor 150 on CLOSED | `"CLOSED"` | 150 | Return `null` | `null` | **PASS** |

**Empirical Finding**: Caller-supplied floors (100, 150) and invalid numerical values are completely prevented from fabricating a flow count.

---

### Suite E: Structural & Upstream Invariant Integrity

| Scenario | Adversarial Condition | Expected Behavior | Actual Behavior | Result |
|---|---|---|---|:---:|
| Null snapshot pair | `pair = null` | Return `null` | `null` | **PASS** |
| Unknown IDs | `idsKnown = false` | Return `null` | `null` | **PASS** |
| Duplicate pair IDs | `stillPublicIds = [1, 1, 2, 3, 4]` | Return `null` | `null` | **PASS** |
| Foreign still-public ID | `stillPublicIds` not subset of `firstPublishIds` | Return `null` | `null` | **PASS** |
| Duplicate active IDs | `activeIds = [1, 2, 3, 4, 4]` | Return `null` | `null` | **PASS** |
| Negative active ID | `activeIds = [1, 2, 3, 4, -5]` | Return `null` | `null` | **PASS** |
| Empty source ID | `publishingSourceId = ""` | Return `null` | `null` | **PASS** |
| Source ID mismatch | `publishingSourceId` != `ownedRows.sourceId` | Return `null` | `null` | **PASS** |
| Canonical URL collision | Two rows share canonical URL | Return `null` | `null` | **PASS** |

---

## 3. Targeted Test Suite Verification

Targeted integration test command:
```bash
bun test packages/scraper/publication-gateway.integration.test.ts
```

Output:
```
303 pass
0 fail
2962 expect() calls
Ran 303 tests across 1 file. [92.32s]
```

TypeScript typecheck command:
```bash
bun run typecheck
```
Output:
```
$ bunx tsc --noEmit -p apps/web/tsconfig.json
Exit code: 0
```

---

## 4. Final Verdict

**`APPROVE`**

The implementation of `uncertainMatchedManilaStillPublicCount` and `uncertainMatchedManilaDayFlowCount` adheres strictly to all mathematical invariants, satisfies all boundary condition requirements, demonstrates robust defensive programming against malformed and hostile inputs, and causes zero test regressions or side-effects.
