# Bounded stale-to-fresh public follow-up

Four ordinary production GETs on October 13 observed the existing snapshot
refresh become available. No authenticated API, SQL, analytics, provider,
manual cron, deployment or rollback request was made. The helper performed
two requests, waited once for 30 seconds because both responses were stale,
then performed exactly two more requests.

| Pair | Observed UTC | Generation | Snapshot age | Status and cache policy |
| --- | --- | --- | --- | --- |
| First | `12:12:44` | `12:01:02.407Z` | 701–702 seconds | Both HTTP 200, `stale`, edge source, `Cache-Control: no-store` |
| Second | `12:13:14` | `12:12:44.333Z` | 30 seconds | Both HTTP 200, `fresh`, D1 source, `X-Edge-Cache: MISS`, `Cache-Control: public, max-age=60, s-maxage=60` |

The requested paths were `/opportunities?fresh=today` and `/jobs/9214` in
each pair. Both generations reported 1,661 jobs and 735 companies. The today
filter displayed the same 22 IDs in both pairs, including `9214`; that detail
route returned 200 throughout, with JSON-LD
`datePosted=2026-10-12T00:00:00.000Z`. All snapshot head metadata matched the
corresponding response headers. No 5xx occurred among these four responses.

This proves a bounded observed transition from stale fallback to a newly
generated fresh response after the 30-second wait. The earlier generation
also shows that the preceding request-triggered refresh had advanced the
snapshot. It does not establish an exact refresh completion time, continuous
five-minute visibility, every-edge behavior, runtime CPU/cost, or current
provider-opening validity. This public-only sample did not recheck deployment
identity; the earlier authenticated post-release receipt remains the identity
evidence.

The exact 22 rendered today IDs were:

```text
9214 9212 9207 9206 9205 9204 9203 9202 9201 9200 9199
9198 9197 9196 9194 9193 9191 9189 9188 9187 9186 9182
```

`post-release-refresh-followup.json` retains the sanitized response projections,
timestamps and body hashes; raw bodies were not retained.
`post-release-refresh-followup-readonly.ts` is the executed bounded helper.
Both and this note are hashed in `post-release-refresh-followup-integrity.json`.
Earlier evidence files were left unchanged. Certified daily throughput remains
UNKNOWN and MATH acceptance remains 0/13.
