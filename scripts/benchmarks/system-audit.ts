import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { Database } from "bun:sqlite";

async function main() {
  const sqlite = new Database(":memory:");
  const db = drizzle(sqlite);

  // Create test table
  sqlite.run(`CREATE TABLE IF NOT EXISTS opportunities (
    id TEXT PRIMARY KEY,
    title TEXT,
    description TEXT,
    is_active INTEGER
  )`);

  // Insert 10000 records
  console.log("Inserting test records...");
  const stmt = sqlite.prepare("INSERT INTO opportunities (id, title, description, is_active) VALUES (?, ?, ?, ?)");
  sqlite.transaction(() => {
    for (let i = 0; i < 10000; i++) {
      stmt.run(`id-${i}`, i % 2 === 0 ? "Scam Job $500 / day" : "Legit Job", "desc", 1);
    }
  })();

  const evasionRegex = [/\$?\d+\s*\/\s*(day|wk|hr)/i];

  // N+1 Test
  sqlite.run("UPDATE opportunities SET is_active = 1");

  console.log("Running N+1...");
  const nPlusOneStart = performance.now();
  const activeOpps = await db.all(sql`SELECT id, title, description FROM opportunities WHERE is_active = 1`) as any[];
  let nPlusOneScrubbed = 0;
  for (const opp of activeOpps) {
    const textBlock = `${opp.title} ${opp.description}`;
    if (evasionRegex.some(regex => regex.test(textBlock))) {
      await db.run(sql`UPDATE opportunities SET is_active = 0 WHERE id = ${opp.id}`);
      nPlusOneScrubbed++;
    }
  }
  const nPlusOneTime = performance.now() - nPlusOneStart;

  // Optimized Test
  sqlite.run("UPDATE opportunities SET is_active = 1");

  console.log("Running Optimized...");
  const optimizedStart = performance.now();
  const activeOpps2 = await db.all(sql`SELECT id, title, description FROM opportunities WHERE is_active = 1`) as any[];
  let optimizedScrubbed = 0;
  const oppsToScrubIds: string[] = [];

  for (const opp of activeOpps2) {
    const textBlock = `${opp.title} ${opp.description}`;
    if (evasionRegex.some(regex => regex.test(textBlock))) {
      oppsToScrubIds.push(opp.id);
    }
  }

  if (oppsToScrubIds.length > 0) {
    // SQLite has a maximum number of host parameters limit (often 999 or 32766)
    // To be safe, we chunk into batches of 500
    const chunkSize = 500;
    for (let i = 0; i < oppsToScrubIds.length; i += chunkSize) {
      const chunk = oppsToScrubIds.slice(i, i + chunkSize);
      await db.run(
        sql`UPDATE opportunities SET is_active = 0 WHERE id IN (${sql.join(chunk.map((id: any) => sql`${id}`), sql`, `)})`
      );
    }
    optimizedScrubbed += oppsToScrubIds.length;
  }
  const optimizedTime = performance.now() - optimizedStart;

  console.log(`N+1 Time: ${nPlusOneTime.toFixed(2)}ms (scrubbed: ${nPlusOneScrubbed})`);
  console.log(`Optimized Time: ${optimizedTime.toFixed(2)}ms (scrubbed: ${optimizedScrubbed})`);

  // Cleanup
  sqlite.run("DROP TABLE opportunities");
  console.log("Done.");
}

main().catch(console.error);
