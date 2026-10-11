import { describe, expect, test } from "bun:test";
import { normalizeSourcePostingDate } from "./source-posting-date";
import { assessPostingFreshness } from "./publication-freshness";

const OBSERVED_AT = "2026-10-10T12:00:00.000Z";
const MAX_POSTING_AGE_MS = 30 * 86_400_000; // 2,592,000,000 ms

describe("Adversarial Stress Test: normalizeSourcePostingDate", () => {
  describe("1. Impossible calendar rollover", () => {
    const impossibleIsoDates = [
      "2026-09-31T12:00:00.000Z", // September 31
      "2026-04-31T12:00:00.000Z", // April 31
      "2026-06-31T12:00:00.000Z", // June 31
      "2026-11-31T12:00:00.000Z", // November 31
      "2026-02-29T12:00:00.000Z", // Non-leap February 29 (2026)
      "2026-02-30T12:00:00.000Z", // February 30
      "2026-02-31T12:00:00.000Z", // February 31
      "1900-02-29T12:00:00.000Z", // 1900 is NOT a leap year (divisible by 100, not 400)
      "2100-02-29T12:00:00.000Z", // 2100 is NOT a leap year
      "2026-00-15T12:00:00.000Z", // Month 00
      "2026-13-15T12:00:00.000Z", // Month 13
      "2026-10-00T12:00:00.000Z", // Day 00
      "2026-10-32T12:00:00.000Z", // Day 32
      "2026-10-10T24:00:00.000Z", // Hour 24
      "2026-10-10T24:01:00.000Z", // Hour 24:01
      "2026-10-10T12:60:00.000Z", // Minute 60
      "2026-10-10T12:00:60.000Z", // Second 60
    ];

    for (const badIso of impossibleIsoDates) {
      test(`rejects impossible ISO date: ${badIso}`, () => {
        expect(normalizeSourcePostingDate(badIso)).toBeNull();
      });
    }

    const impossibleRssDates = [
      "Wed, 31 Sep 2026 12:00:00 GMT",
      "Sun, 29 Feb 2026 12:00:00 GMT",
      "Sun, 29 Feb 2026 12:00:00 +0000",
      "Sun, 29 Feb 2026 12:00:00 +0800",
      "Sun, 29 Feb 2026 12:00:00 +08:00",
      "31 Sep 2026 12:00:00 GMT",
      "29 Feb 2026 12:00:00 GMT",
      "31 Apr 2026 12:00:00 GMT",
      "31 Jun 2026 12:00:00 GMT",
      "31 Nov 2026 12:00:00 GMT",
      "Wed, 31 Sep 2026 12:00:00 EST",
      "Sun, 29 Feb 2026 12:00:00 PST",
    ];

    for (const badRss of impossibleRssDates) {
      test(`rejects impossible RSS date: ${badRss}`, () => {
        expect(normalizeSourcePostingDate(badRss)).toBeNull();
      });
    }

    test("accepts valid leap year February 29 (2024)", () => {
      expect(normalizeSourcePostingDate("2024-02-29T12:00:00.000Z")).toBe("2024-02-29T12:00:00.000Z");
      expect(normalizeSourcePostingDate("Thu, 29 Feb 2024 12:00:00 GMT")).toBe("2024-02-29T12:00:00.000Z");
    });

    test("accepts valid leap year February 29 (2000 - divisible by 400)", () => {
      expect(normalizeSourcePostingDate("2000-02-29T12:00:00.000Z")).toBe("2000-02-29T12:00:00.000Z");
    });
  });

  describe("2. Unparseable, garbage, and edge inputs", () => {
    for (const garbage of [
      null,
      undefined,
      "",
      "   ",
      12345678,
      {},
      [],
      "not-a-date",
      "undefined",
      "null",
      "NaN",
      "2026-10-10", // date-only without time is not ISO instant
      "2026/10/10 12:00:00",
      "October 10, 2026",
      "Sat, 10 Oct 2026",
      "Fri, 09 Oct 2026 12:00:00 +25:00", // invalid timezone offset
      "Fri, 09 Oct 2026 12:00:00 +00:60", // invalid timezone minutes
    ]) {
      test(`rejects garbage input: ${JSON.stringify(garbage)}`, () => {
        expect(normalizeSourcePostingDate(garbage)).toBeNull();
      });
    }
  });

  describe("3. Preserves high-precision sub-millisecond timestamps", () => {
    test("preserves nanosecond precision in ISO strings", () => {
      const nanoIso = "2026-10-10T12:00:00.000000001Z";
      expect(normalizeSourcePostingDate(nanoIso)).toBe(nanoIso);
    });

    test("preserves microsecond precision in ISO strings", () => {
      const microIso = "2026-10-10T12:00:00.123456Z";
      expect(normalizeSourcePostingDate(microIso)).toBe(microIso);
    });
  });
});

