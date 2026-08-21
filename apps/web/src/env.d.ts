/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

type D1Database = import("@cloudflare/workers-types").D1Database;
type RateLimitBinding = {
  limit(input: { key: string }): Promise<{ success: boolean }>;
};

type ENV = {
  DB: D1Database;
  AI: any;
  PROXY_SECRET?: string;
  CRON_SECRET?: string;
  API_RATE_LIMITER?: RateLimitBinding;
  // Inngest signing key (set on the Pages project via `wrangler pages secret
  // put`). Inngest needs it to verify its requests to /api/inngest. It is NO
  // LONGER sufficient on its own to route triage through Inngest — that requires
  // TRIAGE_VIA_INNGEST="1" as well (see shouldTriageViaInngest in scrape.ts).
  // The signing key alone used to be the flag, which froze the board for ~30h on
  // 2026-08-18/19 when the key was present but the Inngest drain was not running.
  INNGEST_SIGNING_KEY?: string;
  INNGEST_EVENT_KEY?: string;
  // Durable-triage opt-in. Only "1" routes new listings through the Inngest
  // triage-drain queue; anything else (the default) triages inline. Set this
  // ONLY alongside a verified-live Inngest drain. See docs/inngest-durable-triage-2026-08-15.md.
  TRIAGE_VIA_INNGEST?: string;
  // Inline pending-triage backlog recovery opt-in. OFF by default: only "1"
  // lets the scrape route re-classify stranded `pending-triage` rows, which
  // spends the scarce daily Workers-AI neuron budget. Enable ONLY once that
  // budget has headroom (e.g. Workers Paid); otherwise it starves new-item
  // triage. See drainPendingTriageInline / maybeDrainPendingTriage in scrape.ts.
  // Gemini/Groq configuration enables the drain automatically; this remains an
  // explicit override for Cloudflare-only deployments.
  DRAIN_PENDING_TRIAGE?: string;
  // ── AI triage providers: free-first cascade (2026-08-20) ──────────────────
  // Default order: Gemini (free, primary) → Groq (free, overflow) → Cloudflare
  // Workers AI (neuron reserve, error 4006 when spent). Set AI_PRIMARY="cloudflare"
  // to invert to the old CF-first order. Each key is optional; absent = skipped.
  // All provider calls are charged against the same per-invocation subrequest
  // budget so the 50-subrequest cap always holds.
  AI_PRIMARY?: string;
  // Google Gemini (free tier). Bulk triage → GEMINI_MODEL (default
  // gemini-2.5-flash-lite, largest daily allowance); the critical skeptic vote →
  // the more capable GEMINI_CRITICAL_MODEL (default gemini-2.5-flash).
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  GEMINI_CRITICAL_MODEL?: string;
  // Groq (free tier, fast LPU). Second free provider — absorbs Gemini's
  // rate-limit / quota overflow before the Cloudflare reserve is touched.
  // GROQ_MODEL default llama-3.3-70b-versatile.
  GROQ_API_KEY?: string;
  GROQ_MODEL?: string;
};

type Runtime = import("@astrojs/cloudflare").Runtime<ENV>;

declare namespace App {
  interface Locals extends Runtime {
    
  }
}
