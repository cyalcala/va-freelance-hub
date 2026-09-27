import { expect, test } from "bun:test";
import { publicHtmlCacheKey, mayStorePublicHtml } from "../src/lib/public-edge-cache";

test("homepage tracking variants share one key while list filters remain distinct", () => {
  const key = (path: string) => publicHtmlCacheKey(new Request(`https://example.com${path}`))?.url;
  expect(key("/?utm_source=test")).toBe(key("/"));
  expect(key("/opportunities?q=writer")).not.toBe(key("/opportunities?q=designer"));
  expect(key("/opportunities?page=2")).not.toBe(key("/opportunities"));
});

test("APIs, private requests and unknown routes never share cached HTML", () => {
  for (const path of ["/api/cron/scrape", "/admin", "/api", "/unknown", "/sitemap.xml"]) {
    expect(publicHtmlCacheKey(new Request(`https://example.com${path}`))).toBeNull();
  }
  for (const headers of [{ Authorization: "Bearer value" }, { Cookie: "session=value" }] as Record<string, string>[]) {
    expect(publicHtmlCacheKey(new Request("https://example.com/", { headers }))).toBeNull();
  }
  expect(publicHtmlCacheKey(new Request("https://example.com/", { method: "POST" }))).toBeNull();
});

test("error and explicitly uncacheable responses cannot replace a healthy cache entry", () => {
  expect(mayStorePublicHtml(new Response("ok"))).toBe(true);
  expect(mayStorePublicHtml(new Response("unavailable", { status: 503 }))).toBe(false);
  for (const headers of [{ "Cache-Control": "no-store" }, { "Cache-Control": "private, max-age=0" }, { "Set-Cookie": "session=value" }] as Record<string, string>[]) {
    expect(mayStorePublicHtml(new Response("private", { headers }))).toBe(false);
  }
});
