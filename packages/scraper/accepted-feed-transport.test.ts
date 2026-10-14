import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { conditionalFetchText } from "./conditional";
import { hashString } from "./contentHash";
import { fetchRSSFeed } from "./rss";
import { fetchJSONSource } from "./json";
import { sources } from "./sources";

const realFetch = globalThis.fetch;
const rssSource = sources.find(source => source.id === "real-work-from-anywhere")!;
const jsonSource = sources.find(source => source.id === "remote-ok")!;
const rssBody = `<?xml version="1.0"?><rss><channel>
  <item><title>Example Co: Virtual Assistant</title><link>https://example.test/jobs/1</link>
    <region>Philippines</region><pubDate>Mon, 12 Oct 2026 04:00:00 GMT</pubDate><description>Support work.</description></item>
  <item><title>Example Co: Customer Support</title><link>https://example.test/jobs/2</link></item>
</channel></rss>`;
const jsonBody = JSON.stringify([
  { legal: "Synthetic legal header" },
  { position: "Virtual Assistant", company: "Example Co", url: "https://remoteok.com/remote-jobs/1",
    date: "2026-10-12T04:00:00.000Z", location: "Philippines", description: "Support work." },
  { position: "Customer Support", company: "Example Co", url: "https://remoteok.com/remote-jobs/2" },
]);
let globalCalls = 0;

function blockedDefaultTransport(): typeof fetch {
  return Object.assign(async (..._args: Parameters<typeof fetch>): Promise<Response> => {
    globalCalls++;
    throw new Error("test rejected global transport fallback");
  }, { preconnect: () => { throw new Error("test rejected global transport preconnect"); } });
}

beforeEach(() => {
  globalCalls = 0;
  // Every request in this file is synthetic. Ignoring the injected transport
  // must fail locally rather than contacting even a canonical public endpoint.
  globalThis.fetch = blockedDefaultTransport();
});
afterEach(() => { globalThis.fetch = realFetch; });

type Transport = (url: string, init: RequestInit) => Promise<Response>;
const adapters = [
  { name: "RSS", source: rssSource, body: rssBody, run: fetchRSSFeed },
  { name: "JSON", source: jsonSource, body: jsonBody, run: fetchJSONSource },
] as const;

