import { expect, test } from "bun:test";
import worker, { ping } from "./index";
import { ScrapeResponseError } from "./scrape-response";

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

test("scrape keeps the exact auth headers and 60-second signal, and rejects redirect replay", async () => {
  const oldFetch = globalThis.fetch;
  const oldTimeout = AbortSignal.timeout;
  const oldLog = console.log;
  const timeouts: number[] = [];
  const requests: Array<{ url: string; init: RequestInit }> = [];
  AbortSignal.timeout = (milliseconds) => { timeouts.push(milliseconds); return oldTimeout(milliseconds); };
  console.log = () => {};
  globalThis.fetch = (async (url, init) => {
    requests.push({ url: String(url), init: init! });
    return new Response("redirect", { status: 307, headers: { Location: "https://invalid.example/replay" } });
  }) as typeof fetch;
  try {
    await expect(ping({ PROXY_SECRET: "synthetic", SCRAPE_URL: "https://example.com/scrape" }))
      .rejects.toBeInstanceOf(ScrapeResponseError);
    expect(requests.length).toBe(1);
    expect(requests[0]).toMatchObject({ url: "https://example.com/scrape", init: {
      method: "POST", redirect: "manual", headers: {
        Authorization: "Bearer synthetic", "x-cron-secret": "synthetic", "Content-Type": "application/json",
      },
    } });
    expect(timeouts).toEqual([60_000]);
    expect(requests[0].init.signal).toBeInstanceOf(AbortSignal);
  } finally { globalThis.fetch = oldFetch; AbortSignal.timeout = oldTimeout; console.log = oldLog; }
});

test("transport exception text stays out of the manual response and pre-failure log", async () => {
  const oldFetch = globalThis.fetch;
  const oldLog = console.log;
  const logs: string[] = [];
  globalThis.fetch = (async (_input: Parameters<typeof fetch>[0]): Promise<Response> => { throw new Error("PRIVATE_TRANSPORT_MARKER"); }) as typeof fetch;
  console.log = (...args) => { logs.push(args.join(" ")); };
  try {
    const response = await worker.fetch(new Request("https://example.com/manual", {
      headers: { "x-cron-secret": "synthetic" },
    }), { PROXY_SECRET: "synthetic", SCRAPE_URL: "https://example.com/scrape" });
    const raw = await response.text();
    expect(response.status).toBe(500);
    expect(JSON.parse(raw)).toMatchObject({ error: "SCRAPE_RESPONSE_REJECTED", receipt: {
      publicationOutcome: "UNKNOWN", inserted: null, actualChanges: null, reconciliationRequired: true,
      responseEvidence: { operation: "scrape", httpStatus: null, transport: "INCOMPLETE", bodyValidity: "UNREADABLE" },
    } });
    expect(logs.length).toBe(1);
    expect(logs[0]).toContain('"reason":"TRANSPORT_INCOMPLETE"');
    expect(raw + logs.join("")).not.toContain("PRIVATE_TRANSPORT_MARKER");
  } finally { globalThis.fetch = oldFetch; console.log = oldLog; }
});

test("rejected unknown receipt is logged before the typed scheduled failure", async () => {
  const oldFetch = globalThis.fetch;
  const oldLog = console.log;
  const events: string[] = [];
  console.log = (...args) => { events.push(args.join(" ")); };
  globalThis.fetch = (async (_input: Parameters<typeof fetch>[0]) => new Response(JSON.stringify({ publicationOutcome: "UNKNOWN",
    inserted: null, actualChanges: null, confirmedPublishedLowerBound: 2, reconciliationRequired: true,
    error: "PRIVATE_RESPONSE_MARKER" }), { status: 500 })) as typeof fetch;
  try {
    let rejection: unknown;
    try { await ping({ PROXY_SECRET: "synthetic", SCRAPE_URL: "https://example.com/scrape" }); }
    catch (error) { rejection = error; events.push("REJECTED"); }
    expect(rejection).toBeInstanceOf(ScrapeResponseError);
    expect((rejection as ScrapeResponseError).receipt.confirmedPublishedLowerBound).toBe(2);
    expect((rejection as Error).message).toBe("SCRAPE_RESPONSE_REJECTED: PUBLICATION_OUTCOME_UNKNOWN");
    expect(events.length).toBe(2);
    expect(events[0]).toContain('"publicationOutcome":"UNKNOWN"');
    expect(events[1]).toBe("REJECTED");
    expect(events.join("")).not.toContain("PRIVATE_RESPONSE_MARKER");
  } finally { globalThis.fetch = oldFetch; console.log = oldLog; }
});
