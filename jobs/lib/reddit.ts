import { z } from "zod";
import { createHash } from "crypto";
import { normalizeDate } from "@va-hub/db";
import { proxyFetch } from "./proxy-fetch";
import { logger } from "@trigger.dev/sdk/v3";

// --- REDDIT SCHEMAS ---

const RedditPostSchema = z.object({
  title: z.string(),
  author: z.string().optional().default("Direct Hire"),
  selftext: z.string().optional().default(""),
  url: z.string().url().optional(),
  permalink: z.string(),
  link_flair_text: z.string().optional().nullable(),
  created_utc: z.number(),
});

const RedditResponseSchema = z.object({
  data: z.object({
    children: z.array(z.object({
      data: RedditPostSchema
    })).default([])
  })
});

const SUBREDDITS = [
  { name: "buhaydigital", label: "r/buhaydigital" },
  { name: "VirtualAssistantPH", label: "r/VirtualAssistantPH" },
  { name: "RemoteWorkPH", label: "r/RemoteWorkPH" },
  { name: "VAjobsPH", label: "r/VAjobsPH" },
  { name: "phcareers", label: "r/phcareers" },
  { name: "PHJobs", label: "r/PHJobs" },
  { name: "HiringPH", label: "r/HiringPH" },
  { name: "RecruitingHiringPH", label: "r/RecruitingHiringPH" },
  { name: "PinoyProgrammer", label: "r/PinoyProgrammer" },
  { name: "BPOinPH", label: "r/BPOinPH" },
  { name: "forhire", label: "r/forhire" },
];

function toHash(title: string, url: string) {
  return createHash("sha256").update(`${title}::${url}`).digest("hex").slice(0, 16);
}

export async function fetchRedditJobs(): Promise<any[]> {
  const allJobs: any[] = [];

  for (const sub of SUBREDDITS) {
    try {
      if (allJobs.length > 0) await new Promise(r => setTimeout(r, 500)); // Increased throttle

      const res = await proxyFetch(`https://www.reddit.com/r/${sub.name}/new.json?limit=25&t=${Date.now()}`, {
        headers: {
          "Accept": "application/json",
        },
        signal: AbortSignal.timeout(10_000),
      });

      if (!res.ok) {
        console.error(`[reddit] ${sub.label}: HTTP ${res.status}`);
        continue;
      }

      const rawData = await res.json();
      const parsed = RedditResponseSchema.safeParse(rawData);
      
      if (!parsed.success) {
        console.warn(`[reddit] Schema mutation on ${sub.label}.`);
        continue;
      }

      const posts = parsed.data.data.children;

      for (const post of posts) {
        const p = post.data;
        const title = p.title.trim();
        const titleLower = title.toLowerCase();

        const isHiring = 
          titleLower.includes("[hiring]") ||
          titleLower.includes("hiring") ||
          titleLower.includes("looking for") ||
          titleLower.includes("we need") ||
          titleLower.includes("job opening") ||
          p.link_flair_text?.toLowerCase()?.includes("hiring");

        if (!isHiring) continue;

        const sourceUrl = p.url?.startsWith("http") 
          ? p.url 
          : `https://www.reddit.com${p.permalink}`;

        const description = p.selftext.slice(0, 500).replace(/\n/g, " ").trim();

        allJobs.push({
          id: crypto.randomUUID(),
          title: title.replace(/\[hiring\]/gi, "").trim(),
          company: p.author,
          type: "freelance",
          sourceUrl,
          sourcePlatform: `Reddit/${sub.name}`,
          tags: ["reddit", sub.name],
          locationType: "remote",
          payRange: null,
          description: description || null,
          postedAt: normalizeDate(p.created_utc),
          scrapedAt: normalizeDate(new Date()),
          isActive: true,
          contentHash: toHash(title, sourceUrl),
          __raw: JSON.stringify(p)
        } as any);
      }

      logger.info(`[reddit] ${sub.label}: ${posts.length} posts analyzed`);
    } catch (err) {
      console.error(`[reddit] ${sub.label} failed:`, (err as Error).message);
    }
  }

  return allJobs;
}
