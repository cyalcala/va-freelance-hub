import { z } from "zod";
import { createHash } from "crypto";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { eq } from "drizzle-orm";
import { agencies } from "@va-hub/db/schema";
import type { NewOpportunity } from "@va-hub/db/schema";

// --- SENSOR SCHEMAS ---

const GeminiJobSchema = z.object({
  title: z.string().default("Untitled Role"),
  url: z.string(),
});

const GeminiOutputSchema = z.array(GeminiJobSchema).default([]);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

export async function probeAgencies(db: any): Promise<NewOpportunity[]> {
  const allAgencies = await db.select().from(agencies).where(eq(agencies.status, 'active'));
  const results: NewOpportunity[] = [];

  for (const agency of allAgencies) {
    if (!agency.hiringUrl) continue;
    
    try {
      // 1. Detect Greenhouse/Lever
      if (agency.hiringUrl.includes("boards.greenhouse.io") || agency.hiringUrl.includes("lever.co")) {
        const board = agency.hiringUrl.split('/').pop()?.split('?')[0];
        if (!board) continue;

        const isGreenhouse = agency.hiringUrl.includes("greenhouse.io");
        const apiUrl = isGreenhouse 
          ? `https://boards-api.greenhouse.io/v1/boards/${board}/jobs`
          : `https://api.lever.co/v0/postings/${board}?mode=json`;

        const res = await fetch(apiUrl, {
          headers: { "User-Agent": "VA.INDEX/1.0 (ethical-harvester; agency-sensor)" },
          signal: AbortSignal.timeout(10000) // SRE Force-Timeout
        });
        if (!res.ok) continue;
        const data = await res.json();
        const jobs = (isGreenhouse ? data.jobs : data) as any[];

        if (!jobs) continue;

        const mapped = jobs.map((job) => ({
          id: crypto.randomUUID(),
          title: job.title || job.text,
          company: agency.name,
          sourceUrl: job.absolute_url || job.hostedUrl,
          sourcePlatform: isGreenhouse ? "Greenhouse" : "Lever",
          scrapedAt: new Date(),
          postedAt: new Date(),
          contentHash: createHash("sha256").update(`${job.title || job.text}::${agency.name}`).digest("hex").slice(0, 16),
          isActive: true,
          locationType: "remote",
          type: "agency",
        }));
        results.push(...mapped);
        continue;
      }

      // 2. Agentic Probe for Custom Careers Pages (Probabilistic & Rate-Limited)
      if (Math.random() > 0.15) continue;

      const { checkAndIncrementAiQuota } = await import("./job-utils.js");
      const canCallAi = await checkAndIncrementAiQuota(db);
      if (!canCallAi) continue;

      const res = await fetch(agency.hiringUrl, { 
        headers: { "User-Agent": "VA.INDEX/1.0 (ethical-harvester; agency-sensor-probe)" },
        signal: AbortSignal.timeout(15000)
      });
      if (!res.ok) continue;
      const html = await res.text();
      const snippet = html.slice(0, 20000);

      // SRE Sync: Sequential processing handles the delay naturally, but we reinforce it
      await new Promise(r => setTimeout(r, 2000)); 

      const prompt = `
        You are a structured data extractor. From the following HTML snippet of an agency's career page, 
        extract all current job openings. Return ONLY a JSON array of objects with {title, url}.
        Return [] if none found.
        Agency Name: ${agency.name}
        HTML Snippet:
        ${snippet}
      `;

      const result = await model.generateContent(prompt);
      const output = result.response.text();
      const cleanJson = output.replace(/```json|```/g, "").trim();
      
      const parsed = GeminiOutputSchema.safeParse(JSON.parse(cleanJson));
      if (!parsed.success) {
        console.warn(`[agency-sensor] Gemini hallucination or malformed JSON from ${agency.name}`);
        continue;
      }

      const probes = parsed.data.map((job) => ({
        id: crypto.randomUUID(),
        title: job.title,
        company: agency.name,
        sourceUrl: job.url.startsWith('http') ? job.url : new URL(job.url, agency.websiteUrl).href,
        sourcePlatform: "Agency Sensor",
        scrapedAt: new Date(),
        postedAt: new Date(),
        contentHash: createHash("sha256").update(`${job.title}::${agency.name}`).digest("hex").slice(0, 16),
        tags: ["agency-sensor"],
        isActive: true,
        locationType: "remote",
        type: "agency",
      }));
      results.push(...probes);

    } catch (e) {
      console.error(`[agency-sensor] Probe failed for ${agency.name}:`, e);
    }
  }

  return results;
}
