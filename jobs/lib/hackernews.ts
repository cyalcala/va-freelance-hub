/**
 * Hacker News "Who is Hiring?" Harvester
 * 
 * Uses HN's free public Firebase API (hacker-news.firebaseio.com).
 * Harvests comments from the monthly "Ask HN: Who is hiring?" threads.
 * These contain 500+ high-value remote tech roles per month.
 */

import { createHash } from "crypto";
import type { NewOpportunity } from "./db";

const HN_API = "https://hacker-news.firebaseio.com/v0";

function toHash(title: string, url: string) {
  return createHash("sha256").update(`${title}::${url}`).digest("hex").slice(0, 16);
}

function isValidTitle(title: string): boolean {
  if (title.length < 10 || title.length > 120) return false;
  // Must contain at least 2 alpha words
  const words = title.split(/\s+/).filter(w => /^[a-zA-Z]/.test(w));
  if (words.length < 2) return false;
  // Reject pure locations, filler, or conversational text
  const junk = ["hi all", "looking forward", "thanks", "good luck", "i'm", "we're excited"];
  if (junk.some(j => title.toLowerCase().startsWith(j))) return false;
  return true;
}

async function findWhoIsHiringThread(): Promise<number | null> {
  try {
    const res = await fetch(`${HN_API}/user/whoishiring.json?t=${Date.now()}`, {
      headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;

    const user = await res.json();
    const submitted = user?.submitted || [];

    for (const id of submitted.slice(0, 5)) {
      const itemRes = await fetch(`${HN_API}/item/${id}.json?t=${Date.now()}`, {
        headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" },
        signal: AbortSignal.timeout(5_000),
      });
      if (!itemRes.ok) continue;
      const item = await itemRes.json();
      if (item?.title?.toLowerCase()?.includes("who is hiring")) {
        return id;
      }
    }
  } catch (err) {
    console.log("[hn] Failed to find hiring thread:", (err as Error).message);
  }
  return null;
}

export async function fetchHNJobs(): Promise<NewOpportunity[]> {
  const threadId = await findWhoIsHiringThread();
  if (!threadId) {
    console.log("[hn] No active 'Who is hiring?' thread found");
    return [];
  }

  console.log(`[hn] Found thread #${threadId}, fetching comments...`);

  try {
    const threadRes = await fetch(`${HN_API}/item/${threadId}.json?t=${Date.now()}`, {
      headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" },
      signal: AbortSignal.timeout(8_000),
    });
    if (!threadRes.ok) return [];
    const thread = await threadRes.json();
    const kidIds: number[] = (thread.kids || []).slice(0, 100);

    const jobs: NewOpportunity[] = [];

    for (let i = 0; i < kidIds.length; i += 10) {
      const batch = kidIds.slice(i, i + 10);
      const comments = await Promise.allSettled(
        batch.map(async (id) => {
          const r = await fetch(`${HN_API}/item/${id}.json?t=${Date.now()}`, {
            headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" },
            signal: AbortSignal.timeout(5_000),
          });
          return r.ok ? r.json() : null;
        })
      );

      for (const result of comments) {
        if (result.status !== "fulfilled" || !result.value) continue;
        const comment = result.value;
        if (!comment.text || comment.dead || comment.deleted) continue;

        const text = comment.text.replace(/<[^>]*>/g, " ").replace(/&[^;]+;/g, " ").trim();
        if (text.length < 50) continue;

        // HN convention: "Company | Role | Location | Salary | ..."
        const firstLine = text.split("\n")[0];
        const parts = firstLine.split("|").map((s: string) => s.trim());
        
        // Need at least Company | Role
        if (parts.length < 2) continue;

        const company = parts[0].slice(0, 80);
        const role = parts[1].slice(0, 120);

        // Quality gate: reject garbage titles
        if (!isValidTitle(role)) continue;
        if (!company || company.length < 2) continue;

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
        } as unknown as NewOpportunity);
      }
    }

    console.log(`[hn] Harvested ${jobs.length} quality roles from thread #${threadId}`);
    
    // --- SECONDARY: SURGICAL SEARCH (NEW) ---
    // Search across all of HN for "Virtual Assistant" or "Operations" signals
    try {
      const searchRes = await fetch(`https://hn.algolia.com/api/v1/search_by_date?query=%22virtual+assistant%22&tags=comment&numericFilters=created_at_i>${Math.floor(Date.now()/1000) - 86400 * 7}`, {
        signal: AbortSignal.timeout(8_000),
      });
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const searchHits = searchData?.hits || [];
        for (const hit of searchHits) {
          const text = hit.comment_text?.replace(/<[^>]*>/g, " ") || "";
          if (text.length < 50) continue;
          
          jobs.push({
            id: crypto.randomUUID(),
            title: "Remote Assistant Signal",
            company: hit.author || "HN Signal",
            type: "freelance",
            sourceUrl: `https://news.ycombinator.com/item?id=${hit.objectID}`,
            sourcePlatform: "HackerNews Search",
            tags: ["hn", "surgical-signal"],
            locationType: "remote",
            description: text.slice(0, 500),
            postedAt: new Date(hit.created_at),
            scrapedAt: new Date(),
            isActive: true,
            contentHash: toHash(hit.objectID, hit.author),
          } as unknown as NewOpportunity);
        }
      }
    } catch (searchErr) {
       console.log("[hn-search] Failed surgical sweep:", (searchErr as Error).message);
    }

    return jobs;
  } catch (err) {
    console.log("[hn] Failed to fetch comments:", (err as Error).message);
    return [];
  }
}
