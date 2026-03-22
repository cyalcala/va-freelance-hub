#!/usr/bin/env bun
/**
 * VA.INDEX Intelligent Triage Script v10.0 (Lead SRE Edition)
 * * Implements Google SRE Pipeline Remediation & Error Budgets.
 * * Implements Netflix Graceful Degradation & Signal Decay.
 * * Implements Cloudflare Circuit Breakers for Upstream APIs.
 *
 * Usage:
 * bun run scripts/triage.ts --detect            # Diagnostic Run
 * bun run scripts/triage.ts --fix               # Active Problem-Solving Run
 * bun run scripts/triage.ts --certify           # 10-Gate SLI Certification
 * bun run scripts/triage.ts --reset             # Reset SRE Error Budget
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { createClient } from "@libsql/client/http";
import { execSync } from "child_process";
import * as path from "path";

// ── Bootstrap & Config ────────────────────────────────────────────
const envPath = path.join(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const [k, ...rest] = line.split("=");
    if (k && rest.length && !k.startsWith("#")) process.env[k.trim()] = rest.join("=").trim().replace(/^["']|["']$/g, "");
  }
}

const CONFIG = {
  DECAY_HRS: Number(process.env.TRIAGE_DECAY_HRS || 24),
  ZOMBIE_HRS: Number(process.env.TRIAGE_ZOMBIE_HRS || 48),
  STALE_CRITICAL_HRS: Number(process.env.TRIAGE_STALE_HRS || 3),
};

// ── State Management ──────────────────────────────────────────────
const STATE_FILE = path.join(process.cwd(), ".triage-state.json");
const MAX_ATTEMPTS = 5;

interface TriageState { attempts: number; history: Array<{ ts: string; mode: string; findings: string[] }>; }
function loadState(): TriageState {
  if (!existsSync(STATE_FILE)) return { attempts: 0, history: [] };
  return JSON.parse(readFileSync(STATE_FILE, "utf8"));
}
function saveState(s: TriageState) { writeFileSync(STATE_FILE, JSON.stringify(s, null, 2)); }

// ── Resilient Connections ─────────────────────────────────────────
function db() {
  const url = process.env.TURSO_DATABASE_URL, token = process.env.TURSO_AUTH_TOKEN;
  if (!url || !token) throw new Error("TURSO_DATABASE_URL or TURSO_AUTH_TOKEN missing");
  return createClient({ url, authToken: token });
}

async function safeQuery(c: any, sql: string, timeoutMs = 8000) {
  return Promise.race([
    c.execute(sql),
    new Promise((_, reject) => setTimeout(() => reject(new Error(`DB_TIMEOUT: ${timeoutMs}ms`)), timeoutMs))
  ]);
}

async function safeFetch(url: string, opts: RequestInit = {}, timeoutMs = 8000) {
  try {
    const resp = await fetch(url, { ...opts, signal: AbortSignal.timeout(timeoutMs) });
    const text = await resp.text().catch(() => "");
    const headers: Record<string, string> = {};
    resp.headers.forEach((v, k) => { headers[k.toLowerCase()] = v; });
    return { ok: resp.ok, status: resp.status, text, headers };
  } catch (e: any) { return { ok: false, status: 0, text: e.message, headers: {} }; }
}

// ── Auto-Deploy ───────────────────────────────────────────────────
function autoPushToGithub(results: string[]) {
  console.log(info("\nInitiating automatic GitHub deployment..."));
  try {
    const status = execSync("git status --porcelain").toString();
    if (!status) { console.log(warn("No file changes detected. DB-only fixes applied.")); return; }
    execSync("git add -A", { stdio: "pipe" });
    execSync(`git commit -m "fix(sre): autonomous platform remediation\\n\\n- ${results.join('\\n- ')}"`, { stdio: "pipe" });
    execSync("git push", { stdio: "pipe" });
    console.log(pass("Successfully pushed patches to GitHub! Pipeline triggered."));
  } catch (e: any) { console.log(fail(`Failed to auto-push: ${e.message}`)); }
}

// ── CLI Colors ────────────────────────────────────────────────────
const R = "\x1b[31m", G = "\x1b[32m", Y = "\x1b[33m", B = "\x1b[34m", C = "\x1b[36m", W = "\x1b[37m", BOLD = "\x1b[1m", DIM = "\x1b[2m", RESET = "\x1b[0m";
const pass = (s: string) => `${G}✅ ${s}${RESET}`, fail = (s: string) => `${R}❌ ${s}${RESET}`, warn = (s: string) => `${Y}⚠️  ${s}${RESET}`, info = (s: string) => `${C}ℹ️  ${s}${RESET}`, label = (s: string) => `${BOLD}${B}${s}${RESET}`;

// ═══════════════════════════════════════════════════════════════════
// DETECT PHASE (Observability & Telemetry)
// ═══════════════════════════════════════════════════════════════════

interface Finding { id: string; confidence: number; description: string; evidence: string; fixKey: string | null; blocksFixOf?: string; }

async function detect(): Promise<Finding[]> {
  console.log(label("\n═══ DETECT PHASE (SRE Telemetry) ═══\n"));
  const c = db();

  const [
    r_timestamps, r_pollution, r_schema, r_geoLeaks, 
    r_phMissed, r_dbStaleness, r_decay, r_zombies,
    f_prerender, f_vercelJson
  ] = await Promise.allSettled([
    safeQuery(c, `SELECT COUNT(CASE WHEN scraped_at > 9999999999 THEN 1 END) AS scraped_ms FROM opportunities`),
    safeQuery(c, `SELECT COUNT(*) AS n FROM opportunities WHERE scraped_at > unixepoch('now', '-15 minutes') AND created_at < unixepoch('now', '-24 hours')`),
    safeQuery(c, "PRAGMA table_info(opportunities)"),
    safeQuery(c, `SELECT COUNT(*) AS n FROM opportunities WHERE is_active=1 AND tier IN (1,2,3) AND (LOWER(description) LIKE '%us only%' OR LOWER(description) LIKE '%w2 only%')`),
    safeQuery(c, `SELECT COUNT(*) AS n FROM opportunities WHERE is_active=1 AND tier IN (2,3) AND (LOWER(description) LIKE '%philippines%' OR LOWER(description) LIKE '%filipino%')`),
    safeQuery(c, `SELECT (unixepoch('now') - MAX(scraped_at)) / 3600.0 AS stale_hrs FROM opportunities`),
    safeQuery(c, `SELECT COUNT(*) AS n FROM opportunities WHERE is_active=1 AND tier < 3 AND scraped_at < unixepoch('now', '-${CONFIG.DECAY_HRS} hours')`),
    safeQuery(c, `SELECT COUNT(*) AS n FROM opportunities WHERE is_active=1 AND scraped_at < unixepoch('now', '-${CONFIG.ZOMBIE_HRS} hours')`),
    Promise.resolve(fileContains("apps/frontend/src/pages/index.astro", "export const prerender = false")),
    Promise.resolve(fileContains("apps/frontend/vercel.json", "Cache-Control"))
  ]);

  c.close();
  const findings: Finding[] = [];

  const handleDbError = (r: PromiseSettledResult<any>, name: string) => {
    if (r.status === "rejected") { findings.push({ id: "DB_CONNECTION_TIMEOUT", confidence: 100, description: `Turso timeout on ${name}`, evidence: r.reason.message, fixKey: null }); return true; }
    return false;
  };

  const hasDbErrors = [handleDbError(r_timestamps, "ts"), handleDbError(r_dbStaleness, "staleness"), handleDbError(r_zombies, "zombies")].some(Boolean);

  if (!hasDbErrors) {
    if (r_timestamps.status === "fulfilled" && Number((r_timestamps.value.rows[0] as any).scraped_ms) > 0) {
      findings.push({ id: "SORT_EPOCH_MIX", confidence: 100, description: `Mixed timestamp units.`, evidence: `Presence of ms timestamps`, fixKey: "FIX_A_EPOCH" });
    }
    if (r_pollution.status === "fulfilled" && Number((r_pollution.value.rows[0] as any).n) > 10) {
      findings.push({ id: "SORT_REFRESH_POLLUTION", confidence: 95, description: `Sort pollution.`, evidence: `Old records refreshing.`, fixKey: "FIX_A_SORT", blocksFixOf: "SORT_EPOCH_MIX" });
    }
    if (r_geoLeaks.status === "fulfilled" && Number((r_geoLeaks.value.rows[0] as any).n) > 0) {
      findings.push({ id: "SIGNAL_GEO_LEAKS", confidence: 95, description: `Geo-excluded leaks.`, evidence: `Active records with US-only logic.`, fixKey: "FIX_C_SIGNALS" });
    }
    
    // SRE: Staleness Pipeline Detection
    if (r_dbStaleness.status === "fulfilled") {
      const hrs = Number((r_dbStaleness.value.rows[0] as any).stale_hrs || 0);
      if (hrs > CONFIG.STALE_CRITICAL_HRS) findings.push({ id: "PIPELINE_STALL_CRITICAL", confidence: hrs > 12 ? 100 : 85, description: `Upstream stall.`, evidence: `MAX(scraped_at) is ${hrs.toFixed(1)}hrs old.`, fixKey: "FIX_D_STALENESS_RECOVERY" });
    }
    
    // SRE: Graceful Degradation & Zombie Detection
    if (r_zombies.status === "fulfilled" && Number((r_zombies.value.rows[0] as any).n) > 0) {
      findings.push({ id: "SLO_VIOLATION_ZOMBIES", confidence: 95, description: `Zombie listings violating freshness SLO.`, evidence: `Records active but unscraped > ${CONFIG.ZOMBIE_HRS}hrs.`, fixKey: "FIX_E_DECAY_AND_PRUNE" });
    } else if (r_decay.status === "fulfilled" && Number((r_decay.value.rows[0] as any).n) > 0) {
      const n = Number((r_decay.value.rows[0] as any).n);
      findings.push({ id: "FEED_DEGRADATION_REQ", confidence: 80, description: `Aging top-tier records require decay.`, evidence: `${n} records > ${CONFIG.DECAY_HRS}hrs old holding top tier positions.`, fixKey: "FIX_E_DECAY_AND_PRUNE" });
    }
  }

  if (f_prerender.status === "fulfilled" && !f_prerender.value) findings.push({ id: "CACHE_NO_PRERENDER", confidence: 90, description: "Static generation risk.", evidence: "prerender=false missing.", fixKey: "FIX_B_CACHE" });

  if (findings.length === 0) { console.log(pass("Telemetry Green. Platform state is optimal.")); return []; }

  findings.sort((a, b) => b.confidence - a.confidence);
  for (const f of findings) {
    const tag = f.confidence >= 90 ? `${G}[AUTO_FIX]${RESET}` : f.confidence >= 50 ? `${Y}[REPORT]  ${RESET}` : `${DIM}[NOISE]   ${RESET}`;
    console.log(`  ${tag} ${BOLD}${f.id}${RESET} (${f.confidence} pts)\n  ${DIM}Evidence: ${f.evidence}${RESET}`);
    if (f.fixKey) console.log(`  ${C}→ Handler: ${f.fixKey}${RESET}\n`);
  }

  return findings;
}

// ── File helpers ──────────────────────────────────────────────────
function fileContains(p: string, str: string) { try { return readFileSync(path.join(process.cwd(), p), "utf8").includes(str); } catch { return false; } }
function fileRead(p: string) { try { return readFileSync(path.join(process.cwd(), p), "utf8"); } catch { return ""; } }
function fileWrite(p: string, c: string) { writeFileSync(path.join(process.cwd(), p), c, "utf8"); }

// ═══════════════════════════════════════════════════════════════════
// FIX PHASE (Active Remediation)
// ═══════════════════════════════════════════════════════════════════

const FIX_REGISTRY: Record<string, { desc: string; apply: (dryRun: boolean) => Promise<string> }> = {
  FIX_A_SORT: {
    desc: "COALESCE sort logic in Astro",
    apply: async (dryRun) => {
      if (dryRun) return "Would patch index.astro";
      let src = fileRead("apps/frontend/src/pages/index.astro");
      src = src.replace(/\.orderBy\(\s*asc\(opportunities\.tier\)\s*,\s*desc\(opportunities\.scrapedAt\)\s*\)/, `.orderBy(\n    asc(opportunities.tier),\n    sql\`COALESCE(\${opportunities.postedAt}, \${opportunities.scrapedAt}) DESC\`,\n    desc(opportunities.id)\n  )`);
      fileWrite("apps/frontend/src/pages/index.astro", src); return `Patched Astro sorting algorithm`;
    }
  },
  FIX_A_EPOCH: {
    desc: "Normalize ms timestamps to seconds",
    apply: async (dryRun) => {
      if (dryRun) return "Would UPDATE > 9999999999 timestamps";
      const c = db();
      const r1 = await safeQuery(c, `UPDATE opportunities SET scraped_at = scraped_at / 1000 WHERE scraped_at > 9999999999`);
      c.close(); return `Epoch normalized: ${(r1 as any).rowsAffected} records`;
    }
  },
  FIX_B_CACHE: {
    desc: "Enforce dynamic Astro cache control",
    apply: async (dryRun) => {
      if (dryRun) return "Would append prerender=false";
      let src = fileRead("apps/frontend/src/pages/index.astro");
      if (!src.includes("prerender = false")) fileWrite("apps/frontend/src/pages/index.astro", src.replace(/^(---\n)/, "$1export const prerender = false;\n"));
      return "Cache directives enforced";
    }
  },
  FIX_C_SIGNALS: {
    desc: "Normalize signal tiers and bury leaks",
    apply: async (dryRun) => {
      if (dryRun) return "Would execute Tier normalizations";
      const c = db();
      await safeQuery(c, `UPDATE opportunities SET tier=0 WHERE is_active=1 AND tier IN (1,2,3) AND (LOWER(description) LIKE '%philippines%' OR LOWER(description) LIKE '%filipino%')`);
      await safeQuery(c, `UPDATE opportunities SET tier=4, is_active=0 WHERE is_active=1 AND (LOWER(description) LIKE '%us only%' OR LOWER(description) LIKE '%w2 only%')`);
      c.close(); return "Signal logic aligned in database.";
    }
  },
  
  // v10.0 SRE Staleness Recovery Pipeline
  FIX_D_STALENESS_RECOVERY: {
    desc: "SRE Recovery: DB Circuit Check -> Trigger.dev Deep Catchup",
    apply: async (dryRun) => {
      if (dryRun) return "Would verify DB write-state and POST to Trigger.dev with 'sre-catchup' payload";
      
      const c = db();
      // Circuit Breaker: Test write latency/availability before hammering upstream
      try {
         await safeQuery(c, `CREATE TABLE IF NOT EXISTS _sre_heartbeat (last_check INTEGER)`);
         await safeQuery(c, `INSERT INTO _sre_heartbeat VALUES (unixepoch('now'))`);
      } catch (e: any) {
         c.close();
         throw new Error(`CIRCUIT OPEN: Turso database write-check failed. Aborting upstream scrape to prevent cascade. (${e.message})`);
      }
      c.close();

      const key = process.env.TRIGGER_API_KEY; if (!key) throw new Error("TRIGGER_API_KEY missing");
      const r = await fetch("https://api.trigger.dev/api/v1/tasks/harvest.opportunities/trigger", { 
        method: "POST", headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" }, 
        body: JSON.stringify({ payload: { source: "sre-triage-script", mode: "catchup", priority: "critical" } }) 
      });
      return r.ok ? "DB Write Verified. Catchup harvest payload queued upstream." : `Upstream API Failure: ${r.status}`;
    }
  },

  // v10.0 Graceful Degradation & Pruning
  FIX_E_DECAY_AND_PRUNE: {
    desc: `Degrade ${CONFIG.DECAY_HRS}hr records to BRONZE, Prune ${CONFIG.ZOMBIE_HRS}hr zombies`,
    apply: async (dryRun) => {
      if (dryRun) return "Would UPDATE tiers to 3 for aging records, and is_active=0 for zombies";
      const c = db();
      // Step 1: Graceful Degradation (Decay aging gold/plat to bronze)
      const r_decay = await safeQuery(c, `UPDATE opportunities SET tier=3 WHERE is_active=1 AND tier < 3 AND scraped_at < unixepoch('now', '-${CONFIG.DECAY_HRS} hours')`);
      // Step 2: Hard Prune (Kill the true zombies)
      const r_kill = await safeQuery(c, `UPDATE opportunities SET is_active=0 WHERE is_active=1 AND scraped_at < unixepoch('now', '-${CONFIG.ZOMBIE_HRS} hours')`);
      c.close(); 
      return `Degraded ${(r_decay as any).rowsAffected} aging records. Pruned ${(r_kill as any).rowsAffected} zombies. Feed topology optimized.`;
    }
  }
};

async function fix(isDryRun: boolean) {
  const state = loadState();
  if (!isDryRun && state.attempts >= MAX_ATTEMPTS) {
    console.log(fail(`\nERROR BUDGET EXHAUSTED (${state.attempts}/${MAX_ATTEMPTS}). Triage locked to prevent cascade. Manual intervention required.`)); 
    process.exit(1);
  }

  console.log(label(`\n═══ REMEDIATION PHASE ${isDryRun ? "[DRY RUN] " : ""}(attempt ${state.attempts + 1}/${MAX_ATTEMPTS}) ═══\n`));
  const findings = await detect();
  const actionable = findings.filter(f => f.confidence >= 50 && f.fixKey);

  if (actionable.length === 0) { console.log(pass("\nNo actionable findings.")); return; }

  const results: string[] = [];
  for (const f of actionable) {
    const action = FIX_REGISTRY[f.fixKey!];
    console.log(label(`Executing ${f.fixKey}: ${action.desc}`));
    try {
      const res = await action.apply(isDryRun);
      console.log(pass(`  ${res}`)); results.push(`${f.fixKey}: ${res}`);
    } catch (e: any) {
      console.log(fail(`  Failed: ${e.message}`)); results.push(`${f.fixKey}: FAILED - ${e.message}`);
    }
  }

  if (!isDryRun && results.length > 0) {
    state.attempts++;
    state.history.push({ ts: new Date().toISOString(), mode: "fix", findings: results });
    saveState(state);
    console.log(`\n${label("Remediation complete.")} Budget consumed: ${state.attempts}/${MAX_ATTEMPTS}`);
    autoPushToGithub(results);
  }
}

// ═══════════════════════════════════════════════════════════════════
// CERTIFY PHASE (SLO Verification)
// ═══════════════════════════════════════════════════════════════════

async function certify() {
  console.log(label("\n═══ SLI CERTIFICATION (10 Gates) ═══\n"));
  const c = db();

  const [r_visible, r_plat, r_gold, r_fresh, r_geo, r_nullT, r_topSort, r_dbStaleness] = await Promise.allSettled([
    safeQuery(c, `SELECT COUNT(*) AS n FROM opportunities WHERE is_active=1 AND tier IN (0,1,2,3)`),
    safeQuery(c, `SELECT COUNT(*) AS n FROM opportunities WHERE is_active=1 AND tier=0`),
    safeQuery(c, `SELECT COUNT(*) AS n FROM opportunities WHERE is_active=1 AND tier=1`),
    safeQuery(c, `SELECT COUNT(*) AS n FROM opportunities WHERE scraped_at > unixepoch('now','-1 hour')`),
    safeQuery(c, `SELECT COUNT(*) AS n FROM opportunities WHERE is_active=1 AND tier IN (1,2,3) AND (LOWER(description) LIKE '%us only%' OR LOWER(description) LIKE '%w2 only%')`),
    safeQuery(c, `SELECT COUNT(*) AS n FROM opportunities WHERE is_active=1 AND tier IS NULL`),
    safeQuery(c, `SELECT tier FROM opportunities WHERE is_active=1 AND tier IN (0,1,2,3) ORDER BY tier ASC, COALESCE(posted_at,scraped_at) DESC, id DESC LIMIT 1`),
    safeQuery(c, `SELECT (unixepoch('now') - MAX(scraped_at)) / 3600.0 AS stale_hrs FROM opportunities`)
  ]);

  c.close();
  const [f_cdnHead] = await Promise.allSettled([safeFetch("https://va-freelance-hub-web.vercel.app/api/health", { method: "HEAD" }, 5000)]);

  const n = (r: PromiseSettledResult<any>, key: string) => r.status === "fulfilled" ? Number((r.value.rows[0] as any)[key]) : -1;
  const v = n(r_visible, "n"), p = n(r_plat, "n"), g = n(r_gold, "n"), f = n(r_fresh, "n"), gl = n(r_geo, "n"), nt = n(r_nullT, "n");
  const top = r_topSort.status === "fulfilled" ? Number((r_topSort.value.rows[0] as any)?.tier ?? 99) : -1;
  const trueStaleHrs = r_dbStaleness.status === "fulfilled" ? Number((r_dbStaleness.value.rows[0] as any).stale_hrs || 999) : 999;
  const cdnHeader = f_cdnHead.status === "fulfilled" ? f_cdnHead.value.headers["x-vercel-cache"] ?? "NOT_PRESENT" : "TIMEOUT";

  const gate = (id: string, ok: boolean, msg: string) => console.log(ok ? pass(`${id}  ${msg}`) : fail(`${id}  ${msg}`));

  gate("C1 ", v > 200,  `Visible topology: ${v} records (need > 200)`);
  gate("C2 ", p >= 5,   `PLATINUM Signals: ${p} (need ≥ 5)`);
  gate("C3 ", g > 0,    `GOLD Signals: ${g} (need > 0)`);
  gate("C4 ", f > 0,    `Ingestion velocity: ${f} in last 1hr`);
  gate("C5 ", gl === 0, `Geo-excluded leakages: ${gl} (need 0)`);
  gate("C6 ", nt === 0, `Schema integrity (NULL tiers): ${nt}`);
  gate("C7 ", top <= 1, `Feed integrity (Top Tier): ${top} (need 0 or 1)`);
  gate("C8 ", trueStaleHrs < CONFIG.STALE_CRITICAL_HRS, `Pipeline Staleness: ${trueStaleHrs.toFixed(1)}hrs (SLO < ${CONFIG.STALE_CRITICAL_HRS}h)`);
  gate("C9 ", cdnHeader !== "HIT", `Edge Cache Header: ${cdnHeader} (need MISS)`);
  gate("C10", trueStaleHrs !== 999, `Turso Edge Network reachable`);

  const allPass = v > 200 && p >= 5 && g > 0 && f > 0 && gl === 0 && nt === 0 && top <= 1 && trueStaleHrs < CONFIG.STALE_CRITICAL_HRS && cdnHeader !== "HIT" && trueStaleHrs !== 999;
  
  console.log();
  if (allPass) console.log(pass("ALL GATES PASS — SLOs Satisfied. Platform is healthy."));
  else console.log(fail("SLO Violation Detected. Remediation or escalation required."));
}

// ── CLI Router ────────────────────────────────────────────────────
const mode = process.argv[2];
const isDryRun = process.argv.includes("--dry-run");

if (mode === "--detect") {
  detect().then(() => process.exit(0)).catch(e => { console.error(fail(e.message)); process.exit(1); });
} else if (mode === "--fix") {
  fix(isDryRun).then(() => process.exit(0)).catch(e => { console.error(fail(e.message)); process.exit(1); });
} else if (mode === "--certify") {
  certify().then(() => process.exit(0)).catch(e => { console.error(fail(e.message)); process.exit(1); });
} else if (mode === "--reset") {
  const state = loadState();
  saveState({ attempts: 0, history: [...state.history, { ts: new Date().toISOString(), mode: "MANUAL_RESET", findings: [] }]});
  console.log(pass(`SRE Error budget reset. You have ${MAX_ATTEMPTS} attempts available.`));
  process.exit(0);
} else {
  console.log(`
${BOLD}VA.INDEX Triage v10.0 (Lead SRE Edition)${RESET}

Usage:
  bun run scripts/triage.ts --detect            # Run Telemetry Diagnostics
  bun run scripts/triage.ts --fix               # Execute Autonomous Remediation
  bun run scripts/triage.ts --fix --dry-run     # Preview Action Plan
  bun run scripts/triage.ts --certify           # Verify Platform SLOs
  bun run scripts/triage.ts --reset             # Reset Error Budget
`);
  process.exit(0);
}
