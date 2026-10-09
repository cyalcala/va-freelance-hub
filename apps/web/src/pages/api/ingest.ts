import type { APIRoute } from "astro";
import { getDb, opportunities, type NewOpportunity } from "@va-hub/db";
import { chunkArray, sanitizeApplyUrlForSource, sanitizeSourceUrl, toContentHash, sha256Hex, geoGate, isPublicPhEligibility } from "@va-hub/scraper";
import { normalizePersistedOpportunityIds, publicationDbFromEnv, publishGroupedInserts, PublicationOutcomeUnknownError } from "@/lib/publish-opportunities";
import { normalizeUtcIso, nowUtcIso } from "@/lib/time";
import { DIRECT_INGEST_BATCH_SIZE } from "@/lib/ingest-batch";
import { isAuthorized } from "@/lib/auth";
import { readJsonBodyLimited } from "@/lib/request-body";
import { parseLakeInspectRequest, parseLakeStageRequest } from "@/lib/lake-publication-contract";
import { readLakePublicationIntent, stageLakePublicationIntent } from "@/lib/lake-publication-intent";
import { captureLakePublicationAuthority } from "@/lib/lake-publication-authority";
import { readLakeEvidenceSnapshot } from "@/lib/lake-evidence-reader";
import { inspectLakeItemBindings } from "@/lib/lake-item-binding";

export const prerender = false;

const JOB_TYPES = new Set(["VA", "freelance", "project", "full-time", "part-time"] as const);
const LOCATION_TYPES = new Set(["remote", "hybrid", "onsite"] as const);
const EXPERIENCE_LEVELS = new Set(["entry", "mid", "senior", "any"] as const);
const MAX_PAYLOAD_BYTES = 2 * 1024 * 1024;

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

function record(v: unknown): Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : {};
}

function enumOrFallback<T extends string>(value: unknown, values: ReadonlySet<T>, fallback: T): T {
  return typeof value === "string" && values.has(value as T) ? value as T : fallback;
}

function enumOrNull<T extends string>(value: unknown, values: ReadonlySet<T>): T | null {
  return typeof value === "string" && values.has(value as T) ? value as T : null;
}

