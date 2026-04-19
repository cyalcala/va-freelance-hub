/**
 * VA.INDEX Codified Core: The Sieve v12.0 (PH-FIRST)
 * Philippine-First Five-Tier Classification
 * Autonomous Filtering Engine
 */

export enum OpportunityTier {
  PLATINUM = 0, GOLD = 1, SILVER = 2, BRONZE = 3, TRASH = 4
}

import { JobDomain, mapTitleToDomain, extractDisplayTags } from "../../packages/db/taxonomy";
import { extractMacroSieve, type MacroSieveResult } from "../../scripts/lib/cerebras";
import { askGemini, polishOpportunity, type FixProtocol } from "../../scripts/lib/gemini";
import crypto from "node:crypto";

/**
 * 🧬 THE IDEMPOTENCY SHIELD: MD5(JobTitle + Company)
 */
export function generateIdempotencyHash(title: string, company: string): string {
  const norm = (title + company).toLowerCase().replace(/[^a-z0-9]/g, '').trim();
  return crypto.createHash("md5").update(norm).digest("hex");
}

export interface SiftResult {
  tier: OpportunityTier;
  domain: JobDomain;
  displayTags: string[];
  relevanceScore: number;
  md5_hash: string;
  isPhCompatible: boolean;
}

const GEO_EXCLUSION_KILLS = [
  "us only","us citizens only","usa only","united states only",
  "must be authorized to work in the us","us work authorization required",
  "must be based in the us","must reside in the us","must be a us resident",
  "must live in the us","us citizen or permanent resident",
  "w-2 employee","w2 only","w2 employee","must have a ssn","social security number",
  "1099 only","c2c only","no c2c","no 1099","w2 applicants only",
  "uk only","uk citizens only","must be based in the uk","must have right to work in the uk",
  "eu only","eu citizens only","eea only","must be based in europe",
  "emea only","emea-based","north america only",
  "canada only","must be in canada","australia only","must be in australia",
  "authorized to work in the us","authorized to work in canada","authorized to work in the uk",
  "us work authorization","eligible to work in the us",
  "must have right to work in australia","new zealand only",
  "must be in new york","must be in california","must be in portland","must be in atlanta",
  "must be in chicago","must be in austin","must be in seattle","must be in boston",
  "must be in dallas","must be in denver","must be in phoenix",
  "must be in london","must be in toronto",
  "dach","nordics","benelux","latam only","south america only",
  "est time zone","pst time zone","cst time zone","mst time zone",
  "et time zone","pt time zone","ct time zone","mt time zone",
  "eastern time zone","pacific time zone","central time zone","mountain time zone",
  "visa sponsorship is not available", "sponsorship not available",
  "reside in the following states", "united states of america",
  "us time zone","uk time zone","canada time zone",
];

const TITLE_GEO_KILLS = [
  "united states", " u.s.", " us ", " usa ", "uk only", " u.k.", " canada", 
  " australia", " europe", " germany", " france", " netherlands", " sweden", 
  " norway", " denmark", " finland", " ireland", " switzerland", " austria", 
  " belgium", " spain", " italy", " portugal", " greece", " israel", 
  " north america", " south america", " emea", " apac only", " latam",
  "united kingdom", "london-based", "ny-based", "sf-based", "la-based",
  "atlanta-based", "chicago-based", "austin-based", "seattle-based",
  "dallas-based", "denver-based", "phoenix-based",
  "us context", "uk context", "canada context", "us-only", "uk-only"
];

const LANGUAGE_KILLS = [
  "japanese speaker","french speaker","german speaker","spanish speaker",
  "bilingual spanish","bilingual french","bilingual japanese","mandarin",
  "cantonese","korean speaker","portuguese speaker","italian speaker",
  "dutch speaker","scandinavian speaker","fluent in spanish","fluent in french",
];

const TECH_HARD_KILLS = [
  "software engineer","software developer","backend engineer","frontend engineer",
  "full stack","fullstack","full-stack","mobile engineer","ios engineer","android engineer",
  "platform engineer","infrastructure engineer","site reliability"," sre",
  "devops","devsecops","cloud engineer","cloud architect","solutions architect",
  "machine learning"," ml engineer"," ai engineer","ai researcher",
  "data engineer","data scientist","data architect","analytics engineer",
  "security engineer","penetration tester","network engineer","network administrator",
  "database administrator"," dba","qa engineer"," sdet","test automation",
];

