
/**
 * VA.INDEX Signal Sifter v9.0
 * Philippine-First Five-Tier Classification
 */

export enum OpportunityTier {
  PLATINUM = 0, GOLD = 1, SILVER = 2, BRONZE = 3, TRASH = 4
}

const GEO_EXCLUSION_KILLS = [
  "us only","us citizens only","usa only","united states only",
  "must be authorized to work in the us","us work authorization required",
  "must be based in the us","must reside in the us","must be a us resident",
  "must live in the us","us citizen or permanent resident",
  "w-2 employee","w2 only","w2 employee",
  "uk only","uk citizens only","must be based in the uk","must have right to work in the uk",
  "eu only","eu citizens only","eea only","must be based in europe",
  "emea only","emea-based","north america only",
  "canada only","must be in canada","australia only","must be in australia",
  "must have right to work in australia","new zealand only",
  "must be in new york","must be in california",
  "must be in london","must be in toronto",
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
  "blockchain developer","smart contract","embedded systems","firmware engineer",
  "computer vision","nlp engineer","quant developer","quantitative analyst",
  "systems administrator"," programmer"," coder",
];

const TECH_CONTEXT_KILLS = [" developer"," engineer"," architect"];

const TECH_ALLOWLIST = [
  "technical support","technical writer","technical recruiter",
  "no-code","prompt engineer","it support","help desk",
];

const SENIORITY_HARD_KILLS = [
  "chief executive","chief technology","chief operating","chief financial",
  "chief marketing","chief people"," ceo"," cto"," coo"," cfo"," cmo",
  "vice president"," vp of"," svp"," evp","general manager","managing director",
  "director of ","head of ","senior manager","senior director","associate director",
  "principal engineer","staff engineer","distinguished"," fellow","president of","partner at",
];

const SENIORITY_SOFT_KILLS = ["senior ","lead ","team lead","team manager"];

const SENIORITY_VA_EXCEPTIONS = [
  "senior va","lead va","senior virtual assistant","lead virtual assistant",
  "senior executive assistant","senior admin","senior administrative",
  "senior ea","senior customer support","senior copywriter",
  "senior content writer","senior bookkeeper","senior social media",
];

const ACHIEVABLE_ROLES = [
  "virtual assistant"," va ","admin assistant","administrative",
  "executive assistant"," ea ","personal assistant"," pa ",
  "office coordinator","operations coordinator","project coordinator",
  "scheduling coordinator","calendar manager","inbox manager","workflow coordinator",
  "customer support","customer service","customer success","client support",
  "support specialist","support representative","support agent",
  "help desk","live chat","chat support","community manager","community moderator","customer experience",
  "content writer","blog writer","copywriter","copy editor","proofreader",
  "editor","article writer","seo writer","content creator","newsletter writer",
  "email copywriter","scriptwriter","caption writer","product description writer","technical writer",
  "social media manager","social media coordinator","social media assistant","social media specialist",
  "digital marketing assistant","marketing coordinator","email marketing","content scheduler",
  "graphic designer","visual designer","brand designer","logo designer",
  "canva","presentation designer","infographic designer","video editor",
  "reel editor","photo editor","thumbnail designer","creative assistant",
  "bookkeeper","accounting assistant","accounts payable","accounts receivable",
  "invoice specialist","payroll assistant","financial assistant","billing coordinator",
  "quickbooks","xero","expense tracker",
  "data entry","research assistant","web researcher","market researcher",
  "data collector","list builder","prospect researcher","data annotator",
  "crm specialist","data cleaning",
  "sales support","sales coordinator","sales assistant","lead generation",
  "outreach assistant","appointment setter","cold email specialist","sales admin",
  "recruiter assistant","hr assistant","talent coordinator","sourcing assistant",
  "onboarding coordinator","people operations",
  "e-commerce assistant","amazon va","shopify va","etsy va","ebay va",
  "product lister","order processor","inventory assistant","listing specialist",
  "online tutor","english tutor","esl teacher","course assistant","lms coordinator",
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
  " qc","makati","bgc","bonifacio global city","taguig","pasig","mandaluyong",
  "antipolo","pampanga","angeles city","iloilo","cagayan de oro"," cdo",
  "bacolod","zamboanga","caloocan","valenzuela","paranaque",
];

const PLATINUM_PLATFORMS = [
  "vajobsph","phcareers","buhaydigital","phjobs","onlinejobs","jobs.ph","kalibrr",
];

const GOLD_SIGNALS = [
  "southeast asia","sea region","asean","asia pacific","apac",
  "asia-based","asia remote","gmt+8","pht","philippine time",
];

const SILVER_SIGNALS = [
  "fully remote","100% remote","remote-first","work from anywhere","worldwide",
  "global remote","all timezones","async-first","location independent",
  "distributed team","fully distributed","remote only","work from home anywhere",
];

export function siftOpportunity(title: string, description: string, sourcePlatform: string): OpportunityTier {
  const t  = (title || "").toLowerCase().trim();
  const d  = (description || "").toLowerCase();
  const sp = (sourcePlatform || "").toLowerCase();
  const body = `${t} ${d}`;

  for (const k of GEO_EXCLUSION_KILLS) if (body.includes(k)) return OpportunityTier.TRASH;
  for (const k of TECH_HARD_KILLS) if (t.includes(k) && !TECH_ALLOWLIST.some(o => t.includes(o))) return OpportunityTier.TRASH;
  for (const k of TECH_CONTEXT_KILLS) if (t.includes(k) && !TECH_ALLOWLIST.some(o => t.includes(o)) && !ACHIEVABLE_ROLES.some(r => t.includes(r))) return OpportunityTier.TRASH;
  for (const k of SENIORITY_HARD_KILLS) if (t.includes(k)) return OpportunityTier.TRASH;
  if (!ACHIEVABLE_ROLES.some(r => t.includes(r) || body.includes(r))) return OpportunityTier.TRASH;
  if (SENIORITY_SOFT_KILLS.some(k => t.includes(k)) && !SENIORITY_VA_EXCEPTIONS.some(e => t.includes(e))) return OpportunityTier.TRASH;
  
  if (PLATINUM_PLATFORMS.some(p => sp.includes(p)) || PLATINUM_DIRECT.some(s => body.includes(s)) || PLATINUM_CITIES.some(c => body.includes(c))) return OpportunityTier.PLATINUM;
  if (GOLD_SIGNALS.some(s => body.includes(s))) return OpportunityTier.GOLD;
  if (SILVER_SIGNALS.some(s => body.includes(s))) return OpportunityTier.SILVER;
  
  return OpportunityTier.BRONZE;
}
