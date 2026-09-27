import { describe, expect, test } from "bun:test";
import {
  calculateManilaDailyMetrics,
  formatPublicationReportMarkdown,
  MANILA_DAILY_FLOOR,
  MANILA_DAILY_STRETCH,
  type OpportunityPublicationRow,
} from "./measure-manila-daily-publications";

describe("measure-manila-daily-publications", () => {
  test("correctly converts UTC scraped_at to Manila date (+8 hours)", () => {
    const rows: OpportunityPublicationRow[] = [
      {
        id: 1,
        source_id: "we-work-remotely",
        source_platform: "We Work Remotely",
        posted_at: "2026-09-24T15:00:00Z",
        scraped_at: "2026-09-24T17:00:00Z", // 17:00 UTC = 01:00 Sept 25 in Manila (+8)
        is_active: 1,
        ph_eligibility: "eligible_verified",
      },
    ];

    const report = calculateManilaDailyMetrics(rows, 7, "2026-09-27T00:00:00Z");
    expect(report.days.length).toBe(7);
    const day = report.days.find((d) => d.manilaDate === "2026-09-25");
    expect(day).toBeDefined();
    expect(day!.eligibleStoredCount).toBe(1);
    expect(day!.recentPostedStorage).toBe(1);
    expect(day!.olderPostedStorage).toBe(0);
  });

  test("rigorously separates fresh arrivals (<= 48h) from backlog (> 48h)", () => {
    const rows: OpportunityPublicationRow[] = [
      {
        id: 10,
        source_id: "breezy:sourcefit",
        source_platform: "Sourcefit",
        posted_at: "2026-09-24T08:00:00Z",
        scraped_at: "2026-09-24T10:00:00Z", // 2 hours difference => RECENT
        is_active: 1,
        ph_eligibility: "eligible_verified",
      },
      {
        id: 11,
        source_id: "greenhouse:canonical",
        source_platform: "Canonical",
        posted_at: "2026-08-01T00:00:00Z", // 54 days difference => OLDER
        scraped_at: "2026-09-24T10:00:00Z",
        is_active: 1,
        ph_eligibility: "eligible_likely",
      },
    ];

    const report = calculateManilaDailyMetrics(rows, 7, "2026-09-27T00:00:00Z");
    const day = report.days.find((d) => d.manilaDate === "2026-09-24");
    expect(day).toBeDefined();
    expect(day!.eligibleStoredCount).toBe(2);
    expect(day!.recentPostedStorage).toBe(1);
    expect(day!.olderPostedStorage).toBe(1);
  });

  test("ignores inactive or ineligible items", () => {
    const rows: OpportunityPublicationRow[] = [
      {
        id: 20,
        source_id: "remote-ok",
        source_platform: "Remote OK",
        posted_at: "2026-09-25T01:00:00Z",
        scraped_at: "2026-09-25T02:00:00Z",
        is_active: 0, // INACTIVE
        ph_eligibility: "eligible_verified",
      },
      {
        id: 21,
        source_id: "remote-ok",
        source_platform: "Remote OK",
        posted_at: "2026-09-25T01:00:00Z",
        scraped_at: "2026-09-25T02:00:00Z",
        is_active: 1,
        ph_eligibility: "ineligible", // INELIGIBLE
      },
    ];

    const report = calculateManilaDailyMetrics(rows, 7, "2026-09-27T00:00:00Z");
    expect(report.days.every((d) => d.eligibleStoredCount === 0)).toBe(true);
  });

  test("formats markdown report properly", () => {
    const rows: OpportunityPublicationRow[] = [
      {
        id: 30,
        source_id: "breezy:20four7va",
        source_platform: "20Four7VA",
        posted_at: "2026-09-25T04:00:00Z",
        scraped_at: "2026-09-25T05:00:00Z",
        is_active: 1,
        ph_eligibility: "eligible_verified",
      },
    ];
    const report = calculateManilaDailyMetrics(rows, 7, "2026-09-27T00:00:00Z");
    const md = formatPublicationReportMarkdown(report);
    expect(md).toContain("# Manila-Day Current Eligible Storage Diagnostic");
    expect(md).toContain("breezy");
    expect(md).toContain("2026-09-25");
  });
});
