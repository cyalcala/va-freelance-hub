/**
 * SSAE-06 Measurement Contracts — Deterministic Tests
 *
 * Tests cover: all five contract types (SSAE-06A through SSAE-06E),
 * validation functions, helper utilities, maturity checking, receipt generation.
 *
 * Run: bun test scripts/lake/measurement-contracts.test.ts
 */

import { describe, it, expect, beforeAll } from "bun:test";
import {
  // SSAE-06A
  SourceFetchState,
  HunterEpochLedger,
  validateSourceFetchState,
  createEmptyHunterEpochLedger,
  // SSAE-06B
  PUBLICATION_COHORTS,
  PublicationCohort,
  isValidPublicationCohort,
  PublicationCohortLabel,
  validatePublicationCohortLabel,
  createPublicationCohortLabel,
  // SSAE-06C
  PIPELINE_STAGES,
  PipelineStage,
  isValidPipelineStage,
  LatencySpan,
  JobLatencyTrace,
  validateLatencySpan,
  createLatencySpan,
  // SSAE-06D
  FetchByteLog,
  SourceFetchByteStats,
  computeSourceFetchByteStats,
  validateFetchByteLog,
  // SSAE-06E
  LakeD1JoinRecord,
  validateLakeD1JoinRecord,
  createUnpublishedLakeD1JoinRecord,
  // Cross-contract
  MEASUREMENT_CONTRACTS_SCHEMA_VERSION,
  SSAE_06_CONTRACTS,
  SSAE06ContractId,
  checkMeasurementContractMaturity,
  generateMeasurementContractReceipt,
} from "./measurement-contracts";

