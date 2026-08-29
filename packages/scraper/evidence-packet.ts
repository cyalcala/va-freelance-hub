/**
 * SP-08 — Evidence packets and review-debt alerts.
 *
 * One durable packet per `source_registry` candidate, built from:
 *  - provider profile (official URLs, mechanism, host/auth/content/cadence/removal)
 *  - registry row (endpointUrl, compliance/operational, reviewDeadline/policyExpiry, provenance)
 *  - shadow economics (CandidateShadowResult, optional)
 *
 * Invariants:
 *  - No D1 writes, no AI, no opportunity publication.
 *  - External bodies are evidence only — never eval'd/executed; only size/hash/count stored.
 *  - Complete packets → `review_ready`; incomplete → remain `candidate` and list exact missing evidence.
 *  - 7/14/30-day and pre-expiry deadlines produce one deduplicated alert per sourceId.
 */

import { hashString } from "./contentHash";
import { hostOf, exactOrSubdomain } from "./prospector";
import type { CandidateShadowResult } from "./candidate-shadow";

// ─── Types ──────────────────────────────────────────────────────────────────

export type PacketStatus = "review_ready" | "candidate";

export interface EvidencePacketInput {
  sourceId: string;
  providerId: string;
  displayName: string;
  endpointUrl: string;
  companyToken?: string | null;
  discoveryProvenance?: string | null;
  complianceState: string; // candidate's compliance
  operationalState: string; // should be candidate for this unit
  reviewDeadline: string | null;
  policyExpiry: string | null;
  provider: {
    id: string;
    providerFamily: string;
    mechanism: string;
    authClass: string;
    endpointPattern?: string | null;
    allowedHosts?: string | null;
    evidenceUrl?: string | null;
    evidenceLeaseDays?: number | null;
    visibilityFilter?: string | null; // published | listed | public | indexable | private | null
    contentScope?: string | null; // minimal | full | metadata_only
    cadenceMinMinutes?: number | null;
    cadenceMaxMinutes?: number | null;
    rateGuidance?: string | null;
    removalSemantics?: string | null;
    robotsHandling?: string | null;
  };
  shadow?: CandidateShadowResult | null; // optional — if not yet probed, packet is incomplete
  nowIso?: string; // for deadline bucket calc; defaults to now
}

export interface EvidencePacket {
  sourceId: string;
  providerId: string;
  displayName: string;
  endpointUrl: string;
  companyToken: string | null;
  discoveryProvenance: string | null;
  // Official evidence
  mechanism: string;
  endpoint: { url: string; isHttps: boolean; host: string | null; allowedHosts: string | null; hostValid: boolean };
  auth: { class: string; supported: boolean };
  visibility: { filter: string | null; isPublic: boolean; ambiguous: boolean };
  contentScope: string | null;
  evidenceUrl: string | null;
  allowedHosts: string | null;
  // Cadence/removal
  cadence: { minMinutes: number | null; maxMinutes: number | null; rateGuidance: string | null };
  removalSemantics: string | null;
  // Lifecycles
  reviewDeadline: string | null;
  policyExpiry: string | null;
  evidenceLeaseDays: number | null;
  // Shadow economics (evidence, never exec)
  shadowEconomics: {
    probedAt: string | null;
    outcome: string | null;
    requestCount: number | null;
    bytesReceived: number | null;
    itemCount: number | null;
    plausibleItems: number | null;
    schemaHealth: string | null;
    wouldBlock: boolean | null;
    stopReason: string | null;
    // hash of the raw body length + outcome, not the body itself
    bodyEvidenceHash: string | null;
  } | null;
  // Packet meta
  status: PacketStatus;
  missingEvidence: string[];
  unresolvedQuestions: string[];
  generatedAt: string;
  packetHash: string;
  // Deadline buckets (computed)
  reviewBucket: DeadlineBucket;
  preExpiryDue: boolean;
}

export type DeadlineBucket = "overdue" | "due_7" | "due_14" | "due_30" | "ok";

export interface PacketAlert {
  sourceId: string;
  displayName: string;
  status: PacketStatus;
  bucket: DeadlineBucket;
  preExpiryDue: boolean;
  // The single most urgent bucket determines the alert's priority.
  priority: number; // 0=overdue … 4=ok (lower = more urgent)
  reviewDeadline: string | null;
  policyExpiry: string | null;
  missingCount: number;
}

// ─── Helpers — host / https / visibility ────────────────────────────────────

