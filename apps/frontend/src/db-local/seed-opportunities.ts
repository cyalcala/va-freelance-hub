import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../../.env") });

import { createClient } from "@libsql/client/http";
import { drizzle } from "drizzle-orm/libsql";
import { opportunities } from "./schema";

async function seed() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });
  const db = drizzle(client);

  console.log("🌱 Seeding high-intent opportunities...");

  const data = [
    {
      id: crypto.randomUUID(),
      title: "Executive Virtual Assistant",
      company: "Athena Executive Assistant",
      type: "agency",
      sourceUrl: "https://athenago.com/careers",
      sourcePlatform: "Brave",
      tags: JSON.stringify(["Full-time", "Premium"]),
      locationType: "remote",
      payRange: "$800 - $1500",
      description: "Looking for top-tier EAs to support global leaders.",
      postedAt: new Date(),
      scrapedAt: new Date(),
      isActive: true,
      contentHash: "athena-ea-1",
    },
    {
      id: crypto.randomUUID(),
      title: "Lead Generation Specialist",
      company: "Cyberbacker",
      type: "agency",
      sourceUrl: "https://cyberbacker.com/careers",
      sourcePlatform: "Reddit",
      tags: JSON.stringify(["Part-time", "Entry-level"]),
      locationType: "remote",
      payRange: "$400 - $800",
      description: "Help real estate agents grow their business.",
      postedAt: new Date(Date.now() - 3600000 * 2), // 2 hours ago
      scrapedAt: new Date(),
      isActive: true,
      contentHash: "cyberbacker-lg-1",
    },
    {
      id: crypto.randomUUID(),
      title: "Social Media Manager",
      company: "BruntWork",
      type: "direct",
      sourceUrl: "https://bruntwork.co/jobs",
      sourcePlatform: "BlueSky",
      tags: JSON.stringify(["Social Hub", "Design"]),
      locationType: "remote",
      payRange: "$1000+",
      description: "Manage multiple high-profile social accounts.",
      postedAt: new Date(Date.now() - 3600000 * 5), // 5 hours ago
      scrapedAt: new Date(),
      isActive: true,
      contentHash: "bruntwork-smm-1",
    }
  ];

  await db.insert(opportunities).values(data as any);
  console.log("✅ Seeded 3 high-intent opportunities!");
  client.close();
}

seed().catch(console.error);
