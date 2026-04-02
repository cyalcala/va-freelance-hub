import * as cheerio from "cheerio";
import { v4 as uuidv4 } from "uuid";
import { db } from "../packages/db/client";
import { opportunities as opportunitiesSchema } from "../packages/db/schema";
import { normalizeDate } from "../packages/db";
import { OpportunitySchema } from "../packages/db/validation";

/**
 * VECTOR 2: PHANTOM HARRIER (The Dumb Scraper)
 * Mandate: Extract job signals from raw HTML without brittle selectors.
 */

const CEREBRAS_API_KEY = process.env.CEREBRAS_API_KEY;

async function extractWithCerebras(html: string, url: string) {
  if (!CEREBRAS_API_KEY) {
    console.error("[harrier] CEREBRAS_API_KEY missing.");
    return [];
  }

  const response = await fetch("https://api.cerebras.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${CEREBRAS_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "qwen-3-235b-a22b-instruct-2507",
      messages: [
        {
          role: "system",
          content: "You are the Phantom Harrier (Scout Ship). Extract job listings from the provided HTML/Markdown. Each listing typically starts with a title and has a link. Extract: { title, company, description, sourceUrl }. Target Niche: Philippines Virtual Assistants. Output JSON array { \"jobs\": [...] }."
        },
        { role: "user", content: `Source URL: ${url}\n\nCONTENT:\n${html}` }
      ],
      response_format: { type: "json_object" }
    }),
  });

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content;
  if (!rawContent) return [];
  
  const result = JSON.parse(rawContent);
  return result.jobs || result.listings || [];
}

async function runHarrier() {
  console.log("═══ PHANTOM HARRIER (Vector 2) INITIATED ═══");

  const targets = [
    {
      name: "OnlineJobs.ph",
      url: "https://www.onlinejobs.ph/jobseekers/jobsearch?keywords=virtual+assistant"
    }
  ];

  for (const target of targets) {
    try {
      console.log(`[harrier] Scouting ${target.name}...`);
      const res = await fetch(target.url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36" }
      });
      
      const rawHtml = await res.text();
      const $ = cheerio.load(rawHtml);
      
      // Target specific containers if possible, or just the main content area
      // OnlineJobs.ph uses .job-description-list or similar tags
      const content = $('body').text()
        .replace(/\n\s*\n/g, '\n') // Remove excessive empty lines
        .replace(/\s{2,}/g, ' ') // Collapse whitespace
        .slice(0, 10000); // 10k characters is usually enough for current page

      if (content.length < 500) {
        console.warn(`[harrier] Warn: Content too short (${content.length}). Anti-bot?`);
      }

      const jobs = await extractWithCerebras(content, target.url);
      console.log(`[harrier] Extracted ${jobs.length} signals.`);

      for (const job of jobs) {
        const title = job.title || "Unknown Role";
        const company = job.company || "Unknown Entity";
        const sourceUrl = job.sourceUrl && job.sourceUrl.startsWith('http') ? job.sourceUrl : target.url;

        // SKIP incomplete signals
        if (title.length < 5 || title.toLowerCase() === "unknown role") continue;

        const validation = OpportunitySchema.safeParse({
          id: uuidv4(),
          title,
          company,
          type: "direct", // OnlineJobs.ph is direct hire
          sourceUrl,
          sourcePlatform: target.name,
          tags: ["INFERRED", "scraped", target.name.toLowerCase()],
          locationType: "remote",
          description: job.description || null,
          postedAt: normalizeDate(new Date()),
          scrapedAt: normalizeDate(new Date()),
          lastSeenAt: normalizeDate(new Date()),
          isActive: true,
          tier: 3,
          relevanceScore: 70, 
          displayTags: ["PH-DIRECT"],
          latestActivityMs: normalizeDate(new Date()).getTime(),
          contentHash: `${title}|${company}`.slice(0, 16)
        });

        if (validation.success) {
          await db.insert(opportunitiesSchema)
            .values(validation.data as any) // Cast to bypass Drizzle's strictness on optional id vs required primary key
            .onConflictDoUpdate({
              target: [opportunitiesSchema.title, opportunitiesSchema.company, opportunitiesSchema.sourceUrl],
              set: { lastSeenAt: normalizeDate(new Date()), isActive: true }
            });
        }
      }
    } catch (err: any) {
      console.error(`[harrier] Failure on ${target.name}:`, err.message);
    }
  }

  console.log("═══ PHANTOM HARRIER SORTIE COMPLETE ═══");
}

if (process.argv.includes("--local")) {
  runHarrier().catch(console.error);
}

export { runHarrier };
