# Master prompt review — automation, outcomes, and Jev

Documentation audit and prompt revision, 2026-09-25. This is evidence and a
proposed operating method, not authorization to deploy the proposed controllers.
The Source Perpetuity plan remains the executable queue. Production main is
`74d43789e06af04f7e3b2ab09b51d5a1051de9d8`; this revision started at
`c3320a44c70b3f4bbfcfb9d4c75f446a4e63172f` on the clean, backed-up
`codex/master-operating-prompt` branch, draft PR #150.

Concurrent read-only invocation notes appeared in the shared savepoint,
CURRENT pointer and prompt capsule during this work. They were preserved and
integrated, with their earlier 02:17 economics window kept distinct from this
audit's 02:31 window. Additional Worker-history observations in those notes are
documented concurrent evidence, not queries independently repeated by this audit.

## Current overall assessment

The public product, ingestion, and source-governance foundations exist. The
largest gap is complete, continuously verifiable outcomes across those pieces,
not a missing frontend or another framework. No overall completion percentage
is justified by this audit.

| Dimension | Evidence and current limit | Next bounded action |
| --- | --- | --- |
| Public product | Six public routes and two sampled job details returned HTTP 200 on September 25; this is availability/HTML evidence only. | Add representative consistency and empty/error-path acceptance to the next relevant unit; do not call this a visual/accessibility audit. |
| Supply | Fresh D1 economics: 117 qualified first-stored/7d = 16.71/day; not verified remote-only first publication. | Formalize a versioned outcome snapshot and qualification/publication reconciliation. |
| Source control | Fresh registry: 5 active, 15 shadow, 14 candidate, 1 quarantined, no canaries. | Inspect exact evidence/leases/observation coverage before a transition; labels are not authority. |
| Automation | Numerous clocks, events, reports, watchdogs and typed routes exist. Analytics and readiness capabilities are not uniformly automated or evidence-ready. | Inventory configured/enabled/exercised/effective status and extend existing owners rather than create duplicate clocks. |
| Jev | Deployed shadow-verdict judgment plus installed engineering skill; packet/evaluation/provenance gaps remain. | Repair current decision evidence, then evaluate additional bounded advisory uses against independent labels and costs. |
| Recovery | Git backup and workflow artifacts are proven; independent database restore readiness was not established by this scoped review. | Inventory recovery points, artifact expiry and last isolated restore; do not infer database recoverability from Git commits. |

## Fresh evidence collected

### GitHub and public surface

- `origin/main` unchanged after fetch; prior documentation PR checks succeeded
  in run `36081006041`. PR #150 remains draft/unmerged. Separate legacy Vercel
  status says the account is blocked; no account change was attempted.
