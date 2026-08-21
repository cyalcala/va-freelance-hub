import { expect, test } from "bun:test";
import { ping } from "./index";

const workerConfig = await Bun.file(
  new URL("../wrangler.toml", import.meta.url),
).text();

test("cron leaves processing headroom inside the 15-minute freshness target", () => {
  expect(workerConfig).toContain('crons = ["*/10 * * * *"]');
  expect(workerConfig).not.toContain('crons = ["*/15 * * * *"]');
});

test("missing PROXY_SECRET rejects instead of reporting a successful scheduled tick", async () => {
  await expect(ping({
    PROXY_SECRET: "",
    SCRAPE_URL: "https://example.com/api/cron/scrape",
  })).rejects.toThrow("PROXY_SECRET is not configured");
});
