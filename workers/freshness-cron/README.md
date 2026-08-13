# Freshness Cron Worker

A tiny Cloudflare Worker whose only job is a **reliable clock**. Its Cron
Trigger fires the scrape endpoint every 15 minutes so newly posted jobs reach
the site in well under an hour.

## Why it exists

GitHub Actions' free cron is best-effort and, in practice, drifts 1.5–3 hours
late — which is the real bottleneck to freshness. Cloudflare Cron Triggers are
free-plan and fire on schedule. The scrape endpoint owns all the logic
(conditional fetch, run-lock, triage); this Worker just calls it on time.

The scrape endpoint is idempotent and holds a run-lock, so overlapping manual
or recovery triggers are deduped.

## One-time setup (≈2 minutes)

The workflow `.github/workflows/gha-deploy-cron-worker.yml` deploys the code +
schedule automatically on push. It fails before deployment unless the Worker
secret exists. Set the shared secret **once**:

```bash
cd workers/freshness-cron
npx wrangler secret put PROXY_SECRET
# paste the SAME value as the Pages project's PROXY_SECRET
```

Missing secret configuration is a deployment and runtime failure. The Worker
is the sole production clock; the hourly GitHub watchdog files an issue when
the durable heartbeat is absent after grace, degraded, or at least three hours
stale. GitHub scheduling is best effort, so this is measured operational
evidence rather than a guaranteed sub-three-hour delivery promise.

## Verify

- `npx wrangler deployments list` shows the Worker deployed.
- Use a scheduled run and `wrangler tail` for verification. `workers_dev` is
  disabled, so no public manual route is expected.
- `npx wrangler tail va-freelance-freshness-cron` streams each cron run.
- The next `source_fetch_events` rows (via the Medic digest) should show fresh
  timestamps ~15 min apart instead of GitHub's laggy gaps.

## Change the cadence

Edit `crons` in `wrangler.toml` (e.g. `*/10 * * * *`) and push. Keep it in
line with source terms — some feeds (Jobicy) ask for only a few checks/day, so
the endpoint's per-source cadence guards still apply regardless of this clock.
