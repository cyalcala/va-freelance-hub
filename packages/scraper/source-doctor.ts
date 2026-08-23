/**
 * Source Doctor V1 — compliance-first, side-effect-free source diagnostics.
 *
 * Provides a bounded, read-only diagnostic command for a single source.
 * Never writes to D1, never calls AI, never triggers ingestion.
 * Outputs machine-readable JSON with exactly one terminal outcome.
 */

import {
  Source,
  sources,
  enabledSources,
  disabledSources,
  isEnabledSource,
  type CollectionMethod,
  type ComplianceStatus,
} from "./sources";
import { applyAutoPauses, autoPauseEntries } from "./pause";
import { originOf, checkRobots, createRobotsStore, type RobotsCacheStore, type RobotsGateResult, type RobotsMode } from "./robotsGate";
import { atsEndpointUrl, type AtsPlatform, fetchATSFeed } from "./ats";
import { collectionHeaders } from "./userAgent";
import { decodeHtmlEntities, xmlNodeText, xmlTextList } from "./text";
import { toContentHash } from "./contentHash";
import { XMLParser } from "fast-xml-parser";

/** Terminal diagnostic outcomes — exactly nine, no additions. */
export type DoctorOutcome =
  | "HEALTHY_WITH_RESULTS"
  | "HEALTHY_EMPTY"
  | "DEGRADED_ANOMALOUS"
  | "SCHEMA_BROKEN"
  | "RATE_LIMITED"
  | "UNREACHABLE"
  | "POLICY_BLOCKED"
  | "INTERNAL_PIPELINE_FAILURE"
  | "UNKNOWN";

/** Active path stages — documents what was actually probed. */
export type ActivePathStage =
  | "compliance_check"
  | "cadence_check"
  | "robots_check"
  | "fetch_attempt"
  | "parse_attempt"
  | "validation"
  | "complete";

export interface ActivePath {
  stages: ActivePathStage[];
  url?: string;
  method?: CollectionMethod | "public_ats_json";
  complianceStatus: ComplianceStatus;
  paused?: boolean;
  pauseReason?: string;
  cadenceSkipped?: boolean;
  cadenceReason?: string;
  robotsChecked?: boolean;
  robotsVerdict?: string;
  robotsFromCache?: boolean;
  fetchAttempted?: boolean;
  fetchStatus?: number;
  fetchLatencyMs?: number;
  bytesReceived?: number;
  parseAttempted?: boolean;
  parseError?: string;
  itemCount?: number;
  error?: string;
}

export interface DiagnosticProbe {
  name: string;
  passed: boolean;
  detail?: string;
}

export interface SourceDoctorResult {
  version: string;
  commit: string;
  timestamp: string;
  sourceId: string;
  sourceName: string;
  sourceFamily: string;
  sourceType: "static" | "ATS";
  activePath: ActivePath;
  diagnostic: {
    outcome: DoctorOutcome;
    probes: DiagnosticProbe[];
    requestCount: number;
    bytesReceived: number;
    durationMs: number;
    mutations: 0;
  };
  redactedError?: string;
}

const DOCTOR_VERSION = "1.0.0";
const FETCH_TIMEOUT_MS = 10_000;

/** Memory-only robots cache for the doctor — no D1. */
function createMemoryRobotsStore(): RobotsCacheStore {
  const cache = new Map<string, Awaited<ReturnType<typeof checkRobots>>>();

  return {
    async get(origin: string) {
      return cache.get(origin) ?? null;
    },
    async put(entry: Awaited<ReturnType<typeof checkRobots>>) {
      cache.set(entry.origin, entry);
    },
  };
}

function getSourceById(sourceId: string): Source | undefined {
  const allSources = applyAutoPauses(sources, autoPauseEntries);
  return allSources.find((s) => s.id === sourceId);
}

function isAtsSource(source: Source): boolean {
  return source.id.startsWith("ats:") || source.type === "ats";
}

