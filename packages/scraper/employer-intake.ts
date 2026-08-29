/**
 * SP-16 — No-account employer "bring your feed" intake (pure helpers, no I/O).
 *
 * An employer submits a GitHub issue (structured form,
 * `.github/ISSUE_TEMPLATE/employer-feed-intake.yml`) naming their own public
 * careers/feed URL. This module parses that issue's rendered body, rejects
 * anything containing secret-like or candidate-personal-data-like content,
 * and — only if valid — builds exactly one non-publishing `source_registry`
 * candidate row (`needs_review`/`candidate`, 14-day review deadline). It
 * never creates a user account and never publishes anything automatically:
 * a human still reviews the candidate like any other before it can enter
 * shadow.
 *
 * This module is pure so it is unit-testable without D1 or GitHub. The route
 * (`apps/web/src/pages/api/cron/employer-intake.ts`) handles auth, D1
 * reads/writes, and dedup against the live registry/opt-out tables.
 */

import { hostOf } from "./prospector";
import { computeReviewDeadline } from "./source-lifecycle";

// ─── Issue-form parsing ──────────────────────────────────────────────────────

export interface ParsedEmployerIntake {
  feedUrl: string;
  companyName: string;
  contactEmail: string;
  authorityConfirmed: boolean;
  contentScope: string;
  removalPreference: string;
}

export interface IntakeParseResult {
  ok: boolean;
  data: ParsedEmployerIntake | null;
  errors: string[];
}

// GitHub issue forms render each field as "### <label>\n\n<value>\n\n". An
// unanswered optional field renders its value as literally "_No response_".
function fieldBlocks(body: string): Map<string, string> {
  const blocks = new Map<string, string>();
  const lines = body.split(/\r?\n/);
  let currentLabel: string | null = null;
  let buf: string[] = [];
  const flush = () => {
    if (currentLabel !== null) {
      const value = buf.join("\n").trim();
      blocks.set(currentLabel.trim().toLowerCase(), value.toLowerCase() === "_no response_" ? "" : value);
    }
    buf = [];
  };
  for (const line of lines) {
    const m = /^###\s+(.*)$/.exec(line);
    if (m) {
      flush();
      currentLabel = m[1];
    } else if (currentLabel !== null) {
      buf.push(line);
    }
  }
  flush();
  return blocks;
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function isPlausibleEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isAuthorityChecked(block: string): boolean {
  return /- \[[xX]\]/.test(block);
}

// ─── Secret / candidate-data rejection (defense in depth, best-effort) ──────
// This is heuristic, not a guarantee: it exists to catch an accidental paste,
// not to be a security boundary. The intake route also never stores the raw
// issue body — only the parsed, validated fields — so even a false negative
// here does not persist un-reviewed free text into source_registry.

const SECRET_PATTERNS: RegExp[] = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/i,
  /\bapi[_-]?key\b\s*[:=]\s*\S+/i,
  /\bpassword\b\s*[:=]\s*\S+/i,
  /\bsecret\b\s*[:=]\s*\S+/i,
  /Bearer\s+[A-Za-z0-9\-_.]{20,}/,
  /\bsk-[A-Za-z0-9]{20,}\b/, // OpenAI-style key
  /\bAKIA[0-9A-Z]{16}\b/, // AWS access key id
  /\bghp_[A-Za-z0-9]{30,}\b/, // GitHub PAT
];

export function containsSecretLikeContent(text: string): string[] {
  const hits: string[] = [];
  for (const re of SECRET_PATTERNS) {
    if (re.test(text)) hits.push(re.source);
  }
  return hits;
}

const CANDIDATE_DATA_MARKERS: RegExp[] = [
  /\bcurriculum vitae\b/i,
  /\bsocial security number\b/i,
  /\bpassport number\b/i,
  /\bdate of birth\b/i,
  /\battached (my )?resume\b/i,
];

export function containsCandidateDataMarkers(text: string): string[] {
  const hits: string[] = [];
  for (const re of CANDIDATE_DATA_MARKERS) {
    if (re.test(text)) hits.push(re.source);
  }
  return hits;
}

/**
 * Parse and validate a rendered GitHub issue-form body. Required fields:
 * "Feed or careers page URL" (https), "Company name", "Contact email"
 * (plausible), "Authorization" (checkbox must be checked). Rejects the whole
 * submission (does not partially accept) if any secret-like or
 * candidate-data-like content is present anywhere in the body.
 */
