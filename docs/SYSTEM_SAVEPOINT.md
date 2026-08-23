# System Savepoint

## Current Gauntlet Execution Savepoint — 2026-08-23 (run 5)

Status: **DATA-05B TERMINAL — KEEP (owner-approved CAS repair executed and
proven) and REC-02 TERMINAL — KEEP (minimal-context resume drill passed,
subject deployed)**.

**DATA-05B** — The owner approved the six recorded candidate rows via the run
instruction "all approved that needed to be approved all proceed"
(2026-08-23). Executed exactly per contract: fresh read-only report
re-collected (`changed_db=false`), byte-identical sha256
`86d3a0002c0e48bd9c51285f7e1f10dc434da9e66d80e1470c24477c8d1d1be3` to the
00:13Z report (zero drift); all six IDs matched expected values (no CAS
drift); dry-run 6 planned / 0 skipped; six guarded per-row UPDATEs executed
via wrangler, `changes=1` each (one transient `fetch failed` before any
execution, retried safely under CAS); post-state SELECT shows all six rows
`website IS NULL` + `website_source='repair_cleared'` + evidence-hash-prefixed
`website_evidence`; post-totals reconciliation exact (with_website 344→338,
note-evidence 35→29, shared-host 39→37, mismatch 17→11); undo artifact
retained (`DATA-05B-undo-artifact-20260823T0146Z.json`); route smoke passed
(all six companies render live, zero bogus hosts on probed pages, control row
Lemon.io intact). Ambiguous rows 618/619/576 untouched. Local focused tests
27 pass / typecheck exit 0 at `d7e7e15`. Evidence:
`docs/gauntlet/evidence/DATA-05B-directory-website-provenance.md`.

**SRC-4D remains VERIFYING (48h live window)** — behavior `90f3243`, CI/deploy
`32592205884`; production Pages deploy ~2026-08-22T18:57Z starts the ≥48h
post window. NEXT EXACT ACTION: on/after **2026-08-24T19:00Z** run the
read-only D1 post-rollup from `source_fetch_events` since
`2026-08-22T18:57:00Z`, append to
`docs/gauntlet/evidence/SRC-4D-jobicy-cadence-diagnosis.md`, then decide KEEP
or pause-Jobicy per contract.

**COMP-01B remains PLANNED (window not yet complete)** — prerequisite window
(minimum 48h) matures on/after **2026-08-24T12:38Z** (COMP-01A deploy
`32573525387` completed 2026-08-22T12:38Z). Requires reviewed observation
report covering every active endpoint, reviewer sign-off, canary + full
cadence monitoring, rollback drill. Owner blanket approval (this run) covers
the sign-off role only when the objective evidence gate is complete.

**REC-02 TERMINAL — KEEP (resume drill passed)** — Subject ActivePath typing
cleanup completed through a genuine minimal-context handoff: executor A
stopped at pushed WIP checkpoint `0625e12` on `rec02-drill/activepath-typing`;
fresh-context executor B (artifacts only, no chat history) answered all five
probe questions correctly and completed subject commit `b73d6d4` (+2 lines:
`sourceName?`/`sourceFamily?` declared on `ActivePath`); independent critic
SHIP 5/5, independently reproducing focused 16/0/65 and full G3
636/0/1,531 assertions across 70 files; merged to main via `b07d86f`; CI/deploy
`32612673834` success including production Pages deploy. Drill branch and
worktree `.worktrees/rec02-drill` retained pending human no-unique-work
confirmation. Proven process improvements now in force: (1) fresh worktrees
need their own `bun install --frozen-lockfile`; (2) batons anchor on symbol
names, never line numbers.
Evidence: `docs/gauntlet/evidence/REC-02-resume-drill.md`.

- Branch: `main`; worktree clean at each commit; run started at `d7e7e15`
  (clean, synchronized with origin/main).
- Commits this run (all pushed to origin/main): `b3fb922` (DATA-05B
  acceptance evidence + STATUS + artifacts), `5fb1418` (baton refresh),
  `a1fa02a` (REC-02 incomplete checkpoint baton; absorbed automation commits
  `c946cb4`, `6d0ee5e`), merge `b07d86f` (REC-02 subject: `0625e12` +
  `b73d6d4` from drill branch).
- CI/deploy this run: `32611329054` (`b3fb922`) success docs-only;
  `32612089332` (`a1fa02a`) success docs-only; `32612673834` (`b07d86f`)
  success incl. production Pages deploy.
- Last Gauntlet decisions this run: DATA-05B — KEEP; REC-02 — KEEP.
  Before that (run 4): REL-11 KEEP; SRC-4E KEEP.
- Current implementation unit queue:
  `SRC-4D` VERIFYING (post-rollup due on/after 2026-08-24T19:00Z),
  `COMP-01B` PLANNED (window matures 2026-08-24T12:38Z),
  future candidates: post-SRC-4D live Jobicy Doctor re-probe,
  provenance backfill for company-consistent note rows (DATA-05B residual),
  worktree cleanup dispositions (owner-gated per REC-01).
- Ownership boundary unchanged: `remotephjobs.com` external;
  `remotejobs-ph.pages.dev` is this project's production site.

## Historical checkpoint — run 4 / REL-11 + SRC-4E (2026-08-23)

Status: **SRC-4E TERMINAL — KEEP (diagnosis-only) and REL-11 TERMINAL — KEEP
(behavior fix deployed)**.

**SRC-4E** — The Jobicy supporting-feed "CDATA is not closed" SCHEMA_BROKEN
observation was a Source Doctor measurement artifact:
`packages/scraper/source-doctor.ts` sliced every static-source body to
`MAX_BODY_BYTES` (256 KiB) before parsing, cutting the ~40-item supporting feed
mid-CDATA, while the ingestion path parses full bodies via
`conditionalFetchText`. Production D1 (read-only, `changed_db=false`
throughout): ZERO parse errors ever across 113,342 fetch events; only Jobicy
failures ever recorded are HTTP 429 pairs; supporting feed parsed 40 items as
recently as 2026-08-22T21:10Z. Local synthetic reproduction matrix against
fast-xml-parser 5.10.1 produces the exact error string only for
truncation-mid-CDATA. CONSEQUENCE FOR SRC-4D: discount the SCHEMA_BROKEN half
of the 2026-08-22T22:18Z observation; its HTTP-200-no-429 half remains a
favorable interim signal; the D1 post-rollup gate is unchanged.
Evidence: `docs/gauntlet/evidence/SRC-4E-jobicy-supporting-cdata-diagnosis.md`.

**REL-11** — Fix deployed: `f2a84be` makes the Doctor static probe parse the
full fetched body (deletes `MAX_BODY_BYTES`) and adds a >256 KiB CDATA
regression test (283,353-char synthetic fixture → HEALTHY_WITH_RESULTS,
itemCount=8, full byte accounting). Red/green proven: same fixture through the
old slice path throws exactly "CDATA is not closed.". Local G3 at `f2a84be`:
635 tests, 0 failures, 1,529 assertions; typecheck/guardrails/build exit 0.
Fresh independent critic **SHIP** (zero blocking/important findings; one
cosmetic nit fixed pre-commit; one PRE-EXISTING out-of-contract finding
recorded: `ActivePath` type lacks declared `sourceName`/`sourceFamily` fields
assigned in code — future bounded typing unit candidate). CI/deploy
**`32609833176` success on the exact SHA including production Pages deploy**.
No live Jobicy re-probe performed or permitted yet (SRC-4D window still open).
Evidence: `docs/gauntlet/evidence/REL-11-doctor-rss-truncation-fix.md`.

Docs hygiene also done this run: STATUS rows for REC-01, OPS-06, DATA-03
(terminal KEEP each) and SRC-4D (VERIFYING with gate details) refreshed from
commit-history evidence (`6f5a630`).

**DATA-05B remains VERIFYING/BLOCKED at the human-approved evidence gate** —
code deployed (`6e31cd7f`; CI/deploy `32605834663` applied migration 0033);
fresh read-only report recorded (344 unclassified / 35 note-evidence / 39
shared-host / 17 mismatch); NO mutation has occurred or is authorized without
an owner-approved evidence file (exact IDs + expected old values), then
apply-sql dry-run → guarded per-row apply → undo artifact → route smoke.

**SRC-4D remains VERIFYING (48h live window)** — behavior `90f3243`, CI/deploy
`32592205884`, production Pages deploy ~2026-08-22T18:57Z starts the ≥48h post
window. Interim signals: HTTP 200s on both feeds (no 429) per the 22:18Z probe
(parse half now attributed to the SRC-4E artifact); D1 shows paired cadence
skips operating and only one post-deploy 429 pair event so far (00:00:39Z Aug
23, supporting feed fetch-level). NEXT EXACT ACTION: on/after 2026-08-24T19:00Z
run the read-only D1 post-rollup (per-feed attempts / HTTP 429s / deferrals /
backoff skips / publication lag from `source_fetch_events` since
`2026-08-22T18:57:00Z`), append it to
`docs/gauntlet/evidence/SRC-4D-jobicy-cadence-diagnosis.md`, then decide KEEP
or pause-Jobicy per contract.

