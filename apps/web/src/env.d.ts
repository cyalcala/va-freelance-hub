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
};

type Runtime = import("@astrojs/cloudflare").Runtime<ENV>;

declare namespace App {
  interface Locals extends Runtime {
    
  }
}
