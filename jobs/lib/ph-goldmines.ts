import * as cheerio from "cheerio";

/**
 * 🇵🇭 PH-GOLDMINES (ELITE AGENCY SCRAPERS)
 * 
 * Target: Specialized agencies hiring remote Filipinos.
 * Strategy: Navigate direct board URLs and extract structured signals.
 */

export interface GoldmineSignal {
  title: string;
  company: string;
  sourceUrl: string;
  description?: string;
}

export const goldmineSources = [
  {
    name: "Athena",
    url: "https://www.athena.go/careers",
    type: "agency"
  },
  {
    name: "CloudStaff",
    url: "https://www.cloudstaff.com/jobs/",
    type: "agency"
  },
  {
    name: "Outsource Access",
    url: "https://outsourceaccess.com/careers/",
    type: "agency"
  },
  {
    name: "Cyberbacker",
    url: "https://cyberbacker.ph/careers/",
    type: "agency"
  },
  {
    name: "Virtudesk",
    url: "https://www.virtudesk.com/careers/",
    type: "agency"
  },
  {
    name: "BruntWork",
    url: "https://bruntwork.co/careers/",
    type: "agency"
  },
  {
    name: "GoTeam",
    url: "https://go.team/careers/",
    type: "agency"
  },
  {
    name: "MultiplyMii",
    url: "https://jobs.multiplymii.com/",
    type: "agency"
  },
  {
    name: "Shepherd",
    url: "https://www.supportshepherd.com/jobs",
    type: "agency"
  },
  {
    name: "Reddit: buhaydigital",
    url: "https://www.reddit.com/r/buhaydigital/new.json",
    type: "social"
  },
  {
    name: "Reddit: VirtualAssistantPH",
    url: "https://www.reddit.com/r/VirtualAssistantPH/new.json",
    type: "social"
  },
  {
    name: "Reddit: RemoteWorkPH",
    url: "https://www.reddit.com/r/RemoteWorkPH/new.json",
    type: "social"
  }
];

export async function fetchGoldmineJobs(sourceName: string): Promise<GoldmineSignal[]> {
  const source = goldmineSources.find(s => s.name === sourceName);
  if (!source) return [];

  console.log(`[goldmines] Scouting ${sourceName}...`);
  
  try {
    const res = await fetch(source.url, {
      headers: { "User-Agent": "VA.INDEX/1.0 (Titanium SRE; ph-goldmines)" }
    });
    
    // NATIVE REDDIT HANDOR (JSON)
    if (source.type === 'social' && source.url.endsWith('.json')) {
        const data = await res.json();
        const posts = data.data?.children || [];
        return posts.map((p: any) => ({
            title: p.data.title,
            company: `Reddit: ${p.data.author}`,
            sourceUrl: `https://reddit.com${p.data.permalink}`,
            description: p.data.selftext?.slice(0, 500)
        })).slice(0, 15);
    }

    const html = await res.text();
    const $ = cheerio.load(html);
    const signals: GoldmineSignal[] = [];

    // GENERIC EXTRACTION
    $('a').each((_, el) => {
        const text = $(el).text().trim();
        const href = $(el).attr('href');
        
        // Anti-Pollution Gate: Reject HTML debris
        if (text.includes('<') || text.includes('{') || text.length < 10) return;

        const isJobLink = href && (
            href.includes('/job/') || 
            href.includes('/careers/') || 
            href.includes('/vacancy/') ||
            text.toLowerCase().includes('apply') ||
            text.toLowerCase().includes('virtual assistant') ||
            text.toLowerCase().includes('specialist')
        );

        if (isJobLink && text.length > 5 && href) {
            const absoluteUrl = href.startsWith('http') ? href : new URL(href, source.url).toString();
            signals.push({
                title: text,
                company: sourceName,
                sourceUrl: absoluteUrl
            });
        }
    });

    return signals.slice(0, 20); // Limit pulse to avoid noise
  } catch (err: any) {
    console.error(`[goldmines] Failed ${sourceName}: ${err.message}`);
    return [];
  }
}
