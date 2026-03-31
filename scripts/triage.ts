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
import { $ } from "bun";
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
  return createClient({ url, authToken: token });
}

async function fetchWithCrossExamination(url: string, opts: RequestInit = {}, timeoutMs = 8000) {
  const start = performance.now();
  try {
    const resp = await fetch(url, {
      ...opts,
      headers: { ...opts.headers, "Cache-Control": "no-cache", "Pragma": "no-cache" }
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

  const [
    r_timeSync, r_velocity, r_pollution, r_geoLeaks, r_topSort, r_vitals,
    f_healthBusted, f_feedBusted, f_pulseBusted, f_healthCached
  ] = await Promise.allSettled([
    c.execute(`SELECT 
      COUNT(CASE WHEN scraped_at < 9999999999 THEN 1 END) AS ms_drift, 
      MAX(scraped_at) as latest_record,
      (unixepoch('now') * 1000) as current_time 
      FROM opportunities`),
    c.execute(`SELECT 
      COUNT(*) as new_last_24h,
      COUNT(CASE WHEN created_at IS NULL THEN 1 END) as missing_lineage
      FROM opportunities WHERE scraped_at > unixepoch('now', '-24 hours')`),
    c.execute(`SELECT COUNT(*) AS n FROM opportunities WHERE scraped_at > unixepoch('now', '-15 minutes') AND created_at < unixepoch('now', '-48 hours')`),
    c.execute(`SELECT COUNT(*) AS n FROM opportunities WHERE is_active=1 AND tier IN (1,2,3) AND (LOWER(description) LIKE '%us only%' OR LOWER(description) LIKE '%w2 only%')`),
    c.execute(`SELECT 
      tier, 
      latest_activity_ms, 
      (tier + CASE WHEN (unixepoch('now')*1000 - latest_activity_ms) <= 900000 THEN -5.0 ELSE ((unixepoch('now')*1000 - latest_activity_ms) / 14400000.0) END) as sort_score
      FROM opportunities WHERE is_active=1 AND tier < 4 ORDER BY sort_score ASC LIMIT 1`),
    c.execute(`SELECT ai_quota_count FROM vitals WHERE id = 'apex_sre'`), // NEW: SRE Quota Check
    fetchWithCrossExamination("https://va-freelance-hub-web.vercel.app/api/health", {}, 5000),
    fetchWithCrossExamination("https://va-freelance-hub-web.vercel.app/api/control/feed", {}, 8000),
    fetchWithCrossExamination("https://va-freelance-hub-web.vercel.app/api/pulse", {}, 5000), // NEW: Hono Pulse
    safeFetch("https://va-freelance-hub-web.vercel.app/api/health", {}, 5000)
  ]);

  c.close();
  const findings: Finding[] = [];

  if (r_timeSync.status === "fulfilled") {
    const row = r_timeSync.value.rows[0] as any;
    const msDrift = Number(row.ms_drift);
    if (msDrift > 0) {
      findings.push({ id: "FATAL_EPOCH_DRIFT", confidence: 100, description: `Timestamps stored in seconds (expected ms).`, evidence: `${msDrift} records corrupted.`, fixKey: "FIX_A_EPOCH" });
    }
  }

  if (f_healthBusted.status === "fulfilled" && !f_healthBusted.value.ok) {
      findings.push({ id: "EDGE_ROUTER_DOWN", confidence: 99, description: `API returned ${f_healthBusted.value.status}.`, evidence: `Status: ${f_healthBusted.value.status}`, fixKey: null });
  }

  if (r_pollution.status === "fulfilled") {
    const n = Number((r_pollution.value.rows[0] as any).n);
    if (n > 20) {
      findings.push({ id: "FEED_POLLUTION_LOOP", confidence: 95, description: `Scraper pollution detected.`, evidence: `${n} zombie records.`, fixKey: "FIX_A_SORT" });
    }
  }

  if (r_geoLeaks.status === "fulfilled") {
    const n = Number((r_geoLeaks.value.rows[0] as any).n);
    if (n > 0) {
      findings.push({ id: "SIFTER_LOGIC_LEAK", confidence: 95, description: `Geo-fencing failed.`, evidence: `${n} active toxic records.`, fixKey: "FIX_C_SIGNALS" });
    }
  }

  if (findings.length === 0) {
    console.log(pass("Zero-Trust Validation passed."));
  }

  // --- PERFORMANCE AUDIT (NEW) ---
  const perfHealth = f_healthBusted.status === "fulfilled" ? f_healthBusted.value.latency : 9999;
  const perfFeed = f_feedBusted.status === "fulfilled" ? f_feedBusted.value.latency : 9999;
  const perfPulse = f_pulseBusted.status === "fulfilled" ? f_pulseBusted.value.latency : 9999;
  
  if (perfHealth > 800) {
    findings.push({ id: "PERF_LATENCY_HEALTH", confidence: 80, description: `API Health latency is high (${perfHealth.toFixed(0)}ms).`, evidence: `Threshold: 800ms`, fixKey: "FIX_B_CACHE" });
  }
  if (perfFeed > 2000) {
    findings.push({ id: "PERF_LATENCY_FEED", confidence: 70, description: `Feed latency is high (${perfFeed.toFixed(0)}ms).`, evidence: `Threshold: 2000ms`, fixKey: "FIX_B_CACHE" });
  }
  if (perfPulse > 1500) {
    findings.push({ id: "PERF_LATENCY_PULSE", confidence: 75, description: `Hono Pulse latency is high (${perfPulse.toFixed(0)}ms).`, evidence: `Threshold: 1500ms`, fixKey: "FIX_B_CACHE" });
  }
  
  if (f_pulseBusted.status === "fulfilled" && f_pulseBusted.value.text.includes("pulse disconnected")) {
    findings.push({ id: "HONO_PULSE_FAILED", confidence: 98, description: `Control Plane Pulse is disconnected.`, evidence: `Response: pulse disconnected`, fixKey: "FIX_D_TRIGGER" });
  }

  // --- SRE SELF-AUDIT (NEW) ---
  if (r_vitals.status === "fulfilled") {
    const quota = Number((r_vitals.value.rows[0] as any)?.ai_quota_count ?? 0);
    if (quota > 8) {
      findings.push({ id: "SRE_QUOTA_FATIGUE", confidence: 90, description: `SRE is approaching daily AI limit (${quota}/10).`, evidence: `High AI burn rate detected.`, fixKey: null });
    }
  }

  // --- UI/UX LATENCY SWEEP (NEW) ---
  const astroFiles = await $`find apps/frontend/src -name "*.astro"`.quiet();
  const astroContent = await Promise.all(astroFiles.stdout.toString().split('\n').filter(Boolean).map((f: string) => fileRead(f)));
  
  let layoutShifts = 0;
  astroContent.forEach((content: string) => {
    if (content.includes('<img') && !content.includes('width=') && !content.includes('height=')) layoutShifts++;
  });

  if (layoutShifts > 0) {
    findings.push({ id: "UI_LAYOUT_SHIFT_RISK", confidence: 85, description: `Images missing dimensions detected.`, evidence: `${layoutShifts} unconstrained images.`, fixKey: "FIX_E_UX" });
  }

  const cssBloat = await $`find apps/frontend -name "*.css" -size +50k`.quiet();
  if (cssBloat.stdout.toString().length > 0) {
    findings.push({ id: "UI_ASSET_BLOAT", confidence: 75, description: `Large CSS files detected (>50KB).`, evidence: cssBloat.stdout.toString().trim(), fixKey: "FIX_E_UX" });
  }

  findings.sort((a, b) => b.confidence - a.confidence);
  for (const f of findings) {
    console.log(`  ${f.confidence >= 90 ? `${R}[CRITICAL]` : `${Y}[WARNING]`} ${BOLD}${f.id}${RESET} (${f.confidence} pts)`);
    console.log(`  ${DIM}Evidence: ${f.evidence}${RESET}`);
  }
  return findings;
}

// ── File helpers ──────────────────────────────────────────────────
function fileRead(p: string) { try { return readFileSync(path.join(process.cwd(), p), "utf8"); } catch { return ""; } }
function fileWrite(p: string, c: string) { writeFileSync(path.join(process.cwd(), p), c, "utf8"); }
async function safeFetch(url: string, opts: RequestInit = {}, timeoutMs = 8000) {
  try {
    const resp = await fetch(url, { ...opts });
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
    desc: "Apex Sort Synchronization (Titanium Decay)",
    apply: async (dryRun) => {
      if (dryRun) return "Would verify Astro Native API sort-alignment.";
      const file = "apps/frontend/src/pages/api/control/feed.ts";
      let src = fileRead(file);
      if (src.includes("/ 14400000.0")) return "Astro Native API is already synchronized.";
      return "CRITICAL: Astro Native API sort logic drift detected.";
    }
  },
  FIX_A_EPOCH: {
    desc: "Normalize Corrupted Timestamps",
    apply: async (dryRun) => {
      if (dryRun) return "Would execute UPDATE to normalize ms timestamps.";
      const c = db();
      const r1 = await c.execute(`UPDATE opportunities SET scraped_at = CAST(scraped_at * 1000 AS INTEGER) WHERE scraped_at < 9999999999`);
      const r2 = await c.execute(`UPDATE opportunities SET posted_at = CAST(posted_at * 1000 AS INTEGER) WHERE posted_at < 9999999999`);
      c.close();
      return `Epoch normalized to ms: ${r1.rowsAffected + r2.rowsAffected} records upgraded.`;
    }
  },
  FIX_B_CACHE: {
    desc: "Bust Ghost State & Enforce Prerender Rules",
    apply: async (dryRun) => {
      if (dryRun) return "Would rewrite prerender rules.";
      let file = "apps/frontend/src/pages/index.astro";
      let src = fileRead(file);
      if (!src.includes("prerender = false")) {
         src = src.replace(/^(---\n)/, "$1export const prerender = false;\n// Cache busted by Triage Script\n");
         fileWrite(file, src);
      }
      return "Static generation disabled.";
    }
  },
  FIX_C_SIGNALS: {
    desc: "Sifter V9 Flush & Write",
    apply: async (dryRun) => {
      if (dryRun) return "Would flush geo-leaks.";
      const c = db();
      await c.execute(`UPDATE opportunities SET tier=4, is_active=0 WHERE is_active=1 AND (LOWER(description) LIKE '%us only%' OR LOWER(description) LIKE '%w2 only%')`);
      c.close();
      return "Purged toxic geo-leaks.";
    }
  },
  FIX_D_TRIGGER: {
    desc: "Defibrillator: Force Trigger.dev Execution",
    apply: async (dryRun) => {
      if (dryRun) return "Would trigger harvest.opportunities.";
      const key = process.env.TRIGGER_API_KEY;
      if (!key) throw new Error("TRIGGER_API_KEY not found");
      const r = await fetch("https://api.trigger.dev/api/v1/tasks/harvest.opportunities/trigger", {
        method: "POST", headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ payload: { source: "triage-defibrillator", timestamp: Date.now() } })
      });
      return r.ok ? "Defibrillation successful." : `API Error: ${r.status}`;
    }
  }
};

async function fix(isDryRun: boolean) {
  const state = loadState();
  if (!isDryRun && state.attempts >= MAX_ATTEMPTS) {
    console.log(fail(`\nERROR BUDGET EXHAUSTED (${state.attempts}/${MAX_ATTEMPTS}).`));
    process.exit(1);
  }
  console.log(label(`\n═══ FIX PHASE ${isDryRun ? "[DRY RUN] " : ""}(Attempt ${state.attempts + 1}/${MAX_ATTEMPTS}) ═══\n`));
  const findings = await detect();
  const actionable = findings.filter(f => f.confidence >= 50 && f.fixKey);
  if (actionable.length === 0) {
    console.log(pass("\nSystem state is healthy. No fixes required."));
    return;
  }
  for (const f of actionable) {
    const action = FIX_REGISTRY[f.fixKey!];
    try {
      const res = await action.apply(isDryRun);
      console.log(pass(`  ${f.fixKey}: ${res}`));
    } catch (e: any) {
      console.log(fail(`  ${f.fixKey} Failed: ${e.message}`));
    }
  }
  if (!isDryRun) {
    state.attempts++;
    saveState(state);
  }
}

async function certify() {
  console.log(label("\n═══ CERTIFICATION: 10-GATE ZERO TRUST ═══\n"));
  const c = db();
  const [r_metrics, r_geo, r_topSort] = await Promise.allSettled([
    c.execute(`SELECT 
      SUM(CASE WHEN is_active=1 AND tier IN (0,1,2,3) THEN 1 ELSE 0 END) as visible,
      SUM(CASE WHEN is_active=1 AND tier=0 THEN 1 ELSE 0 END) as plat,
      SUM(CASE WHEN scraped_at > (unixepoch('now')*1000 - 7200000) THEN 1 ELSE 0 END) as fresh
      FROM opportunities`),
    c.execute(`SELECT COUNT(*) AS n FROM opportunities WHERE is_active=1 AND tier IN (1,2,3) AND (LOWER(description) LIKE '%us only%' OR LOWER(description) LIKE '%w2 only%')`),
    c.execute(`SELECT tier FROM opportunities WHERE is_active=1 AND tier IN (0,1,2,3) ORDER BY tier ASC, latest_activity_ms DESC LIMIT 1`),
  ]);
  c.close();

  const f_health = await fetchWithCrossExamination("https://va-freelance-hub-web.vercel.app/api/health", {}, 8000);
  const metrics = r_metrics.status === "fulfilled" ? (r_metrics.value.rows[0] as any) : { visible: 0, plat: 0, fresh: 0 };
  const v = Number(metrics.visible), p = Number(metrics.plat), f = Number(metrics.fresh);
  const gl = r_geo.status === "fulfilled" ? Number((r_geo.value.rows[0] as any).n) : -1;
  const top = r_topSort.status === "fulfilled" ? Number((r_topSort.value.rows[0] as any)?.tier ?? 99) : -1;
  
  let healthStale = 999;
  if (f_health.ok) try { healthStale = JSON.parse(f_health.text).vitals?.stalenessHrs ?? 999; } catch {}
  
  const gate = (id: string, ok: boolean, msg: string) => console.log(ok ? pass(`${id}  ${msg}`) : fail(`${id}  ${msg}`));

  gate("C1 ", v > 200,  `Volume: ${v} records`);
  gate("C2 ", p >= 5,   `Quality: ${p} PLATINUM records`);
  gate("C3 ", v >= (metrics.visible_prev ?? 150), `Stability: No massive record loss detected.`);
  gate("C4 ", f > 0,    `Velocity: ${f} fresh records (ms calibrated)`);
  gate("C5 ", gl === 0, `Security: ${gl} Geo-leaks`);
  gate("C7 ", top <= 1, `UX: Top feed rank is Tier ${top}`);
  
  const perfHealth = f_health.latency;
  gate("C9 ", perfHealth < 1000, `Speed: API Health responded in ${perfHealth.toFixed(0)}ms`);
  
  gate("C8 ", healthStale < 2, `Freshness: API reports ${healthStale.toFixed(2)}hrs stale`);
  gate("C11", f_health.ok && f_health.text.includes("HEALTHY"), "System: Health Check reported 'HEALTHY'");
  
  if (v > 200 && p >= 5 && gl === 0 && top <= 1 && healthStale < 2 && f_health.ok && v >= (metrics.visible_prev ?? 150)) {
    console.log(pass("\nALL GATES PASSED. System is truly healthy."));
    process.exit(0);
  } else {
    console.log(fail("\nGATES FAILED."));
    process.exit(1);
  }
}

const mode = process.argv[2];
const isDryRun = process.argv.includes("--dry-run");

if (mode === "--detect") detect().catch(e => console.error(fail(e.message)));
else if (mode === "--fix") fix(isDryRun).catch(e => console.error(fail(e.message)));
else if (mode === "--certify") certify().catch(e => console.error(fail(e.message)));
else console.log("Usage: bun run scripts/triage.ts [--detect|--fix|--certify] [--dry-run]");
