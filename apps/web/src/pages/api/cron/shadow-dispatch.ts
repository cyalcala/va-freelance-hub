import type { APIRoute } from "astro";
import { getDb, sourceShadowObservations } from "@va-hub/db";
import { and, eq, sql } from "drizzle-orm";
import { isAuthorized } from "@/lib/auth";
import { createRobotsStore } from "@/lib/robots-store";
import {
  dispatchShadowObservations,
  defaultRunProbe,
  loadCurrentAdmissionEvidence,
  createMemoryRobotsStore,
  MAX_DISPATCHES_PER_RUN,
  type DispatchRegistryRow,
  type RobotsCacheStore,
} from "@va-hub/scraper";

export const prerender = false;

type ShadowDispatchHandlerDependencies = {
  getDb: typeof getDb;
  loadAdmissionEvidence: typeof loadCurrentAdmissionEvidence;
  runProbe: typeof defaultRunProbe;
  now?: () => Date;
  createRobotsStore?: (db: any) => RobotsCacheStore;
};

// SP-23B: dormant, revision-bound observation endpoint. This implementation
// adds neither a schedule nor source admission. Recurrent dispatch remains a
// separate bounded implementation-plan acceptance step; the server enforces
// current evidence and durable opt-outs even for a manually invoked request.
export function createShadowDispatchHandler(dependencies: ShadowDispatchHandlerDependencies): APIRoute {
  return async ({ request, locals }) => {
    const env = (locals.runtime?.env ?? (import.meta as any).env) as any;
    if (!isAuthorized(request, env.PROXY_SECRET || env.CRON_SECRET)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    try {
      if (!env.DB) throw new Error("Cloudflare D1 binding is required");
      const db = dependencies.getDb(env);
      const windowHour = Math.floor((dependencies.now?.() ?? new Date()).getTime() / 3_600_000);
      if (!Number.isSafeInteger(windowHour) || windowHour < 0) throw new Error("Invalid shadow window clock");
      const robotsStore = dependencies.createRobotsStore
        ? dependencies.createRobotsStore(db)
        : createMemoryRobotsStore();
      const summary = await dispatchShadowObservations({
        loadRegistryRows: async () => {
          // Rotate bounded windows even if the first group has invalid evidence
          // or is cadence-held. A permanently failing source cannot starve later
          // identities. This enumeration never substitutes for the fresh loader.
          const rows = await db.all<DispatchRegistryRow>(sql`SELECT
            source_id AS sourceId, provider_id AS providerId, display_name AS displayName,
            endpoint_url AS endpointUrl, company_token AS companyToken, discovery_provenance AS discoveryProvenance,
            compliance_state AS complianceState, operational_state AS operationalState,
            opt_out AS optOut, review_deadline AS reviewDeadline, policy_expiry AS policyExpiry
            FROM source_registry WHERE operational_state='shadow' ORDER BY source_id
            LIMIT ${MAX_DISPATCHES_PER_RUN} OFFSET (${windowHour} % max(1,
              (SELECT (COUNT(*)+${MAX_DISPATCHES_PER_RUN - 1})/${MAX_DISPATCHES_PER_RUN}
               FROM source_registry WHERE operational_state='shadow'))) * ${MAX_DISPATCHES_PER_RUN}`);
          return rows.map(r => ({ ...r, optOut: Boolean(r.optOut) }));
        },
        // Reuse the promotion gateway's read-only authority loader on the
        // native D1 binding. Enumeration rows never authorize the fetch.
        loadAdmissionContext: (sourceId, nowIso) =>
          dependencies.loadAdmissionEvidence(env.DB, sourceId, nowIso),
        loadLastObservedAt: async ({ source, evidence }) => {
          const rows = await db.select({
            lastObservedAt: sql<string | null>`MAX(${sourceShadowObservations.observedAt})`,
          }).from(sourceShadowObservations).where(and(
            eq(sourceShadowObservations.sourceId, source.sourceId),
            eq(sourceShadowObservations.admissionEvidenceId, evidence.id),
            eq(sourceShadowObservations.shadowEntryHash, source.lastTransitionHash!),
          ));
          return rows[0]?.lastObservedAt ?? null;
        },
        runProbe: (input) => (dependencies.runProbe as any)(input, { robotsStore }),
        now: dependencies.now,
        persistObservation: async (record) => {
          // Migration 0040 checks the live revisions, evidence, shadow entry
          // and opt-out in this same INSERT, rejecting intervening changes.
          const write = await db.insert(sourceShadowObservations).values(record);
          if (!write.success) throw new Error("D1 rejected shadow observation persistence");
        },
      });

      return new Response(JSON.stringify({ ...summary,
        registryWindow: { hour: windowHour, limit: MAX_DISPATCHES_PER_RUN, countScope: "enumerated_shadow_window" } }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      });
    } catch (error) {
      console.error("[api/cron/shadow-dispatch] evidence or observation storage unavailable", error);
      return new Response(JSON.stringify({ error: "Shadow dispatch evidence or observation storage unavailable" }), {
        status: 503,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      });
    }
  };
}

export const POST = createShadowDispatchHandler({
  getDb,
  loadAdmissionEvidence: loadCurrentAdmissionEvidence,
  runProbe: defaultRunProbe,
  createRobotsStore,
});
