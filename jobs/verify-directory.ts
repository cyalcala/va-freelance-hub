import { schedules } from "@trigger.dev/sdk/v3";
import { eq, isNotNull } from "drizzle-orm";
import { db, vaDirectory } from "@va-hub/db";

export const verifyDirectoryTask = schedules.task({
  id: "verify-directory",
  cron: "0 7 * * 1",
  maxDuration: 180,
  run: async () => {
    const entries = await db
      .select({ id: vaDirectory.id, companyName: vaDirectory.companyName, hiringPageUrl: vaDirectory.hiringPageUrl })
      .from(vaDirectory)
      .where(isNotNull(vaDirectory.hiringPageUrl));

    console.log(`[verify-directory] Checking ${entries.length} entries...`);
    let verified = 0,
      failed = 0;

    for (let i = 0; i < entries.length; i += 5) {
      const results = await Promise.allSettled(
        entries.slice(i, i + 5).map(async ({ id, hiringPageUrl }) => {
          if (!hiringPageUrl) return false;
          try {
            const res = await fetch(hiringPageUrl, { method: "HEAD", signal: AbortSignal.timeout(10_000), redirect: "follow" });
            if (res.ok) {
              await db.update(vaDirectory).set({ verifiedAt: new Date().toISOString() }).where(eq(vaDirectory.id, id));
              return true;
            }
          } catch {}
          return false;
        })
      );
      verified += results.filter((r) => r.status === "fulfilled" && r.value).length;
      failed += results.filter((r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value)).length;
    }

    console.log(`[verify-directory] verified=${verified} failed=${failed}`);
    return { checked: entries.length, verified, failed };
  },
});