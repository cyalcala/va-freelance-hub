import { describe, it, expect } from "bun:test";
import { normalizeCompensation } from "./compensation";

describe("normalizeCompensation — Compensation Intelligence", () => {
  it("normalizes hourly ranges and projects 160h monthly equivalents", () => {
    const res = normalizeCompensation("$20 - $35 / hour");
    expect(res).not.toBeNull();
    expect(res?.currency).toBe("USD");
    expect(res?.period).toBe("hourly");
    expect(res?.payMin).toBe(20);
    expect(res?.payMax).toBe(35);
    expect(res?.estimatedMonthlyLow).toBe(3200); // 20 * 160
    expect(res?.estimatedMonthlyHigh).toBe(5600); // 35 * 160
    expect(res?.disclaimer).toContain("normalized reference projections");
  });

  it("normalizes yearly salary ranges with 'k' suffix", () => {
    const res = normalizeCompensation("$60k - $90k / year");
    expect(res).not.toBeNull();
    expect(res?.currency).toBe("USD");
    expect(res?.period).toBe("yearly");
    expect(res?.payMin).toBe(60000);
    expect(res?.payMax).toBe(90000);
    expect(res?.estimatedMonthlyLow).toBe(5000); // 60000 / 12
    expect(res?.estimatedMonthlyHigh).toBe(7500); // 90000 / 12
  });

  it("normalizes PHP monthly salary ranges", () => {
    const res = normalizeCompensation("PHP 45,000 - 65,000 / month");
    expect(res).not.toBeNull();
    expect(res?.currency).toBe("PHP");
    expect(res?.period).toBe("monthly");
    expect(res?.payMin).toBe(45000);
    expect(res?.payMax).toBe(65000);
    expect(res?.estimatedMonthlyLow).toBe(45000);
    expect(res?.estimatedMonthlyHigh).toBe(65000);
  });

  it("normalizes Euro figures", () => {
    const res = normalizeCompensation("€3,500 / month");
    expect(res).not.toBeNull();
    expect(res?.currency).toBe("EUR");
    expect(res?.period).toBe("monthly");
    expect(res?.payMin).toBe(3500);
    expect(res?.payMax).toBe(3500);
  });

  it("infers period from numerical magnitude when unstated", () => {
    const hourly = normalizeCompensation("$25");
    expect(hourly?.period).toBe("hourly");
    expect(hourly?.estimatedMonthlyLow).toBe(4000);

    const yearly = normalizeCompensation("$85,000");
    expect(yearly?.period).toBe("yearly");
    expect(yearly?.estimatedMonthlyLow).toBe(7083);
  });

  it("returns null for non-numeric or unstated strings", () => {
    expect(normalizeCompensation(null)).toBeNull();
    expect(normalizeCompensation("")).toBeNull();
    expect(normalizeCompensation("Competitive salary")).toBeNull();
    expect(normalizeCompensation("DOE / Negotiable")).toBeNull();
  });
});
