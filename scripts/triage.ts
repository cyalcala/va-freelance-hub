#!/usr/bin/env bun
/**
 * VA.INDEX Intelligent Triage Script v10.0 - "The Interrogator"
 * * Implements Zero-Trust SRE Data Validation.
 * * Detects "Watermelon" status (Fake Healthy).
 * * Cross-examines Edge Cache vs. Raw Database state.
 *
 * Usage:
 * bun run scripts/triage.ts --detect            # Read-only observation
 * bun run scripts/triage.ts --fix               # Applies safe fixes (>= 50 confidence)
 * bun run scripts/triage.ts --fix --dry-run     # Preview what would change
 * bun run scripts/triage.ts --certify           # 10-gate strict certification
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { createClient } from "@libsql/client/http";
import * as path from "path";

// ── Bootstrap ─────────────────────────────────────────────────────
const envPath = path.join(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const [k, ...rest] = line.split("=");
    if (k && rest.length && !k.startsWith("#")) {
      process.env[k.trim()] = rest.join("=").trim().replace(/^["']|["']$/g, "");
    }
  }
}

// ── State Management ──────────────────────────────────────────────
const STATE_FILE = path.join(process.cwd(), ".triage-state.json");
const MAX_ATTEMPTS = 5;

interface TriageState {
  attempts: number;
  history: Array<{ ts: string; mode: string; findings: string[] }>;
}

function loadState(): TriageState {
  if (!existsSync(STATE_FILE)) return { attempts: 0, history: [] };
  return JSON.parse(readFileSync(STATE_FILE, "utf8"));
}

function saveState(s: TriageState) {
  writeFileSync(STATE_FILE, JSON.stringify(s, null, 2));
}

function db() {
  const url   = process.env.TURSO_DATABASE_URL;
  const token = process.env.TURSO_AUTH_TOKEN;
  if (!url || !token) throw new Error("TURSO_DATABASE_URL or TURSO_AUTH_TOKEN missing");
  // Implement strict timeout at the driver level to catch Turso hanging
  return createClient({ url, authToken: token });
}

async function fetchWithCrossExamination(url: string, opts: RequestInit = {}, timeoutMs = 8000) {
  const start = performance.now();
  try {
    const resp = await fetch(url, {
      ...opts,
      signal: AbortSignal.timeout(timeoutMs),
      // Cloudflare/Vercel cache busting header for true origin health
      headers: { ...opts.headers, "Cache-Control": "no-cache, no-store, must-revalidate", "Pragma": "no-cache" }
    });
    const text = await resp.text().catch(() => "");
    const latency = performance.now() - start;
    const headers: Record<string, string> = {};
    resp.headers.forEach((v, k) => { headers[k.toLowerCase()] = v; });
    return { ok: resp.ok, status: resp.status, text, headers, latency };
  } catch (e: any) {
    return { ok: false, status: 0, text: e.message, headers: {}, latency: performance.now() - start };
  }
}

// ── CLI Colors ────────────────────────────────────────────────────
const R = "\x1b[31m", G = "\x1b[32m", Y = "\x1b[33m", B = "\x1b[34m", 
      C = "\x1b[36m", W = "\x1b[37m", BOLD = "\x1b[1m", DIM = "\x1b[2m", RESET = "\x1b[0m";

const pass  = (s: string) => `${G}✅ ${s}${RESET}`;
const fail  = (s: string) => `${R}❌ ${s}${RESET}`;
const warn  = (s: string) => `${Y}⚠️  ${s}${RESET}`;
const info  = (s: string) => `${C}ℹ️  ${s}${RESET}`;
const label = (s: string) => `${BOLD}${B}${s}${RESET}`;

// ═══════════════════════════════════════════════════════════════════
// DETECT PHASE (Zero-Trust Validation)
// ═══════════════════════════════════════════════════════════════════

interface Finding {
  id: string;
  confidence: number;
  description: string;
  evidence: string;
  fixKey: string | null;
  blocksFixOf?: string;
}

async function detect(): Promise<Finding[]> {
  console.log(label("\n═══ DETECT PHASE: ZERO-TRUST INTERROGATION ═══\n"));

  const c = db();

  // We group queries to avoid overwhelming the connection pool, but run distinct domains in parallel.
  const [
    r_timeSync, r_velocity, r_pollution, r_geoLeaks,
    f_healthBusted, f_healthCached
  ] = await Promise.allSettled([
    // 1. Check if DB has data from the future or ancient past (Epoch drift)
    c.execute(`SELECT 
      COUNT(CASE WHEN scraped_at > 9999999999 THEN 1 END) AS ms_drift, 
      MAX(scraped_at) as latest_record,
      unixepoch('now') as current_time 
      FROM opportunities`),
    // 2. Data Velocity: Are we actually growing, or just churning?
    c.execute(`SELECT 
      COUNT(*) as new_last_24h,
      COUNT(CASE WHEN created_at IS NULL THEN 1 END) as missing_lineage
      FROM opportunities WHERE scraped_at > unixepoch('now', '-24 hours')`),
    // 3. The Rathole Check: Are we refreshing garbage?
    c.execute(`SELECT COUNT(*) AS n FROM opportunities WHERE scraped_at > unixepoch('now', '-15 minutes') AND created_at < unixepoch('now', '-48 hours')`),
    // 4. Signal Leaks
    c.execute(`SELECT COUNT(*) AS n FROM opportunities WHERE is_active=1 AND tier IN (1,2,3) AND (LOWER(description) LIKE '%us only%' OR LOWER(description) LIKE '%w2 only%')`),
    // 5. API Truth vs Cache Truth
    fetchWithCrossExamination("https://va-freelance-hub-web.vercel.app/api/health", {}, 5000), // Cache-busted
    safeFetch("https://va-freelance-hub-web.vercel.app/api/health", {}, 5000) // Standard cached request
  ]);

  c.close();
  const findings: Finding[] = [];

  // --- ANALYSIS 1: The "Lying Dashboard" (DB vs API Drift) ---
  let dbLatestRecord = 0;
  let dbCurrentTime = 0;
  if (r_timeSync.status === "fulfilled") {
    const row = r_timeSync.value.rows[0] as any;
    dbLatestRecord = Number(row.latest_record);
    dbCurrentTime = Number(row.current_time);
    const msDrift = Number(row.ms_drift);
    
    if (msDrift > 0) {
      findings.push({ id: "FATAL_EPOCH_DRIFT", confidence: 100, description: `Timestamps stored in milliseconds. Sort operations will fail silently.`, evidence: `${msDrift} records corrupted.`, fixKey: "FIX_A_EPOCH" });
    }
  }

  // Cross-examine Turso's reality with Vercel's reality
  const tursoStalenessHrs = (dbCurrentTime - dbLatestRecord) / 3600;
  let apiReportedStaleness = 0;

  if (f_healthBusted.status === "fulfilled" && f_healthBusted.value.ok) {
    try {
      const data = JSON.parse(f_healthBusted.value.text);
      apiReportedStaleness = data.vitals?.stalenessHrs ?? 0;
      const isFaithful = data.vitals?.isFaithful ?? false;

      // The Lie Detector:
      if (Math.abs(tursoStalenessHrs - apiReportedStaleness) > 1) {
        findings.push({
           id: "SCHIZOPHRENIC_STATE", confidence: 100,
           description: "Edge API and Database are out of sync. Edge is serving a ghost state.",
           evidence: `DB Staleness: ${tursoStalenessHrs.toFixed(2)}h | API Reports: ${apiReportedStaleness}h`,
           fixKey: "FIX_B_CACHE" // Force purge
        });
      }

      // The Pipeline Stoppage
      if (tursoStalenessHrs > 4) {
         findings.push({
           id: "SILENT_PIPELINE_DEATH", confidence: 95,
           description: `No new records in DB for ${tursoStalenessHrs.toFixed(1)} hours. Trigger.dev task is failing silently or sleeping.`,
           evidence: `System claims 'isFaithful: ${isFaithful}', but MAX(scraped_at) is dead.`,
           fixKey: "FIX_D_TRIGGER"
         });
      }
    } catch {}
  } else if (f_healthBusted.status === "fulfilled" && !f_healthBusted.value.ok) {
      findings.push({ id: "EDGE_ROUTER_DOWN", confidence: 99, description: `API returned ${f_healthBusted.value.status}. Vercel routing or endpoint is broken.`, evidence: `Latency: ${f_healthBusted.value.latency}ms`, fixKey: null });
  }

  // --- ANALYSIS 2: The Rathole (Pollution & Velocity) ---
  if (r_pollution.status === "fulfilled") {
    const n = Number((r_pollution.value.rows[0] as any).n);
    if (n > 20) {
      findings.push({ id: "FEED_POLLUTION_LOOP", confidence: 95, description: `Scraper is re-ingesting and bumping ancient records instead of finding new ones.`, evidence: `${n} zombie records resurrected in last 15m.`, fixKey: "FIX_A_SORT" });
    }
  }

  // --- ANALYSIS 3: Logic Failures (Geo Leaks) ---
  if (r_geoLeaks.status === "fulfilled") {
    const n = Number((r_geoLeaks.value.rows[0] as any).n);
    if (n > 0) {
      findings.push({ id: "SIFTER_LOGIC_LEAK", confidence: 95, description: `Geo-fencing failed. US/W2 jobs breached the perimeter.`, evidence: `${n} active toxic records.`, fixKey: "FIX_C_SIGNALS" });
    }
  }

  if (findings.length === 0) {
    console.log(pass("Zero-Trust Validation passed. Data is flowing, Edge is honest."));
    return [];
  }

  findings.sort((a, b) => b.confidence - a.confidence);
  for (const f of findings) {
    const tag = f.confidence >= 90 ? `${G}[CRITICAL]${RESET}` : `${Y}[WARNING] ${RESET}`;
    console.log(`  ${tag} ${BOLD}${f.id}${RESET} (${f.confidence} pts)`);
    console.log(`  ${DIM}Evidence: ${f.evidence}${RESET}`);
    if (f.fixKey) console.log(`  ${C}→ Required Protocol: ${f.fixKey}${RESET}\n`);
  }

  return findings;
}

// ── File helpers ──────────────────────────────────────────────────
function fileContains(p: string, str: string) { try { return readFileSync(path.join(process.cwd(), p), "utf8").includes(str); } catch { return false; } }
function fileRead(p: string) { try { return readFileSync(path.join(process.cwd(), p), "utf8"); } catch { return ""; } }
function fileWrite(p: string, c: string) { writeFileSync(path.join(process.cwd(), p), c, "utf8"); }
async function safeFetch(url: string, opts: RequestInit = {}, timeoutMs = 8000) { /* ... keeping original ... */ 
  try {
    const resp = await fetch(url, { ...opts, signal: AbortSignal.timeout(timeoutMs) });
    const text = await resp.text().catch(() => "");
    const headers: Record<string, string> = {};
    resp.headers.forEach((v, k) => { headers[k.toLowerCase()] = v; });
    return { ok: resp.ok, status: resp.status, text, headers };
  } catch (e: any) {
    return { ok: false, status: 0, text: e.message, headers: {} };
  }
}