describe("Adversarial Stress Test: assessPostingFreshness", () => {
  describe("1. Impossible calendar dates", () => {
    for (const badDate of [
      "2026-09-31T12:00:00.000Z",
      "2026-02-29T12:00:00.000Z",
      "2026-04-31T12:00:00.000Z",
      "2026-10-10T24:00:00.000Z",
    ]) {
      test(`assessPostingFreshness returns INVALID for ${badDate}`, () => {
        const assessment = assessPostingFreshness(badDate, OBSERVED_AT);
        expect(assessment).toEqual({ state: "INVALID", postedAt: null });
      });
    }
  });

  describe("2. Sub-millisecond and nanosecond future boundaries", () => {
    test("exact same millisecond (0ms offset) is WITHIN_WINDOW", () => {
      const assessment = assessPostingFreshness(OBSERVED_AT, OBSERVED_AT);
      expect(assessment).toEqual({ state: "WITHIN_WINDOW", postedAt: OBSERVED_AT });
    });

    test("+1ms future is FUTURE", () => {
      const future1ms = "2026-10-10T12:00:00.001Z";
      const assessment = assessPostingFreshness(future1ms, OBSERVED_AT);
      expect(assessment.state).toBe("FUTURE");
    });

    test("+1ns future is FUTURE", () => {
      const future1ns = "2026-10-10T12:00:00.000000001Z";
      const assessment = assessPostingFreshness(future1ns, OBSERVED_AT);
      expect(assessment.state).toBe("FUTURE");
    });

    test("+10ns future is FUTURE", () => {
      const future10ns = "2026-10-10T12:00:00.000000010Z";
      const assessment = assessPostingFreshness(future10ns, OBSERVED_AT);
      expect(assessment.state).toBe("FUTURE");
    });

    test("+1 microsecond (1,000ns) future is FUTURE", () => {
      const future1us = "2026-10-10T12:00:00.000001Z";
      const assessment = assessPostingFreshness(future1us, OBSERVED_AT);
      expect(assessment.state).toBe("FUTURE");
    });

    test("+999 microseconds (999,000ns) future is FUTURE", () => {
      const future999us = "2026-10-10T12:00:00.000999Z";
      const assessment = assessPostingFreshness(future999us, OBSERVED_AT);
      expect(assessment.state).toBe("FUTURE");
    });

    test("future with timezone offset +08:00 (Manila) is FUTURE", () => {
      // 12:00:00.000Z in +08:00 is 20:00:00.000+08:00
      // 20:00:00.000000001+08:00 is 1ns into the future
      const futureTz1ns = "2026-10-10T20:00:00.000000001+08:00";
      const assessment = assessPostingFreshness(futureTz1ns, OBSERVED_AT);
      expect(assessment.state).toBe("FUTURE");
    });
  });

  describe("3. Exact 30-day inclusive boundary and boundary +1ms / +1ns", () => {
    const observedMs = Date.parse(OBSERVED_AT);
    const exactBoundaryMs = observedMs - MAX_POSTING_AGE_MS;
    const exactBoundaryIso = new Date(exactBoundaryMs).toISOString(); // 2026-09-10T12:00:00.000Z

    test("exact 30-day inclusive boundary is WITHIN_WINDOW", () => {
      expect(exactBoundaryIso).toBe("2026-09-10T12:00:00.000Z");
      const assessment = assessPostingFreshness(exactBoundaryIso, OBSERVED_AT);
      expect(assessment).toEqual({ state: "WITHIN_WINDOW", postedAt: exactBoundaryIso });
    });

    test("30 days minus 1ns (newer than boundary by 1ns) is WITHIN_WINDOW", () => {
      const boundaryMinus1ns = "2026-09-10T12:00:00.000000001Z";
      const assessment = assessPostingFreshness(boundaryMinus1ns, OBSERVED_AT);
      expect(assessment).toEqual({ state: "WITHIN_WINDOW", postedAt: exactBoundaryIso });
    });

    test("30 days minus 1ms (newer than boundary by 1ms) is WITHIN_WINDOW", () => {
      const boundaryMinus1ms = new Date(exactBoundaryMs + 1).toISOString();
      const assessment = assessPostingFreshness(boundaryMinus1ms, OBSERVED_AT);
      expect(assessment).toEqual({ state: "WITHIN_WINDOW", postedAt: boundaryMinus1ms });
    });

    test("30 days plus 1ms (older than boundary by 1ms) is STALE", () => {
      const boundaryPlus1ms = new Date(exactBoundaryMs - 1).toISOString(); // 2026-09-10T11:59:59.999Z
      expect(boundaryPlus1ms).toBe("2026-09-10T11:59:59.999Z");
      const assessment = assessPostingFreshness(boundaryPlus1ms, OBSERVED_AT);
      expect(assessment.state).toBe("STALE");
      expect(assessment.postedAt).toBe(boundaryPlus1ms);
    });

    test("30 days plus 1ns (older than boundary by 1ns) is STALE", () => {
      // 11:59:59.999999999Z is exactly 1ns older than 12:00:00.000Z
      const boundaryPlus1ns = "2026-09-10T11:59:59.999999999Z";
      const assessment = assessPostingFreshness(boundaryPlus1ns, OBSERVED_AT);
      expect(assessment.state).toBe("STALE");
      expect(assessment.postedAt).toBe("2026-09-10T11:59:59.999Z");
    });

    test("30 days plus 10ns (older than boundary by 10ns) is STALE", () => {
      const boundaryPlus10ns = "2026-09-10T11:59:59.999999990Z";
      const assessment = assessPostingFreshness(boundaryPlus10ns, OBSERVED_AT);
      expect(assessment.state).toBe("STALE");
    });

    test("30 days plus 500 microseconds (older by 500us) is STALE", () => {
      const boundaryPlus500us = "2026-09-10T11:59:59.999500Z";
      const assessment = assessPostingFreshness(boundaryPlus500us, OBSERVED_AT);
      expect(assessment.state).toBe("STALE");
    });

    test("31 days stale is STALE", () => {
      const stale31Days = "2026-09-09T12:00:00.000Z";
      const assessment = assessPostingFreshness(stale31Days, OBSERVED_AT);
      expect(assessment.state).toBe("STALE");
      expect(assessment.postedAt).toBe(stale31Days);
    });
  });
});
