/**
 * Jobicy Public REST API Harvester
 * 
 * Uses Jobicy's free, publicly documented REST API.
 * No API key required. Documented at: https://jobicy.com/jobs-rss-feed
 * Returns structured JSON with remote job listings.
 */

import { createHash } from "crypto";
import type { NewOpportunity } from "@va-hub/db/schema";

function toHash(title: string, url: string) {
  return createHash("sha256").update(`${title}::${url}`).digest("hex").slice(0, 16);
}

export async function fetchJobicyJobs(): Promise<NewOpportunity[]> {
  try {
    const res = await fetch(`https://jobicy.com/api/v2/remote-jobs?count=50&t=${Date.now()}`, {
      headers: {
        "User-Agent": "VA.INDEX/1.0 (ethical-harvester; public-api)",
        "Accept": "application/json",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache"
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      console.log(`[jobicy] HTTP ${res.status}`);
      return [];
    }

    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      console.log(`[jobicy] Response is not valid JSON (${text.slice(0, 100)}...)`);
      return [];
    }

    const listings = data?.jobs || [];

    const jobs: NewOpportunity[] = listings.map((job: any) => ({
      id: crypto.randomUUID(),
      title: job.jobTitle || job.title || "Untitled",
      company: job.companyName || "Direct Hire",
      type: "full-time" as const,
      sourceUrl: job.url || job.jobGeo || "",
      sourcePlatform: "Jobicy",
      tags: ["remote", "jobicy"],
      locationType: "remote" as const,
      payRange: job.annualSalaryMin && job.annualSalaryMax 
        ? `$${job.annualSalaryMin}-$${job.annualSalaryMax}`
        : null,
      description: (job.jobExcerpt || "").slice(0, 500) || null,
      postedAt: job.pubDate ? new Date(job.pubDate) : new Date(),
      scrapedAt: new Date(),
      isActive: true,
      contentHash: toHash(job.jobTitle || "", job.url || ""),
      __raw: job,
    }));

    console.log(`[jobicy] Fetched ${jobs.length} remote jobs`);
    return jobs as unknown as NewOpportunity[];
  } catch (err) {
    console.log("[jobicy] Failed:", (err as Error).message);
    return [];
  }
}
