import type { APIRoute } from "astro";
import { getDb, sourceRegistry, sourceShadowObservations } from "@va-hub/db";
import { and, eq, sql } from "drizzle-orm";
import { isAuthorized } from "@/lib/auth";
import {
  dispatchShadowObservations,
  defaultRunProbe,
  loadCurrentAdmissionEvidence,
  type DispatchRegistryRow,
} from "@va-hub/scraper";

export const prerender = false;

type ShadowDispatchHandlerDependencies = {
  getDb: typeof getDb;
  loadAdmissionEvidence: typeof loadCurrentAdmissionEvidence;
  runProbe: typeof defaultRunProbe;
  now?: () => Date;
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
      const summary = await dispatchShadowObservations({
        loadRegistryRows: async () => {
          const rows = await db.select().from(sourceRegistry);
          return rows.map((r): DispatchRegistryRow => ({
            sourceId: r.sourceId,
            providerId: r.providerId,
            displayName: r.displayName,
            endpointUrl: r.endpointUrl,
            companyToken: r.companyToken,
            discoveryProvenance: r.discoveryProvenance,
            complianceState: r.complianceState,
            operationalState: r.operationalState,
            optOut: Boolean(r.optOut),
            reviewDeadline: r.reviewDeadline,
            policyExpiry: r.policyExpiry,
          }));
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
        runProbe: dependencies.runProbe,
        now: dependencies.now,
        persistObservation: async (record) => {
          // Migration 0040 checks the live revisions, evidence, shadow entry
          // and opt-out in this same INSERT, rejecting intervening changes.
          const write = await db.insert(sourceShadowObservations).values(record);
          if (!write.success) throw new Error("D1 rejected shadow observation persistence");
        },
      });

      return new Response(JSON.stringify(summary), {
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

export const POST = createShadowDispatchHandler({ getDb, loadAdmissionEvidence: loadCurrentAdmissionEvidence, runProbe: defaultRunProbe });
