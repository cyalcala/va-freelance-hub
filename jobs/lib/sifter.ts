/**
 * Intelligent Job Sifter (JS Version)
 * Categorizes and filters jobs before they reach the database.
 */

export enum OpportunityTier {
  GOLD = 1,      // PH-focused / High-Accessibility
  SILVER = 2,    // Global Remote / Entry
  BRONZE = 3,    // General
  TRASH = 4      // Regional-locked / Ultra-Senior Tech / Non-English
}

const KILL_KEYWORDS = [
  "portuguese", "spanish", "german", "french",
  "strictly us", "usa only", "us only", "americas only", "citizens only",
  "head of cloud", "cloud alliances", "vp of", "president", "director of engineering"
];

const GOLD_KEYWORDS = [
  "philippines", "filipino", "pinoy", "tagalog", "remote ph",
  "virtual assistant", "va", "data entry", "bookkeeping", "admin", "executive assistant"
];

const SENIOR_TECH_SIGNALS = [
  "senior", "lead", "principal", "staff engineer", "architect", "manager"
];

export function siftOpportunity(title: string, company: string, description: string): OpportunityTier {
  const t = title.toLowerCase();
  const c = company.toLowerCase();
  const d = (description || "").toLowerCase();
  const body = `${t} ${c} ${d}`;

  // 0. Hard Kill (Trash Tier)
  if (KILL_KEYWORDS.some(k => body.includes(k) && !body.includes("philippines") && !body.includes("english"))) {
    return OpportunityTier.TRASH;
  }

  // Tech Harvesting check: High seniority title without PH context
  if (SENIOR_TECH_SIGNALS.some(s => t.includes(s)) && !body.includes("philippines")) {
    return OpportunityTier.TRASH;
  }

  // 1. GOLD TIER
  if (GOLD_KEYWORDS.some(g => body.includes(g)) || t.includes("virtual assistant")) {
    return OpportunityTier.GOLD;
  }

  // 2. SILVER TIER
  const globalSignals = ["worldwide", "global", "anywhere", "remote"];
  const accessibilitySignals = ["assistant", "marketing", "social media", "support", "sales", "entry level", "no experience"];
  
  if (globalSignals.some(g => body.includes(g)) && accessibilitySignals.some(a => t.includes(a))) {
    return OpportunityTier.SILVER;
  }

  // 3. BRONZE TIER
  return OpportunityTier.BRONZE;
}
