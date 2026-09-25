/**
 * Himalayas Public Remote Jobs API Adapter (pure parsing, normalization, and conversion).
 *
 * Implements the external candidate reservoir adapter for Himalayas (https://himalayas.app),
 * which provides an unauthenticated, documented public REST API for remote jobs.
 *
 * Compliance & Policy alignment:
 * - Public API / no authentication required (https://himalayas.app/docs/remote-jobs-api).
 * - Robots allows / and /jobs/api (no anti-bot or paywall bypass).
 * - Retains minimal discovery metadata (title, company, URL, location, salary, date).
 * - Enforces canonical linkback and attribution to original postings and Himalayas.
 * - Pure parsing and conversion: zero side-effects, fully deterministic and testable.
 */

import type { NewOpportunity } from "@va-hub/db";
import { decodeHtmlEntities, fixMojibake } from "./text";
import { toContentHash } from "./contentHash";

export const HIMALAYAS_API_BASE = "https://himalayas.app/jobs/api";
export const HIMALAYAS_SEARCH_API = "https://himalayas.app/jobs/api/search";
export const HIMALAYAS_PROVIDER_ID = "himalayas";
export const HIMALAYAS_SOURCE_ID = "himalayas:remote-jobs";

export interface RawHimalayasJob {
  title?: unknown;
  companyName?: unknown;
  companySlug?: unknown;
  applicationLink?: unknown;
  guid?: unknown;
  pubDate?: unknown;
  expiryDate?: unknown;
  employmentType?: unknown;
  categories?: unknown;
  parentCategories?: unknown;
  locationRestrictions?: unknown;
  timezoneRestrictions?: unknown;
  minSalary?: unknown;
  maxSalary?: unknown;
  currency?: unknown;
  salaryPeriod?: unknown;
  description?: unknown;
  excerpt?: unknown;
}

export interface RawHimalayasResponse {
  jobs?: unknown;
  total_count?: unknown;
  cursor?: unknown;
}

export interface NormalizedHimalayasJob {
  title: string;
  companyName: string;
  companySlug: string | null;
  applicationLink: string;
  guid: string;
  postedAt: string | null;
  employmentType: string | null;
  categories: string[];
  locationRestrictions: string[];
  isWorldwide: boolean;
  isPhilippinesExplicit: boolean;
  minSalary: number | null;
  maxSalary: number | null;
  currency: string | null;
  salaryPeriod: string | null;
  excerpt: string | null;
}

