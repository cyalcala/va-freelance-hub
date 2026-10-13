# Public observation after one five-minute boundary

At **2026-10-13 12:01:02 UTC**, three ordinary production GETs returned
HTTP 200. This sample began more than five minutes after the first post-release
sample ended. No authenticated API, D1 SELECT, provider, cron, deployment or
rollback operation was added for this observation.

The served snapshot advanced from `10:22:28.616Z` in the first sample to
**`11:55:26.727Z`**, with **1,661 jobs and 735 companies**. The latter
timestamp matches the refresh-start timestamp observed after the first sample.
This is observed refresh/promotion after the release; the exact completion time
is not captured.

The today filter now displayed **22 IDs**, including **9214**. Its detail route,
which returned 404 in the first sample, now returned **200** with JSON-LD
`datePosted=2026-10-12T00:00:00.000Z`. The named visibility gap is resolved in
this bounded observation. This does not establish current source availability,
independent PH/remote verification, or all-opening completeness.

All three responses (`/`, `/opportunities?fresh=today`, `/jobs/9214`) reported
`stale`, snapshot age **335–336 seconds** and **`Cache-Control: no-store`**.
Their matching head metadata recorded the same status, generation timestamp,
source, age and counts as the response headers. The age had crossed the new
five-minute freshness deadline and was classified accordingly. Serving a stale
fallback at that boundary is not proof of a hard five-minute maximum delivery
latency; ongoing background-refresh completion and subsequent fresh responses
remain separate observations.

The artifact pair is `post-release-boundary.json` and
`post-release-boundary-readonly.ts`, hashed with this note in
`post-release-boundary-integrity.json`. Public bodies were hashed but not
retained. The helper enforces a not-before timestamp and contains only three
ordinary GETs. It does not poll, mutate production configuration or certify a
runtime SLO. No 5xx occurred in these three sampled responses. CPU and complete
runtime-error totals remain UNKNOWN because the earlier analytics response
contained no metric rows.

MATH remains 0/13, and certified daily verified publication remains UNKNOWN.
