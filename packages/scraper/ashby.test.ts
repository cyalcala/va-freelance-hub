import { describe, expect, test, afterEach, mock } from "bun:test";
import { fetchAshby } from "./ats";

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
});
