import type { NewOpportunity } from "@va-hub/db";
import { toContentHash } from "./contentHash";

function normalizeText(raw: string | undefined): string {
  if (!raw) return "";
  return raw.replace(/<[^>]*>/g, "").trim();
}

function safeNormalizeDate(rawDate: any): string | null {
  if (!rawDate) return null;
  try {
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return null;
    return d.toISOString();
  } catch (e) {
    return null;
  }
}

function greenhouseLocationSummary(job: any): string | null {
  const location = normalizeText(job?.location?.name);
  return location ? `Location: ${location}` : null;
}

function ashbyLocationSummary(job: any): string | null {
  const location = normalizeText(typeof job?.location === "string" ? job.location : job?.location?.name);
  const remote = job?.isRemote === true ? " Remote: yes." : job?.isRemote === false ? " Remote: no." : "";
  if (!location && !remote) return null;
  return `${location ? `Location: ${location}.` : ""}${remote}`.trim() || null;
}

function breezyLocationSummary(job: any): string | null {
  const locations = Array.isArray(job?.locations) ? job.locations : [job?.location];
  const names = locations
    .map((location: any) => normalizeText(location?.name))
    .filter(Boolean);

  if (names.length === 0) return null;

  const remoteSignals = locations
    .map((location: any) => location?.is_remote)
    .filter((value: unknown) => typeof value === "boolean");
  const remoteText = remoteSignals.length > 0 ? ` Remote: ${remoteSignals.some(Boolean) ? "yes" : "no"}.` : "";
  return `Location: ${Array.from(new Set(names)).join("; ")}.${remoteText}`;
}

export async function fetchATSFeed(
  platform: "lever" | "greenhouse" | "workable" | "breezy" | "ashby",
  token: string,
  companyName: string
): Promise<NewOpportunity[]> {
  console.log(`[ats] Fetching ${platform} feed for ${companyName} (${token})...`);

  try {
    switch (platform) {
      case "lever":
        return await fetchLever(token, companyName);
      case "greenhouse":
        return await fetchGreenhouse(token, companyName);
      case "workable":
        return await fetchWorkable(token, companyName);
      case "breezy":
        return await fetchBreezy(token, companyName);
      case "ashby":
        return await fetchAshby(token, companyName);
      default:
        throw new Error(`Unknown ATS platform: ${platform}`);
    }
  } catch (err) {
    const message = `[ats] Failed to fetch ${platform} feed for ${companyName}: ${(err as Error).message}`;
    console.error(message);
    throw new Error(message);
  }
}

