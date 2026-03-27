/**
 * VA.INDEX Signal Sifter v10.0
 * Philippine-First Five-Tier Classification
 * Ruthless Indexing Engine
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
];

const TITLE_GEO_KILLS = [
  "united states", " u.s.", " us ", " usa ", "uk only", " u.k.", " canada", 
  " australia", " europe", " germany", " france", " netherlands", " sweden", 
  " norway", " denmark", " finland", " ireland", " switzerland", " austria", 
  " belgium", " spain", " italy", " portugal", " greece", " israel", 
  " north america", " south america", " emea", " apac only", " latam",
  "united kingdom", "london-based", "ny-based", "sf-based", "la-based",
  "atlanta-based", "chicago-based", "austin-based", "seattle-based",
];

const LANGUAGE_KILLS = [
  "japanese speaker","french speaker","german speaker","spanish speaker",
  "bilingual spanish","bilingual french","bilingual japanese","mandarin",
  "cantonese","korean speaker","portuguese speaker","italian speaker",
  "dutch speaker","scandinavian speaker","fluent in spanish","fluent in french",
  "kannada","telugu","tamil","hindi","bengali",
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
  "systems administrator"," programmer"," coder","scientist",
  "technical lead","tech lead","lead engineer","lead developer","architecture lead",
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
  "enterprise ","product manager","project manager","program manager","division manager",
  "manager,","manager -","regional manager","country manager",
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
  "vajobsph", "phcareers", "buhaydigital", "phjobs", "onlinejobs", "jobs.ph", "kalibrr",
  "virtualassistantph", "remoteworkph", "hiringph", "recruitinghiringph", "pinoyprogrammer", "bpoinph",
  "supportshepherd", "athena", "cloudstaff", "outsourceaccess", "remotemotivation"
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

export function siftOpportunity(
  title: string, 
  description: string, 
  company: string, 
  sourcePlatform: string,
  priorityAgencies: string[] = []
): OpportunityTier {
  const t  = (title || "").toLowerCase().trim();
  const d  = (description || "").toLowerCase();
  const c  = (company || "").toLowerCase().trim();
  const co = (company || "").toLowerCase();
  const sp = (sourcePlatform || "").toLowerCase();
  const body = `${t} ${d} ${c}`;

  // 0. PRE-FLIGHT: Absolute PH Intent Check
  const phKeywords = ["philippines", "filipino", "pinoy", "tagalog", "manila", "cebu", "ph", "sea", "southeast asia"];
  const hasDirectPHInTitle = phKeywords.some(k => t.includes(k));
  
  // 1. AGENCY PRIORITY (Titanium Sensor)
  const isPriorityAgency = priorityAgencies.some(a => co.includes(a.toLowerCase()) || sp.includes(a.toLowerCase()));
  if (isPriorityAgency) return OpportunityTier.PLATINUM;
  
  // 1. HARD KILLS - Highest Precedence
  // If it's a direct PH match in title, we might bypass some geo kills, but generally we want to be ruthless.
  
  if (!hasDirectPHInTitle) {
    for (const k of TITLE_GEO_KILLS) if (t.includes(k)) return OpportunityTier.TRASH;
  }
  
  for (const k of GEO_EXCLUSION_KILLS) if (body.includes(k)) return OpportunityTier.TRASH;
  for (const k of LANGUAGE_KILLS) if (t.includes(k)) return OpportunityTier.TRASH;
  
  // High-level Corporate Kills
  const CORP_KILLS = [
    "chief executive","chief technology","chief operating","chief financial",
    "chief marketing","chief people"," ceo"," cto"," coo"," cfo"," cmo",
    "vice president"," vp of"," svp"," evp","managing director",
    "director of ","head of ","senior director","associate director",
    "principal engineer","staff engineer",
    "revenue operations","business operations manager","strategy manager",
    "sales operations","enterprise customer success","enterprise account",
    "enterprise sales","enterprise support manager",
    "onlyfans","of chatter","chatter for onlyfans",
    "side hustle","earn money from home","student looking for",
  ];
  for (const k of CORP_KILLS) if (t.includes(k)) return OpportunityTier.TRASH;

  // 2. TECH KILLS (Unless allowlisted)
  for (const k of TECH_HARD_KILLS) if (t.includes(k) && !TECH_ALLOWLIST.some(o => t.includes(o))) return OpportunityTier.TRASH;
  for (const k of TECH_CONTEXT_KILLS) {
    if (t.includes(k) && !TECH_ALLOWLIST.some(o => t.includes(o))) return OpportunityTier.TRASH;
  }

  // 3. RUTHLESS COMPANY FILTERING
  const COMPANY_KILLS = ["canonical", "gitlab", "ge healthcare", "nextiva", "toptal", "upwork", "fiverr"];
  for (const k of COMPANY_KILLS) if (c.includes(k) && !hasDirectPHInTitle) return OpportunityTier.TRASH;

  // 4. MANAGER / SENIORITY / ENTERPRISE FILTERING
  const isElevationRole = SENIORITY_VA_EXCEPTIONS.some(e => t.includes(e));
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

  // Hard Kill: Enterprise / Regional / Director without PH signal
  if (t.includes("enterprise") || t.includes("regional") || t.includes("director") || t.includes("global head")) {
    if (!hasPHSignal) return OpportunityTier.TRASH;
  }

  // Manager / Senior / Lead Logic
  if (t.includes("manager") || SENIORITY_SOFT_KILLS.some(k => t.includes(k))) {
    const isCommonVAManager = ["social media manager", "community manager", "ads manager", "content manager"].some(m => t.includes(m));
    
    if (isElevationRole || isCommonVAManager) {
        if (t.includes("manager") && !hasPHSignal && !isCommonVAManager) return OpportunityTier.TRASH;
    } else {
        if (!hasPHSignal) return OpportunityTier.TRASH;
        if (t.includes("revenue operations") || t.includes("customer success manager") || t.includes("product manager")) {
             if (!body.includes("virtual assistant") && !body.includes(" va ")) return OpportunityTier.TRASH;
        }
    }
  }

  // 5. POSITIVE SIGNAL CHECK (Must be a VA role or have a PH Signal)
  const hasSpecificAchievableRole = isAchievableBaseRole || isElevationRole || isSupportRole;
  const hasGenericVARole = body.includes("virtual assistant") || body.includes(" va ");
  
  if (!hasSpecificAchievableRole && !hasGenericVARole && !hasPHSignal) {
     return OpportunityTier.TRASH;
  }

  // 6. TIERING
  const hasStrongPHSignal = hasDirectPHInTitle || 
                            PLATINUM_PLATFORMS.some(p => sp.includes(p)) ||
                            (t.includes("philippines") && (t.includes("only") || t.includes("based")));

  if (hasStrongPHSignal) return OpportunityTier.PLATINUM;
  
  // Weak signals (description only) get GOLD at best to prevent poisoning
  const hasWeakPHSignal = PLATINUM_DIRECT.some(s => body.includes(s)) || 
                          PLATINUM_CITIES.some(ci => body.includes(ci));
                          
  if (hasWeakPHSignal) return OpportunityTier.GOLD; 
  
  const isRegionalOrGlobalSupport = isSupportRole && (GOLD_SIGNALS.some(s => body.includes(s)) || SILVER_SIGNALS.some(s => body.includes(s)));
  if (isRegionalOrGlobalSupport) return OpportunityTier.GOLD;

  if (GOLD_SIGNALS.some(s => body.includes(s))) return OpportunityTier.GOLD;
  if (SILVER_SIGNALS.some(s => body.includes(s))) return OpportunityTier.SILVER;
  
  return OpportunityTier.BRONZE;
}