function isHttps(url: string): boolean {
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

function hostValidForAllowedHosts(endpointUrl: string, allowedHosts: string | null): boolean {
  const host = hostOf(endpointUrl);
  if (!host) return false;
  if (!allowedHosts) return false;
  const list = allowedHosts
    .split(",")
    .map((h) => h.trim().toLowerCase().replace(/\.$/, ""))
    .filter(Boolean);
  if (list.length === 0) return false;
  return list.some((trusted) => exactOrSubdomain(host, trusted));
}

function visibilityIsPublic(filter: string | null): boolean {
  if (!filter) return false;
  const f = filter.trim().toLowerCase();
  return f === "published" || f === "listed" || f === "public" || f === "indexable";
}

function visibilityIsAmbiguous(filter: string | null): boolean {
  if (filter === null || filter === undefined) return true;
  const f = filter.trim().toLowerCase();
  if (f === "") return true;
  if (f === "private") return true;
  return !["published", "listed", "public", "indexable", "private"].includes(f);
}

function isValidHttpsUrl(url: string | null): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === "https:";
  } catch {
    return false;
  }
}

function parseIso(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : t;
}

// ─── Deadline buckets ───────────────────────────────────────────────────────

export function deadlineBucket(reviewDeadline: string | null, nowIso: string): DeadlineBucket {
  const now = parseIso(nowIso);
  const dl = parseIso(reviewDeadline);
  if (now === null || dl === null) return "ok"; // no deadline → not overdue
  const diffMs = dl - now;
  const dayMs = 86_400_000;
  if (diffMs <= 0) return "overdue";
  if (diffMs <= 7 * dayMs) return "due_7";
  if (diffMs <= 14 * dayMs) return "due_14";
  if (diffMs <= 30 * dayMs) return "due_30";
  return "ok";
}

export function isPreExpiryDue(policyExpiry: string | null, nowIso: string, leadDays = 30): boolean {
  const now = parseIso(nowIso);
  const exp = parseIso(policyExpiry);
  if (now === null || exp === null) return false;
  const leadMs = leadDays * 86_400_000;
  return now >= exp - leadMs && now < exp;
}

function bucketPriority(bucket: DeadlineBucket): number {
  switch (bucket) {
    case "overdue":
      return 0;
    case "due_7":
      return 1;
    case "due_14":
      return 2;
    case "due_30":
      return 3;
    case "ok":
      return 4;
  }
}

// ─── Missing-evidence checklist ─────────────────────────────────────────────

