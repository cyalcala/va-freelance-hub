/** Bounded, shadow-only renewal. The caller must provide a recorded semantic
 * adjudication; a successful fetch or content hash is never policy authority. */
import {
  buildAdmissionEvidence, isAdmissionInstant, loadCurrentAdmissionEvidence,
  prepareAdmissionEvidenceInsert, type AdmissionDatabase, type AdmissionStatement,
  type CurrentAdmissionEvidenceResult, type PrimaryAdmissionEvidence,
} from "./admission-evidence";
import { sha256Hex } from "./contentHash";
import type { CandidateShadowResult } from "./candidate-shadow";

export interface EvidenceRenewalDatabase extends AdmissionDatabase {
  /** Native D1 batch semantics: all statements commit or all roll back on error. */
  batch(statements: AdmissionStatement[]): Promise<{ success: boolean }[]>;
}
export interface RenewProviderEvidenceInput {
  providerId: string;
  expectedProviderRevision: number;
  expectedEvidenceIds: Record<string, number>;
  now: string;
  captures: { url: string; content: string; capturedAt: string }[];
  probes: CandidateShadowResult[];
  adjudication: {
    decision: "renew_existing_scope";
    reference: string;
    reviewedContentHashes: Record<string, string>;
  };
}
type Current = Extract<CurrentAdmissionEvidenceResult, { ok: true }>;
type GroupRow = { sourceId: string; revision: number; state: string; entry: string | null; evidenceId: number | null; optedOut: number };
// Include all identities, not merely the supplied allowlist. A new source or
// concurrent evidence/transition invalidates the whole compare-and-swap.
const GROUP_SQL = `SELECT json_group_array(json_object('sourceId',source_id,
 'revision',governance_revision,'state',operational_state,'entry',last_transition_hash,
 'evidenceId',(SELECT MAX(id) FROM source_admission_evidence e WHERE e.source_id=s.source_id),
 'optedOut',CASE WHEN opt_out<>0 OR EXISTS(SELECT 1 FROM source_opt_outs o WHERE o.source_id=s.source_id) THEN 1 ELSE 0 END)) AS members
 FROM (SELECT * FROM source_registry WHERE provider_id=? ORDER BY source_id) s`;

export async function renewProviderEvidence(db: EvidenceRenewalDatabase, input: RenewProviderEvidenceInput): Promise<
  { ok: true; providerRevision: number; evidenceIds: Record<string, number> }
  | { ok: false; reason: string; commitState?: "committed" | "unknown" }
