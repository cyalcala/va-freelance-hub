import { describe, expect, test } from "bun:test";
import { decideFailoverTakeover, DEFAULT_STALE_AFTER_MINUTES } from "./failover-clock";

const now = "2026-09-02T04:00:00.000Z";

describe("decideFailoverTakeover", () => {
  test("standby on a healthy, recent heartbeat", () => {
    expect(decideFailoverTakeover({ lastAttemptAt: "2026-09-02T03:55:00.000Z", now })).toMatchObject({
      action: "standby",
      minutesSinceAttempt: 5,
    });
  });

  test("standby exactly one minute under the threshold (boundary)", () => {
    expect(decideFailoverTakeover({ lastAttemptAt: "2026-09-02T03:31:00.000Z", now })).toMatchObject({
      action: "standby",
      minutesSinceAttempt: 29,
    });
  });

  test("takes over exactly at the threshold (boundary)", () => {
    expect(decideFailoverTakeover({ lastAttemptAt: "2026-09-02T03:30:00.000Z", now })).toMatchObject({
      action: "takeover",
      minutesSinceAttempt: 30,
    });
  });

  test("takes over when the primary has been stalled well past the threshold", () => {
    expect(decideFailoverTakeover({ lastAttemptAt: "2026-09-01T20:00:00.000Z", now })).toMatchObject({
      action: "takeover",
      minutesSinceAttempt: 480,
    });
  });

  test("just-recovered: a fresh attempt immediately after a stale period reads healthy", () => {
    // The primary caught up on its own between one check and the next.
    expect(decideFailoverTakeover({ lastAttemptAt: "2026-09-02T03:59:30.000Z", now })).toMatchObject({
      action: "standby",
    });
  });

  test.each([null, undefined, ""])(
    "fails safe to unknown when the heartbeat evidence is missing: %s",
    (lastAttemptAt) => {
      expect(decideFailoverTakeover({ lastAttemptAt, now })).toMatchObject({
        action: "unknown",
        reason: "no heartbeat evidence (row missing or read failed)",
        minutesSinceAttempt: null,
      });
    },
  );

  test("fails safe to unknown on an unparseable timestamp", () => {
    expect(decideFailoverTakeover({ lastAttemptAt: "not-a-timestamp", now })).toMatchObject({
      action: "unknown",
      minutesSinceAttempt: null,
    });
  });

  test("fails safe to unknown on a future-dated heartbeat (clock skew)", () => {
    expect(decideFailoverTakeover({ lastAttemptAt: "2026-09-02T05:00:00.000Z", now })).toMatchObject({
      action: "unknown",
    });
  });

  test("fails safe to unknown when the evaluation instant itself is invalid", () => {
    expect(
      decideFailoverTakeover({ lastAttemptAt: "2026-09-02T03:55:00.000Z", now: "not-a-timestamp" }),
    ).toMatchObject({
      action: "unknown",
      reason: "evaluation instant is not a valid timestamp",
      minutesSinceAttempt: null,
    });
  });

  test("honors a custom stale-after-minutes threshold", () => {
    expect(
      decideFailoverTakeover({ lastAttemptAt: "2026-09-02T03:50:00.000Z", now }, 5),
    ).toMatchObject({ action: "takeover", minutesSinceAttempt: 10 });
    expect(
      decideFailoverTakeover({ lastAttemptAt: "2026-09-02T03:58:00.000Z", now }, 5),
    ).toMatchObject({ action: "standby", minutesSinceAttempt: 2 });
  });

  test("default threshold is 30 minutes (three missed 10-minute primary ticks)", () => {
    expect(DEFAULT_STALE_AFTER_MINUTES).toBe(30);
  });
});
