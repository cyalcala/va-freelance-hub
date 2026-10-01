/**
 * Ingest Premier Philippine & Dayshift Dedicated VA Agencies (Breezy HR)
 * 
 * Implements HRI-06 / High-Yield VA Expansion under Maintainer Bootloader v5.2:
 * Evaluates verified Philippine & Australian VA staffing firms hosted on Breezy HR.
 * Passes all listings through geoGate, computes empirical PH eligibility rates, and admits
 * qualified tenants into lake_candidate_jobs with status 'QUALIFIED_READY'.
 */

import { runBulkAtsDiscovery, type BulkSeed } from "./domain-ats-discovery";

export const PREMIER_BREEZY_SEEDS: BulkSeed[] = [
  {
    companyName: "20Four7VA",
    atsFamily: "Breezy",
    tenantSlug: "20four7va",
    website: "https://20four7va.breezy.hr/",
  },
  {
    companyName: "Sourcefit",
    atsFamily: "Breezy",
    tenantSlug: "sourcefit",
    website: "https://sourcefit.breezy.hr/",
  },
  {
    companyName: "Remote Craft",
    atsFamily: "Breezy",
    tenantSlug: "remote-craft",
    website: "https://remote-craft.breezy.hr/",
  },
  {
    companyName: "Value Virtual Assistants",
    atsFamily: "Breezy",
    tenantSlug: "value-virtual-assistants",
    website: "https://value-virtual-assistants.breezy.hr/",
  },
  {
    companyName: "Yokly",
    atsFamily: "Breezy",
    tenantSlug: "yokly",
    website: "https://yokly.breezy.hr/",
  },
];

async function main() {
  console.log("================================================================================");
  console.log("TURSO DATA LAKE — PREMIER BREEZY VA AGENCY ADMISSION RUNNER");
  console.log("================================================================================");
  console.log(`Evaluating cohort of ${PREMIER_BREEZY_SEEDS.length} dedicated VA agencies...`);

  // Polite 1500ms delay between probes to prevent rate limits
  const stats = await runBulkAtsDiscovery(PREMIER_BREEZY_SEEDS, {
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
    console.error("Premier Breezy VA cohort ingestion failed:", err);
    process.exit(1);
  });
}
