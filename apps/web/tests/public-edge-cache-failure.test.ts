import { afterEach, expect, mock, spyOn, test } from "bun:test";
import { readPublicHtmlCache } from "../src/lib/public-edge-cache";

// Astro supplies this virtual module at build time. Its identity wrapper is
// the only framework glue mocked here; tests execute the actual middleware.
mock.module("astro:middleware", () => ({ defineMiddleware: (handler: unknown) => handler }));
const { onRequest } = await import("../src/middleware");

const originalCache = Object.getOwnPropertyDescriptor(globalThis, "caches");
afterEach(() => {
  if (originalCache) Object.defineProperty(globalThis, "caches", originalCache);
  else Reflect.deleteProperty(globalThis, "caches");
});

function render(locals: unknown = {}) {
  return onRequest({ request: new Request("https://example.com/opportunities"), locals } as never,
    async () => new Response("Verified last-known-good board")) as Promise<Response>;
}

test("a throwing cache binding cannot prevent the public route from rendering", async () => {
  Object.defineProperty(globalThis, "caches", { configurable: true, get() { throw new Error("cache unavailable"); } });
  const response = await render();
  expect(response.status).toBe(200);
  expect(await response.text()).toBe("Verified last-known-good board");
});

test("a hanging HTML cache lookup falls through to the public route", async () => {
  Object.defineProperty(globalThis, "caches", { configurable: true, value: { default: {
    async match() { return new Promise(() => {}); }, async put() {},
  } } });
  const response = await render();
  expect(response.status).toBe(200);
  expect(await response.text()).toBe("Verified last-known-good board");
});

test("a failed cache write is contained even when attached to waitUntil", async () => {
  Object.defineProperty(globalThis, "caches", { configurable: true, value: { default: {
    async match() { return undefined; }, async put() { throw new Error("cache write unavailable"); },
  } } });
  const pending: Promise<unknown>[] = [];
  const response = await render({ runtime: { ctx: { waitUntil(p: Promise<unknown>) { pending.push(p); } } } });
  expect(response.status).toBe(200);
  await Promise.all(pending);
});

test("cache lookup failure returns a miss instead of propagating to middleware", async () => {
  const result = await readPublicHtmlCache({ async match() { throw new Error("cache read failed"); }, async put() {} }, new Request("https://example.com/"));
  expect(result).toBeUndefined();
});

test("a cached stale HTML page cannot conceal recovered fresh data", async () => {
  let writes = 0;
  Object.defineProperty(globalThis, "caches", { configurable: true, value: { default: {
    async match() { return new Response("Old saved listings notice", { headers: { "X-Public-Snapshot": "stale" } }); },
    async put() { writes += 1; },
  } } });
  const response = await render();
  expect(await response.text()).toBe("Verified last-known-good board");
  expect(response.headers.get("X-Edge-Cache")).toBe("MISS");
  expect(writes).toBe(1);
});

test("a middleware cache hit forwards only the snapshot's remaining lifetime", async () => {
  const generatedAt = "2026-10-12T12:00:00.000Z";
  const clock = spyOn(Date, "now").mockReturnValue(Date.parse(generatedAt) + 299_000);
  const body = '<meta name="va-hub:snapshot-age-seconds" content="240">Saved board';
  let renders = 0;
  let writes = 0;
  Object.defineProperty(globalThis, "caches", { configurable: true, value: { default: {
    async match() { return new Response(body, { headers: {
      "X-Public-Snapshot": "fresh", "X-Public-Snapshot-Generated-At": generatedAt,
      "X-Public-Snapshot-Age-Seconds": "240", "Cache-Control": "public, max-age=60, s-maxage=60",
    } }); },
    async put() { writes += 1; },
  } } });
  try {
    const response = await onRequest({ request: new Request("https://example.com/opportunities"), locals: {} } as never,
      async () => { renders += 1; return new Response("Unexpected render"); }) as Response;
    expect(response.headers.get("X-Edge-Cache")).toBe("HIT");
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=1, s-maxage=1");
    expect(response.headers.get("X-Public-Snapshot-Generated-At")).toBe(generatedAt);
    expect(response.headers.get("X-Public-Snapshot-Age-Seconds")).toBe("240");
    expect(await response.text()).toBe(body);
    expect(renders).toBe(0);
    expect(writes).toBe(0);
  } finally {
    clock.mockRestore();
  }
});

test("new fallback HTML stays usable without being stored as a fresh cached page", async () => {
  let writes = 0;
  Object.defineProperty(globalThis, "caches", { configurable: true, value: { default: {
    async match() { return undefined; }, async put() { writes += 1; },
  } } });
  const response = await onRequest({ request: new Request("https://example.com/"), locals: {} } as never,
    async () => new Response("Saved board", { headers: { "X-Public-Snapshot": "lkg_fallback" } })) as Response;
  expect(response.status).toBe(200);
  expect(await response.text()).toBe("Saved board");
  expect(writes).toBe(0);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
});
