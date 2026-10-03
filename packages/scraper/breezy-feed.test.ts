import { describe, it, expect, afterEach, mock, test } from "bun:test";
import { fetchBreezy } from "./ats";
import { geoGate } from "./geoGate";
import { toContentHash } from "./contentHash";

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

function mockFetch(payload: unknown, ok = true, status = 200) {
  globalThis.fetch = mock(async () => ({
    ok,
    status,
    headers: { get: () => "application/json" },
    json: async () => payload,
  })) as unknown as typeof fetch;
}

describe("fetchBreezy — onsite vs remote parsing and geoGate pipeline", () => {

  it("marks is_remote: false jobs as locationType: 'onsite' with (onsite) in locationRaw", async () => {
    mockFetch([
      {
        id: "breezy-1",
        name: "National Material Quantity Surveyor",
        url: "https://sourcefit.breezy.hr/p/breezy-1",
        salary: "PHP 50,000 - 70,000",
        published_date: "2026-09-24T00:00:00.000Z",
        locations: [
          {
            name: "Bridgetowne Quezon City, PH",
            is_remote: false,
          },
        ],
      },
    ]);

    const items = await fetchBreezy("sourcefit", "Sourcefit");
    expect(items.length).toBe(1);
    const item = items[0];

    expect(item.title).toBe("National Material Quantity Surveyor");
    expect(item.locationType).toBe("onsite");
    expect(item.locationRaw).toBe("Bridgetowne Quezon City, PH (onsite)");
    expect(item.description).toBe("Location: Bridgetowne Quezon City, PH. Remote: no.");

    // Passed to geoGate: must be rejected as ineligible
    const verdict = geoGate({
      title: item.title,
      locationRaw: item.locationRaw,
      description: item.description,
    });
    expect(verdict.phEligibility).toBe("ineligible");
    expect(verdict.evidence).toContain("Not fully remote");
  });

  it("marks is_remote: true jobs as locationType: 'remote' with clean locationRaw", async () => {
    mockFetch([
      {
        id: "breezy-2",
        name: "Systems Administrator",
        url: "https://sourcefit.breezy.hr/p/breezy-2",
        salary: "PHP 80,000",
        published_date: "2026-09-24T00:00:00.000Z",
        locations: [
          {
            name: "Eastwood Quezon City, PH",
            is_remote: true,
          },
        ],
      },
      {
        id: "breezy-3",
        name: "Digital Marketing Virtual Assistant",
        url: "https://20four7va.breezy.hr/p/breezy-3",
        salary: "$5 - $8 / hour",
        published_date: "2026-09-24T00:00:00.000Z",
        locations: [
          {
            name: "Worldwide",
            is_remote: true,
          },
        ],
      },
    ]);

    const items = await fetchBreezy("mixed", "Agency");
    expect(items.length).toBe(2);

    // Job 1: Remote PH
    const phRemote = items[0];
    expect(phRemote.locationType).toBe("remote");
    expect(phRemote.locationRaw).toBe("Eastwood Quezon City, PH");
    expect(phRemote.description).toBe("Location: Eastwood Quezon City, PH. Remote: yes.");

    const phVerdict = geoGate({
      title: phRemote.title,
      locationRaw: phRemote.locationRaw,
      description: phRemote.description,
    });
    expect(phVerdict.phEligibility).toBe("eligible_verified");
    expect(phVerdict.geoScope).toBe("ph_only");

    // Job 2: Remote Worldwide VA
    const vaRemote = items[1];
    expect(vaRemote.locationType).toBe("remote");
    expect(vaRemote.locationRaw).toBe("Worldwide");
    expect(vaRemote.description).toBe("Location: Worldwide. Remote: yes.");

    const vaVerdict = geoGate({
      title: vaRemote.title,
      locationRaw: vaRemote.locationRaw,
      description: vaRemote.description,
    });
    expect(vaVerdict.phEligibility).toBe("eligible_likely");
    expect(vaVerdict.geoScope).toBe("worldwide");
  });
});

