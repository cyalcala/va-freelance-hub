import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb, vaDirectory } from "@va-hub/db";
import { eq, isNotNull } from "drizzle-orm";

export async function POST(request: Request) {
  console.log("[api/cron/verify-directory] Starting directory link check...");
  const cfCtx = await getCloudflareContext();
  const env = cfCtx?.env as any;
  const db = getDb(env);

  // Authorization Check
  const secret = request.headers.get("x-cron-secret") || new URL(request.url).searchParams.get("secret");
  const expectedSecret = env?.CRON_SECRET || process.env.CRON_SECRET;
  if (expectedSecret && secret !== expectedSecret) {
    console.warn("[api/cron/verify-directory] Unauthorized access attempt");
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const entries = await db
      .select({
        id: vaDirectory.id,
        companyName: vaDirectory.companyName,
        hiringPageUrl: vaDirectory.hiringPageUrl,
      })
      .from(vaDirectory)
      .where(isNotNull(vaDirectory.hiringPageUrl));

    console.log(`[api/cron/verify-directory] Checking ${entries.length} hiring pages...`);
    let verified = 0;
    let failed = 0;

    // Check in batches of 5
    for (let i = 0; i < entries.length; i += 5) {
      const batch = entries.slice(i, i + 5);
      const results = await Promise.allSettled(
        batch.map(async ({ id, hiringPageUrl, companyName }) => {
          if (!hiringPageUrl) return false;
          try {
            const res = await fetch(hiringPageUrl, {
              method: "GET", // Use GET instead of HEAD because some servers block HEAD
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
              },
              signal: AbortSignal.timeout(10_000),
              redirect: "follow",
            });

            if (res.ok) {
              await db
                .update(vaDirectory)
                .set({ verifiedAt: new Date().toISOString() })
                .where(eq(vaDirectory.id, id));
              return true;
            } else {
              console.warn(`[api/cron/verify-directory] ${companyName} returned status ${res.status} on ${hiringPageUrl}`);
            }
          } catch (err) {
            console.warn(`[api/cron/verify-directory] Error fetching ${companyName} at ${hiringPageUrl}:`, (err as Error).message);
          }
          return false;
        })
      );

      for (const r of results) {
        if (r.status === "fulfilled" && r.value) {
          verified++;
        } else {
          failed++;
        }
      }
    }

    console.log(`[api/cron/verify-directory] Completed. Verified=${verified}, Failed/Offline=${failed}`);
    return NextResponse.json({ checked: entries.length, verified, failed });
  } catch (error) {
    console.error("[api/cron/verify-directory] Error during directory check:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
