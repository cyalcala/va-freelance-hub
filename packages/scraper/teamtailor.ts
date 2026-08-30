/**
 * SP-14 — Teamtailor public `/jobs.rss` adapter (pure parsing, plus a thin
 * fetch wrapper). A genuinely new adapter — Teamtailor is not one of the
 * five platforms in `AtsPlatform` (packages/scraper/ats.ts). This file
 * intentionally does not extend that union or touch scrape.ts's existing
 * ATS fetch loop, keeping this unit self-contained and non-invasive.
 *
 * Curated per the plan's own warning against domain suffix-guessing: this
 * targets `career.teamtailor.com` specifically because Teamtailor's own
 * support documentation (support.teamtailor.com/en/articles/11171756) uses
 * it as the canonical worked example for the RSS feature, and it is
 * genuinely the vendor's own dogfooded careers page — the same
 * durable-provenance pattern SP-11 (Lever) and SP-13 (SmartRecruiters) used.
 *
 * Verified live this session: the feed's `<description>` carries the FULL
 * HTML job description (not a summary) — this adapter actively discards it
 * entirely, matching the minimal-content precedent set by `fetchGreenhouse`
 * (packages/scraper/ats.ts). `<link>` is a real, direct, canonical URL —
 * unlike SP-13 (SmartRecruiters), nothing needs to be derived/reconstructed.
 *
 * Official docs: https://support.teamtailor.com/en/articles/11171756-rss-feed-how-to-guide
 */

import { XMLParser } from "fast-xml-parser";

export const TEAMTAILOR_RSS_PARAMS_DOC =
  "offset and per_page query params; the feed has no total-count field, so pagination continues only while a full page (itemsInPage === perPage) is returned.";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  processEntities: false,
  htmlEntities: true,
});

export function teamtailorFeedUrl(careerDomain: string, offset = 0, perPage = 100): string {
  const base = `https://${careerDomain}/jobs.rss`;
  return offset === 0 && perPage === 100 ? base : `${base}?offset=${offset}&per_page=${perPage}`;
}

export interface NormalizedTeamtailorPosting {
  guid: string;
  title: string;
  link: string;
  postedAt: string | null;
  remoteStatus: string | null;
  locationSummary: string | null;
  department: string | null;
  role: string | null;
}

function textOrNull(v: unknown): string | null {
  if (typeof v === "string") {
    const t = v.trim();
    return t === "" ? null : t;
  }
  return null;
}

function normalizeDate(rawDate: unknown): string | null {
  if (typeof rawDate !== "string" || !rawDate) return null;
  const d = new Date(rawDate);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function asArray<T>(v: T | T[] | undefined | null): T[] {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

interface RawTeamtailorLocation {
  "tt:name"?: string;
  "tt:city"?: string;
  "tt:country"?: string;
}

interface RawTeamtailorItem {
  title?: string;
  link?: string;
  guid?: string;
  pubDate?: string;
  remoteStatus?: string;
  "tt:department"?: string;
  "tt:role"?: string;
  "tt:locations"?: {
    "tt:location"?: RawTeamtailorLocation | RawTeamtailorLocation[];
  };
}

function summarizeLocations(raw: RawTeamtailorItem["tt:locations"]): string | null {
  const locs = asArray(raw?.["tt:location"]);
  const parts = locs
    .map((l) => [l["tt:city"], l["tt:country"]].filter((s) => typeof s === "string" && s.trim() !== "").join(", "))
    .filter((s) => s !== "");
  return parts.length > 0 ? parts.join(" / ") : null;
}

/** Pure. Never includes the feed's <description> (full HTML job content) —
 * discarded entirely, matching the minimal-content precedent. */
export function parseTeamtailorRssXml(xmlText: string): NormalizedTeamtailorPosting[] {
  let doc: any;
  try {
    doc = parser.parse(xmlText);
  } catch {
    return [];
  }
  const items: RawTeamtailorItem[] = asArray(doc?.rss?.channel?.item);
  return items
    .filter((it) => typeof it?.title === "string" && typeof it?.link === "string" && typeof it?.guid === "string")
    .map((it) => ({
      guid: it.guid as string,
      title: (it.title as string).trim(),
      link: it.link as string,
      postedAt: normalizeDate(it.pubDate),
      remoteStatus: textOrNull(it.remoteStatus),
      locationSummary: summarizeLocations(it["tt:locations"]),
      department: textOrNull(it["tt:department"]),
      role: textOrNull(it["tt:role"]),
    }));
}

/** Pure. The feed has no total-count field (unlike SmartRecruiters'
 * totalFound) — the standard feed-pagination heuristic applies: keep
 * paging only while a full page was returned. */
export function hasMoreTeamtailorPages(itemsInPage: number, perPage: number): boolean {
  return itemsInPage === perPage && itemsInPage > 0;
}

export async function fetchTeamtailorFeed(
  careerDomain: string,
  opts: { offset?: number; perPage?: number; fetchImpl?: typeof fetch } = {},
): Promise<{ postings: NormalizedTeamtailorPosting[]; hasMore: boolean }> {
  const offset = opts.offset ?? 0;
  const perPage = opts.perPage ?? 100;
  const fetchImpl = opts.fetchImpl ?? fetch;
  const res = await fetchImpl(teamtailorFeedUrl(careerDomain, offset, perPage));
  if (!res.ok) throw new Error(`Teamtailor HTTP ${res.status}`);
  const xmlText = await res.text();
  const postings = parseTeamtailorRssXml(xmlText);
  return { postings, hasMore: hasMoreTeamtailorPages(postings.length, perPage) };
}