function missingEvidenceFor(input: EvidencePacketInput, computed: Pick<EvidencePacket, "endpoint" | "auth" | "visibility" | "shadowEconomics">): string[] {
  const missing: string[] = [];

  // Endpoint
  if (!input.endpointUrl) missing.push("endpointUrl missing");
  else {
    if (!computed.endpoint.isHttps) missing.push("endpoint not https");
    if (!computed.endpoint.host) missing.push("endpoint host unparseable");
    if (!computed.endpoint.hostValid) missing.push(`host ${computed.endpoint.host ?? "null"} not in allowedHosts ${input.provider.allowedHosts ?? "null"}`);
  }

  // Auth
  if (input.provider.authClass !== "none") missing.push(`authClass ${input.provider.authClass} unsupported — shadow allows only 'none'`);

  // Visibility
  if (computed.visibility.ambiguous) missing.push(`visibilityFilter ${input.provider.visibilityFilter ?? "null"} ambiguous — requires explicit published|listed|public|indexable`);
  else if (!computed.visibility.isPublic) missing.push(`visibilityFilter ${input.provider.visibilityFilter ?? "null"} not public`);

  // Evidence URL (official documentation)
  if (!input.provider.evidenceUrl) missing.push("provider evidenceUrl missing — official docs required");
  else if (!isValidHttpsUrl(input.provider.evidenceUrl)) missing.push(`provider evidenceUrl not https: ${input.provider.evidenceUrl}`);

  // AllowedHosts (provider must declare allowed hosts for exact-host gate)
  if (!input.provider.allowedHosts) missing.push("provider allowedHosts missing");

  // Cadence envelope
  if (input.provider.cadenceMinMinutes === null || input.provider.cadenceMinMinutes === undefined) missing.push("provider cadenceMinMinutes missing");
  if (input.provider.cadenceMaxMinutes === null || input.provider.cadenceMaxMinutes === undefined) missing.push("provider cadenceMaxMinutes missing");

  // Shadow economics — evidence that the mechanism actually works
  if (!input.shadow) {
    missing.push("shadow probe not yet run — no live evidence");
  } else {
    const s = input.shadow;
    // External content is never executed; we only check metadata
    if (s.diagnostic.requestCount > 2) missing.push(`shadow requestCount ${s.diagnostic.requestCount} exceeds budget 2`);
    if (s.sampleFunnel.budgetExceeded || s.diagnostic.bytesReceived > 512 * 1024) missing.push(`shadow payload ${s.diagnostic.bytesReceived} bytes exceeds 512 KiB budget`);
    if (!s.fetch.attempted) missing.push("shadow fetch not attempted — wouldBlock or stop guard fired (see stopReason)");
    // Robots
    if (s.robots.checked && s.robots.wouldBlock) missing.push(`robots wouldBlock verdict=${s.robots.verdict} — ${s.robots.evidence ?? ""}`);
    // Schema
    if (s.parse.schemaHealth === "broken") missing.push(`shadow schemaHealth broken — ${s.parse.error ?? "parse failed"}`);
    // Visibility stop already above, but shadow stopReason also matters
    if (s.stopReason) {
      // Only count as missing if the stop is due to required evidence (e.g., oversize, auth, visibility already covered)
      // Include for transparency but don't double-count generic stops
      if (s.diagnostic.outcome === "POLICY_BLOCKED" || s.diagnostic.outcome === "DEGRADED_ANOMALOUS") {
        // These are already captured via auth/visibility/host/robots, but add context
        if (!missing.some((m) => m.includes(s.stopReason!))) missing.push(`shadow stopReason: ${s.stopReason}`);
      }
    }
    if (s.diagnostic.outcome === "SCHEMA_BROKEN") missing.push("shadow outcome SCHEMA_BROKEN — feed does not match declared mechanism");
    if (s.diagnostic.outcome === "UNREACHABLE") missing.push("shadow outcome UNREACHABLE — endpoint not reachable");
    if (s.diagnostic.outcome === "RATE_LIMITED") missing.push("shadow outcome RATE_LIMITED — rate limit hit");
  }

  // Review deadline
  if (!input.reviewDeadline) missing.push("reviewDeadline missing — 14-day decision SLA required");
  else if (Number.isNaN(Date.parse(input.reviewDeadline))) missing.push(`reviewDeadline not ISO: ${input.reviewDeadline}`);

  // Policy expiry / evidence lease: not strictly required for candidate, but note if missing when expiry is expected
  // For SP-08, we don't require policyExpiry for review_ready; it's for active sources. So no missing for null.

  return missing;
}

// ─── Builder ────────────────────────────────────────────────────────────────

