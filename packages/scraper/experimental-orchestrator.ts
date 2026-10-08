/**
 * Experimental Orchestrator: Crawl4AI + Cloudflare Kitesurf
 * 
 * Coordinates the bounded experimental pipeline:
 * 1. Checks candidate for existing deterministic ATS / feed support
 * 2. Runs Crawl4AI (Phase A)
 * 3. Escalates to Kitesurf (Phase B) ONLY when browser requirement is proven
 * 4. Filters candidate listings through schema validation, deduplication,
 *    geo/PH-eligibility gates, role taxonomy gates, and freshness gates.
 * 5. Computes net-new qualified yield:
 *    NET_NEW = RAW -> VALID -> NOT_IN_EXISTING -> REMOTE -> PH_ELIGIBLE -> ROLE_RELEVANT -> FRESH
 * 
 * INVARIANT: Zero publishing. All experimental yields remain isolated.
 */

import { extractAtsToken } from "./prospector";
import { geoGate, type GeoScope, type GeoVerdict } from "./geoGate";
import { executeCrawl4Ai, type Crawl4AiOptions } from "./crawl4ai-capability";
import { executeKitesurf, qualifiesForKitesurfEscalation, type KitesurfOptions } from "./kitesurf-capability";
import type {
  ExperimentalCandidate,
  ExtractionResult,
  RawExtractedJob,
  SourceExperimentMetrics,
  FilteredPipelineJob,
  ExperimentalBatchSummary,
  ExperimentalFailureClass,
} from "./experimental-source-types";

// ─── Target Role Families ───────────────────────────────────────────────────

export const ROLE_FAMILY_PATTERNS: Record<string, RegExp> = {
  virtual_assistant_operations:
    /\b(virtual assistant|executive assistant|general va|operations assistant|operations manager|administrative assistant|admin assistant|bookkeeper|bookkeeping|data entry|coordinator|office coordinator|scheduler|personal assistant|back office|receptionist)\b/i,
  customer_support:
    /\b(customer support|customer service|client support|client success|customer care|support specialist|support representative|support agent|technical support|help desk|chat support|tier 1 support|tier 2 support)\b/i,
  ai_builder_ops:
    /\b(ai builder|applied ai|ai operations|ai engineer|prompt engineer|ai trainer|ai annotation|ai evaluator|automation specialist|workflow automation|zapier|make\.com|n8n|machine learning|llm ops)\b/i,
  writing_documentation:
    /\b(technical writer|technical writing|documentation specialist|documentation engineer|knowledge management|knowledge manager|content writer|copywriter|writer|editor|proofreader|blog writer|creative writer|proposal writer)\b/i,
  adjacent_professional:
    /\b(social media manager|community manager|video editor|graphic designer|marketing assistant|seo specialist|accountant|frontend developer|web developer|qa tester|recruiter|talent acquisition)\b/i,
};

/**
 * Whether a geoGate verdict describes work a remote worker can actually take.
 *
 * This is an allowlist on purpose. geoGate emits `region_excl_ph` when the
 * posting restricts the region or the residence/work authorization in a way
 * that excludes the Philippines, and CONSTITUTION §3.2 #2 is explicit that a
 * bare label is not proof of PH remoteness — a region that excludes PH is not
 * remote work for this product. A deny-list (`!== "country_locked" && !==
 * "unknown"`) read every other scope as remote, so a `region_excl_ph` verdict
 * was reported as `isRemote: true` and counted into `metrics.remoteJobs`, the
 * funnel number used to decide which experimental sources get more compute.
 * Adding a member to `GeoScope` later therefore also fails closed here: a new
 * scope is not remote until someone classifies it deliberately.
 */
export function isRemoteGeoScope(geoScope: GeoScope): boolean {
  return geoScope === "worldwide" || geoScope === "apac_incl_ph" || geoScope === "ph_only";
}

export function evaluateRoleRelevance(title: string, descriptionSnippet?: string): {
  isRelevant: boolean;
  roleFamily?: string;
  category: "admin" | "customer-service" | "writing" | "ai" | "tech" | "marketing" | "design" | "other";
} {
  const text = `${title} ${descriptionSnippet || ""}`;

  if (ROLE_FAMILY_PATTERNS.virtual_assistant_operations.test(text)) {
    return { isRelevant: true, roleFamily: "virtual_assistant_operations", category: "admin" };
  }
  if (ROLE_FAMILY_PATTERNS.customer_support.test(text)) {
    return { isRelevant: true, roleFamily: "customer_support", category: "customer-service" };
  }
  if (ROLE_FAMILY_PATTERNS.ai_builder_ops.test(text)) {
    return { isRelevant: true, roleFamily: "ai_builder_ops", category: "ai" };
  }
  if (ROLE_FAMILY_PATTERNS.writing_documentation.test(text)) {
    return { isRelevant: true, roleFamily: "writing_documentation", category: "writing" };
  }
  if (ROLE_FAMILY_PATTERNS.adjacent_professional.test(text)) {
    return { isRelevant: true, roleFamily: "adjacent_professional", category: "marketing" };
  }

  return { isRelevant: false, category: "other" };
}

