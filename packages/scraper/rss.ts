import { XMLParser } from "fast-xml-parser";
import type { NewOpportunity } from "@va-hub/db";
import type { Source } from "./sources";
import { decodeHtmlEntities, xmlNodeText, xmlTextList } from "./text";
import { toContentHash } from "./contentHash";
import { conditionalFetchText, unchangedOutput, type ConditionalState, type SourceFetchOutput } from "./conditional";

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
  // Runtime shape can also be attributed objects like {'@_domain', '#text'};
  // xmlTextList handles every variant.
  category?: unknown;
  // Geo masterplan L0: We Work Remotely publishes a <region> element per item
  // ("Anywhere in the World", "Texas", "Dubai", …) — a structured eligibility
  // signal, previously discarded, now captured for the geo-gate.
  region?: unknown;
}

function normalizeText(raw: string | undefined): string {
  if (!raw) return "";
  // Strip both raw HTML tags and encoded HTML tags (common in RSS) for plain text
  return decodeHtmlEntities(raw)
    .replace(/&lt;[^&]*&gt;/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

export async function fetchRSSFeed(source: Source, state?: ConditionalState): Promise<SourceFetchOutput> {
  console.log(`[rss] Fetching ${source.name}...`);

  let xml: string;
  let etag: string | null = null;
  let lastModified: string | null = null;
  let bodyHash: string | null = null;
  try {
    const cond = await conditionalFetchText(
      source.url,
      { "User-Agent": "va-freelance-hub/1.0 (RSS aggregator)" },
      state,
    );
    if (cond.notModified) {
      console.log(`[rss] ${source.name}: unchanged (${cond.status}), skipping parse.`);
      return unchangedOutput(state);
    }
    xml = cond.text;
    etag = cond.etag;
    lastModified = cond.lastModified;
    bodyHash = cond.bodyHash;
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
  const cappedItems = typeof source.maxItems === "number" ? items.slice(0, source.maxItems) : items;
  if (cappedItems.length < items.length) {
    console.log(`[rss] ${source.name}: capped ${items.length} raw items to ${cappedItems.length}`);
  }

  // flatMap with a per-item guard: one malformed item must never reject the
  // whole feed (previously a hostile numeric entity threw inside .map and
  // zeroed the entire source for the run).
  const opportunities: NewOpportunity[] = cappedItems
    .filter((item) => item.title && (item.link ?? item.id))
    .flatMap((item) => {
      try {
      const title = normalizeText(xmlNodeText(item.title) ?? undefined);
      const link =
        typeof item.link === "string"
          ? item.link
          : (item.link?.["@_href"] ?? item["id"] ?? "");
      const sourceUrl = link.trim();

      const tags: string[] = [
        ...source.tags,
        ...xmlTextList(item.category),
      ].slice(0, 10);

      const rawDate = item.pubDate ?? item.published;

      let finalTitle = title;
      let extractedCompany = normalizeText(xmlNodeText(item["dc:creator"] ?? item.author) ?? undefined) || null;

      // Pre-process missing company names from "Company: Job Title" format (e.g. WeWorkRemotely)
      if (!extractedCompany && finalTitle.includes(":")) {
        const parts = finalTitle.split(":");
        if (parts[0].length < 40) { // Safety check to ensure it's actually a company name
          extractedCompany = parts[0].trim();
          finalTitle = parts.slice(1).join(":").trim();
        }
      }

      return [{
        title: finalTitle,
        company: extractedCompany,
        type: source.defaultJobType,
        sourceUrl,
        sourcePlatform: source.platform,
        tags,
        locationType: "remote" as const,
        locationRaw: normalizeText(xmlNodeText(item.region) ?? undefined) || null,
        payRange: null,
        description: normalizeText(xmlNodeText(item.description) ?? undefined).slice(0, 1500) || null,
        postedAt: normalizeDate(rawDate),
        isActive: true,
        contentHash: toContentHash(finalTitle, sourceUrl),
      } satisfies NewOpportunity];
      } catch (err) {
        console.warn(`[rss] ${source.name}: skipped one malformed item:`, (err as Error).message);
        return [];
      }
    });

  console.log(`[rss] ${source.name}: ${opportunities.length} items`);
  return { items: opportunities, notModified: false, etag, lastModified, bodyHash };
}
