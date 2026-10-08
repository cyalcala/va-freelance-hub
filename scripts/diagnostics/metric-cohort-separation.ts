/**
 * MATH-05 P0 Metric Diagnostics Helper
 *
 * Separates three distinct measurements that are currently conflated:
 * 1. LEDGER_PUBLISHED_COUNT — what source_publication_ledger.published_count claims
 * 2. RECEIPT_BACKED_FRESH_DISCOVERY — provisional unique-ID cohorts from supplied exposure evidence
 * 3. SCRAPED_AT_STORAGE_PROXY — measure-manila-daily-publications.ts proxy (current inventory by storage date)
 *
 * These are NOT equivalent. The storage proxy is a necessary-but-not-sufficient signal.
 * Storage clocks and D1 sync are not first public exposure. Historical authority,
 * canonical linkage, replay provenance and visibility coverage remain unverified.
 * Unknown dates are OTHER_NON_FRESH, never FRESH_DISCOVERY.
 */

import { completeManilaWindow, type ManilaWindow } from "./measure-manila-daily-publications";

export const MANILA_OFFSET_MS = 8 * 3_600_000;
const DAY_MS = 86_400_000;

export type CreationCohort =
  | "FRESH_DISCOVERY"
  | "BACKLOG_IMPORT"
  | "REACTIVATION"
  | "REPLAY_RECOVERY"
  | "OTHER_NON_FRESH";

export interface LedgerPublicationRow {
  ledgerId: number;
  sourceId: string;
  decidedAt: string;
  manilaDate: string;
  opportunityId: number;
  mode: string;
  publishedCount: number;
  publishedIdsJson: string;
}

export interface OpportunityRow {
  id: number;
  sourceId: string | null;
  sourcePostedAt: string | null;
  /** Explicit first public exposure from evidence; never alias scraped_at/created_at. */
  firstPublicAt: string | null;
  phEligibility: string | null;
  isActive: number;
}

export interface SourceRegistryRow {
  sourceId: string;
  operationalState: string;
  complianceState: string;
}

export interface CohortPartitionedRow {
  ledgerId: number;
  sourceId: string;
  manilaDate: string;
  decidedAt: string;
  opportunityId: number;
  title: string | null;
  company: string | null;
  sourcePostedAt: string | null;
  firstPublicAt: string | null;
  phEligibility: string | null;
  isActive: number;
  operationalState: string;
  complianceState: string;
  creationCohort: CreationCohort;
}

export interface DailyCohortMetrics {
  manilaDate: string;
  totalPublishedToday: number;
  freshDiscoveryDailyFlow: number;
  backlogImportsCohort: number;
  reactivationsCohort: number;
  replayRecoveryCohort: number;
  otherNonFreshCohort: number;
  receiptBackedCount: number; // rows with non-empty published_ids_json
  ledgerPublishedCountSum: number; // sum of published_count from ledger
}

export interface CohortSeparationReport {
  measuredAt: string;
  window: ManilaWindow;
  days: DailyCohortMetrics[];
  summary: {
    freshFlowCertification: "UNKNOWN";
    totalEvaluatedDays: number;
    totalLedgerPublishedCount: number;
    totalReceiptBacked: number;
    totalFreshDiscoveryFlow: number;
    totalBacklogImports: number;
    totalReactivations: number;
    totalReplayRecovery: number;
    totalOtherNonFresh: number;
    gapLedgerVsReceipt: number;
    gapReceiptVsFreshDiscovery: number;
    limitations: string[];
  };
}

/** Parse SQLite timestamp (UTC or ISO with offset) to epoch ms. */
function timestampMs(value: string): number {
  const normalized = value.trim().replace(" ", "T");
  return Date.parse(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized) ? normalized : `${normalized}Z`);
}

function receiptIds(raw: string): number[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? [...new Set(parsed.filter((id): id is number => Number.isSafeInteger(id) && id > 0))]
      : [];
  } catch {
    return [];
  }
}

function eligibleDailyLedgerRows(rows: LedgerPublicationRow[], window: ManilaWindow): LedgerPublicationRow[] {
  const seen = new Set<number>();
  return [...rows].sort((a, b) => timestampMs(a.decidedAt) - timestampMs(b.decidedAt) || a.ledgerId - b.ledgerId)
    .filter((row) => {
      if (!["unlimited", "capped"].includes(row.mode) || !Number.isSafeInteger(row.publishedCount) || row.publishedCount <= 0) return false;
      const decidedMs = timestampMs(row.decidedAt);
      if (!Number.isFinite(decidedMs) || !window.dates.includes(row.manilaDate)) return false;
      if (new Date(decidedMs + MANILA_OFFSET_MS).toISOString().slice(0, 10) !== row.manilaDate) return false;
      if (!Number.isSafeInteger(row.ledgerId) || row.ledgerId <= 0 || seen.has(row.ledgerId)) return false;
      seen.add(row.ledgerId);
      return true;
    });
}