- Branch: `main`; worktree clean at each commit; run started at `0abe1a4`
  (clean, synchronized with origin/main).
- Commits this run (all pushed to origin/main): `6f5a630` (STATUS refresh +
  SRC-4E PLANNED contract), `8237171` (SRC-4E diagnosis evidence + baton),
  `90f52b8` (REL-11 PLANNED contract), `f2a84be` (REL-11 behavior + test),
  plus the final docs/baton commit.
- CI/deploy this run: `32608128086` (`6f5a630`) success docs-only;
  `32608675912` (`8237171`) success docs-only, deploy skipped;
  `32609833176` (`f2a84be`) success incl. production Pages deploy.
- Ownership boundary: `remotephjobs.com` is an external site;
  `remotejobs-ph.pages.dev` is this project's production site. External-source
  indexing is allowed only through the existing compliance policy and never
  implies ownership.
- Planning baseline: `bd84cc1`
- Last accepted production behavior commits: `f00478c`/`041bc2c` (DATA-06B,
  KEEP); `90f3243` (SRC-4D, VERIFYING); `6e31cd7f` (DATA-05B code slice,
  deployed, awaiting approval-gated data step); `f2a84be` (REL-11, KEEP).
- Current scheduled evidence: watchdog runs continue hourly; their payloads
  remain evidence to inspect, not blanket health acceptance.
- Last Gauntlet decisions this run: `REL-11` — KEEP; `SRC-4E` — KEEP
  (diagnosis). Before that: DATA-06B KEEP; DATA-05B BLOCKED (approval gate).
- Current implementation unit queue:
  `SRC-4D` **VERIFYING** (post-rollup due on/after 2026-08-24T19:00Z),
  `DATA-05B` **BLOCKED at owner approval gate** (mutation step),
  `COMP-01B` (reviewed enforcement; gated on a complete reviewed robots observe
  window plus per-source reviewer sign-off),
  `REC-02` (resume drill; needs owner agreement to synthetic interruption),
  future candidates recorded but not contracted: post-SRC-4D live Jobicy
  Doctor re-probe (expect HEALTHY_WITH_RESULTS), `ActivePath` typing cleanup.

## Historical checkpoint — run 3 / DATA-05B deployed slice (2026-08-23)

Status: **DATA-05B VERIFYING — code deployed + fresh read-only report recorded;
BLOCKED at the human-approved evidence gate (no mutation has occurred)**. The
previous run's code slice is on origin/main at `6e31cd7f`: additive provenance
migration `0033` (`df35fdf`), report/CAS-repair tooling + tests (`848abbe`),
critic hardening (`6e31cd7f`). CI/deploy `32605834663` green on the exact SHA,
including "Apply D1 migrations to production" (0033 applied) and Pages deploy;
watchdog `32605596383` success. Local G3 at head: 634 tests, 0 failures, 1,523
assertions; typecheck EXIT 0. This run executed both read-only report SELECTs
against production D1 (`changed_db=false`, `rows_written=0`) and reconciled:
456 rows / 344 with website / 0 classified; 344 unclassified; 35 with
enrichment-note evidence; 39 rows in 19 shared-host groups; 17 name/host
mismatch. Strongest repair candidates (PENDING OWNER REVIEW, nothing approved):
546 Vidalytics→we-work-remotely.com, 548 Airalo→remotephjobs.ph, 557
Sourcegraph→remote.ph, 575 Impact Clients→highperformancetrain.com, 577
DuckDuckGo→remote.ph, 623 Kindred→remote-ph-jobs.com. Redacted artifact +
sha256 and exact continuation path:
`docs/gauntlet/evidence/DATA-05B-directory-website-provenance.md`. STOP
CONDITION HONORED: contract classifies mutation APPROVAL-GATED; next action
requires owner-approved evidence file (exact IDs + expected old values), then
apply-sql dry-run → guarded per-row apply → undo artifact → route smoke.

**SRC-4D remains VERIFYING (48h live window)** — unchanged gate: behavior
commit `90f3243`, CI/deploy `32592205884`, production Pages deploy
~2026-08-22T18:57Z starts the ≥48h post window. Interim read-only observation
2026-08-22T22:18Z: both `jobicy.com` feeds HTTP 200 (no 429);
`jobicy-supporting-apac` failed XML parse ("CDATA is not closed") →
SCHEMA_BROKEN — favorable interim signal only, not acceptance evidence.
NEXT EXACT ACTION: on/after 2026-08-24T19:00Z run the read-only D1 post-rollup
(per `source_fetch_events` since `2026-08-22T18:57:00Z`), record it in
`docs/gauntlet/evidence/SRC-4D-jobicy-cadence-diagnosis.md`, then decide KEEP
or pause-Jobicy per contract. Follow-up **SRC-4E — Jobicy supporting-feed CDATA
parse failure** stays PROPOSED (needs bounded contract before any change).

