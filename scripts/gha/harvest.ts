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
  { format: "xml", url: "https://weworkremotely.com/categories/remote-customer-support-jobs.rss", platform: "WeWorkRemotely", type: "VA" },
  { format: "xml", url: "https://weworkremotely.com/categories/remote-design-jobs.rss", platform: "WeWorkRemotely", type: "freelance" },
  { format: "xml", url: "https://weworkremotely.com/categories/remote-sales-and-marketing-jobs.rss", platform: "WeWorkRemotely", type: "VA" },
  { format: "json", url: "https://remotive.com/api/remote-jobs?limit=100", platform: "Remotive", type: "VA" },
  { format: "json", url: "https://remoteok.com/api", platform: "RemoteOK", type: "VA" },
  { format: "json", url: "https://www.reddit.com/r/forhire/new.json?limit=50", platform: "Reddit", type: "freelance" },
  { format: "json", url: "https://www.reddit.com/r/BuhayDigital/new.json?limit=50", platform: "Reddit", type: "VA" }
];

async function harvest() {
  console.log("🏹 Starting Sovereign Hunter Pulse...");
  const parser = new XMLParser({ 
    ignoreAttributes: false,
    processEntities: false, 
    ignoreDeclaration: true 
  });
  const allOpportunities: any[] = [];

  for (const feed of feeds) {
    try {
      console.log(`Fetching ${feed.url}...`);
      const response = await fetch(feed.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 SovereignHunterBot/1.0'
        }
      });
      
      if (feed.format === "xml") {
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
      } else if (feed.format === "json") {
        const json: any = await response.json();
        
        let items: any[] = [];
        
        if (feed.platform === "Remotive") {
          items = json.jobs || [];
        } else if (feed.platform === "Reddit") {
          items = json?.data?.children?.map((child: any) => child.data) || [];
        } else if (feed.platform === "RemoteOK") {
          items = Array.isArray(json) ? json.slice(1) : []; // RemoteOK's first item is a legal warning
        }

        for (const item of items) {
          let title = "";
          let sourceUrl = "";
          let company = "Unknown";
          let requiredLocation = "";
          let description = "";
          let postedAt = new Date().toISOString();

          if (feed.platform === "Remotive") {
            title = item.title || "";
            sourceUrl = item.url || "";
            company = item.company_name || "Unknown";
            requiredLocation = (item.candidate_required_location || "").toLowerCase();
            description = item.description || "";
            postedAt = item.publication_date ? new Date(item.publication_date).toISOString() : new Date().toISOString();
          } else if (feed.platform === "Reddit") {
            title = item.title || "";
            // Only scrape posts explicitly tagged as Hiring
            if (!title.toLowerCase().includes("[hiring]")) continue;
            
            sourceUrl = item.url || (item.permalink ? `https://reddit.com${item.permalink}` : "");
            company = item.author || "Reddit User";
            description = item.selftext || "";
            postedAt = item.created_utc ? new Date(item.created_utc * 1000).toISOString() : new Date().toISOString();
            requiredLocation = "worldwide"; // Reddit posts are human text, skip strict location bouncing
          } else if (feed.platform === "RemoteOK") {
            title = item.position || "";
            sourceUrl = item.url || "";
            company = item.company || "Unknown";
            requiredLocation = (item.location || "").toLowerCase();
            description = item.description || "";
            postedAt = item.date ? new Date(item.date).toISOString() : new Date().toISOString();
          }
          
          if (!title || !sourceUrl) continue;
          
          // 🛡️ The Bouncer: Strict Location Filtering
          // We bypass the bouncer for Reddit because Reddit posts are unstructured
          if (feed.platform !== "Reddit") {
            const isWorldwide = requiredLocation.includes("worldwide") || requiredLocation.includes("anywhere") || requiredLocation.includes("global");
            const includesAsia = requiredLocation.includes("asia") || requiredLocation.includes("philippines");
            
            // Reject if it is not open to Worldwide or explicitly Asia/Philippines
            if (!isWorldwide && !includesAsia) {
               continue; // Toss it out!
            }
          }
          
          const contentHash = crypto.createHash('sha256').update(`${title}${sourceUrl}`).digest('hex');

          allOpportunities.push({
            title,
            company,
            type: feed.type,
            sourceUrl,
            sourcePlatform: feed.platform,
            locationType: "remote",
            description,
            postedAt,
            isActive: true,
            contentHash
          });
        }
      }
    } catch (e) {
      console.error(`Failed to process feed ${feed.url}:`, e);
    }
  }

  console.log(`Total signals parsed: ${allOpportunities.length}`);

  if (allOpportunities.length > 0) {
    console.log("Sending payload to ingest API in chunks...");
    const CHUNK_SIZE = 5;
    let totalInserted = 0;
    for (let i = 0; i < allOpportunities.length; i += CHUNK_SIZE) {
      const chunk = allOpportunities.slice(i, i + CHUNK_SIZE);
      const result = await fetch(INGEST_API_URL as string, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${PROXY_SECRET}`
        },
        body: JSON.stringify({ items: chunk })
      });

      if (!result.ok) {
        const errorText = await result.text();
        console.error(`Ingest API rejected payload for chunk ${i}: ${result.status} ${errorText}`);
        continue;
      }

      const data: any = await result.json();
      totalInserted += data.inserted || 0;
      console.log(`✅ [FARMER] Successfully inserted ${data.inserted} items out of ${data.totalReceived} total.`);
    }
    
    console.log(`Total signals: ${totalInserted}`); // For GHA summary
  } else {
    console.log("Total signals: 0");
  }
}

harvest().catch(console.error);
