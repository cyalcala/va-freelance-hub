import { describe, expect, test } from "bun:test";
import {
  classifySourceType,
  computeStageRatios,
  calculateFunnelReport,
  formatFunnelReportMarkdown,
  type SourceFunnelObservation,
} from "./measure-first-publication-funnel";

describe("measure-first-publication-funnel", () => {
  test("classifySourceType correctly categorizes aggregators, agencies, and tech ATS", () => {
    expect(classifySourceType("we-work-remotely")).toBe("aggregator");
    expect(classifySourceType("remotive")).toBe("aggregator");
    expect(classifySourceType("remote-ok")).toBe("aggregator");
    expect(classifySourceType("jobicy-apac")).toBe("aggregator");
    expect(classifySourceType("himalayas")).toBe("aggregator");

    expect(classifySourceType("breezy:sourcefit")).toBe("agency_ats");
    expect(classifySourceType("breezy:20four7va")).toBe("agency_ats");
    expect(classifySourceType("workable:hunt-st")).toBe("agency_ats");

    expect(classifySourceType("greenhouse:canonical")).toBe("tech_ats");
    expect(classifySourceType("lever:automattic")).toBe("tech_ats");
    expect(classifySourceType("ashby:atticus")).toBe("tech_ats");

    expect(classifySourceType("custom-feed-xyz")).toBe("unknown");
  });

  test("computeStageRatios handles zero counts gracefully without NaN", () => {
    const zeroRatios = computeStageRatios({
      rawCandidates: 0,
      qualified: 0,
      authorized: 0,
      freshPublished: 0,
      publiclyVerified: 0,
    });

    expect(zeroRatios.r1_qualification).toBe(0);
    expect(zeroRatios.r2_authorization).toBe(0);
    expect(zeroRatios.r3_fresh_publication).toBe(0);
    expect(zeroRatios.r4_public_consistency).toBe(1); // No published jobs means 100% consistency by default
    expect(zeroRatios.compositeYield).toBe(0);
    expect(Number.isNaN(zeroRatios.compositeYield)).toBe(false);
  });

  test("computeStageRatios calculates exact ratios and composite yield", () => {
    const ratios = computeStageRatios({
      rawCandidates: 1000,
      qualified: 50,  // r1 = 0.05
      authorized: 50, // r2 = 1.0
      freshPublished: 10, // r3 = 0.20
      publiclyVerified: 10, // r4 = 1.0
    });

    expect(ratios.r1_qualification).toBe(0.05);
    expect(ratios.r2_authorization).toBe(1.0);
    expect(ratios.r3_fresh_publication).toBe(0.2);
    expect(ratios.r4_public_consistency).toBe(1.0);
    expect(ratios.compositeYield).toBe(0.01); // 0.05 * 1.0 * 0.2 * 1.0 = 0.01
  });

  test("calculateFunnelReport computes accurate aggregate daily output and gaps", () => {
    const observations: SourceFunnelObservation[] = [
      {
        sourceId: "we-work-remotely",
        sourceType: "aggregator",
        rawCandidates: 70,
        qualified: 70,
        authorized: 70,
        freshPublished: 70,
        stockAbsorption: 0,
        publiclyVerified: 70,
        observedDays: 7, // 10/day
      },
      {
        sourceId: "breezy:sourcefit",
        sourceType: "agency_ats",
        rawCandidates: 28,
        qualified: 28,
        authorized: 28,
        freshPublished: 14,
        stockAbsorption: 14,
        publiclyVerified: 14,
        observedDays: 7, // 2 fresh/day
      },
    ];

    const report = calculateFunnelReport(observations, 7);

    expect(report.sources.length).toBe(2);
    // WWR: 10 fresh/day expected
    expect(report.sources[0].expectedDailyFreshOutput).toBe(10);
    // Sourcefit: rawArrival = 4/day, compositeYield = 1.0 * 1.0 * 0.5 * 1.0 = 0.5 => expected = 2/day
    expect(report.sources[1].expectedDailyFreshOutput).toBe(2);

    expect(report.systemTotals.totalDailyFreshExpected).toBe(12);
    expect(report.systemTotals.gapTo100Floor).toBe(88);
    expect(report.systemTotals.gapTo150Stretch).toBe(138);

    // Fleet requirement calculation:
    // Needed from fleet = 100 - 2 (from agency_ats) or based on agencyYield (2/1 = 2)
    // with aggregator giving 10/day, needed = 90.
    // 90 / 2 = 45 endpoints (P50)
    expect(report.systemTotals.requiredActiveFleetP50).toBeGreaterThan(0);
    expect(report.systemTotals.requiredActiveFleetP90).toBeGreaterThanOrEqual(
      report.systemTotals.requiredActiveFleetP50
    );
  });

  test("formatFunnelReportMarkdown renders full audit markdown structure", () => {
    const observations: SourceFunnelObservation[] = [
      {
        sourceId: "remotive",
        sourceType: "aggregator",
        rawCandidates: 35,
        qualified: 35,
        authorized: 35,
        freshPublished: 35,
        stockAbsorption: 0,
        publiclyVerified: 35,
        observedDays: 7,
      },
    ];

    const report = calculateFunnelReport(observations, 7);
    const md = formatFunnelReportMarkdown(report);

    expect(md).toContain("# Empirical First-Publication Funnel Audit (MATH-06A)");
    expect(md).toContain("Funnel Loss Ratios by Source Cohort");
    expect(md).toContain("Mathematical Capacity Estimation & Required Fleet Size");
    expect(md).toContain("Detailed Per-Source Conversion Ledger");
    expect(md).toContain("`remotive`");
  });
});
