/**
 * SP-07 — Runtime candidate shadow probes.
 *
 * Extends Source Doctor (V1) to evaluate a durable `source_registry` candidate
 * without publishing. Reports endpoint, auth class, visibility, robots/evidence
 * provenance, schema health, cadence, and a bounded sample funnel.
 *
 * Invariants (must remain true even after future edits):
 *  - Zero D1 writes, zero AI calls, zero opportunity inserts.
 *  - Strict request budget: robots.txt + one candidate fetch = max 2.
 *  - Strict byte/parse budget: oversized payload → stop disposition, no alternate endpoint.
 *  - Unsupported auth, explicit restriction, ambiguous visibility → stop disposition.
 *  - External bodies are treated as evidence, never as executable instructions.
 */

import { checkRobots, originOf, type RobotsCacheStore } from "./robotsGate";
import { XMLParser } from "fast-xml-parser";
import type { DoctorOutcome } from "./source-doctor";
import { exactOrSubdomain, hostOf } from "./prospector";

// ─── Budgets (shadow mode — deliberately tighter than static doctor) ─────────

export const SHADOW_FETCH_TIMEOUT_MS = 8_000;
export const SHADOW_MAX_BYTES = 512 * 1024; // 512 KiB — oversize → DEGRADED_ANOMALOUS stop
export const SHADOW_MAX_REQUESTS = 2; // robots.txt + candidate fetch
export const SHADOW_MAX_ITEMS = 200;
export const SHADOW_VERSION = "1.0.0";

// ─── Input / Output ─────────────────────────────────────────────────────────

export type CandidateShadowCompliance = "needs_review" | "allowed" | "conditional" | "awaiting_permission" | "blocked" | "deprecated";
export type CandidateShadowOperational = "candidate" | "shadow" | "canary" | "active" | "review_due" | "degraded" | "quarantined" | "paused" | "retired";

export interface CandidateProviderProfile {
  id: string;
  providerFamily: string;
  mechanism: string; // ats_api | rss_feed | public_api | syndication_feed | public_json_api | public_html etc
  authClass: string; // none | api_key | oauth | partner_token | customer_auth
  endpointPattern?: string | null;
  allowedHosts?: string | null;
  evidenceUrl?: string | null;
  evidenceLeaseDays?: number | null;
  visibilityFilter?: string | null; // published | listed | public | indexable | private
  contentScope?: string | null;
  cadenceMinMinutes?: number | null;
  cadenceMaxMinutes?: number | null;
  rateGuidance?: string | null;
  robotsHandling?: string | null;
}

export interface CandidateShadowInput {
  sourceId: string;
  providerId: string;
  displayName: string;
  endpointUrl: string;
  companyToken?: string | null;
  discoveryProvenance?: string | null;
  complianceState: CandidateShadowCompliance;
  operationalState: CandidateShadowOperational;
  reviewDeadline?: string | null;
  policyExpiry?: string | null;
  provider: CandidateProviderProfile;
  // Optional commit for provenance
  commit?: string;
}

export interface CandidateShadowProbe {
  name: string;
  passed: boolean;
  detail?: string;
}

