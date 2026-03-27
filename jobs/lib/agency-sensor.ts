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

        const res = await fetch(apiUrl, {
          headers: { "User-Agent": "VA.INDEX/1.0 (ethical-harvester; agency-sensor)" }
        });
        if (!res.ok) return [];
        const data = await res.json();
        const jobs = (isGreenhouse ? data.jobs : data) as any[];

        if (!jobs) return [];

        return jobs.map((job) => ({
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
      }

      // 2. Agentic Probe for Custom Careers Pages
      if (Math.random() > 0.15) {
        return [];
      }

      const { checkAndIncrementAiQuota } = await import("./job-utils.js");
      const canCallAi = await checkAndIncrementAiQuota(db);
      if (!canCallAi) return [];

      const res = await fetch(agency.hiringUrl, { 
        headers: { "User-Agent": "VA.INDEX/1.0 (ethical-harvester; agency-sensor-probe)" } 
      });
      if (!res.ok) return [];
      const html = await res.text();
      const snippet = html.slice(0, 20000); // Increased to 20k for deeper insight

      await new Promise(r => setTimeout(r, 2000)); // Respect 15 RPM limit

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
        return [];
      }

      return parsed.data.map((job) => ({
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

    } catch (e) {
      console.error(`[agency-sensor] Probe failed for ${agency.name}:`, e);
      return [];
    }
  });

  const settled = await Promise.allSettled(probePromises);
  return settled.flatMap(s => s.status === "fulfilled" ? s.value : []);
}
