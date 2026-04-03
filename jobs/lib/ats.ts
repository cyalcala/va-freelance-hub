import { z } from "zod";
import type { NewOpportunity } from "@va-hub/db/schema";
import { createHash } from "crypto";
import { proxyFetch } from "./proxy-fetch";

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

export async function fetchATSJobs(db: any): Promise<NewOpportunity[]> {
  const results: NewOpportunity[] = [];
  
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
      if (!parsed.success) {
        console.warn(`[ats/greenhouse] Schema mutation on ${board}. Engaging Healer.`);
        const { healBatchWithLLM } = await import("./autonomous-harvester.js");
        const healed = await healBatchWithLLM(db, rawData, `Greenhouse/${board}`);
        return healed.map(job => ({
            id: crypto.randomUUID(),
            contentHash: toHash(job.title, job.sourceUrl),
            title: job.title,
            company: job.company,
            payRange: job.payRange, 
            description: job.description, 
            sourceUrl: job.sourceUrl,
            sourcePlatform: "Greenhouse",
            scrapedAt: new Date(),
            postedAt: job.postedAt ? new Date(job.postedAt) : new Date(), 
            tags: ["ats", "greenhouse", "healed"],
            locationType: "remote",
            isActive: true,
            type: "agency",
        }));
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
      } as any));
    } catch (e) {
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
        console.warn(`[ats/lever] Schema mutation on ${board}. Engaging Healer.`);
        const { healBatchWithLLM } = await import("./autonomous-harvester.js");
        const healed = await healBatchWithLLM(db, rawData, `Lever/${board}`);
        return healed.map(job => ({
            id: crypto.randomUUID(),
            contentHash: toHash(job.title, job.sourceUrl),
            title: job.title,
            company: job.company,
            payRange: job.payRange,
            description: job.description,
            sourceUrl: job.sourceUrl,
            sourcePlatform: "Lever",
            scrapedAt: new Date(),
            postedAt: job.postedAt ? new Date(job.postedAt) : new Date(),
            tags: ["ats", "lever", "healed"],
            locationType: "remote",
            isActive: true,
            type: "agency",
        }));
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
      } as any));
    } catch (e) {
      return [];
    }
  });

  const parsedGh = await Promise.allSettled(ghPromises);
  const parsedLever = await Promise.allSettled(leverPromises);

  for (const result of [...parsedGh, ...parsedLever]) {
    if (result.status === "fulfilled" && result.value) {
      results.push(...(result.value as NewOpportunity[]));
    }
  }

  return results;
}
