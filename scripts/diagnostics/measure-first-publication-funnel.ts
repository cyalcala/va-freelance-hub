/** Inventory evidence for a funnel; missing pipeline stages remain UNKNOWN. */
import { execFileSync } from "node:child_process";
import { completeManilaWindow, FRESHNESS_WINDOW_SECONDS, type ManilaWindow } from "./measure-manila-daily-publications";

export interface SourceFunnelObservation {
  sourceId: string;
  sourceType: "aggregator" | "agency_ats" | "tech_ats" | "unknown";
  rawCandidates: number | null;
  qualified: number | null;
  authorized: number | null;
  freshPublished: number | null;
  stockAbsorption: number | null;
  publiclyVerified: number | null;
  observedDays: number;
  storageSnapshot?: { storedRows: number; currentlyEligibleRows: number; recentPostedStorage: number };
}

export interface FunnelStageRatios {
  r1_qualification: number | null;
  r2_authorization: number | null;
  r3_fresh_publication: number | null;
  r4_public_consistency: number | null;
  compositeYield: number | null;
}

export interface SourceFunnelMetrics {
  sourceId: string;
  sourceType: SourceFunnelObservation["sourceType"];
  rawArrivalRatePerDay: number | null;
  ratios: FunnelStageRatios;
  expectedDailyFreshOutput: number | null;
  storageSnapshot: SourceFunnelObservation["storageSnapshot"] | null;
}

export interface CohortFunnelSummary {
  cohortName: string;
  totalSources: number;
  totalRawCandidates: number | null;
  totalQualified: number | null;
  totalAuthorized: number | null;
  totalFreshPublished: number | null;
  totalPubliclyVerified: number | null;
  ratios: FunnelStageRatios;
  aggregateDailyFreshOutput: number | null;
  totalStoredRows: number | null;
  totalCurrentlyEligibleRows: number | null;
  totalRecentPostedStorage: number | null;
}

export interface FunnelAuditReport {
  measuredAt: string;
  evaluatedDays: number;
  window: ManilaWindow;
  sources: SourceFunnelMetrics[];
  cohorts: Record<string, CohortFunnelSummary>;
  systemTotals: {
    totalDailyFreshExpected: number | null;
    gapTo100Floor: number | null;
    gapTo150Stretch: number | null;
    averageDailyRecentPostedStorage: number | null;
    requiredActiveFleet: null;
    capacityStatus: "UNKNOWN";
  };
}

export function classifySourceType(sourceId: string): SourceFunnelObservation["sourceType"] {
  if (["we-work-remotely", "remotive", "real-work-from-anywhere", "remote-ok"].includes(sourceId)
    || sourceId.startsWith("jobicy-") || sourceId.startsWith("himalayas")) return "aggregator";
  if (["breezy:20four7va", "breezy:sourcefit", "breezy:yokly", "breezy:value-", "breezy:remote-craft",
    "workable:hunt-st", "workable:rocketams", "workable:coconutva", "workable:crewbloom", "workable:hello-rache",
    "workable:pearltalent", "workable:pineapple-staffing", "ashby:multiplymii"].some((prefix) => sourceId.startsWith(prefix))) return "agency_ats";
  if (["greenhouse:", "lever:", "ashby:", "workable:"].some((prefix) => sourceId.startsWith(prefix))) return "tech_ats";
  return "unknown";
}

const isCount = (value: number | null): value is number => value !== null && Number.isSafeInteger(value) && value >= 0;
const round = (value: number, digits = 2): number => Number(value.toFixed(digits));

/** Empty or inconsistent populations do not demonstrate a conversion rate. */
export function computeStageRatios(obs: Pick<SourceFunnelObservation, "rawCandidates" | "qualified" | "authorized" | "freshPublished" | "publiclyVerified">): FunnelStageRatios {
  const ratio = (numerator: number | null, denominator: number | null): number | null =>
    isCount(numerator) && isCount(denominator) && denominator > 0 && numerator <= denominator ? numerator / denominator : null;
  const r1 = ratio(obs.qualified, obs.rawCandidates);
  const r2 = ratio(obs.authorized, obs.qualified);
  const r3 = ratio(obs.freshPublished, obs.authorized);
  const r4 = ratio(obs.publiclyVerified, obs.freshPublished);
  return {
    r1_qualification: r1 === null ? null : round(r1, 4),
    r2_authorization: r2 === null ? null : round(r2, 4),
    r3_fresh_publication: r3 === null ? null : round(r3, 4),
    r4_public_consistency: r4 === null ? null : round(r4, 4),
    compositeYield: [r1, r2, r3, r4].some((r) => r === null) ? null : round(r1! * r2! * r3! * r4!, 4),
  };
}

