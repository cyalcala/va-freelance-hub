# Publication flow observation — 2026-10-13

The normal clock was running, but admitted VA companies remained unfetched and
the public snapshot hid a recorded public job. This bounded observation does
not establish reliable daily delivery. **Certified newly published, verified
PH-eligible remote jobs per day: UNKNOWN. MATH acceptance remains 0/13.**

## Observation boundary and provenance

The retained observations cover **11:14–11:23 UTC / 19:14–19:23 Manila on
October 13**. “Today” in the database queries begins at
`2026-10-12T16:00:00.000Z` (October 13 Manila midnight) and ends at
`2026-10-13T11:17:07.511Z`. The 60-minute and 24-hour windows end at that same
instant. This is a partial-day observation, not a daily acceptance window.

Evidence is in [the retained observation bundle](../evidence/publication-flow-2026-10-13/README.md).
It contains allowlisted response projections, exact SQL and parameters, query
digests, response metadata, selected public HTML fields and body hashes.
Original public HTML bodies were not retained. Hashes establish the retained
files' integrity; they do not independently attest the provider responses or
the truth of a vacancy.

Authenticated metadata at `11:17:14.521Z` reported Cloudflare Pages project
`remotejobs-ph`, production deployment
`e1b0ff66-8a93-41b0-b9c7-6de8346c81c7`, created October 8, and commit
`3065f0d709d5a1950c247d5a11df542b07721bcb`. This is deployment metadata,
not byte-for-byte artifact attestation. The migration query's newest entry
was `0054_public_serving_snapshot.sql`. This observation does not authorize
deploying later-schema application code or applying migrations.

The initial metadata request returned HTTP 401 / error `10000`; that denial is
retained. A later request succeeded. Every successful retained D1 SELECT
reported `rowsWritten: 0`. These checks did not dispatch scrape/ingest routes,
call vacancy providers, change source admission, deploy code or create a clock.
Ordinary public GETs can trigger the site's existing snapshot refresh behavior;
“read-only” here describes the audit's API/query operations, not an assertion
that serving a GET has no application side effects.

## Inventory and daily counts

The inventory SELECT at `11:17:16.810Z` returned:

| Measure | Observed value | Meaning and limitation |
| --- | ---: | --- |
| Stored opportunities | 7,257 | All stored rows, including hidden and older rows |
| Currently public in D1 | 1,661 | `is_active=1` and PH label `eligible_verified` or `eligible_likely` |
| Stored first seen today | 33 | `scraped_at` in the bounded Manila-day interval |
| Public first seen today | 22 | Currently public rows with that first-seen timestamp |
| Public first seen today with `eligible_verified` label | 1 | Stored classification label; not independent verification |
| Public rows source-posted today | 20 | `posted_at` in the interval; distinct from first seen or publication time |
| Public rows with future `posted_at` | 0 | Compared with the query cutoff, using SQLite datetime parsing |

The 22 public first-seen rows were 16 We Work Remotely, three 20four7VA,
one Sourcefit, one Remote OK and one Real Work From Anywhere. All 22 had
`location_type='remote'` and `last_verified_at=NULL`. The sole
`eligible_verified` row was Sourcefit ID `9191`. These labels and nulls do not
prove, or disprove, all external vacancy facts; they prevent treating this
inventory count as independently certified throughput.

The publication ledger for the same bounded day contains **19 receipts
reporting 22 published rows, but only 13 positive integer ID occurrences and
13 unique stored IDs**. Six receipts disagree between published count and
ID-array length:

| Source | Receipts | Reported published | ID occurrences | Disagreeing receipts |
| --- | ---: | ---: | ---: | ---: |
| `breezy:20four7va` | 2 | 3 | 0 | 2 |
| `breezy:sourcefit` | 1 | 1 | 1 | 0 |
| `real-work-from-anywhere` | 1 | 1 | 1 | 0 |
| `remote-ok` | 1 | 1 | 0 | 1 |
| `we-work-remotely` | 14 | 16 | 11 | 3 |
| **Total** | **19** | **22** | **13** | **6** |

The joined 13 IDs exist, match their receipt source and were currently public;
none were missing or attributed to a different stored source. All 13 carried
the remote label and `last_verified_at=NULL`. One carried the verified PH
label. ID agreement establishes this limited reconciliation, not complete
publication correctness, unique original vacancies or source verification.
The nine-row gap between reported counts and named IDs must remain unresolved
in throughput reporting.

## The clock runs while the Workable cohort starves

Six source-event timestamps from `10:20:59.039Z` through `11:10:58.996Z`
were approximately ten minutes apart. Each recorded 62 source events and zero
failed events; skipped counts were respectively 44, 59, 60, 60, 60 and 60.
The latest ingest diagnostic reported success at `11:10:58.996Z`, and the
run-lock row showed its released sentinel with update time `11:11:06.672Z`.
This proves the sampled durable events exist. It does not prove continuous
operation outside the sample, successful collection of skipped sources, or
new verified publication at every tick.

