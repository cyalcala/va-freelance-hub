import { describe, expect, test } from "bun:test";
import {
  decideFailoverTakeover,
  DEFAULT_RUN_LOCK_TTL_MINUTES,
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

describe("decideFailoverTakeover with run-lock evidence", () => {
  // A separate instant so these cases can use the same clock the incident did.
  const now = "2026-10-05T04:00:00.000Z";
  const staleHeartbeat = "2026-10-05T02:00:00.000Z"; // 120min old at `now`

  test("standby when the heartbeat is stale but a run claimed the lock inside the window", () => {
    expect(
      decideFailoverTakeover({
        lastAttemptAt: staleHeartbeat,
        lockLastAttemptAt: "2026-10-05T03:55:00.000Z", // claimed 5min ago
        now,
      }),
    ).toMatchObject({ action: "standby", lockState: "held", lockAgeMinutes: 5 });
  });

  test("the standby reason names the run lock, not the heartbeat", () => {
    const decision = decideFailoverTakeover({
      lastAttemptAt: staleHeartbeat,
      lockLastAttemptAt: "2026-10-05T03:55:00.000Z",
      now,
    });
    expect(decision.reason).toContain("run lock");
    expect(decision.minutesSinceAttempt).toBe(120);
  });

  test("takeover when the lock has itself been held well past the server TTL", () => {
    expect(
      decideFailoverTakeover({
        lastAttemptAt: staleHeartbeat,
        lockLastAttemptAt: "2026-10-05T03:20:00.000Z", // claimed 40min ago
        now,
      }),
    ).toMatchObject({ action: "takeover", lockState: "stale", lockAgeMinutes: 40 });
  });

  test("lock exactly at the server TTL is still held, because the server's grant is a strict less-than", () => {
    // acquireRunLock grants only when last_attempt_at < Date.now() - TTL, so at
    // exactly the TTL the endpoint still answers run-lock-held. Mirroring the
    // refusal here means the fence never spends its one call on a rejection.
    expect(
      decideFailoverTakeover({
        lastAttemptAt: staleHeartbeat,
        lockLastAttemptAt: "2026-10-05T03:52:00.000Z", // exactly 8min ago
        now,
      }),
    ).toMatchObject({ action: "standby", lockState: "held", lockAgeMinutes: 8 });
  });

  test("one minute past the server TTL is reclaimable, so the fallback proceeds", () => {
    expect(
      decideFailoverTakeover({
        lastAttemptAt: staleHeartbeat,
        lockLastAttemptAt: "2026-10-05T03:51:00.000Z", // 9min ago
        now,
      }),
    ).toMatchObject({ action: "takeover", lockState: "stale", lockAgeMinutes: 9 });
  });

  test("released lock sentinel never blocks a stale-heartbeat takeover", () => {
    expect(
      decideFailoverTakeover({
        lastAttemptAt: staleHeartbeat,
        lockLastAttemptAt: "1970-01-01T00:00:00.000Z",
        now,
      }),
    ).toMatchObject({ action: "takeover", lockState: "released" });
  });

  test.each([null, undefined, "", "not-a-timestamp"])(
    "absent or unreadable lock evidence leaves the decision unchanged: %s",
    (lockLastAttemptAt) => {
      const decision = decideFailoverTakeover({
        lastAttemptAt: staleHeartbeat,
        lockLastAttemptAt,
        now,
      });
      expect(decision).toMatchObject({ action: "takeover", lockState: "unknown", lockAgeMinutes: null });
    },
  );

  test("a future-dated lock claim does not block, but is reported as untrustworthy", () => {
    expect(
      decideFailoverTakeover({
        lastAttemptAt: staleHeartbeat,
        lockLastAttemptAt: "2026-10-05T05:00:00.000Z",
        now,
      }),
    ).toMatchObject({ action: "takeover", lockState: "future", lockAgeMinutes: -60 });
  });

  test("a fresh heartbeat still stands by regardless of the lock row", () => {
    expect(
      decideFailoverTakeover({
        lastAttemptAt: "2026-10-05T03:55:00.000Z",
        lockLastAttemptAt: "2026-10-05T03:58:00.000Z",
        now,
      }),
    ).toMatchObject({ action: "standby", lockState: "held", lockAgeMinutes: 2 });
  });

  test("the lock window does NOT follow the caller's heartbeat-staleness parameter", () => {
    // Reusing staleAfterMinutes for the lock was the defect this session
    // corrects: the endpoint's lock TTL is independent of how long the primary
    // heartbeat may be silent, so a caller who tightens the heartbeat window
    // must not start refusing takeovers the server would happily grant.
    const tenMinuteOldLock = "2026-10-05T03:50:00.000Z"; // 10min old, > the 8min TTL
    expect(
      decideFailoverTakeover({ lastAttemptAt: staleHeartbeat, lockLastAttemptAt: tenMinuteOldLock, now }, 5),
    ).toMatchObject({ action: "takeover", lockState: "stale", lockAgeMinutes: 10 });
    expect(
      decideFailoverTakeover({ lastAttemptAt: staleHeartbeat, lockLastAttemptAt: tenMinuteOldLock, now }, 120),
    ).toMatchObject({ action: "takeover", lockState: "stale", lockAgeMinutes: 10 });
  });

  test("a lock inside the server TTL defers regardless of the heartbeat threshold", () => {
    const threeMinuteOldLock = "2026-10-05T03:57:00.000Z"; // 3min old, < the 8min TTL
    expect(
      decideFailoverTakeover({ lastAttemptAt: staleHeartbeat, lockLastAttemptAt: threeMinuteOldLock, now }, 5),
    ).toMatchObject({ action: "standby", lockState: "held", lockAgeMinutes: 3 });
    expect(
      decideFailoverTakeover({ lastAttemptAt: staleHeartbeat, lockLastAttemptAt: threeMinuteOldLock, now }, 120),
    ).toMatchObject({ action: "standby", lockState: "held", lockAgeMinutes: 3 });
  });

  test("an explicit run-lock TTL overrides the mirrored default", () => {
    // A deployment whose scrape endpoint runs a longer TTL must be able to say
    // so without editing this module: a 40min-old lock is reclaimable under the
    // default 8min TTL, but still held under an explicit 45min TTL.
    const fortyMinuteOldLock = "2026-10-05T03:20:00.000Z";
    expect(
      decideFailoverTakeover(
        { lastAttemptAt: staleHeartbeat, lockLastAttemptAt: fortyMinuteOldLock, now },
        DEFAULT_STALE_AFTER_MINUTES,
        45,
      ),
    ).toMatchObject({ action: "standby", lockState: "held", lockAgeMinutes: 40 });
    expect(
      decideFailoverTakeover(
        { lastAttemptAt: staleHeartbeat, lockLastAttemptAt: fortyMinuteOldLock, now },
        DEFAULT_STALE_AFTER_MINUTES,
      ),
    ).toMatchObject({ action: "takeover", lockState: "stale", lockAgeMinutes: 40 });
  });

  test("the mirrored run-lock TTL default is the endpoint's 8 minutes", () => {
    // Must track RUN_LOCK_TTL_MIN in apps/web/src/pages/api/cron/scrape.ts.
    expect(DEFAULT_RUN_LOCK_TTL_MINUTES).toBe(8);
  });

  test("an invalid evaluation instant still fails safe before any lock is consulted", () => {
    expect(
      decideFailoverTakeover({
        lastAttemptAt: staleHeartbeat,
        lockLastAttemptAt: "2026-10-05T03:55:00.000Z",
        now: "not-a-timestamp",
      }),
    ).toMatchObject({ action: "unknown", lockState: "unknown", lockAgeMinutes: null });
  });
});
