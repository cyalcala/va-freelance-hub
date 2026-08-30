/**
 * SP-15 — Recruitee company XML feed canary (pure helpers, no I/O).
 *
 * Uses the new `packages/scraper/recruitee.ts` adapter (this unit's own
 * contribution — Recruitee was not previously supported anywhere in this
 * project). Promotion decision reuses SP-12's shared, provider-agnostic
 * `decidePromotionToShadow` from `./source-promotion`, which already gates
 * on `optOut` — this unit's own tests (`recruitee-canary.test.ts`)
 * explicitly exercise that gate, matching the plan's specific emphasis
 * here on verifying opt-out/do-not-reingest before shadow.
 *
 * Official docs: https://docs.recruitee.com/docs/feed
 */

import { computeReviewDeadline, computePolicyExpiry } from "./source-lifecycle";
import { recruiteeFeedUrl } from "./recruitee";

export const RECRUITEE_PROVIDER_ID = "recruitee";
export const RECRUITEE_EVIDENCE_URL = "https://docs.recruitee.com/docs/feed";
export const RECRUITEE_EVIDENCE_LEASE_DAYS = 180;

export interface RecruiteeProviderProfileRow {
  id: string;
  displayName: string;
  providerFamily: string;
  mechanism: "xml_feed";
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

/** allowedHosts is per-source (each company has its own {company}.recruitee.com
 * subdomain), matching Teamtailor's per-career-domain pattern. */
export function buildRecruiteeProviderProfile(companySubdomain: string): RecruiteeProviderProfileRow {
  const host = `${companySubdomain}.recruitee.com`;
  return {
    id: RECRUITEE_PROVIDER_ID,
    displayName: "Recruitee",
    providerFamily: "recruitee",
    mechanism: "xml_feed",
    authClass: "none",
    endpointPattern: "https://{companySubdomain}.recruitee.com/api/feeds/offers.xml",
    allowedHosts: host,
    evidenceUrl: RECRUITEE_EVIDENCE_URL,
    evidenceLeaseDays: RECRUITEE_EVIDENCE_LEASE_DAYS,
    visibilityFilter: "published",
    contentScope: "minimal",
    cadenceMinMinutes: 60,
    cadenceMaxMinutes: 1440,
    rateGuidance: "Public XML feed GET is unauthenticated with no documented per-minute limit; this project's own 60-minute ATS cadence guard applies regardless. No pagination exists — official docs confirm one fetch returns every currently-published offer.",
    robotsHandling: "observe",
    removalSemantics: "Deactivate within one successful reconciliation cycle once a posting disappears from a complete feed pull (the feed's own docs confirm offers disappear immediately on status change).",
    defaultComplianceState: "needs_review",
    defaultOperationalState: "candidate",
    notes: "Targets the XML feed (/api/feeds/offers.xml), not Recruitee's separate token-gated Careers Site API, per this project's plan. Only published offers appear in the feed by construction — no separate visibility field to filter on, unlike SmartRecruiters/Teamtailor. description/requirements/highlight (full HTML) and mailbox_email (a job-specific application-routing address) are actively excluded by the adapter; careers_url (the posting's own view page) is used as the canonical link, not apply_url.",
  };
}

export interface RecruiteeCompanyInput {
  companySubdomain: string;
  companyName: string;
  nowIso: string;
  reviewDeadlineDays?: number;
}

export interface RecruiteeCandidateRow {
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

export function buildRecruiteeCandidateRow(input: RecruiteeCompanyInput): RecruiteeCandidateRow {
  const sourceId = `recruitee:${input.companySubdomain}`;
  const endpointUrl = recruiteeFeedUrl(input.companySubdomain);
  const provenance = JSON.stringify({
    companyName: input.companyName,
    companySubdomain: input.companySubdomain,
    decidedAt: input.nowIso,
    provenance: "sp-15-curated-company",
    complianceBasis: "documented public/no-auth XML feed (docs.recruitee.com/docs/feed); minimal-content conditional decision per Source Perpetuity strategy operating posture",
  });
  return {
    sourceId,
    providerId: RECRUITEE_PROVIDER_ID,
    displayName: input.companyName,
    endpointUrl,
    companyToken: input.companySubdomain,
    discoveryProvenance: provenance,
    complianceState: "conditional",
    operationalState: "candidate",
    reviewDeadline: computeReviewDeadline(input.nowIso, input.reviewDeadlineDays ?? 14),
    policyExpiry: computePolicyExpiry(input.nowIso, RECRUITEE_EVIDENCE_LEASE_DAYS),
    owner: "sp-15",
    lastDecision: "conditional minimal-content decision (documented public/no-auth XML feed)",
    lastDecisionAt: input.nowIso,
    optOut: 0,
  };
}
