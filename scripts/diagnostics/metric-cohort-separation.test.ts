import { describe, test, expect } from "bun:test";
import {
  classifyCreationCohort,
  partitionPublicationsByCohort,
  aggregateDailyCohortMetrics,
  generateCohortSeparationReport,
  formatCohortSeparationReportMarkdown,
  type LedgerPublicationRow,
  type OpportunityRow,
  type SourceRegistryRow,
  type ManilaWindow,
  type CohortPartitionedRow,
} from "./metric-cohort-separation";

const NOW = "2026-09-10T12:00:00.000Z";
const MANILA_DATES = ["2026-09-09", "2026-09-08", "2026-09-07", "2026-09-06", "2026-09-05", "2026-09-04", "2026-09-03"];

const WINDOW: ManilaWindow = {
  measuredAt: NOW,
  startInclusive: "2026-09-03T16:00:00.000Z",
  endExclusive: "2026-09-10T16:00:00.000Z",
  timeZone: "Asia/Manila",
  dates: MANILA_DATES,
};

function makeLedgerRow(
  ledgerId: number,
  sourceId: string,
  manilaDate: string,
  publishedCount: number,
  publishedIds: number[],
  mode = "unlimited",
): LedgerPublicationRow {
  return {
    ledgerId,
    sourceId,
    decidedAt: `${manilaDate}T04:00:00.000Z`, // 00:00 Manila = 16:00 UTC previous day
    manilaDate,
    opportunityId: publishedIds[0] ?? 0,
    mode,
    publishedCount,
    publishedIdsJson: JSON.stringify(publishedIds),
  };
}

// Manila day "2026-09-09" starts at 2026-09-08T16:00:00.000Z UTC
const MANILA_DAY_START_UTC = "2026-09-08T16:00:00.000Z";

function makeOpportunity(
  id: number,
  sourceId: string,
  sourcePostedAt: string | null,
  createdAt: string,
  phEligibility = "eligible_verified",
  isActive = 1,
): OpportunityRow {
  return { id, sourceId, sourcePostedAt, createdAt, phEligibility, isActive };
}

function makeRegistry(sourceId: string, operationalState = "active", complianceState = "allowed"): SourceRegistryRow {
  return { sourceId, operationalState, complianceState };
}