> {
  const reject = (reason: string) => ({ ok: false as const, reason });
  let batchStarted = false;
  let batchCommitted = false;
  try {
    if (!isAdmissionInstant(input.now) || !Number.isSafeInteger(input.expectedProviderRevision)
      || input.expectedProviderRevision < 1 || input.expectedProviderRevision >= Number.MAX_SAFE_INTEGER
      || input.adjudication?.decision !== "renew_existing_scope" || !input.adjudication.reference.trim()) {
      return reject("A current clock, provider revision, and explicit semantic renewal adjudication are required");
    }
    const raw = await db.prepare(GROUP_SQL).bind(input.providerId).first<{ members: string }>();
    const members = JSON.parse(raw?.members ?? "[]") as GroupRow[];
    if (!members.length || members.length > 16 || members.some(row => row.state !== "shadow" || row.optedOut || !row.entry)
      || JSON.stringify(Object.keys(input.expectedEvidenceIds).sort()) !== JSON.stringify(members.map(row => row.sourceId).sort())
      || members.some(row => row.evidenceId !== input.expectedEvidenceIds[row.sourceId])) {
      return reject("Renewal requires the exact current provider group of 1–16 non-opted-out shadow identities");
    }
    const current: Current[] = [];
    for (const member of members) {
      const context = await loadCurrentAdmissionEvidence(db, member.sourceId, input.now);
      if (!context.ok) return reject(`Current admission unavailable for ${member.sourceId}: ${context.reason}`);
      if (context.provider.id !== input.providerId || context.provider.governanceRevision !== input.expectedProviderRevision
        || context.evidence.id !== member.evidenceId || context.source.governanceRevision !== member.revision
        || context.source.lastTransitionHash !== member.entry || context.source.operationalState !== "shadow") {
        return reject("Provider group changed during renewal preparation");
      }
      current.push(context);
    }
    const oldProvider = current[0].provider;
    if (current.some(context => JSON.stringify(context.provider) !== JSON.stringify(oldProvider))) return reject("Provider snapshot changed");
    const urls = [...new Set(current.flatMap(context => context.packet.primaryEvidence.map(entry => entry.url)))].sort();
    if (input.captures.length !== urls.length || urls.length > 16
      || JSON.stringify(input.captures.map(capture => capture.url).sort()) !== JSON.stringify(urls)
      || JSON.stringify(Object.keys(input.adjudication.reviewedContentHashes).sort()) !== JSON.stringify(urls)) {
      return reject("Fresh reviewed captures must cover every existing primary evidence reference exactly once");
    }
    const evidence: PrimaryAdmissionEvidence[] = [];
    for (const capture of input.captures) {
      if (!isAdmissionInstant(capture.capturedAt) || capture.capturedAt > input.now
        || Date.parse(input.now) - Date.parse(capture.capturedAt) > 300_000
        || !capture.content.trim() || new TextEncoder().encode(capture.content).byteLength > 2 * 1024 * 1024) {
        return reject("Primary captures must be nonempty, bounded, and freshly timestamped");
      }
      const contentSha256 = await sha256Hex(capture.content);
      if (input.adjudication.reviewedContentHashes[capture.url] !== contentSha256) return reject("Capture content differs from the semantic adjudication");
      evidence.push({ url: capture.url, contentSha256, capturedAt: capture.capturedAt });
    }
    const primary = evidence.find(entry => entry.url === oldProvider.evidenceUrl)!;
    const provider = { ...oldProvider, evidenceHash: primary.contentSha256, evidenceCapturedAt: primary.capturedAt,
      governanceRevision: oldProvider.governanceRevision + 1 };
    if (provider.evidenceHash === oldProvider.evidenceHash && provider.evidenceCapturedAt === oldProvider.evidenceCapturedAt) {
      return reject("Renewal must contain a new primary capture");
    }
    if (JSON.stringify(input.probes.map(probe => probe.sourceId).sort()) !== JSON.stringify(members.map(row => row.sourceId).sort())) {
      return reject("A fresh probe is required for every identity exactly once");
    }
    const statements: AdmissionStatement[] = [];
    // json() deliberately throws on a stale group, making native batch abort;
    // a zero-row UPDATE would not itself trigger rollback.
    statements.push(db.prepare(`SELECT CASE WHEN (${GROUP_SQL})=?
      AND (SELECT governance_revision FROM provider_profiles WHERE id=?)=?
      THEN 1 ELSE json('stale provider renewal snapshot') END AS renewal_guard`)
      .bind(input.providerId, raw!.members, input.providerId, input.expectedProviderRevision));
    statements.push(db.prepare(`UPDATE provider_profiles SET evidence_hash=?, evidence_captured_at=? WHERE id=? AND governance_revision=?`)
      .bind(provider.evidenceHash, provider.evidenceCapturedAt, input.providerId, input.expectedProviderRevision));
    for (const context of current) {
      const probe = input.probes.find(value => value.sourceId === context.source.sourceId)!;
      if (!isAdmissionInstant(probe.timestamp) || probe.timestamp > input.now
        || evidence.some(entry => entry.capturedAt > probe.timestamp)
        || Date.parse(input.now) - Date.parse(probe.timestamp) > 300_000) return reject("Renewal probes must follow the reviewed captures and be current");
      const references = context.packet.primaryEvidence.map(prior => evidence.find(entry => entry.url === prior.url)!);
      const expiresAt = new Date(Math.min(Date.parse(context.source.policyExpiry!),
        ...references.map(entry => Date.parse(entry.capturedAt) + provider.evidenceLeaseDays * 86_400_000))).toISOString();
      if (Date.parse(expiresAt) - Date.parse(input.now) < 8 * 86_400_000) return reject("Existing source lease is too short for a fresh eight-day observation window");
      const built = await buildAdmissionEvidence({ source: context.source, provider, probe,
        primaryEvidence: references, authorityActions: context.packet.authorityActions,
        adjudicationRef: input.adjudication.reference, capturedAt: input.now, expiresAt });
      if (!built.ok) return reject(built.reason);
      statements.push(prepareAdmissionEvidenceInsert(db, context.source, provider, built));
    }
    batchStarted = true;
    const results = await db.batch(statements);
    if (results.length !== statements.length || results.some(result => !result.success)) {
      return { ok: false, reason: "Atomic renewal batch did not report complete success; inspect durable state before retrying", commitState: "unknown" };
    }
    batchCommitted = true;
    const evidenceIds: Record<string, number> = {};
    for (const prior of current) {
      const next = await loadCurrentAdmissionEvidence(db, prior.source.sourceId, input.now);
      if (!next.ok || next.provider.governanceRevision !== provider.governanceRevision
        || next.evidence.id <= prior.evidence.id || next.source.lastTransitionHash !== prior.source.lastTransitionHash) {
        return { ok: false, reason: "Renewal committed but current-context verification changed; inspect durable state", commitState: "committed" };
      }
      evidenceIds[prior.source.sourceId] = next.evidence.id;
    }
    return { ok: true, providerRevision: provider.governanceRevision, evidenceIds };
  } catch (error) {
    return { ...reject(`Evidence renewal rejected: ${error instanceof Error ? error.message : String(error)}`),
      ...(batchStarted ? { commitState: batchCommitted ? "committed" as const : "unknown" as const } : {}) };
  }
}
