import type { APIRoute } from "astro";
import { getDb, sourceShadowObservations } from "@va-hub/db";
import { and, eq, inArray, lt, sql } from "drizzle-orm";
import { isAuthorized } from "@/lib/auth";
import { createRobotsStore } from "@/lib/robots-store";
import { createShadowHostBackoffStore } from "@/lib/shadow-host-backoff-store";
import {
  dispatchShadowObservations,
  defaultRunProbe,
  loadCurrentAdmissionEvidence,
  createMemoryRobotsStore,
  judgeViaJev,
  MAX_DISPATCHES_PER_RUN,
  type DispatchRegistryRow,
  type RobotsCacheStore,
  type AnomalyHistory,
  type DispatchAnomaly,
  type JevJudgeRequest,
  type JevRecommendation,
  type JevUsage,
  ANOMALY_HISTORY_WINDOW_DAYS,
  SHADOW_VERDICT_VERSION,
  buildJevAdjudicationPacket,
  classifyAnomalies,
  decideVerdict,
} from "@va-hub/scraper";

export const prerender = false;

const JEV_ADJUDICATION_TIMEOUT_MS = 12_000;

type ShadowDispatchHandlerDependencies = {
  getDb: typeof getDb;
  loadAdmissionEvidence: typeof loadCurrentAdmissionEvidence;
  runProbe: typeof defaultRunProbe;
  now?: () => Date;
  createRobotsStore?: (db: any) => RobotsCacheStore;
  loadAnomalyHistory?: (sourceIds: string[], beforeIso: string) => Promise<Map<string, AnomalyHistory>>;
  judge?: (packet: ReturnType<typeof buildJevAdjudicationPacket>) => Promise<{
    ok: boolean;
    recommendation: JevRecommendation;
    confidence: number;
    model: string;
    error?: string;
    usage?: JevUsage;
  }>;
};

