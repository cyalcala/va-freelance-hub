import type { NewOpportunity } from "@va-hub/db";

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

function toContentHash(title: string, sourceUrl: string): string {
  const str = `${title}::${sourceUrl}`;
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return ((h1 >>> 0).toString(16).padStart(8, "0") + (h2 >>> 0).toString(16).padStart(8, "0")).slice(0, 16);
}

function greenhouseLocationSummary(job: any): string | null {
  const location = normalizeText(job?.location?.name);
  return location ? `Location: ${location}` : null;
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
  platform: "lever" | "greenhouse" | "workable" | "breezy",
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
