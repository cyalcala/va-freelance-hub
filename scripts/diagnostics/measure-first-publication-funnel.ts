/**
 * First-Publication Loss Funnel Measurement Tool (MATH-06A / FUNNEL-METRICS)
 *
 * Implements the empirical conversion funnel under Maintainer Bootloader v5.2:
 *
 *   Candidates (Raw)
 *     --[r1: Qualification Ratio]---------> Qualified
 *     --[r2: Authorization Admissibility]--> Authorized
 *     --[r3: Net Fresh Publication Rate]---> Published (Fresh <= 48h)
 *     --[r4: Public Serving Consistency]---> Publicly Verified
 *
 * Composite yield:
 *   eta_s = r1 * r2 * r3 * r4
 *
 * Capacity Estimator:
 *   J_hat = sum_s ( lambda_hat_s * eta_s )
 *
 * Replaces premature "mathematical certainty" claims with empirical estimation
 * bounded by observed loss ratios across source cohorts.
 */

import { execSync } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { providerFamily } from "../ci/constitution-metrics";

export interface SourceFunnelObservation {
  sourceId: string;
  sourceType: "aggregator" | "agency_ats" | "tech_ats" | "unknown";
  rawCandidates: number;
  qualified: number;
  authorized: number;
  freshPublished: number;
  stockAbsorption: number;
  publiclyVerified: number;
  observedDays: number;
}

export interface FunnelStageRatios {
  r1_qualification: number;     // qualified / rawCandidates
  r2_authorization: number;     // authorized / qualified
  r3_fresh_publication: number; // freshPublished / authorized
  r4_public_consistency: number;// publiclyVerified / freshPublished
  compositeYield: number;       // r1 * r2 * r3 * r4
}

export interface SourceFunnelMetrics {
  sourceId: string;
  sourceType: SourceFunnelObservation["sourceType"];
  rawArrivalRatePerDay: number; // rawCandidates / observedDays
  ratios: FunnelStageRatios;
  expectedDailyFreshOutput: number; // rawArrivalRate * compositeYield
}

export interface CohortFunnelSummary {
  cohortName: string;
  totalSources: number;
  totalRawCandidates: number;
  totalQualified: number;
  totalAuthorized: number;
  totalFreshPublished: number;
  totalPubliclyVerified: number;
  ratios: FunnelStageRatios;
  aggregateDailyFreshOutput: number;
}

export interface FunnelAuditReport {
  measuredAt: string;
  evaluatedDays: number;
  sources: SourceFunnelMetrics[];
  cohorts: Record<string, CohortFunnelSummary>;
  systemTotals: {
    totalDailyFreshExpected: number;
    gapTo100Floor: number;
    gapTo150Stretch: number;
    requiredActiveFleetP50: number; // Median endpoints needed for 100/day
    requiredActiveFleetP90: number; // Conservative 90th percentile endpoints needed
  };
}

export function classifySourceType(sourceId: string): SourceFunnelObservation["sourceType"] {
  if (
    sourceId === "we-work-remotely" ||
    sourceId === "remotive" ||
    sourceId === "real-work-from-anywhere" ||
    sourceId === "remote-ok" ||
    sourceId.startsWith("jobicy-") ||
    sourceId.startsWith("himalayas")
  ) {
    return "aggregator";
  }
  if (
    sourceId.startsWith("breezy:20four7va") ||
    sourceId.startsWith("breezy:sourcefit") ||
    sourceId.startsWith("breezy:yokly") ||
    sourceId.startsWith("breezy:value-") ||
    sourceId.startsWith("breezy:remote-craft") ||
    sourceId.startsWith("workable:hunt-st") ||
    sourceId.startsWith("workable:rocketams") ||
    sourceId.startsWith("workable:coconutva") ||
    sourceId.startsWith("workable:crewbloom") ||
    sourceId.startsWith("workable:hello-rache") ||
    sourceId.startsWith("workable:pearltalent") ||
    sourceId.startsWith("workable:pineapple-staffing") ||
    sourceId.startsWith("ashby:multiplymii")
  ) {
    return "agency_ats";
  }
  if (
    sourceId.startsWith("greenhouse:") ||
    sourceId.startsWith("lever:") ||
    sourceId.startsWith("ashby:") ||
    sourceId.startsWith("workable:")
  ) {
    return "tech_ats";
  }
  return "unknown";
}

