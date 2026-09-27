import { describe, expect, test } from "bun:test";
import { retryAfterInstant } from "./shadow-host-backoff";

const NOW = "2026-09-27T12:00:00.000Z";

describe("Retry-After scheduling", () => {
  test("accepts delay-seconds without shortening a server's long hold", () => {
    expect(retryAfterInstant("172800", NOW)).toBe("2026-09-29T12:00:00.000Z");
    expect(retryAfterInstant("0", NOW)).toBe(NOW);
  });
  test("accepts HTTP-date and clamps a past date to response receipt", () => {
    expect(retryAfterInstant("Tue, 29 Sep 2026 12:00:00 GMT", NOW)).toBe("2026-09-29T12:00:00.000Z");
    expect(retryAfterInstant("Sun, 06 Nov 1994 08:49:37 GMT", NOW)).toBe(NOW);
    expect(retryAfterInstant("Sunday, 06-Nov-94 08:49:37 GMT", NOW)).toBe(NOW);
    expect(retryAfterInstant("Sun Nov  6 08:49:37 1994", NOW)).toBe(NOW);
  });
  test.each([null, "", "-1", "1.5", "10 seconds", "Infinity", "999999999999999999999999999", "2026-09-29"])("rejects malformed or unrepresentable value %s", value => {
    expect(retryAfterInstant(value, NOW)).toBeNull();
  });
});
