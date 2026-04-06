import { z } from "zod";
import { createHash } from "crypto";
import { proxyFetch } from "./proxy-fetch";
import { logger } from "@trigger.dev/sdk/v3";

// --- ATS SCHEMAS ---

const GreenhouseJobSchema = z.object({
  title: z.string().default("Untitled"),
  absolute_url: z.string().url(),
  updated_at: z.string().optional(),
  location: z.object({ name: z.string().optional() }).optional(),
});

const GreenhouseResponseSchema = z.object({
  name: z.string().optional(),
  jobs: z.array(GreenhouseJobSchema).default([]),
});

const LeverJobSchema = z.object({
  text: z.string().default("Untitled"),
  hostedUrl: z.string().url(),
  descriptionPlain: z.string().optional().default(""),
  createdAt: z.union([z.string(), z.number()]).optional(),
  categories: z.object({ location: z.string().optional() }).optional(),
});

const LeverResponseSchema = z.array(LeverJobSchema).default([]);

const GREENHOUSE_BOARDS = [
  "remotecom", "doist", "automattic", "outsourceaccess", 
  "supportshepherd", "athenaexecutiveassistants",
];

const LEVER_BOARDS = [
  "seamless", "artemis", "remote"
];

function toHash(title: string, url: string) {
  return createHash("sha256").update(`${title}::${url}`).digest("hex").slice(0, 16);
}

/**
 * V12 SIGNAL EMITTER: ATS (Greenhouse/Lever)
 * Note: Returns 'any[]' to allow RAW signals to flow into the Intelligence Mesh 
 * without satisfying strict Drizzle 'NewOpportunity' requirements (niche, md5_hash).
 */
export async function fetchATSJobs(): Promise<any[]> {
  const results: any[] = [];
  
  // 1. Fetch Greenhouse
  const ghPromises = GREENHOUSE_BOARDS.map(async (board) => {
    try {
      const res = await proxyFetch(`https://boards-api.greenhouse.io/v1/boards/${board}/jobs?t=${Date.now()}`, {
        headers: { "Accept": "application/json" },
        signal: AbortSignal.timeout(15000)
      });
      if (!res.ok) return [];
      
      const rawData = await res.json();
      const parsed = GreenhouseResponseSchema.safeParse(rawData);
      
      // V12 POLICY: If schema fails, drop but log. V12 Discovery will handle it next.
      if (!parsed.success) {
        logger.error(`[ats/greenhouse] Schema mutation on ${board}. Dropping.`, { 
          errors: parsed.error.issues 
        });
        return [];
      }
      
      const data = parsed.data;
      return data.jobs.map((job) => ({
        id: crypto.randomUUID(),
        contentHash: toHash(job.title, job.absolute_url),
        title: job.title,
        company: data.name || board,
        payRange: null, 
        description: null, 
        sourceUrl: job.absolute_url,
        sourcePlatform: "Greenhouse",
        scrapedAt: new Date(),
        postedAt: job.updated_at ? new Date(job.updated_at) : new Date(), 
        tags: job.location?.name ? [job.location.name] : [],
        locationType: "remote",
        isActive: true,
        type: "agency",
        __raw: JSON.stringify(job)
      }));
    } catch (e: any) {
      logger.error(`[ats/greenhouse] Fetch failed for ${board}: ${e.message}`);
      return [];
    }
  });

  // 2. Fetch Lever
  const leverPromises = LEVER_BOARDS.map(async (board) => {
    try {
      const res = await proxyFetch(`https://api.lever.co/v0/postings/${board}?mode=json&t=${Date.now()}`, {
        headers: { "Accept": "application/json" },
        signal: AbortSignal.timeout(15000)
      });
      if (!res.ok) return [];
      
      const rawData = await res.json();
      const parsed = LeverResponseSchema.safeParse(rawData);
      
      if (!parsed.success) {
        logger.error(`[ats/lever] Schema mutation on ${board}. Dropping.`, { 
          errors: parsed.error.issues 
        });
        return [];
      }
      
      const jobs = parsed.data;
      return jobs.map((job) => ({
        id: crypto.randomUUID(),
        contentHash: toHash(job.text, job.hostedUrl),
        title: job.text,
        company: board,
        payRange: null,
        description: job.descriptionPlain.slice(0, 500) || null,
        sourceUrl: job.hostedUrl,
        sourcePlatform: "Lever",
        scrapedAt: new Date(),
        postedAt: job.createdAt ? new Date(job.createdAt) : new Date(),
        tags: job.categories?.location ? [job.categories.location] : [],
        locationType: "remote",
        isActive: true,
        type: "agency",
        __raw: JSON.stringify(job)
      }));
    } catch (e: any) {
      logger.error(`[ats/lever] Fetch failed for ${board}: ${e.message}`);
      return [];
    }
  });

  const settleAll = await Promise.allSettled([...ghPromises, ...leverPromises]);

  for (const settleResult of settleAll) {
    if (settleResult.status === "fulfilled" && settleResult.value) {
      results.push(...settleResult.value);
    }
  }

  logger.info(`[ats] Pulsed ${results.length} signals from ${GREENHOUSE_BOARDS.length + LEVER_BOARDS.length} boards`);
  return results;
}