- Branch: `main`; worktree clean; this run started/ended at `6e31cd7f`
  (`main` = `origin/main`; base for this run's docs commit).
- DATA-05B code execution start: `5373eae` (clean synchronized tree).
- Ownership boundary: `remotephjobs.com` is an external site;
  `remotejobs-ph.pages.dev` is this project's production site. External-source
  indexing is allowed only through the existing compliance policy and never
  implies ownership.
- Planning baseline: `bd84cc1`
- Last accepted production behavior commits: `f00478c`/`041bc2c` (DATA-06B,
  KEEP); `90f3243` (SRC-4D, VERIFYING); `6e31cd7f` (DATA-05B code slice,
  deployed, awaiting approval-gated data step).
- Doc-hygiene note: this run refreshed the DATA-05B STATUS row only; STATUS
  rows for REC-01, OPS-06, DATA-03, and SRC-4D still lag their terminal
  reality recorded in the baton/commit history; treat the baton as
  authoritative until a dedicated docs pass refreshes them.
- Current scheduled evidence: watchdog runs continue hourly; their payloads
  remain evidence to inspect, not blanket health acceptance.
- Last Gauntlet decision: `DATA-06B` — KEEP; this run's DATA-05B decision:
  BLOCKED (approval gate) pending owner.
- Current implementation unit queue:
  `DATA-05B` **VERIFYING/BLOCKED at human-approved evidence gate** (see above),
  `SRC-4D` **VERIFYING** (48h post-rollup due on/after 2026-08-24T19:00Z),
  `SRC-4E` (PROPOSED — Jobicy supporting-feed CDATA parse failure; needs
  bounded contract before any change),
  `COMP-01B` (reviewed enforcement; gated on a complete reviewed robots observe
  window plus per-source reviewer sign-off),
  `REC-02` (resume drill; needs owner agreement to synthetic interruption).

## Historical checkpoint — planning savepoint run 2 / DATA-06B KEEP (2026-08-23)

Status: **DATA-06B TERMINAL — KEEP**. Owner product decision (2026-08-23):
option (a) trust the stored `category` column on every surface. The
display-time regex reclassifier in `getJobCategory` was deleted
(`apps/web/src/lib/categories.ts` → `return opp.category || 'other'`), so
homepage preview grouping, the `categoryTotals` badge, `/categories/[slug]`,
and `/opportunities` now always agree; stored-`other` jobs render only under
GENERAL & OTHER. Behavior commit `f00478c` + critic-recommended test-hardening
commit `041bc2c` (stored-`other` pinned against all six legacy regex families)
both pushed; CI/deploy runs `32602546093` (incl. production deploy job
`97102984274`) and `32602939487` green; fresh independent critic SHIP with its
one Important test-power recommendation applied in-unit; local G3 at behavior
commit: 606 tests, 0 failures, 1,418 assertions; typecheck/build/guardrails
EXIT 0. Evidence:
`docs/gauntlet/evidence/DATA-06B-ui-category-consistency.md`. Contract row
added to `docs/gauntlet/IMPLEMENTATION_UNITS.md` (owner decision recorded
there). Sole executor; no overlapping work; worktree clean.

**SRC-4D remains VERIFYING (48h live window)** — unchanged gate: the bounded
Jobicy shared-origin cadence fix is deployed (behavior commit `90f3243`, CI/
deploy `32592205884`, production Pages deploy ~2026-08-22T18:57Z starts the
≥48h post window; local G3 at that commit: 602 tests, 0 failures, 1,403
assertions). Interim read-only observation 2026-08-22T22:18Z (~3.4h into
window, this runtime): Source Doctor on both `jobicy.com` feeds returned
**HTTP 200** (no 429) — `jobicy-admin-support-apac` HEALTHY_WITH_RESULTS
(robots allowed, 6 items), `jobicy-supporting-apac` fetched HTTP 200 but
**failed XML parse: "CDATA is not closed." → SCHEMA_BROKEN**. The 200s are
favorable interim signal only, not acceptance evidence; the post-rollup D1
query remains the gate. NEW FINDING (recorded separately, not folded into
SRC-4D): the `jobicy-supporting-apac` CDATA parse failure is not documented
anywhere in the repo; proposed follow-up **SRC-4E — Jobicy supporting-feed
XML parse failure** (diagnosis-first, read-only; needs a bounded contract
before any parser change). NEXT EXACT ACTION: on/after 2026-08-24T19:00Z run
the read-only D1 post-rollup (per-feed attempts / HTTP 429s /
`Deferred by cadence group%` deferrals / `%shared-origin 429 backoff%` skips /
publication lag from `source_fetch_events` since `2026-08-22T18:57:00Z`),
record it in `docs/gauntlet/evidence/SRC-4D-jobicy-cadence-diagnosis.md`, then
decide KEEP or pause-Jobicy per contract. OPS-05, DATA-06, REL-08, COMP-01A,
DB-01, OPS-04, DATA-03, OPS-06, REL-09, SEC-03, REL-10, DATA-05A, DATA-06B
remain KEEP.

- Branch: `main`; this run resumed at `7719b5f`, fast-forwarded clean to
  `bdb6e22` (automation docs-only), behavior base `bdb6e22`, head `041bc2c`
  (`main` = `origin/main`).
- CI/deploy: `32602546093` (`f00478c`) success; `32602939487` (`041bc2c`)
  success; watchdogs `32594161486`/`32597360223`/`32600048103` success
  post-SRC-4D-deploy.
- Ownership boundary: `remotephjobs.com` is an external site;
  `remotejobs-ph.pages.dev` is this project's production site. External-source
  indexing is allowed only through the existing compliance policy and never
  implies ownership.
- Planning baseline: `bd84cc1`
- Accepted planning package and last GitHub backup: `d21cd9e` (superseded by
  `041bc2c` on origin/main)
- Last accepted production behavior commits: `f00478c`/`041bc2c` (DATA-06B,
  KEEP); `90f3243` (SRC-4D, VERIFYING).
- Doc-hygiene note (no unit): `IMPLEMENTATION_UNITS.md` STATUS rows for REC-01,
  OPS-06, DATA-03, and SRC-4D lag their terminal reality recorded in the
  baton/commit history (`451b76e`, `539b65b`, `6146290`, `90f3243`); treat the
  baton as authoritative until a docs-only pass refreshes them.
- Current scheduled evidence: watchdog runs continue hourly; their payloads
  remain evidence to inspect, not blanket health acceptance.
- Last Gauntlet decision: `DATA-06B` — KEEP.
- Current implementation unit queue:
  `SRC-4D` **VERIFYING** (48h post-rollup pending; see above),
  `DATA-05B` (provenance repair; mutation needs human-approved evidence file),
  `SRC-4E` (PROPOSED — Jobicy supporting-feed CDATA parse failure; needs
  bounded contract before any change),
  `COMP-01B` (reviewed enforcement; gated on a complete reviewed robots observe
  window plus per-source reviewer sign-off),
  `REC-02` (resume drill; needs owner agreement to synthetic interruption).
  `DATA-06B` closed KEEP this run.

### Historical checkpoint — DATA-06 (2026-08-22)

Status: **DATA-06 TERMINAL — KEEP**. Taxonomy/triage-decision convergence
shipped and verified: the three new-item ingestion decision paths (inline scrape
loop, inline pending-triage drain, Inngest drain) now share one `decideTriage` +
`mapTriageCategoryToUiCategory` contract; the private duplicate mapper in
`scrape.ts` was removed; a 30-case labelled eval corpus + cross-path anti-drift
guard lock the contract. Behavior-preserving (1:1 branch parity, fresh critic
SHIP); no model/prompt/schema/source change. Two deliberate exceptions
documented: the cheap-8B unclear-sweep keeps its distinct ladder, and the
display-side `getJobCategory` homepage/category inconsistency is escalated as a
new follow-up **DATA-06B** (user-visible product-taxonomy decision). REL-08
Source Doctor V1 remains KEEP. COMP-01A fully committed with DB layer. DB-01
rehearsal passes fresh and legacy chains (85/85 schema assertions, 32
migrations). OPS-04, DATA-03, OPS-06 remain KEEP. DATA-05A, REL-09, SEC-03,
REL-10 remain KEEP.

- Branch: `main`
- OPS-04 execution start: `6146290` (`main` = `origin/main` at start).
- DATA-03 execution start: `539b65b` (`main` = `origin/main` at start).
- OPS-06 execution start: `060b2db` (`main` = `origin/main` at start).
- COMP-01A execution start: `a75f8a8` (`main` = `origin/main` at start).
- REL-08 execution start: `e2c89e1` (`main` = `origin/main` at start).
- DATA-06 execution start: `c6ea703` (`main` = `origin/main` at start; behavior
  developed on `codex/data-06-taxonomy-convergence`, fast-forwarded to `main`).
- DB-01 rehearsal fix: `af960d7` (updated expected migration count to 32).
- Ownership boundary: `remotephjobs.com` is an external site;
  `remotejobs-ph.pages.dev` is this project's production site. External-source
  indexing is allowed only through the existing compliance policy and never
  implies ownership.
- Planning baseline: `bd84cc1`
- Accepted planning package and last GitHub backup: `d21cd9e`
- Planning-package CI: GitHub Actions run `32552942171` passed validation;
  production migration/deploy was correctly skipped for a docs-only change.
- Last accepted production behavior commit: `a014e71` (DATA-06 taxonomy/triage-decision convergence).
- Last accepted behavior deployment: GitHub Actions CI run `32579585128` passed full suite (569 tests, 1,335 assertions, typecheck, build, guardrails, D1 migrations applied, FTS verified, Pages deployed; deploy job `97046920502`).
- Current scheduled evidence: watchdog `32563229451`, Hunter `32563299530`, CI `32563188313` completed successfully. Their payloads remain
  evidence to inspect, not blanket health acceptance.
- Last Gauntlet decision: `DATA-06` taxonomy/triage-decision convergence — `KEEP`.
- Current implementation unit: `OPS-05` (alert lifecycle) / `SRC-4D` (Jobicy cadence; needs 48h live evidence) / `DATA-05B` (provenance repair; needs human-approved evidence) — PLANNED, dependency-ready after REL-08. `COMP-01B` (reviewed enforcement) — PLANNED but gated on a complete reviewed robots observe window. `DATA-06B` (UI category consistency) — new follow-up spun out of DATA-06; user-visible product-taxonomy decision.
- DATA-03 code commits: `1cca4b3` (generator + read-only workflow + fixture
  test) and `feb5f0b` (run cohorts per-command after a dispatched run proved
  multi-statement `--file` returns only a summary). Local G3: 495 tests, 0
  failures, 1,155 assertions; typecheck, build, guardrails passed; focused
  cohort test 14/14.
- DATA-03 D1 read: `workflow_dispatch` run `32565032655` (head `feb5f0b`)
  succeeded read-only (`rows_written: 0`, `changed_db: false`). asOf
  `2026-08-22T00:00:00Z`; cutoffs stale=`2026-07-23`, unseen=`2026-08-08`.
- DATA-03 baseline: 4,828 total / 1,283 active / 3,545 inactive. Active cohorts:
  stale-30d `623`, unseen-14d `399`, never-verified `16`, missing-company `48`,
  undated `0`. All 10 reconciliation deltas `0`. Active `1,283` matches E-03
  public opportunities count. Key stratified findings: 45 of 48 missing-company
  rows are Jobicy (100% of its active rows); staleness/`unclear` concentrate in
  ATS engineering feeds; 49 duplicate groups / 74 excess rows dominated by
  same-company Remote.com APAC reposts. Evidence:
  `docs/gauntlet/evidence/DATA-03-quality-baseline.md`. No mutation authorized.
- OPS-04 behavior commit: `83f94d0` (`feat(directory): expose bounded egress
  diagnostics`). Adds a runtime-agnostic `classifyUnreachableError()` taxonomy
  (TIMEOUT/DNS/TLS/CONNECT/EGRESS_BLOCKED/REQUEST_ERROR/UNKNOWN_NETWORK) + a
  `<=40`-char cause code, populates `unreachableCode/unreachableReason`,
  aggregates per-run reason counts + capped redacted hostname samples in the
  audit response, and surfaces the distribution in the digest/job summary.
  Strikes, de-verify threshold, visibility, URL immutability, 40-row budget,
  concurrency 8, and the 80% systemic gate are unchanged.
- OPS-04 local G3: 513 tests, 0 failures, 1,191 assertions; typecheck, build,
  guardrails passed (bun 1.3.14). Focused: scraper linkHealth 33/33, web
  directory-health 8/8.
- OPS-04 CI/deploy: run `32568634636` success (full suite, D1 migrations, FTS
  verify, Pages deploy job `97020879509`).
- OPS-04 live evidence: two Cloudflare cohorts — run `32568721809` (#1) checked
  40 → 5 unreachable, all `EGRESS_BLOCKED`, ratio 12.5%, not degraded; run
  `32568795476` (#2) checked 40 → 0 unreachable, ratio 0%. Bounded cross-runtime
  probe re-checked the five #1 hosts (`ph.indeed.com`, `ph.jobstreet.com`,
  `hellorache.com`, `jobquest.ph`, `bottleneck.ph`) from a non-Cloudflare
  runtime: 2 bot_wall (HTTP 403, alive), 3 ok (HTTP 200), 0 dead. Supported
  cause: Cloudflare egress-side transport failure, not origin death; no strike
  change warranted. Auto-digest sync commits `a329efc`, `1e9f863`. Evidence:
  `docs/gauntlet/evidence/OPS-04-unreachable-diagnosis.md`. Remediation (a
  non-Cloudflare probe path) is a separate future unit, not folded into OPS-04.
- OPS-06 local verification: `bun test` passed 481 tests with 1,113 assertions and zero failures; `bun run typecheck`, `bun run build`, and `bun run audit:guardrails` passed locally on 2026-08-22; focused test `hunter-recovery.test.ts` 10/10 passed.
- OPS-06 commit: `62acf5a`; GitHub Actions CI run `32563188313` passed.
- Manual Hunter run `32563299530` completed: single scrape invocation, terminal state `needs-rerun` (zero new jobs after dedup), lock state `free`, backlog `0`, zero failed sources, zero insert errors; artifact `hunter-health-32563299530` uploaded.
- Accepted DATA-05A behavior: source-attributable apply URLs, legacy click
  fallback, directory inference removal, and exact incident repair.
- Fresh read-only pre-migration D1 inventory: 169 cross-source application
  rows, 8 reviewed directory assignments, 0 current same-source rows;
  `changed_db=false`, 0 rows written.
- Post-deploy acceptance: exact-host cross-source rows `0`; reviewed directory
  assignments remaining `0`; eight reviewed rows repaired; first enrichment
  run `32555452346` returned `websiteSet=0`; bounded Hunter run `32556180387`
  exposed zero quarantines/anomalies and recorded 42/42 fetch events.
- Fresh local acceptance at automation-advanced `d269755`: 457 tests, 0
  failures, 1,210 assertions; typecheck, build, and guardrails passed.
- REL-09 acceptance: baseline run `32542676422` reproduced 49 successes/71
  failures at 120 rows. A 40-row canary passed, but the next canary
  `32556609049` exposed five redirect-driven platform-budget failures and
  correctly failed the workflow. Corrective commit `137a3ff` caps one redirect
  hop and 20 rows, for at most 40 external fetches under the 50-request ceiling.
- Final live rotations `32556799462` and `32556821369` each passed 20/20 with
  zero platform-budget failures. Current active backlog 1,267 implies a
  measured 32-day sweep at two runs per day.
- Fresh REL-09 G3: 461 tests, 0 failures, 1,026 assertions; typecheck, build,
  and guardrails passed.
- SEC-03 acceptance: behavior commit `6c48810` centralizes exact-host-or-dot-
  subdomain matching across source trust and all five ATS families. Known-good
  configured hosts retained 100% parity and all malicious concatenated suffix
  fixtures failed closed; no allowlist or dependency changed.
- Fresh SEC-03 G3: 464 tests, 0 failures, 1,053 assertions; typecheck, build,
  guardrails, CI/deploy run `32557360004`, and live Prospector run `32557448855`
  passed. The live run returned HTTP 200 with 4 considered, 0 eligible/added,
  3 review-only, 1 quality rejection, 0 ATS proposals, and no guard trip.
- DB-01 acceptance: rehearsal script `scripts/ci/rehearse-d1-migrations.ts`
  passes fresh and legacy database rehearsals locally (85/85 schema assertions, 32 migrations including 0032); CI/deploy run `32574532452` passed full suite (520 tests, 1,207 assertions, typecheck, build, guardrails, D1 migrations applied, FTS verified, Pages deployed). Production smoke: `/`, `/directory`, `/opportunities` all return HTTP 200.
- REL-10 acceptance: behavior commit `5690d54` adds `phEligibility` to the
  homepage slim projection, types the card projection as `OpportunityCardData`,
  and adds 7 focused contract tests. Local verification: 471 tests, 0 failures,
  1,077 assertions; typecheck, build, and guardrails passed. CI/deploy run
  `32561624073` passed full suite (471 tests, 1,077 assertions, typecheck,
  build, guardrails, Pages deployed). Production smoke: `/`, `/directory`,
  `/opportunities` all return HTTP 200.
- COMP-01A acceptance: behavior commit `c992dfe` extends `source_fetch_events`
  with 6 robots columns (robots_origin, robots_verdict, robots_evidence,
  robots_crawl_delay, robots_would_block, robots_mode) via migration
  `0032_source_fetch_events_robots_evidence.sql`; adds robots.txt checking for
  all 5 ATS endpoint families (Lever, Greenhouse, Workable, Breezy, Ashby);
  exports `atsEndpointUrl`; updates `FETCH_EVENT_COLUMNS` to 18; adds 7 ATS
  robots integration tests. DB layer committed at `60f4838` (schema + migration).
  Local verification: 520 tests, 0 failures, 1,207 assertions; typecheck, build,
  guardrails passed. CI/deploy run `32573525387` (app layer) and `32574532452`
  (full with DB layer) passed full suite.
- REL-08 acceptance: behavior commit `4c33d96` adds `packages/scraper/source-doctor.ts`,
  `packages/scraper/source-doctor.test.ts` (14 tests, all nine outcomes covered),
  `scripts/source-doctor.ts` CLI. Local verification: 534 tests, 0 failures,
  1,264 assertions; typecheck, build, guardrails passed. CI/deploy run
  `32576239721` passed full suite. Four fixture runs: enabled RSS (We Work
  Remotely), enabled JSON (Remote OK), paused (ProBlogger), unknown ID — all
  produce correct terminal outcomes. Request budget bounded (≤2 for static).
  Zero mutations, zero AI calls, zero D1 writes.
- DATA-06 acceptance: behavior commit `a014e71` converges the three new-item
  ingestion decision paths onto the shared `decideTriage` +
  `mapTriageCategoryToUiCategory`, removes the private duplicate mapper in
  `scrape.ts`, additively enriches the `ai-unavailable` verdict variant to carry
  the failed `triage` (preserving diagnostics), and adds a 30-case labelled eval
  corpus (`packages/scraper/fixtures/triage-eval.json`) + cross-path anti-drift
  guard (`packages/scraper/triage-eval.test.ts`). Behavior-preserving (verified
  1:1 branch parity; fresh independent critic verdict SHIP). Local verification:
  569 tests, 0 failures, 1,335 assertions; typecheck, build, guardrails passed.
  CI/deploy run `32579585128` passed full suite (D1 migrations, FTS, Pages
  deploy). Production smoke `/`, `/directory`, `/opportunities`, `/categories/tech`
  all HTTP 200. Two deliberate exceptions documented in
  `docs/gauntlet/evidence/DATA-06-taxonomy-convergence.md`: cheap-8B unclear-sweep
  ladder kept distinct; display-side `getJobCategory` unification escalated as
  new follow-up DATA-06B. No model/prompt/schema/source change; zero D1 writes by
  the change itself.
- Supplemental dependency audit found 2 high, 4 moderate, and 4 low existing
  Astro-toolchain advisories; remediation remains separately scoped debt.
- Next exact action: execute `OPS-05` (alert lifecycle — cleanest single-session
  terminal, lowest blast radius) or begin `SRC-4D` (Jobicy cadence; diagnosis +
  fix now, but KEEP needs 48h live evidence). `DATA-05B` (provenance repair) is
  dependency-ready but its mutation needs a human-approved evidence file.
  `COMP-01B` remains gated on a complete reviewed robots observe window.
  `DATA-06B` (UI category consistency) is a new user-visible product-taxonomy
  decision. Source expansion remains frozen. OPS-04 follow-on (non-Cloudflare
  link-health probe) remains a separate future unit.

Canonical planning artifacts:

- [Master Execution Plan](./MASTER_EXECUTION_PLAN.md)
- [Portable Implementation Units](./gauntlet/IMPLEMENTATION_UNITS.md)
- [Agent-Reach Study](./research/agent-reach-study-2026-08-22.md)

Automated digest commits may advance `main`; executors must fetch/rebase and
record the actual starting SHA without silently changing the accepted behavior
baseline above.

## Historical Savepoints

Everything below is preserved as append-only recovery history. Where a section
calls itself "current," it is superseded by the 2026-08-22 planning savepoint
above unless explicitly cited as the last accepted production behavior.

### Accepted Production Savepoint — 2026-08-21

Branch: `main`
Implementation HEAD: `a44972e`
Repository: `cyalcala/va-freelance-hub`

The 10-minute freshness and responsive Agencies fixes are deployed. Worker run
`32471235256` and CI/Pages runs `32471235312` and `32472691564` succeeded. Final
CI acceptance was 447 tests with 0 failures and 1,169 assertions plus strict
typecheck, production guardrails, Astro build, and Worker deployment dry-run. See
`docs/karpathy-freshness-mobile-gauntlet-2026-08-21.md` for root-cause and risk
evidence. The first post-deploy D1 heartbeat was clean at
`2026-08-21T10:20:39.440Z`; responsive production verification was console-clean.
This supersedes the older paused-branch savepoint below as the current production
recovery point.

### Current Savepoint

Date: 2026-08-10
Branch: codex/production-apex-audit-2026-08-09
Repository: cyalcala/va-freelance-hub
Status: owner-requested stop-point backup. The branch contains unmerged,
undeployed production-hardening work. The primary code checkpoint is 33c1995,
pushed to origin/codex/production-apex-audit-2026-08-09.

GitHub Actions evidence: an immediate branch query returned no workflow run.
The CI guardrail only triggers for main and pull requests; this backup must not
be mistaken for CI or production acceptance.

Read docs/major-production-audit-2026-08-10.md for the five-track ledger and
docs/decisions/ADR-005-cloudflare-pages-compatibility-line.md before changing
the framework, Pages deployment model, D1 schema, or workflows. Migrations
0028 and 0029 are local-verified only and must not be treated as deployed.

### Last Accepted Production Baseline

Date: 2026-08-09
Branch: `main`
Repository: `cyalcala/va-freelance-hub`

Latest accepted checkpoint:

- `5bc6d09` - `Merge branch 'codex/major-quality-audit-2026-08-09'`
- Source implementation: `2ea2226` - `fix: harden production quality guardrails`
- Audit: `docs/major-code-audit-2026-08-09.md`
- Decision: `docs/decisions/ADR-004-migrate-before-deploy-and-validate-fts.md`
- Local verification: `bun run verify` passed on the merged tree (190 tests,
  0 failures, 354 assertions; strict TypeScript; Astro production build) and
  changed workflow YAML parsed with PyYAML.
- Production acceptance: GitHub Actions run `31317525008` passed validation,
  D1 migration, remote FTS integrity, and Pages deploy in sequence. Public
  smoke checks returned 200 for `/`, `/opportunities`,
  `/opportunities?q=assistant`, and `/directory`.

Previous savepoint:

Date: 2026-07-04
Branch: `main`
Repository: `cyalcala/va-freelance-hub`

Latest implementation commit (pending push):

- `fix: eliminate silent errors found in 2026-07-04 major audit`
- Audit report: `docs/major-audit-2026-07-04.md`
- Scope: chunked source_fetch_events inserts under the D1 100-parameter limit
  (S-1, broken silently since 2026-06-13); prune rewritten from hard-DELETE to
  company-scoped soft-archive (S-2); triage failures, cadence-guard state, and
  fetch-event outcomes surfaced in scrape responses with Hunter/verifier/prune
  workflow annotations (S-3, S-5/S-6); verifier throughput raised to 120/run
  with `neverVerifiedRemaining` backlog reporting (S-4); new shared batching
  helper `packages/scraper/batch.ts` with regression tests.
- Verification: `bun test` 70/70; `bun run --cwd apps/web build` passed;
  `git diff --check` passed. Production acceptance steps in the audit doc.

Previous implementation commit (pushed as `aa03741`):

- `feat: import gold777.xlsx directory entries and verify ats expansion`
- Handoff doc: `docs/gold777-directory-import-2026-07-04.md`
- Evidence:
  - Cross-referenced `gold777.xlsx` (79 rows) against production `va_directory` (265 rows); imported 32 new companies via `apps/web/gold777_imports.sql`, bringing the total to 297.
  - Confirmed 4 live public ATS endpoints by direct probe (not guessed) and wired `va_directory` rows to match already-uncommitted scraper code: `greenhouse:gitlab`, `greenhouse:ghost`, `greenhouse:remotecom`, `breezy:time-etc`.
  - Left all unconfirmed ATS token guesses (Zapier, Buffer, Doist, Automattic, ClickUp, Wise, Canva, Shopify, Help Scout, Wishup, Atlassian) as directory-only entries.
- Verification:
  - Local D1 dry-run passed (32/32 statements).
  - Production D1 import verified: `SELECT COUNT(*) FROM va_directory` went 265 -> 297.
  - `bun test` passed (61/61 tests).
  - `bun run --cwd apps/web build` passed.
- Credentials: no new credentials introduced; reused existing `gh` CLI GitHub login and existing local Wrangler/Cloudflare OAuth login already configured on this machine.

Previous stop-point handoff:

- `docs/gemini-masterplan-handoff-2026-06-13.md`
- Captures the current Gemini-ready masterplan after Gemini's payload/test work
  and Codex's QA follow-up. It records the `e719a2c` CI-test guardrail
  checkpoint, current source posture, ordered next workstreams, verification
  commands, and stop conditions.
- User asked to document a masterplan so Gemini can implement and Codex can QA
  at the end.

Previous stop-point handoff:

- `docs/remote-ok-json-source-handoff-2026-06-13.md`
- Captures the accepted Remote OK JSON adapter, direct-link compliance posture,
  source-specific quality filter, cleanup migration, workflow evidence, and
  production D1 snapshot.
- User asked to stop feature work and let another AI take over.

Previous source-expansion evidence:

- `docs/source-expansion-2026-06-12.md`
- Captures the accepted bounded RSS source expansion, source fetch caps,
  durable cadence tracking, production D1 source-state snapshot, deployment
  recovery note, Hunter evidence, and next safe source work.
- Real Work From Anywhere and Jobicy Admin Support APAC are now enabled as
  capped, cadence-guarded `allowed` RSS sources. Remote OK remains deferred
  until a JSON adapter exists.

Previous handoff document:

- `docs/goldilocks-source-expansion-handoff-2026-06-12.md`
- Captures the current balanced source-compliance posture, source evidence,
  candidate source plan, ingestion cadence/cap requirements, and indexing
  follow-up plan.
- This plan has now been partially executed: Jobicy and Real Work From Anywhere
  are enabled with caps and cadence; Remote OK still requires a JSON adapter.

Last accepted implementation commit:

- `e2b856e` - `feat: import dayshift directory updates and document ATS expansion opportunities`
- Supporting product/CI commits:
  - `c180925` - `feat: fix silent freshness bug, tune scraper limit/cadence, and import work777.xlsx directory entries`
  - `f9f9a43` - `fix: pre-filter obvious non-English and local European roles during triage`
  - `b360d29` - `docs: finalize README and handoff docs for Masterplan completion`
  - `70ff8cf` - `feat: add Jobicy Customer Support APAC RSS source feed`
  - `0ac3907` - `feat: optimize directory query with company name index, run audit for 2026-06-13`
  - `0f522fe` - `feat: complete data quality snapshot and stale policy pruning for 2026-06-13`
  - `020ba7d` - `docs: add breezy source review findings`
  - `2b91c68` - `feat: add compact source-health history logs, database schema and migration`
  - `e719a2c` - `ci: run unit tests in guardrail`
  - `3036a53` - `docs: update implementation status and system savepoint with F-09 post-handoff details`
  - `8d499df` - `feat: reduce payload size by slimming DB projections, add Remote OK unit tests`
- Evidence:
  - `e2b856e` imported/updated 8 dayshift companies in D1, mapped Workable/Lever ATS tokens, and documented expansion opportunities.
  - `c180925` resolved the silent freshness bug, increased processing limit to 50, reduced Remote OK min interval to 60 min, and successfully imported 22 new companies to D1 directory.
  - `e719a2c` added `bun test` to `.github/workflows/ci-guardrail.yml`.
  - `8d499df` slimmed homepage and directory DB projections.
  - `8d499df` added 54 Remote OK unit tests.
- Verification:
  - `bun test` passed (54/54 tests).
  - `bun run --cwd apps/web build` passed.
  - `git diff --check` passed.
  - `bunx wrangler d1 migrations apply remoteph-jobs-db --local` & `--remote` executed successfully.
  - Production smoke returned 200 for `/`, `/directory`, `/opportunities`, and
    `/categories/tech`.
  - Read-only D1 snapshot reported 878 active opportunities, 38 active RemoteOK
    rows, 4 inactive RemoteOK cleanup rows, and 0 active RemoteOK
    physical/logistics outliers.

Previous accepted implementation commit:

- `8d499df` - `feat: reduce payload size by slimming DB projections, add Remote OK unit tests`
- Supporting product commit:
  - `4c2374b` - `fix: filter remote ok physical roles`
  - `92ca443` - `feat: add remote ok json source`
- Generated rollup commit:
  - `562355e` - `docs: update daily source health`
- Evidence report: `docs/remote-ok-json-source-handoff-2026-06-13.md`
- Build: `bun run --cwd apps/web build` passed.
- Tests: `bun test packages/scraper/json.test.ts` passed.
- CI guardrail: `27435140046` passed for `92ca443`.
- Production deployment: `b8b04c38-2b56-42e6-89df-2b980c6a6266`.
- D1 migration workflow: `27435636177` passed for
  `0015_remote_ok_quality_filter.sql`.
- Hunter evidence:
  - manual Hunter `27435248150` passed with Remote OK JSON count 33 in the
    first loop, 25 accepted/attempted inserts total, 0 failed sources, 0 failed
    insert batches, and 0 insert errors;
  - source-health rollup `27450540244` passed and refreshed
    `docs/source-health-latest.md`;
  - later scheduled Hunter `27457196402` passed on `562355e`.
- Read-only D1:
  - 878 active opportunities;
  - 38 active RemoteOK rows;
  - 4 inactive RemoteOK cleanup rows;
  - 0 active RemoteOK physical/logistics outliers;
  - `source_fetch_state.remote-ok` has last count 26 and no last error.

Previous accepted implementation commit:

- `b948828` - `fix: preserve paused source skip reasons`
- Supporting product commit:
  - `686e312` - `feat: add cadence guarded rss sources`
- Generated rollup commit:
  - `79e46f8` - `docs: update daily source health`
- Evidence report: `docs/source-expansion-2026-06-12.md`
- Build: `bun run --cwd apps/web build` passed.
- D1 migration workflow: `27422527574` passed.
- CI/deploy run: `27422527473` passed.
- Skip-reason CI run: `27422888691` passed.
- Production deploy recovery:
  - manual Cloudflare Pages deployment
    `8863383f-2f01-4c64-8110-51b8e8d5f222` successfully deployed `b948828`
    after Cloudflare marked the async Pages deployment as failed.
- Hunter evidence:
  - run `27422685577` passed with 25 accepted/attempted inserts, 0 failed
    sources, 0 failed insert batches, and 0 insert errors;
  - run `27423455086` passed with cadence skips for Real Work From Anywhere and
    Jobicy plus readable paused-source skip reasons;
  - rollup-writing run `27423574670` passed and refreshed
    `docs/source-health-latest.md`;
  - read-only D1 reports 797 active opportunities and four healthy
    `source_fetch_state` rows.

Previous accepted implementation commit:

- `6304ea4` - `fix: require token review for breezy ats`
- Generated rollup commit:
  - `14db966` - `docs: update daily source health`
- Audit report: `docs/ats-policy-follow-up-2026-06-12.md`
- Build: `bun run --cwd apps/web build` passed.
- CI/deploy run: `27372929451` passed.
- Hunter evidence:
  - direct probes for current Breezy JSON endpoints returned 200;
  - Hunter run `27372988265` had one transient `20Four7VA` timeout;
  - retry Hunter run `27373090226` passed with 0 failed sources, 0 failed insert
    batches, and 0 insert errors;
  - rollup-writing run `27373196600` passed and refreshed
    `docs/source-health-latest.md`;
  - unknown future Breezy tokens now default to `paused`.

Previous accepted implementation commit:

- `aa670ee` - `fix: pause unreviewed ats platforms`
- Generated rollup commit:
  - `f635f3f` - `docs: update daily source health`
- Audit report: `docs/ats-policy-follow-up-2026-06-12.md`
- Build: `bun run --cwd apps/web build` passed.
- CI/deploy run: `27372355271` passed.
- Hunter evidence:
  - manual run `27372436554` passed with 0 failed sources, 0 failed insert
    batches, and 0 insert errors;
  - rollup-writing run `27372521005` passed and refreshed
    `docs/source-health-latest.md`;
  - Workable ATS rows now report `complianceStatus: "paused"`;
  - Breezy remains enabled as `needs_review`.

Previous accepted implementation commit:

- `ad03990` - `chore: upgrade wrangler for current cloudflare config`
- Audit report: `docs/wrangler-d1-audit-2026-06-12.md`
- Build: `bun run --cwd apps/web build` passed.
- Install integrity: `bun install --frozen-lockfile` passed.
- CI/deploy run: `27371741236` passed.
- Wrangler: active local CLI reports `4.100.0`.
- D1 local audit:
  - `bunx wrangler d1 info remoteph-jobs-db` passed with no `ratelimits`
    config warning;
  - active opportunities: 748;
  - homepage query plan uses `active_posted_idx`;
  - category query plan uses `category_active_posted_idx`;
  - read-only probes returned `changed_db: false`.
- Production smoke: `/`, `/opportunities`, `/opportunities?page=2`,
  `/directory`, `/data-policy`, `/privacy`, `/categories/tech`, and
  `/categories/tech?page=2` returned 200.
- Protected scrape route: unauthenticated `POST /api/cron/scrape` returned 401.

Previous accepted implementation commit:

- `ae72998` - `chore: stop tracking local wrangler state (F-03)`
- Supporting commits:
  - `e861071` - `fix: reduce D1 scrape insert batch size (F-01)`
  - `45e2f2d` - `fix: paginate category pages server-side (F-02)`
- Generated rollup commit:
  - `6e76c67` - `docs: update daily source health`
- Audit report: `docs/major-audit-2026-06-11.md`
- Build: `bun run --cwd apps/web build` passed.
- CI/deploy runs: `27353756293`, `27353939869`, and `27354017177` passed.
- Production smoke: `/`, `/opportunities`, `/opportunities?page=2`,
  `/directory`, `/data-policy`, `/privacy`, `/categories/tech`, and
  `/categories/tech?page=2` returned 200.
- Category payload: `/categories/tech` dropped from about 980 KB to about
  94 KB after server-side pagination.
- Protected scrape route: unauthenticated `POST /api/cron/scrape` returned 401.
- Hunter recovery evidence:
  - manual run `27354089629` passed with 35 accepted/attempted inserts, 0 failed
    insert batches, 0 insert errors, and 0 failed sources;
  - rollup-writing run `27354219672` passed and refreshed
    `docs/source-health-latest.md`.
- Source-health rollup: `docs/source-health-latest.md` reports 0 failed sources
  and 0 insert errors for run `27354219672`.
- Verification limit resolved by the 2026-06-12 follow-up: local direct
  Wrangler D1 reads now work with Wrangler v4.

Previous accepted implementation commit:

- Final acceptance audit and README update
- Build: `npm.cmd run build --workspace apps/web` passed.
- Production smoke: `/`, `/opportunities`, `/directory`, `/data-policy`,
  `/privacy`, and `/categories/tech` returned 200.
- D1 snapshot: 688 active rows, 0 missing `application_url`, 0 unparseable
  freshness dates.
- Source-health rollup: `docs/source-health-latest.md` reports 0 failed
  sources for run `27204417574`.

Previous accepted implementation commit:

- `0ba92d2` - `ci: add source health rollup`
- GitHub Actions run: `27204381138`
- Hunter workflow run: `27204417574`
- Generated rollup commit: `d4b33a7` - `docs: update daily source health`
- Result: success
- Artifact: `hunter-health-27204417574`
- Artifact ID: `7506838648`
- Repo-readable rollup: `docs/source-health-latest.md`

Earlier accepted implementation commit:

- `f8fadfb` - `ci: stop hunter alert commit spam`
- GitHub Actions run: `27204009191`
- Hunter workflow run: `27204051068`
- Result: success
- Artifact: `hunter-health-27204051068`
- Artifact ID: `7506687492`
- Result: Hunter uploaded `harvest.log` and `source-health-summary.md` without
  creating a bot alert commit.

Earlier accepted product commit:

- `2754740` - `fix: derive application urls from source urls`
- GitHub Actions run: `27203416725`
- D1 migration workflow: `27203416643`
- Hunter workflow run: `27203556963`
- Result: success
- Deployment: `https://936f10a7.remotejobs-ph.pages.dev`
- Public alias: `https://remotejobs-ph.pages.dev`

Earlier accepted product commit:

- `95e6665` - `fix: pause rate limited workable ats sources`
- GitHub Actions run: `27202145473`
- Hunter workflow run: `27202221523`
- Result: success
- Deployment: `https://6b3bc9b2.remotejobs-ph.pages.dev`
- Public alias: `https://remotejobs-ph.pages.dev`

Earlier accepted product commit:

- `1143798` - `feat: enforce source compliance pauses`
- GitHub Actions run: `27200812470`
- Hunter workflow run: `27200899849`
- Result: success
- Deployment: `https://1a74a454.remotejobs-ph.pages.dev`
- Public alias: `https://remotejobs-ph.pages.dev`

Earlier accepted product commit:

- `fa2d6eb` - `feat: add source compliance metadata`
- GitHub Actions run: `27199810692`
- Hunter workflow run: `27199890298`
- Result: success
- Deployment: `https://1896b637.remotejobs-ph.pages.dev`
- Public alias: `https://remotejobs-ph.pages.dev`

Earlier accepted product commit:

- `e0a32fb` - `ci: surface hunter scrape health`
- GitHub Actions run: `27198767290`
- Hunter workflow run: `27198807621`
- Result: success

Earlier accepted product commit:

- `e86b854` - `fix: report actual scrape inserts`
- GitHub Actions run: `27167396371`
- Hunter workflow run: `27198077806`
- Result: success
- Deployment: `https://cde106a3.remotejobs-ph.pages.dev`
- Public alias: `https://remotejobs-ph.pages.dev`

Earlier accepted product commit:

- `27794d8` - `feat: report source scrape status`
- GitHub Actions run: `27166648567`
- Hunter workflow run: `27166770708`
- Result: success
- Deployment: `https://44501583.remotejobs-ph.pages.dev`
- Public alias: `https://remotejobs-ph.pages.dev`

Earlier accepted product commit:

- `e32e580` - `feat: normalize app timestamp writes`
- GitHub Actions run: `27165936753`
- Result: success
- Deployment: `https://4bb0cf93.remotejobs-ph.pages.dev`
- Public alias: `https://remotejobs-ph.pages.dev`

Earlier accepted product commit:

- `be3d646` - `feat: add query aligned opportunity indexes`
- Migration workflow: `27155847940`
- GitHub Actions run: `27155847992`
- Result: success

Earlier accepted product commit:

- `2475103` - `feat: add paginated opportunities board`
- GitHub Actions run: `27141658140`
- Result: success
- Deployment: `https://68b1259d.remotejobs-ph.pages.dev`
- Public alias: `https://remotejobs-ph.pages.dev`

Last accepted docs commit:

- `431ab60` - `docs: add paused ai recovery handoff`
- GitHub Actions run: `27041163556`
- Result: success

Previous accepted methodology commit:

- `9657c4a` - `docs: adopt recovery-driven execution plan`
- GitHub Actions run: `27040684807`
- Result: success

Previous accepted audit commit:

- `74c0416` - `docs: add major audit and agent instructions`
- GitHub Actions run: `27039365056`
- Result: success

Current accepted work:

- Adopt recovery-driven execution methodology.
- Add master roadmap, implementation status, recovery trail, and ADR.
- Update agent context to the active Cloudflare/Astro/D1 architecture.
- Add `/opportunities` as the canonical paginated board.
- Reduce homepage payload from a 500-row hydrated board to a 60-row preview.
- Deploy and smoke production.
- Add production D1 indexes for active posted order, category active posted
  order, and active verification order.
- Normalize app-owned opportunity and digest timestamp writes to UTC ISO.
- Change stale comparisons to parse historical SQLite timestamps and new ISO
  timestamps through SQLite `unixepoch`.
- Add structured `sourceResults` to the scrape route and make ATS fetch errors
  visible as failed source records.
- Report actual D1 changes as the primary scrape `inserted` count and expose
  insert batch errors in the scrape response.
- Add Hunter workflow warning annotations and summary metrics for source
  failures, zero-count sources, insert counts, and insert errors.
- Add conservative source compliance metadata and update the public data policy
  to avoid treating public visibility as blanket permission.
- Review RSS/HTML source evidence, pause risky or unproductive sources, and
  report paused sources as skipped in live scrape results.
- De-duplicate ATS source fetches and pause Workable-backed ATS sources after
  repeated HTTP 429s.
- Capture a read-only production data-quality snapshot for P5 Slice 1.
- Define a no-mutation stale/source dry-run policy for P5 Slice 2.
- Backfill missing `application_url` values from `source_url` and ensure future
  ingest/scrape writes populate `application_url`.
- Stop Hunter from committing per-run scraper alerts and preserve per-run
  source-health evidence as artifacts instead.
- Add guarded daily/manual source-health rollup in
  `docs/source-health-latest.md`.
- Complete final acceptance audit and align README with current production
  architecture.
- Fix Hunter D1 insert batching after scheduled runs failed with
  `too many SQL variables`.
- Paginate category pages server-side to avoid hydrating large all-category job
  payloads.
- Stop tracking local `.wrangler` D1 runtime state.
- Refresh the source-health latest rollup after Hunter recovery.
- Upgrade active Wrangler tooling to v4 and restore local direct D1 audits.
- Pause unreviewed/noisy ATS platforms by default and refresh
  `docs/source-health-latest.md`.
- Require source-token review before fetching future Breezy ATS tokens.
- Document the Goldilocks source-expansion posture and next safe plan for any
  future AI handoff.
- Add capped/cadence-guarded RSS ingestion for Real Work From Anywhere and
  Jobicy Admin Support APAC, backed by D1 source fetch state and Hunter rollup
  evidence.
- Add Remote OK through the public JSON API, direct-link Remote OK cards, filter
  physical/logistics outliers, and archive the initial bad RemoteOK rows.
- Accepted completion: 100%.

Next pending work:

- Optional future roadmap only. No required recovery-roadmap work remains.
- User requested a Gemini-ready masterplan and handoff. Continue optional
  source policy, data quality, reporting, indexing, and bounded
  source-expansion work from `docs/gemini-masterplan-handoff-2026-06-13.md`.
- First recommended target: add compact longer-retention source-health history
  before expanding sources further.
- Next source-policy target: finish source-specific review for current
  Breezy-backed sources and decide whether they should remain `needs_review`,
  become `allowed`, or be paused.
- Next source-expansion target: add at most one reviewed source per slice after
  current source-health evidence is green.
- For local D1 audits, use Wrangler v4 command shapes recorded in
  `docs/wrangler-d1-audit-2026-06-12.md`.

Current handoff files:

- `docs/DOCS_INDEX.md`
- `docs/HANDOFF.md`
- `docs/gemini-masterplan-handoff-2026-06-13.md`
- `CLAUDE.md`

Pause acceptance:

- Commit: `431ab60`
- GitHub Actions run: `27041163556`
- Result: success

Accepted P1 implementation:

- Commit: `2475103`
- Build: `npm.cmd run build --workspace apps/web` passed.
- Local smoke: `/`, `/opportunities`, `/opportunities?page=2`,
  `/opportunities?category=tech`, and `/directory` returned 200 on local Astro.
- GitHub Actions: `27141658140` passed.
- Cloudflare deploy: `https://68b1259d.remotejobs-ph.pages.dev`.
- Production smoke:
  - `/`: 200, about 183 KB.
  - `/opportunities`: 200, about 97 KB.
  - `/directory`: 200.

Accepted P2 index implementation:

- Commit: `be3d646`
- Migration: `packages/db/migrations/0011_query_aligned_indexes.sql`
- Migration workflow: `27155847940`
- CI run: `27155847992`
- Before: three hot query plans used temp B-trees for ordering.
- After:
  - homepage query uses `active_posted_idx`;
  - category query uses `category_active_posted_idx`;
  - verifier query uses `active_last_verified_idx`;
  - no temp B-tree appears in the sampled hot query plans.

Accepted P2 timestamp implementation:

- Commit: `e32e580`
- ADR: `docs/decisions/ADR-002-canonical-utc-iso-timestamps.md`
- Build: `npm.cmd run build --workspace apps/web` passed.
- GitHub Actions: `27165936753` passed.
- Cloudflare deploy: `https://4bb0cf93.remotejobs-ph.pages.dev`.
- Production smoke:
  - `/`: 200, about 181 KB.
  - `/opportunities`: 200, about 96 KB.
  - `/opportunities?page=2`: 200, about 97 KB.
  - `/directory`: 200.
  - protected cron/ingest routes returned 401 without credentials.
- D1 evidence:
  - active opportunity count: 672 at verification time.
  - `unixepoch` parsed active `scraped_at`, `last_seen_in_feed_at`, and
    `last_verified_at` rows with 0 unparseable values.
  - read-only D1 evidence changed 0 rows.

Accepted P3 source-status implementation:

- Commit: `27794d8`
- Build: `npm.cmd run build --workspace apps/web` passed.
- GitHub Actions: `27166648567` passed.
- Cloudflare deploy: `https://44501583.remotejobs-ph.pages.dev`.
- Production smoke:
  - `/`: 200, about 181 KB.
  - `/opportunities`: 200, about 96 KB.
  - `/directory`: 200.
  - `/api/cron/scrape` returned 401 without credentials.
- Live Hunter workflow:
  - run `27166770708` passed.
  - response returned `sourceResults` and preserved `failedSources`.
  - Remote.co was explicitly `ok: false` with HTTP 520.
  - zero-count sources were distinguishable as `ok: true`.
  - inserted 11 jobs with `actualChanges: 11` and `backlogRemaining: 0`.
  - workflow produced scraper-alert commit `ca1f06d`.
- D1 evidence:
  - active opportunity count after Hunter: 683.
  - read-only D1 count query changed 0 rows.

Accepted P3 insert-accounting implementation:

- Commit: `e86b854`
- Build: `npm.cmd run build --workspace apps/web` passed.
- GitHub Actions: `27167396371` passed.
- Cloudflare deploy: `https://cde106a3.remotejobs-ph.pages.dev`.
- Production smoke:
  - `/`: 200, about 186 KB.
  - `/opportunities`: 200, about 96 KB.
  - `/directory`: 200.
  - `/api/cron/scrape` returned 401 without credentials.
- Live Hunter workflow:
  - run `27198077806` passed.
  - response reported `inserted: 1`, `actualChanges: 1`,
    `acceptedForInsert: 1`, `attemptedInsert: 1`,
    `insertFailedBatches: 0`, and `insertErrors: []`.
  - Remote.co remained explicitly visible as a partial source failure.
  - workflow produced scraper-alert commit `bc255c8`.
- D1 evidence:
  - active opportunity count after later scheduled/manual ingestion: 686.
  - read-only D1 count query changed 0 rows.

Accepted P3 workflow annotation implementation:

- Commit: `e0a32fb`
- GitHub Actions: `27198767290` passed.
- Live Hunter workflow:
  - run `27198807621` passed.
  - warning annotation emitted:
    `1 source(s) failed. See sourceResults in harvest.log.`
  - response reported `inserted: 1`, `actualChanges: 1`,
    `acceptedForInsert: 1`, `attemptedInsert: 1`,
    `insertFailedBatches: 0`, and `insertErrors: []`.
  - summary step wrote source failure, zero-count source, and insert accounting
    metrics.
  - workflow produced scraper-alert commit `baf2bd8`.
- D1 evidence:
  - active opportunity count after latest Hunter run: 687.
  - read-only D1 count query changed 0 rows.

Accepted P4 source metadata implementation:

- Commit: `fa2d6eb`
- Build: `npm.cmd run build --workspace apps/web` passed.
- GitHub Actions: `27199810692` passed.
- Cloudflare deploy: `https://1896b637.remotejobs-ph.pages.dev`.
- Production smoke:
  - `/`: 200, about 187 KB.
  - `/opportunities`: 200, about 96 KB.
  - `/data-policy`: 200 with June 2026/public-visibility caution text.
  - `/api/cron/scrape` returned 401 without credentials.
- Live Hunter workflow:
  - run `27199890298` passed.
  - response included `collectionMethod` and `complianceStatus` for RSS, HTML,
    and ATS source results.
  - configured sources and ATS results are conservatively `needs_review`.
  - workflow produced scraper-alert commit `3174068`.
- D1 evidence:
  - active opportunity count after latest Hunter run: 687.
  - read-only D1 count query changed 0 rows.

Accepted P4 source pause enforcement:

- Commit: `1143798`
- Source review evidence: `docs/source-review-2026-06-09.md`
- Build: `npm.cmd run build --workspace apps/web` passed.
- GitHub Actions: `27200812470` passed.
- Cloudflare deploy: `https://1a74a454.remotejobs-ph.pages.dev`.
- Production smoke:
  - `/`: 200, about 187 KB.
  - `/opportunities`: 200, about 96 KB.
  - `/directory`: 200, about 272 KB.
  - `/data-policy`: 200.
  - `/api/cron/scrape` returned 401 without credentials.
- Live Hunter workflow:
  - run `27200899849` passed.
  - response reported `failedSources: []`.
  - We Work Remotely fetched as `allowed` with 100 RSS items.
  - Remotive fetched as `allowed` with 29 RSS items.
  - ProBlogger, Remote.co, Authentic Jobs, Dribbble Jobs, OnlineJobs.ph, and
    Jobspresso were visible as `skipped: true` with pause reasons.
  - `insertFailedBatches: 0` and `insertErrors: []`.
- D1 evidence:
  - active opportunity count after latest Hunter run: 687.
  - read-only D1 count query changed 0 rows.

Accepted P4 ATS source policy implementation:

- Final commit: `95e6665`
- Supporting commits:
  - `e3714d8` - `fix: dedupe duplicate ats source fetches`
  - `3256127` - `fix: throttle ats source polling`
- ATS source review evidence: `docs/ats-source-review-2026-06-09.md`
- Build: `npm.cmd run build --workspace apps/web` passed.
- GitHub Actions: `27202145473` passed.
- Cloudflare deploy: `https://6b3bc9b2.remotejobs-ph.pages.dev`.
- Production smoke:
  - `/`: 200, about 187 KB.
  - `/opportunities`: 200, about 96 KB.
  - `/directory`: 200, about 272 KB.
  - `/api/cron/scrape` returned 401 without credentials.
- Live Hunter workflow:
  - run `27202221523` passed.
  - response reported `failedSources: []`.
  - Breezy ATS results included `20Four7VA` with 61 items, `Sourcefit` with 67
    items, and `VAA Philippines` with 0 items.
  - 11 Workable-backed directory rows were skipped as `paused` after repeated
    HTTP 429s.
  - `24/7 Virtual Assistant` was skipped because `breezy:20four7va` was already
    fetched for `20Four7VA`.
  - `insertFailedBatches: 0` and `insertErrors: []`.
- D1 evidence:
  - active opportunity count after latest Hunter run: 687.
  - read-only D1 count query changed 0 rows.

Accepted P5 data-quality snapshot:

- Snapshot: `docs/data-quality-snapshot-2026-06-09.md`
- Verification:
  - D1 queries were read-only and returned `changed_db: false`.
  - `git diff --check` passed with only normal CRLF warnings.
- Key production metrics:
  - active opportunities: 687.
  - duplicate `source_url`, `content_hash`, and non-empty `description_hash`
    groups: 0 each.
  - missing `company`: 95.
  - missing `pay_range`: 524.
  - missing `client_timezone`: 687.
  - missing `application_url`: 687.
  - missing `experience_level`: 522.
  - missing `posted_at`: 62.
  - missing `description_hash`: 507.
  - category `other`: 531.
  - posted older than 30 days: 247.
  - currently enabled source rows: 497.
  - now-paused source rows: 185.
  - unclassified source rows: 5 (`RemoteOK`).

Accepted P5 stale policy dry run:

- Dry-run report: `docs/stale-policy-dry-run-2026-06-09.md`
- Verification:
  - D1 queries were read-only and returned `changed_db: false`.
  - `git diff --check` passed with only normal CRLF warnings.
- Dry-run action counts:
  - `keep_enabled_source`: 497 rows.
  - `hold_paused_recently_seen`: 175 rows.
  - `review_paused_missing_last_seen`: 10 rows.
  - `classify_source_before_action`: 5 rows.
- Decision:
  - no rows should be archived immediately;
  - now-paused sources get a grace window;
  - `RemoteOK` must be classified before action.

Accepted Lens 2 implementation:

- Final commit: `f5b9827`
- Build: `bun run build` passed.
- GitHub Actions: run `27207069121` passed, deploying to Cloudflare Pages automatically.
- Production smoke:
  - `/` returned 200, renders the new `FINANCE & ACCOUNTING` card.
  - `/opportunities` and `/directory` returned 200.
- D1 evidence:
  - Backfilled D1 categories, reducing `other` jobs count from 532 to 47.
  - Staggered Workable rotation polling correctly saves `verifiedAt` timestamps in D1.

## Production Baseline From Audit

- Public site: `https://remotejobs-ph.pages.dev`
- `/`: 200, roughly 187 KB HTML after final P4 source policy deploy
- `/directory`: 200
- `/categories/tech`: 200
- `/opportunities`: 200
- Authenticated cron/API routes reject unauthenticated calls with 401

## Data Baseline From Audit

- Opportunities: 635 total, 635 active
- Directory companies: 238 total
- ATS-enabled companies: 15
- Content digests: 0
- Active jobs never link-verified: 184
- Active jobs older than 30 days by `posted_at`: 209
- Active jobs missing application URL: 635
- Active jobs missing client timezone: 635
- Active jobs in `other`: 523

## Known Healthy Controls

- GitHub repository is public and active.
- CI guardrail is green at the latest accepted checkpoint.
- Build passed locally during the major audit.
- Cron/API routes require authentication.
- Duplicate `source_url`, `content_hash`, and non-null `description_hash` counts
  were zero in the audit snapshot.

## Known Weak Controls

- Local direct D1 audit commands now work with Wrangler v4; keep using the
  command shapes documented in `docs/wrangler-d1-audit-2026-06-12.md`.
- Source health is visible in scrape responses, workflow artifacts, and the
  latest rollup, but not yet persisted as long-term D1 history.
- Several ATS sources remain `needs_review` and need source-specific policy
  review before being treated as fully approved.

## Recovery Command Hints

Common local checks:

```bash
git status --short --branch
bun run build
git diff --check
```

Common GitHub checks:

```bash
gh run list --repo cyalcala/va-freelance-hub --limit 10
gh run view <run-id> --repo cyalcala/va-freelance-hub --log-failed
```

Common production smoke checks:

```bash
curl -I https://remotejobs-ph.pages.dev/
curl -I https://remotejobs-ph.pages.dev/directory
curl -I https://remotejobs-ph.pages.dev/opportunities
```

Use read-only D1 queries for data checks. Never mutate production data during an
audit unless the task explicitly calls for a migration or repair and the change
has been backed up in Git.
