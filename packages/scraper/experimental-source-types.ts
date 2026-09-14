/**
 * Experimental Source Capability Types
 * 
 * Defines data contracts for bounded experimental ingestion via Crawl4AI OSS
 * and Cloudflare Kitesurf beside the active patience-mode control group.
 * 
 * INVARIANT: Zero publishing, zero modification of existing shadow sources.
 */

export interface NormalizedOpportunity {
  id: string;
  title: string;
  company: string;
  category: string;
  applicationUrl: string;
  tags: string[];
  publishedAt: string;
  is_active: number;
  location?: string;
  descriptionSnippet?: string;
}

export type ExperimentalCapabilityType = "crawl4ai" | "kitesurf";

export type ExperimentalFailureClass =
  | "BROWSER_REQUIRED"
  | "JS_HYDRATION_REQUIRED"
  | "CLIENT_PAGINATION_REQUIRED"
  | "LOAD_MORE_REQUIRED"
  | "SPA_NAVIGATION_REQUIRED"
  | "RATE_LIMITED"
  | "POLICY_BLOCKED"
  | "NETWORK_FAILURE"
  | "SCHEMA_BROKEN"
  | "EMPTY_NO_JOBS"
  | "CRAWL_EXHAUSTED"
  | "BROWSER_RENDER_FAILURE"
  | "UNKNOWN_FAILURE";

export interface ExperimentalCandidate {
  id: string;
  companyName: string;
  careerUrl: string;
  domain: string;
  sourceNiche: string;
  directoryId?: number;
  sampleJobTitle?: string;
  discoveryProvenance: string;
}

export interface RawExtractedJob {
  title: string;
  url: string;
  company?: string;
  location?: string;
  descriptionSnippet?: string;
  publishedAt?: string;
  department?: string;
  employmentType?: string;
  isRemoteHint?: boolean;
}

export interface ExtractionResult {
  capability: ExperimentalCapabilityType;
  success: boolean;
  runtimeMs: number;
  pagesVisited: number;
  bytesReceived: number;
  items: RawExtractedJob[];
  failureClass?: ExperimentalFailureClass;
  browserRequiredEvidence?: string;
  stopReason?: string;
}

export interface SourceExperimentMetrics {
  sourceId: string;
  domain: string;
  companyName: string;
  attempt: number;
  capability: ExperimentalCapabilityType;
  pagesVisited: number;
  runtimeMs: number;
  bytesReceived: number;
  candidateJobs: number;
  validJobs: number;
  invalidJobs: number;
  alreadyKnownJobs: number;
  incrementalUniqueJobs: number;
  remoteJobs: number;
  phEligibleJobs: number;
  roleRelevantJobs: number;
  freshJobs: number;
  netNewQualifiedYield: number;
  failureClass?: ExperimentalFailureClass;
  escalatedToKitesurf: boolean;
}

export interface FilteredPipelineJob {
  normalized: NormalizedOpportunity;
  isValid: boolean;
  isDuplicate: boolean;
  isRemote: boolean;
  isPhEligible: boolean;
  isRoleRelevant: boolean;
  isFresh: boolean;
  isNetNewQualified: boolean;
  rejectionReason?: string;
}

export interface ExperimentalBatchSummary {
  cohortSize: number;
  crawl4aiAttempts: number;
  crawl4aiSuccesses: number;
  crawl4aiFailures: number;
  kitesurfAttempts: number;
  kitesurfSuccesses: number;
  kitesurfFailures: number;
  browserEscalationCount: number;
  browserEscalationRate: number;
  totalCandidateJobs: number;
  totalValidJobs: number;
  totalIncrementalUniqueJobs: number;
  totalRemoteJobs: number;
  totalPhEligibleJobs: number;
  totalRoleRelevantJobs: number;
  totalFreshJobs: number;
  totalNetNewQualifiedYield: number;
  sourcesWithYield: number;
  averageNetNewPerSource: number;
  failureBreakdown: Record<ExperimentalFailureClass, number>;
}