The seven Workable canaries were `coconutva`, `crewbloom`, `hello-rache`,
`hunt-st`, `pearltalent`, `pineapple-staffing` and `rocketams`. **Each source**
had zero fetched events and six rotation skips in the last 60 minutes, and
zero fetched events and 111 rotation skips in the last 24 hours. The 111
figure is per source, not the cohort total. The cohort totals are 42 hourly
and 777 daily rotation skips, with zero fetched events.

Their registry rows were conditional canaries, each with a two-new-item
publication cap, a provider minimum cadence of 60 minutes, no observed
registry or durable opt-out, and admission expiry
`2027-03-10T21:31:09.551Z`. Registry permission alone is not proof that every
runtime access condition is satisfied. HuntSt and RocketAMS had last-attempt
state dated September 27; the remaining five had no state in the bounded
state query. A successful overall tick therefore concealed no current intake
for these admitted VA sources.

This report does not infer the cause of rotation starvation from the live
counts alone. The separate reproduced selector counterexample and repair
evidence must establish that cause and its correction. It also does not
identify every listed VA employer as Australian, dayshift or remote for every
role. Apply the owner's [opening-completeness priority](../directives/2026-10-12-OWNER-VA-OPENING-COMPLETENESS.md)
with per-opening evidence and the existing source controls.

## Public visibility lag is independently observable

At approximately `11:14:11Z`, ordinary GETs for `/`, `/opportunities`,
`/opportunities?fresh=today` and `?fresh=24h` all returned HTTP 200. Their
headers and matching snapshot metadata reported an edge snapshot generated at
`02:08:14.626Z`, age 32,756 seconds (9 h 5 min 56 s), marked stale, containing
1,644 jobs and 735 companies. The today filter displayed five IDs
(`9189`, `9188`, `9187`, `9186`, `9182`) and four October 13 date-label
occurrences. A displayed date occurrence is not a count of newly published
verified vacancies.

At approximately `11:17:23Z`, the same ordinary surfaces served a snapshot
generated at `10:22:28.616Z`: 1,660 jobs, 735 companies and 21 today-filter
results. That generation time predates the observation: this was promotion of
an existing newer snapshot, not evidence that the audit built a new one or
deployed a repair. The response called the snapshot `fresh` at an age of
3,293 seconds (54 min 53 s). `/opportunities` was a cache HIT with HTTP
`Age: 85` and a rendered snapshot-age header of 3,208 seconds. The latter
was the age embedded when that cached response was made, not its full age at
observation. These old-runtime responses do not satisfy a five-minute
freshness guarantee.

The D1 public-first-seen set contained 22 IDs while the newer today-filter
response contained 21; the sole missing ID was **`9214`**. Its D1 row was
active, `eligible_likely`, remote, first seen `10:20:59.039Z`. Its
Real Work From Anywhere publication receipt was at `10:30:03.554Z`, after
the served snapshot's generation. An ordinary GET to `/jobs/9214` at
`11:23:11.328Z` returned **404**. The comparison proves a concrete public
visibility gap for an existing active row, rather than assuming inventory
counts equal browser-visible jobs.

For comparison, `/jobs/9191` returned 200 at `11:23:10.169Z`, with JSON-LD
`datePosted=2026-10-13T03:16:03.361Z`, the same older snapshot and a stale age
of 3,640 seconds. This comparison verifies the sampled route behavior only;
it is not a full browser interaction or provider-opening check.

A snapshot JSON-array projection at `11:17:21.314Z` failed with HTTP 400 /
error `7500`; it remains in the evidence. The metadata-only follow-up at
`11:23:08.044Z` succeeded and recorded generation `10:22:28.616Z`, refresh
start `11:23:06.080Z`, payload length 685,195 characters and
`payload_is_plain_json=0`. The reported deployed source supports `gz:`
base64/gzip snapshot storage. Applying SQLite JSON-array functions directly
to encoded storage was an invalid inspection assumption. The zero plain-JSON
flag is not evidence of payload corruption, nor does this metadata-only
query prove the stored payload decodes successfully. The refresh-start value
is not a completed-refresh receipt.

## Proven, unproven and NEXT

Proven within these retained observations: the sampled normal ticks ran;
the seven Workable canaries were skipped rather than fetched; ledger counts
and named IDs disagree; D1 public inventory exceeded public snapshot
visibility; one named active row returned 404 through its detail route.

Unproven: uninterrupted every-ten-minute or hourly health, complete intake of
all permitted employer openings, independent current PH/remote/availability
verification, recovery of all missing ledger IDs, bounded runtime snapshot
age, deployed repair effectiveness, sustainable cost, and 100–150 or more
unique new verified openings each day. No MATH requirement advances from
these counts. October 13 observations must not be relabeled as evidence
for the owner's original October 12 17:26 report.

NEXT is to deploy and observe the independently tested, schema-0054-compatible
snapshot repair with exact artifact provenance, then the bounded selector and
publication-safety repairs after their own adversarial and broader checks.
Use ordinary clock executions to prove actual admitted-source fetches and
actual returned publication IDs against public visibility. Preserve cadence,
source permission, publication caps, original-date/PH/remote gates and
rollback. A deferred-validator workaround alone does not prove that every
opening has a durable published, rejected or pending disposition.