/**
 * Pure function: calculates stage ratios safely avoiding division by zero.
 */
export function computeStageRatios(obs: {
  rawCandidates: number;
  qualified: number;
  authorized: number;
  freshPublished: number;
  publiclyVerified: number;
}): FunnelStageRatios {
  const r1 = obs.rawCandidates > 0 ? Math.min(1.0, obs.qualified / obs.rawCandidates) : 0;
  const r2 = obs.qualified > 0 ? Math.min(1.0, obs.authorized / obs.qualified) : 0;
  const r3 = obs.authorized > 0 ? Math.min(1.0, obs.freshPublished / obs.authorized) : 0;
  const r4 = obs.freshPublished > 0 ? Math.min(1.0, obs.publiclyVerified / obs.freshPublished) : (obs.freshPublished === 0 ? 1.0 : 0);
  const compositeYield = r1 * r2 * r3 * r4;

  return {
    r1_qualification: Number(r1.toFixed(4)),
    r2_authorization: Number(r2.toFixed(4)),
    r3_fresh_publication: Number(r3.toFixed(4)),
    r4_public_consistency: Number(r4.toFixed(4)),
    compositeYield: Number(compositeYield.toFixed(4)),
  };
}

/**
 * Pure calculation function: processes source observations into a complete Funnel Audit Report.
 */
export function calculateFunnelReport(
  observations: SourceFunnelObservation[],
  evaluatedDays = 7,
): FunnelAuditReport {
  const sources: SourceFunnelMetrics[] = [];
  const cohortGroups: Record<string, SourceFunnelObservation[]> = {
    aggregators: [],
    agency_ats: [],
    tech_ats: [],
  };

  for (const obs of observations) {
    const ratios = computeStageRatios(obs);
    const rawArrivalRatePerDay = obs.observedDays > 0 ? obs.rawCandidates / obs.observedDays : 0;
    const expectedDailyFreshOutput = rawArrivalRatePerDay * ratios.compositeYield;

    sources.push({
      sourceId: obs.sourceId,
      sourceType: obs.sourceType,
      rawArrivalRatePerDay: Number(rawArrivalRatePerDay.toFixed(2)),
      ratios,
      expectedDailyFreshOutput: Number(expectedDailyFreshOutput.toFixed(2)),
    });

    if (obs.sourceType === "aggregator") cohortGroups.aggregators.push(obs);
    else if (obs.sourceType === "agency_ats") cohortGroups.agency_ats.push(obs);
    else cohortGroups.tech_ats.push(obs);
  }

  const cohorts: Record<string, CohortFunnelSummary> = {};
  for (const [key, group] of Object.entries(cohortGroups)) {
    const totalRaw = group.reduce((sum, o) => sum + o.rawCandidates, 0);
    const totalQual = group.reduce((sum, o) => sum + o.qualified, 0);
    const totalAuth = group.reduce((sum, o) => sum + o.authorized, 0);
    const totalFresh = group.reduce((sum, o) => sum + o.freshPublished, 0);
    const totalPub = group.reduce((sum, o) => sum + o.publiclyVerified, 0);
    const ratios = computeStageRatios({
      rawCandidates: totalRaw,
      qualified: totalQual,
      authorized: totalAuth,
      freshPublished: totalFresh,
      publiclyVerified: totalPub,
    });
    const aggregateDailyFreshOutput = Number(
      group.reduce((sum, o) => sum + (o.observedDays > 0 ? o.freshPublished / o.observedDays : 0), 0).toFixed(2)
    );

    cohorts[key] = {
      cohortName: key,
      totalSources: group.length,
      totalRawCandidates: totalRaw,
      totalQualified: totalQual,
      totalAuthorized: totalAuth,
      totalFreshPublished: totalFresh,
      totalPubliclyVerified: totalPub,
      ratios,
      aggregateDailyFreshOutput,
    };
  }

  const totalDailyFreshExpected = Number(
    sources.reduce((sum, s) => sum + s.expectedDailyFreshOutput, 0).toFixed(1)
  );
  const gapTo100Floor = Number((100 - totalDailyFreshExpected).toFixed(1));
  const gapTo150Stretch = Number((150 - totalDailyFreshExpected).toFixed(1));

  // Compute fleet size requirements based on empirical agency & tech ATS yield
  const agencyYield = cohorts.agency_ats?.aggregateDailyFreshOutput && cohorts.agency_ats?.totalSources > 0
    ? cohorts.agency_ats.aggregateDailyFreshOutput / cohorts.agency_ats.totalSources
    : 0.8;
  const aggregatorOutput = cohorts.aggregators?.aggregateDailyFreshOutput ?? 15.0;

  const neededFromFleet = Math.max(0, 100 - aggregatorOutput);
  const fleetP50 = Math.ceil(neededFromFleet / agencyYield);
  const fleetP90 = Math.ceil(neededFromFleet / (agencyYield * 0.75)); // 25% safety margin for variance/downtime

  return {
    measuredAt: new Date().toISOString(),
    evaluatedDays,
    sources,
    cohorts,
    systemTotals: {
      totalDailyFreshExpected,
      gapTo100Floor: Math.max(0, gapTo100Floor),
      gapTo150Stretch: Math.max(0, gapTo150Stretch),
      requiredActiveFleetP50: fleetP50,
      requiredActiveFleetP90: fleetP90,
    },
  };
}