/**
 * Freshness is a claim about the SOURCE's posting date, so it can only be
 * answered from a date the source actually stated. An absent, blank or
 * unparseable date is unknown, not fresh: `unknown_date_policy` is
 * retain-unknown-do-not-publish, and CONSTITUTION §1.3 #2 forbids substituting
 * fetch time for a missing posting timestamp. Fails closed — callers withhold.
 */
export function isOpportunityFresh(publishedAt?: string, maxAgeDays = 30, nowMs = Date.now()): boolean {
  if (typeof publishedAt !== "string" || publishedAt.trim() === "") return false;
  if (!Number.isFinite(nowMs) || !Number.isFinite(maxAgeDays) || maxAgeDays < 0) return false;
  const parsed = Date.parse(publishedAt);
  if (Number.isNaN(parsed)) return false;
  const ageDays = (nowMs - parsed) / (1000 * 60 * 60 * 24);
  return ageDays >= 0 && ageDays <= maxAgeDays;
}

/**
 * The source's posting date verbatim, or null when it stated none that parses.
 * Never the fetch time. A whitespace-padded value does not parse and is
 * therefore withheld rather than repaired — repairing it would be this code
 * inventing a date the source did not state in that form.
 */
function statedPostedAt(publishedAt?: string): string | null {
  if (typeof publishedAt !== "string" || publishedAt.trim() === "") return null;
  return Number.isNaN(Date.parse(publishedAt)) ? null : publishedAt;
}

export interface ExperimentalPipelineOptions {
  crawl4aiOptions?: Crawl4AiOptions;
  kitesurfOptions?: KitesurfOptions;
  knownUrls?: Set<string>;
  knownTitles?: Set<string>;
  skipAtsCheck?: boolean;
}

/**
 * Execute the experimental pipeline for a single candidate.
 */
