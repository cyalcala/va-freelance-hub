// Freshness cron Worker (2026-07). Cloudflare Cron Triggers are free-plan and
// fire on schedule reliably — unlike GitHub Actions' free cron, which we
// observed drifting 1.5-3 hours late. This tiny Worker pings the scrape
// endpoint every 15 minutes so any newly posted job reaches the site well
// under an hour. The scrape endpoint owns all the real logic (conditional
// fetch, run-lock, triage); this Worker is just a reliable clock.
//
// The scrape endpoint is idempotent and holds a run-lock, so it is safe for
// this Worker and the GitHub Hunter to both trigger it — overlaps are deduped.

export interface Env {
  // Set once with: wrangler secret put PROXY_SECRET (in this Worker's dir).
  PROXY_SECRET: string;
  // Configured in wrangler.toml [vars].
  SCRAPE_URL: string;
}

async function ping(env: Env): Promise<void> {
  if (!env.PROXY_SECRET) {
    console.warn("[freshness-cron] PROXY_SECRET not set; skipping (set it with `wrangler secret put PROXY_SECRET`).");
    return;
  }
  const res = await fetch(env.SCRAPE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.PROXY_SECRET}`,
      "x-cron-secret": env.PROXY_SECRET,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(60_000),
  });
  const body = await res.text();
  console.log(`[freshness-cron] scrape ${res.status}: ${body.slice(0, 500)}`);
  if (!res.ok) throw new Error(`scrape endpoint returned HTTP ${res.status}`);
}

export default {
  // Scheduled (cron) entrypoint.
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(ping(env));
  },
  // Manual trigger for testing: GET the Worker URL to fire a scrape once.
  async fetch(_req: Request, env: Env): Promise<Response> {
    try {
      await ping(env);
      return new Response("ok", { status: 200 });
    } catch (e) {
      return new Response(`error: ${(e as Error).message}`, { status: 500 });
    }
  },
};
