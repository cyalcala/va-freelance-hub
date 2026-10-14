import { expect, test } from "bun:test";
import { selectIntakeBatch } from "../src/lib/conditional-state";
import { atsFetchCadenceSkip } from "../src/pages/api/cron/scrape";
import {
  selectWorkableRotation,
  WORKABLE_MIN_INTERVAL_MS,
  WORKABLE_ROTATION_LIMIT,
} from "../src/lib/workable-rotation";

const OBSERVED = "2026-10-14T15:17:16.699Z";
/** Admitted Workable tenants. Slot order is the selector's, not an allowlist of jobs. */
const ADMITTED = ["coconutva", "crewbloom", "pearltalent", "rocketams", "hunt-st", "hello-rache", "pineapple-staffing"] as const;

type Agency = { companyName: string; atsPlatform: "workable"; atsToken: string };
const agency = (token: string): Agency => ({ companyName: token, atsPlatform: "workable", atsToken: token });
const sourceKey = (row: Agency) => `${row.atsPlatform}:${row.atsToken}`;

function rotate(states: ReadonlyMap<string, { lastAttemptAt: unknown }>) {
  return selectWorkableRotation({
    agencies: ADMITTED.map(agency),
    sourceKey,
    isPolicyEnabled: () => true,
    states,
    statesAvailable: true,
    observedAt: OBSERVED,
  });
}

function rows(sourceId: string, count: number) {
  return Array.from({ length: count }, (_, index) => ({
    sourceId,
    sourceUrl: `https://apply.workable.com/${sourceId}/${index}`,
  }));
}

function rss(generation: string) {
  return Array.from({ length: 50 }, (_, index) => ({
    sourceId: "we-work-remotely",
    sourceUrl: `https://weworkremotely.com/${generation}/${index}`,
  }));
}

/**
 * scrape.ts does not fetch a Workable tenant absent from selectedSourceIds.
 * Items kept here are the only items that can reach selectIntakeBatch.
 */
function fetchedOnly<T extends { sourceId: string }>(
  selectedSourceIds: ReadonlySet<string>,
  items: readonly T[],
): T[] {
  return items.filter((item) => !item.sourceId.startsWith("workable:") || selectedSourceIds.has(item.sourceId));
}

test("a tenant outside the two slots never enters intake, including Hunt when nothing has been attempted", () => {
  expect(WORKABLE_ROTATION_LIMIT).toBe(2);
  const rotation = rotate(new Map());
  expect([...rotation.selectedSourceIds].sort()).toEqual(["workable:coconutva", "workable:crewbloom"]);
  expect(rotation.diagnostics.find((row) => row.sourceId === "workable:hunt-st")?.reason).toBe("ROTATION_DEFERRED");
  expect(rotation.diagnostics.filter((row) => row.reason === "ROTATION_DEFERRED")).toHaveLength(ADMITTED.length - WORKABLE_ROTATION_LIMIT);

  const hunt = rows("workable:hunt-st", 28);
  const coconut = rows("workable:coconutva", 7);
  const fetched = fetchedOnly(rotation.selectedSourceIds, [
    ...rss("never-attempted"),
    ...hunt,
    ...coconut,
    ...rows("workable:crewbloom", 1),
    ...rows("workable:pearltalent", 3),
  ]);
  expect(fetched.some((item) => item.sourceId === "workable:hunt-st")).toBe(false);
  expect(fetched.some((item) => item.sourceId === "workable:pearltalent")).toBe(false);

  const intake = selectIntakeBatch(fetched, 50);
  const seen = new Set([...intake.selected, ...intake.deferred].map((item) => item.sourceUrl));
  expect(hunt.every((item) => !seen.has(item.sourceUrl))).toBe(true);
  expect(intake.selected.filter((item) => item.sourceId === "workable:coconutva")).toHaveLength(coconut.length);
  expect(intake.deferred.some((item) => item.sourceId === "workable:coconutva")).toBe(false);
  expect(atsFetchCadenceSkip("workable", "2026-10-14T14:17:16.699Z", OBSERVED, WORKABLE_MIN_INTERVAL_MS)).toBeNull();
});

