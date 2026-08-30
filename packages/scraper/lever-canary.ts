/**
 * SP-11 — Lever public Postings API canary (pure helpers, no I/O).
 *
 * Mirrors SP-12's Greenhouse shape: the existing `fetchLever` adapter
 * (packages/scraper/ats.ts) already implements the fetch/parse for this
 * platform — canonical `hostedUrl` linkback, `categories.location` +
 * `workplaceType`, and a title. Unlike Greenhouse's location-only summary,
 * `fetchLever` also stores a **500-character-truncated** plain-text
 * description snippet (`descriptionPlain`), not the full posting — this
 * module and its evidence pack describe that honestly as
 * "minimal-with-truncated-summary" rather than claiming zero description,
 * since accuracy here matters more than matching SP-12's exact wording.
 *
 * Official public Postings API docs: https://github.com/lever/postings-api
 * (RESTful, no auth for GET; separate global `api.lever.co` and EU
 * `api.eu.lever.co` origins — SP-11's "EU/global origin is explicit"
 * criterion). This unit does not activate any source; see
 * `decidePromotionToShadow` in `./source-promotion` for the same
 * evidence-gated guard SP-12 uses.
 */

import { computeReviewDeadline, computePolicyExpiry } from "./source-lifecycle";

export const LEVER_PROVIDER_ID = "lever";
export const LEVER_EVIDENCE_URL = "https://github.com/lever/postings-api";
export const LEVER_ALLOWED_HOSTS = "api.lever.co,api.eu.lever.co";
export const LEVER_EVIDENCE_LEASE_DAYS = 180;

export interface LeverProviderProfileRow {
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
  contentScope: "minimal_with_truncated_summary";
  cadenceMinMinutes: number;
  cadenceMaxMinutes: number;
  rateGuidance: string;
  robotsHandling: "observe";
  removalSemantics: string;
  defaultComplianceState: "needs_review";
  defaultOperationalState: "candidate";
  notes: string;
}

export function buildLeverProviderProfile(): LeverProviderProfileRow {
  return {
    id: LEVER_PROVIDER_ID,
    displayName: "Lever",
    providerFamily: "lever",
    mechanism: "ats_api",
    authClass: "none",
    endpointPattern: "https://api.lever.co/v0/postings/{token}?mode=json",
    allowedHosts: LEVER_ALLOWED_HOSTS,
    evidenceUrl: LEVER_EVIDENCE_URL,
    evidenceLeaseDays: LEVER_EVIDENCE_LEASE_DAYS,
    visibilityFilter: "published",
    contentScope: "minimal_with_truncated_summary",
    cadenceMinMinutes: 60,
    cadenceMaxMinutes: 1440,
    rateGuidance: "Public Postings API GET is unauthenticated with no documented per-minute limit; this project's own 60-minute ATS cadence guard applies regardless.",
    robotsHandling: "observe",
    removalSemantics: "Deactivate within one successful reconciliation cycle once a posting disappears from a complete feed pull.",
    defaultComplianceState: "needs_review",
    defaultOperationalState: "candidate",
    notes: "The public Postings API (github.com/lever/postings-api) is RESTful, unauthenticated for GET, and exposes only published/listed postings across separate global (api.lever.co) and EU (api.eu.lever.co) origins. The existing fetchLever adapter stores title, canonical hostedUrl, location/workplaceType, and a 500-character-truncated description snippet — not the full posting. Application submission (POST) is out of scope and never used.",
  };
}

export interface LeverBoardInput {
  token: string;
  companyName: string;
  nowIso: string;
  reviewDeadlineDays?: number;
}

export interface LeverCandidateRow {
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

export function buildLeverCandidateRow(input: LeverBoardInput): LeverCandidateRow {
  const sourceId = `lever:${input.token}`;
  const endpointUrl = `https://api.lever.co/v0/postings/${input.token}?mode=json`;
  const provenance = JSON.stringify({
    companyName: input.companyName,
    token: input.token,
    decidedAt: input.nowIso,
    provenance: "sp-11-curated-board",
    complianceBasis: "documented public/no-auth Postings API GET (github.com/lever/postings-api); minimal-with-truncated-summary conditional decision per Source Perpetuity strategy operating posture",
  });
  return {
    sourceId,
    providerId: LEVER_PROVIDER_ID,
    displayName: input.companyName,
    endpointUrl,
    companyToken: input.token,
    discoveryProvenance: provenance,
    complianceState: "conditional",
    operationalState: "candidate",
    reviewDeadline: computeReviewDeadline(input.nowIso, input.reviewDeadlineDays ?? 14),
    policyExpiry: computePolicyExpiry(input.nowIso, LEVER_EVIDENCE_LEASE_DAYS),
    owner: "sp-11",
    lastDecision: "conditional minimal-with-truncated-summary decision (documented public/no-auth Postings API GET)",
    lastDecisionAt: input.nowIso,
    optOut: 0,
  };
}
