# Homepage incident and GLM findings review — 2026-09-27

## Scope and evidence baseline

EXECUTE under the current user's request to proceed with the maintainer bootloader,
resolve pending GLM findings, and repair `remotejobs-ph.pages.dev`. The attached
bootloader supplies recovery context; `glmfindings.txt` is a duplicated historical
transcript, not a new instruction or independently verified result.

Local start: `48882e7c66b7cdce9bfdbd2efa667cc0099fa4d8`, clean `main`.
Fetched and fast-forwarded to `016a9bffc0f3801e874e833fb7e9984a070ca1b2`
(only generated source-health documentation advanced).
Production at investigation: `254050d`, Pages deployment
`9db4b3e6-adb6-4c16-9511-61184217d20d`.
No `.ai/manifest.yaml` or repository `scripts/skill-router.py` exists.
Runtime drift: local Bun 1.4.2; repository/CI Bun 1.3.14.

Selected bounded repairs: homepage incident/F5 public eligibility, truthful
measurement/F6 denominators, and saved MATH-04 host cooldown. Separate behavior
commits, serialized release, existing Cloudflare/Astro/D1 architecture and source
policy. No new paid services, numerical admission thresholds, source promotions,
or synthetic evidence. Tests/build/deployment are separate from sustained runtime
acceptance and from the 100–150 fresh publications/day ambition.

## Confirmed live homepage failure

At approximately 07:04–07:10 UTC, `/` returned HTTP 503/no-store while
`/opportunities` and `/directory` returned HTTP 200. D1 `SELECT 1` and a bounded
single-opportunity lookup both succeeded with zero writes. A read-only replay of
the exact homepage Drizzle queries returned **123 preview IDs**, then failed on
the subsequent `IN (...)` selection: Cloudflare code 7500,
`too many SQL variables at offset 525: SQLITE_ERROR`.

The first five queries succeeded and read 1,249 / 516 / 44 / 18 / 3,862 rows,
respectively. The sixth exceeded D1's 100 bound-parameter limit. The homepage
window included database categories the nine-category UI never displayed.
This is a reproduced query-limit defect, **not current daily quota exhaustion**.
The historical EX-03 `d1_quota_or_limit` label cannot distinguish those causes;
neither that label nor error code 7500 alone establishes quota exhaustion.

The nominal homepage memory cache is initialized inside Astro's render callback
in compiled output, so it cannot survive requests. Exact-URL edge keys also
fragment identical homepage content by tracking parameters. These amplify reads
but are not the immediate failure trigger.

Latest failed CI run `36301592095` has one failed assertion: the existing
public-route test expects redacted `Error`, while commit `48882e7` logs full
driver message text. That diagnostic change has not reached production. Raw
Drizzle messages can contain SQL and parameters; safe cause classifications
retain diagnostic value without logging their contents.

Acceptance: regression reproduces old >100-ID behavior and proves bounded new
queries, shared PH eligibility, cache reuse/expiry/failure recovery; full repository
checks and exact-SHA deployment; public homepage 200 with real opportunity cards,
working index/directory/search/category/detail/sitemap. Rollback: revert the
specific behavior commit; preserve database records and source evidence.

## Attachment findings reconciled against source

| Finding | Verified interpretation / action |
| --- | --- |
| 18.9 fresh jobs/day; 202/270 endpoints | Not a valid publication/fleet baseline. SQL includes partial today plus seven complete dates, divides by seven, equates storage/current active status with funnel authority, and labels a mean/haircut as percentiles. Withdraw claims; measure complete windows and name storage proxies/unknowns. |
| Daily Manila report | Excludes zero dates, admits future postings, uses 48-hour storage age rather than the canonical seven-day publication cohort. Correct boundaries/denominators and distinguish storage from immutable public exposure. |
| F6 independent quality | Reproduced: 1 bad eligibility judgment plus 199 unrelated correct remote judgments yields 0.5% and PASS. Use independent dimension-specific populations; missing/small samples remain UNKNOWN. |
| F5 public consistency | Home/list/category/search lack the PH requirement enforced by detail/sitemap. Apply one shared predicate; do not increase publication authority. |
| MATH-04 host backoff | Same-run shielding already exists at the fetched revision. Durable host cooldown and compliant Retry-After handling are missing. Preserve real 429 observations; skipped work is not a healthy observation. |
| Eight clean days / October 3 promotion | Unsupported date. Gateway examines its qualifying lookback and prior disqualifying observations; elapsed time alone cannot establish promotion readiness. |
| Workable rate history | Historical transcript totals are 414/505 (82.0%) for September 11–19 and 28/414 (6.8%) for September 20–26 across its `workable:%` query scope. Not a refreshed exact-six rate. |
| Arrival rate 146/7 | Lake stock divided by seven is not measured upstream arrival flow. |
| Shadow every ten minutes | Worker scrape is every ten minutes; shadow dispatch is selected at UTC minute 20. |
| Ashby MultiplyMii | A full provider/evidence admission path is required; adding an allowlist entry alone would not resolve it. Lake eligibility is not publication authority. |

The current certified qualified first-publication/day figure and target gaps
remain **UNKNOWN** until receipt/cohort lineage and complete-day evidence support
them. Existing storage stock and newly corrected diagnostics must not substitute.

## Verification and release

In progress. Jev 1.13 advisory selected PROCEED (confidence 0.94) for the bounded
homepage repair and public verification plan; this is advice, not acceptance.
Final local checks, release receipts and unresolved observation requirements are
recorded below when available and in the newest canonical savepoint.