describe("MATH-05 P0: Metric Cohort Separation — Fixture Tests", () => {
  describe("classifyCreationCohort", () => {
    const manilaDayStartUtc = MANILA_DAY_START_UTC; // 2026-09-09 00:00 Manila = 2026-09-08T16:00:00Z

    test("REACTIVATION: created_at before Manila day window", () => {
      const row: CohortPartitionedRow = {
        ledgerId: 1,
        sourceId: "test:source",
        manilaDate: "2026-09-10",
        decidedAt: "2026-09-10T04:00:00.000Z",
        opportunityId: 1,
        title: "Job",
        company: "Co",
        sourcePostedAt: "2026-09-09T12:00:00.000Z",
        firstPublicAt: "2026-09-08T12:00:00.000Z", // before day window
        phEligibility: "eligible_verified",
        isActive: 1,
        operationalState: "active",
        complianceState: "allowed",
        creationCohort: "OTHER_NON_FRESH",
      };
      expect(classifyCreationCohort(row, manilaDayStartUtc)).toBe("REACTIVATION");
    });

    test("BACKLOG_IMPORT: source_posted_at > 7 days before created_at", () => {
      const row: CohortPartitionedRow = {
        ledgerId: 1,
        sourceId: "test:source",
        manilaDate: "2026-09-10",
        decidedAt: "2026-09-10T04:00:00.000Z",
        opportunityId: 1,
        title: "Job",
        company: "Co",
        sourcePostedAt: "2026-08-20T12:00:00.000Z", // 20 days before
        firstPublicAt: "2026-09-09T12:00:00.000Z",
        phEligibility: "eligible_verified",
        isActive: 1,
        operationalState: "active",
        complianceState: "allowed",
        creationCohort: "OTHER_NON_FRESH",
      };
      expect(classifyCreationCohort(row, manilaDayStartUtc)).toBe("BACKLOG_IMPORT");
    });

    test("FRESH_DISCOVERY: source_posted_at within 7 days of created_at", () => {
      const row: CohortPartitionedRow = {
        ledgerId: 1,
        sourceId: "test:source",
        manilaDate: "2026-09-10",
        decidedAt: "2026-09-10T04:00:00.000Z",
        opportunityId: 1,
        title: "Job",
        company: "Co",
        sourcePostedAt: "2026-09-05T12:00:00.000Z", // 4 days before
        firstPublicAt: "2026-09-09T12:00:00.000Z",
        phEligibility: "eligible_verified",
        isActive: 1,
        operationalState: "active",
        complianceState: "allowed",
        creationCohort: "OTHER_NON_FRESH",
      };
      expect(classifyCreationCohort(row, manilaDayStartUtc)).toBe("FRESH_DISCOVERY");
    });

    test("FRESH_DISCOVERY: exactly 7 days age (inclusive)", () => {
      const row: CohortPartitionedRow = {
        ledgerId: 1,
        sourceId: "test:source",
        manilaDate: "2026-09-10",
        decidedAt: "2026-09-10T04:00:00.000Z",
        opportunityId: 1,
        title: "Job",
        company: "Co",
        sourcePostedAt: "2026-09-02T12:00:00.000Z", // exactly 7 days
        firstPublicAt: "2026-09-09T12:00:00.000Z",
        phEligibility: "eligible_verified",
        isActive: 1,
        operationalState: "active",
        complianceState: "allowed",
        creationCohort: "OTHER_NON_FRESH",
      };
      expect(classifyCreationCohort(row, manilaDayStartUtc)).toBe("FRESH_DISCOVERY");
    });

    test("OTHER_NON_FRESH: null source_posted_at", () => {
      const row: CohortPartitionedRow = {
        ledgerId: 1,
        sourceId: "test:source",
        manilaDate: "2026-09-10",
        decidedAt: "2026-09-10T04:00:00.000Z",
        opportunityId: 1,
        title: "Job",
        company: "Co",
        sourcePostedAt: null,
        firstPublicAt: "2026-09-09T12:00:00.000Z",
        phEligibility: "eligible_verified",
        isActive: 1,
        operationalState: "active",
        complianceState: "allowed",
        creationCohort: "OTHER_NON_FRESH",
      };
      expect(classifyCreationCohort(row, manilaDayStartUtc)).toBe("OTHER_NON_FRESH");
    });

    test("OTHER_NON_FRESH: future source_posted_at (ageMs < 0)", () => {
      const row: CohortPartitionedRow = {
        ledgerId: 1,
        sourceId: "test:source",
        manilaDate: "2026-09-10",
        decidedAt: "2026-09-10T04:00:00.000Z",
        opportunityId: 1,
        title: "Job",
        company: "Co",
        sourcePostedAt: "2026-09-10T12:00:00.000Z", // after created_at
        firstPublicAt: "2026-09-09T12:00:00.000Z",
        phEligibility: "eligible_verified",
        isActive: 1,
        operationalState: "active",
        complianceState: "allowed",
        creationCohort: "OTHER_NON_FRESH",
      };
      expect(classifyCreationCohort(row, manilaDayStartUtc)).toBe("OTHER_NON_FRESH");
    });

    test("OTHER_NON_FRESH: unparseable source_posted_at", () => {
      const row: CohortPartitionedRow = {
        ledgerId: 1,
        sourceId: "test:source",
        manilaDate: "2026-09-10",
        decidedAt: "2026-09-10T04:00:00.000Z",
        opportunityId: 1,
        title: "Job",
        company: "Co",
        sourcePostedAt: "not-a-date",
        firstPublicAt: "2026-09-09T12:00:00.000Z",
        phEligibility: "eligible_verified",
        isActive: 1,
        operationalState: "active",
        complianceState: "allowed",
        creationCohort: "OTHER_NON_FRESH",
      };
      expect(classifyCreationCohort(row, manilaDayStartUtc)).toBe("OTHER_NON_FRESH");
    });
  });

  describe("partitionPublicationsByCohort", () => {
    test("partitions into mutually exclusive cohorts", () => {
      const ledgerRows: LedgerPublicationRow[] = [
        // Fresh discovery: posted 3 days before created, published on 2026-09-09
        makeLedgerRow(1, "we-work-remotely", "2026-09-09", 1, [1]),
        // Backlog import: posted 10 days before
        makeLedgerRow(2, "remotive", "2026-09-09", 1, [2]),
        // Reactivation: created before window
        makeLedgerRow(3, "remote-ok", "2026-09-09", 1, [3]),
        // Other non-fresh: null posted_at
        makeLedgerRow(4, "jobicy-admin-support-apac", "2026-09-09", 1, [4]),
      ];

      const opportunities = new Map<number, OpportunityRow>([
        [1, makeOpportunity(1, "we-work-remotely", "2026-09-06T12:00:00.000Z", "2026-09-09T10:00:00.000Z")], // 3 days
        [2, makeOpportunity(2, "remotive", "2026-08-25T12:00:00.000Z", "2026-09-09T10:00:00.000Z")], // 15 days
        [3, makeOpportunity(3, "remote-ok", "2026-09-05T12:00:00.000Z", "2026-09-02T10:00:00.000Z")], // created before window
        [4, makeOpportunity(4, "jobicy-admin-support-apac", null, "2026-09-09T10:00:00.000Z")],
      ]);

      const sourceRegistry = new Map<string, SourceRegistryRow>([
        ["we-work-remotely", makeRegistry("we-work-remotely")],
        ["remotive", makeRegistry("remotive")],
        ["remote-ok", makeRegistry("remote-ok")],
        ["jobicy-admin-support-apac", makeRegistry("jobicy-admin-support-apac")],
      ]);

      const partitioned = partitionPublicationsByCohort(ledgerRows, opportunities, sourceRegistry, WINDOW);

      expect(partitioned.length).toBe(4);
      const cohorts = partitioned.map((r) => r.creationCohort).sort();
      expect(cohorts).toEqual(["BACKLOG_IMPORT", "FRESH_DISCOVERY", "OTHER_NON_FRESH", "REACTIVATION"]);
    });

    test("filters out ineligible ph_eligibility", () => {
      const ledgerRows = [makeLedgerRow(1, "we-work-remotely", "2026-09-09", 1, [1])];
      const opportunities = new Map([[1, makeOpportunity(1, "we-work-remotely", "2026-09-06T12:00:00.000Z", "2026-09-09T10:00:00.000Z", "ineligible")]]);
      const sourceRegistry = new Map([["we-work-remotely", makeRegistry("we-work-remotely")]]);

      const partitioned = partitionPublicationsByCohort(ledgerRows, opportunities, sourceRegistry, WINDOW);
      expect(partitioned.length).toBe(0);
    });

    test("filters out non-active/canary operational state", () => {
      const ledgerRows = [makeLedgerRow(1, "we-work-remotely", "2026-09-09", 1, [1])];
      const opportunities = new Map([[1, makeOpportunity(1, "we-work-remotely", "2026-09-06T12:00:00.000Z", "2026-09-09T10:00:00.000Z")]]);
      const sourceRegistry = new Map([["we-work-remotely", makeRegistry("we-work-remotely", "candidate")]]);

      const partitioned = partitionPublicationsByCohort(ledgerRows, opportunities, sourceRegistry, WINDOW);
      expect(partitioned.length).toBe(0);
    });

    test("filters out non-allowed/conditional compliance state", () => {
      const ledgerRows = [makeLedgerRow(1, "we-work-remotely", "2026-09-09", 1, [1])];
      const opportunities = new Map([[1, makeOpportunity(1, "we-work-remotely", "2026-09-06T12:00:00.000Z", "2026-09-09T10:00:00.000Z")]]);
      const sourceRegistry = new Map([["we-work-remotely", makeRegistry("we-work-remotely", "active", "needs_review")]]);

      const partitioned = partitionPublicationsByCohort(ledgerRows, opportunities, sourceRegistry, WINDOW);
      expect(partitioned.length).toBe(0);
    });

    test("ignores blocked/rolled_back modes and zero publishedCount", () => {
      const ledgerRows: LedgerPublicationRow[] = [
        makeLedgerRow(1, "we-work-remotely", "2026-09-09", 1, [1], "unlimited"),
        makeLedgerRow(2, "remotive", "2026-09-09", 0, [], "unlimited"),
        makeLedgerRow(3, "remote-ok", "2026-09-09", 1, [2], "blocked"),
        makeLedgerRow(4, "jobicy-admin-support-apac", "2026-09-09", 1, [3], "rolled_back"),
      ];
      const opportunities = new Map([
        [1, makeOpportunity(1, "we-work-remotely", "2026-09-06T12:00:00.000Z", "2026-09-09T10:00:00.000Z")],
        [2, makeOpportunity(2, "remotive", "2026-09-06T12:00:00.000Z", "2026-09-09T10:00:00.000Z")],
        [3, makeOpportunity(3, "remote-ok", "2026-09-06T12:00:00.000Z", "2026-09-09T10:00:00.000Z")],
      ]);
      const sourceRegistry = new Map([
        ["we-work-remotely", makeRegistry("we-work-remotely")],
        ["remotive", makeRegistry("remotive")],
        ["remote-ok", makeRegistry("remote-ok")],
        ["jobicy-admin-support-apac", makeRegistry("jobicy-admin-support-apac")],
      ]);

      const partitioned = partitionPublicationsByCohort(ledgerRows, opportunities, sourceRegistry, WINDOW);
      expect(partitioned.length).toBe(1);
      expect(partitioned[0].opportunityId).toBe(1);
    });

    test("empty published_ids_json yields zero receipt-backed count", () => {
      const ledgerRows = [makeLedgerRow(1, "we-work-remotely", "2026-09-09", 5, [])]; // publishedCount=5 but empty IDs
      const opportunities = new Map([[1, makeOpportunity(1, "we-work-remotely", "2026-09-06T12:00:00.000Z", "2026-09-09T10:00:00.000Z")]]);
      const sourceRegistry = new Map([["we-work-remotely", makeRegistry("we-work-remotely")]]);

      const partitioned = partitionPublicationsByCohort(ledgerRows, opportunities, sourceRegistry, WINDOW);
      expect(partitioned.length).toBe(0); // no IDs to partition
    });
  });

  describe("aggregateDailyCohortMetrics", () => {
    test("aggregates cohorts and receipt-backed counts correctly", () => {
      const ledgerRows: LedgerPublicationRow[] = [
        makeLedgerRow(1, "we-work-remotely", "2026-09-09", 3, [1, 2, 3]), // 3 receipt IDs
        makeLedgerRow(2, "remotive", "2026-09-09", 2, []), // 0 receipt IDs
        makeLedgerRow(3, "remote-ok", "2026-09-08", 1, [4]),
      ];

      const partitioned: CohortPartitionedRow[] = [
        { ledgerId: 1, sourceId: "we-work-remotely", manilaDate: "2026-09-09", decidedAt: "", opportunityId: 1, title: "", company: "", sourcePostedAt: "2026-09-06T00:00:00.000Z", firstPublicAt: "2026-09-09T00:00:00.000Z", phEligibility: "", isActive: 1, operationalState: "", complianceState: "", creationCohort: "FRESH_DISCOVERY" },
        { ledgerId: 1, sourceId: "we-work-remotely", manilaDate: "2026-09-09", decidedAt: "", opportunityId: 2, title: "", company: "", sourcePostedAt: "2026-08-20T00:00:00.000Z", firstPublicAt: "2026-09-09T00:00:00.000Z", phEligibility: "", isActive: 1, operationalState: "", complianceState: "", creationCohort: "BACKLOG_IMPORT" },
        { ledgerId: 1, sourceId: "we-work-remotely", manilaDate: "2026-09-09", decidedAt: "", opportunityId: 3, title: "", company: "", sourcePostedAt: null, firstPublicAt: "2026-09-02T00:00:00.000Z", phEligibility: "", isActive: 1, operationalState: "", complianceState: "", creationCohort: "REACTIVATION" },
        { ledgerId: 3, sourceId: "remote-ok", manilaDate: "2026-09-08", decidedAt: "", opportunityId: 4, title: "", company: "", sourcePostedAt: "2026-09-05T00:00:00.000Z", firstPublicAt: "2026-09-08T00:00:00.000Z", phEligibility: "", isActive: 1, operationalState: "", complianceState: "", creationCohort: "FRESH_DISCOVERY" },
      ];

      const days = aggregateDailyCohortMetrics(partitioned, WINDOW, ledgerRows);

      const day09 = days.find((d) => d.manilaDate === "2026-09-09")!;
      expect(day09.ledgerPublishedCountSum).toBe(5); // 3 + 2
      expect(day09.receiptBackedCount).toBe(3); // only first ledger has IDs
      expect(day09.freshDiscoveryDailyFlow).toBe(1);
      expect(day09.backlogImportsCohort).toBe(1);
      expect(day09.reactivationsCohort).toBe(1);
      expect(day09.otherNonFreshCohort).toBe(0);

      const day08 = days.find((d) => d.manilaDate === "2026-09-08")!;
      expect(day08.ledgerPublishedCountSum).toBe(1);
      expect(day08.receiptBackedCount).toBe(1);
      expect(day08.freshDiscoveryDailyFlow).toBe(1);
    });

    test("includes all window dates even with zero data", () => {
      const days = aggregateDailyCohortMetrics([], WINDOW, []);
      expect(days.length).toBe(7);
      for (const day of days) {
        expect(MANILA_DATES).toContain(day.manilaDate);
        expect(day.totalPublishedToday).toBe(0);
        expect(day.ledgerPublishedCountSum).toBe(0);
      }
    });
  });

  describe("generateCohortSeparationReport", () => {
    test("produces report with correct gaps", () => {
      const ledgerRows: LedgerPublicationRow[] = [
        makeLedgerRow(1, "we-work-remotely", "2026-09-09", 10, [1, 2, 3]), // 10 claimed, 3 receipt
        makeLedgerRow(2, "remotive", "2026-09-09", 5, [4, 5]), // 5 claimed, 2 receipt
      ];

      const opportunities = new Map<number, OpportunityRow>([
        [1, makeOpportunity(1, "we-work-remotely", "2026-09-06T12:00:00.000Z", "2026-09-09T10:00:00.000Z")], // fresh
        [2, makeOpportunity(2, "we-work-remotely", "2026-08-20T12:00:00.000Z", "2026-09-09T10:00:00.000Z")], // backlog
        [3, makeOpportunity(3, "we-work-remotely", null, "2026-09-02T10:00:00.000Z")], // reactivation
        [4, makeOpportunity(4, "remotive", "2026-09-06T12:00:00.000Z", "2026-09-09T10:00:00.000Z")], // fresh
        [5, makeOpportunity(5, "remotive", "2026-09-06T12:00:00.000Z", "2026-09-09T10:00:00.000Z")], // fresh
      ]);

      const sourceRegistry = new Map<string, SourceRegistryRow>([
        ["we-work-remotely", makeRegistry("we-work-remotely")],
        ["remotive", makeRegistry("remotive")],
      ]);

      const report = generateCohortSeparationReport(ledgerRows, opportunities, sourceRegistry, 7, NOW);

      expect(report.summary.totalLedgerPublishedCount).toBe(15);
      expect(report.summary.totalReceiptBacked).toBe(5);
      expect(report.summary.gapLedgerVsReceipt).toBe(10);
      expect(report.summary.totalFreshDiscoveryFlow).toBe(3); // IDs 1, 4, 5
      expect(report.summary.totalBacklogImports).toBe(1); // ID 2
      expect(report.summary.totalReactivations).toBe(1); // ID 3
      expect(report.summary.gapReceiptVsFreshDiscovery).toBe(2); // 5 - 3
    });
  });

  describe("formatCohortSeparationReportMarkdown", () => {
    test("renders markdown with three measurement layers", () => {
      const report = generateCohortSeparationReport([], new Map(), new Map(), 1, NOW);
      const md = formatCohortSeparationReportMarkdown(report);

      expect(md).toContain("# Cohort Separation Diagnostic (MATH-05 P0)");
      expect(md).toContain("LEDGER_PUBLISHED_COUNT");
      expect(md).toContain("RECEIPT_BACKED");
      expect(md).toContain("FRESH_DISCOVERY");
      expect(md).toContain("Ledger → Receipt gap");
      expect(md).toContain("Receipt → Fresh Discovery gap");
    });
  });
});