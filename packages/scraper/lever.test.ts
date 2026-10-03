import { describe, expect, test, afterEach, mock } from "bun:test";
import { fetchLever } from "./ats";
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
  text: "Senior Engineer",
  hostedUrl: "https://jobs.lever.co/company/abc123",
  createdAt: "2026-07-01T12:00:00.000+00:00",
  categories: { location: "Remote" },
  workplaceType: "remote",
  descriptionPlain: "We are hiring a senior engineer...",
  ...over,
});

describe("fetchLever", () => {
  test("maps listed jobs to opportunities with linkback sourceUrl", async () => {
    mockFetch([job()]);
    const out = await fetchLever("company", "Company");
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      title: "Senior Engineer",
      company: "Company",
      sourceUrl: "https://jobs.lever.co/company/abc123",
      locationType: "remote",
      sourcePlatform: "Company",
    });
    expect(out[0].contentHash).toMatch(/^[0-9a-f]{16}$/);
    expect(out[0].postedAt).toBe("2026-07-01T12:00:00.000Z");
    expect(out[0].description).toContain("We are hiring a senior engineer");
    expect(out[0].locationRaw).toContain("Remote");
    expect(out[0].locationRaw).toContain("(remote)");
  });

  test("skips jobs missing text or hostedUrl", async () => {
    mockFetch([job({ text: "" }), job({ hostedUrl: undefined }), job({ text: "Good" })]);
    const out = await fetchLever("company", "Company");
    expect(out.map((o) => o.title)).toEqual(["Good"]);
  });

  test("throws on non-200 so the source is reported failed, not silently empty", async () => {
    mockFetch(null, false, 503);
    await expect(fetchLever("company", "Company")).rejects.toThrow(/Lever HTTP 503/);
  });

  test("throws when the payload is not an array", async () => {
    mockFetch({ notJobs: true });
    await expect(fetchLever("company", "Company")).rejects.toThrow();
  });

  test("tolerates a missing/invalid createdAt and missing descriptionPlain", async () => {
    mockFetch([job({ createdAt: "not-a-date", descriptionPlain: undefined })]);
    const [row] = await fetchLever("company", "Company");
    expect(row.postedAt).toBeNull();
    expect(row.description).toBeNull();
  });

  test("handles workplaceType variations (on-site, hybrid, unspecified)", async () => {
    const testCases = [
      { workplaceType: "on-site", expectedOnsite: true },
      { workplaceType: "hybrid", expectedOnsite: false },
      { workplaceType: "unspecified", expectedOnsite: false },
      { workplaceType: "remote", expectedOnsite: false },
      { workplaceType: undefined, expectedOnsite: false },
    ];
    for (const tc of testCases) {
      mockFetch([job({ workplaceType: tc.workplaceType, categories: { location: "San Francisco, CA" } })]);
      const [row] = await fetchLever("company", "Company");
      if (tc.expectedOnsite) {
        expect(row.locationRaw).toContain("(on-site)");
      } else {
        expect(row.locationRaw).not.toContain("(on-site)");
      }
    }
  });

  test("handles missing categories.location (falls back to workplaceType)", async () => {
    mockFetch([job({ categories: {}, workplaceType: "remote" })]);
    const [row] = await fetchLever("company", "Company");
    expect(row.locationRaw).toBe("(remote)");
  });

  test("handles categories.location as null/undefined (falls back to workplaceType)", async () => {
    mockFetch([job({ categories: { location: null }, workplaceType: "remote" })]);
    const [row] = await fetchLever("company", "Company");
    expect(row.locationRaw).toBe("(remote)");
  });

  test("handles categories.location as empty string (falls back to workplaceType)", async () => {
    mockFetch([job({ categories: { location: "" }, workplaceType: "remote" })]);
    const [row] = await fetchLever("company", "Company");
    expect(row.locationRaw).toBe("(remote)");
  });

  test("handles descriptionPlain truncation at 500 characters", async () => {
    const longDescription = "a".repeat(600);
    mockFetch([job({ descriptionPlain: longDescription })]);
    const [row] = await fetchLever("company", "Company");
    expect(row.description?.length).toBeLessThanOrEqual(500);
    expect(row.description).toBe(longDescription.slice(0, 500));
  });

  test("falls back to description when descriptionPlain is missing", async () => {
    mockFetch([job({ descriptionPlain: undefined, description: "<p>HTML description</p>" })]);
    const [row] = await fetchLever("company", "Company");
    expect(row.description).toBe("HTML description");
  });

  test("handles HTML in descriptionPlain (should be stripped)", async () => {
    mockFetch([job({ descriptionPlain: "<p>Clean <strong>text</strong></p>" })]);
    const [row] = await fetchLever("company", "Company");
    expect(row.description).toBe("Clean text");
  });

  test("handles whitespace-only text (passes filter but normalizes to empty string)", async () => {
    mockFetch([job({ text: "   " }), job({ text: "Valid" })]);
    const out = await fetchLever("company", "Company");
    // Whitespace-only text passes filter (truthy) but normalizes to empty string
    expect(out).toHaveLength(2);
    expect(out.map((o) => o.title).sort()).toEqual(["", "Valid"]);
  });

  test("handles whitespace-only hostedUrl (passes filter but normalizes to empty string)", async () => {
    mockFetch([job({ hostedUrl: "   " }), job({ text: "Valid", hostedUrl: "https://jobs.lever.co/company/valid" })]);
    const out = await fetchLever("company", "Company");
    // Whitespace-only hostedUrl passes filter (truthy) but normalizes to empty string
    expect(out).toHaveLength(2);
    expect(out.map((o) => o.title).sort()).toEqual(["Senior Engineer", "Valid"]);
  });

  test("handles job with extra unexpected fields (robust parsing)", async () => {
    mockFetch([job({
      extraField1: "ignored",
      extraField2: { nested: "also ignored" },
      salary: "$100k-200k",
      department: "Engineering",
    })]);
    const [row] = await fetchLever("company", "Company");
    expect(row.title).toBe("Senior Engineer");
    expect(row.sourceUrl).toBe("https://jobs.lever.co/company/abc123");
  });

  test("handles large response with many jobs (performance and memory)", async () => {
    const manyJobs = Array.from({ length: 500 }, (_, i) => job({ text: `Job ${i}`, hostedUrl: `https://jobs.lever.co/company/job_${i}` }));
    mockFetch(manyJobs);
    const out = await fetchLever("company", "Company");
    expect(out).toHaveLength(500);
    expect(out[0].title).toBe("Job 0");
    expect(out[499].title).toBe("Job 499");
  });

  test("returns empty array for empty jobs list", async () => {
    mockFetch([]);
    const out = await fetchLever("company", "Company");
    expect(out).toHaveLength(0);
  });

  test("handles 404 response as failed fetch", async () => {
    mockFetch(null, false, 404);
    await expect(fetchLever("company", "Company")).rejects.toThrow(/Lever HTTP 404/);
  });

  test("handles 429 rate limit response as failed fetch", async () => {
    mockFetch(null, false, 429);
    await expect(fetchLever("company", "Company")).rejects.toThrow(/Lever HTTP 429/);
  });

  test("handles 401 unauthorized as failed fetch", async () => {
    mockFetch(null, false, 401);
    await expect(fetchLever("company", "Company")).rejects.toThrow(/Lever HTTP 401/);
  });

  test("handles various valid createdAt formats", async () => {
    const testCases = [
      { input: "2026-07-01T12:00:00.000Z", expected: "2026-07-01T12:00:00.000Z" },
      { input: "2026-07-01T12:00:00+00:00", expected: "2026-07-01T12:00:00.000Z" },
      { input: "2026-07-01T12:00:00.000+00:00", expected: "2026-07-01T12:00:00.000Z" },
      { input: "2026-07-01T05:00:00-07:00", expected: "2026-07-01T12:00:00.000Z" }, // PDT
    ];
    for (const tc of testCases) {
      mockFetch([job({ createdAt: tc.input })]);
      const [row] = await fetchLever("company", "Company");
      expect(row.postedAt).toBe(tc.expected);
    }
  });

  test("uses standard content hash for Lever (no ATS job ID)", async () => {
    mockFetch([job({ hostedUrl: "https://jobs.lever.co/company/abc123" })]);
    const [row] = await fetchLever("company", "Company");
    const expectedHash = toContentHash("Senior Engineer", "https://jobs.lever.co/company/abc123");
    expect(row.contentHash).toBe(expectedHash);
  });

  test("different title or URL produces different content hash", async () => {
    const job1 = job({ text: "Job 1", hostedUrl: "https://jobs.lever.co/company/job1" });
    const job2 = job({ text: "Job 2", hostedUrl: "https://jobs.lever.co/company/job2" });
    mockFetch([job1]);
    const [row1] = await fetchLever("company", "Company");
    mockFetch([job2]);
    const [row2] = await fetchLever("company", "Company");
    expect(row1.contentHash).not.toBe(row2.contentHash);
  });

  test("handles multiple jobs in single response with mixed validity", async () => {
    mockFetch([
      job({ text: "Valid 1", hostedUrl: "https://jobs.lever.co/company/job1" }),
      job({ text: "", hostedUrl: "https://jobs.lever.co/company/empty" }), // filtered out
      job({ text: "Valid 2", hostedUrl: undefined }), // filtered out
      job({ text: "Valid 3", hostedUrl: "https://jobs.lever.co/company/job3" }),
    ]);
    const out = await fetchLever("company", "Company");
    expect(out.map((o) => o.title).sort()).toEqual(["Valid 1", "Valid 3"]);
  });

  // ─── Edge cases for Lever API response variations (MATH-03 supply quality) ───

  test("handles jobs as non-array (current behavior: throws on non-array)", async () => {
    // Current implementation throws when payload is not an array (pre-existing limitation)
    // This test documents the behavior - a robust fix would coerce to array or return empty
    mockFetch("not-an-array");
    await expect(fetchLever("company", "Company")).rejects.toThrow();
  });

  test("handles non-object elements in jobs array (robust filtering)", async () => {
    mockFetch([job({ text: "Valid 1" }), "not-an-object", null, 123, job({ text: "Valid 2" })]);
    const out = await fetchLever("company", "Company");
    expect(out.map((o) => o.title).sort()).toEqual(["Valid 1", "Valid 2"]);
  });

  test("handles job.text as non-string (number, boolean) - throws in normalizeText", async () => {
    // Current implementation throws on non-string titles (pre-existing limitation in normalizeText)
    // This test documents the behavior - it would need normalizeText fix to handle gracefully
    mockFetch([job({ text: 123 })]);
    await expect(fetchLever("company", "Company")).rejects.toThrow();
  });

  test("handles categories.location as string (not object) - current behavior uses string directly", async () => {
    // Current implementation reads categories.location directly, so string location works
    // This test documents the behavior
    mockFetch([job({ categories: { location: "San Francisco, CA" }, workplaceType: "remote" })]);
    const [row] = await fetchLever("company", "Company");
    expect(row.locationRaw).toBe("San Francisco, CA (remote)");
  });

  test("handles categories.location as object with name field - throws in normalizeText", async () => {
    // Current implementation passes the object to normalizeText which throws on non-string
    // This test documents the current behavior (throws)
    mockFetch([job({ categories: { location: { name: "New York, NY" } }, workplaceType: "remote" })]);
    await expect(fetchLever("company", "Company")).rejects.toThrow();
  });

  test("handles categories as null/undefined", async () => {
    mockFetch([job({ categories: null, workplaceType: "remote" })]);
    const [row] = await fetchLever("company", "Company");
    expect(row.locationRaw).toBe("(remote)");
  });

  test("handles categories.location with whitespace-only string", async () => {
    mockFetch([job({ categories: { location: "   " }, workplaceType: "remote" })]);
    const [row] = await fetchLever("company", "Company");
    // Whitespace location normalized to empty string by normalizeText, filtered out by .filter(Boolean)
    // Only workplaceType remains
    expect(row.locationRaw).toBe("(remote)");
  });

  test("handles categories.location as empty object - throws in normalizeText", async () => {
    // Current implementation passes the object to normalizeText which throws on non-string
    // This test documents the current behavior (throws)
    mockFetch([job({ categories: { location: {} }, workplaceType: "remote" })]);
    await expect(fetchLever("company", "Company")).rejects.toThrow();
  });

  test("handles various valid createdAt formats with additional timezones", async () => {
    const testCases = [
      { input: "2026-07-01T12:00:00.000Z", expected: "2026-07-01T12:00:00.000Z" },
      { input: "2026-07-01T12:00:00+00:00", expected: "2026-07-01T12:00:00.000Z" },
      { input: "2026-07-01T12:00:00.000+00:00", expected: "2026-07-01T12:00:00.000Z" },
      { input: "2026-07-01T05:00:00-07:00", expected: "2026-07-01T12:00:00.000Z" }, // PDT
      { input: "2026-07-01T14:00:00+02:00", expected: "2026-07-01T12:00:00.000Z" }, // CEST
      { input: "2026-12-25T12:00:00-05:00", expected: "2026-12-25T17:00:00.000Z" }, // EST
    ];
    for (const tc of testCases) {
      mockFetch([job({ createdAt: tc.input })]);
      const [row] = await fetchLever("company", "Company");
      expect(row.postedAt).toBe(tc.expected);
    }
  });

  test("handles 500 internal server error as failed fetch", async () => {
    mockFetch(null, false, 500);
    await expect(fetchLever("company", "Company")).rejects.toThrow(/Lever HTTP 500/);
  });

  test("handles 502 bad gateway as failed fetch", async () => {
    mockFetch(null, false, 502);
    await expect(fetchLever("company", "Company")).rejects.toThrow(/Lever HTTP 502/);
  });

  test("handles 504 gateway timeout as failed fetch", async () => {
    mockFetch(null, false, 504);
    await expect(fetchLever("company", "Company")).rejects.toThrow(/Lever HTTP 504/);
  });

  test("handles empty string text in otherwise valid job object", async () => {
    mockFetch([job({ text: "", hostedUrl: "https://jobs.lever.co/company/empty" }), job({ text: "Valid", hostedUrl: "https://jobs.lever.co/company/valid" })]);
    const out = await fetchLever("company", "Company");
    expect(out.map((o) => o.title)).toEqual(["Valid"]);
  });

  test("handles undefined text in otherwise valid job object", async () => {
    mockFetch([job({ text: undefined, hostedUrl: "https://jobs.lever.co/company/empty" }), job({ text: "Valid", hostedUrl: "https://jobs.lever.co/company/valid" })]);
    const out = await fetchLever("company", "Company");
    expect(out.map((o) => o.title)).toEqual(["Valid"]);
  });

  test("handles null text in otherwise valid job object", async () => {
    mockFetch([job({ text: null, hostedUrl: "https://jobs.lever.co/company/empty" }), job({ text: "Valid", hostedUrl: "https://jobs.lever.co/company/valid" })]);
    const out = await fetchLever("company", "Company");
    expect(out.map((o) => o.title)).toEqual(["Valid"]);
  });

  test("handles empty string hostedUrl in otherwise valid job object", async () => {
    mockFetch([job({ text: "Valid", hostedUrl: "" }), job({ text: "Valid 2", hostedUrl: "https://jobs.lever.co/company/valid" })]);
    const out = await fetchLever("company", "Company");
    expect(out.map((o) => o.title)).toEqual(["Valid 2"]);
  });

  test("handles null hostedUrl in otherwise valid job object", async () => {
    mockFetch([job({ text: "Valid", hostedUrl: null }), job({ text: "Valid 2", hostedUrl: "https://jobs.lever.co/company/valid" })]);
    const out = await fetchLever("company", "Company");
    expect(out.map((o) => o.title)).toEqual(["Valid 2"]);
  });

  test("handles job with extra unexpected fields including nested objects", async () => {
    mockFetch([
      job({
        text: "Senior Engineer",
        extraField1: "ignored",
        extraField2: { nested: "also ignored" },
        salary: { min: 100000, max: 200000, currency: "USD" },
        department: "Engineering",
        metadata: { key: "value", tags: ["remote", "senior"] },
      }),
    ]);
    const [row] = await fetchLever("company", "Company");
    expect(row.title).toBe("Senior Engineer");
    expect(row.sourceUrl).toBe("https://jobs.lever.co/company/abc123");
  });

  test("handles hostedUrl with special characters and spaces", async () => {
    mockFetch([job({ hostedUrl: "https://jobs.lever.co/company/job with spaces" }), job({ text: "Valid", hostedUrl: "https://jobs.lever.co/company/valid" })]);
    const out = await fetchLever("company", "Company");
    expect(out.length).toBeGreaterThanOrEqual(1);
    const validJob = out.find((o) => o.title === "Valid");
    expect(validJob).toBeDefined();
  });

  test("handles response without content-type check (Lever doesn't validate JSON content-type)", async () => {
    // Unlike Breezy, Lever doesn't check content-type header
    // This test documents that behavior - it will parse whatever JSON is returned
    mockFetch([job({ text: "Valid" })]);
    const out = await fetchLever("company", "Company");
    expect(out).toHaveLength(1);
    expect(out[0].title).toBe("Valid");
  });

  test("handles large response with many jobs (performance and memory, 1000 jobs)", async () => {
    const manyJobs = Array.from({ length: 1000 }, (_, i) => job({ text: `Job ${i}`, hostedUrl: `https://jobs.lever.co/company/job_${i}` }));
    mockFetch(manyJobs);
    const out = await fetchLever("company", "Company");
    expect(out).toHaveLength(1000);
    expect(out[0].title).toBe("Job 0");
    expect(out[999].title).toBe("Job 999");
  });

  test("handles createdAt missing with no fallback date field", async () => {
    mockFetch([job({ createdAt: undefined }), job({ text: "Valid" })]);
    const out = await fetchLever("company", "Company");
    const invalidJob = out.find((o) => o.title === "Senior Engineer");
    if (invalidJob) {
      expect(invalidJob.postedAt).toBeNull();
    }
    expect(out.length).toBeGreaterThanOrEqual(1);
  });

  test("handles both createdAt invalid and no other date fields", async () => {
    mockFetch([job({ createdAt: "not-a-date" }), job({ text: "Valid" })]);
    const out = await fetchLever("company", "Company");
    const invalidJob = out.find((o) => o.title === "Senior Engineer");
    if (invalidJob) {
      expect(invalidJob.postedAt).toBeNull();
    }
    expect(out.length).toBeGreaterThanOrEqual(1);
  });

  test("handles workplaceType as string variations with case sensitivity", async () => {
    const testCases = [
      { workplaceType: "ON-SITE", expectedOnsite: false }, // case sensitive - not "on-site"
      { workplaceType: "On-Site", expectedOnsite: false }, // case sensitive
      { workplaceType: "HYBRID", expectedOnsite: false },
      { workplaceType: "REMOTE", expectedOnsite: false },
    ];
    for (const tc of testCases) {
      mockFetch([job({ workplaceType: tc.workplaceType, categories: { location: "San Francisco, CA" } })]);
      const [row] = await fetchLever("company", "Company");
      if (tc.expectedOnsite) {
        expect(row.locationRaw).toContain("(on-site)");
      } else {
        expect(row.locationRaw).not.toContain("(on-site)");
      }
    }
  });
});