/**
 * VA.INDEX — High-Velocity JSON Harvesting Module
 * 
 * POLICY: We only consume data from public JSON search endpoints
 * used by the frontend of these platforms. This is a read-only
 * "Probe" approach, adhering to 0-cost and ethical harvesting.
 */

import { createHash } from "crypto";
import type { NewOpportunity } from "@va-hub/db/schema";

export interface JSONSource {
  id: string;
  name: string;
  url: string;
  platform: string;
  type: "JobStreet" | "Indeed";
  defaultJobType: "VA" | "freelance" | "project" | "full-time" | "part-time";
  tags: string[];
}

function toHash(title: string, url: string) {
  return createHash("sha256").update(`${title}::${url}`).digest("hex").slice(0, 16);
}

export async function fetchJSONFeed(source: JSONSource): Promise<NewOpportunity[]> {
  try {
    const res = await fetch(`${source.url}${source.url.includes('?') ? '&' : '?'}t=${Date.now()}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_8 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1",
        "Accept": "application/json",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache"
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      console.log(`[json-harvest] ${source.name}: HTTP ${res.status}`);
      return [];
    }

    const data = await res.json();
    
    if (source.type === "JobStreet") {
      return parseJobStreet(data, source);
    } else if (source.type === "Indeed") {
      return parseIndeed(data, source);
    }

    return [];
  } catch (err) {
    console.log(`[json-harvest] ${source.name} failed:`, (err as Error).message);
    return [];
  }
}

function parseJobStreet(data: any, source: JSONSource): NewOpportunity[] {
  // JobStreet Chalice v4 response structure
  const jobs = data?.results || data?.data || [];
  return jobs.map((job: any) => {
    const title = job.title || job.jobTitle;
    const company = job.advertiser?.description || job.companyName;
    const jobId = job.id || job.jobId;
    const sourceUrl = `https://www.jobstreet.com.ph/en/job/${jobId}`;
    
    if (!title || !jobId) return null;

    return {
      id: crypto.randomUUID(),
      title,
      company: company || "Unknown Company",
      type: source.defaultJobType,
      sourceUrl,
      sourcePlatform: source.platform,
      tags: [...source.tags, ...(job.classifications?.[0]?.description ? [job.classifications[0].description] : [])],
      locationType: "remote",
      description: job.teaser || job.bulletPoints?.join(". ") || null,
      postedAt: job.listingDate ? new Date(job.listingDate) : new Date(),
      scrapedAt: new Date(),
      isActive: true,
      contentHash: toHash(title, sourceUrl),
      latestActivityMs: job.listingDate ? new Date(job.listingDate).getTime() : Date.now(),
      companyLogo: job.advertiser?.logo?.url || null,
      __raw: job,
      metadata: {
        salary: job.salary || null,
        workType: job.workType || null,
        isNew: job.isNew || false,
      } as any
    };
  }).filter(Boolean);
}

function parseIndeed(data: any, source: JSONSource): NewOpportunity[] {
  // Indeed Mobile XHR/JSON structure
  const results = data?.results || data?.jobs || [];
  return results.map((job: any) => {
    const title = job.jobTitle || job.title;
    const company = job.company || job.companyName;
    const jk = job.jobKey || job.jk;
    const sourceUrl = `https://www.indeed.com/viewjob?jk=${jk}`;

    if (!title || !jk) return null;

    return {
      id: crypto.randomUUID(),
      title,
      company: company || "Unknown Company",
      type: source.defaultJobType,
      sourceUrl,
      sourcePlatform: source.platform,
      tags: source.tags,
      locationType: "remote",
      description: job.snippet || null,
      postedAt: job.pubDate ? new Date(job.pubDate) : new Date(),
      scrapedAt: new Date(),
      isActive: true,
      contentHash: toHash(title, sourceUrl),
      latestActivityMs: job.pubDate ? new Date(job.pubDate).getTime() : Date.now(),
      companyLogo: job.companyLogoUrl || null,
      __raw: job,
      metadata: {
        salary: job.salaryText || null,
        formattedLocation: job.formattedLocation || null,
      } as any
    };
  }).filter(Boolean);
}
