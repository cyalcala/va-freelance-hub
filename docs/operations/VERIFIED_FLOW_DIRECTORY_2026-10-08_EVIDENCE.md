# Verified-flow and directory maintenance: evidence receipt

Unit: VERIFIED-FLOW-DIRECTORY-FOUNDATION, owner-authorized implementation.
Start `3065f0d709d5a1950c247d5a11df542b07721bcb`; branch
`codex/verified-flow-directory-operations`. Local implementation:
`4631703f` diagnostic transport, `6ea1c201` directory evidence backlog,
`e86b5d65` actionable enrichment selection. Release/operational acceptance pending.
The [bounded task contract](VERIFIED_FLOW_DIRECTORY_2026-10-08.md) maps all
MATH-01..13 and existing SSAE cards; it does not mark their outcomes accepted.

## Measurements and limitations

- Public `/directory` at about 10:47 UTC returned HTTP 200, fresh D1 snapshot,
  735 companies / 1,539 jobs. These are stock, not a fresh-publication rate.
- [Directory inventory](directory-enrichment-baseline-2026-10-08.json),
  11:00:59 UTC: 761 stored / 735 visible / 26 hidden, using the actual shared
  public visibility predicate. 230 visible rows lack a website, 315 website
  provenance, 684 hiring paths, 687 dated verification evidence, 343 current
  stored link evidence. Categories overlap; zero canonical sanitizer failures.
  Every visible row has at least one selected evidence gap, which does not mean
  every company is invalid. Receipt: 761 rows read, zero written, changed_db=false.
- [Exact actionable query](directory-actionable-selection-2026-10-08.json),
  11:05:46 UTC: seven existing company IDs selected, 5,104 rows read, zero
  written, changed_db=false, SQL duration 18.9741ms. Four current verification-ready
  rows overlap the seven supported ATS hiring-path gaps. Earlier selection pool
  had 424 candidates; many could perform no update under existing rules.
  One query duration is not p95 or a proven end-to-end speedup.
- [Funnel](publication-funnel-baseline-2026-10-08.md) and
  [complete Manila-day storage diagnostic](manila-storage-baseline-2026-10-08.json),
  11:06:40 UTC: October 1–7, 198 currently eligible recent-posting storage rows,
  28.3/day proxy. Daily proxy values: 43, 21, 27, 17, 7, 41, 42. Verified fresh
  first-publication flow and gaps to 100/150 remain UNKNOWN. Original first exposure,
  complete historical authority/cohorts and public-route consistency are absent;
  current deactivation changes this proxy. Quality and latency are not certified.
- Read-only Turso snapshot around 10:48 UTC: qualified-ready 2, unsynced 2,
  source `greenhouse:janes`; synced 1,067; raw observations 389, unprocessed 1,
  replay events 31, auto-approved discovery tenants 49. Approval labels and
  sync counts do not establish publication authority or public flow.
- GCP inspected project/region: antigravity-494415 / asia-southeast1. Two jobs
  and two enabled hourly schedules remain (`:47` publisher, `:53` shadow).
  Publisher image digest `97db3a248ac23bd5cab40a44d60c233fb98881d531fbc18f179e1bac8fd3b97a`;
  shadow digest `86c1c3b61866eac59960dbeeb95cc3afa14fd97f9cf99345ca230c4301083da1`.
  Five sampled executions each succeeded; publisher latest `lake-publish-job-9b8tv`
  completed 10:47:41 UTC, shadow `shadow-dispatch-job-c5qvf` 09:53:17 UTC.
  Immutable image versions are observed; source/config mapping and actual new
  publication effects are not established by these status reads. No miner job
  in this inspected region. No GCP deployment or schedule change in this slice.
- GitHub residual runtime is current: miner run 37765679314 was in progress,
  directory health 37738809615, hunter 37746953404 and shadow fallback
  37752900101 succeeded. The enrichment workflow still schedules twice/day and
  invokes the existing Pages directory-enrich route. No clock was changed.
  Successful runtime exits alone do not prove source/publication health.

## Regressions, verification and review

Initial `measure:funnel` failed with D1 `incomplete input` / code 7500 because
the Windows `bun run wrangler` wrapper corrupted multiline arguments. The
remote `--file` alternative returned an import summary, not query rows; it was
rejected. A direct native Node invocation of pinned Wrangler preserved the exact
multiline SQL and produced real rows. Initial transport/missing-module failures
are retained here; the final helper and diagnostics pass live.

New regression fixtures fail before implementation and pass afterward:
native child-process newlines/quotes/spaced paths, malformed/write receipts,
single-SELECT guards, full directory denominator, duplicate/truncation rejection,
unknown/provenance gaps, canonical URL/visibility reuse, large no-op enrichment
cohort, inactive/ineligible/insufficient evidence and unsupported ATS identities.
Initial directory URL classification falsely flagged five bare domains; the
canonical public sanitizer corrected it. No dangerous URL was found or fetched.
Drizzle is resolved from its existing web-workspace installation; no package
dependency was added. Research-only companies remain in the evidence backlog.

Final local checks: **3,035 tests pass / zero failures**, 15 Python tests pass,
typecheck/build and four governance audits pass. The earlier intermediate suite
was 3,032 tests; use the final count. Build warnings about existing Browserslist,
punycode and externalized async_hooks remain non-failing. Five-axis self-review
covered correctness, clarity, architecture, secrets/URL safety and query cost;
no independent reviewer acceptance is asserted. Jev bounded selection failed
HTTP 401 and was non-blocking. No verified live enrichment mutation yet.

Coverage: full supplied lucky777, current AGENTS, selected canonical sections,
relevant source/SSAE/MATH/PH contracts and diagnostic/enrichment call paths.
Historical recovery files were indexed/sampled by relevance; this is not a full
semantic audit of the repository or all thirteen mathematical implementations.
No provider/release research facts beyond observed local/live evidence are claimed.

## Full PH reporting contract for this slice

| Field | Result |
| --- | --- |
| Sources evaluated | No source probes; 761 existing directory rows inventoried |
| Sources resolved | 0 authority resolutions; evidence gaps measured |
| ATS/provider identities discovered | 0 new; seven existing actionable identities reused |
| Sources admitted | 0 |
| Sources shadowed | 0 by this task; sampled GCP shadow status only |
| Sources blocked, reasons/triggers | 0 changed; existing permission/opt-out/cutover gates retained |
| Raw jobs observed | 0 source acquisitions; D1/Turso diagnostic reads only |
| PH-qualified jobs generated | 0 |
| Net-new unique jobs | 0 attributable to this task |
| QUALIFIED_READY added | 0 attributable; observed stock 2 |
| Jobs synced to D1 | 0 attributable; observed lake historical count 1,067 |
| Jobs visibly active on site | 1,539 snapshot stock at the sampled public request, not task output |
| Source economics changes | UNKNOWN; proxy measured, no accepted supply/cost benefit |
| Primary remaining bottleneck | Low measured recent-posting storage, missing first-exposure evidence and shallow ready reserve; directory evidence gaps |
| Next autonomous action | Recover the current SYSTEM_SAVEPOINT NEXT; release/observe this directory slice before attributing enrichment benefit |

Durability: review branch code/tests/receipts must be pushed and remote SHA/CI
verified; those finite receipts belong in SYSTEM_SAVEPOINT. Git backup does not
restore databases. Runtime acceptance additionally needs normal exact-version
release, bounded enrichment execution and per-row read-back. Existing source
gates, accepted parameters and quality ceilings remain intact. Rollback:
revert `e86b5d65` for selection and the diagnostic commits independently.
