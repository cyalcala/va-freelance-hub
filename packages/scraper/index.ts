export { fetchRSSFeed } from "./rss";
export { fetchHTMLSource } from "./html";
export { fetchJSONSource } from "./json";
export { disabledSources, enabledSources, isEnabledSource, sources, rssSources, htmlSources, jsonSources } from "./sources";
export { triageJob, skepticEligibilityCheck, isObviousGeoRestriction } from "./triage";
export type { TriageContext, SkepticVerdict } from "./triage";
export { geoGate, detectDominantLanguage, scanLandingPageForGeoLock, htmlToVisibleText } from "./geoGate";
export type { GeoGateInput, GeoVerdict, GeoScope, PhEligibility } from "./geoGate";
export type { CollectionMethod, ComplianceStatus, Source, SourceType } from "./sources";
export type { TriageResult } from "./triage";
export { decideTriage, mapTriageCategoryToUiCategory } from "./triage-decision";
export type { TriageDecision, TriageDecisionInput } from "./triage-decision";
export { fetchATSFeed, fetchAshby, atsEndpointUrl } from "./ats";
export { conditionalFetchText, unchangedOutput } from "./conditional";
export type { ConditionalState, ConditionalResult, SourceFetchOutput } from "./conditional";
export { hashString, sha256Hex, errorMessage } from "./contentHash";
export {
  normalizeCompanyName, isQualityCompanyName, hostOf, isTrustedSourceUrl,
  extractAtsToken, inferNiche, classifyCandidates,
} from "./prospector";
export type { AtsRef, RawCandidate, ClassifiedCandidate, ClassifyResult } from "./prospector";
export { chunkArray, maxRowsPerD1Batch, D1_MAX_BOUND_PARAMETERS } from "./batch";
export { checkDirectoryLink, classifyLinkResponse, normalizeCheckUrl, classifyUnreachableError, UNREACHABLE_REASONS } from "./linkHealth";
export {
  COLLECTION_USER_AGENT,
  LINK_CHECK_USER_AGENT,
  CRAWLER_CONTACT_URL,
  CRAWLER_VERSION,
  collectionHeaders,
  linkCheckHeaders,
} from "./userAgent";
export {
  ROBOTS_USER_AGENT_TOKEN,
  parseRobotsTxt,
  selectGroup,
  evaluatePath,
  matchesPattern,
  isPathAllowed,
  robotsDecisionForStatus,
  allowsAiInput,
  robotsUrlFor,
} from "./robots";
export type { ParsedRobots, RobotsGroup, RobotsRule, RobotsDecision, RobotsVerdict, ContentSignals } from "./robots";
export {
  ROBOTS_CACHE_TTL_MS,
  ROBOTS_BODY_MAX_BYTES,
  checkRobots,
  decideFromEntry,
  originOf,
} from "./robotsGate";
export type { RobotsCacheEntry, RobotsCacheStore, RobotsGateResult, RobotsGateDeps, RobotsMode } from "./robotsGate";
export type { LinkStatus, LinkVerdict, UnreachableReason } from "./linkHealth";
export { isAutoPaused, autoPauseNote, autoPauseEntries, applyAutoPauses, validateAutoPauses } from "./pause";
export type { AutoPauseEntry } from "./pause";
export {
  resolvePolicy,
  fallbackPolicy,
  loadRegistryPolicies,
  ATS_PLATFORM_POLICIES,
  ATS_TOKEN_POLICIES,
  ROBOTS_ENFORCE_SOURCE_IDS as RESOLVER_ROBOTS_ENFORCE_SOURCE_IDS,
  robotsModeForSourceIdMirror,
  isPublishable,
  isShadowCanaryActive,
  KNOWN_SOURCE_IDS,
  KNOWN_STATIC_IDS,
  KNOWN_ATS_IDS,
} from "./policy-resolver";
export type {
  RegistryComplianceState,
  RegistryOperationalState,
  RegistryPolicyRow,
  ResolvedPolicy,
} from "./policy-resolver";
export {
  isValidOperationalTransition,
  isComplianceAllowsShadowCanaryActive,
  isComplianceHold,
  isOptedOut,
  canEnterShadow,
  canEnterCanary,
  canEnterActive,
  isPromotionBlocked,
  isReviewDeadlineOverdue,
  isPolicyExpired,
  isEvidenceLeaseExpired,
  isRenewalDue,
  computeReviewDeadline,
  computePolicyExpiry,
  applyLeaseExpiry,
  validateTransition,
  COMPLIANCE_STATES,
  OPERATIONAL_STATES,
} from "./source-lifecycle";
export type { ComplianceState, OperationalState } from "./source-lifecycle";
export {
  ATS_PROVIDER_CONFIG,
  providerConfigForPlatform,
  buildCandidateRow,
  distinctAtsCandidates,
  countBacklog,
  countReviewOverdue,
  summarizeCandidates,
  CANDIDATE_REVIEW_DEADLINE_DAYS,
  CANDIDATE_MAX_PER_RUN,
  CANDIDATE_ANOMALY_CEILING,
  CANDIDATE_INSERT_COLUMNS,
  maxRegistryRowsPerBatch,
} from "./prospect-candidate";
export type { ProviderConfig, CandidateRow } from "./prospect-candidate";
export {
  findRepeatedCrossCompanyApplyHosts,
  sanitizeApplyUrl,
  sanitizeApplyUrlForSource,
  sanitizeSourceUrl,
} from "./urls";
export { toContentHash } from "./contentHash";
export { decodeHtmlEntities, safeFromCodePoint, xmlNodeText, xmlTextList, fixMojibake } from "./text";
