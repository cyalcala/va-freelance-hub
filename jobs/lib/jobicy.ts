import { z } from "zod";
import { createHash } from "crypto";
import type { NewOpportunity } from "@va-hub/db/schema";
import { healPayloadWithLLM, OpportunitySchema } from "./autonomous-harvester.js";

// Strict API Response Schema
const JobicyResponseSchema = z.object({
  jobs: z.array(z.object({
    jobTitle: z.string().default("Untitled"),
    url: z.string().url(),
    companyName: z.string().optional().default("Direct Hire"),
    jobExcerpt: z.string().optional().default(""),
    pubDate: z.string().optional(),
    annualSalaryMin: z.union([z.string(), z.number()]).optional().nullable(),
    annualSalaryMax: z.union([z.string(), z.number()]).optional().nullable(),
  })).default([])
});

function toHash(title: string, url: string) {
  return createHash("sha256").update(`${title}::${url}`).digest("hex").slice(0, 16);
}

export async function fetchJobicyJobs(db: any): Promise<NewOpportunity[]> {
  const sourceName = "Jobicy";
  try {
    const res = await fetch(`https://jobicy.com/api/v2/remote-jobs?count=50&t=${Date.now()}`, {
      headers: {
        "User-Agent": "VA.INDEX/1.0 (ethical-harvester; public-api)",
        "Accept": "application/json",
      },
      signal: AbortSignal.timeout(10_000), // Internal timeout remains for large payload, but caller may race
    });

    if (!res.ok) {
      console.error(`[jobicy] HTTP ${res.status}`);
      return [];
    }

    const rawData = await res.json();
    
    // 1. ATTEMPT AUTO-HEALING IF SCHEMA BREAKS
    const parsed = JobicyResponseSchema.safeParse(rawData);
    
    if (!parsed.success) {
      console.warn(`[jobicy] Schema mutation detected. Engaging Agentic Batch Healer.`);
      const { healBatchWithLLM } = await import("./autonomous-harvester.js");
      const healedJobs = await healBatchWithLLM(db, rawData, sourceName);
      
      return healedJobs.map((job) => ({
        id: crypto.randomUUID(),
        title: job.title,
        company: job.company,
        type: "agency",
        sourceUrl: job.sourceUrl,
        sourcePlatform: sourceName,
        tags: ["remote", "jobicy", "healed"],
        locationType: "remote",
        payRange: job.payRange,
        description: job.description,
        postedAt: job.postedAt ? new Date(job.postedAt) : new Date(),
        scrapedAt: new Date(),
        isActive: true,
        contentHash: toHash(job.title, job.sourceUrl),
      }));
    }

    const listings = parsed.data.jobs;

    const jobs: NewOpportunity[] = listings.map((job) => {
      const salary = job.annualSalaryMin && job.annualSalaryMax 
        ? `$${job.annualSalaryMin}-$${job.annualSalaryMax}`
        : null;

      return {
        id: crypto.randomUUID(),
        title: job.jobTitle,
        company: job.companyName,
        type: "agency", // Defaulting to agency as per VA.INDEX ethos for high-intent
        sourceUrl: job.url,
        sourcePlatform: sourceName,
        tags: ["remote", "jobicy"],
        locationType: "remote",
        payRange: salary,
        description: job.jobExcerpt.replace(/<[^>]*>/g, '').slice(0, 500) || null,
        postedAt: job.pubDate ? new Date(job.pubDate) : new Date(),
        scrapedAt: new Date(),
        isActive: true,
        contentHash: toHash(job.jobTitle, job.url),
      };
    });

    console.log(`[jobicy] Parsed ${jobs.length} jobs with deep validation`);
    return jobs;
  } catch (err) {
    console.error("[jobicy] Failed:", (err as Error).message);
    return [];
  }
}
