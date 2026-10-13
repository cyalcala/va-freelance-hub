import { expect, test } from "bun:test";
import { publicHtmlCacheKey, publicHtmlCacheControl, mayStorePublicHtml } from "../src/lib/public-edge-cache";

test("homepage tracking variants share one key while list filters remain distinct", () => {
  const key = (path: string) => publicHtmlCacheKey(new Request(`https://example.com${path}`))?.url;
  expect(key("/?utm_source=test")).toBe(key("/"));
  expect(key("/opportunities?q=writer")).not.toBe(key("/opportunities?q=designer"));
  expect(key("/opportunities?page=2")).not.toBe(key("/opportunities"));
});

test("design releases do not reuse HTML entries from previous asset builds", () => {
  for (const path of ["/", "/opportunities?q=writer&page=2", "/data-policy", "/privacy"]) {
    const key = publicHtmlCacheKey(new Request(`https://example.com${path}`));
    expect(key).not.toBeNull();
    const revision = new URL(key!.url).searchParams.get("__public_cache_revision");
    expect(revision).toBeTruthy();
    expect(revision).not.toBe("2026-10-07-refresh-recovery");
    expect(revision).not.toBe("2026-10-07-premium-ui");
    expect(revision).not.toBe("2026-10-08-pigment-paper");
  }
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

test("snapshot HTML expires at its data deadline even if its stored status still says fresh", () => {
  const generated = Date.parse("2026-10-12T12:00:00.000Z");
  const snapshot = (timestamp: string = new Date(generated).toISOString(), extra: Record<string, string> = {}) =>
    new Response("board", { headers: { "X-Public-Snapshot": "fresh", "X-Public-Snapshot-Generated-At": timestamp, ...extra } });
  expect(publicHtmlCacheControl(snapshot(), generated)).toBe("public, max-age=60, s-maxage=60");
  expect(publicHtmlCacheControl(snapshot(), generated + 299_000)).toBe("public, max-age=1, s-maxage=1");
  expect(mayStorePublicHtml(snapshot(), generated + 299_000)).toBe(true);
  expect(mayStorePublicHtml(snapshot(), generated + 300_000)).toBe(false);
  expect(publicHtmlCacheControl(snapshot(), generated + 300_000)).toBe("no-store");
  for (const timestamp of ["", "unknown", "not-a-date", new Date(generated + 1).toISOString()]) {
    expect(mayStorePublicHtml(snapshot(timestamp), generated)).toBe(false);
  }
  for (const extra of [{ "Cache-Control": "no-store" }, { "Cache-Control": "private" },
    { "Set-Cookie": "private=value" }, { "X-Public-Snapshot": "stale" }] as Record<string, string>[]) {
    expect(publicHtmlCacheControl(snapshot(undefined, extra), generated)).toBe("no-store");
  }
  expect(publicHtmlCacheControl(new Response("error", { status: 503, headers: snapshot().headers }), generated)).toBe("no-store");
  expect(publicHtmlCacheControl(new Response("policy"), generated)).toBe("public, max-age=60, s-maxage=300, stale-while-revalidate=600");
});
