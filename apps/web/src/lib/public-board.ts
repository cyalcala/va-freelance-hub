import type { DirectoryCategory } from "./directory-categories";
import { isDirectoryNiche } from "./directory-categories";
import type { FreshFilter } from "./public-query";
import { classifyShift, type ShiftCategory } from "@va-hub/scraper";

/** Public job card plus the fields a detail page can render without another scan. */
export type PublicJob = {
  id: number;
  title: string;
  company: string | null;
  type: "VA" | "freelance" | "project" | "full-time" | "part-time";
  sourceUrl: string;
  sourcePlatform: string;
  sourceId: string | null;
  tags: string[];
  category: string;
  experienceLevel: "entry" | "mid" | "senior" | "any" | null;
  postedAt: string | null;
  scrapedAt: string | null;
  geoScope: "worldwide" | "apac_incl_ph" | "ph_only" | "region_excl_ph" | "country_locked" | "unknown" | null;
  phEligibility: "eligible_verified" | "eligible_likely" | "unclear" | "ineligible" | null;
  geoEvidence: string | null;
  /** At most 2000 characters. The detail page displays at most the first 500. */
  description: string | null;
  clientTimezone: string | null;
  locationType: "remote" | "hybrid" | "onsite" | null;
  payRange: string | null;
  updatedAt: string | null;
  shiftCategory?: ShiftCategory | null;
  isDayshift?: boolean;
};

export type PublicDirectoryRow = {
  id: number;
  companyName: string;
  website: string | null;
  niche: string;
  isDayshift: boolean;
  isVerified: boolean;
  isRemote: boolean;
  isMarketplace: boolean;
};

export type PublicBoard = {
  generatedAt: string;
  jobs: PublicJob[];
  directory: PublicDirectoryRow[];
};

const FEATURED_PLATFORMS = new Set([
  "20Four7VA",
  "Sourcefit",
  "Yokly",
  "VALUE Virtual Assistants",
  "Remote Craft",
  "MultiplyMii",
]);

/** Parse SQLite `datetime` and ISO timestamps as UTC. */
export function timestampMs(value: string | null | undefined): number {
  if (!value) return 0;
  const trimmed = value.trim();
  if (!trimmed) return 0;
  const iso = trimmed.includes("T") ? trimmed : `${trimmed.replace(" ", "T")}Z`;
  const parsed = Date.parse(iso);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function effectivePostedMs(job: Pick<PublicJob, "postedAt" | "scrapedAt">): number {
  return timestampMs(job.postedAt) || timestampMs(job.scrapedAt);
}

function manilaDay(ms: number): string {
  return new Date(ms + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function matchesFreshFilter(
  scrapedAt: string | null,
  fresh: FreshFilter,
  now: number,
): boolean {
  const seen = timestampMs(scrapedAt);
  if (!seen) return false;
  if (fresh === "24h") return seen >= now - 86_400_000;
  return manilaDay(seen) === manilaDay(now);
}

function tokenPattern(token: string): RegExp {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^\\p{L}\\p{N}_])${escaped}([^\\p{L}\\p{N}_]|$)`, "iu");
}

/** Quoted FTS tokens are required words, matched on title, company and tags. */
export function matchesJobQuery(job: PublicJob, query: string): boolean {
  const tokens = query.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const haystack = [job.title, job.company ?? "", job.tags.join(" ")].join(" ");
  return tokens.every((token) => tokenPattern(token).test(haystack));
}

export function isFeaturedAgencyJob(job: PublicJob): boolean {
  const sourceId = job.sourceId ?? "";
  return sourceId.startsWith("breezy:")
    || sourceId.startsWith("workable:")
    || sourceId.startsWith("ashby:")
    || FEATURED_PLATFORMS.has(job.sourcePlatform);
}

function byEffectiveDesc(a: PublicJob, b: PublicJob): number {
  return effectivePostedMs(b) - effectivePostedMs(a) || b.id - a.id;
}

function byScrapedDesc(a: PublicJob, b: PublicJob): number {
  return timestampMs(b.scrapedAt) - timestampMs(a.scrapedAt) || b.id - a.id;
}

export function publicPlatforms(jobs: readonly PublicJob[]): string[] {
  return [...new Set(jobs.map((job) => job.sourcePlatform).filter(Boolean))]
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

export function slicePublicJobs(
  jobs: readonly PublicJob[],
  options: {
    category?: string;
    type?: string;
    platform?: string;
    geoScope?: string;
    fresh?: FreshFilter | null;
    shift?: string | null;
    query?: string;
    offset: number;
    limit: number;
    now?: number;
  },
): { total: number; jobs: PublicJob[] } {
  const now = options.now ?? Date.now();
  const filtered = jobs.filter((job) => {
    if (options.category && job.category !== options.category) return false;
    if (options.type && job.type !== options.type) return false;
    if (options.platform && job.sourcePlatform !== options.platform) return false;
    if (options.geoScope && job.geoScope !== options.geoScope) return false;
    if (options.fresh && !matchesFreshFilter(job.scrapedAt, options.fresh, now)) return false;
    if (options.query && !matchesJobQuery(job, options.query)) return false;
    if (options.shift === "day_shift" && classifyShift(job).category !== "day_shift") return false;
    if (options.shift === "flexible" && classifyShift(job).category !== "flexible") return false;
    return true;
  });
  const ordered = [...filtered].sort(options.fresh ? byScrapedDesc : byEffectiveDesc);
  return {
    total: ordered.length,
    jobs: ordered.slice(options.offset, options.offset + options.limit),
  };
}

export function sliceDirectory(
  rows: readonly PublicDirectoryRow[],
  options: {
    query: string;
    category: DirectoryCategory | null;
    offset: number;
    limit: number;
  },
): { total: number; rows: PublicDirectoryRow[] } {
  const needle = options.query.trim().toLowerCase();
  const filtered = rows.filter((row) => {
    if (options.category === "dayshift" && !row.isDayshift) return false;
    if (options.category === "marketplaces" && !row.isMarketplace) return false;
    if (options.category && isDirectoryNiche(options.category) && row.niche !== options.category) return false;
    if (needle && !row.companyName.toLowerCase().includes(needle)) return false;
    return true;
  });
  const ordered = [...filtered].sort((a, b) => (
    a.companyName < b.companyName ? -1 : a.companyName > b.companyName ? 1 : a.id - b.id
  ));
  return {
    total: ordered.length,
    rows: ordered.slice(options.offset, options.offset + options.limit),
  };
}

export function findPublicJob(jobs: readonly PublicJob[], id: number): PublicJob | null {
  return jobs.find((job) => job.id === id) ?? null;
}
