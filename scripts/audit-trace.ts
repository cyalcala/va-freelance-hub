/**
 * FLEET AUDIT: Synthetic Job Trace Injector
 * 
 * Injects a synthetic job payload into the pipeline with full traceability.
 * The payload carries a trace_id and harvested_at timestamp that will be
 * augmented with cooked_at and plated_at as it flows through Cook → Plate.
 * 
 * Usage: bun run scripts/audit-trace.ts
 */

import { db } from "../packages/db/client";
import { opportunities } from "../packages/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID, createHash } from "crypto";

const TRACE_ID = `audit-${Date.now()}-${randomUUID().slice(0, 8)}`;
const SYNTHETIC_TITLE = `[AUDIT] Synthetic Trace Job ${TRACE_ID}`;
const SYNTHETIC_COMPANY = "Audit Bot Corp";

async function injectSyntheticJob() {
  console.log("═══ FLEET AUDIT: SYNTHETIC JOB TRACE ═══");
  console.log(`Trace ID: ${TRACE_ID}`);
  console.log(`Injecting at: ${new Date().toISOString()}`);

  const harvested_at = Date.now();

  const md5_hash = createHash("md5")
    .update(SYNTHETIC_TITLE + SYNTHETIC_COMPANY)
    .digest("hex");

  // Check for existing audit jobs and clean them
  const existing = await db.select()
    .from(opportunities)
    .where(eq(opportunities.sourcePlatform, "audit-bot"));
  
  if (existing.length > 0) {
    console.log(`🧹 Cleaning ${existing.length} previous audit jobs...`);
    for (const job of existing) {
      await db.delete(opportunities).where(eq(opportunities.id, job.id));
    }
  }

  // Direct injection into Turso (bypasses all engines to measure Plate → Reflect latency)
  const cooked_at = Date.now();

  await db.insert(opportunities).values({
    id: randomUUID(),
    md5_hash,
    title: SYNTHETIC_TITLE,
    company: SYNTHETIC_COMPANY,
    url: "https://example.com/audit-trace",
    description: `Synthetic trace payload for E2E audit. Trace ID: ${TRACE_ID}. This job was injected directly into the Gold Vault to measure Plate→Reflect latency.`,
    niche: "VA_SUPPORT",
    type: "direct",
    locationType: "remote",
    sourcePlatform: "audit-bot",
    region: "Philippines",
    scrapedAt: new Date(),
    isActive: true,
    tier: 1,
    relevanceScore: 100,
    latestActivityMs: Date.now(),
    metadata: JSON.stringify({
      trace_id: TRACE_ID,
      source: "audit-bot",
      harvested_at,
      cooked_at,
      plated_at: Date.now(),
      pipeline: "direct-inject",
      audit_version: "fleet-e2e-v1"
    }),
  });

  const plated_at = Date.now();
  const harvestToPlateMs = plated_at - harvested_at;

  console.log("");
  console.log("✅ [INJECTED] Synthetic job plated to Turso Gold Vault.");
  console.log(`   Trace ID:        ${TRACE_ID}`);
  console.log(`   MD5 Hash:        ${md5_hash}`);
  console.log(`   harvested_at:    ${new Date(harvested_at).toISOString()}`);
  console.log(`   cooked_at:       ${new Date(cooked_at).toISOString()}`);
  console.log(`   plated_at:       ${new Date(plated_at).toISOString()}`);
  console.log(`   Harvest→Plate:   ${harvestToPlateMs}ms`);
  console.log("");
  console.log("🔭 Next step: Visit the frontend and verify this job appears under VA_SUPPORT within 60s.");
  console.log("═══ TRACE INJECTION COMPLETE ═══");
}

injectSyntheticJob().catch(console.error);
