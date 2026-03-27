import type { NewOpportunity } from "@va-hub/db/schema";
import { createHash } from "crypto";

/**
 * 🏢 DIRECT APPLICANT TRACKING SYSTEM (ATS) HARVESTER
 * 
 * Philosophy: Instead of fighting job board rates or scraping aggregate HTML, 
 * this engine natively pings exactly what the HR managers interface with backend. 
 * Both Greenhouse and Lever provide openly accessible JSON API endpoints for every active job board.
 */

const GREENHOUSE_BOARDS = [
  "remotecom", 
  "doist", 
  "automattic", 
  "outsourceaccess", 
  "supportshepherd",
  "athenaexecutiveassistants",
];

const LEVER_BOARDS = [
  "seamless", 
  "artemis", 
  "remote" // api.lever.co/v0/postings/remote
];

function toHash(title: string, url: string) {
  return createHash("sha256").update(`${title}::${url}`).digest("hex").slice(0, 16);
}

export async function fetchATSJobs(): Promise<NewOpportunity[]> {
  const results: NewOpportunity[] = [];
  
  // 1. Fetch Greenhouse
  const ghPromises = GREENHOUSE_BOARDS.map(async (board) => {
    try {
      const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${board}/jobs?t=${Date.now()}`, {
        headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" }
      });
      if (!res.ok) return [];
      const data = await res.json();
      if (!data.jobs) return [];
      
      return data.jobs.map((job: any) => ({
        id: crypto.randomUUID(),
        contentHash: toHash(job.title, job.absolute_url),
        title: job.title,
        company: data.name || board,
        payRange: "", 
        description: "", 
        sourceUrl: job.absolute_url,
        sourcePlatform: "Greenhouse",
        originalData: job,
        scrapedAt: new Date(),
        postedAt: job.updated_at ? new Date(job.updated_at) : new Date(), 
        tags: job.location?.name ? [job.location.name] : [],
        __raw: job,
      }));
    } catch (e) {
      return [];
    }
  });

  // 2. Fetch Lever
  const leverPromises = LEVER_BOARDS.map(async (board) => {
    try {
      const res = await fetch(`https://api.lever.co/v0/postings/${board}?mode=json&t=${Date.now()}`, {
        headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" }
      });
      if (!res.ok) return [];
      const jobs = await res.json();
      
      return jobs.map((job: any) => ({
        id: crypto.randomUUID(),
        contentHash: toHash(job.text, job.hostedUrl),
        title: job.text,
        company: board,
        payRange: "",
        description: job.descriptionPlain || "",
        sourceUrl: job.hostedUrl,
        sourcePlatform: "Lever",
        originalData: job,
        scrapedAt: new Date(),
        postedAt: job.createdAt ? new Date(job.createdAt) : new Date(),
        tags: job.categories?.location ? [job.categories.location] : [],
      }));
    } catch (e) {
      return [];
    }
  });

  // Execute perfectly concurrently bridging boundaries passively
  const parsedGh = await Promise.allSettled(ghPromises);
  const parsedLever = await Promise.allSettled(leverPromises);

  for (const result of [...parsedGh, ...parsedLever]) {
    if (result.status === "fulfilled" && result.value) {
      results.push(...result.value);
    }
  }

  return results;
}
