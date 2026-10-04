/**
 * SSAE-06 — Measurement Contracts for Per-Source Epoch Features
 *
 * Pure TypeScript module defining the five measurement contracts (SSAE-06A through SSAE-06E)
 * as types, interfaces, constants, and pure helper functions. No network fetches, no
 * production mutations, no database writes.
 *
 * Depends on: SSAE-01 (attention dataset), SSAE-04 (temporal holdouts), SSAE-05 (shadow decisions)
 * Enables: SSAE-10 (constrained allocator), maturation of SSAE-01/04 from LIMITED
 *
 * Run: bun test scripts/lake/measurement-contracts.test.ts
 */

// ─── SSAE-06A: Per-source Hunter epoch ledger ──────────────────────────────────

/**
 * Fetch state for a single source within a Hunter scrape epoch.
 * Captures the outcome of a source fetch attempt for granular attribution and replay.
 */
export interface SourceFetchState {
  /** Unique source identifier (e.g., "we-work-remotely", "breezy:20four7va") */
  source_id: string;
  /** Provider family identifier (e.g., "WeWorkRemotely", "Breezy") */
  provider_id: string;
  /** ISO8601 timestamp of the Hunter epoch */
  epoch_timestamp: string;
  /** Human-readable epoch label (e.g., "hunter_2026-09-15_12:00") */
  epoch_label: string;
  /** Fetch outcome classification */
  fetch_outcome: "SUCCESS" | "CONDITIONAL_SUCCESS" | "RATE_LIMITED" | "BLOCKED" | "ERROR" | "SKIPPED";
  /** HTTP status code if fetch attempted */
  http_status: number | null;
  /** ETag from response for conditional fetch tracking */
  etag: string | null;
  /** Last-Modified header from response */
  last_modified: string | null;
  /** SHA256 hash of response body for change detection */
  body_hash: string | null;
  /** Bytes fetched (Content-Length or actual bytes read) */
  bytes_fetched: number;
  /** Whether this was a conditional fetch (If-None-Match/If-Modified-Since) */
  was_conditional: boolean;
  /** Whether server returned 304 Not Modified */
  not_modified: boolean;
  /** Milliseconds spent in fetch phase */
  fetch_latency_ms: number;
  /** Milliseconds spent in parse phase */
  parse_latency_ms: number;
  /** Milliseconds spent in validate/normalize phase */
  validate_latency_ms: number;
  /** Raw items fetched from source */
  raw_items_fetched: number;
  /** Items normalized after parsing */
  items_normalized: number;
  /** Items passing geo-gate */
  items_geo_eligible: number;
  /** Items qualified ready for publication */
  items_qualified_ready: number;
  /** Error message if fetch_outcome is ERROR */
  error_message: string | null;
  /** Retry-After seconds from rate limit response */
  retry_after_seconds: number | null;
  /** Consecutive failure count for this source */
  consecutive_failures: number;
  /** Backoff until timestamp if rate limited */
  backoff_until: string | null;
}

/**
 * Complete Hunter epoch ledger aggregating per-source fetch states.
 */
export interface HunterEpochLedger {
  /** ISO8601 timestamp of the epoch */
  epoch_timestamp: string;
  /** Human-readable epoch label */
  epoch_label: string;
  /** Pipeline phase (always "hunter_scrape" for this ledger) */
  pipeline_phase: "hunter_scrape";
  /** Per-source fetch states */
  source_fetch_states: SourceFetchState[];
  /** Total sources attempted */
  total_sources_attempted: number;
  /** Sources with SUCCESS outcome */
  successful_fetches: number;
  /** Sources with CONDITIONAL_SUCCESS (304) */
  conditional_fetches: number;
  /** Sources rate limited */
  rate_limited_sources: number;
  /** Sources blocked (robots, auth, etc.) */
  blocked_sources: number;
  /** Sources with errors */
  error_sources: number;
  /** Sources skipped (budget, concentration, etc.) */
  skipped_sources: number;
  /** Total bytes fetched across all sources */
  total_bytes_fetched: number;
  /** Total fetch latency ms */
  total_fetch_latency_ms: number;
  /** Schema version for migration tracking */
  schema_version: number;
}

