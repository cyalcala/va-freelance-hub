import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { eq } from "drizzle-orm";
import { agencies } from "@va-hub/db/schema";
import { logger } from "@trigger.dev/sdk/v3";
import { normalizeDate } from "@va-hub/db";

// --- SENSOR SCHEMAS ---

const GeminiJobSchema = z.object({
  title: z.string().default("Untitled Role"),
  url: z.string(),
});

const GeminiOutputSchema = z.array(GeminiJobSchema).default([]);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

/**
 * V12 DISCOVERY PROBE: Agency Sensor
 * Pulses raw signals from custom career pages to the Intelligence Mesh.
 */
export async function probeAgencies(db: any): Promise<any[]> {
  const allAgencies = await db.select().from(agencies).where(eq(agencies.status, 'active'));
  const results: any[] = [];

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
          signal: AbortSignal.timeout(10000)
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
          isActive: true,
          locationType: "remote",
          type: "agency",
          postedAt: normalizeDate(new Date()),
          scrapedAt: normalizeDate(new Date()),
          __raw: JSON.stringify(job)
        }));
        results.push(...mapped);
        continue;
      }

      // 2. Agentic Probe for Custom Careers Pages (Probabilistic Detection)
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

      // Respect the Fleet's Temporal Pacing
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
        logger.error(`[agency-sensor] Gemini mapping failed for ${agency.name}`);
        continue;
      }

      const probes = parsed.data.map((job) => ({
        id: crypto.randomUUID(),
        title: job.title,
        company: agency.name,
        sourceUrl: job.url.startsWith('http') ? job.url : new URL(job.url, agency.websiteUrl).href,
        sourcePlatform: "Agency Sensor",
        type: "agency",
        postedAt: normalizeDate(new Date()),
        scrapedAt: normalizeDate(new Date()),
        isActive: true,
        locationType: "remote",
        __raw: JSON.stringify(job)
      }));
      results.push(...probes);

    } catch (e: any) {
      logger.error(`[agency-sensor] Probe failed for ${agency.name}: ${e.message}`);
    }
  }

  return results;
}
