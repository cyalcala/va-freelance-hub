/**
 * VA.INDEX — Ethical Data Harvesting Module
 * 
 * POLICY: We ONLY consume data from public RSS/Atom feeds that companies
 * and job boards intentionally publish for syndication. These are channels
 * that "scream to be found" — companies PAY to list on these boards 
 * specifically to reach applicants.
 * 
 * We do NOT:
 * - Scrape HTML pages
 * - Bypass authentication or rate limits
 * - Collect personal/private data
 * - Access any endpoint that returns 403/robots.txt blocked
 * 
 * Every source below has a public, openly advertised RSS/Atom feed.
 */

import { XMLParser } from "fast-xml-parser";
import { createHash } from "crypto";
import type { NewOpportunity } from "./db";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  processEntities: false,
  htmlEntities: true,
});

export interface Source {
  id: string;
  name: string;
  url: string;
  platform: string;
  defaultJobType: "VA" | "freelance" | "project" | "full-time" | "part-time";
  tags: string[];
  ethical_note: string; // Why this source is ethical
}

export const rssSources: Source[] = [
  // ── LOCAL PHILIPPINES PRIORITY ──────────────────────────────
  {
    id: "onlinejobs-blog",
    name: "OnlineJobs.ph Insiders",
    url: "https://www.onlinejobs.ph/blog/feed/",
    platform: "OnlineJobs",
    defaultJobType: "VA",
    tags: ["philippines", "tips", "hiring"],
    ethical_note: "Public blog RSS feed. OnlineJobs.ph is the #1 Filipino VA job board.",
  },

  // ── GLOBAL REMOTE JOB BOARDS (Public RSS) ──────────────────
  {
    id: "himalayas",
    name: "Himalayas",
    url: "https://himalayas.app/jobs/rss",
    platform: "Himalayas",
    defaultJobType: "full-time",
    tags: ["remote", "global"],
    ethical_note: "Official public RSS feed provided by Himalayas for job syndication.",
  },
  {
    id: "we-work-remotely",
    name: "We Work Remotely",
    url: "https://weworkremotely.com/remote-jobs.rss",
    platform: "WeWorkRemotely",
    defaultJobType: "full-time",
    tags: ["remote", "global"],
    ethical_note: "Public RSS feed offered by WWR since 2013. Companies pay to post.",
  },
  {
    id: "remote-ok",
    name: "Remote OK",
    url: "https://remoteok.com/remote-jobs.rss",
    platform: "RemoteOK",
    defaultJobType: "full-time",
    tags: ["remote", "high-pay"],
    ethical_note: "Public RSS feed. RemoteOK openly provides this for syndication.",
  },
  {
    id: "problogger",
    name: "ProBlogger Jobs",
    url: "https://problogger.com/jobs/feed/",
    platform: "ProBlogger",
    defaultJobType: "freelance",
    tags: ["writing", "creative", "content"],
    ethical_note: "Public RSS job board feed. Companies pay to list writing/creative roles.",
  },
  {
    id: "jobicy",
    name: "Jobicy",
    url: "https://jobicy.com/feed/newjobs",
    platform: "Jobicy",
    defaultJobType: "full-time",
    tags: ["remote", "global", "tech"],
    ethical_note: "Public RSS feed explicitly provided at jobicy.com/feed/newjobs for syndication.",
  },
];

function toHash(title: string, url: string) {
  return createHash("sha256").update(`${title}::${url}`).digest("hex").slice(0, 16);
}

function stripHtml(s: string | undefined) {
  return s?.replace(/<[^>]*>/g, "").trim() ?? "";
}

export async function fetchRSSFeed(source: Source): Promise<NewOpportunity[]> {
  try {
    const res = await fetch(source.url, {
      headers: {
        "User-Agent": "VA.INDEX/1.0 (https://va-freelance-hub-web.vercel.app; ethical-harvester; public-rss-only)",
        "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(12_000),
    });

    // Respect access control — if a source blocks us, we skip it, not bypass
    if (res.status === 403 || res.status === 401) {
      console.log(`[harvest] ${source.name}: Access denied (${res.status}) — respecting their policy, skipping.`);
      return [];
    }
    if (!res.ok) {
      console.log(`[harvest] ${source.name}: HTTP ${res.status}`);
      return [];
    }

    const xml = await res.text();
    const parsed = parser.parse(xml);
    const channel = parsed?.rss?.channel ?? parsed?.feed;
    const rawItems = channel?.item ?? channel?.entry ?? [];
    const items = Array.isArray(rawItems) ? rawItems : [rawItems];

    return items
      .filter((item: any) => item.title && (item.link ?? item.id))
      .map((item: any) => {
        const title = stripHtml(
          typeof item.title === "string" ? item.title : item.title?.["#text"] ?? ""
        );
        const link =
          typeof item.link === "string"
            ? item.link
            : (item.link?.["@_href"] ?? item.id ?? "");
        const sourceUrl = link.trim();
        if (!title || !sourceUrl) return null;

        return {
          id: crypto.randomUUID(),
          title,
          company: stripHtml(item["dc:creator"] ?? item.author) || null,
          type: source.defaultJobType,
          sourceUrl,
          sourcePlatform: source.platform,
          tags: source.tags,
          locationType: "remote" as const,
          payRange: null,
          description: stripHtml(item.description ?? "").slice(0, 500) || null,
          postedAt: (() => {
            const rawDate = item.pubDate || item.published || item.updated || item["dc:date"];
            return rawDate ? new Date(rawDate) : new Date();
          })(),
          scrapedAt: new Date(),
          isActive: true,
          contentHash: toHash(title, sourceUrl),
        } as unknown as NewOpportunity;
      })
      .filter(Boolean) as NewOpportunity[];
  } catch (err) {
    console.log(`[harvest] ${source.name} failed:`, (err as Error).message);
    return [];
  }
}
