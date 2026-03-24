import { createClient } from "@libsql/client/http";
import * as dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

async function audit() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  console.log("=== DEEP DATA AUDIT ===\n");

  // 1. How many opportunities exist?
  const total = await client.execute("SELECT COUNT(*) as cnt FROM opportunities");
  console.log(`Total Opportunities in DB: ${total.rows[0].cnt}`);

  // 2. How many are active?
  const active = await client.execute("SELECT COUNT(*) as cnt FROM opportunities WHERE is_active = 1");
  console.log(`Active Opportunities: ${active.rows[0].cnt}`);

  // 3. Show the 5 most recent
  const recent = await client.execute("SELECT title, company, source_platform, scraped_at FROM opportunities ORDER BY scraped_at DESC LIMIT 5");
  console.log("\nMost Recent 5 Opportunities:");
  recent.rows.forEach((r, i) => {
    const date = r.scraped_at ? new Date(Number(r.scraped_at) * 1000).toISOString() : 'N/A';
    console.log(`  ${i + 1}. [${r.source_platform}] "${r.title}" by ${r.company} — Scraped: ${date}`);
  });

  // 4. How many agencies?
  const agencies = await client.execute("SELECT COUNT(*) as cnt FROM agencies");
  console.log(`\nTotal Agencies: ${agencies.rows[0].cnt}`);

  // 5. Show agency heat & friction
  const agencyList = await client.execute("SELECT name, hiring_heat, friction_level, status, hiring_url FROM agencies ORDER BY friction_level ASC, hiring_heat DESC");
  console.log("\nAgency Rankings:");
  agencyList.rows.forEach((a) => {
    const flames = "🔥".repeat(Number(a.hiring_heat) || 1);
    console.log(`  ${flames} ${a.name} (friction: ${a.friction_level}, status: ${a.status})`);
    console.log(`     → ${a.hiring_url}`);
  });

  client.close();
}

audit().catch(console.error);