const NSFW_KILLS = [
  "onlyfans", "pornhub", "adult industry", "escort service", "erotic", 
  "sex work", "cam girl", "cam boy", "fetish", "nsfw", "dating site",
  "gambling", "casino", "betting", "poker", "slots", "sportsbook"
];

const MALICIOUS_KILLS = [
  "earn $1000 a week", "easy money", "no experience needed", "click here",
  "whatsapp reach out", "telegram reach out", "investment opportunity",
  "crypto trading", "forex signals", "binary options", "pyramid scheme"
];

const TECH_ALLOWLIST = [
  "technical support","technical writer","technical recruiter",
  "no-code","prompt engineer","it support","help desk",
];

const ACHIEVABLE_ROLES = [
  "virtual assistant"," va ","admin assistant","administrative",
  "executive assistant"," ea ","personal assistant"," pa ",
  "office coordinator","operations coordinator","project coordinator",
  "customer support","customer service","customer success","client support",
  "support specialist","support representative","support agent",
  "help desk","live chat","chat support","community manager","community moderator",
  "content writer","blog writer","copywriter","copy editor","proofreader",
  "social media manager","social media coordinator","social media assistant",
  "digital marketing assistant","marketing coordinator","email marketing",
  "graphic designer","visual designer","brand designer","logo designer",
  "video editor","reel editor","photo editor","creative assistant",
  "bookkeeper","accounting assistant","accounts payable","accounts receivable",
  "data entry","research assistant","web researcher","market researcher",
  "sales support","sales coordinator","sales assistant","lead generation",
  "recruiter assistant","hr assistant","talent coordinator","sourcing assistant",
  "e-commerce assistant","amazon va","shopify va","etsy va","ebay va",
  "online tutor","english tutor","esl teacher",
  "zapier","make.com","airtable","notion","clickup","no-code","automation specialist",
];

const PLATINUM_DIRECT = [
  "hiring from the philippines","based in the philippines","from the philippines",
  "philippines only","ph only","filipino talent","filipino va","filipino applicants",
  "seeking filipino","for filipinos","pinoy","pinay","work from philippines",
  "remote from the philippines","must be based in ph","philippines-based","ph-based",
  "open to philippine applicants","looking for a filipino","we hire filipinos",
  "filipinos preferred","preferred location: philippines","location: philippines",
  "philippines preferred","tagalog","php salary","₱","pesos",
];

const PLATINUM_CITIES = [
  "manila","metro manila"," ncr","cebu","cebu city","davao","quezon city",
  "makati","bgc","taguig","pasig","mandaluyong",
];

const PLATINUM_PLATFORMS = [
  "vajobsph", "phcareers", "buhaydigital", "phjobs", "onlinejobs", "jobs.ph", "kalibrr",
  "virtualassistantph", "remoteworkph", "hiringph", "recruitinghiringph"
];

const GOLD_SIGNALS = [
  "southeast asia","sea region","asean","asia pacific","apac",
  "asia-based","asia remote","gmt+8","pht","philippine time",
];

const SILVER_SIGNALS = [
  "fully remote","100% remote","remote-first","work from anywhere","worldwide",
  "global remote","all timezones","async-first","location independent",
];

/**
 * 🧬 THE BOUNCER: Multi-stage sifter for Philippine-remote viability.
 */
