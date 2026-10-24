import { expect, test } from "bun:test";
import { slicePublicJobs, type PublicJob } from "../src/lib/public-board";

function job(id: number, overrides: Partial<PublicJob> = {}): PublicJob {
  return {
    id, title: "Virtual Assistant", company: "Example", type: "VA",
    sourceUrl: `https://example.com/${id}`, sourcePlatform: "Workable",
    sourceId: "workable:example", tags: [], category: "admin", experienceLevel: null,
    postedAt: "2026-10-20T00:00:00Z", scrapedAt: "2026-10-20T00:00:00Z",
    geoScope: "ph_only", phEligibility: "eligible_verified", geoEvidence: null,
    description: null, clientTimezone: null, locationType: "remote", payRange: null,
    updatedAt: null, ...overrides,
  };
}

const page = { offset: 0, limit: 30 };

test("dayshift filter uses posting evidence and ignores unvalidated schedule flags", () => {
  const jobs = [
    job(1, { title: "Assistant — Day Shift" }),
    job(2, { description: "Work Australian business hours" }),
    job(3, { description: "Philippine business hours" }),
    job(4, { company: "Australian Client", clientTimezone: "AEST" }),
    job(5, { description: "Night shift", isDayshift: true, shiftCategory: "day_shift" } as Partial<PublicJob>),
    job(6, { description: "Day shift or night shift depending on assignment" }),
    job(7, { description: "No day shift required" }),
    job(8, { description: "Must work US morning shift" }),
    job(9, { description: "9 - 4 PHT" }),
    job(10, { description: "9am ooo 5pm PHT" }),
    job(11, { title: "Day shift", isDayshift: false, shiftCategory: "night_shift" } as Partial<PublicJob>),
  ];
  expect(slicePublicJobs(jobs, { ...page, shift: "day_shift" }).jobs.map((row) => row.id))
    .toEqual([11, 3, 2, 1]);
  expect(slicePublicJobs(jobs, page).total).toBe(11);
});

test("schedule filtering precedes counts and pagination and composes with existing filters", () => {
  const jobs = [
    job(1, { title: "Assistant — Day Shift", scrapedAt: "2026-10-20T01:00:00Z" }),
    job(2, { title: "Assistant — Day Shift", postedAt: "2025-01-01", scrapedAt: "2026-10-20T03:00:00Z" }),
    job(3, { title: "Assistant — Day Shift", scrapedAt: "2026-10-20T02:00:00Z" }),
    job(4, { title: "Assistant — Night Shift" }),
    job(5, { title: "Assistant — Day Shift", category: "engineering" }),
    job(6, { title: "Assistant — Day Shift", sourcePlatform: "Remotive" }),
    job(7, { title: "Assistant — Day Shift", type: "full-time" }),
    job(8, { title: "Assistant — Day Shift", geoScope: "worldwide" }),
    job(9, { title: "Accountant — Day Shift" }),
    job(10, { title: "Assistant — Day Shift", scrapedAt: "2026-10-18T00:00:00Z" }),
  ];
  const result = slicePublicJobs(jobs, {
    shift: "day_shift", category: "admin", type: "VA", platform: "Workable",
    geoScope: "ph_only", query: "assistant", fresh: "today",
    now: Date.parse("2026-10-20T04:00:00Z"), offset: 1, limit: 1,
  });
  expect(result.total).toBe(3);
  expect(result.jobs.map((row) => row.id)).toEqual([3]);
  // Existing active rows keep the serving contract; this filter adds no age gate.
  expect(slicePublicJobs([jobs[1]], { ...page, shift: "day_shift" }).total).toBe(1);
});

test("omitted, empty and unsupported schedule filters preserve existing order and pagination", () => {
  const jobs = [
    job(1, { postedAt: "2026-10-18", description: "Day shift" }),
    job(2, { postedAt: "2026-10-19", description: "Night shift" }),
    job(3, { postedAt: "2026-10-19" }),
  ];
  const original = structuredClone(jobs);
  for (const shift of [undefined, null, "", "night_shift", "day_shift<script>"]) {
    const result = slicePublicJobs(jobs, { offset: 1, limit: 1, shift });
    expect(result.total).toBe(3);
    expect(result.jobs.map((row) => row.id)).toEqual([2]);
  }
  expect(jobs).toEqual(original);
});

test("a second dayshift page counts the full matching set without leaking other schedules", () => {
  const jobs = Array.from({ length: 75 }, (_, index) => job(index + 1, {
    title: index % 2 === 0 ? "Assistant — Day Shift" : "Assistant — Night Shift",
  }));
  const first = slicePublicJobs(jobs, { shift: "day_shift", offset: 0, limit: 30 });
  const second = slicePublicJobs(jobs, { shift: "day_shift", offset: 30, limit: 30 });
  expect(first.total).toBe(38);
  expect(second.total).toBe(38);
  expect(first.jobs).toHaveLength(30);
  expect(second.jobs.map((row) => row.id)).toEqual([15, 13, 11, 9, 7, 5, 3, 1]);
  expect(new Set([...first.jobs, ...second.jobs].map((row) => row.id)).size).toBe(38);
});

test("actual retained titles distinguish explicit dayshift from Australian employer context", () => {
  const jobs = [
    job(1, { title: "AU Accountant/Bookkeeper - Day Shift (026-983)", postedAt: "2026-09-07" }),
    job(2, { title: "Australian Mortgage Loan Processor and Broker Support (018-695)" }),
    job(3, { title: "Senior Accountant (Australian Tax) - CG (026-1243)" }),
    job(4, { title: "Senior Accountant - Australian Accounting (008-01389)" }),
  ];
  expect(slicePublicJobs(jobs, { ...page, shift: "day_shift" }).jobs.map((row) => row.id)).toEqual([1]);
});

test("description-only evidence becomes unknown when the snapshot omits it", () => {
  const titleEvidence = job(1, { title: "Day Shift Assistant" });
  const descriptionEvidence = job(2, { description: "Australian business hours" });
  expect(slicePublicJobs([titleEvidence, descriptionEvidence], { ...page, shift: "day_shift" }).total).toBe(2);
  expect(slicePublicJobs([titleEvidence, { ...descriptionEvidence, description: null }], {
    ...page, shift: "day_shift",
  }).jobs.map((row) => row.id)).toEqual([1]);
});
