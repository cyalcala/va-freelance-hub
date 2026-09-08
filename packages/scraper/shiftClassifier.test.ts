import { describe, expect, test } from "bun:test";
import { classifyShift } from "./shiftClassifier";

describe("source-stated shift hints", () => {
  test.each([
    ["Filipino VA, day shift", "day_shift"],
    ["Work Australian business hours", "day_shift"],
    ["Must work UK business hours", "mid_shift"],
    ["Required to work US Pacific business hours (PST)", "night_shift"],
    ["Night shift supporting US operations", "night_shift"],
    ["Work on your own time; asynchronous team", "flexible"],
  ])("classifies %s without inventing times", (description, category) => {
    const result = classifyShift({ description });
    expect(result.category).toBe(category);
    expect(result.phWorkingHours).toBeNull();
    expect(result.clientTimezone).toBeNull();
  });

  test.each([
    { clientTimezone: "AEST", description: "Support our Sydney headquarters" },
    { clientTimezone: "GMT", description: "Our company is based in London" },
    { description: "Apply before 5 PM PST" },
    { title: "CT Imaging Documentation Specialist" },
    { description: "No night shift required" },
    { description: "Day shift or night shift depending on assignment" },
    { description: "Results-oriented team" },
    { clientTimezone: "UTC-5" },
  ])("does not infer schedule from unrelated or conflicting evidence: %j", input => {
    expect(classifyShift(input).category).toBe("unknown");
    expect(classifyShift(input).phWorkingHours).toBeNull();
  });

  test("preserves supplied timezone without fabricating an inferred one", () => {
    const result = classifyShift({ clientTimezone: "EST", description: "Work whenever you want" });
    expect(result.clientTimezone).toBe("EST");
    expect(result.category).toBe("flexible");
    expect(result.isAsyncOrFlexible).toBe(true);
  });
});