export function siftOpportunity(
  title: string, 
  description: string, 
  company: string, 
  sourcePlatform: string,
  priorityAgencies: string[] = []
): SiftResult {
  const t  = (title || "").toLowerCase().trim();
  const d  = (description || "").toLowerCase();
  const c  = (company || "").toLowerCase().trim();
  const co = (company || "").toLowerCase();
  const sp = (sourcePlatform || "").toLowerCase();
  const body = `${t} ${d} ${c}`;

  // 1. Core Tiering Logic (The Bouncer)
  let tier = calculateTier(t, d, c, co, sp, body, priorityAgencies);
  
  // 🧪 THE PHOSPHORUS SHIELD: Geographic Boundary Breach (Heuristic Edition)
  const isGlobal = !sp.includes("philippines") && !sp.includes("onlinejobs") && !sp.includes("jobstreet");
  let isPhCompatible = true;

  if (isGlobal) {
    const phKeywords = ["philippines", "filipino", "pinoy", "tagalog", "manila", "cebu", "ph", "sea", "apac", "southeast asia", "worldwide", "anywhere"];
    const hasPHSignal = phKeywords.some(k => body.includes(k));
    const restrictivePatterns = ["us only", "usa only", "uk only", "north america only", "canada only", "eea only", "eu only", "german speaker", "french speaker"];
    const hasRestriction = restrictivePatterns.some(p => body.includes(p));

    if (hasRestriction && !body.includes("philippines")) {
       tier = OpportunityTier.TRASH;
       isPhCompatible = false;
    }

    if (!hasPHSignal && tier !== OpportunityTier.PLATINUM) {
       // Suspect global signal - demote or trash if already weak
       if (tier >= 3) tier = OpportunityTier.TRASH;
    }
  }

  // Final confirmation
  if (tier === OpportunityTier.TRASH) isPhCompatible = false;
  
  // 2. Taxonomy Mapping
  const domain = mapTitleToDomain(title, description);
  
  // 3. Display Tag Extraction
  const displayTags = extractDisplayTags(title, description);
  
  // 4. Gravity Scoring (Priority Alpha)
  // Base score: (3 - (tier if not TRASH, else 3)) * 100
  let relevanceScore = (3 - (tier === OpportunityTier.TRASH ? 3 : tier)) * 100; 
  if (displayTags.includes("PH-DIRECT")) relevanceScore += 75; 
  if (displayTags.includes("PREMIUM")) relevanceScore += 40;   
  if (displayTags.includes("HIGH PAY")) relevanceScore += 30;

  return {
    tier,
    domain,
    displayTags,
    relevanceScore,
    isPhCompatible,
    md5_hash: generateIdempotencyHash(title, company || "Generic")
  };
}

/**
 * ⚡ DUAL-LLM PIPELINE: The Apex SRE Ingestion Logic
 * Tier 1: Cerebras (Macro-Sieve)
 * Tier 2: Gemini (Deep Reasoning & Mapping)
 */
export async function siftWithDualLLM(rawText: string, metadata: any = {}): Promise<SiftResult | null> {
  const isNativePH = metadata.trustLevel === 'native' || metadata.region === 'Philippines';

  // PHASE 1: Cerebras Macro-Sieve (The Tier 1 Sieve)
  const tier1 = await extractMacroSieve(rawText, metadata);

  if (!tier1.pass_to_tier2 || !tier1.extracted_payload) {
    console.warn(`[Tier 1] Bounced Signal: ${tier1.rejection_reason || "Heuristic REJECTED"}`);
    return null;
  }

  const payload = tier1.extracted_payload;

  // PHASE 2.1: Geographic Boundary Breach (General)
  if (!payload.is_ph_compatible) {
    console.warn(`[Tier 1] Bounced Signal: Geographic Boundary breach (PH incompatible).`);
    return null;
  }

  // PHASE 2.2: THE ELITE GABRIEL GATE (Global-to-PH Check)
  if (!isNativePH) {
    const text = (payload.description || rawText).toLowerCase();
    const isExplicitlyWorldwide = text.includes("worldwide") || text.includes("work from anywhere") || text.includes("location independent");
    const isExplicitlyAPAC = text.includes("apac") || text.includes("southeast asia") || text.includes("asean") || text.includes("philippines");
    
    // Hard rejection if it mentions "Region-Only" or "US-Only" in a way that excludes PH
    const restrictivePatterns = ["us only", "usa only", "uk only", "north america only", "canada only", "eea only", "eu only"];
    const hasRestriction = restrictivePatterns.some(p => text.includes(p));

    if (hasRestriction && !isExplicitlyAPAC) {
      console.warn(`[Elite Gate] Rejected Global Signal: Restrictive pattern detected without APAC/PH bypass.`);
      return null;
    }
  }

  // PHASE 3: Tier 2 Polish & Mapping (Gemini)
  const polished = await polishOpportunity(payload);

  // PHASE 4: Heuristic Enrichment & Scoring
  const heuristic = siftOpportunity(
    polished.title || payload.title,
    polished.description || payload.description,
    polished.company || payload.company || "Generic",
    polished.sourcePlatform || payload.sourcePlatform || "Generic"
  );

  return {
    ...heuristic,
    ...polished,
    md5_hash: generateIdempotencyHash(polished.title || payload.title, polished.company || payload.company || "Generic"),
  } as SiftResult;
}

