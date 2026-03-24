/**
 * Seed script: populates va_directory with an initial curated list
 * of companies known to hire Filipino VAs.
 * Run with: bun run packages/db/seed.ts
 */
import { db } from "./client";
import { vaDirectory } from "./schema";

const seedData = [
  {
    companyName: "Time Etc",
    website: "https://web.timeetc.com",
    hiresFilipinosf: true,
    niche: "admin" as const,
    hiringPageUrl: "https://web.timeetc.com/become-a-va",
    notes: "US-based VA platform, hires globally including Philippines",
  },
  {
    companyName: "Boldly",
    website: "https://boldly.com",
    hiresFilipinosf: true,
    niche: "admin" as const,
    hiringPageUrl: "https://boldly.com/jobs",
    notes: "Premium VA service, hires remote workers globally",
  },
  {
    companyName: "Virtual Staff Finder",
    website: "https://virtualstafffinder.com",
    hiresFilipinosf: true,
    niche: "admin" as const,
    hiringPageUrl: "https://virtualstafffinder.com",
    notes: "Specializes exclusively in Filipino VAs",
  },
  {
    companyName: "Magic",
    website: "https://getmagic.com",
    hiresFilipinosf: true,
    niche: "admin" as const,
    hiringPageUrl: "https://getmagic.com/careers",
    notes: "24/7 assistant service, strong Philippines presence",
  },
  {
    companyName: "Remote CoWorker",
    website: "https://remotecoworker.com",
    hiresFilipinosf: true,
    niche: "customer-support" as const,
    hiringPageUrl: "https://remotecoworker.com/careers",
    notes: "Focuses heavily on Philippines-based staff",
  },
  {
    companyName: "TaskUs",
    website: "https://taskus.com",
    hiresFilipinosf: true,
    niche: "customer-support" as const,
    hiringPageUrl: "https://taskus.com/careers",
    notes: "Large BPO with major operations in the Philippines",
  },
  {
    companyName: "Outsource Access",
    website: "https://outsourceaccess.com",
    hiresFilipinosf: true,
    niche: "admin" as const,
    hiringPageUrl: "https://outsourceaccess.com/careers",
    notes: "Philippines-first outsourcing company",
  },
  {
    companyName: "BELAY",
    website: "https://belaysolutions.com",
    hiresFilipinosf: false,
    niche: "admin" as const,
    hiringPageUrl: "https://belaysolutions.com/join-our-team",
    notes: "US contractors only — listed for reference",
  },
  {
    companyName: "Fancy Hands",
    website: "https://fancyhands.com",
    hiresFilipinosf: true,
    niche: "admin" as const,
    hiringPageUrl: "https://fancyhands.com/jobs",
    notes: "US-based but open to international applicants",
  },
  {
    companyName: "OnlineJobs.ph",
    website: "https://onlinejobs.ph",
    hiresFilipinosf: true,
    niche: "other" as const,
    hiringPageUrl: "https://onlinejobs.ph",
    notes: "Job board specifically for Filipino remote workers — not a direct employer",
  },
  {
    companyName: "VirtualStaff.ph",
    website: "https://virtualstaff.ph",
    hiresFilipinosf: true,
    niche: "other" as const,
    hiringPageUrl: "https://virtualstaff.ph",
    notes: "Philippine-focused VA hiring platform",
  },
  {
    companyName: "Invedus",
    website: "https://invedus.com",
    hiresFilipinosf: true,
    niche: "tech" as const,
    hiringPageUrl: "https://invedus.com/careers",
    notes: "Outsourcing firm with tech VA roles",
  },
  {
    companyName: "Wing Assistant",
    website: "https://wingassistant.com",
    hiresFilipinosf: true,
    niche: "admin" as const,
    hiringPageUrl: "https://wingassistant.com/careers",
    notes: "Dedicated VA service with Philippines talent",
  },
  {
    companyName: "Prialto",
    website: "https://prialto.com",
    hiresFilipinosf: true,
    niche: "admin" as const,
    hiringPageUrl: "https://prialto.com/careers",
    notes: "Managed VA service, significant Philippines team",
  },
  {
    companyName: "Toptal",
    website: "https://toptal.com",
    hiresFilipinosf: true,
    niche: "tech" as const,
    hiringPageUrl: "https://toptal.com/talent",
    notes: "Top 3% freelancer network, open to Philippines applicants",
  },
];

console.log(`Seeding ${seedData.length} VA directory entries...`);
await db.insert(vaDirectory).values(seedData).onConflictDoNothing();
console.log("Seed complete.");