/** Classify a single opportunity into exactly one creation cohort. */
export function classifyCreationCohort(
  row: CohortPartitionedRow,
  manilaDayStartUtc: string,
): CreationCohort {
  const firstMs = row.firstPublicAt == null ? NaN : timestampMs(row.firstPublicAt);
  const startMs = timestampMs(manilaDayStartUtc);
  const decidedMs = timestampMs(row.decidedAt);
  if (!Number.isFinite(firstMs) || !Number.isFinite(startMs) || !Number.isFinite(decidedMs)) return "OTHER_NON_FRESH";
  // A prior exposure is outside the first-publication cohort; event provenance is still incomplete.
  if (firstMs < startMs) {
    return "REACTIVATION";
  }

  if (firstMs >= startMs + DAY_MS) return "OTHER_NON_FRESH";

  // BACKLOG_IMPORT: posting older than 7 days before evidenced first public exposure.
  if (row.sourcePostedAt) {
    const postedMs = timestampMs(row.sourcePostedAt);
    const ageDays = (firstMs - postedMs) / DAY_MS;
    if (Number.isFinite(ageDays) && ageDays > 7.0) {
      return "BACKLOG_IMPORT";
    }
    // Provisional fresh age; replay provenance and publication-time authority are not certified.
    if (Number.isFinite(ageDays) && ageDays >= 0 && ageDays <= 7.0) {
      return "FRESH_DISCOVERY";
    }
    // Future dates or unparseable -> OTHER_NON_FRESH
  }

  // Unknown source_posted_at or unparseable -> OTHER_NON_FRESH (never FRESH_DISCOVERY)
  return "OTHER_NON_FRESH";
}

/**
 * Partition ledger publications into mutually exclusive creation cohorts.
 * Fixture diagnostic only; current registry/eligibility cannot certify historical authority.
 */
