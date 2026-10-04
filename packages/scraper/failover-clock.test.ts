import { describe, expect, test } from "bun:test";
import {
  classifyFailoverOutcome,
  decideFailoverTakeover,
  DEFAULT_STALE_AFTER_MINUTES,
} from "./failover-clock";

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

// INCIDENT-0410(s-53): the module's own header promises to "fail safe (no
  // call) whenever the evidence needed to decide is missing or malformed" and
  // names duplicate traffic against a healthy primary as the dangerous
  // direction. A malformed THRESHOLD is malformed evidence too, but before
  // this fix it silently produced the opposite: takeover, every time.
  describe("malformed staleness threshold", () => {
    const freshHeartbeat = { lastAttemptAt: "2026-09-02T03:59:00.000Z", now };

    test.each([0, -1, -0.5])(
      "fails safe to unknown for a non-positive threshold (%p) instead of forcing takeover",
      (staleAfterMinutes) => {
        // Without the fix: minutesSinceAttempt (1) >= 0 is true -> "takeover",
        // i.e. a duplicate scrape against a primary that ran a minute ago.
        expect(
          decideFailoverTakeover(freshHeartbeat, staleAfterMinutes),
        ).toMatchObject({ action: "unknown", minutesSinceAttempt: null });
      },
    );

    test.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
      "fails safe to unknown for a non-finite threshold (%p)",
      (staleAfterMinutes) => {
        expect(decideFailoverTakeover(freshHeartbeat, staleAfterMinutes)).toMatchObject({
          action: "unknown",
          minutesSinceAttempt: null,
        });
      },
    );

    test("names the malformed threshold in the reason so the failure is greppable", () => {
      const decision = decideFailoverTakeover(freshHeartbeat, 0);
      expect(decision.reason).toContain("stale-after-minutes");
      expect(decision.reason).toContain("0");
    });

    test("an explicit undefined threshold falls back to the 30-minute default", () => {
      expect(
        decideFailoverTakeover({ lastAttemptAt: "2026-09-02T03:20:00.000Z", now }, undefined),
      ).toMatchObject({ action: "takeover", minutesSinceAttempt: 40 });
    });

    test("a positive fractional threshold remains usable", () => {
      expect(
        decideFailoverTakeover({ lastAttemptAt: "2026-09-02T03:59:30.000Z", now }, 0.5),
      ).toMatchObject({ action: "takeover", minutesSinceAttempt: 0.5 });
    });

    test("validates the threshold before the evidence, so a malformed value never reads the heartbeat", () => {
      // Ordering matters: a missing heartbeat plus a bad threshold must still
      // report the threshold, because that is the caller's actual bug.
      expect(decideFailoverTakeover({ lastAttemptAt: null, now }, -1)).toMatchObject({
        action: "unknown",
        reason: expect.stringContaining("stale-after-minutes"),
      });
    });
  });

// INCIDENT-0410(s-53): the decision answers "should I place a call?" and had
// no contract for what the call returned. /api/cron/scrape answers HTTP 200
// with {skipped:true, reason:"run-lock-held"} for a no-op, so an authorised
// takeover can silently fetch nothing — and the only way to notice today is
// to read D1, which is impossible during exactly the row-read outage that
// makes takeover necessary in the first place.
describe("classifyFailoverOutcome", () => {
  const takeoverDecision = decideFailoverTakeover(
    { lastAttemptAt: "2026-10-04T04:00:00.000Z", now: "2026-10-04T05:00:00.000Z" },
  );
  expect(takeoverDecision.action).toBe("takeover");

  test("flags a takeover that the primary's run-lock turned into a no-op", () => {
    const result = classifyFailoverOutcome(takeoverDecision, {
      skipped: true,
      reason: "run-lock-held",
      lockState: "held",
    });
    expect(result).toMatchObject({ outcome: "lock-blocked", takeoverBlocked: true });
    expect(result.reason).toContain("60.0min");
  });

  test("a held lock while the heartbeat is fresh is healthy, not a blocked takeover", () => {
    const standbyDecision = decideFailoverTakeover({
      lastAttemptAt: "2026-10-04T04:58:00.000Z",
      now: "2026-10-04T05:00:00.000Z",
    });
    const result = classifyFailoverOutcome(standbyDecision, {
      skipped: true,
      reason: "run-lock-held",
    });
    expect(result).toMatchObject({ outcome: "lock-blocked", takeoverBlocked: false });
    expect(result.reason).toContain("expected");
  });

  test("an unreadable response is unknown rather than assumed work", () => {
    expect(classifyFailoverOutcome(takeoverDecision, undefined)).toMatchObject({
      outcome: "unreadable",
      takeoverBlocked: false,
    });
    expect(classifyFailoverOutcome(takeoverDecision, "run-lock-held")).toMatchObject({
      outcome: "unreadable",
    });
  });

  test("a non-lock skip is reported as skipped, not as a blocked takeover", () => {
    expect(
      classifyFailoverOutcome(takeoverDecision, { skipped: true, reason: "cadence-guard" }),
    ).toMatchObject({ outcome: "skipped", takeoverBlocked: false });
  });

  test("an ordinary run body is real work", () => {
    expect(classifyFailoverOutcome(takeoverDecision, { total: 12, published: 3 })).toMatchObject({
      outcome: "worked",
      takeoverBlocked: false,
    });
  });

  test("a 503-shaped error body is never counted as work", () => {
    expect(
      classifyFailoverOutcome(takeoverDecision, {
        error: "Scrape coordination is temporarily unavailable. Retry shortly.",
      }),
    ).toMatchObject({ outcome: "unreadable", takeoverBlocked: false });
  });

  test("unknown-evidence decisions can still report a blocked lock without claiming a takeover", () => {
    const unknownDecision = decideFailoverTakeover({ lastAttemptAt: null, now });
    expect(
      classifyFailoverOutcome(unknownDecision, { skipped: true, reason: "run-lock-held" }),
    ).toMatchObject({ outcome: "lock-blocked", takeoverBlocked: false });
  });
});