function getAtsPlatformAndToken(sourceId: string): { platform: AtsPlatform; token: string } | null {
  // ATS sources are represented as platform:token in scrape.ts
  // For static doctor, we only have static sources. ATS is handled separately.
  return null;
}

async function probeStaticSource(
  source: Source,
  observedAt: string,
  startTime: number,
  requestCount: { current: number },
  bytesReceived: { current: number },
  activePath: ActivePath,
  probes: DiagnosticProbe[]
): Promise<Partial<SourceDoctorResult["diagnostic"]>> {
  const { url, type, collectionMethod } = source;

  // Compliance check
  activePath.stages.push("compliance_check");
  probes.push({
    name: "compliance",
    passed: source.complianceStatus === "allowed",
    detail: source.complianceStatus === "allowed" ? "allowed" : `status=${source.complianceStatus}`,
  });

  if (source.complianceStatus !== "allowed") {
    activePath.complianceStatus = source.complianceStatus;
    activePath.paused = source.complianceStatus === "paused";
    if (source.complianceNotes) {
      activePath.pauseReason = source.complianceNotes;
    }
    return { outcome: "POLICY_BLOCKED" as DoctorOutcome };
  }

  // Cadence check
  activePath.stages.push("cadence_check");
  activePath.complianceStatus = source.complianceStatus;

  // Note: We don't have access to sourceFetchState D1 in the doctor (no D1 writes/reads)
  // So we report cadence as not_checked but include the configured interval
  probes.push({
    name: "cadence",
    passed: true,
    detail: source.minFetchIntervalMinutes
      ? `min interval ${source.minFetchIntervalMinutes} min (state not checked — read-only)`
      : "no interval configured",
  });
  activePath.cadenceSkipped = false;
  activePath.cadenceReason = "read-only mode — sourceFetchState not queried";

  // Robots check
  activePath.stages.push("robots_check");
  const memStore = createMemoryRobotsStore();
  const robotsResult = await checkRobots(url, {
    store: memStore,
    mode: "observe",
    userAgent: "Mozilla/5.0 (compatible; RemotePHJobsBot/1.0; +SourceDoctor/1.0)",
    timeoutMs: FETCH_TIMEOUT_MS,
  });
  requestCount.current += 1;
  activePath.robotsChecked = true;
  activePath.robotsVerdict = robotsResult.verdict;
  activePath.robotsFromCache = robotsResult.fromCache;

  probes.push({
    name: "robots",
    passed: robotsResult.verdict === "allowed",
    detail: `verdict=${robotsResult.verdict}, evidence=${robotsResult.evidence.slice(0, 120)}`,
  });

  if (robotsResult.wouldBlock) {
    // In observe mode, we still attempt the fetch but record wouldBlock
    activePath.robotsVerdict = `${robotsResult.verdict} (wouldBlock)`;
  }

  // Fetch attempt
  activePath.stages.push("fetch_attempt");
  activePath.url = url;
  activePath.method = collectionMethod;

  let fetchStatus: number | undefined;
  let fetchLatencyMs: number;
  let body: string | null = null;
  let fetchError: string | undefined;

  const fetchStart = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; RemotePHJobsBot/1.0; +SourceDoctor/1.0)",
        Accept: type === "json" ? "application/json" : "application/rss+xml, application/xml, text/xml",
      },
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timeoutId);

    fetchLatencyMs = Date.now() - fetchStart;
    fetchStatus = res.status;
    requestCount.current += 1;

    if (res.ok) {
      const text = await res.text();
      bytesReceived.current += text.length;
      // Parse the full body: the text is already fully in memory, and
      // truncating here once produced a false SCHEMA_BROKEN ("CDATA is not
      // closed.") for any feed larger than the old 256 KiB slice (SRC-4E/REL-11).
      body = text;
    } else {
      fetchError = `HTTP ${res.status}`;
    }
  } catch (error) {
    fetchLatencyMs = Date.now() - fetchStart;
    fetchError = error instanceof Error ? error.message : String(error);
    requestCount.current += 1;
  }

  activePath.fetchAttempted = true;
  activePath.fetchStatus = fetchStatus;
  activePath.fetchLatencyMs = fetchLatencyMs;
  activePath.bytesReceived = bytesReceived.current;

  if (fetchError) {
    probes.push({
      name: "fetch",
      passed: false,
      detail: fetchError,
    });

    // Classify the error
    const lowerError = fetchError.toLowerCase();
    if (lowerError.includes("429") || lowerError.includes("rate limit")) {
      return { outcome: "RATE_LIMITED" as DoctorOutcome };
    }
    if (lowerError.includes("timeout") || lowerError.includes("econnrefused") || lowerError.includes("enotfound") || lowerError.includes("dns")) {
      return { outcome: "UNREACHABLE" as DoctorOutcome };
    }
    return { outcome: "UNREACHABLE" as DoctorOutcome };
  }

  probes.push({
    name: "fetch",
    passed: true,
    detail: `HTTP ${fetchStatus}, ${bytesReceived.current} bytes, ${fetchLatencyMs}ms`,
  });

  // Parse attempt
  activePath.stages.push("parse_attempt");
  activePath.parseAttempted = true;

  let itemCount = 0;
  let parseError: string | undefined;

  try {
    if (!body) {
      parseError = "No response body to parse";
    } else {
      switch (type) {
        case "rss":
          itemCount = parseRSSFeed(body);
          break;
        case "html":
          itemCount = parseHTMLSource(body);
          break;
        case "json":
          itemCount = parseJSONSource(body);
          break;
        default:
          parseError = `Unknown source type: ${type}`;
      }
    }
  } catch (error) {
    parseError = error instanceof Error ? error.message : String(error);
  }

  activePath.itemCount = itemCount;

  if (parseError) {
    probes.push({
      name: "parse",
      passed: false,
      detail: parseError,
    });
    return { outcome: "SCHEMA_BROKEN" as DoctorOutcome };
  }

  probes.push({
    name: "parse",
    passed: true,
    detail: `${itemCount} items parsed`,
  });

  // Validation
  activePath.stages.push("validation");

  if (itemCount === 0) {
    return { outcome: "HEALTHY_EMPTY" as DoctorOutcome };
  }

  return { outcome: "HEALTHY_WITH_RESULTS" as DoctorOutcome };
}

