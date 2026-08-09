// LEGACY_QUARANTINE: Turso/Drizzle configuration retained only as historical
// reference. It is deliberately not named drizzle.config.ts, preventing an
// accidental CLI invocation from auto-discovering old remote credentials.
import type { Config } from "drizzle-kit";

export default {
  schema: "./schema.ts",
  out: "./migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
} satisfies Config;
