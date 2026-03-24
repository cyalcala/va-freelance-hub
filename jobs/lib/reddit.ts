/**
 * Reddit Public JSON Harvester
 * 
 * Uses Reddit's official public JSON endpoints (no API key required).
 * Every subreddit provides .json — this is Reddit's intended public data format.
 * We only harvest posts tagged [Hiring] from career-focused subreddits.
 */

import { createHash } from "crypto";
import type { NewOpportunity } from "./db";

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

export async function fetchRedditJobs(): Promise<NewOpportunity[]> {
  const allJobs: NewOpportunity[] = [];

  for (const sub of SUBREDDITS) {
    try {
      // Small delay between subreddits to respect Reddit rate limits
      if (allJobs.length > 0) await new Promise(r => setTimeout(r, 300));

      const res = await fetch(`https://www.reddit.com/r/${sub.name}/new.json?limit=50`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/json"
        },
        signal: AbortSignal.timeout(10_000),
      });

      if (!res.ok) {
        console.log(`[reddit] ${sub.label}: HTTP ${res.status}`);
        continue;
      }

      const data = await res.json();
      const posts = data?.data?.children || [];

      for (const post of posts) {
        const p = post.data;
        if (!p || !p.title) continue;

        const title = p.title.trim();
        const titleLower = title.toLowerCase();

        // Only harvest posts that are hiring signals
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

        const description = (p.selftext || "").slice(0, 500).replace(/\n/g, " ").trim();

        allJobs.push({
          id: crypto.randomUUID(),
          title: title.replace(/\[hiring\]/gi, "").trim(),
          company: p.author || "Direct Hire",
          type: "freelance",
          sourceUrl,
          sourcePlatform: `Reddit ${sub.label}`,
          tags: ["reddit", sub.name],
          locationType: "remote",
          payRange: null,
          description: description || null,
          postedAt: p.created_utc ? new Date(p.created_utc * 1000) : new Date(),
          scrapedAt: new Date(),
          isActive: true,
          contentHash: toHash(title, sourceUrl),
        } as unknown as NewOpportunity);
      }

      const subCount = allJobs.filter(j => (j.sourcePlatform as string)?.includes(sub.label)).length;
      console.log(`[reddit] ${sub.label}: ${posts.length} posts → ${subCount} hiring signals`);
    } catch (err) {
      console.log(`[reddit] ${sub.label} failed:`, (err as Error).message);
    }
  }

  return allJobs;
}