// Direct RSS parser for doctor (no D1 dependencies)
function parseRSSFeed(xml: string): number {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    processEntities: false,
    htmlEntities: true,
  });

  const parsed = parser.parse(xml);
  const channel = parsed?.rss?.channel ?? parsed?.feed;
  const rawItems = channel?.item ?? channel?.entry ?? [];
  const items = Array.isArray(rawItems) ? rawItems : [rawItems];

  // Count items with title and link/id
  return items.filter((item) => item.title && (item.link ?? item.id)).length;
}

// Direct HTML parser for doctor (simplified)
function parseHTMLSource(html: string): number {
  // Very basic HTML parsing - count potential job links
  // This is a simplified version; real implementation would be more robust
  const jobLinkPatterns = [
    /<a[^>]+href=["'][^"']*job[^"']*["'][^>]*>/gi,
    /<a[^>]+href=["'][^"']*position[^"']*["'][^>]*>/gi,
    /<a[^>]+href=["'][^"']*career[^"']*["'][^>]*>/gi,
  ];

  let count = 0;
  for (const pattern of jobLinkPatterns) {
    const matches = html.match(pattern);
    if (matches) count += matches.length;
  }

  // If no job-specific links found, count all links as a rough estimate
  if (count === 0) {
    const allLinks = html.match(/<a[^>]+href=["'][^"']+["'][^>]*>/gi);
    if (allLinks) count = Math.min(allLinks.length, 100); // Cap at 100
  }

  return count;
}

// Direct JSON parser for doctor
function parseJSONSource(jsonText: string): number {
  try {
    const data = JSON.parse(jsonText);

    // Handle Remote OK format: array of jobs
    if (Array.isArray(data)) {
      return data.filter((item) => item && (item.url || item.apply_url || item.link)).length;
    }

    // Handle object with jobs array
    if (data && typeof data === "object") {
      const jobs = data.jobs || data.results || data.data || data.items;
      if (Array.isArray(jobs)) {
        return jobs.filter((item) => item && (item.url || item.apply_url || item.link || item.absolute_url)).length;
      }
    }

    return 0;
  } catch {
    return 0;
  }
}

async function probeAtsSource(
  platform: AtsPlatform,
  token: string,
  companyName: string,
  observedAt: string,
  startTime: number,
  requestCount: { current: number },
  bytesReceived: { current: number },
  activePath: ActivePath,
  probes: DiagnosticProbe[]
): Promise<Partial<SourceDoctorResult["diagnostic"]>> {
  const url = atsEndpointUrl(platform, token);

  // Compliance: ATS sources are always needs_review per policy
  activePath.stages.push("compliance_check");
  activePath.complianceStatus = "needs_review";
  probes.push({
    name: "compliance",
    passed: true,
    detail: "ATS source — complianceStatus=needs_review (policy)",
  });

  // Cadence: not checked in read-only mode
  activePath.stages.push("cadence_check");
  activePath.cadenceSkipped = false;
  activePath.cadenceReason = "read-only mode — sourceFetchState not queried";
  probes.push({
    name: "cadence",
    passed: true,
    detail: "not checked (read-only)",
  });

  // Robots check
  activePath.stages.push("robots_check");
  const memStore = createMemoryRobotsStore();
  const robotsResult = await checkRobots(url, {
    store: memStore,
    mode: "observe",
    userAgent: "Mozilla/5.0 (compatible; RemotePHJobsBot/1.0; +SourceDoctor/1.0)",
    timeoutMs: FETCH_TIMEOUT_MS,
  });
  requestCount.current += 1;
  activePath.robotsChecked = true;
  activePath.robotsVerdict = robotsResult.verdict;
  activePath.robotsFromCache = robotsResult.fromCache;

  probes.push({
    name: "robots",
    passed: robotsResult.verdict === "allowed",
    detail: `verdict=${robotsResult.verdict}, evidence=${robotsResult.evidence.slice(0, 120)}`,
  });

  // Fetch attempt
  activePath.stages.push("fetch_attempt");
  activePath.url = url;
  activePath.method = "public_ats_json";

  let fetchStatus: number | undefined;
  let fetchLatencyMs: number;
  let fetchError: string | undefined;

  const fetchStart = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; RemotePHJobsBot/1.0; +SourceDoctor/1.0)",
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      method: platform === "workable" ? "POST" : "GET",
      body: platform === "workable" ? JSON.stringify({ query: "", location: [], department: [], worktype: [], remote: [] }) : undefined,
      redirect: "follow",
    });
    clearTimeout(timeoutId);

    fetchLatencyMs = Date.now() - fetchStart;
    fetchStatus = res.status;
    requestCount.current += 1;

    if (res.ok) {
      const text = await res.text();
      bytesReceived.current += text.length;
    } else {
      fetchError = `HTTP ${res.status}`;
    }
  } catch (error) {
    fetchLatencyMs = Date.now() - fetchStart;
    fetchError = error instanceof Error ? error.message : String(error);
    requestCount.current += 1;
  }

  activePath.fetchAttempted = true;
  activePath.fetchStatus = fetchStatus;
  activePath.fetchLatencyMs = fetchLatencyMs;
  activePath.bytesReceived = bytesReceived.current;

  if (fetchError) {
    probes.push({
      name: "fetch",
      passed: false,
      detail: fetchError,
    });

    const lowerError = fetchError.toLowerCase();
    if (lowerError.includes("429") || lowerError.includes("rate limit")) {
      return { outcome: "RATE_LIMITED" as DoctorOutcome };
    }
    if (lowerError.includes("timeout") || lowerError.includes("econnrefused") || lowerError.includes("enotfound") || lowerError.includes("dns")) {
      return { outcome: "UNREACHABLE" as DoctorOutcome };
    }
    return { outcome: "UNREACHABLE" as DoctorOutcome };
  }

  probes.push({
    name: "fetch",
    passed: true,
    detail: `HTTP ${fetchStatus}, ${bytesReceived.current} bytes, ${fetchLatencyMs}ms`,
  });

  // Parse attempt
  activePath.stages.push("parse_attempt");
  activePath.parseAttempted = true;

  let itemCount = 0;
  let parseError: string | undefined;

  try {
    const items = await fetchATSFeed(platform, token, companyName);
    itemCount = items.length;
  } catch (error) {
    parseError = error instanceof Error ? error.message : String(error);
  }

  activePath.itemCount = itemCount;

  if (parseError) {
    probes.push({
      name: "parse",
      passed: false,
      detail: parseError,
    });
    return { outcome: "SCHEMA_BROKEN" as DoctorOutcome };
  }

  probes.push({
    name: "parse",
    passed: true,
    detail: `${itemCount} items parsed`,
  });

  // Validation
  activePath.stages.push("validation");

  if (itemCount === 0) {
    return { outcome: "HEALTHY_EMPTY" as DoctorOutcome };
  }

  return { outcome: "HEALTHY_WITH_RESULTS" as DoctorOutcome };
}

