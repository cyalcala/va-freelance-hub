import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "./schema";

type D1Binding = Parameters<typeof drizzle>[0];

export type DbEnvironment = {
  DB?: D1Binding;
};

/**
 * The production database boundary is Cloudflare D1 only. The former LibSQL
 * fallback could silently write to a local/Turso database when a binding was
 * missing, producing a successful-looking run with no production effect.
 */
export function getDb(env?: DbEnvironment): DrizzleD1Database<typeof schema> {
  if (!env?.DB) {
    throw new Error("Cloudflare D1 binding (env.DB) is required.");
  }
  return drizzle(env.DB, { schema });
}

export { schema };
