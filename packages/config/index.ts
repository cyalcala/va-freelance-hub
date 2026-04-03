/**
 * 🧬 NICHE DNA CONFIGURATION
 * 
 * This file centralizes all the parameters that define a specific niche. 
 * By modifying this config, the same "Titanium" engine can power any niche
 * (e.g., PH VAs, Web3 Devs, LATAM Designers).
 */

export interface Source {
  id: string;
  name: string;
  url: string;
  platform: string;
  defaultJobType: string;
  tags: string[];
  ethical_note: string;
  is_json?: boolean;
  json_type?: "JobStreet" | "Indeed";
}

export interface NicheConfig {
  name: string;
  primary_region: string;
  primary_niche: string;
  
  // 🎯 TARGET SIGNALS: Positive patterns that identify this niche
  target_signals: {
    region: string[];
    role: string[];
    remote: string[];
  };

  // 🛡️ KILL LISTS: Negative patterns for the native Zig sifter
  kill_lists: {
    titles: string[];
    companies: string[];
    content: string[];
  };

  // 📡 DATA SOURCES
  rss_sources: Source[];
  json_sources: Source[];

  // 🛡️ EDGE SHIELD
  edge_proxy_url?: string;
  proxy_secret?: string;
}

export const defaultConfig: NicheConfig = {
  name: "VA Freelance Hub (Philippines)",
  primary_region: "Philippines",
  primary_niche: "Virtual Assistant",

  target_signals: {
    region: ["philippines", "filipino", "pinoy", "tagalog", "manila", "cebu", "ph", "sea", "southeast asia"],
    role: ["virtual assistant", "va", "data entry", "bookkeeping", "executive assistant", "admin assistant", "customer service", "customer support", "sales", "bdr", "sdr", "marketing", "seo", "social media", "copywriter", "video editor", "graphic designer", "moderator", "transcription", "translator", "operations", "clerk", "office", "administrative", "operations specialist", "hr assistant", "recruiter"],
    remote: ["remote", "global", "worldwide", "anywhere", "work from home", "wfh"]
  },

  kill_lists: {
    titles: [
      "ceo", "cto", "cfo", "cio", "coo", "vp", "vice president", "director", "president", "head of", "principal", "leadership", "executive", "staff", "researcher",
      "enterprise", "product manager", "project manager", "program manager", "division manager", "manager,", "manager -", "regional manager", "country manager",
      "engineer", "developer", "software", "devops", "sre", "data scientist", "programmer", "architect", "fullstack", "backend", "frontend", "coder", "systems", "tech", "technical", "coding", "javascript", "typescript", "python", "java", "react", "vue", "angular", "node", "aws", "cloud", "infrastructure", "cybersecurity", "security", "ai", "machine learning", "ml", "data science"
    ],
    companies: ["canonical", "gitlab", "google", "meta", "apple", "microsoft", "amazon"],
    content: [
      "beijing", "shanghai", "tokyo", "london", "paris", "berlin", "moscow", "riyadh", "dubai", "new york", "san francisco", "chicago", "hong kong", "singapore",
      "china", "europe", "emea", "latam", "portuguese", "spanish", "german", "french", "uk-only", "us-only", "emea-only",
      "dach", "nordics", "benelux", "japanese speaker", "french speaker", "german speaker", "spanish speaker",
      "success story", "how to", "reading this", "join us", "blog", "article", "news"
    ]
  },

  rss_sources: [
    {
      id: "himalayas",
      name: "Himalayas",
      url: "https://himalayas.app/jobs/rss",
      platform: "Himalayas",
      defaultJobType: "full-time",
      tags: ["remote", "global"],
      ethical_note: "Official public RSS feed provided by Himalayas for job syndication.",
    },
    {
      id: "we-work-remotely",
      name: "We Work Remotely",
      url: "https://weworkremotely.com/remote-jobs.rss",
      platform: "WeWorkRemotely",
      defaultJobType: "full-time",
      tags: ["remote", "global"],
      ethical_note: "Public RSS feed offered by WWR since 2013. Companies pay to post.",
    },
    {
      id: "remote-ok",
      name: "Remote OK",
      url: "https://remoteok.com/remote-jobs.rss",
      platform: "RemoteOK",
      defaultJobType: "full-time",
      tags: ["remote", "high-pay"],
      ethical_note: "Public RSS feed. RemoteOK openly provides this for syndication.",
    },
    {
      id: "problogger",
      name: "ProBlogger Jobs",
      url: "https://problogger.com/jobs/feed/",
      platform: "ProBlogger",
      defaultJobType: "freelance",
      tags: ["writing", "creative", "content"],
      ethical_note: "Public RSS job board feed. Companies pay to list writing/creative roles.",
    },
    {
      id: "jobspresso-support",
      name: "Jobspresso - Support",
      url: "https://jobspresso.co/category/marketing-customer-support/feed/",
      platform: "Jobspresso",
      defaultJobType: "VA",
      tags: ["customer support", "marketing", "va"],
      ethical_note: "Public RSS feed provided by Jobspresso for remote job syndication.",
    }
  ],

  json_sources: [
    {
      id: "jobstreet-ph-va",
      name: "JobStreet PH (Virtual Assistant)",
      url: "https://www.jobstreet.com.ph/api/chalice-search/v4/search?siteKey=PH-Main&where=Philippines&keywords=virtual+assistant",
      platform: "JobStreet",
      defaultJobType: "VA",
      tags: ["philippines", "va"],
      ethical_note: "Public JSON search endpoint used by the JobStreet/SEEK frontend.",
      is_json: true,
      json_type: "JobStreet",
    },
    {
      id: "jobstreet-ph-admin",
      name: "JobStreet PH (Admin)",
      url: "https://www.jobstreet.com.ph/api/chalice-search/v4/search?siteKey=PH-Main&where=Philippines&keywords=administrative",
      platform: "JobStreet",
      defaultJobType: "VA",
      tags: ["philippines", "admin"],
      ethical_note: "Public JSON search endpoint used by the JobStreet/SEEK frontend.",
      is_json: true,
      json_type: "JobStreet",
    }
  ],

  edge_proxy_url: process.env.EDGE_PROXY_URL || "https://va-edge-proxy.cyrusalcala-agency.workers.dev",
  proxy_secret: process.env.VA_PROXY_SECRET
};

export const config = defaultConfig; // In production, we can use a dynamic loader here
