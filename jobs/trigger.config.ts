import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  project: "proj_hzeuykzmhlzwmqeljfft",
  runtime: "node",
  build: {
    external: ["libsql"],
  },
  dirs: ["."],
  maxDuration: 300,
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
    },
  },
});
