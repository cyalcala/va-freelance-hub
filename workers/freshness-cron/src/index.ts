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

// Length-independent comparison so a timing side-channel cannot leak the secret
// byte by byte. Mirrors the constant-time check the Pages API uses in
// apps/web/src/lib/auth.ts.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
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
  // Manual trigger for testing, AUTHENTICATED. Previously this handler ignored
  // the request entirely and fired a full scrape for anyone who found the URL —
  // on a public repo the Worker name is discoverable, so that was an open lever
  // for burning Workers AI neurons, D1 writes and Workers requests (all metered
  // free-tier resources). wrangler.toml now also sets workers_dev = false so no
  // public route exists; this check is the defence that survives a future route
  // being added back.
  async fetch(req: Request, env: Env): Promise<Response> {
    const supplied = req.headers.get("x-cron-secret") ?? "";
    if (!env.PROXY_SECRET || !timingSafeEqual(supplied, env.PROXY_SECRET)) {
      return new Response("Unauthorized", { status: 401 });
    }
    try {
      await ping(env);
      return new Response("ok", { status: 200 });
    } catch (e) {
      return new Response(`error: ${(e as Error).message}`, { status: 500 });
    }
  },
};
