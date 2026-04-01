/**
 * VA.INDEX — Titanium Taxonomy Engine v1.0
 * Functional Silos for the Organized Master Directory
 */

export enum JobDomain {
  VA_SUPPORT = "Virtual Assistants & Support",
  WRITING_CONTENT = "Copywriting & Editing",
  DESIGN_UX = "Design & UX",
  ADMIN_OPS = "Administrative & Operations",
  SALES_GROWTH = "Sales & Growth",
  SPECIALIZED = "Specialized Services",
  FINANCE_ACCOUNTS = "Finance & Accounting",
  AI_DATA = "AI & Data Ops",
  BPO_SERVICES = "BPO & Professional Services",
  GENERAL = "General Opportunities",
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
    domain: JobDomain.WRITING_CONTENT,
    description: "Content creation, blogging, and technical writing.",
    symbol: "✍️",
    keywords: [
      "writer", "copywriter", "editor", "scriptwriter", "script writer", 
      "proofreader", "technical writer", "content manager", "content creator",
      "blogger", "newsletter", "ghostwriter"
    ]
  },
  {
    domain: JobDomain.DESIGN_UX,
    description: "Visual design, UX/UI, and creative opportunities.",
    symbol: "🎨",
    keywords: [
      "designer", "ux", "ui", "graphic design", "animator", "motion graphics",
      "video editor", "reel editor", "brand designer", "logo designer", "canva",
      "photoshop", "illustrator", "creative director", "product design"
    ]
  },
  {
    domain: JobDomain.ADMIN_OPS,
    description: "Business operations, HR, and administrative backbone.",
    symbol: "🏢",
    keywords: [
      "office coordinator", "operations", "hr assistant", "recruiter", 
      "talent acquisition", "sourcing", "procurement", "administrative", 
      "executive assistant", " ea ", "personal assistant", "project coordinator",
      "property management"
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
    domain: JobDomain.FINANCE_ACCOUNTS,
    description: "Accounting, bookkeeping, and financial specialists.",
    symbol: "💰",
    keywords: [
      "accountant", "bookkeeper", "payroll", "invoice", "billing", 
      "accounts payable", "accounts receivable", "quickbooks", "xero", "finance"
    ]
  },
  {
    domain: JobDomain.SPECIALIZED,
    description: "Licensed and niche professionals (Medical, Legal, Research).",
    symbol: "⚖️",
    keywords: [
      "pharmacist", "pharmacy", "medical", "clinical", "legal", "lawyer",
      "veterinary", "research analyst", "vulnerability researcher", "compliance",
      "audit", "policy", "attorney"
    ]
  },
  {
    domain: JobDomain.AI_DATA,
    description: "AI training and data optimization signals.",
    symbol: "🧠",
    keywords: [
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
  if (content.includes("product design") || content.includes("ux researcher")) return JobDomain.DESIGN_UX;
  if (content.includes("vulnerability researcher") || content.includes("clinical research")) return JobDomain.SPECIALIZED;
  if (content.includes("account executive") || content.includes("sales director")) return JobDomain.SALES_GROWTH;
  if (content.includes("customer service representative")) return JobDomain.BPO_SERVICES;
  if (content.includes("ai training") || content.includes("ai trainer")) return JobDomain.AI_DATA;

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
