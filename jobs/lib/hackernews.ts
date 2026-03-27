import { z } from "zod";
import { createHash } from "crypto";
import type { NewOpportunity } from "@va-hub/db/schema";

// --- HN SCHEMAS ---

const HNItemSchema = z.object({
  id: z.number(),
  text: z.string().optional(),
  title: z.string().optional(),
  time: z.number().optional(),
  kids: z.array(z.number()).optional().default([]),
  dead: z.boolean().optional().default(false),
  deleted: z.boolean().optional().default(false),
});

const HN_API = "https://hacker-news.firebaseio.com/v0";

function toHash(title: string, url: string) {
  return createHash("sha256").update(`${title}::${url}`).digest("hex").slice(0, 16);
}

function isValidTitle(title: string): boolean {
  if (title.length < 10 || title.length > 120) return false;
  const words = title.split(/\s+/).filter(w => /^[a-zA-Z]/.test(w));
  if (words.length < 2) return false;
  const junk = ["hi all", "looking forward", "thanks", "good luck", "i'm", "we're excited"];
  if (junk.some(j => title.toLowerCase().startsWith(j))) return false;
  return true;
}

async function findWhoIsHiringThread(): Promise<number | null> {
  try {
    const res = await fetch(`${HN_API}/user/whoishiring.json?t=${Date.now()}`, {
      headers: { "User-Agent": "VA.INDEX/1.0 (ethical-harvester; hn-firebase)" },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;

    const user = await res.json();
    const submitted = (user?.submitted || []) as number[];

    for (const id of submitted.slice(0, 5)) {
      const itemRes = await fetch(`${HN_API}/item/${id}.json`, {
        headers: { "User-Agent": "VA.INDEX/1.0 (ethical-harvester; hn-firebase)" },
      });
      if (!itemRes.ok) continue;
      const rawItem = await itemRes.json();
      const parsed = HNItemSchema.safeParse(rawItem);
      if (parsed.success && parsed.data.title?.toLowerCase()?.includes("who is hiring")) {
        return id;
      }
    }
  } catch (err) {
    console.error("[hn] Failed to find hiring thread:", (err as Error).message);
  }
  return null;
}

export async function fetchHNJobs(): Promise<NewOpportunity[]> {
  const threadId = await findWhoIsHiringThread();
  if (!threadId) return [];

  try {
    const threadRes = await fetch(`${HN_API}/item/${threadId}.json`, {
      headers: { "User-Agent": "VA.INDEX/1.0 (ethical-harvester; hn-firebase)" },
    });
    if (!threadRes.ok) return [];
    
    const rawThread = await threadRes.json();
    const parsedThread = HNItemSchema.safeParse(rawThread);
    if (!parsedThread.success) return [];

    const kidIds = parsedThread.data.kids.slice(0, 100);
    const jobs: NewOpportunity[] = [];

    for (let i = 0; i < kidIds.length; i += 10) {
      const batch = kidIds.slice(i, i + 10);
      const comments = await Promise.allSettled(
        batch.map(async (id) => {
          const r = await fetch(`${HN_API}/item/${id}.json`, {
            headers: { "User-Agent": "VA.INDEX/1.0 (ethical-harvester; hn-firebase)" },
          });
          return r.ok ? r.json() : null;
        })
      );

      for (const result of comments) {
        if (result.status !== "fulfilled" || !result.value) continue;
        const parsedComment = HNItemSchema.safeParse(result.value);
        if (!parsedComment.success) continue;
        
        const comment = parsedComment.data;
        if (!comment.text || comment.dead || comment.deleted) continue;

        const text = comment.text.replace(/<[^>]*>/g, " ").replace(/&[^;]+;/g, " ").trim();
        if (text.length < 50) continue;

        const firstLine = text.split("\n")[0];
        const parts = firstLine.split("|").map((s: string) => s.trim());
        if (parts.length < 2) continue;

        const company = parts[0].slice(0, 80);
        const role = parts[1].slice(0, 120);

        if (!isValidTitle(role) || !company || company.length < 2) continue;

        const sourceUrl = `https://news.ycombinator.com/item?id=${comment.id}`;

        jobs.push({
          id: crypto.randomUUID(),
          title: role,
          company,
          type: "full-time",
          sourceUrl,
          sourcePlatform: "HackerNews",
          tags: ["tech", "remote", "high-value"],
          locationType: "remote",
          payRange: parts.length >= 4 ? parts[3].slice(0, 60) : null,
          description: text.slice(0, 500),
          postedAt: comment.time ? new Date(comment.time * 1000) : new Date(),
          scrapedAt: new Date(),
          isActive: true,
          contentHash: toHash(role, sourceUrl),
        });
      }
    }

    return jobs;
  } catch (err) {
    console.error("[hn] Failed to fetch comments:", (err as Error).message);
    return [];
  }
}
