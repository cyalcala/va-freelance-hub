import type { APIRoute } from "astro";
import { isAuthorized } from "@/lib/auth";
import { readJsonBodyLimited } from "@/lib/request-body";
import { fetchPrimaryEvidence } from "@/lib/primary-evidence";
import { loadCurrentAdmissionEvidence, defaultRunProbe, sha256Hex, renewProviderEvidence } from "@va-hub/scraper";

export const prerender = false;
const PROVIDERS = new Set(["greenhouse", "recruitee", "teamtailor"]);
const ADJUDICATION = "apex-audit-2026-09-08-primary-renewal";
const json = (status: number, value: unknown) => new Response(JSON.stringify(value), {
  status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
});

export function createSourceRenewHandler(deps: {
  load?: typeof loadCurrentAdmissionEvidence;
  capture?: typeof fetchPrimaryEvidence;
  probe?: typeof defaultRunProbe;
  renew?: typeof renewProviderEvidence;
  now?: () => string;
} = {}): APIRoute {
  const now = deps.now ?? (() => new Date().toISOString());
  return async ({ request, locals }) => {
    const env = (locals.runtime?.env ?? (import.meta as any).env) as any;
    if (!isAuthorized(request, env.PROXY_SECRET || env.CRON_SECRET)) return json(401, { error: "Unauthorized" });
    const body = await readJsonBodyLimited(request, 16 * 1024);
    if (!body.ok) return json(body.status, { error: body.message });
    const input = body.value as any;
    if (!input || !PROVIDERS.has(input.providerId) || !["preview", "renew"].includes(input.mode)) {
      return json(400, { error: "An allowlisted providerId and preview/renew mode are required" });
    }
    if (!env.DB?.prepare || !env.DB?.batch) return json(503, { error: "Native D1 batch binding required" });
    try {
      const rows = await env.DB.prepare("SELECT source_id AS sourceId FROM source_registry WHERE provider_id=? ORDER BY source_id")
        .bind(input.providerId).all();
      if (!rows.success || !rows.results?.length || rows.results.length > 4) return json(409, { error: "Renewal route supports 1–4 existing shadow identities per provider" });
      const contexts = [];
      for (const row of rows.results) {
        const context = await (deps.load ?? loadCurrentAdmissionEvidence)(env.DB, row.sourceId, now());
        if (!context.ok) return json(409, { error: context.reason });
        if (context.source.operationalState !== "shadow" || context.source.optOut) return json(409, { error: "Only existing non-opted-out shadows may renew" });
        contexts.push(context);
      }
      const captures = [];
      const hashes: Record<string, string> = {};
      const urls = [...new Set(contexts.flatMap(context => context.packet.primaryEvidence.map(entry => entry.url)))];
      for (const url of urls) {
        const content = await (deps.capture ?? fetchPrimaryEvidence)(url);
        const capturedAt = now();
        captures.push({ url, content, capturedAt });
        hashes[url] = await sha256Hex(content);
      }
      const expectedEvidenceIds = Object.fromEntries(contexts.map(context => [context.source.sourceId, context.evidence.id]));
      const revision = contexts[0].provider.governanceRevision;
      if (input.mode === "preview") return json(200, { providerId: input.providerId, expectedProviderRevision: revision,
        expectedEvidenceIds, reviewedContentHashes: hashes, adjudicationRef: ADJUDICATION, published: 0,
        note: "Read the primary documents and record the semantic decision before submitting renew; preview performs no writes." });
      if (input.adjudicationRef !== ADJUDICATION || input.expectedProviderRevision !== revision
        || JSON.stringify(input.expectedEvidenceIds) !== JSON.stringify(expectedEvidenceIds)
        || JSON.stringify(input.reviewedContentHashes) !== JSON.stringify(hashes)) {
        return json(409, { error: "Reviewed capture or expected group changed; preview and review again" });
      }
      const probes = [];
      for (const context of contexts) {
        probes.push(await (deps.probe ?? defaultRunProbe)({ ...context.source, provider: context.provider }));
      }
      const result = await (deps.renew ?? renewProviderEvidence)(env.DB, {
        providerId: input.providerId, expectedProviderRevision: revision, expectedEvidenceIds, captures, probes, now: now(),
        adjudication: { decision: "renew_existing_scope", reference: ADJUDICATION, reviewedContentHashes: hashes },
      });
      return json(result.ok ? 200 : 409, { ...result, published: 0, observationWindowRestarted: result.ok });
    } catch {
      return json(503, { error: "Evidence renewal unavailable; inspect durable state before retrying" });
    }
  };
}

export const POST = createSourceRenewHandler();
