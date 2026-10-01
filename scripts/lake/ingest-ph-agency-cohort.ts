/**
 * Ingest Premier Philippine VA & BPO Agency Cohort into Turso Lake
 * 
 * Implements HRI-05 / Tier A Philippine Candidates under Maintainer Bootloader v5.2:
 * Evaluates verified Philippine remote staffing agencies across Workable, Breezy, and Lever.
 * Passes all listings through geoGate, computes empirical PH eligibility rates, and admits
 * qualified tenants into lake_candidate_jobs with status 'QUALIFIED_READY'.
 */

import { runBulkAtsDiscovery, type BulkSeed } from "./domain-ats-discovery";

export const PH_AGENCY_SEEDS: BulkSeed[] = [
  // ── 1. Breezy HR ────────────────────────────────────────────────────────────
  {
    companyName: "VAA Philippines",
    atsFamily: "Breezy",
    tenantSlug: "vaaphilippines-recruitment",
    website: "https://vaaphilippines-recruitment.breezy.hr/",
  },
  // ── 2. Lever ────────────────────────────────────────────────────────────────
  {
    companyName: "Vault Outsourcing",
    atsFamily: "Lever",
    tenantSlug: "vaultoutsourcing",
    website: "https://jobs.lever.co/vaultoutsourcing",
  },
  // ── 3. Workable Tier A Philippine Employers ────────────────────────────────
  {
    companyName: "ConnectOS",
    atsFamily: "Workable",
    tenantSlug: "connectos",
    website: "https://apply.workable.com/connectos/",
  },
  {
    companyName: "Global Strategic",
    atsFamily: "Workable",
    tenantSlug: "global-strategic",
    website: "https://apply.workable.com/global-strategic/",
  },
  {
    companyName: "MyOutDesk",
    atsFamily: "Workable",
    tenantSlug: "myoutdesk",
    website: "https://apply.workable.com/myoutdesk/",
  },
  {
    companyName: "Outsource Access",
    atsFamily: "Workable",
    tenantSlug: "outsource-access",
    website: "https://apply.workable.com/outsource-access/",
  },
  {
    companyName: "Staff Domain",
    atsFamily: "Workable",
    tenantSlug: "staff-domain-inc",
    website: "https://apply.workable.com/staff-domain-inc/",
  },
  {
    companyName: "SuperStaff",
    atsFamily: "Workable",
    tenantSlug: "superstaff",
    website: "https://apply.workable.com/superstaff/",
  },
  {
    companyName: "Virtual Staff 365",
    atsFamily: "Workable",
    tenantSlug: "virtualstaff365",
    website: "https://apply.workable.com/virtualstaff365/",
  },
];

async function main() {
  console.log("================================================================================");
  console.log("TURSO DATA LAKE — PREMIER PHILIPPINE VA & BPO AGENCY ADMISSION RUNNER");
  console.log("================================================================================");
  console.log(`Evaluating cohort of ${PH_AGENCY_SEEDS.length} Tier A Philippine employers...`);

  // Polite 1500ms delay between probes to prevent rate limits
  const stats = await runBulkAtsDiscovery(PH_AGENCY_SEEDS, {
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
    console.error("Philippine agency cohort ingestion failed:", err);
    process.exit(1);
  });
}
