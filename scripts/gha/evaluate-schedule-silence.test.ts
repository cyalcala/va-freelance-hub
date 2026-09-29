import { describe, expect, test } from "bun:test";
import {
  DEFAULT_STALE_AFTER_HOURS,
  evaluateScheduleSilence,
  type ScheduleRunRecord,
} from "./evaluate-schedule-silence";

const NOW = "2026-09-29T14:32:00Z";
const THRESHOLD = DEFAULT_STALE_AFTER_HOURS;

function run(createdAt: string, event = "schedule", conclusion = "success"): ScheduleRunRecord {
  return { createdAt, event, conclusion };
}

describe("evaluateScheduleSilence", () => {
  test("recent scheduled run within threshold is healthy", () => {
    const decision = evaluateScheduleSilence([run("2026-09-29T13:23:00Z")], NOW, THRESHOLD);
    expect(decision.status).toBe("healthy");
    expect(decision.alert).toBe(false);
    expect(decision.lastScheduledRunAt).toBe("2026-09-29T13:23:00Z");
  });

  test("silence beyond threshold alerts", () => {
    const decision = evaluateScheduleSilence([run("2026-09-29T08:40:56Z")], NOW, 3);
    expect(decision.status).toBe("alert");
    expect(decision.alert).toBe(true);
    expect(decision.hoursSinceLastScheduledRun).toBeGreaterThan(3);
    expect(decision.reason).toContain("no scheduled EX-03 run");
  });

  test("measured default threshold is 6h (3h would alert >50% of the time)", () => {
    expect(DEFAULT_STALE_AFTER_HOURS).toBe(6);
  });

  test("routine degraded-baseline silence (4-6h) stays healthy under the default", () => {
    const decision = evaluateScheduleSilence([run("2026-09-29T08:40:56Z")], NOW);
    expect(decision.hoursSinceLastScheduledRun).toBeGreaterThan(3);
    expect(decision.hoursSinceLastScheduledRun).toBeLessThan(6);
    expect(decision.status).toBe("healthy");
    expect(decision.alert).toBe(false);
  });

  test("near-record silence (7h+) alerts under the default", () => {
    const decision = evaluateScheduleSilence([run("2026-09-29T08:40:56Z")], "2026-09-29T15:55:00Z");
    expect(decision.hoursSinceLastScheduledRun).toBeGreaterThan(6);
    expect(decision.status).toBe("alert");
    expect(decision.alert).toBe(true);
  });

  test("a failed scheduled run still proves the scheduler fired", () => {
    const decision = evaluateScheduleSilence(
      [run("2026-09-29T13:23:00Z", "schedule", "failure")],
      NOW,
      THRESHOLD,
    );
    expect(decision.status).toBe("healthy");
    expect(decision.alert).toBe(false);
  });

  test("manual workflow_dispatch does not reset the silence clock", () => {
    const decision = evaluateScheduleSilence(
      [run("2026-09-29T14:30:00Z", "workflow_dispatch"), run("2026-09-29T08:40:56Z")],
      NOW,
      3,
    );
    expect(decision.lastScheduledRunAt).toBe("2026-09-29T08:40:56Z");
    expect(decision.status).toBe("alert");
    expect(decision.alert).toBe(true);
  });

  test("uses the most recent scheduled run among many", () => {
    const decision = evaluateScheduleSilence(
      [
        run("2026-09-29T02:03:20Z"),
        run("2026-09-29T13:23:00Z"),
        run("2026-09-28T22:07:58Z"),
      ],
      NOW,
      THRESHOLD,
    );
    expect(decision.lastScheduledRunAt).toBe("2026-09-29T13:23:00Z");
    expect(decision.status).toBe("healthy");
  });

  test("missing scheduled-run evidence degrades to unknown without alerting", () => {
    const decision = evaluateScheduleSilence([], NOW, THRESHOLD);
    expect(decision.status).toBe("unknown");
    expect(decision.alert).toBe(false);
    expect(decision.hoursSinceLastScheduledRun).toBeNull();
  });

  test("non-schedule-only evidence degrades to unknown", () => {
    const decision = evaluateScheduleSilence(
      [run("2026-09-29T14:30:00Z", "workflow_dispatch")],
      NOW,
      THRESHOLD,
    );
    expect(decision.status).toBe("unknown");
    expect(decision.alert).toBe(false);
  });

  test("unparseable timestamp degrades to unknown", () => {
    const decision = evaluateScheduleSilence([run("not-a-date")], NOW, THRESHOLD);
    expect(decision.status).toBe("unknown");
    expect(decision.alert).toBe(false);
  });

  test("missing or malformed createdAt entries are filtered, not fatal", () => {
    const decision = evaluateScheduleSilence(
      [{ createdAt: null }, { event: "schedule" }, run("2026-09-29T13:23:00Z")],
      NOW,
      THRESHOLD,
    );
    expect(decision.lastScheduledRunAt).toBe("2026-09-29T13:23:00Z");
    expect(decision.status).toBe("healthy");
  });
});