export async function runExperimentalSourcePipeline(
  candidate: ExperimentalCandidate,
  options: ExperimentalPipelineOptions = {},
): Promise<{
  metrics: SourceExperimentMetrics;
  jobs: FilteredPipelineJob[];
  extraction: ExtractionResult;
}> {
  const start = Date.now();
  const knownUrls = options.knownUrls ?? new Set<string>();
  const knownTitles = options.knownTitles ?? new Set<string>();

  // 1. Mandatory Priority Gate: Existing Deterministic Sources Win
  if (!options.skipAtsCheck) {
    const existingAts = extractAtsToken(candidate.careerUrl);
    if (existingAts) {
      return {
        metrics: {
          sourceId: candidate.id,
          domain: candidate.domain,
          companyName: candidate.companyName,
          attempt: 1,
          capability: "crawl4ai",
          pagesVisited: 0,
          runtimeMs: 0,
          bytesReceived: 0,
          candidateJobs: 0,
          validJobs: 0,
          invalidJobs: 0,
          alreadyKnownJobs: 0,
          incrementalUniqueJobs: 0,
          remoteJobs: 0,
          phEligibleJobs: 0,
          roleRelevantJobs: 0,
          freshJobs: 0,
          netNewQualifiedYield: 0,
          failureClass: "POLICY_BLOCKED",
          escalatedToKitesurf: false,
        },
        jobs: [],
        extraction: {
          capability: "crawl4ai",
          success: false,
          runtimeMs: 0,
          pagesVisited: 0,
          bytesReceived: 0,
          items: [],
          failureClass: "POLICY_BLOCKED",
          stopReason: `Known ATS mechanism (${existingAts.platform}) exists — route to standard ATS adapter`,
        },
      };
    }
  }

  // 2. Phase A: Crawl4AI Extraction
  let extractionResult = await executeCrawl4Ai(candidate, options.crawl4aiOptions);
  let escalatedToKitesurf = false;

  // 3. Phase B: Kitesurf Escalation (earned by browser failure evidence ONLY)
  if (qualifiesForKitesurfEscalation(extractionResult)) {
    escalatedToKitesurf = true;
    const kitesurfResult = await executeKitesurf(candidate, extractionResult, options.kitesurfOptions);
    // If Kitesurf ran, replace extraction result with Kitesurf output
    extractionResult = kitesurfResult;
  }

  // 4. Ingestion Funnel & Pipeline Accounting
  const rawItems = extractionResult.items;
  const filteredJobs: FilteredPipelineJob[] = [];

  let candidateJobs = rawItems.length;
  let validJobs = 0;
  let invalidJobs = 0;
  let alreadyKnownJobs = 0;
  let incrementalUniqueJobs = 0;
  let remoteJobs = 0;
  let phEligibleJobs = 0;
  let roleRelevantJobs = 0;
  let freshJobs = 0;
  let netNewQualifiedYield = 0;

  for (const raw of rawItems) {
    // Step A: Schema Validation
    const hasValidTitle = typeof raw.title === "string" && raw.title.trim().length >= 4;
    const hasValidUrl = typeof raw.url === "string" && raw.url.startsWith("http");

    if (!hasValidTitle || !hasValidUrl) {
      invalidJobs++;
      filteredJobs.push({
        normalized: {
          id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          title: raw.title || "Untitled",
          company: raw.company || candidate.companyName,
          category: "other",
          applicationUrl: raw.url || candidate.careerUrl,
          tags: ["experimental"],
          publishedAt: statedPostedAt(raw.publishedAt),
          is_active: 0, // INVARIANT: NEVER ACTIVE
        },
        isValid: false,
        isDuplicate: false,
        isRemote: false,
        isPhEligible: false,
        isRoleRelevant: false,
        isFresh: false,
        isNetNewQualified: false,
        rejectionReason: "SCHEMA_INVALID",
      });
      continue;
    }
    validJobs++;

    // Step B: Deduplication against known inventory
    const urlNormalized = raw.url.toLowerCase().split("?")[0].replace(/\/+$/, "");
    const titleNormalized = raw.title.toLowerCase().replace(/\s+/g, " ").trim();
    const isDuplicate = knownUrls.has(urlNormalized) || knownTitles.has(titleNormalized);

    if (isDuplicate) {
      alreadyKnownJobs++;
    } else {
      incrementalUniqueJobs++;
    }

    // Step C: Geo & Remote Filtering (geoGate)
    const geoGateVerdict: GeoVerdict = geoGate({
      title: raw.title,
      description: raw.descriptionSnippet || null,
      locationRaw: raw.location || "Remote",
    });

    const isRemote = isRemoteGeoScope(geoGateVerdict.geoScope);
    const isPhEligible =
      geoGateVerdict.phEligibility === "eligible_verified" ||
      geoGateVerdict.phEligibility === "eligible_likely";

    if (isRemote) remoteJobs++;
    if (isPhEligible) phEligibleJobs++;

    // Step D: Role Family & Taxonomy Gate
    const roleCheck = evaluateRoleRelevance(raw.title, raw.descriptionSnippet);
    if (roleCheck.isRelevant) roleRelevantJobs++;

    // Step E: Freshness Gate — an undated listing is withheld, never assumed fresh.
    const postedAt = statedPostedAt(raw.publishedAt);
    const isFresh = isOpportunityFresh(raw.publishedAt);
    if (isFresh) freshJobs++;

    // Step F: Primary Success KPI Calculation
    const isNetNewQualified =
      !isDuplicate && isRemote && isPhEligible && roleCheck.isRelevant && isFresh;

    if (isNetNewQualified) {
      netNewQualifiedYield++;
    }

    const geoIneligible = `GEO_INELIGIBLE: ${geoGateVerdict.evidence}`;
    let rejectionReason: string | undefined;
    if (isDuplicate) rejectionReason = "DUPLICATE";
    // A region exclusion is a PH-eligibility finding, so it keeps the gate's
    // evidence instead of collapsing into the generic not-remote label.
    else if (!isRemote)
      rejectionReason = geoGateVerdict.geoScope === "region_excl_ph" ? geoIneligible : "NOT_REMOTE";
    else if (!isPhEligible) rejectionReason = geoIneligible;
    else if (!roleCheck.isRelevant) rejectionReason = "ROLE_IRRELEVANT";
    else if (!isFresh) rejectionReason = postedAt === null ? "DATE_UNKNOWN" : "STALE";

    filteredJobs.push({
      normalized: {
        id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: raw.title.trim(),
        company: raw.company?.trim() || candidate.companyName,
        category: roleCheck.category,
        applicationUrl: raw.url,
        tags: ["experimental", extractionResult.capability],
        publishedAt: statedPostedAt(raw.publishedAt),
        is_active: 0, // INVARIANT: NEVER ACTIVE
      },
      isValid: true,
      isDuplicate,
      isRemote,
      isPhEligible,
      isRoleRelevant: roleCheck.isRelevant,
      isFresh,
      isNetNewQualified,
      rejectionReason,
    });
  }

  const metrics: SourceExperimentMetrics = {
    sourceId: candidate.id,
    domain: candidate.domain,
    companyName: candidate.companyName,
    attempt: 1,
    capability: extractionResult.capability,
    pagesVisited: extractionResult.pagesVisited,
    runtimeMs: Date.now() - start,
    bytesReceived: extractionResult.bytesReceived,
    candidateJobs,
    validJobs,
    invalidJobs,
    alreadyKnownJobs,
    incrementalUniqueJobs,
    remoteJobs,
    phEligibleJobs,
    roleRelevantJobs,
    freshJobs,
    netNewQualifiedYield,
    failureClass: extractionResult.failureClass,
    escalatedToKitesurf,
  };

  return {
    metrics,
    jobs: filteredJobs,
    extraction: extractionResult,
  };
}

