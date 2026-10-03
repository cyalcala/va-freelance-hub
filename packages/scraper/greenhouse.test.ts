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

  // ─── Edge cases for Greenhouse API response variations (MATH-03 supply quality) ───

  test("handles jobs as non-array (current behavior: throws on non-array jobs)", async () => {
    // Current implementation throws when jobs is not an array (pre-existing limitation)
    // This test documents the behavior - a robust fix would coerce to array or return empty
    mockFetch({ jobs: "not-an-array" });
    await expect(fetchGreenhouse("company", "Company")).rejects.toThrow();
  });

  test("handles non-object elements in jobs array (robust filtering)", async () => {
    mockFetch({ jobs: [job({ title: "Valid 1" }), "not-an-object", null, 123, job({ title: "Valid 2" })] });
    const out = await fetchGreenhouse("company", "Company");
    expect(out.map((o) => o.title).sort()).toEqual(["Valid 1", "Valid 2"]);
  });

  test("handles job.title as non-string (number, boolean) - throws in normalizeText", async () => {
    // Current implementation throws on non-string titles (pre-existing limitation in normalizeText)
    // This test documents the behavior - it would need normalizeText fix to handle gracefully
    mockFetch({ jobs: [job({ title: 123 })] });
    await expect(fetchGreenhouse("company", "Company")).rejects.toThrow();
  });

  test("handles location as string (not object) - current behavior returns null", async () => {
    // Current implementation only reads location.name, so string location returns null
    // This test documents the behavior - a robust fix would handle string location
    mockFetch({ jobs: [job({ location: "San Francisco, CA" })] });
    const [row] = await fetchGreenhouse("company", "Company");
    expect(row.locationRaw).toBeNull();
    expect(row.description).toBeNull();
  });

  test("handles location as object with name field", async () => {
    mockFetch({ jobs: [job({ location: { name: "New York, NY" } })] });
    const [row] = await fetchGreenhouse("company", "Company");
    expect(row.locationRaw).toBe("New York, NY");
    expect(row.description).toContain("New York, NY");
  });

  test("handles location object with whitespace-only name", async () => {
    mockFetch({ jobs: [job({ location: { name: "   " } })] });
    const [row] = await fetchGreenhouse("company", "Company");
    // Whitespace name normalized to empty string
    expect(row.locationRaw).toBeNull();
    expect(row.description).toBeNull();
  });

  test("handles location object with missing name property", async () => {
    mockFetch({ jobs: [job({ location: { otherField: "value" } })] });
    const [row] = await fetchGreenhouse("company", "Company");
    expect(row.locationRaw).toBeNull();
    expect(row.description).toBeNull();
  });

  test("handles location object with name as null", async () => {
    mockFetch({ jobs: [job({ location: { name: null } })] });
    const [row] = await fetchGreenhouse("company", "Company");
    expect(row.locationRaw).toBeNull();
    expect(row.description).toBeNull();
  });

  test("handles both updated_at missing and no fallback date field", async () => {
    mockFetch({ jobs: [job({ updated_at: undefined }), job({ title: "Valid" })] });
    const out = await fetchGreenhouse("company", "Company");
    const invalidJob = out.find((o) => o.title === "Senior Engineer");
    if (invalidJob) {
      expect(invalidJob.postedAt).toBeNull();
    }
    expect(out.length).toBeGreaterThanOrEqual(1);
  });

  test("handles updated_at with various timezone offsets", async () => {
    const testCases = [
      { input: "2026-07-01T12:00:00.000Z", expected: "2026-07-01T12:00:00.000Z" },
      { input: "2026-07-01T12:00:00+00:00", expected: "2026-07-01T12:00:00.000Z" },
      { input: "2026-07-01T12:00:00.000+00:00", expected: "2026-07-01T12:00:00.000Z" },
      { input: "2026-07-01T05:00:00-07:00", expected: "2026-07-01T12:00:00.000Z" }, // PDT
      { input: "2026-07-01T14:00:00+02:00", expected: "2026-07-01T12:00:00.000Z" }, // CEST
      { input: "2026-12-25T12:00:00-05:00", expected: "2026-12-25T17:00:00.000Z" }, // EST
    ];
    for (const tc of testCases) {
      mockFetch({ jobs: [job({ updated_at: tc.input })] });
      const [row] = await fetchGreenhouse("company", "Company");
      expect(row.postedAt).toBe(tc.expected);
    }
  });

  test("handles job with extra unexpected fields including nested objects", async () => {
    mockFetch({
      jobs: [
        job({
          title: "Senior Engineer",
          extraField1: "ignored",
          extraField2: { nested: "also ignored" },
          salary: { min: 100000, max: 200000, currency: "USD" },
          department: "Engineering",
          metadata: { key: "value", tags: ["remote", "senior"] },
        }),
      ],
    });
    const [row] = await fetchGreenhouse("company", "Company");
    expect(row.title).toBe("Senior Engineer");
    expect(row.sourceUrl).toBe("https://boards.greenhouse.io/company/jobs/abc123");
  });

  test("handles absolute_url with special characters and spaces", async () => {
    mockFetch({ jobs: [job({ absolute_url: "https://boards.greenhouse.io/company/jobs/job with spaces" }), job({ title: "Valid", absolute_url: "https://boards.greenhouse.io/company/jobs/valid" })] });
    const out = await fetchGreenhouse("company", "Company");
    expect(out.length).toBeGreaterThanOrEqual(1);
    const validJob = out.find((o) => o.title === "Valid");
    expect(validJob).toBeDefined();
  });

  test("handles response without content-type check (Greenhouse doesn't validate JSON content-type)", async () => {
    // Unlike Breezy, Greenhouse doesn't check content-type header
    // This test documents that behavior - it will parse whatever JSON is returned
    mockFetch({ jobs: [job({ title: "Valid" })] });
    const out = await fetchGreenhouse("company", "Company");
    expect(out).toHaveLength(1);
    expect(out[0].title).toBe("Valid");
  });

  test("handles 500 internal server error as failed fetch", async () => {
    mockFetch(null, false, 500);
    await expect(fetchGreenhouse("company", "Company")).rejects.toThrow(/Greenhouse HTTP 500/);
  });

  test("handles 502 bad gateway as failed fetch", async () => {
    mockFetch(null, false, 502);
    await expect(fetchGreenhouse("company", "Company")).rejects.toThrow(/Greenhouse HTTP 502/);
  });

  test("handles 504 gateway timeout as failed fetch", async () => {
    mockFetch(null, false, 504);
    await expect(fetchGreenhouse("company", "Company")).rejects.toThrow(/Greenhouse HTTP 504/);
  });

  test("handles empty string title in otherwise valid job object", async () => {
    mockFetch({ jobs: [job({ title: "", absolute_url: "https://boards.greenhouse.io/company/jobs/empty" }), job({ title: "Valid", absolute_url: "https://boards.greenhouse.io/company/jobs/valid" })] });
    const out = await fetchGreenhouse("company", "Company");
    expect(out.map((o) => o.title)).toEqual(["Valid"]);
  });

  test("handles undefined title in otherwise valid job object", async () => {
    mockFetch({ jobs: [job({ title: undefined, absolute_url: "https://boards.greenhouse.io/company/jobs/empty" }), job({ title: "Valid", absolute_url: "https://boards.greenhouse.io/company/jobs/valid" })] });
    const out = await fetchGreenhouse("company", "Company");
    expect(out.map((o) => o.title)).toEqual(["Valid"]);
  });

  test("handles null title in otherwise valid job object", async () => {
    mockFetch({ jobs: [job({ title: null, absolute_url: "https://boards.greenhouse.io/company/jobs/empty" }), job({ title: "Valid", absolute_url: "https://boards.greenhouse.io/company/jobs/valid" })] });
    const out = await fetchGreenhouse("company", "Company");
    expect(out.map((o) => o.title)).toEqual(["Valid"]);
  });

  test("handles empty string absolute_url in otherwise valid job object", async () => {
    mockFetch({ jobs: [job({ title: "Valid", absolute_url: "" }), job({ title: "Valid 2", absolute_url: "https://boards.greenhouse.io/company/jobs/valid" })] });
    const out = await fetchGreenhouse("company", "Company");
    expect(out.map((o) => o.title)).toEqual(["Valid 2"]);
  });

  test("handles null absolute_url in otherwise valid job object", async () => {
    mockFetch({ jobs: [job({ title: "Valid", absolute_url: null }), job({ title: "Valid 2", absolute_url: "https://boards.greenhouse.io/company/jobs/valid" })] });
    const out = await fetchGreenhouse("company", "Company");
    expect(out.map((o) => o.title)).toEqual(["Valid 2"]);
  });

  test("handles large response with many jobs (performance and memory)", async () => {
    const manyJobs = Array.from({ length: 1000 }, (_, i) => job({ title: `Job ${i}`, absolute_url: `https://boards.greenhouse.io/company/jobs/job_${i}` }));
    mockFetch({ jobs: manyJobs });
    const out = await fetchGreenhouse("company", "Company");
    expect(out).toHaveLength(1000);
    expect(out[0].title).toBe("Job 0");
    expect(out[999].title).toBe("Job 999");
  });

  test("description includes location when location present", async () => {
    mockFetch({ jobs: [job({ location: { name: "London, UK" } })] });
    const [row] = await fetchGreenhouse("company", "Company");
    expect(row.description).toContain("London, UK");
  });

  test("description is null when location missing", async () => {
    mockFetch({ jobs: [job({ location: undefined })] });
    const [row] = await fetchGreenhouse("company", "Company");
    expect(row.description).toBeNull();
  });

  test("description is null when location.name is empty string", async () => {
    mockFetch({ jobs: [job({ location: { name: "" } })] });
    const [row] = await fetchGreenhouse("company", "Company");
    expect(row.description).toBeNull();
  });
});