// SP-23B: dormant, revision-bound observation endpoint. This implementation
// adds neither a schedule nor source admission. Recurrent dispatch remains a
// separate bounded implementation-plan acceptance step; the server enforces
// current evidence and durable opt-outs even for a manually invoked request.
//
// Verdict adjudication (2026-09-24): after the deterministic dispatch loop,
// non-healthy probe outcomes are classified (Tier 1 deterministic chronic
// known-limit; Tier 2 Jev-assisted transients). The verdict only controls the
// run-level monitoring signal reported to the shared assessor; it never
// changes source authority, publication, or the persisted observations.
export function createShadowDispatchHandler(dependencies: ShadowDispatchHandlerDependencies): APIRoute {
  return async ({ request, locals }) => {
    const env = (locals.runtime?.env ?? (import.meta as any).env) as any;
    if (!isAuthorized(request, env.PROXY_SECRET || env.CRON_SECRET)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    let currentStage = "initialize";
    let currentSourceId: string | null = null;

    try {
      if (!env.DB) throw new Error("Cloudflare D1 binding is required");
      const db = dependencies.getDb(env);
      const now = dependencies.now ?? (() => new Date());
      // One clock read before dispatch: the injected now() owns the window
      // rotation clock, and the dispatch loop reads it again per probe.
      const dispatchStart = now();
      const dispatchStartedAt = dispatchStart.toISOString();
      const windowHour = Math.floor(dispatchStart.getTime() / 3_600_000);
      if (!Number.isSafeInteger(windowHour) || windowHour < 0) throw new Error("Invalid shadow window clock");
      const robotsStore = dependencies.createRobotsStore
        ? dependencies.createRobotsStore(db)
        : createMemoryRobotsStore();
      const hostBackoffStore = createShadowHostBackoffStore(db);
      const summary = await dispatchShadowObservations({
        loadHostBackoff: async (host) => {
          currentStage = "load_host_backoff";
          return hostBackoffStore.get(host);
        },
        persistHostBackoff: async (backoff) => {
          currentStage = "persist_host_backoff";
          currentSourceId = backoff.sourceId;
          return hostBackoffStore.put(backoff);
        },
        loadRegistryRows: async () => {
          currentStage = "enumerate_registry";
          currentSourceId = null;
          // Rotate bounded windows even if the first group has invalid evidence
          // or is cadence-held. A permanently failing source cannot starve later
          // identities. Interleave by provider (ROW_NUMBER partition) so identities
          // sharing an origin host (e.g. Workable) are naturally spaced across windows
          // rather than clustered in a single rate-limited burst.
          const rows = await db.all<DispatchRegistryRow>(sql`SELECT
            source_id AS sourceId, provider_id AS providerId, display_name AS displayName,
            endpoint_url AS endpointUrl, company_token AS companyToken, discovery_provenance AS discoveryProvenance,
            compliance_state AS complianceState, operational_state AS operationalState,
            opt_out AS optOut, review_deadline AS reviewDeadline, policy_expiry AS policyExpiry
            FROM source_registry WHERE operational_state='shadow'
            ORDER BY ROW_NUMBER() OVER (PARTITION BY provider_id ORDER BY source_id), provider_id
            LIMIT ${MAX_DISPATCHES_PER_RUN} OFFSET (${windowHour} % max(1,
              (SELECT (COUNT(*)+${MAX_DISPATCHES_PER_RUN - 1})/${MAX_DISPATCHES_PER_RUN}
               FROM source_registry WHERE operational_state='shadow'))) * ${MAX_DISPATCHES_PER_RUN}`);
          return rows.map(r => ({ ...r, optOut: Boolean(r.optOut) }));
        },
        // Reuse the promotion gateway's read-only authority loader on the
        // native D1 binding. Enumeration rows never authorize the fetch.
        loadAdmissionContext: (sourceId, nowIso) => {
          currentStage = "load_admission_context";
          currentSourceId = sourceId;
          return dependencies.loadAdmissionEvidence(env.DB, sourceId, nowIso);
        },
        loadLastObservedAt: async ({ source, evidence }) => {
          currentStage = "load_observation_history";
          currentSourceId = source.sourceId;
          const rows = await db.select({
            lastObservedAt: sql<string | null>`MAX(${sourceShadowObservations.observedAt})`,
          }).from(sourceShadowObservations).where(and(
            eq(sourceShadowObservations.sourceId, source.sourceId),
            eq(sourceShadowObservations.admissionEvidenceId, evidence.id),
            eq(sourceShadowObservations.shadowEntryHash, source.lastTransitionHash!),
          ));
          return rows[0]?.lastObservedAt ?? null;
        },
        runProbe: (input) => {
          currentStage = "run_probe";
          currentSourceId = input.sourceId;
          return (dependencies.runProbe as any)(input, { robotsStore });
        },
        now: dependencies.now,
        persistObservation: async (record) => {
          currentStage = "persist_observation";
          currentSourceId = record.sourceId;
          // Migration 0040 checks the live revisions, evidence, shadow entry
          // and opt-out in this same INSERT, rejecting intervening changes.
          const write = await db.insert(sourceShadowObservations).values(record);
          if (!write.success) throw new Error("D1 rejected shadow observation persistence");
        },
      });

      const verdict = await adjudicateRunVerdict(summary.anomalies, {
        db,
        env,
        dependencies,
        dispatchStartedAt,
        now,
        totalDispatched: summary.dispatched,
        onStage: (stage) => {
          currentStage = stage;
          currentSourceId = null;
        },
      });

      return new Response(JSON.stringify({ ...summary,
        verdict,
        registryWindow: { hour: windowHour, limit: MAX_DISPATCHES_PER_RUN, countScope: "enumerated_shadow_window" } }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      });
    } catch (error) {
      console.error("[api/cron/shadow-dispatch] evidence or observation storage unavailable", error);
      const failureStage = (error as any)?.failureStage ?? currentStage;
      const sourceId = (error as any)?.sourceId ?? currentSourceId;
      return new Response(JSON.stringify({
        error: "Shadow dispatch evidence or observation storage unavailable",
        errorClass: classifyStorageError(error),
        failureStage,
        sourceId,
        errorFingerprint: fingerprintStorageError(error),
      }), {
        status: 503,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      });
    }
  };
}

/**
 * Classify a thrown storage/pipeline error for the 503 body. Bounded fixed
 * classes; the underlying message stays in the Pages function log only.
 * The EX-03 503 mode (4 failures, 2026-09-23) had zero observations written
 * in-window, so failure occurred at/before the first persistence; these
 * classes make the next diagnosis observable from CI logs alone.
 */
/**
 * Collect the params-stripped, lowercased messages from a Drizzle-wrapped D1
 * error chain. D1 error messages include the full SQL with params; the params
 * can contain probe result data (e.g. "budgetExceeded":false) that would
 * false-positive on keyword matching. Only the D1 error message itself is
 * authoritative, so the "\nparams:" portion is stripped. Query text,
 * parameters, and native messages stay private — this helper never returns
 * raw secrets, only normalized text for fixed-class matching and hashing.
 */
function collectStrippedMessages(error: unknown): string[] {
  // Drizzle wraps native D1 errors as causes. Inspect that chain.
  const messages: string[] = [];
  const seen = new Set<unknown>();
  let cause: unknown = error;
  while (cause != null && !seen.has(cause)) {
    seen.add(cause);
    if (typeof cause === "object") {
      const entry = cause as { message?: unknown; cause?: unknown };
      if (typeof entry.message === "string") {
        const msg = entry.message.toLowerCase();
        const paramsIdx = msg.indexOf("\nparams:");
        messages.push(paramsIdx >= 0 ? msg.slice(0, paramsIdx) : msg);
      }
      cause = entry.cause;
    } else {
      messages.push(String(cause).toLowerCase());
      break;
    }
  }
  return messages;
}

/**
 * Stable, privacy-preserving correlation key for a storage error. Hashes only
 * the params-stripped messages (djb2, 8 hex chars), so identical underlying
 * D1 failures share a fingerprint across runs while query text and params
 * never leave the Pages function log. The EX-03 workflow prints the 503 body,
 * so the fingerprint lets CI logs correlate a failure to its Pages-log entry
 * without exposing storage internals.
 */
export function fingerprintStorageError(error: unknown): string {
  const normalized = collectStrippedMessages(error).join("\n");
  let hash = 5381;
  for (let i = 0; i < normalized.length; i += 1) {
    hash = ((hash << 5) + hash + normalized.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function classifySingleMessage(msg: string): string | null {
  if (msg.includes("too many sql variables") || msg.includes("too many bind") || msg.includes("too many parameters")) return "d1_bind_limit";
  if (msg.includes("d1 rejected shadow observation persistence")) return "d1_observation_write_rejected";
  if (msg.includes("d1 rejected shadow host backoff persistence")) return "d1_host_backoff_write_rejected";
  if (msg.includes("probe contract") || msg.includes("successful safety checks")) return "d1_probe_contract_violation";
  if (msg.includes("unique constraint") || msg.includes("primary key") || msg.includes("constraint failed")) return "d1_constraint_violation";
  if (msg.includes("no such column") || msg.includes("no such table")) return "d1_schema_mismatch";
  if (msg.includes("database is locked") || msg.includes("database table is locked") || msg.includes("database is busy")) return "d1_busy_or_locked";
  // D1 code 7500 is a generic execution error, not proof of quota exhaustion.
  if (msg.includes("quota") || msg.includes("limit exceeded") || msg.includes("limit reached") || (msg.includes("exceeded") && !msg.includes("budgetexceeded"))) return "d1_quota_or_limit";
  if (
    msg.includes("admission context") ||
    msg.includes("governance revision") ||
    msg.includes("evidence revision") ||
    msg.includes("evidence lease") ||
    msg.includes("admission evidence") ||
    msg.includes("current evidence") ||
    msg.includes("source evidence") ||
    /(^|[^a-z0-9_])revision([^a-z0-9_]|$)/.test(msg) ||
    /(^|[^a-z0-9_])evidence([^a-z0-9_]|$)/.test(msg)
  ) return "evidence_or_revision_guard";
  if (msg.includes("d1 binding")) return "missing_d1_binding";
  return null;
}

export function classifyStorageError(error: unknown): string {
  const messages = collectStrippedMessages(error);
  if (messages.length === 0) return "unclassified_storage_or_pipeline_error";

  // Separate query wrapper messages from native cause messages.
  // In Drizzle, errors wrap native D1 errors with "failed query: <SQL>".
  // The SQL statement itself can contain table/column names such as
  // "admission_evidence_id", "evidence_hash", "source_admission_evidence", etc.,
  // which must never be classified as evidence_or_revision_guard.
  const nonQueryMessages = messages.filter((m) => !m.trim().startsWith("failed query:"));

  // Check the deepest native cause first (most authoritative)
  for (let i = nonQueryMessages.length - 1; i >= 0; i--) {
    const cls = classifySingleMessage(nonQueryMessages[i]);
    if (cls) return cls;
  }

  // If no non-query message matched, check query messages only for non-revision/non-evidence classes
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.includes("too many sql variables") || msg.includes("too many bind") || msg.includes("too many parameters")) return "d1_bind_limit";
    if (msg.includes("database is locked") || msg.includes("database table is locked") || msg.includes("database is busy")) return "d1_busy_or_locked";
    if (msg.includes("quota") || msg.includes("limit exceeded") || msg.includes("limit reached")) return "d1_quota_or_limit";
    if (msg.includes("d1 binding")) return "missing_d1_binding";
  }

  return "unclassified_storage_or_pipeline_error";
}

async function adjudicateRunVerdict(
  anomalies: DispatchAnomaly[],
  context: {
    db: any;
    env: any;
    dependencies: ShadowDispatchHandlerDependencies;
    dispatchStartedAt: string;
    now: () => Date;
    totalDispatched: number;
    onStage?: (stage: string) => void;
  },
): Promise<Record<string, unknown>> {
  if (anomalies.length === 0) {
    return { version: SHADOW_VERDICT_VERSION, status: "healthy", reasons: [], classifications: [], notes: [] };
  }

  // Bounded, strictly-prior history for the anomalous sources only. The
  // current run's rows are excluded (observed_at < dispatchStartedAt) so
  // chronicity is never proven by the anomaly adjudicating itself.
  context.onStage?.("load_anomaly_history");
  const historyBySourceId = context.dependencies.loadAnomalyHistory
    ? await context.dependencies.loadAnomalyHistory(
        anomalies.map((a) => a.sourceId),
        context.dispatchStartedAt,
      )
    : await defaultLoadAnomalyHistory(context.db, anomalies.map((a) => a.sourceId), context.dispatchStartedAt);
  const classifications = classifyAnomalies(anomalies, historyBySourceId);

  const tier2 = classifications.some(
    (c) => c.classification === "transient_rate_limit" || c.classification === "candidate_over_budget",
  );
  const disabled = context.env.JEV_ADJUDICATION_DISABLED === "1";
  const apiKey = typeof context.env.OPENROUTER_API_KEY === "string" ? context.env.OPENROUTER_API_KEY : undefined;

  const result = await decideVerdict({
    anomalies,
    classifications,
    disabled,
    available: Boolean(apiKey),
    verdictVersion: SHADOW_VERDICT_VERSION,
    jev: tier2 && apiKey && !disabled
      ? () => {
          context.onStage?.("jev_adjudication");
          const packet = buildJevAdjudicationPacket({
            dispatched: context.totalDispatched,
            classifications,
          });
          const judgeRequest: JevJudgeRequest = {
            task: packet.task,
            context: packet.context,
            state: packet.state,
            questions: { verdict: { instructions: packet.task, criteria: packet.criteria } },
            timeoutMs: JEV_ADJUDICATION_TIMEOUT_MS,
          };
          const invocation = context.dependencies.judge
            ? context.dependencies.judge(packet)
            : judgeViaJev(apiKey, judgeRequest).then((r) => {
                const answer = r.answers?.verdict;
                if (!r.ok || !answer) {
                  return { ok: false, recommendation: "ABSTAIN" as JevRecommendation, confidence: 0, model: r.model ?? "", error: r.error };
                }
                return {
                  ok: true,
                  recommendation: answer.choice as JevRecommendation,
                  confidence: answer.confidence,
                  model: r.model ?? "",
                  usage: r.usage,
                };
              });
          return invocation;
        }
      : null,
    now: context.now,
  });

  return {
    version: SHADOW_VERDICT_VERSION,
    status: result.status,
    reasons: result.reasons,
    classifications: result.classifications.map((c) => ({
      sourceId: c.sourceId,
      outcome: c.outcome,
      classification: c.classification,
    })),
    notes: result.acceptedNotes,
    decision: result.consultation.consulted
      ? {
          provider: "jev-1.13-openrouter",
          model: result.consultation.model,
          recommendation: result.consultation.recommendation,
          confidence: result.consultation.confidence,
          enforced: result.status,
          ok: result.consultation.ok,
          correlationId: result.consultation.correlationId,
          recordedAt: result.consultation.recordedAt,
          verdictVersion: result.consultation.verdictVersion ?? SHADOW_VERDICT_VERSION,
          usage: result.consultation.usage ?? null,
          laterOutcome: result.consultation.laterOutcome ?? null,
        }
      : undefined,
    consultationReason: result.consultation.consulted ? undefined : result.consultation.reason,
  };
}

async function defaultLoadAnomalyHistory(
  db: any,
  sourceIds: string[],
  beforeIso: string,
): Promise<Map<string, AnomalyHistory>> {
  const sinceIso = new Date(Date.parse(beforeIso) - ANOMALY_HISTORY_WINDOW_DAYS * 24 * 3_600_000).toISOString();
  const rows = await db.select({
    sourceId: sourceShadowObservations.sourceId,
    observedAt: sourceShadowObservations.observedAt,
    outcome: sourceShadowObservations.outcome,
    plausibleItems: sourceShadowObservations.plausibleItems,
    stopReason: sourceShadowObservations.stopReason,
  }).from(sourceShadowObservations).where(and(
    inArray(sourceShadowObservations.sourceId, sourceIds),
    lt(sourceShadowObservations.observedAt, beforeIso),
    sql`${sourceShadowObservations.observedAt} >= ${sinceIso}`,
  ));
  const map = new Map<string, AnomalyHistory>();
  for (const row of rows) {
    const existing = map.get(row.sourceId);
    const history: AnomalyHistory = existing ?? { sourceId: row.sourceId, rows: [] };
    history.rows.push({
      observedAt: row.observedAt,
      outcome: row.outcome,
      plausibleItems: row.plausibleItems,
      stopReason: row.stopReason,
    });
    map.set(row.sourceId, history);
  }
  return map;
}

export const POST = createShadowDispatchHandler({
  getDb,
  loadAdmissionEvidence: loadCurrentAdmissionEvidence,
  runProbe: defaultRunProbe,
  createRobotsStore,
});