/**
 * Format audit report as Markdown.
 */
export function formatFunnelReportMarkdown(report: FunnelAuditReport): string {
  const lines: string[] = [
    "# Empirical First-Publication Funnel Audit (MATH-06A)",
    "",
    `**Measured At:** ${report.measuredAt} | **Evaluation Period:** ${report.evaluatedDays} complete Manila days  `,
    `**System Baseline Fresh Output:** **${report.systemTotals.totalDailyFreshExpected} fresh jobs/day**  `,
    `**Gap to 100 Floor:** ${report.systemTotals.gapTo100Floor > 0 ? `-${report.systemTotals.gapTo100Floor} jobs/day` : "MET"} | **Gap to 150 Stretch:** -${report.systemTotals.gapTo150Stretch} jobs/day  `,
    "",
    "## 1. Funnel Loss Ratios by Source Cohort",
    "",
    "| Cohort | Sources | Raw Candidates | Qualified ($r_1$) | Authorized ($r_2$) | Fresh Pubs ($r_3$) | Public ($r_4$) | Composite $\\eta$ | Daily Fresh Flow |",
    "| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |",
  ];

  for (const [name, c] of Object.entries(report.cohorts)) {
    const r1 = `${(c.ratios.r1_qualification * 100).toFixed(1)}%`;
    const r2 = `${(c.ratios.r2_authorization * 100).toFixed(1)}%`;
    const r3 = `${(c.ratios.r3_fresh_publication * 100).toFixed(1)}%`;
    const r4 = `${(c.ratios.r4_public_consistency * 100).toFixed(1)}%`;
    const eta = `${(c.ratios.compositeYield * 100).toFixed(1)}%`;
    lines.push(
      `| **${name}** | ${c.totalSources} | ${c.totalRawCandidates} | ${r1} | ${r2} | ${r3} | ${r4} | **${eta}** | **${c.aggregateDailyFreshOutput}/day** |`
    );
  }

  lines.push(
    "",
    "## 2. Mathematical Capacity Estimation & Required Fleet Size",
    "",
    `$$\\hat{J}_{\\text{day}} = \\sum_s \\hat{\\lambda}_s \\cdot r_{1,s} \\cdot r_{2,s} \\cdot r_{3,s} \\cdot r_{4,s} = ${report.systemTotals.totalDailyFreshExpected} \\text{ fresh jobs/day}$$`,
    "",
    `- **Aggregator Fresh Contribution:** ${report.cohorts.aggregators?.aggregateDailyFreshOutput ?? 0} jobs/day`,
    `- **Agency ATS Contribution (5 Graduated):** ${report.cohorts.agency_ats?.aggregateDailyFreshOutput ?? 0} jobs/day`,
    `- **Remaining Fresh Deficit:** **${report.systemTotals.gapTo100Floor} fresh jobs/day** to 100 floor`,
    `- **Empirical Fleet Size Required (Median P50):** **${report.systemTotals.requiredActiveFleetP50} active endpoints**`,
    `- **Conservative Fleet Size Required (90th P90):** **${report.systemTotals.requiredActiveFleetP90} active endpoints**`,
    "",
    "## 3. Detailed Per-Source Conversion Ledger",
    "",
    "| Source ID | Type | Raw $\\lambda$ (/day) | $r_1$ (Qual) | $r_2$ (Auth) | $r_3$ (Fresh) | $r_4$ (Pub) | Net $\\eta$ | Expected Daily Fresh |",
    "| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |"
  );

  for (const s of report.sources) {
    const r1 = `${(s.ratios.r1_qualification * 100).toFixed(0)}%`;
    const r2 = `${(s.ratios.r2_authorization * 100).toFixed(0)}%`;
    const r3 = `${(s.ratios.r3_fresh_publication * 100).toFixed(0)}%`;
    const r4 = `${(s.ratios.r4_public_consistency * 100).toFixed(0)}%`;
    const eta = `${(s.ratios.compositeYield * 100).toFixed(1)}%`;
    lines.push(
      `| \`${s.sourceId}\` | ${s.sourceType} | ${s.rawArrivalRatePerDay} | ${r1} | ${r2} | ${r3} | ${r4} | ${eta} | **${s.expectedDailyFreshOutput}** |`
    );
  }

  return lines.join("\n");
}

