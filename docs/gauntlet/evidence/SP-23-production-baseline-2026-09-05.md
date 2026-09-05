# SP-23 production supply and clock baseline — 2026-09-05

This is a bounded read-only evidence collection, not production acceptance or
source admission. Repository HEAD at collection was
`a5b73f2d00242f37638d9e7314433c080b664679`; the observed `origin/main` was
`3b46e9291eb64912c4e539a6625f90018320f760`. Parent work on the SP-23 branch
continued independently. No production writes, migration applications, source
fetches, workflow dispatches, or credential changes were performed by this audit.

## Measurement boundary

Direct read-only remote D1 execution could not authenticate from this shell:
Wrangler required `CLOUDFLARE_API_TOKEN`. The conventional repository credential
files were checked for presence; only root `.env` existed and it supplied no
Cloudflare token. No secret values were printed or GitHub secrets retrieved.
Consequently **no direct SQL result or `changed_db=false` assertion was obtained**.

A bounded authenticated-browser fallback was also checked using the installed
computer-use skill and CUA surface inventory. `cua.getState()` returned
`apps=[]` and `browsers=[]`: no existing Cloudflare dashboard surface was
available to inspect. No browser login, credential extraction, or backend session
request was attempted.

The fresh evidence below comes from existing GitHub runs and their D1-derived
reports. Counts not exposed there remain unknown, including:

- Current eligible active first-seen supply over one and seven days.
- Current opportunity exact-source attribution coverage and source shares.
- Total `source_registry` and `provider_profiles` counts and states.
- Production application and enforcement of migration `0039`.
- Complete seven-day ingestion attempt gaps and accepted job accounting.

These are unavailable measurements, not zero values. The August 29 economics
report (1,278 active, 150 active first-seen in seven days, 11 active rows with an
exact source ID) is historical and did not apply the positive PH-eligibility
predicate; it must not be substituted for today's eligible supply.

## Fresh source evidence

