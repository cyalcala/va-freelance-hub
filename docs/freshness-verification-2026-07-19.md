# Freshness "24-hour lag" investigation — 2026-07-19 (verdict: NO BUG)

Reported symptom: "today is July 19 and the jobs still say July 17 — is there
a bug?" An external AI conversation suggested two theories: a stuck run-lock,
or a PROXY_SECRET 401 wall. **Both were checked against production and both
are wrong.** The pipeline is healthy end to end; the lag is source-side
weekend lull plus posted-date sorting.

## Evidence chain (all checked live, 2026-07-19 ~12:30 UTC)

1. **Run-lock is cycling, not stuck.** `__scrape_run_lock__.last_attempt_at =
   2026-07-19T12:30:25Z` — claimed by the cron fire that happened seconds
   before the check. The 8-minute TTL design is working; no release bug in
   practice (each 15-min Worker fire reclaims cleanly).
2. **No 401 wall.** All six feed sources show fresh successful attempts today
   (09:25 / 09:45 / 12:30 UTC) with `last_error = null` and healthy item
   counts. Requests are clearly getting past auth and completing.
3. **GitHub Actions pulses all green.** Hunter ran ~hourly through Jul 18–19
   (latest 11:52Z), plus successful Verifier, Prune, Sentinel, Prospector and
   Medic runs. No workflow stopped.
4. **Ingestion is landing rows.** Jobs by `scraped_at` day: Jul 18 = 24,
   Jul 19 = 6 (as of midday UTC). The pipeline inserts when sources publish.
5. **The sources themselves are quiet — this is the actual cause.** Checked
   the feeds directly:
   - We Work Remotely RSS newest item: **Jul 16 21:07Z** (our DB holds WWR
     jobs posted Jul 17 20:07Z from other category feeds — we are *ahead* of
     this feed).
   - Remotive API newest item: **Jul 16 13:28Z** — matches our DB exactly.
   - RemoteOK: newest posted Jul 18 08:05Z — ingested Jul 19 09:25Z.
   There is nothing newer to ingest. Jul 18–19 was a weekend; employers were
   not posting.
6. **ATS/company-board sources (GitLab, Grafana, Ashby, Camunda, Amplify)**
   show newest *first-seen* jobs from Jul 17 evening — consistent with no new
   weekend postings on corporate boards, while their Hunter runs kept
   succeeding.

## Why the site "looks" stuck on July 17

The board sorts by `coalesce(posted_at, scraped_at) DESC` — the employer's
posted date, which is correct for job seekers. Only 6 active jobs carry a
Jul 18 posted date and (as of midday UTC Sunday) none carry Jul 19, so Jul 17
dominates the top of the list. Expect normal volume to resume Monday
(US business hours).

## Notes for future incidents

- The "stuck lock" theory fails structurally: the Worker refires every 15
  minutes and the lock TTL is 8 — a crashed run can delay the next successful
  run by at most ~8 minutes, not 24 hours.
- A real silent freeze would show as stale `last_attempt_at` across
  `source_fetch_state`. That is the single fastest check:
  `SELECT source_id, last_attempt_at, last_error FROM source_fetch_state ORDER BY last_attempt_at ASC;`
- Worthwhile hardening (open idea, not yet built): a dead-man's switch that
  alerts when no successful source attempt has occurred for N hours — catches
  absence-of-runs, which per-run error reporting structurally cannot.
