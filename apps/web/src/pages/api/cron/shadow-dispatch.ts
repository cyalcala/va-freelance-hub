import type { APIRoute } from "astro";
import { getDb, sourceRegistry, providerProfiles, sourceShadowObservations } from "@va-hub/db";
import { sql } from "drizzle-orm";
import { isAuthorized } from "@/lib/auth";
import {
  dispatchShadowObservations,
  defaultRunProbe,
  type DispatchRegistryRow,
  type DispatchProviderProfile,
} from "@va-hub/scraper";

export const prerender = false;

// SP-22 — durable shadow dispatcher route.
//
// Deliberately NOT wired to any GitHub Actions `schedule:` trigger yet. This
// mirrors the precedent set by SP-10 (Workable, 2026-08-30): standing up new
// autonomous scheduled infrastructure that reaches out to third-party job
// boards -- even bounded, read-only probes -- is a new standing integration
// that needs the owner's explicit, specific review before being turned on,
// not blanket overnight authorization. See docs/plans/
// SOURCE_PERPETUITY_IMPLEMENTATION_PLAN.md SP-22 and docs/SYSTEM_SAVEPOINT.md
// for the full rationale.
//
// This route is safe to deploy dormant: `source_registry` is empty in
// production as of this unit, so a real invocation today would dispatch
// nothing (`totalRegistryRows: 0`). The route exists, auth-gated exactly like
// every other cron route, so the owner can invoke it manually (or later wire
// a schedule) once ready -- the same "built but not turned on" shape as the
// SP-16 employer-intake route.
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const env = (locals.runtime?.env ?? (import.meta as any).env) as any;

    if (!isAuthorized(request, env.PROXY_SECRET || env.CRON_SECRET)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const db = getDb(env);

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
      loadProviderProfiles: async () => {
        const rows = await db.select().from(providerProfiles);
        const map = new Map<string, DispatchProviderProfile>();
        for (const r of rows) {
          map.set(r.id, {
            id: r.id,
            providerFamily: r.providerFamily,
            mechanism: r.mechanism,
            authClass: r.authClass,
            endpointPattern: r.endpointPattern,
            allowedHosts: r.allowedHosts,
            evidenceUrl: r.evidenceUrl,
            evidenceLeaseDays: r.evidenceLeaseDays,
            visibilityFilter: r.visibilityFilter,
            contentScope: r.contentScope,
            cadenceMinMinutes: r.cadenceMinMinutes,
            cadenceMaxMinutes: r.cadenceMaxMinutes,
            rateGuidance: r.rateGuidance,
            robotsHandling: r.robotsHandling,
          });
        }
        return map;
      },
      // Most-recent observed_at per source_id, so the cadence floor is
      // enforced against real dispatch history rather than re-derived from
      // some other signal.
      loadLastObservedAt: async () => {
        const rows = await db
          .select({
            sourceId: sourceShadowObservations.sourceId,
            lastObservedAt: sql<string>`MAX(${sourceShadowObservations.observedAt})`,
          })
          .from(sourceShadowObservations)
          .groupBy(sourceShadowObservations.sourceId);
        return new Map(rows.map((r) => [r.sourceId, r.lastObservedAt]));
      },
      runProbe: defaultRunProbe,
      persistObservation: async (record) => {
        await db.insert(sourceShadowObservations).values(record);
      },
    });

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