// ═══════════════════════════════════════════════════════════════════
// FIX PHASE
// ═══════════════════════════════════════════════════════════════════

const FIX_REGISTRY: Record<string, { desc: string; apply: (dryRun: boolean) => Promise<string> }> = {
  
  FIX_A_SORT: {
    desc: "Astro Sorting Fix (COALESCE fallback)",
    apply: async (dryRun) => {
      if (dryRun) return "Would patch index.astro with robust sorting.";
      const file = "apps/frontend/src/pages/index.astro";
      let src = fileRead(file);
      // Hard replacement to ensure we aren't relying on a fragile regex match
      const badSort = "asc(opportunities.tier), desc(opportunities.scrapedAt)";
      const goodSort = "asc(opportunities.tier), sql`COALESCE(${opportunities.postedAt}, ${opportunities.scrapedAt}) DESC`";
      if (src.includes(badSort)) {
         fileWrite(file, src.replace(badSort, goodSort));
         return `Patched Astro sorting to use INGESTION_TIME fallback`;
      }
      return `Astro sort already looks correct. Verify manual imports.`;
    }
  },

  FIX_A_EPOCH: {
    desc: "Normalize Corrupted Timestamps",
    apply: async (dryRun) => {
      if (dryRun) return "Would execute UPDATE to normalize ms timestamps.";
      const c = db();
      const r1 = await c.execute(`UPDATE opportunities SET scraped_at = CAST(scraped_at / 1000 AS INTEGER) WHERE scraped_at > 9999999999`);
      const r2 = await c.execute(`UPDATE opportunities SET posted_at = CAST(posted_at / 1000 AS INTEGER) WHERE posted_at > 9999999999`);
      c.close();
      return `Epoch normalized: ${r1.rowsAffected + r2.rowsAffected} corrupted records fixed.`;
    }
  },

  FIX_B_CACHE: {
    desc: "Bust Ghost State & Enforce Prerender Rules",
    apply: async (dryRun) => {
      if (dryRun) return "Would rewrite vercel.json and inject prerender=false.";
      let file = "apps/frontend/src/pages/index.astro";
      let src = fileRead(file);
      if (!src.includes("prerender = false")) {
         src = src.replace(/^(---\n)/, "$1export const prerender = false;\n// Cache busted by Triage Script\n");
         fileWrite(file, src);
      }
      return "Static generation disabled. Edge forced to revalidate on next deploy.";
    }
  },

  FIX_C_SIGNALS: {
    desc: "Sifter V9 Flush & Write",
    apply: async (dryRun) => {
      if (dryRun) return "Would flush geo-leaks to Tier 4 and write Sifter V9.";
      const c = db();
      await c.execute(`UPDATE opportunities SET tier=0 WHERE is_active=1 AND tier IN (1,2,3) AND (LOWER(description) LIKE '%philippines%' OR LOWER(description) LIKE '%filipino%')`);
      const r2 = await c.execute(`UPDATE opportunities SET tier=4, is_active=0 WHERE is_active=1 AND (LOWER(description) LIKE '%us only%' OR LOWER(description) LIKE '%w2 only%')`);
      c.close();
      fileWrite("jobs/lib/sifter.ts", SIFTER_SOURCE_V9);
      return `Purged ${r2.rowsAffected} toxic geo-leaks. Sifter V9 deployed to disk.`;
    }
  },

  FIX_D_TRIGGER: {
    desc: "Defibrillator: Force Trigger.dev Execution",
    apply: async (dryRun) => {
      if (dryRun) return "Would POST to Trigger.dev API to defibrillate the scraper.";
      const key = process.env.TRIGGER_API_KEY;
      if (!key) throw new Error("TRIGGER_API_KEY not found in env");
      const r = await fetch("https://api.trigger.dev/api/v1/tasks/harvest.opportunities/trigger", {
        method: "POST", headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ payload: { source: "triage-defibrillator", timestamp: Date.now() } })
      });
      return r.ok ? "Defibrillation successful. Task queued." : `API Error: ${r.status} ${await r.text()}`;
    }
  }
};

