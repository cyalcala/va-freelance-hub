import type { APIRoute } from "astro";
import { getDb, opportunities } from "@va-hub/db";
import { chunkArray, sanitizeApplyUrl, sanitizeSourceUrl, toContentHash, sha256Hex, geoGate } from "@va-hub/scraper";
import { normalizeUtcIso, nowUtcIso } from "@/lib/time";
import { DIRECT_INGEST_BATCH_SIZE } from "@/lib/ingest-batch";
import { isAuthorized } from "@/lib/auth";
import { readJsonBodyLimited } from "@/lib/request-body";

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
  const applicationUrl = sanitizeApplyUrl(input.applicationUrl) ?? (sourceUrl ?? null);
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
    isActive: gate.phEligibility !== "ineligible",
    inactiveReason: gate.phEligibility === "ineligible" ? "policy-rejected" : null,
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
    const { items } = payload;

    if (!items || !Array.isArray(items)) {
      return new Response(JSON.stringify({ error: "Invalid payload format. Expected { items: [...] }" }), { status: 400 });
    }

    if (items.length > 200) {
      return new Response(JSON.stringify({ error: "Payload items count exceeds safety limit (max 200)" }), { status: 400 });
    }

    if (items.length === 0) {
      return new Response(JSON.stringify({ success: true, inserted: 0 }), { status: 200 });
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
    for (const chunk of chunkArray(normalizedItems, DIRECT_INGEST_BATCH_SIZE)) {
      // Bare onConflictDoNothing (no target) mirrors the scrape route: absorbs
      // BOTH source_url and content_hash unique conflicts. A targeted conflict
      // on source_url alone would throw on a content_hash collision.
      const result = await db.insert(opportunities)
        .values(chunk)
        .onConflictDoNothing()
        .returning({ id: opportunities.id });
      insertedCount += result.length;
    }

    return new Response(JSON.stringify({
      success: true,
      inserted: insertedCount,
      totalReceived: items.length,
      rejectedForUrl,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Ingest API Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Internal Server Error" }), { status: 500 });
  }
};