describe("accepted-feed optional transport seam", () => {
  test("conditional request uses the injected transport and hashes the exact decoded body text", async () => {
    const body = "  complete\r\nbody 🇵🇭\n";
    let calls = 0;
    const transport: Transport = async (url, init) => {
      calls++;
      expect(url).toBe(rssSource.url);
      expect(init.headers).toEqual({ "User-Agent": "synthetic-agent", "If-None-Match": '"old"',
        "If-Modified-Since": "Mon, 12 Oct 2026 03:00:00 GMT" });
      expect(init.signal).toBeInstanceOf(AbortSignal);
      expect(init.signal!.aborted).toBe(false);
      expect(init.redirect).toBeUndefined();
      return new Response(body, { headers: { etag: '"new"', "last-modified": "Mon, 12 Oct 2026 04:00:00 GMT" } });
    };
    const result = await conditionalFetchText(rssSource.url, { "User-Agent": "synthetic-agent" },
      { etag: '"old"', lastModified: "Mon, 12 Oct 2026 03:00:00 GMT", lastBodyHash: "old-body" }, 15_000, transport);
    expect(result).toEqual({ notModified: false, text: body, status: 200, etag: '"new"',
      lastModified: "Mon, 12 Oct 2026 04:00:00 GMT", bodyHash: hashString(body) });
    expect(calls).toBe(1);
    expect(globalCalls).toBe(0);
  });

  for (const adapter of adapters) {
    test(`${adapter.name} delegates one canonical endpoint and preserves source facts`, async () => {
      let calls = 0;
      const transport: Transport = async (url, init) => {
        calls++;
        expect(url).toBe(adapter.source.url);
        expect(init.signal).toBeInstanceOf(AbortSignal);
        return new Response(adapter.body, { headers: { etag: '"feed"' } });
      };
      const result = await adapter.run(adapter.source, undefined, transport);
      expect(result.notModified).toBe(false);
      expect(result.bodyHash).toBe(hashString(adapter.body));
      expect(result.etag).toBe('"feed"');
      expect(result.items).toHaveLength(2);
      expect(result.items[0]!.postedAt).toBe("2026-10-12T04:00:00.000Z");
      expect(result.items[0]!.locationRaw).toBe("Philippines");
      expect(result.items[1]!.postedAt).toBeNull();
      expect(result.items[1]!.locationRaw).toBeNull();
      expect(calls).toBe(1);
      expect(globalCalls).toBe(0);
    });

    test(`${adapter.name} default and injected paths return identical parsed output and request options`, async () => {
      let defaultInit: RequestInit | undefined;
      globalThis.fetch = (async (_input, init) => {
        defaultInit = init;
        return new Response(adapter.body, { headers: { etag: '"same"' } });
      }) as typeof fetch;
      const defaultResult = await adapter.run(adapter.source, undefined);
      let calls = 0;
      const transport: Transport = async (url, init) => {
        calls++;
        expect(url).toBe(adapter.source.url);
        expect(init.headers).toEqual(defaultInit!.headers);
        expect(Object.keys(init).sort()).toEqual(Object.keys(defaultInit!).sort());
        expect(init.redirect).toBe(defaultInit!.redirect);
        expect(init.signal).toBeInstanceOf(AbortSignal);
        return new Response(adapter.body, { headers: { etag: '"same"' } });
      };
      globalThis.fetch = blockedDefaultTransport();
      expect(await adapter.run(adapter.source, undefined, transport)).toEqual(defaultResult);
      expect(calls).toBe(1);
      expect(globalCalls).toBe(0);
    });

    test(`${adapter.name} injected 304 does not consume a body or invent new observations`, async () => {
      let calls = 0;
      let bodyReads = 0;
      const response = new Response(null, { status: 304, headers: { etag: '"unacknowledged-new"' } });
      response.text = async () => { bodyReads++; throw new Error("304 body must not be read"); };
      const transport: Transport = async () => { calls++; return response; };
      const state = { etag: '"prior"', lastModified: "prior-date", lastBodyHash: "prior-hash" };
      expect(await adapter.run(adapter.source, state, transport)).toEqual({ items: [], notModified: true,
        etag: state.etag, lastModified: state.lastModified, bodyHash: state.lastBodyHash });
      expect(calls).toBe(1);
      expect(bodyReads).toBe(0);
      expect(globalCalls).toBe(0);
    });

    for (const status of [302, 429, 503]) test(`${adapter.name} injected HTTP ${status} fails without retry or reading the error body`, async () => {
      let calls = 0;
      let bodyReads = 0;
      const response = new Response("private error body", { status, headers: { location: "https://disallowed.test/feed", "retry-after": "3600" } });
      response.text = async () => { bodyReads++; throw new Error("error body must not be read"); };
      const transport: Transport = async () => { calls++; return response; };
      await expect(adapter.run(adapter.source, undefined, transport)).rejects.toThrow(`HTTP ${status}`);
      expect(calls).toBe(1);
      expect(bodyReads).toBe(0);
      expect(globalCalls).toBe(0);
    });

    for (const refusal of ["ENDPOINT_NOT_ALLOWED", "REDIRECT_NOT_ALLOWED", "BODY_LIMIT_EXCEEDED", "REQUEST_BUDGET_EXHAUSTED", "DEADLINE_EXCEEDED"]) {
      test(`${adapter.name} propagates transport ${refusal} without fallback or parsing a partial body`, async () => {
        let calls = 0;
        const transport: Transport = async () => { calls++; throw new Error(refusal); };
        await expect(adapter.run(adapter.source, undefined, transport)).rejects.toThrow(refusal);
        expect(calls).toBe(1);
        expect(globalCalls).toBe(0);
      });
    }

    test(`${adapter.name} refuses an interrupted body read without fallback`, async () => {
      let calls = 0;
      let bodyReads = 0;
      const response = new Response(adapter.body);
      response.text = async () => { bodyReads++; throw new Error("BODY_READ_INTERRUPTED"); };
      const transport: Transport = async () => { calls++; return response; };
      await expect(adapter.run(adapter.source, undefined, transport)).rejects.toThrow("BODY_READ_INTERRUPTED");
      expect(calls).toBe(1);
      expect(bodyReads).toBe(1);
      expect(globalCalls).toBe(0);
    });
  }

  test("injected unchanged HTTP 200 preserves its actual body and HTTP status", async () => {
    const body = "unchanged complete body";
    let calls = 0;
    const transport: Transport = async () => { calls++; return new Response(body); };
    const result = await conditionalFetchText(rssSource.url, {}, { lastBodyHash: hashString(body) }, 15_000, transport);
    expect(result).toEqual({ notModified: true, text: body, status: 200, etag: null, lastModified: null, bodyHash: hashString(body) });
    expect(calls).toBe(1);
    expect(globalCalls).toBe(0);
  });
});
