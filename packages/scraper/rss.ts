import { XMLParser } from "fast-xml-parser";
import { createHash } from "crypto";
import type { NewOpportunity } from "@va-hub/db";
import type { Source } from "./sources";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

interface RawRSSItem {
  title?: string;
  link?: string;
  pubDate?: string;
  description?: string;
  "dc:creator"?: string;
  author?: string;
  category?: string | string[];
}

function normalizeText(raw: string | undefined): string {
  if (!raw) return "";
  // Strip HTML tags for plain text
  return raw.replace(/<[^>]*>/g, "").trim();
}

function toContentHash(title: string, sourceUrl: string): string {
  return createHash("sha256")
    .update(`${title}::${sourceUrl}`)
    .digest("hex")
    .slice(0, 16);
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
    return [];
  }

  let parsed: any;
  try {
    parsed = parser.parse(xml);
  } catch (err) {
    console.error(`[rss] Failed to parse XML from ${source.name}:`, err);
    return [];
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

      return {
        title,
        company: normalizeText(item["dc:creator"] ?? item.author) || null,
        type: source.defaultJobType,
        sourceUrl,
        sourcePlatform: source.platform,
        tags,
        locationType: "remote" as const,
        payRange: null,
        description: normalizeText(item.description).slice(0, 500) || null,
        postedAt: item.pubDate ?? item.published ?? null,
        isActive: true,
        contentHash: toContentHash(title, sourceUrl),
      } satisfies NewOpportunity;
    });

  // DRIFT DETECTION: If we got valid XML but zero parseable items, the feed structure may have changed
  if (items.length > 0 && opportunities.length === 0) {
    console.warn(`⚠️ [DRIFT_ALERT] ${source.name}: Feed returned ${items.length} raw items but 0 passed validation. Possible structure change.`);
  }

  console.log(`[rss] ${source.name}: ${opportunities.length} items`);
  return opportunities;
}
