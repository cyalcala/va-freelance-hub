# Source economics: missing attribution is not zero yield

Status: local verified measurement correction; no serving, collection,
publication, source permission, schedule or database schema change.
Start: `c23a2db0b60b544d3305312b696784eed98a1089`; preserved GitHub report
descendants by fast-forward to `be7c493a935cbf023c33db5c3c0398399a4d69c1`.

## Defect and invariant

The existing daily source-economics workflow executes six SELECTs, renders the
report, and snapshots raw aggregates. The report treated absent eligibility
attribution as zero and divided zero-denominator cohorts into `0.00` yield.
Sources present only in stored outcomes disappeared from the yield table.
This can mistake missing observations or another intake path for an unproductive
source. No scheduling consumer parses this Markdown; the snapshot reads raw rows.

The correction requires measured nonnegative integer counts and a positive
denominator before emitting a ratio. Explicit measured zero remains zero.
Missing/invalid counts and zero denominators render `UNKNOWN`. The table unions
fetch and stored source identities. It now explicitly identifies the ratios as
descriptive cross-path aggregates, not marginal verified first-publication yield.
No SQL, ingestion rule, cost threshold or source-selection behavior changed.

## Fixed-input production comparison

Capture: `2026-10-18T08:15:21.418Z` through `08:15:24.738Z`. All six D1
SELECTs returned HTTP 200 and zero rows written. All ten partition deltas
reconcile to zero. Sequential SELECTs are not an atomic snapshot.

The [portable capture and comparison](../evidence/AUTONOMOUS_IMPROVEMENT_2026-10-18/economics/comparison.json)
records the input hash, query provenance and changed rows. Before/after reports
use exactly the same input, so this comparison does not conflate new ingestion
with the rendering change.

| Example | Before | After |
| --- | --- | --- |
| Hunt St: 24 eligible stored, 0 changed fetches/items | `0.00` yield | `UNKNOWN` ratios |
| Remote Craft: 125 changed fetches, 1875 items, no stored-outcome row | 0 eligible, `0.00` yield | unknown eligible count and ratios |
| Ashby Finch: 1 eligible stored, no fetch-outcome row | absent | present; unknown fetch counts/ratios |
| Yield source rows | 64 | 65 |

The capture has 1716 active eligible labels, 261 first-stored within seven days
(37.29/day rolling proxy), and 1410 within thirty days (47/day). These are
current eligible storage cohorts, not independently certified first publications
or trusted-employer recall. Complete-day October 11–17 measurements in the
broader baseline use a different window; do not mix their denominators.

## Verification and limits

- Counterexample run before correction: 14 new failures, 45 passing tests
  across three matching paths. This initial Bun filter also selected old temp
  copies; it is not a current-source-only count.
- Exact current-source command:
  `bun test --no-env-file ./scripts/diagnostics/source-economics.test.ts ./scripts/diagnostics/economics-snapshot.test.ts`:
  46 pass, 0 fail, 132 assertions, two files. It covers missing numerator,
  stored-only source, zero denominators, explicit zero, positive ratios, and
  malformed/null/nonfinite/negative/fractional counts.
- Independent code review approves; consumers and raw snapshot contracts checked.
- Pre-edit full baseline: 4469 pass, 0 fail, 331551 assertions, 268 files.
- After report edit, application typecheck exited 0 and build completed in
  44.54 seconds. The later combined regression is recorded in the current
  improvement checkpoint, separately from this baseline.
- Final combined correction state: 4499 pass, 0 fail, 331630 assertions across
  269 files (415.62 seconds); application typecheck exited 0, build completed
  in 74.10 seconds, and all four governance/production audits exited 0.
  This run also includes the employer/tracker corrections recorded separately;
  it is not an isolated economics-only test count.

Reproduce the after report without network access:

```powershell
bun --no-env-file scripts/diagnostics/source-economics.ts report docs/evidence/AUTONOMOUS_IMPROVEMENT_2026-10-18/economics/combined.json
```

Rollback: revert only this report-rendering/test commit. Retain the captured
inputs. This does not complete MATH-01, MATH-03, or any daily publication proof.
The existing workflow uses the fix only after its source revision is advanced;
a local report correction is not deployed workflow acceptance.
