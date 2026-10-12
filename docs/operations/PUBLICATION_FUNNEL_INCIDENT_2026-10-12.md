# October 12 publication funnel incident — read-only evidence

Observed 2026-10-12 09:36–10:04 UTC / 17:36–18:04 Asia/Manila, following the owner's report of one October 12 listing at 17:26. Source HEAD was `0f8068350b6572385d2e88d145539cc6c20a9b86`; local scrape binding-budget repairs remained dirty. This investigation performed ordinary public GETs, bounded production D1 SELECTs, Turso SELECT aggregates, Cloudflare metadata/analytics reads, and a bounded passive runtime tail. It did not invoke ingestion, fetch a job provider, publish, sync, deploy, migrate, change schedules, change source authority, or purchase a service.

**Finding:** the owner's low-output observation is corroborated. Production D1 contains one currently public listing whose source posting timestamp falls on October 12 Manila time, five currently public rows first seen today, and fifteen first seen in the measured last 24 hours. One of today's five has the stored `eligible_verified` label; four have `eligible_likely`. This remains far below the 100/day floor and 150 stretch. Neither label, first-seen date, nor these inventory reads independently certifies first-unique verified publication. Accepted MATH remains **0/13**, certified daily verified flow **UNKNOWN**.

Two concrete stage failures coexist: the inspected Turso acquisition lake has received no new raw acquisition since October 8 and contains no unsynced qualified-ready eligible supply; the retained ten-minute Cloudflare ingestion clock is deployed and still attempts requests, but its successful ingestion heartbeat/fetch-event record stopped at 13:50 Manila while its caller subsequently throws. Successful hourly GCP job receipts do not resolve either failure.

## Public serving and actual D1 inventory