function knownSum(values: (number | null)[]): number | null {
  return values.length && values.every((value) => value !== null && Number.isFinite(value) && value >= 0)
    ? values.reduce<number>((sum, value) => sum + value!, 0) : null;
}

export function calculateFunnelReport(observations: SourceFunnelObservation[], evaluatedDays = 7, now: Date | string = new Date()): FunnelAuditReport {
  const window = completeManilaWindow(evaluatedDays, now);
  if (observations.some((obs) => obs.observedDays !== evaluatedDays)) throw new Error("source observation windows must match the evaluation window");
  const groups: Record<string, SourceFunnelObservation[]> = { aggregators: [], agency_ats: [], tech_ats: [], unknown: [] };
  const sources = observations.map((obs): SourceFunnelMetrics => {
    groups[obs.sourceType === "aggregator" ? "aggregators" : obs.sourceType].push(obs);
    const ratios = computeStageRatios(obs);
    return {
      sourceId: obs.sourceId, sourceType: obs.sourceType,
      rawArrivalRatePerDay: isCount(obs.rawCandidates) ? round(obs.rawCandidates / evaluatedDays) : null,
      ratios,
      // Avoid multiplying rounded stage ratios, which biases small outputs.
      expectedDailyFreshOutput: ratios.compositeYield !== null && isCount(obs.publiclyVerified) ? obs.publiclyVerified / evaluatedDays : null,
      storageSnapshot: obs.storageSnapshot ?? null,
    };
  });
  const cohorts: Record<string, CohortFunnelSummary> = {};
  for (const [key, group] of Object.entries(groups)) {
    const totals = {
      rawCandidates: knownSum(group.map((obs) => obs.rawCandidates)),
      qualified: knownSum(group.map((obs) => obs.qualified)),
      authorized: knownSum(group.map((obs) => obs.authorized)),
      freshPublished: knownSum(group.map((obs) => obs.freshPublished)),
      publiclyVerified: knownSum(group.map((obs) => obs.publiclyVerified)),
    };
    cohorts[key] = {
      cohortName: key, totalSources: group.length,
      totalRawCandidates: totals.rawCandidates, totalQualified: totals.qualified,
      totalAuthorized: totals.authorized, totalFreshPublished: totals.freshPublished,
      totalPubliclyVerified: totals.publiclyVerified, ratios: computeStageRatios(totals),
      aggregateDailyFreshOutput: totals.freshPublished === null ? null : round(totals.freshPublished / evaluatedDays),
      totalStoredRows: knownSum(group.map((obs) => obs.storageSnapshot?.storedRows ?? null)),
      totalCurrentlyEligibleRows: knownSum(group.map((obs) => obs.storageSnapshot?.currentlyEligibleRows ?? null)),
      totalRecentPostedStorage: knownSum(group.map((obs) => obs.storageSnapshot?.recentPostedStorage ?? null)),
    };
  }
  const verifiedTotal = knownSum(sources.map((source) => source.expectedDailyFreshOutput));
  const storageTotal = knownSum(observations.map((obs) => obs.storageSnapshot?.recentPostedStorage ?? null));
  return {
    measuredAt: window.measuredAt, evaluatedDays, window, sources, cohorts,
    systemTotals: {
      totalDailyFreshExpected: verifiedTotal === null ? null : round(verifiedTotal, 1),
      gapTo100Floor: verifiedTotal === null ? null : round(Math.max(0, 100 - verifiedTotal), 1),
      gapTo150Stretch: verifiedTotal === null ? null : round(Math.max(0, 150 - verifiedTotal), 1),
      averageDailyRecentPostedStorage: storageTotal === null ? null : round(storageTotal / evaluatedDays, 1),
      requiredActiveFleet: null, capacityStatus: "UNKNOWN",
    },
  };
}

