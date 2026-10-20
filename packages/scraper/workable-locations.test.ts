import { afterEach, beforeEach, expect, spyOn, test } from "bun:test";
import { fetchATSFeed } from "./ats";
import { geoGate } from "./geoGate";
import { decideTriage } from "./triage-decision";
import { assessPostingFreshness } from "./publication-freshness";
import retained from "./fixtures/workable-locations-2026-10-20.json";

const actualCrew = retained.sources.find(s => s.sourceId === "workable:crewbloom")!.jobs;
const actual5902 = actualCrew.filter(row => row.shortcode === "5902EBE6B1");
const originalFetch = globalThis.fetch;
let records: any[] = [], logs: ReturnType<typeof spyOn>;
beforeEach(() => {
  records = [];
  logs = spyOn(console, "log").mockImplementation(() => {});
  globalThis.fetch = (async input => {
    if (!String(input).startsWith("https://apply.workable.com/api/v1/widget/accounts/")) throw new Error("Only synthetic widget transport allowed");
    return Response.json({ jobs: records });
  }) as typeof fetch;
});
afterEach(() => { globalThis.fetch = originalFetch; logs.mockRestore(); });
async function parse(rows: any[], token = "crewbloom") { records = rows; return fetchATSFeed("workable", token, token); }
const withField = (field: Record<string, unknown>) => ({ ...actual5902[0]!, ...field });
const canonical = (rows: Awaited<ReturnType<typeof parse>>) => [...rows].sort((a,b) => a.sourceUrl.localeCompare(b.sourceUrl));

test("actual Crew5902 location alternatives become one PH-supported opening before intake", async () => {
  const rows = await parse(actual5902);
  expect(rows).toHaveLength(1);
  expect(rows[0]!.locationRaw).toBe("India; Pakistan; Philippines");
  expect(rows[0]!.postedAt).toBe("2026-10-08T00:00:00.000Z");
  expect(geoGate(rows[0]! as any).phEligibility).toBe("eligible_verified");
});

test("all295 actual location records yield204 canonical openings with order-independent facts", async () => {
  let total = 0;
  for (const source of retained.sources) {
    const original = await parse(source.jobs, source.sourceId.slice(9));
    expect(original).toHaveLength(source.sourceId === "workable:hunt-st" ? 140 : 64);
    expect(new Set(original.map(row => row.sourceUrl)).size).toBe(original.length);
    for (const permutation of [[...source.jobs].reverse(), [...source.jobs].sort((a,b) => Number(a.country === "Philippines") - Number(b.country === "Philippines"))]) {
      expect(canonical(await parse(permutation, source.sourceId.slice(9)))).toEqual(canonical(original));
    }
    total += original.length;
  }
  expect(total).toBe(204);
});

test("PH and US alternative locations retain explicit PH through the existing geo gate", async () => {
  const [opening] = await parse([withField({ country: "United States" }), actual5902[0]]);
  expect(geoGate(opening! as any).phEligibility).toBe("eligible_verified");
  expect(opening!.locationRaw).toBe("Philippines; United States");
});

test("foreign alternatives remain visible to the existing negative geo predicate", async () => {
  const actual = actualCrew.filter(row => row.shortcode === "FA5B16F03E");
  const [opening] = await parse(actual);
  expect(geoGate(opening! as any).phEligibility).toBe("ineligible");
  expect(canonical(await parse([...actual].reverse()))).toEqual(canonical([opening!]));
});

for (const [name, overrides, reason] of [
  ["different original dates", { published_on: "2026-10-09" }, "POSTING_DATE_CONFLICT"],
  ["known and missing original date", { published_on: null }, "POSTING_DATE_CONFLICT"],
  ["remote and onsite variants", { telecommuting: false }, "REMOTE_CONFLICT"],
  ["missing remote evidence", { telecommuting: undefined }, "REMOTE_UNKNOWN"],
  ["conflicting title", { title: "A different opening" }, "IDENTITY_CONFLICT"],
  ["conflicting shortcode", { shortcode: "OTHERIDENTITY" }, "IDENTITY_CONFLICT"],
] as const) {
  test(`ambiguous ${name} is held with a machine-readable reason in either order`, async () => {
    for (const rows of [[actual5902[0], withField(overrides)], [withField(overrides), actual5902[0]]]) {
      expect(await parse(rows)).toEqual([]);
      const event = logs.mock.calls.map(args => String(args[0])).filter(line => line.startsWith('{"event":"WORKABLE_OPENINGS_NORMALIZED"')).map(line => JSON.parse(line)).at(-1);
      expect(event.holds).toEqual([{ sourceUrl: actual5902[0]!.url, reason }]);
    }
  });
}

test("missing original dates never use created_at and retain existing freshness hold", async () => {
  const [opening] = await parse([withField({ published_on: null, created_at: "2026-10-20" })]);
  expect(opening!.postedAt).toBeNull();
  expect(assessPostingFreshness(opening!.postedAt, retained.observedEnd).state).toBe("UNKNOWN");
});

test("onsite-only PH remains ineligible despite location consolidation", async () => {
  const [opening] = await parse(actual5902.map(row => ({...row,telecommuting:false})));
  expect(geoGate(opening! as any).phEligibility).toBe("ineligible");
});

test("explicit title and description residence restrictions retain shared triage veto", async () => {
  let aiCalls = 0;
  const env = {AI:{run:async()=>{aiCalls++;return {response:JSON.stringify({eligibleForFilipinos:true,eligible:true,category:"admin",tags:[]})};}}};
  for (const titleRestricted of [true,false]) {
    const [opening] = await parse(actual5902.map(row => ({...row,title:titleRestricted?`${row.title} US citizens only`:row.title})));
    const input = {...opening!,description:titleRestricted?null:"US citizens only"};
    const decision = await decideTriage(input,{geoScope:geoGate(input as any).geoScope},env);
    expect(decision.kind).toBe("ineligible");
  }
  expect(aiCalls).toBe(0);
});

test("tenant parsing does not combine facts across source identities", async () => {
  const crew = await parse(actual5902,"crewbloom"), hunt = await parse(actual5902,"hunt-st");
  expect(crew).toHaveLength(1);expect(hunt).toHaveLength(1);
  expect(crew[0]!.sourcePlatform).toBe("crewbloom");expect(hunt[0]!.sourcePlatform).toBe("hunt-st");
});