describe("fetchBreezy — edge cases for API response variations (MATH-03 supply quality)", () => {
  const job = (over: Record<string, unknown> = {}) => ({
    id: "breezy-1",
    name: "Senior Engineer",
    url: "https://company.breezy.hr/p/breezy-1",
    salary: "$100k-200k",
    published_date: "2026-07-01T12:00:00.000Z",
    locations: [{ name: "Remote", is_remote: true }],
    ...over,
  });

  test("skips jobs missing name or url", async () => {
    mockFetch([job({ name: "" }), job({ url: undefined }), job({ name: "Good" })]);
    const out = await fetchBreezy("company", "Company");
    expect(out.map((o) => o.title)).toEqual(["Good"]);
  });

  test("throws on non-200 so the source is reported failed, not silently empty", async () => {
    mockFetch(null, false, 503);
    await expect(fetchBreezy("company", "Company")).rejects.toThrow(/Breezy HTTP 503/);
  });

  test("throws when the payload is not an array", async () => {
    mockFetch({ notJobs: true });
    await expect(fetchBreezy("company", "Company")).rejects.toThrow();
  });

  test("throws when response is not JSON", async () => {
    globalThis.fetch = mock(async () => ({
      ok: true,
      status: 200,
      headers: { get: () => "text/html" },
      json: async () => { throw new Error("not json"); },
    })) as unknown as typeof fetch;
    await expect(fetchBreezy("company", "Company")).rejects.toThrow(/non-JSON response/);
  });

  test("tolerates a missing/invalid published_date", async () => {
    mockFetch([job({ published_date: "not-a-date" })]);
    const [row] = await fetchBreezy("company", "Company");
    expect(row.postedAt).toBeNull();
  });

  test("handles missing locations array", async () => {
    mockFetch([job({ locations: undefined })]);
    const [row] = await fetchBreezy("company", "Company");
    expect(row.locationRaw).toBeNull();
    expect(row.locationType).toBe("remote");
    expect(row.description).toBeNull();
  });

  test("handles empty locations array", async () => {
    mockFetch([job({ locations: [] })]);
    const [row] = await fetchBreezy("company", "Company");
    expect(row.locationRaw).toBeNull();
    expect(row.locationType).toBe("remote");
    expect(row.description).toBeNull();
  });

  test("handles location with missing name and country.name", async () => {
    mockFetch([job({ locations: [{}] })]);
    const [row] = await fetchBreezy("company", "Company");
    expect(row.locationRaw).toBeNull();
    expect(row.locationType).toBe("remote");
    expect(row.description).toBeNull();
  });

  test("handles location with empty string name", async () => {
    mockFetch([job({ locations: [{ name: "" }] })]);
    const [row] = await fetchBreezy("company", "Company");
    expect(row.locationRaw).toBeNull();
    expect(row.locationType).toBe("remote");
    expect(row.description).toBeNull();
  });

  test("handles multiple locations with mixed remote signals (any true = remote)", async () => {
    mockFetch([job({
      locations: [
        { name: "Office A", is_remote: false },
        { name: "Office B", is_remote: true },
      ],
    })]);
    const [row] = await fetchBreezy("company", "Company");
    expect(row.locationType).toBe("remote");
    expect(row.locationRaw).toContain("Office A; Office B");
    expect(row.description).toContain("Remote: yes");
  });

  test("handles multiple locations all onsite (explicitly onsite)", async () => {
    mockFetch([job({
      locations: [
        { name: "Office A", is_remote: false },
        { name: "Office B", is_remote: false },
      ],
    })]);
    const [row] = await fetchBreezy("company", "Company");
    expect(row.locationType).toBe("onsite");
    expect(row.locationRaw).toContain("(onsite)");
    expect(row.description).toContain("Remote: no");
  });

  test("handles location with country.name fallback", async () => {
    mockFetch([job({ locations: [{ country: { name: "Philippines" }, is_remote: true }] })]);
    const [row] = await fetchBreezy("company", "Company");
    expect(row.locationRaw).toBe("Philippines");
    expect(row.description).toContain("Philippines");
  });

  test("handles various valid published_date formats", async () => {
    const testCases = [
      { input: "2026-07-01T12:00:00.000Z", expected: "2026-07-01T12:00:00.000Z" },
      { input: "2026-07-01T12:00:00+00:00", expected: "2026-07-01T12:00:00.000Z" },
      { input: "2026-07-01T05:00:00-07:00", expected: "2026-07-01T12:00:00.000Z" }, // PDT
    ];
    for (const tc of testCases) {
      mockFetch([job({ published_date: tc.input })]);
      const [row] = await fetchBreezy("company", "Company");
      expect(row.postedAt).toBe(tc.expected);
    }
  });

  test("handles job with extra unexpected fields (robust parsing)", async () => {
    mockFetch([job({
      extraField1: "ignored",
      extraField2: { nested: "also ignored" },
      department: "Engineering",
    })]);
    const [row] = await fetchBreezy("company", "Company");
    expect(row.title).toBe("Senior Engineer");
    expect(row.sourceUrl).toBe("https://company.breezy.hr/p/breezy-1");
    expect(row.payRange).toBe("$100k-200k");
  });

  test("handles large response with many jobs (performance and memory)", async () => {
    const manyJobs = Array.from({ length: 500 }, (_, i) => job({ name: `Job ${i}`, id: `breezy-${i}`, url: `https://company.breezy.hr/p/breezy-${i}` }));
    mockFetch(manyJobs);
    const out = await fetchBreezy("company", "Company");
    expect(out).toHaveLength(500);
    expect(out[0].title).toBe("Job 0");
    expect(out[499].title).toBe("Job 499");
  });

  test("returns empty array for empty jobs list", async () => {
    mockFetch([]);
    const out = await fetchBreezy("company", "Company");
    expect(out).toHaveLength(0);
  });

  test("handles 404 response as failed fetch", async () => {
    mockFetch(null, false, 404);
    await expect(fetchBreezy("company", "Company")).rejects.toThrow(/Breezy HTTP 404/);
  });

  test("handles 429 rate limit response as failed fetch", async () => {
    mockFetch(null, false, 429);
    await expect(fetchBreezy("company", "Company")).rejects.toThrow(/Breezy HTTP 429/);
  });

  test("handles 401 unauthorized as failed fetch", async () => {
    mockFetch(null, false, 401);
    await expect(fetchBreezy("company", "Company")).rejects.toThrow(/Breezy HTTP 401/);
  });

  test("uses standard content hash for Breezy (no ATS job ID)", async () => {
    mockFetch([job({ url: "https://company.breezy.hr/p/breezy-1" })]);
    const [row] = await fetchBreezy("company", "Company");
    const expectedHash = toContentHash("Senior Engineer", "https://company.breezy.hr/p/breezy-1");
    expect(row.contentHash).toBe(expectedHash);
  });

  test("different title or URL produces different content hash", async () => {
    const job1 = job({ name: "Job 1", url: "https://company.breezy.hr/p/job1" });
    const job2 = job({ name: "Job 2", url: "https://company.breezy.hr/p/job2" });
    mockFetch([job1]);
    const [row1] = await fetchBreezy("company", "Company");
    mockFetch([job2]);
    const [row2] = await fetchBreezy("company", "Company");
    expect(row1.contentHash).not.toBe(row2.contentHash);
  });

  test("handles multiple jobs in single response with mixed validity", async () => {
    mockFetch([
      job({ name: "Valid 1", url: "https://company.breezy.hr/p/job1" }),
      job({ name: "", url: "https://company.breezy.hr/p/empty" }), // filtered out
      job({ name: "Valid 2", url: undefined }), // filtered out
      job({ name: "Valid 3", url: "https://company.breezy.hr/p/job3" }),
    ]);
    const out = await fetchBreezy("company", "Company");
    expect(out.map((o) => o.title).sort()).toEqual(["Valid 1", "Valid 3"]);
  });

  test("handles whitespace-only name (passes filter but normalizes to empty string)", async () => {
    mockFetch([job({ name: "   " }), job({ name: "Valid" })]);
    const out = await fetchBreezy("company", "Company");
    // Whitespace-only name passes filter (truthy) but normalizes to empty string
    expect(out).toHaveLength(2);
    expect(out.map((o) => o.title).sort()).toEqual(["", "Valid"]);
  });

  test("handles whitespace-only url (passes filter but normalizes to empty string)", async () => {
    mockFetch([job({ url: "   " }), job({ name: "Valid", url: "https://company.breezy.hr/p/valid" })]);
    const out = await fetchBreezy("company", "Company");
    // Whitespace-only url passes filter (truthy) but normalizes to empty string
    expect(out).toHaveLength(2);
    expect(out.map((o) => o.title).sort()).toEqual(["Senior Engineer", "Valid"]);
  });

  test("handles salary field variations", async () => {
    mockFetch([job({ salary: "PHP 50,000 - 70,000" })]);
    const [row] = await fetchBreezy("company", "Company");
    expect(row.payRange).toBe("PHP 50,000 - 70,000");
  });

  test("handles missing salary field", async () => {
    mockFetch([job({ salary: undefined })]);
    const [row] = await fetchBreezy("company", "Company");
    expect(row.payRange).toBeNull();
  });
});
