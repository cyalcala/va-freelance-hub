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

import { z } from "zod";
import { XMLParser } from "fast-xml-parser";
import { createHash } from "crypto";
import type { NewOpportunity } from "@va-hub/db/schema";
import { config } from "@va-hub/config";
import { normalizeDate } from "@va-hub/db";
import { proxyFetch } from "./proxy-fetch";
import { logger } from "@trigger.dev/sdk/v3";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  processEntities: false,
  htmlEntities: true,
});

// Strict RSS Item Schema
const RssItemSchema = z.object({
  title: z.union([z.string(), z.object({ "#text": z.string() })]),
  link: z.union([z.string(), z.object({ "@_href": z.string() })]).optional(),
  id: z.string().optional(),
  description: z.string().optional().default(""),
  "dc:creator": z.string().optional(),
  author: z.string().optional(),
  pubDate: z.string().optional(),
  published: z.string().optional(),
  updated: z.string().optional(),
  "dc:date": z.string().optional(),
});

export interface Source {
  id: string;
  name: string;
  url: string;
  platform: string;
  defaultJobType: "VA" | "freelance" | "project" | "full-time" | "part-time";
  tags: string[];
  ethical_note: string;
}

export const rssSources = config.rss_sources;

function toHash(title: string, url: string) {
  return createHash("sha256").update(`${title}::${url}`).digest("hex").slice(0, 16);
}

function stripHtml(s: string | undefined) {
  if (!s) return "";
  // Robust strip: remove tags and decode common entities
  return s
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim();
}

export async function fetchRSSFeed(source: Source): Promise<NewOpportunity[]> {
  try {
    const res = await proxyFetch(`${source.url}${source.url.includes('?') ? '&' : '?'}t=${Date.now()}`, {
      headers: {
        "Accept": "application/rss+xml, application/atom+xml, application/xml",
      },
      signal: AbortSignal.timeout(12_000),
    });

    if (res.status === 403 || res.status === 401) {
      console.warn(`[harvest] ${source.name}: Access denied (${res.status}) — respecting policy.`);
      return [];
    }
    if (!res.ok) {
      console.error(`[harvest] ${source.name}: HTTP ${res.status}`);
      return [];
    }

    const xml = await res.text();
    const parsed = parser.parse(xml);
    const channel = parsed?.rss?.channel ?? parsed?.feed;
    const rawItems = channel?.item ?? channel?.entry ?? [];
    const items = Array.isArray(rawItems) ? rawItems : [rawItems];

    const results: NewOpportunity[] = [];

    for (const rawItem of items) {
      const parsedItem = RssItemSchema.safeParse(rawItem);
      if (!parsedItem.success) continue;

      const item = parsedItem.data;
      const rawTitle = typeof item.title === "string" ? item.title : item.title["#text"];
      const title = stripHtml(rawTitle);
      
      const link = typeof item.link === "string" 
        ? item.link 
        : (item.link?.["@_href"] ?? item.id ?? "");
      
      const sourceUrl = link.trim();
      if (!title || !sourceUrl) continue;

      results.push({
        id: crypto.randomUUID(),
        title,
        company: stripHtml(item["dc:creator"] ?? item.author) || null,
        type: source.defaultJobType,
        sourceUrl,
        sourcePlatform: source.platform,
        tags: source.tags,
        locationType: "remote",
        payRange: null,
        description: stripHtml(item.description).slice(0, 500) || null,
        postedAt: (() => {
          const rawDate = item.pubDate || item.published || item.updated || item["dc:date"];
          return normalizeDate(rawDate);
        })(),
        scrapedAt: normalizeDate(new Date()),
        isActive: true,
        contentHash: toHash(title, sourceUrl),
        __raw: JSON.stringify(rawItem)
      } as any);
    }

    return results;
  } catch (err) {
    console.error(`[harvest] ${source.name} failed:`, (err as Error).message);
    return [];
  }
}