export function partitionPublicationsByCohort(
  ledgerRows: LedgerPublicationRow[],
  opportunities: Map<number, OpportunityRow>,
  sourceRegistry: Map<string, SourceRegistryRow>,
  window: ManilaWindow,
): CohortPartitionedRow[] {
  const partitioned: CohortPartitionedRow[] = [];
  const seen = new Set<string>();

  for (const ledger of eligibleDailyLedgerRows(ledgerRows, window)) {
    for (const oppId of receiptIds(ledger.publishedIdsJson)) {
      const opp = opportunities.get(oppId);
      if (!opp) continue;

      const registry = sourceRegistry.get(ledger.sourceId);
      if (!registry) continue;

      // Filter per Query 1: ph_eligibility = 'eligible_verified', operational IN ('active','canary'), compliance IN ('allowed','conditional')
      if (opp.phEligibility !== "eligible_verified") continue;
      if (!["active", "canary"].includes(registry.operationalState)) continue;
      if (!["allowed", "conditional"].includes(registry.complianceState)) continue;

      const key = `${ledger.manilaDate}:${oppId}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const manilaDayStartUtc = window.dates.includes(ledger.manilaDate)
        ? new Date(`${ledger.manilaDate}T00:00:00+08:00`).toISOString()
        : "";

      const cohort = classifyCreationCohort(
        {
          ledgerId: ledger.ledgerId,
          sourceId: ledger.sourceId,
          manilaDate: ledger.manilaDate,
          decidedAt: ledger.decidedAt,
          opportunityId: oppId,
          title: null,
          company: null,
          sourcePostedAt: opp.sourcePostedAt,
          firstPublicAt: opp.firstPublicAt ?? null,
          phEligibility: opp.phEligibility,
          isActive: opp.isActive,
          operationalState: registry.operationalState,
          complianceState: registry.complianceState,
          creationCohort: "OTHER_NON_FRESH",
        },
        manilaDayStartUtc,
      );

      partitioned.push({
        ledgerId: ledger.ledgerId,
        sourceId: ledger.sourceId,
        manilaDate: ledger.manilaDate,
        decidedAt: ledger.decidedAt,
        opportunityId: oppId,
        title: null,
        company: null,
        sourcePostedAt: opp.sourcePostedAt,
        firstPublicAt: opp.firstPublicAt ?? null,
        phEligibility: opp.phEligibility,
        isActive: opp.isActive,
        operationalState: registry.operationalState,
        complianceState: registry.complianceState,
        creationCohort: cohort,
      });
    }
  }

  return partitioned;
}

/** Aggregate partitioned rows into daily cohort metrics. */
export function aggregateDailyCohortMetrics(
  partitioned: CohortPartitionedRow[],
  window: ManilaWindow,
  ledgerRows: LedgerPublicationRow[],
): DailyCohortMetrics[] {
  const dayMap = new Map<string, DailyCohortMetrics>();

  for (const date of window.dates) {
    dayMap.set(date, {
      manilaDate: date,
      totalPublishedToday: 0,
      freshDiscoveryDailyFlow: 0,
      backlogImportsCohort: 0,
      reactivationsCohort: 0,
      replayRecoveryCohort: 0,
      otherNonFreshCohort: 0,
      receiptBackedCount: 0,
      ledgerPublishedCountSum: 0,
    });
  }

  // Raw claims are counted once per ledger; IDs once per opportunity/day.
  const receiptSeen = new Set<string>();
  for (const ledger of eligibleDailyLedgerRows(ledgerRows, window)) {
    const day = dayMap.get(ledger.manilaDate);
    if (!day) continue;
    day.ledgerPublishedCountSum += ledger.publishedCount;
    for (const id of receiptIds(ledger.publishedIdsJson)) {
      const key = `${ledger.manilaDate}:${id}`;
      if (receiptSeen.has(key)) continue;
      receiptSeen.add(key);
      day.receiptBackedCount += 1;
    }
  }

  // Defend direct callers too; earliest receipt wins deterministically.
  const cohortSeen = new Set<string>();
  for (const row of [...partitioned].sort((a, b) => timestampMs(a.decidedAt) - timestampMs(b.decidedAt) || a.ledgerId - b.ledgerId)) {
    const day = dayMap.get(row.manilaDate);
    if (!day) continue;
    if (!Number.isSafeInteger(row.opportunityId) || row.opportunityId <= 0) continue;
    const key = `${row.manilaDate}:${row.opportunityId}`;
    if (cohortSeen.has(key)) continue;
    cohortSeen.add(key);
    day.totalPublishedToday += 1;
    switch (row.creationCohort) {
      case "FRESH_DISCOVERY":
        day.freshDiscoveryDailyFlow += 1;
        break;
      case "BACKLOG_IMPORT":
        day.backlogImportsCohort += 1;
        break;
      case "REACTIVATION":
        day.reactivationsCohort += 1;
        break;
      case "REPLAY_RECOVERY":
        day.replayRecoveryCohort += 1;
        break;
      case "OTHER_NON_FRESH":
        day.otherNonFreshCohort += 1;
        break;
    }
  }

  return window.dates.map((d) => dayMap.get(d)!);
}

/** Generate full cohort separation report. */
export function generateCohortSeparationReport(
  ledgerRows: LedgerPublicationRow[],
  opportunities: Map<number, OpportunityRow>,
  sourceRegistry: Map<string, SourceRegistryRow>,
  targetDays = 7,
  now: Date | string = new Date(),
): CohortSeparationReport {
  const window = completeManilaWindow(targetDays, now);
  const partitioned = partitionPublicationsByCohort(ledgerRows, opportunities, sourceRegistry, window);
  const days = aggregateDailyCohortMetrics(partitioned, window, ledgerRows);

  const totalLedgerPublishedCount = days.reduce((sum, d) => sum + d.ledgerPublishedCountSum, 0);
  const totalReceiptBacked = days.reduce((sum, d) => sum + d.receiptBackedCount, 0);
  const totalFreshDiscoveryFlow = days.reduce((sum, d) => sum + d.freshDiscoveryDailyFlow, 0);
  const totalBacklogImports = days.reduce((sum, d) => sum + d.backlogImportsCohort, 0);
  const totalReactivations = days.reduce((sum, d) => sum + d.reactivationsCohort, 0);
  const totalReplayRecovery = days.reduce((sum, d) => sum + d.replayRecoveryCohort, 0);
  const totalOtherNonFresh = days.reduce((sum, d) => sum + d.otherNonFreshCohort, 0);

  return {
    measuredAt: window.measuredAt,
    window,
    days,
    summary: {
      freshFlowCertification: "UNKNOWN",
      totalEvaluatedDays: targetDays,
      totalLedgerPublishedCount,
      totalReceiptBacked,
      totalFreshDiscoveryFlow,
      totalBacklogImports,
      totalReactivations,
      totalReplayRecovery,
      totalOtherNonFresh,
      gapLedgerVsReceipt: totalLedgerPublishedCount - totalReceiptBacked,
      gapReceiptVsFreshDiscovery: totalReceiptBacked - totalFreshDiscoveryFlow,
      limitations: [
        "LEDGER_PUBLISHED_COUNT: sum of published_count from source_publication_ledger; may count reactivations and lack receipt IDs.",
        "RECEIPT_BACKED: unique valid positive integer opportunity IDs per Manila day; duplicate receipts cannot inflate this count.",
        "FRESH_DISCOVERY: provisional unique-ID cohort using supplied explicit firstPublicAt and fresh posting age (<=7 days); missing exposure stays non-fresh.",
        "Certification UNKNOWN: publication-time authority/qualification, complete first-exposure history, canonical cross-source linkage and observed public visibility are not proven by this helper.",
        "Grouping is by receipt decision day; visibility after a Manila midnight boundary needs its own exposure-day accounting, not a relabeled receipt.",
        "BACKLOG_IMPORT: posting >7 days before evidenced first exposure; storage/sync clocks cannot substitute for exposure.",
        "REACTIVATION: prior exposure predates the day; replay vs activation requires separate event provenance.",
        "REPLAY_RECOVERY: not distinguishable from schema alone; requires replay flag (not a column).",
        "OTHER_NON_FRESH: unknown/missing source_posted_at, future dates, or unclassifiable.",
        "Unknown dates are NEVER classified as FRESH_DISCOVERY (per Constitution §3.2 #4, ACCEPTED_PARAMETERS unknown_date_policy).",
      ],
    },
  };
}

/** Format report as markdown for CLI output. */
export function formatCohortSeparationReportMarkdown(report: CohortSeparationReport): string {
  const lines = [
    "# Cohort Separation Diagnostic (MATH-05 P0)",
    "",
    `**Measured at:** ${report.measuredAt}`,
    `**Window:** [${report.window.startInclusive}, ${report.window.endExclusive}) — ${report.days.length} complete Asia/Manila days.`,
    `**Verified fresh-flow certification:** ${report.summary.freshFlowCertification}. Cohort counts below are provisional.`,
    "",
    "## Three Measurement Layers (NOT equivalent)",
    "",
    "| Metric | Definition | Current Status |",
    "| :--- | :--- | :--- |",
    `| **LEDGER_PUBLISHED_COUNT** | Sum of \`published_count\` from \`source_publication_ledger\` (modes unlimited/capped) | ${report.summary.totalLedgerPublishedCount} |`,
    `| **RECEIPT_BACKED** | Unique valid opportunity IDs per complete Manila day | ${report.summary.totalReceiptBacked} |`,
    `| **FRESH_DISCOVERY (provisional)** | Receipt-backed + fresh posting age + explicit first exposure; certification UNKNOWN | ${report.summary.totalFreshDiscoveryFlow} |`,
    "",
    "## Cohort Gaps",
    "",
    `- **Ledger → Receipt gap:** ${report.summary.gapLedgerVsReceipt} (published_count without receipt IDs)`,
    `- **Receipt → Fresh Discovery gap:** ${report.summary.gapReceiptVsFreshDiscovery} (receipt-backed but not fresh discovery)`,
    `- **Backlog Imports:** ${report.summary.totalBacklogImports}`,
    `- **Reactivations:** ${report.summary.totalReactivations}`,
    `- **Replay Recovery:** ${report.summary.totalReplayRecovery} (schema cannot distinguish; requires replay flag)`,
    `- **Other Non-Fresh:** ${report.summary.totalOtherNonFresh}`,
    "",
    "## Daily Breakdown",
    "",
    "| Manila Date | Ledger Count | Receipt Backed | Fresh Discovery | Backlog Import | Reactivation | Replay Recovery | Other Non-Fresh |",
    "| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
  ];

  for (const day of report.days) {
    lines.push(
      `| ${day.manilaDate} | ${day.ledgerPublishedCountSum} | ${day.receiptBackedCount} | ${day.freshDiscoveryDailyFlow} | ${day.backlogImportsCohort} | ${day.reactivationsCohort} | ${day.replayRecoveryCohort} | ${day.otherNonFreshCohort} |`,
    );
  }

  lines.push("", "## Limitations", "");
  for (const lim of report.summary.limitations) {
    lines.push(`- ${lim}`);
  }

  return lines.join("\n");
}

if (import.meta.main) {
  console.log("MATH-05 P0 Metric Cohort Separation Helper");
  console.log("Usage: import { generateCohortSeparationReport, ... } from './metric-cohort-separation';");
  console.log("Provide ledgerRows, opportunities Map, sourceRegistry Map, and targetDays.");
}
