import type { APIRoute } from "astro";
import { getDb, opportunities } from "@va-hub/db";
import { sanitizeApplyUrl, toContentHash } from "@va-hub/scraper";
import { normalizeUtcIso, nowUtcIso } from "@/lib/time";

export const prerender = false;

const JOB_TYPES = new Set(["VA", "freelance", "project", "full-time", "part-time"]);
const LOCATION_TYPES = new Set(["remote", "hybrid", "onsite"]);
const EXPERIENCE_LEVELS = new Set(["entry", "mid", "senior", "any"]);

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

async function sha256Hex(message: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(message));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Explicit allow-list mapping. Previously this spread `...item`, letting any
// caller with the shared secret set arbitrary columns (isActive, clickCount,
// id, contentHash) and store an unsanitized applicationUrl — the same class
// the scrape route was hardened against (audit A-2). Server owns all
// safety-critical fields; the client may only supply descriptive data.
async function normalizeOpportunityForInsert(item: any, observedAt: string) {
  const title = str(item?.title) ?? "Untitled";
  const sourceUrl = str(item?.sourceUrl);
  const applicationUrl = sanitizeApplyUrl(item?.applicationUrl) ?? (sourceUrl ?? null);
  const description = str(item?.description);
  const rawTags = Array.isArray(item?.tags) ? item.tags.filter((t: unknown) => typeof t === "string").slice(0, 15) : [];
  return {
    title,
    company: str(item?.company),
    type: JOB_TYPES.has(item?.type) ? item.type : "freelance",
    sourceUrl: sourceUrl ?? "",
    sourcePlatform: str(item?.sourcePlatform) ?? "ingest",
    tags: rawTags,
    category: str(item?.category) ?? "other",
    locationType: LOCATION_TYPES.has(item?.locationType) ? item.locationType : "remote",
    clientTimezone: str(item?.clientTimezone),
    payRange: str(item?.payRange),
    description,
    applicationUrl,
    postedAt: normalizeUtcIso(item?.postedAt),
    scrapedAt: normalizeUtcIso(item?.scrapedAt) ?? observedAt,
    // Server-owned safety fields — never client-controlled.
    isActive: true,
    contentHash: toContentHash(title, sourceUrl ?? title),
    descriptionHash: await sha256Hex(title + (description ?? "").slice(0, 1500)),
    experienceLevel: EXPERIENCE_LEVELS.has(item?.experienceLevel) ? item.experienceLevel : null,
    clickCount: 0,
    failedVerificationCount: 0,
    updatedAt: observedAt,
    lastSeenInFeedAt: normalizeUtcIso(item?.lastSeenInFeedAt) ?? observedAt,
    lastVerifiedAt: normalizeUtcIso(item?.lastVerifiedAt),
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

    // 2. Payload Content-Length Safeguard (Max 2MB)
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > 2 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: "Payload too large (max 2MB)" }), { status: 413 });
    }

    const authHeader = request.headers.get("Authorization");
    const cronSecretHeader = request.headers.get("x-cron-secret");
    const proxySecret = env?.PROXY_SECRET || env?.CRON_SECRET;

    if (!proxySecret) {
      console.error("PROXY_SECRET/CRON_SECRET not configured in environment");
      return new Response(JSON.stringify({ error: "Server misconfiguration" }), { status: 500 });
    }

    const providedSecret = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : cronSecretHeader;
    if (!providedSecret || providedSecret !== proxySecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const payload = await request.json() as any;
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
    const CHUNK_SIZE = 10;
    let insertedCount = 0;
    for (let i = 0; i < normalizedItems.length; i += CHUNK_SIZE) {
      const chunk = normalizedItems.slice(i, i + CHUNK_SIZE);
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
  } catch (error: any) {
    console.error("Ingest API Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal Server Error" }), { status: 500 });
  }
};
