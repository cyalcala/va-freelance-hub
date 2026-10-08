# Publication receipt accounting repair

Owner goal remains 100–150 newly published verified jobs/day, directory enrichment,
all MATH-01..13 and SSAE-CED, with lucky777/Addy continuity. Previous goal turn
made progress (merged PR #228, baseline measurement, local recovery bundle).
Current start: `559024e7881774bb3a289660343cd7458a5a9cb6`, branch
`codex/verified-flow-directory-checkpoint`; last verified origin/main
`926d39a0ea2db80a7eba8d541d12906a0c8b0837`. GitHub account suspension is unchanged;
do not retry failed backup/release probes without changed evidence.

This is a bounded MATH-06A support slice under the sole Source Perpetuity queue,
not acceptance of all-writer authority closure. Existing user maintenance scope
authorizes implementation; production writes/deployment are separate controls.
Preserve foreign `.agents/skills/` and `lucky777.md`.

## Evidence and selected repair

Two independent read-only explorers inspected writer/accounting paths. The shared
web grouped-insert callback discards actual inserted IDs; direct ingest already
uses RETURNING but reduces it to length, while scrape uses trigger-amplified
`meta.changes`. The cohort fixture helper counts one opportunity twice when it
appears in two same-day receipts. It also relabels a supplied storage `createdAt`
as first public exposure. No opportunity-schema column proves that equivalence.

Selected behavior:

- Return actual inserted IDs from both web callbacks, retain distinct valid IDs
  in the existing publication gateway receipt, derive count from IDs, and preserve
  canary slicing, authority checks, conflicts and retry behavior.
- Count unique opportunity IDs per complete Manila day in the existing fixture
  diagnostic. Keep raw ledger claims separate, validate ID arrays, deduplicate
  receipt rows, and require explicit nullable first-public-exposure evidence rather
  than treating a storage clock as exposure. Certification stays UNKNOWN because
  historical authority, canonical linkage, replay provenance and public visibility
  coverage are incomplete.

Question answered: which persisted opportunities support a receipt, and can a
duplicate/replayed receipt inflate the daily diagnostic? Hypothesis: actual returned
IDs plus canonical per-day deduplication fix those demonstrated gaps without
granting authority or changing supply thresholds. Falsification: a conflict, retry,
canary slice, missing exposure clock or duplicate receipt inflates a fresh count.

Files: shared `publish-opportunities.ts`, its two web callers and existing tests;
`scripts/diagnostics/metric-cohort-separation.ts` and its fixture tests. No schema,
source admission, clock, provider, permission, threshold or GCP change. Zero source
fetches and zero production writes. Rollback: normal revert of the two behavior
slices independently; no data compensation is needed before release.

Acceptance: regressions first fail, then pass; meaningful offline SQLite/D1 adapter
coverage for RETURNING/conflicts/FTS, gateway receipt IDs/retry/cap behavior, fixture
dedup and unknown clocks; full tests/typecheck/build/guardrails; independent critic.
Code/evidence committed locally with BACKUP_PENDING while GitHub is suspended.
Normal exact-version release and live visibility are required before runtime claims.

## Runtime boundary and observations

At 11:28 UTC GCP API revalidated lake-publish-job generation 3, update
2026-10-04T09:13:09.798366Z, immutable digest
`97db3a248ac23bd5cab40a44d60c233fb98881d531fbc18f179e1bac8fd3b97a`.
Exact execution `lake-publish-job-9b8tv` completed 10:47:41.869206 UTC successfully.
Its bounded 10:47–10:50 log window has 57 entries/no next page: 48 auto-publish
source decisions, sampled concentration UNKNOWN, zero synced, 13/48 enrolled,
no Janes decision or inventory message. Current Janes candidates observed
10:47:42 UTC remain unresolved; success is not publication or runtime-code proof.

The inventory explorer's initial native-module mock failed to intercept the CLI:
three completed read-only inventory SELECTs accidentally ran, returning 1,539
active rows / 43 source groups. No writer or enrollment ran. Corrected isolated
fixture used zero live calls. Missing `--json` is not a demonstrated failure:
pinned Wrangler emits JSON on captured non-TTY stdout. Isolated fixtures show
success:false/negative-count validation weaknesses, but those are not evidence
of the current runtime hold. No transport/policy change in this accounting unit.

Known remaining writer defects: lake direct upsert can reactivate rows and writes
unlimited receipts with empty IDs; shared gateway concurrency/receipt-failure
semantics and all-writer coverage remain open. Pure observation/latency helpers
are not production persistence. No manual sync is used as a release workaround.
Jev's previous HTTP 401 remains an unchanged advisory availability fact; deterministic
debugging/tests govern this slice. No repeated failed advisory call.

### Scheduled Janes authority incident: observed, containment pending

The next existing scheduled execution, `lake-publish-job-drv4t`, completed
successfully at 11:47:53.303405 UTC on the same generation-3 image. Its
[11:49 observation](scheduled-publisher-observation-2026-10-08.json) reports
11 opportunities synced and 13/49 sources enrolled. The Janes log decision is
PUBLISH x2; all 49 sampled decisions report concentration UNKNOWN. Those log
claims are not verified fresh-publication counts or current source authority.

[D1 readback at 11:52:34 UTC](janes-publication-control-observation-2026-10-08.json)
found zero registry rows and zero opt-out rows for `greenhouse:janes`, but two
stored active opportunity rows, IDs 9046/9047. Its 11:47:32.192 UTC ledger receipt
claims mode unlimited, proposed_count=2 and published_count=2, with
published_ids_json=[]; it cannot identify the two jobs from receipt membership.
Absence of an opt-out is not an admission decision. The current shared gateway
holds an unregistered nonlegacy ATS source, so the direct lake writer's bypass
is a demonstrated authority defect even though public exposure remains unproven.

Both public detail GETs returned 404, with no job title or JobPosting structured
data, and the [second route observation](janes-public-route-observation-2026-10-08.json)
also reports NotFound. Present detail-route absence does not prove list/cache
consistency, publication-time visibility or independent qualification. Neither
the two Janes rows nor the run's eleven syncs are certified toward 100–150/day.

The [bounded incident contract](SEV2_LAKE_AUTHORITY_2026-10-08.md) owns containment
and recovery. Its [11:59 preflight receipt](sev2-lake-containment-receipt-2026-10-08.json)
records failedStage=preflight and completeFence=false. A separate exact scheduler
GET at 12:03:32 UTC returned 403 / PERMISSION_DENIED / BILLING_DISABLED:
[sanitized provider receipt](sev2-scheduler-preflight-2026-10-08.json). This is a
billing prerequisite failure, not a demonstrated IAM defect or proof that future
executions stopped. No scheduler pause or conditional row hold
is confirmed; containment remains pending. The uncontrolled
GitHub fallback is a separate fencing risk while account access is suspended.
Do not infer a completed halt, withdrawal or authority repair from the attempted
preflight or the successful scheduled job.

## Implementation and finite verification receipt

Local behavior commits: `8b7f1009` retains actual web inserted IDs;
`e3897609` deduplicates daily receipt IDs and requires explicit nullable exposure
evidence; `6307bae8` blocks live raw lake sync before I/O; `09ee1a41` repairs the
static receipt-coverage audit. No deployment, production write or new clock.
MATH-05/06 remain partial local implementation; the observed scheduled lake
execution used the existing image and does not demonstrate these commits live.

Regressions first failed: shared web callback/empty-ID receipts; metric duplicate
receipts (one job incorrectly counted five times), non-array receipt crash and
storage-as-exposure substitution. An independent critic found that the initial
guard required exposure before the decision. It was corrected: a 14:00 decision
may produce 14:01 visibility. A new regression first failed and then passed.
Decision-day grouping still cannot certify cross-midnight exposure; the output
explicitly reports UNKNOWN certification. Canonical cross-source linkage and
historical authority/eligibility/visibility coverage are not manufactured.

Receipt-slice tests passed 3,051 / zero fail; Astro build passed. A later combined
recheck exposed the stale Query 1 cohort-ELSE requirement: 3,056 pass / one fail.
Three new zero/certification/comment-camouflage regressions failed before repair.
The static audit now requires exactly NULL verified_fresh_flow and UNKNOWN
certification from receipt coverage, with comments excluded; it does not validate
SQL semantics or supply certification. Final combined checks: 3,060 tests pass /
zero fail / 319,148 assertions across 225 files; typecheck and all four governance
audits pass. The C16 exception records core
maintenance in the central scrape adapter; no source addition. Two independent
focused reviews found no remaining blocking new regression. Actual SQLite/FTS,
production Drizzle D1 adapter, conflicts, partial inserts, cap slicing, retry and
direct-ingest public/hidden IDs are covered. Full scrape-handler runtime and live
visibility are unverified. No claim that all MATH-06 controls are closed.

[Production receipt coverage](publication-receipt-coverage-2026-10-08.json) at
11:45:37 UTC used the exact corrected METRICS.md query: 173 ledger rows, 334
claimed publications, 124 distinct IDs summed across seven complete daily
denominators (the same ID on different days is a separate daily exposure claim).
October 5: 27 claims / zero IDs. All seven verified-fresh-flow values remain
NULL/UNKNOWN. Receipt: 1,246 rows read, zero written, changed_db=false,
SQL duration 4.3054ms; one query is not an end-to-end/p95 performance profile.

| Writer family inspected | Accounting status | Remaining acceptance boundary |
| --- | --- | --- |
| Scrape accepted inserts | Actual RETURNING IDs in this local slice | Normal release/full handler runtime not verified |
| Direct ingest public inserts | Actual RETURNING IDs, conflicts do not fabricate membership | Public exposure/history not verified |
| Scrape pending/feed activations | Existing ID-bearing callbacks unchanged | Reactivation and first-publication evidence stay distinct |
| Inline/Inngest triage drain | Existing ID-bearing paths unchanged | Current authority/atomic failure closure still needed |
| GCP lake sync | Local live-sync entry fenced before I/O; deployed raw upsert/candidate count/empty IDs unchanged, Janes bypass observed | Normal coordinated release, current gateway/opt-out/cap/lease/atomicity repair and incident containment remain open |

## Fifteen-field PH reporting

| Field | This slice |
| --- | --- |
| Sources evaluated | 0 source probes; existing runtime/control/accounting paths inspected |
| Sources resolved | 0 authority resolutions |
| ATS/provider identities discovered | 0 |
| Sources admitted | 0 attributable |
| Sources shadowed | 0 attributable |
| Sources blocked, reasons/triggers | 0 changes; existing restrictions retained |
| Raw jobs observed | 0 source acquisitions |
| PH-qualified jobs generated | 0 |
| Net-new unique jobs | 0 attributable |
| QUALIFIED_READY added | 0 attributable |
| Jobs synced to D1 | 0 attributable to this code slice; later scheduled drv4t reported 11, including two Janes rows; fresh-publication status unverified |
| Jobs visibly active on site | No task-attributed public output; earlier stock 1,539 is separate |
| Source economics changes | UNKNOWN; no accepted cost/yield benefit |
| Primary remaining bottleneck | Demonstrated lake authority bypass with containment pending; missing all-writer authority/exposure history and sparse recorded receipt IDs; shallow ready supply |
| Next autonomous action | Recover the sole current NEXT from SYSTEM_SAVEPOINT; normal GitHub access/release remains externally blocked |

Durability: local code and finite evidence commits require ordinary review-branch
push/remote SHA/CI once account access changes; BACKUP_PENDING meanwhile. Maintain
an incremental verified local Git bundle requiring the already-backed-up main
base. No database or GCP-state restoration coverage is claimed.
