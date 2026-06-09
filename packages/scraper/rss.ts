import { XMLParser } from "fast-xml-parser";
import type { NewOpportunity } from "@va-hub/db";
import type { Source } from "./sources";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  processEntities: false,
  htmlEntities: true,
});

interface RawRSSItem {
  title?: string | { "#text"?: string };
  link?: string | { "@_href"?: string };
  id?: string;
  pubDate?: string;
  published?: string;
  description?: string;
  "dc:creator"?: string;
  author?: string;
  category?: string | string[];
}

function normalizeText(raw: string | undefined): string {
  if (!raw) return "";
  // Strip both raw HTML tags and encoded HTML tags (common in RSS) for plain text
  return raw
    .replace(/&lt;[^&]*&gt;/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

function normalizeDate(rawDate: string | undefined): string | null {
  if (!rawDate) return null;
  try {
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return null;
    return d.toISOString();
  } catch (e) {
    return null;
  }
}

export async function fetchRSSFeed(source: Source): Promise<NewOpportunity[]> {
  console.log(`[rss] Fetching ${source.name}...`);

  let xml: string;
  try {
    const res = await fetch(source.url, {
      headers: { "User-Agent": "va-freelance-hub/1.0 (RSS aggregator)" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    xml = await res.text();
  } catch (err) {
    console.error(`[rss] Failed to fetch ${source.name}:`, err);
    throw new Error(`[rss] Failed to fetch ${source.name}: ${(err as Error).message}`);
  }

  let parsed: any;
  try {
    parsed = parser.parse(xml);
  } catch (err) {
    console.error(`[rss] Failed to parse XML from ${source.name}:`, err);
    throw new Error(`[rss] Failed to parse XML from ${source.name}: ${(err as Error).message}`);
  }

  // Handle both RSS 2.0 and Atom formats
  const channel = parsed?.rss?.channel ?? parsed?.feed;
  const rawItems: RawRSSItem[] = channel?.item ?? channel?.entry ?? [];
  const items = Array.isArray(rawItems) ? rawItems : [rawItems];

  const opportunities: NewOpportunity[] = items
    .filter((item) => item.title && (item.link ?? item.id))
    .map((item) => {
      const title = normalizeText(
        typeof item.title === "string" ? item.title : item.title?.["#text"]
      );
      const link =
        typeof item.link === "string"
          ? item.link
          : (item.link?.["@_href"] ?? item["id"] ?? "");
      const sourceUrl = link.trim();

      const tags: string[] = [
        ...source.tags,
        ...(Array.isArray(item.category)
          ? item.category.map(String)
          : item.category
          ? [String(item.category)]
          : []),
      ].slice(0, 10);

      const rawDate = item.pubDate ?? item.published;

      let finalTitle = title;
      let extractedCompany = normalizeText(item["dc:creator"] ?? item.author) || null;

      // Pre-process missing company names from "Company: Job Title" format (e.g. WeWorkRemotely)
      if (!extractedCompany && finalTitle.includes(":")) {
        const parts = finalTitle.split(":");
        if (parts[0].length < 40) { // Safety check to ensure it's actually a company name
          extractedCompany = parts[0].trim();
          finalTitle = parts.slice(1).join(":").trim();
        }
      }

      return {
        title: finalTitle,
        company: extractedCompany,
        type: source.defaultJobType,
        sourceUrl,
        sourcePlatform: source.platform,
        tags,
        locationType: "remote" as const,
        payRange: null,
        description: normalizeText(item.description).slice(0, 1500) || null,
        postedAt: normalizeDate(rawDate),
        isActive: true,
        contentHash: toContentHash(finalTitle, sourceUrl),
      } satisfies NewOpportunity;
    });

  console.log(`[rss] ${source.name}: ${opportunities.length} items`);
  return opportunities;
}