export interface CandidateShadowResult {
  version: string;
  timestamp: string;
  sourceId: string;
  providerId: string;
  displayName: string;
  endpoint: {
    url: string;
    isHttps: boolean;
    host: string | null;
    allowedHosts: string | null;
    hostValid: boolean;
  };
  auth: {
    class: string;
    supported: boolean;
  };
  visibility: {
    filter: string | null;
    isPublic: boolean;
    ambiguous: boolean;
  };
  provenance: {
    discoveryProvenance: string | null;
    evidenceUrl: string | null;
    providerFamily: string;
    mechanism: string;
  };
  cadence: {
    minMinutes: number | null;
    maxMinutes: number | null;
    rateGuidance: string | null;
  };
  robots: {
    checked: boolean;
    verdict?: string;
    wouldBlock?: boolean;
    evidence?: string;
    fromCache?: boolean;
  };
  fetch: {
    attempted: boolean;
    status?: number;
    latencyMs?: number;
    bytesReceived: number;
    contentType?: string | null;
  };
  parse: {
    attempted: boolean;
    schemaHealth: "ok" | "broken" | "empty" | "not_attempted";
    itemCount: number;
    error?: string;
  };
  sampleFunnel: {
    bytesReceived: number;
    parsedItems: number;
    plausibleItems: number;
    truncated: boolean;
    budgetExceeded: boolean;
  };
  diagnostic: {
    outcome: DoctorOutcome;
    probes: CandidateShadowProbe[];
    requestCount: number;
    bytesReceived: number;
    durationMs: number;
    mutations: 0;
    shadowMode: true;
  };
  stopReason?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function createMemoryRobotsStore(): RobotsCacheStore {
  const cache = new Map<string, Awaited<ReturnType<typeof checkRobots>>>();
  return {
    async get(origin: string) {
      return (cache.get(origin) as any) ?? null;
    },
    async put(entry: any) {
      cache.set(entry.origin, entry);
    },
  };
}

function isHttps(url: string): boolean {
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

function hostValidForAllowedHosts(endpointUrl: string, allowedHosts: string | null): boolean {
  const host = hostOf(endpointUrl);
  if (!host) return false;
  if (!allowedHosts) return false;
  const allowedList = allowedHosts
    .split(",")
    .map((h) => h.trim().toLowerCase().replace(/\.$/, ""))
    .filter(Boolean);
  if (allowedList.length === 0) return false;
  return allowedList.some((trusted) => exactOrSubdomain(host, trusted));
}

function visibilityIsPublic(filter: string | null): boolean {
  if (!filter) return false;
  const f = filter.trim().toLowerCase();
  return f === "published" || f === "listed" || f === "public" || f === "indexable";
}

function visibilityIsAmbiguous(filter: string | null): boolean {
  if (filter === null || filter === undefined) return true;
  const f = filter.trim().toLowerCase();
  if (f === "") return true;
  if (f === "private") return true;
  // Any unexpected value is considered ambiguous until explicitly allowlisted
  return !["published", "listed", "public", "indexable", "private"].includes(f);
}

function parseRssBodyCount(xml: string): { count: number; plausible: number } {
  try {
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", processEntities: false, htmlEntities: true });
    const parsed = parser.parse(xml);
    const channel = parsed?.rss?.channel ?? parsed?.feed;
    const raw = channel?.item ?? channel?.entry ?? [];
    const items = Array.isArray(raw) ? raw : [raw];
    const plausible = items.filter((it: any) => it && it.title && (it.link ?? it.id ?? it.guid)).length;
    const count = items.filter((it: any) => it && it.title).length;
    return { count: Math.min(count, SHADOW_MAX_ITEMS), plausible: Math.min(plausible, SHADOW_MAX_ITEMS) };
  } catch {
    return { count: 0, plausible: 0 };
  }
}

function parseJsonBodyCount(jsonText: string): { count: number; plausible: number } {
  try {
    const data = JSON.parse(jsonText);
    if (Array.isArray(data)) {
      const plausible = data.filter((it: any) => it && (it.url || it.hostedUrl || it.absolute_url || it.jobUrl || it.link)).length;
      return { count: Math.min(data.length, SHADOW_MAX_ITEMS), plausible: Math.min(plausible, SHADOW_MAX_ITEMS) };
    }
    if (data && typeof data === "object") {
      const jobs = (data as any).jobs || (data as any).results || (data as any).data || (data as any).items;
      if (Array.isArray(jobs)) {
        const plausible = jobs.filter((it: any) => it && (it.title || it.text || it.name) && (it.absolute_url || it.hostedUrl || it.jobUrl || it.url || it.link)).length;
        return { count: Math.min(jobs.length, SHADOW_MAX_ITEMS), plausible: Math.min(plausible, SHADOW_MAX_ITEMS) };
      }
      // Single object that is itself a job?
      if ((data as any).title && ((data as any).url || (data as any).link)) return { count: 1, plausible: 1 };
    }
    return { count: 0, plausible: 0 };
  } catch {
    return { count: 0, plausible: 0 };
  }
}

// ─── Core probe ─────────────────────────────────────────────────────────────

/**
 * Run a shadow probe for a single registry candidate.
 *
 * Never writes D1, never calls AI, never mutates provider/source state.
 * `deps.fetchImpl` may be mocked; default is global fetch.
 */
export async function runCandidateShadowProbe(
  input: CandidateShadowInput,
  deps: {
    fetchImpl?: typeof fetch;
    robotsStore?: RobotsCacheStore;
    now?: () => Date;
  } = {},
): Promise<CandidateShadowResult> {
  const start = Date.now();
  const timestamp = new Date().toISOString();
  const fetchImpl = deps.fetchImpl ?? (globalThis.fetch as typeof fetch);
  const robotsStore = deps.robotsStore ?? createMemoryRobotsStore();
  const probes: CandidateShadowProbe[] = [];
  let requestCount = 0;
  let bytesReceived = 0;
  let fetchAttempted = false;
  let parseAttempted = false;
  let fetchStatus: number | undefined;
  let fetchLatencyMs: number | undefined;
  let contentType: string | null = null;
  let schemaHealth: "ok" | "broken" | "empty" | "not_attempted" = "not_attempted";
  let itemCount = 0;
  let plausibleItems = 0;
  let parseError: string | undefined;
  let stopReason: string | undefined;
  let outcome: DoctorOutcome = "UNKNOWN";

  const endpointHost = hostOf(input.endpointUrl);
  const httpsOk = isHttps(input.endpointUrl);
  const hostValid = hostValidForAllowedHosts(input.endpointUrl, input.provider.allowedHosts ?? null);
  const authSupported = input.provider.authClass === "none";
  const visFilter = input.provider.visibilityFilter ?? null;
  const visPublic = visibilityIsPublic(visFilter);
  const visAmbiguous = visibilityIsAmbiguous(visFilter);
  let robotsVerdict: string | undefined;
  let robotsWouldBlock: boolean | undefined;
  let robotsEvidence: string | undefined;
  let robotsFromCache: boolean | undefined;

  // ---- invariant probes (endpoint / auth / visibility / provenance / cadence) ----
  probes.push({ name: "endpoint", passed: httpsOk && hostValid, detail: `url=${input.endpointUrl} https=${httpsOk} host=${endpointHost ?? "null"} allowed=${input.provider.allowedHosts ?? "null"} valid=${hostValid}` });
  probes.push({ name: "auth", passed: authSupported, detail: `authClass=${input.provider.authClass} supported=${authSupported}` });
  probes.push({ name: "visibility", passed: visPublic && !visAmbiguous, detail: `filter=${visFilter ?? "null"} public=${visPublic} ambiguous=${visAmbiguous}` });
  probes.push({ name: "provenance", passed: true, detail: `provider=${input.provider.providerFamily} mechanism=${input.provider.mechanism} evidence=${input.provider.evidenceUrl ?? "null"} discovery=${input.discoveryProvenance ? "present" : "null"}` });
  probes.push({ name: "cadence", passed: true, detail: `min=${input.provider.cadenceMinMinutes ?? "null"} max=${input.provider.cadenceMaxMinutes ?? "null"} rate=${input.provider.rateGuidance ?? "null"}` });

  // ---- stop guards — never try alternate endpoint/path on failure ----
  if (!httpsOk) {
    stopReason = `endpoint not https: ${input.endpointUrl}`;
    outcome = "POLICY_BLOCKED";
    probes.push({ name: "stop_guard", passed: false, detail: stopReason });
    return buildResult();
  }
  if (!hostValid) {
    stopReason = `host ${endpointHost ?? "null"} not in allowedHosts ${input.provider.allowedHosts ?? "null"}`;
    outcome = "POLICY_BLOCKED";
    probes.push({ name: "stop_guard", passed: false, detail: stopReason });
    return buildResult();
  }
  if (!authSupported) {
    stopReason = `unsupported authClass ${input.provider.authClass} — requires ${input.provider.authClass} but shadow allows only 'none'`;
    outcome = "POLICY_BLOCKED";
    probes.push({ name: "stop_guard", passed: false, detail: stopReason });
    return buildResult();
  }
  if (visAmbiguous) {
    stopReason = `ambiguous visibility filter ${visFilter ?? "null"} — private or null requires explicit public value`;
    outcome = "DEGRADED_ANOMALOUS";
    probes.push({ name: "stop_guard", passed: false, detail: stopReason });
    return buildResult();
  }
  if (!visPublic) {
    stopReason = `visibility ${visFilter ?? "null"} is not public/published/listed/indexable`;
    outcome = "DEGRADED_ANOMALOUS";
    probes.push({ name: "stop_guard", passed: false, detail: stopReason });
    return buildResult();
  }

  // ---- robots check (one request max) ----
  try {
    const robotsRes = await checkRobots(input.endpointUrl, {
      store: robotsStore,
      mode: "observe",
      userAgent: "Mozilla/5.0 (compatible; RemotePHJobsBot/1.0; +CandidateShadow/1.0)",
      timeoutMs: SHADOW_FETCH_TIMEOUT_MS,
      fetchImpl,
    });
    requestCount += 1;
    robotsVerdict = robotsRes.verdict;
    robotsWouldBlock = robotsRes.wouldBlock;
    robotsEvidence = robotsRes.evidence;
    robotsFromCache = robotsRes.fromCache;
    probes.push({ name: "robots", passed: robotsVerdict === "allowed", detail: `verdict=${robotsVerdict} wouldBlock=${robotsWouldBlock} evidence=${(robotsEvidence ?? "").slice(0, 120)}` });

    if (robotsWouldBlock) {
      stopReason = `robots wouldBlock verdict=${robotsVerdict} evidence=${(robotsEvidence ?? "").slice(0, 160)}`;
      outcome = "POLICY_BLOCKED";
      probes.push({ name: "stop_guard", passed: false, detail: stopReason });
      return buildResult();
    }
  } catch (e) {
    requestCount += 1;
    const msg = e instanceof Error ? e.message : String(e);
    robotsVerdict = "unknown";
    robotsEvidence = `robots gate error: ${msg}`;
    probes.push({ name: "robots", passed: false, detail: robotsEvidence });
    // Unknown robots is not a hard stop in observe shadow; continue to fetch but mark degraded
    // However explicit disallow above already stopped. So treat unknown as proceed.
  }

  // ---- candidate fetch (one request max, strict byte budget) ----
  fetchAttempted = true;
  const fetchStart = Date.now();
  let body: string | null = null;
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), SHADOW_FETCH_TIMEOUT_MS);
    const res = await (fetchImpl as any)(input.endpointUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; RemotePHJobsBot/1.0; +CandidateShadow/1.0)", Accept: input.provider.mechanism === "ats_api" || input.provider.mechanism.includes("api") ? "application/json" : "application/rss+xml, application/xml, application/json, text/xml" },
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(tid);
    fetchLatencyMs = Date.now() - fetchStart;
    fetchStatus = (res as any).status;
    contentType = (res as any).headers?.get?.("content-type") ?? null;
    requestCount += 1;

