import { expect, test } from "bun:test";
import { ping } from "./index";

const workerConfig = await Bun.file(
  new URL("../wrangler.toml", import.meta.url),
).text();

test("cron leaves processing headroom inside the 15-minute freshness target", () => {
  expect(workerConfig).toContain('crons = ["*/10 * * * *"]');
  expect(workerConfig).not.toContain('crons = ["*/15 * * * *"]');
});

test("missing PROXY_SECRET rejects instead of reporting a successful scheduled tick", async () => {
  await expect(ping({
    PROXY_SECRET: "",
    SCRAPE_URL: "https://example.com/api/cron/scrape",
  })).rejects.toThrow("PROXY_SECRET is not configured");
});

test("scheduled shadow work remains independent of scrape failure and runs only hourly", async () => {
  const { default: worker } = await import("./index");
  const oldFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = (async (url) => {
    calls.push(String(url));
    if (String(url).endsWith("scrape")) throw new Error("scrape unavailable");
    return new Response(JSON.stringify({ totalRegistryRows: 3, eligible: 0, dispatched: 0,
      skippedIneligible: 3, skippedInvalidProvider: 0, skippedInvalidEvidence: 0,
      skippedRunCap: 0, probeFailures: 0, rejectedProbeResults: 0,
      evidenceErrors: [], invalidProviderErrors: [], outcomes: {} }));
  }) as typeof fetch;
  try {
    const pending: Promise<unknown>[] = [];
    const ctx = { waitUntil: (promise: Promise<unknown>) => { pending.push(promise.catch(error => error)); } } as any;
    const env = { PROXY_SECRET: "test", SCRAPE_URL: "https://example.com/scrape", SHADOW_DISPATCH_URL: "https://example.com/shadow" };
    await worker.scheduled({ scheduledTime: Date.parse("2026-09-08T10:20:00Z") } as any, env, ctx);
    await Promise.all(pending);
    expect(calls).toEqual([env.SCRAPE_URL, env.SHADOW_DISPATCH_URL]);
    calls.length = 0;
    pending.length = 0;
    await worker.scheduled({ scheduledTime: Date.parse("2026-09-08T10:30:00Z") } as any, env, ctx);
    await Promise.all(pending);
    expect(calls).toEqual([env.SCRAPE_URL]);
  } finally { globalThis.fetch = oldFetch; }
});