/**
 * Aggregate metrics across a batch of experimental candidates.
 */
export function summarizeBatchResults(metricsList: SourceExperimentMetrics[]): ExperimentalBatchSummary {
  let crawl4aiAttempts = 0;
  let crawl4aiSuccesses = 0;
  let crawl4aiFailures = 0;
  let kitesurfAttempts = 0;
  let kitesurfSuccesses = 0;
  let kitesurfFailures = 0;
  let browserEscalationCount = 0;

  let totalCandidateJobs = 0;
  let totalValidJobs = 0;
  let totalIncrementalUniqueJobs = 0;
  let totalRemoteJobs = 0;
  let totalPhEligibleJobs = 0;
  let totalRoleRelevantJobs = 0;
  let totalFreshJobs = 0;
  let totalNetNewQualifiedYield = 0;
  let sourcesWithYield = 0;

  const failureBreakdown: Record<ExperimentalFailureClass, number> = {
    BROWSER_REQUIRED: 0,
    JS_HYDRATION_REQUIRED: 0,
    CLIENT_PAGINATION_REQUIRED: 0,
    LOAD_MORE_REQUIRED: 0,
    SPA_NAVIGATION_REQUIRED: 0,
    RATE_LIMITED: 0,
    POLICY_BLOCKED: 0,
    NETWORK_FAILURE: 0,
    SCHEMA_BROKEN: 0,
    EMPTY_NO_JOBS: 0,
    CRAWL_EXHAUSTED: 0,
    BROWSER_RENDER_FAILURE: 0,
    UNKNOWN_FAILURE: 0,
  };

  for (const m of metricsList) {
    if (m.capability === "crawl4ai") {
      crawl4aiAttempts++;
      if (m.candidateJobs > 0) crawl4aiSuccesses++;
      else crawl4aiFailures++;
    } else if (m.capability === "kitesurf") {
      kitesurfAttempts++;
      if (m.candidateJobs > 0) kitesurfSuccesses++;
      else kitesurfFailures++;
    }

    if (m.escalatedToKitesurf) {
      browserEscalationCount++;
    }

    if (m.failureClass && failureBreakdown[m.failureClass] !== undefined) {
      failureBreakdown[m.failureClass]++;
    }

    totalCandidateJobs += m.candidateJobs;
    totalValidJobs += m.validJobs;
    totalIncrementalUniqueJobs += m.incrementalUniqueJobs;
    totalRemoteJobs += m.remoteJobs;
    totalPhEligibleJobs += m.phEligibleJobs;
    totalRoleRelevantJobs += m.roleRelevantJobs;
    totalFreshJobs += m.freshJobs;
    totalNetNewQualifiedYield += m.netNewQualifiedYield;

    if (m.netNewQualifiedYield > 0) {
      sourcesWithYield++;
    }
  }

  const cohortSize = metricsList.length;
  const browserEscalationRate = cohortSize > 0 ? browserEscalationCount / cohortSize : 0;
  const averageNetNewPerSource = cohortSize > 0 ? totalNetNewQualifiedYield / cohortSize : 0;

  return {
    cohortSize,
    crawl4aiAttempts,
    crawl4aiSuccesses,
    crawl4aiFailures,
    kitesurfAttempts,
    kitesurfSuccesses,
    kitesurfFailures,
    browserEscalationCount,
    browserEscalationRate,
    totalCandidateJobs,
    totalValidJobs,
    totalIncrementalUniqueJobs,
    totalRemoteJobs,
    totalPhEligibleJobs,
    totalRoleRelevantJobs,
    totalFreshJobs,
    totalNetNewQualifiedYield,
    sourcesWithYield,
    averageNetNewPerSource,
    failureBreakdown,
  };
}
