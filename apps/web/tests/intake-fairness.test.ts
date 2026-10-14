import { expect, test } from "bun:test";
import { assessPostingFreshness, classifyShift, geoGate } from "@va-hub/scraper";
import {
  buildSourceIdsByUrl,
  mergeSourceIdsByUrl,
  selectIntakeBatch,
  sourceIdsForUrls,
} from "../src/lib/conditional-state";
import { atsFetchCadenceSkip, omitKnownSourceUrls } from "../src/pages/api/cron/scrape";
import { selectWorkableRotation, WORKABLE_MIN_INTERVAL_MS } from "../src/lib/workable-rotation";

const OBSERVED = "2026-10-14T13:55:12.532Z";

test("a full RSS head does not consume the intake cap ahead of a fresh PH ATS opening", () => {
  const rss = Array.from({ length: 50 }, (_, index) => ({
    sourceId: "we-work-remotely",
    sourceUrl: `https://weworkremotely.com/jobs/${index}`,
  }));
  const hunt = {
    sourceId: "workable:hunt-st",
    sourceUrl: "https://apply.workable.com/j/BOOKKEEPER-025-1379",
    title: "Bookkeeper (025-1379)",
  };
  const coconut = {
    sourceId: "workable:coconutva",
    sourceUrl: "https://apply.workable.com/j/RECRUITER-1791837787287",
    title: "Recruiter",
  };
  const headOfLine = [...rss, hunt, coconut].slice(0, 50);
  expect(headOfLine.some((item) => item.sourceId === "workable:hunt-st")).toBe(false);

  const intake = selectIntakeBatch([...rss, hunt, coconut], 50);
  expect(intake.selected).toHaveLength(50);
  expect(intake.selected.some((item) => item.sourceUrl === hunt.sourceUrl)).toBe(true);
  expect(intake.selected.some((item) => item.sourceUrl === coconut.sourceUrl)).toBe(true);
  expect(intake.selected.length + intake.deferred.length).toBe(52);
  expect(intake.deferred.every((item) => item.sourceId === "we-work-remotely")).toBe(true);
  expect(new Set([...intake.selected, ...intake.deferred]).size).toBe(52);
});

test("deferred ATS urls are attributed to their source so overflow is visible", () => {
  const sourceIdsByUrl = buildSourceIdsByUrl([
    { sourceId: "we-work-remotely", items: [{ sourceUrl: "https://weworkremotely.com/jobs/1" }] },
  ]);
  mergeSourceIdsByUrl(sourceIdsByUrl, buildSourceIdsByUrl([
    { sourceId: "workable:hunt-st", items: [{ sourceUrl: "https://apply.workable.com/j/BOOKKEEPER-025-1379" }] },
  ]));
  const deferred = sourceIdsForUrls(["https://apply.workable.com/j/BOOKKEEPER-025-1379"], sourceIdsByUrl);
  expect(deferred).toEqual(new Set(["workable:hunt-st"]));
});

test("a stored URL stays out of intake and a new URL stays in", () => {
  const known = new Set(["https://apply.workable.com/j/ALREADY"]);
  const kept = omitKnownSourceUrls([
    { sourceId: "workable:hunt-st", sourceUrl: "https://apply.workable.com/j/ALREADY" },
    { sourceId: "workable:hunt-st", sourceUrl: "https://apply.workable.com/j/BOOKKEEPER-025-1379" },
    { sourceId: "workable:hunt-st", sourceUrl: "" },
  ], known);
  expect(kept.map((item) => item.sourceUrl)).toEqual(["https://apply.workable.com/j/BOOKKEEPER-025-1379"]);
});

test("employer confidence does not publish a US, onsite, or stale opening", () => {
  const phRemote = geoGate({
    title: "Bookkeeper (025-1379)",
    description: null,
    locationRaw: "Philippines",
    locationType: "remote",
  });
  const usRemote = geoGate({
    title: "Business Virtual Assistant",
    description: null,
    locationRaw: "United States",
    locationType: "remote",
  });
  const phOnsite = geoGate({
    title: "Accounting Manager (028-1177)",
    description: null,
    locationRaw: "Philippines (onsite)",
    locationType: "remote",
  });
  const dayShiftPh = geoGate({
    title: "AU Accountant/Bookkeeper - Day Shift (026-983)",
    description: null,
    locationRaw: "Philippines",
    locationType: "remote",
  });
  const dayShiftUs = geoGate({
    title: "AU Accountant/Bookkeeper - Day Shift (026-983)",
    description: null,
    locationRaw: "United States",
    locationType: "remote",
  });
  expect(phRemote.phEligibility).toBe("eligible_verified");
  expect(phRemote.geoScope).toBe("ph_only");
  expect(usRemote.phEligibility).toBe("ineligible");
  expect(phOnsite.phEligibility).toBe("ineligible");
  expect(dayShiftPh.phEligibility).toBe("eligible_verified");
  expect(dayShiftUs.phEligibility).toBe("ineligible");
  expect(classifyShift({ title: "AU Accountant/Bookkeeper - Day Shift (026-983)" }).category).toBe("day_shift");
  expect(classifyShift({ title: "Bookkeeper (025-1379)" }).category).toBe("unknown");
  expect(assessPostingFreshness("2026-10-12T00:00:00.000Z", OBSERVED).state).toBe("WITHIN_WINDOW");
  expect(assessPostingFreshness("2020-01-14T00:00:00.000Z", OBSERVED).state).toBe("STALE");
});

test("Workable cooldown is the rotation clock, and other ATS boards keep the second clock", () => {
  const now = "2026-10-14T12:00:00.000Z";
  const recent = "2026-10-14T11:30:00.000Z";
  const rotation = selectWorkableRotation({
    agencies: [{ companyName: "Hunt St", atsPlatform: "workable", atsToken: "hunt-st" }],
    sourceKey: (agency) => `workable:${agency.atsToken}`,
    isPolicyEnabled: () => true,
    states: new Map([["workable:hunt-st", { lastAttemptAt: recent }]]),
    statesAvailable: true,
    observedAt: now,
  });
  expect(rotation.selected).toHaveLength(0);
  expect(rotation.diagnostics[0]?.reason).toBe("COOLDOWN");
  expect(atsFetchCadenceSkip("workable", recent, now, WORKABLE_MIN_INTERVAL_MS)).toBeNull();
  expect(atsFetchCadenceSkip("breezy", recent, now, WORKABLE_MIN_INTERVAL_MS)).toBe(
    "Cadence guard: last fetched 2026-10-14T11:30:00.000Z; 60-min minimum.",
  );
  expect(atsFetchCadenceSkip("breezy", "2026-10-14T10:00:00.000Z", now, WORKABLE_MIN_INTERVAL_MS)).toBeNull();
});