describe("SSAE-06 Measurement Contracts", () => {
  // ─── SSAE-06A: Per-source Hunter epoch ledger ──────────────────────────────
  describe("SSAE-06A: Hunter Epoch Ledger", () => {
    const validFetchState: SourceFetchState = {
      source_id: "we-work-remotely",
      provider_id: "WeWorkRemotely",
      epoch_timestamp: "2026-09-15T12:00:00Z",
      epoch_label: "hunter_2026-09-15_12:00",
      fetch_outcome: "SUCCESS",
      http_status: 200,
      etag: "abc123",
      last_modified: "Mon, 15 Sep 2026 10:00:00 GMT",
      body_hash: "sha256:def456",
      bytes_fetched: 50000,
      was_conditional: false,
      not_modified: false,
      fetch_latency_ms: 150,
      parse_latency_ms: 50,
      validate_latency_ms: 30,
      raw_items_fetched: 25,
      items_normalized: 23,
      items_geo_eligible: 20,
      items_qualified_ready: 15,
      error_message: null,
      retry_after_seconds: null,
      consecutive_failures: 0,
      backoff_until: null,
    };

    it("validates a complete SourceFetchState as valid", () => {
      const result = validateSourceFetchState(validFetchState);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("rejects missing source_id", () => {
      const state = { ...validFetchState, source_id: "" };
      const result = validateSourceFetchState(state);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("source_id is required and must be a non-empty string");
    });

    it("rejects missing provider_id", () => {
      const state = { ...validFetchState, provider_id: "" };
      const result = validateSourceFetchState(state);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("provider_id is required and must be a non-empty string");
    });

    it("rejects invalid epoch_timestamp", () => {
      const state = { ...validFetchState, epoch_timestamp: "not-a-date" };
      const result = validateSourceFetchState(state);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("epoch_timestamp is required and must be a valid ISO8601 string");
    });

    it("rejects invalid fetch_outcome", () => {
      const state = { ...validFetchState, fetch_outcome: "UNKNOWN" as any };
      const result = validateSourceFetchState(state);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("fetch_outcome must be one of"))).toBe(true);
    });

    it("rejects negative bytes_fetched", () => {
      const state = { ...validFetchState, bytes_fetched: -1 };
      const result = validateSourceFetchState(state);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("bytes_fetched must be non-negative");
    });

    it("rejects invalid http_status", () => {
      const state = { ...validFetchState, http_status: 99 };
      const result = validateSourceFetchState(state);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("http_status must be null or a valid HTTP status code (100-599)");
    });

    it("accepts null http_status", () => {
      const state = { ...validFetchState, http_status: null };
      const result = validateSourceFetchState(state);
      expect(result.valid).toBe(true);
    });

    it("rejects negative latency values", () => {
      const state = { ...validFetchState, fetch_latency_ms: -10 };
      const result = validateSourceFetchState(state);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("fetch_latency_ms must be non-negative");
    });

    it("rejects negative item counts", () => {
      const state = { ...validFetchState, raw_items_fetched: -5 };
      const result = validateSourceFetchState(state);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("raw_items_fetched must be non-negative");
    });

    it("rejects negative consecutive_failures", () => {
      const state = { ...validFetchState, consecutive_failures: -1 };
      const result = validateSourceFetchState(state);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("consecutive_failures must be non-negative");
    });

    it("accepts CONDITIONAL_SUCCESS with 304", () => {
      const state = { ...validFetchState, fetch_outcome: "CONDITIONAL_SUCCESS", http_status: 304, not_modified: true, was_conditional: true };
      const result = validateSourceFetchState(state);
      expect(result.valid).toBe(true);
    });

    it("accepts RATE_LIMITED with retry_after_seconds", () => {
      const state = { ...validFetchState, fetch_outcome: "RATE_LIMITED", http_status: 429, retry_after_seconds: 60 };
      const result = validateSourceFetchState(state);
      expect(result.valid).toBe(true);
    });

    it("creates empty HunterEpochLedger", () => {
      const ledger = createEmptyHunterEpochLedger("2026-09-15T12:00:00Z", "hunter_2026-09-15_12:00");
      expect(ledger.epoch_timestamp).toBe("2026-09-15T12:00:00Z");
      expect(ledger.epoch_label).toBe("hunter_2026-09-15_12:00");
      expect(ledger.pipeline_phase).toBe("hunter_scrape");
      expect(ledger.source_fetch_states).toEqual([]);
      expect(ledger.total_sources_attempted).toBe(0);
      expect(ledger.schema_version).toBe(1);
    });
  });

  // ─── SSAE-06B: Publication cohort labels ────────────────────────────────────
  describe("SSAE-06B: Publication Cohort Labels", () => {
    it("defines all required cohorts", () => {
      expect(PUBLICATION_COHORTS).toEqual([
        "FRESH_DISCOVERY",
        "REPLAY_RECOVERY",
        "BACKLOG_IMPORT",
        "REACTIVATION",
        "OTHER_NON_FRESH",
      ]);
    });

    it("isValidPublicationCohort returns true for valid cohorts", () => {
      for (const cohort of PUBLICATION_COHORTS) {
        expect(isValidPublicationCohort(cohort)).toBe(true);
      }
    });

    it("isValidPublicationCohort returns false for invalid cohorts", () => {
      expect(isValidPublicationCohort("INVALID")).toBe(false);
      expect(isValidPublicationCohort("")).toBe(false);
      expect(isValidPublicationCohort("FRESH")).toBe(false);
    });

    const validLabel: PublicationCohortLabel = {
      job_id: "job-123",
      source_id: "we-work-remotely",
      provider_id: "WeWorkRemotely",
      cohort: "FRESH_DISCOVERY",
      secondary_cohorts: [],
      first_publication_at: "2026-09-15T14:30:00Z",
      posted_at: "2026-09-15T10:00:00Z",
      labeled_at: "2026-09-15T14:30:05Z",
      labeling_rule_version: "constitution-v5.2",
      evidence_refs: ["source_publication_ledger:abc", "lake_candidate_jobs:123"],
    };

    it("validates a complete PublicationCohortLabel as valid", () => {
      const result = validatePublicationCohortLabel(validLabel);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("rejects missing job_id", () => {
      const label = { ...validLabel, job_id: "" };
      const result = validatePublicationCohortLabel(label);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("job_id is required and must be a non-empty string");
    });

    it("rejects invalid cohort", () => {
      const label = { ...validLabel, cohort: "INVALID" as any };
      const result = validatePublicationCohortLabel(label);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("cohort must be one of"))).toBe(true);
    });

    it("rejects primary cohort in secondary_cohorts", () => {
      const label = { ...validLabel, secondary_cohorts: ["FRESH_DISCOVERY"] };
      const result = validatePublicationCohortLabel(label);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("primary cohort must not appear in secondary_cohorts");
    });

    it("rejects invalid secondary cohort", () => {
      const label = { ...validLabel, secondary_cohorts: ["INVALID"] };
      const result = validatePublicationCohortLabel(label);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("secondary_cohorts contains invalid cohort"))).toBe(true);
    });

    it("rejects invalid first_publication_at", () => {
      const label = { ...validLabel, first_publication_at: "not-a-date" };
      const result = validatePublicationCohortLabel(label);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("first_publication_at is required and must be a valid ISO8601 string");
    });

    it("accepts null posted_at for non-FRESH cohorts", () => {
      const label = { ...validLabel, cohort: "REPLAY_RECOVERY" as PublicationCohort, posted_at: null };
      const result = validatePublicationCohortLabel(label);
      expect(result.valid).toBe(true);
    });

    it("rejects invalid posted_at", () => {
      const label = { ...validLabel, posted_at: "not-a-date" };
      const result = validatePublicationCohortLabel(label);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("posted_at must be null or a valid ISO8601 string");
    });

    it("rejects FRESH_DISCOVERY with null posted_at", () => {
      const label = { ...validLabel, cohort: "FRESH_DISCOVERY" as PublicationCohort, posted_at: null };
      const result = validatePublicationCohortLabel(label);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("FRESH_DISCOVERY cohort requires posted_at to be known");
    });

    it("accepts REPLAY_RECOVERY with null posted_at", () => {
      const label = { ...validLabel, cohort: "REPLAY_RECOVERY" as PublicationCohort, posted_at: null };
      const result = validatePublicationCohortLabel(label);
      expect(result.valid).toBe(true);
    });

    it("rejects missing labeling_rule_version", () => {
      const label = { ...validLabel, labeling_rule_version: "" };
      const result = validatePublicationCohortLabel(label);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("labeling_rule_version is required");
    });

    it("rejects non-array evidence_refs", () => {
      const label = { ...validLabel, evidence_refs: "not-an-array" as any };
      const result = validatePublicationCohortLabel(label);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("evidence_refs must be an array");
    });

    it("creates PublicationCohortLabel with defaults", () => {
      const label = createPublicationCohortLabel(
        "job-456",
        "remotive",
        "Remotive",
        "REPLAY_RECOVERY",
        "2026-09-16T10:00:00Z",
        null,
        "constitution-v5.2",
        ["ledger:xyz"]
      );

      expect(label.job_id).toBe("job-456");
      expect(label.source_id).toBe("remotive");
      expect(label.provider_id).toBe("Remotive");
      expect(label.cohort).toBe("REPLAY_RECOVERY");
      expect(label.secondary_cohorts).toEqual([]);
      expect(label.first_publication_at).toBe("2026-09-16T10:00:00Z");
      expect(label.posted_at).toBeNull();
      expect(label.labeled_at).toBeDefined();
      expect(label.labeling_rule_version).toBe("constitution-v5.2");
      expect(label.evidence_refs).toEqual(["ledger:xyz"]);
    });
  });

  // ─── SSAE-06C: Per-stage latency instrumentation ────────────────────────────
  describe("SSAE-06C: Per-Stage Latency Instrumentation", () => {
    it("defines all pipeline stages", () => {
      expect(PIPELINE_STAGES).toEqual([
        "fetch",
        "parse",
        "normalize",
        "geo_gate",
        "triage",
        "fingerprint",
        "deduplicate",
        "qualify",
        "publish",
      ]);
    });

    it("isValidPipelineStage returns true for valid stages", () => {
      for (const stage of PIPELINE_STAGES) {
        expect(isValidPipelineStage(stage)).toBe(true);
      }
    });

    it("isValidPipelineStage returns false for invalid stages", () => {
      expect(isValidPipelineStage("invalid")).toBe(false);
      expect(isValidPipelineStage("")).toBe(false);
    });

    const validSpan: LatencySpan = {
      stage: "fetch",
      source_id: "we-work-remotely",
      job_id: "job-123",
      started_at: "2026-09-15T12:00:00.000Z",
      completed_at: "2026-09-15T12:00:00.150Z",
      duration_ms: 150,
      success: true,
      error_message: null,
      metadata: { bytes_fetched: 50000, items: 25 },
    };

    it("validates a complete LatencySpan as valid", () => {
      const result = validateLatencySpan(validSpan);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("rejects invalid stage", () => {
      const span = { ...validSpan, stage: "invalid" as any };
      const result = validateLatencySpan(span);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("stage must be one of"))).toBe(true);
    });

    it("rejects missing source_id", () => {
      const span = { ...validSpan, source_id: "" };
      const result = validateLatencySpan(span);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("source_id is required and must be a non-empty string");
    });

    it("accepts null job_id", () => {
      const span = { ...validSpan, job_id: null };
      const result = validateLatencySpan(span);
      expect(result.valid).toBe(true);
    });

    it("rejects invalid timestamps", () => {
      const span = { ...validSpan, started_at: "not-a-date" };
      const result = validateLatencySpan(span);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("started_at is required and must be a valid ISO8601 string");
    });

    it("rejects negative duration_ms", () => {
      const span = { ...validSpan, duration_ms: -10 };
      const result = validateLatencySpan(span);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("duration_ms must be non-negative");
    });

    it("rejects mismatched duration vs timestamp diff", () => {
      const span = { ...validSpan, duration_ms: 5000 }; // 5s but timestamps show 150ms
      const result = validateLatencySpan(span);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("significantly differs"))).toBe(true);
    });

    it("accepts duration within 1s of timestamp diff", () => {
      const span = { ...validSpan, duration_ms: 200 }; // 200ms vs 150ms actual = 50ms diff
      const result = validateLatencySpan(span);
      expect(result.valid).toBe(true);
    });

    it("rejects non-boolean success", () => {
      const span = { ...validSpan, success: "true" as any };
      const result = validateLatencySpan(span);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("success must be a boolean");
    });

    it("rejects non-object metadata", () => {
      const span = { ...validSpan, metadata: "not-an-object" as any };
      const result = validateLatencySpan(span);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("metadata must be an object");
    });

    it("createLatencySpan returns span and end function", () => {
      const { span, end } = createLatencySpan("parse", "remotive", "job-456", { items: 20 });

      expect(span.stage).toBe("parse");
      expect(span.source_id).toBe("remotive");
      expect(span.job_id).toBe("job-456");
      expect(span.started_at).toBeDefined();
      expect(span.completed_at).toBe("");
      expect(span.duration_ms).toBe(0);
      expect(span.success).toBe(false);
      expect(span.metadata).toEqual({ items: 20 });

      // Small delay to ensure measurable duration
      const completedSpan = end(true);
      expect(completedSpan.completed_at).toBeDefined();
      expect(completedSpan.duration_ms).toBeGreaterThanOrEqual(0);
      expect(completedSpan.success).toBe(true);
      expect(completedSpan.error_message).toBeNull();
    });

    it("createLatencySpan end captures error", () => {
      const { end } = createLatencySpan("geo_gate", "remote-ok", "job-789");
      const completedSpan = end(false, "Country exclusion: US only");
      expect(completedSpan.success).toBe(false);
      expect(completedSpan.error_message).toBe("Country exclusion: US only");
    });
  });

  // ─── SSAE-06D: Fetch byte & conditional-fetch logging ───────────────────────
  describe("SSAE-06D: Fetch Byte & Conditional-Fetch Logging", () => {
    const validByteLog: FetchByteLog = {
      source_id: "we-work-remotely",
      provider_id: "WeWorkRemotely",
      fetch_timestamp: "2026-09-15T12:00:00Z",
      epoch_label: "hunter_2026-09-15_12:00",
      bytes_fetched: 50000,
      conditional_attempted: false,
      not_modified: false,
      request_etag: null,
      response_etag: "abc123",
      request_last_modified: null,
      response_last_modified: "Mon, 15 Sep 2026 10:00:00 GMT",
      http_status: 200,
      fetch_latency_ms: 150,
      success: true,
    };

    it("validates a complete FetchByteLog as valid", () => {
      const result = validateFetchByteLog(validByteLog);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("rejects missing source_id", () => {
      const log = { ...validByteLog, source_id: "" };
      const result = validateFetchByteLog(log);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("source_id is required and must be a non-empty string");
    });

    it("rejects negative bytes_fetched", () => {
      const log = { ...validByteLog, bytes_fetched: -1 };
      const result = validateFetchByteLog(log);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("bytes_fetched must be non-negative");
    });

    it("rejects invalid conditional_attempted", () => {
      const log = { ...validByteLog, conditional_attempted: "yes" as any };
      const result = validateFetchByteLog(log);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("conditional_attempted must be a boolean");
    });

    it("rejects invalid not_modified", () => {
      const log = { ...validByteLog, not_modified: "true" as any };
      const result = validateFetchByteLog(log);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("not_modified must be a boolean");
    });

    it("rejects invalid http_status", () => {
      const log = { ...validByteLog, http_status: 99 };
      const result = validateFetchByteLog(log);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("http_status must be a valid HTTP status code (100-599)");
    });

    it("rejects not_modified without conditional_attempted", () => {
      const log = { ...validByteLog, not_modified: true, conditional_attempted: false };
      const result = validateFetchByteLog(log);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("not_modified=true requires conditional_attempted=true");
    });

    it("rejects not_modified with non-304 status", () => {
      const log = { ...validByteLog, not_modified: true, http_status: 200, conditional_attempted: true };
      const result = validateFetchByteLog(log);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("not_modified=true requires http_status=304");
    });

    it("accepts conditional 304 with not_modified", () => {
      const log = {
        ...validByteLog,
        conditional_attempted: true,
        not_modified: true,
        http_status: 304,
        bytes_fetched: 0,
        request_etag: "abc123",
      };
      const result = validateFetchByteLog(log);
      expect(result.valid).toBe(true);
    });

    it("computes SourceFetchByteStats correctly", () => {
      const logs: FetchByteLog[] = [
        { ...validByteLog, fetch_timestamp: "2026-09-15T12:00:00Z", bytes_fetched: 50000, fetch_latency_ms: 150 },
        { ...validByteLog, fetch_timestamp: "2026-09-15T12:05:00Z", bytes_fetched: 0, conditional_attempted: true, not_modified: true, http_status: 304, fetch_latency_ms: 50, request_etag: "abc123" },
        { ...validByteLog, fetch_timestamp: "2026-09-15T12:10:00Z", bytes_fetched: 52000, fetch_latency_ms: 160 },
      ];

      const stats = computeSourceFetchByteStats("we-work-remotely", "WeWorkRemotely", "hunter_2026-09-15_12:00", logs);

      expect(stats.source_id).toBe("we-work-remotely");
      expect(stats.provider_id).toBe("WeWorkRemotely");
      expect(stats.epoch_label).toBe("hunter_2026-09-15_12:00");
      expect(stats.total_attempts).toBe(3);
      expect(stats.full_fetches).toBe(2);
      expect(stats.conditional_attempts).toBe(1);
      expect(stats.not_modified_count).toBe(1);
      expect(stats.total_bytes_fetched).toBe(102000);
      expect(stats.avg_bytes_per_full_fetch).toBe(51000);
      expect(stats.conditional_fetch_ratio).toBeCloseTo(1/3, 5);
      expect(stats.cache_hit_rate).toBe(1);
      expect(stats.total_fetch_latency_ms).toBe(360);
      expect(stats.avg_fetch_latency_ms).toBe(120);
    });

    it("handles empty logs", () => {
      const stats = computeSourceFetchByteStats("source", "provider", "epoch", []);
      expect(stats.total_attempts).toBe(0);
      expect(stats.full_fetches).toBe(0);
      expect(stats.conditional_attempts).toBe(0);
      expect(stats.not_modified_count).toBe(0);
      expect(stats.total_bytes_fetched).toBe(0);
      expect(stats.avg_bytes_per_full_fetch).toBe(0);
      expect(stats.conditional_fetch_ratio).toBe(0);
      expect(stats.cache_hit_rate).toBe(0);
      expect(stats.total_fetch_latency_ms).toBe(0);
      expect(stats.avg_fetch_latency_ms).toBe(0);
    });

    it("handles only conditional 304 logs", () => {
      const logs: FetchByteLog[] = [
        { ...validByteLog, bytes_fetched: 0, conditional_attempted: true, not_modified: true, http_status: 304, fetch_latency_ms: 30, request_etag: "abc" },
        { ...validByteLog, bytes_fetched: 0, conditional_attempted: true, not_modified: true, http_status: 304, fetch_latency_ms: 25, request_etag: "abc" },
      ];

      const stats = computeSourceFetchByteStats("source", "provider", "epoch", logs);
      expect(stats.total_attempts).toBe(2);
      expect(stats.full_fetches).toBe(0);
      expect(stats.conditional_attempts).toBe(2);
      expect(stats.not_modified_count).toBe(2);
      expect(stats.cache_hit_rate).toBe(1);
      expect(stats.avg_bytes_per_full_fetch).toBe(0);
    });

    it("handles conditional attempts with misses", () => {
      const logs: FetchByteLog[] = [
        { ...validByteLog, bytes_fetched: 0, conditional_attempted: true, not_modified: true, http_status: 304, fetch_latency_ms: 30, request_etag: "abc" },
        { ...validByteLog, bytes_fetched: 60000, conditional_attempted: true, not_modified: false, http_status: 200, fetch_latency_ms: 200, request_etag: "abc", response_etag: "def" },
      ];

      const stats = computeSourceFetchByteStats("source", "provider", "epoch", logs);
      expect(stats.total_attempts).toBe(2);
      expect(stats.full_fetches).toBe(1);
      expect(stats.conditional_attempts).toBe(2);
      expect(stats.not_modified_count).toBe(1);
      expect(stats.cache_hit_rate).toBe(0.5);
    });
  });

  // ─── SSAE-06E: D1 join for lake labels ──────────────────────────────────────
  describe("SSAE-06E: D1 Join for Lake Labels", () => {
    const validJoinRecord: LakeD1JoinRecord = {
      lake_candidate_id: 12345,
      d1_opportunity_id: "opp-abc",
      source_id: "we-work-remotely",
      provider_id: "WeWorkRemotely",
      lake_first_seen_at: "2026-09-10T10:00:00Z",
      lake_qualified_ready_at: "2026-09-14T15:00:00Z",
      d1_first_publication_at: "2026-09-15T14:30:00Z",
      publication_cohort: "FRESH_DISCOVERY",
      published_to_d1: true,
      labels_validated: true,
      validation_result: "MATCH",
      discrepancy_details: null,
      joined_at: "2026-09-15T14:30:05Z",
      schema_version: 1,
    };

    it("validates a complete LakeD1JoinRecord as valid", () => {
      const result = validateLakeD1JoinRecord(validJoinRecord);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("rejects invalid lake_candidate_id", () => {
      const record = { ...validJoinRecord, lake_candidate_id: 0 };
      const result = validateLakeD1JoinRecord(record);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("lake_candidate_id must be a positive number");
    });

    it("rejects missing source_id", () => {
      const record = { ...validJoinRecord, source_id: "" };
      const result = validateLakeD1JoinRecord(record);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("source_id is required and must be a non-empty string");
    });

    it("rejects missing provider_id", () => {
      const record = { ...validJoinRecord, provider_id: "" };
      const result = validateLakeD1JoinRecord(record);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("provider_id is required and must be a non-empty string");
    });

    it("rejects invalid lake_first_seen_at", () => {
      const record = { ...validJoinRecord, lake_first_seen_at: "not-a-date" };
      const result = validateLakeD1JoinRecord(record);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("lake_first_seen_at is required and must be a valid ISO8601 string");
    });

    it("accepts null lake_qualified_ready_at", () => {
      const record = { ...validJoinRecord, lake_qualified_ready_at: null };
      const result = validateLakeD1JoinRecord(record);
      expect(result.valid).toBe(true);
    });

    it("rejects invalid lake_qualified_ready_at", () => {
      const record = { ...validJoinRecord, lake_qualified_ready_at: "not-a-date" };
      const result = validateLakeD1JoinRecord(record);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("lake_qualified_ready_at must be null or a valid ISO8601 string");
    });

    it("rejects invalid d1_first_publication_at", () => {
      const record = { ...validJoinRecord, d1_first_publication_at: "not-a-date" };
      const result = validateLakeD1JoinRecord(record);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("d1_first_publication_at must be null or a valid ISO8601 string");
    });

    it("rejects invalid publication_cohort", () => {
      const record = { ...validJoinRecord, publication_cohort: "INVALID" as any };
      const result = validateLakeD1JoinRecord(record);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("publication_cohort must be null or one of"))).toBe(true);
    });

    it("accepts null publication_cohort when not published", () => {
      const record = { ...validJoinRecord, published_to_d1: false, d1_opportunity_id: null, d1_first_publication_at: null, publication_cohort: null };
      const result = validateLakeD1JoinRecord(record);
      expect(result.valid).toBe(true);
    });

    it("rejects published_to_d1 without d1_opportunity_id", () => {
      const record = { ...validJoinRecord, published_to_d1: true, d1_opportunity_id: null };
      const result = validateLakeD1JoinRecord(record);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("published_to_d1=true requires d1_opportunity_id");
    });

    it("rejects published_to_d1 without d1_first_publication_at", () => {
      const record = { ...validJoinRecord, published_to_d1: true, d1_first_publication_at: null };
      const result = validateLakeD1JoinRecord(record);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("published_to_d1=true requires d1_first_publication_at");
    });

    it("rejects published_to_d1 without publication_cohort", () => {
      const record = { ...validJoinRecord, published_to_d1: true, publication_cohort: null };
      const result = validateLakeD1JoinRecord(record);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("published_to_d1=true requires publication_cohort");
    });

    it("rejects invalid validation_result", () => {
      const record = { ...validJoinRecord, validation_result: "INVALID" as any };
      const result = validateLakeD1JoinRecord(record);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("validation_result must be one of"))).toBe(true);
    });

    it("rejects MISMATCH without discrepancy_details", () => {
      const record = { ...validJoinRecord, validation_result: "MISMATCH" as const, discrepancy_details: null };
      const result = validateLakeD1JoinRecord(record);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("discrepancy_details is required when validation_result is MISMATCH");
    });

    it("accepts MISMATCH with discrepancy_details", () => {
      const record = { ...validJoinRecord, validation_result: "MISMATCH" as const, discrepancy_details: "cohort mismatch: lake=FRESH_DISCOVERY vs d1=REPLAY_RECOVERY" };
      const result = validateLakeD1JoinRecord(record);
      expect(result.valid).toBe(true);
    });

    it("creates unpublished LakeD1JoinRecord", () => {
      const record = createUnpublishedLakeD1JoinRecord(
        67890,
        "remotive",
        "Remotive",
        "2026-09-12T08:00:00Z",
        "2026-09-14T12:00:00Z"
      );

      expect(record.lake_candidate_id).toBe(67890);
      expect(record.d1_opportunity_id).toBeNull();
      expect(record.source_id).toBe("remotive");
      expect(record.provider_id).toBe("Remotive");
      expect(record.lake_first_seen_at).toBe("2026-09-12T08:00:00Z");
      expect(record.lake_qualified_ready_at).toBe("2026-09-14T12:00:00Z");
      expect(record.d1_first_publication_at).toBeNull();
      expect(record.publication_cohort).toBeNull();
      expect(record.published_to_d1).toBe(false);
      expect(record.labels_validated).toBe(false);
      expect(record.validation_result).toBeNull();
      expect(record.discrepancy_details).toBeNull();
      expect(record.joined_at).toBeDefined();
      expect(record.schema_version).toBe(1);
    });
  });

  // ─── Cross-contract utilities ───────────────────────────────────────────────
  describe("Cross-contract utilities", () => {
    it("exports correct schema version", () => {
      expect(MEASUREMENT_CONTRACTS_SCHEMA_VERSION).toBe(1);
    });

    it("exports all five contract identifiers", () => {
      expect(SSAE_06_CONTRACTS).toEqual({
        "SSAE-06A": "Per-source Hunter epoch ledger",
        "SSAE-06B": "Publication cohort labels",
        "SSAE-06C": "Per-stage latency instrumentation",
        "SSAE-06D": "Fetch byte & conditional-fetch logging",
        "SSAE-06E": "D1 join for lake labels",
      });
    });

    describe("checkMeasurementContractMaturity", () => {
      it("returns mature=true when all contracts meet thresholds", () => {
        const maturity = checkMeasurementContractMaturity({
          hunterLedgerCoverage: 0.95,
          cohortLabelCoverage: 0.85,
          latencyTraceCoverage: 0.75,
          byteLogCoverage: 0.92,
          lakeD1JoinCoverage: 0.65,
        });

        expect(maturity.mature).toBe(true);
        expect(maturity.missing).toEqual([]);
        expect(maturity.contractStatus["SSAE-06A"].mature).toBe(true);
        expect(maturity.contractStatus["SSAE-06B"].mature).toBe(true);
        expect(maturity.contractStatus["SSAE-06C"].mature).toBe(true);
        expect(maturity.contractStatus["SSAE-06D"].mature).toBe(true);
        expect(maturity.contractStatus["SSAE-06E"].mature).toBe(true);
      });

      it("returns mature=false when some contracts below threshold", () => {
        const maturity = checkMeasurementContractMaturity({
          hunterLedgerCoverage: 0.80, // Below 0.90
          cohortLabelCoverage: 0.85,
          latencyTraceCoverage: 0.75,
          byteLogCoverage: 0.92,
          lakeD1JoinCoverage: 0.65,
        });

        expect(maturity.mature).toBe(false);
        expect(maturity.missing).toContain("SSAE-06A");
        expect(maturity.contractStatus["SSAE-06A"].mature).toBe(false);
        expect(maturity.contractStatus["SSAE-06A"].coverage).toBe(0.80);
      });

      it("reports all missing contracts", () => {
        const maturity = checkMeasurementContractMaturity({
          hunterLedgerCoverage: 0.50,
          cohortLabelCoverage: 0.50,
          latencyTraceCoverage: 0.50,
          byteLogCoverage: 0.50,
          lakeD1JoinCoverage: 0.50,
        });

        expect(maturity.mature).toBe(false);
        expect(maturity.missing).toHaveLength(5);
        expect(maturity.missing).toEqual(["SSAE-06A", "SSAE-06B", "SSAE-06C", "SSAE-06D", "SSAE-06E"]);
      });

      it("uses correct thresholds per contract", () => {
        const maturity = checkMeasurementContractMaturity({
          hunterLedgerCoverage: 0.89, // Just below 0.90
          cohortLabelCoverage: 0.79, // Just below 0.80
          latencyTraceCoverage: 0.69, // Just below 0.70
          byteLogCoverage: 0.89, // Just below 0.90
          lakeD1JoinCoverage: 0.59, // Just below 0.60
        });

        expect(maturity.mature).toBe(false);
        expect(maturity.missing).toHaveLength(5);
      });
    });

    describe("generateMeasurementContractReceipt", () => {
      it("generates receipt with MATURE disposition when all mature", () => {
        const maturity = checkMeasurementContractMaturity({
          hunterLedgerCoverage: 1.0,
          cohortLabelCoverage: 1.0,
          latencyTraceCoverage: 1.0,
          byteLogCoverage: 1.0,
          lakeD1JoinCoverage: 1.0,
        });

        const receipt = generateMeasurementContractReceipt("hunter_2026-09-15_12:00", maturity);

        expect(receipt).toContain("SSAE-06 Measurement Contract Receipt");
        expect(receipt).toContain("Epoch: hunter_2026-09-15_12:00");
        expect(receipt).toContain("Overall Mature: YES");
        expect(receipt).toContain("DISPOSITION: MATURE");
        expect(receipt).toContain("SSAE-06A (Per-source Hunter epoch ledger): MATURE");
        expect(receipt).toContain("SSAE-06B (Publication cohort labels): MATURE");
        expect(receipt).toContain("SSAE-06C (Per-stage latency instrumentation): MATURE");
        expect(receipt).toContain("SSAE-06D (Fetch byte & conditional-fetch logging): MATURE");
        expect(receipt).toContain("SSAE-06E (D1 join for lake labels): MATURE");
      });

      it("generates receipt with LIMITED disposition when missing contracts", () => {
        const maturity = checkMeasurementContractMaturity({
          hunterLedgerCoverage: 0.50,
          cohortLabelCoverage: 0.85,
          latencyTraceCoverage: 0.75,
          byteLogCoverage: 0.92,
          lakeD1JoinCoverage: 0.65,
        });

        const receipt = generateMeasurementContractReceipt("hunter_2026-09-15_12:00", maturity);

        expect(receipt).toContain("Overall Mature: NO");
        expect(receipt).toContain("DISPOSITION: LIMITED");
        expect(receipt).toContain("SSAE-06A (Per-source Hunter epoch ledger): IMMATURE");
        expect(receipt).toContain("Missing Contracts");
        expect(receipt).toContain("SSAE-06A: Per-source Hunter epoch ledger");
      });

      it("includes coverage percentages in receipt", () => {
        const maturity = checkMeasurementContractMaturity({
          hunterLedgerCoverage: 0.875,
          cohortLabelCoverage: 0.9,
          latencyTraceCoverage: 0.7,
          byteLogCoverage: 0.8,
          lakeD1JoinCoverage: 0.6,
        });

        const receipt = generateMeasurementContractReceipt("test_epoch", maturity);
        expect(receipt).toContain("87.5%");
        expect(receipt).toContain("90.0%");
        expect(receipt).toContain("70.0%");
        expect(receipt).toContain("80.0%");
        expect(receipt).toContain("60.0%");
      });
    });
  });

  // ─── Type exports verification ──────────────────────────────────────────────
  describe("Type exports", () => {
    it("exports SourceFetchState type", () => {
      const state: SourceFetchState = {
        source_id: "test",
        provider_id: "Test",
        epoch_timestamp: "2026-09-15T12:00:00Z",
        epoch_label: "test",
        fetch_outcome: "SUCCESS",
        http_status: 200,
        etag: null,
        last_modified: null,
        body_hash: null,
        bytes_fetched: 100,
        was_conditional: false,
        not_modified: false,
        fetch_latency_ms: 10,
        parse_latency_ms: 5,
        validate_latency_ms: 3,
        raw_items_fetched: 10,
        items_normalized: 8,
        items_geo_eligible: 5,
        items_qualified_ready: 3,
        error_message: null,
        retry_after_seconds: null,
        consecutive_failures: 0,
        backoff_until: null,
      };
      expect(state.source_id).toBe("test");
    });

    it("exports HunterEpochLedger type", () => {
      const ledger: HunterEpochLedger = {
        epoch_timestamp: "2026-09-15T12:00:00Z",
        epoch_label: "test",
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
      expect(ledger.pipeline_phase).toBe("hunter_scrape");
    });

    it("exports PublicationCohortLabel type", () => {
      const label: PublicationCohortLabel = {
        job_id: "job-1",
        source_id: "src-1",
        provider_id: "Prov-1",
        cohort: "FRESH_DISCOVERY",
        secondary_cohorts: [],
        first_publication_at: "2026-09-15T12:00:00Z",
        posted_at: "2026-09-15T10:00:00Z",
        labeled_at: "2026-09-15T12:00:00Z",
        labeling_rule_version: "v1",
        evidence_refs: [],
      };
      expect(label.cohort).toBe("FRESH_DISCOVERY");
    });

    it("exports LatencySpan type", () => {
      const span: LatencySpan = {
        stage: "fetch",
        source_id: "src-1",
        job_id: "job-1",
        started_at: "2026-09-15T12:00:00Z",
        completed_at: "2026-09-15T12:00:01Z",
        duration_ms: 1000,
        success: true,
        error_message: null,
        metadata: {},
      };
      expect(span.stage).toBe("fetch");
    });

    it("exports JobLatencyTrace type", () => {
      const trace: JobLatencyTrace = {
        job_id: "job-1",
        source_id: "src-1",
        provider_id: "Prov-1",
        trace_timestamp: "2026-09-15T12:00:00Z",
        spans: [],
        total_latency_ms: 0,
        success: true,
        schema_version: 1,
      };
      expect(trace.job_id).toBe("job-1");
    });

    it("exports FetchByteLog type", () => {
      const log: FetchByteLog = {
        source_id: "src-1",
        provider_id: "Prov-1",
        fetch_timestamp: "2026-09-15T12:00:00Z",
        epoch_label: "test",
        bytes_fetched: 1000,
        conditional_attempted: false,
        not_modified: false,
        request_etag: null,
        response_etag: null,
        request_last_modified: null,
        response_last_modified: null,
        http_status: 200,
        fetch_latency_ms: 100,
        success: true,
      };
      expect(log.bytes_fetched).toBe(1000);
    });

    it("exports SourceFetchByteStats type", () => {
      const stats: SourceFetchByteStats = {
        source_id: "src-1",
        provider_id: "Prov-1",
        epoch_label: "test",
        total_attempts: 1,
        full_fetches: 1,
        conditional_attempts: 0,
        not_modified_count: 0,
        total_bytes_fetched: 1000,
        avg_bytes_per_full_fetch: 1000,
        conditional_fetch_ratio: 0,
        cache_hit_rate: 0,
        total_fetch_latency_ms: 100,
        avg_fetch_latency_ms: 100,
      };
      expect(stats.source_id).toBe("src-1");
    });

    it("exports LakeD1JoinRecord type", () => {
      const record: LakeD1JoinRecord = {
        lake_candidate_id: 1,
        d1_opportunity_id: null,
        source_id: "src-1",
        provider_id: "Prov-1",
        lake_first_seen_at: "2026-09-15T12:00:00Z",
        lake_qualified_ready_at: null,
        d1_first_publication_at: null,
        publication_cohort: null,
        published_to_d1: false,
        labels_validated: false,
        validation_result: null,
        discrepancy_details: null,
        joined_at: "2026-09-15T12:00:00Z",
        schema_version: 1,
      };
      expect(record.lake_candidate_id).toBe(1);
    });

    it("exports SSAE06ContractId type", () => {
      const contract: SSAE06ContractId = "SSAE-06A";
      expect(contract).toBe("SSAE-06A");
    });
  });
});