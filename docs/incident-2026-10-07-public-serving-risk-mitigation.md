# Public serving risk mitigation — 2026-10-07

Scope: follow-up to the [accepted availability incident](incident-2026-10-07-public-snapshot-availability.md).
Start SHA `d9708e9eac641e5be4f34be69bb13e7bffa3c3e8` on
`codex/public-availability-risk-mitigation`. Status: local implementation verified;
normal PR/main release and production acceptance pending. Historical incident
receipts remain unchanged.

## Mitigations

| Risk | Implemented control | Practical limit |
| --- | --- | --- |
| Bundled fallback ages | Every deployable main release reads only the existing D1 serving row, validates it against the committed LKG, rejects older/future/invalid/collapsed/ineligible candidates, strips descriptions/unknown fields, and atomically writes the artifact bundle before building | A prolonged outage still ages the last usable board; release-time capture adds no required production clock |
| Release capture fails | Preserve the committed fallback byte-for-byte; record retained/refreshed status, reason, original generation time, real age, counts, SHA-256 and source SHA | Existing migration/FTS release gates still require D1; capture alone does not certify data freshness or restore backups |
| Visitors mistake fallback for current supply | Stale/LKG HTML shows its saved generation date in Philippine time and asks visitors to confirm availability/retry Apply | The timestamp describes the board, not each posting's source verification or expiry |
| Apply hangs or emits generic 500 | Bound eligibility reads to 2 seconds; refuse unavailable eligibility with uncached 503, Retry-After 30 and readable retry text; bound optional limiter/write waits to 500 ms each | No redirect during eligibility outage; a stale job cannot prove current eligibility, withdrawal or source permission |
| Missing-row rebuild stampede | Atomic insert-or-conditional-update creates the single missing-row lease; only the winner scans source tables, losers serve LKG, abandoned claims expire after the existing 10 minutes | A failed winner can consume one rebuild per lease window; this is not a claim of one successful/failed scan per hour under all conditions |
| Production outage behavior only tested as unit logic | Required CI and the exact release artifact run a fresh workerd instance with the actual production compatibility date/flag and no D1; eight routes must serve the bundled board and Apply must refuse safely | No production quota exhaustion is induced; local workerd proves the boundary, not Cloudflare fleet telemetry |

Release artifacts retain the captured bundle and JSON receipts for 30 days through
the existing GitHub artifact mechanism. This is an artifact backup, not a D1/Turso
database restoration receipt. Git commits preserve the reviewed baseline, exporter,
runtime/tests/workflow and documentation. No new service, schedule, paid dependency,
source admission, publication fast lane, quality threshold, accepted parameter,
GCP job or collection permission is introduced.

## Local evidence

Runtime commit `e72f8b47`; release tooling/baseline commit `9c546701`.
The final full suite passed **3,013 tests / 0 failures** (221 files), including new
quota/hung-read/hung-analytics and missing-row lease regressions. The release export
tests also passed after refreshing the baseline; they prove retained bytes, safe
field projection, monotonic timestamps, invalid/collapsed/ineligible rejection and
atomic replacement. Typecheck and all four governance audits passed. Build passed.
Secret scan of the new public export found no leaks.

The read-only live capture refreshed the baseline to **1,519 jobs / 735 companies**,
generation `2026-10-07T09:35:53.265Z`, SHA-256
`59826ec68a83b14e0d7b5827d93c6e1257680919710735e4444c1b40fa5d2aa7`.
It did not change the D1 row, re-query source job tables, or invent a new generation
timestamp. [Capture receipt](audits/2026-10-07-public-lkg-risk-capture.json).

At `2026-10-07T10:21:21.832Z`, the built Worker without D1 returned 200 on home,
filtered opportunities, directory, two categories, two jobs and sitemap, serving
1,519/735 from the bundle. Apply returned 503, Retry-After 30, no-store and no
outbound Location. The smoke also checks the visitor notice on stale/LKG HTML.
[Offline receipt](audits/2026-10-07-public-risk-offline-smoke.json). This local
receipt has no deployment SHA; immutable CI/release provenance is recorded below
once available. Windows cleanup retry accommodates briefly held Worker file handles.

Jev's bounded alternatives consultation returned HTTP 401; direct reasoning and
tests governed the decision. Missing boot manifest/router remained as previously
recorded. Foreign `.agents/skills/` and `lucky777.md` were preserved.

## Release and acceptance

Pending normal PR/main CI, Pages deployment-to-SHA confirmation, release fallback
receipt and healthy production route/Apply smoke. Do not claim these from local
unit success. Rollback uses the preceding working LKG deployment `c6d071c1` /
`6297335a`, preserving serving availability while reverting these new mitigations.

The remaining irreducible tradeoff is availability versus recency during a prolonged
upstream outage. The dated board remains visible with honest freshness context;
current Apply authority remains fail-closed. Refreshing the bundle at releases and
requiring a real Worker outage smoke mitigates this risk without weakening gates.