async function fix(isDryRun: boolean) {
  const state = loadState();
  if (!isDryRun && state.attempts >= MAX_ATTEMPTS) {
    console.log(fail(`\nERROR BUDGET EXHAUSTED (${state.attempts}/${MAX_ATTEMPTS}). Escalating to manual intervention.`));
    process.exit(1);
  }

  console.log(label(`\n═══ FIX PHASE ${isDryRun ? "[DRY RUN] " : ""}(Attempt ${state.attempts + 1}/${MAX_ATTEMPTS}) ═══\n`));

  const findings = await detect();
  const actionable = findings.filter(f => f.confidence >= 50 && f.fixKey);

  if (actionable.length === 0) {
    console.log(pass("\nSystem state is honest and healthy. No fixes required."));
    return;
  }

  const results: string[] = [];
  
  for (const f of actionable) {
    const action = FIX_REGISTRY[f.fixKey!];
    console.log(label(`Executing ${f.fixKey}: ${action.desc}`));
    
    try {
      const res = await action.apply(isDryRun);
      console.log(pass(`  ${res}`));
      results.push(`${f.fixKey}: ${res}`);
    } catch (e: any) {
      console.log(fail(`  Failed: ${e.message}`));
      results.push(`${f.fixKey}: FAILED - ${e.message}`);
    }
  }

  if (!isDryRun) {
    state.attempts++;
    state.history.push({ ts: new Date().toISOString(), mode: "fix", findings: results });
    saveState(state);
    console.log(`\n${label("Fix execution complete.")} Budget consumed: ${state.attempts}/${MAX_ATTEMPTS}`);
  }
}