export function buildEvidencePacket(input: EvidencePacketInput): EvidencePacket {
  const nowIso = input.nowIso ?? new Date().toISOString();
  const generatedAt = new Date().toISOString();

  const host = hostOf(input.endpointUrl);
  const isHttpsVal = isHttps(input.endpointUrl);
  const hostValid = hostValidForAllowedHosts(input.endpointUrl, input.provider.allowedHosts ?? null);
  const authSupported = input.provider.authClass === "none";
  const visFilter = input.provider.visibilityFilter ?? null;
  const isPublic = visibilityIsPublic(visFilter);
  const ambiguous = visibilityIsAmbiguous(visFilter);

  const shadowEconomics = input.shadow
    ? {
        probedAt: input.shadow.timestamp,
        outcome: input.shadow.diagnostic.outcome,
        requestCount: input.shadow.diagnostic.requestCount,
        bytesReceived: input.shadow.diagnostic.bytesReceived,
        itemCount: input.shadow.parse.itemCount ?? null,
        plausibleItems: input.shadow.sampleFunnel.plausibleItems ?? null,
        schemaHealth: input.shadow.parse.schemaHealth ?? null,
        wouldBlock: input.shadow.robots.wouldBlock ?? null,
        stopReason: input.shadow.stopReason ?? null,
        bodyEvidenceHash: hashString(`${input.shadow.diagnostic.bytesReceived}:${input.shadow.diagnostic.outcome}:${input.shadow.parse.itemCount ?? 0}`),
      }
    : null;

  // Compute missing before status
  const computedForMissing: Pick<EvidencePacket, "endpoint" | "auth" | "visibility" | "shadowEconomics"> = {
    endpoint: { url: input.endpointUrl, isHttps: isHttpsVal, host, allowedHosts: input.provider.allowedHosts ?? null, hostValid },
    auth: { class: input.provider.authClass, supported: authSupported },
    visibility: { filter: visFilter, isPublic: isPublic, ambiguous },
    shadowEconomics,
  };

  const missingEvidence = missingEvidenceFor(input, computedForMissing);
  const status: PacketStatus = missingEvidence.length === 0 ? "review_ready" : "candidate";

  const unresolvedQuestions = [...missingEvidence];
  // Add deadline-related questions if bucket is urgent but packet is incomplete
  const reviewBucket = deadlineBucket(input.reviewDeadline, nowIso);
  if (reviewBucket === "overdue" && status === "candidate") unresolvedQuestions.push(`review deadline overdue: ${input.reviewDeadline}`);
  if (missingEvidence.length === 0 && input.shadow?.diagnostic.outcome === "HEALTHY_EMPTY") unresolvedQuestions.push("shadow healthy but empty — zero eligible jobs, economics review required");

  const preExpiryDue = isPreExpiryDue(input.policyExpiry, nowIso, 30);

  // Deterministic packet hash (sync, not crypto, but stable). Includes all declaratives + missing list.
  const canonical = JSON.stringify({
    sourceId: input.sourceId,
    providerId: input.providerId,
    endpointUrl: input.endpointUrl,
    allowedHosts: input.provider.allowedHosts,
    evidenceUrl: input.provider.evidenceUrl,
    mechanism: input.provider.mechanism,
    visibilityFilter: visFilter,
    authClass: input.provider.authClass,
    cadenceMin: input.provider.cadenceMinMinutes,
    cadenceMax: input.provider.cadenceMaxMinutes,
    reviewDeadline: input.reviewDeadline,
    policyExpiry: input.policyExpiry,
    shadowOutcome: shadowEconomics?.outcome ?? null,
    shadowBytes: shadowEconomics?.bytesReceived ?? null,
    status,
    missingEvidence: [...missingEvidence].sort(),
  });
  const packetHash = hashString(canonical);

  return {
    sourceId: input.sourceId,
    providerId: input.providerId,
    displayName: input.displayName,
    endpointUrl: input.endpointUrl,
    companyToken: input.companyToken ?? null,
    discoveryProvenance: input.discoveryProvenance ?? null,
    mechanism: input.provider.mechanism,
    endpoint: { url: input.endpointUrl, isHttps: isHttpsVal, host, allowedHosts: input.provider.allowedHosts ?? null, hostValid },
    auth: { class: input.provider.authClass, supported: authSupported },
    visibility: { filter: visFilter, isPublic, ambiguous },
    contentScope: input.provider.contentScope ?? null,
    evidenceUrl: input.provider.evidenceUrl ?? null,
    allowedHosts: input.provider.allowedHosts ?? null,
    cadence: { minMinutes: input.provider.cadenceMinMinutes ?? null, maxMinutes: input.provider.cadenceMaxMinutes ?? null, rateGuidance: input.provider.rateGuidance ?? null },
    removalSemantics: input.provider.removalSemantics ?? null,
    reviewDeadline: input.reviewDeadline,
    policyExpiry: input.policyExpiry,
    evidenceLeaseDays: input.provider.evidenceLeaseDays ?? null,
    shadowEconomics,
    status,
    missingEvidence,
    unresolvedQuestions,
    generatedAt,
    packetHash,
    reviewBucket,
    preExpiryDue,
  };
}

// ─── Alerts / Report ────────────────────────────────────────────────────────

export function alertForPacket(packet: EvidencePacket): PacketAlert {
  const priority = bucketPriority(packet.reviewBucket) + (packet.preExpiryDue ? -0.5 : 0); // preExpiry slightly ups priority but overdue still wins
  // Re-derive priority as integer for deduplication: overdue 0, due_7 1, due_14 2, due_30 3, ok 4, minus 0.5 if preExpiryDue makes it more urgent but keep integer for simple sort
  const integerPriority = bucketPriority(packet.reviewBucket);
  // If preExpiryDue and status ok, treat as due_30 priority (3) unless more urgent
  const effectivePriority = packet.preExpiryDue && integerPriority > 3 ? 3 : integerPriority;
  // If status review_ready but overdue, still overdue
  return {
    sourceId: packet.sourceId,
    displayName: packet.displayName,
    status: packet.status,
    bucket: packet.reviewBucket,
    preExpiryDue: packet.preExpiryDue,
    priority: effectivePriority,
    reviewDeadline: packet.reviewDeadline,
    policyExpiry: packet.policyExpiry,
    missingCount: packet.missingEvidence.length,
  };
}

export function deduplicateAlerts(packets: EvidencePacket[]): PacketAlert[] {
  // One alert per sourceId, keep most urgent (lowest priority number). Input may have duplicates if builder called multiple times.
  const map = new Map<string, PacketAlert>();
  for (const p of packets) {
    const alert = alertForPacket(p);
    const existing = map.get(p.sourceId);
    if (!existing || alert.priority < existing.priority) map.set(p.sourceId, alert);
  }
  return Array.from(map.values()).sort((a, b) => a.priority - b.priority || a.sourceId.localeCompare(b.sourceId));
}

