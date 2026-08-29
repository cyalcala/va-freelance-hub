/**
 * SP-06 — Prospector durable candidate queue (pure helpers, no I/O).
 *
 * The prospect route mines already-ingested eligible jobs for Ats tokens
 * (exact-host via prospector.ts) and must persist each distinct token as a
 * non-publishing `source_registry` candidate without changing policy.
 *
 * This module is pure so it is unit-testable without D1. Runtime callers
 * handle FK/provider creation, D1 reads/writes, and guardrails.
 */

import { atsEndpointUrl, type AtsPlatform } from "./ats";
import { computeReviewDeadline } from "./source-lifecycle";
import type { ClassifiedCandidate, AtsRef } from "./prospector";

// ─── Provider mapping (FK target for source_registry.provider_id) ───────────

export interface ProviderConfig {
  providerId: string;
  providerFamily: string;
  displayName: string;
  mechanism: "ats_api";
  authClass: "none";
  endpointPattern: string;
  allowedHosts: string;
}

export const ATS_PROVIDER_CONFIG: Record<AtsPlatform, ProviderConfig> = {
  greenhouse: {
    providerId: "greenhouse",
    providerFamily: "greenhouse",
    displayName: "Greenhouse",
    mechanism: "ats_api",
    authClass: "none",
    endpointPattern: "https://boards-api.greenhouse.io/v1/boards/{token}/jobs",
    allowedHosts: "boards.greenhouse.io,boards-api.greenhouse.io",
  },
  ashby: {
    providerId: "ashby",
    providerFamily: "ashby",
    displayName: "Ashby",
    mechanism: "ats_api",
    authClass: "none",
    endpointPattern: "https://api.ashbyhq.com/posting-api/job-board/{token}",
    allowedHosts: "jobs.ashbyhq.com,api.ashbyhq.com",
  },
  lever: {
    providerId: "lever",
    providerFamily: "lever",
    displayName: "Lever",
    mechanism: "ats_api",
    authClass: "none",
    endpointPattern: "https://api.lever.co/v0/postings/{token}?mode=json",
    allowedHosts: "jobs.lever.co,api.lever.co",
  },
  breezy: {
    providerId: "breezy",
    providerFamily: "breezy",
    displayName: "Breezy HR",
    mechanism: "ats_api",
    authClass: "none",
    endpointPattern: "https://{token}.breezy.hr/json",
    allowedHosts: "breezy.hr",
  },
  workable: {
    providerId: "workable",
    providerFamily: "workable",
    displayName: "Workable",
    mechanism: "ats_api",
    authClass: "none",
    endpointPattern: "https://apply.workable.com/api/v3/accounts/{token}/jobs",
    allowedHosts: "apply.workable.com",
  },
};

export function providerConfigForPlatform(platform: AtsPlatform): ProviderConfig | null {
  return ATS_PROVIDER_CONFIG[platform] ?? null;
}

// ─── Candidate row builder ──────────────────────────────────────────────────

export const CANDIDATE_REVIEW_DEADLINE_DAYS = 14;
export const CANDIDATE_MAX_PER_RUN = 15;
export const CANDIDATE_ANOMALY_CEILING = 50;

export interface CandidateRow {
  sourceId: string;
  providerId: string;
  displayName: string;
  endpointUrl: string;
  companyToken: string;
  discoveryProvenance: string;
  complianceState: "needs_review";
  operationalState: "candidate";
  reviewDeadline: string;
  policyExpiry: string | null;
  owner: string;
  lastDecision: string;
  lastDecisionAt: string;
  optOut: 0;
}

export interface BuildCandidateInput {
  atsRef: AtsRef;
  companyName: string;
  sampleUrl: string | null;
  category?: string | null;
  jobs?: number;
  nowIso: string;
}

