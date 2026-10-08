import { describe, expect, test } from "bun:test";
import { opportunities, type NewOpportunity } from "@va-hub/db";
import { getTableColumns, sql } from "drizzle-orm";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";
import { publicationRetryKey, snapshotPublicationInserts, snapshotPublicationUpdate } from "../src/lib/publication-retry-key";

const REQUEST = { sourceId: "remotive", tickKey: "scrape:2026-10-09T00:00:00.000Z", action: "insert" as const, proposedCount: 1 };
const ROW: NewOpportunity = { title: "VA", sourceUrl: "https://example.test/jobs/1", sourcePlatform: "Test", sourceId: "remotive", contentHash: "hash" };
const key = (material: unknown) => publicationRetryKey({ ...REQUEST, material });

describe("complete publication retry identity", () => {
  test("equivalent object order is stable; array order and exact strings differ", async () => {
    const first = await key({ title: "VA", tags: ["a", "b"], nested: { b: null, a: true } });
    expect(first).toMatch(/^publication-retry-v1:[a-f0-9]{64}$/);
    expect(await key({ nested: { a: true, b: null }, tags: ["a", "b"], title: "VA" })).toBe(first);
    expect(await key({ title: "VA", tags: ["b", "a"], nested: { b: null, a: true } })).not.toBe(first);
    expect(await key({ title: "VA ", tags: ["a", "b"], nested: { b: null, a: true } })).not.toBe(first);
  });

  test("source, tick, action, count and target ID are independently bound", async () => {
    const request = { ...REQUEST, material: { id: 5, patch: { isActive: true } } };
    const first = await publicationRetryKey(request);
    for (const change of [{ sourceId: "remote-ok" }, { tickKey: `${REQUEST.tickKey}:other` },
      { action: "scrape-drain" as const }, { proposedCount: 2 }, { material: { id: 6, patch: { isActive: true } } }]) {
      expect(await publicationRetryKey({ ...request, ...change })).not.toBe(first);
    }
  });

  test("runtime source/tick values are not coerced and a supplied version cannot override the envelope", async () => {
    const request = { ...REQUEST, material: { id: 1 } };
    await expect(publicationRetryKey({ ...request, sourceId: 42 } as any)).rejects.toThrow("valid source");
    await expect(publicationRetryKey({ ...request, tickKey: 42 } as any)).rejects.toThrow("valid source");
    expect(await publicationRetryKey({ ...request, version: 2 } as any)).toBe(await publicationRetryKey(request));
  });

  test("rejects coercions, cycles, sparse arrays, accessors, SQL objects and symbol keys", async () => {
    const cycle: any = {}; cycle.self = cycle;
    const hidden = Object.defineProperty({}, "title", { value: "hidden" });
    const accessor = Object.defineProperty({}, "title", { enumerable: true, get() { throw new Error("must not invoke getter"); } });
    for (const invalid of [undefined, Number.NaN, Infinity, 1n, () => 1, Symbol("x"), { missing: undefined },
      new Date(), cycle, [,"hole"], { [Symbol("x")]: "value" }, accessor, hidden, sql`CURRENT_TIMESTAMP`]) {
      await expect(key(invalid)).rejects.toThrow("publication retry");
    }
  });

  test("all current schema columns participate without a curated field subset", async () => {
    const first = await key(snapshotPublicationInserts([ROW]).material);
    for (const column of Object.keys(getTableColumns(opportunities))) {
      const original = (ROW as Record<string, unknown>)[column];
      const changed = { ...ROW, [column]: original === "changed" ? "different" : "changed" } as NewOpportunity;
      expect(await key(snapshotPublicationInserts([changed]).material)).not.toBe(first);
    }
  });

  test("explicit defaults preserve omitted/undefined semantics and distinguish NULL", async () => {
    const absent = snapshotPublicationInserts([ROW]);
    const omitted = snapshotPublicationInserts([{ ...ROW, company: undefined }]);
    expect(await key(omitted.material)).toBe(await key(absent.material));
    expect(await key(snapshotPublicationInserts([{ ...ROW, company: null }]).material)).not.toBe(await key(absent.material));
    expect(Object.hasOwn(omitted.rows[0], "company")).toBe(false);
    expect(() => snapshotPublicationInserts([{ ...ROW, rogue: "ignored" } as NewOpportunity])).toThrow("unknown column");
    expect(() => snapshotPublicationInserts([{ ...ROW, description: sql`CURRENT_TIMESTAMP` } as unknown as NewOpportunity])).toThrow("plain objects");
  });

  test("persistence snapshot is detached from later original row/tag mutations", async () => {
    const original = { ...ROW, tags: ["va"] };
    const snapshot = snapshotPublicationInserts([original]);
    const before = await key(snapshot.material);
    original.title = "Changed";
    original.tags.push("mutated");
    expect(snapshot.rows[0].title).toBe("VA");
    expect(snapshot.rows[0].tags).toEqual(["va"]);
    expect(Object.isFrozen(snapshot.rows[0])).toBe(true);
    expect(Object.isFrozen(snapshot.rows[0].tags)).toBe(true);
    expect(await key(snapshot.material)).toBe(before);
  });

  test("known CASE is copied by SQLite semantics without mutable SQL aliasing", async () => {
    const expression = sql`CASE WHEN ${opportunities.geoScope} = 'ph_only' THEN 'eligible_verified' ELSE 'eligible_likely' END`;
    const snapshot = snapshotPublicationUpdate({ isActive: true, phEligibility: expression });
    const dialect = new SQLiteSyncDialect();
    const before = dialect.sqlToQuery(snapshot.patch.phEligibility);
    const beforeKey = await key(snapshot.material);
    expression.append(sql` || 'changed'`);
    expect(dialect.sqlToQuery(snapshot.patch.phEligibility)).toEqual(before);
    expect(await key(snapshot.material)).toBe(beforeKey);
    expect(await key(snapshotPublicationUpdate({ isActive: true, phEligibility: expression }).material)).not.toBe(beforeKey);
    expect(() => snapshotPublicationUpdate({ phEligibility: sql`CASE WHEN ${opportunities.geoScope} = ${"ph_only"} THEN 'eligible_verified' END` }))
      .toThrow("does not support parameterized update SQL");
  });
});
