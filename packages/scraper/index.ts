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
  runCandidateShadowProbe,
  SHADOW_FETCH_TIMEOUT_MS,
  SHADOW_MAX_BYTES,
  SHADOW_MAX_REQUESTS,
  SHADOW_MAX_ITEMS,
  SHADOW_VERSION,
} from "./candidate-shadow";
export type {
  CandidateShadowInput,
  CandidateShadowResult,
  CandidateShadowProbe,
  CandidateProviderProfile,
} from "./candidate-shadow";
export {
  buildEvidencePacket,
  deadlineBucket,
  isPreExpiryDue,
  alertForPacket,
  deduplicateAlerts,
  renderEvidenceReport,
  packetHashFor,
} from "./evidence-packet";
export type {
  EvidencePacket,
  EvidencePacketInput,
  PacketStatus,
  PacketAlert,
  DeadlineBucket,
} from "./evidence-packet";
export {
  parseIssueForm,
  containsSecretLikeContent,
  containsCandidateDataMarkers,
  buildEmployerCandidateRow,
  employerSourceId,
  checkDuplicate,
  EMPLOYER_PROVIDER_ID,
  EMPLOYER_PROVIDER_FAMILY,
  EMPLOYER_REVIEW_DEADLINE_DAYS,
} from "./employer-intake";
export type {
  ParsedEmployerIntake,
  IntakeParseResult,
  EmployerCandidateRow,
  BuildEmployerCandidateInput,
  IntakeOutcome,
  DedupCheckResult,
} from "./employer-intake";
export {
  buildPermissionEvidencePack,
  attachPermissionToSourceAccount,
  renderPermissionPackReport,
  PERMISSION_LEASE_DAYS,
} from "./partner-permission";
export type {
  PermissionStatus,
  PermissionEvidencePackInput,
  PermissionEvidencePack,
  AttachedPermission,
} from "./partner-permission";
export {
  buildGreenhouseProviderProfile,
  buildGreenhouseCandidateRow,
  decidePromotionToShadow,
  GREENHOUSE_PROVIDER_ID,
  GREENHOUSE_EVIDENCE_URL,
  GREENHOUSE_ALLOWED_HOSTS,
  GREENHOUSE_EVIDENCE_LEASE_DAYS,
} from "./greenhouse-canary";
export type {
  GreenhouseProviderProfileRow,
  GreenhouseBoardInput,
  GreenhouseCandidateRow,
  ShadowPromotionDecision,
} from "./greenhouse-canary";
export { decidePromotionToShadow as decideSourcePromotionToShadow } from "./source-promotion";
export type { SourcePromotionDecision } from "./source-promotion";
export {
  buildLeverProviderProfile,
  buildLeverCandidateRow,
  LEVER_PROVIDER_ID,
  LEVER_EVIDENCE_URL,
  LEVER_ALLOWED_HOSTS,
  LEVER_EVIDENCE_LEASE_DAYS,
} from "./lever-canary";
export type {
  LeverProviderProfileRow,
  LeverBoardInput,
  LeverCandidateRow,
} from "./lever-canary";
export {
  smartRecruitersListUrl,
  deriveSmartRecruitersSlug,
  deriveSmartRecruitersPostingUrl,
  parseSmartRecruitersListResponse,
  hasMoreSmartRecruitersPages,
  fetchSmartRecruitersPostings,
  SMARTRECRUITERS_JOBS_HOST,
  SMARTRECRUITERS_API_HOST,
} from "./smartrecruiters";
export type {
  SmartRecruitersRawPosting,
  SmartRecruitersListResponse,
  NormalizedSmartRecruitersPosting,
} from "./smartrecruiters";
export {
  buildSmartRecruitersProviderProfile,
  buildSmartRecruitersCandidateRow,
  SMARTRECRUITERS_PROVIDER_ID,
  SMARTRECRUITERS_EVIDENCE_URL,
  SMARTRECRUITERS_ALLOWED_HOSTS,
  SMARTRECRUITERS_EVIDENCE_LEASE_DAYS,
} from "./smartrecruiters-canary";
export type {
  SmartRecruitersProviderProfileRow,
  SmartRecruitersCompanyInput,
  SmartRecruitersCandidateRow,
} from "./smartrecruiters-canary";
export {
  findRepeatedCrossCompanyApplyHosts,
  sanitizeApplyUrl,
  sanitizeApplyUrlForSource,
  sanitizeSourceUrl,
} from "./urls";
export { toContentHash } from "./contentHash";
export { decodeHtmlEntities, safeFromCodePoint, xmlNodeText, xmlTextList, fixMojibake } from "./text";
