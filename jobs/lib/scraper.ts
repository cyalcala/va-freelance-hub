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
}

export const rssSources: Source[] = [
  {
    id: "we-work-remotely",
    name: "We Work Remotely",
    url: "https://weworkremotely.com/categories/remote-jobs.rss",
    platform: "WeWorkRemotely",
    defaultJobType: "full-time",
    tags: ["remote", "tech", "design", "marketing"],
  },
  {
    id: "remotive",
    name: "Remotive",
    url: "https://remotive.com/remote-jobs/feed/all",
    platform: "Remotive",
    defaultJobType: "full-time",
    tags: ["remote", "tech", "sales", "marketing"],
  },
  {
    id: "problogger",
    name: "ProBlogger",
    url: "https://problogger.com/jobs/feed/",
    platform: "ProBlogger",
    defaultJobType: "freelance",
    tags: ["writing", "content", "blogging", "creative"],
  },
  {
    id: "remote-co",
    name: "Remote.co",
    url: "https://remote.co/remote-jobs/feed/",
    platform: "RemoteCo",
    defaultJobType: "full-time",
    tags: ["remote", "customer-support", "admin", "VA"],
  },
  {
    id: "remote-ok",
    name: "Remote OK",
    url: "https://remoteok.com/remote-jobs.rss",
    platform: "RemoteOK",
    defaultJobType: "full-time",
    tags: ["remote", "global"],
  },
  {
    id: "indeed-ph",
    name: "Indeed Philippines",
    url: "https://ph.indeed.com/rss?q=virtual+assistant",
    platform: "Indeed",
    defaultJobType: "VA",
    tags: ["philippines", "VA"],
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
      headers: { "User-Agent": "Mozilla/5.0 (compatible; va-freelance-hub/1.0)" },
      redirect: "follow",
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      console.log(`[rss] ${source.name}: HTTP ${res.status}`);
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
          title,
          company: stripHtml(item["dc:creator"] ?? item.author) || null,
          type: source.defaultJobType,
          sourceUrl,
          sourcePlatform: source.platform,
          tags: source.tags,
          locationType: "remote" as const,
          payRange: null,
          description: stripHtml(item.description ?? "").slice(0, 500) || null,
          postedAt: item.pubDate ?? item.published ?? null,
          isActive: true,
          contentHash: toHash(title, sourceUrl),
        } satisfies NewOpportunity;
      })
      .filter(Boolean) as NewOpportunity[];
  } catch (err) {
    console.log(`[rss] ${source.name} failed:`, (err as Error).message);
    return [];
  }
}