function cleanText(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return decodeHtmlEntities(fixMojibake(raw))
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseHimalayasPubDate(rawDate: unknown): string | null {
  if (rawDate === null || rawDate === undefined) return null;

  // Numeric epoch: seconds vs milliseconds
  if (typeof rawDate === "number") {
    if (Number.isNaN(rawDate) || rawDate <= 0) return null;
    const ms = rawDate < 1e11 ? rawDate * 1000 : rawDate;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }

  // String numeric epoch or ISO-8601
  if (typeof rawDate === "string") {
    const trimmed = rawDate.trim();
    if (!trimmed) return null;
    if (/^\d+$/.test(trimmed)) {
      const num = Number(trimmed);
      if (Number.isNaN(num) || num <= 0) return null;
      const ms = num < 1e11 ? num * 1000 : num;
      const d = new Date(ms);
      return Number.isNaN(d.getTime()) ? null : d.toISOString();
    }
    const d = new Date(trimmed);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }

  return null;
}

export function parseLocationRestrictions(raw: unknown): {
  locations: string[];
  isWorldwide: boolean;
  isPhilippinesExplicit: boolean;
} {
  if (!raw) {
    return { locations: ["Worldwide"], isWorldwide: true, isPhilippinesExplicit: false };
  }

  let list: string[] = [];

  if (Array.isArray(raw)) {
    list = raw.map((item) => cleanText(item)).filter(Boolean);
  } else if (typeof raw === "string") {
    const cleaned = cleanText(raw);
    if (!cleaned) {
      return { locations: ["Worldwide"], isWorldwide: true, isPhilippinesExplicit: false };
    }
    // If comma or semicolon separated
    if (cleaned.includes(",") || cleaned.includes(";")) {
      list = cleaned.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
    } else {
      list = [cleaned];
    }
  }

  if (list.length === 0) {
    return { locations: ["Worldwide"], isWorldwide: true, isPhilippinesExplicit: false };
  }

  const isWorldwide = list.some((loc) =>
    /\b(worldwide|anywhere|global|all locations|open to all)\b/i.test(loc)
  );

  const isPhilippinesExplicit = list.some((loc) =>
    /\b(philippines|philippine|filipino|ph)\b/i.test(loc)
  );

  return {
    locations: list,
    isWorldwide,
    isPhilippinesExplicit,
  };
}

export function normalizeHimalayasPayRange(
  min: unknown,
  max: unknown,
  curr: unknown,
  period: unknown,
): string | null {
  const minVal = typeof min === "number" && min > 0 ? min : null;
  const maxVal = typeof max === "number" && max > 0 ? max : null;
  if (!minVal && !maxVal) return null;

  const currency = typeof curr === "string" && curr.trim() ? curr.trim().toUpperCase() : "USD";
  const periodStr = typeof period === "string" && period.trim() ? ` / ${period.trim().toLowerCase()}` : "";

  if (minVal && maxVal) {
    return `${currency} ${minVal.toLocaleString()}-${maxVal.toLocaleString()}${periodStr}`;
  }
  return `${currency} ${(minVal || maxVal)!.toLocaleString()}${periodStr}`;
}

/**
 * Pure parser for Himalayas API response payload.
 */
export function parseHimalayasResponse(raw: unknown): NormalizedHimalayasJob[] {
  if (!raw || typeof raw !== "object") {
    return [];
  }

  const resp = raw as RawHimalayasResponse;
  if (!Array.isArray(resp.jobs)) {
    return [];
  }

  const normalized: NormalizedHimalayasJob[] = [];

  for (const item of resp.jobs) {
    if (!item || typeof item !== "object") continue;
    const job = item as RawHimalayasJob;

    const title = cleanText(job.title);
    const companyName = cleanText(job.companyName);
    const applicationLink = cleanText(job.applicationLink) || cleanText(job.guid);
    const guid = cleanText(job.guid) || applicationLink;

    if (!title || !companyName || !applicationLink) {
      continue;
    }

    const { locations, isWorldwide, isPhilippinesExplicit } = parseLocationRestrictions(
      job.locationRestrictions,
    );

    const categories: string[] = [];
    if (Array.isArray(job.categories)) {
      for (const cat of job.categories) {
        const c = cleanText(cat);
        if (c && !categories.includes(c.toLowerCase())) {
          categories.push(c.toLowerCase());
        }
      }
    }

    normalized.push({
      title,
      companyName,
      companySlug: cleanText(job.companySlug) || null,
      applicationLink,
      guid,
      postedAt: parseHimalayasPubDate(job.pubDate),
      employmentType: cleanText(job.employmentType) || null,
      categories,
      locationRestrictions: locations,
      isWorldwide,
      isPhilippinesExplicit,
      minSalary: typeof job.minSalary === "number" ? job.minSalary : null,
      maxSalary: typeof job.maxSalary === "number" ? job.maxSalary : null,
      currency: cleanText(job.currency) || null,
      salaryPeriod: cleanText(job.salaryPeriod) || null,
      excerpt: cleanText(job.excerpt) || cleanText(job.description).slice(0, 500) || null,
    });
  }

  return normalized;
}

/**
 * Filter candidates that are either explicitly open to the Philippines or Worldwide/no-restriction.
 */
export function filterHimalayasPlausibleCandidates(
  jobs: NormalizedHimalayasJob[],
): NormalizedHimalayasJob[] {
  return jobs.filter((job) => job.isPhilippinesExplicit || job.isWorldwide);
}

/**
 * Map normalized Himalayas job to the canonical NewOpportunity DB shape.
 */
export function himalayasJobToOpportunity(
  job: NormalizedHimalayasJob,
  sourceId: string = HIMALAYAS_SOURCE_ID,
): NewOpportunity {
  const locationRaw = job.isPhilippinesExplicit
    ? "Philippines (Remote)"
    : job.isWorldwide
      ? "Worldwide (Remote)"
      : job.locationRestrictions.slice(0, 3).join(", ");

  const tags = Array.from(
    new Set(["remote", "himalayas", ...job.categories.slice(0, 8)]),
  );

  const payRange = normalizeHimalayasPayRange(
    job.minSalary,
    job.maxSalary,
    job.currency,
    job.salaryPeriod,
  );

  const jobType = job.employmentType?.toLowerCase().includes("contract")
    ? "freelance"
    : "full-time";

  return {
    title: job.title,
    company: job.companyName,
    type: jobType,
    sourceUrl: job.applicationLink,
    sourcePlatform: "Himalayas",
    tags,
    locationType: "remote",
    locationRaw,
    payRange,
    description: job.excerpt ? job.excerpt.slice(0, 1500) : null,
    applicationUrl: job.applicationLink,
    postedAt: job.postedAt,
    isActive: true,
    contentHash: toContentHash(job.title, job.applicationLink),
    sourceId,
  };
}
