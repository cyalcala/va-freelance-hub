import { describe, expect, test, afterEach, mock } from "bun:test";
import { fetchAshby } from "./ats";
import { toContentHash, toAshbyContentHash } from "./contentHash";

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
  jobUrl: "https://jobs.ashbyhq.com/supabase/abc123",
  applyUrl: "https://jobs.ashbyhq.com/supabase/abc123/application",
  isRemote: true,
  isListed: true,
  location: "Remote",
  employmentType: "FullTime",
  publishedAt: "2026-07-01T12:00:00.000+00:00",
  id: "ashby_job_12345",
  ...over,
});

describe("fetchAshby", () => {
  test("maps listed jobs to opportunities with linkback sourceUrl", async () => {
    mockFetch({ jobs: [job()] });
    const out = await fetchAshby("supabase", "Supabase");
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      title: "Senior Engineer",
      company: "Supabase",
      sourceUrl: "https://jobs.ashbyhq.com/supabase/abc123",
      applicationUrl: "https://jobs.ashbyhq.com/supabase/abc123/application",
      locationType: "remote",
      sourcePlatform: "Supabase",
    });
    expect(out[0].contentHash).toMatch(/^[0-9a-f]{16}$/);
    expect(out[0].postedAt).toBe("2026-07-01T12:00:00.000Z");
    expect(out[0].description).toContain("Remote");
  });

  test("excludes unlisted (isListed === false) postings", async () => {
    mockFetch({ jobs: [job({ isListed: false }), job({ title: "Kept" })] });
    const out = await fetchAshby("supabase", "Supabase");
    expect(out.map((o) => o.title)).toEqual(["Kept"]);
  });

  test("skips jobs missing title or jobUrl", async () => {
    mockFetch({ jobs: [job({ title: "" }), job({ jobUrl: undefined }), job({ title: "Good" })] });
    const out = await fetchAshby("supabase", "Supabase");
    expect(out.map((o) => o.title)).toEqual(["Good"]);
  });

  test("throws on non-200 so the source is reported failed, not silently empty", async () => {
    mockFetch(null, false, 503);
    await expect(fetchAshby("supabase", "Supabase")).rejects.toThrow(/Ashby HTTP 503/);
  });

  test("throws when the payload is not a jobs array", async () => {
    mockFetch({ notJobs: true });
    await expect(fetchAshby("supabase", "Supabase")).rejects.toThrow(/did not return a jobs array/);
  });

  test("tolerates a missing/invalid applyUrl and unknown publishedAt", async () => {
    mockFetch({ jobs: [job({ applyUrl: 123, publishedAt: "not-a-date" })] });
    const [row] = await fetchAshby("supabase", "Supabase");
    expect(row.applicationUrl).toBeNull();
    expect(row.postedAt).toBeNull();
  });

  test("extracts and returns Ashby job ID as atsJobId", async () => {
    mockFetch({ jobs: [job({ id: "ashby_job_abcdef" })] });
    const [row] = await fetchAshby("supabase", "Supabase");
    expect(row.atsJobId).toBe("ashby_job_abcdef");
  });

  test("returns undefined atsJobId when job.id is missing", async () => {
    mockFetch({ jobs: [job({ id: undefined })] });
    const [row] = await fetchAshby("supabase", "Supabase");
    expect(row.atsJobId).toBeUndefined();
  });

  test("returns undefined atsJobId when job.id is empty string", async () => {
    mockFetch({ jobs: [job({ id: "" })] });
    const [row] = await fetchAshby("supabase", "Supabase");
    expect(row.atsJobId).toBeUndefined();
  });

  test("uses Ashby-specific content hash incorporating atsJobId when present", async () => {
    const testJob = job({ id: "ashby_job_12345" });
    mockFetch({ jobs: [testJob] });
    const [row] = await fetchAshby("supabase", "Supabase");

    const expectedHash = toAshbyContentHash(testJob.title, testJob.jobUrl, "ashby_job_12345");
    const standardHash = toContentHash(testJob.title, testJob.jobUrl);

    expect(row.contentHash).toBe(expectedHash);
    expect(row.contentHash).not.toBe(standardHash);
  });

  test("falls back to standard content hash when atsJobId is absent", async () => {
    mockFetch({ jobs: [job({ id: undefined })] });
    const [row] = await fetchAshby("supabase", "Supabase");

    const standardHash = toContentHash("Senior Engineer", "https://jobs.ashbyhq.com/supabase/abc123");
    expect(row.contentHash).toBe(standardHash);
  });

  test("different atsJobId produces different content hash for same title and URL", async () => {
    const job1 = job({ id: "ashby_job_1" });
    const job2 = job({ id: "ashby_job_2" });
    mockFetch({ jobs: [job1] });
    const [row1] = await fetchAshby("supabase", "Supabase");
    mockFetch({ jobs: [job2] });
    const [row2] = await fetchAshby("supabase", "Supabase");

    expect(row1.contentHash).not.toBe(row2.contentHash);
  });

  // ─── Edge cases for Ashby API response variations (MATH-03 supply quality) ───

  test("handles job with location as object containing name field", async () => {
    mockFetch({ jobs: [job({ location: { name: "San Francisco, CA" }, isRemote: false })] });
    const [row] = await fetchAshby("supabase", "Supabase");
    expect(row.locationRaw).toContain("San Francisco, CA");
    expect(row.locationRaw).toContain("(onsite)");
  });

  test("handles job with location as string", async () => {
    mockFetch({ jobs: [job({ location: "Remote, USA", isRemote: true })] });
    const [row] = await fetchAshby("supabase", "Supabase");
    expect(row.locationRaw).toBe("Remote, USA");
    expect(row.description).toBe("Location: Remote, USA. Remote: yes.");
  });

  test("handles job with missing location entirely", async () => {
    mockFetch({ jobs: [job({ location: undefined, isRemote: true })] });
    const [row] = await fetchAshby("supabase", "Supabase");
    expect(row.locationRaw).toBeNull();
    expect(row.description).toBe("Remote: yes.");
  });

  test("handles job with empty string location", async () => {
    mockFetch({ jobs: [job({ location: "", isRemote: true })] });
    const [row] = await fetchAshby("supabase", "Supabase");
    expect(row.locationRaw).toBeNull();
    expect(row.description).toBe("Remote: yes.");
  });

  test("handles job with isRemote explicitly false (onsite signal)", async () => {
    mockFetch({ jobs: [job({ location: "New York, NY", isRemote: false })] });
    const [row] = await fetchAshby("supabase", "Supabase");
    expect(row.locationRaw).toContain("New York, NY");
    expect(row.locationRaw).toContain("(onsite)");
  });

  test("handles job with isListed missing (defaults to true per filter logic)", async () => {
    mockFetch({ jobs: [job({ isListed: undefined })] });
    const out = await fetchAshby("supabase", "Supabase");
    expect(out).toHaveLength(1);
    expect(out[0].title).toBe("Senior Engineer");
  });

  test("handles job with isListed explicitly true", async () => {
    mockFetch({ jobs: [job({ isListed: true })] });
    const out = await fetchAshby("supabase", "Supabase");
    expect(out).toHaveLength(1);
  });

  test("handles job with empty string title (filtered out)", async () => {
    mockFetch({ jobs: [job({ title: "" }), job({ title: "Valid" })] });
    const out = await fetchAshby("supabase", "Supabase");
    expect(out.map((o) => o.title)).toEqual(["Valid"]);
  });

  test("handles job with empty string jobUrl (filtered out)", async () => {
    mockFetch({ jobs: [job({ jobUrl: "" }), job({ title: "Valid", jobUrl: "https://jobs.ashbyhq.com/supabase/valid" })] });
    const out = await fetchAshby("supabase", "Supabase");
    expect(out.map((o) => o.title)).toEqual(["Valid"]);
  });

  test("handles job with whitespace-only title (normalized to empty but passes filter)", async () => {
    mockFetch({ jobs: [job({ title: "   " }), job({ title: "Valid" })] });
    const out = await fetchAshby("supabase", "Supabase");
    // Whitespace-only title passes filter (truthy) but normalizes to empty string
    expect(out).toHaveLength(2);
    expect(out.map((o) => o.title).sort()).toEqual(["", "Valid"]);
  });

  test("handles job with whitespace-only jobUrl (normalized to empty but passes filter)", async () => {
    mockFetch({ jobs: [job({ jobUrl: "   " }), job({ title: "Valid", jobUrl: "https://jobs.ashbyhq.com/supabase/valid" })] });
    const out = await fetchAshby("supabase", "Supabase");
    // Whitespace-only jobUrl passes filter (truthy) but normalizes to empty string
    expect(out).toHaveLength(2);
    expect(out.map((o) => o.title).sort()).toEqual(["Senior Engineer", "Valid"]);
  });

  test("handles job with applyUrl as null (explicit null)", async () => {
    mockFetch({ jobs: [job({ applyUrl: null })] });
    const [row] = await fetchAshby("supabase", "Supabase");
    expect(row.applicationUrl).toBeNull();
  });

  test("handles job with applyUrl missing entirely", async () => {
    mockFetch({ jobs: [job({ applyUrl: undefined })] });
    const [row] = await fetchAshby("supabase", "Supabase");
    expect(row.applicationUrl).toBeNull();
  });

  test("handles publishedAt in various valid ISO formats", async () => {
    const testCases = [
      { input: "2026-07-01T12:00:00.000Z", expected: "2026-07-01T12:00:00.000Z" },
      { input: "2026-07-01T12:00:00+00:00", expected: "2026-07-01T12:00:00.000Z" },
      { input: "2026-07-01T12:00:00.000+00:00", expected: "2026-07-01T12:00:00.000Z" },
    ];
    for (const tc of testCases) {
      mockFetch({ jobs: [job({ publishedAt: tc.input })] });
      const [row] = await fetchAshby("supabase", "Supabase");
      expect(row.postedAt).toBe(tc.expected);
    }
  });

  test("handles publishedAt with timezone offset (non-UTC)", async () => {
    mockFetch({ jobs: [job({ publishedAt: "2026-07-01T05:00:00-07:00" })] }); // PDT
    const [row] = await fetchAshby("supabase", "Supabase");
    expect(row.postedAt).toBe("2026-07-01T12:00:00.000Z");
  });

  test("handles job with employmentType other than FullTime", async () => {
    mockFetch({ jobs: [job({ employmentType: "Contract" })] });
    const [row] = await fetchAshby("supabase", "Supabase");
    expect(row.type).toBe("full-time"); // Normalized to full-time per current implementation
  });

  test("handles multiple jobs in single response with mixed validity", async () => {
    mockFetch({
      jobs: [
        job({ title: "Valid 1", id: "job_1" }),
        job({ title: "", jobUrl: "https://jobs.ashbyhq.com/supabase/empty" }), // filtered out
        job({ jobUrl: undefined, title: "Valid 2", id: "job_2" }), // filtered out
        job({ isListed: false, title: "Hidden" }), // filtered out
        job({ title: "Valid 3", id: "job_3" }),
      ],
    });
    const out = await fetchAshby("supabase", "Supabase");
    expect(out.map((o) => o.title).sort()).toEqual(["Valid 1", "Valid 3"]);
    expect(out[0].atsJobId).toBe("job_1");
    expect(out[1].atsJobId).toBe("job_3");
  });

  test("handles job with id containing whitespace (trimmed)", async () => {
    mockFetch({ jobs: [job({ id: "  ashby_job_123  " })] });
    const [row] = await fetchAshby("supabase", "Supabase");
    expect(row.atsJobId).toBe("ashby_job_123");
    expect(row.contentHash).toBe(toAshbyContentHash("Senior Engineer", "https://jobs.ashbyhq.com/supabase/abc123", "ashby_job_123"));
  });

  test("handles job with id that is only whitespace (treated as undefined)", async () => {
    mockFetch({ jobs: [job({ id: "   " })] });
    const [row] = await fetchAshby("supabase", "Supabase");
    expect(row.atsJobId).toBeUndefined();
  });

  test("handles response with extra unexpected fields (robust parsing)", async () => {
    mockFetch({
      jobs: [
        job({
          id: "job_extra",
          extraField1: "ignored",
          extraField2: { nested: "also ignored" },
          salary: "$100k-200k",
          department: "Engineering",
        }),
      ],
    });
    const [row] = await fetchAshby("supabase", "Supabase");
    expect(row.title).toBe("Senior Engineer");
    expect(row.atsJobId).toBe("job_extra");
  });

  test("handles large response with many jobs (performance and memory)", async () => {
    const manyJobs = Array.from({ length: 500 }, (_, i) => job({ title: `Job ${i}`, id: `job_${i}`, jobUrl: `https://jobs.ashbyhq.com/supabase/job_${i}` }));
    mockFetch({ jobs: manyJobs });
    const out = await fetchAshby("supabase", "Supabase");
    expect(out).toHaveLength(500);
    expect(out[0].title).toBe("Job 0");
    expect(out[499].title).toBe("Job 499");
  });

  test("returns empty array for empty jobs list", async () => {
    mockFetch({ jobs: [] });
    const out = await fetchAshby("supabase", "Supabase");
    expect(out).toHaveLength(0);
  });

  test("handles 404 response as failed fetch", async () => {
    mockFetch(null, false, 404);
    await expect(fetchAshby("supabase", "Supabase")).rejects.toThrow(/Ashby HTTP 404/);
  });

  test("handles 429 rate limit response as failed fetch", async () => {
    mockFetch(null, false, 429);
    await expect(fetchAshby("supabase", "Supabase")).rejects.toThrow(/Ashby HTTP 429/);
  });

  test("handles 401 unauthorized as failed fetch", async () => {
    mockFetch(null, false, 401);
    await expect(fetchAshby("supabase", "Supabase")).rejects.toThrow(/Ashby HTTP 401/);
  });

  test("handles job with non-string id (number) - treated as undefined", async () => {
    mockFetch({ jobs: [job({ id: 12345 as any })] });
    const [row] = await fetchAshby("supabase", "Supabase");
    expect(row.atsJobId).toBeUndefined();
  });

  test("description includes location and remote status for object location", async () => {
    mockFetch({ jobs: [job({ location: { name: "London, UK" }, isRemote: true })] });
    const [row] = await fetchAshby("supabase", "Supabase");
    expect(row.description).toContain("London, UK");
    expect(row.description).toContain("Remote: yes");
  });

  test("description includes only remote status when location missing", async () => {
    mockFetch({ jobs: [job({ location: undefined, isRemote: false })] });
    const [row] = await fetchAshby("supabase", "Supabase");
    expect(row.description).toContain("Remote: no");
  });
});
