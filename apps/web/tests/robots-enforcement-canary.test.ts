import { describe, expect, test } from "bun:test";
import type { RobotsGateResult } from "@va-hub/scraper";
import { sources } from "@va-hub/scraper";
import {
  attachConfiguredSourceRobotsEvidence,
  configuredSourceRobotsSkip,
  robotsModeForSourceId,
} from "../src/pages/api/cron/scrape";

const wwr = sources.find((source) => source.id === "we-work-remotely");
if (!wwr) throw new Error("we-work-remotely fixture missing");

function robots(overrides: Partial<RobotsGateResult>): RobotsGateResult {
  return {
    verdict: "allowed",
    evidence: "robots.txt allows this path",
    allowed: true,
    wouldBlock: false,
    crawlDelay: null,
    aiInputAllowed: true,
    fromCache: true,
    mode: "enforce",
    ...overrides,
  };
}

describe("COMP-01B reviewed robots enforcement rollout", () => {
  test("enforces exactly the six reviewed sources and defaults all others to observe", () => {
    for (const id of [
      "we-work-remotely",
      "remotive",
      "real-work-from-anywhere",
      "remote-ok",
      "jobicy-admin-support-apac",
      "jobicy-supporting-apac",
    ]) {
      expect(robotsModeForSourceId(id)).toBe("enforce");
    }
    for (const id of ["future-source", "ashby:future", "greenhouse:future"]) {
      expect(robotsModeForSourceId(id)).toBe("observe");
    }
  });

  test("an empty set is the exact rollback to observe", () => {
    expect(robotsModeForSourceId("we-work-remotely", new Set())).toBe("observe");
  });

  test("enforce allows an explicit allowed verdict to proceed", () => {
    expect(configuredSourceRobotsSkip(wwr, robots({}), "enforce")).toBeNull();
  });

  test("enforce records and skips disallowed or unknown decisions", () => {
    for (const decision of [
      robots({ verdict: "disallowed", evidence: "Disallow: /remote-jobs.rss", allowed: false, wouldBlock: true }),
      robots({ verdict: "unknown", evidence: "robots.txt HTTP 503", allowed: false, wouldBlock: true }),
    ]) {
      const result = configuredSourceRobotsSkip(wwr, decision, "enforce");
      expect(result?.skipped).toBe(true);
      expect(result?.robotsVerdict).toBe(decision.verdict);
      expect(result?.robotsWouldBlock).toBe(true);
      expect(result?.robotsMode).toBe("enforce");
      expect(result?.robotsOrigin).toBe("https://weworkremotely.com");
      expect(result?.robotsEvidence).toBe(decision.evidence);
      expect(result?.skipReason).toContain(decision.evidence);
    }
  });

  test("an enforce-mode gate exception fails closed with explicit evidence", () => {
    const result = configuredSourceRobotsSkip(wwr, null, "enforce");
    expect(result?.skipped).toBe(true);
    expect(result?.robotsVerdict).toBe("unknown");
    expect(result?.robotsWouldBlock).toBe(true);
    expect(result?.robotsMode).toBe("enforce");
    expect(result?.robotsOrigin).toBe("https://weworkremotely.com");
    expect(result?.robotsEvidence).toBe("robots gate failed before a decision");
    expect(result?.skipReason).toContain("gate failed before a decision");
  });

  test("observe mode continues while preserving would-block truth", () => {
    const observed = robots({
      mode: "observe",
      verdict: "disallowed",
      evidence: "Disallow: /",
      allowed: true,
      wouldBlock: true,
    });
    expect(configuredSourceRobotsSkip(wwr, observed, "observe")).toBeNull();
  });

  test("successful and null observe decisions retain complete provenance", () => {
    const allowed = robots({ mode: "enforce" });
    const allowedResult = attachConfiguredSourceRobotsEvidence({} as never, wwr, allowed, "enforce");
    expect(allowedResult.robotsMode).toBe("enforce");
    expect(allowedResult.robotsVerdict).toBe("allowed");
    expect(allowedResult.robotsEvidence).toBe(allowed.evidence);
    expect(allowedResult.robotsOrigin).toBe("https://weworkremotely.com");
    expect(allowedResult.robotsWouldBlock).toBe(false);

    const nullObserved = attachConfiguredSourceRobotsEvidence({} as never, wwr, null, "observe");
    expect(nullObserved.robotsMode).toBe("observe");
    expect(nullObserved.robotsVerdict).toBe("unknown");
    expect(nullObserved.robotsEvidence).toBe("robots gate failed before a decision");
    expect(nullObserved.robotsOrigin).toBe("https://weworkremotely.com");
    expect(nullObserved.robotsWouldBlock).toBe(true);
  });
});
