import type { NewOpportunity } from "@va-hub/db";
import type { Source } from "./sources";
import { toContentHash } from "./contentHash";
import { conditionalFetchText, unchangedOutput, type ConditionalState, type SourceFetchOutput } from "./conditional";

interface ParsedJobItem {
  title?: string;
  company?: string;
  url?: string;
  date?: string;
  description?: string;
}

/**
 * Pure TypeScript parser that matches OnlineJobs.ph HTML list structure.
 * Extract job listings by finding links with class/id containing "job_title".
 */
function parseHtmlWithTS(html: string, source: Source): ParsedJobItem[] {
  const items: ParsedJobItem[] = [];
  const tagRegex = /<a([^>]+)>([\s\S]*?)<\/a>/gi;
  let match;
  let count = 0;
  const maxItems = source.maxItems ?? 100;

  while ((match = tagRegex.exec(html)) !== null && count < maxItems) {
    const attrs = match[1];
    const content = match[2];

    const hrefMatch = /href=["']([^"']+)["']/i.exec(attrs);
    if (hrefMatch) {
      const href = hrefMatch[1];
      
      // Match job links and exclude the "See More" links
      if (href.includes("/jobseekers/job/") && !content.includes("See More")) {
        const titleMatch = /<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i.exec(content);
        
        let titleText = content;
        if (titleMatch) {
          titleText = titleMatch[1];
        }

        const title = titleText
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

  // Fallback if the strict regex found absolutely nothing
  if (count === 0) {
    console.warn(`[html] Strict parsing failed for ${source.name}, attempting fallback...`);
    // Fallback: match any link that contains 'job' in the href and has some content text
    const fallbackRegex = /<a[^>]+href=["']([^"']*\/job[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let fallbackMatch;
    while ((fallbackMatch = fallbackRegex.exec(html)) !== null) {
      const href = fallbackMatch[1];
      const content = fallbackMatch[2];
      
      if (!href.includes("/jobseekers/job/") || content.includes("See More") || content.includes("<img")) {
        continue;
      }

      const title = content.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
      if (!title || title.length < 5) continue;

      const url = href.startsWith("http")
        ? href
        : `https://${new URL(source.url).hostname}${href.startsWith("/") ? "" : "/"}${href}`;

      items.push({
        title,
        url,
        company: "Fallback Scrape Client",
        date: new Date().toISOString(),
        description: "Remote role.",
      });
      count++;
    }
  }

  console.log(`[html] ${source.name}: ${count} items`);
  return items;
}

export async function fetchHTMLSource(source: Source, state?: ConditionalState): Promise<SourceFetchOutput> {
  console.log(`[html] Fetching ${source.name}...`);

  let html: string;
  let etag: string | null = null;
  let lastModified: string | null = null;
  let bodyHash: string | null = null;
  try {
    const cond = await conditionalFetchText(
      source.url,
      {
        "User-Agent":
          "Mozilla/5.0 (compatible; va-freelance-hub/1.0; +https://github.com/cyalcala/va-freelance-hub)",
      },
      state,
      20_000,
    );
    if (cond.notModified) {
      console.log(`[html] ${source.name}: unchanged (${cond.status}), skipping parse.`);
      return unchangedOutput(state);
    }
    html = cond.text;
    etag = cond.etag;
    lastModified = cond.lastModified;
    bodyHash = cond.bodyHash;
  } catch (err) {
    console.error(`[html] Failed to fetch ${source.name}:`, err);
    throw new Error(`[html] Failed to fetch ${source.name}: ${(err as Error).message}`);
  }

  const parsed = parseHtmlWithTS(html, source);

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
      description: item.description?.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim().slice(0, 1500) ?? null,
      postedAt: item.date ?? null,
      isActive: true,
      contentHash: toContentHash(item.title!, item.url!),
    }));

  console.log(`[html] ${source.name}: ${opportunities.length} items`);
  return { items: opportunities, notModified: false, etag, lastModified, bodyHash };
}