export function parseIssueForm(body: string): IntakeParseResult {
  const errors: string[] = [];

  const secretHits = containsSecretLikeContent(body);
  if (secretHits.length > 0) {
    return { ok: false, data: null, errors: [`submission appears to contain secret-like content (${secretHits.length} pattern match(es)) — rejected without further parsing`] };
  }
  const candidateHits = containsCandidateDataMarkers(body);
  if (candidateHits.length > 0) {
    return { ok: false, data: null, errors: [`submission appears to contain candidate-personal-data-like content (${candidateHits.length} marker match(es)) — rejected without further parsing`] };
  }

  const fields = fieldBlocks(body);
  const feedUrl = fields.get("feed or careers page url") ?? "";
  const companyName = fields.get("company name") ?? "";
  const contactEmail = fields.get("contact email") ?? "";
  const authorityBlock = fields.get("authorization") ?? "";
  const contentScope = fields.get("content scope preference") ?? "";
  const removalPreference = fields.get("removal / opt-out preference") ?? "";

  if (!feedUrl) errors.push("Feed or careers page URL is required");
  else if (!isHttpsUrl(feedUrl)) errors.push(`Feed or careers page URL must be https: ${feedUrl}`);
  else if (!hostOf(feedUrl)) errors.push(`Feed or careers page URL host is unparseable: ${feedUrl}`);

  if (!companyName) errors.push("Company name is required");
  else if (companyName.length > 200) errors.push("Company name is implausibly long (>200 chars)");

  if (!contactEmail) errors.push("Contact email is required");
  else if (!isPlausibleEmail(contactEmail)) errors.push(`Contact email does not look like an email address: ${contactEmail}`);

  const authorityConfirmed = isAuthorityChecked(authorityBlock);
  if (!authorityConfirmed) errors.push("Authorization checkbox must be checked");

  if (errors.length > 0) return { ok: false, data: null, errors };

  return {
    ok: true,
    data: { feedUrl, companyName, contactEmail, authorityConfirmed, contentScope, removalPreference },
    errors: [],
  };
}

// ─── Candidate row builder ──────────────────────────────────────────────────

export const EMPLOYER_PROVIDER_ID = "employer-submitted";
export const EMPLOYER_PROVIDER_FAMILY = "employer-submitted";
export const EMPLOYER_REVIEW_DEADLINE_DAYS = 14;

export interface EmployerCandidateRow {
  sourceId: string;
  providerId: string;
  displayName: string;
  endpointUrl: string;
  companyToken: string | null;
  discoveryProvenance: string;
  complianceState: "needs_review";
  operationalState: "candidate";
  reviewDeadline: string;
  policyExpiry: null;
  owner: string;
  lastDecision: string;
  lastDecisionAt: string;
  optOut: 0;
}

export interface BuildEmployerCandidateInput {
  intake: ParsedEmployerIntake;
  issueNumber: number;
  issueUrl: string;
  nowIso: string;
}

/** sourceId is derived from the exact host, matching the project's exact-host
 * identity philosophy elsewhere (Prospector, candidate-shadow). Two
 * submissions for the same host collapse to the same durable candidate. */
export function employerSourceId(feedUrl: string): string | null {
  const host = hostOf(feedUrl);
  return host ? `employer:${host}` : null;
}

export function buildEmployerCandidateRow(input: BuildEmployerCandidateInput): EmployerCandidateRow {
  const { intake, issueNumber, issueUrl, nowIso } = input;
  const sourceId = employerSourceId(intake.feedUrl);
  if (!sourceId) throw new Error(`cannot derive sourceId from feedUrl host: ${intake.feedUrl}`);

  const provenance = JSON.stringify({
    companyName: intake.companyName,
    contactEmail: intake.contactEmail,
    contentScopePreference: intake.contentScope || null,
    removalPreference: intake.removalPreference || null,
    issueNumber,
    issueUrl,
    submittedAt: nowIso,
    provenance: "employer-submitted-intake",
  });

  return {
    sourceId,
    providerId: EMPLOYER_PROVIDER_ID,
    displayName: intake.companyName,
    endpointUrl: intake.feedUrl,
    companyToken: null,
    discoveryProvenance: provenance,
    // Employer authorization is a claim from the submission, not a compliance
    // decision by itself — a human still reviews before shadow (SP-05:
    // compliance holds never auto-promote).
    complianceState: "needs_review",
    operationalState: "candidate",
    reviewDeadline: computeReviewDeadline(nowIso, EMPLOYER_REVIEW_DEADLINE_DAYS),
    policyExpiry: null,
    owner: "employer-intake",
    lastDecision: "employer submission pending review",
    lastDecisionAt: nowIso,
    optOut: 0,
  };
}

// ─── Dedup ───────────────────────────────────────────────────────────────────

export type IntakeOutcome = "accepted" | "duplicate" | "opted_out" | "rejected";

export interface DedupCheckResult {
  outcome: "new" | "duplicate" | "opted_out";
  reason: string | null;
}

export function checkDuplicate(
  sourceId: string,
  existingRegistrySourceIds: ReadonlySet<string>,
  optOutSourceIds: ReadonlySet<string>,
): DedupCheckResult {
  if (optOutSourceIds.has(sourceId)) {
    return { outcome: "opted_out", reason: `${sourceId} is on the durable opt-out list — will not be reconsidered without a separate opt-out removal` };
  }
  if (existingRegistrySourceIds.has(sourceId)) {
    return { outcome: "duplicate", reason: `${sourceId} already exists in source_registry` };
  }
  return { outcome: "new", reason: null };
}