[Sentinel run 33949113404](https://github.com/cyalcala/va-freelance-hub/actions/runs/33949113404)
started at 2026-09-05T06:10:50Z and produced the September 5
`docs/source-health-latest.md` on the observed `origin/main`. Its preceding
24-hour `source_fetch_events` rollup shows 41 recorded identities, 7,959 raw item
sightings, and one identity with a failed attempt. Most identities recorded 62
ticks; their latest attempt timestamp was 2026-09-05T04:10:21.312Z.

| Allowed source | Attempts | OK | Skipped | Raw item sightings |
| --- | ---: | ---: | ---: | ---: |
| We Work Remotely | 62 | 61 | 0 | 5,502 |
| Remotive | 62 | 62 | 0 | 1,116 |
| Real Work From Anywhere | 62 | 62 | 50 | 600 |
| Remote OK | 62 | 62 | 50 | 236 |
| Jobicy admin/support APAC | 62 | 62 | 51 | 65 |
| Jobicy supporting APAC | 62 | 62 | 51 | 440 |

All recorded ATS identities were paused and skipped. Their `ok=true` results
are intentional policy skips, not successful network fetches. The duplicated
Breezy 20Four7VA identity has 124 skipped rows, so summing event rows does not
yield a scrape-run count. WWR's single failure was a feed fetch timeout.

Raw sightings include repeated feed contents and may include carried-forward
304 counts. They are neither unique jobs nor eligible accepted supply. The
source-economics diagnostic explicitly separates unchanged polls; this health
rollup does not. Six fetched identities represent five provider families because
the two Jobicy feeds share a provider.

[Prospector run 33961171888](https://github.com/cyalcala/va-freelance-hub/actions/runs/33961171888)
started at 2026-09-05T10:37:44Z. Its September 5 report records zero distinct ATS
candidates discovered, zero durable candidates inserted or refreshed, zero
`needs_review/candidate` backlog, and zero overdue candidates. The company
directory added Discord; that does not activate an ingestion source. The queue
measurement establishes an empty reported review queue, not a fresh total count
of every registry/provider state.

## Fresh clock and failure evidence

[Hunter run 33966012748](https://github.com/cyalcala/va-freelance-hub/actions/runs/33966012748)
at production SHA `3b46e9291eb64912c4e539a6625f90018320f760` read the durable
heartbeat and reported at 2026-09-05T12:26:07.248Z:

```json
{"action":"standby","reason":"primary clock attempted a run 5.8min ago (within 30min threshold)","minutesSinceAttempt":5.765516666666667}
```

Its downloaded `hunter-health-33966012748` artifact contains `harvest.log={}`
and a source-health summary with terminal state `unknown`. No scrape call was
placed by that standby run. Summary zeroes are defaults, not measured zero
inserts; the alert lifecycle correctly held its unknown state. This observation
proves recent primary attempt evidence at that instant, not uninterrupted
primary cadence or a clean accepted-job result for the attempt.

[Watchdog run 33957050263](https://github.com/cyalcala/va-freelance-hub/actions/runs/33957050263)
reported at 2026-09-05T09:06:08Z: status `healthy`, alert `false`, reason
`last run clean and heartbeat within 3h`. Its recovery lifecycle held because
there was no open incident. That is a three-hour threshold observation, not
proof of ten-minute delivery.

The GitHub run inventory contains 21 Hunter schedule runs between
2026-09-02T18:43:02Z and 2026-09-05T12:25:52Z (65.714 hours). Eight started in
the trailing 24 hours ending at the latter timestamp. The largest adjacent gap
was **307.4 minutes**, from September 3 06:12:47Z to 11:20:11Z, despite the
configured `*/15` schedule. This measures secondary scheduler delivery gaps,
not primary ingestion gaps. It does establish that the secondary is currently
an hours-scale best-effort backstop in this observed window.

Two of those 21 runs failed: 33885970802 and 33904301937. The latter
[run's failed-step log](https://github.com/cyalcala/va-freelance-hub/actions/runs/33904301937)
shows HTTP 200 at 2026-09-04T18:09:12Z, a response with `inserted=15`,
`acceptedForInsert=5`, `attemptedInsert=5`, zero insert errors, and 42/42 fetch
events recorded, followed by terminal state `success` and shell exit code 1.
That workflow failure must not be counted as a demonstrated ingestion failure.
The response's inserted count exceeding attempted inserts also prevents using
it as an authoritative net-new supply measurement without reconciling the
accounting semantics. No claim about the other failed run's root cause is made.

## What currently explains the supply constraint

The observed fetch portfolio remains six feed identities/five provider families,
with every recorded ATS source paused. Current Prospector evidence supplies no
candidate reserve for reviewed replenishment. Existing health reports measure
repeat sightings rather than eligible new supply. Clock evidence additionally
shows long secondary delivery gaps and a low number of recorded primary ticks
in the September 5 rollup; the exact primary gap distribution needs D1 evidence.
One WWR timeout is real, but this evidence does not justify treating it as the
principal cause of low supply or treating CI success as source acceptance.

## Next bounded read-only checks

Restore the existing authorized D1 diagnostic execution environment, then
capture per-query Wrangler JSON with `changed_db=false` and `rows_written=0`.
Use one fixed UTC `as_of` across the one-day and seven-day partitions. Count
active rows with `ph_eligibility IN ('eligible_verified','eligible_likely')`
and `unixepoch(scraped_at)` in each interval, grouped by exact `source_id` with
NULL explicitly separated. `scraped_at` is the repository's first-storage
proxy; it does not establish original publication date or replay-free net-new
admission if later processing changed activation state. Report the proxy and
reconcile it against canonical insertion evidence before calling it net-new.

Run `scripts/diagnostics/source-economics.ts` and the source-registry diagnostic
for the remaining source attribution, changed/unchanged fetch, policy state,
provider, and reserve counts. Read the migration ledger and `sqlite_master`
to establish 0039's production tables/triggers independently of branch files or
deployment status. Finally, read reserved ingestion diagnostic events and
`source_fetch_state` to compute actual primary gaps and distinguish attempted,
failed, locked, standby, and completed ingestion. None of these outstanding
queries were represented as executed by this audit.
