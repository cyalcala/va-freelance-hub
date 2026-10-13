# First post-release observation — October 13

At **11:55:25–11:55:28 UTC**, the project API reported production deployment
`8c649da0-93ef-4458-89ad-715f1367a2ca`, created `11:52:29.354194Z`, on
`main`, with source `34e3bd1efa34dc3a2c31f2cc3e5b6c5b04790e83` and successful
deploy stage. Canonical and latest deployment IDs agreed. The safe production
configuration projection exactly matched the preflight: compatibility date and
flags, DB and AI bindings, five secret names/types and sampled other binding
names. Secret values were not inspected or retained.

These are API metadata and observed response semantics, not an independent
download-and-hash attestation of deployed Worker bytes.

| Ordinary production GET | Status | Observation |
| --- | ---: | --- |
| `/` | 200 | Stale edge snapshot generated `10:22:28.616Z`, age 5,578 seconds, 1,660 jobs / 735 companies, `Cache-Control: no-store` |
| `/opportunities?fresh=today` | 200 | Same snapshot and no-store policy; 21 results, still excluding ID 9214 |
| `/jobs/9214` | 404 | Existing observed visibility gap remains in this first sample |
| `/data-policy` | 200 | Snapshot-independent cache MISS with existing 60/300/600 cache policy |

Snapshot head metadata and headers for the two board surfaces agreed. The
subsequent metadata-only D1 SELECT at `11:55:27.476Z` reported generation
`11:23:06.080Z`, refresh start `11:55:26.727Z`, payload length 686,391,
one row read and zero rows written. The newer durable board already existed
before the release; the served edge board was older. The newly claimed refresh
was still in progress at this observation. An initial stale fallback is
compatible with the existing asynchronous refresh path, but it is not
acceptance of the freshness repair or the missing-detail problem.

One bounded Workers analytics request used the production script name returned
by the project API, `pages-worker--14231676-production`, and the interval from
deployment creation through `11:55:27.476Z`. It returned HTTP 200, no GraphQL
errors and **no metric rows**. Runtime request/error totals and CPU quantiles
therefore remain **UNKNOWN**, not zero. The query follows the
[official Workers metrics API example](https://developers.cloudflare.com/analytics/graphql-api/tutorials/querying-workers-metrics/).
Adaptive reporting can lag, and a script/time filter does not independently
prove which Worker version generated a metric.

The capture and executed helper are `post-release-first.json` and
`post-release-first-readonly.ts`; `post-release-first-integrity.json` contains
their hashes and this interpretation. Four ordinary GETs, one project GET,
one snapshot SELECT and one analytics query were performed. No manual cron,
provider call, database mutation, deployment, rollback or secret change was
performed by this verifier. Ordinary GETs may cause the existing application's
background snapshot refresh.

NEXT: observe normal public responses after at least one five-minute boundary,
retaining generation timestamps, cache policy and the named detail-route
result. Do not declare a bounded-latency SLO, sustainable CPU/cost or daily
verified throughput from this first sample. MATH acceptance remains 0/13.
