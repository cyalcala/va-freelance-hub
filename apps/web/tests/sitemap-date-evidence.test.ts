import { beforeEach, describe, expect, test } from "bun:test";
import { GET } from "../src/pages/sitemap.xml";
import { getDurableLkgSnapshot } from "../src/lib/durable-lkg-snapshot";
import type { PublicJob } from "../src/lib/public-board";
import { opportunitySnapshotQuery, promoteSnapshot, resetPublicBoardState } from "../src/lib/public-serving-snapshot";
import { normalizeUtcIso } from "../src/lib/time";

/**
 * `/sitemap.xml` is the discovery surface search engines crawl. Every job on the
 * public board must appear in it. An unusable date omits `<lastmod>` and must
 * not drop the URL or be replaced with "now".
 */

function boardJob(partial: Partial<PublicJob> & Pick<PublicJob, "id">): PublicJob {
  return {
    title: `Role ${partial.id}`,
    company: null,
    type: "VA",
    sourceUrl: `https://example.com/jobs/${partial.id}`,
    sourcePlatform: "WeWorkRemotely",
    sourceId: null,
    tags: [],
    category: "design",
    experienceLevel: null,
    postedAt: null,
    scrapedAt: null,
    geoScope: "worldwide",
    phEligibility: "eligible_likely",
    geoEvidence: null,
    description: null,
    clientTimezone: null,
    locationType: "remote",
    payRange: null,
    updatedAt: null,
    ...partial,
  };
}

async function renderBoard(jobs: PublicJob[]): Promise<string> {
  const promoted = promoteSnapshot(
    {
      generatedAt: "2026-09-30T12:00:00.000Z",
      jobs,
      directory: [{
        id: 1,
        companyName: "Upwork",
        website: null,
        niche: "global-va",
        isDayshift: false,
        isVerified: false,
        isRemote: true,
        isMarketplace: true,
      }],
    },
    "memory",
    Date.now(),
  );
  if (!promoted) throw new Error("fixture board was rejected");
  const response = await GET({
    locals: {
      runtime: {
        env: {
          DB: {
            prepare() {
              throw new Error("a warm board must not read D1");
            },
          },
        },
      },
    },
  } as never);
  return response.text();
}

const jobLocs = (xml: string) => [...xml.matchAll(/<loc>[^<]*\/jobs\/(\d+)<\/loc>/g)].map((m) => Number(m[1]));

beforeEach(() => {
  resetPublicBoardState();
});

describe("sitemap job URLs survive an unusable source date", () => {
  test("a malformed date does not drop the remaining job URLs", async () => {
    // The bug: `new Date(row.updatedAt).toISOString()` throws RangeError on an
    // unparseable value, inside the accumulation loop, inside the route's single
    // try/catch. The catch then returns a sitemap containing only the five static
    // pages: one bad row silently deletes every job URL that came after it.
    const xml = await renderBoard([
      boardJob({ id: 1, updatedAt: "2026-09-30T12:00:00Z" }),
      boardJob({ id: 2, updatedAt: "not-a-date" }),
      boardJob({ id: 3, updatedAt: "2026-09-29T00:00:00Z" }),
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
    const jobs = unusable.map((updatedAt, index) => boardJob({ id: index + 1, updatedAt }));
    jobs.push(boardJob({ id: 99, updatedAt: "2026-09-30T12:00:00Z" }));

    const xml = await renderBoard(jobs);
    expect(jobLocs(xml)).toEqual([...unusable.map((_, index) => index + 1), 99]);
  });

  test("a null date emits the job URL with no lastmod, rather than a fabricated one", async () => {
    // CONSTITUTION §1.3 #2 and `unknown_date_policy: retain-unknown-do-not-publish`.
    // A missing or unusable date must never be replaced by "now": that would tell a
    // crawler the job changed today.
    const xml = await renderBoard([
      boardJob({ id: 1, updatedAt: null }),
      boardJob({ id: 2, updatedAt: "not-a-date" }),
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
    const xml = await renderBoard([
      boardJob({ id: 1, updatedAt: "2026-09-30T23:30:00Z" }),
      // Same local wall-clock day as row 1, but +08:00 puts the instant on the 29th
      // in UTC, so a correct UTC lastmod is the 29th.
      boardJob({ id: 2, updatedAt: "2026-09-30T00:30:00+08:00" }),
    ]);
    const lastmods = [...xml.matchAll(/<lastmod>([^<]*)<\/lastmod>/g)].map((m) => m[1]);
    // UTC-day semantics are kept deliberately: the previous
    // `.toISOString().split("T")[0]` bound the same instant the same way, so this
    // unit changes crash-safety, not date semantics.
    expect(lastmods).toEqual(["2026-09-30", "2026-09-29"]);
  });

  test("the emitted lastmod is exactly the shared safe binder's day", async () => {
    const values = ["2026-09-30T12:00:00Z", "2026-01-01T00:00:00Z", "2026-12-31T23:59:59Z"];
    const xml = await renderBoard(values.map((updatedAt, index) => boardJob({ id: index + 1, updatedAt })));
    const emitted = [...xml.matchAll(/<lastmod>([^<]*)<\/lastmod>/g)].map((m) => m[1]);
    expect(emitted).toEqual(values.map((value) => normalizeUtcIso(value)!.split("T")[0]));
  });
});

describe("the sitemap is rendered from the shared snapshot query", () => {
  test("the snapshot query applies the public eligibility predicate and never writes", () => {
    const sqlText = opportunitySnapshotQuery().sql;
    expect(sqlText).toMatch(/\bis_active\b/i);
    expect(sqlText).toMatch(/\bph_eligibility\b/i);
    expect(sqlText).not.toMatch(/\b(INSERT|UPDATE|DELETE|DROP|ALTER)\b/i);
  });

  test("lastmod prefers the real update clock, then the posted date, then first-seen", () => {
    // The projected column is `coalesce(updated_at, posted_at, scraped_at)`. A
    // sitemap lastmod answers "when did this page last change", so the update clock
    // must win over the posting date and over first-seen.
    const coalesce = opportunitySnapshotQuery().sql.match(/coalesce\(([^)]*)\)/i)?.[1] ?? "";
    const order = [...coalesce.matchAll(/(?:"?\w+"?\.)?"?(updated_at|posted_at|scraped_at)"?/gi)]
      .map((match) => match[1]!.toLowerCase());
    expect(order).toEqual(["updated_at", "posted_at", "scraped_at"]);
  });

  test("a total D1 failure serves the durable board rather than a static-only sitemap", async () => {
    const env = {
      DB: {
        prepare() {
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
    const lkg = getDurableLkgSnapshot();
    // An unreadable D1 used to be answered with a cacheable 200 holding only the
    // five static pages. The durable board keeps every previously verified job URL.
    expect(response.status).toBe(200);
    expect(response.headers.get("X-Public-Snapshot")).toBe("lkg_fallback");
    expect(jobLocs(xml)).toEqual(lkg.jobs.map((job) => job.id));
  });
});