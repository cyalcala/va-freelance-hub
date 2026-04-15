import { db } from "../packages/db";
import { opportunities } from "../packages/db/schema";
import { eq } from "drizzle-orm";

/**
 * The Great Re-Nicheing Script
 * Fixes the clustering of jobs in VA_SUPPORT caused by the early heuristic fallback.
 */

function detectNiche(title: string): string {
  const t = title.toLowerCase();
  
  if (t.includes('developer') || t.includes('engineer') || t.includes('coder') || t.includes('software') || t.includes('data') || t.includes('qa')) return 'TECH_ENGINEERING';
  if (t.includes('marketing') || t.includes('seo') || t.includes('advertising') || t.includes('social media') || t.includes('growth')) return 'MARKETING';
  if (t.includes('sales') || t.includes('sdr') || t.includes('bdr') || t.includes('appointment') || t.includes('outreach')) return 'SALES_GROWTH';
  if (t.includes('designer') || t.includes('video') || t.includes('editor') || t.includes('creative') || t.includes('graphic')) return 'CREATIVE_MULTIMEDIA';
  if (t.includes('customer service') || t.includes('support') || t.includes('csr') || t.includes('call center') || t.includes('bpo')) return 'BPO_SERVICES';
  if (t.includes('admin') || t.includes('finance') || t.includes('bookkeeper') || t.includes('accountant') || t.includes('data entry')) return 'ADMIN_BACKOFFICE';
  
  return 'VA_SUPPORT';
}

async function run() {
  console.log("🛠️ Starting The Great Re-Nicheing...");
  
  const allJobs = await db.select().from(opportunities).where(eq(opportunities.niche, 'VA_SUPPORT'));
  console.log(`🧐 Found ${allJobs.length} potential candidates in VA_SUPPORT.`);
  
  let updatedCount = 0;
  
  for (const job of allJobs) {
    const newNiche = detectNiche(job.title || "");
    
    if (newNiche !== 'VA_SUPPORT') {
      await db.update(opportunities)
        .set({ niche: newNiche })
        .where(eq(opportunities.id, job.id));
      updatedCount++;
    }
  }
  
  console.log(`✅ Successfully redistributed ${updatedCount} jobs to their correct silos.`);
}

run().catch(console.error);
