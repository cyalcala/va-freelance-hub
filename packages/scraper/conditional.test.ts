import { describe, expect, test, afterEach, mock } from "bun:test";
import { conditionalFetchText, unchangedOutput } from "./conditional";

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

function mockResponse(opts: { status?: number; body?: string; headers?: Record<string, string> }) {
  const headers = new Map(Object.entries(opts.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v]));
  globalThis.fetch = mock(async (_url: any, init: any) => ({
    status: opts.status ?? 200,
    ok: (opts.status ?? 200) >= 200 && (opts.status ?? 200) < 300,
    headers: { get: (k: string) => headers.get(k.toLowerCase()) ?? null },
    text: async () => opts.body ?? "",
    __init: init,
  })) as unknown as typeof fetch;
}

describe("conditionalFetchText", () => {
  test("sends If-None-Match / If-Modified-Since from state", async () => {
    let seen: any = null;
    globalThis.fetch = mock(async (_url: any, init: any) => {
      seen = init.headers;
      return { status: 200, ok: true, headers: { get: () => null }, text: async () => "body" };
    }) as unknown as typeof fetch;
    await conditionalFetchText("https://x/feed", { "User-Agent": "t" }, { etag: 'W/"abc"', lastModified: "Mon, 01 Jan 2026 00:00:00 GMT" });
    expect(seen["If-None-Match"]).toBe('W/"abc"');
    expect(seen["If-Modified-Since"]).toBe("Mon, 01 Jan 2026 00:00:00 GMT");
    expect(seen["User-Agent"]).toBe("t");
  });

  test("304 -> notModified, carries prior validators, no body", async () => {
    mockResponse({ status: 304 });
    const r = await conditionalFetchText("https://x/feed", {}, { etag: 'W/"abc"', lastBodyHash: "deadbeef" });
    expect(r.notModified).toBe(true);
    expect(r.status).toBe(304);
    expect(r.etag).toBe('W/"abc"');
    expect(r.bodyHash).toBe("deadbeef");
    expect(r.text).toBe("");
  });

  test("200 with identical body hash -> notModified", async () => {
    mockResponse({ status: 200, body: "same content" });
    // First call to learn the hash of "same content".
    const first = await conditionalFetchText("https://x/feed", {}, undefined);
    expect(first.notModified).toBe(false);
    mockResponse({ status: 200, body: "same content" });
    const second = await conditionalFetchText("https://x/feed", {}, { lastBodyHash: first.bodyHash });
    expect(second.notModified).toBe(true);
    expect(second.text).toBe("same content");
  });

  test("200 with changed body -> not notModified, new validators surfaced", async () => {
    mockResponse({ status: 200, body: "new content", headers: { ETag: 'W/"v2"', "Last-Modified": "later" } });
    const r = await conditionalFetchText("https://x/feed", {}, { lastBodyHash: "oldhash" });
    expect(r.notModified).toBe(false);
    expect(r.etag).toBe('W/"v2"');
    expect(r.lastModified).toBe("later");
    expect(r.bodyHash).not.toBe("oldhash");
  });

  test("non-2xx (not 304) throws so the source is reported failed", async () => {
    mockResponse({ status: 503 });
    await expect(conditionalFetchText("https://x/feed", {}, undefined)).rejects.toThrow(/HTTP 503/);
  });
});

describe("unchangedOutput", () => {
  test("produces an empty, notModified output carrying prior validators", () => {
    const o = unchangedOutput({ etag: 'W/"e"', lastModified: "lm", lastBodyHash: "h" });
    expect(o).toEqual({ items: [], notModified: true, etag: 'W/"e"', lastModified: "lm", bodyHash: "h" });
  });
  test("handles undefined state", () => {
    expect(unchangedOutput(undefined)).toEqual({ items: [], notModified: true, etag: null, lastModified: null, bodyHash: null });
  });
});
