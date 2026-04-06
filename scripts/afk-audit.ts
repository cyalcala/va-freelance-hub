import { startV12Sifter } from "../apps/frontend/src/lib/ai/waterfall";
import fs from "fs";

async function runAudit() {
  // Ghost Payload — exact specification from Priority 3 AFK mandate
  const ghostPayload = {
    raw_title: "Direct Hire: Senior Technical VA ($2,500/mo) - PH Only",
    raw_company: "Confidential",
    raw_url: "https://careers.ph/v12-afk-test",
    raw_html: `<html><body>
      <h1>Direct Hire: Senior Technical VA ($2,500/mo) - PH Only</h1>
      <p>Elite firm hiring. 100% Remote. Company name is strictly confidential. Must be located in PH.</p>
      <p>We're looking for a Senior Technical Virtual Assistant to join our growing team.
      Requirements: 3+ years experience, strong English communication, available PHT hours.
      Compensation: $2,500/month, paid in USD. Philippines-based candidates only.</p>
    </body></html>`
  };

  const timestamp = new Date().toISOString();
  const separator = "\n" + "=".repeat(70) + "\n";

  console.log("🚀 [AFK-AUDIT] Starting Priority 3 Diagnostic Audit...");
  console.log(`📅 Timestamp: ${timestamp}`);

  try {
    // Phase 1: Test AI Waterfall directly
    const { runAIWaterfall } = await import("../apps/frontend/src/lib/ai/waterfall");
    console.log("🔍 [Phase 1] Testing AI Waterfall directly...");

    let aiResult = null;
    let aiModel = "NONE";
    try {
      aiResult = await runAIWaterfall(ghostPayload.raw_html);
      aiModel = aiResult.metadata?.model || "unknown";
      console.log(`✨ [Phase 1] AI Waterfall SUCCESS via ${aiModel}`);
      console.log(`   Company extracted: "${aiResult.company}"`);
      console.log(`   Tier: ${aiResult.tier} | PH: ${aiResult.isPhCompatible} | Score: ${aiResult.relevanceScore}`);
    } catch (e: any) {
      console.warn(`⚠️ [Phase 1] AI Waterfall failed: ${e.message}`);
    }

    // Phase 2: Test full V12 Sifter pipeline
    console.log("🔍 [Phase 2] Testing full startV12Sifter pipeline...");
    const result = await startV12Sifter(ghostPayload);
    console.log(`✅ [Phase 2] V12 Sifter result: ${JSON.stringify(result)}`);

    // Phase 3: Write report
    const report = [
      separator,
      `[${timestamp}] AFK DIAGNOSTIC AUDIT — Priority 3`,
      separator,
      `PHASE 1 — AI WATERFALL:`,
      aiResult
        ? `  Status: SUCCESS\n  Model: ${aiModel}\n  Company: "${aiResult.company}"\n  Tier: ${aiResult.tier}\n  PH Compatible: ${aiResult.isPhCompatible}\n  Relevance: ${aiResult.relevanceScore}\n  Niche: ${aiResult.niche}`
        : `  Status: FAILED (all 5 models unavailable or errored)`,
      ``,
      `PHASE 2 — V12 SIFTER:`,
      `  Result: ${JSON.stringify(result, null, 2)}`,
      ``,
      `VERDICT: ${result.status === "inserted" ? "✅ FULL AI PIPELINE OPERATIONAL" : result.status === "dropped" && result.reason === "duplicate_md5" ? "⚠️ DUPLICATE (already in vault from prior run)" : result.status === "inserted_fallback" ? "⚠️ AI FAILED, HEURISTIC FALLBACK USED" : "❌ DROPPED"}`,
      separator,
    ].join("\n");

    fs.appendFileSync("V12_AFK_REPORT.txt", report);
    console.log("📝 Report appended to V12_AFK_REPORT.txt");
    console.log("✅ Audit complete.");
    process.exit(0);
  } catch (err: any) {
    console.error("❌ Audit CRITICAL failure:", err);
    fs.appendFileSync(
      "V12_AFK_REPORT.txt",
      `\n[${timestamp}] AUDIT CRITICAL FAILURE: ${err.message}\n`
    );
    process.exit(1);
  }
}

runAudit();