// Explicit allow-list mapping. Previously this spread `...item`, letting any
// caller with the shared secret set arbitrary columns (isActive, clickCount,
// id, contentHash) and store an unsanitized applicationUrl — the same class
// the scrape route was hardened against (audit A-2). Server owns all
// safety-critical fields; the client may only supply descriptive data.
async function normalizeOpportunityForInsert(item: unknown, observedAt: string) {
  const input = record(item);
  const title = str(input.title) ?? "Untitled";
  const sourceUrl = sanitizeSourceUrl(input.sourceUrl);
  const applicationUrl = sanitizeApplyUrlForSource(input.applicationUrl, sourceUrl) ?? (sourceUrl ?? null);
  const description = str(input.description);
  const rawTags = Array.isArray(input.tags) ? input.tags.filter((t): t is string => typeof t === "string").slice(0, 15) : [];
  const gate = geoGate({
    title,
    description,
    locationRaw: str(input.locationRaw),
    tags: rawTags,
  });

  return {
    title,
    company: str(input.company),
    type: enumOrFallback(input.type, JOB_TYPES, "freelance"),
    sourceUrl: sourceUrl ?? "",
    sourcePlatform: str(input.sourcePlatform) ?? "ingest",
    sourceId: str(input.sourceId)?.toLowerCase() ?? null,
    tags: rawTags,
    category: str(input.category) ?? "other",
    locationType: enumOrFallback(input.locationType, LOCATION_TYPES, "remote"),
    clientTimezone: str(input.clientTimezone),
    payRange: str(input.payRange),
    description,
    applicationUrl,
    postedAt: normalizeUtcIso(input.postedAt),
    scrapedAt: normalizeUtcIso(input.scrapedAt) ?? observedAt,
    // Server-owned safety fields — never client-controlled.
    isActive: isPublicPhEligibility(gate.phEligibility),
    inactiveReason: isPublicPhEligibility(gate.phEligibility) ? null
      : gate.phEligibility === "ineligible" ? "policy-rejected" : "pending-triage",
    contentHash: toContentHash(title, sourceUrl ?? title),
    descriptionHash: await sha256Hex(title + (description ?? "").slice(0, 1500)),
    experienceLevel: enumOrNull(input.experienceLevel, EXPERIENCE_LEVELS),
    clickCount: 0,
    failedVerificationCount: 0,
    updatedAt: observedAt,
    lastSeenInFeedAt: normalizeUtcIso(input.lastSeenInFeedAt) ?? observedAt,
    lastVerifiedAt: normalizeUtcIso(input.lastVerifiedAt),
    locationRaw: str(input.locationRaw),
    geoScope: gate.geoScope,
    phEligibility: gate.phEligibility,
    geoEvidence: gate.evidence,
    geoCheckedAt: observedAt,
  };
}

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const env = locals.runtime?.env ?? (import.meta as any).env;

    // 1. Rate Limiting Check
    const rateLimiter = env?.API_RATE_LIMITER as any;
    if (rateLimiter) {
      const clientIp = request.headers.get("cf-connecting-ip") || "unknown";
      const { success } = await rateLimiter.limit({ key: clientIp });
      if (!success) {
        return new Response(JSON.stringify({ error: "Too Many Requests" }), { 
          status: 429, 
          headers: { "Content-Type": "application/json" } 
        });
      }
    }

    const proxySecret = env?.PROXY_SECRET || env?.CRON_SECRET;

    if (!proxySecret) {
      console.error("PROXY_SECRET/CRON_SECRET not configured in environment");
      return new Response(JSON.stringify({ error: "Server misconfiguration" }), { status: 500 });
    }

    if (!isAuthorized(request, proxySecret)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const parsedBody = await readJsonBodyLimited(request, MAX_PAYLOAD_BYTES);
    if (!parsedBody.ok) {
      return new Response(JSON.stringify({ error: parsedBody.message }), {
        status: parsedBody.status,
        headers: { "Content-Type": "application/json" },
      });
    }
    const payload = record(parsedBody.value);
    if (Object.prototype.hasOwnProperty.call(payload, "operation")) {
      const headers = { "Content-Type": "application/json", "Cache-Control": "no-store" };
      if (payload.operation === "lake-inspect") {
        const reply = (value: object, status: number) => new Response(JSON.stringify({ ...value,
          publicationAuthorized: false, qualificationAuthorized: false, publishedCount: 0, syncedCount: 0,
        }), { status, headers });
        const parsed = parseLakeInspectRequest(payload);
        if (!parsed.ok) return reply(parsed, 400);
        try {
          const stored = await readLakePublicationIntent(env?.DB, {
            operationKey: parsed.request.operationId, sourceId: parsed.request.sourceId,
          });
          if (!stored.ok) return reply(stored, stored.status);
          const before = await captureLakePublicationAuthority(env?.DB, stored.intent.sourceId, nowUtcIso());
          if (!before.ok) return reply({ ok: false, code: before.code === "LAKE_AUTHORITY_BINDING_UNAVAILABLE"
            ? "INSPECTION_BINDING_UNAVAILABLE" : "INSPECTION_AUTHORITY_REJECTED" },
            before.code === "LAKE_AUTHORITY_BINDING_UNAVAILABLE" ? 503 : 409);
          const evidence = await readLakeEvidenceSnapshot({ env, sourceId: stored.intent.sourceId,
            candidateIds: stored.intent.descriptors.map(row => row.lakeCandidateId) });
          if (!evidence.ok) return reply(evidence, evidence.status);
          const latestIntent = await readLakePublicationIntent(env?.DB, {
            operationKey: parsed.request.operationId, sourceId: parsed.request.sourceId,
          });
          if (!latestIntent.ok) return reply(latestIntent, latestIntent.status);
          if (latestIntent.intent.manifestHash !== stored.intent.manifestHash
            || JSON.stringify(latestIntent.intent.descriptors) !== JSON.stringify(stored.intent.descriptors)) {
            return reply({ ok: false, code: "INSPECTION_INTENT_INVALID" }, 503);
          }
          // Internal reads may take time. Re-read current authority without any
          // guard/write, and never treat an earlier context as current clearance.
          const now = nowUtcIso();
          const current = await captureLakePublicationAuthority(env?.DB, stored.intent.sourceId, now);
          if (!current.ok) return reply({ ok: false, code: "INSPECTION_AUTHORITY_REJECTED" }, 409);
          if (current.snapshot.sourceIdentityHash !== before.snapshot.sourceIdentityHash
            || JSON.stringify(current.snapshot.cas) !== JSON.stringify(before.snapshot.cas)) {
            return reply({ ok: false, code: "INSPECTION_AUTHORITY_CHANGED" }, 409);
          }
          const result = await inspectLakeItemBindings({ intent: stored.intent, snapshot: evidence.snapshot,
            currentAuthority: current.snapshot, now });
          return reply(result, 200);
        } catch {
          // Transport/database messages can contain credentials. Inspection has
          // fixed private diagnostics and never reaches the ordinary ingest writer.
          return reply({ ok: false, code: "INSPECTION_UNAVAILABLE" }, 503);
        }
      }
      if (payload.operation !== "lake-stage") {
        return new Response(JSON.stringify({ error: "Unsupported ingest operation", code: "INVALID_OPERATION" }), { status: 400, headers });
      }
      const parsed = await parseLakeStageRequest(payload);
      if (!parsed.ok) return new Response(JSON.stringify(parsed), { status: 400, headers });
      const result = await stageLakePublicationIntent(env?.DB, {
        operationId: parsed.request.operationId, sourceId: parsed.request.sourceId,
        manifestHash: parsed.manifestHash, candidateDescriptorsJson: parsed.candidateDescriptorsJson,
      });
      return new Response(JSON.stringify(result), { status: result.ok ? 200 : result.status, headers });
    }
    const { items } = payload;

    if (!items || !Array.isArray(items)) {
      return new Response(JSON.stringify({ error: "Invalid payload format. Expected { items: [...] }" }), { status: 400 });
    }

    if (items.length > 200) {
      return new Response(JSON.stringify({ error: "Payload items count exceeds safety limit (max 200)" }), { status: 400 });
    }

    if (items.length === 0) {
      return new Response(JSON.stringify({ success: true, inserted: 0, publishedCount: 0, hiddenInserted: 0 }), { status: 200 });
    }


    const db = getDb(locals.runtime?.env);
    const observedAt = nowUtcIso();
    const mapped = await Promise.all(items.map((item) => normalizeOpportunityForInsert(item, observedAt)));
    // Drop rows without a valid http(s) sourceUrl: they can neither dedup nor
    // route users anywhere, and an empty sourceUrl would collide on the UNIQUE
    // index.
    const normalizedItems = mapped.filter((row) => /^https?:\/\//i.test(row.sourceUrl));
    const rejectedForUrl = mapped.length - normalizedItems.length;

    // Insert with deduplication based on sourceUrl, chunked to avoid SQLite limits
    let insertedCount = 0;
    let publishedCount: number | null = 0;
    let hiddenInserted = 0;
    const publicationDb = publicationDbFromEnv(env);
    const publicItems = normalizedItems.filter((row) => row.isActive && isPublicPhEligibility(row.phEligibility));
    const hiddenItems = normalizedItems.filter((row) => !row.isActive || !isPublicPhEligibility(row.phEligibility));
    const insertChunk = async (chunk: NewOpportunity[]) => {
      const result = await db.insert(opportunities)
        .values(chunk)
        .onConflictDoNothing()
        .returning({ id: opportunities.id });
      return normalizePersistedOpportunityIds(result.map((row) => row.id));
    };
    if (publicationDb && publicItems.length > 0) {
      const published = await publishGroupedInserts(publicationDb, insertChunk, publicItems, observedAt, "ingest");
      if (published.publicationOutcome === "UNKNOWN") throw new PublicationOutcomeUnknownError(published.published);
      if (published.failed) throw new Error("publication gateway rejected direct ingest");
      insertedCount += published.published;
      publishedCount = published.published;
    } else {
      for (const chunk of chunkArray(publicItems, DIRECT_INGEST_BATCH_SIZE)) {
        const inserted = (await insertChunk(chunk)).length;
        insertedCount += inserted;
        // Physical fallback writes do not establish publication authority.
        if (inserted > 0) publishedCount = null;
      }
    }
    for (const chunk of chunkArray(hiddenItems, DIRECT_INGEST_BATCH_SIZE)) {
      const inserted = (await insertChunk(chunk)).length;
      insertedCount += inserted;
      hiddenInserted += inserted;
    }

    return new Response(JSON.stringify({
      success: true,
      inserted: insertedCount,
      publishedCount,
      hiddenInserted,
      totalReceived: items.length,
      rejectedForUrl,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    if (error instanceof PublicationOutcomeUnknownError) {
      return new Response(JSON.stringify({ success: false, code: "POST_PERSISTENCE_FAILURE", publicationOutcome: "UNKNOWN",
        inserted: null, confirmedPublishedLowerBound: error.confirmedPublishedLowerBound, reconciliationRequired: true,
        error: "Publication persistence outcome is UNKNOWN; reconciliation is required" }),
        { status: 500, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
    }
    console.error("Ingest API Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Internal Server Error" }), { status: 500 });
  }
};