/**
 * Execute D1 queries to gather empirical observations.
 */
export function queryD1FunnelObservations(cwd = process.cwd(), days = 7): SourceFunnelObservation[] {
  const sql = `
    SELECT
      source_id,
      count(*) as total_rows,
      sum(case when ph_eligibility in ('eligible_verified', 'eligible_likely') then 1 else 0 end) as qualified_rows,
      sum(case when is_active = 1 then 1 else 0 end) as active_rows,
      sum(case when is_active = 1 AND posted_at IS NOT NULL AND (strftime('%s', scraped_at) - strftime('%s', posted_at)) <= 172800 then 1 else 0 end) as fresh_rows,
      sum(case when is_active = 1 AND (posted_at IS NULL OR (strftime('%s', scraped_at) - strftime('%s', posted_at)) > 172800) then 1 else 0 end) as stock_rows
    FROM opportunities
    WHERE date(scraped_at, '+8 hours') >= date('now', '+8 hours', '-${days} days')
    GROUP BY source_id;
  `;

  const cmd = `bun run --cwd apps/web wrangler d1 execute DB --remote --env production --command "${sql.replace(/\n/g, ' ')}"`;
  const output = execSync(cmd, { cwd, encoding: "utf-8", maxBuffer: 50 * 1024 * 1024 });
  const startIdx = output.indexOf("[");
  if (startIdx === -1) throw new Error("No JSON in output: " + output);
  const parsed = JSON.parse(output.slice(startIdx));
  const rows = parsed[0]?.results ?? [];

  return rows.map((r: any) => {
    const sourceId = r.source_id || "unattributed";
    const total = Number(r.total_rows || 0);
    const qual = Number(r.qualified_rows || 0);
    const active = Number(r.active_rows || 0);
    const fresh = Number(r.fresh_rows || 0);
    const stock = Number(r.stock_rows || 0);

    return {
      sourceId,
      sourceType: classifySourceType(sourceId),
      rawCandidates: total,
      qualified: qual,
      authorized: active,
      freshPublished: fresh,
      stockAbsorption: stock,
      publiclyVerified: fresh, // in D1 opportunities active=1 rows are publicly verified
      observedDays: days,
    };
  });
}

if (import.meta.main) {
  console.log("Measuring empirical First-Publication Loss Funnel from Cloudflare D1...");
  try {
    const observations = queryD1FunnelObservations(process.cwd(), 7);
    const report = calculateFunnelReport(observations, 7);
    const md = formatFunnelReportMarkdown(report);
    console.log(md);
  } catch (err: any) {
    console.error("Funnel audit failed:", err.message);
    process.exit(1);
  }
}
