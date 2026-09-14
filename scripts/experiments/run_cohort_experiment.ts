/**
 * Autonomous Experiment Runner: Crawl4AI + Cloudflare Kitesurf
 * 
 * Executes bounded experiments on the candidate cohort.
 * Computes:
 *  - VALID_EXPERIMENTAL_JOBS
 *  - ALREADY_KNOWN_JOBS
 *  - INCREMENTAL_UNIQUE_JOBS
 *  - REMOTE_JOBS
 *  - PH_ELIGIBLE_JOBS
 *  - ROLE_RELEVANT_JOBS
 *  - FRESH_JOBS
 *  - NET_NEW_QUALIFIED_YIELD
 * 
 * INVARIANT: Zero publishing, zero modification of existing shadow sources.
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import {
  runExperimentalSourcePipeline,
  summarizeBatchResults,
} from "../../packages/scraper/experimental-orchestrator";
import type {
  ExperimentalCandidate,
  SourceExperimentMetrics,
  FilteredPipelineJob,
} from "../../packages/scraper/experimental-source-types";

async function main() {
  console.log("==================================================");
  console.log("VA FREELANCE HUB — EXPERIMENTAL CAPABILITY RUNNER");
  console.log("Capabilities: Crawl4AI OSS + Cloudflare Kitesurf");
  console.log("Patience-Mode Control Group: PROTECTED (UNTOUCHED)");
  console.log("Publishing Invariant: NO DIRECT PUBLISH (is_active = 0)");
  console.log("==================================================\n");

  const cohortPath = resolve(import.meta.dir, "candidate-cohort.json");
  const rawCohort = readFileSync(cohortPath, "utf-8");
  const cohort: ExperimentalCandidate[] = JSON.parse(rawCohort);

  console.log(`Loaded candidate cohort: ${cohort.length} sources`);

  // Track known URLs and titles for deduplication against baseline
  const knownUrls = new Set<string>();
  const knownTitles = new Set<string>();

  const metricsList: SourceExperimentMetrics[] = [];
  const allFilteredJobs: FilteredPipelineJob[] = [];

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  for (let i = 0; i < cohort.length; i++) {
    const candidate = cohort[i];
    console.log(`[${i + 1}/${cohort.length}] Probing ${candidate.companyName} (${candidate.careerUrl})...`);

    try {
      const result = await runExperimentalSourcePipeline(candidate, {
        knownUrls,
        knownTitles,
        crawl4aiOptions: {
          timeoutMs: 8000, // Safe bounded timeout for batch run
        },
      });

      metricsList.push(result.metrics);
      allFilteredJobs.push(...result.jobs);

      // Add to known sets so intra-batch duplicates are caught
      for (const job of result.jobs) {
        if (job.isValid) {
          const u = job.normalized.applicationUrl.toLowerCase().split("?")[0].replace(/\/+$/, "");
          const t = job.normalized.title.toLowerCase().replace(/\s+/g, " ").trim();
          knownUrls.add(u);
          knownTitles.add(t);
        }
      }

      console.log(
        `   Outcome: ${result.metrics.capability} | Extracted: ${result.metrics.candidateJobs} | Valid: ${result.metrics.validJobs} | Incremental Unique: ${result.metrics.incrementalUniqueJobs} | Net-New Qualified: ${result.metrics.netNewQualifiedYield} | Failure: ${result.metrics.failureClass ?? "none"}`
      );
    } catch (err) {
      console.error(`   Error processing ${candidate.companyName}:`, err);
    }

    // Polite inter-probe spacing
    if (i < cohort.length - 1) {
      await sleep(1000);
    }
  }

  const summary = summarizeBatchResults(metricsList);

  console.log("\n==================================================");
  console.log("EXPERIMENT SUMMARY & KPI RESULTS");
  console.log("==================================================");
  console.log(`Cohort Size: ${summary.cohortSize}`);
  console.log(`Crawl4AI Attempts: ${summary.crawl4aiAttempts} (Success: ${summary.crawl4aiSuccesses}, Fail: ${summary.crawl4aiFailures})`);
  console.log(`Kitesurf Escalations: ${summary.browserEscalationCount} (Rate: ${(summary.browserEscalationRate * 100).toFixed(1)}%)`);
  console.log(`Total Candidate Jobs: ${summary.totalCandidateJobs}`);
  console.log(`Total Valid Jobs: ${summary.totalValidJobs}`);
  console.log(`Total Incremental Unique Jobs: ${summary.totalIncrementalUniqueJobs}`);
  console.log(`Total Remote Jobs: ${summary.totalRemoteJobs}`);
  console.log(`Total PH-Eligible Jobs: ${summary.totalPhEligibleJobs}`);
  console.log(`Total Role-Relevant Jobs: ${summary.totalRoleRelevantJobs}`);
  console.log(`Total Fresh Jobs: ${summary.totalFreshJobs}`);
  console.log(`\n*** PRIMARY KPI ***`);
  console.log(`NET-NEW VALIDATED PH-ELIGIBLE RELEVANT REMOTE JOBS: ${summary.totalNetNewQualifiedYield}`);
  console.log(`Sources with Yield: ${summary.sourcesWithYield} / ${summary.cohortSize}`);
  console.log(`Average Net-New per Source: ${summary.averageNetNewPerSource.toFixed(2)}`);
  console.log("==================================================\n");

  // Write output results JSON for durability and review
  const outputData = {
    timestamp: new Date().toISOString(),
    cohortSize: summary.cohortSize,
    summary,
    sourceMetrics: metricsList,
    filteredJobs: allFilteredJobs,
  };

  const outputPath = resolve(import.meta.dir, "experiment-results.json");
  writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
  console.log(`Saved detailed experiment results to: ${outputPath}`);
}

main().catch((err) => {
  console.error("Experiment runner failed:", err);
  process.exit(1);
});