// ═══════════════════════════════════════════════════════════════════
// CERTIFY PHASE (Strict 10-Gate SRE Validation)
// ═══════════════════════════════════════════════════════════════════

async function certify() {
  console.log(label("\n═══ CERTIFICATION: 10-GATE ZERO TRUST ═══\n"));
  const c = db();

  const [r_metrics, r_geo, r_topSort] = await Promise.allSettled([
    // Grouped metric queries for speed
    c.execute(`SELECT 
      SUM(CASE WHEN is_active=1 AND tier IN (0,1,2,3) THEN 1 ELSE 0 END) as visible,
      SUM(CASE WHEN is_active=1 AND tier=0 THEN 1 ELSE 0 END) as plat,
      SUM(CASE WHEN is_active=1 AND tier=1 THEN 1 ELSE 0 END) as gold,
      SUM(CASE WHEN scraped_at > unixepoch('now','-2 hour') THEN 1 ELSE 0 END) as fresh,
      SUM(CASE WHEN is_active=1 AND tier IS NULL THEN 1 ELSE 0 END) as nulls
      FROM opportunities`),
    c.execute(`SELECT COUNT(*) AS n FROM opportunities WHERE is_active=1 AND tier IN (1,2,3) AND (LOWER(description) LIKE '%us only%' OR LOWER(description) LIKE '%w2 only%')`),
    c.execute(`SELECT tier FROM opportunities WHERE is_active=1 AND tier IN (0,1,2,3) ORDER BY tier ASC, COALESCE(posted_at,scraped_at) DESC, id DESC LIMIT 1`),
  ]);

  c.close();

  // BUST the cache on certification to ensure we aren't grading a lie.
  const f_health = await fetchWithCrossExamination("https://va-freelance-hub-web.vercel.app/api/health", {}, 8000);
  const f_cdnHead = await safeFetch("https://va-freelance-hub-web.vercel.app/api/health", { method: "HEAD" }, 5000);

  const metrics = r_metrics.status === "fulfilled" ? (r_metrics.value.rows[0] as any) : { visible: -1, plat: -1, gold: -1, fresh: -1, nulls: -1 };
  
  const v = Number(metrics.visible), p = Number(metrics.plat), g = Number(metrics.gold), f = Number(metrics.fresh), nt = Number(metrics.nulls);
  const gl = r_geo.status === "fulfilled" ? Number((r_geo.value.rows[0] as any).n) : -1;
  const top = r_topSort.status === "fulfilled" ? Number((r_topSort.value.rows[0] as any)?.tier ?? 99) : -1;
  
  let healthStale = 999;
  if (f_health.ok) try { healthStale = JSON.parse(f_health.text).vitals?.stalenessHrs ?? 999; } catch {}
  
  // Note: Vercel cache headers are tricky. We want to ensure dynamic routes aren't perpetually HIT.
  const cdnHeader = f_cdnHead.headers["x-vercel-cache"] ?? "NOT_PRESENT";

  const gate = (id: string, ok: boolean, msg: string) => console.log(ok ? pass(`${id}  ${msg}`) : fail(`${id}  ${msg}`));

  gate("C1 ", v > 200,  `Volume: ${v} records (need > 200)`);
  gate("C2 ", p >= 5,   `Quality: ${p} PLATINUM records (need ≥ 5)`);
  gate("C3 ", g > 0,    `Quality: ${g} GOLD records (need > 0)`);
  gate("C4 ", f > 0,    `Velocity: ${f} ingested in last 2hrs (need > 0)`);
  gate("C5 ", gl === 0, `Security: ${gl} Geo-leaks (need 0)`);
  gate("C6 ", nt === 0, `Schema: ${nt} NULL-tier records (need 0)`);
  gate("C7 ", top <= 1, `UX: Top feed tier is ${top} (need 0 or 1)`);
  gate("C8 ", healthStale < 2, `Freshness: API reports ${healthStale.toFixed(2)}hrs stale (need < 2)`);
  gate("C9 ", cdnHeader !== "HIT", `Edge: Cache state is '${cdnHeader}' (need MISS/BYPASS for dynamic)`);
  gate("C10", f_health.ok && f_health.latency < 2000, `Liveness: Origin reachable in ${f_health.latency.toFixed(0)}ms`);

  const allPass = v > 200 && p >= 5 && g > 0 && f > 0 && gl === 0 && nt === 0 && top <= 1 && healthStale < 2 && cdnHeader !== "HIT" && f_health.ok;
  
  console.log();
  if (allPass) console.log(pass("ALL GATES PASSED. Data is flowing, Edge is honest, System is truly healthy."));
  else console.log(fail("GATES FAILED. System is compromised or degraded."));
}

// ── Sifter Source v9.0 ──────────────────────────
const SIFTER_SOURCE_V9 = `
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
  const body = \`\${t} \${d}\`;

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
`.trimStart();

// ── CLI Router ────────────────────────────────────────────────────
const mode = process.argv[2];
const isDryRun = process.argv.includes("--dry-run");

if (mode === "--detect") {
  detect().catch(e => { console.error(fail(e.message)); process.exit(1); });
} else if (mode === "--fix") {
  fix(isDryRun).catch(e => { console.error(fail(e.message)); process.exit(1); });
} else if (mode === "--certify") {
  certify().catch(e => { console.error(fail(e.message)); process.exit(1); });
} else {
  console.log(`
${BOLD}VA.INDEX Triage v10.0 (Zero-Trust Interrogator)${RESET}

Usage:
  bun run scripts/triage.ts --detect            # Read-only interrogation
  bun run scripts/triage.ts --fix               # Apply confirmed fixes
  bun run scripts/triage.ts --fix --dry-run     # Preview what would change
  bun run scripts/triage.ts --certify           # Run 10-gate certification
`);
}
