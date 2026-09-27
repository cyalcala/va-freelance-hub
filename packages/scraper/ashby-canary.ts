/**
 * Ashby ATS minimal-index shadow/canary (pure helpers, no I/O).
 *
 * Ashby provides an unauthenticated, public posting API endpoint on:
 * `https://api.ashbyhq.com/posting-api/job-board/{token}`
 * intended for public job discovery and custom careers page integration.
 *
 * Primary documentation:
 * `https://developers.ashbyhq.com/docs/public-job-posting-api.md`
 * "This API is public and does not require authentication. You can use this
 * to build a custom job board on your own website, or to integrate with
 * third-party job boards."
 *
 * Minimal-index content scope:
 * Captures `title`, `company`, `type`, `sourceUrl` (direct linkback to
 * Ashby-hosted posting on jobs.ashbyhq.com), `locationRaw`, `description`
 * (location/remote summary only, never full HTML), and `postedAt`.
 */

import {
  computeReviewDeadline,
  computePolicyExpiry,
} from "./source-lifecycle";
import { decidePromotionToShadow } from "./source-promotion";

// ─── Provider profile ────────────────────────────────────────────────────────

export const ASHBY_PROVIDER_ID = "ashby";
export const ASHBY_EVIDENCE_URL = "https://developers.ashbyhq.com/docs/public-job-posting-api.md";
export const ASHBY_EVIDENCE_LEASE_DAYS = 180;
export const ASHBY_ALLOWED_HOSTS = "api.ashbyhq.com";

export interface AshbyProviderProfileRow {
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

export function buildAshbyProviderProfile(): AshbyProviderProfileRow {
  return {
    id: ASHBY_PROVIDER_ID,
    displayName: "Ashby",
    providerFamily: "ashby",
    mechanism: "ats_api",
    authClass: "none",
    endpointPattern: "https://api.ashbyhq.com/posting-api/job-board/{token}",
    allowedHosts: ASHBY_ALLOWED_HOSTS,
    evidenceUrl: ASHBY_EVIDENCE_URL,
    evidenceLeaseDays: ASHBY_EVIDENCE_LEASE_DAYS,
    visibilityFilter: "published",
    contentScope: "minimal",
    cadenceMinMinutes: 60,
    cadenceMaxMinutes: 1440,
    rateGuidance: "Public posting API GET is unauthenticated; 60-minute ATS cadence guard applies.",
    robotsHandling: "observe",
    removalSemantics: "Deactivate within one successful reconciliation cycle once a posting disappears from a complete feed pull.",
    defaultComplianceState: "needs_review",
    defaultOperationalState: "candidate",
    notes: "Ashby public /posting-api/job-board/{token} job board endpoint. Official unauthenticated distribution API: robots-allowed via jobs.ashbyhq.com, returns published/listed roles with direct linkback to the Ashby-hosted posting. Captures minimal discovery metadata (title, company, URL, location, remote status, published date). Never scrapes full description HTML.",
  };
}

// ─── Candidate row for one curated board ────────────────────────────────────

export interface AshbyBoardInput {
  token: string;
  companyName: string;
  nowIso: string;
  reviewDeadlineDays?: number;
}

export interface AshbyCandidateRow {
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
  canaryMaxNewItemsPerTick: number;
  owner: string;
  lastDecision: string;
  lastDecisionAt: string;
  optOut: 0;
}

export function buildAshbyCandidateRow(input: AshbyBoardInput): AshbyCandidateRow {
  const sourceId = `ashby:${input.token}`;
  const endpointUrl = `https://api.ashbyhq.com/posting-api/job-board/${input.token}`;
  const provenance = JSON.stringify({
    companyName: input.companyName,
    token: input.token,
    decidedAt: input.nowIso,
    provenance: "ashby-ph-agency-qualification",
    complianceBasis: "documented public/no-auth Ashby posting API GET (developers.ashbyhq.com); minimal discovery metadata conditional decision per Source Perpetuity strategy operating posture",
  });

  return {
    sourceId,
    providerId: ASHBY_PROVIDER_ID,
    displayName: input.companyName,
    endpointUrl,
    companyToken: input.token,
    discoveryProvenance: provenance,
    complianceState: "conditional",
    operationalState: "candidate",
    reviewDeadline: computeReviewDeadline(input.nowIso, input.reviewDeadlineDays ?? 14),
    policyExpiry: computePolicyExpiry(input.nowIso, ASHBY_EVIDENCE_LEASE_DAYS),
    canaryMaxNewItemsPerTick: 2,
    owner: "techwriter-bot",
    lastDecision: "conditional minimal-index decision (public no-auth Ashby posting API)",
    lastDecisionAt: input.nowIso,
    optOut: 0,
  };
}

export { decidePromotionToShadow };
