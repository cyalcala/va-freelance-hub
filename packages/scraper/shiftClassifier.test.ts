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

  test("keeps an explicit Philippine daytime span and ignores unstated or non-PH hours", () => {
    const stated = classifyShift({ description: "Schedule: 8am - 5pm Manila time" });
    expect(stated.category).toBe("day_shift");
    expect(stated.phWorkingHours).toBe("8am - 5pm Manila time");
    const ambiguous = classifyShift({ description: "Coverage 10 to 2 PHT" });
    expect(ambiguous.phWorkingHours).toBeNull();
    expect(ambiguous.category).toBe("unknown");
    const usMorning = classifyShift({ description: "Hours: 9am - 5pm EST" });
    expect(usMorning.phWorkingHours).toBeNull();
    expect(usMorning.category).toBe("unknown");
    const nz = classifyShift({ description: "New Zealand business hours" });
    expect(nz.category).toBe("day_shift");
    expect(nz.phWorkingHours).toBeNull();
  });

  test("preserves supplied timezone without fabricating an inferred one", () => {
    const result = classifyShift({ clientTimezone: "EST", description: "Work whenever you want" });
    expect(result.clientTimezone).toBe("EST");
    expect(result.category).toBe("flexible");
    expect(result.isAsyncOrFlexible).toBe(true);
    expect(result.isDayshift).toBe(false);
  });

  test.each([
    ["Work New Zealand business hours", "day_shift"],
    ["Must be available during APAC business hours", "day_shift"],
    ["Morning shift position for AU clients", "day_shift"],
    ["Operating during AEST business hours", "day_shift"],
    ["AWST business hours required", "day_shift"],
  ])("classifies expanded dayshift marker %s correctly", (description, category) => {
    const result = classifyShift({ description });
    expect(result.category).toBe(category);
    expect(result.isDayshift).toBe(true);
    expect(result.phWorkingHours).toBeNull();
  });

  test.each([
    ["Working hours: 7:00 AM - 4:00 PM PHT", "7:00 AM - 4:00 PM PHT"],
    ["Schedule: 8am - 5pm Manila time", "8am - 5pm Manila time"],
    ["Shift: 9:00 am – 6:00 pm (PHT)", "9:00 am – 6:00 pm (PHT)"],
    ["Expected hours: 6am to 3pm Philippine time", "6am to 3pm Philippine time"],
  ])("extracts explicit PHT daytime span from %s", (description, expectedSpan) => {
    const result = classifyShift({ description });
    expect(result.category).toBe("day_shift");
    expect(result.isDayshift).toBe(true);
    expect(result.phWorkingHours).toBe(expectedSpan);
    expect(result.evidence).toContain(expectedSpan);
  });

  test("does not extract PHT daytime span if negated or conflicting", () => {
    const negated = classifyShift({ description: "No 8am - 5pm Manila time shift required" });
    expect(negated.category).toBe("unknown");
    expect(negated.phWorkingHours).toBeNull();
    expect(negated.isDayshift).toBe(false);

    const conflicting = classifyShift({ description: "Work 8am - 5pm Manila time or night shift" });
    expect(conflicting.category).toBe("unknown");
    expect(conflicting.phWorkingHours).toBeNull();
    expect(conflicting.isDayshift).toBe(false);
  });
});
