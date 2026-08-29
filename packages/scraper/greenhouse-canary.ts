/**
 * SP-12 — Greenhouse minimal-index shadow/canary (pure helpers, no I/O).
 *
 * The existing `fetchGreenhouse` adapter (packages/scraper/ats.ts) already
 * implements the minimal-index content scope required here: it stores only
 * `title`, `sourceUrl` (canonical `absolute_url` linkback), a location
 * summary string (never the full HTML job description), and `updated_at` —
 * no application-submission call, no internal/private fields. SP-12 does not
 * need a new adapter; it needs the registry-backed compliance decision and
 * lifecycle promotion this module encodes.
 *
 * This unit replaces the project's indefinite blanket Greenhouse pause with
 * one curated board's evidence-gated shadow entry, per the Source Perpetuity
 * strategy's already-accepted operating posture: an official, documented,
 * unauthenticated posting API is affirmative access evidence for a
 * conditional minimal-metadata decision, without requiring Greenhouse to
 * publish bespoke "aggregation permitted" wording — provided the unit proves
 * attribution, minimal content, cadence, opt-out, canary, and rollback
 * (strategy §Operating posture). The existing five-token blanket pause
 * (ATS_TOKEN_POLICIES, apps/web/src/pages/api/cron/scrape.ts) is NOT changed
 * by this unit — it remains the exact-scoped rollback adapter; only the
 * registry overlay for one board is written, and shadow never publishes
 * (policy-resolver.ts: `isPublishable` returns false for operational=shadow
 * regardless of compliance state).
 */

import type { EvidencePacket } from "./evidence-packet";
import type { CandidateShadowResult } from "./candidate-shadow";
import { canEnterShadow, computeReviewDeadline, computePolicyExpiry, type ComplianceState, type OperationalState } from "./source-lifecycle";

// ─── Provider profile ────────────────────────────────────────────────────────

export const GREENHOUSE_PROVIDER_ID = "greenhouse";
export const GREENHOUSE_EVIDENCE_URL = "https://docs.greenhouse.io/job-board.html";
export const GREENHOUSE_ALLOWED_HOSTS = "boards-api.greenhouse.io,boards.greenhouse.io";
export const GREENHOUSE_EVIDENCE_LEASE_DAYS = 180; // strategy: public/documented access evidence lease

export interface GreenhouseProviderProfileRow {
  id: string;
  displayName: string;
  providerFamily: string;
  mechanism: "ats_api";
  authClass: "none";
  endpointPattern: string;
  allowedHosts: string;
  evidenceUrl: string;
  evidenceLeaseDays: number;
  visibilityFilter: "published";
  contentScope: "minimal";
  cadenceMinMinutes: number;
  cadenceMaxMinutes: number;
  rateGuidance: string;
  robotsHandling: "observe";
  removalSemantics: string;
  defaultComplianceState: "needs_review";
  defaultOperationalState: "candidate";
  notes: string;
}

export function buildGreenhouseProviderProfile(): GreenhouseProviderProfileRow {
  return {
    id: GREENHOUSE_PROVIDER_ID,
    displayName: "Greenhouse",
    providerFamily: "greenhouse",
    mechanism: "ats_api",
    authClass: "none",
    endpointPattern: "https://boards-api.greenhouse.io/v1/boards/{token}/jobs",
    allowedHosts: GREENHOUSE_ALLOWED_HOSTS,
    evidenceUrl: GREENHOUSE_EVIDENCE_URL,
    evidenceLeaseDays: GREENHOUSE_EVIDENCE_LEASE_DAYS,
    visibilityFilter: "published",
    contentScope: "minimal",
    cadenceMinMinutes: 60,
    cadenceMaxMinutes: 1440,
    rateGuidance: "Job Board GET is public/no-auth; no documented per-minute limit — this project's own 60-minute ATS cadence guard applies regardless.",
    robotsHandling: "observe",
    removalSemantics: "Deactivate within one successful reconciliation cycle once a posting disappears from a complete feed pull.",
    defaultComplianceState: "needs_review",
    defaultOperationalState: "candidate",
    notes: "Job Board GET data is public and authentication-free (docs.greenhouse.io/job-board.html) and framed for an organization's own career site; no explicit third-party aggregation/redistribution terms are published. Per the Source Perpetuity strategy's operating posture, this supports a conditional minimal-metadata decision (title/company/location/canonical apply link only, never the full description) without bespoke 'aggregation permitted' wording. Content submission (application POST) is out of scope and never used.",
  };
}

