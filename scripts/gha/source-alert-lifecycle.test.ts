import { describe, expect, test } from "bun:test";
import {
  decideAlertLifecycle,
  parseIncidentKey,
  parseHealthyStreak,
  renderMarkers,
  type LifecycleIssue,
} from "./source-alert-lifecycle.ts";

const KEY = "ingestion-health";

/** Build an open issue body carrying the incident-key + streak markers. */
function issue(number: number, key: string, streak: number, extra = ""): LifecycleIssue {
  return { number, body: `${extra}\n\nThe watchdog detected a failure.\n\n${renderMarkers(key, streak)}` };
}

describe("markers round-trip", () => {
  test("renderMarkers is read back by the parsers", () => {
    const body = renderMarkers(KEY, 3);
    expect(parseIncidentKey(body)).toBe(KEY);
    expect(parseHealthyStreak(body)).toBe(3);
  });

  test("absent markers read as null key / streak 0", () => {
    expect(parseIncidentKey("plain body, no marker")).toBeNull();
    expect(parseHealthyStreak("plain body, no marker")).toBe(0);
  });

  test("malformed / negative streak marker degrades to 0", () => {
    expect(parseHealthyStreak("<!-- healthy-streak: not-a-number -->")).toBe(0);
    expect(parseHealthyStreak(null)).toBe(0);
    expect(parseHealthyStreak(undefined)).toBe(0);
  });

  test("incident key parse is case-insensitive and trims", () => {
    expect(parseIncidentKey("<!--  incident-key:  Ingestion-Health  -->")).toBe("ingestion-health");
  });
});

describe("decideAlertLifecycle — failing signal", () => {
  test("no open incident → CREATE (streak 0)", () => {
    expect(decideAlertLifecycle({ incidentKey: KEY, state: "failing", openIssues: [] })).toEqual({
      action: "CREATE",
      incidentKey: KEY,
      healthyStreak: 0,
    });
  });

  test("open incident already tracked (streak 0) → HOLD (no duplicate comment)", () => {
    expect(
      decideAlertLifecycle({ incidentKey: KEY, state: "failing", openIssues: [issue(69, KEY, 0)] }),
    ).toEqual({ action: "HOLD", reason: "still failing; incident already open and tracked" });
  });

  test("open incident that was recovering (streak >= 1) → UPDATE recurred, reset to 0", () => {
    expect(
      decideAlertLifecycle({ incidentKey: KEY, state: "failing", openIssues: [issue(69, KEY, 1)] }),
    ).toEqual({ action: "UPDATE", issueNumber: 69, healthyStreak: 0, reason: "recurred-during-recovery" });
  });
});

describe("decideAlertLifecycle — healthy signal", () => {
  test("no open incident → HOLD (nothing to close)", () => {
    expect(decideAlertLifecycle({ incidentKey: KEY, state: "healthy", openIssues: [] })).toEqual({
      action: "HOLD",
      reason: "healthy; no open incident",
    });
  });

  test("open incident, first healthy observation (threshold 2) → UPDATE healthy-progress (streak→1)", () => {
    expect(
      decideAlertLifecycle({ incidentKey: KEY, state: "healthy", openIssues: [issue(69, KEY, 0)], healthyThreshold: 2 }),
    ).toEqual({ action: "UPDATE", issueNumber: 69, healthyStreak: 1, reason: "healthy-progress" });
  });

  test("open incident reaches the healthy threshold → CLOSE", () => {
    expect(
      decideAlertLifecycle({ incidentKey: KEY, state: "healthy", openIssues: [issue(69, KEY, 1)], healthyThreshold: 2 }),
    ).toEqual({ action: "CLOSE", issueNumber: 69 });
  });

  test("threshold 1 closes on the first healthy observation", () => {
    expect(
      decideAlertLifecycle({ incidentKey: KEY, state: "healthy", openIssues: [issue(69, KEY, 0)], healthyThreshold: 1 }),
    ).toEqual({ action: "CLOSE", issueNumber: 69 });
  });

  test("threshold below 1 is clamped to 1 (cannot disable closing safety)", () => {
    expect(
      decideAlertLifecycle({ incidentKey: KEY, state: "healthy", openIssues: [issue(69, KEY, 0)], healthyThreshold: 0 }),
    ).toEqual({ action: "CLOSE", issueNumber: 69 });
  });
});