export function renderEvidenceReport(packets: EvidencePacket[], nowIso: string): string {
  const alerts = deduplicateAlerts(packets);
  const counts = {
    total: packets.length,
    reviewReady: packets.filter((p) => p.status === "review_ready").length,
    candidate: packets.filter((p) => p.status === "candidate").length,
    overdue: alerts.filter((a) => a.bucket === "overdue").length,
    due7: alerts.filter((a) => a.bucket === "due_7").length,
    due14: alerts.filter((a) => a.bucket === "due_14").length,
    due30: alerts.filter((a) => a.bucket === "due_30").length,
    preExpiry: alerts.filter((a) => a.preExpiryDue).length,
  };

  const lines: string[] = [];
  lines.push(`# Evidence Packet Report — ${nowIso}`);
  lines.push(``);
  lines.push(`Generated at ${new Date().toISOString()} (now=${nowIso})`);
  lines.push(``);
  lines.push(`| Metric | Count |`);
  lines.push(`| --- | ---: |`);
  lines.push(`| Total candidates | ${counts.total} |`);
  lines.push(`| review_ready | ${counts.reviewReady} |`);
  lines.push(`| candidate (incomplete) | ${counts.candidate} |`);
  lines.push(`| Overdue (reviewDeadline < now) | ${counts.overdue} |`);
  lines.push(`| Due within 7d | ${counts.due7} |`);
  lines.push(`| Due within 14d | ${counts.due14} |`);
  lines.push(`| Due within 30d | ${counts.due30} |`);
  lines.push(`| Pre-expiry (policyExpiry within 30d) | ${counts.preExpiry} |`);
  lines.push(``);

  if (packets.length === 0) {
    lines.push(`No candidate packets — the Prospector queue is empty or all candidates have been decided.`);
    lines.push(``);
    return lines.join("\n");
  }

  lines.push(`## Packets`);
  lines.push(``);
  lines.push(`| sourceId | status | bucket | preExpiry | missing | endpoint | provider |`);
  lines.push(`| --- | --- | --- | --- | ---: | --- | --- |`);
  for (const p of [...packets].sort((a, b) => a.sourceId.localeCompare(b.sourceId))) {
    const missing = p.missingEvidence.length === 0 ? "—" : `${p.missingEvidence.length} missing`;
    const endpointShort = p.endpointUrl.length > 48 ? p.endpointUrl.slice(0, 45) + "…" : p.endpointUrl;
    lines.push(`| ${p.sourceId} | ${p.status} | ${p.reviewBucket} | ${p.preExpiryDue ? "yes" : "no"} | ${missing} | ${endpointShort} | ${p.providerId} |`);
  }
  lines.push(``);
  lines.push(`## Alerts (deduplicated, one per sourceId, most urgent first)`);
  lines.push(``);
  if (alerts.length === 0) {
    lines.push(`No alerts — no deadlines within window.`);
    lines.push(``);
  } else {
    lines.push(`| sourceId | status | bucket | preExpiry | reviewDeadline | missing |`);
    lines.push(`| --- | --- | --- | --- | --- | ---: |`);
    for (const a of alerts) {
      lines.push(`| ${a.sourceId} | ${a.status} | ${a.bucket} | ${a.preExpiryDue ? "yes" : "no"} | ${a.reviewDeadline ?? "—"} | ${a.missingCount} |`);
    }
    lines.push(``);
  }

  // Lifecycle resolution note
  lines.push(`## Lifecycle`);
  lines.push(``);
  lines.push(`- \`review_ready\` packets have zero missing evidence and are eligible for a human \`allowed\`/` + "`conditional`" + ` decision; they remain in operational \`candidate\` until that decision promotes them to \`shadow\`.`);
  lines.push(`- \`candidate\` packets list exact \`missingEvidence\` and \`unresolvedQuestions\`; they are not publishable and will not enter shadow.`);
  lines.push(`- Overdue or \`due_7\` alerts are the review-debt signal — one alert per sourceId, not one per probe.`);
  lines.push(`- External bodies are evidence only: \`shadowEconomics.bodyEvidenceHash\` is a hash of bytes/outcome, never the executed body.`);
  lines.push(``);

  return lines.join("\n");
}

// ─── Idempotency helper ─────────────────────────────────────────────────────

export function packetHashFor(input: EvidencePacketInput): string {
  return buildEvidencePacket(input).packetHash;
}
