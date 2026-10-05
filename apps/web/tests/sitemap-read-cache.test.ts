import { describe, expect, test } from "bun:test";
import { GET } from "../src/pages/sitemap.xml";
import {
  createSitemapRowsCache,
  SITEMAP_ROWS_CACHE_MAX_JOBS,
  SITEMAP_ROWS_CACHE_TTL_MS,
} from "../src/lib/sitemap-rows-cache";

/**
 * `/sitemap.xml` is the discovery surface search engines crawl for job URLs. It is a
 * live route (`prerender = false`, Cloudflare Pages SSR, prod D1) and it is deliberately
 * absent from the shared edge cache: the allowlist regex in
 * `apps/web/src/lib/public-edge-cache.ts:5` covers `/`, `/opportunities`, `/directory`,
 * `/data-policy`, `/privacy`, `/categories/*` and `/jobs/*` only. So every crawler hit
 * reached the route, and the route read **every** public-eligible row — no `LIMIT`, no
 * module-level cache — before returning a document the response itself advertises as
 * reusable for an hour (`Cache-Control: public, max-age=3600, s-maxage=3600`).
 *
 * That is D1 row-read amplification on the one surface whose database is currently
 * exhausted (Cloudflare free-tier daily row-read limit, error 7500, and a ~14 h 503 on
 * 2026-10-04). This file pins a bounded resolved-rows cache to that route: inside the
 * cache window the second render must cost zero D1 reads, and the window may not outlive
 * the `max-age` the route already publishes to crawlers.
 *
 * Tests drive the real `GET` export and count the driver's `prepare()` calls. Nothing here
 * reads production, asserts against a constant, or greps source text.
 */

type StubRow = { id: number; updatedAt: string | null };

function rowsEnv(rows: StubRow[]) {
  let reads = 0;
  const env = {
    DB: {
      prepare(sql: string) {
        // One `prepare()` == one D1 statement execution attempt by this route.
        if (/\bfrom\s+"?opportunities"?/i.test(sql)) reads += 1;
        const statement = {
          bind() {
            return statement;
          },
          raw() {
            return Promise.resolve(rows.map((row) => [row.id, row.updatedAt]));
          },
          async all() {
            return { success: true, results: rows.map((row) => [row.id, row.updatedAt]) };
          },
          async first() {
            return { success: true, results: rows.map((row) => [row.id, row.updatedAt])[0] ?? null };
          },
          async run() {
            throw new Error("the sitemap route must never write");
          },
        };
        return statement;
      },
      async batch() {
        throw new Error("the sitemap route must never batch");
      },
    },
    reads: () => reads,
  };
  return env;
}

function render(env: unknown) {
  return GET({ locals: { runtime: { env } } } as never);
}

const jobLocs = (xml: string) => [...xml.matchAll(/<loc>[^<]*\/jobs\/(\d+)<\/loc>/g)].map((m) => Number(m[1]));

