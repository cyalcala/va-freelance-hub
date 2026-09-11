/**
 * Breezy HR minimal-index shadow/canary (pure helpers, no I/O).
 *
 * Breezy HR provides an unauthenticated, public `/json` endpoint on company
 * career subdomains (e.g. `https://{token}.breezy.hr/json`) intended for public
 * job discovery and syndication.
 *
 * The existing `fetchBreezy` adapter (`packages/scraper/ats.ts`) implements the
 * minimal-index content scope: it stores `title`, `company`, `type`, `sourceUrl`
 * (direct linkback to Breezy-hosted posting), `locationRaw`, `description`
 * (location/remote summary only, never full HTML), and `postedAt`.
 *
 * Complies with the project's Source Perpetuity strategy operating posture:
 * an official, unauthenticated public posting API constitutes affirmative access
 * evidence for a conditional minimal-metadata decision without requiring bespoke
 * "aggregation permitted" wording, provided attribution, linkback, cadence,
 * opt-out, canary, and rollback are preserved.
 */

import type { EvidencePacket } from "./evidence-packet";
import type { CandidateShadowResult } from "./candidate-shadow";
import {
  canEnterShadow,
  computeReviewDeadline,
  computePolicyExpiry,
  type ComplianceState,
  type OperationalState,
} from "./source-lifecycle";
import { decidePromotionToShadow, type SourcePromotionDecision } from "./source-promotion";

// ─── Provider profile ────────────────────────────────────────────────────────

export const BREEZY_PROVIDER_ID = "breezy";
export const BREEZY_EVIDENCE_URL = "https://breezy.hr";
export const BREEZY_EVIDENCE_LEASE_DAYS = 180;

export interface BreezyProviderProfileRow {
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

export function buildBreezyProviderProfile(companyToken?: string): BreezyProviderProfileRow {
  const allowedHosts = companyToken
    ? `${companyToken}.breezy.hr,breezy.hr`
    : "breezy.hr";

  return {
    id: BREEZY_PROVIDER_ID,
    displayName: "Breezy HR",
    providerFamily: "breezy",
    mechanism: "ats_api",
    authClass: "none",
    endpointPattern: "https://{companyToken}.breezy.hr/json",
    allowedHosts,
    evidenceUrl: BREEZY_EVIDENCE_URL,
    evidenceLeaseDays: BREEZY_EVIDENCE_LEASE_DAYS,
    visibilityFilter: "published",
    contentScope: "minimal",
    cadenceMinMinutes: 60,
    cadenceMaxMinutes: 1440,
    rateGuidance: "Public /json GET is unauthenticated; 60-minute ATS cadence guard applies.",
    robotsHandling: "observe",
    removalSemantics: "Deactivate within one successful reconciliation cycle once a posting disappears from a complete feed pull.",
    defaultComplianceState: "needs_review",
    defaultOperationalState: "candidate",
    notes: "Breezy HR public /json endpoint on company career portal. Captures minimal discovery metadata (title, company, URL, location, remote status, pay range, published date). Never scrapes full description HTML. Linkback routes to the Breezy-hosted application page.",
  };
}

// ─── Candidate row for one curated board ────────────────────────────────────

export interface BreezyBoardInput {
  token: string;
  companyName: string;
  nowIso: string;
  reviewDeadlineDays?: number;
}

export interface BreezyCandidateRow {
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

export function buildBreezyCandidateRow(input: BreezyBoardInput): BreezyCandidateRow {
  const sourceId = `breezy:${input.token}`;
  const endpointUrl = `https://${input.token}.breezy.hr/json`;
  const provenance = JSON.stringify({
    companyName: input.companyName,
    token: input.token,
    decidedAt: input.nowIso,
    provenance: "breezy-ph-agency-qualification",
    complianceBasis: "public unauthenticated /json endpoint on career site with robots allow, minimal metadata only",
  });

  return {
    sourceId,
    providerId: BREEZY_PROVIDER_ID,
    displayName: input.companyName,
    endpointUrl,
    companyToken: input.token,
    discoveryProvenance: provenance,
    complianceState: "conditional",
    operationalState: "candidate",
    reviewDeadline: computeReviewDeadline(input.nowIso, input.reviewDeadlineDays ?? 14),
    policyExpiry: computePolicyExpiry(input.nowIso, BREEZY_EVIDENCE_LEASE_DAYS),
    owner: "techwriter-bot",
    lastDecision: "conditional minimal-index decision (public no-auth /json endpoint)",
    lastDecisionAt: input.nowIso,
    optOut: 0,
  };
}

export { decidePromotionToShadow };
export type { SourcePromotionDecision };
