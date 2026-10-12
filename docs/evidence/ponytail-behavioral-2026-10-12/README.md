# Behavioral audit evidence — October 12

This is an offline counterexample package for [the behavioral audit](../../audits/PONYTAIL_BEHAVIORAL_BLOAT_2026-10-12.md). It does not authorize collection, source admission, deployment or publication. Exit 0 confirms the recorded defect signature, not repaired behavior or a MATH requirement.

Run from the repository root with installed workspace dependencies:

```powershell
bun run --no-env-file --preload ./scripts/ci/test-environment.ts ./docs/evidence/ponytail-behavioral-2026-10-12/canary-overflow-probe.ts '{"source":"remotive","dates":["2026-10-09T12:00:00.000Z","2026-10-09T12:00:00.000Z","2026-10-09T12:00:00.000Z","2026-10-09T12:00:00.000Z"],"enforceD1BindingBudget":true}'
bun run --no-env-file --preload ./scripts/ci/test-environment.ts ./docs/evidence/ponytail-behavioral-2026-10-12/registry-rotation-probe.ts
bun run --no-env-file --preload ./scripts/ci/test-environment.ts ./docs/evidence/ponytail-behavioral-2026-10-12/ats-date-probe.ts
```

The canary probe runs the actual current handler, parsers, Drizzle, native SQLite, FTS and publication gateway. Its fetch replacement handles only synthetic responses for the existing configured source URLs and robots paths; it never forwards a request. AI is a synthetic positive response. It creates only an in-memory database. A synthetic initial registry row is seeded before lifecycle guards exist, then every migration statement is installed unchanged. Exactly one ledger clock literal is projected to the fixture clock. This is not source-admission evidence or full D1 parity. Four approved inputs, cap two, two physical/public rows, persisted ETag, subsequent 304 and two still-missing inputs establish the loss. If a later repair changes that signature, this recording probe should fail; do not weaken its oracle to retain the old result.

The rotation probe uses the actual registry merge and the captured selector from committed `c5521b1b1ca977e9a762413965db6df3a5dc6019`. Its frozen selector is archived separately, so no Git object or network recovery is needed to reproduce it. Only TypeScript non-null assertion punctuation is removed for evaluation. Dispatch timestamps are simulated; this is not a full-route, permission or live-network test. The current rotation candidate may replace that selector, so this probe deliberately characterizes the pre-repair algorithm.

`canary-overflow-result.json` and `registry-rotation-result.json` retain the original observed results. The scripts' reproduction receipts are separate. `consumer-search.txt` retains repository-wide symbol/string references searched with hidden files enabled and generated/dependency/temporary directories excluded; it does not prove every dynamic behavior absent. The publication receipt, reservation and measurement helpers have real consumers and were not classified as dead code.

The [original-date assessment](0054-date-prefence-assessment.md) compares the live baseline with current source and identifies the compatible leaf guards. The ATS date probe uses actual current parsers, strict assessment and an archived legacy normalizer, with two intercepted synthetic fetch attempts and zero provider/AI/database operations. It characterizes discarded original-date evidence; it does not execute either publication route. `ats-date-result.json` is its result. Existing strict date guards separately passed 107 tests, zero failures and 157 assertions across three files; this does not establish native release or live provider-field coverage.

The three local Ponytail instruction files read for this audit are archived in `upstream/`. The base/audit bytes match the October 10 evidence copies pinned there to upstream commit `9cc65d03aa2da1db7121b912d03596409ee340b8`; this audit did not independently fetch upstream or establish a new upstream revision for the review copy. The prior MIT notice is retained. Local content hashes identify all three copies.

`integrity.json` records local and LF-normalized content digests, input source digests and reproduction results. It excludes itself. Equality establishes content identity, not correctness, admission or production acceptance. No provider requests, paid AI, production database operations, source transitions, schedules or deployments were performed by these probes.