Canonical public URL is [remotejobs-ph.pages.dev](https://remotejobs-ph.pages.dev), matching README and deployed Cloudflare project metadata.

| Observation | Actual evidence |
| --- | --- |
| `/opportunities`, 09:36:42 UTC | HTTP 200; `X-Public-Snapshot: stale`; source `edge`; generated `2026-10-12T05:51:47.909Z`; age 13,493 seconds; `Cache-Control: no-store`; 1,617 shared-snapshot jobs and 735 companies |
| Six corresponding HTML head metadata values | All matched the response's snapshot status, generated time, source, age, jobs and companies |
| Home, 09:39:09 UTC; job detail, 09:39:11 UTC | HTTP 200; fresh source `d1`; generated `2026-10-12T09:03:02.994Z`; same 1,617 jobs / 735 companies |
| [Today Manila arrival filter](https://remotejobs-ph.pages.dev/opportunities?fresh=today), 09:41:43 UTC | Five results, IDs 9153, 9152, 9151, 9150, 9149; fresh D1 snapshot generated 09:03:02 UTC |
| [Last-24-hour arrival filter](https://remotejobs-ph.pages.dev/opportunities?fresh=24h), 09:41:44 UTC | Fifteen results; same fresh snapshot |
| Production D1, 09:43:07 UTC | 7,196 total opportunity rows; 1,617 active rows in the two public eligibility states; one source-posted today; five first-seen today; latest stored timestamp `2026-10-12T03:41:02.421Z` |
| D1 snapshot row, 09:44:52 UTC | Generated `2026-10-12T09:03:02.994Z`; `refresh_started_at = NULL`; encoded payload length 658,343 characters |

The initial stale edge response is a real serving inconsistency; later fresh responses and the database contain the same public inventory. Thus edge staleness alone does not explain the missing daily output. Runtime snapshot error logs are needed to distinguish edge/isolate delay, failed refresh, rejected candidate, timeout or another cause; a fresh classification does not certify ingestion health.

[Billing Officer at Sourcefit, ID 9153](https://remotejobs-ph.pages.dev/jobs/9153) is the one displayed October 12 posting. D1 source ID is `breezy:sourcefit`, active with `eligible_verified`; original `posted_at = 2026-10-12T02:47:36.438Z`, `scraped_at`/`updated_at`/`last_seen_in_feed_at = 2026-10-12T03:41:02.421Z`, and `last_verified_at = NULL`. The detail's JSON-LD datePosted matches the original timestamp. Its source-to-first-seen interval is approximately 53m26s. No original job provider was fetched or independent vacancy/Apply verification performed in this incident.

The arrival filter uses `scraped_at` in `public-board.ts`; displayed source date uses the posting timestamp. These are different measures. That distinction does not dismiss the shortfall: even the broader today-arrival count is only five, and only one carries the stored verified label.

## Funnel and completed-day storage proxies

The 24-hour D1 window started `2026-10-11T09:43:00Z`; the Manila-today window started `2026-10-11T16:00:00Z` and remained open during observation.

| Source / state in the 24-hour storage cohort | Rows |
| --- | ---: |
| We Work Remotely, active `eligible_likely` | 13 |
| Sourcefit, active `eligible_verified` | 1 |
| Remote OK, active `eligible_likely` | 1 |
| Inactive `policy-rejected` rows across WWR, Remote OK and Jobicy | 4 |

Today has six new stored rows: five public and one inactive policy rejection. No `pending-triage` rows appeared in the bounded grouped inactive inventory. Historical inactive rows remain held; their presence does not authorize revival or backlog publication.

| Manila first-seen day | Stored rows | Currently public verified-label rows | Currently public likely-label rows |
| --- | ---: | ---: | ---: |
| 2026-10-12, open | 6 | 1 | 4 |
| 2026-10-11 | 20 | 0 | 17 |
| 2026-10-10 | 29 | 0 | 16 |
| 2026-10-09 | 43 | 5 | 19 |
| 2026-10-08 | 56 | 12 | 28 |
| 2026-10-07 | 241 | 13 | 32 |

These are current storage/eligibility proxies, not immutable historical exposure or daily certification. Current deactivation can change them. Existing `measure-first-publication-funnel.ts` also explicitly leaves raw, qualification, authorization, first-publication and public-consistency stages UNKNOWN from D1 inventory alone.

Today's existing publication ledger has three unlimited receipts reporting five IDs/items: two WWR receipts reporting four, one Sourcefit receipt reporting one. Latest ledger receipt is `2026-10-12T03:41:02.421Z`. Across all history the ledger has 432 unlimited receipts reporting 1,046 and 23 capped receipts reporting 25, latest capped receipt `2026-10-09T14:00:30.157Z`. These receipts establish their recorded scope, not the missing MATH certification contract.

## Acquisition reservoir

The existing local Turso credentials successfully read the configured lake at 09:41–09:47 UTC. No token or endpoint was printed. Endpoint-host SHA-256 is `9b4c515e01cc89617e367643e29f972b21787f3c9f8497c289c0e262985623e5`; compare that digest with the deployed GCP secret endpoint before attributing this lake to every GCP runner.

| Lake population | Observation |
| --- | --- |
| Candidate jobs | 1,885 |
| `SYNCED_TO_D1` | 1,078: 723 verified-label and 355 likely-label |
| `EXCLUDED` | 624, ineligible |
| `AMBIGUOUS` | 183, unclear |
| Eligible `QUALIFIED_READY`, unsynced | **0** |
| Raw observations | 401: 400 processed, one unprocessed from October 1 |
| Newest raw fetch | `2026-10-08 10:55:52` UTC |
| Newest candidate observation | `2026-10-08 10:51:48` UTC |
| Newest sync timestamp | `2026-10-08 11:47:38` UTC |
| Operational run rows | 58; newest `run-lake-miner`, `2026-10-08 10:57:13`, stored status `completed`, `finished_at = NULL` |
| Today / last 24 hours | No new candidate observations, raw observations or operational runs in the inspected lake |

An empty qualified-ready reservoir gives the hourly lake publisher no measured ready supply to publish. The acquisition interruption precedes today's edge staleness. A run's stored `completed` label with missing finish time is limited telemetry, not a live healthy miner receipt. This observation does not authorize fetching, resuming a miner, granting sources, or bypassing quality gates.

## Actual retained clock and failure boundary

Cloudflare APIs confirm deployed Worker `va-freelance-freshness-cron`, schedule `*/10 * * * *`, modified October 3. Current deployment is `283ede61-7d3b-4722-ab28-c0aa51a42f1e`, 100% version `1ddd35ba-0b09-4cb3-a771-61b327d2be4c`, created `2026-10-03T13:46:38.322086Z`. Its plain-text targets match the scrape and shadow Pages routes, and `PROXY_SECRET` exists as a secret binding. No secret value was read from the API or disclosed. Exact Worker Git provenance remains UNKNOWN.

At 09:46 UTC, `__ingest_diag__` latest attempt/success and latest source-fetch events were `2026-10-12T05:50:57.109Z` (13:50 Manila), with no stored diagnostic error. The run-lock row was updated `2026-10-12T09:40:57.710Z` (17:40 Manila) and had not been released to its epoch placeholder. This proves later attempts reaching the lock, while successful downstream fetch-event/terminal-diagnostic evidence ceased. A previously clean heartbeat is stale evidence, not current run health.

Cloudflare analytics for `[05:40,09:51)` UTC show 23 `scriptThrewException` invocations of the retained freshness Worker and two successes. Individual error samples start 06:01 UTC and continue through 09:31 UTC. Error-group CPU p50 was 960 microseconds and p99 1,673 microseconds; the caller's own CPU exhaustion is not established. Fetch events before the interruption contain frequent cadence skips and unchanged responses; their carried-forward item counts are not unique new arrivals.

A passive, sanitized Pages/Worker tail ran 09:53:32–10:02 UTC and observed the existing scheduled invocation without sending an active scrape POST. The retained freshness Worker event at **10:01:10.104 UTC / 18:01:10 Manila** had outcome `exception`, exception name `Error`, and a sanitized **HTTP 503** classification. The Pages observer yielded no matching runtime sample and exited 0; absence of that sample is not proof of successful Pages execution or usable Pages log access. Raw headers, response bodies, log text and credentials were discarded by the observer; only fixed classes and timestamps were emitted.

A subsequent D1 SELECT at 10:04:32 UTC found the run-lock attempt/update timestamp **10:01:10.117 UTC**, while the terminal ingestion heartbeat still read 05:50:57.109 UTC. The existing tick advanced the physical lock row yet produced HTTP 503 and no fresh terminal evidence.

Inspection of the API-reported deployed commit `3065f0d709d5a1950c247d5a11df542b07721bcb` finds two explicit 503 branches: registry policy load failure before lock acquisition (lines 1951–1957), and unavailable run-lock acknowledgement (lines 1982–1986). The latter returns before `lockAcquired = true` at line 1988, so the finally-release guard does not release it. The advancing lock and missing downstream evidence therefore strongly support **a committed lock UPDATE whose acknowledgement cannot be classified**, rather than missing cron scheduling. This is a falsifiable hypothesis, not a proved mutation-result shape: the trusted Pages response reason/error prefix or actual binding acknowledgement was not recovered. Do not manually unlock or replace the coordination contract on the strength of this correlation alone.

## Production revision, schema and quota evidence

Pages canonical deployment is `e1b0ff66-8a93-41b0-b9c7-6de8346c81c7`, created `2026-10-08T10:37:48.410888Z`, reported commit `3065f0d709d5a1950c247d5a11df542b07721bcb`, successful deploy stage ending 10:37:52 UTC. This is different from current source HEAD; local test success does not establish deployed repair.

Production D1's latest recorded migration is **0054**, applied `2026-10-07 08:31:02`. Tables include the original publication ledger, registry, durable source opt-outs and serving snapshot. Reservation, publication uncertainty and Manila-day publication tables are absent. The deployment must be reconciled with these prerequisites before a current gateway release: in particular, the 0057 reservation gateway cannot be assumed compatible with a 0054 database.

Registry aggregate: five conditional active, fifteen conditional canary, one conditional quarantined, two conditional shadow, thirty-four needs-review candidate; zero durable opt-outs. Current lease ranges are future March 2027 in the active/canary groups. Those aggregates do not independently adjudicate every source or posting.

Existing OAuth successfully read production D1 through its SELECT API, with every query reporting `rows_written = 0`. The initial normal Wrangler helper did not yield a parseable success receipt; fresh direct OAuth access supersedes a blanket claim that D1 access is unavailable. No new credential/provider was created. Account billing subscriptions returned HTTP 403/code 10000; paid-plan status remains UNKNOWN.

At 09:51 UTC, account-wide October 12 D1 analytics reported **993,839 rows read and 9,434 rows written**. The database-specific observation reported 1,603 read queries and 512 write queries. Cloudflare's [D1 pricing reference](https://developers.cloudflare.com/d1/platform/pricing/) lists five million reads/day and 100,000 writes/day for Workers Free. The observed aggregate is below those values; the proposed daily D1 read-quota exhaustion is not supported by this measurement. This does not prove every Pages binding or runtime request healthy. [D1 analytics](https://developers.cloudflare.com/d1/observability/metrics-analytics/) and [Worker invocation metrics](https://developers.cloudflare.com/analytics/graphql-api/tutorials/querying-workers-metrics/) document the queried metrics.

## Concrete next evidence and remediation boundary

1. Recover the trusted Pages 503 reason or fixed run-lock error prefix, then reproduce the actual mutation acknowledgement shape locally. The passive cron sample narrows the failure to HTTP 503, and the same tick advanced the lock without terminal progress; a successful physical UPDATE must not be confused with a classified acquisition acknowledgement. Do not manufacture a successful run from an old clean heartbeat or GCP exit status, and do not manually clear the production lock.
2. Match the live GCP Turso endpoint to the inspected host digest; identify the actual last miner execution and its owner/trigger. Restore permitted acquisition only through the existing source, cadence and quality contracts; an empty reservoir is not fixed by broadening publication authority.
3. Reconcile the production Pages revision and 0054 schema with the bounded binding repair and required authority/uncertainty/reservation safeguards before any release. No deployment or migration was performed by this incident slice.
4. Re-measure new unique cleared publications and matching public visibility after an authorized repair. Today's source date, first-seen inventory, ledger counts and existing storage are separate evidence; completed-day verified flow stays UNKNOWN until the full contract is met.
