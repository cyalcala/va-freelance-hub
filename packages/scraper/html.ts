import type { NewOpportunity } from "@va-hub/db";
import type { Source } from "./sources";

interface ParsedJobItem {
  title?: string;
  company?: string;
  url?: string;
  date?: string;
  description?: string;
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

/**
 * Pure TypeScript parser that matches OnlineJobs.ph HTML list structure.
 * Extract job listings by finding links with class/id containing "job_title".
 */
function parseHtmlWithTS(html: string): ParsedJobItem[] {
  const items: ParsedJobItem[] = [];
  const tagRegex = /<a([^>]+)>([\s\S]*?)<\/a>/gi;
  let match;
  let count = 0;
  const maxItems = 100;

  while ((match = tagRegex.exec(html)) !== null && count < maxItems) {
    const attrs = match[1];
    const content = match[2];

    if (attrs.includes("job_title")) {
      const hrefMatch = /href=["']([^"']+)["']/i.exec(attrs);
      if (hrefMatch) {
        const href = hrefMatch[1];
        const title = content
          .replace(/<[^>]*>/g, "") // remove nested html
          .replace(/\s+/g, " ")    // collapse whitespaces
          .trim();

        if (!title) continue;

        const url = href.startsWith("http")
          ? href
          : `https://www.onlinejobs.ph${href.startsWith("/") ? "" : "/"}${href}`;

        items.push({
          title,
          url,
          company: "OnlineJobs.ph Client",
          date: new Date().toISOString(),
          description: "OnlineJobs.ph remote role.",
        });
        count++;
      }
    }
  }

  return items;
}

export async function fetchHTMLSource(source: Source): Promise<NewOpportunity[]> {
  console.log(`[html] Fetching ${source.name}...`);

  let html: string;
  try {
    const res = await fetch(source.url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; va-freelance-hub/1.0; +https://github.com/cyalcala/va-freelance-hub)",
      },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    html = await res.text();
  } catch (err) {
    console.error(`[html] Failed to fetch ${source.name}:`, err);
    return [];
  }

  const parsed = parseHtmlWithTS(html);

  const opportunities: NewOpportunity[] = parsed
    .filter((item) => item.title && item.url)
    .map((item) => ({
      title: item.title!,
      company: item.company ?? null,
      type: source.defaultJobType,
      sourceUrl: item.url!,
      sourcePlatform: source.platform,
      tags: source.tags,
      locationType: "remote" as const,
      payRange: null,
      description: item.description?.slice(0, 500) ?? null,
      postedAt: item.date ?? null,
      isActive: true,
      contentHash: toContentHash(item.title!, item.url!),
    }));

  console.log(`[html] ${source.name}: ${opportunities.length} items`);
  return opportunities;
}
