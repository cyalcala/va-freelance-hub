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

const C_LEVEL_KILLS = [
  "ceo", "cto", "cfo", "cio", "coo", "vp", "vice president", "director", "president", "head of", "principal", "leadership", "executive"
];

const TECH_KILLS = [
  "engineer", "developer", "software", "devops", "sre", "data scientist", "programmer", "architect", "fullstack", "backend", "frontend", "coder", "systems", "tech", "technical", "coding", "javascript", "typescript", "python", "java", "react", "vue", "angular", "node", "aws", "cloud", "infrastructure", "cybersecurity", "security", "ai", "machine learning", "ml", "data science"
];

const REGIONAL_KILLS = [
  "beijing", "shanghai", "tokyo", "london", "paris", "berlin", "moscow", "riyadh",
  "dubai", "new york", "san francisco", "chicago", "hong kong", "singapore",
  "china", "europe", "emea", "latam", "portuguese", "spanish", "german", "french"
];

const SEA_SIGNALS = ["philippines", "filipino", "pinoy", "tagalog", "manila", "cebu", "ph", "sea", "southeast asia", "asean", "vietnam", "thailand", "indonesia", "malaysia", "singapore"];
const REMOTE_SIGNALS = ["remote", "global", "worldwide", "anywhere", "work from home", "wfh"];

export function siftOpportunity(title: string, company: string, description: string, sourcePlatform?: string): OpportunityTier {
  const t = title.toLowerCase();
  const c = company.toLowerCase();
  const d = (description || "").toLowerCase();
  const s = (sourcePlatform || "").toLowerCase();
  const body = `${t} ${c} ${d} ${s}`;

  // 1. Target Categories
  const vaSignals = ["virtual assistant", "va", "data entry", "bookkeeping", "executive assistant", "admin assistant", "assistant", "clerk", "receptionist", "transcription", "moderator"];
  const supportSignals = ["customer service", "customer support", "support specialist", "support agent", "help desk"];
  const salesSignals = ["sales", "bdr", "sdr", "account manager", "appointment setter", "lead generation", "business development"];
  const marketingSignals = ["marketing", "seo", "social media", "copywriter", "content creator", "growth", "strategist"];
  const designSignals = ["designer", "ui", "ux", "creative", "video editor", "graphic designer", "illustrator"];
  
  const isTargetCategory = [...vaSignals, ...supportSignals, ...salesSignals, ...marketingSignals, ...designSignals].some(sig => t.includes(sig));

  // 2. Hard Tech Kill
  if (TECH_KILLS.some(tk => t.includes(tk)) && !t.includes("support")) return OpportunityTier.TRASH;

  // 3. Absolute Leadership Kill (C-Suite/Global Exec)
  const cSuite = ["ceo", "cto", "vp", "vice president", "director", "president", "head of", "principal", "staff", "researcher"];
  if (cSuite.some(l => t.includes(l)) && !vaSignals.some(va => t.includes(va))) return OpportunityTier.TRASH;

  // 4. Regional Kill
  if (REGIONAL_KILLS.some(k => body.includes(k) && !SEA_SIGNALS.some(sea => body.includes(sea)) && !REMOTE_SIGNALS.some(r => body.includes(r)))) return OpportunityTier.TRASH;

  // 5. Tiering with Contextual Demotion
  const hasSeaSignal = SEA_SIGNALS.some(sea => body.includes(sea));
  const hasRemoteSignal = REMOTE_SIGNALS.some(r => body.includes(r));
  const phFocusedSource = ["reddit", "onlinejobs", "direct", "manual", "pinoy", "filipino"];
  const isPhContext = hasSeaSignal || phFocusedSource.some(src => s.includes(src));
  
  // Leadership prefixes in global corporate contexts are demoted to Tier 2
  const leadershipPrefix = ["senior", "manager", "lead", "specialist"];
  const isGlobalLeadership = leadershipPrefix.some(l => t.includes(l)) && !phFocusedSource.some(src => s.includes(src)) && !vaSignals.some(va => t.includes(va));

  if (isTargetCategory && (isPhContext || hasRemoteSignal)) {
    if (isGlobalLeadership) return OpportunityTier.SILVER;
    return isPhContext ? OpportunityTier.GOLD : OpportunityTier.SILVER;
  }

  return OpportunityTier.TRASH;
}



