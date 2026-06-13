import type { NewOpportunity } from "@va-hub/db";
import type { Source } from "./sources";

interface RemoteOkJob {
  id?: string | number;
  date?: string;
  company?: string;
  position?: string;
  tags?: string[];
  description?: string;
  apply_url?: string;
  url?: string;
  salary_min?: number;
  salary_max?: number;
}

function decodeHtmlEntities(raw: string): string {
  return raw
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}

export function normalizeText(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return decodeHtmlEntities(raw)
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeDate(rawDate: unknown): string | null {
  if (typeof rawDate !== "string") return null;
  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

export function normalizeRemoteOkUrl(rawUrl: unknown): string | null {
  if (typeof rawUrl !== "string" || !rawUrl.trim()) return null;
  try {
    const url = new URL(rawUrl.trim());
    if (url.hostname.toLowerCase() !== "remoteok.com") return null;
    url.protocol = "https:";
    url.hostname = "remoteok.com";
    return url.toString();
  } catch {
    return null;
  }
}

export function normalizePayRange(min: unknown, max: unknown): string | null {
  const minSalary = typeof min === "number" ? min : 0;
  const maxSalary = typeof max === "number" ? max : 0;
  if (minSalary <= 0 && maxSalary <= 0) return null;
  if (minSalary > 0 && maxSalary > 0) return `USD ${minSalary}-${maxSalary}`;
  return `USD ${minSalary || maxSalary}`;
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

function isRemoteOkJob(value: unknown): value is RemoteOkJob {
  if (!value || typeof value !== "object") return false;
  const job = value as RemoteOkJob;
  return Boolean(job.position && (job.url || job.apply_url));
}

export function isLikelyPlaceholderTitle(title: string): boolean {
  const normalized = title.toLowerCase().trim();
  if (!normalized) return true;
  if (["test", "sdf", "asdffd", "sadfsdf", "sdsfda"].includes(normalized)) return true;
  return false;
}

export const HUB_RELEVANT_ROLE_REGEX =
  /\b(admin|assistant|virtual assistant|customer|support|success|marketing|sales|seo|content|writer|copywriter|editor|designer|design|developer|engineer|software|data|analyst|bookkeeper|accounting|finance|operations|recruiter|hr|project manager|product manager|qa|tester|testing|e-?commerce|shopify|community|technical|devops|it support)\b/i;

export const PHYSICAL_OR_LOGISTICS_ROLE_REGEX =
  /\b(courier|mail carrier|driver|delivery|warehouse|forklift|photographer|civil engineer|logistics|fulfillment operations)\b/i;

export function isRelevantForHub(title: string, description: string): boolean {
  const searchableText = `${title} ${description.slice(0, 500)}`;
  return HUB_RELEVANT_ROLE_REGEX.test(searchableText) && !PHYSICAL_OR_LOGISTICS_ROLE_REGEX.test(searchableText);
}

export async function fetchJSONSource(source: Source): Promise<NewOpportunity[]> {
  console.log(`[json] Fetching ${source.name}...`);

  let data: unknown;
  try {
    const res = await fetch(source.url, {
      headers: {
        "User-Agent": "va-freelance-hub/1.0 (+https://github.com/cyalcala/va-freelance-hub)",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
  } catch (err) {
    console.error(`[json] Failed to fetch ${source.name}:`, err);
    throw new Error(`[json] Failed to fetch ${source.name}: ${(err as Error).message}`);
  }

  if (!Array.isArray(data)) {
    throw new Error(`[json] Failed to parse ${source.name}: expected an array response`);
  }

  const jobs = data.filter(isRemoteOkJob);
  const cappedJobs = typeof source.maxItems === "number" ? jobs.slice(0, source.maxItems) : jobs;
  if (cappedJobs.length < jobs.length) {
    console.log(`[json] ${source.name}: capped ${jobs.length} raw jobs to ${cappedJobs.length}`);
  }

  const opportunities: NewOpportunity[] = cappedJobs
    .map((job) => {
      const title = normalizeText(job.position);
      const sourceUrl = normalizeRemoteOkUrl(job.url) ?? normalizeRemoteOkUrl(job.apply_url);
      if (!title || !sourceUrl || isLikelyPlaceholderTitle(title)) return null;
      const description = normalizeText(job.description);
      if (!isRelevantForHub(title, description)) return null;

      const jobTags = Array.isArray(job.tags) ? job.tags.map(String) : [];
      const tags = Array.from(new Set([...source.tags, ...jobTags]))
        .map((tag) => tag.toLowerCase().trim())
        .filter(Boolean)
        .slice(0, 12);

      return {
        title,
        company: normalizeText(job.company) || null,
        type: source.defaultJobType,
        sourceUrl,
        sourcePlatform: source.platform,
        tags,
        locationType: "remote" as const,
        payRange: normalizePayRange(job.salary_min, job.salary_max),
        description: description.slice(0, 1500) || null,
        applicationUrl: normalizeRemoteOkUrl(job.apply_url) ?? sourceUrl,
        postedAt: normalizeDate(job.date),
        isActive: true,
        contentHash: toContentHash(title, sourceUrl),
      } satisfies NewOpportunity;
    })
    .filter((job): job is NewOpportunity => job !== null);

  console.log(`[json] ${source.name}: ${opportunities.length} items`);
  return opportunities;
}