- Post-fix scheduled shadow run
  [36082783445](https://github.com/cyalcala/va-freelance-hub/actions/runs/36082783445),
  head `74d4378`, began 2026-09-25T01:36:50Z and succeeded. Response: 3 enumerated
  shadow-window rows, 0 eligible, 0 dispatched, 3 `skippedIneligible`, healthy.
  This is a rotating window count, not the full registry. Detailed skip causes
  remain unresolved; this run adds no Tier-2 judgment exercise.
- Scheduled Hunter `36082314320`, watchdog `36082387778`, and prune
  `36084369869` were reported successful by GitHub. Their workflow conclusion
  alone is not proof of public supply or successful recovery.
- At 02:29:46Z, GET `/`, `/opportunities`, `/directory`, `/data-policy`,
  `/privacy`, and `/sitemap.xml` all returned 200 with expected page titles or
  XML. Home and opportunities HTML contained 39 and 17 distinct `/jobs/` links
  respectively; these are link counts, not total or qualified inventory.
  At 02:30:59Z, sampled `/jobs/7236` and `/jobs/7242` also returned 200 and
  JobPosting markup. No application click, browser interaction, source probe,
  cron call, or production write was performed.

### D1 and economics

A bounded registry/inventory SELECT returned 1,105 active opportunity rows, 866
with a currently positive PH verdict, and registry counts above. Wrangler
reported `success=true`, `changed_db=false`, `rows_written=0`, 2,010 rows read.

The existing economics pipeline emitted six SELECT queries at
**2026-09-25T02:31:49.978Z** and executed them sequentially through repository-
pinned Wrangler 4.120.0 and production config. Every result passed the read-only
metadata checks; all report reconciliation deltas were zero. These queries
share window bounds but are not an atomic multi-query database snapshot.
The six returned metadata records total 79,467 rows read and zero rows written;
the separate registry query read 2,010 rows. This is measured query work, not a
claim about total daily account quota use.

| Measure | Fresh result |
| --- | ---: |
| PH-qualified active stock | 866 |
| Qualified first-stored proxy / 7d | 117; 16.71/day |
| Qualified first-stored proxy / 30d | 458; 15.27/day |
| All active stock | 1,105 |
| Exact source-ID coverage | 5,679/5,679; 100% |
| New-row provider concentration / 30d | Largest family 42.2%; top three 87.5% |
| Sourcefit new cohort | 1 eligible / 46 unclear / 2 ineligible, total 49 |
| 20Four7VA new cohort | 6 eligible / 37 unclear, total 43 |

This updates the previous 110/7d proxy; it does not establish improvement caused
by a particular change. Rolling windows differ, current-active filtering has
survivorship bias, and imports, remote status, canonical identity and first
qualified publication are not fully resolved. Against this proxy alone the
100–150/day ambition implies about 83–133 additional/day, or 5.98–8.97 times.

Reproducible query text, metadata, raw aggregate results, combined reconciliation
and rendered report are preserved under
`docs/gauntlet/evidence/PROMPT-AUTOMATION-2026-09-25/economics/`.
The parsed workflow response is stored alongside that directory. No raw job
descriptions, personal applicant data or credentials are included.

## Weaknesses found in the first prompt

1. It specified manual review rhythms but not a reusable contract linking
   detection, bounded action, effect verification, evidence and recurrence.
2. Continuous tracking lacked a concrete series/coverage/freshness/retention
   contract. A refreshed `latest` Markdown report is not durable trend data.
3. "One unit" could be read as a stopping rule instead of a serialization rule
   inside an ongoing authorized outcome.
4. Jev was mainly described by restrictions and its present boundary, with no
   evaluated path to useful additional engineering/offline/shadow uses.
5. Product consistency, structured-data truth, data restore, and monitoring the
   monitors needed explicit outcome checks.
6. Documentation was strongest at handoff, rather than at meaningful in-flight
   decisions and failures. Backup existence was not clearly separated from
   verified remote backup and demonstrated restoration.

## Concrete implementation findings informing the revision

- Home, opportunities, category and FTS queries generally select active rows;
  detail/sitemap additionally require positive PH verdicts. Cards deliberately
  send unclear rows to source links. Reconcile copy/counts/visibility/KPI instead
  of assuming all visible cards qualify or that every unclear card is broken.
  See `apps/web/src/pages/opportunities.astro`,
  `apps/web/src/lib/opportunity-fts-query.ts`, and
  `apps/web/src/components/opportunity-card.tsx`.
- `apps/web/src/pages/jobs/[id].astro` can use first storage for `datePosted`
  and unconditionally emit `TELECOMMUTE`. `sitemap.xml.ts` can catch a DB error
  and return cached 200 static-only XML. A status-only smoke monitor misses
  these semantic failures. No claim that every live job is incorrect is made.
- Raw fetch-event retention in `apps/web/src/pages/api/cron/prune.ts` is 14
  days. Preserve bounded aggregates and permitted evidence before pruning to
  support 28/30-day outcome claims; retaining all raw events indefinitely is
  not the proposed solution.
- `scripts/analytics/anomaly_detector.py` and `yield_model.py` exist and have
  CI tests, but no invoking workflow was found. Their inputs and raw-volume
  concentration semantics must be reconciled before use for qualified yield.
- `scripts/diagnostics/canary-readiness.ts` has canned cohorts/cutover PASS prose
  and only a `sql` CLI despite advertising report support. Its existence is not
  permission to schedule its conclusions or auto-promote sources.
- `source-renew.ts` supports bounded existing shadows for selected providers;
  preview can fetch external documents, and renewal restarts observation.
  `source-promote.ts` exports mutating GET and POST. Classify effects from code,
  not the HTTP verb or diagnostic filename.
- Sentinel's inline premerge gate is tests/build, not the entire current CI
  contract; its actuation also depends on a PAT. Prospector's generated static
  policy-edit guidance is not the current typed source-admission authority.
- Configured schedules imply roughly 159 GitHub workflow starts/day plus
  weekly Medic, pushes and manual runs, and 144 scrape/24 shadow Worker ticks.
  These are nominal invocations, not actual due fetches. Aggregate D1, network,
  Actions, storage, and AI costs must be checked before stacking more work.
- No scheduled promotion/renewal controller was found. Workable preprocessing
  and quality cohorts are manual; Workable is dormant. Code backup/report
  artifacts do not establish an independently restored production database.

## Proposed operating stack and Jev decision

Reuse existing collectors and clocks, then add versioned daily outcome
snapshots; deterministic anomaly/coverage detection; a reconciled actionable
queue; evaluated Jev advice where tradeoffs remain; typed bounded action; effect
verification; and durable backup/next-action checkpoints. Each layer has its own
owner, cost limit, fail behavior, maturity evidence and rollback. Higher layers
consume versioned lower-layer outputs; no layer silently grants more authority.

Jev's verified interface is text-based bounded choice, not browsing, tooling,
visual inspection, open-ended debugging, or a verified vendor Batch API. Use it
for engineering alternatives now; evaluate source-evidence critique, candidate
priority and unclear/disagreement cohorts offline; shadow live recommendations;
then consider a narrow typed canary only after independently measured benefit.
Keep deterministic counts, quotas, leases, hard restrictions and enforcement
outside model discretion. The current verdict boundary is not a permanent ban
on future integrations and not permission to broaden them now.

One installed-skill consultation selected `ADOPT_STACKED_CLOSED_LOOPS`, confidence
0.99, model `typesafe/jev-1.13-20260917`, no fallback; usage 937 input / 88 output
tokens, reported cost 0.000039354. Supplied evidence was the fresh aggregate
inventory, live route/workflow checks and code findings above, with alternatives
for retaining manual directions, indiscriminate immediate automation, revision,
and insufficient evidence. This is advisory selection, not an evaluation of
production accuracy or source permission. Codex accepted the approach because
each proposed layer has measurable outcomes and bounded authority.

A distinct iteration-acceptance consultation returned `ACCEPT_DOCUMENTATION`
at reported confidence 0.87, model `typesafe/jev-1.13-20260917`, no fallback;
803 input / 65 output tokens, reported cost 0.000033726. Its choice probability
was 0.91; both fields are preserved without asserting calibration. Codex also
required independent critique and deterministic evidence/reference checks.
The two bounded calls reported total cost 0.000073080. Their selected outputs,
alternatives and Codex dispositions are retained in `jev-reviews.json` with
explicitly unavailable exact call timestamps.

## Progress and next-action ledger

| Step | Status/evidence | Next action |
| --- | --- | --- |
| Recover repository and original prompt | Complete; full start/main SHAs above, clean tree, PR status checked. | Refresh production/report evidence without mutations. |
| Refresh current evidence | Complete; eight route checks, D1 aggregate inventory and six-query reconciled snapshot, latest shadow response. | Audit existing automation/product/Jev boundaries. |
| Independent focused audits and strategy choice | Complete; three bounded code audits and one Jev advisory call. | Revise the single master prompt around closed-loop automation and outcome contracts. |
| Prompt revision and independent critique | Complete; supply and Jev/governance reviews found and corrected Tier-1/Tier-2 wording, rare-event dependency and delayed-report ambiguity; accepted controls can be inherited by reference. | Completed: 35 prompt file references, fence/diff checks, read-only reconciliation and 20 portable evidence hashes verified. |
| GitHub backup and acceptance | Complete for artifact commit `43518cb7a765c18d0cdfc3f2a57dbf0a898af2a9`, pushed to draft PR #150; exact-SHA Sovereign CI `36087773838` succeeded. Production deploy skipped; separate legacy Vercel account-block status remains. | Hand over the revised prompt and proposed next unit; push this acceptance record and observe its checks without another recursive documentation-only acceptance commit. |

**Disposition: TERMINAL — KEEP for the documentation artifact.** PR remains
draft and unmerged. Next proposed engineering action, when authorized: reconcile
the public eligibility/outcome measurement contract and scope an extension of
the existing economics workflow for comparable daily snapshots, coverage and
freshness detection, retained evidence and an actionable next-step queue. Keep
the open Jev observation independent; do not wait indefinitely for a rare case.

The task changes documentation/evidence only. Existing production remains at
the accepted behavior revision. Proposed automation requires an authorized
implementation unit; no controller, monitor, schedule or Jev runtime expansion
has been deployed by this prompt-writing task.