// ─── Candidate row for one curated board ────────────────────────────────────

export interface GreenhouseBoardInput {
  token: string;
  companyName: string;
  nowIso: string;
  reviewDeadlineDays?: number;
}

export interface GreenhouseCandidateRow {
  sourceId: string;
  providerId: string;
  displayName: string;
  endpointUrl: string;
  companyToken: string;
  discoveryProvenance: string;
  complianceState: "conditional";
  operationalState: "candidate";
  reviewDeadline: string;
  policyExpiry: string;
  owner: string;
  lastDecision: string;
  lastDecisionAt: string;
  optOut: 0;
}

/**
 * Build the initial registry row for one curated Greenhouse board. The
 * compliance decision (`conditional`) is made here, backed by the provider
 * profile's evidence — matching the strategy's operating posture for
 * documented public/no-auth posting APIs. Operational state always starts
 * `candidate`; promotion to `shadow` is a separate, explicitly evidenced
 * step (see `decidePromotionToShadow` below), never implicit.
 */
export function buildGreenhouseCandidateRow(input: GreenhouseBoardInput): GreenhouseCandidateRow {
  const sourceId = `greenhouse:${input.token}`;
  const endpointUrl = `https://boards-api.greenhouse.io/v1/boards/${input.token}/jobs`;
  const provenance = JSON.stringify({
    companyName: input.companyName,
    token: input.token,
    decidedAt: input.nowIso,
    provenance: "sp-12-curated-board",
    complianceBasis: "documented public/no-auth Job Board GET (docs.greenhouse.io/job-board.html); minimal-metadata conditional decision per Source Perpetuity strategy operating posture",
  });
  return {
    sourceId,
    providerId: GREENHOUSE_PROVIDER_ID,
    displayName: input.companyName,
    endpointUrl,
    companyToken: input.token,
    discoveryProvenance: provenance,
    complianceState: "conditional",
    operationalState: "candidate",
    reviewDeadline: computeReviewDeadline(input.nowIso, input.reviewDeadlineDays ?? 14),
    policyExpiry: computePolicyExpiry(input.nowIso, GREENHOUSE_EVIDENCE_LEASE_DAYS),
    owner: "sp-12",
    lastDecision: "conditional minimal-index decision (documented public/no-auth Job Board GET)",
    lastDecisionAt: input.nowIso,
    optOut: 0,
  };
}

// ─── Promotion decision (candidate -> shadow), evidence-gated ──────────────

export interface ShadowPromotionDecision {
  ok: boolean;
  reason: string;
}

/**
 * Whether a curated board's candidate row may be promoted to `shadow`,
 * combining SP-05's lifecycle guard (compliance allowed|conditional,
 * currently `candidate`, not opted out) with real SP-08 evidence-packet
 * completeness and SP-07 shadow-probe health. All three must hold — a
 * healthy probe with incomplete evidence is not enough, and vice versa.
 */
export function decidePromotionToShadow(
  registryState: { compliance: ComplianceState; operational: OperationalState; optOut: boolean },
  packet: EvidencePacket,
  shadow: CandidateShadowResult,
): ShadowPromotionDecision {
  const lifecycle = canEnterShadow(registryState);
  if (!lifecycle.ok) return { ok: false, reason: `lifecycle guard: ${lifecycle.reason}` };

  if (packet.missingEvidence.length > 0) {
    return { ok: false, reason: `evidence packet incomplete: ${packet.missingEvidence.join("; ")}` };
  }
  if (shadow.diagnostic.outcome !== "HEALTHY_WITH_RESULTS" && shadow.diagnostic.outcome !== "HEALTHY_EMPTY") {
    return { ok: false, reason: `shadow probe outcome not healthy: ${shadow.diagnostic.outcome}` };
  }
  if (shadow.robots.wouldBlock) {
    return { ok: false, reason: "robots would block this endpoint" };
  }
  return { ok: true, reason: "lifecycle guard passed, evidence packet complete (review_ready), shadow probe healthy, robots allowed" };
}