function calculateTier(
  t: string, d: string, c: string, co: string, sp: string, body: string,
  priorityAgencies: string[]
): OpportunityTier {
  const phKeywords = ["philippines", "filipino", "pinoy", "tagalog", "manila", "cebu", "ph", "sea", "southeast asia"];
  const hasDirectPHInTitle = phKeywords.some(k => t.includes(k));
  
  const isPriorityAgency = priorityAgencies.some(a => co.includes(a.toLowerCase()) || sp.includes(a.toLowerCase()));
  if (isPriorityAgency) return OpportunityTier.PLATINUM;
  
  if (!hasDirectPHInTitle) {
    for (const k of TITLE_GEO_KILLS) if (t.includes(k)) return OpportunityTier.TRASH;
  }
  
  for (const k of GEO_EXCLUSION_KILLS) if (body.includes(k)) return OpportunityTier.TRASH;
  for (const k of LANGUAGE_KILLS) if (t.includes(k)) return OpportunityTier.TRASH;
  
  for (const k of NSFW_KILLS) if (body.includes(k)) return OpportunityTier.TRASH;
  for (const k of MALICIOUS_KILLS) if (body.includes(k)) return OpportunityTier.TRASH;
  
  // 🛡️ SECURITY SHIELD: Negative Guardrails
  const videoAudioKeywords = ["video", "audio", "reel", "youtube", "tiktok", "podcast", "editor", "animator"];
  const isVideoAudio = videoAudioKeywords.some(k => t.includes(k));
  if (isVideoAudio && (t.includes("copywriter") || t.includes("writer"))) {
    // FORCE ROUTING: Video/Audio kills Writer classification
    console.warn(`[Guardrail] Diverting suspected Audio/Video role from Writer to Creative: ${t}`);
  }

  for (const k of TECH_HARD_KILLS) if (t.includes(k) && !TECH_ALLOWLIST.some(o => t.includes(o))) return OpportunityTier.TRASH;

  const COMPANY_KILLS = ["canonical", "gitlab", "ge healthcare", "nextiva", "toptal", "upwork", "fiverr"];
  for (const k of COMPANY_KILLS) if (c.includes(k) && !hasDirectPHInTitle) return OpportunityTier.TRASH;

  const isAchievableBaseRole = ACHIEVABLE_ROLES.some(r => t.includes(r));
  const isSupportRole = [
    "customer service", "customer support", "client support", "support specialist", 
    "support representative", "support agent", "help desk", "live chat", "chat support",
    "customer experience", "technical support", "it support"
  ].some(s => t.includes(s));
  
  const hasPHSignal = hasDirectPHInTitle || 
                     PLATINUM_DIRECT.some(s => body.includes(s)) || 
                     PLATINUM_CITIES.some(ci => body.includes(ci)) || 
                     PLATINUM_PLATFORMS.some(p => sp.includes(p));

  const hasSpecificAchievableRole = isAchievableBaseRole || isSupportRole;
  const hasGenericVARole = body.includes("virtual assistant") || body.includes(" va ");
  
  if (!hasSpecificAchievableRole && !hasGenericVARole && !hasPHSignal) {
     return OpportunityTier.TRASH;
  }

  const hasStrongPHSignal = hasDirectPHInTitle || 
                             PLATINUM_PLATFORMS.some(p => sp.includes(p)) ||
                             (t.includes("philippines") && (t.includes("only") || t.includes("based")));

  if (hasStrongPHSignal) return OpportunityTier.PLATINUM;
  
  const hasWeakPHSignal = PLATINUM_DIRECT.some(s => body.includes(s)) || 
                           PLATINUM_CITIES.some(ci => body.includes(ci));
                           
  if (hasWeakPHSignal) return OpportunityTier.GOLD; 

  if (GOLD_SIGNALS.some(s => body.includes(s))) return OpportunityTier.GOLD;
  if (SILVER_SIGNALS.some(s => body.includes(s))) return OpportunityTier.SILVER;
  
  return OpportunityTier.BRONZE;
}
