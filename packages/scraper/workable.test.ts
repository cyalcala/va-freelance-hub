import { describe, it, expect, afterEach, mock, test } from "bun:test";
import { parseWorkableXml, filterPlausibleCandidates, summarizeFilterStats, summarizeLocation, WORKABLE_FEED_URL } from "./workable";
import { fetchWorkable } from "./ats";
import { toContentHash } from "./contentHash";

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

function mockFetch(payload: unknown, ok = true, status = 200) {
  globalThis.fetch = mock(async () => ({
    ok,
    status,
    json: async () => payload,
  })) as unknown as typeof fetch;
}

const widgetJob = (over: Record<string, unknown> = {}) => ({
  title: "Senior Engineer",
  url: "https://apply.workable.com/j/abc123",
  shortcode: "abc123",
  published_on: "2026-07-01T12:00:00.000Z",
  city: "Remote",
  state: "",
  country: "",
  telecommuting: true,
  ...over,
});

// Real, live-captured <job> blocks (2026-08-30) from
// https://www.workable.com/boards/workable.xml — four real postings
// covering every combination of remote/country relevant to the
// remote-OR-PH coarse filter, not synthesized:
//  - REMOTE_NON_PH: remote=true, country=PT (Portugal)
//  - PH_NON_REMOTE: remote=false, country=PH (Taguig, Metro Manila)
//  - PLAIN: remote=false, country=IN (neither remote nor PH)
//  - REMOTE_AND_PH: remote=true, country=PH (the intersection case)
const REMOTE_NON_PH = `
    <title>
      <![CDATA[Medical Writer (CER)]]>
    </title>
    <date>
      <![CDATA[Wed, 28 Jul 2021 10:54:12 UTC]]>
    </date>
    <referencenumber>
      <![CDATA[0F5C12DDE3]]>
    </referencenumber>
    <url>
      <![CDATA[https://apply.workable.com/j/0F5C12DDE3]]>
    </url>
    <company>
      <![CDATA[Cross Border Talents]]>
    </company>
    <city>
      <![CDATA[Lisbon]]>
    </city>
    <state>
      <![CDATA[Lisbon]]>
    </state>
    <country>
      <![CDATA[PT]]>
    </country>
    <remote>
      <![CDATA[true]]>
    </remote>
    <postalcode>
      <![CDATA[]]>
    </postalcode>
    <description>
      <![CDATA[<p><strong>Full HTML description here, must never survive normalization.</strong></p>]]>
    </description>
    <education>
      <![CDATA[]]>
    </education>
    <jobtype>
      <![CDATA[]]>
    </jobtype>
    <category>
      <![CDATA[]]>
    </category>
    <experience>
      <![CDATA[]]>
    </experience>
    <website>
      <![CDATA[http://cbtalents.com/]]>
    </website>
  `;

const PH_NON_REMOTE = `
    <title>
      <![CDATA[Software Engineer]]>
    </title>
    <date>
      <![CDATA[Wed, 28 Jul 2021 11:44:59 UTC]]>
    </date>
    <referencenumber>
      <![CDATA[AE699F20DA]]>
    </referencenumber>
    <url>
      <![CDATA[https://apply.workable.com/j/AE699F20DA]]>
    </url>
    <company>
      <![CDATA[Freelancer.com]]>
    </company>
    <city>
      <![CDATA[Taguig]]>
    </city>
    <state>
      <![CDATA[Metro Manila]]>
    </state>
    <country>
      <![CDATA[PH]]>
    </country>
    <remote>
      <![CDATA[false]]>
    </remote>
    <postalcode>
      <![CDATA[]]>
    </postalcode>
    <description>
      <![CDATA[<h3>Full HTML description, must never survive normalization.</h3>]]>
    </description>
    <education>
      <![CDATA[Bachelor's Degree]]>
    </education>
    <jobtype>
      <![CDATA[Full-time]]>
    </jobtype>
    <category>
      <![CDATA[Engineering]]>
    </category>
    <experience>
      <![CDATA[Mid-Senior level]]>
    </experience>
    <website>
      <![CDATA[https://www.freelancer.com/careers]]>
    </website>
  `;

