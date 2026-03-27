import { eq } from "drizzle-orm";
import { agencies } from "@va-hub/db/schema";
import type { NewOpportunity } from "@va-hub/db/schema";
import { createHash } from "crypto";

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

      // 2. Generic Probe (placeholder for future Agentic Scraper)
      // For now, we effectively "log" the intent to probe custom pages.
      return [];
    } catch (e) {
      return [];
    }
  });

  const settled = await Promise.allSettled(probePromises);
  return settled.flatMap(s => s.status === "fulfilled" ? s.value : []);
}
