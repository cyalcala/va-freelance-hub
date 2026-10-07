import { beforeEach, describe, expect, spyOn, test } from "bun:test";
import { GET } from "../src/pages/sitemap.xml";
import { getDurableLkgSnapshot } from "../src/lib/durable-lkg-snapshot";
import { resetPublicBoardState } from "../src/lib/public-serving-snapshot";

/**
 * `/sitemap.xml` is the discovery surface search engines crawl for job URLs.
 * The old bug was a cacheable HTTP 200 that contained only the five static pages
 * after a D1 failure, which told crawlers the job URL list was empty.
 *
 * A D1 failure now serves the durable last-known-good board: a complete previous
 * URL list, marked `X-Public-Snapshot: lkg_fallback`. That is a freshness
 * degradation, not a partial document. 503 remains only when no board can be
 * served at all. The log still classifies the quota error and omits raw SQL.
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
            if (/\bpublic_serving_snapshot\b/i.test(sql)) return { meta: { changes: 1 } };
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

function expectCompleteLkg(response: Response, body: string) {
  const lkg = getDurableLkgSnapshot();
  expect(response.status).toBe(200);
  expect(response.headers.get("X-Public-Snapshot")).toBe("lkg_fallback");
  expect(response.headers.get("X-Public-Snapshot-Jobs")).toBe(String(lkg.jobs.length));
  expect(response.headers.get("X-Public-Snapshot-Source")).toBe("durable_lkg");
  expect(body).toContain("<urlset");
  expect(jobLocs(body)).toEqual(lkg.jobs.map((job) => job.id));
}

describe("a D1 failure serves the last-known-good board, not a partial sitemap", () => {
  beforeEach(() => {
    resetPublicBoardState();
  });

  test("a total D1 failure answers 200 with the complete durable URL list", async () => {
    const { response, body } = await render(() => {
      throw quotaError();
    });

    // A static-only urlset would still tell a crawler the job list is empty.
    // The durable board is the complete previous list, so it is a real 200.
    expectCompleteLkg(response, body);
    expect(body).toContain("<loc>https://remotejobs-ph.pages.dev/</loc>");
  });

  test("the last-known-good sitemap stays cacheable because it is a complete document", async () => {
    const { response } = await render(() => {
      throw quotaError();
    });

    expect(response.headers.get("Cache-Control")).toBe("public, max-age=3600, s-maxage=3600");
    expect(response.headers.get("X-Public-Snapshot")).toBe("lkg_fallback");
  });

  test("a failure while materializing rows serves the durable board, not an empty sitemap", async () => {
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

    expectCompleteLkg(response, body);
  });

  test("a throw while reading rows does not publish a truncated job list", async () => {
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
    const body = await response.text();

    expectCompleteLkg(response, body);
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
  beforeEach(() => {
    resetPublicBoardState();
  });

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
    expect(response.headers.get("X-Public-Snapshot")).toBe("fresh");
    expect(xml).toContain("<loc>https://remotejobs-ph.pages.dev/</loc>");
    expect(xml).toContain("<lastmod>2026-09-30</lastmod>");
  });

  test("an empty upstream result does not replace the durable board with a static-only sitemap", async () => {
    const env = rowsEnv([]);
    const response = await GET({ locals: { runtime: { env } } as never } as never);
    const xml = await response.text();

    expectCompleteLkg(response, xml);
  });
});