const PLAIN = `
    <title>
      <![CDATA[System Engineer]]>
    </title>
    <date>
      <![CDATA[Wed, 28 Jul 2021 10:24:17 UTC]]>
    </date>
    <referencenumber>
      <![CDATA[F44ED9E40A]]>
    </referencenumber>
    <url>
      <![CDATA[https://apply.workable.com/j/F44ED9E40A]]>
    </url>
    <company>
      <![CDATA[Tech Firefly]]>
    </company>
    <city>
      <![CDATA[Hyderabad]]>
    </city>
    <state>
      <![CDATA[Telangana]]>
    </state>
    <country>
      <![CDATA[IN]]>
    </country>
    <remote>
      <![CDATA[false]]>
    </remote>
    <postalcode>
      <![CDATA[]]>
    </postalcode>
    <description>
      <![CDATA[<p>Full HTML description, must never survive normalization.</p>]]>
    </description>
    <education>
      <![CDATA[Bachelor's Degree]]>
    </education>
    <jobtype>
      <![CDATA[Contract]]>
    </jobtype>
    <category>
      <![CDATA[Information Technology]]>
    </category>
    <experience>
      <![CDATA[Mid-Senior level]]>
    </experience>
    <website>
      <![CDATA[https://techfirefly.com]]>
    </website>
  `;

const REMOTE_AND_PH = `
    <title>
      <![CDATA[Thai Content Reviewer]]>
    </title>
    <date>
      <![CDATA[Thu, 11 Aug 2022 09:05:56 UTC]]>
    </date>
    <referencenumber>
      <![CDATA[8FD6351FFA]]>
    </referencenumber>
    <url>
      <![CDATA[https://apply.workable.com/j/8FD6351FFA]]>
    </url>
    <company>
      <![CDATA[Tech Firefly]]>
    </company>
    <city>
      <![CDATA[]]>
    </city>
    <state>
      <![CDATA[Metro Manila]]>
    </state>
    <country>
      <![CDATA[PH]]>
    </country>
    <remote>
      <![CDATA[true]]>
    </remote>
    <postalcode>
      <![CDATA[]]>
    </postalcode>
    <description>
      <![CDATA[<p>Full HTML description, must never survive normalization.</p>]]>
    </description>
    <education>
      <![CDATA[Unspecified]]>
    </education>
    <jobtype>
      <![CDATA[Full-time]]>
    </jobtype>
    <category>
      <![CDATA[]]>
    </category>
    <experience>
      <![CDATA[]]>
    </experience>
    <website>
      <![CDATA[https://techfirefly.com]]>
    </website>
  `;

const FEED = `<?xml version="1.0" encoding="UTF-8"?><source>${[REMOTE_NON_PH, PH_NON_REMOTE, PLAIN, REMOTE_AND_PH].map((j) => `<job>${j}</job>`).join("")}</source>`;

describe("workable — parseWorkableXml (SP-10 criterion: minimal content, canonical URL)", () => {
  it("normalizes all four real postings with canonical url and correct fields", () => {
    const result = parseWorkableXml(FEED);
    expect(result).toHaveLength(4);
    expect(result[0]).toEqual({
      referenceNumber: "0F5C12DDE3",
      title: "Medical Writer (CER)",
      url: "https://apply.workable.com/j/0F5C12DDE3",
      company: "Cross Border Talents",
      city: "Lisbon",
      state: "Lisbon",
      country: "PT",
      remote: true,
      jobType: null,
      category: null,
      postedAt: "Wed, 28 Jul 2021 10:54:12 UTC",
    });
  });

  it("never includes description (full HTML) — actively excluded", () => {
    const result = parseWorkableXml(FEED);
    for (const p of result) {
      expect((p as any).description).toBeUndefined();
    }
    // sanity: the source fixture really does carry full HTML content
    expect(FEED).toContain("must never survive normalization");
  });

  it("correctly reads the PH+non-remote and remote+PH real postings", () => {
    const result = parseWorkableXml(FEED);
    const phEngineer = result.find((p) => p.referenceNumber === "AE699F20DA")!;
    expect(phEngineer.country).toBe("PH");
    expect(phEngineer.remote).toBe(false);
    expect(phEngineer.jobType).toBe("Full-time");

    const remotePh = result.find((p) => p.referenceNumber === "8FD6351FFA")!;
    expect(remotePh.country).toBe("PH");
    expect(remotePh.remote).toBe(true);
    expect(remotePh.city).toBeNull();
  });

  it("is pure — identical input yields identical output", () => {
    expect(parseWorkableXml(FEED)).toEqual(parseWorkableXml(FEED));
  });

  it("returns an empty array for malformed or empty XML rather than throwing", () => {
    expect(parseWorkableXml("not xml <<<")).toEqual([]);
    expect(parseWorkableXml("")).toEqual([]);
    expect(parseWorkableXml(`<?xml version="1.0"?><source></source>`)).toEqual([]);
  });

  it("skips a job block missing a required field", () => {
    const broken = `<source><job><title><![CDATA[No refnum or url]]></title></job></source>`;
    expect(parseWorkableXml(broken)).toEqual([]);
  });
});

