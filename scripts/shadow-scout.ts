import * as cheerio from "cheerio";
import { v4 as uuidv4 } from "uuid";
import { db } from "../packages/db/client";
import { hunterQueue } from "../packages/db/schema";
import { proxyFetch } from "../jobs/lib/proxy-fetch";
import { emitIngestionHeartbeat, shouldSkipDiscovery, recordHarvestSuccess } from "../packages/db/governance";

/**
 * VECTOR 3: SHADOW SCOUT (The Discovery Engine)
 * 
 * Mandate: Discover "Public Mirror" job lead URLs via SERP Dorking.
 * This is the "Crawl the Crawler" pattern—ethical, $0 cost, and non-intrusive.
 */

const DORK_QUERIES = [
  {
    platform: "LinkedIn",
    query: 'site:linkedin.com/posts "hiring" "virtual assistant" "Philippines"',
    host_match: "linkedin.com"
  },
  {
    platform: "Notion",
    query: 'site:notion.so "job board" "hiring" "remote"',
    host_match: "notion.so"
  },
  {
    platform: "Trello",
    query: 'site:trello.com "hiring" "philippines" "candidates"',
    host_match: "trello.com"
  },
  {
    platform: "GitBook",
    query: 'site:*.gitbook.io "hiring" "handbook" "contractors"',
    host_match: "gitbook.io"
  },
  {
    platform: "GitHub",
    query: 'site:github.com "awesome" "hiring" "philippines"',
    host_match: "github.com"
  }
];

async function runShadowScout() {
  console.log("═══ SHADOW SCOUT (Vector 3) INITIATED ═══");

  // 🛡️ ETHICAL FLEET: Respect the Seat
  if (await shouldSkipDiscovery('shadow-scout', 'GLOBAL', 15)) {
    console.log("🚥 [FLEET] Shadow Scout is backing off to respect existing discovery window.");
    return;
  }

  await emitIngestionHeartbeat('Shadow Scout', 'GLOBAL');

  for (const dork of DORK_QUERIES) {
    try {
      console.log(`🔎 [scout] Executing Dork for ${dork.platform}: "${dork.query}"`);
      
      // We use Google Search as our legal mirror
      const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(dork.query)}`;
      const res = await proxyFetch(googleUrl);
      
      if (!res.ok) {
        console.warn(`⚠️ [scout] Search failed for ${dork.platform}: HTTP ${res.status}`);
        continue;
      }

      const html = await res.text();
      const $ = cheerio.load(html);
      const links: string[] = [];

      // Google results are usually in <a> tags with specific patterns
      // Note: This is a "best-effort" parse for the Google Mirror
      $('a').each((_, el) => {
        const href = $(el).attr('href');
        if (href && href.includes(dork.host_match)) {
          // Clean Google tracking wrap if present
          let cleanUrl = href;
          if (href.startsWith('/url?q=')) {
            const urlMatch = href.match(/\/url\?q=([^&]+)/);
            if (urlMatch) cleanUrl = decodeURIComponent(urlMatch[1]);
          }
          
          if (cleanUrl.startsWith('http')) {
            links.push(cleanUrl);
          }
        }
      });

      const uniqueLinks = [...new Set(links)];
      console.log(`📡 [scout] Discovered ${uniqueLinks.length} candidate URLs for ${dork.platform}`);

      let queuedCount = 0;
      for (const url of uniqueLinks) {
        try {
          const host = new URL(url).hostname;
          
          await db.insert(hunterQueue).values({
            id: uuidv4(),
            url: url,
            host: host,
            platform: dork.platform,
            status: 'READY',
            priority: 1, // Higher priority for discovered signals
            createdAt: new Date()
          }).onConflictDoNothing(); // Skip duplicates
          
          queuedCount++;
        } catch (err) {
          // Skip malformed URLs
        }
      }

      console.log(`✅ [scout] Queued ${queuedCount} new URLs into the Hunter Queue.`);

    } catch (err: any) {
      console.error(`❌ [scout] Critical failure during ${dork.platform} scout:`, err.message);
    }
  }

  await recordHarvestSuccess('shadow-scout', 'GLOBAL');
  console.log("═══ SHADOW SCOUT SORTIE COMPLETE ═══");
}

if (process.argv.includes("--local")) {
  runShadowScout().catch(console.error);
}

export { runShadowScout };
