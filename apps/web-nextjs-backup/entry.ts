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

    const url = `http://localhost${path}?secret=${secret}`;
    console.log(`Triggering scheduled task: ${url}`);

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
