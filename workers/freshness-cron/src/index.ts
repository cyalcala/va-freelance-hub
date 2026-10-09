// Retained freshness clock: cadence/ownership remains governed by the current
// savepoint and cutover contract. The endpoint owns ingestion and publication.
// A run-lock alone does not resolve uncertain writes or fence later invocations.

import { assessScrapeResponse, readScrapeResponseBody, ScrapeResponseError, type ScrapeReceipt } from "./scrape-response";
import { assessShadowResponse } from "./shadow-response";

export interface Env {
  // Set once with: wrangler secret put PROXY_SECRET (in this Worker's dir).
  PROXY_SECRET: string;
  // Configured in wrangler.toml [vars].
  SCRAPE_URL: string;
  SHADOW_DISPATCH_URL?: string;
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

export async function ping(env: Env): Promise<void> {
  if (!env.PROXY_SECRET) {
    throw new Error("PROXY_SECRET is not configured");
  }
  let status: number | null = null;
  let receipt: ScrapeReceipt;
  try {
    const response = await fetch(env.SCRAPE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.PROXY_SECRET}`,
        "x-cron-secret": env.PROXY_SECRET,
        "Content-Type": "application/json",
      },
      // A redirected POST would be another request and can forward auth headers.
      // https://developers.cloudflare.com/workers/runtime-apis/request/#properties
      redirect: "manual",
      signal: AbortSignal.timeout(60_000),
    });
    status = response.status;
    const body = await readScrapeResponseBody(response);
    receipt = assessScrapeResponse(body.raw, status,
      body.bodyValidity === "UNREADABLE" ? "INCOMPLETE" : "COMPLETE", body.bodyValidity);
  } catch {
    receipt = assessScrapeResponse("", status, "INCOMPLETE", "UNREADABLE");
  }
  // Persist non-secret response evidence in the existing Worker log before failure.
  console.log(`[freshness-cron] scrape receipt: ${JSON.stringify(receipt)}`);
  if (!["completed", "lock-held"].includes(receipt.responseEvidence.terminalState)) {
    throw new ScrapeResponseError(receipt);
  }
}

export default {
  // Scheduled (cron) entrypoint.
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(ping(env));
    // Independent promise: a scrape failure cannot suppress shadow observations.
    // Once per hour, using scheduled time rather than delayed execution time.
    if (env.SHADOW_DISPATCH_URL && new Date(event.scheduledTime).getUTCMinutes() === 20) {
      ctx.waitUntil(pingShadow(env));
    }
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
    } catch (error) {
      return new Response(JSON.stringify({ error: "SCRAPE_RESPONSE_REJECTED",
        ...(error instanceof ScrapeResponseError ? { receipt: error.receipt } : {}) }), {
        status: 500, headers: { "Content-Type": "application/json" },
      });
    }
  },
};

export async function pingShadow(env: Env): Promise<void> {
  if (!env.PROXY_SECRET || !env.SHADOW_DISPATCH_URL) throw new Error("Shadow clock is not configured");
  const response = await fetch(env.SHADOW_DISPATCH_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.PROXY_SECRET}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error(`shadow endpoint returned HTTP ${response.status}`);
  console.log(`[freshness-cron] ${assessShadowResponse(await response.text())}`);
}
