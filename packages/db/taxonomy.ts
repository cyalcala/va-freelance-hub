/**
 * VA.INDEX — Titanium Taxonomy Engine v1.0 (V10 ALIGNED)
 * Functional Silos for the Organized Master Directory
 */

export enum JobDomain {
  TECH_ENGINEERING = "TECH_ENGINEERING",
  MARKETING = "MARKETING",
  SALES_GROWTH = "SALES_GROWTH",
  VA_SUPPORT = "VA_SUPPORT",
  ADMIN_BACKOFFICE = "ADMIN_BACKOFFICE",
  CREATIVE_MULTIMEDIA = "CREATIVE_MULTIMEDIA",
  BPO_SERVICES = "BPO_SERVICES",
}

export const JobDomainLabels: Record<JobDomain, string> = {
  [JobDomain.TECH_ENGINEERING]: "Tech & Engineering",
  [JobDomain.MARKETING]: "Marketing & Growth",
  [JobDomain.SALES_GROWTH]: "Sales & Business Growth",
  [JobDomain.VA_SUPPORT]: "Virtual Assistant & Support",
  [JobDomain.ADMIN_BACKOFFICE]: "Admin & Backoffice",
  [JobDomain.CREATIVE_MULTIMEDIA]: "Creative & Multimedia",
  [JobDomain.BPO_SERVICES]: "BPO & Customer Service",
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
    description: "Multi-functional Virtual Assistants and general support roles.",
    symbol: "🤝",
    keywords: [
      "virtual assistant", " va ", "appointment setter", "scheduling", "inbox manager",
      "assistant", "personal assistant", "executive assistant"
    ]
  },
  {
    domain: JobDomain.ADMIN_BACKOFFICE,
    description: "Backoffice, accounting, CRM management, and invoicing.",
    symbol: "🏢",
    keywords: [
      "accounting", "bookkeeper", "bookkeeping", "invoice", "invoicing", "billing",
      "crm administrator", "crm manager", "data entry", "administrative", "backoffice",
      "reconcile", "tax specialist", "payroll"
    ]
  },
  {
    domain: JobDomain.BPO_SERVICES,
    description: "Customer support, community management, and BPO operations.",
    symbol: "🎧",
    keywords: [
      "customer support", "customer service", "customer success", "client support",
      "support specialist", "support agent", "help desk", "live chat", "chat support",
      "community manager", "moderator", "csr", "call center", "voice", "non-voice",
      "telemarketing", "bpo"
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
    domain: JobDomain.SALES_GROWTH,
    description: "Revenue generation and business development.",
    symbol: "💰",
    keywords: [
       "sales", "account executive", "business development", " bdm ", " sdr ",
       "lead generation", "outreach", "closer"
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
  if (content.includes("customer service representative")) return JobDomain.BPO_SERVICES;
  if (content.includes("software engineer") || content.includes("developer")) return JobDomain.TECH_ENGINEERING;
  if (content.includes("accountant") || content.includes("accounting") || content.includes("bookkeeper")) return JobDomain.ADMIN_BACKOFFICE;

  for (const mapping of DOMAIN_MANIFEST) {
    if (mapping.keywords.some(k => content.includes(k))) {
      return mapping.domain;
    }
  }

  return JobDomain.VA_SUPPORT;
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
