import { describe, expect, it } from "bun:test";
import { classifyShift } from "@va-hub/scraper";

describe("Job Detail Page — Shift & Working Hours Intelligence", () => {
  it("resolves Australian / APAC client timezone to Day Shift with PHT hours", () => {
    const shift = classifyShift({
      clientTimezone: "AEST",
      title: "Virtual Assistant",
      description: "Support Australian executives during standard business hours.",
    });

    expect(shift.category).toBe("day_shift");
    expect(shift.phWorkingHours).toBe("6:00 AM - 3:00 PM PHT");
    expect(shift.clientTimezone).toBe("AEST");
  });

  it("resolves UK / European signals to Mid Shift with PHT hours", () => {
    const shift = classifyShift({
      clientTimezone: "BST / London",
      title: "Customer Support Specialist",
      description: "UK-based ecommerce agency looking for mid-shift assistance.",
    });

    expect(shift.category).toBe("mid_shift");
    expect(shift.phWorkingHours).toBe("2:00 PM - 11:00 PM PHT");
  });

  it("resolves US / Americas signals to Night Shift with PHT hours", () => {
    const shift = classifyShift({
      clientTimezone: "EST (New York)",
      title: "Executive Assistant",
      description: "Graveyard shift supporting East Coast CEO.",
    });

    expect(shift.category).toBe("night_shift");
    expect(shift.phWorkingHours).toBe("9:00 PM - 6:00 AM PHT");
  });

  it("resolves async / flexible listings to Flexible schedule", () => {
    const shift = classifyShift({
      clientTimezone: null,
      title: "Technical Writer",
      description: "Work on your own time. Asynchronous team across multiple time zones.",
    });

    expect(shift.category).toBe("flexible");
    expect(shift.isAsyncOrFlexible).toBe(true);
    expect(shift.phWorkingHours).toBe("Flexible / Async schedule");
  });

  it("fails safe to unknown when timezone/shift is not stated (zero fabrication)", () => {
    const shift = classifyShift({
      clientTimezone: null,
      title: "Data Entry Clerk",
      description: "Perform regular data hygiene and database entry.",
    });

    expect(shift.category).toBe("unknown");
    expect(shift.phWorkingHours).toBeNull();
    expect(shift.isAsyncOrFlexible).toBe(false);
  });
});
