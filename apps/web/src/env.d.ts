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
  // put`). Its PRESENCE is the durable-triage feature flag: when set, the
  // scrape route persists new listings as `pending-triage` and the Inngest
  // triage-drain worker classifies them out-of-band; when absent, triage runs
  // inline exactly as before. See docs/inngest-durable-triage-2026-08-15.md.
  INNGEST_SIGNING_KEY?: string;
  INNGEST_EVENT_KEY?: string;
};

type Runtime = import("@astrojs/cloudflare").Runtime<ENV>;

declare namespace App {
  interface Locals extends Runtime {
    
  }
}
