import { expect, test } from "bun:test";
import { ping } from "./index";

test("missing PROXY_SECRET rejects instead of reporting a successful scheduled tick", async () => {
  await expect(ping({
    PROXY_SECRET: "",
    SCRAPE_URL: "https://example.com/api/cron/scrape",
  })).rejects.toThrow("PROXY_SECRET is not configured");
});
