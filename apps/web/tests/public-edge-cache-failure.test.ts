import { afterEach, expect, mock, test } from "bun:test";
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
