# Snapshot refresh and saved-notice recovery — 2026-10-07

Owner trigger: screenshot of the homepage's persistent saved-listings notice.
Start `36b6eff402cc238e408cbed30bff280029f416a3`, branch
`codex/public-snapshot-refresh-recovery`. Runtime `457c9805999aa9b1cc7a3bc461125049734df17c`.
Status: **TERMINAL — KEEP, 100%** of this bounded screenshot recovery task.
Accepted `2026-10-07T11:36:05Z` (19:36 Manila) after normal release and ordinary
visitor/browser verification. [PR #219](https://github.com/cyalcala/va-freelance-hub/pull/219)
merged to `91641445985d8f3230e8e54ccf857c637bc3b551`, verified on origin/main.
The earlier availability/risk acceptances remain dated history.

## Observed failure and reproduced mechanisms

At `2026-10-07T11:10:36Z`, both normal HTML-cache traffic and cache-bypassed
requests returned 200 with a stale board generated `09:35:53.265Z`, 1,519 jobs,
and the notice shown in the owner's image. The one-row diagnostic confirmed D1
was reachable, the same stored generation, and a lease claimed at `11:01:52.648Z`.
The diagnostic wrote zero rows. Later D1 had advanced to `11:13:48.359Z`, lease
clear, while the browser and edge still showed the old generation/notice. This is
recovery propagation failure, not evidence of a current D1 quota outage.

Read-only candidate diagnostics returned 1,519 jobs / 735 companies with valid
render fields and a storage-sized compressed payload (606,019 characters). Local
packing took 1,440 ms. Wrangler process/network timings are not Worker timings.
Scoped tails on this agent's warm diagnostic requests reported successful outcomes
and no exceptions; they did not capture the lease winner or prove its failure.
No raw headers/request bodies or other visitors' logs were retained as evidence.

Five regression tests reproduced these implementation gaps before correction:

- A stale HTML cache hit returned the old notice instead of invoking recovered
  rendering; new fallback HTML was also cached as a normal five-minute response.
- A valid refresh taking 2.1 seconds outlasted the two-second promise attached to
  `waitUntil`. The wrapper settled while the underlying reconstruction/write remained
  unfinished. Cold foreground timeout had the same detached-work problem.
- Promoting a stale edge copy granted it another fifteen-minute in-memory exemption,
  delaying a cheap read of an already recovered serving row.

The tests establish these mechanisms. No live timeout/cancellation receipt is
claimed from warm-request tails. Cloudflare documents that unretained async work
can be canceled after invocation end and gives `waitUntil` a 30-second post-response
window: [official runtime contract](https://developers.cloudflare.com/workers/runtime-apis/context/#waituntil).

## Fix

- Keep page dependency deadlines at two seconds. Retain complete background refresh,
  cold reconstruction and edge-write chains with a separate bounded 25-second
  lifetime, below the runtime's documented post-response window.
- Recheck a stale in-memory board after one minute. Fresh boards keep their existing
  fifteen-minute warm TTL and zero-D1 request path. Stale retries read the shared row;
  source-table rebuilds still require the existing single lease/hour freshness rule.
- Ignore stale/LKG/degraded HTML cache entries and mark newly rendered saved-board
  responses `no-store`. Shared board memory/edge caches remain available during an
  outage. New HTML cache revision fences previous stale-notice entries on deployment.
- Preserve the honest visitor notice for real stale/LKG serving. Fresh snapshots
  remove it through the existing layout condition. No withdrawal, PH eligibility,
  source permission or publication gate is weakened; Apply remains authoritative.

Stale rendering can increase SSR traffic, and stale isolates may perform a single
row recheck per minute while healthy fresh requests remain zero-D1. A prolonged
upstream outage still serves saved listings. The 25-second background deadline is
bounded, not a delivery guarantee or a new source scheduling parameter. No new
service, paid dependency, background clock or GCP deployment was introduced.

## Verification and production acceptance

Final local suite: **3,018 tests pass / 0 fail** (221 files). All five new tests
first failed and then passed. Build, typecheck and four governance audits passed;
the D1-free workerd smoke passed locally/CI and on the exact release
artifact. Jev's advisory boundary consultation returned 401; direct evidence and
tests governed the fix. Browser skill applied with the available Codex in-app
browser; no additional DevTools integration was installed.

PR CI [37614316524](https://github.com/cyalcala/va-freelance-hub/actions/runs/37614316524)
and main validation/release [37614492584](https://github.com/cyalcala/va-freelance-hub/actions/runs/37614492584)
passed. Main release mapped SHA `91641445985d8f3230e8e54ccf857c637bc3b551` to
Cloudflare Pages `aa8ce5b8-d084-466b-bd8c-24d3e9ebe7c4` (Wrangler Source
`9164144`), immutable [deployment](https://aa8ce5b8.remotejobs-ph.pages.dev).
The legacy Vercel status was account-blocked and is outside the required
Cloudflare deployment path; its status is not represented as a passing check.

At `11:36:05Z`, ten routes on each of production and the immutable deployment
returned 200 with a **fresh** snapshot generated `2026-10-07T11:13:48.359Z`,
1,519 jobs / 735 companies, and zero saved-listings notices. Requests used no
cookies or cache-bypass headers. Three additional ordinary homepage requests
were fresh HTML cache hits, displayed the automatic-update badge and contained
no saved notice. [HTTP receipt](audits/2026-10-07-snapshot-refresh-production-smoke.json).
The Codex in-app browser independently displayed the restored homepage after
reload; a local screenshot preserves the visible result. This is bounded
point-in-time acceptance, not continuous availability or fleet-wide certification.

Release capture refreshed its bundled LKG to the same `11:13:48.359Z` generation,
age 1,053 seconds at capture, 1,519 jobs / 735 companies. Downloaded artifact
SHA-256 independently matched
`7cd90b59233ceedfd910709e226deaec41360ffa6f7d9198638156c5987d2a26`.
Exact release-artifact workerd acceptance at `11:31:37.441Z`, without D1:
eight public routes 200; Apply 503 with Retry-After 30 and no outbound redirect.
[Capture and offline receipts](audits/2026-10-07-snapshot-refresh-release-evidence.json).
The full captured bundle is retained with the Pages/release artifact under
`public-availability-release-91641445985d8f3230e8e54ccf857c637bc3b551`
for 30 days. Git stores the reviewed code/baseline and these acceptance records;
neither artifact retention nor Git history is a database restoration receipt.

Acceptance records are backed up through a finite docs-only PR from
`codex/snapshot-refresh-acceptance`; its commit/merge receipt is normal Git history.
No remaining implementation work is dispatched by this record. Genuine prolonged
outages still show the saved-data notice and keep Apply fail-closed when current
eligibility authority cannot be checked.
Rollback: prior working LKG Pages deployment `676ee426` / `59dd4f90`.
