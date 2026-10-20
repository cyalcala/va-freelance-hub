import { expect, test } from "bun:test";
import { selectWorkableRotation } from "../src/lib/workable-rotation";

const NOW = "2026-10-12T05:00:00.000Z";
const EPOCH = "1970-01-01T00:00:00.000Z";
type Agency = { id: number; companyName: string; atsPlatform: string | null; atsToken: string | null; verifiedAt: string | null };
const agency = (token: string, id = -1, verifiedAt: string | null = EPOCH): Agency => ({
  id, companyName: token, atsPlatform: "workable", atsToken: token, verifiedAt,
});
const key = (row: Agency) => `${row.atsPlatform}:${row.atsToken}`;
function select(rows: readonly Agency[], states: ReadonlyMap<string, { lastAttemptAt: unknown }> = new Map(),
  options: { observedAt?: unknown; disabled?: ReadonlySet<string>; statesAvailable?: boolean } = {}) {
  return selectWorkableRotation({ agencies: rows, states, sourceKey: key,
    isPolicyEnabled: row => !options.disabled?.has(key(row)),
    observedAt: options.observedAt === undefined ? NOW : options.observedAt,
    statesAvailable: options.statesAvailable ?? true });
}
const selectedIds = (result: ReturnType<typeof select>) => [...result.selectedSourceIds];

test("disabled oldest directory tenants do not consume the two admitted Workable slots", () => {
  const denied = [agency("myoutdesk", 1, null), agency("virtualstaff365", 2, null)];
  const canaries = ["agency-a", "agency-b", "agency-c", "agency-d", "agency-e", "agency-f", "agency-g"]
    .map((token, index) => agency(token, -index - 1));
  const result = select([...denied, ...canaries], new Map(), { disabled: new Set(denied.map(key)) });
  expect(selectedIds(result)).toEqual(["workable:agency-a", "workable:agency-b"]);
  expect(result.diagnostics.filter(row => row.reason === "POLICY_DISABLED").map(row => row.sourceId).sort())
    .toEqual(["workable:myoutdesk", "workable:virtualstaff365"]);
});

test("canonical duplicates consume one slot and preserve a deterministic representative", () => {
  const first = { ...agency("a", 10), companyName: "A primary" };
  const duplicate = { ...agency("a", -20), companyName: "Z duplicate" };
  const result = select([duplicate, agency("b"), first, agency("c")]);
  expect(selectedIds(result)).toEqual(["workable:a", "workable:b"]);
  expect(result.selected[0]).toBe(first);
  expect(result.diagnostics.find(row => row.reason === "DUPLICATE_SOURCE")?.agency).toBe(duplicate);
  expect(result.diagnostics.find(row => row.reason === "ROTATION_DEFERRED")?.sourceId).toBe("workable:c");
});

test("cooling tenants are removed before the two-slot rotation cap", () => {
  const result = select([agency("a"), agency("b"), agency("c"), agency("d")], new Map([
    ["workable:a", { lastAttemptAt: "2026-10-12T04:59:00.000Z" }],
    ["workable:b", { lastAttemptAt: "2026-10-12T04:30:00.000Z" }],
  ]));
  expect(selectedIds(result)).toEqual(["workable:c", "workable:d"]);
  expect(result.diagnostics.filter(row => row.reason === "COOLDOWN")).toHaveLength(2);
  expect(result.diagnostics.find(row => row.sourceId === "workable:a")?.nextAllowedAt).toBe("2026-10-12T05:59:00.000Z");
});

test("negative-ID registry tenants rotate from durable attempts even after the first pair becomes due", () => {
  const rows = ["a", "b", "c", "d", "e", "f", "g"].map((token, index) => agency(token, -index - 1));
  const states = new Map<string, { lastAttemptAt: unknown }>();
  const first = select(rows, states);
  expect(selectedIds(first)).toEqual(["workable:a", "workable:b"]);
  for (const id of first.selectedSourceIds) states.set(id, { lastAttemptAt: NOW });
  const second = select(rows, states, { observedAt: "2026-10-12T06:00:00.000Z" });
  expect(selectedIds(second)).toEqual(["workable:c", "workable:d"]);
  for (const id of second.selectedSourceIds) states.set(id, { lastAttemptAt: "2026-10-12T06:00:00.000Z" });
  expect(selectedIds(select(rows, states, { observedAt: "2026-10-12T07:00:00.000Z" })))
    .toEqual(["workable:e", "workable:f"]);
  expect(rows.every(row => row.verifiedAt === EPOCH && row.id < 0)).toBe(true);
});

test("oldest durable attempts outrank directory verifiedAt and numeric IDs", () => {
  const result = select([agency("a", 1, EPOCH), agency("b", -2, "2026-10-12T04:59:00.000Z"), agency("c", -3)], new Map([
    ["workable:a", { lastAttemptAt: "2026-10-12T03:00:00.000Z" }],
    ["workable:b", { lastAttemptAt: "2026-10-12T01:00:00.000Z" }],
    ["workable:c", { lastAttemptAt: "2026-10-12T02:00:00.000Z" }],
  ]));
  expect(selectedIds(result)).toEqual(["workable:b", "workable:c"]);
});

