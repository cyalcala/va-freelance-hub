import { describe, it, expect } from "bun:test";
import { classifyShift } from "./shiftClassifier";

describe("classifyShift — Timezone & Shift Intelligence", () => {
  it("detects Day Shift from Australian / AEST signals", () => {
    const res = classifyShift({
      clientTimezone: "AEST",
      title: "Executive Assistant (Australian Client)",
      description: "Support our Sydney team during normal business hours.",
    });
    expect(res.category).toBe("day_shift");
    expect(res.clientTimezone).toBe("AEST");
    expect(res.phWorkingHours).toContain("PHT");
    expect(res.phWorkingHours).toContain("6:00 AM");
  });

  it("detects Day Shift from explicit 'dayshift' keyword in description", () => {
    const res = classifyShift({
      title: "Virtual Assistant",
      description: "Looking for a Filipino VA for dayshift schedule, 8am to 5pm.",
    });
    expect(res.category).toBe("day_shift");
    expect(res.evidence).toContain("Day shift");
  });

  it("detects Mid Shift from UK / GMT / BST signals", () => {
    const res = classifyShift({
      clientTimezone: "GMT",
      title: "Customer Support Specialist",
      description: "Must be available during UK business hours (London time).",
    });
    expect(res.category).toBe("mid_shift");
    expect(res.phWorkingHours).toContain("2:00 PM");
  });

  it("detects Mid Shift from European / CET signals", () => {
    const res = classifyShift({
      clientTimezone: "CET",
      title: "Content Writer",
      description: "Working with our Berlin headquarters.",
    });
    expect(res.category).toBe("mid_shift");
  });

  it("detects Night Shift from US / EST signals", () => {
    const res = classifyShift({
      clientTimezone: "EST",
      title: "Lead Generation Specialist",
      description: "Night shift schedule supporting US Eastern sales operations.",
    });
    expect(res.category).toBe("night_shift");
    expect(res.phWorkingHours).toContain("9:00 PM");
  });

  it("detects Night Shift from PST / Pacific time signals", () => {
    const res = classifyShift({
      title: "Operations Coordinator",
      description: "Required to work during US Pacific business hours (PST).",
    });
    expect(res.category).toBe("night_shift");
  });

  it("detects Flexible / Async when explicitly indicated", () => {
    const res = classifyShift({
      title: "Technical Writer",
      description: "We are a 100% async team. Work whenever you want, results-oriented.",
    });
    expect(res.category).toBe("flexible");
    expect(res.isAsyncOrFlexible).toBe(true);
    expect(res.phWorkingHours).toContain("Async");
  });

  it("returns 'unknown' when no shift or timezone information is stated", () => {
    const res = classifyShift({
      title: "Senior Fullstack Engineer",
      description: "Build innovative web platforms using React and Node.js.",
    });
    expect(res.category).toBe("unknown");
    expect(res.phWorkingHours).toBeNull();
    expect(res.isAsyncOrFlexible).toBe(false);
  });
});
