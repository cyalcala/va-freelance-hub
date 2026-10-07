# Snapshot refresh and saved-notice recovery — 2026-10-07

Owner trigger: screenshot of the homepage's persistent saved-listings notice.
Start `36b6eff402cc238e408cbed30bff280029f416a3`, branch
`codex/public-snapshot-refresh-recovery`. Runtime `457c9805999aa9b1cc7a3bc461125049734df17c`.
Status: local checks passed; normal release and visible production acceptance pending.
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

## Verification and pending release

Final local suite: **3,018 tests pass / 0 fail** (221 files). All five new tests
first failed and then passed. Build, typecheck and four governance audits passed;
the D1-free workerd smoke remains required locally/CI and on the exact release
artifact. Jev's advisory boundary consultation returned 401; direct evidence and
tests governed the fix. Browser skill applied with the available Codex in-app
browser; no additional DevTools integration was installed.

Production deployment/SHA, fresh snapshot, normal visitor/cache behavior, route
smoke and browser notice absence will be recorded after the normal PR/main release.
Rollback: prior working LKG Pages deployment `676ee426` / `59dd4f90`.
