import { describe, expect, test } from "bun:test";
import {
  buildDirectoryHealthUpdate,
  directoryHealthStatus,
} from "../src/lib/directory-health";

describe("directory link-health evidence", () => {
  test("unreachable preserves prior strikes and never de-verifies", () => {
    const update = buildDirectoryHealthUpdate({
      verdict: { status: "unreachable", evidence: "network timeout", isHardDead: false },
      priorFailCount: 2,
      isVerified: true,
      checkedAt: "2026-08-13T00:00:00.000Z",
    });

    expect(update.values.linkFailCount).toBe(2);
    expect(update.values.isVerified).toBeUndefined();
    expect(update.reachedThreshold).toBe(false);
  });

  test("an authoritative healthy result resets prior strikes", () => {
    const update = buildDirectoryHealthUpdate({
      verdict: { status: "ok", evidence: "HTTP 200", isHardDead: false },
      priorFailCount: 2,
      isVerified: true,
      checkedAt: "2026-08-13T00:00:00.000Z",
    });

    expect(update.values.linkFailCount).toBe(0);
  });

  test("three hard-dead results de-verify but never delete", () => {
    const update = buildDirectoryHealthUpdate({
      verdict: { status: "dead_http", evidence: "HTTP 404", isHardDead: true },
      priorFailCount: 2,
      isVerified: true,
      checkedAt: "2026-08-13T00:00:00.000Z",
    });

    expect(update.values.linkFailCount).toBe(3);
    expect(update.values.isVerified).toBe(false);
    expect(update.reachedThreshold).toBe(true);
    expect("website" in update.values).toBe(false);
  });

  test("a total egress failure is degraded and preserves every prior strike", () => {
    const tally = { ok: 0, bot_wall: 0, dead_http: 0, unreachable: 60, dead_dns: 0, parked: 0, no_url: 0 };
    const status = directoryHealthStatus(60, tally);
    const updates = Array.from({ length: 60 }, (_, index) => buildDirectoryHealthUpdate({
      verdict: { status: "unreachable", evidence: "fetch threw", isHardDead: false },
      priorFailCount: index % 3,
      isVerified: true,
      checkedAt: "2026-08-13T00:00:00.000Z",
    }));

    expect(status).toEqual({ unreachable: 60, unreachableRatio: 1, degraded: true });
    expect(updates.every((item, index) => item.values.linkFailCount === index % 3)).toBe(true);
    expect(updates.every((item) => item.values.isVerified === undefined)).toBe(true);
  });

  test("the observed 35% unreachable cohort is visible without tripping the 80% systemic gate", () => {
    const status = directoryHealthStatus(60, { unreachable: 21 });
    expect(status.unreachableRatio).toBe(0.35);
    expect(status.degraded).toBe(false);
  });
});
