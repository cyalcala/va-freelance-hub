import { XMLParser } from "fast-xml-parser";
import crypto from "crypto";

const INGEST_API_URL = process.env.INGEST_API_URL;
const PROXY_SECRET = process.env.PROXY_SECRET;

if (!INGEST_API_URL || !PROXY_SECRET) {
  console.error("Missing required environment variables (INGEST_API_URL or PROXY_SECRET).");
  process.exit(1);
}

// Feeds to scrape
const feeds = [
  { url: "https://weworkremotely.com/categories/remote-customer-support-jobs.rss", platform: "WeWorkRemotely", type: "VA" },
  { url: "https://weworkremotely.com/categories/remote-design-jobs.rss", platform: "WeWorkRemotely", type: "freelance" },
  { url: "https://weworkremotely.com/categories/remote-sales-and-marketing-jobs.rss", platform: "WeWorkRemotely", type: "VA" }
];

async function harvest() {
  console.log("🏹 Starting Sovereign Hunter Pulse...");
  const parser = new XMLParser({ ignoreAttributes: false });
  const allOpportunities: any[] = [];

  for (const feed of feeds) {
    try {
      console.log(`Fetching ${feed.url}...`);
      const response = await fetch(feed.url);
      const xml = await response.text();
      const jsonObj = parser.parse(xml);
      
      const items = jsonObj?.rss?.channel?.item || [];
      const parsedItems = Array.isArray(items) ? items : [items];

      for (const item of parsedItems) {
        const title = item.title || "";
        const sourceUrl = item.link || "";
        
        // Skip empty or invalid items
        if (!title || !sourceUrl) continue;
        
        // Create deterministic deduplication hash
        const contentHash = crypto.createHash('sha256').update(`${title}${sourceUrl}`).digest('hex');

        allOpportunities.push({
          title,
          company: item["dc:creator"] || "Unknown",
          type: feed.type,
          sourceUrl,
          sourcePlatform: feed.platform,
          locationType: "remote",
          description: item.description || "",
          postedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
          isActive: true,
          contentHash
        });
      }
    } catch (e) {
      console.error(`Failed to process feed ${feed.url}:`, e);
    }
  }

  console.log(`Total signals parsed: ${allOpportunities.length}`);

  if (allOpportunities.length > 0) {
    console.log("Sending payload to ingest API...");
    const result = await fetch(INGEST_API_URL as string, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${PROXY_SECRET}`
      },
      body: JSON.stringify({ items: allOpportunities })
    });

    if (!result.ok) {
      const errorText = await result.text();
      console.error(`Ingest API rejected payload: ${result.status} ${errorText}`);
      process.exit(1);
    }

    const data = await result.json();
    console.log(`✅ Successfully inserted ${data.inserted} new signals out of ${data.totalReceived} total.`);
    console.log(`Total signals: ${data.inserted}`); // For GHA summary
  } else {
    console.log("Total signals: 0");
  }
}

harvest().catch(console.error);
