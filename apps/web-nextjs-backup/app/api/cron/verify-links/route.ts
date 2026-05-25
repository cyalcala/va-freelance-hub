import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb, opportunities } from "@va-hub/db";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  console.log("[api/cron/verify-links] Starting verification...");
  const cfCtx = await getCloudflareContext();
  const env = cfCtx?.env as any;
  const db = getDb(env);

  // Authorization Check
  const secret = request.headers.get("x-cron-secret") || new URL(request.url).searchParams.get("secret");
  const expectedSecret = env?.CRON_SECRET || process.env.CRON_SECRET;
  if (expectedSecret && secret !== expectedSecret) {
    console.warn("[api/cron/verify-links] Unauthorized access attempt");
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const active = await db
      .select({ id: opportunities.id, sourceUrl: opportunities.sourceUrl })
      .from(opportunities)
      .where(eq(opportunities.isActive, true));

    console.log(`[api/cron/verify-links] Checking ${active.length} links...`);
    let deactivated = 0;

    // Check in batches of 10
    for (let i = 0; i < active.length; i += 10) {
      const batch = active.slice(i, i + 10);
      const results = await Promise.allSettled(
        batch.map(async ({ id, sourceUrl }) => {
          try {
            const res = await fetch(sourceUrl, {
              method: "HEAD",
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
              },
              signal: AbortSignal.timeout(8_000),
              redirect: "follow",
            });
            
            if (res.status === 404 || res.status === 410) {
              await db.update(opportunities).set({ isActive: false }).where(eq(opportunities.id, id));
              console.log(`[api/cron/verify-links] Deactivated: ${sourceUrl}`);
              return 1;
            }
          } catch (err) {
            // Log warning but don't deactivate on network issues or timeouts to avoid false positives
            console.warn(`[api/cron/verify-links] Failed checking ${sourceUrl}:`, (err as Error).message);
          }
          return 0;
        })
      );

      deactivated += results.reduce((sum, r) => (r.status === "fulfilled" ? sum + r.value : sum), 0);
    }

    console.log(`[api/cron/verify-links] Completed. Checked ${active.length}, deactivated ${deactivated} dead links.`);
    return NextResponse.json({ checked: active.length, deactivated });
  } catch (error) {
    console.error("[api/cron/verify-links] Error during link verification:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