test("exactly sixty minutes is due while one millisecond short stays cooling", () => {
  const result = select([agency("a"), agency("b"), agency("c")], new Map([
    ["workable:a", { lastAttemptAt: "2026-10-12T04:00:00.000Z" }],
    ["workable:b", { lastAttemptAt: "2026-10-12T04:00:00.001Z" }],
    ["workable:c", { lastAttemptAt: "2026-10-12T03:59:59.999Z" }],
  ]));
  expect(selectedIds(result)).toEqual(["workable:c", "workable:a"]);
  expect(result.diagnostics.find(row => row.sourceId === "workable:b")?.reason).toBe("COOLDOWN");
});

for (const timestamp of [null, undefined, "", "garbage", 0, "2026-02-30T04:00:00.000Z", "2026-10-12T04:00:00"]) {
  test(`existing unknown or invalid attempt ${JSON.stringify(timestamp)} is withheld rather than treated as never fetched`, () => {
    const result = select([agency("a"), agency("b"), agency("c")], new Map([["workable:a", { lastAttemptAt: timestamp }]]));
    expect(selectedIds(result)).toEqual(["workable:b", "workable:c"]);
    expect(result.diagnostics.find(row => row.sourceId === "workable:a")?.reason).toBe("INVALID_ATTEMPT_TIME");
  });
}

test("a future durable attempt fails closed with a distinct clock diagnostic", () => {
  const result = select([agency("a"), agency("b"), agency("c")], new Map([
    ["workable:a", { lastAttemptAt: "2026-10-12T05:00:00.001Z" }],
  ]));
  expect(selectedIds(result)).toEqual(["workable:b", "workable:c"]);
  expect(result.diagnostics.find(row => row.sourceId === "workable:a")?.reason).toBe("FUTURE_ATTEMPT_TIME");
});

for (const clock of [null, "", "invalid", "2026-02-30T05:00:00.000Z", "2026-10-12T05:00:00", 123]) {
  test(`invalid observed clock ${JSON.stringify(clock)} stops selection before policy callbacks`, () => {
    let callbacks = 0;
    const result = selectWorkableRotation({ agencies: [agency("a")], states: new Map(), statesAvailable: true,
      sourceKey: () => { callbacks++; return "workable:a"; }, isPolicyEnabled: () => { callbacks++; return true; }, observedAt: clock });
    expect(result.selected).toEqual([]);
    expect(result.unavailableReason).toBe("INVALID_OBSERVED_AT");
    expect(result.diagnostics[0]?.reason).toBe("INVALID_OBSERVED_AT");
    expect(callbacks).toBe(0);
  });
}

test("unavailable durable state is not an empty never-fetched snapshot", () => {
  const result = select([agency("a"), agency("b")], new Map(), { statesAvailable: false });
  expect(result.selected).toEqual([]);
  expect(result.unavailableReason).toBe("STATE_UNAVAILABLE");
  expect(result.diagnostics.every(row => row.reason === "STATE_UNAVAILABLE")).toBe(true);
});

test("policy/source-key callback failures stay diagnostic and cannot consume slots", () => {
  const result = selectWorkableRotation({ agencies: [agency("a"), agency("b"), agency("c"), agency("d")],
    states: new Map(), statesAvailable: true, observedAt: NOW,
    sourceKey: row => { if (row.atsToken === "a") throw new Error("private identity failure"); return key(row); },
    isPolicyEnabled: row => { if (row.atsToken === "b") throw new Error("private policy failure"); return true; } });
  expect([...result.selectedSourceIds]).toEqual(["workable:c", "workable:d"]);
  expect(result.diagnostics.map(row => row.reason).sort()).toEqual(["INVALID_SOURCE_ID", "POLICY_UNAVAILABLE"]);
  expect(JSON.stringify(result.diagnostics)).not.toContain("private");
});

test("non-Workable tenants are untouched and ties are deterministic without mutating inputs", () => {
  const other = { ...agency("other"), atsPlatform: "greenhouse" };
  const rows = Object.freeze([Object.freeze(agency("c")), Object.freeze(other), Object.freeze(agency("a")), Object.freeze(agency("b"))]);
  const before = JSON.stringify(rows);
  const states = new Map<string, { lastAttemptAt: unknown }>();
  let callbacks = 0;
  const result = selectWorkableRotation({ agencies: rows, states, statesAvailable: true, observedAt: NOW,
    sourceKey: row => { expect(row.atsPlatform).toBe("workable"); callbacks++; return key(row); },
    isPolicyEnabled: row => { expect(row.atsPlatform).toBe("workable"); return true; } });
  expect([...result.selectedSourceIds]).toEqual(["workable:a", "workable:b"]);
  expect(selectedIds(select([...rows].reverse()))).toEqual(["workable:a", "workable:b"]);
  expect(callbacks).toBe(3);
  expect(JSON.stringify(rows)).toBe(before);
  expect(states.size).toBe(0);
  expect(result.diagnostics.every(row => row.agency.atsPlatform === "workable")).toBe(true);
});

test("UTC timestamps without fractional seconds retain the same sixty-minute boundary", () => {
  const result = select([agency("a")], new Map([["workable:a", { lastAttemptAt: "2026-10-12T04:00:00Z" }]]),
    { observedAt: "2026-10-12T05:00:00Z" });
  expect(selectedIds(result)).toEqual(["workable:a"]);
});
