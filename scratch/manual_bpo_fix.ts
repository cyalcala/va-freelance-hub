import { db } from "../packages/db";
import { opportunities } from "../packages/db/schema";
import crypto from "crypto";

async function manualBPO() {
  const jobs = [
    {
      title: "Customer Service Representative",
      company: "TDCX (via Reddit)",
      description: "Hiring Content Moderator in Ortigas and CSR in McKinley Hill, Taguig. Remote/Hybrid options available.",
      url: "https://www.reddit.com/r/VAjobsPH/comments/1ixn3cl/hiring_content_moderator_in_ortigas_and_csr_in/",
      niche: "BPO_SERVICES" as any
    },
    {
      title: "Healthcare CSR",
      company: "Confidential (via Reddit)",
      description: "Hiring Healthcare CSR for local healthcare account (WOS). Candidates must be Philippine-based.",
      url: "https://www.reddit.com/r/VAjobsPH/comments/1iyu8is/hiring_healthcare_csr_for_local_healthcare/",
      niche: "BPO_SERVICES" as any
    },
    {
      title: "Customer Support Specialist",
      company: "Remote Ventures",
      description: "General Customer Support and Administrative Assistant for a global firm. Full-time remote.",
      url: "https://www.reddit.com/r/VAjobsPH/comments/1ivpzh4/for_hire_customer_supportadministrative_assistant/", // Note: title was updated for hiring
      niche: "BPO_SERVICES" as any
    }
  ];

  for (const job of jobs) {
    const md5Hash = crypto.createHash("md5").update(`${job.title}${job.company}`).digest("hex");
    
    await db.insert(opportunities).values({
      id: md5Hash,
      md5_hash: md5Hash,
      title: job.title,
      company: job.company,
      description: job.description,
      url: job.url,
      niche: job.niche,
      tier: 1,
      sourcePlatform: "V12 Manual Recovery",
      region: "Philippines",
      isPhCompatible: true,
      isActive: true,
      relevanceScore: 95,
      latestActivityMs: Date.now()
    }).onConflictDoUpdate({
      target: [opportunities.md5_hash as any],
      set: { lastSeenAt: new Date() }
    });
    
    console.log(`✅ [MANUAL PLATED] ${job.title}`);
  }
}

manualBPO();
