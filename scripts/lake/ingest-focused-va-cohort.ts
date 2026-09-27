/**
 * Ingest Focused Australian & Dayshift + Global VA ATS Cohort into Turso Lake
 * 
 * Implements HRI-04 / Batch 1 ATS Shadow & Admission under Maintainer Bootloader v5.2:
 * Probes verified VA and Australian/Dayshift ATS endpoints, passes all jobs through
 * geoGate, computes empirical PH eligibility rates, and admits qualified tenants
 * into lake_candidate_jobs with status 'QUALIFIED_READY'.
 */

import { runBulkAtsDiscovery, type BulkSeed } from "./domain-ats-discovery";

export const FOCUSED_VA_SEEDS: BulkSeed[] = [
  // ── 1. Australian & Dayshift Dedicated Agencies ─────────────────────────────
  {
    companyName: "Hunt St",
    atsFamily: "Workable",
    tenantSlug: "hunt-st",
    website: "https://apply.workable.com/hunt-st/",
  },
  {
    companyName: "RocketAMS",
    atsFamily: "Workable",
    tenantSlug: "rocketams",
    website: "https://apply.workable.com/rocketams/",
  },
  // ── 2. Global VA & Remote Staffing Firms ────────────────────────────────────
  {
    companyName: "Coconut VA",
    atsFamily: "Workable",
    tenantSlug: "coconutva",
    website: "https://apply.workable.com/coconutva/",
  },
  {
    companyName: "CrewBloom",
    atsFamily: "Workable",
    tenantSlug: "crewbloom",
    website: "https://apply.workable.com/crewbloom/",
  },
  {
    companyName: "Hello Rache",
    atsFamily: "Workable",
    tenantSlug: "hello-rache",
    website: "https://apply.workable.com/hello-rache/",
  },
  {
    companyName: "Pearl Talent",
    atsFamily: "Workable",
    tenantSlug: "pearltalent",
    website: "https://apply.workable.com/pearltalent/",
  },
  {
    companyName: "Pineapple Staffing",
    atsFamily: "Workable",
    tenantSlug: "pineapple-staffing",
    website: "https://apply.workable.com/pineapple-staffing/",
  },
  {
    companyName: "Athena",
    atsFamily: "Greenhouse",
    tenantSlug: "athena",
    website: "https://boards-api.greenhouse.io/v1/boards/athena/jobs",
  },
  {
    companyName: "Atticus",
    atsFamily: "Ashby",
    tenantSlug: "atticus",
    website: "https://api.ashbyhq.com/posting-api/job-board/atticus",
  },
  {
    companyName: "Remote.com",
    atsFamily: "Greenhouse",
    tenantSlug: "remotecom",
    website: "https://boards-api.greenhouse.io/v1/boards/remotecom/jobs",
  },
  {
    companyName: "MultiplyMii",
    atsFamily: "Ashby",
    tenantSlug: "multiplymii",
    website: "https://api.ashbyhq.com/posting-api/job-board/multiplymii",
  },
  {
    companyName: "Connext Global Solutions",
    atsFamily: "Greenhouse",
    tenantSlug: "connextglobal",
    website: "https://boards-api.greenhouse.io/v1/boards/connextglobal/jobs",
  },
];

async function main() {
  console.log("================================================================================");
  console.log("TURSO DATA LAKE — FOCUSED AUSTRALIAN & GLOBAL VA ATS ADMISSION RUNNER");
  console.log("================================================================================");
  console.log(`Evaluating cohort of ${FOCUSED_VA_SEEDS.length} high-intent VA employers...`);

  // Polite 1500ms delay between probes to prevent rate limits
  const stats = await runBulkAtsDiscovery(FOCUSED_VA_SEEDS, {
    dryRun: false,
    probeDelayMs: 1500,
  });

  console.log("\nDiscovery and Ingestion Complete:");
  console.log(`- Domains/Endpoints scanned: ${stats.domainsScanned}`);
  console.log(`- Tenants found (>= min jobs): ${stats.tenantsFound}`);
  console.log(`- Auto-admitted to Lake: ${stats.admitted}`);
  console.log(`- Shadow monitored: ${stats.shadowed}`);
  console.log(`- Auto-rejected: ${stats.rejected}`);
  console.log(`- Qualified jobs ingested: ${stats.jobsIngested}`);
}

if (import.meta.main) {
  main().catch((err) => {
    console.error("Focused VA cohort ingestion failed:", err);
    process.exit(1);
  });
}