export async function runSourceDoctor(
  sourceId: string,
  options: { commit?: string; json?: boolean } = {}
): Promise<SourceDoctorResult> {
  const startTime = Date.now();
  const observedAt = new Date().toISOString();
  const commit = options.commit ?? "unknown";

  const requestCount = { current: 0 };
  const bytesReceived = { current: 0 };

  const source = getSourceById(sourceId);
  if (!source) {
    return {
      version: DOCTOR_VERSION,
      commit,
      timestamp: observedAt,
      sourceId,
      sourceName: "unknown",
      sourceFamily: "unknown",
      sourceType: "static",
      activePath: {
        stages: ["compliance_check"],
        complianceStatus: "deprecated" as ComplianceStatus,
        error: `Source not found: ${sourceId}`,
      },
      diagnostic: {
        outcome: "UNKNOWN",
        probes: [{ name: "source_lookup", passed: false, detail: `Source not found: ${sourceId}` }],
        requestCount: 0,
        bytesReceived: 0,
        durationMs: Date.now() - startTime,
        mutations: 0,
      },
      redactedError: `Source not found: ${sourceId}`,
    };
  }

  const activePath: ActivePath = {
    stages: [],
    complianceStatus: source.complianceStatus,
  };

  const probes: DiagnosticProbe[] = [];

  let outcome: DoctorOutcome = "UNKNOWN";

  if (sourceId.startsWith("ats:")) {
    // ATS source format: "ats:platform:token" or similar
    // For now, we don't have static ATS sources in the registry
    // They come from va_directory at runtime
    outcome = "UNKNOWN";
    probes.push({ name: "source_type", passed: false, detail: "ATS sources require runtime directory lookup" });
  } else {
    // Static source
    const result = await probeStaticSource(
      source,
      observedAt,
      startTime,
      requestCount,
      bytesReceived,
      activePath,
      probes
    );
    outcome = result.outcome ?? "UNKNOWN";
    activePath.sourceName = source.name;
    activePath.sourceFamily = source.platform;
  }

  activePath.stages.push("complete");

  const result: SourceDoctorResult = {
    version: DOCTOR_VERSION,
    commit,
    timestamp: observedAt,
    sourceId,
    sourceName: source.name,
    sourceFamily: source.platform,
    sourceType: sourceId.startsWith("ats:") ? "ATS" : "static",
    activePath,
    diagnostic: {
      outcome,
      probes,
      requestCount: requestCount.current,
      bytesReceived: bytesReceived.current,
      durationMs: Date.now() - startTime,
      mutations: 0,
    },
  };

  if (options.json) {
    // JSON output handled by caller
  }

  return result;
}

export { DoctorOutcome, ActivePath, SourceDoctorResult, DOCTOR_VERSION };