test("Hunt cooldown is fetch starvation because the Workable cadence clock no longer applies", () => {
  const huntAttempt = new Date(Date.parse(OBSERVED) - 30 * 60_000).toISOString();
  const rotation = rotate(new Map([["workable:hunt-st", { lastAttemptAt: huntAttempt }]]));
  expect(rotation.diagnostics.find((row) => row.sourceId === "workable:hunt-st")?.reason).toBe("COOLDOWN");
  expect(rotation.selectedSourceIds.has("workable:hunt-st")).toBe(false);
  expect(atsFetchCadenceSkip("workable", huntAttempt, OBSERVED, WORKABLE_MIN_INTERVAL_MS)).toBeNull();

  const hunt = rows("workable:hunt-st", 28);
  const intake = selectIntakeBatch(fetchedOnly(rotation.selectedSourceIds, [...rss("cooldown"), ...hunt]), 50);
  const seen = new Set([...intake.selected, ...intake.deferred].map((item) => item.sourceUrl));
  expect(hunt.every((item) => !seen.has(item.sourceUrl))).toBe(true);
});

test("fetched Hunt urls the cap defers are admitted on the next pass, and unselected tenants still contribute none", () => {
  const observedMs = Date.parse(OBSERVED);
  const hoursAgo = (hours: number) => new Date(observedMs - hours * 60 * 60_000).toISOString();
  const states = new Map<string, { lastAttemptAt: string }>();
  for (const token of ADMITTED) states.set(`workable:${token}`, { lastAttemptAt: hoursAgo(3) });
  states.set("workable:hunt-st", { lastAttemptAt: hoursAgo(30) });
  states.set("workable:coconutva", { lastAttemptAt: hoursAgo(29) });

  const rotation = rotate(states);
  expect([...rotation.selectedSourceIds].sort()).toEqual(["workable:coconutva", "workable:hunt-st"]);
  const deferredTenants = rotation.diagnostics
    .filter((row) => row.reason === "ROTATION_DEFERRED")
    .map((row) => row.sourceId);
  expect(deferredTenants).toHaveLength(5);

  const hunt = rows("workable:hunt-st", 28);
  const coconut = rows("workable:coconutva", 7);
  const unselected = deferredTenants.flatMap((sourceId) => rows(sourceId ?? "workable:missing", 4));
  const fetched = fetchedOnly(rotation.selectedSourceIds, [...rss("selected"), ...hunt, ...coconut, ...unselected]);
  expect(fetched.some((item) => deferredTenants.includes(item.sourceId))).toBe(false);

  const first = selectIntakeBatch(fetched, 50);
  const deferredHunt = first.deferred.filter((item) => item.sourceId === "workable:hunt-st");
  expect(first.selected.some((item) => item.sourceId === "workable:hunt-st")).toBe(true);
  expect(first.selected.filter((item) => item.sourceId === "workable:coconutva")).toHaveLength(coconut.length);
  expect(first.deferred.some((item) => item.sourceId === "workable:coconutva")).toBe(false);
  expect(deferredHunt.length).toBeGreaterThan(0);
  expect(unselected.every((item) => ![...first.selected, ...first.deferred].some((seen) => seen.sourceUrl === item.sourceUrl))).toBe(true);

  const second = selectIntakeBatch([...rss("follow-up"), ...deferredHunt], 50);
  const deferredUrls = new Set(deferredHunt.map((item) => item.sourceUrl));
  expect(second.selected.filter((item) => deferredUrls.has(item.sourceUrl))).toHaveLength(deferredHunt.length);
  expect(second.deferred.every((item) => item.sourceId === "we-work-remotely")).toBe(true);
});
