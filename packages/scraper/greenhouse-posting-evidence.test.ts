import { afterEach, expect, test } from "bun:test";
import { fetchATSFeed } from "./ats";
import { ATS_PROBE_TEMPLATES } from "../../scripts/lake/domain-ats-discovery";

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });
const posting = (overrides: Record<string, unknown> = {}) => ({ id: 1, internal_job_id: 2,
  title: "Technical Writer", absolute_url: "https://job-boards.greenhouse.io/fixture/jobs/1",
  location: { name: "Remote - Philippines" }, updated_at: "2026-10-08T00:00:00Z", ...overrides });

async function scrape(jobs: unknown[]) {
  const requests: string[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    requests.push(String(input));
    return new Response(JSON.stringify({ jobs }), { status: 200,
      headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
  const rows = await fetchATSFeed("greenhouse", "fixture", "Fixture");
  expect(requests).toEqual(["https://boards-api.greenhouse.io/v1/boards/fixture/jobs"]);
  return rows;
}
const extract = (jobs: unknown[]) => ATS_PROBE_TEMPLATES.find(template => template.family === "Greenhouse")!.extractJobs({ jobs });

test("Greenhouse uses only supplied first_published as posting date on both intake planes", async () => {
  const jobs = [posting({ first_published: "2026-09-01T01:02:03-04:00" })];
  expect((await scrape(jobs))[0].postedAt).toBe("2026-09-01T05:02:03.000Z");
  expect(extract(jobs)[0].postedAt).toBe("2026-09-01T05:02:03.000Z");
});

test("missing or invalid first_published remains unknown despite a valid edit or creation timestamp", async () => {
  for (const first_published of [undefined, null, "", "not-a-date", true, 1, [], ["2026-10-01T00:00:00Z"], {},
    "2026-02-30T00:00:00Z", "2026-10-01T24:00:00Z", "2026-10-01", "1"]) {
    const jobs = [posting({ first_published, created_at: "2026-10-07T00:00:00Z" })];
    expect((await scrape(jobs))[0].postedAt).toBeNull();
    expect(extract(jobs)[0].postedAt).toBeNull();
  }
});

test("absence of prospect identity preserves the supplied source item without certifying vacancy", async () => {
  const jobs = [posting({ internal_job_id: undefined, first_published: "2026-10-01T00:00:00Z" })];
  expect((await scrape(jobs))).toHaveLength(1);
  expect(extract(jobs)).toHaveLength(1);
});

test("explicit Greenhouse prospect posts are not openings even with a role-looking title and date", async () => {
  const jobs = [posting({ internal_job_id: null, first_published: "2026-10-01T00:00:00Z" }),
    posting({ id: 3, internal_job_id: 4, title: "Kept vacancy", absolute_url: "https://job-boards.greenhouse.io/fixture/jobs/3" })];
  expect((await scrape(jobs)).map(row => row.title)).toEqual(["Kept vacancy"]);
  expect(extract(jobs).map(row => row.title)).toEqual(["Kept vacancy"]);
});