export function buildCandidateRow(input: BuildCandidateInput): CandidateRow {
  const { atsRef, companyName, sampleUrl, category, jobs, nowIso } = input;
  const sourceId = `${atsRef.platform}:${atsRef.token}`;
  const cfg = providerConfigForPlatform(atsRef.platform);
  if (!cfg) throw new Error(`Unknown ATS platform ${atsRef.platform}`);
  const endpointUrl = atsEndpointUrl(atsRef.platform, atsRef.token);
  const provenance = JSON.stringify({
    companyName,
    sampleUrl,
    category: category ?? null,
    jobs: jobs ?? 1,
    discoveredAt: nowIso,
    discovery: "prospector-ats",
    // exact-host provenance: the ATS token was extracted via exactOrSubdomain
    provenance: "eligible-opportunity-sample",
  });
  return {
    sourceId,
    providerId: cfg.providerId,
    displayName: companyName,
    endpointUrl,
    companyToken: atsRef.token,
    discoveryProvenance: provenance,
    complianceState: "needs_review",
    operationalState: "candidate",
    reviewDeadline: computeReviewDeadline(nowIso, CANDIDATE_REVIEW_DEADLINE_DAYS),
    policyExpiry: null,
    owner: "prospector",
    lastDecision: "prospector candidate",
    lastDecisionAt: nowIso,
    optOut: 0,
  };
}

// ─── Distinct ATS candidates from classified results ────────────────────────

/**
 * From classified (autoAdd + review) candidates that passed quality gates,
 * collect distinct ATS sourceIds. Exact-host lookalikes already failed
 * `extractAtsToken` (prospector.ts) so this set is already exact-host-safe.
 * One row per sourceId, keeping the highest jobs count for provenance.
 */
export function distinctAtsCandidates(
  classified: ClassifiedCandidate[],
  nowIso: string,
): Map<string, { candidate: ClassifiedCandidate; row: CandidateRow }> {
  const map = new Map<string, { candidate: ClassifiedCandidate; row: CandidateRow }>();
  for (const c of classified) {
    if (!c.atsRef) continue;
    const sourceId = `${c.atsRef.platform}:${c.atsRef.token}`;
    const existing = map.get(sourceId);
    if (!existing || c.jobs > existing.candidate.jobs) {
      const row = buildCandidateRow({
        atsRef: c.atsRef,
        companyName: c.companyName,
        sampleUrl: c.sampleUrl,
        category: null,
        jobs: c.jobs,
        nowIso,
      });
      map.set(sourceId, { candidate: c, row });
    }
  }
  return map;
}

// ─── D1 chunking helper (registry inserts are wider than directory) ─────────

export const CANDIDATE_INSERT_COLUMNS = 12;

// Re-export for route to know param budget per row (12 is conservative).
export function maxRegistryRowsPerBatch(): number {
  // D1 100-bound limit → 100 / 12 ≈ 8, but Drizzle may bind defaults; clamp to 6.
  return 6;
}

// ─── Backlog / deadline helpers (pure, for reporting) ───────────────────────

export interface RegistryStatusRow {
  sourceId: string;
  complianceState: string;
  operationalState: string;
  reviewDeadline: string | null;
}

export function countBacklog(rows: RegistryStatusRow[]): number {
  return rows.filter((r) => r.operationalState === "candidate" && r.complianceState === "needs_review").length;
}

export function countReviewOverdue(rows: RegistryStatusRow[], nowIso: string): number {
  const now = Date.parse(nowIso);
  return rows.filter((r) => {
    if (r.operationalState !== "candidate") return false;
    if (!r.reviewDeadline) return false;
    const dl = Date.parse(r.reviewDeadline);
    return !Number.isNaN(dl) && now >= dl;
  }).length;
}

export function summarizeCandidates(input: {
  discoveredDistinct: number;
  alreadyInRegistry: number;
  skippedOptOut: number;
  anomalyTripped: boolean;
  inserted: number;
  refreshed: number;
  backlog: number;
  overdue: number;
}): string {
  return `discovered=${input.discoveredDistinct} inserted=${input.inserted} refreshed=${input.refreshed} duplicate=${input.alreadyInRegistry} optOut=${input.skippedOptOut} anomaly=${input.anomalyTripped} backlog=${input.backlog} overdue=${input.overdue}`;
}
