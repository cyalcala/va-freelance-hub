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
};

type Runtime = import("@astrojs/cloudflare").Runtime<ENV>;

declare namespace App {
  interface Locals extends Runtime {
    
  }
}
