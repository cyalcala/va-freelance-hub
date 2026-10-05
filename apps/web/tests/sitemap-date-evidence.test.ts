import { describe, expect, test } from "bun:test";
import { GET } from "../src/pages/sitemap.xml";
import { normalizeUtcIso } from "../src/lib/time";

/**
 * `/sitemap.xml` is the discovery surface search engines crawl, and it is a live
 * public route (`prerender = false`, served from prod D1 through Cloudflare Pages
 * SSR). Every public-eligible opportunity must appear in it.
 */

type StubRow = { id: number; updatedAt: string | null };

function stubLocals(rows: StubRow[]) {
  // D1 `.all()` returns positional arrays in projection order (id, updatedAt).
  const dbRows = rows.map((row) => [row.id, row.updatedAt]);
  const statements: Array<{ sql: string; params: unknown[] }> = [];
  const env = {
    DB: {
      prepare(sql: string) {
        const record = { sql, params: [] as unknown[] };
        statements.push(record);
        const statement = {
          bind(...values: unknown[]) {
            record.params = values;
            return statement;
          },
          async all() {
            return { success: true, results: dbRows };
          },
          async first() {
            return { success: true, results: dbRows[0] ?? null };
          },
          async raw() {
            return dbRows;
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
  };
  return { locals: { runtime: { env } } as never, statements };
}

async function render(rows: StubRow[]): Promise<{ xml: string; statements: Array<{ sql: string }> }> {
  const { locals, statements } = stubLocals(rows);
  const response = await GET({ locals } as never);
  return { xml: await response.text(), statements };
}

const jobLocs = (xml: string) => [...xml.matchAll(/<loc>[^<]*\/jobs\/(\d+)<\/loc>/g)].map((m) => Number(m[1]));

describe("sitemap job URLs survive an unusable source date", () => {
  test("a malformed date does not drop the remaining job URLs", async () => {
    // The bug: `new Date(row.updatedAt).toISOString()` throws RangeError on an
    // unparseable value, inside the accumulation loop, inside the route's single
    // try/catch. The catch then returns a sitemap containing only the five static
    // pages: one bad row silently deletes every job URL that came after it.
    const { xml } = await render([
      { id: 1, updatedAt: "2026-09-30T12:00:00Z" },
      { id: 2, updatedAt: "not-a-date" },
      { id: 3, updatedAt: "2026-09-29T00:00:00Z" },
    ]);
    expect(jobLocs(xml)).toEqual([1, 2, 3]);
  });

  test("every unusable date shape is tolerated and still emits the job URL", async () => {
    const unusable = [
      "not-a-date",
      "",
      "   ",
      "2026-13-45T99:99:99Z",
      "0000-00-00",
      "yesterday",
      "2026-09-30T12:00:00Zextra",
    ];
    const rows: StubRow[] = unusable.map((updatedAt, index) => ({ id: index + 1, updatedAt }));
    rows.push({ id: 99, updatedAt: "2026-09-30T12:00:00Z" });

    const { xml } = await render(rows);
    expect(jobLocs(xml)).toEqual([...unusable.map((_, index) => index + 1), 99]);
  });

  test("a null date emits the job URL with no lastmod, rather than a fabricated one", async () => {
    // CONSTITUTION §1.3 #2 and `unknown_date_policy: retain-unknown-do-not-publish`.
    // A missing or unusable date must never be replaced by "now": that would tell a
    // crawler the job changed today.
    const { xml } = await render([
      { id: 1, updatedAt: null },
      { id: 2, updatedAt: "not-a-date" },
    ]);
    expect(jobLocs(xml)).toEqual([1, 2]);
    for (const loc of ["/jobs/1", "/jobs/2"]) {
      const entry = xml.slice(xml.indexOf(`<loc>https://remotejobs-ph.pages.dev${loc}</loc>`));
      const self = entry.slice(0, entry.indexOf("</url>"));
      expect(self).not.toContain("<lastmod>");
    }
    // And "now" must not have leaked in as today's date.
    const today = new Date().toISOString().split("T")[0]!;
    expect(xml.match(/<lastmod>[^<]*<\/lastmod>/g) ?? []).toEqual([]);
  });
});

describe("sitemap lastmod stays truthful for usable dates", () => {
  test("a usable date keeps its real calendar day, in UTC", async () => {
    const { xml } = await render([
      { id: 1, updatedAt: "2026-09-30T23:30:00Z" },
      // Same local wall-clock day as row 1, but +08:00 puts the instant on the 29th
      // in UTC, so a correct UTC lastmod is the 29th.
      { id: 2, updatedAt: "2026-09-30T00:30:00+08:00" },
    ]);
    const lastmods = [...xml.matchAll(/<lastmod>([^<]*)<\/lastmod>/g)].map((m) => m[1]);
    // UTC-day semantics are kept deliberately: the previous
    // `.toISOString().split("T")[0]` bound the same instant the same way, so this
    // unit changes crash-safety, not date semantics.
    expect(lastmods).toEqual(["2026-09-30", "2026-09-29"]);
  });

  test("the emitted lastmod is exactly the shared safe binder's day", async () => {
    const values = ["2026-09-30T12:00:00Z", "2026-01-01T00:00:00Z", "2026-12-31T23:59:59Z"];
    const { xml } = await render(values.map((updatedAt, index) => ({ id: index + 1, updatedAt })));
    const emitted = [...xml.matchAll(/<lastmod>([^<]*)<\/lastmod>/g)].map((m) => m[1]);
    expect(emitted).toEqual(values.map((value) => normalizeUtcIso(value)!.split("T")[0]));
  });
});

describe("the sitemap route stays a single public read", () => {
  test("issues one read, applies the public eligibility predicate, and never writes", async () => {
    const { statements } = await render([{ id: 1, updatedAt: "2026-09-30T12:00:00Z" }]);
    expect(statements).toHaveLength(1);
    const sqlText = statements[0]!.sql;
    expect(sqlText).toMatch(/\bis_active\b/i);
    expect(sqlText).toMatch(/\bph_eligibility\b/i);
    expect(sqlText).not.toMatch(/\b(INSERT|UPDATE|DELETE|DROP|ALTER)\b/i);
  });

  test("lastmod prefers the real update clock, then the posted date, then first-seen", async () => {
    // The projected column is `coalesce(updated_at, posted_at, scraped_at)`. A
    // sitemap lastmod answers "when did this page last change", so the update clock
    // must win over the posting date and over first-seen. Reordering these would
    // silently misdate every URL on the surface, so the precedence is pinned here
    // rather than left to a future edit.
    const { statements } = await render([{ id: 1, updatedAt: "2026-09-30T12:00:00Z" }]);
    const coalesce = statements[0]!.sql.match(/coalesce\(([^)]*)\)/i)?.[1] ?? "";
    const order = [...coalesce.matchAll(/(?:"?\w+"?\.)?"?(updated_at|posted_at|scraped_at)"?/gi)]
      .map((match) => match[1]!.toLowerCase());
    expect(order).toEqual(["updated_at", "posted_at", "scraped_at"]);
  });

test("a total D1 failure is reported as a failure rather than a static-only 200", async () => {
    const env = {
      DB: {
        prepare() {
          // Drizzle calls `prepare` lazily inside the awaited query, so this throw
          // surfaces from the route's own try/catch, as a real D1 failure would.
          return {
            bind() {
              throw new Error("D1 unavailable");
            },
          };
        },
      },
    };
    const response = await GET({ locals: { runtime: { env } } as never } as never);
    const xml = await response.text();
    // A usable date must not be the only thing the route protects: an unreadable D1
    // used to be answered with a cacheable 200 holding only the five static pages,
    // which reads to a crawler as "these are all the job URLs". It is now a 503 with a
    // non-cacheable body; see sitemap-failure-honesty.test.ts for the full contract.
    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(xml).not.toContain("<urlset");
    expect(xml).not.toContain("</urlset>");
    expect(jobLocs(xml)).toEqual([]);
  });

});