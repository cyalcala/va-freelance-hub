import { z } from "zod";
import { createHash } from "crypto";
import { proxyFetch } from "./proxy-fetch";
import { logger } from "@trigger.dev/sdk/v3";

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

/**
 * V12 SIGNAL EMITTER: Jobicy
 * Note: Returns 'any[]' to allow RAW signals to flow into the Intelligence Mesh 
 * without satisfying strict Drizzle 'NewOpportunity' requirements (niche, md5_hash).
 */
export async function fetchJobicyJobs(): Promise<any[]> {
  const sourceName = "Jobicy";
  try {
    const res = await proxyFetch(`https://jobicy.com/api/v2/remote-jobs?count=50&t=${Date.now()}`, {
      headers: {
        "Accept": "application/json",
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      logger.error(`[jobicy] HTTP ${res.status}`);
      return [];
    }

    const rawData = await res.json();
    const parsed = JobicyResponseSchema.safeParse(rawData);
    
    if (!parsed.success) {
      logger.error(`[jobicy] Schema mutation detected. Dropping signal batch.`, { 
        errors: parsed.error.issues 
      });
      return [];
    }

    const listings = parsed.data.jobs;

    const jobs = listings.map((job) => {
      const salary = job.annualSalaryMin && job.annualSalaryMax 
        ? `$${job.annualSalaryMin}-$${job.annualSalaryMax}`
        : null;

      return {
        id: crypto.randomUUID(),
        title: job.jobTitle,
        company: job.companyName,
        type: "agency",
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
        __raw: JSON.stringify(job)
      };
    });

    logger.info(`[jobicy] Pulsed ${jobs.length} signals`);
    return jobs;
  } catch (err) {
    logger.error(`[jobicy] Ingestion Failure: ${(err as Error).message}`);
    return [];
  }
}
