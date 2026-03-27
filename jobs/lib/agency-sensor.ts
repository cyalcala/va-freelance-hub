import { createHash } from "crypto";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { eq } from "drizzle-orm";
import { agencies } from "@va-hub/db/schema";
import type { NewOpportunity } from "@va-hub/db/schema";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export async function probeAgencies(db: any): Promise<NewOpportunity[]> {
  const allAgencies = await db.select().from(agencies).where(eq(agencies.status, 'active'));
  const results: NewOpportunity[] = [];

  const probePromises = allAgencies.map(async (agency: any) => {
    if (!agency.hiringUrl) return [];
    
    try {
      // 1. Detect Greenhouse/Lever
      if (agency.hiringUrl.includes("boards.greenhouse.io") || agency.hiringUrl.includes("lever.co")) {
        const board = agency.hiringUrl.split('/').pop()?.split('?')[0];
        if (!board) return [];

        const isGreenhouse = agency.hiringUrl.includes("greenhouse.io");
        const apiUrl = isGreenhouse 
          ? `https://boards-api.greenhouse.io/v1/boards/${board}/jobs`
          : `https://api.lever.co/v0/postings/${board}?mode=json`;

        const res = await fetch(apiUrl);
        if (!res.ok) return [];
        const data = await res.json();
        const jobs = isGreenhouse ? data.jobs : data;

        if (!jobs) return [];

        return jobs.map((job: any) => ({
          id: crypto.randomUUID(),
          title: job.title || job.text,
          company: agency.name,
          sourceUrl: job.absolute_url || job.hostedUrl,
          sourcePlatform: isGreenhouse ? "Greenhouse" : "Lever",
          scrapedAt: new Date(),
          postedAt: new Date(),
          __raw: job,
          contentHash: createHash("sha256").update(`${job.title || job.text}::${agency.name}`).digest("hex").slice(0, 16)
        }));
      }

  // 2. Agentic Probe for Custom Careers Pages
      // Optimization: Only probe 15% of agencies per cycle to stay well within Gemini 1,500 RPD free tier.
      // 30-min cycle * 48 cycles/day * (50 agencies * 0.15) ≈ 360 requests/day (SAFELY UNDER 1,500).
      if (Math.random() > 0.15) {
        console.log(`[agency-sensor] Skipping ${agency.name} this cycle (Throttled for Free Tier)`);
        return [];
      }

      console.log(`[agency-sensor] Probing custom page: ${agency.name} (${agency.hiringUrl})`);
      const res = await fetch(agency.hiringUrl, { headers: { "User-Agent": "VA.INDEX/1.0" } });
      if (!res.ok) return [];
      const html = await res.text();
      const snippet = html.slice(0, 10000); // 10k chars is usually enough for links

      // Add a 2s delay to respect 15 Requests Per Minute (RPM) free tier limit
      await new Promise(r => setTimeout(r, 2000));

      const prompt = `
        You are a structured data extractor. From the following HTML snippet of an agency's career page, 
        extract all current job openings. Return ONLY a JSON array of objects with {title, url}.
        If no jobs are found, return [].
        Agency Name: ${agency.name}
        Agency Website: ${agency.websiteUrl}
        HTML Snippet:
        ${snippet}
      `;

      const result = await model.generateContent(prompt);
      const output = result.response.text();
      const cleanJson = output.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleanJson);

      if (!Array.isArray(parsed)) return [];

      return parsed.map((job: any) => ({
        id: crypto.randomUUID(),
        title: job.title,
        company: agency.name,
        sourceUrl: job.url.startsWith('http') ? job.url : new URL(job.url, agency.websiteUrl).href,
        sourcePlatform: "Agency Sensor",
        scrapedAt: new Date(),
        postedAt: new Date(),
        __raw: job,
        contentHash: createHash("sha256").update(`${job.title}::${agency.name}`).digest("hex").slice(0, 16)
      }));

    } catch (e) {
      console.error(`[agency-sensor] Probe failed for ${agency.name}:`, e);
      return [];
    }
  });

  const settled = await Promise.allSettled(probePromises);
  return settled.flatMap(s => s.status === "fulfilled" ? s.value : []);
}
