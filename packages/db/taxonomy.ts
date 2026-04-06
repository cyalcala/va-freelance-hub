/**
 * VA.INDEX — Titanium Taxonomy Engine v1.0 (V10 ALIGNED)
 * Functional Silos for the Organized Master Directory
 */

export enum JobDomain {
  TECH_ENGINEERING = "TECH_ENGINEERING",
  MARKETING = "MARKETING",
  SALES = "SALES",
  ADMIN_SUPPORT = "ADMIN_SUPPORT",
  CREATIVE_MULTIMEDIA = "CREATIVE_MULTIMEDIA",
  CUSTOMER_SERVICE = "CUSTOMER_SERVICE",
  GENERAL = "GENERAL",
}

export const JobDomainLabels: Record<JobDomain, string> = {
  [JobDomain.TECH_ENGINEERING]: "Tech & Engineering",
  [JobDomain.MARKETING]: "Marketing & Growth",
  [JobDomain.SALES]: "Sales & Business Dev",
  [JobDomain.ADMIN_SUPPORT]: "Admin & VA Support",
  [JobDomain.CREATIVE_MULTIMEDIA]: "Creative & Multimedia",
  [JobDomain.CUSTOMER_SERVICE]: "Customer Service & BPO",
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
    domain: JobDomain.ADMIN_SUPPORT,
    description: "The most accessible entry-point remote roles globally.",
    symbol: "📋",
    keywords: [
      "virtual assistant", " va ", "appointment setter", "scheduling", "inbox manager",
      "data entry", "administrative", "assistant", "personal assistant"
    ]
  },
  {
    domain: JobDomain.CUSTOMER_SERVICE,
    description: "Customer support, community management, and BPO operations.",
    symbol: "🎧",
    keywords: [
      "customer support", "customer service", "customer success", "client support",
      "support specialist", "support agent", "help desk", "live chat", "chat support",
      "community manager", "moderator", "csr", "call center", "voice", "non-voice",
      "backoffice", "telemarketing", "bpo"
    ]
  },
  {
    domain: JobDomain.CREATIVE_MULTIMEDIA,
    description: "Creative content, video editing, design, and multimedia.",
    symbol: "🎨",
    keywords: [
      "writer", "copywriter", "editor", "scriptwriter", "script writer", 
      "proofreader", "content manager", "content creator", "blogger", "newsletter",
      "designer", "ux", "ui", "graphic design", "animator", "motion graphics",
      "video editor", "reel editor", "brand designer", "logo designer", "canva",
      "photoshop", "illustrator", "creative director", "product design",
      "multimedia producer", "podcast editor", "shorts editor", "tiktok editor"
    ]
  },
  {
    domain: JobDomain.MARKETING,
    description: "Growth, advertising, and digital marketing strategies.",
    symbol: "📣",
    keywords: [
      "marketing", "ads specialist", "seo", "sem", "social media manager", 
      "digital marketing", "growth manager", "performance marketing"
    ]
  },
  {
    domain: JobDomain.SALES,
    description: "Revenue generation and business development.",
    symbol: "💰",
    keywords: [
       "sales", "account executive", "business development", " bdm ", " sdr ",
       "lead generation", "outreach"
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
  }
];

export function mapTitleToDomain(title: string, description: string = ""): JobDomain {
  const content = `${title} ${description}`.toLowerCase();
  
  if (content.includes("product design") || content.includes("ux researcher")) return JobDomain.CREATIVE_MULTIMEDIA;
  if (content.includes("customer service representative")) return JobDomain.CUSTOMER_SERVICE;
  if (content.includes("software engineer") || content.includes("developer")) return JobDomain.TECH_ENGINEERING;

  for (const mapping of DOMAIN_MANIFEST) {
    if (mapping.keywords.some(k => content.includes(k))) {
      return mapping.domain;
    }
  }

  return JobDomain.GENERAL;
}

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

export function getDomainSlug(domain: string): string {
  return domain
    .toLowerCase()
    .replace(/ & /g, '-')
    .replace(/ /g, '-')
    .replace(/_/g, '-')
    .replace(/[^\w-]/g, '');
}

export function getDomainBySlug(slug: string): JobDomain | null {
  for (const domain of Object.values(JobDomain)) {
    if (getDomainSlug(domain) === slug) {
      return domain as JobDomain;
    }
  }
  return null;
}
