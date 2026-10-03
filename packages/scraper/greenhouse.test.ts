import { describe, expect, test, afterEach, mock } from "bun:test";
import { fetchGreenhouse } from "./ats";
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

const job = (over: Record<string, unknown> = {}) => ({
  title: "Senior Engineer",
  absolute_url: "https://boards.greenhouse.io/company/jobs/abc123",
  updated_at: "2026-07-01T12:00:00.000+00:00",
  location: { name: "Remote" },
  ...over,
});

describe("fetchGreenhouse", () => {
  test("maps listed jobs to opportunities with linkback sourceUrl", async () => {
    mockFetch({ jobs: [job()] });
    const out = await fetchGreenhouse("company", "Company");
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      title: "Senior Engineer",
      company: "Company",
      sourceUrl: "https://boards.greenhouse.io/company/jobs/abc123",
      locationType: "remote",
      sourcePlatform: "Company",
    });
    expect(out[0].contentHash).toMatch(/^[0-9a-f]{16}$/);
    expect(out[0].postedAt).toBe("2026-07-01T12:00:00.000Z");
    expect(out[0].description).toContain("Remote");
    expect(out[0].locationRaw).toBe("Remote");
  });

  test("skips jobs missing title or absolute_url", async () => {
    mockFetch({ jobs: [job({ title: "" }), job({ absolute_url: undefined }), job({ title: "Good" })] });
    const out = await fetchGreenhouse("company", "Company");
    expect(out.map((o) => o.title)).toEqual(["Good"]);
  });

  test("throws on non-200 so the source is reported failed, not silently empty", async () => {
    mockFetch(null, false, 503);
    await expect(fetchGreenhouse("company", "Company")).rejects.toThrow(/Greenhouse HTTP 503/);
  });

  test("returns empty array when the payload does not have a jobs array", async () => {
    mockFetch({ notJobs: true });
    const out = await fetchGreenhouse("company", "Company");
    expect(out).toHaveLength(0);
  });

  test("tolerates a missing/invalid updated_at", async () => {
    mockFetch({ jobs: [job({ updated_at: "not-a-date" })] });
    const [row] = await fetchGreenhouse("company", "Company");
    expect(row.postedAt).toBeNull();
  });

  test("handles missing location.name", async () => {
    mockFetch({ jobs: [job({ location: {} })] });
    const [row] = await fetchGreenhouse("company", "Company");
    expect(row.locationRaw).toBeNull();
    expect(row.description).toBeNull();
  });

  test("handles location as null/undefined", async () => {
    mockFetch({ jobs: [job({ location: null })] });
    const [row] = await fetchGreenhouse("company", "Company");
    expect(row.locationRaw).toBeNull();
    expect(row.description).toBeNull();
  });

  test("handles location as empty string", async () => {
    mockFetch({ jobs: [job({ location: { name: "" } })] });
    const [row] = await fetchGreenhouse("company", "Company");
    expect(row.locationRaw).toBeNull();
    expect(row.description).toBeNull();
  });

  test("handles various valid updated_at formats", async () => {
    const testCases = [
      { input: "2026-07-01T12:00:00.000Z", expected: "2026-07-01T12:00:00.000Z" },
      { input: "2026-07-01T12:00:00+00:00", expected: "2026-07-01T12:00:00.000Z" },
      { input: "2026-07-01T12:00:00.000+00:00", expected: "2026-07-01T12:00:00.000Z" },
      { input: "2026-07-01T05:00:00-07:00", expected: "2026-07-01T12:00:00.000Z" }, // PDT
    ];
    for (const tc of testCases) {
      mockFetch({ jobs: [job({ updated_at: tc.input })] });
      const [row] = await fetchGreenhouse("company", "Company");
      expect(row.postedAt).toBe(tc.expected);
    }
  });

  test("handles job with extra unexpected fields (robust parsing)", async () => {
    mockFetch({
      jobs: [
        job({
          title: "Senior Engineer",
          extraField1: "ignored",
          extraField2: { nested: "also ignored" },
          salary: "$100k-200k",
          department: "Engineering",
        }),
      ],
    });
    const [row] = await fetchGreenhouse("company", "Company");
    expect(row.title).toBe("Senior Engineer");
    expect(row.sourceUrl).toBe("https://boards.greenhouse.io/company/jobs/abc123");
  });

  test("handles large response with many jobs (performance and memory)", async () => {
    const manyJobs = Array.from({ length: 500 }, (_, i) => job({ title: `Job ${i}`, absolute_url: `https://boards.greenhouse.io/company/jobs/job_${i}` }));
    mockFetch({ jobs: manyJobs });
    const out = await fetchGreenhouse("company", "Company");
    expect(out).toHaveLength(500);
    expect(out[0].title).toBe("Job 0");
    expect(out[499].title).toBe("Job 499");
  });

  test("returns empty array for empty jobs list", async () => {
    mockFetch({ jobs: [] });
    const out = await fetchGreenhouse("company", "Company");
    expect(out).toHaveLength(0);
  });

  test("handles missing jobs property", async () => {
    mockFetch({});
    const out = await fetchGreenhouse("company", "Company");
    expect(out).toHaveLength(0);
  });

  test("handles 404 response as failed fetch", async () => {
    mockFetch(null, false, 404);
    await expect(fetchGreenhouse("company", "Company")).rejects.toThrow(/Greenhouse HTTP 404/);
  });

  test("handles 429 rate limit response as failed fetch", async () => {
    mockFetch(null, false, 429);
    await expect(fetchGreenhouse("company", "Company")).rejects.toThrow(/Greenhouse HTTP 429/);
  });

  test("handles 401 unauthorized as failed fetch", async () => {
    mockFetch(null, false, 401);
    await expect(fetchGreenhouse("company", "Company")).rejects.toThrow(/Greenhouse HTTP 401/);
  });

  test("uses standard content hash for Greenhouse (no ATS job ID)", async () => {
    mockFetch({ jobs: [job({ absolute_url: "https://boards.greenhouse.io/company/jobs/abc123" })] });
    const [row] = await fetchGreenhouse("company", "Company");
    const expectedHash = toContentHash("Senior Engineer", "https://boards.greenhouse.io/company/jobs/abc123");
    expect(row.contentHash).toBe(expectedHash);
  });

  test("different title or URL produces different content hash", async () => {
    const job1 = job({ title: "Job 1", absolute_url: "https://boards.greenhouse.io/company/jobs/job1" });
    const job2 = job({ title: "Job 2", absolute_url: "https://boards.greenhouse.io/company/jobs/job2" });
    mockFetch({ jobs: [job1] });
    const [row1] = await fetchGreenhouse("company", "Company");
    mockFetch({ jobs: [job2] });
    const [row2] = await fetchGreenhouse("company", "Company");
    expect(row1.contentHash).not.toBe(row2.contentHash);
  });

  test("handles multiple jobs in single response with mixed validity", async () => {
    mockFetch({
      jobs: [
        job({ title: "Valid 1", absolute_url: "https://boards.greenhouse.io/company/jobs/job1" }),
        job({ title: "", absolute_url: "https://boards.greenhouse.io/company/jobs/empty" }), // filtered out
        job({ title: "Valid 2", absolute_url: undefined }), // filtered out
        job({ title: "Valid 3", absolute_url: "https://boards.greenhouse.io/company/jobs/job3" }),
      ],
    });
    const out = await fetchGreenhouse("company", "Company");
    expect(out.map((o) => o.title).sort()).toEqual(["Valid 1", "Valid 3"]);
  });

  test("handles whitespace-only title (passes filter but normalizes to empty string)", async () => {
    mockFetch({ jobs: [job({ title: "   " }), job({ title: "Valid" })] });
    const out = await fetchGreenhouse("company", "Company");
    // Whitespace-only title passes filter (truthy) but normalizes to empty string
    expect(out).toHaveLength(2);
    expect(out.map((o) => o.title).sort()).toEqual(["", "Valid"]);
  });

  test("handles whitespace-only absolute_url (passes filter but normalizes to empty string)", async () => {
    mockFetch({ jobs: [job({ absolute_url: "   " }), job({ title: "Valid", absolute_url: "https://boards.greenhouse.io/company/jobs/valid" })] });
    const out = await fetchGreenhouse("company", "Company");
    // Whitespace-only absolute_url passes filter (truthy) but normalizes to empty string
    expect(out).toHaveLength(2);
    expect(out.map((o) => o.title).sort()).toEqual(["Senior Engineer", "Valid"]);
  });
});