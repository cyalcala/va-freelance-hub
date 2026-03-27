import { createDb } from "../packages/db/client";
import { getSortedSignals } from "../packages/db/sorting";
import { writeFileSync } from "fs";
import { join } from "path";

async function main() {
  const { db, client } = createDb();
  try {
    console.log("Generating Scam-Free Static Fallback (250 signals)...");
    const signals = await getSortedSignals(250);
    
    // Purge logic check (double verification)
    const cleanSignals = signals.filter(s => {
       const low = (s.title + s.description).toLowerCase();
       return !['onlyfans', 'chatter', 'closer', 'moderator', 'php', 'pretttytitty'].some(p => low.includes(p));
    });

    const fallbackPath = join(process.cwd(), "apps/frontend/src/data/static_fallback.json");
    writeFileSync(fallbackPath, JSON.stringify(cleanSignals, null, 2));
    
    console.log(`Fallback Generated: ${cleanSignals.length} clean signals saved to ${fallbackPath}`);
  } finally {
    await client.close();
  }
}

main();
