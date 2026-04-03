/**
 * VA.INDEX — Titanium Taxonomy Engine v1.0
 * Functional Silos for the Organized Master Directory
 */

export enum JobDomain {
  VA_SUPPORT = "VA_SUPPORT",
  BPO_SERVICES = "BPO_SERVICES",
  SALES_GROWTH = "SALES_GROWTH",
  TECH_ENGINEERING = "TECH_ENGINEERING",
  CREATIVE_MEDIA = "CREATIVE_MEDIA",
  SPECIALIZED_SERVICES = "SPECIALIZED_SERVICES",
  GENERAL = "GENERAL",
}

export const JobDomainLabels: Record<JobDomain, string> = {
  [JobDomain.VA_SUPPORT]: "Virtual Assistants & Support",
  [JobDomain.BPO_SERVICES]: "BPO & Professional Services",
  [JobDomain.SALES_GROWTH]: "Sales & Growth",
  [JobDomain.TECH_ENGINEERING]: "Tech & Engineering",
  [JobDomain.CREATIVE_MEDIA]: "Creative & Media",
  [JobDomain.SPECIALIZED_SERVICES]: "Specialized Services",
  [JobDomain.GENERAL]: "General Opportunities",
};

export function getDomainLabel(domain: JobDomain | string): string {
  return JobDomainLabels[domain as JobDomain] || domain;
}

export interface DomainMapping {
  domain: JobDomain;
  keywords: string[];
  description: string;
  symbol: string;
}

export const DOMAIN_MANIFEST: DomainMapping[] = [
  {
    domain: JobDomain.VA_SUPPORT,
    description: "The most accessible entry-point remote roles globally.",
    symbol: "🎧",
    keywords: [
      "virtual assistant", " va ", "customer support", "customer service", 
      "customer success", "client support", "support specialist", "support agent",
      "help desk", "live chat", "chat support", "community manager", "moderator",
      "appointment setter", "scheduling", "inbox manager"
    ]
  },
  {
    domain: JobDomain.CREATIVE_MEDIA,
    description: "Creative content, video editing, design, and copywriting.",
    symbol: "🎭",
    keywords: [
      "writer", "copywriter", "editor", "scriptwriter", "script writer", 
      "proofreader", "technical writer", "content manager", "content creator",
      "blogger", "newsletter", "ghostwriter",
      "designer", "ux", "ui", "graphic design", "animator", "motion graphics",
      "video editor", "reel editor", "brand designer", "logo designer", "canva",
      "photoshop", "illustrator", "creative director", "product design",
      "multimedia producer", "podcast editor", "shorts editor", "tiktok editor"
    ]
  },
  {
    domain: JobDomain.SALES_GROWTH,
    description: "Revenue generation and business development.",
    symbol: "📈",
    keywords: [
      "sales", "account executive", "business development", " bdm ", " sdr ",
      "lead generation", "outreach", "growth manager", "marketing", "ads specialist"
    ]
  },
  {
    domain: JobDomain.TECH_ENGINEERING,
    description: "Software engineering, DevOps, and technical infrastructure.",
    symbol: "⚙️",
    keywords: [
      "software engineer", "developer", "backend", "frontend", "fullstack",
      "devops", "cloud", "infrastructure", "site reliability", " sre ",
      "qa engineer", "mobile engineer", "ios engineer", "android engineer",
      "systems administrator", "database administrator", "security engineer",
      "platform engineer", "sre engineer", "ops engineer", "automation engineer"
    ]
  },
  {
    domain: JobDomain.SPECIALIZED_SERVICES,
    description: "Licensed professionals, medical, legal, and finance.",
    symbol: "⚖️",
    keywords: [
      "pharmacist", "pharmacy", "medical", "clinical", "legal", "lawyer",
      "veterinary", "research analyst", "vulnerability researcher", "compliance",
      "audit", "policy", "attorney",
      "accountant", "bookkeeper", "payroll", "invoice", "billing", 
      "accounts payable", "accounts receivable", "quickbooks", "xero", "finance",
      "ai trainer", "ai training", "data annotator", "data analyst", "video annotator",
      "labeling", "data entry", "dataset", "machine learning ops", "rlhf", "prompt tuning"
    ]
  },
  {
    domain: JobDomain.BPO_SERVICES,
    description: "Voice, backoffice, and scaled outsourcing roles.",
    symbol: "📞",
    keywords: [
      "csr", "call center", "voice", "non-voice", "backoffice", "blended",
      "telemarketing", "bpo", "customer service representative"
    ]
  }
];

/**
 * Maps a job title to its most relevant functional domain.
 */
export function mapTitleToDomain(title: string, description: string = ""): JobDomain {
  const content = `${title} ${description}`.toLowerCase();
  
  // High-priority exact matches or specific complex roles
  if (content.includes("product design") || content.includes("ux researcher")) return JobDomain.CREATIVE_MEDIA;
  if (content.includes("vulnerability researcher") || content.includes("clinical research")) return JobDomain.SPECIALIZED_SERVICES;
  if (content.includes("account executive") || content.includes("sales director")) return JobDomain.SALES_GROWTH;
  if (content.includes("customer service representative")) return JobDomain.BPO_SERVICES;
  if (content.includes("ai training") || content.includes("ai trainer")) return JobDomain.SPECIALIZED_SERVICES;

  for (const mapping of DOMAIN_MANIFEST) {
    if (mapping.keywords.some(k => content.includes(k))) {
      return mapping.domain;
    }
  }

  return JobDomain.GENERAL;
}

/**
 * Metadata Badging Logic (Workbound Style)
 * Extracts descriptive "Display Tags" from the content.
 */
export function extractDisplayTags(title: string, description: string): string[] {
  const content = `${title} ${description}`.toLowerCase();
  const badges: string[] = [];
  if (content.includes("philippines") || content.includes("tagalog")) badges.push("PH-DIRECT");
  if (content.includes("premium") || content.includes("titanium")) badges.push("PREMIUM");
  if (content.includes("$") || content.includes("₱") || content.includes("salary")) badges.push("HIGH PAY");
  if (content.includes("pht") || content.includes("gmt+8")) badges.push("PH-TIME");
  if (content.includes("fully remote") || content.includes("anywhere")) badges.push("GLOBAL");
  if (content.includes("urgent") || content.includes("immediately")) badges.push("URGENT");
  
  return [...new Set(badges)];
}

/**
 * Converts a JobDomain to a URL-friendly slug.
 */
export function getDomainSlug(domain: string): string {
  return domain
    .toLowerCase()
    .replace(/ & /g, '-')
    .replace(/ /g, '-')
    .replace(/_/g, '-')
    .replace(/[^\w-]/g, '');
}

/**
 * Reverse lookup for JobDomain by its slug.
 */
export function getDomainBySlug(slug: string): JobDomain | null {
  for (const domain of Object.values(JobDomain)) {
    if (getDomainSlug(domain) === slug) {
      return domain as JobDomain;
    }
  }
  return null;
}
