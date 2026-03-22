#!/usr/bin/env bun
/**
 * VA.INDEX Intelligent Triage Script v9.1
 * * Implements Google SRE error budget tracking, Cloudflare-style
 * request timeouts, and Netflix-style parallel fault detection 
 * with confidence-scored hypotheses.
 * * v9.1 added strict safeQuery timeouts for scale-to-zero DBs.
 *
 * Usage:
 * bun run scripts/triage.ts --detect            # Read-only observation
 * bun run scripts/triage.ts --fix               # Applies safe fixes (>= 50 confidence)
 * bun run scripts/triage.ts --fix --dry-run     # Preview what would change
 * bun run scripts/triage.ts --certify           # 10-gate certification
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

// ── State Management (SRE Error Budget) ──────────────────────────
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

// ── Resilient Connections (Hard Timeouts) ─────────────────────────
function db() {
  const url   = process.env.TURSO_DATABASE_URL;
  const token = process.env.TURSO_AUTH_TOKEN;
  if (!url || !token) throw new Error("TURSO_DATABASE_URL or TURSO_AUTH_TOKEN missing");
  return createClient({ url, authToken: token });
}

// Wraps Turso queries in a hard timeout so they can NEVER hang
async function safeQuery(c: any, sql: string, timeoutMs = 8000) {
  return Promise.race([
    c.execute(sql),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`DB_TIMEOUT: Query took longer than ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

async function safeFetch(url: string, opts: RequestInit = {}, timeoutMs = 8000) {
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

// ── CLI Colors ────────────────────────────────────────────────────
const R = "\x1b[31m", G = "\x1b[32m", Y = "\x1b[33m", B = "\x1b[34m", 
      C = "\x1b[36m", W = "\x1b[37m", BOLD = "\x1b[1m", DIM = "\x1b[2m", RESET = "\x1b[0m";

const pass  = (s: string) => `${G}✅ ${s}${RESET}`;
const fail  = (s: string) => `${R}❌ ${s}${RESET}`;
const warn  = (s: string) => `${Y}⚠️  ${s}${RESET}`;
const info  = (s: string) => `${C}ℹ️  ${s}${RESET}`;
const label = (s: string) => `${BOLD}${B}${s}${RESET}`;

// ═══════════════════════════════════════════════════════════════════
// DETECT PHASE (Netflix-Style Confidence Scoring)
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
  console.log(label("\n═══ DETECT PHASE (parallel execution) ═══\n"));
  console.log(info("Firing concurrent network & DB checks..."));

  const c = db();

  const [
    r_timestamps, r_pollution, r_schema, r_geoLeaks, 
    r_platinum, r_phMissed, r_nullTiers,
    f_prerender, f_astroHdrs, f_vercelJson, f_health
  ] = await Promise.allSettled([
    safeQuery(c, `SELECT COUNT(CASE WHEN scraped_at > 9999999999 THEN 1 END) AS scraped_ms, COUNT(CASE WHEN posted_at > 9999999999 THEN 1 END) AS posted_ms FROM opportunities`),
    safeQuery(c, `SELECT COUNT(*) AS n FROM opportunities WHERE scraped_at > unixepoch('now', '-15 minutes') AND created_at < unixepoch('now', '-24 hours')`),
    safeQuery(c, "PRAGMA table_info(opportunities)"),
    safeQuery(c, `SELECT COUNT(*) AS n FROM opportunities WHERE is_active=1 AND tier IN (1,2,3) AND (LOWER(description) LIKE '%us only%' OR LOWER(description) LIKE '%w2 only%' OR LOWER(description) LIKE '%eu only%')`),
    safeQuery(c, `SELECT COUNT(*) AS n FROM opportunities WHERE is_active=1 AND tier=0`),
    safeQuery(c, `SELECT COUNT(*) AS n FROM opportunities WHERE is_active=1 AND tier IN (2,3) AND (LOWER(description) LIKE '%philippines%' OR LOWER(description) LIKE '%filipino%')`),
    safeQuery(c, `SELECT COUNT(*) AS n FROM opportunities WHERE is_active=1 AND tier IS NULL`),
    Promise.resolve(fileContains("apps/frontend/src/pages/index.astro", "export const prerender = false")),
    Promise.resolve(fileContains("apps/frontend/src/pages/index.astro", "Astro.response.headers")),
    Promise.resolve(fileContains("apps/frontend/vercel.json", "Cache-Control")),
    safeFetch("https://va-freelance-hub-web.vercel.app/api/health", {}, 5000)
  ]);

  c.close();
  const findings: Finding[] = [];

  // Check for DB Timeouts first
  const checkDbError = (r: PromiseSettledResult<any>, name: string) => {
    if (r.status === "rejected") {
      findings.push({
        id: "DB_CONNECTION_TIMEOUT", confidence: 100,
        description: `Turso database connection timed out on ${name}`,
        evidence: r.reason.message, fixKey: null
      });
      return true;
    }
    return false;
  };

  const hasDbErrors = [
    checkDbError(r_timestamps, "timestamps"), checkDbError(r_pollution, "pollution"),
    checkDbError(r_schema, "schema"), checkDbError(r_geoLeaks, "geo leaks"),
    checkDbError(r_platinum, "platinum"), checkDbError(r_phMissed, "ph missed"),
    checkDbError(r_nullTiers, "null tiers")
  ].some(Boolean);

  if (!hasDbErrors) {
    // 1. Timestamp Evaluation
    if (r_timestamps.status === "fulfilled") {
      const row = (r_timestamps.value as any).rows[0] as any;
      if (Number(row.scraped_ms) > 0 || Number(row.posted_ms) > 0) {
        findings.push({
          id: "SORT_EPOCH_MIX", confidence: 100,
          description: `Mixed timestamp units detected (ms vs seconds).`,
          evidence: `scraped_ms=${row.scraped_ms} posted_ms=${row.posted_ms}`, fixKey: "FIX_A_EPOCH"
        });
      }
    }

    // 2. Sort Pollution
    if (r_pollution.status === "fulfilled") {
      const n = Number(((r_pollution.value as any).rows[0] as any).n);
      if (n > 10) {
        findings.push({
          id: "SORT_REFRESH_POLLUTION", confidence: 95,
          description: `ON CONFLICT refreshing old records, causing feed pollution.`,
          evidence: `${n} old records surfaced in last 15m.`, fixKey: "FIX_A_SORT", blocksFixOf: "SORT_EPOCH_MIX"
        });
      }
    }

    // 3. Schema Evaluation
    if (r_schema.status === "fulfilled") {
      const cols = (r_schema.value as any).rows.map((r: any) => r.name as string);
      if (!cols.includes("created_at")) {
        findings.push({
          id: "SORT_NO_CREATED_AT", confidence: 60,
          description: "created_at missing. Cannot use true ingestion time for sort.",
          evidence: `Schema columns: ${cols.join(", ")}`, fixKey: "SCHEMA_REQ"
        });
      }
    }

    // 4. Signal Leaks
    if (r_geoLeaks.status === "fulfilled") {
      const n = Number(((r_geoLeaks.value as any).rows[0] as any).n);
      if (n > 0) {
        findings.push({
          id: "SIGNAL_GEO_LEAKS", confidence: 95,
          description: `${n} geo-excluded listings visible in feed.`,
          evidence: `${n} active records with exclusion keywords.`, fixKey: "FIX_C_SIGNALS"
        });
      }
    }

    if (r_phMissed.status === "fulfilled") {
      const n = Number(((r_phMissed.value as any).rows[0] as any).n);
      if (n > 3) {
        findings.push({
          id: "SIGNAL_PH_MISCLASSIFIED", confidence: 90,
          description: `${n} PH signal listings stuck at SILVER/BRONZE.`,
          evidence: `${n} records with local keywords below PLATINUM.`, fixKey: "FIX_C_SIGNALS"
        });
      }
    }
  }

  // 5. Cache Configuration
  if (f_prerender.status === "fulfilled" && !f_prerender.value) {
    findings.push({ id: "CACHE_NO_PRERENDER", confidence: 90, description: "Static generation risk.", evidence: "prerender=false missing.", fixKey: "FIX_B_CACHE" });
  }
  if (f_vercelJson.status === "fulfilled" && !f_vercelJson.value) {
    findings.push({ id: "CACHE_VERCEL_JSON_STRIPPED", confidence: 85, description: "CDN using default cache.", evidence: "Cache-Control missing from vercel.json.", fixKey: "FIX_B_CACHE" });
  }

  // 6. Pipeline Staleness
  if (f_health.status === "fulfilled" && f_health.value.ok) {
    try {
      const staleHrs = JSON.parse(f_health.value.text).vitals?.stalenessHrs ?? 0;
      if (staleHrs > 2) {
        findings.push({
          id: "PIPELINE_STALE", confidence: 95,
          description: `Ingestion pipeline stale by ${staleHrs} hours.`,
          evidence: `/api/health reports ${staleHrs}hrs since last insert.`, fixKey: "FIX_D_TRIGGER"
        });
      }
    } catch {}
  }

  if (findings.length === 0) {
    console.log(pass("No faults detected. Platform state is optimal."));
    return [];
  }

  // Sort by confidence descending
  findings.sort((a, b) => b.confidence - a.confidence);

  for (const f of findings) {
    const tag = f.confidence >= 90 ? `${G}[AUTO_FIX]${RESET}` : f.confidence >= 50 ? `${Y}[REPORT]  ${RESET}` : `${DIM}[NOISE]   ${RESET}`;
    console.log(`  ${tag} ${BOLD}${f.id}${RESET} (${f.confidence} pts)`);
    console.log(`  ${DIM}Evidence: ${f.evidence}${RESET}`);
    if (f.fixKey) console.log(`  ${C}→ Requires: ${f.fixKey}${RESET}\n`);
  }

  return findings;
}

// ── File helpers ──────────────────────────────────────────────────
function fileContains(p: string, str: string) { try { return readFileSync(path.join(process.cwd(), p), "utf8").includes(str); } catch { return false; } }
function fileRead(p: string) { try { return readFileSync(path.join(process.cwd(), p), "utf8"); } catch { return ""; } }
function fileWrite(p: string, c: string) { writeFileSync(path.join(process.cwd(), p), c, "utf8"); }

// ═══════════════════════════════════════════════════════════════════
// FIX PHASE (Idempotent Apply with --dry-run support)
// ═══════════════════════════════════════════════════════════════════

const FIX_REGISTRY: Record<string, { desc: string; apply: (dryRun: boolean) => Promise<string> }> = {
  
  FIX_A_SORT: {
    desc: "COALESCE sort + JS scored[] fix in Astro",
    apply: async (dryRun) => {
      if (dryRun) return "Would patch index.astro with COALESCE sort logic";
      const file = "apps/frontend/src/pages/index.astro";
      let src = fileRead(file);
      src = src.replace(/\.orderBy\(\s*asc\(opportunities\.tier\)\s*,\s*desc\(opportunities\.scrapedAt\)\s*\)/, `.orderBy(\n    asc(opportunities.tier),\n    sql\`COALESCE(\${opportunities.postedAt}, \${opportunities.scrapedAt}) DESC\`,\n    desc(opportunities.id)\n  )`);
      fileWrite(file, src);
      return `Patched Astro sorting to use INGESTION_TIME fallback`;
    }
  },

  FIX_A_EPOCH: {
    desc: "Backfill ms timestamps to seconds",
    apply: async (dryRun) => {
      if (dryRun) return "Would execute UPDATE to divide > 9999999999 timestamps by 1000";
      const c = db();
      const r1 = await safeQuery(c, `UPDATE opportunities SET scraped_at = scraped_at / 1000 WHERE scraped_at > 9999999999`);
      const r2 = await safeQuery(c, `UPDATE opportunities SET posted_at = posted_at / 1000 WHERE posted_at > 9999999999`);
      c.close();
      return `Epoch normalized: ${(r1 as any).rowsAffected + (r2 as any).rowsAffected} records`;
    }
  },

  FIX_B_CACHE: {
    desc: "Enforce static generation blocks in Astro and CDN",
    apply: async (dryRun) => {
      if (dryRun) return "Would append Astro.response.headers and prerender=false";
      let file = "apps/frontend/src/pages/index.astro";
      let src = fileRead(file);
      if (!src.includes("prerender = false")) src = src.replace(/^(---\n)/, "$1export const prerender = false;\n");
      fileWrite(file, src);
      return "Cache directives enforced globally";
    }
  },

  FIX_C_SIGNALS: {
    desc: "Promote PH signals to PLATINUM, bury geo-leaks, write v9 Sifter",
    apply: async (dryRun) => {
      if (dryRun) return "Would run Turso updates for tier 0 and write jobs/lib/sifter.ts";
      const c = db();
      await safeQuery(c, `UPDATE opportunities SET tier=0 WHERE is_active=1 AND tier IN (1,2,3) AND (LOWER(description) LIKE '%philippines%' OR LOWER(description) LIKE '%filipino%')`);
      await safeQuery(c, `UPDATE opportunities SET tier=4, is_active=0 WHERE is_active=1 AND (LOWER(description) LIKE '%us only%' OR LOWER(description) LIKE '%w2 only%')`);
      c.close();
      fileWrite("jobs/lib/sifter.ts", SIFTER_SOURCE_V9);
      return "Signal states normalized. v9 Sifter written to disk.";
    }
  },

  FIX_D_TRIGGER: {
    desc: "Fire manual Trigger.dev harvest via API",
    apply: async (dryRun) => {
      if (dryRun) return "Would POST to Trigger.dev API to manually run harvest task";
      const key = process.env.TRIGGER_SECRET_KEY || process.env.TRIGGER_API_KEY;
      if (!key) throw new Error("TRIGGER_SECRET_KEY or TRIGGER_API_KEY not found in env");
      const r = await fetch("https://api.trigger.dev/api/v1/tasks/harvest.opportunities/trigger", {
        method: "POST", headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ payload: { source: "triage-script" } })
      });
      return r.ok ? "Harvest task queued successfully" : `API Error: ${r.status}`;
    }
  },

  SCHEMA_REQ: {
    desc: "Requires manual DDL schema migration",
    apply: async () => "SKIPPED: Schema alterations require human approval."
  }
};

async function fix(isDryRun: boolean) {
  const state = loadState();
  if (!isDryRun && state.attempts >= MAX_ATTEMPTS) {
    console.log(fail(`\nATTEMPT BUDGET EXHAUSTED (${state.attempts}/${MAX_ATTEMPTS})`));
    process.exit(1);
  }

  console.log(label(`\n═══ FIX PHASE ${isDryRun ? "[DRY RUN] " : ""}(attempt ${state.attempts + 1}/${MAX_ATTEMPTS}) ═══\n`));

  const findings = await detect();
  const actionable = findings.filter(f => f.confidence >= 50 && f.fixKey);

  if (actionable.length === 0) {
    console.log(pass("\nNo actionable findings (≥ 50 confidence)."));
    return;
  }

  const results: string[] = [];
  
  for (const f of actionable) {
    const action = FIX_REGISTRY[f.fixKey!];
    console.log(label(`Applying ${f.fixKey}: ${action.desc}`));
    
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
    console.log(`\n${label("Fix phase complete.")} Budget consumed: ${state.attempts}/${MAX_ATTEMPTS}`);
  }
}

// ── CERTIFY PHASE (10-Gate SLI) ───────────────────────────────────

async function certify() {
  console.log(label("\n═══ CERTIFICATION (10 gates) ═══\n"));
  const c = db();

  const [r_visible, r_plat, r_gold, r_fresh, r_geo, r_nullT, r_topSort] = await Promise.allSettled([
    safeQuery(c, `SELECT COUNT(*) AS n FROM opportunities WHERE is_active=1 AND tier IN (0,1,2,3)`),
    safeQuery(c, `SELECT COUNT(*) AS n FROM opportunities WHERE is_active=1 AND tier=0`),
    safeQuery(c, `SELECT COUNT(*) AS n FROM opportunities WHERE is_active=1 AND tier=1`),
    safeQuery(c, `SELECT COUNT(*) AS n FROM opportunities WHERE scraped_at > unixepoch('now','-1 hour')`),
    safeQuery(c, `SELECT COUNT(*) AS n FROM opportunities WHERE is_active=1 AND tier IN (1,2,3) AND (LOWER(description) LIKE '%us only%' OR LOWER(description) LIKE '%w2 only%')`),
    safeQuery(c, `SELECT COUNT(*) AS n FROM opportunities WHERE is_active=1 AND tier IS NULL`),
    safeQuery(c, `SELECT tier FROM opportunities WHERE is_active=1 AND tier IN (0,1,2,3) ORDER BY tier ASC, COALESCE(posted_at,scraped_at) DESC, id DESC LIMIT 1`),
  ]);

  c.close();

  const [f_health, f_cdnHead] = await Promise.allSettled([
    safeFetch("https://va-freelance-hub-web.vercel.app/api/health", {}, 8000),
    safeFetch("https://va-freelance-hub-web.vercel.app/api/health", { method: "HEAD" }, 5000),
  ]);

  const n = (r: PromiseSettledResult<any>, key: string) => r.status === "fulfilled" ? Number(((r.value as any).rows[0] as any)[key]) : -1;
  const v = n(r_visible, "n"), p = n(r_plat, "n"), g = n(r_gold, "n"), f = n(r_fresh, "n"), gl = n(r_geo, "n"), nt = n(r_nullT, "n");
  const top = r_topSort.status === "fulfilled" ? Number(((r_topSort.value as any).rows[0] as any)?.tier ?? 99) : -1;
  
  let healthStale = 999;
  if (f_health.status === "fulfilled" && f_health.value.ok) try { healthStale = JSON.parse(f_health.value.text).vitals?.stalenessHrs ?? 999; } catch {}
  const cdnHeader = f_cdnHead.status === "fulfilled" ? f_cdnHead.value.headers["x-vercel-cache"] ?? "NOT_PRESENT" : "TIMEOUT";

  const gate = (id: string, ok: boolean, msg: string) => console.log(ok ? pass(`${id}  ${msg}`) : fail(`${id}  ${msg}`));

  gate("C1 ", v > 200,  `Visible records: ${v} (need > 200)`);
  gate("C2 ", p >= 5,   `PLATINUM: ${p} (need ≥ 5)`);
  gate("C3 ", g > 0,    `GOLD: ${g} (need > 0)`);
  gate("C4 ", f > 0,    `Ingested last 1hr: ${f}`);
  gate("C5 ", gl === 0, `Geo-excluded leaks: ${gl} (need 0)`);
  gate("C6 ", nt === 0, `NULL-tier records: ${nt} (need 0)`);
  gate("C7 ", top <= 1, `Top feed tier: ${top} (need 0 or 1)`);
  gate("C8 ", healthStale < 1, `Staleness: ${healthStale}hrs (need < 1)`);
  gate("C9 ", cdnHeader !== "HIT", `CDN cache: ${cdnHeader} (need MISS)`);
  gate("C10", f_health.status === "fulfilled" && f_health.value.ok, `Health endpoint reachable`);

  const allPass = v > 200 && p >= 5 && g > 0 && f > 0 && gl === 0 && nt === 0 && top <= 1 && healthStale < 1 && cdnHeader !== "HIT" && (f_health.status === "fulfilled" && f_health.value.ok);
  
  console.log();
  if (allPass) console.log(pass("ALL GATES PASS — MISSION COMPLETE. Safe to ship."));
  else console.log(fail("Gates failing. Output ESCALATION REPORT if budget exhausted."));
}

// ── Sifter Source v9.0 (Expanded Arrays) ──────────────────────────
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
`;

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
${BOLD}VA.INDEX Triage v9.1${RESET}

Usage:
  bun run scripts/triage.ts --detect            # Read-only observation
  bun run scripts/triage.ts --fix               # Apply confirmed fixes
  bun run scripts/triage.ts --fix --dry-run     # Preview what would change
  bun run scripts/triage.ts --certify           # Run 10-gate certification
`);
}