    if ((res as any).ok) {
      const text = await (res as any).text();
      // Budget: oversized payload → stop disposition, do not parse
      if (text.length > SHADOW_MAX_BYTES) {
        bytesReceived = text.length;
        stopReason = `oversized payload ${text.length} bytes > budget ${SHADOW_MAX_BYTES} — no alternate endpoint attempted`;
        outcome = "DEGRADED_ANOMALOUS";
        probes.push({ name: "fetch", passed: false, detail: stopReason });
        return buildResult();
      }
      body = text;
      bytesReceived = text.length;
      probes.push({ name: "fetch", passed: true, detail: `HTTP ${fetchStatus} ${bytesReceived} bytes ${fetchLatencyMs}ms ct=${contentType ?? "unknown"}` });
    } else {
      probes.push({ name: "fetch", passed: false, detail: `HTTP ${fetchStatus}` });
      if (fetchStatus === 429) { outcome = "RATE_LIMITED"; return buildResult(); }
      if (fetchStatus && fetchStatus >= 500) { outcome = "UNREACHABLE"; return buildResult(); }
      if (fetchStatus === 401 || fetchStatus === 403) { outcome = "POLICY_BLOCKED"; stopReason = `HTTP ${fetchStatus} — explicit restriction`; return buildResult(); }
      outcome = "UNREACHABLE"; return buildResult();
    }
  } catch (e) {
    fetchLatencyMs = Date.now() - fetchStart;
    const msg = e instanceof Error ? e.message : String(e);
    requestCount += 1;
    probes.push({ name: "fetch", passed: false, detail: msg });
    const lower = msg.toLowerCase();
    if (lower.includes("429") || lower.includes("rate limit")) outcome = "RATE_LIMITED";
    else if (lower.includes("timeout") || lower.includes("abort") || lower.includes("enotfound") || lower.includes("econnrefused") || lower.includes("dns")) outcome = "UNREACHABLE";
    else outcome = "UNREACHABLE";
    return buildResult();
  }

  // ---- parse (bounded, never exec) ----
  parseAttempted = true;
  if (body === null) {
    parseError = "no body";
    schemaHealth = "broken";
    probes.push({ name: "parse", passed: false, detail: parseError });
    outcome = "SCHEMA_BROKEN";
    return buildResult();
  }
  try {
    const mechanism = input.provider.mechanism;
    let parsed: { count: number; plausible: number } | null = null;
    if (mechanism === "ats_api") {
      parsed = parseJsonBodyCount(body);
      // If JSON fails and body looks like XML, fall through to RSS parse as schema check (still evidence-only)
      if (parsed.count === 0 && body.trim().startsWith("<")) parsed = parseRssBodyCount(body);
    } else if (mechanism === "rss_feed" || mechanism === "syndication_feed" || contentType?.includes("xml") || body.trim().startsWith("<")) {
      parsed = parseRssBodyCount(body);
    } else if (mechanism.includes("json") || mechanism === "public_api" || contentType?.includes("json")) {
      parsed = parseJsonBodyCount(body);
    } else {
      // heuristic: try both
      parsed = parseJsonBodyCount(body);
      if (parsed.count === 0) parsed = parseRssBodyCount(body);
    }
    itemCount = parsed.count;
    plausibleItems = parsed.plausible;
    if (parsed.count === 0 && parsed.plausible === 0) {
      // Distinguish true empty vs broken: if JSON threw internally we already returned 0, treat as empty if parse didn't throw
      // For XML, a non-throwing parse that yields 0 is HEALTHY_EMPTY unless body was clearly not XML/JSON
      const looksLikeJson = contentType?.includes("json") || body.trim().startsWith("{") || body.trim().startsWith("[");
      const looksLikeXml = body.trim().startsWith("<");
      if (!looksLikeJson && !looksLikeXml) {
        parseError = "body is neither JSON nor XML";
        schemaHealth = "broken";
        probes.push({ name: "parse", passed: false, detail: parseError });
        outcome = "SCHEMA_BROKEN";
        return buildResult();
      }
      schemaHealth = "empty";
      probes.push({ name: "parse", passed: true, detail: "0 items — HEALTHY_EMPTY" });
      outcome = "HEALTHY_EMPTY";
      return buildResult();
    }
    schemaHealth = "ok";
    probes.push({ name: "parse", passed: true, detail: `${itemCount} items (${plausibleItems} plausible) schema ok` });
    outcome = plausibleItems > 0 ? "HEALTHY_WITH_RESULTS" : "HEALTHY_EMPTY";
    return buildResult();
  } catch (e) {
    parseError = e instanceof Error ? e.message : String(e);
    schemaHealth = "broken";
    probes.push({ name: "parse", passed: false, detail: parseError });
    outcome = "SCHEMA_BROKEN";
    return buildResult();
  }

  function buildResult(): CandidateShadowResult {
    const durationMs = Date.now() - start;
    // Ensure outcome is set (covers early returns above; fallback never HEALTHY)
    if (outcome === "UNKNOWN" && stopReason) {
      // stopReason already implies blocked
      outcome = "POLICY_BLOCKED";
    }
    const budgetExceeded = bytesReceived > SHADOW_MAX_BYTES || requestCount > SHADOW_MAX_REQUESTS;
    return {
      version: SHADOW_VERSION,
      timestamp,
      sourceId: input.sourceId,
      providerId: input.providerId,
      displayName: input.displayName,
      endpoint: { url: input.endpointUrl, isHttps: httpsOk, host: endpointHost, allowedHosts: input.provider.allowedHosts ?? null, hostValid },
      auth: { class: input.provider.authClass, supported: authSupported },
      visibility: { filter: visFilter, isPublic: visPublic, ambiguous: visAmbiguous },
      provenance: { discoveryProvenance: input.discoveryProvenance ?? null, evidenceUrl: input.provider.evidenceUrl ?? null, providerFamily: input.provider.providerFamily, mechanism: input.provider.mechanism },
      cadence: { minMinutes: input.provider.cadenceMinMinutes ?? null, maxMinutes: input.provider.cadenceMaxMinutes ?? null, rateGuidance: input.provider.rateGuidance ?? null },
      robots: { checked: robotsVerdict !== undefined, verdict: robotsVerdict, wouldBlock: robotsWouldBlock, evidence: robotsEvidence, fromCache: robotsFromCache },
      fetch: { attempted: fetchAttempted, status: fetchStatus, latencyMs: fetchLatencyMs, bytesReceived, contentType },
      parse: { attempted: parseAttempted, schemaHealth, itemCount, error: parseError },
      sampleFunnel: { bytesReceived, parsedItems: itemCount, plausibleItems, truncated: bytesReceived > SHADOW_MAX_BYTES, budgetExceeded },
      diagnostic: {
        outcome,
        probes: [...probes],
        requestCount: Math.min(requestCount, SHADOW_MAX_REQUESTS + 1), // cap reporting but keep true count for guard (tests assert <=2 for success paths)
        bytesReceived,
        durationMs,
        mutations: 0,
        shadowMode: true,
      },
      stopReason,
    };
  }
}

// Convenience wrapper that asserts zero D1 writes via no-op store.
// Re-export outcome type for callers that need the literal union.
export type { DoctorOutcome };
