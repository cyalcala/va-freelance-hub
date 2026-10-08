# Public snapshot diagnostics for maintainers and AI tools

The owner requested removal of the intermittent visitor-facing saved-listings
strip on October 8, 2026. Serving diagnostics remain available in existing HTTP
headers, matching HTML `<head>` metadata and existing internal structured logs.
The metadata is discoverable in page source; it is not confidential or a visible
UI message. Tools must explicitly inspect it. No freshness, eligibility, source
permission, publication, cache safety or Apply requirement changes.

## Read the actual response

On snapshot-backed HTML routes (home, opportunities, categories, directory and
eligible job details), each present response header is mirrored into a meta tag.
Values come directly from the serving response, not a frontend estimate.

| HTML meta name | HTTP response header | Meaning |
| --- | --- | --- |
| `va-hub:snapshot-status` | `X-Public-Snapshot` | Actual serving classification |
| `va-hub:snapshot-generated-at` | `X-Public-Snapshot-Generated-At` | Snapshot generation time in UTC ISO format, or `unknown` |
| `va-hub:snapshot-source` | `X-Public-Snapshot-Source` | `memory`, `edge`, `d1` or `durable_lkg` |
| `va-hub:snapshot-age-seconds` | `X-Public-Snapshot-Age-Seconds` | Age at response rendering; not a live counter |
| `va-hub:snapshot-jobs` | `X-Public-Snapshot-Jobs` | Jobs in the shared snapshot, not the current filtered page |
| `va-hub:snapshot-companies` | `X-Public-Snapshot-Companies` | Companies in the shared snapshot |

Sitemap uses the headers, with no HTML metadata. Routes without snapshot headers
(for example privacy/data-policy) omit these tags; absence is not a healthy state.
Preserve `unknown` and other actual values rather than substituting fresh labels.

`fresh` means a non-durable serving snapshot within the current one-hour threshold;
it does not certify individual jobs, every source, ingestion or GCP health.
`stale` means a non-durable snapshot beyond that threshold. `lkg_fallback` means
the verified durable fallback is serving, regardless of its age. `degraded` means
no active snapshot. Rendering/classification lives in
`apps/web/src/lib/public-serving-snapshot.ts`; re-read it if thresholds change.

For a current observation, perform an ordinary read-only GET on the affected
route, inspect the response headers and the corresponding meta tags. Record URL,
observation time and source/runtime SHA when known. An HTML edge cache can replay
render-time metadata: calculate present age from `generated-at` and current UTC
time, and account for HTTP `Age`/cache context. Do not interpret the captured
age-seconds value as continuously updated telemetry. Cached healthy responses
remain bounded to the existing TTL; stale/fallback/degraded HTML remains `no-store`.

## Internal runtime evidence

Existing structured snapshot events include `SNAPSHOT_FRESH`, `SNAPSHOT_STALE`,
`SNAPSHOT_LKG_FALLBACK`, `SNAPSHOT_REFRESH_FAILED`, `SNAPSHOT_INVALID` and
`SNAPSHOT_REFRESH_FINISHED`. Correlate them with the actual serving runtime and
deployment before diagnosing refresh health. Repository CI is separate evidence
and does not prove GCP, ingestion or source-level health.

The no-D1 built-Worker CI probe checks six exact header/meta matches on seven
HTML routes and safe Apply refusal (503, Retry-After 30, no redirect). It also
rejects the old public banner. A complete outage still retains the existing
unavailable response; source-level confirmation and application safeguards stay
in the visitor's job detail flow.

The softly pulsing orange dot beside “For Filipino talent” is decorative brand
art, has `aria-hidden="true"`, and becomes static under reduced motion. Its
animation conveys no serving or freshness state.