/**
 * Validates a SourceFetchState for completeness per contract requirements.
 */
export function validateSourceFetchState(state: SourceFetchState): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!state.source_id || typeof state.source_id !== "string") {
    errors.push("source_id is required and must be a non-empty string");
  }
  if (!state.provider_id || typeof state.provider_id !== "string") {
    errors.push("provider_id is required and must be a non-empty string");
  }
  if (!state.epoch_timestamp || isNaN(Date.parse(state.epoch_timestamp))) {
    errors.push("epoch_timestamp is required and must be a valid ISO8601 string");
  }
  if (!state.epoch_label || typeof state.epoch_label !== "string") {
    errors.push("epoch_label is required and must be a non-empty string");
  }
  const validOutcomes = ["SUCCESS", "CONDITIONAL_SUCCESS", "RATE_LIMITED", "BLOCKED", "ERROR", "SKIPPED"];
  if (!validOutcomes.includes(state.fetch_outcome)) {
    errors.push(`fetch_outcome must be one of: ${validOutcomes.join(", ")}`);
  }
  if (state.http_status !== null && (typeof state.http_status !== "number" || state.http_status < 100 || state.http_status > 599)) {
    errors.push("http_status must be null or a valid HTTP status code (100-599)");
  }
  if (state.bytes_fetched < 0) {
    errors.push("bytes_fetched must be non-negative");
  }
  if (typeof state.was_conditional !== "boolean") {
    errors.push("was_conditional must be a boolean");
  }
  if (typeof state.not_modified !== "boolean") {
    errors.push("not_modified must be a boolean");
  }
  if (state.fetch_latency_ms < 0) {
    errors.push("fetch_latency_ms must be non-negative");
  }
  if (state.parse_latency_ms < 0) {
    errors.push("parse_latency_ms must be non-negative");
  }
  if (state.validate_latency_ms < 0) {
    errors.push("validate_latency_ms must be non-negative");
  }
  if (state.raw_items_fetched < 0) {
    errors.push("raw_items_fetched must be non-negative");
  }
  if (state.items_normalized < 0) {
    errors.push("items_normalized must be non-negative");
  }
  if (state.items_geo_eligible < 0) {
    errors.push("items_geo_eligible must be non-negative");
  }
  if (state.items_qualified_ready < 0) {
    errors.push("items_qualified_ready must be non-negative");
  }
  if (state.consecutive_failures < 0) {
    errors.push("consecutive_failures must be non-negative");
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Creates an empty HunterEpochLedger for a new epoch.
 */
export function createEmptyHunterEpochLedger(epochTimestamp: string, epochLabel: string): HunterEpochLedger {
  return {
    epoch_timestamp: epochTimestamp,
    epoch_label: epochLabel,
    pipeline_phase: "hunter_scrape",
    source_fetch_states: [],
    total_sources_attempted: 0,
    successful_fetches: 0,
    conditional_fetches: 0,
    rate_limited_sources: 0,
    blocked_sources: 0,
    error_sources: 0,
    skipped_sources: 0,
    total_bytes_fetched: 0,
    total_fetch_latency_ms: 0,
    schema_version: 1,
  };
}

// ─── SSAE-06B: Publication cohort labels ───────────────────────────────────────

/**
 * Publication cohort classification per CONSTITUTION §3.3–3.4 and MASTER_OPERATING_PROMPT §9.
 * These are mutually exclusive primary cohorts for first-publication events.
 */
export const PUBLICATION_COHORTS = [
  "FRESH_DISCOVERY",
  "REPLAY_RECOVERY",
  "BACKLOG_IMPORT",
  "REACTIVATION",
  "OTHER_NON_FRESH",
] as const;

export type PublicationCohort = (typeof PUBLICATION_COHORTS)[number];

/**
 * Validates that a string is a valid PublicationCohort.
 */
export function isValidPublicationCohort(value: string): value is PublicationCohort {
  return PUBLICATION_COHORTS.includes(value as PublicationCohort);
}

/**
 * Publication cohort label record linking a job to its first-publication cohort.
 */
export interface PublicationCohortLabel {
  /** Canonical job ID */
  job_id: string;
  /** Source that originated this job */
  source_id: string;
  /** Provider family */
  provider_id: string;
  /** Primary cohort classification (mutually exclusive) */
  cohort: PublicationCohort;
  /** Secondary provenance when multiple descriptions apply */
  secondary_cohorts: PublicationCohort[];
  /** ISO8601 timestamp of first public exposure */
  first_publication_at: string;
  /** ISO8601 timestamp of original source posting (if known) */
  posted_at: string | null;
  /** ISO8601 timestamp of this label assignment */
  labeled_at: string;
  /** Version of cohort labeling rules applied */
  labeling_rule_version: string;
  /** Evidence references supporting this classification */
  evidence_refs: string[];
}

/**
 * Validates a PublicationCohortLabel for completeness.
 */
export function validatePublicationCohortLabel(label: PublicationCohortLabel): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!label.job_id || typeof label.job_id !== "string") {
    errors.push("job_id is required and must be a non-empty string");
  }
  if (!label.source_id || typeof label.source_id !== "string") {
    errors.push("source_id is required and must be a non-empty string");
  }
  if (!label.provider_id || typeof label.provider_id !== "string") {
    errors.push("provider_id is required and must be a non-empty string");
  }
  if (!isValidPublicationCohort(label.cohort)) {
    errors.push(`cohort must be one of: ${PUBLICATION_COHORTS.join(", ")}`);
  }
  if (!Array.isArray(label.secondary_cohorts)) {
    errors.push("secondary_cohorts must be an array");
  } else {
    for (const c of label.secondary_cohorts) {
      if (!isValidPublicationCohort(c)) {
        errors.push(`secondary_cohorts contains invalid cohort: ${c}`);
      }
    }
    // Primary must not appear in secondary
    if (label.secondary_cohorts.includes(label.cohort)) {
      errors.push("primary cohort must not appear in secondary_cohorts");
    }
  }
  if (!label.first_publication_at || isNaN(Date.parse(label.first_publication_at))) {
    errors.push("first_publication_at is required and must be a valid ISO8601 string");
  }
  if (label.posted_at !== null && (typeof label.posted_at !== "string" || isNaN(Date.parse(label.posted_at)))) {
    errors.push("posted_at must be null or a valid ISO8601 string");
  }
  if (!label.labeled_at || isNaN(Date.parse(label.labeled_at))) {
    errors.push("labeled_at is required and must be a valid ISO8601 string");
  }
  if (!label.labeling_rule_version || typeof label.labeling_rule_version !== "string") {
    errors.push("labeling_rule_version is required");
  }
  if (!Array.isArray(label.evidence_refs)) {
    errors.push("evidence_refs must be an array");
  }

  // Cohort logic validation: FRESH_DISCOVERY requires posted_at within freshness window
  if (label.cohort === "FRESH_DISCOVERY" && label.posted_at === null) {
    errors.push("FRESH_DISCOVERY cohort requires posted_at to be known");
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Creates a PublicationCohortLabel with defaults.
 */
export function createPublicationCohortLabel(
  jobId: string,
  sourceId: string,
  providerId: string,
  cohort: PublicationCohort,
  firstPublicationAt: string,
  postedAt: string | null,
  labelingRuleVersion: string,
  evidenceRefs: string[] = []
): PublicationCohortLabel {
  return {
    job_id: jobId,
    source_id: sourceId,
    provider_id: providerId,
    cohort,
    secondary_cohorts: [],
    first_publication_at: firstPublicationAt,
    posted_at: postedAt,
    labeled_at: new Date().toISOString(),
    labeling_rule_version: labelingRuleVersion,
    evidence_refs: evidenceRefs,
  };
}

// ─── SSAE-06C: Per-stage latency instrumentation ───────────────────────────────

/**
 * Pipeline stage identifiers for latency instrumentation.
 */
export const PIPELINE_STAGES = [
  "fetch",
  "parse",
  "normalize",
  "geo_gate",
  "triage",
  "fingerprint",
  "deduplicate",
  "qualify",
  "publish",
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export function isValidPipelineStage(value: string): value is PipelineStage {
  return PIPELINE_STAGES.includes(value as PipelineStage);
}

/**
 * Latency span for a single pipeline stage for a single job/source.
 */
export interface LatencySpan {
  /** Pipeline stage name */
  stage: PipelineStage;
  /** Source identifier */
  source_id: string;
  /** Job identifier (for job-level stages) */
  job_id: string | null;
  /** ISO8601 timestamp when stage started */
  started_at: string;
  /** ISO8601 timestamp when stage completed */
  completed_at: string;
  /** Duration in milliseconds */
  duration_ms: number;
  /** Whether this stage succeeded */
  success: boolean;
  /** Error message if failed */
  error_message: string | null;
  /** Additional metadata (bytes processed, items count, etc.) */
  metadata: Record<string, unknown>;
}

/**
 * Complete latency trace for a job through the pipeline.
 */
export interface JobLatencyTrace {
  /** Canonical job ID */
  job_id: string;
  /** Source that originated this job */
  source_id: string;
  /** Provider family */
  provider_id: string;
  /** ISO8601 timestamp of trace creation */
  trace_timestamp: string;
  /** Per-stage latency spans in pipeline order */
  spans: LatencySpan[];
  /** Total pipeline latency ms */
  total_latency_ms: number;
  /** Overall success */
  success: boolean;
  /** Schema version */
  schema_version: number;
}

/**
 * Validates a LatencySpan.
 */
export function validateLatencySpan(span: LatencySpan): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!isValidPipelineStage(span.stage)) {
    errors.push(`stage must be one of: ${PIPELINE_STAGES.join(", ")}`);
  }
  if (!span.source_id || typeof span.source_id !== "string") {
    errors.push("source_id is required and must be a non-empty string");
  }
  if (span.job_id !== null && typeof span.job_id !== "string") {
    errors.push("job_id must be null or a non-empty string");
  }
  if (!span.started_at || isNaN(Date.parse(span.started_at))) {
    errors.push("started_at is required and must be a valid ISO8601 string");
  }
  if (!span.completed_at || isNaN(Date.parse(span.completed_at))) {
    errors.push("completed_at is required and must be a valid ISO8601 string");
  }
  if (span.duration_ms < 0) {
    errors.push("duration_ms must be non-negative");
  }
  if (typeof span.success !== "boolean") {
    errors.push("success must be a boolean");
  }
  if (span.error_message !== null && typeof span.error_message !== "string") {
    errors.push("error_message must be null or a string");
  }
  if (typeof span.metadata !== "object" || span.metadata === null) {
    errors.push("metadata must be an object");
  }

  // Consistency check: duration should roughly match time difference
  const startTime = new Date(span.started_at).getTime();
  const endTime = new Date(span.completed_at).getTime();
  const actualDuration = endTime - startTime;
  if (Math.abs(actualDuration - span.duration_ms) > 1000) { // Allow 1s drift
    errors.push(`duration_ms (${span.duration_ms}) significantly differs from timestamp diff (${actualDuration}ms)`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Creates a new LatencySpan with current timestamps.
 */
export function createLatencySpan(
  stage: PipelineStage,
  sourceId: string,
  jobId: string | null,
  metadata: Record<string, unknown> = {}
): { span: LatencySpan; end: () => LatencySpan } {
  const startedAt = new Date();
  const startedAtISO = startedAt.toISOString();

  return {
    span: {
      stage,
      source_id: sourceId,
      job_id: jobId,
      started_at: startedAtISO,
      completed_at: "",
      duration_ms: 0,
      success: false,
      error_message: null,
      metadata,
    },
    end: (success = true, errorMessage: string | null = null) => {
      const completedAt = new Date();
      const completedAtISO = completedAt.toISOString();
      const durationMs = completedAt.getTime() - startedAt.getTime();
      return {
        stage,
        source_id: sourceId,
        job_id: jobId,
        started_at: startedAtISO,
        completed_at: completedAtISO,
        duration_ms: durationMs,
        success,
        error_message: errorMessage,
        metadata,
      };
    },
  };
}

// ─── SSAE-06D: Fetch byte & conditional-fetch logging ──────────────────────────

/**
 * Fetch byte log entry for a single source fetch attempt.
 */
export interface FetchByteLog {
  /** Source identifier */
  source_id: string;
  /** Provider family */
  provider_id: string;
  /** ISO8601 timestamp of fetch */
  fetch_timestamp: string;
  /** Epoch label */
  epoch_label: string;
  /** Total bytes fetched (Content-Length or actual) */
  bytes_fetched: number;
  /** Whether conditional fetch was attempted (If-None-Match/If-Modified-Since sent) */
  conditional_attempted: boolean;
  /** Whether server returned 304 Not Modified */
  not_modified: boolean;
  /** ETag sent in conditional request */
  request_etag: string | null;
  /** ETag received in response */
  response_etag: string | null;
  /** Last-Modified sent in conditional request */
  request_last_modified: string | null;
  /** Last-Modified received in response */
  response_last_modified: string | null;
  /** HTTP status code */
  http_status: number;
  /** Fetch latency ms */
  fetch_latency_ms: number;
  /** Whether fetch was successful (2xx or 304) */
  success: boolean;
}

/**
 * Aggregated fetch byte statistics per source per epoch.
 */
export interface SourceFetchByteStats {
  /** Source identifier */
  source_id: string;
  /** Provider family */
  provider_id: string;
  /** Epoch label */
  epoch_label: string;
  /** Total fetch attempts in epoch */
  total_attempts: number;
  /** Full fetches (2xx with body) */
  full_fetches: number;
  /** Conditional fetches attempted */
  conditional_attempts: number;
  /** 304 Not Modified responses */
  not_modified_count: number;
  /** Total bytes fetched across all attempts */
  total_bytes_fetched: number;
  /** Average bytes per full fetch */
  avg_bytes_per_full_fetch: number;
  /** Conditional fetch ratio (conditional_attempts / total_attempts) */
  conditional_fetch_ratio: number;
  /** Cache hit rate (not_modified_count / conditional_attempts) */
  cache_hit_rate: number;
  /** Total fetch latency ms */
  total_fetch_latency_ms: number;
  /** Average fetch latency ms */
  avg_fetch_latency_ms: number;
}

/**
 * Computes aggregated stats from individual fetch byte logs.
 */
export function computeSourceFetchByteStats(
  sourceId: string,
  providerId: string,
  epochLabel: string,
  logs: FetchByteLog[]
): SourceFetchByteStats {
  const totalAttempts = logs.length;
  const fullFetches = logs.filter(l => l.success && !l.not_modified).length;
  const conditionalAttempts = logs.filter(l => l.conditional_attempted).length;
  const notModifiedCount = logs.filter(l => l.not_modified).length;
  const totalBytes = logs.reduce((sum, l) => sum + l.bytes_fetched, 0);
  const totalLatency = logs.reduce((sum, l) => sum + l.fetch_latency_ms, 0);

  return {
    source_id: sourceId,
    provider_id: providerId,
    epoch_label: epochLabel,
    total_attempts: totalAttempts,
    full_fetches: fullFetches,
    conditional_attempts: conditionalAttempts,
    not_modified_count: notModifiedCount,
    total_bytes_fetched: totalBytes,
    avg_bytes_per_full_fetch: fullFetches > 0 ? totalBytes / fullFetches : 0,
    conditional_fetch_ratio: totalAttempts > 0 ? conditionalAttempts / totalAttempts : 0,
    cache_hit_rate: conditionalAttempts > 0 ? notModifiedCount / conditionalAttempts : 0,
    total_fetch_latency_ms: totalLatency,
    avg_fetch_latency_ms: totalAttempts > 0 ? totalLatency / totalAttempts : 0,
  };
}

/**
 * Validates a FetchByteLog.
 */
export function validateFetchByteLog(log: FetchByteLog): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!log.source_id || typeof log.source_id !== "string") {
    errors.push("source_id is required and must be a non-empty string");
  }
  if (!log.provider_id || typeof log.provider_id !== "string") {
    errors.push("provider_id is required and must be a non-empty string");
  }
  if (!log.fetch_timestamp || isNaN(Date.parse(log.fetch_timestamp))) {
    errors.push("fetch_timestamp is required and must be a valid ISO8601 string");
  }
  if (!log.epoch_label || typeof log.epoch_label !== "string") {
    errors.push("epoch_label is required and must be a non-empty string");
  }
  if (log.bytes_fetched < 0) {
    errors.push("bytes_fetched must be non-negative");
  }
  if (typeof log.conditional_attempted !== "boolean") {
    errors.push("conditional_attempted must be a boolean");
  }
  if (typeof log.not_modified !== "boolean") {
    errors.push("not_modified must be a boolean");
  }
  if (log.http_status < 100 || log.http_status > 599) {
    errors.push("http_status must be a valid HTTP status code (100-599)");
  }
  if (log.fetch_latency_ms < 0) {
    errors.push("fetch_latency_ms must be non-negative");
  }
  if (typeof log.success !== "boolean") {
    errors.push("success must be a boolean");
  }

  // Consistency: if not_modified, must be conditional and 304
  if (log.not_modified) {
    if (!log.conditional_attempted) {
      errors.push("not_modified=true requires conditional_attempted=true");
    }
    if (log.http_status !== 304) {
      errors.push("not_modified=true requires http_status=304");
    }
  }

  return { valid: errors.length === 0, errors };
}

// ─── SSAE-06E: D1 join for lake labels ─────────────────────────────────────────

/**
 * Lake-to-D1 join record for label validation feedback loop.
 * Links lake candidate jobs to their D1 publication outcomes.
 */
export interface LakeD1JoinRecord {
  /** Lake candidate job ID */
  lake_candidate_id: number;
  /** Canonical job ID (if published to D1) */
  d1_opportunity_id: string | null;
  /** Source identifier */
  source_id: string;
  /** Provider family */
  provider_id: string;
  /** Lake candidate first seen timestamp */
  lake_first_seen_at: string;
  /** Lake candidate qualified ready timestamp */
  lake_qualified_ready_at: string | null;
  /** D1 first publication timestamp (if published) */
  d1_first_publication_at: string | null;
  /** Publication cohort label (if published) */
  publication_cohort: PublicationCohort | null;
  /** Whether this candidate was published to D1 */
  published_to_d1: boolean;
  /** Whether lake labels were validated against D1 outcome */
  labels_validated: boolean;
  /** Validation result if validated */
  validation_result: "MATCH" | "MISMATCH" | "MISSING_D1" | "MISSING_LAKE" | null;
  /** Discrepancy details if MISMATCH */
  discrepancy_details: string | null;
  /** Join timestamp */
  joined_at: string;
  /** Schema version */
  schema_version: number;
}

/**
 * Validates a LakeD1JoinRecord.
 */
export function validateLakeD1JoinRecord(record: LakeD1JoinRecord): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (typeof record.lake_candidate_id !== "number" || record.lake_candidate_id <= 0) {
    errors.push("lake_candidate_id must be a positive number");
  }
  if (record.d1_opportunity_id !== null && typeof record.d1_opportunity_id !== "string") {
    errors.push("d1_opportunity_id must be null or a non-empty string");
  }
  if (!record.source_id || typeof record.source_id !== "string") {
    errors.push("source_id is required and must be a non-empty string");
  }
  if (!record.provider_id || typeof record.provider_id !== "string") {
    errors.push("provider_id is required and must be a non-empty string");
  }
  if (!record.lake_first_seen_at || isNaN(Date.parse(record.lake_first_seen_at))) {
    errors.push("lake_first_seen_at is required and must be a valid ISO8601 string");
  }
  if (record.lake_qualified_ready_at !== null && (typeof record.lake_qualified_ready_at !== "string" || isNaN(Date.parse(record.lake_qualified_ready_at)))) {
    errors.push("lake_qualified_ready_at must be null or a valid ISO8601 string");
  }
  if (record.d1_first_publication_at !== null && (typeof record.d1_first_publication_at !== "string" || isNaN(Date.parse(record.d1_first_publication_at)))) {
    errors.push("d1_first_publication_at must be null or a valid ISO8601 string");
  }
  if (record.publication_cohort !== null && !isValidPublicationCohort(record.publication_cohort)) {
    errors.push(`publication_cohort must be null or one of: ${PUBLICATION_COHORTS.join(", ")}`);
  }
  if (typeof record.published_to_d1 !== "boolean") {
    errors.push("published_to_d1 must be a boolean");
  }
  if (typeof record.labels_validated !== "boolean") {
    errors.push("labels_validated must be a boolean");
  }
  const validValidationResults = ["MATCH", "MISMATCH", "MISSING_D1", "MISSING_LAKE", null];
  if (!validValidationResults.includes(record.validation_result)) {
    errors.push(`validation_result must be one of: ${validValidationResults.filter(v => v !== null).join(", ")} or null`);
  }
  if (record.validation_result === "MISMATCH" && (!record.discrepancy_details || typeof record.discrepancy_details !== "string")) {
    errors.push("discrepancy_details is required when validation_result is MISMATCH");
  }
  if (!record.joined_at || isNaN(Date.parse(record.joined_at))) {
    errors.push("joined_at is required and must be a valid ISO8601 string");
  }

  // Consistency: if published_to_d1=true, d1_opportunity_id and d1_first_publication_at required
  if (record.published_to_d1) {
    if (!record.d1_opportunity_id) {
      errors.push("published_to_d1=true requires d1_opportunity_id");
    }
    if (!record.d1_first_publication_at) {
      errors.push("published_to_d1=true requires d1_first_publication_at");
    }
    if (!record.publication_cohort) {
      errors.push("published_to_d1=true requires publication_cohort");
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Creates a LakeD1JoinRecord for a candidate not yet published.
 */
export function createUnpublishedLakeD1JoinRecord(
  lakeCandidateId: number,
  sourceId: string,
  providerId: string,
  lakeFirstSeenAt: string,
  lakeQualifiedReadyAt: string | null
): LakeD1JoinRecord {
  return {
    lake_candidate_id: lakeCandidateId,
    d1_opportunity_id: null,
    source_id: sourceId,
    provider_id: providerId,
    lake_first_seen_at: lakeFirstSeenAt,
    lake_qualified_ready_at: lakeQualifiedReadyAt,
    d1_first_publication_at: null,
    publication_cohort: null,
    published_to_d1: false,
    labels_validated: false,
    validation_result: null,
    discrepancy_details: null,
    joined_at: new Date().toISOString(),
    schema_version: 1,
  };
}

// ─── Cross-contract constants and utilities ────────────────────────────────────

/** Current schema version for all measurement contracts */
export const MEASUREMENT_CONTRACTS_SCHEMA_VERSION = 1;

/** Contract identifiers for reference */
export const SSAE_06_CONTRACTS = {
  "SSAE-06A": "Per-source Hunter epoch ledger",
  "SSAE-06B": "Publication cohort labels",
  "SSAE-06C": "Per-stage latency instrumentation",
  "SSAE-06D": "Fetch byte & conditional-fetch logging",
  "SSAE-06E": "D1 join for lake labels",
} as const;

export type SSAE06ContractId = keyof typeof SSAE_06_CONTRACTS;

/**
 * Checks if all measurement contracts have mature evidence available.
 * Returns a summary of which contracts have sufficient coverage.
 */
export function checkMeasurementContractMaturity(contracts: {
  hunterLedgerCoverage: number; // 0-1 fraction of sources with fetch states
  cohortLabelCoverage: number; // 0-1 fraction of publications with cohort labels
  latencyTraceCoverage: number; // 0-1 fraction of jobs with latency traces
  byteLogCoverage: number; // 0-1 fraction of fetches with byte logs
  lakeD1JoinCoverage: number; // 0-1 fraction of candidates with join records
}): {
  mature: boolean;
  contractStatus: Record<SSAE06ContractId, { mature: boolean; coverage: number }>;
  missing: SSAE06ContractId[];
} {
  const thresholds = {
    "SSAE-06A": 0.9, // 90% of sources need fetch states
    "SSAE-06B": 0.8, // 80% of publications need cohort labels
    "SSAE-06C": 0.7, // 70% of jobs need latency traces
    "SSAE-06D": 0.9, // 90% of fetches need byte logs
    "SSAE-06E": 0.6, // 60% of candidates need D1 join (lower due to publication lag)
  };

  const contractStatus: Record<SSAE06ContractId, { mature: boolean; coverage: number }> = {
    "SSAE-06A": { mature: contracts.hunterLedgerCoverage >= thresholds["SSAE-06A"], coverage: contracts.hunterLedgerCoverage },
    "SSAE-06B": { mature: contracts.cohortLabelCoverage >= thresholds["SSAE-06B"], coverage: contracts.cohortLabelCoverage },
    "SSAE-06C": { mature: contracts.latencyTraceCoverage >= thresholds["SSAE-06C"], coverage: contracts.latencyTraceCoverage },
    "SSAE-06D": { mature: contracts.byteLogCoverage >= thresholds["SSAE-06D"], coverage: contracts.byteLogCoverage },
    "SSAE-06E": { mature: contracts.lakeD1JoinCoverage >= thresholds["SSAE-06E"], coverage: contracts.lakeD1JoinCoverage },
  };

  const missing = Object.entries(contractStatus)
    .filter(([, v]) => !v.mature)
    .map(([k]) => k as SSAE06ContractId);

  return {
    mature: missing.length === 0,
    contractStatus,
    missing,
  };
}

/**
 * Generates a measurement contract receipt for audit trail.
 */
export function generateMeasurementContractReceipt(
  epochLabel: string,
  maturity: ReturnType<typeof checkMeasurementContractMaturity>
): string {
  const lines: string[] = [
    "=== SSAE-06 Measurement Contract Receipt ===",
    `Epoch: ${epochLabel}`,
    `Generated: ${new Date().toISOString()}`,
    `Overall Mature: ${maturity.mature ? "YES" : "NO"}`,
    "",
    "--- Contract Status ---",
  ];

  for (const [contractId, status] of Object.entries(maturity.contractStatus)) {
    const contractName = SSAE_06_CONTRACTS[contractId as SSAE06ContractId];
    lines.push(`  ${contractId} (${contractName}): ${status.mature ? "MATURE" : "IMMATURE"} (coverage: ${(status.coverage * 100).toFixed(1)}%)`);
  }

  if (maturity.missing.length > 0) {
    lines.push("");
    lines.push("--- Missing Contracts ---");
    for (const m of maturity.missing) {
      lines.push(`  ${m}: ${SSAE_06_CONTRACTS[m]}`);
    }
  }

  lines.push("");
  lines.push(`=== DISPOSITION: ${maturity.mature ? "MATURE" : "LIMITED"} ===`);

  return lines.join("\n");
}