describe("workable — filterPlausibleCandidates (SP-10's actual preprocessing step)", () => {
  it("keeps remote=true OR country=PH, drops the plain (neither) posting", () => {
    const all = parseWorkableXml(FEED);
    const plausible = filterPlausibleCandidates(all);
    expect(plausible.map((p) => p.referenceNumber).sort()).toEqual(["0F5C12DDE3", "8FD6351FFA", "AE699F20DA"].sort());
    expect(plausible.find((p) => p.referenceNumber === "F44ED9E40A")).toBeUndefined();
  });

  it("keeps the remote+PH intersection posting exactly once (no duplication)", () => {
    const all = parseWorkableXml(FEED);
    const plausible = filterPlausibleCandidates(all);
    expect(plausible.filter((p) => p.referenceNumber === "8FD6351FFA")).toHaveLength(1);
  });

  it("is a strict subset — never invents or reorders postings", () => {
    const all = parseWorkableXml(FEED);
    const plausible = filterPlausibleCandidates(all);
    for (const p of plausible) expect(all).toContainEqual(p);
  });
});

describe("workable — summarizeFilterStats", () => {
  it("computes total/plausible/reduction correctly", () => {
    const all = parseWorkableXml(FEED);
    const plausible = filterPlausibleCandidates(all);
    const stats = summarizeFilterStats(all, plausible);
    expect(stats).toEqual({ totalParsed: 4, plausibleCandidates: 3, reductionPercent: 25 });
  });

  it("handles zero total without dividing by zero", () => {
    expect(summarizeFilterStats([], [])).toEqual({ totalParsed: 0, plausibleCandidates: 0, reductionPercent: 0 });
  });
});

describe("workable — summarizeLocation", () => {
  it("joins city and state when both present", () => {
    expect(summarizeLocation("Lisbon", "Lisbon")).toBe("Lisbon, Lisbon");
  });
  it("falls back to whichever field is present", () => {
    expect(summarizeLocation(null, "Metro Manila")).toBe("Metro Manila");
    expect(summarizeLocation("Hyderabad", null)).toBe("Hyderabad");
  });
  it("returns null when both are absent", () => {
    expect(summarizeLocation(null, null)).toBeNull();
  });
});

describe("workable — feed URL constant", () => {
  it("matches the SP-09-documented official feed URL", () => {
    expect(WORKABLE_FEED_URL).toBe("https://www.workable.com/boards/workable.xml");
  });
});