async function fetchLever(token: string, companyName: string): Promise<NewOpportunity[]> {
  const res = await fetch(`https://api.lever.co/v0/postings/${token}?mode=json`, {
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Lever HTTP ${res.status}`);
  const data = await res.json() as any[];
  
  return data
    .filter((job) => job && job.text && job.hostedUrl)
    .map((job) => {
      const title = normalizeText(job.text);
      const sourceUrl = job.hostedUrl;
      return {
        title,
        company: companyName,
        type: "full-time",
        sourceUrl,
        sourcePlatform: companyName, // Use company name as platform for ATS jobs
        tags: [companyName.toLowerCase()],
        locationType: "remote",
        description: normalizeText(job.descriptionPlain || job.description).slice(0, 500) || null,
        postedAt: safeNormalizeDate(job.createdAt),
        isActive: true,
        contentHash: toContentHash(title, sourceUrl),
      };
    });
}

async function fetchGreenhouse(token: string, companyName: string): Promise<NewOpportunity[]> {
  const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${token}/jobs`, {
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Greenhouse HTTP ${res.status}`);
  const data = await res.json() as any;
  
  const jobs = data.jobs || [];
  return jobs
    .filter((job: any) => job && job.title && job.absolute_url)
    .map((job: any) => {
      const title = normalizeText(job.title);
      const sourceUrl = job.absolute_url;
      return {
        title,
        company: companyName,
        type: "full-time",
        sourceUrl,
        sourcePlatform: companyName,
        tags: [companyName.toLowerCase()],
        locationType: "remote",
        description: greenhouseLocationSummary(job),
        postedAt: safeNormalizeDate(job.updated_at),
        isActive: true,
        contentHash: toContentHash(title, sourceUrl),
      };
    });
}

// Ashby public posting API (jobs.ashbyhq.com boards). Official job-board
// distribution endpoint: robots-allowed, returns published/listed roles with a
// direct linkback to the Ashby-hosted posting. Added 2026-07-12 (RemoteWork3.8).
export async function fetchAshby(token: string, companyName: string): Promise<NewOpportunity[]> {
  const res = await fetch(`https://api.ashbyhq.com/posting-api/job-board/${token}`, {
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Ashby HTTP ${res.status}`);
  const data = await res.json() as any;
  if (!Array.isArray(data?.jobs)) {
    throw new Error(`Ashby feed for ${companyName} (${token}) did not return a jobs array`);
  }

  return data.jobs
    // isListed === false means the posting is hidden/unpublished; keep only listed roles.
    .filter((job: any) => job && job.isListed !== false && job.title && job.jobUrl)
    .map((job: any) => {
      const title = normalizeText(job.title);
      const sourceUrl = job.jobUrl;
      return {
        title,
        company: companyName,
        type: "full-time",
        sourceUrl,
        sourcePlatform: companyName,
        tags: [companyName.toLowerCase()],
        locationType: "remote" as const,
        applicationUrl: typeof job.applyUrl === "string" ? job.applyUrl : null,
        description: ashbyLocationSummary(job),
        postedAt: safeNormalizeDate(job.publishedAt),
        isActive: true,
        contentHash: toContentHash(title, sourceUrl),
      };
    });
}

async function fetchWorkable(token: string, companyName: string): Promise<NewOpportunity[]> {
  const res = await fetch(`https://apply.workable.com/api/v3/accounts/${token}/jobs`, {
    method: "POST", // Workable API often requires POST for the jobs listing
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: "", location: [], department: [], worktype: [], remote: [] }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Workable HTTP ${res.status}`);
  const data = await res.json() as any;
  
  const jobs = data.results || [];
  return jobs
    .filter((job: any) => job && job.title && job.shortcode)
    .map((job: any) => {
      const title = normalizeText(job.title);
      const sourceUrl = `https://apply.workable.com/${token}/j/${job.shortcode}/`;
      return {
        title,
        company: companyName,
        type: "full-time",
        sourceUrl,
        sourcePlatform: companyName,
        tags: [companyName.toLowerCase()],
        locationType: "remote",
        description: null,
        postedAt: safeNormalizeDate(job.published_on),
        isActive: true,
        contentHash: toContentHash(title, sourceUrl),
      };
    });
}

async function fetchBreezy(token: string, companyName: string): Promise<NewOpportunity[]> {
  const res = await fetch(`https://${token}.breezy.hr/json`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Breezy HTTP ${res.status}`);
  
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error(`Breezy feed for ${companyName} (${token}) returned non-JSON response`);
  }

  const data = await res.json() as any[];
  if (!Array.isArray(data)) {
    throw new Error(`Breezy feed for ${companyName} (${token}) did not return an array`);
  }
  
  return data
    .filter((job: any) => job && job.name && job.url)
    .map((job: any) => {
      const title = normalizeText(job.name);
      const sourceUrl = job.url;
      const payRange = normalizeText(job.salary) || null;
      return {
        title,
        company: companyName,
        type: "full-time",
        sourceUrl,
        sourcePlatform: companyName,
        tags: [companyName.toLowerCase()],
        locationType: "remote",
        payRange,
        description: breezyLocationSummary(job),
        postedAt: safeNormalizeDate(job.published_date),
        isActive: true,
        contentHash: toContentHash(title, sourceUrl),
      };
    });
}
