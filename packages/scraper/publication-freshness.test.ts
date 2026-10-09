import { describe, expect, test } from "bun:test";
import { assessPostingFreshness } from "./publication-freshness";

const NOW = "2026-10-09T12:00:00.000Z";
const WINDOW = 30 * 86_400_000;

describe("accepted original posting freshness", () => {
  for (const value of [null, undefined, "", "   "]) {
    test(`retains missing original date ${JSON.stringify(value)} as unknown`, () => {
      expect(assessPostingFreshness(value, NOW)).toEqual({ state: "UNKNOWN", postedAt: null });
    });
  }
  for (const value of [
    0, true, {}, new Date(NOW), "2026-10-09", "October 9, 2026", "2026-10-09T12:00:00",
    "2026-02-29T12:00:00Z", "2026-02-31T12:00:00Z", "2026-04-31T12:00:00Z",
    "2026-13-09T12:00:00Z", "2026-10-09T24:00:00Z", "2026-10-09T12:00:60Z",
    "2026-10-09T12:00:00+24:00", " 2026-10-09T12:00:00Z",
  ]) {
    test(`rejects invalid or ambiguous original date ${JSON.stringify(value)}`, () => {
      expect(assessPostingFreshness(value, NOW)).toEqual({ state: "INVALID", postedAt: null });
    });
  }
  for (const value of ["2026-10-09T12:00:00Z", "2026-10-09T20:00:00+08:00", "2026-10-09T07:00:00-05:00"]) {
    test(`normalizes a valid stated instant ${value} without substituting another clock`, () => {
      expect(assessPostingFreshness(value, NOW)).toEqual({ state: "WITHIN_WINDOW", postedAt: NOW });
    });
  }
  test("accepts exactly the existing inclusive thirty-day age boundary", () => {
    const postedAt = new Date(Date.parse(NOW) - WINDOW).toISOString();
    expect(assessPostingFreshness(postedAt, NOW)).toEqual({ state: "WITHIN_WINDOW", postedAt });
  });
  test("withholds thirty days plus one millisecond without resetting the original date", () => {
    const postedAt = new Date(Date.parse(NOW) - WINDOW - 1).toISOString();
    expect(assessPostingFreshness(postedAt, NOW)).toEqual({ state: "STALE", postedAt });
  });
  test("withholds a posting one millisecond in the future", () => {
    const postedAt = new Date(Date.parse(NOW) + 1).toISOString();
    expect(assessPostingFreshness(postedAt, NOW)).toEqual({ state: "FUTURE", postedAt });
  });
  test("retains a valid leap-day timestamp as stale rather than repairing its calendar", () => {
    const postedAt = "2024-02-29T12:00:00.000Z";
    expect(assessPostingFreshness(postedAt, NOW)).toEqual({ state: "STALE", postedAt });
  });
  test("accepts the existing source ISO fractional precision and preserves its normalized instant", () => {
    expect(assessPostingFreshness("2026-10-08T12:00:00.123456789Z", NOW))
      .toEqual({ state: "WITHIN_WINDOW", postedAt: "2026-10-08T12:00:00.123Z" });
  });
  for (const [postedAt, observedAt] of [
    ["2026-10-09T12:00:00.000000001Z", NOW],
    ["2026-10-09T12:00:00.123000001Z", "2026-10-09T12:00:00.123Z"],
    ["2026-10-09T20:00:00.000000001+08:00", NOW],
  ]) {
    test(`withholds a supported sub-millisecond future instant ${postedAt}`, () => {
      expect(assessPostingFreshness(postedAt, observedAt).state).toBe("FUTURE");
    });
  }
  test("accepts a nanosecond inside the lower inclusive boundary", () => {
    const postedAt = "2026-09-09T12:00:00.000000001Z";
    expect(assessPostingFreshness(postedAt, NOW)).toEqual({ state: "WITHIN_WINDOW", postedAt: "2026-09-09T12:00:00.000Z" });
  });
  for (const clock of ["", "2026-02-31T12:00:00.000Z", "2026-10-09T12:00:00Z"]) {
    test(`fails closed on invalid evaluation instant ${JSON.stringify(clock)}`, () => {
      expect(assessPostingFreshness(NOW, clock)).toEqual({ state: "INVALID", postedAt: null });
    });
  }
});