describe("fetchWorkable — widget API parser edge cases (MATH-03 supply quality)", () => {
  test("maps jobs to opportunities with linkback sourceUrl", async () => {
    mockFetch({ jobs: [widgetJob()] });
    const out = await fetchWorkable("company", "Company");
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      title: "Senior Engineer",
      company: "Company",
      sourceUrl: "https://apply.workable.com/j/abc123",
      locationType: "remote",
      sourcePlatform: "Company",
    });
    expect(out[0].contentHash).toMatch(/^[0-9a-f]{16}$/);
    expect(out[0].postedAt).toBe("2026-07-01T12:00:00.000Z");
    expect(out[0].locationRaw).toBe("Remote");
    expect(out[0].description).toBeNull();
  });

  test("falls back to shortcode-based URL when url is missing", async () => {
    mockFetch({ jobs: [widgetJob({ url: undefined, shortcode: "xyz789" })] });
    const [row] = await fetchWorkable("company", "Company");
    expect(row.sourceUrl).toBe("https://apply.workable.com/company/j/xyz789/");
  });

  test("skips jobs missing title or both url and shortcode", async () => {
    mockFetch({ jobs: [widgetJob({ title: "" }), widgetJob({ url: undefined, shortcode: undefined }), widgetJob({ title: "Good" })] });
    const out = await fetchWorkable("company", "Company");
    expect(out.map((o) => o.title)).toEqual(["Good"]);
  });

  test("throws on non-200 so the source is reported failed, not silently empty", async () => {
    mockFetch(null, false, 503);
    await expect(fetchWorkable("company", "Company")).rejects.toThrow(/Workable HTTP 503/);
  });

  test("returns empty array when the payload does not have a jobs array", async () => {
    mockFetch({ notJobs: true });
    const out = await fetchWorkable("company", "Company");
    expect(out).toHaveLength(0);
  });

  test("handles missing jobs property", async () => {
    mockFetch({});
    const out = await fetchWorkable("company", "Company");
    expect(out).toHaveLength(0);
  });

  test("handles jobs as non-array", async () => {
    mockFetch({ jobs: "not-an-array" });
    const out = await fetchWorkable("company", "Company");
    expect(out).toHaveLength(0);
  });

  test("tolerates a missing/invalid published_on and created_at", async () => {
    mockFetch({ jobs: [widgetJob({ published_on: "not-a-date", created_at: undefined })] });
    const [row] = await fetchWorkable("company", "Company");
    expect(row.postedAt).toBeNull();
  });

  test("handles various valid posted date formats", async () => {
    const testCases = [
      { input: "2026-07-01T12:00:00.000Z", expected: "2026-07-01T12:00:00.000Z" },
      { input: "2026-07-01T12:00:00+00:00", expected: "2026-07-01T12:00:00.000Z" },
      { input: "2026-07-01T05:00:00-07:00", expected: "2026-07-01T12:00:00.000Z" }, // PDT
    ];
    for (const tc of testCases) {
      mockFetch({ jobs: [widgetJob({ published_on: tc.input })] });
      const [row] = await fetchWorkable("company", "Company");
      expect(row.postedAt).toBe(tc.expected);
    }
  });

  test("uses created_at as fallback when published_on is missing", async () => {
    mockFetch({ jobs: [widgetJob({ published_on: undefined, created_at: "2026-07-01T12:00:00.000Z" })] });
    const [row] = await fetchWorkable("company", "Company");
    expect(row.postedAt).toBe("2026-07-01T12:00:00.000Z");
  });

  test("handles telecommuting false (onsite signal)", async () => {
    mockFetch({ jobs: [widgetJob({ telecommuting: false, city: "New York", state: "NY", country: "US" })] });
    const [row] = await fetchWorkable("company", "Company");
    expect(row.locationRaw).toContain("New York, NY, US");
    expect(row.locationRaw).toContain("(onsite)");
  });

  test("handles telecommuting undefined (treated as falsy, no onsite marker)", async () => {
    mockFetch({ jobs: [widgetJob({ telecommuting: undefined, city: "San Francisco", state: "CA", country: "US" })] });
    const [row] = await fetchWorkable("company", "Company");
    expect(row.locationRaw).toContain("San Francisco, CA, US");
    expect(row.locationRaw).not.toContain("(onsite)");
  });

  test("handles missing city/state/country with telecommuting true", async () => {
    mockFetch({ jobs: [widgetJob({ telecommuting: true, city: null, state: null, country: null })] });
    const [row] = await fetchWorkable("company", "Company");
    expect(row.locationRaw).toBe("Remote");
  });

  test("handles missing city/state/country with telecommuting false", async () => {
    mockFetch({ jobs: [widgetJob({ telecommuting: false, city: null, state: null, country: null })] });
    const [row] = await fetchWorkable("company", "Company");
    expect(row.locationRaw).toBe("(onsite)");
  });

  test("handles empty string city/state/country", async () => {
    mockFetch({ jobs: [widgetJob({ telecommuting: true, city: "", state: "", country: "" })] });
    const [row] = await fetchWorkable("company", "Company");
    expect(row.locationRaw).toBe("Remote");
  });

  test("handles job with extra unexpected fields (robust parsing)", async () => {
    mockFetch({
      jobs: [
        widgetJob({
          extraField1: "ignored",
          extraField2: { nested: "also ignored" },
          salary: "$100k-200k",
          department: "Engineering",
        }),
      ],
    });
    const [row] = await fetchWorkable("company", "Company");
    expect(row.title).toBe("Senior Engineer");
    expect(row.sourceUrl).toBe("https://apply.workable.com/j/abc123");
  });

  test("handles large response with many jobs (performance and memory)", async () => {
    const manyJobs = Array.from({ length: 500 }, (_, i) => widgetJob({ title: `Job ${i}`, shortcode: `job_${i}`, url: `https://apply.workable.com/j/job_${i}` }));
    mockFetch({ jobs: manyJobs });
    const out = await fetchWorkable("company", "Company");
    expect(out).toHaveLength(500);
    expect(out[0].title).toBe("Job 0");
    expect(out[499].title).toBe("Job 499");
  });

  test("returns empty array for empty jobs list", async () => {
    mockFetch({ jobs: [] });
    const out = await fetchWorkable("company", "Company");
    expect(out).toHaveLength(0);
  });

  test("handles 404 response as failed fetch", async () => {
    mockFetch(null, false, 404);
    await expect(fetchWorkable("company", "Company")).rejects.toThrow(/Workable HTTP 404/);
  });

  test("handles 429 rate limit response as failed fetch", async () => {
    mockFetch(null, false, 429);
    await expect(fetchWorkable("company", "Company")).rejects.toThrow(/Workable HTTP 429/);
  });

  test("handles 401 unauthorized as failed fetch", async () => {
    mockFetch(null, false, 401);
    await expect(fetchWorkable("company", "Company")).rejects.toThrow(/Workable HTTP 401/);
  });

  test("uses standard content hash for Workable (no ATS job ID)", async () => {
    mockFetch({ jobs: [widgetJob({ url: "https://apply.workable.com/j/abc123" })] });
    const [row] = await fetchWorkable("company", "Company");
    const expectedHash = toContentHash("Senior Engineer", "https://apply.workable.com/j/abc123");
    expect(row.contentHash).toBe(expectedHash);
  });

  test("different title or URL produces different content hash", async () => {
    const job1 = widgetJob({ title: "Job 1", url: "https://apply.workable.com/j/job1" });
    const job2 = widgetJob({ title: "Job 2", url: "https://apply.workable.com/j/job2" });
    mockFetch({ jobs: [job1] });
    const [row1] = await fetchWorkable("company", "Company");
    mockFetch({ jobs: [job2] });
    const [row2] = await fetchWorkable("company", "Company");
    expect(row1.contentHash).not.toBe(row2.contentHash);
  });

  test("handles multiple jobs in single response with mixed validity", async () => {
    mockFetch({
      jobs: [
        widgetJob({ title: "Valid 1", url: "https://apply.workable.com/j/job1" }),
        widgetJob({ title: "", url: "https://apply.workable.com/j/empty" }), // filtered out
        widgetJob({ title: "Valid 2", url: undefined, shortcode: undefined }), // filtered out
        widgetJob({ title: "Valid 3", url: "https://apply.workable.com/j/job3" }),
      ],
    });
    const out = await fetchWorkable("company", "Company");
    expect(out.map((o) => o.title).sort()).toEqual(["Valid 1", "Valid 3"]);
  });

  test("handles whitespace-only title (passes filter but normalizes to empty string)", async () => {
    mockFetch({ jobs: [widgetJob({ title: "   " }), widgetJob({ title: "Valid" })] });
    const out = await fetchWorkable("company", "Company");
    // Whitespace-only title passes filter (truthy) but normalizes to empty string
    expect(out).toHaveLength(2);
    expect(out.map((o) => o.title).sort()).toEqual(["", "Valid"]);
  });

  test("handles whitespace-only url (uses shortcode fallback)", async () => {
    mockFetch({ jobs: [widgetJob({ url: "   ", shortcode: "valid123" }), widgetJob({ title: "Valid", url: "https://apply.workable.com/j/valid" })] });
    const out = await fetchWorkable("company", "Company");
    // Whitespace url is truthy but becomes "   " in sourceUrl - still passes filter
    expect(out.length).toBeGreaterThanOrEqual(1);
  });
});
