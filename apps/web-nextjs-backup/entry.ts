// @ts-ignore
import { default as handler } from "./.open-next/worker.js";

export default {
  fetch: handler.fetch,
  async scheduled(event: any, env: any, ctx: any) {
    console.log("Cron trigger fired:", event.cron);
    const secret = env.CRON_SECRET || "";

    let path = "/api/cron/scrape";
    if (event.cron === "0 1 * * *") {
      path = "/api/cron/verify-links";
    } else if (event.cron === "0 2 * * 0") {
      path = "/api/cron/verify-directory";
    }

    // This historical adapter remains only for recovery reference. It never
    // places a secret in a URL or logs one; the active scheduler is the
    // Cloudflare/Astro path documented in docs/legacy-quarantine.md.
    const url = new URL(path, "http://localhost");
    console.log(`Triggering quarantined scheduled task: ${path}`);

    try {
      const res = await handler.fetch(
        new Request(url, {
          method: "POST",
          headers: {
            "x-cron-secret": secret,
          },
        }),
        env,
        ctx
      );
      console.log(`Cron ${path} completed with status: ${res.status}`);
    } catch (err) {
      console.error(`Cron ${path} failed:`, err);
    }
  },
} satisfies ExportedHandler<any>;

// Re-export open-next durable objects/queues if any
// @ts-ignore
// export { DOQueueHandler, DOShardedTagCache } from "./.open-next/worker.js";
