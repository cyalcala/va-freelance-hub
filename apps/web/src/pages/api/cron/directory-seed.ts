import type { APIRoute } from "astro";
import { getDb, vaDirectory } from "@va-hub/db";
import { chunkArray, maxRowsPerD1Batch, normalizeCompanyName, errorMessage } from "@va-hub/scraper";
import { nowUtcIso } from "@/lib/time";
import { isAuthorized } from "@/lib/auth";
import { CURATED_VA_AGENCIES_2026_08 } from "@/data/curated-va-agencies-2026-08";

export const prerender = false;

const DIRECTORY_INSERT_COLUMNS = 12;

export const POST: APIRoute = async ({ request, locals }) => {
  console.log("[api/cron/directory-seed] Starting curated seed import...");
  const env = (locals.runtime?.env ?? (import.meta as any).env) as any;
  const db = getDb(env);
  const startedAt = nowUtcIso();

  const rateLimiter = env?.API_RATE_LIMITER;
  if (rateLimiter) {
    const clientIp = request.headers.get("cf-connecting-ip") || "unknown";
    const { success } = await rateLimiter.limit({ key: `directory-seed:${clientIp}` });
    if (!success) return new Response("Too Many Requests", { status: 429 });
  }

  if (!isAuthorized(request, env?.PROXY_SECRET || env?.CRON_SECRET)) {
    console.warn("[api/cron/directory-seed] Unauthorized access attempt");
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const existing = await db.select({ name: vaDirectory.companyName }).from(vaDirectory);
    const existingNormalized = new Set(
      existing.map((e) => normalizeCompanyName(e.name)),
    );

    const toInsert = CURATED_VA_AGENCIES_2026_08.filter(
      (entry) => !existingNormalized.has(normalizeCompanyName(entry.companyName)),
    );

    let added = 0;
    const addedNames: string[] = [];
    const failedNames: string[] = [];
    const insertErrors: string[] = [];
    const skipped = CURATED_VA_AGENCIES_2026_08.length - toInsert.length;

    if (toInsert.length > 0) {
      const values = toInsert.map((entry) => ({
        companyName: entry.companyName,
        website: entry.website,
        hiresFilipinos: true,
        niche: entry.niche,
        isDayshift: entry.isDayshift ?? false,
        isVerified: entry.isVerified ?? true,
        isRemote: entry.isRemote ?? true,
        isMarketplace: entry.isMarketplace ?? false,
        hiringPageUrl: entry.hiringPageUrl ?? null,
        notes: entry.notes ?? null,
      }));

      for (const batch of chunkArray(values, maxRowsPerD1Batch(DIRECTORY_INSERT_COLUMNS))) {
        try {
          await db.insert(vaDirectory).values(batch);
          added += batch.length;
          addedNames.push(...batch.map((b) => b.companyName));
        } catch (err) {
          console.warn(`[api/cron/directory-seed] batch insert failed, retrying rows individually:`, errorMessage(err));
          for (const row of batch) {
            try {
              await db.insert(vaDirectory).values(row);
              added += 1;
              addedNames.push(row.companyName);
            } catch (rowErr) {
              const msg = errorMessage(rowErr);
              console.warn(`[api/cron/directory-seed] row insert failed for ${row.companyName}:`, msg);
              failedNames.push(row.companyName);
              insertErrors.push(`${row.companyName}: ${msg}`);
            }
          }
        }
      }
    }

    console.log(`[api/cron/directory-seed] Done. Added ${added}, skipped ${skipped} existing, failed ${failedNames.length}.`);
    return new Response(JSON.stringify({
      totalCurated: CURATED_VA_AGENCIES_2026_08.length,
      added,
      addedNames,
      skippedExisting: skipped,
      failed: failedNames.length,
      failedNames,
      insertErrors,
      startedAt,
      finishedAt: nowUtcIso(),
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (error) {
    console.error("[api/cron/directory-seed] Error:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
