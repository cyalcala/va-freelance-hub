import type { Config } from "drizzle-kit";
import * as dotenv from "dotenv";
dotenv.config({ path: "../../.env" });

export default {
  schema: "./schema.ts",
  out: "./migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
} satisfies Config;