describe("decideAlertLifecycle — fail-closed and isolation", () => {
  test("unknown state never closes an open incident (grace window)", () => {
    expect(
      decideAlertLifecycle({ incidentKey: KEY, state: "unknown", openIssues: [issue(69, KEY, 1)], healthyThreshold: 2 }),
    ).toEqual({ action: "HOLD", reason: "state unknown; no lifecycle action" });
  });

  test("an open issue for a DIFFERENT incident key is not matched", () => {
    // Failing + only a foreign-key issue open → CREATE (does not touch the other).
    expect(
      decideAlertLifecycle({ incidentKey: KEY, state: "failing", openIssues: [issue(70, "enrichment-health", 0)] }),
    ).toEqual({ action: "CREATE", incidentKey: KEY, healthyStreak: 0 });
    // Healthy + only a foreign-key issue open → HOLD (never closes someone else's).
    expect(
      decideAlertLifecycle({ incidentKey: KEY, state: "healthy", openIssues: [issue(70, "enrichment-health", 1)] }),
    ).toEqual({ action: "HOLD", reason: "healthy; no open incident" });
  });

  test("selects the matching key among several open issues", () => {
    const open = [issue(70, "enrichment-health", 0), issue(69, KEY, 1), issue(71, "infra", 0)];
    expect(decideAlertLifecycle({ incidentKey: KEY, state: "healthy", openIssues: open, healthyThreshold: 2 })).toEqual({
      action: "CLOSE",
      issueNumber: 69,
    });
  });

  test("duplicate keyed siblings bind to the OLDEST issue regardless of list order", () => {
    // A search-index race can transiently leave two keyed twins; the evaluator
    // must always advance/close the older one so the newer twin cannot orphan it.
    const twins = [issue(74, KEY, 0), issue(72, KEY, 1)];
    expect(decideAlertLifecycle({ incidentKey: KEY, state: "healthy", openIssues: twins, healthyThreshold: 2 })).toEqual({
      action: "CLOSE",
      issueNumber: 72,
    });
    const twinsReversed = [issue(72, KEY, 1), issue(74, KEY, 0)];
    expect(
      decideAlertLifecycle({ incidentKey: KEY, state: "healthy", openIssues: twinsReversed, healthyThreshold: 2 }),
    ).toEqual({ action: "CLOSE", issueNumber: 72 });
    // Recurrence during recovery also resets the OLDER twin's streak.
    expect(decideAlertLifecycle({ incidentKey: KEY, state: "failing", openIssues: twinsReversed })).toEqual({
      action: "UPDATE",
      issueNumber: 72,
      healthyStreak: 0,
      reason: "recurred-during-recovery",
    });
  });
});

describe("decideAlertLifecycle — malformed input degrades safely", () => {
  test("non-array openIssues → treated as empty", () => {
    expect(
      decideAlertLifecycle({ incidentKey: KEY, state: "failing", openIssues: undefined as unknown as LifecycleIssue[] }),
    ).toEqual({ action: "CREATE", incidentKey: KEY, healthyStreak: 0 });
    // Healthy with garbage input never fabricates a CLOSE.
    expect(
      decideAlertLifecycle({ incidentKey: KEY, state: "healthy", openIssues: null as unknown as LifecycleIssue[] }),
    ).toEqual({ action: "HOLD", reason: "healthy; no open incident" });
  });

  test("issue entries missing body / number are skipped", () => {
    const open = [
      { number: 1 } as LifecycleIssue, // no body → no key
      { body: renderMarkers(KEY, 0) } as unknown as LifecycleIssue, // no number
      issue(69, KEY, 1),
    ];
    expect(decideAlertLifecycle({ incidentKey: KEY, state: "healthy", openIssues: open, healthyThreshold: 2 })).toEqual({
      action: "CLOSE",
      issueNumber: 69,
    });
  });

  test("keyed issue with a MISSING streak marker still progresses and closes", () => {
    // Executor-side marker-append makes this shape well-defined; the evaluator
    // must treat the missing marker as streak 0 and advance normally.
    const keyedNoStreak = (n: number): LifecycleIssue => ({
      number: n,
      body: `body\n\n<!-- incident-key: ${KEY} -->`,
    });
    expect(
      decideAlertLifecycle({ incidentKey: KEY, state: "healthy", openIssues: [keyedNoStreak(69)], healthyThreshold: 2 }),
    ).toEqual({ action: "UPDATE", issueNumber: 69, healthyStreak: 1, reason: "healthy-progress" });
    expect(
      decideAlertLifecycle({
        incidentKey: KEY,
        state: "healthy",
        openIssues: [{ number: 69, body: `body\n\n<!-- incident-key: ${KEY} -->\n<!-- healthy-streak: 1 -->` }],
        healthyThreshold: 2,
      }),
    ).toEqual({ action: "CLOSE", issueNumber: 69 });
  });

  test("full recovery sequence is monotonic and idempotent", () => {
    // Explicit observation stream for threshold 2: create → hold → progress → close.
    const create = decideAlertLifecycle({ incidentKey: KEY, state: "failing", openIssues: [] });
    expect(create).toEqual({ action: "CREATE", incidentKey: KEY, healthyStreak: 0 });

    const stillFailing = decideAlertLifecycle({
      incidentKey: KEY,
      state: "failing",
      openIssues: [issue(69, KEY, 0)],
    });
    expect(stillFailing).toEqual({ action: "HOLD", reason: "still failing; incident already open and tracked" });

    const progress = decideAlertLifecycle({
      incidentKey: KEY,
      state: "healthy",
      openIssues: [issue(69, KEY, 0)],
      healthyThreshold: 2,
    });
    expect(progress).toEqual({ action: "UPDATE", issueNumber: 69, healthyStreak: 1, reason: "healthy-progress" });

    const close = decideAlertLifecycle({
      incidentKey: KEY,
      state: "healthy",
      openIssues: [issue(69, KEY, 1)],
      healthyThreshold: 2,
    });
    expect(close).toEqual({ action: "CLOSE", issueNumber: 69 });
  });
});
