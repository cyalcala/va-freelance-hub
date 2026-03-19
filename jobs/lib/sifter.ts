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

const STRICT_KILLS = [
  "strictly us", "usa only", "us only", "americas only", "citizens only", 
  "uk only", "united kingdom only", "canada only", "europe only", "china only",
  "u.s. cities", "united states only", "us based", "usa based"
];

const REGIONAL_KILLS = [
  "beijing", "shanghai", "tokyo", "london", "paris", "berlin", "moscow", "riyadh",
  "dubai", "new york", "san francisco", "chicago", "hong kong", "singapore",
  "china", "europe", "emea", "latam", "portuguese", "spanish", "german", "french"
];

const REMOTE_SIGNALS = ["remote", "global", "worldwide", "anywhere", "work from home", "wfh"];

const GOLD_KEYWORDS = [
  "philippines", "filipino", "pinoy", "tagalog", "remote ph",
  "virtual assistant", "va", "data entry", "bookkeeping", "admin", "executive assistant"
];

const SENIOR_TECH_SIGNALS = [
  "senior", "lead", "principal", "staff engineer", "architect", "manager", "vp", "director", "head of cloud", "cloud alliances"
];

export function siftOpportunity(title: string, company: string, description: string, sourcePlatform?: string): OpportunityTier {
  const t = title.toLowerCase();
  const c = company.toLowerCase();
  const d = (description || "").toLowerCase();
  const s = (sourcePlatform || "").toLowerCase();
  const body = `${t} ${c} ${d} ${s}`;

  // 0. Hard Kill (Trash Tier)
  // A. Strict Kills (Exclusions override Remote)
  if (STRICT_KILLS.some(k => body.includes(k) && !body.includes("philippines"))) {
    return OpportunityTier.TRASH;
  }

  // B. Regional Kills (Spared by Remote)
  if (REGIONAL_KILLS.some(k => body.includes(k) && !body.includes("philippines") && !REMOTE_SIGNALS.some(r => body.includes(r)))) {
    return OpportunityTier.TRASH;
  }

  // Tech Harvesting check: High seniority title without PH context
  if (SENIOR_TECH_SIGNALS.some(s => t.includes(s)) && !body.includes("philippines")) {
    return OpportunityTier.TRASH;
  }

  // 1. GOLD TIER
  const prioritySources = ["reddit", "brave", "greenhouse", "lever", "upwork"];
  if (prioritySources.some(ps => s.includes(ps))) return OpportunityTier.GOLD;
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
