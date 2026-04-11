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

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function extractWithGemini(html: string, url: string) {
  if (!GEMINI_API_KEY) {
    console.error("[harrier] GEMINI_API_KEY missing.");
    return [];
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GEMINI_API_KEY}`;
  
  const prompt = `You are the Phantom Harrier (Scout Ship). Extract job listings from the provided HTML/Markdown. 
  
  MANDATE: STRICT PHILIPPINES FOCUS. 
  Extract only if the job is available to Filipino Virtual Assistants. 
  Reject if: "US Only", "United Kingdom Only", "W2 required", or specific non-PH residency is required.
  
  Target Niche: Philippines Virtual Assistants. Output strictly a JSON array of objects with: { title, company, description, sourceUrl, isPhCompatible: boolean }.`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${prompt}\n\nSource URL: ${url}\n\nCONTENT:\n${html}` }] }],
        generationConfig: { responseMimeType: "application/json" }
      }),
    });

    const data = await response.json();
    const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawContent) return [];
    
    const result = JSON.parse(rawContent);
    return Array.isArray(result) ? result : (result.jobs || result.listings || []);
  } catch (err: any) {
    console.error(`[harrier] Gemini extraction failure: ${err.message}`);
    return [];
  }
}

async function runHarrier() {
  console.log("═══ PHANTOM HARRIER (Vector 2) INITIATED ═══");
  
  const { shouldSkipDiscovery, recordHarvestSuccess, emitIngestionHeartbeat } = await import("../packages/db/governance");

  // 🛡️ ETHICAL FLEET: Respect the Seat
  if (await shouldSkipDiscovery('harrier', 'Philippines', 5)) { 
    console.log("🚥 [FLEET] Harrier is backing off to respect existing harvest seat.");
    return;
  }

  // Clear "Pulse Lost" for the region we are about to harvest
  await emitIngestionHeartbeat('Phantom Harrier', 'Philippines');

  const { proxyFetch } = await import("../jobs/lib/proxy-fetch");

  const targets = [
    {
      name: "OnlineJobs.ph",
      url: "https://www.onlinejobs.ph/jobseekers/jobsearch?keywords=virtual+assistant",
      niche_hint: "VA_SUPPORT"
    },
    {
      name: "OnlineJobs.ph (Admin)",
      url: "https://www.onlinejobs.ph/jobseekers/jobsearch?keywords=administrative",
      niche_hint: "ADMIN_BACKOFFICE"
    },
    {
      name: "OnlineJobs.ph (Sales)",
      url: "https://www.onlinejobs.ph/jobseekers/jobsearch?keywords=sales",
      niche_hint: "SALES_GROWTH"
    }
  ];

  for (const target of targets) {
    try {
      console.log(`[harrier] Scouting ${target.name}...`);
      const res = await proxyFetch(target.url);
      
      const rawHtml = await res.text();

      const $ = cheerio.load(rawHtml);
      
      const content = $('body').text()
        .replace(/\n\s*\n/g, '\n')
        .replace(/\s{2,}/g, ' ')
        .slice(0, 12000);

      if (content.length < 500) {
        console.warn(`[harrier] Warn: Content too short (${content.length}). Anti-bot?`);
        continue;
      }

      const jobs = await extractWithGemini(content, target.url);
      console.log(`[harrier] Extracted ${jobs.length} signals for ${target.name}.`);

      for (const job of jobs) {
        const title = job.title || "Unknown Role";
        const company = job.company || "Unknown Entity";
        const sourceUrl = job.sourceUrl && job.sourceUrl.startsWith('http') ? job.sourceUrl : target.url;

        if (title.length < 5 || title.toLowerCase() === "unknown role") continue;
        if (job.isPhCompatible === false) {
          console.warn(`🛡️ [harrier] Dropped non-PH signal: ${title}`);
          continue;
        }

        // Shared Intelligence: Use the centralized taxonomy for categorization
        const { mapTitleToDomain } = await import("../packages/db/taxonomy");
        const niche = mapTitleToDomain(title, job.description || "");

        const validation = OpportunitySchema.safeParse({
          id: uuidv4(),
          title,
          company,
          type: "direct",
          sourceUrl,
          sourcePlatform: target.name,
          tags: ["PH-DIRECT", "scraped", target.name.toLowerCase()],
          locationType: "remote",
          description: job.description || null,
          postedAt: normalizeDate(new Date()),
          scrapedAt: normalizeDate(new Date()),
          lastSeenAt: normalizeDate(new Date()),
          isActive: true,
          tier: 1, // Phantom Harrier targets are high-intent PH roles
          relevanceScore: 85, 
          displayTags: ["PH-DIRECT", "VERIFIED"],
          latestActivityMs: Date.now(),
          niche: niche,
          region: "Philippines"
        });

        if (validation.success) {
          await db.insert(opportunitiesSchema)
            .values(validation.data as any)
            .onConflictDoUpdate({
              target: [opportunitiesSchema.title, opportunitiesSchema.company],
              set: { 
                lastSeenAt: normalizeDate(new Date()), 
                isActive: true,
                latestActivityMs: Date.now()
              }
            });
        }
      }

      await recordHarvestSuccess('harrier', 'Philippines');
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