describe("repeated sitemap renders do not re-read the whole eligible corpus", () => {
  test("a second render inside the cache window costs zero additional D1 reads", async () => {
    const env = rowsEnv([
      { id: 1, updatedAt: "2026-09-30T12:00:00Z" },
      { id: 2, updatedAt: "2026-09-29T12:00:00Z" },
    ]);

    const first = await render(env);
    expect(env.reads()).toBe(1);
    const second = await render(env);

    // One read for two renders: a crawl burst (Googlebot re-fetching, several crawlers in
    // parallel) previously paid the full eligible-corpus read on every single hit.
    expect(env.reads()).toBe(1);
    expect(second.status).toBe(200);
    expect(await second.text()).toBe(await first.text());
  });

  test("the cached document is identical to the freshly read one, headers included", async () => {
    const env = rowsEnv([{ id: 7, updatedAt: "2026-09-30T12:00:00Z" }]);

    const first = await render(env);
    const firstBody = await first.text();
    const second = await render(env);

    const secondBody = await second.text();
    expect(secondBody).toBe(firstBody);
    expect(second.headers.get("Content-Type")).toBe(first.headers.get("Content-Type"));
    expect(second.headers.get("Cache-Control")).toBe("public, max-age=3600, s-maxage=3600");
    expect(jobLocs(secondBody)).toEqual([7]);
  });

  test("a different database binding is a different corpus and is read separately", async () => {
    // The cache is keyed on the live D1 binding, so one database's rows can never be
    // served as another's document — including between separate environments.
    const firstEnv = rowsEnv([{ id: 1, updatedAt: "2026-09-30T12:00:00Z" }]);
    const secondEnv = rowsEnv([{ id: 2, updatedAt: "2026-09-30T12:00:00Z" }]);

    await render(firstEnv);
    const second = await render(secondEnv);

    expect(firstEnv.reads()).toBe(1);
    expect(secondEnv.reads()).toBe(1);
    expect(jobLocs(await second.text())).toEqual([2]);
  });

  test("a D1 failure is still reported as a failure and is never cached", async () => {
    let reads = 0;
    const failingEnv = {
      DB: {
        prepare() {
          reads += 1;
          return {
            bind() {
              return this;
            },
            raw() {
              return Promise.reject(new Error("D1 daily row read limit exceeded [code: 7500]"));
            },
            async all() {
              throw new Error("D1 daily row read limit exceeded [code: 7500]");
            },
          };
        },
      },
      reads: () => reads,
    };

    const failure = await render(failingEnv);
    expect(failure.status).toBe(503);
    expect(failure.headers.get("Cache-Control")).toBe("no-store");

    // Nothing was stored, so the next render after D1 recovers performs a real read
    // instead of replaying the outage.
    const recovered = rowsEnv([{ id: 9, updatedAt: "2026-09-30T12:00:00Z" }]);
    const response = await render(recovered);
    expect(response.status).toBe(200);
    expect(jobLocs(await response.text())).toEqual([9]);
  });
});
describe("the cache bounds itself: window, payload and failures", () => {
  const rows = (ids: number[]) => ids.map((id) => ({ id, updatedAt: "2026-09-30T12:00:00Z" }));

  test("the window ends, so a newly published job URL still reaches crawlers", async () => {
    let clock = 1_000_000;
    const cache = createSitemapRowsCache({
      ttlMs: SITEMAP_ROWS_CACHE_TTL_MS,
      maxJobs: SITEMAP_ROWS_CACHE_MAX_JOBS,
      now: () => clock,
    });
    const binding = {};
    let reads = 0;
    const read = async () => {
      reads += 1;
      return reads === 1 ? rows([1]) : rows([1, 2]);
    };

    expect((await cache.load(binding, read)).map((r) => r.id)).toEqual([1]);

    // Anywhere inside the window the first read is reused...
    clock += SITEMAP_ROWS_CACHE_TTL_MS - 1;
    expect((await cache.load(binding, read)).map((r) => r.id)).toEqual([1]);
    expect(reads).toBe(1);

    // ...and at the window boundary D1 is consulted again, so the document cannot be
    // pinned forever and a new job URL appears on the next render after the window.
    clock += 1;
    expect((await cache.load(binding, read)).map((r) => r.id)).toEqual([1, 2]);
    expect(reads).toBe(2);
  });

  test("the window never outlives what this app already serves from cache", () => {
    // The route answers `Cache-Control: public, max-age=3600, s-maxage=3600`, and the
    // rest of the app already serves public surfaces from memory at 300 s
    // (`src/middleware.ts` edge TTL, `DIRECTORY_LISTING_CACHE_TTL_MS`). The in-isolate
    // window must not be the stalest layer any observer can see, so it is pinned to the
    // existing 300 s window rather than to this route's more generous header.
    expect(SITEMAP_ROWS_CACHE_TTL_MS).toBe(5 * 60 * 1000);
    expect(SITEMAP_ROWS_CACHE_TTL_MS).toBeLessThan(3600 * 1000);
  });

  test("a payload past the bound is served correctly but never retained", async () => {
    const cache = createSitemapRowsCache({ ttlMs: SITEMAP_ROWS_CACHE_TTL_MS, maxJobs: 2, now: () => 0 });
    const binding = {};
    let reads = 0;
    const read = async () => {
      reads += 1;
      return rows([reads, reads + 100, reads + 200]);
    };

    // Growth degrades to today's cost (a read per render) instead of caching a payload
    // nobody measured — correctness is unaffected.
    expect((await cache.load(binding, read)).map((r) => r.id)).toEqual([1, 101, 201]);
    expect((await cache.load(binding, read)).map((r) => r.id)).toEqual([2, 102, 202]);
    expect(reads).toBe(2);
  });

  test("a failed read stores nothing, so the outage is never replayed as data", async () => {
    const cache = createSitemapRowsCache({ ttlMs: SITEMAP_ROWS_CACHE_TTL_MS, maxJobs: 10, now: () => 0 });
    const binding = {};

    await expect(
      cache.load(binding, () => Promise.reject(new Error("D1 daily row read limit exceeded [code: 7500]"))),
    ).rejects.toThrow("7500");

    expect((await cache.load(binding, async () => rows([5]))).map((r) => r.id)).toEqual([5]);
  });

  test("each binding keeps its own entry and neither is dropped while retained", async () => {
    const cache = createSitemapRowsCache({ ttlMs: SITEMAP_ROWS_CACHE_TTL_MS, maxJobs: 10, now: () => 0 });
    const prodBinding = {};
    const stagingBinding = {};

    expect((await cache.load(prodBinding, async () => rows([1]))).map((r) => r.id)).toEqual([1]);
    expect((await cache.load(stagingBinding, async () => rows([2]))).map((r) => r.id)).toEqual([2]);
    expect((await cache.load(prodBinding, async () => rows([99]))).map((r) => r.id)).toEqual([1]);
    expect((await cache.load(stagingBinding, async () => rows([99]))).map((r) => r.id)).toEqual([2]);
  });
});
