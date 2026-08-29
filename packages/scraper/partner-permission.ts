/**
 * SP-17 — Partner and customer-permission evidence pipeline (pure, no I/O).
 *
 * Prepares outreach-ready evidence packs for partner/customer-permission
 * sources (Ashby dedicated partner feed, employer-authorized Breezy, Jobvite
 * partner marketplace, and any future permission-tier target). This unit
 * prepares artifacts only: it never sends a message, never accepts paid
 * terms, and never activates a generic source. Permission is recorded as
 * durable evidence that *could* be attached to a `source_registry` row with
 * a 365-day lease; the attach/revoke machinery itself already exists from
 * SP-05 (`source_registry.policyExpiry`, `source_opt_outs`,
 * `source_decisions`) — this module reuses it rather than adding a new one.
 */

import { computePolicyExpiry } from "./source-lifecycle";

export type PermissionStatus = "draft" | "outreach_ready" | "sent" | "granted" | "denied" | "revoked";

export interface PermissionEvidencePackInput {
  targetProvider: string;
  displayName: string;
  /** Official documented request path/process (URL), or null if the target
   * documents no partner-request mechanism at all (e.g. Breezy — see notes). */
  providerRoute: string | null;
  /** Contact path: email, form URL, phone — whatever the target actually
   * documents. Null if genuinely undocumented (never invented). */
  contactPath: string | null;
  requestedScope: string | null;
  dataMinimization: string | null;
  attribution: string | null;
  cadence: string | null;
  removalSemantics: string | null;
  noCandidateDataTerms: string | null;
  /** Official documentation URL this pack's facts are drawn from. */
  evidenceUrl: string | null;
  notes?: string | null;
}

export interface PermissionEvidencePack extends PermissionEvidencePackInput {
  notes: string | null;
  status: PermissionStatus;
  missingFields: string[];
  generatedAt: string;
}

const REQUIRED_FIELDS: Array<keyof PermissionEvidencePackInput> = [
  "providerRoute", "contactPath", "requestedScope", "dataMinimization",
  "attribution", "cadence", "removalSemantics", "noCandidateDataTerms", "evidenceUrl",
];

/**
 * Build one evidence pack. `status` is `outreach_ready` only when every
 * required field is present; otherwise `draft` and `missingFields` lists
 * exactly what's absent — the same missing-evidence-is-visible pattern as
 * SP-08's evidence packets, applied to the permission track.
 */
export function buildPermissionEvidencePack(input: PermissionEvidencePackInput, nowIso: string): PermissionEvidencePack {
  const missingFields = REQUIRED_FIELDS.filter((f) => !input[f]);
  return {
    ...input,
    notes: input.notes ?? null,
    status: missingFields.length === 0 ? "outreach_ready" : "draft",
    missingFields,
    generatedAt: nowIso,
  };
}

// ─── Lease / attach-to-source-account ────────────────────────────────────────

export const PERMISSION_LEASE_DAYS = 365;

export interface AttachedPermission {
  sourceId: string;
  targetProvider: string;
  policyExpiry: string;
  grantedAt: string;
  /** Revocation is not a new mechanism — it is SP-05's existing
   * source_opt_outs/source_decisions durable memory, which already survives
   * a source_registry row delete and already blocks re-entry to shadow. */
  revocationMechanism: "source_opt_outs";
}

/**
 * Compute what would be written to attach a granted permission to a source
 * account: a 365-day `policyExpiry` from the grant instant, reusing SP-05's
 * exact lease math. This unit does not perform the write itself (no source
 * is activated by SP-17) — it proves the wiring is correct and tested so a
 * later, separately reviewed grant can apply it directly.
 */
export function attachPermissionToSourceAccount(
  sourceId: string,
  targetProvider: string,
  grantedAtIso: string,
  leaseDays: number = PERMISSION_LEASE_DAYS,
): AttachedPermission {
  return {
    sourceId,
    targetProvider,
    policyExpiry: computePolicyExpiry(grantedAtIso, leaseDays),
    grantedAt: grantedAtIso,
    revocationMechanism: "source_opt_outs",
  };
}

// ─── Report ─────────────────────────────────────────────────────────────────

export function renderPermissionPackReport(pack: PermissionEvidencePack): string {
  const lines: string[] = [];
  lines.push(`# Partner/permission evidence pack — ${pack.displayName} (SP-17)`);
  lines.push("");
  lines.push(`- **Target:** \`${pack.targetProvider}\``);
  lines.push(`- **Status:** **${pack.status}**`);
  lines.push(`- **Generated:** ${pack.generatedAt}`);
  lines.push(`- **Evidence URL:** ${pack.evidenceUrl ? `<${pack.evidenceUrl}>` : "(none documented)"}`);
  lines.push("");
  lines.push(`| Field | Value |`);
  lines.push(`| --- | --- |`);
  lines.push(`| Provider route | ${pack.providerRoute ?? "_(not documented — see notes)_"} |`);
  lines.push(`| Contact path | ${pack.contactPath ?? "_(not documented — see notes)_"} |`);
  lines.push(`| Requested scope | ${pack.requestedScope ?? "_(none)_"} |`);
  lines.push(`| Data minimization | ${pack.dataMinimization ?? "_(none)_"} |`);
  lines.push(`| Attribution | ${pack.attribution ?? "_(none)_"} |`);
  lines.push(`| Cadence | ${pack.cadence ?? "_(none)_"} |`);
  lines.push(`| Removal semantics | ${pack.removalSemantics ?? "_(none)_"} |`);
  lines.push(`| No-candidate-data terms | ${pack.noCandidateDataTerms ?? "_(none)_"} |`);
  lines.push("");
  if (pack.missingFields.length > 0) {
    lines.push(`## Missing (draft — not outreach-ready)`);
    lines.push("");
    for (const f of pack.missingFields) lines.push(`- \`${f}\``);
    lines.push("");
  }
  if (pack.notes) {
    lines.push(`## Notes`);
    lines.push("");
    lines.push(pack.notes);
    lines.push("");
  }
  lines.push(`## Lease and revocation`);
  lines.push("");
  lines.push(`If granted, permission attaches to the relevant \`source_registry\` row as a **${PERMISSION_LEASE_DAYS}-day** \`policyExpiry\` lease (SP-05's \`computePolicyExpiry\`), with renewal beginning 30 days before expiry per the strategy's evidence-lease schedule. Revocation reuses SP-05's durable \`source_opt_outs\`/\`source_decisions\` — no new mechanism.`);
  lines.push("");
  lines.push(`This pack is a prepared artifact only. No message has been sent and no source has been activated by generating it.`);
  lines.push("");
  return lines.join("\n");
}
