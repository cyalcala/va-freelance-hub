import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  project: "proj_hzeuykzmhlzwmqeljfft",
  runtime: "node", // Keep node for now but optimize build
  logLevel: "log",
  build: {
    external: ["libsql", "bun"], // Ensure bun is external if we run locally
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
