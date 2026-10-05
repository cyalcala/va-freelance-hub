import { describe, expect, spyOn, test } from "bun:test";
import { GET } from "../src/pages/sitemap.xml";

/**
 * `/sitemap.xml` is the discovery surface search engines crawl for job URLs, and it
 * is a live public route (`prerender = false`, served from prod D1 through Cloudflare
 * Pages SSR). A D1 failure therefore has to be reported as a failure.
 *
 * The bug: the route's single `catch` logged the error and then fell through to the
 * success path, returning a **cacheable HTTP 200** whose document contained only the
 * five static pages. That is a success-shaped answer to an incomplete read: the HTTP
 * status says success, the `Cache-Control` header lets Cloudflare and crawlers store it
 * for an hour, and the document itself asserts "this is the complete list of job URLs"
 * while every job URL is missing. Nothing anywhere counted the loss — the log line was
 * the only signal, and it carried the raw upstream error object.
 *
 * Every other public surface in this app already answers the same condition honestly:
 * `markPublicDataUnavailable()` in `src/lib/public-route-load.ts` sets 503 +
 * `Cache-Control: no-store` and logs a *redacted* error classification. This file pins
 * the sitemap route to that same contract.
 */

type StubRow = { id: number; updatedAt: string | null };

/**
 * Minimal D1 stub. `read` stands in for the driver's row read: it returns the
 * positional arrays drizzle expects, or throws exactly as a real D1 read would.
 */
function makeEnv(read: () => unknown[]) {
  const statements: Array<{ sql: string }> = [];
  const env = {
    DB: {
      prepare(sql: string) {
        statements.push({ sql });
        const statement = {
          bind() {
            return statement;
          },
          raw() {
            // Drizzle's D1 session reads rows via `raw()`, which resolves to the
            // positional row arrays themselves.
            return Promise.resolve(read());
          },
          async all() {
            return { success: true, results: read() };
          },
          async first() {
            return { success: true, results: read()[0] ?? null };
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
    statements,
  };
  return env;
}

function rowsEnv(rows: StubRow[]) {
  return makeEnv(() => rows.map((row) => [row.id, row.updatedAt]));
}

async function render(read: () => unknown[]) {
  const response = await GET({ locals: { runtime: { env: makeEnv(read) } } as never } as never);
  return { response, body: await response.text() };
}

const quotaError = () =>
  new Error("D1_ERROR: HTTP 500 - Your account has exceeded D1's free tier daily row read limit", {
    cause: new Error("D1 daily row read limit exceeded [code: 7500]"),
  });

const jobLocs = (xml: string) => [...xml.matchAll(/<loc>[^<]*\/jobs\/(\d+)<\/loc>/g)].map((m) => Number(m[1]));

describe("a D1 failure is reported as a failure, not as a successful sitemap", () => {
  test("a total D1 failure answers 503 and never presents a partial sitemap as success", async () => {
    const { response, body } = await render(() => {
      throw quotaError();
    });

    expect(response.status).toBe(503);
    // No success-shaped sitemap document: a `<urlset>` (or even just the static
    // pages) here would still tell a crawler this is the complete list.
    expect(body).not.toContain("<urlset");
    expect(body).not.toContain("<loc>");
    expect(body).not.toContain("</url>");
  });

  test("the failure cannot be cached and served later as a valid sitemap", async () => {
    const { response } = await render(() => {
      throw quotaError();
    });

    // The success path advertises `public, max-age=3600`. A transient D1 outage must
    // not be stored by the CDN or a crawler under those terms, otherwise the outage
    // keeps removing job URLs from the index long after D1 recovered.
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Cache-Control")).not.toContain("max-age");
  });

  test("a failure while materializing rows is also a 503, not a silent empty sitemap", async () => {
    // Drizzle maps the driver's positional rows before the route sees them, so a
    // mapping failure lands in the same try. It must not look like "zero jobs".
    const { response, body } = await render(() => {
      const results: unknown[] = [
        [1, "2026-09-30T12:00:00Z"],
        [2, "2026-09-30T12:00:00Z"],
      ];
      Object.defineProperty(results, 1, {
        enumerable: true,
        configurable: true,
        get() {
          throw new Error("row mapping failed");
        },
      });
      return results;
    });

    expect(response.status).toBe(503);
    expect(body).not.toContain("<loc>");
  });

  test("a throw after some URLs were accumulated answers 503 rather than a truncated 200", async () => {
    // The accumulation loop sits inside the same try, so a partial list must never be
    // published as if it were complete: a crawler would treat the short list as
    // authoritative and drop the missing job URLs from the index.
    const hostileId = {
      toString() {
        throw new Error("unrenderable id");
      },
    };
    const env = makeEnv(() => [
      [1, "2026-09-30T12:00:00Z"],
      [hostileId, "2026-09-30T12:00:00Z"],
      [3, "2026-09-30T12:00:00Z"],
    ]);
    const response = await GET({ locals: { runtime: { env } } as never } as never);

    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("<loc>");
  });

  test("the failure log keeps the D1 classification and drops the raw upstream text", async () => {
    const secret = "token-abc123-DB-binding-secret";
    const log = spyOn(console, "error").mockImplementation(() => {});
    try {
      await render(() => {
        throw new Error(`Failed query: ${secret}`, { cause: new Error("D1 daily limit exceeded") });
      });

      expect(log).toHaveBeenCalled();
      const logged = log.mock.calls.flat().join(" ");
      // Classified, so the incident stays diagnosable (the live outage is 7500, which
      // classifies as d1_quota)...
      expect(logged).toContain("d1_quota");
      // ...but no SQL text, binding or upstream message reaches the log.
      expect(logged).not.toContain(secret);
      expect(logged).not.toContain("Failed query");
    } finally {
      log.mockRestore();
    }
  });
});

describe("the healthy sitemap path is untouched by the failure contract", () => {
  test("a successful read still answers 200, cacheable, with every job URL", async () => {
    const env = rowsEnv([
      { id: 1, updatedAt: "2026-09-30T12:00:00Z" },
      { id: 2, updatedAt: "2026-09-29T12:00:00Z" },
    ]);
    const response = await GET({ locals: { runtime: { env } } as never } as never);
    const xml = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("application/xml");
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=3600, s-maxage=3600");
    expect(jobLocs(xml)).toEqual([1, 2]);
    expect(xml).toContain("<loc>https://remotejobs-ph.pages.dev/</loc>");
    expect(xml).toContain("<lastmod>2026-09-30</lastmod>");
  });

  test("an empty result set is still a successful sitemap of the static pages", async () => {
    // Zero eligible rows is a real, honest 200 — it must not be confused with the
    // failure case above, which is the whole point of separating the two.
    const env = rowsEnv([]);
    const response = await GET({ locals: { runtime: { env } } as never } as never);
    const xml = await response.text();

    expect(response.status).toBe(200);
    expect(xml).toContain("</urlset>");
    expect(jobLocs(xml)).toEqual([]);
  });
});