export function formatFunnelReportMarkdown(report: FunnelAuditReport): string {
  const count = (value: number | null): string => value === null ? "UNKNOWN" : String(value);
  const percent = (value: number | null): string => value === null ? "UNKNOWN" : `${round(value * 100, 1)}%`;
  const lines = [
    "# Publication Funnel Evidence and Storage Diagnostic", "",
    `**Measured at:** ${report.measuredAt}`,
    `**Window:** [${report.window.startInclusive}, ${report.window.endExclusive}) — ${report.evaluatedDays} complete Asia/Manila days.`,
    "The D1 query measures current inventory grouped by storage date. It does not measure raw intake, historical qualification, publication authority, canonical first exposure or public-route consistency.",
    `**Recent-posting storage proxy (0 to 7 days):** ${count(report.systemTotals.averageDailyRecentPostedStorage)}/day. This is not certified fresh publication.`,
    `**Verified fresh flow / gaps to 100 and 150:** ${count(report.systemTotals.totalDailyFreshExpected)} / ${count(report.systemTotals.gapTo100Floor)} / ${count(report.systemTotals.gapTo150Stretch)}.`,
    "**Required active fleet:** UNKNOWN. Arrival distributions, overlap, exposure duration and out-of-sample uncertainty have not been measured.", "",
    "| Cohort | Sources with stored rows | Stored | Currently eligible | Recent posting | Qualification | Authorization | Fresh publication | Public consistency |",
    "| :--- | ---: | ---: | ---: | ---: | :--- | :--- | :--- | :--- |",
  ];
  for (const cohort of Object.values(report.cohorts)) {
    lines.push(`| ${cohort.cohortName} | ${cohort.totalSources} | ${count(cohort.totalStoredRows)} | ${count(cohort.totalCurrentlyEligibleRows)} | ${count(cohort.totalRecentPostedStorage)} | ${percent(cohort.ratios.r1_qualification)} | ${percent(cohort.ratios.r2_authorization)} | ${percent(cohort.ratios.r3_fresh_publication)} | ${percent(cohort.ratios.r4_public_consistency)} |`);
  }
  lines.push("", "Sources with no stored rows are not an observed active fleet. Current deactivation changes this snapshot; zeros cannot establish complete historical telemetry.", "",
    "| Source | Type | Stored | Currently eligible | Recent posting | Raw arrivals/day |", "| :--- | :--- | ---: | ---: | ---: | :--- |");
  for (const source of report.sources) {
    lines.push(`| ${source.sourceId} | ${source.sourceType} | ${count(source.storageSnapshot?.storedRows ?? null)} | ${count(source.storageSnapshot?.currentlyEligibleRows ?? null)} | ${count(source.storageSnapshot?.recentPostedStorage ?? null)} | ${count(source.rawArrivalRatePerDay)} |`);
  }
  return lines.join("\n");
}

export function buildD1FunnelQuery(days = 7, now: Date | string = new Date()): string {
  const window = completeManilaWindow(days, now);
  return `SELECT source_id, count(*) AS total_rows,
    sum(CASE WHEN is_active = 1 AND ph_eligibility IN ('eligible_verified', 'eligible_likely') THEN 1 ELSE 0 END) AS eligible_rows,
    sum(CASE WHEN is_active = 1 AND ph_eligibility IN ('eligible_verified', 'eligible_likely')
      AND unixepoch(scraped_at) - unixepoch(posted_at) BETWEEN 0 AND ${FRESHNESS_WINDOW_SECONDS} THEN 1 ELSE 0 END) AS recent_posted_rows
    FROM opportunities
    WHERE unixepoch(scraped_at) >= ${Date.parse(window.startInclusive) / 1000}
      AND unixepoch(scraped_at) < ${Date.parse(window.endExclusive) / 1000}
    GROUP BY source_id;`;
}

export function mapD1FunnelRows(rows: Array<{ source_id: string | null; total_rows: number; eligible_rows: number; recent_posted_rows: number }>, days: number): SourceFunnelObservation[] {
  return rows.map((row) => ({
    sourceId: row.source_id || "unattributed", sourceType: classifySourceType(row.source_id || "unattributed"),
    rawCandidates: null, qualified: null, authorized: null, freshPublished: null,
    stockAbsorption: null, publiclyVerified: null, observedDays: days,
    storageSnapshot: { storedRows: Number(row.total_rows), currentlyEligibleRows: Number(row.eligible_rows), recentPostedStorage: Number(row.recent_posted_rows) },
  }));
}

export function queryD1FunnelObservations(cwd = process.cwd(), days = 7, now: Date | string = new Date()): SourceFunnelObservation[] {
  const output = execFileSync("bun", ["run", "--cwd", "apps/web", "wrangler", "d1", "execute", "DB", "--remote", "--env", "production", "--command", buildD1FunnelQuery(days, now), "--json"], {
    cwd, encoding: "utf-8", maxBuffer: 50 * 1024 * 1024,
  });
  const startIdx = output.indexOf("[");
  if (startIdx === -1) throw new Error("D1 returned no JSON result");
  const parsed = JSON.parse(output.slice(startIdx));
  if (parsed[0]?.success !== true || !Array.isArray(parsed[0]?.results)) throw new Error("D1 did not confirm a successful inventory query");
  return mapD1FunnelRows(parsed[0].results, days);
}

if (import.meta.main) {
  const now = new Date();
  try {
    console.log(formatFunnelReportMarkdown(calculateFunnelReport(queryD1FunnelObservations(process.cwd(), 7, now), 7, now)));
  } catch (error) {
    console.error("Funnel diagnostic failed:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
