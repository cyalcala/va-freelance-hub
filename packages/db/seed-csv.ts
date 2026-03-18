import { db } from "./client";
import { agencies } from "./schema";
import fs from "fs";
import path from "path";

async function seed() {
  console.log("🌱 Seeding default companies from career7.csv...");
  
  const csvPath = path.resolve(__dirname, "../../../career7.csv");
  const content = fs.readFileSync(csvPath, "utf-8");
  const lines = content.split("\n").slice(1); // Skip header

  const newRecords = [];

  for (const line of lines) {
    if (!line.trim()) continue;

    // Simple CSV parser for this specific file structure
    // Handling quoted strings (like in the 'About' column)
    const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
    
    if (parts.length < 2) continue;

    let name = parts[0].trim();
    let url = parts[1].trim();
    const description = parts[2]?.replace(/^"|"$/g, "").trim() || "";
    
    // Expert normalization: Prepend protocol if missing
    if (url && !url.startsWith("http")) {
      url = `https://${url}`;
    }
    
    newRecords.push({
      id: crypto.randomUUID(),
      name: name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
      websiteUrl: url,
      hiringUrl: url,
      description: description,
      status: "active" as const,
      lastSync: new Date(),
      metadata: { source: "default-seed-csv" }
    });
  }

  if (newRecords.length > 0) {
    try {
      await db.insert(agencies).values(newRecords).onConflictDoNothing();
      console.log(`✅ Successfully seeded ${newRecords.length} companies.`);
    } catch (e) {
      console.error("❌ Seeding failed:", e);
    }
  }
}

seed().catch(console.error);
