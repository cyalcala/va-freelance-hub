import { readFileSync, existsSync } from "fs";
import * as path from "path";
import { AIMesh } from "../packages/ai/ai-mesh";

async function testFailover() {
  console.log("═══ SRE MASTER AUDIT: AI MESH FAILOVER TEST ═══");
  
  const envPath = path.join(process.cwd(), ".env.local");
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, "utf8").split("\n")) {
      const [k, ...rest] = line.split("=");
      if (k && rest.length && !k.startsWith("#")) {
        process.env[k.trim()] = rest.join("=").trim().replace(/^["']|["']$/g, "");
      }
    }
  }

  const sampleHtml = `
    <html>
      <body>
        <h1>Senior Backend Engineer</h1>
        <p>Company: CloudScale Tech</p>
        <p>Salary: $80,000 - $120,000 USD / Year</p>
        <p>Description: We are looking for a Senior Go/React dev. Remote worldwide. PH freelancers welcome.</p>
      </body>
    </html>
  `;

  try {
    console.log("\n[TEST] Running Intelligence Extraction Sweep...");
    const result = await AIMesh.extract(sampleHtml);
    
    console.log("\n✅ SUCCESS: Extraction Complete.");
    console.log("- Used Model:", result.metadata?.model);
    console.log("- Title:", result.title);
    console.log("- Tier:", result.tier);
    console.log("- Niche:", result.niche);
    
    if (result.metadata?.model?.startsWith('or-')) {
      console.log("✅ FAILOVER VERIFIED: Successfully rotated to OpenRouter Free Pool.");
    } else {
      console.log("ℹ️  Primary pick won (No failover needed).");
    }

  } catch (err: any) {
    console.error("\n❌ FAILOVER CRASHED:", err.message);
  }
}

testFailover();
