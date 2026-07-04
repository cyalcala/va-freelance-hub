import { describe, expect, test } from "bun:test";
import { chunkArray, maxRowsPerD1Batch, D1_MAX_BOUND_PARAMETERS } from "./batch";

describe("chunkArray", () => {
  test("splits items into consecutive chunks of the given size", () => {
    expect(chunkArray([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  test("returns a single chunk when size >= length", () => {
    expect(chunkArray([1, 2, 3], 10)).toEqual([[1, 2, 3]]);
  });

  test("returns no chunks for an empty array", () => {
    expect(chunkArray([], 4)).toEqual([]);
  });

  test("preserves order and total item count", () => {
    const items = Array.from({ length: 25 }, (_, i) => i);
    const chunks = chunkArray(items, 8);
    expect(chunks.flat()).toEqual(items);
    expect(chunks.map((c) => c.length)).toEqual([8, 8, 8, 1]);
  });

  test("rejects non-positive or fractional sizes", () => {
    expect(() => chunkArray([1], 0)).toThrow();
    expect(() => chunkArray([1], -3)).toThrow();
    expect(() => chunkArray([1], 2.5)).toThrow();
  });
});

describe("maxRowsPerD1Batch", () => {
  test("keeps rows * columns within the D1 bound-parameter limit", () => {
    for (const columns of [1, 5, 12, 13, 20, 33]) {
      const rows = maxRowsPerD1Batch(columns);
      expect(rows * columns).toBeLessThanOrEqual(D1_MAX_BOUND_PARAMETERS);
      // And the next row up would exceed the limit (or rows is the floor of 1).
      if (rows > 1) {
        expect((rows + 1) * columns).toBeGreaterThan(D1_MAX_BOUND_PARAMETERS);
      }
    }
  });

  test("returns at least 1 even for very wide rows", () => {
    expect(maxRowsPerD1Batch(500)).toBe(1);
  });

  test("source_fetch_events regression: 12-column rows batch at 8 rows", () => {
    // recordSourceFetchEvents inserts 12 columns per event. A full Hunter run
    // produces ~25 source results; unchunked that is ~300 bound parameters,
    // which D1 rejects. This was the silent failure found in the 2026-07-04
    // major audit — no production fetch event was ever recorded.
    expect(maxRowsPerD1Batch(12)).toBe(8);
  });

  test("rejects invalid column counts", () => {
    expect(() => maxRowsPerD1Batch(0)).toThrow();
    expect(() => maxRowsPerD1Batch(-1)).toThrow();
  });
});
