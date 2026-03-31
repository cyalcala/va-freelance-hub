import { db, schema } from "@va-hub/db/client";
import { desc, eq } from "drizzle-orm";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { checkAndIncrementAiQuota } from "./lib/job-utils";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const auditModel = genAI.getGenerativeModel({ 
  model: "gemini-1.5-flash",
  generationConfig: {
    temperature: 0.1,
    responseMimeType: "application/json",
  }
});

async function verifyAudit() {
  console.log("🔍 Verifying Sentinel AI Audit...");
  
  // 1. Get a sample
  const sample = await db.select()
    .from(schema.opportunities)
    .orderBy(desc(schema.opportunities.lastSeenAt))
    .limit(1);

  if (sample.length === 0) {
    console.error("No signals found in DB to audit.");
    return;
  }

  const { title, company, description, sourcePlatform } = sample[0];
  console.log(`Auditing: ${title} from ${sourcePlatform}`);

  const canCallAi = await checkAndIncrementAiQuota(db);
  if (!canCallAi) {
      console.error("Quota reached, skipping audit.");
      return;
  }

  const auditResult = await auditModel.generateContent(`
    EVALUATE THIS JOB SIGNAL FOR VALIDITY.
    Is this structured job data or junk/noise/error messages?
    TITLE: ${title}
    COMPANY: ${company}
    DESCRIPTION: ${description?.slice(0, 500)}
    
    RESPOND WITH JSON: { "is_valid": boolean, "reason": string }
  `);

  const audit = JSON.parse(auditResult.response.text());
  console.log("Audit Result:", audit);
}

verifyAudit();
