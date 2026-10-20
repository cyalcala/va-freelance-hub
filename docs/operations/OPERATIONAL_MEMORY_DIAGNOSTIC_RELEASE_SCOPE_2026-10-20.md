# Operational memory/report release scope — 2026-10-20

Source base: `51159e23f15852fea4b2cabcd35b45dec07a35cb`. This bounded CI slice
changes only release classification and its tests. It does not edit Astra,
report calculations/queries, app/Worker code, migrations or schedules, and does
not activate a main update.

## Consumers verified before classification

- `astra777.txt` is root operational agent memory. Search of `apps`, `packages`,
  `workers`, `scripts`, workflows and package configuration found no consumer.
  The inspected Astro build config does not bundle root text or diagnostics.
- `scripts/diagnostics/source-economics.ts` emits fixed SELECT queries, consumes
  captured results, reconciles partitions and renders aggregate reports. Its
  actual production caller is `.github/workflows/gha-source-economics.yml`
  (`emit`, `collect`, `report`). That workflow executes the emitted read-only
  queries and checks `rows_written=0` and `changed_db=false`.
- Its only non-test module importer is `scripts/diagnostics/economics-snapshot.ts`,
  which consumes pure folding/concentration helpers for local report artifacts.
  That snapshot CLI is also called by the same workflow. Neither module is
  imported by app/package/Worker runtime. The CLI filesystem writes are report
  artifacts; this is not a claim that it performs no filesystem writes.

## Exact change and protected boundary

The existing classifier gains only `^astra777\.txt$` and
`^scripts/diagnostics/source-economics\.ts$`. All earlier exclusions remain.
Other root text files, nested/suffixed Astra lookalikes, other diagnostic scripts,
app runtime, migrations, other actions and GHA runtime scripts retain their
previous deployable classification. Mixed changes containing any such runtime
path still deploy. This does not broadly exclude `.txt`, `scripts/diagnostics/`
or TypeScript files.

The validate job still runs its existing scans, audits, full tests, build and type
checks. This only prevents operational-memory/read-only-report changes from
launching the separate migrate-and-deploy job. It allows the root's separately
reviewed report-truth correction (`59af2077`) and recovery memory to reach main
without bundling unrelated dormant runtime changes into a Pages release.

## Verification

- Before the classifier change, the new static/actual-shell cases reproduced
  **0 pass / 2 fail**: the exact memory/report paths incorrectly selected
  `deployable=true` (`.tmp-memory-diagnostic-scope-red.log`).
- Afterward: **2 pass / 0 fail / 39 assertions**, 3.67s
  (`.tmp-memory-diagnostic-scope-green.log`). These execute the checked-in
  classifier, testing each exact path, their combined recovery/report/test/doc
  slice, and mixed app/other-diagnostic/other-text changes. Static counterexamples
  cover nested/suffixed names and unrelated diagnostic/runtime files.
- Exact root guardrails plus source-economics and snapshot tests:
  **62/0/166** across three files, 0.85s
  (`.tmp-memory-diagnostic-scope-neighbors.log`). This includes the existing
  46-test report/snapshot interpretation verification; it is not a new claim of
  verified first-publication throughput.

Main activation, canonical/mirror readbacks and the next actual aggregate report
are separate root-owned acceptance steps. No publication permission, source
admission, quality gate, database state or deployment was changed here.
